# SFU Specification

## Purpose

mediasoup Selective Forwarding Unit for group calls: Socket.io signalling on
the `/sfu` namespace, transport/producer/consumer lifecycle, peer and room
management, screen-share exclusivity, and TURN credential delivery. This
module is also the WebRTC signalling gateway; no separate P2P gateway exists.

## Requirements

### Requirement: SFU join and leave
A client SHALL join a room via `sfu:join` with
`{roomId, userId, username, roomOwnerId?, roomSlug?}` and leave via
`sfu:leave` or disconnect. The server tracks peers per room and notifies the
room on membership changes.

#### Scenario: Peer joins a group call
- **WHEN** a client emits `sfu:join` for an active room
- **THEN** the peer is registered and existing peers are notified of the new
  participant

### Requirement: Transport lifecycle
The server SHALL create send and receive WebRTC transports per peer
(`sfu:create-send-transport`, `sfu:create-recv-transport`), connect them via
`sfu:connect-transport` (`{transportId, dtlsParameters}`), and deliver ICE
server credentials (STUN/TURN) in the transport-created payload.

#### Scenario: Transport created with ICE credentials
- **WHEN** a peer creates a send transport
- **THEN** the response contains the transport parameters plus STUN/TURN
  credentials for ICE gathering

### Requirement: Producer lifecycle
A peer SHALL publish media via `sfu:produce`
(`{requestId, transportId, kind, rtpParameters, appData?}`), pause and resume
via `sfu:pause-producer` / `sfu:resume-producer` (`{producerId}`), and stop
via `sfu:close-producer` (`{producerId}`). Video supports simulcast layers.

#### Scenario: Camera mute via pause
- **WHEN** a peer pauses their video producer
- **THEN** consumers stop receiving frames without the producer being closed

### Requirement: Consumer lifecycle
A peer SHALL subscribe via `sfu:consume` (`{producerId, rtpCapabilities}`),
resume the consumer via `sfu:resume-consumer` (`{consumerId}`), and select a
simulcast layer via `sfu:set-preferred-layers` (`{consumerId, spatialLayer}`).

#### Scenario: New producer in the room
- **WHEN** a peer produces a video track
- **THEN** other room peers are offered a consumer for that producer and
    resume it after their transport is ready

### Requirement: Owner powers
The room owner SHALL kick a peer via `sfu:kick-peer` (`{userId}`); the kicked
peer's transports and producers are torn down.

#### Scenario: Owner kicks an abusive participant
- **WHEN** the room owner emits `sfu:kick-peer` with a peer's userId
- **THEN** that peer's media is torn down and they are removed from the room

### Requirement: Single worker with router per room
The server SHALL run a mediasoup Worker (recovered on crash) hosting one
Router per room, torn down when the room ends or empties.

#### Scenario: Worker crash
- **WHEN** the mediasoup Worker process dies
- **THEN** a new Worker is started and rooms recover their routers

### Requirement: Screen share exclusivity
Screen share SHALL hold an exclusive room-level lock: one active screen
producer per room; a second share attempt is rejected until the first closes.

#### Scenario: Second sharer is rejected
- **WHEN** a peer starts a screen share while another room peer holds the lock
- **THEN** the attempt fails and the existing share is unaffected

### Requirement: Quality monitoring
The server SHALL collect producer/consumer stats and report quality
indicators to clients for bandwidth adaptation and layer switching.

#### Scenario: Bandwidth drop
- **WHEN** a consumer's stats show sustained packet loss
- **THEN** the client adapts by requesting a lower spatial layer via
  `sfu:set-preferred-layers`

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
