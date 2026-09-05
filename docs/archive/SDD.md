# Software Design Document: WebRTC Chat

> **Version:** 2.5
>
> **Date:** 2025-02-07 / Updated: 2026-04-08
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
| REQ-002 | User profile access via `/auth/me` (in AuthController). | Completed |
| REQ-003 | Room management via REST with slug-based invite codes. | Completed |
| REQ-004 | WebSocket signalling for join/leave and offer/answer/ICE exchange. | Completed |
| REQ-005 | SFU signalling for group calls (mediasoup). | Completed |
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
| **User** | id (PK), email (UK), username (UK), passwordHash, refreshTokenHash, tokenVersion, role (USER\|HOST\|ADMIN) | Owns rooms |
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
| **UserModule** | User role management via Prisma | `apps/server/src/user/` |
| **RoomModule** | Room lifecycle management with cleanup | `apps/server/src/room/` |
| **ChatModule** | Chat messaging with paginated history | `apps/server/src/chat/` |
| **PrismaModule** | Global database service | `apps/server/src/prisma/` |
| **SFUModule** | mediasoup for group calls (WebSocket signalling). Single Worker with per-room Routers. | `apps/server/src/sfu/` |
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
- **UI Components:** @base-ui/react
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
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  refreshTokenHash    String?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  tokenVersion        Int       @default(0)
  role                Role      @default(USER)
  rooms               Room[]    @relation("RoomHost")
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
| `User` | id, email, username, passwordHash, createdAt, updatedAt, refreshTokenHash, failedLoginAttempts, lockedUntil, tokenVersion, role | email (unique), username (unique) |
| `Room` | id, slug, name, ownerId, isPublic, maxParticipants, status, createdAt, updatedAt, endedAt, lastActivityAt | slug (unique), ownerId (FK to User, indexed), status (indexed), isPublic (indexed) |
| `Message` | id, content, userId, roomId, createdAt | userId (FK to User), roomId (FK to Room) — *Stage 11 Chat API complete* |

---

## 4. Interface Design

### 4.1 REST API

#### Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public (`@SkipAuthGuard`) | Register new user → 201 Created |
| POST | `/auth/login` | Public (`@SkipAuthGuard`) | Login with email/password → 200 |
| POST | `/auth/refresh-token` | JwtRefreshGuard | Refresh access token → 200 |
| POST | `/auth/logout` | Protected (default) | Invalidate refresh token → 200 |
| GET | `/auth/me` | Protected (default) | Get current user profile → 200 |

#### User Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/users/:id/role` | ADMIN only (`@Roles(Role.ADMIN)`) | Update user role → 200 |

#### Room Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/rooms` | HOST or ADMIN (`@Roles`) | Create new room → 201 Created |
| GET | `/rooms/:slug` | Public (`@SkipAuthGuard`) | Get room by slug → 200 |
| PATCH | `/rooms/:id` | Protected (owner check in controller) | Update room → 200 |
| DELETE | `/rooms/:id` | Protected (owner check in controller) | End room (soft delete + SFU cleanup) → 204 No Content |
| POST | `/rooms/:slug/guest-request` | Public (`@SkipAuthGuard`) | Guest requests to join room → 200 `{ requestId }` |
| POST | `/rooms/:slug/guest-approve` | Protected (owner check) | Owner approves guest → 200 `{ token }` |
| POST | `/rooms/:slug/guest-deny` | Protected (owner check) | Owner denies guest → 204 No Content |
| GET | `/rooms/:slug/guest-status/:requestId` | Public (`@SkipAuthGuard`) | Guest checks request status → 200 `{ status, token? }` |

#### Chat Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/messages` | Protected (rate: 30/min) | Send message → 201 Created |
| GET | `/messages/:roomId?page=1&limit=50` | Protected | Get paginated message history → 200 |

#### Request/Response Examples

**Register Request:**
```json
POST /auth/register
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Register/Login Response:**
```json
HTTP 201 Created
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax

