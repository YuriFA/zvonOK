## Why

Zvonok is an end-user application; the agreed goal is a VideoSDK-style developer platform built on the existing mediasoup SFU core, with the current app remaining a working product and becoming the platform's first consumer. This change is stage 1 of that program: the platform substrate - extractable client SDK package, developer tenancy, a public REST surface authenticated by API keys, and ephemeral room tokens that let third-party clients join SFU rooms without zvonok user accounts.

## What Changes

- **Package extraction**: move the framework-free client core (`apps/client/src/lib/` - SfuManager, media, screen-share, audio modules) into `packages/client` published in-workspace as `@zvonok/client`; `apps/client` consumes it via the workspace. No runtime behavior change; package build is structured for a future public npm publish (publishing itself is out of scope).
- **Tenancy models (Prisma)**: new `DeveloperAccount`, `Project`, `ApiKey` models; `Room` gains optional project ownership (`projectId` nullable, `ownerId` becomes nullable for platform-created rooms). Existing app rooms are unaffected.
- **Developer module (new)**: developer registration/login with username + password (no email verification, no reset flow), and a CLI seed script for bootstrapping the first developer account. No dashboard UI - Swagger plus the CLI are the management surface.
- **Public REST API v1 (new)**: `/v1` routes authenticated by `Authorization: Bearer <apiKey>`; `POST /v1/rooms`, `GET /v1/rooms`, `POST /v1/rooms/:id/tokens` (mints a short-lived room token carrying participant identity and permissions); per-API-key rate limiting separate from the global user-facing throttles.
- **Room tokens in SFU (modified)**: the `/sfu` namespace `join` accepts an ephemeral room token as a third identity path alongside existing cookie-JWT users and guests; when a token is presented, identity and permissions come from the verified token instead of the client payload. The existing app and guest flows are unchanged.
- **Out of scope (later changes)**: webhooks, recording, HLS/RTMP, billing, dashboard UI, `@zvonok/react` layer, host-controls, npm publishing, multi-node SFU, ephemeral TURN credentials.

## Capabilities

### New Capabilities

- `developer`: developer accounts, projects, and API keys - registration, login, credential issuance and revocation, CLI seeding.
- `platform-api`: the public versioned REST surface - API-key authentication, per-key rate limits, room creation/listing, and room-token minting for third-party participants.

### Modified Capabilities

- `room`: rooms may be owned by a project (platform-created rooms without a zvonok user host) in addition to the existing user-owned flow; lifecycle rules for project rooms.
- `sfu`: `sfu:join` gains the room-token identity path - verification, derived identity/permissions, and precedence when a token is presented.
