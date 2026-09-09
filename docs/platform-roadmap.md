# Platform Roadmap (living)

Direction and rationale: ADR 0002 (`docs/adr/0002-adopt-developer-platform-direction.md` in the repository).
Behavior source of truth: `openspec/specs/`. This file tracks the staged plan;
it changes as stages complete - it is not a spec.

## Constraints (from the 2026-09-05 design session)

Solo developer + AI agents; 1-2 months intensive for stage 1; $0 budget beyond
the year-paid VPS (5-service Docker stack, shared Traefik gateway, coturn
already deployed); repository stays open; the app stays a working product at
every step.

## Stage 1 - platform substrate (weeks 1-6) - complete

| # | Change | Scope | Status |
|---|--------|-------|--------|
| 1 | `add-developer-platform` | Extract `@zvonok/client` into `packages/`; tenancy (`DeveloperAccount`/`Project`/`ApiKey`, nullable room ownership); public `/v1` API (rooms, end, token minting) with per-key rate limits; room-token identity path in `/sfu` | Archived 2026-09-05 |
| 2 | `add-react-sdk-host-controls` | `@zvonok/react` thin layer; host-controls through the SDK (mute-remote, mute-all, lock); npm publish `@zvonok/client` + `@zvonok/react`; quickstart doc | Archived 2026-09-05; published to npm 2026-09-09 |

**Stage 1 success bar:** from a clean project outside the monorepo, following
only the quickstart - `npm i @zvonok/client`, mint a room token via curl with
an API key, join a working video room on the VPS.

## Evaluation checkpoint - end of month 2

Decide: continue to stage 2 as queued / reprioritize / stop at platform
substrate. Criteria: success bar met, how much stage 1 actually cost, what the
dogfooded SDK taught us about the API surface.

Status as of 2026-09-08: the stage 2 queue is fully implemented and the live
deployment was retested by the owner (ephemeral TURN credentials, the produce
race fix, and call recording all verified working); the developer dashboard
UI, meeting history/analytics, and the recording canvas/layout polish shipped
after the checkpoint review.

Checkpoint closed 2026-09-09: passed by owner decision. `@zvonok/client`
0.1.2 and `@zvonok/react` 0.1.1 are live on npm and verified installable from
a clean external project; the live-room walkthrough of the quickstart was
explicitly waived for now and can be run any time against the deployment.
The app-identity hardening change is next in the sequential one-change queue.

## Stage 2 candidate queue (ordered; each item = one OpenSpec change)

1. **Webhooks** - session/participant events with signatures and retries. Implemented in `add-platform-webhooks` (archived 2026-09-06).
2. **Recording** - shipped across three changes: local-first slice
   (`add-local-recording`), full-call recording
   (`record-full-call`), and server-side recording to VPS disk
   (`add-egress-recording`, all archived 2026-09-07; S3 later if needed).
3. **Ephemeral TURN credentials** - HMAC auth-secret in coturn, replacing the
   static shared credentials. Implemented in `add-ephemeral-turn-credentials`
   (archived 2026-09-06).
4. **Docs site** - static `docs.<domain>` site via the existing Traefik
   add-a-site pattern; content grows from the quickstart. Implemented in
   `add-docs-site` (2026-09-06).
5. **Prebuilt widget** - drop-in UI component on top of `@zvonok/react`.
   Implemented in `add-prebuilt-widget` (2026-09-06).
6. **HLS/RTMP egress** - live streaming out of rooms. Implemented in
   `add-hls-rtmp-egress` (2026-09-06).
7. **Whiteboard** - integrate before building (Yjs/tldraw class), never from
   scratch. Implemented in `add-whiteboard` (2026-09-06); the "never build"
   principle was later reversed for the thin Excalidraw-Yjs binding after
   tldraw's license change - see ADR-0003 and change
   `make-whiteboard-pluggable` (2026-09-08).
8. **Billing/metering** - only if the business option activates.
9. **Multi-node SFU** - multi-worker + Redis socket fan-out; revisited when
   single-node capacity is a real limit.

## Explicitly parked (not queued)
AI voice agents, email verification/reset, OAuth/SSO, DMs, message
editing/attachments, E2E encryption. (Recording canvas/layout polish from the
2026-09-07 live retest shipped 2026-09-08: composited-layout fixes,
the active-speaker ring, and the mic-toggle audio-race fix.)

## Change workflow

Sequential, one change in flight: propose the next change only after the
previous one archives. Deltas are written against the code that actually exists
by then - batch-proposing future changes now would freeze guesses that rot.
