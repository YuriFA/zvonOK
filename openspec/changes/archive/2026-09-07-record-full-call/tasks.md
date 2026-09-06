## 1. Recorder lifecycle extraction

- [x] 1.1 Extract MediaRecorder lifecycle (mime negotiation, chunk collection, stop/save, elapsed timer, feature detection) from `useLocalRecorder` into a stream-agnostic `useMediaRecorder({ stream, filenameBase })` in `apps/client/src/features/media/hooks/`
- [x] 1.2 Port the existing `use-local-recorder.test.ts` coverage onto `useMediaRecorder` and delete `useLocalRecorder` with its old test file

## 2. Composite video program

- [x] 2.1 Implement `CallRecordingCompositor` (`apps/client/src/features/media/lib/`): hidden 1280x720 canvas, per-source hidden `<video>` elements, rAF draw loop, `computeLayout`-driven grid, name labels, mirrored local tile, initials placeholder tiles for video-off participants
- [x] 2.2 Add spotlight mode: `activeScreenShare` stream drawn into `computeLayout` spotlight area with participant strip, matching the `isSpotlightMode` derivation in `ActiveRoomView`
- [x] 2.3 Unit tests: layout mapping to canvas rects (grid and spotlight), placeholder rendering, source attach/detach on peer join/leave, captureStream wiring

## 3. Mixed audio program

- [x] 3.1 Implement audio mixer (`apps/client/src/features/media/lib/`): lazy `AudioContext` on start, `MediaStreamAudioSourceNode` per participating stream into one `MediaStreamAudioDestinationNode`, source attach/detach on membership changes
- [x] 3.2 Unit tests: graph wiring per stream (mock `AudioContext`), mixed-stream track output, teardown disconnects sources

## 4. Room wiring and UI copy

- [x] 4.1 Implement `useCallRecording` hook composing canvas capture stream + mixed audio into `useMediaRecorder`; stop+save on room leave/unmount
- [x] 4.2 Replace `useLocalRecorder` in `ActiveRoomView`; extend recording enablement to any publishing participant (local or remote); keep local-priority screen-share spotlight as the composite source
- [x] 4.3 Update record control copy in `room-center-controls.tsx` (tooltip/aria) to state the whole call is recorded locally; update `room-center-controls.test.tsx` expectations
- [x] 4.4 Hide the control when `MediaRecorder` or `canvas.captureStream` is unavailable

## 5. Verification and spec sync

- [x] 5.1 Full client suite (`pnpm -C apps/client test:run`) and lint green
- [x] 5.2 Browser smoke test: two-tab fake-media call, record, verify saved file contains both participants' video and mixed audio
- [x] 5.3 Run `pnpm openspec:validate` and archive the change so the client spec absorbs the "Call recording" requirement
