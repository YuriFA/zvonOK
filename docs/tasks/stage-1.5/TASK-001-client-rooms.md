# TASK-019 — Client-Side Room Functionality

## Status
completed

## Priority
high

## Description
Implement client-side room functionality for the WebRTC chat application. Users can create rooms and join rooms via UI using a room code (shared privately via link or directly).

## Scope
- Room type definitions matching backend DTOs
- RoomApi service (create, get by slug, update, delete)
- Create room dialog with form validation
- Update lobby with "Create Room" button
- Room page with placeholder video elements

## Out of Scope
- WebSocket connection (TASK-019)
- WebRTC video implementation (TASK-022 to TASK-026)
- Real-time participant updates

## Technical Design

### Type Definitions
```typescript
interface Room {
  id: string;
  name: string | null;
  slug: string;
  ownerId: string;
  isPublic: boolean;
  maxParticipants: number;
  status: 'active' | 'ended';
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  lastActivityAt: string | null;
}
```

### Room API Endpoints
- POST /rooms - Create room (auth required)
- GET /rooms/:slug - Get room by slug (no auth)
- PATCH /rooms/:id - Update room (owner only)
- DELETE /rooms/:id - End room (owner only)

### Components to Create
- `apps/client/src/features/room/types/room.types.ts`
- `apps/client/src/features/room/validation/create-room.schema.ts`
- `apps/client/src/features/room/services/room-api.ts`
- `apps/client/src/features/room/components/create-room-form.tsx`
- `apps/client/src/features/room/components/create-room-dialog.tsx`
- `apps/client/src/components/ui/dialog.tsx` (if not exists)

### Components to Modify
- `apps/client/src/routes/lobby.tsx` - Add Create Room button
- `apps/client/src/routes/room.tsx` - Create room page (new file)
- `apps/client/src/main.tsx` - Add /room/:slug route

## Acceptance Criteria
- [ ] Room types defined matching backend DTOs
- [ ] RoomApi service created with CRUD methods (create, get by slug, update, delete)
- [ ] Create room dialog with validation (name max 100 chars, maxParticipants 2-50)
- [ ] Lobby shows "Create Room" button for authenticated users
- [ ] Room page loads room by slug
- [ ] Room page shows placeholder video elements
- [ ] "End Room" button only visible for room owner

## Definition of Done
- All acceptance criteria satisfied
- Form validation matches backend rules
- Error handling for API failures
- Loading states for async operations
- TypeScript types are strict

## Related Files
- `apps/client/src/features/room/types/room.types.ts` - Room type definitions
- `apps/client/src/features/room/services/room-api.ts` - Room API service
- `apps/client/src/features/room/components/create-room-dialog.tsx` - Create dialog
- `apps/client/src/routes/lobby.tsx` - Lobby with create/join
- `apps/client/src/routes/room.tsx` - Room page
- `apps/server/src/room/room.controller.ts` - Backend API contract

## Next Task
TASK-020 — Socket.io Server Setup (signalling server)
