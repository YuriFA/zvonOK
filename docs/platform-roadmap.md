# Platform Roadmap (living)

Direction and rationale: [ADR 0002](./adr/0002-adopt-developer-platform-direction.md).
Behavior source of truth: `openspec/specs/`. This file tracks the staged plan;
it changes as stages complete - it is not a spec.

## Constraints (from the 2026-09-05 design session)

Solo developer + AI agents; 1-2 months intensive for stage 1; $0 budget beyond
the year-paid VPS (5-service Docker stack, shared Traefik gateway, coturn
already deployed); repository stays open; the app stays a working product at
every step.

## Stage 1 - platform substrate (weeks 1-6) - in flight

| # | Change | Scope | Status |
|---|--------|-------|--------|
| 1 | `add-developer-platform` | Extract `@zvonok/client` into `packages/`; tenancy (`DeveloperAccount`/`Project`/`ApiKey`, nullable room ownership); public `/v1` API (rooms, end, token minting) with per-key rate limits; room-token identity path in `/sfu` | Archived 2026-09-05 |
| 2 | `add-react-sdk-host-controls` | `@zvonok/react` thin layer; host-controls through the SDK (mute-remote, mute-all, lock); npm publish `@zvonok/client` + `@zvonok/react`; quickstart doc | Archived 2026-09-05 - npm publish deferred |

**Stage 1 success bar:** from a clean project outside the monorepo, following
only the quickstart - `npm i @zvonok/client`, mint a room token via curl with
an API key, join a working video room on the VPS.

## Evaluation checkpoint - end of month 2

Decide: continue to stage 2 as queued / reprioritize / stop at platform
substrate. Criteria: success bar met, how much stage 1 actually cost, what the
dogfooded SDK taught us about the API surface.

## Stage 2 candidate queue (ordered; each item = one OpenSpec change)

1. **Webhooks** - session/participant events with signatures and retries.
2. **Recording** - local-first (`MediaRecorder`), then server-side pipeline;
   storage on VPS disk (S3 later if needed).
3. **Ephemeral TURN credentials** - HMAC auth-secret in coturn, replacing the
   static shared credentials.
4. **Docs site** - static `docs.<domain>` site via the existing Traefik
   add-a-site pattern; content grows from the quickstart.
5. **Prebuilt widget** - drop-in UI component on top of `@zvonok/react`.
6. **HLS/RTMP egress** - live streaming out of rooms.
7. **Whiteboard** - integrate before building (Yjs/tldraw class), never from
   scratch.
8. **Billing/metering** - only if the business option activates.
9. **Multi-node SFU** - multi-worker + Redis socket fan-out; revisited when
   single-node capacity is a real limit.

## Explicitly parked (not queued)

AI voice agents, developer dashboard UI, email verification/reset, OAuth/SSO,
DMs, message editing/attachments, E2E encryption, meeting history/analytics.

## Change workflow

Sequential, one change in flight: propose the next change only after the
previous one archives. Deltas are written against the code that actually exists
by then - batch-proposing future changes now would freeze guesses that rot.
