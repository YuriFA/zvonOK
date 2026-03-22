# Software Design Document: WebRTC Chat

> **Version:** 2.0
>
> **Date:** 2025-02-07 / Updated: 2026-03-18
>
> **Status:** Living Document

---

## Documentation Index

| Document | Purpose | Location |
|----------|---------|----------|
| **Module Documentation** | Detailed module specifications | [modules/](./modules/) |
| **Architecture Diagrams** | C4 diagrams, domain model, sequence diagrams | [architecture/](./architecture/) |
| **Roadmap** | Implementation stages and task list | [roadmap.md](./roadmap.md) |
| **Agent Guide** | Guidelines for AI agents | [agent-guide.md](./agent-guide.md) |
| **Tasks** | Individual task specifications | [tasks/](./tasks/) |

---

## 1. Introduction

### 1.1 Purpose

This document describes the architecture, design, and technical decisions for the WebRTC Chat application — a browser-based video conferencing system similar to Google Meet.

> **Note:** For module-specific details, see the [Module Documentation](./modules/). For implementation tasks, see the [Roadmap](./roadmap.md).

### 1.2 Scope

The WebRTC Chat application provides:

- **Video Calls** — 1-on-1 and group calls (up to 10+ participants)
- **Text Chat** — Real-time messaging with history
- **Screen Sharing** — Share desktop or application window
- **Device Management** — Switch between cameras, microphones, and speakers
- **User Authentication** — Registration, login, and session management

### 1.3 Definitions

| Term | Definition |
|------|------------|
| **WebRTC** | Web Real-Time Communication — API for peer-to-peer audio/video |
| **SFU** | Selective Forwarding Unit — Server for routing media in group calls |
| **STUN** | Session Traversal Utilities for NAT — Discovers public IP |
| **TURN** | Traversal Using Relays around NAT — Relay server for direct connection failures |
| **Signalling** | Process of exchanging connection info (offer/answer/ICE) via WebSocket |
| **JWT** | JSON Web Token — Stateless authentication token |
| **Prisma** | ORM for type-safe database access |

---

### 1.4 Spec-Driven Requirements

| ID | Requirement | Status |
|----|-------------|--------------|
| REQ-001 | Authentication via JWT access/refresh with rotation and HTTP-only cookies. | Completed |
| REQ-002 | User profile access via `/api/users/me` and public lookup via `/api/users/:id` without sensitive fields. | Completed |
| REQ-003 | Room management via REST with slug-based invite codes. | Completed |
| REQ-004 | WebSocket signalling for join/leave and offer/answer/ICE exchange. | Completed |
| REQ-005 | SFU signalling for group calls (mediasoup). | In Progress |
| REQ-006 | Client UI with home/auth/room routes consuming REST + WebSocket APIs. | Completed |
| REQ-007 | Security baseline: bcrypt hashing, env-based JWT secrets, timing-safe refresh validation. | Completed |
| REQ-008 | Performance targets and monitoring for media and UI. | Planned |

---

### 1.6 Product Goals and MVP Scope

**Primary Goal:** deliver a general-purpose video calling experience similar to Google Meet.

**Target Audience:** general users and small groups needing reliable video calls.

**MVP Focus:**
- Group video calls with authentication and room codes
- Join/leave flow with SFU (mediasoup) signalling
- SFU-based calls for 3-10+ participants

**Planned After MVP:**
- Screen sharing, device management, and chat history
- SFU-based group calls for larger rooms

**MVP Success Criteria (assumptions):**
- Users can register/login and join a room by code
- Small-group video calls are stable on typical networks
- Basic join/leave and reconnection work without manual support

---

## 2. System Architecture

### 2.1 Domain Model

