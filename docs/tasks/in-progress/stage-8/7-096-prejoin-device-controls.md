# TASK-096 — Prejoin Device Controls Redesign

> **Status:** completed
> **Priority:** high
> **Created:** 2026-03-24

---

## Description

Redesign prejoin-view: compact layout + unified device controls in a single row.

## Scope

- New DeviceControlGroup component (toggle + device dropdown in one group)
- Compact CopyLink variant
- Update DeviceSelector to use DeviceControlGroup
- Simplify PrejoinView layout

## Technical Design

### DeviceControlGroup

Device button as a two-part group:
- **Toggle button** — enables/disables the device
- **Dropdown button** — opens device list

Props:
- `type: 'videoinput' | 'audioinput' | 'audiooutput'`
- `isEnabled: boolean`
- `onToggle: () => void`
- `devices: MediaDevice[]`
- `selectedDeviceId: string | null`
- `onDeviceChange: (id: string) => void`
- `disabled?: boolean`

### Layout

Horizontal row of 3 buttons below preview:
- Microphone (audioinput)
- Speaker (audiooutput) — only if supported by browser
- Camera (videoinput)

### CopyLink compact

Copy button only, no input field.

## Acceptance Criteria

- [x] On medium screen (768px height) all content fits without scrolling
- [x] Three device buttons in a row: microphone, speaker, camera
- [x] Each button has toggle + device dropdown (speaker only has dropdown)
- [x] CopyLink has compact variant
- [x] Speaker shown only if supported by browser

## Related Files

- `apps/client/src/features/media/components/device-control-group.tsx` (new)
- `apps/client/src/features/media/components/device-selector.tsx`
- `apps/client/src/features/room/components/prejoin-view.tsx`
- `apps/client/src/components/ui/copy-link.tsx`
