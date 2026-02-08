# TASK-019 — Socket.io Server Setup

## Status
in_progress

## Priority
high

## Description
Configure Socket.io in NestJS for WebSocket signalling. Create the WebrtcGateway to handle real-time connections between clients.

## Scope
- Install Socket.io dependencies in NestJS
- Create WebrtcGateway with basic connection handling
- Configure CORS for WebSocket connections
- Test connection with a simple ping/pong handler

## Out of Scope
- Room join/leave logic (TASK-020)
- WebRTC signalling (TASK-021)
- Authentication integration (future)

## Technical Design

### Dependencies
```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io
```

### Gateway Configuration
- CORS: Allow client origin (localhost:5173)
- Credentials: true (for JWT cookies)
- Namespace: `/` (default)

### Handler Methods
- `afterInit()` - Server initialization hook
- `handleConnection()` - Client connect event
- `handleDisconnect()` - Client disconnect event
- `@SubscribeMessage('ping')` - Test event handler

## Acceptance Criteria
- [ ] Socket.io packages installed
- [ ] WebrtcGateway created in `apps/server/src/gateway/`
- [ ] WebrtcModule registered in AppModule
- [ ] Client can connect and receive confirmation
- [ ] ping/pong test event works

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in gateway code
- TypeScript types are strict
- Connection logs visible in console

## Implementation Guide

## Related Files
- `apps/server/src/gateway/webrtc.gateway.ts` - Gateway implementation
- `apps/server/src/gateway/webrtc.module.ts` - Module definition
- `apps/server/src/app.module.ts` - App module registration

## Next Task
TASK-020 — Join/Leave Room Functionality
