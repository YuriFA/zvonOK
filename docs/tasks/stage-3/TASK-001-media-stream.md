# TASK-023 — Media Stream Access

## Status
completed

## Priority
high

## Description
Implement access to camera and microphone using MediaDevices API. Create a media manager to handle local stream and device permissions.

## Scope
- Request camera/microphone permissions
- Create MediaStream manager
- Handle permission errors
- Display local video preview
- Support video/audio constraints

## Out of Scope
- Screen sharing (TASK-027)
- Device switching (see TASK-028 to TASK-030)

## Technical Design

### Media Stream Manager
```typescript
class MediaStreamManager {
  private localStream: MediaStream | null = null;

  async startStream(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  stopStream(): void;
  getStream(): MediaStream | null;
  getVideoTracks(): MediaStreamTrack[];
  getAudioTracks(): MediaStreamTrack[];
  toggleVideo(enabled: boolean): void;
  toggleAudio(enabled: boolean): void;
}
```

### Default Constraints
```typescript
const defaultConstraints: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
```

## Acceptance Criteria
- [x] Camera/microphone permission request works
- [x] Local stream is accessible
- [x] Local video displays in UI
- [x] Can stop/start stream
- [x] Can toggle video track
- [x] Can toggle audio track
- [x] Handles permission denied errors

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in manager code
- Error messages are user-friendly
- Clean cleanup on unmount

## Implementation Guide

## Related Files
- `apps/client/src/lib/media/manager.ts` - Media stream manager
- `apps/client/src/lib/media/index.ts` - Exports
- `apps/client/components/LocalVideo.tsx` - Local video display

## Browser APIs Used
- `navigator.mediaDevices.getUserMedia()`
- `MediaStream`
- `MediaStreamTrack`

## Next Task
TASK-025 — RTCPeerConnection Setup
