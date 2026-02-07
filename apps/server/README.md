# WebRTC Chat Server

NestJS backend with JWT authentication and PostgreSQL via Prisma ORM.

## Requirements

- Node.js 18+
- pnpm
- PostgreSQL 16+

## Quick Start

```bash
# Start database (PostgreSQL + pgAdmin)
pnpm bd:dev

# Apply migrations
pnpm migrate:dev

# Run dev server
pnpm start:dev
```

Server: http://localhost:3000
Swagger: http://localhost:3000/swagger

## Commands

| Category | Command | Description |
|----------|---------|-------------|
| **Dev** | `pnpm start:dev` | Watch mode (primary) |
| | `pnpm start` | Production run |
| | `pnpm start:debug` | Debug mode |
| **Build** | `pnpm build` | Compile to dist/ |
| | `pnpm lint` | ESLint check |
| | `pnpm format` | Prettier format |
| **Test** | `pnpm test` | Unit tests |
| | `pnpm test:e2e` | E2E tests |
| | `pnpm test:cov` | With coverage |
| **DB** | `pnpm migrate:dev` | Apply Prisma migrations |
| | `pnpm bd:dev` | Start PostgreSQL via Docker |

## Architecture

- **AuthModule** - JWT authentication with Passport.js
  - Local strategy (email/password)
  - JWT access tokens (15min) + refresh tokens (7 days) in HTTP-only cookies
  - Refresh token rotation with reuse detection (SHA256 hashing)
- **UserModule** - User CRUD via Prisma
- **Database:** PostgreSQL with Prisma ORM

### Auth Flow

```
POST /auth/register  -> Create user, set cookies
POST /auth/login     -> Validate credentials, set cookies
POST /auth/refresh   -> Rotate refresh token, set new cookies
POST /auth/logout    -> Clear cookies, remove refresh hash
```

**Security features:**
- Account lockout after 5 failed attempts (15min)
- Refresh token reuse detection invalidates all tokens
- `timingSafeEqual` for token comparison

## Environment

Create `.env.development`:

```bash
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/webrtc"

JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN_MINUTES=15
JWT_REFRESH_EXPIRES_IN_DAYS=7
```

## Database Schema

```prisma
model User {
  id                   String    @id @default(uuid())
  email                String    @unique
  username             String    @unique
  passwordHash         String
  refreshTokenHash     String?

  failedLoginAttempts  Int       @default(0)
  lockedUntil          DateTime?
  tokenVersion         Int       @default(0)

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
}
```

## Project Structure

```
src/
├── auth/                      # AuthModule
│   ├── auth.controller.ts     # /auth endpoints
│   ├── auth.service.ts        # Business logic
│   ├── helpers/               # PasswordHelper, TokenHelper, RefreshTokenHelper
│   ├── strategies/            # Passport strategies
│   ├── jwt-auth.guard.ts      # Protected route guard
│   ├── skip-auth.guard.ts     # Public route decorator
│   └── dto/                   # DTOs (register, login, jwt-payload)
├── user/                      # UserModule (Prisma)
│   ├── user.service.ts
│   └── decorators/            # @CurrentUser() decorator
└── generated/prisma/          # Generated Prisma client
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/refresh` | Refresh tokens |
| POST | `/auth/logout` | Logout (clear refresh token) |

Full docs: `/swagger` when server is running.

## Auth Check Script

```bash
./scripts/auth-check.sh  # Integration test for auth flow
```
