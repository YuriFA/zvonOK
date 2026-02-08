# Room Module

## Purpose

Manages video conference rooms with slug-based invite codes, participant limits, and lifecycle management (active/ended status).

---

## Use Cases

### 1. Create Room
- Authenticated user creates a new room
- System generates unique 6-character slug (e.g., "abc123")
- Sets creator as room owner
- Returns room with invite code (slug)

### 2. Get Room by Slug
- Public endpoint (no authentication required)
- Anyone with the slug can view room details
- Used to validate room codes before joining

### 3. Update Room
- Only room owner can update
- Can modify: name, status, maxParticipants
- Returns updated room data

### 4. End Room
- Only room owner can end room
- Soft delete: sets status to "ended", records endedAt timestamp
- Returns 204 No Content
- Room data preserved for audit/history

---

## Domain Model

### Room Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | Primary Key, `cuid()` |
| name | String? | Optional, max 100 chars |
| slug | String | Unique, 6-char alphanumeric (auto-generated) |
| ownerId | String | Foreign Key to User |
| isPublic | Boolean | Default: `true` |
| maxParticipants | Int | Default: 10, range 2-50 |
| status | RoomStatus | `active` or `ended` (default: `active`) |
| createdAt | DateTime | `now()` |
| updatedAt | DateTime | Auto-update |
| endedAt | DateTime? | Set when room ends |
| lastActivityAt | DateTime? | For future activity tracking |

### Relations

```prisma
model Room {
  id              String     @id @default(cuid())
  name            String?
  slug            String     @unique
  ownerId         String
  owner           User       @relation("RoomHost", fields: [ownerId], references: [id])
  isPublic        Boolean    @default(true)
  maxParticipants Int        @default(10)
  status          RoomStatus @default(active)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  endedAt         DateTime?
  lastActivityAt  DateTime?

  @@index([ownerId])
  @@index([status])
  @@index([isPublic])
}

enum RoomStatus {
  active
  ended
}
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/rooms` | Protected | Create new room |
| GET | `/api/rooms/:slug` | Public | Get room by slug |
| PATCH | `/api/rooms/:id` | Protected | Update room (owner only) |
| DELETE | `/api/rooms/:id` | Protected | End room (owner only) |

### Request/Response Examples

**POST /api/rooms**
```json
// Request
{
  "name": "Team Standup",
  "maxParticipants": 10
}

// Response 201
{
  "id": "clx...",
  "name": "Team Standup",
  "slug": "abc123",
  "ownerId": "user_123",
  "isPublic": true,
  "maxParticipants": 10,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "endedAt": null,
  "lastActivityAt": null
}
```

**GET /api/rooms/:slug**
```json
// Response 200
{
  "id": "clx...",
  "name": "Team Standup",
  "slug": "abc123",
  "ownerId": "user_123",
  "isPublic": true,
  "maxParticipants": 10,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "endedAt": null,
  "lastActivityAt": null
}
```

**PATCH /api/rooms/:id**
```json
// Request
{
  "name": "Updated Name",
  "maxParticipants": 20
}

// Response 200
{
  "id": "clx...",
  "name": "Updated Name",
  "slug": "abc123",
  "ownerId": "user_123",
  "isPublic": true,
  "maxParticipants": 20,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T01:00:00Z",
  "endedAt": null,
  "lastActivityAt": null
}
```

**DELETE /api/rooms/:id**
```json
// Response 204 No Content
```

---

## DTOs

### CreateRoomDto

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | No | max 100 characters |
| maxParticipants | number | No | 2-50, default 10 |

### UpdateRoomDto

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | No | max 100 characters |
| status | 'active' \| 'ended' | No | Enum values |
| maxParticipants | number | No | 2-50 |

---

## Edge Cases

### Slug Collision
- System generates 6-character alphanumeric slug
- If collision occurs, retry up to 10 times
- After 10 attempts, append timestamp fallback

### Room Not Found
- GET by slug returns 404 for non-existent rooms
- PATCH/DELETE return 404 for invalid room IDs

### Unauthorized Update/Delete
- Non-owner attempting to update/delete receives 403 Forbidden
- JWT payload provides user ID for ownership check

### Invalid Max Participants
- Values outside 2-50 range rejected by validation
- Default of 10 applied if not provided

---

## Business Rules

### Slug Generation
- 6 characters: lowercase letters + numbers
- 62^6 ≈ 56 billion possible combinations
- Generated randomly, no sequential patterns
- Uniqueness enforced by database constraint

### Room Ownership
- Owner assigned at creation (user ID from JWT)
- Ownership cannot be transferred
- Only owner can update or end room

### Soft Delete
- DELETE sets status to "ended" and records endedAt
- Room record preserved for history/audit
- No hard delete implemented

### Public Rooms
- `isPublic` flag reserved for future "room discovery" feature
- Currently all rooms are public (default true)
- Private rooms may be implemented in future stages

---

## Files

- `apps/server/src/room/room.service.ts` — Business logic
- `apps/server/src/room/room.controller.ts` — REST endpoints
- `apps/server/src/room/room.module.ts` — Module definition
- `apps/server/src/room/dto/create-room.dto.ts` — Create validation
- `apps/server/src/room/dto/update-room.dto.ts` — Update validation
- `apps/server/src/room/dto/room-response.dto.ts` — Response schema
- `apps/server/src/room/cleanup.service.ts` — Cleanup jobs (future)
