# User Module

## Purpose

Manages user CRUD operations and user data persistence through Prisma ORM.

---

## Use Cases

### 1. Get User by ID
- Retrieve user by primary key
- Return user without sensitive fields (passwordHash, refreshTokenHash)

### 2. Get User by Email
- Find user for authentication
- Includes sensitive fields for password verification

### 3. Get User by Username
- Find user for profile display
- No sensitive fields

### 4. Update User
- Update allowed fields (username, profile data)
- Cannot modify email directly

### 5. Delete User
- Cascade to related records (rooms, messages)

---

## Domain Model

### User Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | Primary Key, `cuid()` |
| email | String | Unique, indexed |
| username | String | Unique, indexed |
| passwordHash | String | bcrypt (10 rounds) |
| refreshTokenHash | String? | SHA256 hash |
| failedLoginAttempts | Int | Default: 0 |
| lockedUntil | DateTime? | Account lockout |
| tokenVersion | Int | Default: 0 |
| createdAt | DateTime | `now()` |
| updatedAt | DateTime | Auto-update |

### Relations

```prisma
model User {
  rooms      Room[]     @relation("RoomHost")
  messages   Message[]
}
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Protected | Get current user profile |
| GET | `/api/users/:id` | Public | Get user by ID |
| PATCH | `/api/users/me` | Protected | Update current user |

### Request/Response Examples

**GET /api/users/me**
```json
// Response 200
{
  "id": "clx...",
  "email": "user@example.com",
  "username": "johndoe",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**PATCH /api/users/me**
```json
// Request
{
  "username": "newusername"
}

// Response 200
{
  "id": "clx...",
  "email": "user@example.com",
  "username": "newusername",
  "updatedAt": "2024-01-02T00:00:00Z"
}
```

---

## Edge Cases

### Duplicate Email
- Return 409 Conflict on duplicate email during registration
- Check uniqueness before insert

### Duplicate Username
- Return 409 Conflict on duplicate username
- Case-insensitive uniqueness check

### User Not Found
- Return 404 for non-existent user IDs
- Don't leak existence info for public endpoints

### Locked Account
- AuthModule handles lockout logic
- UserModule provides data access only

---

## Files

- `apps/server/src/user/user.service.ts` — Business logic
- `apps/server/src/user/user.controller.ts` — REST endpoints
- `apps/server/src/user/user.module.ts` — Module definition
- `apps/server/prisma/schema.prisma` — Prisma schema
