# TASK-001 — Socket.io Server Setup

## Status
completed

## Priority
high

## Description
Configure Socket.io in NestJS for WebSocket signalling. The SFU module uses Socket.io for mediasoup signalling via the `/sfu` namespace.

## Scope
- Install Socket.io dependencies in NestJS
- Create SfuGateway to handle real-time SFU connections
- Configure CORS for WebSocket connections
- Test connection with a simple ping/pong handler

## Out of Scope
- Room join/leave logic (TASK-002)
- Authentication integration (future)

## Technical Design

### Dependencies
```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io
```

### Gateway Configuration
- CORS: Allow client origin (localhost:5173)
- Credentials: true (for JWT cookies)
- Namespace: `/sfu` (SFU module)

### Handler Methods
- `afterInit()` - Server initialization hook
- `handleConnection()` - Client connect event
- `handleDisconnect()` - Client disconnect event
- SFU signalling events (see TASK-035 to TASK-041)

## Acceptance Criteria
- [x] Socket.io packages installed
- [x] SfuGateway created in `apps/server/src/sfu/`
- [x] SfuModule registered in AppModule
- [x] Client can connect and receive confirmation
- [x] SFU events work correctly

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in gateway code
- TypeScript types are strict
- Connection logs visible in console

## Implementation Guide

## Related Files
- `apps/server/src/sfu/sfu.gateway.ts` - Gateway implementation
- `apps/server/src/sfu/sfu.module.ts` - Module definition
- `apps/server/src/app.module.ts` - App module registration

## Next Task
TASK-002 — Join/Leave Room Functionality
