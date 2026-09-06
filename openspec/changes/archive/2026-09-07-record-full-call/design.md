## Context

- Today the record control wires `useLocalRecorder` (`apps/client/src/features/media/hooks/use-local-recorder.ts`) directly to `localVideoStream`/`localAudioStream` in `ActiveRoomView`; everything else in the room is invisible to it.
- The room already has every ingredient a compositor needs: `remotePeers: RemotePeerMedia[]` with per-peer `cameraStream`/`screenStream`/`audioStream` (`src/hooks/use-mediasoup.ts`), an `activeScreenShare` derivation with local-sharer priority (`active-room-view.tsx`), and the shared `@zvonok/video-layout#computeLayout` engine that produces tile rectangles (grid + spotlight strip) from container size and participant count.
- Server-side egress composites the same semantics (screen share replaces camera canvas, mixed audio) with ffmpeg; this change brings the local button to parity.

## Goals / Non-Goals

**Goals:**
- Record the whole call locally: composited video program of all publishing participants + one mixed audio track of everyone.
- Mirror room UI semantics (grid, spotlight, names) so the file looks like what the recorder sees.
- Survive membership/publishing changes mid-recording without restarting the file.
- Reuse the existing MediaRecorder lifecycle (mime negotiation, chunks, save, elapsed timer).

**Non-Goals:**
- No upload or server storage; the file stays local (server-side capture remains egress's job).
- No layout customization, no per-participant audio isolation, no post-recording remuxing.
- No whiteboard/chat capture - media only, matching egress.

## Decisions

1. **Composite with a hidden canvas, not MediaStream track mixing.** Video is composited by drawing participant streams onto a 1280x720 `<canvas>` in a rAF loop and capturing it with `canvas.captureStream(30)`. Alternatives considered: inserting each track into the recorder is impossible (MediaRecorder takes one video track); WebRTC track merging requires a second peer connection - heavy and fragile.
2. **Reuse `computeLayout` for tile geometry** at canvas resolution, including `spotlight: true` when `activeScreenShare` exists (spotlight area for the screen stream, participant strip for cameras). The recording then matches the UI and egress semantics with zero layout duplication. Local tile is drawn mirrored, matching the `mirror` class the UI applies to self-view.
3. **Video-off participants get placeholder tiles** (initials + name label), mirroring `RoomVideoAudioOverlay`; audio still enters the mix. Publishing participants with live video are drawn from per-source hidden `<video>` elements (`drawImage` needs an element/frame source, it cannot take a `MediaStreamTrack` directly).
4. **Audio via WebAudio mix bus.** One lazily created `AudioContext` (created on the record click, so the user-gesture autoplay policy is satisfied); a `MediaStreamAudioSourceNode` per participating stream (own mic + each peer's `audioStream`) feeding one `MediaStreamAudioDestinationNode`. Existing playback is untouched - tapping a track into WebAudio is parallel to its `<audio>` element, so monitoring behavior is unchanged.
5. **Evolve the recorder hook, delete the old one.** Extract the MediaRecorder lifecycle (mime pick, `ondataavailable` chunks, stop/save, elapsed seconds) into a stream-agnostic `useMediaRecorder({ stream, filenameBase })`; build the composited stream in a new `useCallRecording` hook and delete `useLocalRecorder` and its tests. No parallel paths; the old hook's single-source behavior is subsumed.
6. **Recording lifetime is the room session, not any single track.** The recorder consumes the canvas capture stream, which never ends on its own, so peers joining/leaving or devices toggling only change what gets drawn/mixed. Stop+save happens on explicit stop, room leave, or unmount. The spec's "nothing to record" gate is evaluated continuously (button disabled when nobody publishes; an in-flight recording is not killed by a transient silence).
7. **Feature detection extends to canvas capture.** The control is hidden unless both `MediaRecorder` and `HTMLCanvasElement.captureStream` exist (Safari ships MediaRecorder but captureStream needs 14.1+; detect, don't version-sniff).

## Risks / Trade-offs

- [Background tab freezes the video track] rAF stops when the tab is hidden, so the canvas stops producing frames; audio keeps recording, video holds the last frame. → Accepted and documented; a worker-driven `OffscreenCanvas` loop is the escape hatch if it ever matters. Chrome's own tab capture behaves the same.
- [CPU cost of drawing N videos at 30fps] → Mitigation: placeholder tiles are drawn as static text (no video decode), the canvas is a fixed 1280x720 regardless of viewport, and the loop skips redrawing while no source is live.
- [Mixed audio cannot be adjusted after the fact] → Accepted; it matches egress's single program. Per-speaker isolation would require a different format (out of scope).
- [Safari canvas captureStream quirks (frame pacing)] → Feature-detected; worst case the control is hidden on affected browsers.

## Migration Plan

Single client release; no data migration. The spec delta ("Local recording" → "Call recording") lands with the implementation via `/opsx-archive`. Rollback is a revert; old recordings (own-devices-only files) remain valid `.webm` files.
