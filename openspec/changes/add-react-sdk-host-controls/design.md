# Design: add-react-sdk-host-controls

## Context

Stage 1 change #2. The substrate exists: `@zvonok/client` (private, TS-source
exports, consumed via workspace), `/v1` with token minting, `/sfu` token join
with publish/admin claims, `sfu:kick-peer` as the only host power. The app's
room glue is `use-room-session`/`use-room-sfu` plus contexts wrapping the
client package; UI components consume those contexts.

## Goals / Non-Goals

**Goals:**
- `@zvonok/client` and `@zvonok/react` publishable to npm with built artifacts
  and types, while workspace dev stays on sources.
- Host controls (mute-peer, mute-all, lock) end to end: signalling,
  server enforcement, SDK actions, app UI - dogfooded by the app.
- Quickstart path: clean project to joined room on the VPS.

**Non-Goals:**
- UI kit / prebuilt widget (stage 2, sits on top of `@zvonok/react`).
- Webhooks, recording, REST for host controls (signalling only).
- CI-based publishing; migrating the app wholesale to a demo-style setup.

## Decisions

**D1 - `@zvonok/react` is headless; the app migrates its glue, not its UI.**
Provider + hooks over `@zvonok/client`'s sfu manager/connection and media
manager: join lifecycle, participants/tracks state, device controls, host
actions. The app's `use-room-session`/`use-room-sfu` and state contexts
rewire onto it; context public APIs stay stable so UI components are
untouched. Rejected: app stays on `@zvonok/client` only (new layer untested by
real usage, violates the reference-consumer direction); shipping a separate
demo app (dead weight for a solo dev).

**D2 - Publishing via tsc emit + `publishConfig`.** `packages/client` gains a
`tsc -p tsconfig.build.json` build emitting `dist/` (js + d.ts, ESM only).
npm-facing metadata goes under `publishConfig` (pnpm rewrites it on publish):
exports map to `dist` paths, plus `files: ["dist"]`, `license`, `repository`,
`type`. Workspace `exports` keep pointing at sources. Rejected: tsup/unbuild
(extra dependency for marginal gain); consuming built output in-repo (rebuild
loops hurt DX). `pnpm publish` is required - plain `npm publish` ignores
`publishConfig`. `@zvonok/react` is authored publish-ready from the start
(built output, peer `react` >= 18, dep `@zvonok/client`).

**D3 - Host controls reuse the existing authorization spine.** SfuService
already resolves identity per socket (user cookie / guest / token). A peer is
a "host" when: user-owned room - its userId equals the room owner; project
room - its token carries the admin claim. New events `sfu:mute-peer`,
`sfu:mute-all`, `sfu:lock-room` enforce server-side exactly like kick: check
host status, then act, else emit coded `sfu:error`. Mute pauses the target's
audio+video producers server-side and emits `sfu:peer-muted` (room) plus a
`mutedByHost` flag to the target. Mute-all iterates current publishers,
excluding the host. Lock is in-memory per-room state in SfuService (like
peers), checked in the join path before any peer creation, cleared on room
end. Rejected: REST endpoints for controls (host controls are realtime room
operations; REST adds a second auth path to secure); persisting lock in
Postgres (ephemeral control, restart = room effectively empty).

**D4 - Publish process: manual, per-package, MIT.** Versions start at 0.1.0
and bump independently; publishing is `pnpm publish --access public` per
package from a logged-in machine. Root `LICENSE` (MIT) added; assumption to
confirm at apply time. Prerequisite owned by the user: create the `@zvonok`
npm org. Documented in `docs/deployment.md`. Rejected: CI publish workflow
(one-off operational need; direct path per repo conventions).

**D5 - Quickstart targets `@zvonok/react`.** `docs/quickstart.md` walks: empty
project, install, server URL placeholder, mint room + token via curl with an
API key, run the documented React snippet, join. Platform room, admin-free
token. The vanilla `@zvonok/client` contract stays documented in the package
README-level docs later (stage 2 docs site grows from this).

## Risks / Trade-offs

- **App glue migration is the riskiest slice** - `use-room-session`/
  `use-room-sfu` are the most delicate client code. Mitigation: stable context
  APIs, existing hook/context tests must stay green untouched.
- **`publishConfig` is pnpm-specific** - documented; `npm publish` would ship
  source exports. The publish task verifies the packed tarball (`pnpm pack`)
  before the real publish.
- **Mute-all is a snapshot, not a policy** - participants publishing later are
  not auto-muted; spec says "currently publishing". Acceptable for host
  meetings; revisit with a room-level policy flag if it bites.
- **Lock state is volatile** (lost on server restart). Accepted: rooms are
  ephemeral; documented in the sfu spec scenario scope.
- **React 19 app with peer `>=18`** - React 19 satisfies the range; the
  binding uses no removed APIs.
