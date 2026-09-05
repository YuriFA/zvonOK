## Context

See proposal.md - Why. Current state that shapes this design:

- `pnpm-workspace.yaml` already declares `packages/*`; the client's framework-free core (`apps/client/src/lib/` - SFU manager, media, screen-share, audio) was deliberately built framework-agnostic and is the extraction source.
- Prisma holds `User`/`Room`/`Message`; `Room.ownerId` is a required user relation. The new prisma-client generator writes to `src/generated/prisma`.
- The `/sfu` Socket.IO gateway does no connection-level auth; `sfu.service.joinRoom` trusts `userId`/`username` from the join payload (identity is established by the REST/cookie layer on the client side). Gateway CORS is fixed to `CLIENT_URL` with `credentials: true`.
- Room lifecycle logic (slug generation, soft end, hourly cleanup) lives in the room module; the SFU service tears down routers on end/empty.
- Global throttling exists (`ThrottlerModule`, per-IP short/long windows). Deployment is single-node Docker Compose on one VPS.

## Goals / Non-Goals

**Goals:**

- A workspace package `@zvonok/client` that the app consumes without behavior change, structured so a later change can publish it.
- Real tenancy from day one: developer → project → API key, with hashing and revocation, no retrofit risk.
- A minimal, versioned public REST surface with API-key auth and per-key limits.
- Room tokens as a verified identity path into `/sfu`, additive to the existing user and guest paths.

**Non-Goals:**

- npm publishing, `@zvonok/react`, prebuilt widget (later changes).
- Webhooks, billing, dashboard UI, email flows, multi-node SFU, ephemeral TURN credentials.
- Chat for token participants (stage 1: the SDK surface is SFU media + signalling only).
- Migrating the existing app/guest join paths onto tokens (flagged below as future hardening).

## Decisions

### D1 - Package layout and exports
Create `packages/client` (`@zvonok/client`). Move the framework-free modules from `apps/client/src/lib/` (sfu manager, media manager, screen-share service, audio modules and their tests) into `packages/client/src/`. The app keeps its API client (`lib/api`), auth, and React bindings - they are app concerns.

Per the repo's no-barrel rule, the package exposes **subpath exports** (`@zvonok/client/sfu-manager`, `@zvonok/client/media-manager`, …) via a package.json `exports` map pointing at TypeScript source; the Vite app resolves and compiles them (bundler module resolution). No build step in stage 1 - the packaging/build config for publish lands with the later npm-publish change. Root scripts gain a package test entry; per-package Vitest config follows the app's conventions.

### D2 - Tenancy schema
New models:

- `DeveloperAccount` - `id`, unique `username`, `passwordHash`, timestamps. No email, no lockout columns in stage 1 (login failure handling reuses the user service pattern minimally: counter + lockout optional, see D3).
- `Project` - `id`, `name`, `developerAccountId` (cascade delete), timestamps.
- `ApiKey` - `id`, unique `keyHash` (SHA-256, via a shared `ApiKeyHelper`), non-unique `prefix` (first 15 key characters - `zk_live_` plus 7 random chars - for identification in listings), `projectId` (cascade), `revokedAt` nullable.
- `Room` - add nullable `projectId` + relation; make `ownerId`/`owner` nullable. Exactly one of `ownerId`/`projectId` is set (enforced in services; a DB check constraint is optional).

Key format: `zk_live_<urlsafe-43-char-secret>` generated from 32 random bytes; the full key is returned once at creation, only hash + prefix persist. Migration is backward compatible (existing rooms keep owners).

### D3 - Developer module
New `apps/server/src/developer/` module (mirrors auth module shape): register/login with the shared password policy and `PasswordHelper`; issues a short-lived bearer JWT (`JWT_DEV_SECRET`, ~30 min, no refresh flow - developers re-login; acceptable for a Swagger/CLI-managed surface). Management endpoints (create project, create/list/revoke keys) are guarded by a dev JWT passport strategy. Seed: extend the existing `prisma/seed.ts` with `DEV_SEED_USERNAME`/`DEV_SEED_PASSWORD`/`DEV_SEED_PROJECT` env handling, printing the created key once.

