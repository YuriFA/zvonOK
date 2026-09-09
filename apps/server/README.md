# ZvonOK Server

NestJS backend: JWT auth, mediasoup SFU media, rooms, chat, whiteboard, egress, platform/developer APIs, and webhooks. PostgreSQL via Prisma.

## Requirements

- Node.js 22+
- pnpm
- PostgreSQL 16+

## Quick Start

Setup and the full command table live in the root [README](../../README.md) ("Development Setup" / "Available Commands"). Server-specific facts:

- `pnpm db:dev` starts PostgreSQL + pgAdmin via Docker (ports 5432 / 5050)
- Dev server: http://localhost:3000 — Swagger UI at http://localhost:3000/swagger

## Architecture

Feature modules under `src/`: `auth`, `user`, `room`, `chat`, `sfu`, `egress`, `platform`, `developer`, `webhooks`, `whiteboard`.

- **Auth:** JWT with refresh-token rotation and reuse detection; Passport `jwt` + `jwt-refresh-token` strategies; tokens in HTTP-only cookies. Specs: [openspec/specs/auth](../../openspec/specs/auth).
- **Media:** mediasoup SFU (`sfu`, `egress`) — no P2P path. Specs: [openspec/specs/sfu](../../openspec/specs/sfu).
- **Database:** PostgreSQL via Prisma — schema in [prisma/schema.prisma](prisma/schema.prisma).

## API

Endpoints are documented live by Swagger at http://localhost:3000/swagger (dev). Domain behavior specs live under [openspec/specs](../../openspec/specs).

## Environment

Copy [`.env.example`](.env.example) to `.env.development` and fill in the values: client URL, database URL, JWT secrets (access, refresh, guest, dev, room), token TTLs, and Mediasoup/RTC/TURN settings.
