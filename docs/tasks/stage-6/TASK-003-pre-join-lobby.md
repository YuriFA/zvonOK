# TASK-063 — Pre-Join Lobby Before Call Connection

## Status
planned

## Priority
high

## Description
Show a pre-join lobby before entering a call so the user can preview devices and explicitly confirm joining. The actual Socket.io/WebRTC/SFU connection must start only after the user clicks the join button from the lobby.

## Scope
- Show lobby first when opening a room link or joining a call from the app
- Reuse the existing room lobby UI where possible
- Delay signalling and media transport initialization until explicit confirmation
- Preserve selected camera and microphone settings from the lobby
- Keep local preview and mute/camera toggles available before join
- Handle direct navigation to `/room/:slug` by redirecting to the pre-join flow

## Out of Scope
- Redesign of room lobby visuals
- Changes to video grid layout logic
- Screen sharing and chat features

## Technical Design

### Join Flow
```typescript
// Expected flow
/room/:slug -> pre-join lobby -> user clicks "Join" -> connect to call
```

### Connection Timing
- Do not join Socket.io room on initial page open
- Do not create SFU transports or consumers before confirmation
- Acquire preview media for the lobby separately from the actual call join lifecycle
- Reuse selected device ids when creating the real call media stream

### Navigation Rules
- Opening a shared room link should land in the lobby first
- Refreshing before join should keep the user in the lobby state
- Leaving the call and re-entering should also pass through the lobby

## Acceptance Criteria
- [ ] Opening a room URL shows the pre-join lobby instead of connecting immediately
- [ ] No signalling room join happens before the user confirms entry
- [ ] No SFU transport or consumer setup starts before confirmation
- [ ] Lobby shows local media preview and device controls before join
- [ ] Selected camera and microphone are applied after joining the call
- [ ] Clicking "Join" enters the actual room and starts connection setup
- [ ] Refreshing the page before joining keeps the user in the lobby flow
- [ ] Direct navigation from app UI and shared links both use the same pre-join behavior

## Definition of Done
- Pre-join flow is the default entry point to calls
- Connection lifecycle starts only after explicit user action
- Existing room lobby behavior is reused without duplicating logic
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

## Next Task
TASK-044 — Caddy Reverse Proxy with HTTPS