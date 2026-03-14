# TASK-065 — Proper Camera Toggle Implementation

## Status
in_progress

## Priority
high

## Description
Local media toggles still behave inconsistently across the pre-join lobby and the active room. On macOS this leaves the system camera or microphone indicator active even though the UI says the device is off. The media manager must be refactored so camera and microphone toggles always release hardware when disabled, preserve device preferences for re-acquisition, and keep UI/SFU state synchronized.

## Scope
- Refactor `MediaStreamManager` into a consistent local media lifecycle owner
- Stop camera and microphone tracks when toggled off in both pre-join and active room flows
- Re-acquire camera and microphone tracks when toggled back on
- Preserve selected device IDs across stop/start and join transitions
- Update SFU producer state accordingly
- Handle camera and microphone re-acquisition errors gracefully
- Remove manager functions that are unused by production code

## Out of Scope
- Speaker output switching redesign
- Screen sharing implementation

## Technical Design

### Current Implementation
```typescript
// lib/media/manager.ts
toggleVideo(enabled: boolean): Promise<boolean>
toggleAudio(enabled: boolean): Promise<boolean>
```

The current code mixes two different models:
- pre-join UI toggles call the manager directly;
- active-room toggles use separate hardware-aware SFU logic.

That split leaves duplicated stop/start logic, stale availability state, and unused public API on the manager.

### Proposed Implementation
```typescript
// lib/media/manager.ts
startStream(constraints?): Promise<StartStreamResult>
stopStream(): void
startVideoTrack(): Promise<MediaStreamTrack | null>
stopVideoTrack(reason?): void
startAudioTrack(): Promise<MediaStreamTrack | null>
stopAudioTrack(reason?): void
switchVideoDevice(deviceId): Promise<MediaStreamTrack | null>
switchAudioDevice(deviceId): Promise<MediaStreamTrack | null>
```

Rules for the refactor:
1. `off` always means the corresponding track is stopped and removed from the local stream.
2. Device choice persists independently from whether a track is currently active.
3. Availability callbacks reflect the actual state even on idempotent stop paths.
4. Pre-join and active-room code paths consume the same manager semantics.
5. Public methods not used by production code are deleted.

### SFU Producer Handling
When camera or microphone is stopped:
1. Pause the matching SFU producer
2. Detach the track from the producer with `replaceTrack(..., null)`
3. Stop and remove the local track

When camera or microphone is re-enabled:
1. Acquire a new track using the preferred device when available
2. Replace or create the producer track on SFU
3. Resume the producer when replacement succeeds

### Device Selection Requirement
- Re-enable must reuse the currently selected camera or microphone device when available
- If the selected device is gone, surface a recoverable error and keep the call active without silently switching devices
- Switching devices while a kind is off should persist the preference without forcing hardware back on
- This behavior must stay consistent with the pre-join device selection flow

### State Management
```typescript
interface MediaControlsState {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoAvailable: boolean;  // New: camera physically available
  isAudioAvailable: boolean;  // New: microphone physically available
}
```

## Acceptance Criteria
- [x] Toggling camera off stops the camera hardware (indicator light turns off)
- [x] Toggling camera on re-acquires the camera and starts streaming
- [x] Toggling camera on reuses the selected camera device when available
- [x] Camera indicator light reflects actual camera state
- [x] SFU properly handles track replacement
- [x] Remote participants see video pause/resume correctly
- [x] Error handling when camera fails to re-acquire
- [ ] Toggling microphone off stops microphone hardware in both pre-join and active room
- [ ] Toggling microphone on re-acquires the selected microphone when available
- [ ] Pre-join toggles use the same hard-stop semantics as in-room toggles
- [ ] Device switching while a kind is off only updates preference and does not re-enable hardware
- [ ] Unused manager API is removed from production code and tests

## Definition of Done
- Camera and microphone toggles match Google Meet-style hardware release behavior
- No system indicator remains active for a disabled device
- Smooth re-acquisition when toggling back on
- Selected device preference is preserved across off/on cycles and room join
- Proper error states displayed
- Dead public API removed
- Manual testing on multiple browsers

## Related Files
- `apps/client/src/lib/media/manager.ts`
- `apps/client/src/features/media/hooks/use-media-controls.ts`
- `apps/client/src/features/media/hooks/use-device-switching.ts`
- `apps/client/src/features/media/hooks/use-media-permissions.ts`
- `apps/client/src/features/media/components/device-selector.tsx`
- `apps/client/src/routes/room.tsx`
- `apps/client/src/hooks/use-mediasoup.ts`

## Related Tasks
- TASK-064 — Fix Missing Participant Without Media
- TASK-066 — Media Error Indicators on Controls

## Next Task
TASK-066 — Media Error Indicators on Controls
