# Proposal: add-hls-rtmp-egress

## Why

Platform consumers can already create rooms, mint tokens, and receive lifecycle
webhooks, but room media stays locked inside the SFU: there is no way to
broadcast a live room to an external audience. Roadmap item 6 (VideoSDK
parity) calls for live streaming out of rooms - pushing a room to RTMP
endpoints (YouTube, Twitch, custom) and/or producing an HLS playlist that
scales to viewers beyond what interactive WebRTC attendance is designed for.

## What Changes

- New `egress` server module (`apps/server/src/egress/`): starts an FFmpeg
  pipeline that consumes a room's producers through mediasoup PlainTransports,
  mixes all audio, composites video into a grid (screen share prioritized,
  capped canvas), and pushes to RTMP endpoints and/or writes local HLS
  segments.
- Pipeline supervision: `starting -> live -> stopping -> ended | failed` state
  machine with bounded retries, and debounced pipeline restarts when room
  membership changes (fixed FFmpeg input sets cannot grow dynamically).
- Platform REST surface (API-key auth, per-key rate limits inherited):
  - `POST /v1/rooms/:id/egress` - start RTMP/HLS egress for a project room
  - `GET /v1/rooms/:id/egress` - list the room's egress sessions
  - `GET /v1/egress/:id` - inspect one egress session
  - `POST /v1/egress/:id/stop` - stop a running egress
- Webhook events `egress.started`, `egress.stopped`, `egress.failed` for
  project-owned rooms, delivered through the existing signed dispatcher.
- HLS playback: segment playlist served by the server under an unguessable
  per-egress path (documented as v1-strength access control).
- Prisma: `Egress` model + migration (project ownership, outputs config,
  status, timestamps, failure reason).
- Room end (user- or API-initiated) stops active egress with reason
  `room-ended`.
- Config: ffmpeg binary path, RTP port range for egress transports (must not
  overlap the mediasoup RTC range), HLS output directory.
- Docs: egress page on the docs site; deployment notes for ffmpeg, ports, and
  a local RTMP target for development.

Non-goals: server-side recording of past sessions (roadmap keeps that
separate), tokenized HLS playback URLs, S3 segment upload, multicore
compositing beyond the single-FFmpeg pipeline.

## Capabilities

### New Capabilities
- `egress`: server-side room media egress - FFmpeg pipeline over mediasoup
  plain transports, RTMP push and local HLS outputs, lifecycle state machine,
  project ownership and authorization, failure and teardown behavior.

### Modified Capabilities
- `platform-api`: new requirement(s) for egress endpoints on the existing
  `/v1` surface (start/list/get/stop, project-scoped authorization).
- `webhooks`: new egress lifecycle event types delivered for project-owned
  rooms.

## Impact

- **Code**: `apps/server/src/egress/` (new), `apps/server/src/sfu/` (producer
  enumeration + plain-transport tap exposed to egress), room end path (egress
  stop hook), `apps/server/prisma/schema.prisma` (+migration), server config
  module, `apps/server/src/platform/` controller registration.
- **Runtime**: ffmpeg binary required on the server host; a UDP port range
  for egress RTP; disk space for HLS segments (rotation/cleanup policy).
- **APIs**: additive `/v1` endpoints; new webhook event types (additive).
- **Docs**: new egress page in docs-site content; deployment guide additions.
- **No breaking changes**; existing REST and webhook consumers unaffected.
