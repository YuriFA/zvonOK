# Production Deployment Guide

This guide covers deploying ZvonOK with Docker Compose on a Linux server (or locally for testing).

## Architecture Overview

```
Internet
   │
   ├─ HTTPS (443) ──▶ Caddy ──┬── Static files (React SPA from /srv/client)
   │                           ├── /auth/*, /users/*, /rooms/* ──▶ NestJS :3000
   │                           ├── /socket.io/* ──▶ NestJS :3000 (WebSocket)
   │                           └── /* (fallback) ──▶ index.html (SPA routing)
   │
   └─ UDP/TCP (40000-40099) ──▶ NestJS (mediasoup RTC media) ──▶ directly exposed
```

**Five services** run via `docker-compose.yml`:

| Service    | Image / Dockerfile         | Role |
|------------|---------------------------|------|
| `postgres` | `postgres:16-alpine`       | Database |
| `migrate`  | `apps/server/Dockerfile` (target: `migrator`) | Runs `prisma migrate deploy`, then exits |
| `server`   | `apps/server/Dockerfile` (target: `production`) | NestJS API + mediasoup SFU |
| `client`   | `apps/client/Dockerfile`   | Builds React SPA, copies to shared volume, then exits |
| `caddy`    | `caddy:2-alpine`           | Reverse proxy + automatic HTTPS + serves static files |

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A domain name pointing to your server's public IP (for Let's Encrypt HTTPS)
- Ports **80**, **443**, and **40000–40099** (UDP+TCP) open on the firewall

> For local testing without a domain, `SITE_ADDRESS=localhost` uses Caddy's self-signed certificate.

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> && cd webrtc-chat

# 2. Create env file from template
make setup

# 3. Edit .env (see Environment Variables below)
$EDITOR .env

# 4. Build and start
make deploy

# 5. Check all services are healthy
make status
```

> Run `make help` to see all available targets.
>
> If you prefer raw Docker commands, `make deploy` is equivalent to
> `docker compose up -d --build` and `make status` to `docker compose ps -a`.

Open `https://your-domain.com` (or `https://localhost` for local testing).

## Environment Variables

All variables are set in the root `.env` file. Copy from `.env.production.example`.

### Domain & Caddy

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SITE_ADDRESS` | Yes | `localhost` | Domain name for Caddy. Set to your domain (e.g., `chat.example.com`) for automatic Let's Encrypt. Set to `localhost` for self-signed TLS. |

### Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Internal port for NestJS (not exposed to host, Caddy proxies to it) |
| `CLIENT_URL` | Yes | `https://localhost` | Full URL of the client (used for CORS). E.g., `https://chat.example.com` |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | Yes | — | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL password (use a strong random value) |
| `POSTGRES_DB` | Yes | — | Database name |

> The `DATABASE_URL` is composed automatically in `docker-compose.yml` from these values.

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Yes | — | Secret for signing access tokens. Generate with: `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing refresh tokens. Generate with: `openssl rand -hex 64` |
| `JWT_ACCESS_EXPIRES_IN_MINUTES` | No | `15` | Access token lifetime in minutes |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | No | `7` | Refresh token lifetime in days |

### Client

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `""` (empty) | API base URL baked into the client build. Leave empty when Caddy proxies everything (same origin). |
| `VITE_SOCKET_URL` | No | `""` (empty) | Socket.io URL. Leave empty for same-origin. |

> These are build-time variables — they are injected during `docker compose build`. Changing them requires rebuilding the `client` service.

### mediasoup / WebRTC Media

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEDIASOUP_LISTEN_IP` | No | `0.0.0.0` | IP to bind RTC transport sockets. `0.0.0.0` is correct for Docker. |
| `MEDIASOUP_ANNOUNCED_IP` | **Yes** | `127.0.0.1` | **Your server's public IP address**. Remote clients use this IP to send/receive media. Must be set to the server's public IP for calls to work. |
| `RTC_MIN_PORT` | No | `40000` | Start of the UDP/TCP port range for RTC media |
| `RTC_MAX_PORT` | No | `40099` | End of the RTC port range. 100 ports supports ~50 simultaneous transports (each peer uses 2). |

**Important**: If `MEDIASOUP_ANNOUNCED_IP` is wrong, video/audio will not work for remote participants. Set it to the server's public IPv4 address. For local Docker testing, use your machine's LAN IP (not `127.0.0.1`, unless testing on the same machine).

## Example `.env` for Production