{
  "success": true,
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Refresh Token Response:**
```json
POST /auth/refresh-token
HTTP 200 OK
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax

{
  "accessToken": "..."
}
```

**Get Current User (GET /auth/me):**
```json
HTTP 200 OK
{
  "id": "clx...",
  "email": "user@example.com",
  "username": "johndoe",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 4.2 WebSocket Events

**Note:** The application uses an SFU (mediasoup) architecture for all video calls. P2P signalling events (`webrtc:offer/answer/ice`) are documented for reference but not currently implemented.

#### SFU Events (mediasoup)

**SFU Events**

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `sfu:join` | Client → Server | `{ roomId, userId, username, roomOwnerId?, roomSlug? }` | Join SFU room |
| `sfu:joined` | Server → Client | `{ routerRtpCapabilities }` | SFU room joined |
| `sfu:peer-joined` | Server → Client | `{ userId, username }` | Notify existing peers that a new participant joined |
| `sfu:existing-peers` | Server → Client | `[{ userId, username }]` | Sent to newly joined peer listing participants already in room |
| `sfu:leave` | Client → Server | `{}` | Leave SFU room voluntarily |
| `sfu:create-send-transport` | Client → Server | `{}` | Create the peer send transport |
| `sfu:create-recv-transport` | Client → Server | `{}` | Create the peer receive transport |
| `sfu:transport-created` | Server → Client | `{ direction, transportId, iceParameters, iceCandidates, dtlsParameters, iceServers }` | Transport parameters ready for the client |
| `sfu:connect-transport` | Client → Server | `{ transportId, dtlsParameters }` | Complete DTLS handshake for a transport |
| `sfu:transport-connected` | Server → Client | `{ transportId }` | Transport handshake completed |
| `sfu:produce` | Client → Server | `{ requestId, transportId, kind, rtpParameters, appData? }` | Create producer |
| `sfu:producer-created` | Server → Client | `{ requestId, producerId, userId, kind, appData? }` | New producer |
| `sfu:produce-error` | Server → Client | `{ requestId, code, message }` | Producer creation failed or rejected |
| `sfu:new-producer` | Server → Client | `{ producerId, userId, username, kind, paused, appData? }` | Notify peers about a consumable producer |
| `sfu:close-producer` | Client → Server | `{ producerId }` | Close and dispose a producer |
| `sfu:screen-share-started` | Server → Room | `{ userId }` | A participant started screen sharing |
| `sfu:screen-share-stopped` | Server → Room | `{ userId }` | Screen sharing stopped |
| `sfu:producer-state-changed` | Server → Client | `{ producerId, kind, userId, paused }` | Broadcast when a producer is paused/resumed |
| `sfu:consume` | Client → Server | `{ producerId, rtpCapabilities }` | Create consumer |
| `sfu:consumer-created` | Server → Client | `{ consumerId, producerId, kind, rtpParameters }` | Consumer created in paused state |
| `sfu:resume-consumer` | Client → Server | `{ consumerId }` | Resume a paused consumer after client setup |
| `sfu:consumer-resumed` | Server → Client | `{ consumerId }` | Consumer is now active |
| `sfu:pause-producer` | Client → Server | `{ producerId }` | Pause producer |
| `sfu:resume-producer` | Client → Server | `{ producerId }` | Resume producer |
| `sfu:producer-state-changed` | Server → Client | `{ producerId, kind, userId, paused }` | Notify peers that a producer was paused or resumed |
| `sfu:peer-left` | Server → Client | `{ userId }` | Notify peers that a participant left or was removed |
 | `sfu:kick-peer` | Client → Server | `{ userId }` | Room owner removes a participant from the SFU room |
| `sfu:kicked` | Server → Client | `{ roomId }` | Sent to the removed participant before disconnect |
| `sfu:room-ended` | Server → Client | `{ roomId }` | Broadcast to all room peers when the owner ends the room |
| `sfu:set-preferred-layers` | Client → Server | `{ consumerId, spatialLayer }` | Request a simulcast spatial layer switch for a consumer (0=low, 1=mid, 2=high) |
| `sfu:guest-join-request` | Server → Owner | `{ requestId, displayName }` | Guest requests to join room |
| `sfu:guest-join-approved` | Server → Guest | `{ token }` | Guest approved, guest JWT ready |
| `sfu:guest-join-denied` | Server → Guest | `{}` | Guest denied entry |

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
| `/auth/me` | API endpoint (GET) | Protected |

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
- `JwtStrategy` — Passport strategy for access token validation
- `JwtRefreshTokenStrategy` — Passport strategy for refresh token validation
- `TokenHelper` — JWT token generation (access + refresh)
- `PasswordHelper` — bcrypt hashing and verification
- `RefreshTokenHelper` — SHA256 hashing and timing-safe comparison

**Security Features:**
- Passwords hashed with bcrypt (10 rounds)
- Access tokens expire in `JWT_ACCESS_EXPIRES_IN_MINUTES` (default 15 min)
- Refresh tokens expire in `JWT_REFRESH_EXPIRES_IN_DAYS` (default 7 days)
- Tokens stored in HTTP-only cookies (SameSite=Lax, Secure in production) or passed via Authorization: Bearer header
- Refresh tokens hashed in database (SHA256)
- Rate limiting: register 5/min, login 10/min, global tiers (10/60s, 20/5min, 100/1hr)

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
- mediasoup Worker and Router lifecycle management (single Worker, per-room Routers)
- Transport creation (send/receive) per peer
- Producer/Consumer coordination for group calls
- WebSocket signalling via `/sfu` namespace
- WebSocket signalling via `/sfu` namespace

**Status:** Completed (Stage 5)

**See:** [modules/sfu.md](./modules/sfu.md)

#### ChatModule

**Responsibilities:**
- Send messages to rooms via REST
- Retrieve paginated message history with user data
- Rate limiting on message creation (30/min)

**Key Classes:**
- `ChatService` — Message CRUD with pagination
- `ChatController` — REST endpoints (`POST /messages`, `GET /messages/:roomId`)

**Status:** Completed (Stage 11)

### 5.2 Frontend Architecture

**Pages:**
- `HomePage` (`/`) — Room join/create, auth-aware navigation
- `LoginPage` (`/login`) — Email/password login form
- `RegisterPage` (`/register`) — Registration with password confirmation
- `RoomPage` (`/room/:slug`) — Canonical room experience with three states: pre-join, active call, ended

**Features:**
- `features/auth/` — AuthContext with `useAuth()` hook, login/register forms, profile dropdown, auth API service
- `features/room/` — RoomPage with PreJoinView, ActiveRoomView, CallEndedView; room API, TanStack Query hooks
- `features/media/` — MediaStreamProvider/MediaManagerProvider, device selector, media controls, device settings
- `features/sfu/` — SfuProvider with `useSfu()` hook wrapping SfuManager

**Libraries:**
- `lib/api/` — ApiClient (fetch wrapper with 401-auto-refresh), typed errors (ApiError, AuthError, ValidationError, NetworkError)
- `lib/sfu/` — SfuManager, SfuConnection (socket.io), EventRouter, StatsCollector, qualityScore
- `lib/media/` — MediaManager, MediaAcquisition, DeviceService, error classifier
- `lib/audio/` — RemoteAudioMixer (Web Audio API)
- `lib/react-query/` — QueryClient, query keys
- `lib/config/` — app, media, routes, themes configuration

**UI Components (components/ui/ — @base-ui/react + Tailwind v4):**
- `Button`, `ButtonGroup` — Primary/secondary/outline/ghost variants
- `Input` — Text input with label integration
- `Card` — Container component
- `Label` — Form label with accessibility
- `Dialog` — Modal dialog (@base-ui/react)
- `DropdownMenu` — Dropdown menu (@base-ui/react)
- `Alert` — Alert/notification component
- `Separator` — Visual divider
- `Tooltip` — Tooltip (@base-ui/react)
- `CopyLink` — Copy-to-clipboard with visual feedback
- `LinkButton` — Styled link that looks like a button
- `ThemeSwitcher` — Dark/light mode toggle
- `Sonner` — Toast notifications (sonner library)

**Room Components (components/room/):**
- `ParticipantItem` — Single participant row with status indicators
- `ParticipantsList` — List of all room participants
- `QualityIndicator` — Network quality display

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
1. User submits email/password to `/auth/login`
2. Server validates credentials
3. Server generates JWT access token (15min) + refresh token (7days)
4. Tokens set as HTTP-only cookies
5. Client sends cookies automatically with requests

**Token Structure:**
```typescript
// Access Token Payload
{
  id: string,         // User ID
  email: string,
  role: Role,         // USER | HOST | ADMIN
  tokenVersion: number,
  iat: number,
  exp: number
}

// Refresh Token Payload
{
  id: string,         // User ID
  email: string,
  role: Role,
  tokenVersion: number,
  jti: string,        // JWT ID (unique token identifier)
  iat: number,
  exp: number
}
```

### 6.2 Authorization

**Guards:**
- `JwtAuthGuard` — Global APP_GUARD, default global, skips if `@SkipAuthGuard()` metadata set
- `JwtRefreshAuthGuard` — Validates refresh token on `/auth/refresh-token`
- `SkipAuthGuard` — Decorator that sets metadata to skip JwtAuthGuard (marks public endpoints)
- `RolesGuard` — Global APP_GUARD, allows all if no `@Roles()` decorator, checks role if present

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

**Codecs (Router mediaCodecs):**
- Audio: `audio/opus` (48kHz, 2 channels)
- Video: `video/VP8` (90kHz, x-google-start-bitrate: 1000)
- Video: `video/VP9` (90kHz, profile-id: 2, x-google-start-bitrate: 1000)
- Video: `video/h264` (90kHz, packetization-mode: 1, profile-level-id: `4d0032`, level-asymmetry-allowed: 1, x-google-start-bitrate: 1000)

**Transport Config:**
- `listenIps`: from `MEDIASOUP_LISTEN_IP` / `MEDIASOUP_ANNOUNCED_IP` env vars
- `enableUdp: true`, `enableTcp: true`, `preferUdp: true`

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

### 8.1 SFU Architecture

**mediasoup Components:**
- **Worker** — OS process with media capabilities (single Worker currently)
- **Router** — Routes media for a room (one per room)
- **Transport** — RTP stream (send/receive)
- **Producer** — Incoming media track
- **Consumer** — Outgoing media track

**Current Implementation:**
- 1 Router per room
- Single Worker per server (crash recovery with auto-restart after 2s delay)
- Horizontal scaling via load balancer (planned)

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
pnpm -C apps/server bd:dev    # PostgreSQL + pgAdmin (docker)
pnpm -C apps/server migrate:dev  # Prisma migrations
```

**Server:**
```bash
pnpm -C apps/server dev       # Watch mode with hot reload
```

**Client:**
```bash
pnpm -C apps/client dev       # Vite dev server on port 5173
```

### 9.2 Production Deployment

**Stack:** Docker Compose with Traefik gateway + Caddy + NestJS + PostgreSQL

**Architecture (VPS, multi-site):**
```
┌──────────┐      ┌───────────────┐      ┌────────────────┐      ┌──────────┐
│ Browser  │─────▶│ Traefik :443  │─────▶│  Caddy (:80)   │─────▶│  NestJS  │
│          │ HTTPS│ (gateway, LE  │ HTTP │  - static SPA  │ HTTP │  (:3000)  │
│          │◀─────│  certs, all   │◀─────│  - reverse     │◀─────│  API+WS   │
└──────────┘      │  subdomains)  │      │    proxy       │      └──────────┘
     │            └───────┬───────┘      └────────────────┘           │
     │                    │ routes other Hosts                          ▼
     │                    │ to sibling sites                       ┌──────────┐
     │     ┌──────────┐   │ (shared `web` docker network)         │PostgreSQL│
     └────▶│  coturn   │◀──┘                                       │  (:5432) │
      TURN │(:3478/5349)                                           └──────────┘
           └──────────┘
```

Traefik (`~/gateway`, separate from this repo) is the only service binding host ports 80/443; other repositories deploy independently on their own subdomains behind the same gateway. Standalone/local runs skip Traefik — Caddy then manages TLS itself (`Caddyfile`); production uses the HTTP-only `Caddyfile.traefik` (see [traefik-migration-plan.md](./traefik-migration-plan.md)).

**Components:**
- **Edge:** Traefik gateway (prod only) — TLS termination, Let's Encrypt for every subdomain, Host-based routing via Docker labels
- **Reverse Proxy:** Caddy (dev/standalone: automatic HTTPS via Let's Encrypt, or self-signed for localhost)
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
- `docker-compose.yml` — Full stack service definitions (standalone/dev)
- `docker-compose.prod.yml` — VPS deployment from GHCR images (behind Traefik)
- `Caddyfile.routes` — Shared routing rules (API proxies, SPA, headers)
- `Caddyfile` — Standalone/dev wrapper (TLS + redirects)
- `Caddyfile.traefik` — Production wrapper (plain HTTP behind Traefik)
- `apps/server/Dockerfile` — Server multi-stage build (mediasoup worker + NestJS)
- `apps/client/Dockerfile` — Caddy with baked-in client static assets (node + Vite → Caddy image)
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
- Network conditions vary; quality adaptation is implemented (TASK-047: jitter + network quality metrics)
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
- Health check: polls `GET /health` for 60s after deploy

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
| `JWT_ACCESS_EXPIRES_IN_MINUTES` | Yes | 15 | Access token lifetime in minutes |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | Yes | 7 | Refresh token lifetime in days |
| `CLIENT_URL` | No | http://localhost:5173 | Allowed CORS origin for REST API and WebSocket |
| `NODE_ENV` | No | — | Set to `production` to enable Secure cookie flag |
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

High-level steps: `POST /auth/login` → bcrypt verify → generate access + refresh tokens → set HTTP-only cookies → on expiry: `POST /auth/refresh-token` → rotate refresh token → new cookies.

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
| 2.2 | 2026-03-29 | — | Full docs sync with codebase. Fixed REST API paths (refresh-token, auth/me), token payloads (id+role not sub+username), cookie SameSite=lax, added missing WS events (peer-joined, existing-peers, leave, close-producer, consumer-resumed, producer-state-changed), updated mediasoup config (single worker, VP9 codec, h264 params), removed non-existent endpoints, added RoomModule to component overview. |
| 2.3 | 2026-03-29 | — | Removed `/api/` prefix from all REST endpoints (code has no global prefix). Fixed UI primitives to @base-ui/react (not Radix UI), removed non-existent Select component. Fixed token extraction (Bearer header + cookies). Added throttling/Swagger docs. Fixed JWT env vars to required. Added NODE_ENV. Fixed register status 201, room DELETE 204. Fixed REQ-002 (removed non-existent /users/me and /users/:id). Updated architecture diagrams (c4-l3-backend, c4-l3-frontend, sequence-auth). Updated all module docs. |
| 2.4 | 2026-04-04 | — | Stage 8 (Polish & Infrastructure) completed. Added user roles, toast notifications, prejoin redesign, display name, independent device permissions, remote audio via Web Audio API, avatar pastel colors, audio level rings, SOLID audio refactor, app versioning, CI/CD pipeline, framework-agnostic architecture, UI migration to Base UI, simplified room creation. Updated done/README.md, roadmap.md. |
| 2.5 | 2026-04-08 | — | TASK-047: Network quality metrics complete. Added `jitter` to `QualityStats` (collected from `inbound-rtp` for audio + video, converted from seconds to ms). Jitter penalty added to `calculateQualityScore` (−5/−10/−20 pts). Jitter shown in `QualityIndicator` tooltip. Removed unused `use-quality-stats` / `use-connection-stats` hook (stats pipeline runs through `PeerQualityProvider`). |
| 2.6 | 2026-04-09 | — | TASK-048: Adaptive video quality via simulcast. Video producer sends three spatial layers (low/mid/high) via `SIMULCAST_ENCODINGS`. Added `sfu:set-preferred-layers` WebSocket event (client → server). Server validates consumer ownership before calling `consumer.setPreferredLayers()`. `PeerQualityProvider` maps `QualityLevel` to spatial layer via `qualityToSpatialLayer()` and emits layer switches with a 3 s debounce. |
| 2.7 | 2026-04-17 | — | TASK-033: Chat API endpoints. POST /messages (rate-limited 30/min) and GET /messages/:roomId with pagination (page/limit). ChatService with Prisma, ChatModule registered in AppModule. 17 unit tests. |
