## MODIFIED Requirements

### Requirement: SFU join and leave
A client SHALL join a room via `sfu:join` with `{roomId}` plus a verifiable
credential, and leave via `sfu:leave` or disconnect. The server SHALL derive
the participant's identity and permissions exclusively from a verified
credential - a room token in the join payload, a registered-user access JWT
presented by the handshake, or an approved-guest JWT bound to the room - and
SHALL NOT trust client-supplied identity fields (`userId`, `username`,
`roomOwnerId`) for any authorization decision. The server tracks peers per
room and notifies the room on membership changes. A join that presents no
verifiable credential SHALL be refused with a coded error and no peer created.

#### Scenario: Peer joins a group call
- **WHEN** a client emits `sfu:join` for an active room with a verifiable
  credential
- **THEN** the peer is registered and existing peers are notified of the new
  participant

#### Scenario: Registered user joins from the app
- **WHEN** the app UI joins a user-owned room carrying a valid access JWT in
  the handshake
- **THEN** the participant identity (id, display name) is taken from the
  verified JWT and the user record, not from the payload

#### Scenario: Approved guest joins
- **WHEN** a guest presents the guest JWT issued at approval for that room
- **THEN** the participant joins under the token's guest identity and display
  name, scoped to that room only

#### Scenario: Unauthenticated join refused
- **WHEN** a client emits `sfu:join` with no token, no valid access JWT, and
  no guest JWT for the room
- **THEN** the join is refused with a coded authentication error and no peer
  is created

#### Scenario: Spoofed payload identity ignored
- **WHEN** a join presents a valid credential and additional payload fields
  claiming a different `userId` or `username`
- **THEN** the claimed fields have no effect on the created peer or on any
  authorization decision

### Requirement: Owner powers
The room owner SHALL kick a peer via `sfu:kick-peer` (`{userId}`); the kicked
peer's transports and producers are torn down. The host - the room owner for
user-owned rooms, a room-admin token participant for project rooms - SHALL
additionally mute a single peer (`sfu:mute-peer`), mute all currently
publishing peers at once (`sfu:mute-all`), and lock or unlock the room
(`sfu:lock-room`). Host status SHALL be determined only from server-verified
state: the `room.ownerId` column matched against a verified user identity, or
the admin claim of a verified room token. The server enforces authorization
for every new event: denied attempts receive a coded authorization error and
change nothing. A locked room refuses new joins on every identity path until
unlocked; the lock is cleared when the room ends. A forcibly muted peer's
audio and video producers are paused by the server and the peer is notified.

#### Scenario: Owner kicks an abusive participant
- **WHEN** the room owner emits `sfu:kick-peer` with a peer's userId
- **THEN** that peer's media is torn down and they are removed from the room

#### Scenario: Host mutes a speaking peer
- **WHEN** the host emits `sfu:mute-peer` for a publishing peer
- **THEN** that peer's producers are paused server-side, the peer receives a muted-by-host notice, and the room is informed

#### Scenario: Mute-all silences every publisher
- **WHEN** the host emits `sfu:mute-all`
- **THEN** every publishing peer except the host is muted with notices

#### Scenario: Locked room refuses new joiners
- **WHEN** a new participant attempts to join a locked room on any identity path
- **THEN** the join is refused with a room-locked error and no peer is created

#### Scenario: Lock ends with the room
- **WHEN** a locked room ends
- **THEN** the lock state is discarded with the room

#### Scenario: Non-host denied
- **WHEN** a participant that is neither the owner nor an admin-token holder emits a host-control event
- **THEN** the server responds with a coded authorization error and no state changes

#### Scenario: Forged ownership claim denied
- **WHEN** a non-owner joins with a payload or credential claiming ownership
  of a room they do not own
- **THEN** the participant joins without host powers and every host-control
  attempt is refused with a coded authorization error

### Requirement: Room-token join path
The `/sfu` join SHALL accept an ephemeral room token as one of its verified
credential paths. When a join presents a valid room token, the server SHALL
derive participant identity and permissions solely from the verified token
and SHALL ignore client-supplied identity fields for that participant.
Credentials that identify a user or guest through the connection handshake
(a valid access JWT cookie or an approved guest JWT) SHALL be accepted only
from app origins in the configured allowlist; the room-token path SHALL remain
acceptable from any origin so third-party SDK embeds keep working.

#### Scenario: Valid token join
- **WHEN** a client joins with a non-expired token minted for that room
- **THEN** the participant joins under the token's participant id and display name, and other peers see that identity in peer events

#### Scenario: Expired or malformed token
- **WHEN** a client joins with an expired, malformed, or wrong-room token
- **THEN** the join is refused with a coded error and no peer is created

#### Scenario: Existing paths unchanged
- **WHEN** a user joins with cookie-JWT or a guest joins with the guest flow,
  without a room token
- **THEN** the join UX and room events are as before; only the identity
  source changes - verified handshake credentials instead of payload fields

#### Scenario: Publish denial by permission
- **WHEN** a token without publish permission attempts to produce media
- **THEN** the produce request is refused with a permission error

#### Scenario: Admin rights from token
- **WHEN** a token with room-admin rights is used in a project-owned room
- **THEN** that participant may perform owner-level actions (such as kick) in that room

#### Scenario: Cookie identity only from app origins
- **WHEN** a join relies on handshake cookie identity and originates from an
  origin outside the configured app-origin allowlist
- **THEN** the cookie identity is not accepted and the join is refused unless
  a room token is presented
