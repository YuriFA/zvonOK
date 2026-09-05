# Tasks: add-keyboard-shortcuts

## 1. Hook

- [x] 1.1 Create `apps/client/src/features/room/hooks/use-keyboard-shortcuts.ts` per design.md: single window keydown listener, modifier + editable-target guards, key map m/v/s, `enabled` flag, cleanup on unmount
- [x] 1.2 Colocated tests `use-keyboard-shortcuts.test.tsx`: m/v/s dispatch to handlers; suppressed for input/textarea/contentEditable focus and Ctrl/Meta/Alt; `repeat` ignored; inert when `enabled=false`

## 2. Wiring

- [x] 2.1 Wire `useKeyboardShortcuts` in `active-room-view.tsx` with the existing `handleToggleAudio`/`handleToggleVideo` and a screen-share toggle that respects `isSharing` and `isScreenShareBlocked`; enabled only in the active call state
- [x] 2.2 Extend `apps/client/src/routes/__tests__/room.test.tsx` (or active-room test if colocated) to assert a keypress reaches the `toggleAudio` mock and is suppressed while the chat input is focused

## 3. Verification

- [x] 3.1 `pnpm -C apps/client test:run` green
- [x] 3.2 `pnpm -C apps/client lint` green
- [x] 3.3 `pnpm -C apps/client build` green
