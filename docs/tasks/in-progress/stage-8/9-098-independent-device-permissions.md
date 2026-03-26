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

- Create MediaDeviceService as single source of truth for `navigator.mediaDevices`
- Split stream management into independent video/audio captures
- Add per-device capture state tracking (CaptureState enum)
- Create MediaCapture class for each device type (Google Meet pattern)
- Update all UI (prejoin + in-call) to reflect individual device states
- Handle re-requesting permissions on toggle (two separate permission prompts — one per device)
- Support retry logic for transient errors (device in use) with SFU track replacement
- Remove code duplication in track-controller, device-switcher, acquisition
- Full media layer refactor: contexts, hooks, components, SFU integration

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MediaStreamManager                            │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │   videoCapture      │  │   audioCapture      │                   │
│  │   (IMediaCapture)   │  │   (IMediaCapture)   │                   │
│  └──────────┬──────────┘  └──────────┬──────────┘                   │
│             │                        │                               │
│             └────────────┬───────────┘                               │
│                          ▼                                           │
│              ┌───────────────────────┐                               │
│              │  MediaDeviceService   │  ◄── Single source of truth  │
│              │  (IMediaDeviceService)│      for navigator access    │
│              │  - getUserMedia()     │                               │
│              │  - enumerateDevices() │                               │
│              │  - queryPermission()  │                               │
│              └───────────┬───────────┘                               │
│                          ▼                                           │
│              navigator.mediaDevices                                  │
└─────────────────────────────────────────────────────────────────────┘

React hooks (use-media-devices, use-permission-state, use-media-controls)
                           │
                           ▼
               IMediaDeviceService (via context)
                           │
                           ▼
               SFU layer (useSfuTrackSync subscribes to onTrackChange)
```

### MediaDeviceService (New)

Low-level abstraction over `navigator.mediaDevices`. Single point for all browser media API calls. Depends on no application code.

```typescript
interface IMediaDeviceService {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  /** Query browser permission state. Throws if Permissions API not supported (Firefox, Safari). */
  queryPermission(kind: 'video' | 'audio'): Promise<PermissionState>;
}
```

**Benefits:**
- **SRP:** Single Responsibility for browser API access
- **DIP:** Manager and MediaCapture depend on IMediaDeviceService abstraction, not concrete class
- **Testability:** Easy to mock in unit tests
- **DRY:** All navigator access in one place, no scattered calls

**Error contract:**
- `getUserMedia()` — propagates DOMException from browser (handled by IErrorClassifier)
- `enumerateDevices()` — propagates DOMException (consumer must handle)
- `queryPermission()` — throws `DOMException` if Permissions API not supported (`TypeError` in Firefox/Safari). Consumers (e.g. `use-permission-state.ts`) must catch and fall back to `'prompt'` default state.

### Capture States (per device)

Defined in `lib/media/capture-state.ts` — single source of truth. Imported by all consumers.

```typescript
enum CaptureState {
  STOPPED = 0,           // Track stopped (track.stop()), device ID preserved
  STARTING = 1,          // getUserMedia in progress
  ACTIVE = 2,            // Track live and enabled
  MUTED = 3,             // Track live but disabled (track.enabled = false), e.g. user pressed mute in UI
  DEVICE_ERROR = 4,      // OverconstrainedError
  NO_DEVICE = 5,         // No physical device available
  DEVICE_IN_USE = 6,     // NotReadableError - retry after 2s
  DEVICE_NOT_FOUND = 7,  // NotFoundError or NotAllowedError (user denied)
  SYSTEM_DENIED = 8,     // macOS/Windows system-level denial
  CAPTURE_CANCELED = 9,  // User dismissed permission dialog
}
```

**MUTED vs STOPPED semantics:**
- `STOPPED` — track fully stopped (`track.stop()`). Track object is dead, must re-acquire via `getUserMedia` to restart. Used when user turns off device.
- `MUTED` — track is alive but disabled (`track.enabled = false`). Can be re-enabled without `getUserMedia`. Used for soft mute (SFU `pauseProducer` keeps producer alive).
- UI treats both as "Off" state (same icon). The difference matters for SFU: MUTED → `pauseProducer`, STOPPED → no producer.

### IMediaCapture Interface (LSP)

Captures are typed via interface, not concrete class. Consumers depend on `IMediaCapture` — any implementation can be substituted (real, mock, test double).

```typescript
interface IMediaCapture {
  // State
  getState(): CaptureState;
  getTrack(): MediaStreamTrack | null;
  onStateChange(cb: (state: CaptureState, track: MediaStreamTrack | null, reason?: string) => void): () => void;

