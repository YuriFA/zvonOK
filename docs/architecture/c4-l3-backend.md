# C4 Level 3 — Backend Components (NestJS Server)

> Внутренняя структура NestJS-сервера: модули, сервисы, контроллеры, gateway.

```mermaid
C4Component
    title NestJS Server — Component Diagram

    Container_Boundary(server, "NestJS Server") {

        %% ── AppModule ─────────────────────────────────────────
        Component(appModule, "AppModule", "NestJS Root Module", "Bootstrap module. Registers all feature modules globally. Configures CORS (CLIENT_URL env), Cookie-Parser middleware, and global JwtAuthGuard as the default auth guard.")

        %% ── PrismaModule ──────────────────────────────────────
        Component(prismaService, "PrismaService", "NestJS @Global() Provider", "Wraps PrismaClient. Singleton injected across all modules. Manages DB connection lifecycle (onModuleInit / enableShutdownHooks).")

        %% ── AuthModule ────────────────────────────────────────
        Component(authController, "AuthController", "NestJS Controller — /api/auth", "REST endpoints: POST /register, POST /login, POST /refresh, POST /logout. Sets / clears JWT cookies on response.")
        Component(authService, "AuthService", "NestJS Service", "Core auth logic: bcrypt registration, credential validation, JWT access + refresh token generation, refresh token rotation, reuse detection, account lockout after failed attempts.")
        Component(localStrategy, "LocalStrategy", "Passport Strategy", "Validates email + password via AuthService. Used by LoginGuard on POST /login.")
        Component(jwtStrategy, "JwtStrategy", "Passport Strategy", "Validates JWT access token from cookie. Attached to JwtAuthGuard (global default guard).")
        Component(jwtRefreshStrategy, "JwtRefreshStrategy", "Passport Strategy", "Validates JWT refresh token from cookie. Used only on POST /refresh.")
        Component(jwtAuthGuard, "JwtAuthGuard", "NestJS Guard", "Global default guard. Checks JWT access cookie. Skipped via @SkipAuth() decorator.")
        Component(skipAuthGuard, "SkipAuth Decorator", "Custom Decorator + Reflector", "Marks public endpoints. Causes JwtAuthGuard to allow unauthenticated requests through.")

        %% ── UserModule ────────────────────────────────────────
        Component(userController, "UserController", "NestJS Controller — /api/users", "REST endpoints: GET /me (protected), GET /:id (public), PATCH /me (protected). Never returns passwordHash or refreshTokenHash.")
        Component(userService, "UserService", "NestJS Service", "CRUD for User entity: findById, findByEmail, findByUsername, create, update. All queries via PrismaService.")

        %% ── RoomModule ────────────────────────────────────────
        Component(roomController, "RoomController", "NestJS Controller — /api/rooms", "REST endpoints: POST / (create room), GET /:slug (get by slug, public), PATCH /:id (update, owner only), DELETE /:id (end room + SFU shutdown, owner only). Owner check via JWT payload in controller.")
        Component(roomService, "RoomService", "NestJS Service", "Room lifecycle: create with random slug (6-char alphanumeric, retry-unique), find by slug/id, update, soft-delete (status=ended). Pure DB ops — no owner enforcement.")
        Component(roomCleanupService, "RoomCleanupService", "NestJS Service — background job", "Hourly interval job: hard-deletes rooms with status=ended and endedAt older than 1 hour. Implements OnModuleDestroy to clear the interval on shutdown.")

        %% ── SFUModule ─────────────────────────────────────────
        Component(sfuGateway, "SfuGateway", "Socket.io Gateway — /sfu namespace", "WebSocket event handlers for all sfu:* events. Authenticates connections via JWT cookie. Delegates to SfuService. Broadcasts new-producer and peer-left events to room peers.")
        Component(sfuService, "SfuService", "NestJS Service", "mediasoup orchestration: room creation per slug, peer registration, send/recv WebRtcTransport creation (with ICE server list), producer/consumer lifecycle, pause/resume, kick logic, room shutdown. Scales across Workers.")
        Component(workerManager, "WorkerManager", "NestJS Provider", "Manages a pool of mediasoup Worker processes (one per CPU core). Round-robin assignment of Workers to Routers. Handles Worker crashes with restart.")
        Component(sfuConfig, "mediasoup.config.ts", "Config Provider", "Builds Worker settings, Router RTP capabilities (codecs: VP8, VP9, H264, opus, PCMU, PCMA), WebRtcTransport options (listenIps, maxIncoming/OutgoingBitrate), and getIceServers() list from TURN env vars.")
    }

    ContainerDb(postgres, "PostgreSQL", "PostgreSQL 16", "Users and rooms")
    Container_Ext(socketClient, "React SPA", "Browser", "Sends REST requests and Socket.io events")

    %% Relationships — REST
    Rel(socketClient, authController, "POST /api/auth/*", "HTTP/JSON + cookies")
    Rel(socketClient, userController, "GET/PATCH /api/users/*", "HTTP/JSON + JWT cookie")
    Rel(socketClient, roomController, "GET/POST/PATCH/DELETE /api/rooms/*", "HTTP/JSON + JWT cookie")

    %% Relationships — WebSocket
    Rel(socketClient, sfuGateway, "sfu:join / transport / produce / consume / resume / kick events", "Socket.io WSS")

    %% Auth internals
    Rel(authController, authService, "register, login, refresh, logout", "method call")
    Rel(authService, userService, "findByEmail, findByUsername, create, update", "method call")
    Rel(jwtStrategy, userService, "validate token subject → user lookup", "method call")
    Rel(jwtRefreshStrategy, userService, "validate refresh token → user lookup", "method call")
    Rel(authController, jwtAuthGuard, "guarded by (global default)", "decorator")
    Rel(authController, skipAuthGuard, "@SkipAuth on register/login/refresh", "decorator")

    %% User internals
    Rel(userController, userService, "CRUD operations", "method call")

    %% Room internals
    Rel(roomController, roomService, "CRUD operations", "method call")
    Rel(roomController, sfuService, "endRoom() on DELETE /:id", "method call")
    Rel(roomCleanupService, prismaService, "deleteMany ended rooms hourly", "Prisma ORM")

    %% SFU internals
    Rel(sfuGateway, sfuService, "delegates all sfu:* event handling", "method call")
    Rel(sfuService, workerManager, "getNextWorker() for new routers", "method call")
    Rel(sfuService, sfuConfig, "reads codec / transport / ICE config", "import")
    Rel(sfuGateway, roomService, "find room by slug at join", "method call")

    %% DB access
    Rel(authService, prismaService, "user read/write", "Prisma ORM")
    Rel(userService, prismaService, "user read/write", "Prisma ORM")
    Rel(roomService, prismaService, "room read/write", "Prisma ORM")

    %% AppModule wires everything
    Rel(appModule, prismaService, "imports PrismaModule (@Global)", "NestJS DI")
    Rel(appModule, authController, "imports AuthModule", "NestJS DI")
    Rel(appModule, userController, "imports UserModule", "NestJS DI")
    Rel(appModule, roomController, "imports RoomModule (imports SfuModule)", "NestJS DI")
    Rel(appModule, sfuGateway, "imports SFUModule", "NestJS DI")
```

