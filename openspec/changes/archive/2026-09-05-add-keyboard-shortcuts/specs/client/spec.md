## ADDED Requirements

### Requirement: Keyboard control of room media
The room page SHALL support keyboard control of the media actions exposed by
its control bar: microphone toggle, camera toggle, and screen-share toggle,
with the guards defined in the keyboard-shortcuts capability.

#### Scenario: Camera toggle via keyboard
- **WHEN** the user presses `v` during a call
- **THEN** the camera toggles exactly as if the control-bar button was
  clicked, and the button state reflects it