  // Lifecycle
  start(deviceId?: string): Promise<boolean>;
  stop(): void;

  // Device management
  switchDevice(deviceId: string): Promise<boolean>;

  // Toggle (re-request on blocked)
  toggle(enabled: boolean): Promise<boolean>;
}

class MediaCapture implements IMediaCapture {
  private state: CaptureState = CaptureState.STOPPED;
  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  private deviceId: string | null = null;

  constructor(
    private deviceService: IMediaDeviceService,
    private kind: 'video' | 'audio',
    private errorClassifier: IErrorClassifier
  ) {}

  // ... implementation
}
```

### Narrow Interfaces (ISP)

Consumers depend only on what they need. Manager exposes captures via `IMediaCapture`; hooks expose narrow slices.

```typescript
// Read-only state (UI components)
interface ICaptureStateReader {
  getState(): CaptureState;
  onStateChange(cb: (state: CaptureState, track: MediaStreamTrack | null, reason?: string) => void): () => void;
}

// Control (toggle, switch)
interface ICaptureController {
  toggle(enabled: boolean): Promise<boolean>;
  switchDevice(deviceId: string): Promise<boolean>;
}

// Track access (SFU integration)
interface ICaptureTrackProvider {
  getTrack(): MediaStreamTrack | null;
  onStateChange(cb: (state: CaptureState, track: MediaStreamTrack | null, reason?: string) => void): () => void;
}
```

**Context hooks (`media-manager.context.tsx`):**
```typescript
useVideoCaptureState(): ICaptureStateReader;      // device-selector, active-device-display
useAudioCaptureState(): ICaptureStateReader;
useVideoCaptureControl(): ICaptureController;      // device-selector, media-controls
useAudioCaptureControl(): ICaptureController;
useCaptureTrackProvider(kind: 'video' | 'audio'): ICaptureTrackProvider;  // use-sfu-track-sync
useDeviceService(): IMediaDeviceService;           // use-media-devices, use-permission-state
```

#### ISP Hooks Migration (Old → New)

| Old Hook | Old Interface | New Hook(s) | Notes |
|----------|--------------|-------------|-------|
| `useMediaAcquisition()` | `IMediaAcquisition` | `useDeviceService()` + manager.start/stop | startStream/stopStream → manager.start()/stop() |
| `useMediaTrackController()` | `IMediaTrackController` | `useVideoCaptureControl()` + `useAudioCaptureControl()` | Per-device instead of unified |
| `useMediaDeviceSelector()` | `IMediaDeviceSelector` | `useVideoCaptureControl()` + `useAudioCaptureControl()` | switchDevice per capture + `useDeviceService()` for enumerateDevices |
| `useMediaPermissionChecker()` | `IMediaPermissionChecker` | `useDeviceService()` | `queryPermission()` on device service |
| `useMediaStateNotifier()` | `IMediaStateNotifier` | `useVideoCaptureState()` + `useAudioCaptureState()` | Per-device state instead of global |
| `useMediaToggle()` | `IMediaToggle` | `useVideoCaptureControl()` + `useAudioCaptureControl()` | Per-device toggle |

### Error Classification — IErrorClassifier (OCP)

Error classification is extracted into an injectable strategy. New error types are handled by providing a new classifier — no modification to MediaCapture required.

```typescript
interface ErrorClassification {
  state: CaptureState;
  recoverable: boolean;
  reason: string;
}

interface IErrorClassifier {
  classify(error: DOMException, kind: 'video' | 'audio'): ErrorClassification;
}

class DefaultErrorClassifier implements IErrorClassifier {
  classify(error: DOMException, kind: 'video' | 'audio'): ErrorClassification {
    switch (error.name) {
      case 'NotAllowedError':
        if (error.message.toLowerCase().includes('system')) {
          return { state: CaptureState.SYSTEM_DENIED, recoverable: false, reason: 'Check system settings' };
        }
        return { state: CaptureState.DEVICE_NOT_FOUND, recoverable: true, reason: 'Blocked. Click to retry.' };
      case 'NotFoundError':
        return { state: CaptureState.DEVICE_NOT_FOUND, recoverable: true, reason: `No ${kind} device found` };
      case 'NotReadableError':
        return { state: CaptureState.DEVICE_IN_USE, recoverable: true, reason: `${kind} device in use by another app` };
      case 'OverconstrainedError':
        return { state: CaptureState.DEVICE_ERROR, recoverable: true, reason: `${kind} device unavailable` };
      default:
        return { state: CaptureState.DEVICE_ERROR, recoverable: false, reason: `${kind} device error` };
    }
  }
}
```

| Error | Detection | State | Recoverable | UI Message |
|-------|-----------|-------|-------------|------------|
| NotAllowedError | `error.name` | DEVICE_NOT_FOUND | Yes (toggle) | "Click to retry" |
| NotAllowedError (system) | `error.message.toLowerCase().includes('system')` | SYSTEM_DENIED | No | "Check system settings" |
| NotFoundError | `error.name` | DEVICE_NOT_FOUND | Yes | "No device found" |
| NotReadableError | `error.name` | DEVICE_IN_USE | Auto-retry 2s | "Device in use" |
| OverconstrainedError | `error.name` | DEVICE_ERROR | Yes | "Device unavailable" |

**SYSTEM_DENIED detection strategy** (browser-dependent `message` check):
1. Primary: `error.message.toLowerCase().includes('system')` (Chrome)
2. Fallback: `NotAllowedError` + no prior grant (permission was never given, not revoked by user) → treat as SYSTEM_DENIED

### Updated Manager Interface

```typescript
interface IMediaManager {
  // Independent captures (interface-typed, not concrete)
  readonly videoCapture: IMediaCapture;
  readonly audioCapture: IMediaCapture;