```env
# Domain
SITE_ADDRESS=chat.example.com
CLIENT_URL=https://chat.example.com

# Database
POSTGRES_USER=zvonok_admin
POSTGRES_PASSWORD=super-secret-db-password-here
POSTGRES_DB=zvonok

# JWT (generate both with: openssl rand -hex 64)
JWT_ACCESS_SECRET=a1b2c3d4...
JWT_REFRESH_SECRET=e5f6g7h8...

# Client (leave empty for same-origin behind Caddy)
VITE_API_BASE_URL=
VITE_SOCKET_URL=

# mediasoup
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=203.0.113.42
RTC_MIN_PORT=40000
RTC_MAX_PORT=40099
```

## Caddy Routing

The `Caddyfile` in the repo root defines the routing:

- `/auth/*`, `/users/*`, `/rooms`, `/rooms/*` → reverse proxy to `server:3000`
- `/swagger*` → reverse proxy to `server:3000` (API docs)
- `/socket.io/*` → reverse proxy to `server:3000` (WebSocket + polling)
- Everything else → `try_files` for static SPA with `index.html` fallback

**Note**: Caddy's `handle /rooms/*` does NOT match the bare `/rooms` path. That's why there are separate `handle /rooms` and `handle /rooms/*` blocks.

### Custom Domain with Automatic HTTPS

Set `SITE_ADDRESS=your-domain.com` in `.env`. Caddy will automatically obtain a Let's Encrypt certificate. Make sure:

1. DNS A record points to your server's IP
2. Ports 80 and 443 are open (Caddy needs port 80 for the ACME HTTP challenge)

### Localhost with Self-Signed TLS

The default `SITE_ADDRESS=localhost` makes Caddy use a self-signed certificate. Browsers will show a security warning — click through to proceed.

## Operations

### Viewing Logs

```bash
# All services
make logs

# Specific service
make logs-server
make logs-caddy
make logs-postgres
```

### Rebuilding After Code Changes

```bash
# Rebuild everything
make deploy

# Rebuild only the server
make rebuild-server

# Rebuild only the client (e.g., after changing VITE_* vars)
# This also restarts Caddy to pick up new static files
make rebuild-client
```

### Reloading Caddy Config

If you edit `Caddyfile` (it's bind-mounted), reload without restarting:

```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### Database Operations

```bash
# Run migrations manually (the migrate service already runs on startup)
make migrate

# Access PostgreSQL shell
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# Back up the database
docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Restore from backup
cat backup.sql | docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

### Scaling and Port Range

The default 100-port range (40000–40099) supports approximately 50 concurrent participants (each participant uses a send + receive transport, each transport uses one port). To support more:

1. Increase `RTC_MAX_PORT` in `.env` (e.g., `40199` for ~100 participants)
2. Open the additional ports on your firewall
3. Rebuild: `make rebuild-server`

### Stopping

```bash
# Stop all services (preserves data volumes)
docker compose down

# Stop and remove data volumes (destructive — deletes database!)
docker compose down -v
```

## Firewall Rules

Minimum required open ports:

| Port | Protocol | Purpose |
|------|----------|---------|
| 80 | TCP | HTTP (Caddy redirect + ACME challenge) |
| 443 | TCP + UDP | HTTPS + HTTP/3 |
| 40000–40099 | UDP + TCP | WebRTC media (mediasoup RTC) |

Example with `ufw`:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw allow 40000:40099/tcp
sudo ufw allow 40000:40099/udp
```

## Troubleshooting

### Video/audio not working for remote participants

- Verify `MEDIASOUP_ANNOUNCED_IP` is set to the server's **public IP** (not `0.0.0.0` or `127.0.0.1`)
- Check that ports 40000–40099 UDP are open on the firewall
- Run `docker compose logs server | grep -i mediasoup` to check for errors

### 405 Method Not Allowed on POST /rooms

- Ensure the `Caddyfile` has both `handle /rooms` (exact) and `handle /rooms/*` (wildcard) blocks
- Reload Caddy: `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`

### Client shows blank page

- Check that the `client` service completed successfully: `docker compose ps client` (should show "Exited (0)")
- Verify static files exist: `docker compose exec caddy ls /srv/client/index.html`

### Database connection errors

- Ensure `postgres` is healthy: `docker compose ps postgres`
- Check that `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` match between services
- The `migrate` service must complete before `server` starts (handled by `depends_on` conditions)

### Caddy not getting Let's Encrypt certificate

- Ensure DNS A record exists and propagated (`dig +short your-domain.com`)
- Port 80 must be open for the ACME HTTP-01 challenge
- Check Caddy logs: `docker compose logs caddy`
