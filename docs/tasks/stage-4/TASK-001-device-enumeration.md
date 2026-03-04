# TASK-028 — Device Enumeration

## Status
planned

## Priority
medium

## Description
Implement media device enumeration to list available cameras, microphones, and speakers using enumerateDevices API.

## Scope
- Create useMediaDevices hook
- Request permissions first (needed for labels)
- Enumerate video input devices
- Enumerate audio input devices
- Enumerate audio output devices (speakers)
- Listen for devicechange events
- Save selections in localStorage

## Out of Scope
- Device switching (covered in TASK-029)
- Device permissions handling (covered in TASK-030)

## Technical Design

### Device Enumeration Flow
```typescript
// Must request permission first
await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

// Now enumerate
const devices = await navigator.mediaDevices.enumerateDevices();
const videoDevices = devices.filter(d => d.kind === 'videoinput');
const audioDevices = devices.filter(d => d.kind === 'audioinput');
const speakerDevices = devices.filter(d => d.kind === 'audiooutput');
```

### Device Change Events
```typescript
navigator.mediaDevices.ondevicechange = handleDeviceChange;
```

## Acceptance Criteria
- Device list displays with labels
- Video, audio, and speaker devices enumerated
- Permissions requested before enumeration
- Selection persisted in localStorage

## Definition of Done
- All device types enumerated
- Labels visible (not empty)
- Device change events handled
- LocalStorage persistence working

## Implementation Guide

## Related Files
- `apps/client/src/hooks/use-media-devices.ts`

## Next Task
TASK-029 — Device Switching
