# TASK-010: iOS WebRTC Fixes

## Status: Done

## Problem

Two iOS-specific issues with WebRTC video calls:

### iOS Chrome: Immediate permission error (no prompt)

- iOS Chrome (WebKit-based) fails immediately with a permission error instead of
  showing the camera/microphone permission dialog.
- Root causes:
  1. `useMediaDevices` hook called `getUserMedia({ video: true, audio: true })`
     on mount just to trigger the permission prompt for device enumeration.
     On iOS WebKit, only one `getUserMedia` call can be in-flight at a time —
     a second concurrent call fails with `NotAllowedError`.
  2. `MediaStreamProvider` also auto-starts `getUserMedia` on mount. The two
     concurrent calls race on iOS Chrome.
  3. After the error, `DeviceSelector` showed the error text but had no retry
     button — toggle buttons were disabled when `!stream || !!error`, leaving
     iOS Chrome users stuck.

### iOS Safari: Remote video not displayed

- Local camera preview works, but the remote participant's video is not visible.
- Root causes:
  1. The `<video>` element for remote streams was NOT `muted`. iOS Safari's
     autoplay policy blocks playback of unmuted video without a direct user
     gesture. Since `muted` on a `<video>` element silences audio output too,
     the fix requires splitting into separate elements.
  2. When mediasoup consumer tracks are added to an existing `MediaStream`
     (mutated in-place to avoid iOS playback reset), the React `useEffect` in
     `RemoteVideo` does not re-run because the stream reference is unchanged.
     This means `video.play()` is never re-invoked after tracks arrive.

## Solution

### Remote video: split audio/video elements

Rewrote `remote-video.tsx` to use:
- A muted `<video>` element for video tracks (satisfies iOS autoplay policy)
- A separate `<audio>` element for audio tracks
- Video-only and audio-only `MediaStream` mirrors synced from the source stream
- `addtrack`/`removetrack` event listeners on the source `MediaStream` to sync
  tracks and re-trigger `play()` when tracks arrive
- A `safePlay()` helper that retries on next user interaction if autoplay fails

### Device enumeration: remove concurrent getUserMedia

Removed the `getUserMedia` call from `useMediaDevices` that was used only for
device enumeration permissions. Now only calls `enumerateDevices()` directly.
Device labels will be blank until permission is granted through the normal
acquisition flow; the `devicechange` event re-enumerates with full labels.

### Retry button for failed media acquisition

Added a "Allow Camera & Microphone" retry button to `DeviceSelector` that
appears when media acquisition fails. This gives iOS users a way to re-trigger
`getUserMedia` from a direct user gesture (tap).

### Reset acquisition state before retry

Added `acquisition.stopStream()` before retrying in `MediaStreamProvider.start`
to reset internal state, ensuring iOS WebKit doesn't keep the acquisition in an
'error' state on retry.

### Hook dependency cleanup

Used refs (`startRef`, `stopStreamRef`) in `MediaStreamProvider` for the
mount-only `useEffect` to satisfy `eslint-plugin-react-hooks` v5 exhaustive-deps
without adding runtime dependencies.

## Files Changed

- `apps/client/src/components/remote-video.tsx` — Rewritten: split video/audio
  elements, addtrack/removetrack listeners, safePlay helper
- `apps/client/src/features/media/hooks/use-media-devices.ts` — Removed
  concurrent getUserMedia call for device enumeration
- `apps/client/src/features/media/components/device-selector.tsx` — Added retry
  button for failed media acquisition
- `apps/client/src/features/media/contexts/media-stream.context.tsx` — Added
  stopStream() before retry, ref-based mount effect
- `apps/client/src/features/media/hooks/__tests__/use-media-devices.test.ts` —
  Updated test expectations to match new behavior (no getUserMedia on init)

## Testing

- Client lint: clean (0 errors, 0 warnings)
- Client unit tests: 180/180 passed
- Server unit tests: 94/94 passed
- Manual testing on iOS devices required to verify the fixes in production
