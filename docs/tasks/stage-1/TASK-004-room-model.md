# TASK-017 — Room Data Model

## Status
completed

## Priority
high

## Description
Create Room model in Prisma schema for managing video call rooms with owner, public visibility, slug for invites, and lifecycle management.

## Scope
- Add Room model to Prisma schema
- Create relationship between User and Room (owner)
- Add unique slug for room invites
- Add isPublic, maxParticipants fields
- Add status enum (active/ended)
- Add endedAt, lastActivityAt timestamps
- Run migration
- Generate Prisma Client

## Out of Scope
- Rooms API endpoints (covered in TASK-018)

## Technical Design

### Room Model
```prisma
model Room {
  id               String     @id @default(cuid())
  name             String?
  slug             String     @unique
  ownerId          String
  owner            User       @relation(fields: [ownerId], references: [id])
  isPublic         Boolean    @default(true)
  maxParticipants  Int        @default(10)
  status           RoomStatus @default(active)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  endedAt          DateTime?
  lastActivityAt   DateTime?

  @@index([ownerId])
  @@index([status])
}

enum RoomStatus {
  active
  ended
}
```

### User Relationship
```prisma
model User {
  // ... existing fields
  rooms        Room[]
}
```

## Acceptance Criteria
- Room model added to schema
- Slug is unique and indexed
- maxParticipants defaults to 10
- status, endedAt, lastActivityAt present
- Migration applied to database
- Prisma Client regenerated

## Definition of Done
- Room model created
- Migration successful
- Prisma Client updated
- Room accessible via PrismaService

## Implementation Guide

## Related Files
- `apps/server/prisma/schema.prisma`

## Next Task
TASK-018 — Rooms CRUD API
