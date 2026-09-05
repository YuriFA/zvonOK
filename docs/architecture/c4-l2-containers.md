# C4 Level 2 — Container Diagram

> Развёртываемые единицы системы и их взаимодействие.

```mermaid
C4Container
    title WebRTC Chat — Container Diagram

    Person(user, "User / Guest", "Browser-based participant")

    System_Boundary(prod, "WebRTC Chat (Docker Compose)") {

        Container(caddy, "Caddy Reverse Proxy", "Caddy 2", "Dev/standalone: terminates TLS (Let's Encrypt / self-signed). Prod (docker-compose.prod.yml): HTTP-only :80 behind shared Traefik — no TLS, no redirects. Both configs share routing via Caddyfile.routes snippet: serves pre-built React SPA, reverse-proxies /api and Socket.io to NestJS, adds security headers, zstd/gzip compression and immutable cache headers.")

        Container(client, "React SPA", "React 19 + Vite (static files)", "Single-page application: authentication forms, home page, room pre-join, active call UI with chat. Built to static files and served by Caddy. Route-based code splitting — room page (mediasoup-client, socket.io-client) loaded lazily.")

        Container(server, "NestJS Server", "Node.js 22 + NestJS", "REST API (/api), Socket.io WebSocket gateway (/sfu namespace), mediasoup SFU engine. Handles auth, room management, SFU signalling and media routing for group calls.")

        Container(migrator, "Prisma Migrator", "Node.js + Prisma CLI (init container)", "Runs `prisma migrate deploy` on startup, then exits. Applies pending DB migrations before the server starts.")

        ContainerDb(postgres, "PostgreSQL", "PostgreSQL 16", "Stores users (credentials, token hashes, lockout state), rooms (slug, owner, status, participants limit), and chat messages (user/guest authorship, cascading delete).")

        Container(coturn, "coturn TURN Server", "coturn (network_mode: host)", "STUN/TURN relay for WebRTC ICE. Listens on UDP/TCP 3478 and TLS 5349. Relay port range 40000–40099. Credentials delivered to clients by the NestJS server at transport creation time.")
    }

    System_Ext(stun, "Google STUN", "stun1/stun2.l.google.com:19302")
    System_Ext(ghcr, "GHCR / CI-CD", "GitHub Container Registry + GitHub Actions")
    System_Ext(traefik, "Shared Traefik Gateway", "TLS termination (Let's Encrypt TLS-ALPN) for multiple sites on one VPS; forwards plain HTTP to zvonok-caddy :80")

    Rel(user, traefik, "HTTPS (443) — prod entry point", "HTTPS")
    Rel(traefik, caddy, "Plain HTTP forward (prod)", "HTTP")
    Rel(user, caddy, "HTTPS (443) — dev/standalone entry point", "HTTPS / WSS")
    Rel(user, coturn, "STUN/TURN — ICE candidate relay for media", "UDP/TCP 3478, TLS 5349")

    Rel(caddy, client, "Serves static SPA files", "file system")
    Rel(caddy, server, "Reverse proxy /api and Socket.io", "HTTP")

    Rel(client, server, "REST API calls (auth, rooms, users)", "HTTP/JSON via Caddy")
    Rel(client, server, "SFU signalling (join, transport, produce, consume)", "Socket.io WSS via Caddy")
    Rel(client, coturn, "Media relay (when direct path blocked)", "TURN/UDP+TCP")
    Rel(client, stun, "ICE candidate gathering", "STUN/UDP")

    Rel(server, postgres, "Reads/writes users, rooms, and messages via Prisma ORM", "TCP 5432")

    Rel(migrator, postgres, "Applies Prisma migrations on startup", "TCP 5432")

    Rel(ghcr, caddy, "Pulls caddy image", "HTTPS")
    Rel(ghcr, server, "Pulls server image", "HTTPS")
    Rel(ghcr, postgres, "Pulls postgres image", "HTTPS")
```

## Text Diagram

```
  [User / Guest]
       │
       │ HTTPS :443 → [Traefik] → Caddy :80 (prod); HTTPS :443 → Caddy (dev)
       │ TURN/UDP+TCP :3478, TLS :5349 (media relay)
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Docker Compose Stack                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Caddy (dev :443 TLS / prod :80 behind Traefik)         │   │
│  │  - Dev: TLS termination; prod: Traefik terminates       │   │
│  │  - Serves React SPA static files (/srv/client)           │   │
│  │  - Reverse proxy → NestJS (/api, Socket.io)              │   │
│  │  - zstd/gzip + immutable cache headers                   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │ HTTP                              │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  NestJS Server :3000                                │        │
│  │  - REST API (/auth, /users, /rooms, /messages)         │        │
│  │  - Socket.io gateways (/sfu + chat)                   │        │
│  │  - mediasoup SFU engine (single Worker)              │        │
│  └────────────────────────────┬────────────────────────┘        │
│                               │ TCP :5432 (Prisma ORM)          │
│                               ▼                                  │
│  ┌───────────────────────┐   ┌──────────────────────────┐       │
│  │  PostgreSQL :5432     │   │  Prisma Migrator          │       │
│  │  users · rooms · messages │◄──│  (init container)         │       │
│  └───────────────────────┘   │  prisma migrate deploy    │       │
│                               └──────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  coturn (network_mode: host)                             │   │
│  │  STUN/TURN :3478 (UDP+TCP) · TURNS :5349 (TLS)          │   │
│  │  relay range 40000–40099                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

  [Google STUN]          [GitHub GHCR]
  stun:*.google.com      ghcr.io/…/server
  ICE gathering          ghcr.io/…/client
  (STUN/UDP)             ghcr.io/…/migrator

Communication flow (client JS inside browser):
  Browser JS → Traefik → Caddy → NestJS  REST /* (prod; dev without Traefik)
  Browser JS → Traefik → Caddy → NestJS  Socket.io /sfu + chat
  Browser JS → coturn        (TURN)   media relay fallback
  Browser JS → Google STUN  (STUN)   ICE candidate gathering
  mediasoup  → RTP/SRTP/UDP           media via single Worker
```

## Container Responsibilities

| Container | Technology | Responsibility |
|-----------|-----------|----------------|
| **Caddy** | Caddy 2 | Dev: TLS termination, SPA serving, reverse proxy. Prod: HTTP-only behind shared Traefik |
| **React SPA** | React 19 + Vite | Client-side UI: auth, home, pre-join, active call, chat |
| **NestJS Server** | NestJS + Node 22 | REST API, Socket.io WebSocket, chat gateway, mediasoup SFU engine, global rate limiting |
| **Prisma Migrator** | Node + Prisma CLI | Init container — runs DB migrations, then exits |
| **PostgreSQL** | PostgreSQL 16 | Persistent storage: users, rooms, messages |
| **coturn** | coturn | STUN/TURN relay for WebRTC connectivity behind NAT |

## Communication Protocols

| From → To | Protocol | Purpose |
|-----------|----------|---------|
| Browser → Traefik → Caddy | HTTPS / HTTP | All web traffic (prod); dev goes direct to Caddy |
| Caddy → NestJS | HTTP | Reverse proxy |
| Client JS → NestJS | HTTP/JSON | REST API (auth, rooms, users) |
| Client JS → NestJS | Socket.io WSS | SFU signalling events |
| Client JS → coturn | TURN/UDP+TCP/TLS | Media relay (fallback) |
| Client JS → Google STUN | STUN/UDP | ICE gathering |
| NestJS → PostgreSQL | TCP (Prisma) | ORM queries |
| mediasoup workers | RTP/SRTP UDP | Internal media routing between workers |