  // Convenience methods (delegate to captures)
  getVideoState(): CaptureState;
  getAudioState(): CaptureState;

  // Combined stream (for components that need both tracks)
  // Updates track when a capture restarts (remove old + add new)
  getCombinedStream(): MediaStream | null;
  onCombinedStreamChange(cb: (stream: MediaStream | null) => void): () => void;

  // Track changes (for SFU integration)
  onTrackChange(cb: (event: TrackChangeEvent) => void): () => void;

  // Device enumeration
  enumerateDevices(): Promise<MediaDeviceInfo[]>;

  // Start/stop both captures
  start(options?: { video?: boolean; audio?: boolean }): Promise<void>;
  stop(): void;

  // Subscriptions
  onVideoStateChange(cb: StateCallback): () => void;
  onAudioStateChange(cb: StateCallback): () => void;
}

interface TrackChangeEvent {
  kind: 'video' | 'audio';
  track: MediaStreamTrack | null;
}
```

### SFU Integration — Responsibility Split (SRP)

Media layer does not know about SFU. Manager emits track change events; SFU layer subscribes independently. Three distinct responsibilities:

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   useRoomSfu (toggle │     │  useSfuTrackSync     │     │  useSfuProducer      │
│   + produce/pause/   │     │  (track replacement) │     │  (first publish)     │
│   resume)            │     │                      │     │                      │
│                      │     │                      │     │                      │
│ - toggleVideo()      │     │ - onTrackChange()    │     │ - produceTrack()     │
│ - toggleAudio()      │     │ - replaceTrack()     │     │ - hasProducer()      │
│ - produceTrack()     │◄────│   from capture       │────►│                      │
│ - pauseProducer()    │     │   restart            │     │                      │
│ - resumeProducer()   │     │                      │     │                      │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
         │                              │
         ▼                              ▼
   useCaptureControl()          onTrackChange()
   (user intent → capture)      (capture → SFU track swap)
```

**Responsibility boundaries:**

| Hook | Responsibility | Calls |
|------|---------------|-------|
| `useCaptureControl()` | User intent → capture lifecycle | `capture.toggle()`, `capture.switchDevice()` |
| `useSfuTrackSync()` | React to capture track changes | `sfuManager.replaceTrack()` |
| `useRoomSfu()` | Orchestrate toggle + SFU produce/pause/resume | `useCaptureControl()`, `useSfuTrackSync()`, `sfuManager.produceTrack()`, `sfuManager.pauseProducer()`, `sfuManager.resumeProducer()` |

**`useRoomSfu` toggle flow (updated):**

```typescript
// toggleVideo — orchestrates capture + SFU
async function toggleVideo() {
  const nextEnabled = !videoState.isActive();
  const success = await videoControl.toggle(nextEnabled);  // capture layer

  if (nextEnabled && success) {
    // First publish or resume
    if (!hasProducer('video')) {
      const track = videoTrackProvider.getTrack();
      await sfuManager.produceTrack(track);   // initial publish
      sfuManager.resumeProducer('video');
    } else {
      sfuManager.resumeProducer('video');      // unmute existing producer
    }
  } else {
    sfuManager.pauseProducer('video');         // mute (keep producer alive)
  }
  // Track replacement on capture restart is handled by useSfuTrackSync automatically
}
```

**`useSfuTrackSync` flow:**

