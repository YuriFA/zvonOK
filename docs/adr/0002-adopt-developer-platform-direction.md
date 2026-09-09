# ADR 0002: Adopt the developer-platform direction (VideoSDK-style)

> **Status:** accepted
> **Date:** 2026-09-05

## Context

Zvonok is a working end-user WebRTC application (specs: auth, user, room, chat,
sfu, client; mediasoup SFU with simulcast on a single node; coturn deployed on
the VPS behind the shared Traefik gateway). A design session on 2026-09-05
settled the constraints: motivation is portfolio/learning with a business option
later; the executor is a solo developer with AI agents; the horizon is 1-2
months intensive; the budget is $0 beyond the year-paid VPS; the repository
stays open. Three directions were weighed: (A) a developer platform (CPaaS -
SDK + public API + tenancy), (B) end-user feature parity (a Meet-like app with
more features), (C) an internal-only SDK layer.

## Decision

Direction **A**, with the current app as the platform's first consumer
(dogfooding):

- Headless SDK first: vanilla `@zvonok/client` core extracted from the app's
  framework-free `lib/`, then a thin `@zvonok/react`; a prebuilt drop-in widget
  comes later, never first.
- Real tenancy from day one (`DeveloperAccount` / `Project` / `ApiKey`), without
  email flows or billing - retrofitting tenancy is the classic platform mistake.
- The application remains a working product at every step; the package
  restructure changes no runtime behavior (big-bang restructure in a branch is
  acceptable because the deployed app is the safety net).
- Changes flow sequentially through OpenSpec: one change in flight; the next is
  proposed only after the previous archives.
- Stage 1 success bar: the author plays an external developer from a clean
  project - `npm install` the SDK, mint a room token via curl with an API key,
  join a room on the VPS, following only the quickstart.

## Alternatives considered

- **B - end-user feature parity** - lower portfolio and learning value per
  month for a solo builder; most of it falls out of A anyway as SDK features.
- **C - internal SDK layer only** - premature abstraction without a second
  consumer; violates the repo's own no-single-use-abstraction rule.
- **Stay app-only** - lowest ceiling; forfeits the business option.

## Consequences

- Stage 1 is in flight as change `add-developer-platform` (package extraction,
  tenancy, `/v1` API, room tokens), followed by a separate change for
  `@zvonok/react` + host-controls + npm publish + quickstart. See
  `docs/platform-roadmap.md` for the staged plan and the stage-2 queue.
- Deferred risks accepted knowingly: the app join path still trusts
  client-supplied identity (the room-token path is the first verified identity
  source; migrating the app onto tokens is future hardening), SFU remains
  single-node.
