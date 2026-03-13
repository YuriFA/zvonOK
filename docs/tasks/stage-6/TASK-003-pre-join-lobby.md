# TASK-063 — Pre-Join Lobby Before Call Connection

## Status
planned

## Priority
high

## Description
Make `/room/:slug` the canonical room link with a pre-join state before entering a call. The actual Socket.io/WebRTC/SFU connection must start only after the user clicks the join button.

## Scope
- Show pre-join first when opening a room link or joining a call from the app
- Use `/room/:slug` as the canonical room entry URL
- Keep `/room/:slug/lobby` only as a compatibility alias or redirect during migration
- Reuse the existing room lobby UI where possible
- Delay signalling and media transport initialization until explicit confirmation
- Preserve selected camera and microphone settings from the lobby
- Keep local preview and mute/camera toggles available before join
- Define the room page state transition from `prejoin` to `active`

## Out of Scope
- Redesign of room lobby visuals
- Changes to video grid layout logic
- Ended-call UX after the room is finished
- Screen sharing and chat features

## Technical Design

### Canonical Room States
```typescript
type RoomViewState = 'prejoin' | 'active' | 'ended';

// This task implements the transition into the first two states.
// The ended state is covered by a separate task.
```

### Connection Timing
- Do not join Socket.io room on initial page open
- Do not create SFU transports or consumers before confirmation
- Acquire preview media for the lobby separately from the actual call join lifecycle
- Reuse selected device ids when creating the real call media stream

### Navigation Rules
- Opening a shared room link at `/room/:slug` should land in the pre-join state first
- Creating a room from the app should also land on `/room/:slug` in pre-join state
- `/room/:slug/lobby` should redirect or delegate to the same pre-join state
- Refreshing before join should keep the user in the lobby state
- Leaving the call and re-entering should also pass through the lobby

## Acceptance Criteria
- [ ] Opening `/room/:slug` shows the pre-join state instead of connecting immediately
- [ ] Creating a room from the app lands on the same pre-join flow as a shared link
- [ ] `/room/:slug/lobby` does not create a second independent flow; it redirects to or reuses the canonical pre-join state
- [ ] No signalling room join happens before the user confirms entry
- [ ] No SFU transport or consumer setup starts before confirmation
- [ ] Lobby shows local media preview and device controls before join
- [ ] Selected camera and microphone are applied after joining the call
- [ ] Clicking "Join" switches the room page into active call state and starts connection setup
- [ ] Refreshing the page before joining keeps the user in the lobby flow
- [ ] Direct navigation from app UI and shared links both use the same pre-join behavior

## Definition of Done
- `/room/:slug` is the default entry point to calls
- Connection lifecycle starts only after explicit user action
- Existing room lobby behavior is reused without duplicating logic
- Legacy `/room/:slug/lobby` behavior is preserved via redirect or delegation, not a separate implementation
- Manual testing covers direct link, in-app join, refresh, and leave/rejoin scenarios

## Related Files
- `apps/client/src/routes/room-lobby.tsx`
- `apps/client/src/routes/room.tsx`
- `apps/client/src/main.tsx`
- `apps/client/src/features/media/`
- `apps/client/src/features/room/`

## Related Tasks
- TASK-062 — Room Lobby Page
- TASK-041 — SFU Client Integration
- TASK-059 — SFU Participants List UI
- TASK-067 — Call Ended State

## Next Task
TASK-064 — Fix Missing Participant Without Media