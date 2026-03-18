# ZvonOK - WebRTC Video Conferencing Platform

A modern WebRTC video chat application built as a pnpm monorepo with NestJS backend and React frontend. Supports group video calls via mediasoup SFU.

## Features

- **Group Video Calls** — mediasoup SFU for multi-participant rooms
- **Secure Authentication** — JWT with refresh token rotation and reuse detection
- **Modern Stack** — React 19, NestJS, TypeScript, Tailwind CSS
- **Database** — PostgreSQL with Prisma ORM
- **Production-Ready** — Docker Compose + Caddy (automatic HTTPS)

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | NestJS v11, PostgreSQL 16, Prisma ORM, Passport.js (JWT), mediasoup |
| Frontend | React 19, Vite 7, Tailwind CSS v4, React Router v7, Radix UI, mediasoup-client |
| Signalling | Socket.io |
| Deployment | Docker Compose, Caddy (reverse proxy + HTTPS) |

## Prerequisites

- **Node.js** 22+
- **pnpm** (this project uses pnpm only — no npm/yarn)
- **Docker** and **Docker Compose**

## Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Server env is ready out of the box at `apps/server/.env.development`.
Client env is at `apps/client/.env.local`.

If missing, create from examples:

```bash
cp apps/server/.env.example apps/server/.env.development
cp apps/client/.env.example apps/client/.env.local
```

Edit `apps/client/.env.local`:

```env
VITE_API_BASE_URL="http://localhost:3000"
VITE_SOCKET_URL="http://localhost:3000"
```

### 3. Start database

```bash
pnpm -C apps/server bd:dev
```

This starts PostgreSQL (port 5432) and pgAdmin (port 5050) via Docker.

### 4. Run migrations

```bash
pnpm -C apps/server migrate:dev
```

### 5. Start dev servers

```bash
pnpm dev
```

- **Server**: http://localhost:3000 (Swagger: http://localhost:3000/swagger)
- **Client**: http://localhost:5173

In dev mode, mediasoup listens on `127.0.0.1` (default without env vars) — video/audio works only on the same machine.

## Production Deployment (Docker)

See **[docs/deployment.md](docs/deployment.md)** for the full production setup guide.

Quick version:

```bash
cp .env.production.example .env
# Edit .env with real secrets and your domain/IP
docker compose up -d --build
```

This starts 5 services: PostgreSQL, migrations, NestJS server, client build, and Caddy reverse proxy with automatic HTTPS.

Open: `https://localhost` (self-signed) or `https://your-domain.com` (Let's Encrypt).

## Project Structure

```
webrtc-chat/
├── apps/
│   ├── server/             # NestJS backend (port 3000)
│   │   ├── prisma/         # Database schema and migrations
│   │   ├── src/
│   │   │   ├── auth/       # Authentication (JWT, Passport)
│   │   │   ├── user/       # User CRUD
│   │   │   ├── room/       # Room management
│   │   │   └── sfu/        # mediasoup SFU (WebSocket gateway)
│   │   └── docker-compose.yml  # Dev database (PostgreSQL + pgAdmin)
│   └── client/             # React frontend (port 5173)
│       └── src/
│           ├── features/   # Feature modules (auth, room, media, sfu)
│           ├── components/ # Shared UI components
│           ├── hooks/      # Shared hooks
│           └── lib/        # API client, SFU manager, utilities
├── docs/                   # Documentation (SDD, deployment, tasks)
├── docker-compose.yml      # Production full-stack deployment
├── Caddyfile               # Caddy reverse proxy config
└── .env.production.example # Production env template
```

## Available Commands

### Root

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run client + server in development |
| `pnpm test` | Run tests in all workspaces |
| `pnpm test:client` | Client unit tests (CI mode) |
| `pnpm test:server` | Server unit tests |
| `pnpm clean` | Clean caches |

### Server (`apps/server/`)

| Command | Description |
|---------|-------------|
| `pnpm -C apps/server dev` | Development mode with watch |
| `pnpm -C apps/server build` | Compile TypeScript |
| `pnpm -C apps/server lint` | ESLint |
| `pnpm -C apps/server test` | Unit tests |
| `pnpm -C apps/server test:e2e` | E2E tests |
| `pnpm -C apps/server migrate:dev` | Apply Prisma migrations |
| `pnpm -C apps/server bd:dev` | Start dev database (Docker) |

### Client (`apps/client/`)

| Command | Description |
|---------|-------------|
| `pnpm -C apps/client dev` | Vite dev server |
| `pnpm -C apps/client build` | Production build |
| `pnpm -C apps/client lint` | ESLint |
| `pnpm -C apps/client test:run` | Unit tests (CI mode) |
| `pnpm -C apps/client test:e2e` | Playwright E2E tests |

## Documentation

- **[Deployment Guide](docs/deployment.md)** — Production Docker setup
- **[System Design Document](docs/SDD.md)** — Architecture, API, data models
- **[Agent Guide](docs/agent-guide.md)** — Rules for AI agents
- **[Roadmap](docs/roadmap.md)** — Development phases and status

## License

MIT
