# Tasks: add-hls-rtmp-egress

## 1. Schema and config

- [x] 1.1 Add `Egress` model to `prisma/schema.prisma` (cuid id, `roomId`/`projectId` FKs with relations on `Room`/`Project`, `outputs Json`, `status EgressStatus` default `starting`, `endedReason` nullable, `error` nullable, `startedAt`/`endedAt`, `@@index([roomId])`) and create migration `add_egress`
- [x] 1.2 Add `apps/server/src/egress/egress.config.ts` reading `EGRESS_FFMPEG_PATH`, `EGRESS_MEDIA_PORT_MIN/MAX` (42000/42100), `EGRESS_HLS_DIR`, `EGRESS_ALLOW_PRIVATE_TARGETS` with defaults, following `sfu/config/mediasoup.config.ts` conventions

## 2. SFU tap surface

- [x] 2.1 Add `listRoomProducers`, `createEgressTransport`, `createEgressConsumer`, and `onRoomProducerAdded` to `SfuService` (plain transports with `rtcpMux: true, comedia: false`; subscription fired from `createProducer` beside `notifyPeersToConsume`), export `SfuModule`
- [x] 2.2 Unit tests: producer enumeration for mixed sources (camera/screen), tap consumer returns rtpParameters, producer-added hook fires per room only

## 3. FFmpeg pipeline

- [x] 3.1 Implement `ffmpeg/args-composer.ts`: per-consumer SDP file generation from rtpParameters, `amix`/`xstack` filter graph with screen-share primary tile, tee muxer outputs (flv per RTMP endpoint + HLS with delete_segments), audio-only variant; pure function, unit-tested
- [x] 3.2 Implement `ffmpeg/ffmpeg-process.ts`: spawn with composed args, stderr tail capture, SIGINT-then-SIGKILL stop, exit event; unit-tested with a stub binary

## 4. Egress session lifecycle

- [x] 4.1 Implement `EgressService`: create session row (`starting`), pipeline assembly over SFU taps, `starting -> live` on first output heartbeat (30 s), membership-change debounce restart (2 s), bounded retries (3/300 s) then `failed`, graceful stop, `room-ended` teardown by wrapping the `WorkerManager.closeRouter` path, boot-time reconciliation marking orphaned rows `failed('server-restarted')`
- [x] 4.2 Unit tests: state transitions with a fake process, retry exhaustion, restart on producer add/close, room-end via both teardown paths, cross-project ownership rejection

## 5. REST endpoints

- [x] 5.1 Add DTOs (`StartEgressDto` with RTMP scheme validation, 1..3 endpoints, hls boolean) and the four `PlatformController` routes (`POST /v1/rooms/:id/egress`, `GET /v1/rooms/:id/egress`, `GET /v1/egress/:id`, `POST /v1/egress/:id/stop`) wired through `PlatformService`; 400/404/409 per delta spec
- [x] 5.2 Platform e2e (mocked Prisma/WorkerManager harness): start/list/inspect/stop happy path, invalid payload 400, second active session 409, cross-project 404

## 6. Webhooks

- [x] 6.1 Extend `WebhookEventType` with `egress.started|egress.stopped|egress.failed` and add dispatcher methods; emit on `live`, `ended` (reason), `failed` (error) transitions
- [x] 6.2 Tests: emission payload shape (room id/slug, egress id, outputs, reason/error) and user-owned silence

## 7. HLS playback

- [x] 7.1 Add `EgressPlaybackController` (`GET /egress/hls/:egressId/:file`, `SkipAuthGuard`, filename allowlist `^[\w.-]+\.m3u8$|\.ts$`, correct content types, no-cache playlists) and tests for traversal rejection and content types

## 8. Real-pipeline verification

- [x] 8.1 Add `test/egress-pipeline.e2e-spec.ts` (`skipIf` no ffmpeg): real `WorkerManager` + router, FFmpeg testsrc pushed into a `comedia` plain transport + `transport.produce`, start HLS egress on the room, assert playlist appears, advances, and `ffprobe` reads program duration; stop and assert final playlist remains
- [x] 8.2 Add dev RTMP target to docs compose (mediamtx service) and a manual smoke script/comment verifying RTMP push locally

## 9. Docs and roadmap

- [x] 9.1 Write docs page `docs/egress.md` (start/stop via curl with API key, HLS playback, RTMP to YouTube/mediamtx, ports/ffmpeg deployment notes) and register in `docs/.vitepress/config.mts` nav/sidebar
- [x] 9.2 Update `docs/deployment.md` (ffmpeg install, `EGRESS_*` env vars, port plan) and tick roadmap item 6 in `docs/platform-roadmap.md`

## 10. Verification and archive

- [x] 10.1 Full suite green: server lint, unit tests, e2e suite, build; client suite untouched-green
- [x] 10.2 Manual smoke on dev stack: join room in browser, start RTMP+HLS egress via curl, watch HLS in a player, webhooks received, stop egress
- [x] 10.3 `openspec validate --all`, sync deltas into main specs, archive change, commit in two commits (feat + docs/archive)
