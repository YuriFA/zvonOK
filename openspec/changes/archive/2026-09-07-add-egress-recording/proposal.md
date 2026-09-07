## Why

Egress currently streams the room program out (RTMP, HLS) but produces no durable artifact: when the room ends the media is gone. The roadmap's recording item calls for the server-side slice - the composited program saved to VPS disk and retrievable by the platform consumer - reusing the existing egress pipeline instead of building a second one.

## What Changes

- Egress sessions gain a third output type: `record`. A session started with `record: true` (alone or alongside RTMP/HLS) writes the same composited program (mixed audio, canvas video, screen-share priority) to an MPEG-TS file on VPS disk under `EGRESS_RECORDINGS_DIR`.
- Pipeline restarts (the existing supervised restart path) never lose already-written material: each restart writes a numbered part file; the parts are concatenated losslessly when the session ends.
- When a session reaches `ended`, the recording is finalized: parts are remuxed (stream copy) into a single seekable MP4 (`recording.mp4`); the MP4 stays servable and the parts are removed. If the server crashed mid-session, the raw MPEG-TS parts remain servable as-is.
- The session view gains `recordingUrl`; the platform `/v1` API gains `GET /v1/recordings` (list, project-scoped, filterable by room) and `GET /v1/recordings/:egressId/file` (download with Range support), both API-key authenticated and project-owned.
- `DELETE /v1/recordings/:egressId` removes the stored files and their metadata.
- No new webhook events: consumers learn a recording is ready from `egress.stopped` plus a poll of the session/recordings endpoints.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `egress`: the "Start egress" requirement is extended to accept `record` as an output; a new "Recording output" requirement specifies part-file writes across restarts, finalization on session end, and durability semantics; the lifecycle/inspection requirement gains recording metadata on the session view.
- `platform-api`: a new "Recordings endpoints" requirement specifies the list/download/delete surface with API-key auth and project scoping.