> See full diagram: [architecture/domain-model.md](./architecture/domain-model.md)

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **User** | id (PK), email (UK), username (UK), passwordHash, refreshTokenHash, tokenVersion | Owns rooms |
| **Room** | id (PK), slug (UK), ownerId (FK→User), status (active\|ended), maxParticipants | Soft-deleted via `status=ended` |
| **Message** | id, content, userId (FK), roomId (FK) | *Planned — Stage 9* |

### 2.2 High-Level Architecture

> See full diagram: [architecture/high-level.md](./architecture/high-level.md)

```
Browser Clients  ──HTTP/WS──►  NestJS Server (REST API + WS Gateway + mediasoup SFU)
                                       │ Prisma ORM
                                       ▼
                               PostgreSQL Database
```

Clients exchange media directly with the SFU (RTP/SRTP); all signalling goes over WebSocket.

### 2.3 Component Overview

| Component | Description | Location |
|-----------|-------------|----------|
| **AuthModule** | JWT authentication with refresh token rotation | `apps/server/src/auth/` |
| **UserModule** | User management via Prisma | `apps/server/src/user/` |
| **PrismaModule** | Global database service | `apps/server/src/prisma/` |
| **SFUModule** | mediasoup for group calls (WebSocket signalling) | `apps/server/src/sfu/` |
| **Client App** | React 19 + Vite frontend | `apps/client/src/` |

### 2.4 Technology Stack

**Backend:**
- **Framework:** NestJS (Node.js)
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **WebSocket:** Socket.io
- **WebRTC:** mediasoup SFU
- **Auth:** Passport.js + JWT

**Frontend:**
- **Framework:** React 19
- **Build Tool:** Vite
- **Routing:** React Router v7 (file-based)
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI
- **Forms:** React Hook Form + Zod
- **WebRTC:** Native RTCPeerConnection API

---

## 3. Data Design

### 3.1 Data Models

```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  username            String    @unique
  passwordHash        String
  refreshTokenHash    String?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  tokenVersion        Int       @default(0)
  role                Role      @default(USER)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  rooms      Room[]     @relation("RoomHost")
}

model Room {
  id              String     @id @default(cuid())
  name            String?
  slug            String     @unique
  ownerId         String
  owner           User       @relation("RoomHost", fields: [ownerId], references: [id])
  isPublic        Boolean    @default(true)
  maxParticipants Int        @default(10)
  status          RoomStatus @default(active)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  endedAt         DateTime?
  lastActivityAt  DateTime?

  @@index([ownerId])
  @@index([status])
  @@index([isPublic])
}

enum Role {
  USER
  HOST
  ADMIN
}

enum RoomStatus {
  active
  ended
}

// Note: Message model will be added in Stage 9 (Chat feature)
// model Message {
//   id        String   @id @default(cuid())
//   content   String
//   userId    String
//   roomId    String
//   createdAt DateTime @default(now())
// }
```

### 3.2 Database Schema

| Table | Columns | Indexes |
|-------|---------|---------|
| `User` | id, email, username, passwordHash, refreshTokenHash, failedLoginAttempts, lockedUntil, tokenVersion, role, createdAt, updatedAt | email (unique), username (unique) |
| `Room` | id, slug, name, ownerId, isPublic, maxParticipants, status, createdAt, updatedAt, endedAt, lastActivityAt | slug (unique), ownerId (FK to User, indexed), status (indexed), isPublic (indexed) |
| `Message` | id, content, userId, roomId, createdAt | userId (FK to User), roomId (FK to Room) — *To be added in Stage 9* |

---

## 4. Interface Design

### 4.1 REST API

#### Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login with email/password |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Protected | Invalidate refresh token |

#### User Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Protected | Get current user profile |
| GET | `/api/users/:id` | Public | Get user by ID |
| PATCH | `/api/users/me` | Protected | Update current user |
| PATCH | `/api/users/:id/role` | ADMIN only | Update user role |

