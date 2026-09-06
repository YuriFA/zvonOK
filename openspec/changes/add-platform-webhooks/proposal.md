# Proposal: add-platform-webhooks

## Why

Stage 2, queue item 1 (docs/platform-roadmap.md). Platform consumers currently
poll `/v1` to learn anything about their rooms; there is no push channel. Every
serious integration (CRM sync, attendance tracking, recording triggers) needs
server-to-server events. This is the standard growth lever for a CPaaS surface
and the smallest stage 2 item that makes `/v1` rooms observable.

## What Changes

1. **Webhook configuration per project**: a project gains an optional webhook
   URL and signing secret, managed through the developer module
   (`PUT /developers/projects/:id/webhooks`, `DELETE` to remove). The secret is
   server-generated and shown on set; no UI - API only.
2. **Four events, signed**: `room.started` (first participant joins a
   project-owned room), `participant.joined`, `participant.left`, `room.ended`.
   Delivery is `POST` JSON with `X-Zvonok-Timestamp` and
   `X-Zvonok-Signature: sha256=HMAC-SHA256(secret, timestamp.body)`.
3. **Retries**: failed deliveries retry up to 5 times with exponential
   backoff, then drop. In-memory queue - pending retries are lost on server
   restart (accepted tradeoff, see design D3).
4. **Scope guard**: only project-owned rooms emit events; user-owned rooms
   (the zvonok app) stay webhook-free.

## Capabilities

### New Capabilities
- `webhooks`: per-project webhook endpoints, event payload and signature
  contract, delivery with retries, and the emission points that produce
  events.

### Modified Capabilities
- `developer`: projects gain webhook configuration endpoints (ADDED
  requirement).

## Impact

- **Prisma**: `Project` gains nullable `webhookUrl`, `webhookSecret`; one
  migration.
- **apps/server/src/webhooks** (new module): dispatcher, signer, retry queue.
- **apps/server/src/sfu**: emission points in `joinRoom` (first peer =
  room.started + participant.joined), `removePeer` (participant.left), and the
  room-end paths (`room.ended`).
- **apps/server/src/developer**: webhook config endpoints + tests.
- **e2e**: local HTTP receiver asserting signatures, ordering, and retries.
- **Docs**: `docs/deployment.md` needs nothing new (no env vars); roadmap flip
  on completion.
