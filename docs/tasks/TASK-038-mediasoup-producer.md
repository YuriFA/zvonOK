# TASK-038 — mediasoup Producer

## Status
planned

## Priority
high

## Description
Create mediasoup Producer for receiving incoming media tracks from clients.

## Scope
- Consume transport.produce() for incoming tracks
- Handle video/audio tracks
- Associate producer with user
- Broadcast producer to other participants

## Technical Design

### Producer Creation
```typescript
const producer = await transport.produce({
  kind: track.kind,
  track,
  codecOptions: { videoGoogleStartBitrate: 1000 },
});
```

## Acceptance Criteria
- Producer created for incoming tracks
- Producer ID stored
- Other participants notified

## Definition of Done
- Producers working
- Track forwarding functional

## Related Files
- `apps/server/src/sfu/producer-manager.ts`

## Next Task
TASK-039 — mediasoup Consumer
