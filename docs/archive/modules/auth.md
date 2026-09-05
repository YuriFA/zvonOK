# Auth Module

## Purpose

Handles user authentication, registration, and session management using JWT tokens with refresh token rotation for secure access control.

---

## Use Cases

### 1. User Registration
- Receive email, username, password
- Validate input (email format, password strength, uniqueness)
- Hash password with bcrypt
- Create user in database
- Return tokens (access + refresh) set as HTTP-only cookies

### 2. User Login
- Receive email, password
- Find user by email
- Verify password with bcrypt
- Check account lockout status
- Generate access token + refresh token
- Hash refresh token and store in database
- Set both tokens as HTTP-only cookies
- Return tokens in response body

### 3. Token Refresh
- Validate refresh token signature (`JwtRefreshTokenStrategy`)
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

### 6. Get Current User
- `GET /auth/me` — returns current user profile (id, email, username, createdAt, updatedAt)
- Protected by `JwtAuthGuard` (global default)

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
| tokenVersion | Int | Default: 0, increments on password/role change |
| role | Role | Default: `USER` (`USER`, `HOST`, `ADMIN`) |

### Token Payloads

**Access Token:**
```typescript
{
  id: string,         // User ID
  email: string,
  role: Role,         // USER | HOST | ADMIN
  tokenVersion: number,
  iat: number,
  exp: number
}
```

**Refresh Token:**
```typescript
{
  id: string,         // User ID
  email: string,
  role: Role,
  tokenVersion: number,
  jti: string,        // JWT ID (unique token identifier)
  iat: number,
  exp: number
}
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public (`@SkipAuthGuard`) | Register new user → 201 |
| POST | `/auth/login` | Public (`@SkipAuthGuard`) | Login with email/password → 200 |
| POST | `/auth/refresh-token` | JwtRefreshGuard | Refresh access token → 200 |
| POST | `/auth/logout` | Protected (default) | Invalidate refresh token → 200 |
| GET | `/auth/me` | Protected (default) | Get current user profile → 200 |

### Request/Response Examples

**POST /auth/register**
```json
// Request
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}

// Response 201
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax

{
  "success": true,
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**POST /auth/login**
```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Response 200
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax

{
  "success": true,
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**POST /auth/refresh-token**
```json
// Request (refresh_token cookie sent automatically)
// No body required

// Response 200
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax

{
  "accessToken": "..."
}
```

**GET /auth/me**
```json
// Response 200
{
  "id": "clx...",
  "email": "user@example.com",
  "username": "johndoe",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Security Features

- Password hashing with bcrypt (10 rounds)
- Access tokens expire in 15 minutes (configurable via `JWT_ACCESS_EXPIRES_IN_MINUTES`)
- Refresh tokens expire in 7 days (configurable via `JWT_REFRESH_EXPIRES_IN_DAYS`)
- Tokens stored in HTTP-only cookies (`SameSite=Lax`, `Secure` in production) or passed via Authorization: Bearer header
- Refresh tokens hashed in database (SHA256)
- Refresh token rotation on every use
- Token reuse detection (timing-safe comparison)
- Account lockout after 5 failed attempts (15 min)
- Rate limiting via `@Throttle` on register (5/min) and login (10/min)

---

## Edge Cases

### Account Lockout
- After 5 failed login attempts, lock account for 15 minutes
- Reset counter on successful login

### Token Version Mismatch
- If user's `tokenVersion` doesn't match token, reject
- Forces re-login after password change or role change

### Refresh Token Reuse
- Detect reuse via timing-safe comparison
- Invalidate all tokens for that user
- Log security event

### Concurrent Sessions
- One refresh token per user — stored as a single `refreshTokenHash` field on the User record
- Logging in from a new device overwrites the previous hash, invalidating the previous session
- Multi-device support (one-to-many tokens) is planned as a future enhancement

---

## Key Classes

| Class | Type | Description |
|-------|------|-------------|
| `AuthController` | Controller | REST endpoints for auth flows |
| `AuthService` | Service | Core auth logic: registration, login, refresh, logout |
| `TokenHelper` | Helper | JWT token generation (access + refresh with jti) |
| `PasswordHelper` | Helper | bcrypt hashing and verification |
| `RefreshTokenHelper` | Helper | SHA256 hashing and timing-safe comparison |
| `JwtStrategy` | Passport Strategy | Access token validation (global guard) |
| `JwtRefreshTokenStrategy` | Passport Strategy | Refresh token validation on `/refresh-token` |
| `JwtAuthGuard` | Guard | Global APP_GUARD default — requires valid JWT; skipped via `@SkipAuthGuard()` |
| `RolesGuard` | Guard | Global APP_GUARD — checks `@Roles()` decorator |

---

## Files

- `apps/server/src/auth/auth.service.ts` — Core auth logic
- `apps/server/src/auth/auth.controller.ts` — REST endpoints
- `apps/server/src/auth/strategies/jwt.strategy.ts` — JWT access token validation
- `apps/server/src/auth/strategies/jwt-refresh-token.strategy.ts` — Refresh token validation
- `apps/server/src/auth/helpers/token.helper.ts` — JWT generation
- `apps/server/src/auth/helpers/password.helper.ts` — bcrypt operations
- `apps/server/src/auth/helpers/refresh-token.helper.ts` — SHA256 + timing-safe compare
- `apps/server/src/auth/guards/` — Auth guards
- `apps/server/src/auth/dto/` — DTOs (register, login, jwt-payload)
- `apps/server/src/auth/decorators/` — Custom decorators
