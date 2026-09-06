## MODIFIED Requirements

### Requirement: Call recording
While in a room the local user SHALL be able to record the call to a file on
their device. The recording SHALL capture a composited video program of the
whole call - every publishing participant shown as a tile, with an active
screen share shown in place of camera tiles while one exists - and a single
mixed audio track carrying every participant's audio, including the local
user's own. The composite SHALL reflect membership and publishing changes
while recording continues without interruption. The recording SHALL start
only from an explicit user action and SHALL stop and save when the user
leaves the room or closes the page. The control SHALL be hidden entirely when
the browser provides no usable media recorder, and disabled when no
participant in the room is publishing any media.

#### Scenario: Start and stop a recording
- **WHEN** the user presses the record control and later stops it
- **THEN** a single media file of the call so far is saved to their device

#### Scenario: All participants are captured
- **WHEN** remote participants are publishing camera, microphone, or screen while the recording is active
- **THEN** the saved file shows their video tiles and carries their audio alongside the local user's

#### Scenario: Screen share replaces camera tiles
- **WHEN** any participant shares their screen during a live recording
- **THEN** the composited video shows the screen share in place of the camera tiles while it lasts

#### Scenario: Late participant is included
- **WHEN** a participant starts publishing after the recording started
- **THEN** they appear and are heard in the recording without the file being restarted

#### Scenario: Participant leaves during recording
- **WHEN** a participant leaves or stops publishing while the recording is active
- **THEN** the composite updates accordingly and the recording continues uninterrupted

#### Scenario: Own devices are off but others publish
- **WHEN** the local user has neither camera nor microphone active while other participants publish media
- **THEN** the record control is enabled and the saved file captures the other participants

#### Scenario: Nothing to record
- **WHEN** no participant in the room is publishing any media
- **THEN** the record control is visible but disabled

#### Scenario: Unsupported browser
- **WHEN** the browser exposes no usable media recorder implementation
- **THEN** the record control is not rendered at all

#### Scenario: Leaving while recording
- **WHEN** the user leaves the room or closes the page while a recording is active
- **THEN** the recording stops and the material captured so far is saved
