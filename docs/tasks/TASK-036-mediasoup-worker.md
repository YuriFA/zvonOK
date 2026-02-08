# TASK-036 — mediasoup Worker Setup

## Status
planned

## Priority
high

## Description
Initialize mediasoup Worker for SFU (Selective Forwarding Unit) functionality in group calls.

## Scope
- Install mediasoup server package
- Create WorkerManager singleton
- Initialize mediasoup Worker
- Handle Worker process lifecycle
- Create Router per room

## Technical Design

### Dependencies
```bash
pnpm add mediasoup
```

### Worker Setup
```typescript
import { Worker } from 'mediasoup/node/lib/Worker';

const worker = await Worker.create({
  rtcMinPort: 2000,
  rtcMaxPort: 4000,
});
```

## Acceptance Criteria
- mediasoup worker initialized
- Worker can create Routers
- Worker lifecycle managed

## Definition of Done
- Worker creation working
- Router creation per room functional

## Related Files
- `apps/server/src/sfu/worker-manager.ts`

## Next Task
TASK-036 — mediasoup Router
