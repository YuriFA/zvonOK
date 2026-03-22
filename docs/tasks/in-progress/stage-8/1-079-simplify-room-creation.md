# TASK-079 — Simplify Room Creation

> **Status:** completed
> **Priority:** medium
> **Created:** 2026-03-22

---

## Description
Remove form fields from room creation flow. Clicking "Create room" button should immediately create a room with default values and navigate user to the room page.

## Scope
- Remove CreateRoomDialog component (modal wrapper)
- Remove CreateRoomForm component (form with fields)
- Remove create-room.schema.ts (zod validation)
- Update home.tsx to call createRoom mutation directly on button click
- Clean up component exports

## Technical Design

### Current Flow
```
Button → Dialog → Form → Submit → POST /rooms → navigate
```

### New Flow
```
Button → POST /rooms (with empty body) → navigate
```

### Server Changes
None required - `name` and `maxParticipants` are already optional with defaults:
- `name`: null
- `maxParticipants`: 10

### Client Changes

**apps/client/src/routes/home.tsx**
- Replace `<CreateRoomDialog>` with `<Button onClick={...}>`
- Call `createRoom.mutate({})` directly
- Add loading state from mutation

**Delete files:**
- `apps/client/src/features/room/components/create-room-dialog.tsx`
- `apps/client/src/features/room/components/create-room-form.tsx`
- `apps/client/src/features/room/validation/create-room.schema.ts`

**apps/client/src/features/room/components/index.ts**
- Remove exports for deleted components

## Acceptance Criteria
- Clicking "Create room" creates room immediately
- No modal dialog shown
- User navigates to `/room/{slug}` after creation
- Loading state shown on button during creation
- Error handling works (toast notification)

## Definition of Done
- All tests passing
- No unused imports/exports
- Lint clean

## Implementation Guide
1. Update home.tsx with direct mutation call
2. Delete unused components and schema
3. Update index.ts exports
4. Run lint and tests

## Related Files
- `apps/client/src/routes/home.tsx`
- `apps/client/src/features/room/components/create-room-dialog.tsx`
- `apps/client/src/features/room/components/create-room-form.tsx`
- `apps/client/src/features/room/hooks/use-create-room.ts`
- `apps/client/src/features/room/validation/create-room.schema.ts`
