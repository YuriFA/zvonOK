# TASK-004 — Device Selector UI

## Status
pending

## Priority
medium

## Description
Create device selector dropdown/settings panel component for switching between cameras, microphones, and speakers.

## Scope
- Device selector dropdown component
- Separate selectors for audio input, audio output, and video input
- Integration with DeviceManager for available devices
- Visual feedback for currently selected device
- Loading state while enumerating devices

## Out of Scope
- Actual device enumeration logic (TASK-001)
- Device switching implementation (TASK-002)
- Permission handling (TASK-003)

## Technical Design

### Component Structure

```typescript
interface DeviceSelectorProps {
  type: 'audioinput' | 'audiooutput' | 'videoinput';
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
}

// Usage
<DeviceSelector
  type="videoinput"
  devices={videoDevices}
  selectedDeviceId={selectedCamera}
  onDeviceChange={handleCameraChange}
/>
```

### UI Design
- Dropdown with device labels
- Device icons (microphone, speaker, camera)
- Current device indicator
- Disabled state when no devices available

### Labels
- Camera: "FaceTime HD Camera", "External Webcam"
- Microphone: "Built-in Microphone", "USB Microphone"
- Speaker: "Built-in Speakers", "External Headphones"

## Acceptance Criteria
- [ ] DeviceSelector component created
- [ ] Separate selectors for camera, mic, and speaker
- [ ] Displays friendly device names
- [ ] Shows current selection
- [ ] Disabled when no devices available
- [ ] Callback fires on selection change
- [ ] Accessible with keyboard navigation

## Definition of Done
- Acceptance criteria satisfied
- TypeScript types defined
- Component tested with mock devices
- Reusable across the app

## Related Files
- `apps/client/src/features/media/components/device-selector.tsx` - New component
- `apps/client/src/features/media/components/device-settings-panel.tsx` - Settings container
- TASK-001-device-enumeration.md - Device enumeration logic

## Next Task
TASK-005 — Active Device Display
