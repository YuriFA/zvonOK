## 1. Package extraction - `@zvonok/client`

- [x] 1.1 Scaffold `packages/client` (package.json with subpath `exports` mapped to `src/*.ts` per design D1, tsconfig extending repo base, Vitest config following app conventions)
- [x] 1.2 Move framework-free modules and their tests from `apps/client/src/lib/` (sfu manager, media manager, screen-share service, audio modules) to `packages/client/src/`; rewrite all app imports to `@zvonok/client/*`; remove moved files from the app
- [x] 1.3 Update root/package test scripts to include the package; verify `pnpm install`, client build, and package+client tests are green with no behavior change

## 2. Tenancy schema

- [x] 2.1 Add `DeveloperAccount`, `Project`, `ApiKey` models and `Room.projectId` with nullable `ownerId`/`owner` to `prisma/schema.prisma`; create and apply the migration (existing rooms unaffected)
- [x] 2.2 Enforce the ownership invariant (exactly one of `ownerId`/`projectId`) in room creation paths; extend room unit tests to cover project-owned rooms and confirm user-room tests unchanged
- [x] 2.3 Extend `prisma/seed.ts` with `DEV_SEED_*` env handling (developer + project + one API key; print full key once); verify a seeded run against a dev database

## 3. Developer module

- [x] 3.1 Create `apps/server/src/developer/` module: register/login with the shared password policy, dev JWT bearer strategy (`JWT_DEV_SECRET`, ~30 min TTL), no refresh flow
- [x] 3.2 Management endpoints under dev JWT: create project; create/list/revoke API keys (full key returned exactly once; listings show only id/prefix/revocation state)
- [x] 3.3 Unit tests: duplicate username 409, login failure 401, key lifecycle (issue once, revoke → 401 on `/v1`), cross-project 404 isolation
- [x] 3.4 Add `JWT_DEV_SECRET` to `.env.example`/`.env.production.example` and the deployment env table; expose the module in Swagger grouping

## 4. Public API `/v1`

- [x] 4.1 Implement the API-key bearer strategy: SHA-256 hash lookup, uniform 401 for missing/unknown/revoked, attach project context
- [x] 4.2 `POST /v1/rooms`, `GET /v1/rooms`, `DELETE /v1/rooms/:id` delegating to room-module lifecycle methods (project-owned create, project-scoped list, end with `room-ended` signal + router teardown); validation matches the 2-50 participant clamp
- [x] 4.3 `POST /v1/rooms/:id/tokens`: room-token JWT per design D5 (`JWT_ROOM_SECRET`, TTL env, participantId minted server-side, publish/admin claims); reject for ended rooms
- [x] 4.4 Per-key throttler guard on `/v1` (fixed window, keyed by API-key id, 429 with Retry-After; global user throttles untouched)
- [x] 4.5 Controller/service tests: auth matrix, per-key isolation, participant-limit validation, end-room lifecycle, throttle behavior

## 5. SFU room-token join

- [x] 5.1 Extend `sfu:join` with optional `token`: verify signature/expiry/roomId-match, build the peer solely from claims, emit coded `sfu:join-error` and create no peer on failure
- [x] 5.2 Enforce token permissions: refuse produce for peers without `publish` (coded produce-error); allow kick for `admin`-token peers in project rooms; user/guest authorization paths unchanged
- [x] 5.3 Replace fixed gateway CORS with the dynamic-origin function (CLIENT_URL with credentials; arbitrary origins without credentials)
- [x] 5.4 Unit tests: valid/expired/mismatched token, identity taken from claims not payload, publish denial, admin kick in project rooms, regression coverage for cookie/guest joins

## 6. End-to-end verification

- [x] 6.1 Socket-level e2e (server `test/`): seed → `POST /v1/rooms` → mint token → connect with `socket.io-client` using the token → observe join/peer events and a publish-denial; assert a wrong-room token is refused
- [x] 6.2 Update `docs/deployment.md` env tables (`JWT_DEV_SECRET`, `JWT_ROOM_SECRET`, `ROOM_TOKEN_TTL_MINUTES`) and document the `/v1` surface in the API docs
- [x] 6.3 Full verification pass: `pnpm test` (client + server + package), `pnpm lint`, and a manual two-browser smoke of the existing app confirming unchanged behavior
