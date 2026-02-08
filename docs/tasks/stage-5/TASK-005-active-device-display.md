# TASK-005 — Active Device Display

## Status
pending

## Priority
low

## Description
Display the currently active devices (camera, microphone, speaker) in the UI with visual indicators.

## Scope
- Component showing current device selection
- Visual indicator for each device type
- Device label display
- Integration with device state from DeviceManager
- Placement in MediaControls or settings panel

## Out of Scope
- Device switching (covered by TASK-004)
- Device enumeration (covered by TASK-001)
- Permission prompts

## Technical Design

### Component Structure

```typescript
interface ActiveDeviceDisplayProps {
  camera?: MediaDeviceInfo;
  microphone?: MediaDeviceInfo;
  speaker?: MediaDeviceInfo;
  compact?: boolean; // For smaller display areas
}
```

### UI Variants

**Full Display (in settings):**
```
Camera: FaceTime HD Camera
Mic: Built-in Microphone
Speaker: Built-in Speakers
```

**Compact Display (in controls):**
```
📷 🔊 🔇
```

### Icons
- Camera: 📷 or video camera icon
- Microphone: 🎤 or microphone icon
- Speaker: 🔊 or speaker icon
- Muted: 🔇 or muted icon

## Acceptance Criteria
- [ ] ActiveDeviceDisplay component created
- [ ] Shows device names in full mode
- [ ] Shows icons in compact mode
- [ ] Updates when device changes
- [ ] Handles missing devices gracefully
- [ ] Accessible labels for screen readers

## Definition of Done
- Acceptance criteria satisfied
- Component tested with device changes
- Responsive design

## Related Files
- `apps/client/src/components/MediaControls.tsx` - Display location
- `apps/client/src/features/media/components/active-device-display.tsx` - New component

## Next Task
TASK-003 — Device Permissions (Stage 5)
