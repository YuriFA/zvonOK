# SFU Module (mediasoup)

## Purpose

Selective Forwarding Unit for scalable group video calls using mediasoup. Routes media streams between 3+ participants when P2P becomes inefficient.

---

## Use Cases

### 1. Create Room Router
- On room creation, get or create Worker
- Create Router for the room
- Store Router ID for peer connections

### 2. Join SFU Room
- Create receive Transport for client
- Create send Transport for client
- Exchange DTLS parameters
- Return Transport IDs to client

### 3. Produce Track
- Client creates Producer on send Transport
- Server adds Producer to Router
- Notify other peers about new Producer

### 4. Consume Track
- Client requests to consume a Producer
- Server creates Consumer on receive Transport
- Return Consumer parameters to client

### 5. Handle Transports
- Manage ICE state changes
- Handle DTLS handshake
- Close Transports on disconnect

### 6. Remove Participant
- Room owner requests participant removal
- Server verifies the requester against the room owner id shared during SFU join
- Target peer receives `sfu:kicked` and is disconnected from SFU namespace
- Remaining peers receive `sfu:peer-left`

---

## mediasoup Hierarchy

```
Worker (OS process)
  └── Router (per room)
      ├── Transport (send)
      │   ├── Producer (incoming track)
      │   └── Consumer (outgoing track)
      └── Transport (receive)
          ├── Producer (incoming track)
          └── Consumer (outgoing track)
```

---

## WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `sfu:join` | Client → Server | `{ roomId, userId, username, roomOwnerId? }` | Join SFU room |
| `sfu:joined` | Server → Client | `{ routerRtpCapabilities }` | SFU room joined |
| `sfu:create-send-transport` | Client → Server | `{}` | Create the peer send transport |
| `sfu:create-recv-transport` | Client → Server | `{}` | Create the peer receive transport |
| `sfu:transport-created` | Server → Client | `{ direction, transportId, iceParameters, iceCandidates, dtlsParameters }` | Transport parameters ready for the client |
| `sfu:connect-transport` | Client → Server | `{ transportId, dtlsParameters }` | Complete DTLS handshake for a transport |
| `sfu:transport-connected` | Server → Client | `{ transportId }` | Transport handshake completed |
| `sfu:produce` | Client → Server | `{ transportId, kind, rtpParameters }` | Create producer |
| `sfu:producer-created` | Server → Client | `{ producerId, userId, kind }` | New producer |
| `sfu:new-producer` | Server → Client | `{ producerId, userId, username, kind }` | Notify peers that a consumable producer is available |
| `sfu:consume` | Client → Server | `{ producerId, rtpCapabilities }` | Create consumer |
| `sfu:consumer-created` | Server → Client | `{ consumerId, producerId, kind, rtpParameters }` | Consumer created in paused state |
| `sfu:resume-consumer` | Client → Server | `{ consumerId }` | Resume a paused consumer after client setup |
| `sfu:pause-producer` | Client → Server | `{ producerId }` | Pause producer |
| `sfu:resume-producer` | Client → Server | `{ producerId }` | Resume producer |
| `sfu:peer-left` | Server → Client | `{ userId }` | Notify peers that a participant left or was removed |
| `sfu:peer-joined` | Server → Client | `{ userId, username }` | Notify existing peers that a new participant joined the room (fired regardless of media) |
| `sfu:existing-peers` | Server → Client | `[{ userId, username }]` | Sent to a newly joined peer listing participants already in the room |
| `sfu:kick-peer` | Client → Server | `{ userId }` | Room owner removes a participant |
| `sfu:kicked` | Server → Client | `{ roomId }` | Sent to the removed participant before disconnect |

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
// mediasoup Worker
{
  logLevel: 'warn',
  logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  rtcMinPort: 40000,
  rtcMaxPort: 49999,
}

// Router codecs
{
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000,
      },
    },
    {
      kind: 'video',
      mimeType: 'video/h264',
      clockRate: 90000,
      parameters: {
        'profile-level-id': '42e01f',
        'packetization-mode': 1,
      },
    },
  ],
}

// WebRTC Transport
{
  listenIps: [
    { ip: '0.0.0.0', announcedIp: null }, // Set announcedIp to public IP in production
  ],
  initialAvailableOutgoingBitrate: 1000000,
  minimumAvailableOutgoingBitrate: 600000,
  maxSctpMessageSize: 262144,
}
```

---

## Edge Cases

### Worker Exceeded
- Create new Worker if max routers per worker reached
- Distribute routers across workers

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
2. **Multiple Workers**: Distribute rooms across workers (CPU cores)
3. **Horizontal Scaling**: Load balancer + Redis for WebSocket state sync
4. **Geographic Distribution**: Regional SFUs for reduced latency

---

## Files

- `apps/server/src/sfu/sfu.service.ts` — SFU business logic
- `apps/server/src/sfu/sfu.gateway.ts` — WebSocket handler
- `apps/server/src/sfu/sfu.module.ts` — Module definition
- `apps/server/src/sfu/interfaces/` — Type definitions
- `apps/server/src/sfu/config/mediasoup.config.ts` — mediasoup configuration
