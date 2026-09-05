# Proposal: add-keyboard-shortcuts

## Why

During a call, mic/camera/screen-share toggles require mouse trips to the
control bar. Every competitor (Meet, Zoom) binds single-key shortcuts; this
was also a planned ux-polish backlog item that never shipped.

## What Changes

- Add a `use-keyboard-shortcuts` hook (client, `features/room/hooks/`) bound
  while the active room view is mounted.
- Shortcuts: `m` toggles microphone, `v` toggles camera, `s` toggles screen
  share (start when idle and not blocked, stop when sharing).
- Shortcuts are suppressed while focus is in an editable element (chat input,
  display-name fields, textareas, contentEditable) and when a modifier key
  (Ctrl/Meta/Alt) is held.
- No server changes; no new dependencies.

## Capabilities

### New Capabilities

- `keyboard-shortcuts`: single-key call controls in the active room.

### Modified Capabilities

- `client`: the room view requirement gains keyboard control of existing
  media actions - behavior addition, no breaking change.

## Impact

- Affected code: `apps/client/src/features/room/components/active-room-view.tsx`
  (wiring), new `apps/client/src/features/room/hooks/use-keyboard-shortcuts.ts`,
  colocated hook tests, room route test if wiring changes props.
- Specs: `specs/client/spec.md` gains one ADDED requirement; new
  `specs/keyboard-shortcuts/spec.md`.
- Risks: key handling collisions with Base UI components - mitigated by the
  editable-element guard; screen-share shortcut must respect the server's
  room-level exclusive lock (`isScreenShareBlocked`).
