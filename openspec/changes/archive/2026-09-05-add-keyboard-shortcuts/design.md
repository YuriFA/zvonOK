# Design: add-keyboard-shortcuts

## Context

- `active-room-view.tsx` already owns the toggle handlers: `handleToggleVideo`
  and `handleToggleAudio` wrap `toggleVideo`/`toggleAudio` from
  `use-room-sfu.ts`; screen share comes from `use-screen-share.ts`
  (`startScreenShare`, `stopScreenShare`, `isSharing`, `isScreenShareBlocked`).
- Conventions: React-free logic in `src/lib/`, React glue in
  `features/*/hooks`; kebab-case files; no barrel exports.

## Approach

New hook `apps/client/src/features/room/hooks/use-keyboard-shortcuts.ts`:

```ts
useKeyboardShortcuts({
  onToggleAudio: () => Promise<void> | void;
  onToggleVideo: () => Promise<void> | void;
  onToggleScreenShare: () => Promise<void> | void;
  enabled: boolean;
}): void
```

- Single `window` `keydown` listener added in `useEffect` when `enabled`.
- Guard: ignore when `event.getModifierState` reports Ctrl/Meta/Alt, or the
  target (or `composedPath()` head) is `INPUT`, `TEXTAREA`, or
  `isContentEditable`.
- Key map: `m` -> audio, `v` -> video, `s` -> screen share. Lowercase both
  `event.key` cases (ignore `repeat`).
- No new state: the hook only dispatches to existing handlers, so control-bar
  state stays the single source of truth.
- `active-room-view.tsx` wires it with the same callbacks the buttons use
  (screen share: `isSharing ? stop : isScreenShareBlocked ? surfaceBlockedFeedback : start`),
  `enabled` tied to the room being in the active call state.

Alternatives rejected:
- Global hotkey lib - three keys don't justify a dependency.
- Put the listener in `lib/` - the trigger set (React callbacks) lives in the
  room feature; a lib-level abstraction would be single-use.

## Testing

- Hook unit tests (`use-keyboard-shortcuts.test.tsx`, jsdom): dispatch
  KeyboardEvent on window, assert handler calls; assert suppression for
  input/textarea/contentEditable targets and Ctrl/Meta combos; assert no
  listener when `enabled=false`.
- Room route test: mock `use-room-session` as it already does; assert
  keypress toggles propagate to `toggleAudio` mock.