### D4 - Public API module
New `apps/server/src/platform/` module exposing `/v1/rooms…`:

- `ApiKeyStrategy` (Passport bearer): hash the presented key, look up by `keyHash`, reject revoked/unknown with an indistinguishable 401, attach `{ project }` to the request.
- Room operations delegate to the room module (new internal methods for project-owned create/end) so slug generation, status transitions, cleanup, and SFU teardown stay in one place - no duplicated lifecycle logic.
- `POST /v1/rooms/:id/tokens` mints tokens (D5). `DELETE /v1/rooms/:id` ends the room through the same path as the user-facing end (participants get `room-ended`, router closes).
- Validation and errors follow existing NestJS DTO/exception conventions; `/v1` is added to Swagger grouping.

### D5 - Room tokens
JWT (HS256) signed with a dedicated `JWT_ROOM_SECRET` (new env, generated like other secrets), separate from access/refresh secrets. Claims: `roomId` (subject), `projectId`, `keyId`, `participantId` (random UUID, minted server-side), `name`, `publish: boolean`, `admin: boolean`, `exp` (default 60 min, env `ROOM_TOKEN_TTL_MINUTES`). Not one-time: replay within TTL is possible and accepted (short TTL; one-time enforcement would require per-token state and breaks reconnect). Revocation: the token carries the minting key's `keyId`; join re-checks that exact key (one indexed `findUnique`) and rejects if it is missing or revoked - this satisfies the spec scenario exactly (revoking the minting key invalidates its outstanding tokens at the next join attempt) without the earlier-considered project-level approximation.

`sfu:join` payload gains optional `token`. When present: verify signature/expiry/roomId match, then build the peer from token claims, ignoring client-supplied identity fields. Failure → emit `sfu:join-error` with a code (`ROOM_TOKEN_INVALID`/`ROOM_TOKEN_EXPIRED`/`ROOM_TOKEN_ROOM_MISMATCH`) and do not create a peer. The peer struct gains a permissions flag; `kickPeer` authorization extends to "room admin" (room owner for user rooms - unchanged; token `admin` for project rooms). Produce requests from token peers without `publish` are refused with a coded produce-error.

### D6 - Gateway CORS for third-party origins
Token-path clients connect from arbitrary origins without cookies. The gateway CORS allows any origin with credentials enabled (reflected origin). This is safe because the `/sfu` namespace never authenticates via cookies - identity comes from REST-issued payloads (app path) or verified room tokens - so a reflected origin opens no cookie surface; the cookie-bearing surfaces (`/chat` gateway and REST) keep their strict `CLIENT_URL` CORS. (An earlier per-origin credentials callback was considered, but Nest's `GatewayMetadata.cors` type accepts only static `CorsOptions`.)

### D7 - Per-key rate limiting
Custom throttler guard for `/v1` keyed by API-key id (fallback: IP when unauthenticated), fixed window, in-memory storage. Single-node deployment makes in-memory acceptable; the limits (e.g., 60/min create/token, higher for reads) are env-tunable. Global user-facing throttles remain untouched.

## Risks / Trade-offs

- **App-path identity trust remains**: `/sfu` still trusts join-payload identity for cookie users/guests. The token path is the first verified-identity path; migrating the app onto tokens is the natural follow-up hardening change (kept out of scope to hold this change's size).
- **Token revocation granularity**: key revocation affects future joins; already-issued tokens remain replayable until expiry within the simplified project-key check. Accepted for stage 1 (short TTL); per-token denylist is a later option.
- **`ownerId` nullability**: every room consumer must now handle two ownership kinds; enforced by service-level invariant plus tests rather than a polymorphic relation, which Prisma models poorly.
- **Source-consuming package**: pointing `exports` at TS source defers publish-readiness; consumers outside the monorepo cannot use it until the later build/publish change - by design (publish is out of scope).
- **In-memory throttles and single worker**: consistent with current deployment; multi-node would need shared storage (documented future work, matches the deferred cluster goal).
- **No email flows**: lost dev credentials are recoverable only via server CLI access - acceptable for a single-operator platform.
