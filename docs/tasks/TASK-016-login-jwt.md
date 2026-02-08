# TASK-016 — JWT Login with Refresh Tokens

## Status
completed

## Priority
high

## Description
Implement JWT authentication with access and refresh tokens. Access tokens stored in HTTP-only cookies. Refresh token rotation on each use.

## Scope
- Create LoginDto with validation
- Implement login method in AuthService
- Generate JWT access + refresh tokens with jti
- Store refresh tokens in database (hashed)
- Set HTTP-only cookies for tokens
- Create JWT strategy for Passport
- Create JwtAuthGuard for protected routes
- Create CurrentUser decorator
- Implement logout endpoint

## Out of Scope
- Room model (covered in TASK-017)

## Technical Design

### Token Configuration
```env
JWT_ACCESS_SECRET=secret
JWT_REFRESH_SECRET=secret
JWT_ACCESS_EXPIRES_IN_MINUTES=15
JWT_REFRESH_EXPIRES_IN_DAYS=7
```

### Login Flow
1. Find user by email
2. Compare password with bcrypt
3. Generate access token (15 min) + refresh token (7 days)
4. Hash refresh token and store in DB
5. Set HTTP-only cookies

### Refresh Token Rotation
- Each refresh creates new token
- Old token is deleted
- Detect reuse with timingSafeEqual

## Acceptance Criteria
- POST /auth/login returns tokens
- Invalid credentials return 401
- Access token in HTTP-only cookie
- Refresh token hashed in DB
- Protected routes require authentication
- Logout clears cookies

## Definition of Done
- Login endpoint works
- JWT strategy validates tokens
- Protected routes accessible with valid token
- Refresh token rotation implemented
- Logout clears all cookies

## Implementation Guide

## Related Files
- `apps/server/src/auth/dto/login.dto.ts`
- `apps/server/src/auth/strategies/jwt.strategy.ts`
- `apps/server/src/auth/guards/jwt-auth.guard.ts`
- `apps/server/src/auth/decorators/current-user.decorator.ts`

## Next Task
TASK-017 — Room Data Model
