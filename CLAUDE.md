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

pnpm bd:dev # Run PostgreSQL via Docker (see docker-compose.yml)

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

| File | Purpose | When to use |
|------|---------|-------------|
| **[SDD](docs/SDD.md)** | Complete system architecture: data models, API specification, security, performance | Changing architecture, adding API |
| **[Modules](docs/modules/)** | API contracts for: auth, user, gateway, sfu, client | Integrating with modules |
| **[Roadmap](docs/roadmap.md)** | Development phases and status | Planning work |
| **[Tasks](docs/tasks/)** | Step-by-step guides (Russian, phases 0-11) | Studying project, implementing features |

---
## Claude Coding Guidelines

### Before Implementation
- Check `docs/agent-guide.md` for agent rules
- Analyze `docs/SDD.md` for relevant sections (architecture, API, data models)
- If SDD is outdated → update it first
- For module details → check `docs/modules/`
- For task steps → check `docs/tasks/TASK-XXX.md`
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### During Implementation

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Follow API contracts and architecture from SDD
- If architecture changes → update SDD first, then implement
- Follow existing patterns in codebase
- Refer to SDD when uncertain

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical Changes
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

### After Implementation
- Update SDD.md if architecture/API changed
- Update task status: `pending` → `in_progress` → `completed`
- Commit with format: `TASK-XXX: description`

### References
- **Security:** Security Requirements section in SDD.md
- **Testing:** Troubleshooting section in SDD.md
- **Planning:** docs/roadmap.md for development phases

---

## ⚠️ CRITICAL: Documentation Before Code

**BEFORE implementing ANY feature or architectural change:**
1. Update `docs/SDD.md` first — it is the single source of truth
2. Create/update task file in `docs/tasks/TASK-XXX-<slug>.md`
3. Only THEN write the code

**No code without documentation.** If you skip this step, the implementation will be rejected.

---

## Security Requirements

- **Passwords:** bcrypt hashing
- **JWT secrets:** from environment variables
- **Refresh tokens:** hashed in database
- **Token validation:** timing-safe comparison
- **API responses:** never expose sensitive data

## Troubleshooting

### WebSocket Connection Issues
1. Check CORS configuration in gateway
2. Verify `withCredentials: true` on client
3. Check firewall/proxy settings

### WebRTC Connection Issues
1. Verify STUN servers are accessible
2. Check browser console for ICE candidates
3. Ensure permissions for camera/microphone
