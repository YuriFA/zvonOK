## Context

- The egress pipeline taps room producers over PlainTransports into one FFmpeg program: `amix` audio + `xstack` 2x2 canvas (H.264/AAC, transcoded exactly once), fanned out by a single `tee` muxer to RTMP endpoints and/or MPEG-TS HLS segments (`composeEgressArgs`).
- Sessions are supervised: start timeout, restart with debounce and a bounded retry budget, room-end teardown, server-restart reconciliation to `failed`.
- HLS files land under `EGRESS_HLS_DIR/<egressId>/` and are served publicly by unguessable session id (`EgressPlaybackController`). Platform data surfaces live behind API-key auth under `/v1` (`EgressEndpoints` requirement).
- `Egress.outputs` is a JSON column; the session view (`EgressSessionView`) is the REST/Webhook-facing shape.

## Goals / Non-Goals

**Goals:**
- The same program recorded to disk as a durable artifact, retrievable by the owning project.
- No media machinery beyond the existing `tee`: recording is one more sink.
- Lossless finalization (stream copy) and crash-tolerant raw parts.

**Non-Goals:**
- No upload to S3 or external storage (roadmap: later if needed).
- No retention sweep / quota enforcement (documented as consumer-managed via DELETE).
- No new webhook events - `egress.stopped` plus polling covers readiness.
- No room-participant-facing downloads (platform consumer only), consistent with the platform direction.

## Decisions

1. **Recording is a third `tee` branch, not a second pipeline.** `composeEgressArgs` gains an optional `[f=matroska]` sink writing the same `[aout]`/`[vout]` programs. Alternative considered - a dedicated recorder process - rejected: duplicates taps, ports, supervision, and canvas code for zero benefit.
2. **MPEG-TS parts, MP4 delivery.** Live capture writes `recording-<part>.ts`. The tee muxer exposes a non-seekable AVIO to its slave muxers and Matroska needs a seek while writing its header, so Matroska is not available inside the tee; MPEG-TS works there (proven by the HLS branch) and is the crash-tolerant broadcast container. On session end, `ffmpeg -f concat -safe 0 -i parts.txt -c copy recording.mp4` remuxes losslessly (identical codecs across parts - one program graph), then parts are deleted. If remux fails, the raw parts stay and are served as `video/mp2t`. Alternative: record MP4 directly with `-movflags +frag_keyframe` - rejected: larger files, worse tooling compatibility for the raw artifact.
3. **One part file per supervised restart.** The session already tracks restarts; the record sink path carries the part index, so a restart never truncates written material. The bounded restart gap (restart debounce + startup) is the only loss window - specified as such.
4. **Durable default directory.** `EGRESS_RECORDINGS_DIR` defaults to `<server cwd>/data/egress-recordings`, unlike the HLS default under tmpdir: HLS is transient by design, recordings are the artifact. One subdirectory per egress id, mirroring the HLS layout.
5. **Additive Prisma columns.** `Egress.recordingSizeBytes BigInt?` (a 3-hour call at the current 2.6 Mbps program exceeds Int32 range) and `Egress.recordingFinalizedAt DateTime?`. `outputs` JSON gains `record: boolean` with no migration.
6. **Platform-API surface with API-key auth, not the public HLS pattern.** The HLS playback stance (public by unguessable id) fits a transient live window; a durable recording is the project's asset, so list/download/delete live under `/v1/recordings` with `ApiKeyGuard` and project scoping. `GET .../file` parses HTTP Range manually (single `bytes=N-[M]` form) and answers `206` with a `createReadStream` slice; finalized MP4 is `video/mp4`, raw parts `video/x-matroska`.
7. **Crash reconciliation keeps parts.** `onModuleInit` already flips non-terminal rows to `failed`; for record sessions it leaves the directory untouched, so the raw parts stay downloadable (served as MPEG-TS) per the spec.
8. **Deletion removes the session's recording directory** and clears the metadata columns; repeat DELETE responds 404. RTMP/HLS outputs are unaffected.

## Risks / Trade-offs

- [Disk exhaustion from unrecorded-growth] Recordings grow ~1.1 GB/hour at the current bitrate. → Documented size math; DELETE endpoint exists; a retention sweep is an explicit non-goal until the checkpoint asks for it.
- [`tee` branch failure semantics] A failing disk branch is dropped by `onfail` like a failing RTMP push; total write failure kills the process and the existing restart/retry budget fails the session. → Acceptable: supervision already owns this path.
- [Concat remux assumes identical codec parameters across parts] True today (one program graph, static canvas); a future codec-parameter change in the program would break `-c copy` concat. → Finalization failure falls back to serving raw MPEG-TS parts; no silent data loss.
- [BigInt in Prisma/JS] `recordingSizeBytes` arrives as `bigint` in JS; the view and list endpoints must serialize it as a JSON number (< Number.MAX_SAFE_INTEGER for any realistic recording) or string. → Serialize via `Number(...)` with the safe-integer bound checked.

## Migration Plan

Additive Prisma migration (two nullable columns), new env var with a working default, no behavior change for existing RTMP/HLS sessions. Rollback: revert; recorded files on disk remain valid MPEG-TS/MP4.
