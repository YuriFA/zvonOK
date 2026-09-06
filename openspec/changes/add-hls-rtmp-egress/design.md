# Design: add-hls-rtmp-egress

## Context

- SFU state is in-memory in `SfuService` (`peers: Map<socketId, Peer>` with
  `producers` per peer, `rooms: Map<roomId, Set<socketId>>`); routers live in
  `WorkerManager` (`createRouter/getRouter/closeRouter`). `PlainTransport` is
  not used anywhere yet - egress is its first consumer.
- New producers are announced to peers inside `SfuService.createProducer` via
  `notifyPeersToConsume`; there is no producer-observation event today.
- Room teardown has exactly two paths - explicit `SfuService.endRoom` and
  natural-empty in `removePeer` - and both funnel through
  `WorkerManager.closeRouter(roomId)`.
- `/v1` conventions: routes on `PlatformController` (`@Controller('v1')`,
  `ApiKeyGuard` + `PlatformThrottlerGuard`), DTOs with class-validator +
  `@ApiProperty`, orchestration in `PlatformService`, errors as Nest
  exceptions. Precedent for sfu+platform+db bridging: `RoomTokenHelper` +
  `resolveTokenPeer`.
- `WebhookDispatcher` is fire-and-forget with a `WebhookEventType` union;
  per-project delivery resolves room -> project and silently skips
  user-owned rooms. New events = extend union + add public methods.
- E2E harness (`test/platform.e2e-spec.ts`) mocks `PrismaService` and
  `WorkerManager`, runs real HTTP + socket.io. A real-mediasoup pipeline test
  therefore needs its own spec booting `WorkerManager` for real.
- Server env config: mediasoup-style `process.env` reads with defaults in
  `sfu/config/mediasoup.config.ts`; required global vars validated in
  `app.module.ts`. RTC media ports come from `RTC_MIN_PORT/RTC_MAX_PORT`.

## Goals / Non-Goals

**Goals:**
- One supervised FFmpeg process per egress session producing a single A/V
  program (mixed audio, composited video) fanned out to RTMP endpoints and/or
  local HLS.
- Full lifecycle observable through `/v1` (start/list/inspect/stop),
  webhooks, and DB state.
- Membership changes reflected without manual intervention (bounded
  interruption).
- Deterministic teardown on every room-end path.

**Non-Goals:**
- Per-session recording of past meetings (separate roadmap item), S3 upload,
  tokenized HLS playback URLs, DVR-style playback, GPU compositing.
- Running one FFmpeg per output (tee muxer inside one process instead).
- Dynamic FFmpeg input insertion (restart instead - see D4).

## Decisions

### D1 - Module layout: `EgressModule` owns the pipeline; routes stay on `PlatformController`
`apps/server/src/egress/` contains `EgressService` (session state machine +
supervision), `ffmpeg/` (args composer + process runner), `egress.config.ts`,
and the public HLS playback controller. The four `/v1` endpoints live on
`PlatformController` (same guard chain, throttlers, DTO conventions) and
delegate through `PlatformService` to `EgressService`. `PlatformModule`
imports `EgressModule`. Ownership checks reuse
`RoomService.findProjectRoom(roomId, projectId)` for start/list, and
`egress.projectId === key.projectId` for inspect/stop.

### D2 - SFU tap surface: four narrow methods on `SfuService`
No new service pokes at SFU maps. `SfuService` gains:
- `listRoomProducers(roomId): Array<{ producerId, kind, source }>` (iterate
  peers; `source` from producer `appData`)
- `createEgressTransport(roomId): Promise<PlainTransport>` -
  `router.createPlainTransport({ listenIps: config-derived, rtcpMux: true,
  comedia: false })`
- `createEgressConsumer(roomId, transport, producerId)` - 
  `transport.consume({ producerId, paused: false })`; returns consumer +
  its `rtpParameters` for SDP generation
- `onRoomProducerAdded(roomId, handler)` - subscription fired from
  `createProducer` next to `notifyPeersToConsume`

`EgressModule` imports `SfuModule`; the SfuModule exports `SfuService`.

