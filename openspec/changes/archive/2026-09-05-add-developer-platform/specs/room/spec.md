## ADDED Requirements

### Requirement: Room ownership
A room SHALL have exactly one of two ownership kinds: a zvonok user host
(existing behavior - owner manages the room through the authenticated app) or a
platform project (room created via the public API; no zvonok user host).
User-facing behavior for user-owned rooms is unchanged.

#### Scenario: User-owned room unchanged
- **WHEN** a HOST user creates a room through the app API
- **THEN** the room is user-owned and behaves exactly as before this change

#### Scenario: Project-owned room
- **WHEN** a room is created via the public API with a valid key
- **THEN** the room has no user host, belongs to the key's project, and does not appear in any user's room management

### Requirement: Room lifecycle for project rooms
Project-owned rooms SHALL follow the same status and cleanup rules as
user-owned rooms: an ended room is torn down (participants disconnected, SFU
router closed) and hard-deleted by the hourly cleanup after its retention
window. Ending a project room is performed via the public API.

#### Scenario: Cleanup deletes ended project room
- **WHEN** a project room was ended more than the retention window ago
- **THEN** the hourly cleanup hard-deletes it together with its messages
