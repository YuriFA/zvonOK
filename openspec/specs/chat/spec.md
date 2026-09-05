# Chat Specification

## Purpose

Real-time text chat per room: REST for sending and history, WebSocket for
live delivery, with guest participation authorized by room tokens.

## Requirements

### Requirement: Send message via REST
`POST /messages` SHALL persist a message for an authenticated user in a room,
rate-limited to 30 requests per minute, returning 201 with the saved message.

#### Scenario: Rate limit exceeded
- **WHEN** a user posts more than 30 messages within 60 seconds
- **THEN** further posts are rejected by the throttler until the window resets

### Requirement: Message history via REST
`GET /messages/:roomId` SHALL return the room's messages oldest-first with
pagination `page` (min 1, default 1) and `limit` (1-100, default 50).

#### Scenario: Limit clamping
- **WHEN** `limit=500` is requested
- **THEN** the server returns at most 100 messages

### Requirement: Chat WebSocket namespace
The server SHALL expose a `/chat` Socket.io namespace authenticating on
connect: registered users via JWT in the handshake, guests via the HTTP-only
room-token cookie. Unauthenticated connections are refused.

#### Scenario: Guest connects with a room token
- **WHEN** a guest socket presents a token cookie for room A
- **THEN** the socket is accepted with identity `{guestId, roomSlug,
  displayName}` and may only read/write room A's chat

### Requirement: Real-time events
The namespace SHALL handle client events `chat:send` (`{roomId, content}`) and
`chat:history` (`{roomId}`), and emit server events `chat:message`
(broadcast to the room) and `chat:error` (`{event, message}`, to the sender
only).

#### Scenario: Message broadcast
- **WHEN** a room member sends `chat:send` for a room they belong to
- **THEN** the message is persisted and `chat:message` is broadcast to every
    socket joined to that room

#### Scenario: Guest targets a foreign room
- **WHEN** a guest sends `chat:send` with a `roomId` different from their
  token's room
- **THEN** the server emits `chat:error` with message `Forbidden`

### Requirement: Guest message identity
Guest messages SHALL be persisted with `guestId` and broadcast with
`isGuest: true` and a pseudo-user `{id: guestId, username: displayName}`; the
`userId` column stays null.

#### Scenario: Guest message rendering
- **WHEN** a guest message is broadcast
- **THEN** the payload carries `isGuest: true` and the guest's display name,
  and `userId` is null in storage

### Requirement: Message persistence
Messages SHALL belong to a room and optionally to a user (`userId` nullable)
or carry a `guestId`; deleting the room or the author user cascades to their
messages.

#### Scenario: Room deletion cascades
- **WHEN** a room is hard-deleted by the cleanup job
- **THEN** all of its messages are deleted with it
