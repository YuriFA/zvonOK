# TASK-018 — Rooms CRUD API

## Status
completed

## Priority
high

## Description
Implement REST API for managing rooms: create, list, view, update, and soft-delete rooms. Owner-only permissions for modifications.

## Scope
- POST /rooms - Create room with generated slug
- GET /rooms - List public active rooms (paginated)
- GET /rooms/:slug - Get room by slug
- PATCH /rooms/:id - Update room (owner only)
- DELETE /rooms/:id - End room (owner only, soft delete)
- Owner permission checks
- TTL cleanup job for ended rooms (1 hour)

## Out of Scope
- WebSocket signalling (covered in TASK-019 to TASK-021)

## Technical Design

### DTOs
```typescript
// CreateRoomDto
name?: string
maxParticipants?: number

// UpdateRoomDto
name?: string
maxParticipants?: number
status?: 'ended' | 'active'
```

### Endpoints
- All require JWT authentication
- Owner check on update/delete returns 403
- Soft delete sets status=ended, endedAt=now

### Slug Generation
- Generate 6-8 character unique slug
- Retry on collision

### TTL Cleanup
- Job deletes rooms where status=ended AND endedAt < now - 1h

## Acceptance Criteria
- POST /rooms creates room with owner
- GET /rooms returns only public+active rooms
- GET /rooms/:slug works by slug
- PATCH/DELETE only for room owner
- Soft delete sets status=ended
- TTL cleanup removes old rooms

## Definition of Done
- All endpoints implemented
- Owner checks working
- Slug generation unique
- Soft delete functional
- Cleanup job runs

## Implementation Guide

## Related Files
- `apps/server/src/room/room.controller.ts`
- `apps/server/src/room/room.service.ts`
- `apps/server/src/room/dto/*.dto.ts`

## Next Task
TASK-019 — Socket.io Server Setup