#### Room Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rooms` | Protected | List user's rooms |
| POST | `/api/rooms` | HOST or ADMIN | Create new room |
| GET | `/api/rooms/:slug` | Public | Get room by slug |
| PATCH | `/api/rooms/:id` | Protected | Update room (owner only) |
| DELETE | `/api/rooms/:id` | Protected | End room (owner only) |

#### Request/Response Examples

**Register Request:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Login Response:**
```json
HTTP 200 OK
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800

{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### 4.2 WebSocket Events

**Note:** The application uses an SFU (mediasoup) architecture for all video calls. P2P signalling events (`webrtc:offer/answer/ice`) are documented for reference but not currently implemented.

#### SFU Events (mediasoup)

**SFU Events**

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `sfu:join` | Client → Server | `{ roomId, userId, username, roomOwnerId? }` | Join SFU room |
| `sfu:joined` | Server → Client | `{ routerRtpCapabilities }` | SFU room joined |
| `sfu:create-send-transport` | Client → Server | `{}` | Create the peer send transport |
| `sfu:create-recv-transport` | Client → Server | `{}` | Create the peer receive transport |
| `sfu:transport-created` | Server → Client | `{ direction, transportId, iceParameters, iceCandidates, dtlsParameters }` | Transport parameters ready for the client |
| `sfu:connect-transport` | Client → Server | `{ transportId, dtlsParameters }` | Complete DTLS handshake for a transport |
| `sfu:transport-connected` | Server → Client | `{ transportId }` | Transport handshake completed |
| `sfu:produce` | Client → Server | `{ transportId, kind, rtpParameters }` | Create producer |
| `sfu:producer-created` | Server → Client | `{ producerId, userId, kind }` | New producer |
| `sfu:new-producer` | Server → Client | `{ producerId, userId, username, kind }` | Notify peers that a consumable producer is available |
| `sfu:consume` | Client → Server | `{ producerId, rtpCapabilities }` | Create consumer |
| `sfu:consumer-created` | Server → Client | `{ consumerId, producerId, kind, rtpParameters }` | Consumer created in paused state |
| `sfu:resume-consumer` | Client → Server | `{ consumerId }` | Resume a paused consumer after client setup |
| `sfu:pause-producer` | Client → Server | `{ producerId }` | Pause producer |
| `sfu:resume-producer` | Client → Server | `{ producerId }` | Resume producer |
| `sfu:peer-left` | Server → Client | `{ userId }` | Notify peers that a participant left or was removed |
| `sfu:kick-peer` | Client → Server | `{ userId }` | Room owner removes a participant from the SFU room |
| `sfu:kicked` | Server → Client | `{ roomId }` | Sent to the removed participant before disconnect |
| `sfu:room-ended` | Server → Client | `{ roomId }` | Broadcast to all room peers when the owner ends the room |

**Error Payload (Server -> Client):**
```json
{
  "code": "UNAUTHORIZED",
  "message": "..."
}
```

**Error Codes:** `UNAUTHORIZED`, `ROOM_NOT_FOUND`, `PEER_NOT_FOUND`, `VALIDATION_ERROR`.

**Authentication:** WebSocket connections use JWT cookies; unauthenticated access should return `UNAUTHORIZED` and disconnect for protected flows.

### 4.3 Frontend Routes

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` | Home Page | No |
| `/login` | Login Page | No (redirect if authenticated) |
| `/register` | Register Page | No (redirect if authenticated) |
| `/room/:slug` | Room Page with pre-join, active call, and ended states | Optional |

**Room Creation Flow:**
1. User creates room via dialog on home page
2. Redirect to `/room/:slug`
3. Room page opens in pre-join state with device setup, video preview, and shareable link
4. Device selections and local audio/video intent chosen in pre-join are preserved as the source of truth for call entry
5. User clicks "Join Room" → room page switches to active call state using the preserved media setup
6. When the room is ended, the same route shows the ended state instead of reconnecting

---

## 5. Component Design

### 5.1 Backend Modules

#### AuthModule

