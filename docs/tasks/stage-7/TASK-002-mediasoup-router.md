# TASK-036 — mediasoup Router per Room

## Status
planned

## Priority
high

## Description
Create mediasoup Router for each room to manage media routing in SFU architecture.

## Scope
- Create Router on room creation
- Router media codecs configuration
- Router lifecycle management
- Store Router in room state

## Technical Design

### Router Creation
```typescript
const router = await worker.createRouter({
  mediaCodecs: [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
  ],
});
```

## Acceptance Criteria
- Router created per room
- Codecs configured
- Router accessible via room ID

## Definition of Done
- Router creation working
- Room-to-Router mapping functional

## Related Files
- `apps/server/src/sfu/router-manager.ts`

## Next Task
TASK-037 — mediasoup Transport
