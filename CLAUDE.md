# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Package Manager

**This project uses pnpm** — do not use npm or yarn!

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server
pnpm build      # Build
pnpm test       # Run tests
```

## Project

Monorepo with WebRTC video chat. P2P for 1-on-1, mediasoup SFU for group calls.

**Tech Stack:**
- **Backend:** NestJS v11 + PostgreSQL 16+ + Prisma ORM + Passport.js (Local + JWT)
- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + React Router v7 + Radix UI
- **WebRTC:** Socket.io signalling + native WebRTC API

### Docker Build
```bash
# Start PostgreSQL + pgAdmin
pnpm -C apps/server bd:dev
```

## Current Development Status

**Active Phase:** Phase 2 — Signalling Server (WebSocket signalling)
**Task:** TASK-019 — Socket.io server setup in NestJS
**See:** [Agent Guide](docs/agent-guide.md) for current work details

## Development Commands

### Project Root
```bash
pnpm dev          # Run both client and server in development mode
pnpm server:dev   # Run server only (with watch mode)
pnpm clean        # Clean build caches
```

### Server (`apps/server/`)
```bash
pnpm start:dev    # Main command for development (with watch mode)
pnpm start        # Production run
pnpm start:debug  # Debug mode
pnpm start:prod   # Run compiled version

pnpm build        # Compile TypeScript to dist/
pnpm lint         # ESLint with auto-fix
pnpm format       # Prettier formatting

pnpm test         # Run unit tests
pnpm test:e2e     # E2E tests
pnpm test:cov     # With coverage
pnpm test:watch   # Watch mode
# Run single test:
pnpm test <file>  # Example: pnpm test auth.service.spec.ts

# Prisma migration
pnpm migrate:dev           # Apply migrations (will prompt for name)
pnpm migrate:dev -- --name add_room_model  # With migration name (non-interactive)

# Note: use `--` to pass arguments to the command
# Everything after `--` will be passed to prisma command
# Example: pnpm migrate:dev -- --name=migration_name --create-only

# Auth tests (script)
./scripts/auth-check.sh  # Check auth endpoints
```

### Client (`apps/client/`)
```bash
pnpm dev          # Vite dev server
pnpm build        # Production build (tsc + vite build)
pnpm lint         # ESLint
pnpm preview      # Preview production build
```

## Architecture

> **⚠️ IMPORTANT:** [SDD](docs/SDD.md) is the single source of truth for system architecture. Read SDD before making any changes.

**Overview:**
- **Backend:** NestJS + PostgreSQL + Prisma + Socket.io
- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **WebRTC:** P2P for 1-on-1, mediasoup SFU for group calls

**Documentation:**
- **[SDD](docs/SDD.md)** — System architecture, API specification
- **[Modules](docs/modules/)** — API contracts for each module
- **[Roadmap](docs/roadmap.md)** — Status of all development phases
- **[Agent Guide](docs/agent-guide.md)** — Rules for AI agents

## Environment Variables

**Server** (`.env.development`):
- `PORT` — server port (default 3000)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — JWT secrets
- `JWT_ACCESS_EXPIRES_IN_MINUTES` — access token lifetime
- `JWT_REFRESH_EXPIRES_IN_DAYS` — refresh token lifetime

**Client** (`.env.local`):
- `VITE_SOCKET_URL` — Socket.io server URL
- `VITE_API_BASE_URL` — API base URL

## Code Structure

```
apps/
├── server/
│   ├── prisma/
│   │   └── schema.prisma          # Prisma schema (PostgreSQL)
│   ├── src/
│   │   ├── auth/                  # AuthModule
│   │   │   ├── helpers/           # PasswordHelper, TokenHelper, RefreshTokenHelper
│   │   │   ├── strategies/        # Passport strategies (jwt, jwt-refresh-token, local)
│   │   │   └── ...
│   │   ├── user/                  # UserModule (Prisma)
│   │   ├── generated/prisma/      # Generated Prisma client
│   │   └── main.ts
│   ├── docker-compose.yml         # PostgreSQL + pgAdmin
│   └── scripts/auth-check.sh      # Auth integration tests
└── client/src/
    ├── routes/                    # Pages (lobby.tsx, room.tsx)
    ├── components/ui/             # Reusable UI components
    ├── lib/                       # Utilities and config
    └── main.tsx                   # Entry point with React Router
```

## Notes

- STUN servers use Google Public STUN
- Refresh tokens are hashed in DB (SHA256) for reuse detection
- When refresh token is reused — it's deleted from DB

## API Conventions

- **REST:** `/resource` pattern (e.g.: `/auth/register`, `/rooms`)
- **WebSocket:** `namespace:action` pattern (e.g.: `join:room`, `webrtc:offer`)
- **JWT:** HTTP-only cookies for tokens
- **Errors:** Use NestJS exceptions (`UnauthorizedException`, `ConflictException`, `NotFoundException`)

## Key Patterns

**NestJS Service:**
```typescript
@Injectable()
export class ExampleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDto) {
    return await this.prisma.example.create({ data: dto });
  }
}
```

**Error Handling (server):**
```typescript
throw new UnauthorizedException('Invalid credentials');
throw new ConflictException('Email already exists');
throw new NotFoundException('Room not found');
```

**Error Handling (client):**
```typescript
if (error.response?.status === 401) {
  await refreshToken();
}
```

---

## Working with Documentation

### Source of Truth

**[SDD.md](docs/SDD.md)** is the single source of truth for system architecture.

### Task-Based Development

**Important:**
- **Don't implement features without a task file** — each feature should be in `/docs/tasks/TASK-XXX-<slug>.md`
- Update task status: `pending` → `in_progress` → `completed`
- Commits should reference task ID: `TASK-XXX: description`

### Working Rules

- **Before changing architecture** → read the relevant SDD section
- **When implementing a new feature** → consult SDD to understand its place in architecture
- **When uncertain** → use SDD as the source of truth
- **Follow existing patterns** — don't invent new style
- **Auth logic** — in AuthModule, not UserModule
- **UI components** — in `apps/client/src/components/`

### Documentation Structure

1. **[SDD](docs/SDD.md)** — Complete system architecture
   - System Architecture, Data Models, API specification
   - Security, Performance, Scalability
   - **Use when:** changing architecture, adding API

2. **[Modules](docs/modules/)** — API contracts for modules
   - auth, user, gateway, sfu, client
   - **Use when:** integrating with modules

3. **[Roadmap](docs/roadmap.md)** — Development phases and status
   - **Use when:** planning work

4. **[Tasks](docs/tasks/)** — Step-by-step guides (Russian)
   - Learning tasks by phases (0-11)
   - **Use when:** studying project, implementing features

### Working Rules

- **Before changing architecture** → read the relevant SDD section
- **When implementing a new feature** → consult SDD to understand its place in architecture
- **When uncertain** → use SDD as the source of truth

---

## Claude Coding Guidelines

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Security Requirements

- **Passwords:** bcrypt hashing
- **JWT secrets:** from environment variables
- **Refresh tokens:** hashed in database
- **Token validation:** timing-safe comparison
- **API responses:** never expose sensitive data

## Troubleshooting

### Database Connection Issues
1. Check Docker: `docker ps`
2. Check `DATABASE_URL` in `.env.development`
3. Verify PostgreSQL: `docker compose exec postgres psql -U zvonok -d zvonok`

### WebSocket Connection Issues
1. Check CORS configuration in gateway
2. Verify `withCredentials: true` on client
3. Check firewall/proxy settings

### WebRTC Connection Issues
1. Verify STUN servers are accessible
2. Check browser console for ICE candidates
3. Ensure permissions for camera/microphone