**Responsibilities:**
- User registration with password hashing (bcrypt)
- Login with JWT token generation
- Refresh token rotation on every use
- Token reuse detection (timing-safe comparison)
- Account lockout after failed attempts

**Key Classes:**
- `AuthService` — Core auth logic
- `LocalStrategy` — Passport strategy for email/password
- `JwtStrategy` — Passport strategy for access token validation
- `JwtRefreshStrategy` — Passport strategy for refresh token validation

**Security Features:**
- Passwords hashed with bcrypt (10 rounds)
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens stored in HTTP-only cookies
- Refresh tokens hashed in database (SHA256)

#### UserModule

**Responsibilities:**
- CRUD operations for User entity
- User lookup by email/username/id

#### PrismaModule

**Responsibilities:**
- Global Prisma service injection
- Database connection management
- `@Global()` decorator makes service available everywhere

#### SFUModule

**Responsibilities:**
- mediasoup Worker and Router lifecycle management
- Transport creation (send/receive) per peer
- Producer/Consumer coordination for group calls
- WebSocket signalling via `/sfu` namespace
- Scaling across multiple Workers (one per CPU core)

**Status:** Completed (Stage 5)

**See:** [modules/sfu.md](./modules/sfu.md)

### 5.2 Frontend Architecture

**Pages:**
- `HomePage` (`/`) — Room join/create, auth-aware navigation
- `LoginPage` (`/login`) — Email/password login form
- `RegisterPage` (`/register`) — Registration with password confirmation
- `RoomPage` (`/room/:slug`) — Canonical room experience with three states: pre-join, active call, ended

**Features:**
- `AuthContext` — Global auth state with `useAuth()` hook
- `authApi` — API client with automatic token refresh on 401
- `ProfileDropdown` — User menu with logout
- `Room media setup state` — Client-side room entry state that preserves selected input devices and mic/camera enabled intent from pre-join into the active call lifecycle. The `MediaStreamProvider` seeds the `MediaTrackController` with device IDs from `localStorage` on mount so the initial `getUserMedia` call targets saved devices. Device selections and toggle preferences in the track controller singleton survive the prejoin-to-active transition without re-mount. Device availability is validated at join time; missing devices surface recoverable UI errors in the pre-join view.

**UI Components (Radix UI):**
- `Button` — Primary/secondary/outline/ghost variants
- `Input` — Text input with label integration
- `Card` — Container component
- `Label` — Form label with accessibility

**Build Optimization:**
- Route-based code splitting via `React.lazy()` — room page (mediasoup-client, socket.io-client) loaded on demand
- Vendor chunk splitting: `vendor-react` (React + Router), `vendor-data` (TanStack Query, react-hook-form, zod), `vendor-sfu` (mediasoup-client, socket.io-client)
- Initial load: ~172 KB gzipped (app + vendor-react + vendor-data + CSS); room lazy chunks: ~73 KB gzipped
- Bundle analysis: `ANALYZE=true pnpm -C apps/client build` generates `dist/bundle-stats.html`
- Caddy serves compressed (zstd/gzip) responses with immutable cache headers for hashed assets

---

## 6. Security

### 6.1 Authentication

**Flow:**
1. User submits email/password to `/api/auth/login`
2. Server validates credentials
3. Server generates JWT access token (15min) + refresh token (7days)
4. Tokens set as HTTP-only cookies
5. Client sends cookies automatically with requests

**Token Structure:**
```typescript
// Access Token Payload
{
  sub: string,      // User ID
  email: string,
  username: string,
  tokenVersion: number,
  iat: number,
  exp: number
}

// Refresh Token Payload
{
  sub: string,      // User ID
  jti: string,      // JWT ID (unique token identifier)
  iat: number,
  exp: number
}
```

### 6.2 Authorization

**Guards:**
- `JwtAuthGuard` — Protects endpoints requiring authentication
- `SkipAuthGuard` — Marks public endpoints (default behavior)

