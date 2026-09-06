# Design: add-platform-webhooks

## Context

Stage 2 queue item 1. Tenancy exists (`DeveloperAccount`/`Project`/`ApiKey`),
project-owned rooms flow through `/v1` and the SFU token path. Emission points
already have single call sites: `SfuService.joinRoom` (peer created),
`removePeer` (single funnel for leave/kick/disconnect/room-end), `endRoom`
(notifies peers, closes router). Developer module owns project management and
already returns key material exactly once - the same UX fits webhook secrets.

## Goals / Non-Goals

**Goals:**
- Consumers receive signed room/participant events without polling.
- Delivery survives transient endpoint failures (bounded retries).
- Zero impact on user-owned rooms and the app's latency paths.

**Non-Goals:**
- Delivery persistence/replay across restarts (dashboard material, stage 3+).
- Multiple endpoints or per-event subscriptions per project.
- Webhook config UI (developer API only, like API keys today).

## Decisions

**D1 - One endpoint per project, secret visible on read.** `Project` gains
nullable `webhookUrl`/`webhookSecret`. Unlike API keys (hashed, shown once),
the server must possess the HMAC secret to sign, so it is stored as-is and
returned by `GET`-level reads too; rotation is re-`PUT`ting the URL. Rejected:
hashed storage (impossible for HMAC), per-event subscription matrix (no
consumer needs it yet).

**D2 - Four events, minimal payloads.** `room.started` (first participant
join), `participant.joined`, `participant.left` (with reason: leave | kick |
disconnect | room-end), `room.ended`. Data: `{ roomId, roomSlug,
participant?: { id, displayName }, reason? }`. `room.started` derives from
"peers count was 0 before this join" - no separate state.

**D3 - In-memory retry queue.** A `WebhookDispatcher` service holds a
per-delivery chain: attempt immediately, then up to 5 retries at 10s, 30s,
2m, 10m, 30m; 5s attempt timeout via `AbortController`; drop after exhaustion.
Non-2xx counts as failure; 2xx (including 202/204) succeeds. Restart loses
pending retries - accepted and documented in the spec; a persistent queue is
dashboard territory. Rejected: BullMQ/Redis (new infra for a v1), DB-backed
outbox (adds a table + sweeper for zero consumers today).

**D4 - Decoupled emission through an interface.** `WebhooksModule` exports
`WebhookDispatcher` with typed methods (`roomStarted`, `participantJoined`,
`participantLeft`, `roomEnded`). `SfuModule` imports it and calls at the three
funnel points; the dispatcher resolves `roomId -> room.projectId -> project`
and no-ops for user-owned rooms or unconfigured projects, off the hot path
(fire-and-forget with internal error containment - a slow endpoint must never
delay a peer join). Rejected: `@nestjs/event-emitter` (new dep for four call
sites), direct HTTP from SfuService (couples signalling to delivery).

**D5 - Native `fetch` for outbound POSTs.** Node 20 global, no dependency.
Signing: `sha256=HMAC-SHA256(secret, "{timestamp}.{rawBody}")`, raw body bytes
as sent, timestamp in seconds; both headers on every attempt including retries.

## Risks / Trade-offs

- **Restart drops pending retries** - accepted, spec'd as best-effort.
- **Slow/hanging endpoints** - bounded by the 5s timeout; queue is
  fire-and-forget, never on the join path.
- **Secret exposure** - stored in plaintext in DB (HMAC requirement), shipped
  over TLS only to authenticated developers; documented.
- **Event ordering** - per-project FIFO chain preserves emission order;
  concurrent chains across projects are independent (acceptable).
