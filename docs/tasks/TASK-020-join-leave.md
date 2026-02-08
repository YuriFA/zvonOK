# TASK-020 — Room Join/Leave Functionality

## Status
planned

## Priority
high

## Description
Implement room management for WebSocket connections. Clients can join rooms by code and receive notifications when peers join or leave.

## Scope
- In-memory room state management
- Join room event handler
- Leave room event handler
- Broadcast peer:joined and peer:left events
- Handle client disconnect as implicit leave

## Out of Scope
- Persistent room storage (future)
- Authentication check on join (future)
- Max room size limits (future)

## Technical Design

### Room State Structure
```typescript
interface RoomState {
  id: string;
  code: string;
  peers: Map<peerId, PeerInfo>;
}

interface PeerInfo {
  id: string;
  userId?: string;
  userInfo?: { username: string };
}
```

### Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `join:room` | Client → Server | `{ roomCode: string }` |
| `leave:room` | Client → Server | — |
| `room:joined` | Server → Client | `{ roomId, peerId, peers[] }` |
| `peer:joined` | Server → Client | `{ peerId, userInfo }` |
| `peer:left` | Server → Client | `{ peerId }` |

## Acceptance Criteria
- [ ] Client can join a room by code
- [ ] Client receives room:joined with peer list
- [ ] Existing peers receive peer:joined notification
- [ ] Client can leave room explicitly
- [ ] Disconnect triggers implicit leave
- [ ] Peers receive peer:left notification

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in gateway code
- Room state properly managed
- Socket.io room functions used (client.join, client.leave)

## Implementation Guide
See: `docs/tasks/phase-02-signalling/2.2-join-leave.md`

## Related Files
- `apps/server/src/webrtc/webrtc.gateway.ts` - Add room handlers
- `apps/server/src/webrtc/interfaces/` - Type definitions

## Next Task
TASK-021 — WebRTC Signalling (Offer/Answer/ICE)
