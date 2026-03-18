# TASK-044 — Caddy Reverse Proxy with HTTPS

## Status
done

## Priority
high

## Description
Set up Caddy as a reverse proxy with automatic HTTPS for production deployment.

## Scope
- Configure Caddyfile with environment-driven site address
- Automatic HTTPS with Let's Encrypt (production) or self-signed (localhost)
- Proxy NestJS backend routes (`/auth/*`, `/users/*`, `/rooms/*`, `/swagger*`)
- Proxy Socket.io WebSocket transport (`/socket.io/*`)
- Serve client static build with SPA fallback
- Docker Compose full-stack orchestration (Caddy + Server + Client + PostgreSQL)
- Client Dockerfile (multi-stage: node build -> static files)
- Server Dockerfile improved with build step (self-contained)
- Environment-driven CORS configuration

## Technical Design

### Architecture
```
Browser -> Caddy (:443 HTTPS) -> NestJS (:3000 HTTP internal)
                               -> Static files (/srv/client)
                               -> PostgreSQL (:5432 internal)
```

### Caddyfile
```
{$SITE_ADDRESS:localhost} {
    root * /srv/client

    handle /auth/*   { reverse_proxy server:3000 }
    handle /users/*  { reverse_proxy server:3000 }
    handle /rooms/*  { reverse_proxy server:3000 }
    handle /swagger* { reverse_proxy server:3000 }
    handle /socket.io/* { reverse_proxy server:3000 }

    handle {
        try_files {path} /index.html
        file_server
    }
}
```

### Docker Compose Services
| Service    | Image/Build          | Purpose                       |
|------------|----------------------|-------------------------------|
| `caddy`    | `caddy:2-alpine`     | Reverse proxy, static files   |
| `server`   | `apps/server/Dockerfile` (production) | NestJS API + SFU    |
| `client`   | `apps/client/Dockerfile` | Build static files → volume  |
| `postgres` | `postgres:16-alpine` | Database                      |

## Acceptance Criteria
- [x] Caddy configured as reverse proxy with HTTPS
- [x] WebSocket connections proxied via `/socket.io/*`
- [x] Frontend served as static files with SPA fallback
- [x] Backend API routes proxied correctly
- [x] Docker Compose orchestrates full stack
- [x] Environment-driven configuration (domain, CORS, secrets)

## Definition of Done
- [x] Caddyfile with configurable site address
- [x] Client Dockerfile (multi-stage build)
- [x] Server Dockerfile updated (self-contained build)
- [x] Root docker-compose.yml with all services
- [x] .env.production.example with all required variables
- [x] CORS in server is env-driven (CLIENT_URL)
- [x] SDD updated (section 9.2, 9.5, version 1.7)
- [x] All existing tests pass

## Changes Made
- `Caddyfile` — New file, Caddy reverse proxy configuration
- `docker-compose.yml` — New file, full-stack Docker Compose
- `apps/client/Dockerfile` — New file, client multi-stage build
- `.env.production.example` — New file, production env template
- `apps/server/Dockerfile` — Added NestJS build step (self-contained)
- `apps/server/src/main.ts` — CORS origin now uses `CLIENT_URL` env var
- `apps/server/.env.example` — Added `CLIENT_URL`
- `apps/server/.env.development` — Added `CLIENT_URL`
- `docs/SDD.md` — Updated section 9.2, 9.5, version bumped to 1.7

## Related Files
- `Caddyfile`
- `docker-compose.yml`
- `apps/client/Dockerfile`
- `apps/server/Dockerfile`
- `.env.production.example`

## Next Task
TASK-046 — coturn TURN Server