### D3 - Media pipeline: one FFmpeg process, RTP inputs via SDP files
Per active producer: mediasoup PlainTransport `connect({ ip: 127.0.0.1,
port })` to an FFmpeg-owned UDP port from `EGRESS_MEDIA_PORT_MIN/MAX`
(default 42000-42100; docs require no overlap with `RTC_MIN/MAX_PORT`).
FFmpeg inputs reference per-consumer generated SDP files (payload + codec
lines derived from the consumer's `rtpParameters`; `protocol_whitelist
file,udp,rtp`).

- Audio: `amix=inputs=N:normalize=0` over all audio consumers.
- Video: up to 4 video consumers scaled into a 1280x720 canvas, 2x2 `xstack`
  layout at 25 fps; an active screen share (`source === 'screen'`) takes the
  primary tile, displacing the last camera tile.
- Outputs in the same process via the `tee` muxer: `[f=flv:onfail=ignore]`
  per RTMP endpoint and `[f=hls]` with
  `hls_time 4, hls_list_size 6, delete_segments+independent_segments` into
  `EGRESS_HLS_DIR/<egressId>/`. `delete_segments` bounds disk usage; the
  final playlist retains its last window, satisfying "playlist survives
  session end".
- Audio-only rooms: program without video input; RTMP output stays valid.

### D4 - Membership changes: debounced pipeline restart
FFmpeg cannot add inputs dynamically. On
`onRoomProducerAdded`/producer-close while live, the session waits a 2 s
debounce, then gracefully restarts the process with a rebuilt input set.
Spec allows the bounded interruption. Alternative rejected: fixed input set
at start (late participants silently missing - violates the egress program
requirement).

### D5 - Supervision: bounded retries, terminal states in Postgres
`EgressSession` transitions `starting -> live -> stopping -> ended|failed`.
FFmpeg exit while live: if the session restarted fewer than 3 times in the
last 60 s, rebuild + respawn; otherwise `failed(error)`. `starting` requires
the first ffmpeg "output detected" heartbeat (HLS playlist write or RTMP
connect log line) within 30 s, else retry/fail. Stop: SIGINT (ffmpeg 'q'),
5 s grace, then SIGKILL. Rows in the new `Egress` table are the source of
truth for inspection; on module init any non-terminal row is marked
`failed('server-restarted')` (processes do not survive restarts).

### D6 - Webhooks: three new event types, same dispatcher path
Extend `WebhookEventType` with `egress.started | egress.stopped |
egress.failed`; add `egressStarted/egressStopped/egressFailed(roomId, slug,
egressId, outputs, extra?)` methods mirroring `roomStarted`. Emission points:
transition to `live`, to `ended` (with reason), to `failed` (with error).
User-owned silence comes free from the dispatcher's project resolution.

### D7 - HLS playback: dedicated public controller, traversal-safe
`GET /egress/hls/:egressId/:file` on an `EgressPlaybackController` with
`@SkipAuthGuard()`: filename sanitized (`^[\w.-]+\.m3u8|ts$`), served from
`EGRESS_HLS_DIR` with `application/vnd.apple.mpegurl` / `video/mp2t`,
`Cache-Control: no-cache` for playlists. Access control is the unguessable
cuid `egressId` (v1 stance, documented); `EGRESS_ALLOW_PRIVATE_TARGETS`
does not weaken this - it only governs RTMP SSRF policy below.

### D8 - Endpoint validation and SSRF guard
DTO: `@Matches(/^rtmps?:\/\//)` + max length, 1..3 endpoints, `@IsBoolean`
hls; session must have >= 1 output. `EgressService` resolves each endpoint
host via `dns.lookup` and rejects loopback/private/link-local ranges unless
`EGRESS_ALLOW_PRIVATE_TARGETS=true` (development escape hatch for local
mediamtx). Re-checked at every (re)start.

## Risks / Trade-offs

- **Single-process fan-out**: one FFmpeg crash blips all outputs; bounded by
  retries (D5). Acceptable at solo-dev scale; per-output processes would
  multiply CPU for little resilience.
- **Restart interruption**: membership changes cut the stream for ~1-2 s.
  Spec'd as the bounded update window; eliminating it needs a compositing
  engine (GStreamer/Nginx-RTMP stack) - deferred.
- **CPU**: 720p25 xstack + amix is well within the 5-service VPS budget for
  a couple of concurrent sessions; documented in deployment notes.
- **RTCP feedback loss**: with `comedia: false` + `rtcpMux`, FFmpeg's RTCP
  is not consumed by mediasoup; streams run without congestion feedback.
  Standard for this ingestion pattern; revisit with real-world jitter data.
- **ffmpeg as external dependency**: e2e tests that need it are
  `skipIf(!ffmpeg)`; RTMP push e2e additionally needs an RTMP server, so it
  is covered by args-composition unit tests + a dev `mediamtx` compose
  snippet in the docs, not in CI.

## Open Questions

None - decisions above are internally consistent with the delta specs.