```typescript
// Subscribes to manager.onTrackChange() — fires on start, stop, switch, retry
function useSfuTrackSync() {
  const trackProvider = useCaptureTrackProvider('video');
  const sfuManager = useSfuManager();

  useEffect(() => {
    return trackProvider.onStateChange(async (state, track) => {
      if (state === CaptureState.ACTIVE && track && sfuManager.hasProducer('video')) {
        await sfuManager.replaceTrack('video', track);
      }
    });
  }, [trackProvider, sfuManager]);
}
```

**Key rules:**
- `onTrackChange` fires whenever a capture's track changes (start, stop, switch, retry)
- `useSfuTrackSync` only replaces tracks in **existing** producers (no produce/pause/resume)
- If SFU not connected (prejoin), `useSfuTrackSync` is a no-op
- UI hooks (`use-media-controls`, `use-device-switching`) do NOT call `sfuManager` — they only consume capture state for UI

### Combined Stream Behavior

`getCombinedStream()` returns a `MediaStream` containing both active tracks. Manager owns the combined stream; captures own their individual streams.

**Lifecycle:**
- Created lazily on first `getCombinedStream()` call (or eagerly on `start()`)
- Initially empty — tracks are added as captures become ACTIVE
- When `videoCapture` becomes ACTIVE → add video track to combined stream
- When `audioCapture` becomes ACTIVE → add audio track to combined stream
- When `videoCapture` stops/restarts → remove old video track, add new video track (swap)
- When `audioCapture` stops/restarts → remove old audio track, add new audio track (swap)
- `manager.stop()` → remove all tracks from combined stream
- `onCombinedStreamChange()` fires whenever the set of tracks changes (add, remove, swap)

**Edge cases:**
- videoCapture ACTIVE, audioCapture still STARTING → combined stream has video track only
- videoCapture blocked (DEVICE_NOT_FOUND) → combined stream has audio track only
- Both blocked → combined stream is empty (no tracks)

### media-stream.context.tsx Start/Stop Semantics

```typescript
// start() — launch captures based on preferences
start(): Promise<void>
// → videoCapture.start() + audioCapture.start() in parallel
// → each independently succeeds/fails

// start() with options
start({ video: true, audio: false }): Promise<void>
// → only start video capture

// stop() — stop both captures
stop(): void
```

### Manager Factory (DIP)

Manager dependencies are injected via factory. Tests provide mocks; production uses defaults.

```typescript
interface IMediaManagerFactory {
  createManager(deps?: {
    deviceService?: IMediaDeviceService;
    errorClassifier?: IErrorClassifier;
  }): IMediaManager;
}

function createMediaManager(deps?: {
  deviceService?: IMediaDeviceService;
  errorClassifier?: IErrorClassifier;
}): IMediaManager {
  const deviceService = deps?.deviceService ?? new MediaDeviceService();
  const errorClassifier = deps?.errorClassifier ?? new DefaultErrorClassifier();
  return new MediaStreamManager({ deviceService, errorClassifier });
}
```

### Files to Create/Modify

#### New Files

1. **`lib/media/device-service.ts`** - IMediaDeviceService + MediaDeviceService
   - Single point for `getUserMedia()`, `enumerateDevices()`, `queryPermission()` calls
   - No application dependencies — pure browser API wrapper

2. **`lib/media/capture-state.ts`** - State utilities (single source of truth)
    - CaptureState enum
    - State predicates: `isActive()`, `isError()`, `isRecoverable()`, `canToggle()`, `canRetry()`
    - UI display helper: `getCaptureStateDisplay(state)` → `{ variant, icon, tooltip, statusText }`

3. **`lib/media/error-classifier.ts`** - IErrorClassifier + DefaultErrorClassifier
   - Injectable error classification strategy
   - New error types = new classifier class, no MediaCapture changes

4. **`lib/media/capture.ts`** - IMediaCapture + MediaCapture class
   - Per-device state machine
   - Uses IMediaDeviceService + IErrorClassifier (no direct navigator access)
   - Retry logic for NotReadableError
   - Device switching

5. **`lib/media/manager-factory.ts`** - createMediaManager() factory
   - Injects IMediaDeviceService, IErrorClassifier
   - Default production implementations if not provided

#### Modified Files — lib/media

6. **`lib/media/manager.ts`**
   - Accept IMediaDeviceService + IErrorClassifier via constructor
   - Replace single stream with videoCapture + audioCapture (typed as IMediaCapture)
   - Provide combined stream with track swap on capture restart
   - Emit onTrackChange events
   - Delegate to captures

7. **`lib/media/types.ts`**
    - Add StateCallback type
    - Add TrackChangeEvent type
    - Remove legacy types (MediaStatus, MediaPermissionStatus, etc.) after migration

