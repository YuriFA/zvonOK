# TASK-029 — Device Switching

## Status
completed

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

### Files Created/Modified

1. **`apps/client/src/lib/webrtc/manager.ts`**
   - Added `replaceTrack(kind, newTrack)` - replaces track in all peer connections
   - Added `getVideoTrack()` and `getAudioTrack()` - get current tracks

2. **`apps/client/src/lib/media/manager.ts`**
   - Added `switchVideoDevice(deviceId)` - switch camera with fallback
   - Added `switchAudioDevice(deviceId)` - switch microphone with fallback
   - Added `onDeviceSwitch(callback)` - subscribe to device switch events
   - Added `getVideoDeviceId()` and `getAudioDeviceId()` - get current device IDs

3. **`apps/client/src/features/media/hooks/use-device-switching.ts`** (new)
   - `useDeviceSwitching()` hook for device switching in React components
   - `useDeviceLostHandler()` hook for handling device disconnection
   - Integrates MediaStreamManager with WebRTCManager for seamless switching

### Usage Example

```tsx
import { useDeviceSwitching, useDeviceLostHandler } from '@/features/media/hooks';

function RoomPage() {
  const { switchVideoDevice, switchAudioDevice, switchSpeakerDevice, isSpeakerSwitchSupported } = useDeviceSwitching();

  // Handle device lost (e.g., camera unplugged)
  useDeviceLostHandler((kind) => {
    console.log(`${kind} device was disconnected`);
    // Optionally switch to default device
  });

  const handleCameraChange = async (deviceId: string) => {
    const success = await switchVideoDevice(deviceId);
    if (!success) {
      // Handle error
    }
  };

  const handleSpeakerChange = async (deviceId: string) => {
    const videoElement = document.querySelector('video');
    await switchSpeakerDevice(videoElement, deviceId);
  };
}
```

## Related Files
- `apps/client/src/features/media/hooks/use-media-devices.ts`
- `apps/client/src/features/media/hooks/use-device-switching.ts`
- `apps/client/src/lib/media/manager.ts`
- `apps/client/src/lib/webrtc/manager.ts`

## Next Task
TASK-030 — Device Permissions
