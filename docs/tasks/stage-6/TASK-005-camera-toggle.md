# TASK-065 — Proper Camera Toggle Implementation

## Status
planned

## Priority
high

## Description
When turning off the camera via the toggle button, the camera is not physically stopped — it only hides the video stream while the camera hardware remains active. The laptop's camera indicator light stays on. This should behave like Google Meet: when camera is toggled off, the camera hardware should be completely released, turning off the indicator light.

## Scope
- Stop video track when camera is toggled off
- Restart video track when camera is toggled back on
- Update SFU producer state accordingly
- Handle camera re-acquisition errors gracefully

## Out of Scope
- Audio toggle changes (already works correctly via `track.enabled`)
- Device selection changes
- Screen sharing implementation

## Technical Design

### Current Implementation
```typescript
// lib/media/manager.ts
toggleVideo(enabled: boolean): void {
  this.getVideoTracks().forEach((track) => {
    track.enabled = enabled;  // Only disables stream, not hardware
  });
}
```

### Proposed Implementation
```typescript
// lib/media/manager.ts
async toggleVideo(enabled: boolean): Promise<void> {
  if (enabled) {
    // Re-acquire previously selected camera track
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: selectedVideoDeviceId ? { exact: selectedVideoDeviceId } : undefined },
    });
    const newTrack = newStream.getVideoTracks()[0];
    // Replace track in existing stream
    this.localStream.removeTrack(oldTrack);
    this.localStream.addTrack(newTrack);
    // Notify SFU to replace producer track
  } else {
    // Stop the track completely (releases camera hardware)
    this.getVideoTracks().forEach((track) => track.stop());
    // Remove track from stream
    // Notify SFU to pause/close producer
  }
}
```

### SFU Producer Handling
When camera is stopped:
1. Pause the video producer on SFU (already done via `syncProducerState`)
2. Close and stop the local track

When camera is re-enabled:
1. Acquire new video track
2. Replace the producer's track on SFU
3. Resume the producer

### Device Selection Requirement
- Re-enable must reuse the currently selected camera device when available
- If the selected device is gone, surface a recoverable error and keep the call active without video
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
- [ ] Toggling camera off stops the camera hardware (indicator light turns off)
- [ ] Toggling camera on re-acquires the camera and starts streaming
- [ ] Toggling camera on reuses the selected camera device when available
- [ ] Camera indicator light reflects actual camera state
- [ ] SFU properly handles track replacement
- [ ] Remote participants see video pause/resume correctly
- [ ] Error handling when camera fails to re-acquire

## Definition of Done
- Camera toggle matches Google Meet behavior
- No camera indicator light when "off"
- Smooth re-acquisition when toggling back on
- Selected device preference is preserved across off/on cycles
- Proper error states displayed
- Manual testing on multiple browsers

## Related Files
- `apps/client/src/lib/media/manager.ts`
- `apps/client/src/features/media/hooks/use-media-controls.ts`
- `apps/client/src/routes/room.tsx`
- `apps/client/src/hooks/use-mediasoup.ts`

## Related Tasks
- TASK-064 — Fix Missing Participant Without Media
- TASK-066 — Media Error Indicators on Controls

## Next Task
TASK-066 — Media Error Indicators on Controls
