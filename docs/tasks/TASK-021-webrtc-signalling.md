# TASK-021 — WebRTC Signalling

## Status
planned

## Priority
high

## Description
Implement WebRTC signalling events to exchange offers, answers, and ICE candidates between peers for establishing P2P connections.

## Scope
- Offer forwarding (webrtc:offer)
- Answer forwarding (webrtc:answer)
- ICE candidate forwarding (webrtc:ice)
- Target peer validation

## Out of Scope
- SFU integration (TASK-035 to TASK-041)
- TURN server integration (TASK-045)

## Technical Design

### Event Flow
1. Peer A creates RTCPeerConnection and offer
2. Peer A sends `webrtc:offer` with targetPeerId
3. Server forwards offer to Peer B
4. Peer B sends `webrtc:answer` with targetPeerId
5. Server forwards answer to Peer A
6. Both peers exchange ICE candidates via `webrtc:ice`

### Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `webrtc:offer` | Bidirectional | `{ targetPeerId, offer }` |
| `webrtc:answer` | Bidirectional | `{ targetPeerId, answer }` |
| `webrtc:ice` | Bidirectional | `{ targetPeerId, candidate }` |

### Payload Types
```typescript
interface RTCEventPayload {
  targetPeerId: string;
  offer: RTCSessionDescriptionInit;
  answer: RTCSessionDescriptionInit;
  candidate: RTCIceCandidateInit;
}
```

## Acceptance Criteria
- [ ] Server forwards offers to target peer
- [ ] Server forwards answers to target peer
- [ ] Server forwards ICE candidates to target peer
- [ ] Target peer validation works
- [ ] Returns error if target peer not found

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in gateway code
- Events properly typed
- Error handling for missing peers

## Implementation Guide

## Related Files
- `apps/server/src/webrtc/webrtc.gateway.ts` - Add signalling handlers
- `apps/server/src/webrtc/interfaces/` - Event type definitions

## Next Task
TASK-022 — Socket.io Client Setup
