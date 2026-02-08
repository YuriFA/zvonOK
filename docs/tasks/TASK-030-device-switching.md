# TASK-029 — Device Switching

## Status
planned

## Priority
medium

## Description
Implement switching between cameras, microphones, and speakers without disrupting WebRTC connections.

## Scope
- Switch camera using getUserMedia + replaceTrack
- Switch microphone using getUserMedia + replaceTrack
- Switch speaker using setSinkId (Chrome only)
- Graceful fallback to default device
- Device lost handling

## Out of Scope
- Device permissions (covered in TASK-030)

## Technical Design

### Camera Switching
```typescript
const switchCamera = async (deviceId: string) => {
  const newStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId } },
    audio: true,
  });

  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  await sender?.replaceTrack(newStream.getVideoTracks()[0]);
};
```

### Speaker Switching (Chrome only)
```typescript
const switchSpeaker = async (element, deviceId: string) => {
  if ('setSinkId' in HTMLMediaElement.prototype) {
    await element.setSinkId(deviceId);
  }
};
```

### Fallback Strategy
```typescript
try {
  await getUserMedia({ video: { deviceId: { exact: deviceId } } });
} catch {
  await getUserMedia({ video: true }); // Use default
}
```

## Acceptance Criteria
- Camera switches without connection loss
- Microphone switches without connection loss
- Speaker switches output audio (Chrome)
- Fallback to default on error
- Device lost handled gracefully

## Definition of Done
- All device types switchable
- No WebRTC disruption
- Fallback strategies working
- User notified of device changes

## Implementation Guide

## Related Files
- `apps/client/src/hooks/use-media-devices.ts`

## Next Task
TASK-030 — Device Permissions
