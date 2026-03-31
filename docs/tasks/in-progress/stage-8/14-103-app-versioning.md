# TASK-103 — App Versioning (Client + Server)

> **Status:** completed
> **Priority:** medium
> **Created:** 2026-03-31

---

## Description

Add version management for `apps/client` and `apps/server`, with version info displayed in the browser console on the client side. Both packages get meaningful versions; server exposes a public `/version` endpoint; client logs its own build-time version and fetches server version at startup. Release automation via `release-it` with conventional commits — single version across the monorepo.

## Scope

- Unified `0.1.0` version across root, client, and server `package.json`
- Server: read version from `package.json`, add public `GET /version` endpoint, log version on startup
- Client: inject build-time version via Vite `define`, log client + server versions in browser console
- Release automation: `release-it` with `@release-it/conventional-changelog`, `scripts/sync-version.mjs` to propagate version to workspace packages

## Technical Design

### 1. Package versions

- `apps/server/package.json` → `"version": "0.1.0"`
- `apps/client/package.json` → `"version": "0.1.0"`

### 2. Server — version module

Create `apps/server/src/version.ts`:

- Read version from `package.json` via `require('../../package.json').version`
- Export const `VERSION: string`
- Export const `APP_NAME: string`

Create `apps/server/src/version.controller.ts`:

- `@Controller()` with single `@Get('version')` endpoint
- No auth guards — public access
- Returns `{ version: string, name: string }`
- Add to `AppModule` controllers

### 3. Server — startup log

In `apps/server/src/main.ts` `bootstrap()`:

- Import `VERSION` from `version.ts`
- After `app.listen()`: `Logger.log(Server v${VERSION} listening on port ${PORT})`

### 4. Client — build-time version injection

In `apps/client/vite.config.ts`:

- Import `package.json`
- Add `define: { __CLIENT_VERSION__: JSON.stringify(pkg.version) }`

In `apps/client/src/vite-env.d.ts`:

- Declare `const __CLIENT_VERSION__: string`

### 5. Client — console logging

In `apps/client/src/main.tsx`:

- Log client version immediately at module level:
  ```
  console.log('%c[zvonok] client v0.1.0', 'color: #6366f1; font-weight: bold')
  ```
- Async IIFE to fetch `GET {API_BASE_URL}/version` and log server version
- If fetch fails (e.g. server not running in dev), silently skip — no error thrown

### 6. Release automation (release-it)

Dependencies (root `devDependencies`):
- `release-it` — CLI for version bump + git tag + changelog
- `@release-it/conventional-changelog` — generates changelog from conventional commits

Config (`.release-it.json`):
- Preset: `conventionalcommits`
- Unified version across monorepo (root `package.json`)
- `after:bump` hook runs `scripts/sync-version.mjs ${version}` to propagate version to `apps/client/package.json` and `apps/server/package.json`
- Git: commit + tag (`v${version}`), no push by default
- `npm.publish: false` (private monorepo)

Scripts (`scripts/sync-version.mjs`):
- Reads version from CLI arg, updates `apps/client/package.json` and `apps/server/package.json`

Root scripts:
- `pnpm release` — interactive release (prompts for version)
- `pnpm release:ci` — non-interactive (for CI pipelines)

Workflow:
1. Develop with conventional commits (`feat:`, `fix:`, `chore:`, etc.)
2. `pnpm release` — bump + changelog + tag + commit
3. `git push --follow-tags`

## Acceptance Criteria

- [ ] `apps/server/package.json` version is `0.1.0`
- [ ] `apps/client/package.json` version is `0.1.0`
- [ ] `GET /version` returns `{ version: "0.1.0", name: "server" }` without authentication
- [ ] Server logs `Server v0.1.0 listening on port {PORT}` on startup
- [ ] Client logs its version in browser console on page load
- [ ] Client logs server version in browser console (when server is reachable)
- [ ] Failed `/version` fetch does not break the client app
- [ ] `release-it` + `@release-it/conventional-changelog` installed in root devDependencies
- [ ] `.release-it.json` config uses conventional commits preset, unified version, no npm publish
- [ ] `scripts/sync-version.mjs` propagates version to `apps/client` and `apps/server`
- [ ] `pnpm release` runs release-it interactively
- [ ] `pnpm release:ci` runs release-it non-interactively

## Related Files

- `package.json` (root)
- `apps/server/package.json`
- `apps/client/package.json`
- `apps/server/src/version.ts` (new)
- `apps/server/src/version.controller.ts` (new)
- `apps/server/src/app.module.ts`
- `apps/server/src/main.ts`
- `apps/client/vite.config.ts`
- `apps/client/src/vite-env.d.ts`
- `apps/client/src/main.tsx`
- `.release-it.json` (new)
- `scripts/sync-version.mjs` (new)
