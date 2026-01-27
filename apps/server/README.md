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

POSTGRES_USER=zvonok_admin
POSTGRES_PASSWORD=zvonok_password
POSTGRES_DB=zvonok

PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin
```

## Database

Start Postgres (Docker option):

```bash
docker compose -f apps/server/docker-compose.yml --env-file apps/server/.env.development up -d
```

pgAdmin UI:

- URL: `http://localhost:5050`
- Email: value of `PGADMIN_DEFAULT_EMAIL` in `apps/server/.env.development`
- Password: value of `PGADMIN_DEFAULT_PASSWORD` in `apps/server/.env.development`

Connect to Postgres in pgAdmin using:

- Host: `postgres`
- Port: `5432`
- Database: value of `POSTGRES_DB` in `apps/server/.env.development`
- Username: value of `POSTGRES_USER` in `apps/server/.env.development`
- Password: value of `POSTGRES_PASSWORD` in `apps/server/.env.development`

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
