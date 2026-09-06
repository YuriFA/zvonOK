# Tasks: add-local-recording

## 1. Recorder core

- [x] 1.1 `use-local-recorder` hook: state machine (idle/recording/saving),
      codec negotiation (vp9/vp8/webm, unsupported when none), combined
      stream from active local tracks, 1s chunk buffering, stop-and-save to
      `zvonok-<room>-<timestamp>.webm`, elapsed timer
- [x] 1.2 Edge paths: `track.onended` stop-and-save, unmount-while-recording
      stop-and-save; unit tests (mocked `MediaRecorder`, jsdom)

## 2. Room UI

- [x] 2.1 Record button in `RoomCenterControls`: hidden when unsupported,
      disabled without active tracks, red state + `mm:ss` while recording,
      tooltips and aria-labels matching the existing pattern; unit tests
- [x] 2.2 Wire the hook into the room session glue (active room view) with
      `videoStream`/`audioStream` from `MediaStreamProvider`

## 3. Verification

- [x] 3.1 Client suite green (`pnpm -C apps/client test:run`), lint clean
- [x] 3.2 Browser smoke: record start/stop produces a playable webm download;
      unsupported-environment path checked via emulation
