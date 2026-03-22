# TASK-075 — User Roles for Room Creation

> **Status:** done
> **Priority:** medium
> **Created:** 2026-03-22

---

## Description
Add role-based access control (RBAC) for room creation. Only users with HOST or ADMIN role can create rooms.

## Scope
- Add Role enum to Prisma schema (USER, HOST, ADMIN)
- Add role field to User model (default: USER)
- Create NestJS RolesGuard + @Roles() decorator
- Protect POST /rooms with @Roles(Role.HOST, Role.ADMIN)
- Add PATCH /users/:id/role endpoint (ADMIN only)
- Return 403 Forbidden when USER tries to create room

## Technical Design

### Prisma Schema
```prisma
enum Role {
  USER
  HOST
  ADMIN
}

model User {
  // ... existing fields
  role Role @default(USER)
}
```

### RolesGuard
- Create `apps/server/src/auth/guards/roles.guard.ts`
- Create `apps/server/src/auth/decorators/roles.decorator.ts`
- Usage: `@Roles(Role.HOST)` on controller methods

### Admin Endpoint
```typescript
@Patch('users/:id/role')
@Roles(Role.ADMIN)
async updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto)
```

## Acceptance Criteria
- USER receives 403 on POST /rooms
- HOST/ADMIN can create rooms
- ADMIN can change user role via API
- Tests for RolesGuard and RoomController

## Definition of Done
- Schema updated and migrated
- RolesGuard implemented and tested
- RoomController protected
- Admin endpoint working
- Lint and tests passing

## Implementation Guide
1. Update Prisma schema with Role enum and User.role field
2. Run `pnpm -C apps/server migrate:dev`
3. Create RolesGuard in auth/guards/roles.guard.ts
4. Create @Roles decorator in auth/decorators/roles.decorator.ts
5. Add @Roles(Role.HOST, Role.ADMIN) to RoomController.createRoom()
6. Add PATCH /users/:id/role endpoint in UserController
7. Add/update tests
8. Run lint and tests

## Related Files
- `apps/server/prisma/schema.prisma`
- `apps/server/src/auth/guards/roles.guard.ts`
- `apps/server/src/auth/decorators/roles.decorator.ts`
- `apps/server/src/room/room.controller.ts`
- `apps/server/src/user/user.controller.ts`

## Next Task
None
