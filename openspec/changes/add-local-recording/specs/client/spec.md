# client

## ADDED Requirements

### Requirement: Local recording
While in a room the local user SHALL be able to record their own camera and
microphone to a file on their device. The recording SHALL start only from an
explicit user action, SHALL be indicated in the UI while active (with elapsed
time), and SHALL produce a single `.webm` download when stopped. The control
SHALL be hidden entirely when the browser provides no usable `MediaRecorder`,
and disabled when neither camera nor microphone is active. If a recorded track
ends unexpectedly (device unplug, revoked permission) or the user leaves the
room while recording, the capture SHALL stop and the already-captured material
SHALL still be saved.

#### Scenario: Start and stop a recording
- **WHEN** the user with an active camera or microphone presses the record control and later stops it
- **THEN** a single `.webm` file containing the captured material is downloaded

#### Scenario: Unsupported browser
- **WHEN** the browser exposes no usable `MediaRecorder` implementation
- **THEN** the record control is not rendered at all

#### Scenario: Nothing to record
- **WHEN** the user has neither camera nor microphone active
- **THEN** the record control is visible but disabled

#### Scenario: Device disappears mid-recording
- **WHEN** a recorded track ends unexpectedly while the recording is active
- **THEN** the recording stops and the material captured so far is saved

#### Scenario: Leaving while recording
- **WHEN** the user leaves the room while a recording is active
- **THEN** the recording stops and the material captured so far is saved
