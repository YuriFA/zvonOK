# WebRTC Chat Server

NestJS backend for authentication and upcoming room/signalling APIs.

## Requirements

- Node.js 18+
- pnpm
- PostgreSQL 16+

## Quick start

```bash
pnpm install
pnpm -C apps/server start:dev
```

## Environment

Create `apps/server/.env.development` (do not commit) with:

```env
PORT=3000
DATABASE_URL="postgresql://webrtc:webrtc@localhost:5432/webrtc_chat?schema=public"

JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES_IN_MINUTES=15
JWT_REFRESH_EXPIRES_IN_DAYS=7
```

## Database

Start Postgres (Docker option):

```bash
docker compose -f apps/server/docker-compose.yml up -d
```

Run migrations and generate client:

```bash
pnpm -C apps/server migrate:dev
pnpm -C apps/server prisma generate
```

## Auth flow

- `POST /auth/register` — creates user, sets access/refresh cookies
- `POST /auth/login` — validates credentials, sets cookies, returns access token
- `POST /auth/refresh-token` — rotates refresh token, sets cookies, returns access token
- `POST /auth/logout` — clears cookies and refresh hash

Access tokens are accepted from `Authorization: Bearer <token>` or `access_token` cookie.
Refresh tokens are httpOnly cookies; on reuse detection the session is invalidated and the API
returns `401` with `code: REFRESH_REUSE_DETECTED`.

## Local auth check

Run the auth verification script:

```bash
apps/server/scripts/auth-check.sh
```

Optional overrides:

```bash
BASE_URL=http://localhost:3000 \
WAIT_ACCESS_EXPIRY_SECONDS=70 \
apps/server/scripts/auth-check.sh
```

## Tests

```bash
pnpm -C apps/server test
pnpm -C apps/server test:e2e
```

## Useful commands

```bash
pnpm -C apps/server start
pnpm -C apps/server start:dev
pnpm -C apps/server lint
pnpm -C apps/server format
pnpm -C apps/server prisma studio
```
