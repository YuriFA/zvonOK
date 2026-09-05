# sfu

## MODIFIED Requirements

### Requirement: Owner powers
The room owner SHALL kick a peer via `sfu:kick-peer` (`{userId}`); the kicked
peer's transports and producers are torn down. The host - the room owner for
user-owned rooms, a room-admin token participant for project rooms - SHALL
additionally mute a single peer (`sfu:mute-peer`), mute all currently
publishing peers at once (`sfu:mute-all`), and lock or unlock the room
(`sfu:lock-room`). The server enforces authorization for every new event:
denied attempts receive a coded authorization error and change nothing. A
locked room refuses new joins on every identity path until unlocked; the lock
is cleared when the room ends. A forcibly muted peer's audio and video
producers are paused by the server and the peer is notified.

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
