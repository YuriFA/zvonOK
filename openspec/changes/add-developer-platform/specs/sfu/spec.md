## ADDED Requirements

### Requirement: Room-token join path
The `/sfu` join SHALL accept an ephemeral room token as a third identity path
besides cookie-JWT users and guest cookies. When a join presents a valid room
token, the server SHALL derive participant identity and permissions solely from
the verified token and SHALL ignore client-supplied identity fields for that
participant.

#### Scenario: Valid token join
- **WHEN** a client joins with a non-expired token minted for that room
- **THEN** the participant joins under the token's participant id and display name, and other peers see that identity in peer events

#### Scenario: Expired or malformed token
- **WHEN** a client joins with an expired, malformed, or wrong-room token
- **THEN** the join is refused with a coded error and no peer is created

#### Scenario: Publish denial by permission
- **WHEN** a token without publish permission attempts to produce media
- **THEN** the produce request is refused with a permission error

#### Scenario: Admin rights from token
- **WHEN** a token with room-admin rights is used in a project-owned room
- **THEN** that participant may perform owner-level actions (such as kick) in that room

#### Scenario: Existing paths unchanged
- **WHEN** a user joins with cookie-JWT or a guest joins with the guest flow, without a room token
- **THEN** behavior is identical to before this change
