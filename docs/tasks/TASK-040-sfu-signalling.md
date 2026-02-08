# TASK-040 — SFU Signalling Protocol

## Status
planned

## Priority
high

## Description
Define and implement WebSocket signalling protocol for SFU communication between client and server.

## Scope
- Define Socket.io events for SFU
- Client → Server: create transport, connect transport, produce, consume
- Server → Client: new producer, consumer created
- Handle room participant changes

## Technical Design

### Events
```typescript
// Client → Server
'create_transport'
'connect_transport'
'produce'
'consume'

// Server → Client
'new_producer'
'new_consumer'
```

## Acceptance Criteria
- Signalling protocol defined
- All events implemented
- Error handling in place

## Definition of Done
- Protocol working end-to-end
- Media flowing through SFU

## Related Files
- `apps/server/src/sfu/sfu.gateway.ts`
- `apps/client/src/lib/sfu-signalling.ts`

## Next Task
TASK-041 — SFU Client Integration
