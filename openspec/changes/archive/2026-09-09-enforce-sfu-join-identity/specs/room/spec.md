## MODIFIED Requirements

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