## Text Diagram

```
  [React SPA]
      │
      ├── HTTP/JSON + cookies ──────────────────────────────────────┐
      │                                                             │
      │   ┌──────────────────────────────────────────────────────────────────────┐
      │   │  NestJS Server                                                       │
      │   │                                                                      │
      │   │  ┌─ AppModule (root) ─────────────────────────────────────────────┐ │
      │   │  │  Global JwtAuthGuard · CORS · Cookie-Parser                    │ │
      │   │  └──┬──────────────┬──────────────┬──────────────┬────────────────┘ │
      │   │     │              │              │              │                  │
      │   │     ▼              ▼              ▼              ▼                  │
      │   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │
      │   │  │AuthModule│ │UserModule│ │RoomModule│ │     SFUModule        │  │
      │   │  │          │ │          │ │(imports  │ │                      │  │
      │   │  │Controller│ │Controller│ │SfuModule)│ │ SfuGateway (/sfu ns) │  │
      │   │  │/api/auth │ │/api/users│ │          │ │ SfuService           │  │
      │   │  │          │ │          │ │Controller│ │ WorkerManager        │  │
      │   │  │AuthService│ │UserService│ │/api/rooms│ │ mediasoup.config.ts  │  │
      │   │  │          │ │          │ │          │ │                      │  │
      │   │  │Strategies│ │          │ │RoomService│ └──────────────────────┘  │
      │   │  │Local     │ │          │ │          │                            │
      │   │  │Jwt       │ │          │ │RoomCleanup│ ← hourly job              │
      │   │  │JwtRefresh│ │          │ │ Service  │                            │
      │   │  │          │ │          │ │          │                            │
      │   │  │JwtAuth   │ │          │ │          │                            │
      │   │  │Guard     │ │          │ │          │                            │
      │   │  └────┬─────┘ └────┬─────┘ └────┬─────┘                           │
      │   │       │            │            │                                  │
      │   │       └────────────┴────────────┴──────────────────────────────────┤
      │   │                          Prisma ORM                                │
      │   │                               │                                    │
      │   │  ┌─ PrismaService (@Global) ──┘                                   │
      │   │  └───────────────────────────────────────────────────────────────  │
      │   └──────────────────────────────────────────────────────────────────┘  │
      │                               │ TCP :5432                              │
      └──────────────────────►  [PostgreSQL]                                   │
                                                                               │
      ├── Socket.io WSS /sfu ───────────────────────────────────────────────── ┘
      │         ▲ sfu:* events
      └─────────┘

Key cross-module dependency:
  RoomController → SfuService.endRoom()  (on DELETE /api/rooms/:id)
  SfuGateway     → RoomService.findBySlug() (on sfu:join)
```