**Usage:**
```typescript
@UseGuards(JwtAuthGuard)
@Get('me')
getProfile(@Request() req) {
  return req.user;
}
```

### 6.3 WebRTC Security

**ICE Servers (Configurable via TASK-072):**

The server builds an ICE server list from environment variables and sends it to the client inside the `sfu:transport-created` socket event payload. The client passes the received `iceServers` array to mediasoup-client's `device.createSendTransport()` / `device.createRecvTransport()`.

- Google public STUN servers are always included as a baseline.
- TURN servers (coturn) are appended when `TURN_URL` + `TURN_USER` + `TURN_PASSWORD` env vars are set.
- TURN credentials are never hard-coded in the client; they are fetched at runtime from the server.

```typescript
// Server: mediasoup.config.ts → getIceServers()
[
  { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  // appended when TURN env vars are present:
  { urls: ['turn:host:3478', 'turns:host:5349'], username: '…', credential: '…' },
]
```

**TURN (Production):**
- coturn server for relay candidates
- Required for connections behind symmetric NAT
- Configured via `TURN_URL`, `TURNS_URL`, `TURN_USER`, `TURN_PASSWORD` env vars

**Encryption:**
- SRTP (Secure Real-time Transport Protocol) for media
- DTLS (Datagram Transport Layer Security) for data channels

---

## 7. Performance

### 7.1 Requirements

| Metric | Target |
|--------|--------|
| Video latency | < 200ms (SFU) |
| Audio latency | < 150ms (SFU) |
| Chat message delivery | < 100ms |
| UI frame rate | 60fps with 10+ video tiles |
| API response time | < 200ms (p95) |

### 7.2 Monitoring

**WebRTC Stats:**
```typescript
const stats = await peerConnection.getStats();
// Track: bitrate, packetLoss, jitter, roundTripTime
```

**Network Quality Indicators:**
- Bandwidth (estimated)
- Latency (RTT)
- Packet loss rate

---

## 8. Scalability

### 8.1 SFU Architecture (planned)

**mediasoup Components:**
- **Worker** — OS process with media capabilities
- **Router** — Routes media for a room
- **Transport** — RTP stream (send/receive)
- **Producer** — Incoming media track
- **Consumer** — Outgoing media track

**Scaling Strategy:**
- 1 Router per room
- Multiple Workers per server (CPU cores)
- Horizontal scaling via load balancer

### 8.2 Horizontal Scaling

**Stateless Servers:**
- JWT tokens (stateless auth)
- Redis adapter for Socket.io (WebSocket state sync)
- PostgreSQL connection pooling

**Infrastructure:**
```
┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   LB / Caddy│
└─────────────┘     └─────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           ┌────────┐ ┌────────┐ ┌────────┐
           │ Server │ │ Server │ │ Server │
           └────────┘ └────────┘ └────────┘
                │           │           │
                └───────────┼───────────┘
                            ▼
                      ┌──────────┐
                      │  Redis   │
                      └──────────┘
                            │
                            ▼
                      ┌──────────┐
                      │PostgreSQL│
                      └──────────┘
```

---

## 9. Deployment

### 9.1 Local Development

**Database:**
```bash
docker compose up -d  # PostgreSQL + pgAdmin
pnpm migrate:dev      # Run Prisma migrations
```

**Server:**
```bash
cd apps/server
pnpm start:dev       # Watch mode with hot reload
```

**Client:**
```bash
cd apps/client
pnpm dev             # Vite dev server on port 5173
```

### 9.2 Production Deployment

**Stack:** Docker Compose with Caddy + NestJS + PostgreSQL

