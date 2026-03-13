# TASK-067 — Call Ended State

## Status
planned

## Priority
high

## Description
Show a dedicated ended state on the canonical room link when the call has already been finished. Opening `/room/:slug` for a finished room should not attempt to reconnect the user back into the call.

## Scope
- Add an `ended` room-page state alongside `prejoin` and `active`
- Show clear messaging when the room has been ended by the owner
- Prevent media, signalling, and SFU initialization for ended rooms
- Provide a clear exit path back to the main lobby
- Handle both in-session room ending and direct navigation to an already ended room

## Out of Scope
- Room archiving or call history
- Reopening an ended room
- Notifications outside the room page itself

## Technical Design

### Canonical State Model
```typescript
type RoomViewState = 'prejoin' | 'active' | 'ended';
```

### Entry Rules
- If room metadata indicates the room is ended, `/room/:slug` renders the ended state immediately
- If the room ends while the user is in the active call, the page transitions to ended state and tears down call resources
- The ended state must be renderable without requiring media permissions

### UX Expectations
- Prominent title and explanation that the call has finished
- Optional secondary detail about who can end a room if that context is already available
- Primary action to return to `/`

## Acceptance Criteria
- [ ] Visiting `/room/:slug` for an ended room shows the ended state instead of pre-join or active call
- [ ] Ended rooms do not start media acquisition, signalling, or SFU setup
- [ ] If the owner ends the room during a call, connected users transition to the ended state
- [ ] Ended state provides a clear action to return to the lobby
- [ ] Refreshing an ended room keeps the user in ended state

## Definition of Done
- Ended state is part of the canonical room-page state machine
- Call resources are cleaned up when transitioning from active to ended
- Manual testing covers direct link, in-call room end, and page refresh

## Related Files
- `apps/client/src/routes/room.tsx`
- `apps/client/src/features/room/hooks/use-room.ts`
- `apps/client/src/features/room/hooks/use-end-room.ts`

## Related Tasks
- TASK-063 — Pre-Join Lobby Before Call Connection
- TASK-005 — Rooms API

## Next Task
TASK-043 — Active Speaker Detection