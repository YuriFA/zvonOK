# TASK-002 — mediasoup Router per Room

## Status
completed

## Priority
high

## Description
Create mediasoup Router for each room to manage media routing in SFU architecture.

## Implementation

### Files
- `apps/server/src/sfu/worker-manager.ts` - Router management (lines 58-97)
- `apps/server/src/sfu/config/mediasoup.config.ts` - Media codecs configuration

### Key Features
- Router creation per room with `createRouter(roomId)`
- Router retrieval via `getRouter(roomId)`
- RTP capabilities via `getRtpCapabilities(roomId)`
- Router cleanup via `closeRouter(roomId)`
- Idempotent router creation (returns existing if not closed)

### Router Creation
```typescript
// worker-manager.ts
async createRouter(roomId: string): Promise<MediasoupRouter> {
  const existingRouter = this.routers.get(roomId);
  if (existingRouter && !existingRouter.closed) {
    return existingRouter;
  }

  const router = await this.worker.createRouter({
    mediaCodecs: config.router.mediaCodecs,
  });
  this.routers.set(roomId, router);
  return router;
}
```

### Media Codecs Configuration
```typescript
// config/mediasoup.config.ts
router: {
  mediaCodecs: [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
    { kind: 'video', mimeType: 'video/VP9', clockRate: 90000 },
    { kind: 'video', mimeType: 'video/h264', clockRate: 90000 },
  ],
}
```

## Acceptance Criteria
- [x] Router created per room
- [x] Codecs configured (Opus, VP8, VP9, H264)
- [x] Router accessible via room ID
- [x] Router lifecycle management (create, get, close)

## Definition of Done
- [x] Router creation working
- [x] Room-to-Router mapping functional

## Next Task
TASK-003 — mediasoup Transport
