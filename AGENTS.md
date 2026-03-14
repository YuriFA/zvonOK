# Agent Operating Guide (AGENTS.md)

This repo is a pnpm monorepo for a WebRTC video chat app.

Key paths:
- `apps/server/` NestJS + Prisma + PostgreSQL (Jest)
- `apps/client/` React + Vite + Tailwind (Vitest + Playwright)

No Cursor/Copilot rule files were found in this repo (no `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`).

## Non-Negotiables For Agents

- Package manager: `pnpm` only (no npm/yarn).
- Docs-first: before any feature/architecture change, update `docs/SDD.md` first.
- Task-based: do not implement features without a task file in `docs/tasks/TASK-XXX-<slug>.md`.
- Surgical edits: touch only what you must; no unrelated refactors.
- No barrel files: do not add `index.ts` re-export barrels; import from the source file.
- Do not start/stop/restart dev servers or DB; if needed, ask the user to do it.

References: `CLAUDE.md`, `docs/agent-guide.md`, `docs/SDD.md`

## Commands

All commands run from repo root unless noted.

Prefer `pnpm -C <dir> <script>` over `cd` in automation.

Passing args to underlying tools:

```bash
pnpm -C apps/server test -- -t "name"
pnpm -C apps/client test:run -- -t "name"
```

```bash
pnpm install
```

### Root Scripts

```bash
pnpm dev          # run client + server (recursive)
pnpm test         # run tests in all workspaces
pnpm test:client  # client unit tests (CI mode)
pnpm test:server  # server unit tests
pnpm clean        # clean caches
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
pnpm -C apps/server test:debug
pnpm -C apps/server test:e2e
pnpm -C apps/server bd:dev        # postgres + pgAdmin (docker compose)
pnpm -C apps/server migrate:dev   # prisma migrate dev (uses .env.development)
```

Run a single server test:

```bash
pnpm -C apps/server test auth.service.spec.ts
pnpm -C apps/server test -- auth.service.spec.ts -t "register"
pnpm -C apps/server test -- -t "refresh token"
```

Auth integration script (expects server + DB running):

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
pnpm -C apps/client test:e2e:ui
pnpm -C apps/client test:e2e:debug
```

Run a single client test:

```bash
pnpm -C apps/client test:run src/lib/api/__tests__/api-client.test.ts
pnpm -C apps/client test:run -- -t "handles 401"
pnpm -C apps/client test:e2e e2e/smoke.spec.ts
pnpm -C apps/client test:e2e -- --grep "login"
```

## Code Style Guidelines

### General

- TypeScript everywhere; prefer explicit types at module boundaries.
- Keep code small and purpose-driven; avoid "flexible" abstractions unless asked.
- Remove unused imports/vars introduced by your changes.
- Do not commit secrets (`.env*`, credentials, tokens).

### Imports

- Order: built-ins -> external -> app absolute (`src/...` or `@/...`) -> relative.
- Prefer type-only imports: `import type { X } from '...';`.
- Server uses `src/...` path mapping in Jest; client uses `@/*` alias.

### Formatting

- Server: Prettier (`apps/server/.prettierrc`) uses single quotes and trailing commas.
- Client: mixed quote style exists; match the file you touch.

### TypeScript / Linting

- Server ESLint is type-checked; `any` is allowed; unsafe calls/returns are warned.
- Server test files relax several strict rules (mocks).
- Client TypeScript is strict with `noUnusedLocals`/`noUnusedParameters`.

### Types + Naming

- Providers/controllers/classes: `PascalCase`; functions/vars: `camelCase`.
- React components: `PascalCase`.
- Files: follow existing patterns (server: `*.service.ts`, `*.controller.ts`; client: kebab-case components).
- Prefer `type` for unions/aliases; use `interface` for extendable object shapes.

### Error Handling

- Server: throw specific NestJS exceptions (`BadRequestException`, `UnauthorizedException`, etc.); do not `throw new Error` for request errors.
- Server: never return sensitive fields (password hashes, refresh token hashes).
- Client: use typed errors from `apps/client/src/lib/api/api.errors.ts` (`ApiError`, `AuthError`, `ValidationError`, `NetworkError`).
- Client: avoid `console.error` unless existing code already does it or you are debugging.

### Boundaries

- Auth logic stays in `apps/server/src/auth/` (do not move into `user/`).
- Client UI primitives live in `apps/client/src/components/ui/`; features under `apps/client/src/features/`.

### Testing

- Server tests: colocated `*.spec.ts`; e2e tests in `apps/server/test/`.
- Client tests: Vitest; tests under `__tests__/`; environment is `jsdom`.
- When changing behavior, update tests for happy path + auth/permission edge cases + error cases.

## Git Conventions

- Commit messages reference task IDs: `TASK-XXX: <description>`.
- Keep commits atomic.
- If architecture/API changes: update `docs/SDD.md` and relevant docs under `docs/modules/`.
