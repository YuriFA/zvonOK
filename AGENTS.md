# Agent Operating Guide

pnpm monorepo for WebRTC video chat (P2P 1-on-1, mediasoup SFU for groups).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS v11 + PostgreSQL 16 + Prisma + Passport.js (JWT) |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 + React Router v7 + Radix UI |
| WebRTC | Socket.io signalling + native WebRTC API + mediasoup SFU |

## Non-Negotiables

- **Package manager:** `pnpm` only — no npm/yarn
- **Docs-first:** update `docs/SDD.md` before any feature/architecture change
- **Task-based:** no implementation without a task file organized per `docs/tasks/README.md`
- **Surgical edits:** touch only what you must; no unrelated refactors
- **No barrel files:** no `index.ts` re-export barrels; import from source
- **No server management:** don't start/stop dev servers or DB; ask user if needed

## Commands

All from repo root. Prefer `pnpm -C <dir> <script>` over `cd`.

### Root

```bash
pnpm install
pnpm dev              # client + server (recursive)
pnpm test             # all workspaces
pnpm test:client      # client unit tests (CI)
pnpm test:server      # server unit tests
pnpm clean            # clean caches
```

### Server (`apps/server/`)

```bash
pnpm -C apps/server dev
pnpm -C apps/server build
pnpm -C apps/server lint
pnpm -C apps/server format
pnpm -C apps/server test
pnpm -C apps/server test:watch
pnpm -C apps/server test:cov
pnpm -C apps/server test:e2e
pnpm -C apps/server bd:dev        # postgres + pgAdmin (docker)
pnpm -C apps/server migrate:dev   # prisma migrate
```

Run single test:
```bash
pnpm -C apps/server test auth.service.spec.ts
pnpm -C apps/server test -- -t "register"
```

Auth check (server + DB running):
```bash
./apps/server/scripts/auth-check.sh
```

### Client (`apps/client/`)

```bash
pnpm -C apps/client dev
pnpm -C apps/client build
pnpm -C apps/client lint
pnpm -C apps/client test          # vitest watch
pnpm -C apps/client test:run      # vitest run
pnpm -C apps/client test:e2e      # playwright
```

Run single test:
```bash
pnpm -C apps/client test:run src/lib/api/__tests__/api-client.test.ts
pnpm -C apps/client test:run -- -t "handles 401"
```

## Code Style

### General

- TypeScript everywhere; explicit types at module boundaries
- Keep code small; avoid "flexible" abstractions
- **SOLID principles:**
  - **S**ingle Responsibility — one thing per module/function
  - **O**pen/Closed — extend via composition, not modification
  - **L**iskov Substitution — subtypes usable as base types
  - **I**nterface Segregation — small, focused interfaces
  - **D**ependency Inversion — depend on abstractions; NestJS DI (server), context/hooks (client)
- Remove unused imports/vars from your changes
- No secrets in commits (`.env*`, credentials, tokens)

### Imports

- Order: built-ins → external → app absolute (`src/...` / `@/...`) → relative
- Prefer type-only: `import type { X } from '...';`
- Server: `src/...` path mapping; client: `@/*` alias

### Formatting

- Server: Prettier (single quotes, trailing commas)
- Client: match existing file style

### TypeScript / Linting

- Server: type-checked ESLint; `any` allowed; unsafe warned
- Client: strict with `noUnusedLocals`/`noUnusedParameters`

### Types + Naming

- Classes/providers/controllers: `PascalCase`
- Functions/variables: `camelCase`
- React components: `PascalCase`
- Files: server `*.service.ts`, `*.controller.ts`; client kebab-case
- Prefer `type` for unions/aliases; `interface` for object shapes

### Error Handling

- Server: throw NestJS exceptions (`BadRequestException`, `UnauthorizedException`, etc.); never `throw new Error`
- Server: never return sensitive fields (password hashes, refresh token hashes)
- Client: use typed errors from `apps/client/src/lib/api/api.errors.ts`
- Client: avoid `console.error` unless existing code does it

### Boundaries

- Auth logic in `apps/server/src/auth/` (not `user/`)
- Client UI primitives in `apps/client/src/components/ui/`
- Client features in `apps/client/src/features/`

### Testing

- Server: colocated `*.spec.ts`; e2e in `apps/server/test/`
- Client: Vitest; tests under `__tests__/`; jsdom environment
- Update tests for happy path + edge cases + errors

## Architecture

**Source of truth:** `docs/SDD.md` — read before changes.

```
apps/
├── server/
│   ├── prisma/schema.prisma      # DB schema
│   ├── src/
│   │   ├── auth/                 # AuthModule (helpers, strategies)
│   │   ├── user/                 # UserModule
│   │   ├── sfu/                  # mediasoup SFU
│   │   └── main.ts
│   └── scripts/auth-check.sh
└── client/src/
    ├── routes/                   # Pages
    ├── components/ui/            # UI primitives
    ├── features/                 # Feature modules
    ├── lib/                      # Framework-agnostic core
    └── main.tsx
```

## API Conventions

- **REST:** `/resource` pattern (`/auth/register`, `/rooms`)
- **WebSocket:** `namespace:action` (`join:room`, `webrtc:offer`)
- **JWT:** HTTP-only cookies
- **Errors:** NestJS exceptions

## Environment Variables

**Server** (`.env.development`):
- `PORT`, `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN_MINUTES`, `JWT_REFRESH_EXPIRES_IN_DAYS`

**Client** (`.env.local`):
- `VITE_SOCKET_URL`, `VITE_API_BASE_URL`

## Documentation

| File | Purpose |
|------|---------|
| `docs/SDD.md` | System architecture, data models, API spec (source of truth) |
| `docs/modules/` | API contracts per module |
| `docs/roadmap.md` | Development phases and status |
| `docs/tasks/` | Task workflow, structure, and naming rules |

## Before Implementation

1. Check `docs/SDD.md` for architecture
2. Create/update the task file using `docs/tasks/README.md` rules
3. State assumptions; if uncertain, ask
4. If simpler approach exists, say so

## During Implementation

- No features beyond request
- No abstractions for single-use code
- No "flexibility" not requested
- Follow SOLID principles
- Follow existing patterns
- If architecture changes → update SDD first

## After Implementation

- Update SDD if architecture/API changed
- Update task status according to `docs/tasks/README.md`
- Use Conventional Commits for commit messages (for example: `feat: add room creation validation`)

## Security

- Passwords: bcrypt
- JWT secrets: environment variables
- Refresh tokens: hashed in DB
- Token validation: timing-safe comparison
- API responses: no sensitive data

## Troubleshooting

**WebSocket:**
1. Check CORS in gateway
2. Verify `withCredentials: true` on client
3. Check firewall/proxy

**WebRTC:**
1. Verify STUN servers accessible
2. Check browser console for ICE candidates
3. Ensure camera/mic permissions

## Git Conventions

- Commits: Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `chore: ...`)
- Atomic commits
- Update `docs/SDD.md` and `docs/modules/` on architecture changes
