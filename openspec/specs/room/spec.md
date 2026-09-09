# Room Management Specification

## Purpose

Room lifecycle (create, lookup, update, end, cleanup) and the guest join
approval flow. Rooms are the unit calls and chat messages attach to.

## Requirements

### Requirement: Room creation with slug
HOST or ADMIN users SHALL create rooms via `POST /rooms` with an optional name
(max 100 chars) and optional `maxParticipants` (2-50, default 10). The server
generates a unique 6-character alphanumeric slug, retrying collisions up to 10
times before falling back to a timestamp-based slug.

#### Scenario: Collision during slug generation
- **WHEN** a generated slug already exists
- **THEN** a new slug is generated, up to 10 attempts, then a timestamp-based
  slug is used

### Requirement: Public room lookup by slug
`GET /rooms/:slug` SHALL be public (no auth) and return the room for pre-join
validation.

#### Scenario: Guest validates an invite link
- **WHEN** an unauthenticated visitor opens `GET /rooms/abc123`
- **THEN** the room's public data is returned without requiring login

### Requirement: Owner-only modification
Room update and delete SHALL be restricted to the room owner. Updates accept
optional `name`, `maxParticipants`, and `status` (`active` | `ended`).

#### Scenario: Non-owner attempts an update
- **WHEN** a user who does not own the room calls `PATCH /rooms/:id`
- **THEN** the request is rejected as forbidden

### Requirement: Room end is soft with SFU shutdown
Ending a room SHALL set `status = ended` and `endedAt`, and trigger
`sfuService.endRoom(id)` to tear down media sessions.

#### Scenario: Owner ends the room
- **WHEN** the owner sets status to `ended`
- **THEN** the room row is marked ended and all SFU peers are disconnected

### Requirement: Hourly cleanup of ended rooms
A background job SHALL run hourly and hard-delete rooms with `status = ended`
whose `endedAt` is older than 1 hour.

#### Scenario: Ended room older than an hour
- **WHEN** the hourly job runs and a room ended 2 hours ago exists
- **THEN** the room row (and its messages, by cascade) is deleted

### Requirement: Guest join approval flow
Guests SHALL request to join a room; the owner approves or denies. Guest
identity is carried in an HTTP-only cookie token scoped to the room.

- Guest endpoints: request, owner approve, owner deny, pre-approval check,
  and status polling.
- A guest token grants access only to the room it was issued for.
- After approval the guest receives a persistent message identity
  (`guestId` + display name) usable across reconnects.
- The guest JWT issued at approval SHALL also authorize the guest's SFU join
  for that room: the SFU derives the guest's participant identity from the
  verified token.

#### Scenario: Guest requests entry to a locked room
- **WHEN** a guest submits a display name for a room requiring approval
- **THEN** the owner sees the request in the participants list and the guest
  polls status until approved or denied

#### Scenario: Guest token used on another room
- **WHEN** a guest presents a token for room A against room B
- **THEN** the request is rejected as forbidden

#### Scenario: Approved guest enters the call
- **WHEN** an approved guest presents their guest JWT when joining the SFU
  for the room it was issued for
- **THEN** the guest joins the call under the token's guest identity without
  any client-supplied identity being trusted

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
