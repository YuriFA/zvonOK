# User Module

## Purpose

Manages user role updates (ADMIN-only operations). User creation is handled by AuthModule.

---

## Use Cases

### 1. Update User Role
- ADMIN can promote/demote users between `USER`, `HOST`, `ADMIN` roles
- Admin cannot change their own role
- Cannot demote the last admin
- Bumps `tokenVersion` on role change to invalidate existing JWT tokens

---

## Domain Model

### User Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | Primary Key, `cuid()` |
| email | String | Unique, indexed |
| username | String | Unique, indexed |
| passwordHash | String | bcrypt (10 rounds) |
| createdAt | DateTime | `now()` |
| updatedAt | DateTime | Auto-update |
| refreshTokenHash | String? | SHA256 hash |
| failedLoginAttempts | Int | Default: 0 |
| lockedUntil | DateTime? | Account lockout |
| tokenVersion | Int | Default: 0 |
| role | Role | Default: `USER` (`USER`, `HOST`, `ADMIN`) |

### Relations

```prisma
model User {
  rooms  Room[]  @relation("RoomHost")
}
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/users/:id/role` | ADMIN only (`@Roles(Role.ADMIN)`) | Update user role → 200 |

### Request/Response Examples

**PATCH /users/:id/role**
```json
// Request
{
  "role": "HOST"
}

// Response 200
{
  "id": "clx...",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "HOST",
  "tokenVersion": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-02T00:00:00Z"
}
```

> **Note:** `GET /auth/me` (current user profile) is served by `AuthController`, not by this module. There is no public user lookup endpoint (`GET /users/:id`).

---

## Edge Cases

### Cannot Change Own Role
- Returns 403 Forbidden when admin tries to change their own role

### Last Admin Protection
- Returns 403 Forbidden when attempting to demote the last remaining admin

### User Not Found
- Returns 404 for non-existent user IDs

---

## Files

- `apps/server/src/user/user.service.ts` — CRUD via Prisma (user, updateUser, countUsers)
- `apps/server/src/user/user.controller.ts` — PATCH /:id/role endpoint
- `apps/server/src/user/user.module.ts` — Module definition
- `apps/server/src/user/dto/update-role.dto.ts` — Role update validation
- `apps/server/src/user/decorators/user.decorator.ts` — @User() param decorator
- `apps/server/prisma/schema.prisma` — Prisma schema
