# TASK-067 — Call Ended State

## Status
planned

## Priority
high

## Description
Show a dedicated ended state on the canonical room link when the call has already been finished. Opening `/room/:slug` for a finished room should not attempt to reconnect the user back into the call.

## Scope
- Add an `ended` room-page view state alongside `prejoin` and `active`
- Show clear messaging when the room has been ended by the owner
- Prevent media, signalling, and SFU initialization for ended rooms
- Provide a clear exit path back to the main lobby
- Handle both in-session room ending and direct navigation to an already ended room

## Out of Scope
- Room archiving or call history
- Reopening an ended room
- Notifications outside the room page itself

## Current State of the Codebase
- `Room` type already has `status: 'active' | 'ended'` and `endedAt: string | null` (`apps/client/src/features/room/types/room.types.ts:8,11`)
- Server `softDeleteRoom` sets `status: 'ended'` and `endedAt` (`apps/server/src/room/room.service.ts:47-55`)
- `GET /rooms/:slug` returns rooms regardless of status — ended rooms are fetchable
- `useEndRoom` hook works: calls `DELETE /rooms/:id`, clears React Query cache, navigates the **owner** to `/` (`apps/client/src/features/room/hooks/use-end-room.ts`)
- Room page view state is an inline union `'prejoin' | 'active'` — no named `RoomViewState` type exists (`apps/client/src/routes/room.tsx:16`)
- **No `room:ended` WebSocket event** exists in the SFU gateway — other participants are NOT notified when the owner ends the room
- `room.status` and `room.endedAt` are **never checked** client-side; ended rooms render the prejoin view as if active
- No `CallEndedView` or equivalent component exists

## Technical Design

### 1. Extract Named State Type (client)
```typescript
// apps/client/src/routes/room.tsx
type RoomViewState = 'prejoin' | 'active' | 'ended';
```
Update `useState<'prejoin' | 'active'>` to `useState<RoomViewState>`.

### 2. Guard on Room Load (client)
In `room.tsx`, after the room data loads, check `room.status === 'ended'` and set `viewState` to `'ended'` before rendering. This covers direct navigation to an ended room and page refresh.

### 3. Server: Emit `sfu:room-ended` Event
When the owner ends a room (`DELETE /rooms/:id`), the server must notify all connected participants via the SFU WebSocket:
- In `room.controller.ts` or `room.service.ts`: after `softDeleteRoom`, call into the SFU service to broadcast `sfu:room-ended` to all peers in the room
- The SFU service needs a new method (e.g., `endRoom(roomId)`) that iterates room peers, emits `sfu:room-ended { roomId }` to each, and cleans up the room's mediasoup resources

### 4. Client: Listen for `sfu:room-ended` Event
- In the SFU manager or a hook: listen for `sfu:room-ended` and transition `viewState` to `'ended'`
- Tear down media tracks, transports, and producers/consumers on transition

### 5. Create `CallEndedView` Component
- New component: `apps/client/src/features/room/components/call-ended-view.tsx`
- Shows a prominent message that the call has ended
- Primary action: "Back to Lobby" link to `/`
- Must not require media permissions or active connections

### 6. Prevent Resource Initialization for Ended Rooms
- The `MediaStreamProvider`, `SfuManagerProvider`, and `MediaManagerProvider` in `room.tsx` currently wrap both prejoin and active views unconditionally
- For the ended state, these providers should either not be rendered or the ended view should be rendered outside/before them

### Entry Rules
- If `room.status === 'ended'` on load → render ended state immediately (no providers)
- If room ends while user is in active call → transition to ended state and tear down resources
- The ended state must be renderable without requiring media permissions

### UX Expectations
- Prominent title and explanation that the call has finished
- Primary action to return to `/`

## Acceptance Criteria
- [ ] Visiting `/room/:slug` for an ended room shows the ended state instead of pre-join or active call
- [ ] Ended rooms do not start media acquisition, signalling, or SFU setup
- [ ] If the owner ends the room during a call, connected users transition to the ended state via `sfu:room-ended` WebSocket event
- [ ] Ended state provides a clear action to return to the lobby
- [ ] Refreshing an ended room keeps the user in ended state

## Definition of Done
- Ended state is part of the canonical room-page state machine
- Call resources are cleaned up when transitioning from active to ended
- Server emits `sfu:room-ended` to all room peers on `DELETE /rooms/:id`
- Manual testing covers direct link, in-call room end, and page refresh

## Related Files
- `apps/client/src/routes/room.tsx` — room page, view state logic
- `apps/client/src/features/room/hooks/use-room.ts` — room data fetching
- `apps/client/src/features/room/hooks/use-end-room.ts` — end room mutation (owner)
- `apps/client/src/features/room/components/room-view.tsx` — active call view (uses `useEndRoom`)
- `apps/client/src/features/room/types/room.types.ts` — `Room` type with `status` and `endedAt`
- `apps/server/src/room/room.controller.ts` — `DELETE /rooms/:id` endpoint
- `apps/server/src/room/room.service.ts` — `softDeleteRoom` method
- `apps/server/src/sfu/sfu.gateway.ts` — WebSocket gateway (needs `sfu:room-ended`)
- `apps/server/src/sfu/sfu.service.ts` — SFU service (needs room-end broadcast method)

## Related Tasks
- TASK-003 — Pre-Join Lobby Before Call Connection (completed; established `prejoin`/`active` states)
- TASK-005 — Rooms API

## Next Task
TASK-043 — Active Speaker Detection