**Architecture:**
```
┌──────────┐      ┌────────────────┐      ┌──────────┐
│ Browser  │─────▶│  Caddy (:443)  │─────▶│  NestJS  │
│          │ HTTPS│  - static SPA  │ HTTP │  (:3000)  │
│          │◀─────│  - reverse     │◀─────│  API+WS   │
└──────────┘      │    proxy       │      └──────────┘
     │            └────────────────┘           │
     │                                         ▼
     │     ┌──────────┐                 ┌──────────┐
     └────▶│  coturn   │                │PostgreSQL│
      TURN │(:3478/5349)                │  (:5432) │
           └──────────┘                 └──────────┘
```

**Components:**
- **Reverse Proxy:** Caddy (automatic HTTPS via Let's Encrypt, or self-signed for localhost)
- **Client:** Vite static build served by Caddy (`/srv/client`)
- **Server:** NestJS production image with pre-built mediasoup worker
- **Database:** PostgreSQL 16

**Deployment (via Makefile):**
```bash
# 1. First-time setup: create .env from template
make setup
# Edit .env with real secrets and domain

# 2. Build and start all services
make deploy

# 3. Run database migrations only (if needed separately)
make migrate
```

Common Makefile targets:

| Target | Description |
|--------|-------------|
| `make deploy` | Build images and start all services |
| `make down` | Stop all services |
| `make restart` | Stop and start all services |
| `make rebuild-server` | Rebuild and restart only the server |
| `make rebuild-client` | Rebuild client and restart Caddy |
| `make logs` | Follow logs for all services |
| `make status` | Show service status and health |
| `make clean` | Stop and remove containers/networks |
| `make clean-all` | Remove everything including volumes and images |

Run `make help` for the full list.

**Key Files:**
- `Makefile` — Production Docker orchestration
- `docker-compose.yml` — Full stack service definitions
- `Caddyfile` — Reverse proxy configuration
- `apps/server/Dockerfile` — Server multi-stage build (mediasoup worker + NestJS)
- `apps/client/Dockerfile` — Client multi-stage build (node + Vite → static files)
- `.env.production.example` — Environment variable template

**TURN Server:** coturn in Docker Compose (network_mode: host) for STUN/TURN relay on ports 3478/5349, relay range 49152-49252
**Process Manager:** Not needed with Docker (container restart policies handle this)

---

### 9.3 Operational Requirements (MVP assumptions)

- **Availability:** best-effort, no formal SLA
- **Monitoring:** server logs, basic metrics (API latency/error rate), WebSocket connection counts
- **Client Quality:** optional sampling of WebRTC stats (bitrate, jitter, packet loss)
- **Incidents:** manual restart/rollback; on-call/support process defined later
- **Data Handling:** media is not stored; database contains only user/room metadata

### 9.4 Risks and Constraints (MVP assumptions)

- WebRTC connectivity may fail behind strict NAT/firewalls; TURN is required for reliability
- SFU server resources (CPU/bandwidth) scale with number of participants
- Device permissions and hardware variability can impact call quality
- Network conditions vary; quality adaptation is planned in TASK-047 and TASK-048
- Compliance requirements (education/privacy) must be validated before production rollout

---

### 9.6 CI/CD Pipeline

**Platform:** GitHub Actions + GitHub Container Registry (GHCR)

**Architecture:**
```
Push to main / PR
    |
    v
+----------------------------------+
|  CI Workflow (ci.yml)            |
|  Trigger: push/PR to main       |
|                                  |
|  Jobs (parallel):                |
|  1. Lint & Typecheck (ESLint +   |
|     tsc --noEmit)                |
|  2. Server Tests (Jest)          |
|  3. Client Tests (Vitest)        |
|  4. Docker Build Check           |
+----------------+-----------------+
                 |
                 | all green + push to main
                 v
+----------------------------------+
|  Deploy Workflow (deploy.yml)    |
|  Trigger: push to main          |
|                                  |
|  Jobs:                           |
|  1. Build & push images to GHCR  |
|  2. SSH deploy to VPS            |
+----------------------------------+
```

**CI Workflow (`.github/workflows/ci.yml`):**
- Runs on every push and PR to `main`
- 4 parallel jobs: lint+typecheck, server tests, client tests, Docker build check
- Uses `pnpm/action-setup` + Node 22 + pnpm cache
- Docker builds use BuildKit GHA cache for layer reuse

**Deploy Workflow (`.github/workflows/deploy.yml`):**
- Runs on push to `main` only
- Builds 3 images: `server` (production target), `client`, `migrator`
- Tags: `latest` + git SHA
- Pushes to `ghcr.io/<repo>/server`, `ghcr.io/<repo>/client`, `ghcr.io/<repo>/migrator`
- Deploys via SSH: copies compose files, pulls images, runs `docker compose up -d`
- Health check: polls server for 60s after deploy

**Production Compose (`docker-compose.prod.yml`):**
- Uses `image:` directives pointing to GHCR instead of `build:`
- Identical service topology to `docker-compose.yml` (Caddy, server, client, postgres, coturn)
- Requires `GHCR_REPO` env var (e.g., `owner/webrtc-chat`)

**GitHub Secrets Required:**

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or domain |
| `VPS_USER` | SSH user (e.g., `deploy`) |
| `VPS_SSH_KEY` | Private SSH key for VPS access |
| `GHCR_TOKEN` | GitHub PAT with `packages:read` scope (for VPS docker login) |

**Makefile Targets:**

| Target | Description |
|--------|-------------|
| `make prod-pull` | Pull latest images from GHCR |
| `make prod-up` | Start production services (pre-pulled images) |
| `make prod-deploy` | Pull + restart (used by CI/CD) |
| `make prod-down` | Stop production services |
| `make prod-logs` | Follow production logs |
| `make prod-status` | Show production service status |

**VPS Setup:**
- Script: `scripts/setup-vps.sh` (run as root on fresh Ubuntu)
- Installs Docker, creates deploy user, configures UFW firewall, creates project directory

**Key Files:**
- `.github/workflows/ci.yml` — CI pipeline
- `.github/workflows/deploy.yml` — Deploy pipeline
- `docker-compose.prod.yml` — Production compose (GHCR images)
- `scripts/setup-vps.sh` — VPS provisioning script
- `.env.production.example` — Environment variable template (includes `GHCR_REPO`)

---

### 9.5 Environment Variables

**Server** (`apps/server/.env.development`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | HTTP server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN_MINUTES` | No | 15 | Access token lifetime in minutes |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | No | 7 | Refresh token lifetime in days |
| `CLIENT_URL` | No | http://localhost:5173 | Allowed CORS origin for REST API and WebSocket |
| `MEDIASOUP_LISTEN_IP` | No | 127.0.0.1 | IP for mediasoup WebRtcTransport to listen on |
| `MEDIASOUP_ANNOUNCED_IP` | No | — | Public IP announced to clients for media connectivity |
| `RTC_MIN_PORT` | No | 40000 | Lower bound of mediasoup worker RTC port range |
| `RTC_MAX_PORT` | No | 40099 | Upper bound of mediasoup worker RTC port range |
| `TURN_URL` | No | — | TURN server URL (e.g. `turn:host:3478`). Sent to clients as ICE server |
| `TURNS_URL` | No | — | TURN-over-TLS URL (e.g. `turns:host:5349`). Appended to TURN_URL |
| `TURN_USER` | No | — | TURN credential username sent to clients |
| `TURN_PASSWORD` | No | — | TURN credential password sent to clients |

**Client** (`apps/client/.env.local`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | http://localhost:3000 | REST API base URL (empty string for same-origin behind proxy) |
| `VITE_SOCKET_URL` | No | http://localhost:3000 | Socket.io server URL (empty string for same-origin behind proxy) |

**Docker Compose** (`.env` at repo root):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SITE_ADDRESS` | No | localhost | Caddy site address (domain for Let's Encrypt, or `localhost` for self-signed) |
| `POSTGRES_USER` | Yes | — | PostgreSQL user |
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL password |
| `POSTGRES_DB` | Yes | — | PostgreSQL database name |
| `TURN_USER` | Yes | — | coturn static credential username |
| `TURN_PASSWORD` | Yes | — | coturn static credential password |
| `TURN_EXTERNAL_IP` | Yes | — | Public IP announced by coturn for TURN relay |

---

## 10. References

- [WebRTC MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [mediasoup Documentation](https://mediasoup.org/documentation/v3/)
- [Socket.io Documentation](https://socket.io/docs/)

---

## 11. Testing Strategy

### 11.1 Test Levels

| Level | Tool | Scope |
|-------|------|-------|
| Unit | Jest | Server services (auth, room, user logic) |
| Integration | Jest + Supertest | REST API endpoints |
| End-to-End | Playwright | Full user flows (auth, room creation, join) |

### 11.2 Coverage Requirements

- AuthService and RoomService must have unit test coverage
- All error cases (401, 403, 404, 409) must be tested
- E2E tests cover: registration, login, logout, room creation, room join

### 11.3 Conventions

- One spec file per NestJS module (`auth.service.spec.ts`, `room.service.spec.ts`)
- E2E tests live in `apps/client/e2e/` using Page Object pattern
- Tests must pass in CI before merge; run with `pnpm test` (server) and `pnpm test:e2e` (client)
- Mock Prisma via `jest.mock` or a test database — never use production DB

---

## Appendix A: Sequence Diagrams

### SFU Media Flow (mediasoup)

> See full diagram: [architecture/sequence-sfu.md](./architecture/sequence-sfu.md)

High-level steps: `sfu:join` → `sfu:joined` → create transports → `sfu:produce` → `sfu:new-producer` → `sfu:consume` → `sfu:resume-consumer` → RTP/SRTP media flows.

### Authentication Flow

> See full diagram: [architecture/sequence-auth.md](./architecture/sequence-auth.md)

High-level steps: `POST /api/auth/login` → bcrypt verify → generate access + refresh tokens → set HTTP-only cookies → on expiry: `POST /api/auth/refresh` → rotate refresh token → new cookies.

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-07 | — | Initial SDD creation |
| 1.2 | 2026-02-08 | — | Consolidated architecture/overview.md, uncommented data models |
| 1.3 | 2026-02-08 | — | Added requirements/traceability and clarified interface specs |
| 1.4 | 2026-02-08 | — | Added product goals, MVP scope, and operational assumptions |
| 1.5 | 2026-03-03 | — | Synced REQ statuses, expanded Room API table, added GatewayModule/SFUModule to Sec 5.1, added Testing Strategy (Sec 11) and Environment Variables (Sec 9.5), fixed concurrent sessions doc |
| 1.6 | 2026-03-14 | — | Removed P2P signalling documentation; project uses SFU-only architecture. Updated diagrams, events, and component overview to reflect mediasoup implementation. |
| 1.7 | 2026-03-18 | — | Added Caddy reverse proxy deployment (Sec 9.2). Docker Compose full-stack setup, client Dockerfile, env-driven CORS, production environment template. |
| 1.8 | 2026-03-18 | — | Added coturn TURN/STUN server to Docker Compose stack (Sec 9.2). TURN env vars in Sec 9.5. |
| 1.9 | 2026-03-18 | — | TASK-072: Configurable ICE servers. Server reads TURN env vars and sends iceServers to client via sfu:transport-created payload. Removed hard-coded STUN from client. |
| 2.0 | 2026-03-18 | — | TASK-074: Client build optimization. Route-based code splitting for room page, vendor chunk splitting, Caddy compression and cache headers. |
| 2.1 | 2026-03-18 | — | Stage 12: CI/CD pipeline. GitHub Actions CI (lint, typecheck, tests, Docker build check), deploy workflow (GHCR + SSH), docker-compose.prod.yml, VPS setup script. |
