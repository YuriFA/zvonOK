# TASK-039 — mediasoup Consumer

## Status
planned

## Priority
high

## Description
Create mediasoup Consumer for sending media tracks to clients.

## Scope
- Create consumer for remote producer
- Configure consumer parameters
- Handle consumer pause/resume
- Send consumer to client

## Technical Design

### Consumer Creation
```typescript
const consumer = await recvTransport.consume({
  producerId,
  rtpParameters,
  kind,
});
```

## Acceptance Criteria
- Consumer created for remote producers
- Client receives media
- Pause/resume working

## Definition of Done
- Consumers working
- Media flowing to clients
- Controls functional

## Related Files
- `apps/server/src/sfu/consumer-manager.ts`

## Next Task
TASK-040 — SFU Signalling Protocol
