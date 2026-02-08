# TASK-023 — Socket.io Client Setup

## Status
planned

## Priority
high

## Description
Install and configure Socket.io client on the frontend. Create a WebSocket manager for connection handling and event subscriptions.

## Scope
- Install socket.io-client dependency
- Create WebSocket manager singleton
- Connect to server with proper configuration
- Handle connection/disconnection events
- Emit/join room events

## Out of Scope
- WebRTC peer connections (TASK-024)
- Media stream handling (TASK-023)

## Technical Design

### WebSocket Manager
```typescript
class WebSocketManager {
  private socket: Socket | null = null;

  connect(): void;
  disconnect(): void;
  emit(event: string, data: any): void;
  on(event: string, handler: Function): void;
  off(event: string, handler?: Function): void;
  joinRoom(roomCode: string): void;
  leaveRoom(): void;
}
```

### Configuration
- URL: from `VITE_SOCKET_URL` env variable
- withCredentials: true (for JWT cookies)
- reconnection: enabled
- transports: ['websocket', 'polling']

## Acceptance Criteria
- [ ] socket.io-client installed
- [ ] WebSocket manager created
- [ ] Connects to server successfully
- [ ] Handles connection/disconnection events
- [ ] Can join and leave rooms
- [ ] Emits and receives events

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in manager code
- TypeScript types are strict
- Connection status is observable

## Implementation Guide

## Related Files
- `apps/client/src/lib/websocket/manager.ts` - WebSocket manager
- `apps/client/src/lib/websocket/index.ts` - Exports

## Environment Variables
```env
VITE_SOCKET_URL=http://localhost:3000
```

## Next Task
TASK-023 — Media Stream Access