8. **`lib/media/interfaces.ts`**
   - Update IMediaManager for new architecture
   - Add IMediaCapture interface
   - Add IMediaDeviceService interface
   - Add IErrorClassifier interface
   - Add ICaptureStateReader, ICaptureController, ICaptureTrackProvider narrow interfaces

#### Modified Files — contexts

9. **`features/media/contexts/media-stream.context.tsx`**
   - Use per-device states from manager
   - Remove global error state
   - Provide combined stream for backward compat
   - Update start/stop to delegate to manager with options

10. **`features/media/contexts/media-manager.context.tsx`**
    - Replace old narrow interfaces (IMediaAcquisition, IMediaTrackController, etc.)
    - Add hooks: useVideoCaptureState, useAudioCaptureState, useVideoCaptureControl,
      useAudioCaptureControl, useCaptureTrackProvider, useDeviceService

#### Modified Files — hooks

11. **`features/media/hooks/use-media-devices.ts`**
    - Use IMediaDeviceService from context instead of direct navigator access
    - Remove duplicate permission request logic (one-time getUserMedia for labels)

12. **`features/media/hooks/use-permission-state.ts`**
    - Use IMediaDeviceService.queryPermission() from context
    - Use CaptureState from captures instead of separate permission tracking

13. **`features/media/hooks/use-media-controls.ts`**
    - Replace IMediaTrackController with useVideoCaptureState/useAudioCaptureState
    - Use useVideoCaptureControl/useAudioCaptureControl for toggling
    - Remove sfuManager.replaceTrack() calls (moved to useSfuTrackSync)
    - **Update exported type:** `UseMediaControlsReturn` changes from:
      ```typescript
      // Old
      interface UseMediaControlsReturn {
        isVideoEnabled: boolean; isAudioEnabled: boolean;
        isVideoAvailable: boolean; isAudioAvailable: boolean;
        setVideoEnabled: (enabled: boolean) => void;
        setAudioEnabled: (enabled: boolean) => void;
      }
      ```
      To:
      ```typescript
      // New
      interface UseMediaControlsReturn {
        isVideoEnabled: boolean; isAudioEnabled: boolean;
        videoCaptureState: CaptureState; audioCaptureState: CaptureState;
        setVideoEnabled: (enabled: boolean) => void;
        setAudioEnabled: (enabled: boolean) => void;
      }
      ```
    - Consumers that used `isVideoAvailable`/`isAudioAvailable` must switch to `videoCaptureState`/`audioCaptureState` + predicates from `capture-state.ts`

14. **`features/media/hooks/use-device-switching.ts`**
    - Use IMediaCapture.switchDevice() via useCaptureTrackProvider
    - Remove sfuManager.replaceTrack() calls (moved to useSfuTrackSync)

15. **`features/media/hooks/use-media-errors.ts`**
    - **Remove entirely** — replaced by CaptureState + capture-state.ts helpers

16. **`features/media/hooks/use-sfu-track-sync.ts`** - New
    - Subscribes to manager.onTrackChange()
    - Calls sfuManager.replaceTrack() on track change
    - No-op when SFU not connected

#### Modified Files — components

17. **`features/media/components/device-selector.tsx`**
    - Use individual capture states via useVideoCaptureState/useAudioCaptureState
    - Show per-device errors
    - Remove dependency on global error/stream

18. **`features/media/components/device-control-group.tsx`**
    - Accept captureState prop (CaptureState enum)
    - Display state-appropriate UI per state table
    - Show status text for error states

19. **`features/media/components/media-controls.tsx`**
    - In-call toggle buttons — use capture states via useVideoCaptureState/useAudioCaptureState
    - Replace `MediaErrorType` prop with `CaptureState` prop
    - Use `getCaptureStateDisplay(state)` from `capture-state.ts` for variant/icon/tooltip

20. **`features/media/components/permission-request-modal.tsx`**
    - Use capture.toggle() via useVideoCaptureControl/useAudioCaptureControl for re-request
    - Show per-device blocked states

21. **`features/media/components/device-settings-panel.tsx`**
    - Use per-capture states for availability indicators
    - Use IMediaDeviceService for device enumeration

22. **`features/media/components/active-device-display.tsx`**
    - Use per-capture states for device on/off indicators

#### Modified Files — room

23. **`features/room/components/prejoin-view.tsx`**
    - No structural changes expected (DeviceSelector handles internally)

24. **`features/room/hooks/use-room-sfu.ts`**
    - Refactor toggleVideo/toggleAudio to use `useCaptureControl()` + `useCaptureTrackProvider()`
    - Remove direct `sfuManager.replaceTrack()` calls (moved to `useSfuTrackSync`)
    - Keep `produceTrack()`, `pauseProducer()`, `resumeProducer()` orchestration
    - Use `useSfuTrackSync()` for automatic track replacement on capture restart

