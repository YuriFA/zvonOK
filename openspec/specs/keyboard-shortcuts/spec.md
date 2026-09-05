# Keyboard Shortcuts Specification

## Purpose

Single-key control of the most frequent in-call media actions, active while
the room call view is open.

## Requirements

### Requirement: Single-key media toggles
While the active room view is mounted, the client SHALL toggle the
microphone on `m`, the camera on `v`, and screen share on `s` (start when
idle, stop when sharing).

#### Scenario: Pressing m mutes
- **WHEN** the user presses `m` during a call with the mic on and focus not
  in an editable element
- **THEN** the microphone is muted without touching the control bar

#### Scenario: Pressing s while blocked
- **WHEN** the user presses `s` while another peer holds the screen-share
  lock
- **THEN** the share attempt surfaces the same blocked feedback as the
  control-bar button and the call is unaffected

### Requirement: Editable-focus suppression
Shortcuts SHALL be suppressed while the event target is an editable element
(input, textarea, contentEditable) or when Ctrl/Meta/Alt is held, so typing
chat messages and browser shortcuts are never intercepted.

#### Scenario: Typing in chat
- **WHEN** the chat input has focus and the user types `m`
- **THEN** the character goes to the input and the microphone state is
  unchanged

### Requirement: Shortcut scope
Shortcuts SHALL be active only in the active room view - not on pre-join,
home, login, or register screens.

#### Scenario: Pre-join typing
- **WHEN** the user types a display name containing `m` on the pre-join
  screen
- **THEN** no media toggles occur
