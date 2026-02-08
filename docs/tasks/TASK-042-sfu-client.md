# TASK-042 — SFU Client Integration

## Status
planned

## Priority
high

## Description
Integrate mediasoup-client on the frontend for SFU functionality in group calls.

## Scope
- Install mediasoup-client
- Initialize Device
- Create send/receive transports
- Produce local tracks
- Consume remote tracks
- Handle producer/consumer events

## Technical Design

### Client Setup
```typescript
import { Device } from 'mediasoup-client';

const device = new Device();
await device.load({ routerRtpCapabilities });
```

## Acceptance Criteria
- Device loads with server capabilities
- Transports created
- Local tracks published
- Remote tracks consumed

## Definition of Done
- Client fully integrated
- Group calls working

## Related Files
- `apps/client/src/hooks/use-mediasoup.ts`

## Next Task
TASK-059 — SFU Participants List UI