25. **`features/room/components/active-room-view.tsx`**
    - Replace `useMediaErrors()` with `useVideoCaptureState()` / `useAudioCaptureState()`
    - Use `CaptureState` instead of `MediaErrorType` for error display logic

26. **`features/room/components/local-video-tile.tsx`**
    - Replace `MediaErrorType` prop with `CaptureState` prop
    - Update icon/variant selection based on `CaptureState`

27. **`features/room/components/room-view.tsx`**
    - Update `usePermissionState` usage for per-device permission state
    - Adapt `PermissionRequestModal` props to new capture-based permission flow

28. **`routes/room.tsx`**
    - Replace `mediaManager` singleton import with `createMediaManager()` from `manager-factory.ts`
    - Pass created manager to `MediaManagerProvider`

### State Flow

```
Initial mount:
   1. MediaStreamProvider creates manager via createMediaManager()
   2. manager.start() → parallel:
      videoCapture.start() → deviceService.getUserMedia({ video })
      audioCapture.start() → deviceService.getUserMedia({ audio })
   3. Each capture manages its own state independently:
      - Video blocked → videoCapture.state = DEVICE_NOT_FOUND
      - Audio works → audioCapture.state = ACTIVE
   4. Two separate permission prompts (one per device)

User toggles blocked video:
   1. onToggle(true) → videoCapture.toggle(true) via useVideoCaptureControl
   2. videoCapture.start() → deviceService.getUserMedia({ video })
   3. Browser shows permission prompt (video only)
   4. If granted → state → ACTIVE
   5. If denied → state → DEVICE_NOT_FOUND (stays)

In-call capture restart (retry after DEVICE_IN_USE):
   1. videoCapture auto-retries after 2s
   2. New track obtained → videoCapture.state → ACTIVE
   3. manager.onTrackChange fires with { kind: 'video', track: newTrack }
   4. useSfuTrackSync detects change → sfuManager.replaceTrack(oldTrack, newTrack)
```

### Retry Logic for NotReadableError

```typescript
// In MediaCapture
private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;

constructor(
  private deviceService: IMediaDeviceService,
  private kind: 'video' | 'audio',
  private errorClassifier: IErrorClassifier
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
    const classification = this.errorClassifier.classify(error, this.kind);
    this.setState(classification.state, classification.reason);

    if (classification.state === CaptureState.DEVICE_IN_USE) {
      await this.handleNotReadableError(error);
    }
  }
}
```

### Concurrency Control — Request Versioning

Race conditions arise when multiple async operations overlap (toggle → toggle, switchDevice rapid clicks, retry while user toggles). Each `MediaCapture` instance uses a generation counter to reject stale results.

```typescript
class MediaCapture implements IMediaCapture {
  private currentRequestId = 0;
  private pendingOperation: Promise<boolean> | null = null;

  async start(deviceId?: string): Promise<boolean> {
    const requestId = ++this.currentRequestId;
    this.setState(CaptureState.STARTING);

    try {
      const constraints = this.buildConstraints(deviceId);
      const stream = await this.deviceService.getUserMedia(constraints);

      if (requestId !== this.currentRequestId) {
        stream.getTracks().forEach(t => t.stop());
        return false;
      }

      // ... apply stream, set ACTIVE
      this.pendingOperation = null;
      return true;
    } catch (error) {
      if (requestId !== this.currentRequestId) return false;

      const classification = this.errorClassifier.classify(error, this.kind);
      this.setState(classification.state, classification.reason);
      this.pendingOperation = null;

      if (classification.state === CaptureState.DEVICE_IN_USE) {
        await this.handleNotReadableError();
      }
      return false;
    }
  }

  async toggle(enabled: boolean): Promise<boolean> {
    if (!enabled) {
      this.stop();
      return true;
    }
    return this.start();
  }

  async switchDevice(deviceId: string): Promise<boolean> {
    this.cancelPendingRetry();
    this.stopCurrentStream();
    return this.start(deviceId);
  }

  stop(): void {
    ++this.currentRequestId;
    this.cancelPendingRetry();
    this.stopCurrentStream();
    this.setState(CaptureState.STOPPED);
    this.pendingOperation = null;
  }

  private cancelPendingRetry(): void {
    if (this.pendingRetryTimer) {
      clearTimeout(this.pendingRetryTimer);
      this.pendingRetryTimer = null;
    }
  }

  private stopCurrentStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.track = null;
  }
}
```

