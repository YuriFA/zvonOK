# Proposal: add-local-recording

## Why

Stage 2 queue item 2 (docs/platform-roadmap.md), local-first slice. Consumers
ask for recordings; the cheapest honest first step records what the local user
already captures: their own camera and microphone, via `MediaRecorder`,
saved as a file on their device. No server storage, no consent infrastructure,
no new API surface - a pure client capability that ships value now and leaves
the server-side pipeline (VPS disk, then S3) as a separate later change.

## What Changes

- New `use-local-recorder` hook in the media feature: combines the active
  local camera and microphone tracks into one `MediaStream`, records it with
  `MediaRecorder` (webm; vp9 preferred, vp8 fallback), buffers 1s chunks in
  memory, and on stop assembles a single `.webm` download named
  `zvonok-<room>-<timestamp>.webm`
- Record button in `RoomCenterControls` with elapsed-time indicator while
  recording; hidden when `MediaRecorder` is unavailable, disabled when no
  local track is active
- Graceful edge handling: camera unplug / revoked permission (track `ended`)
  stops the recording and saves what was captured; leaving the room while
  recording stops and saves
- Out of scope (explicit non-goals): recording remote participants or a
  composited room view, screen-share recording, server upload, SDK exposure
  in `@zvonok/react` (the app ships it first; the hook API stabilizes before
  it enters the public package)

## Capabilities

### New Capabilities

- None (this is a client behavior; the delta lands as an ADDED requirement in
  the existing `client` spec)

## Impact

- `apps/client/src/features/media/hooks/` - new recorder hook + tests
- `apps/client/src/features/room/components/room-center-controls.tsx` and
  its tests - new button
- `apps/client/src/features/room/` - wiring in the room session glue
- No server, spec, or package changes
