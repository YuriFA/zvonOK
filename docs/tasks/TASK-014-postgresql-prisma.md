# TASK-014 — PostgreSQL + Prisma Setup

## Status
completed

## Priority
high

## Description
Connect PostgreSQL to NestJS project through Prisma ORM. Create database for storing users, rooms, and messages.

## Scope
- Set up PostgreSQL (Docker Compose recommended)
- Install Prisma in project
- Initialize Prisma schema
- Configure DATABASE_URL
- Create User model
- Run initial migration
- Generate Prisma Client
- Set up PrismaService in NestJS
- Verify with Prisma Studio

## Out of Scope
- Additional models (covered in later tasks)

## Technical Design

### Prisma Schema Location
`apps/server/prisma/schema.prisma`

### Initial User Model
```prisma
model User {
  id               String   @id @default(cuid())
  email            String   @unique
  username         String   @unique
  passwordHash     String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  refreshTokenHash String?
}
```

### PrismaService
- Extends PrismaClient
- Implements OnModuleInit/OnModuleDestroy
- Registered as @Global() module

## Acceptance Criteria
- PostgreSQL is running and accessible
- `prisma migrate dev` executes successfully
- PrismaService is injected in NestJS
- Prisma Studio opens and shows User table
- Can create user via Studio
- Can read user via Prisma Client in code

## Definition of Done
- PostgreSQL connected
- Prisma configured
- User model created
- Migration applied
- PrismaService works in NestJS

## Implementation Guide
See: `docs/tasks/phase-01-backend/1.1-postgresql-prisma.md`

## Related Files
- `apps/server/prisma/schema.prisma`
- `apps/server/src/prisma/prisma.service.ts`
- `apps/server/src/prisma/prisma.module.ts`

## Next Task
TASK-015 — User Registration Endpoint