**Why generation counter over AbortController:**
- `getUserMedia()` does not natively accept AbortSignal
- Stale detection is sufficient: cancel old stream on arrival, no mid-request abort
- Simpler to reason about in tests

**Guarantees:**
- `stop()` always wins: increments `currentRequestId`, any in-flight `start()` result is discarded
- `switchDevice()` cancels retry timer + stops current stream before starting new acquisition
- `toggle(false)` → `toggle(true)` → only the last `start()` result is applied
- `retry` fires `start()`, but if user manually toggled in the meantime, retry result is discarded
- No dangling tracks: stale streams are always stopped (`stream.getTracks().forEach(t => t.stop())`)

### UI States per DeviceControlGroup

| CaptureState | Toggle | Dropdown | Icon | Status Text |
|--------------|--------|----------|------|-------------|
| ACTIVE | enabled | enabled | On | None |
| STOPPED/MUTED | enabled | enabled | Off | None |
| STARTING | disabled | disabled | Spinner | "Starting..." |
| DEVICE_NOT_FOUND | enabled | disabled | Off + warning | "Blocked. Click to retry." |
| SYSTEM_DENIED | disabled | disabled | Off + error | "Blocked in system settings" |
| DEVICE_IN_USE | disabled | disabled | Off | "In use by another app" |
| NO_DEVICE | disabled | disabled | Off | "No device found" |
| DEVICE_ERROR | enabled | disabled | Off + warning | "Device unavailable" |
| CAPTURE_CANCELED | enabled | enabled | Off | None |

### Implementation Steps

**Phase 1 — Core lib/media (no UI changes)**
1. Create `device-service.ts` — IMediaDeviceService + MediaDeviceService
2. Create `capture-state.ts` — CaptureState enum + predicates + getCaptureStateDisplay()
3. Create `error-classifier.ts` — IErrorClassifier + DefaultErrorClassifier
4. Create `capture.ts` — IMediaCapture + MediaCapture class
5. Create `manager-factory.ts` — createMediaManager() with DI
6. Update `interfaces.ts` — all new interfaces (IMediaCapture, IMediaDeviceService, IErrorClassifier, narrow interfaces)
7. Update `types.ts` — StateCallback, TrackChangeEvent; remove legacy types
8. Update `manager.ts` — accept injected deps, IMediaCapture instances, combined stream, onTrackChange

**Phase 2 — Contexts + hooks**
9. Update `media-stream.context.tsx` — per-device states, remove global error
10. Update `media-manager.context.tsx` — new narrow interface hooks, remove old ISP hooks
11. Update `use-media-devices.ts` — use deviceService from context
12. Update `use-permission-state.ts` — use deviceService from context, handle queryPermission errors
13. Update `use-media-controls.ts` — per-capture state hooks, update UseMediaControlsReturn type
14. Update `use-device-switching.ts` — IMediaCapture.switchDevice(), remove SFU calls
15. Create `use-sfu-track-sync.ts` — onTrackChange → sfuManager.replaceTrack()
16. Remove `use-media-errors.ts` (replaced by capture-state.ts)

**Phase 3 — Components**
17. Update `device-control-group.tsx` — accept CaptureState prop, use getCaptureStateDisplay()
18. Update `device-selector.tsx` — per-device states
19. Update `media-controls.tsx` — CaptureState instead of MediaErrorType
20. Update `permission-request-modal.tsx` — capture.toggle() for re-request
21. Update `device-settings-panel.tsx` — per-capture states
22. Update `active-device-display.tsx` — per-capture states

**Phase 4 — Room integration + cleanup**
23. Update `use-room-sfu.ts` — refactor toggle to use captureControl + sfuTrackSync
24. Update `active-room-view.tsx` — replace useMediaErrors with CaptureState
25. Update `local-video-tile.tsx` — CaptureState prop instead of MediaErrorType
26. Update `room-view.tsx` — update permission state usage
27. Update `routes/room.tsx` — replace singleton with createMediaManager()
28. Remove deprecated files (acquisition.ts, track-controller.ts, device-switcher.ts, track-fallback.ts, state-store.ts, permissions.ts)

**Phase 5 — Tests**
29. Add tests for MediaCapture, MediaDeviceService, DefaultErrorClassifier, capture-state
30. Update existing tests for modified hooks/components
31. Remove use-media-errors.test.ts

## Acceptance Criteria

