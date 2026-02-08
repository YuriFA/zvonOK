# User Module

## Purpose

Manages user CRUD operations and user data persistence through Prisma ORM.

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

### Planned Relations

```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  username            String    @unique
  passwordHash        String
  refreshTokenHash    String?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  tokenVersion        Int       @default(0)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations (planned)
  rooms      Room[]     @relation("RoomHost")
  messages   Message[]
}
```

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
- Soft delete or hard delete (TBD)
- Cascade to related records

## API Contracts

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Protected | Get current user profile |
| GET | `/api/users/:id` | Public | Get user by ID |
| PATCH | `/api/users/me` | Protected | Update current user |

### Request/Response

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

## Edge Cases

### 1. Duplicate Email
- Return 409 Conflict on duplicate email during registration
- Check uniqueness before insert

### 2. Duplicate Username
- Return 409 Conflict on duplicate username
- Allow case-insensitive uniqueness check (planned)

### 3. User Not Found
- Return 404 for non-existent user IDs
- Don't leak existence info for public endpoints

### 4. Locked Account
- AuthModule handles lockout logic
- UserModule provides data access only

## Implementation Details

### UserService Methods

```typescript
class UserService {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  update(id: string, data: UpdateUserDto): Promise<User>
  delete(id: string): Promise<User>
}
```

### DTOs

**UpdateUserDto**
```typescript
{
  username?: string;
  // Additional profile fields TBD
}
```

**UserResponseDto**
```typescript
{
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Files

- `apps/server/src/user/user.service.ts` - Business logic
- `apps/server/src/user/user.controller.ts` - REST endpoints
- `apps/server/src/user/user.module.ts` - Module definition
- `apps/server/prisma/schema.prisma` - Prisma schema
