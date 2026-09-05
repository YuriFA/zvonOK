# client

## ADDED Requirements

### Requirement: Host controls UI
When the local participant is the host - the owner of a user-owned room or a
room-admin token holder in a project room - the app SHALL expose host controls:
mute for each remote participant, mute-all, and a room lock toggle, calling the
SDK host-control actions and surfacing server denials as errors. Every
participant SHALL see an indication when the server forcibly mutes them, and
the room SHALL show a locked state to everyone while locked.

#### Scenario: Owner mutes a participant from the participant list
- **WHEN** the owner activates the mute control on a publishing participant
- **THEN** that participant's media stops and the mute is reflected in the owner's UI

#### Scenario: Muted by host indication
- **WHEN** the server forcibly mutes the local participant
- **THEN** the app shows a muted-by-host indication and the participant's own mic control reflects the server state

#### Scenario: Locked state visible
- **WHEN** the host locks the room
- **THEN** all participants see the locked indication and new join attempts fail with the room-locked error
