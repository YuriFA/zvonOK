# TASK-027 — Screen Share

## Status
planned

## Priority
medium

## Description
Implement screen sharing using getDisplayMedia API with track replacement in WebRTC peer connection.

## Scope
- Create useScreenShare hook
- Start screen share with getDisplayMedia
- Replace video track in peer connection
- Stop screen share and return to camera
- Handle system audio (optional, Chrome/Edge only)
- UI indication for active screen share

## Out of Scope
- Device switching (covered in TASK-028 to TASK-030)

## Technical Design

### Screen Share Hook
```typescript
export function useScreenShare(localStream, peerConnection) {
  const startScreenShare = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false,
    });

    // Replace video track
    const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
    await sender?.replaceTrack(stream.getVideoTracks()[0]);
  };

  const stopScreenShare = () => {
    // Return to camera
    const videoTrack = localStream.getVideoTracks()[0];
    sender?.replaceTrack(videoTrack);
  };
}
```

### Browser Support
| Browser | Video | Audio (System) |
|---------|-------|----------------|
| Chrome/Edge | ✅ | ✅ (with flag) |
| Firefox | ✅ | ❌ |
| Safari | ✅ | ❌ |

### Track Replacement
- `replaceTrack()` doesn't interrupt connection
- Just changes the media source
- No renegotiation needed

## Acceptance Criteria
- Button starts screen share
- Browser picker dialog appears
- Remote participant sees screen
- Stopping returns to camera
- Works with frame rate settings
- System audio optional

## Definition of Done
- Screen share functional
- Track replacement working
- Proper cleanup on stop
- UI indicates active screen share
- Works in 1-on-1 calls

## Implementation Guide

## Related Files
- `apps/client/src/hooks/use-screen-share.ts`
- `apps/client/src/components/media-controls.tsx`

## Next Task
TASK-028 — Device Enumeration
