# TASK-031 — Chat Data Model

## Status
planned

## Priority
medium

## Description
Create Message model in Prisma schema for storing chat history with user and room relationships.

## Scope
- Add Message model to Prisma schema
- Create relations with User and Room
- Add indexes for performance
- Run migration
- Handle cascade deletes

## Technical Design

### Prisma Schema
```prisma
model Message {
  id        String   @id @default(cuid())
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([roomId])
  @@index([userId])
}

// Update existing models
model User {
  messages Message[]
}

model Room {
  messages Message[]
}
```

## Acceptance Criteria
- Message model created in schema
- Relations with User and Room
- Cascade delete configured
- Migration applied successfully
- Prisma Client regenerated

## Definition of Done
- Schema updated
- Migration run
- Model accessible via PrismaService

## Implementation Guide
See: `docs/tasks/phase-06-chat/6.1-2-3-chat.md`

## Related Files
- `apps/server/prisma/schema.prisma`

## Next Task
TASK-032 — Chat API Endpoints
