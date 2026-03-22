# TASK-020 — Room Join/Leave Functionality

## Status
completed

## Priority
high

## Description
Implement room management for WebSocket connections. The SFU module manages peer state via `sfu:join` and `sfu:peer-left` events.

## Scope
- In-memory room/peer state management in SFU service
- `sfu:join` event handler
- `sfu:leave` event handler
- Broadcast `sfu:peer-joined` and `sfu:peer-left` events
- Handle client disconnect as implicit leave

## Out of Scope
- Persistent room storage (handled by Room entity via REST API)
- Authentication check on join (handled by gateway connection)
- Max room size limits (future)

## Technical Design

### SFU Peer State Structure
```typescript
interface Peer {
  id: string;
  socket: Socket;
  userId: string;
  username: string;
  roomId: string;
  sendTransport?: WebRtcTransport;
  recvTransport?: WebRtcTransport;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

interface RoomState {
  router: Router;
  peers: Map<string, Peer>;
}
```

### SFU Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `sfu:join` | Client → Server | `{ roomId, userId, username, roomOwnerId? }` |
| `sfu:leave` | Client → Server | — |
| `sfu:joined` | Server → Client | `{ routerRtpCapabilities }` |
| `sfu:peer-joined` | Server → Client | `{ userId, username }` |
| `sfu:peer-left` | Server → Client | `{ userId }` |
| `sfu:existing-peers` | Server → Client | `[{ userId, username }]` |

## Acceptance Criteria
- [x] Client can join an SFU room via `sfu:join`
- [x] Client receives `sfu:joined` with router capabilities
- [x] Existing peers receive `sfu:peer-joined` notification
- [x] Client can leave room explicitly via `sfu:leave`
- [x] Disconnect triggers `sfu:peer-left` broadcast
- [x] New joiner receives `sfu:existing-peers` list

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in gateway/service code
- Peer state properly managed
- Socket.io room functions used for broadcast

## Implementation Guide

## Related Files
- `apps/server/src/sfu/sfu.gateway.ts` - SFU gateway handlers
- `apps/server/src/sfu/sfu.service.ts` - Peer/room state management
- `apps/server/src/sfu/interfaces/sfu.interface.ts` - Type definitions

## Next Task
TASK-003 — WebRTC Signalling (superseded by SFU implementation)
