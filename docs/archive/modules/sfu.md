# SFU Module (mediasoup)

## Purpose

Selective Forwarding Unit for scalable group video calls using mediasoup. Routes media streams between 3+ participants via a single Worker process with per-room Routers.

---

## Use Cases

### 1. Create Room Router
- On first peer join, create Router for the room via `WorkerManager`
- Subsequent peers reuse the same Router
- Router closed when last peer leaves or room is ended

### 2. Join SFU Room
- Register peer in room (independent of media tracks)
- Notify existing peers via `sfu:peer-joined`
- Send existing peer list via `sfu:existing-peers`
- Return Router RTP capabilities via `sfu:joined`

### 3. Create Transports
- Send and receive WebRTC Transports created per peer
- ICE servers list from `getIceServers()` included in `sfu:transport-created`
- Client completes DTLS handshake via `sfu:connect-transport`

### 4. Produce Track
- Client creates Producer on send Transport
- Server notifies other peers via `sfu:new-producer` (includes `paused` state)

### 5. Consume Track
- Client requests Consumer for a Producer
- Server creates Consumer in paused state
- Client resumes after local setup

### 6. Pause/Resume Producer
- Client pauses/resumes its own producers
- Server broadcasts `sfu:producer-state-changed` to room peers

### 7. Leave Room
- Client emits `sfu:leave` or disconnects
- Server closes transports, removes peer, notifies others via `sfu:peer-left`
- If last peer, closes Router

### 8. Kick Participant
- Room owner requests participant removal via `sfu:kick-peer`
- Target peer receives `sfu:kicked` and is disconnected
- Remaining peers receive `sfu:peer-left`

### 9. End Room
- Called by `RoomController` on `DELETE /rooms/:id`
- Broadcasts `sfu:room-ended` to all peers
- Closes all transports and Router

### 10. Screen Share
- A peer may have at most one `video` producer with `appData.source: 'screen'`
- A room may have at most one active `source: 'screen'` producer across all peers
- Server tracks active screen sharer per room (`roomScreenShare: Map<roomId, socketId>`)
- If a second peer attempts screen share while one is active, server emits `sfu:produce-error` with `code: 'SCREEN_SHARE_ALREADY_ACTIVE'`
- When screen share starts, server emits `sfu:screen-share-started` to all other room peers
- When screen share stops (via `sfu:close-producer`, disconnect, leave, or kick), server emits `sfu:screen-share-stopped`
- `sfu:new-producer` and `sfu:producer-created` include `appData.source` to distinguish camera vs screen

#### Produce error codes

| Code | Meaning |
|------|---------|
| `SCREEN_SHARE_ALREADY_ACTIVE` | Another participant is already sharing |
| `SEND_TRANSPORT_NOT_READY` | Peer has no send transport |
| `TRANSPORT_NOT_FOUND` | Specified transport ID does not match |
| `PRODUCE_FAILED` | mediasoup producer creation failed |

---

## mediasoup Hierarchy

```
WorkerManager (singleton)
  └── Worker (single OS process)
      ├── Router (per room)
      │   ├── WebRtcTransport (send, per peer)
      │   │   └── Producer (incoming track)
      │   └── WebRtcTransport (recv, per peer)
      │       └── Consumer (outgoing track)
      └── Router (per room)
          └── ...
```

> **Note:** Current implementation uses a single Worker. Multi-worker scaling is planned for horizontal scaling.

---

## WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `sfu:join` | Client → Server | `{ roomId, userId, username, roomOwnerId? }` | Join SFU room |
| `sfu:joined` | Server → Client | `{ routerRtpCapabilities }` | SFU room joined |
| `sfu:peer-joined` | Server → Client | `{ userId, username }` | Notify existing peers about new participant |
| `sfu:existing-peers` | Server → Client | `[{ userId, username }]` | Sent to new peer with list of existing participants |
| `sfu:leave` | Client → Server | `{}` | Leave SFU room voluntarily |
| `sfu:create-send-transport` | Client → Server | `{}` | Create the peer send transport |
| `sfu:create-recv-transport` | Client → Server | `{}` | Create the peer receive transport |
| `sfu:transport-created` | Server → Client | `{ direction, transportId, iceParameters, iceCandidates, dtlsParameters, iceServers }` | Transport parameters ready |
| `sfu:connect-transport` | Client → Server | `{ transportId, dtlsParameters }` | Complete DTLS handshake |
| `sfu:transport-connected` | Server → Client | `{ transportId }` | Transport handshake completed |
| `sfu:produce` | Client → Server | `{ requestId, transportId, kind, rtpParameters, appData? }` | Create producer |
| `sfu:producer-created` | Server → Client | `{ requestId, producerId, userId, kind, appData? }` | Producer created |
| `sfu:produce-error` | Server → Client | `{ requestId, code, message }` | Producer creation failed or rejected |
| `sfu:new-producer` | Server → Client | `{ producerId, userId, username, kind, paused, appData? }` | Notify peers about consumable producer |
| `sfu:close-producer` | Client → Server | `{ producerId }` | Close and dispose a producer |
| `sfu:screen-share-started` | Server → Room | `{ userId }` | A participant started screen sharing |
| `sfu:screen-share-stopped` | Server → Room | `{ userId }` | Screen sharing stopped |
| `sfu:consume` | Client → Server | `{ producerId, rtpCapabilities }` | Create consumer |
| `sfu:consumer-created` | Server → Client | `{ consumerId, producerId, kind, rtpParameters }` | Consumer created (paused state) |
| `sfu:resume-consumer` | Client → Server | `{ consumerId }` | Resume a paused consumer |
| `sfu:consumer-resumed` | Server → Client | `{ consumerId }` | Consumer is now active |
| `sfu:pause-producer` | Client → Server | `{ producerId }` | Pause producer |
| `sfu:resume-producer` | Client → Server | `{ producerId }` | Resume producer |
| `sfu:producer-state-changed` | Server → Client | `{ producerId, kind, userId, paused }` | Broadcast producer pause/resume |
| `sfu:peer-left` | Server → Client | `{ userId }` | Participant left or was removed |
| `sfu:kick-peer` | Client → Server | `{ userId }` | Room owner removes participant |
| `sfu:kicked` | Server → Client | `{ roomId }` | Sent to removed participant |
| `sfu:room-ended` | Server → Client | `{ roomId }` | Room ended by owner |

---

## Peer Presence Contract

Peer visibility is **independent of media track production**. A peer appears for others as soon as it joins the SFU room, even if it has zero producers (camera/mic denied).

### Join sequence

1. Peer A emits `sfu:join` → server adds it to the room and emits `sfu:peer-joined` to all existing peers
2. Server emits `sfu:existing-peers` to Peer A with all peers already in the room
3. Both events fire before any `sfu:new-producer` — clients must create a participant model on these events

### When a peer has no media

- `sfu:peer-joined` / `sfu:existing-peers` still fire
- No `sfu:new-producer` is emitted (nothing to consume)
- Client renders the peer as a placeholder tile: avatar initial + muted/cam-off indicators
- `isVideoEnabled` and `isAudioEnabled` default to `false` until actual tracks are received via `sfu:new-producer` → `sfu:consumer-created`

---

## Configuration

```typescript
// Worker
{
  logLevel: 'warn',
  logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  rtcMinPort: 40000,  // RTC_MIN_PORT env
  rtcMaxPort: 40099,  // RTC_MAX_PORT env
}

// Router codecs
{
  mediaCodecs: [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000,
      parameters: { 'x-google-start-bitrate': 1000 } },
    { kind: 'video', mimeType: 'video/VP9', clockRate: 90000,
      parameters: { 'profile-id': 2, 'x-google-start-bitrate': 1000 } },
    { kind: 'video', mimeType: 'video/h264', clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '4d0032',
        'level-asymmetry-allowed': 1,
        'x-google-start-bitrate': 1000,
      } },
  ],
}

// WebRTC Transport
{
  listenIps: [{ ip: '127.0.0.1', announcedIp: undefined }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
}
```

---

## Edge Cases

### Worker Death
- `WorkerManager` detects worker death via `died` event
- Attempts restart after 2-second delay
- Clears all router references

### Producer Not Found
- Return error when consuming non-existent producer
- Client should handle gracefully

### Bandwidth Constraints
- Limit video bitrate based on available bandwidth
- Pause low-priority consumers if needed

### Codec Mismatch
- If codec mismatch, mediasoup may need to transcode
- Monitor CPU usage

---

## Scaling Strategy

1. **Per-Room Routers**: Each room gets its own Router
2. **Single Worker**: Current implementation uses one mediasoup Worker
3. **Future — Multiple Workers**: Distribute rooms across workers (CPU cores), round-robin assignment
4. **Future — Horizontal Scaling**: Load balancer + Redis for WebSocket state sync

---

## Files

- `apps/server/src/sfu/sfu.service.ts` — SFU orchestration (rooms, peers, transports, producers, consumers)
- `apps/server/src/sfu/sfu.gateway.ts` — Socket.io gateway (`/sfu` namespace)
- `apps/server/src/sfu/sfu.module.ts` — Module definition
- `apps/server/src/sfu/worker-manager.ts` — Single Worker lifecycle, Router creation, crash recovery
- `apps/server/src/sfu/config/mediasoup.config.ts` — Worker, Router, Transport config + `getIceServers()`
- `apps/server/src/sfu/interfaces/sfu.interface.ts` — TypeScript interfaces
