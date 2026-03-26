# TASK-098 — Independent Device Permission Handling

> **Status:** planned
> **Priority:** high
> **Created:** 2026-03-25

---

## Description

Fix the bug where blocking one device (camera or microphone) disables all device controls in the prejoin view. Implement Google Meet-style independent stream management where video and audio are handled as separate streams with independent permission states.

## Problem Statement

**Current architecture:**
- Single `MediaStream` managed as a whole
- Single `error` state disables ALL controls
- `getUserMedia({ video: true, audio: true })` - one call for both

**Bug in `device-selector.tsx`:**
```tsx
const hasStream = !!stream && !error;
<DeviceControlGroup disabled={!hasStream} ... />  // ALL disabled if ANY fails
```

**Root cause:** Manager treats stream as unified entity, but permissions are per-device.

## Scope

- Create MediaDeviceService as single source of truth for `getUserMedia`
- Split stream management into independent video/audio tracks
- Add per-device capture state tracking
- Create MediaCapture class for each device type (Google Meet pattern)
- Update UI to reflect individual device states
- Handle re-requesting permissions on toggle
- Support retry logic for transient errors (device in use)
- Remove code duplication in track-controller, device-switcher, acquisition

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MediaStreamManager                            │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │   videoCapture      │  │   audioCapture      │                   │
│  │   (MediaCapture)    │  │   (MediaCapture)    │                   │
│  └──────────┬──────────┘  └──────────┬──────────┘                   │
│             │                        │                               │
│             └────────────┬───────────┘                               │
│                          ▼                                           │
│              ┌───────────────────────┐                               │
│              │  MediaDeviceService   │  ◄── Single source of truth  │
│              │  - getUserMedia()     │      for navigator access    │
│              │  - enumerateDevices() │                               │
│              └───────────┬───────────┘                               │
│                          ▼                                           │
│              navigator.mediaDevices                                  │
└─────────────────────────────────────────────────────────────────────┘

React hooks (use-media-devices, use-permission-state)
                          │
                          ▼
              MediaDeviceService (via context)
```

### MediaDeviceService (New)

Low-level abstraction over `navigator.mediaDevices`. Single point for all `getUserMedia` calls.

```typescript
interface IMediaDeviceService {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
}

class MediaDeviceService implements IMediaDeviceService {
  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices();
  }
}
```

**Benefits:**
- SOLID: Single Responsibility for browser API access
- Testability: Easy to mock in unit tests
- DRY: Fallback logic centralized in MediaCapture, not duplicated
- All existing classes (track-controller, device-switcher, acquisition) will be replaced by MediaCapture + MediaDeviceService

### Capture States (per device)

```typescript
enum CaptureState {
  STOPPED = 0,
  STARTING = 1,
  ACTIVE = 2,
  MUTED = 3,
  DEVICE_ERROR = 4,
  DEVICE_IN_USE = 7,      // NotReadableError - retry after 2s
  SYSTEM_DENIED = 11,     // macOS/Windows system-level denial
  CAPTURE_CANCELED = 10,  // User dismissed dialog
  DEVICE_NOT_FOUND = 9,   // NotAllowedError or NotFoundError
  NO_DEVICE = 5,          // No physical device available
}
```

### New Architecture: MediaCapture Class

Instead of a single MediaStreamManager, create independent MediaCapture instances:

```typescript
class MediaCapture {
  private state: CaptureState = CaptureState.STOPPED;
  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  private deviceId: string | null = null;
  
  // State
  getState(): CaptureState;
  onStateChange(cb: (state: CaptureState, reason?: string) => void): () => void;
  
  // Lifecycle
  async start(deviceId?: string): Promise<boolean>;
  stop(): void;
  
  // Device management
  async switchDevice(deviceId: string): Promise<boolean>;
  
  // Toggle (re-request on blocked)
  async toggle(enabled: boolean): Promise<boolean>;
}
```

### Updated Manager Interface

```typescript
interface IMediaManager {
  // Independent captures
  readonly videoCapture: MediaCapture;
  readonly audioCapture: MediaCapture;
  
