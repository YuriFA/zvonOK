# TASK-068 — Persist Device State From Lobby to Call Join

## Status
planned

## Priority
high

## Description
Persist the user's media setup from the pre-join lobby into the active call so joining a room does not reset selected camera/microphone devices or the intended mic/camera enabled state.

## Scope
- Preserve selected camera and microphone device ids chosen in the pre-join lobby
- Preserve the user's audio/video enabled intent when transitioning from `prejoin` to `active`
- Keep the same media setup when entering via `/room/:slug/lobby` and being redirected to `/room/:slug`
- Initialize active call media and SFU state from the preserved lobby setup instead of reacquiring default devices
- Keep room controls synchronized with the preserved state immediately after join

## Out of Scope
- Persisting device state across browser restarts or across different rooms
- Speaker output selection persistence
- Redesign of the lobby or in-call device controls
- Camera hardware release behavior when toggling during an active call

## Technical Design

### Shared Media Setup State
```typescript
interface RoomMediaSetupState {
  selectedAudioInputId: string | null;
  selectedVideoInputId: string | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}
```

The room entry flow should use a single client-side state object as the source of truth for both pre-join UI and active call initialization.

### Transition Rules
- Changes made in pre-join device selectors update the shared setup state immediately
- Clicking "Join Room" must consume the stored device ids and enabled flags instead of falling back to browser defaults
- If video is disabled in pre-join, the user enters the call without eagerly enabling the camera
- If audio is disabled in pre-join, the user enters the call muted
- Redirecting from `/room/:slug/lobby` must not create a fresh media setup state

### Failure Handling
- If a previously selected device is no longer available at join time, the UI should surface a recoverable error instead of silently resetting to another device
- If only one media kind fails, the remaining preserved state should still be applied

## Acceptance Criteria
- [ ] Camera selected in pre-join remains the selected camera after joining the call
- [ ] Microphone selected in pre-join remains the selected microphone after joining the call
- [ ] Joining with camera disabled in pre-join enters the call with video disabled
- [ ] Joining with microphone disabled in pre-join enters the call muted
- [ ] Redirect from `/room/:slug/lobby` to `/room/:slug` preserves the same media setup state
- [ ] In-call controls reflect the preserved device and toggle state immediately after join
- [ ] Join flow does not silently fall back to default devices when an explicit pre-join selection exists
- [ ] Device availability errors during join are surfaced as recoverable UI state

## Definition of Done
- Pre-join and active call consume the same room-scoped media setup state
- Device selections and toggle intent survive the `prejoin` to `active` transition without resets
- Legacy lobby alias does not create a duplicate media state path
- Manual testing covers direct room link, lobby alias redirect, disabled-video join, and disabled-audio join

## Related Files
- `apps/client/src/routes/room.tsx`
- `apps/client/src/routes/room-lobby.tsx`
- `apps/client/src/features/media/`
- `apps/client/src/features/room/`

## Related Tasks
- TASK-063 — Pre-Join Lobby Before Call Connection
- TASK-065 — Proper Camera Toggle Implementation
- TASK-066 — Media Error Indicators on Controls

## Next Task
TASK-065 — Proper Camera Toggle Implementation