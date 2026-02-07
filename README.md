# WebRTC Chat

A modern WebRTC video chat application built as a monorepo with NestJS backend and React frontend.

## Features

- **P2P Video Calls** — Real-time video and audio communication using WebRTC
- **Secure Authentication** — JWT with refresh token rotation and reuse detection
- **Modern Stack** — React 19, NestJS, TypeScript, Tailwind CSS
- **Database** — PostgreSQL with Prisma ORM
- **Signalling** — Agora RTM SDK for WebRTC signalling

## Tech Stack

### Backend (`apps/server/`)
- **Framework**: NestJS v11
- **Database**: PostgreSQL 16+ via Prisma ORM
- **Authentication**: Passport.js (Local + JWT strategies)
- **Testing**: Jest

### Frontend (`apps/client/`)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **UI Components**: Radix UI primitives
- **WebRTC**: Agora RTM SDK + native WebRTC API

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and pgAdmin (Docker)
pnpm -C apps/server bd:dev

# Run both server and client in development mode
pnpm dev
```

The server will be available at `http://localhost:3000` and the client at `http://localhost:5173`.

## Project Structure

```
webrtc-chat/
├── apps/
│   ├── server/         # NestJS backend (port 3000)
│   │   ├── prisma/     # Database schema and migrations
│   │   ├── src/
│   │   │   ├── auth/   # Authentication module
│   │   │   └── user/   # User module
│   │   └── docker-compose.yml
│   └── client/         # React frontend (port 5173)
│       └── src/
│           ├── routes/ # Page routes
│           └── components/
├── docs/               # Documentation
└── scripts/            # Utility scripts
```

## Environment Setup

### Server (`.env.development`)

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webrtc_chat
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN_MINUTES=15
JWT_REFRESH_EXPIRES_IN_DAYS=7
```

### Client (`.env.local`)

```env
AGORA_APP_ID=your-agora-app-id
```

> **Note**: Sign up at [agora.io](https://agora.io) to get your App ID.

## Available Commands

### Root Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run both server and client in development |
| `pnpm clean` | Clean build caches |
| `pnpm server:dev` | Run server only |

### Server Commands (`apps/server/`)

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Development mode with watch |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm lint` | Run ESLint with auto-fix |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm migrate:dev` | Apply database migrations |
| `pnpm bd:dev` | Start PostgreSQL + pgAdmin (Docker) |

### Client Commands (`apps/client/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build (tsc + vite) |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Preview production build |

## Documentation

- **Backend**: [apps/server/README.md](apps/server/README.md)
- **Frontend**: [apps/client/README.md](apps/client/README.md)
- **Development Guidelines**: [CLAUDE.md](CLAUDE.md)

## License

MIT