  // Convenience methods (delegate to captures)
  getVideoState(): CaptureState;
  getAudioState(): CaptureState;
  
  // Combined stream (for components that need both tracks)
  getCombinedStream(): MediaStream | null;
  
  // Device enumeration
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  
  // Subscriptions
  onVideoStateChange(cb: StateCallback): () => void;
  onAudioStateChange(cb: StateCallback): () => void;
}
```

### Error Classification

| Error | Detection | State | Recoverable | UI Message |
|-------|-----------|-------|-------------|------------|
| NotAllowedError | `error.name` | DEVICE_NOT_FOUND | Yes (toggle) | "Click to retry" |
| NotAllowedError + "system" | message check | SYSTEM_DENIED | No | "Check system settings" |
| NotFoundError | `error.name` | DEVICE_NOT_FOUND | Yes | "No device found" |
| NotReadableError | `error.name` | DEVICE_IN_USE | Auto-retry 2s | "Device in use" |
| OverconstrainedError | `error.name` | DEVICE_ERROR | Yes | "Device unavailable" |

### Files to Create/Modify

#### New Files

1. **`lib/media/device-service.ts`** - MediaDeviceService
   - Single point for `getUserMedia()` calls
   - Single point for `enumerateDevices()` calls
   - Interface for easy mocking in tests
   - Injected into MediaCapture

2. **`lib/media/capture.ts`** - MediaCapture class
   - Per-device state machine
   - Uses MediaDeviceService (no direct getUserMedia)
   - Error classification and mapping
   - Retry logic for NotReadableError
   - Device switching

3. **`lib/media/capture-state.ts`** - State utilities
   - CaptureState enum
   - Error to state mapping
   - State predicates (isRecoverable, canRetry, etc.)

#### Modified Files

4. **`lib/media/manager.ts`**
   - Create MediaDeviceService instance
   - Replace single stream with videoCapture + audioCapture
   - Provide combined stream helper
   - Delegate to captures
   - Expose deviceService for hooks

5. **`lib/media/types.ts`**
   - Add CaptureState enum
   - Add StateCallback type

6. **`lib/media/interfaces.ts`**
   - Update IMediaManager for new architecture
   - Add IMediaCapture interface
   - Add IMediaDeviceService interface

7. **`features/media/contexts/media-stream.context.tsx`**
   - Use per-device states
   - Remove global error
   - Provide combined stream for backward compat

8. **`features/media/contexts/media-manager.context.tsx`**
   - Add hooks for per-device state
   - Expose MediaDeviceService for hooks

9. **`features/media/hooks/use-media-devices.ts`**
   - Use MediaDeviceService from context instead of direct getUserMedia
   - Remove duplicate permission request logic

10. **`features/media/hooks/use-permission-state.ts`**
    - Use MediaDeviceService from context for requestPermission

11. **`features/media/components/device-selector.tsx`**
    - Use individual device states
    - Show per-device errors

12. **`features/media/components/device-control-group.tsx`**
    - Accept capture state prop
    - Display state-appropriate UI

### State Flow

```
Initial mount:
   1. MediaStreamProvider creates manager with MediaDeviceService
   2. videoCapture.start() → deviceService.getUserMedia({ video })
      - Parallel with audioCapture.start() → deviceService.getUserMedia({ audio })
   3. Each capture manages its own state independently:
      - Video blocked → videoCapture.state = DEVICE_NOT_FOUND
      - Audio works → audioCapture.state = ACTIVE

User toggles blocked video:
   1. onToggle(true) → videoCapture.toggle(true)
   2. videoCapture.start() → deviceService.getUserMedia({ video })
   3. Browser shows permission prompt
   4. If granted → state → ACTIVE
   5. If denied → state → DEVICE_NOT_FOUND (stays)
```

### Retry Logic for NotReadableError

```typescript
// In MediaCapture
private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;

constructor(
  private deviceService: IMediaDeviceService,
  private kind: 'video' | 'audio'
) {}

