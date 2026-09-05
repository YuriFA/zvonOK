# Proposal: add-react-sdk-host-controls

## Why

Stage 1, change #2 (docs/platform-roadmap.md). Change #1 delivered the platform
substrate - tenancy, `/v1`, token join - but everything still lives only inside
the monorepo: `@zvonok/client` is `private: true`, exports point at TS sources,
and no host controls exist beyond kick. The stage 1 success bar (clean project,
`npm i`, curl-minted token, working room on the VPS) is unreachable until the
packages are published and documented. ADR 0002 keeps the app as the SDK's
reference consumer, so the new surface must be dogfooded, not just shipped.

## What Changes

1. **`@zvonok/client` becomes publishable.** A build step emits `dist/` JS +
   `.d.ts`; npm-facing `publishConfig` swaps the TS-source export map for
   `dist` ones while workspace dev keeps consuming sources; `files`, `license`,
   and repository metadata added. No API changes.
2. **New `@zvonok/react` package** - thin, headless React layer over
   `@zvonok/client`: config provider, connection/join lifecycle,
   participants-and-tracks state, device controls, and host-control actions.
   The app's room-session glue (hooks/contexts) migrates onto it; UI
   components are untouched.
3. **Host controls through the signalling layer**: `sfu:mute-peer`,
   `sfu:mute-all`, `sfu:lock-room` server events with server-side enforcement.
   Authorization follows the existing identity matrix - user-room host via
   cookie-JWT, project-room admin via room token. Targets receive feedback
   (`muted by host`), a locked room refuses new joins.
4. **npm publish** of `@zvonok/client` and `@zvonok/react` (public access,
   manual `pnpm publish`; requires the `@zvonok` npm org).
5. **Quickstart doc** (`docs/quickstart.md`): clean external project, install,
   API key, curl token mint, join a room on the VPS.

## Capabilities

### New Capabilities
- `sdk`: The externally consumable SDK surface - `@zvonok/client` public
  contract, `@zvonok/react` API, package publish artifacts, and the quickstart
  path from a clean project.

### Modified Capabilities
- `sfu`: Owner powers extended beyond kick - remote mute, mute-all, room lock -
  with the same host/admin authorization; lock gates the join path for all
  identity types.
- `client`: The app exposes host controls (mute one/all, lock) to the host or
  token-admin and shows muted-by-host state.

## Impact

- **packages/client**: build tooling (tsc emit + d.ts), package.json metadata;
  zero source changes expected.
- **packages/react** (new): depends on `@zvonok/client`, peer-depends on
  `react` >= 18.
- **apps/client**: room-session hooks/contexts rewire to `@zvonok/react`;
  small UI additions for host controls and muted-by-host badges.
- **apps/server/src/sfu**: gateway messages, service enforcement, interface
  types, unit tests; e2e extension for lock/mute paths.
- **docs**: `docs/quickstart.md` (new), `docs/deployment.md` (publish notes),
  roadmap status flip.
- **External prerequisite**: `@zvonok` npm org owned by the user; npm login on
  the publishing machine.