- [ ] Camera blocked → video shows blocked, audio works independently
- [ ] Microphone blocked → audio shows blocked, video works independently
- [ ] Two separate permission prompts (one per device)
- [ ] Toggle on blocked device triggers new getUserMedia request
- [ ] System-level denial shows "check system settings" message
- [ ] Device in use shows message + auto-retries after 2s
- [ ] Both blocked → both show blocked states independently
- [ ] Join allows proceeding with partial/no devices
- [ ] No global error state
- [ ] In-call capture restart (retry/switch) replaces track in SFU via useSfuTrackSync
- [ ] In-call toggle uses captureControl for track lifecycle, sfuTrackSync for replacement
- [ ] Combined stream updates tracks on capture restart (partial streams supported)
- [ ] start() launches both captures in parallel
- [ ] Device settings panel reflects per-capture states
- [ ] Active device display reflects per-capture states
- [ ] Manager accepts injected dependencies (testable without navigator)
- [ ] All consumers use narrow interfaces, not full IMediaManager
- [ ] Singleton `mediaManager` replaced with `createMediaManager()` factory
- [ ] `MediaErrorType` fully replaced by `CaptureState` in all components
- [ ] `UseMediaControlsReturn` updated with `videoCaptureState`/`audioCaptureState`
- [ ] `queryPermission()` throws in unsupported browsers; consumers handle gracefully
- [ ] Old ISP hooks removed; all consumers migrated to new hooks

## Related Files

### New
- `apps/client/src/lib/media/device-service.ts`
- `apps/client/src/lib/media/capture-state.ts`
- `apps/client/src/lib/media/error-classifier.ts`
- `apps/client/src/lib/media/capture.ts`
- `apps/client/src/lib/media/manager-factory.ts`
- `apps/client/src/features/media/hooks/use-sfu-track-sync.ts`

### Modified — lib/media
- `apps/client/src/lib/media/manager.ts`
- `apps/client/src/lib/media/types.ts`
- `apps/client/src/lib/media/interfaces.ts`

### Modified — contexts
- `apps/client/src/features/media/contexts/media-stream.context.tsx`
- `apps/client/src/features/media/contexts/media-manager.context.tsx`

### Modified — hooks
- `apps/client/src/features/media/hooks/use-media-devices.ts`
- `apps/client/src/features/media/hooks/use-permission-state.ts`
- `apps/client/src/features/media/hooks/use-media-controls.ts`
- `apps/client/src/features/media/hooks/use-device-switching.ts`

### Modified — components
- `apps/client/src/features/media/components/device-selector.tsx`
- `apps/client/src/features/media/components/device-control-group.tsx`
- `apps/client/src/features/media/components/media-controls.tsx`
- `apps/client/src/features/media/components/permission-request-modal.tsx`
- `apps/client/src/features/media/components/device-settings-panel.tsx`
- `apps/client/src/features/media/components/active-device-display.tsx`

### Modified — room
- `apps/client/src/features/room/components/prejoin-view.tsx`
- `apps/client/src/features/room/hooks/use-room-sfu.ts`
- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/features/room/components/local-video-tile.tsx`
- `apps/client/src/features/room/components/room-view.tsx`

### Modified — routes
- `apps/client/src/routes/room.tsx`

### Removed (after migration complete)
- `apps/client/src/lib/media/acquisition.ts` (replaced by MediaCapture + MediaDeviceService)
- `apps/client/src/lib/media/track-controller.ts` (logic moved to MediaCapture)
- `apps/client/src/lib/media/device-switcher.ts` (logic moved to MediaCapture)
- `apps/client/src/lib/media/track-fallback.ts` (logic moved to MediaCapture)
- `apps/client/src/lib/media/state-store.ts` (replaced by per-capture state)
- `apps/client/src/lib/media/permissions.ts` (moved to IMediaDeviceService.queryPermission)
- `apps/client/src/features/media/hooks/use-media-errors.ts` (replaced by capture-state.ts)

### Tests to update
- `apps/client/src/lib/media/__tests__/manager.test.ts`
- `apps/client/src/lib/media/__mocks__/manager.ts`
- `apps/client/src/features/media/hooks/__tests__/use-media-devices.test.ts`
- `apps/client/src/features/media/hooks/__tests__/use-media-errors.test.ts` → remove
- `apps/client/src/features/media/hooks/__tests__/use-device-switching.test.ts`
- `apps/client/src/features/media/components/__tests__/active-device-display.test.tsx`
- `apps/client/src/features/media/components/__tests__/single-device-selector.test.tsx`

### Tests to add
- `apps/client/src/lib/media/__tests__/capture.test.ts`
- `apps/client/src/lib/media/__tests__/device-service.test.ts`
- `apps/client/src/lib/media/__tests__/error-classifier.test.ts`
- `apps/client/src/lib/media/__tests__/capture-state.test.ts`

## References

- Google Meet device handling analysis (provided by user)
- WebRTC permission best practices