private async handleNotReadableError(error: Error): Promise<void> {
  if (this.pendingRetryTimer) return; // Already retrying
  
  this.setState(CaptureState.DEVICE_IN_USE, 'Device in use by another app');
  
  this.pendingRetryTimer = setTimeout(async () => {
    this.pendingRetryTimer = null;
    await this.start(this.deviceId); // Retry via deviceService
  }, 2000);
}

async start(deviceId?: string): Promise<boolean> {
  this.setState(CaptureState.STARTING);
  
  try {
    const constraints = this.buildConstraints(deviceId);
    const stream = await this.deviceService.getUserMedia(constraints);
    // ... handle success
  } catch (error) {
    // ... handle error with classification
  }
}
```

### UI States per DeviceControlGroup

| CaptureState | Toggle | Dropdown | Icon | Status Text |
|--------------|--------|----------|------|-------------|
| ACTIVE | ✅ enabled | ✅ enabled | On | None |
| STOPPED/MUTED | ✅ enabled | ✅ enabled | Off | None |
| STARTING | ⏳ disabled | ⏳ disabled | Spinner | "Starting..." |
| DEVICE_NOT_FOUND | ✅ enabled | ❌ disabled | Off + warning | "Blocked. Click to retry." |
| SYSTEM_DENIED | ❌ disabled | ❌ disabled | Off + error | "Blocked in system settings" |
| DEVICE_IN_USE | ⏳ disabled | ❌ disabled | Off | "In use by another app" |
| NO_DEVICE | ❌ disabled | ❌ disabled | Off | "No device found" |

### Implementation Steps

1. Create `device-service.ts` with MediaDeviceService class and interface
2. Create `capture-state.ts` with enum and helpers
3. Create `capture.ts` with MediaCapture class (uses MediaDeviceService)
4. Update `manager.ts` to create MediaDeviceService and MediaCapture instances
5. Update context to expose per-device states and deviceService
6. Update `use-media-devices.ts` to use deviceService from context
7. Update `use-permission-state.ts` to use deviceService from context
8. Update DeviceControlGroup to accept state
9. Update DeviceSelector to use per-device states
10. Remove global error handling in MediaStreamProvider
11. Add tests for new capture logic
12. Remove deprecated files (acquisition.ts, track-controller.ts, device-switcher.ts)

## Acceptance Criteria

- [ ] Camera blocked → video shows blocked, audio works independently
- [ ] Microphone blocked → audio shows blocked, video works independently
- [ ] Toggle on blocked device triggers new getUserMedia request
- [ ] System-level denial shows "check system settings" message
- [ ] Device in use shows message + auto-retries after 2s
- [ ] Both blocked → both show blocked states independently
- [ ] Join allows proceeding with partial/no devices
- [ ] No global error state

## Related Files

### New
- `apps/client/src/lib/media/device-service.ts`
- `apps/client/src/lib/media/capture.ts`
- `apps/client/src/lib/media/capture-state.ts`

### Modified
- `apps/client/src/lib/media/manager.ts`
- `apps/client/src/lib/media/types.ts`
- `apps/client/src/lib/media/interfaces.ts`
- `apps/client/src/features/media/contexts/media-stream.context.tsx`
- `apps/client/src/features/media/contexts/media-manager.context.tsx`
- `apps/client/src/features/media/hooks/use-media-devices.ts`
- `apps/client/src/features/media/hooks/use-permission-state.ts`
- `apps/client/src/features/media/components/device-selector.tsx`
- `apps/client/src/features/media/components/device-control-group.tsx`
- `apps/client/src/features/room/components/prejoin-view.tsx`

### Removed (after migration complete)
- `apps/client/src/lib/media/acquisition.ts` (replaced by MediaCapture + MediaDeviceService)
- `apps/client/src/lib/media/track-controller.ts` (logic moved to MediaCapture)
- `apps/client/src/lib/media/device-switcher.ts` (logic moved to MediaCapture)
- `apps/client/src/lib/media/track-fallback.ts` (logic moved to MediaCapture)
- `apps/client/src/lib/media/state-store.ts` (replaced by per-capture state)

## References

- Google Meet device handling analysis (provided by user)
- WebRTC permission best practices