## Module Breakdown

### AuthModule (`apps/server/src/auth/`)

| Component | Type | Description |
|-----------|------|-------------|
| `AuthController` | Controller | `POST /api/auth/{register,login,refresh,logout}` |
| `AuthService` | Service | bcrypt hashing, JWT generation, token rotation, lockout |
| `LocalStrategy` | Passport Strategy | email/password validation on login |
| `JwtStrategy` | Passport Strategy | access token validation (global guard) |
| `JwtRefreshStrategy` | Passport Strategy | refresh token validation on `/refresh` |
| `JwtAuthGuard` | Guard | Global default — requires valid JWT; skipped via `@SkipAuth()` |

### UserModule (`apps/server/src/user/`)

| Component | Type | Description |
|-----------|------|-------------|
| `UserController` | Controller | `GET /api/users/me`, `GET /api/users/:id`, `PATCH /api/users/me` |
| `UserService` | Service | CRUD: findById, findByEmail, findByUsername, create, update |

### RoomModule (`apps/server/src/room/`)

| Component | Type | Description |
|-----------|------|-------------|
| `RoomController` | Controller | `POST /api/rooms`, `GET /api/rooms/:slug`, `PATCH/DELETE /api/rooms/:id` |
| `RoomService` | Service | Room lifecycle: create/find/update/soft-delete; slug generation; pure DB ops |
| `RoomCleanupService` | Background Service | Hourly job — hard-deletes ended rooms older than 1h |

### SFUModule (`apps/server/src/sfu/`)

| Component | Type | Description |
|-----------|------|-------------|
| `SfuGateway` | WebSocket Gateway | `/sfu` namespace — all `sfu:*` event handlers |
| `SfuService` | Service | mediasoup orchestration: rooms, peers, transports, producers, consumers |
| `WorkerManager` | Provider | Worker pool (1 per CPU core), round-robin assignment, crash recovery |
| `mediasoup.config.ts` | Config | Codecs, transport options, `getIceServers()` (TURN env vars) |

### PrismaModule (`apps/server/src/prisma/`)

| Component | Type | Description |
|-----------|------|-------------|
| `PrismaService` | Global Service | `@Global()` — single PrismaClient injected everywhere |

## REST API Summary

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/api/auth/register` | Public | `AuthController.register` |
| `POST` | `/api/auth/login` | Public (LocalGuard) | `AuthController.login` |
| `POST` | `/api/auth/refresh` | Public (JwtRefreshGuard) | `AuthController.refresh` |
| `POST` | `/api/auth/logout` | Protected | `AuthController.logout` |
| `GET` | `/api/users/me` | Protected | `UserController.getMe` |
| `GET` | `/api/users/:id` | Public | `UserController.getById` |
| `PATCH` | `/api/users/me` | Protected | `UserController.updateMe` |
| `POST` | `/api/rooms` | Protected | `RoomController.create` |
| `GET` | `/api/rooms/:slug` | Public | `RoomController.getBySlug` |
| `PATCH` | `/api/rooms/:id` | Protected (owner check in controller) | `RoomController.update` |
| `DELETE` | `/api/rooms/:id` | Protected (owner check in controller) | `RoomController.end` → soft-delete + `SfuService.endRoom` |
