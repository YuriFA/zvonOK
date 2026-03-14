# Gateway Module (WebRTC Signalling)

> **Status:** Not Implemented
>
> The project uses an SFU-only architecture via the [SFU Module](./sfu.md). P2P signalling described below was planned but never implemented.

## Original Purpose

WebSocket server for real-time WebRTC signalling. Would have managed room membership and exchanged offers, answers, and ICE candidates between peers for P2P connections.

---

## Why Not Implemented

The project moved directly to an SFU (mediasoup) architecture for all video calls:

- **SFU scales better** for group calls (3+ participants)
- **Simpler architecture** - no need for full mesh P2P connections
- **All signalling** is handled by the SFU gateway at `/sfu` namespace

See [sfu.md](./sfu.md) for the current implementation.

---

## Planned Use Cases (Reference Only)

### 1. Join Room
- Client sends `join:room` with room code
- Server validates room exists
- Server adds socket to room
- Server sends `room:joined` with peer list
- Server broadcasts `peer:joined` to existing peers

### 2. Leave Room
- Client sends `leave:room` or disconnects
- Server removes socket from room
- Server broadcasts `peer:left` to remaining peers

### 3. WebRTC Offer
- Client creates `RTCPeerConnection` and offer
- Client sends `webrtc:offer` with target peer
- Server forwards offer to target peer

### 4. WebRTC Answer
- Target peer sends `webrtc:answer` to caller
- Server forwards answer to caller

### 5. ICE Candidate
- Peer sends `webrtc:ice` with candidate
- Server forwards to target peer

---

## Planned WebSocket Events (Reference Only)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join:room` | Client → Server | `{ roomCode: string }` | Join a room |
| `leave:room` | Client → Server | — | Leave current room |
| `room:joined` | Server → Client | `{ roomId, peerId, peers[] }` | Room joined confirmation |
| `peer:joined` | Server → Client | `{ peerId, userInfo }` | New peer joined |
| `peer:left` | Server → Client | `{ peerId }` | Peer left room |
| `webrtc:offer` | Client → Server | `{ targetPeerId, offer }` | WebRTC offer (send) |
| `webrtc:offer` | Server → Client | `{ fromPeerId, offer }` | WebRTC offer (receive) |
| `webrtc:answer` | Client → Server | `{ targetPeerId, answer }` | WebRTC answer (send) |
| `webrtc:answer` | Server → Client | `{ fromPeerId, answer }` | WebRTC answer (receive) |
| `webrtc:ice` | Client → Server | `{ targetPeerId, candidate }` | ICE candidate (send) |
| `webrtc:ice` | Server → Client | `{ fromPeerId, candidate }` | ICE candidate (receive) |
| `media:state` | Client → Server | `{ isVideoEnabled, isAudioEnabled }` | Broadcast media state |
| `media:state_changed` | Server → Client | `{ peerId, isVideoEnabled, isAudioEnabled }` | Peer media state changed |

---

## Files (Planned Location)

- `apps/server/src/gateway/webrtc.gateway.ts` — Gateway class
- `apps/server/src/gateway/webrtc.module.ts` — Module definition
- `apps/server/src/gateway/interfaces/` — Type definitions

---

## Related

- [SFU Module](./sfu.md) — Current implementation
- [Roadmap Stage 2](../roadmap.md) — Signalling server tasks
