# Auth Module

## Purpose

Handles user authentication, registration, and session management using JWT tokens with refresh token rotation for secure access control.

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
| tokenVersion | Int | Default: 0, increments on password change |
| createdAt | DateTime | `now()` |
| updatedAt | DateTime | Auto-update |

### Token Payloads

**Access Token (15 min):**
```typescript
{
  sub: string,      // User ID
  email: string,
  username: string,
  tokenVersion: number,
  iat: number,
  exp: number
}
```

**Refresh Token (7 days):**
```typescript
{
  sub: string,      // User ID
  jti: string,      // JWT ID (unique token identifier)
  iat: number,
  exp: number
}
```

## Use Cases

### 1. User Registration
- Receive email, username, password
- Validate input (email format, password strength, uniqueness)
- Hash password with bcrypt
- Create user in database
- Return user data (without sensitive fields)

### 2. User Login
- Receive email, password
- Find user by email
- Verify password with bcrypt
- Check account lockout status
- Generate access token (15 min)
- Generate refresh token (7 days)
- Hash refresh token and store in database
- Set both tokens as HTTP-only cookies
- Return user profile

### 3. Token Refresh
- Validate refresh token signature
- Lookup hash in database
- Compare hashes using timing-safe comparison
- Generate new access token
- Generate new refresh token (rotation)
- Update hash in database
- Set new cookies

### 4. Token Reuse Detection
- If a refresh token is used twice, invalidate all tokens
- Delete hash from database
- Force user to re-login

### 5. Logout
- Remove refresh token hash from database
- Clear cookies

## API Contracts

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login with email/password |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Protected | Invalidate refresh token |

### Request/Response

**POST /api/auth/register**
```json
// Request
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}

// Response 200
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**POST /api/auth/login**
```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Response 200
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800

{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

## Edge Cases

### 1. Account Lockout
- After 5 failed login attempts, lock account for 15 minutes
- Reset counter on successful login

### 2. Token Version Mismatch
- If user's `tokenVersion` doesn't match token, reject
- Forces re-login after password change

### 3. Refresh Token Reuse
- Detect reuse via timing-safe comparison
- Invalidate all tokens for that user
- Log security event

### 4. Concurrent Sessions
- Each device gets its own refresh token
- All tokens stored in database (one-to-many relation planned)

## Implementation Details

### Helpers

**PasswordHelper**
- `hash(password: string): Promise<string>` - bcrypt hashing
- `verify(password: string, hash: string): Promise<boolean>` - bcrypt verification

**TokenHelper**
- `generateAccessToken(user: User): string` - 15 min JWT
- `generateRefreshToken(user: User): string` - 7 days JWT with `jti`
- `verifyAccessToken(token: string): TokenPayload` - Validate access
- `verifyRefreshToken(token: string): TokenPayload` - Validate refresh

**RefreshTokenHelper**
- `hashToken(token: string): string` - SHA256 hash
- `compare(token: string, hash: string): boolean` - timing-safe compare

### Strategies

**LocalStrategy** (Passport)
- Validates email/password
- Used by `/api/auth/login`

**JwtStrategy** (Passport)
- Validates access tokens from cookies
- Used by `@UseGuards(JwtAuthGuard)`

**JwtRefreshStrategy** (Passport)
- Validates refresh tokens from cookies
- Used by `/api/auth/refresh`

### Guards

- `JwtAuthGuard` - Protects endpoints requiring authentication
- `SkipAuthGuard` - Marks public endpoints (default behavior)

## Files

- `apps/server/src/auth/auth.service.ts` - Core auth logic
- `apps/server/src/auth/auth.controller.ts` - REST endpoints
- `apps/server/src/auth/strategies/` - Passport strategies
- `apps/server/src/auth/helpers/` - Helper utilities
- `apps/server/src/auth/guards/` - Auth guards
