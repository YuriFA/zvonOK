# Design: add-local-recording

## Context

The local capture layer already exposes the raw ingredients:
`MediaStreamProvider` (features/media/contexts/media-stream.context.tsx) holds
`videoStream` and `audioStream` as two separate `MediaStream`s whose tracks
are what the SFU publishes. `MediaRecorder` accepts exactly one stream, so the
recorder combines the currently active tracks into a fresh `MediaStream` at
`start()`. The control bar (`RoomCenterControls`) already carries the
supported/blocked/disabled gating pattern for screen share - the record button
follows it.

## Decisions

- **D1 - Combine at start, camera and mic only.** The combined stream is
  built once from the tracks active at `start()` and holds those track
  objects. Screen share is excluded from v1: recording your own A/V is
  consent-trivial (it is your own capture); recording a composited room view
  or screen content is a different feature with different consent semantics
  and belongs to the later server-side/compositor slice.
- **D2 - Codec negotiation with silent fallback.** Ask
  `MediaRecorder.isTypeSupported` in order: `video/webm;codecs=vp9,opus`,
  `video/webm;codecs=vp8,opus`, `video/webm`; none available means the
  capability is unsupported and the control hides. Audio-only and video-only
  combinations are both valid starting states (record what is active).
- **D3 - Memory buffering, single download.** `start(1000)` timeslice chunks
  accumulate in an in-memory array; `stop()` assembles one `Blob` and
  triggers a programmatic download. A one-hour vp9 recording is well under a
  gigabyte; no streaming-to-disk machinery in the browser for v1. The file
  name encodes room and start time: `zvonok-<roomSlug>-<yyyy-mm-dd-hhmm>.webm`.
- **D4 - Track death is a save, not a loss.** `track.onended` (unplug,
  permission revoke) and room unmount both route to the same stop-and-save
  path as a manual stop. Camera-off via the mute toggle does NOT end the
  track, so muting mid-recording simply records silence/black - recording
  continues (intentional; matches how standalone recorders behave).
- **D5 - State machine in one hook.** `idle | recording | saving`, owned by
  `use-local-recorder`; the UI renders from it and never touches
  `MediaRecorder` directly. Elapsed time is a 1s interval derive from the
  start timestamp (not a stopwatch that drifts).
- **Device switching mid-recording:** the combined stream keeps the original
  tracks; switching devices ends the old track, which via D4 stops and saves
  the recording. Documented behavior, not a bug.

## Risks / Trade-offs

- In-memory buffering means a crashed tab loses the recording - acceptable
  for local-first v1; the server pipeline is the durability answer later.
- `MediaRecorder` output is container/codec dependent across browsers; webm
  (vp8/vp9) is the lowest common denominator and Safari 14.1+ supports it.
  mp4 muxing is deliberately out of scope.

## Migration Plan

Pure addition on the client; no data, API, or contract changes. Ship behind
nothing (feature is user-triggered only).

## Open Questions

- None - scope is deliberately small.
