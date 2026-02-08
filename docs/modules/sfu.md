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
| `sfu:join` | Client → Server | `{ roomId, rtpCapabilities }` | Join SFU room |
| `sfu:joined` | Server → Client | `{ sendTransport, recvTransport }` | SFU room joined |
| `sfu:produce` | Client → Server | `{ transportId, kind, rtpParameters }` | Create producer |
| `sfu:producer-created` | Server → Client | `{ producerId, userId, kind }` | New producer |
| `sfu:consume` | Client → Server | `{ producerId, rtpCapabilities }` | Create consumer |
| `sfu:consumer-created` | Server → Client | `{ consumerId, ...params }` | Consumer ready |
| `sfu:pause-producer` | Client → Server | `{ producerId }` | Pause producer |
| `sfu:resume-producer` | Client → Server | `{ producerId }` | Resume producer |

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
- `apps/server/config/mediasoup.config.ts` — mediasoup configuration
