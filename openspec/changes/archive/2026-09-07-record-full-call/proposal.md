## Why

The in-room record control is described and perceived as "record the call", but it captures only the recorder's own camera and microphone (`useLocalRecorder`). Other participants are neither visible nor audible in the saved file, which contradicts the expectation the button creates and makes the feature misleading for its primary use case.

## What Changes

- The room record control now records the whole call: a composited video program of all participants plus a mixed audio track of everyone, saved locally as a `.webm` file on the recorder's device.
- Video program mirrors the room UI semantics: grid of participant tiles via the shared `@zvonok/video-layout` engine; an active screen share is spotlighted in place of camera tiles while it lasts (same behavior as server-side egress).
- Audio program mixes the recorder's own microphone with every remote participant's audio via WebAudio; playback behavior is unchanged.
- Recording remains local-only (no upload, no server storage) and keeps the existing lifecycle: stops and saves on leave, on unmount, or when the recorder's last capturable source disappears.
- UI copy updated so the control states what it does; the previous own-devices-only limitation is removed (recording is possible as long as anyone in the room publishes media).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `client`: the "Local recording" requirement is revised into "Call recording" - the record control captures a composited program of the whole call (all participants' video tiles, screen-share spotlight, mixed audio of everyone) instead of only the local user's own camera and microphone. Lifecycle, local-file output, hidden-when-unsupported and disabled-when-nothing-to-record scenarios are preserved with updated conditions.
