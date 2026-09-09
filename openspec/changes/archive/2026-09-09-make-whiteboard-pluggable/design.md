# Design: make-whiteboard-pluggable

## Context

The whiteboard today is a tldraw ^5.4.0 feature baked into `apps/client/src/features/whiteboard/` with a snapshot-relay protocol: clients publish their full serialized tldraw store (throttled, 4 MB cap) over the `/whiteboard` Socket.io namespace, the NestJS gateway (`src/whiteboard/`) is a dumb in-memory holder/relayer, receivers union-merge records by id. Draw-lock mode (`owner` | `open`) lives beside the snapshot in gateway memory; teardown rides the SfuService room-closed tap. Authorization reuses the room identity model (JWT cookie or guest room cookie, SFU-peer admission). Motivation for replacing the engine and the licensing analysis: see `proposal.md` and `docs/research/embeddable-whiteboard-chat-plugins.md`.

The repo already has a package pattern to copy: `packages/client` (framework-free core) + `packages/react` (React binding, `publishConfig` for later publishing, `workspace:*` cross-deps, colocated vitest). No external consumer exists for the `/whiteboard` namespace, so the protocol can break atomically.

## Goals / Non-Goals

**Goals:**

- Engine swap (tldraw out, upstream Excalidraw in) with zero room-UI behavior change beyond the sync model.
- The room host, sync, and authorization know engines only through an adapter interface.
- Yjs CRDT sync from day one: server-held doc, deltas on the wire, immediate late-joiner state.
- Package layout that a future chat widget (and a future tldraw engine, if ever licensed) can join without redesign.

**Non-Goals:**

- Persistence of boards (stays in-memory, room lifetime, restart blanks - unchanged).
- Property-level concurrent merge (element-level LWW by `version`/`versionNonce` is the accepted ceiling).
- Live cursors / awareness presence.
- Publishing the new packages to npm (deferred with the parked SDK publish decision).
- A generic widget/plugin SDK or chat migration (separate change + separate ADR when a second widget moves).
- Separate repositories for the packages (trigger-based later: external consumer or license isolation).

## Decisions

### D1: Two workspace packages, mirroring `client`/`react`

- `@zvonok/whiteboard-core`: framework-free. Engine adapter interface, transport interface, wire event names/payload types, the Yjs provider (Y.Doc + update encode/apply helpers over an injected Socket.io socket), shared constants (update cap). Consumed by `apps/server` (gateway) and by `whiteboard-react`. Peer dep: `socket.io-client` types only on the client side; the server consumes only the wire types and Yjs helpers.
- `@zvonok/whiteboard-react`: React 19 peer dep. The Excalidraw engine (lazy `import()` of `@excalidraw/excalidraw`), the Yjs binding, `Y.UndoManager` wiring, the whiteboard panel component and its hook. Consumed by `apps/client`.

Alternative: one package with subpath exports - rejected: the server must never pull React/Excalidraw transitively; the split encodes that boundary in the dependency graph, same as `client`/`react`.

### D2: Engine adapter - engine owns the document model, host injects transport

```ts
// @zvonok/whiteboard-core (illustrative)
export interface WhiteboardSession {
  setReadonly(readonly: boolean): void;
  dispose(): void;
}
export interface WhiteboardTransport {
  /** Send a Yjs update (Uint8Array) for the room doc. */
  sendUpdate(update: Uint8Array): void;
  /** Apply a remote Yjs update. */
  onUpdate(cb: (update: Uint8Array) => void): () => void;
  /** Receive initial state (full update) after join. */
  onState(cb: (state: Uint8Array) => void): () => void;
}
export interface WhiteboardEngine {
  readonly id: string;
  mount(container: HTMLElement, opts: {
    transport: WhiteboardTransport;
    canDraw: boolean;
    onCanDrawChange(cb: (canDraw: boolean) => void): void;
  }): Promise<WhiteboardSession>;
}
```

The Yjs doc itself is created and owned inside the engine binding (it is the engine's document model); the transport is dumb bytes. This is what keeps the server engine-agnostic: it relays and stores opaque Yjs updates.

Alternative: doc owned by core, engine renders it - rejected: it would force a shared element schema across engines (a second, worse wire contract) and couples engines to each other's data model.

### D3: Yjs over the existing namespace; server-held doc; minimal event protocol

Reuse `/whiteboard` with its auth/admission/teardown untouched. The gateway keeps `Map<roomId, { doc: Y.Doc, mode }>` and implements a minimal protocol instead of raw y-protocols sync steps:

- `whiteboard:join { roomSlug }` (unchanged): admission as today; server replies `whiteboard:state` with `Y.encodeStateAsUpdate(doc)` (binary), then `whiteboard:mode`.
- `whiteboard:update` (client → server): `Uint8Array` Yjs update. Server: if socket lacks draw permission (mode `owner` and not owner) → ignore; if `byteLength > WHITEBOARD_UPDATE_MAX_BYTES` → reject with `whiteboard:error`; else apply to the room doc and broadcast to other joined sockets.
- `whiteboard:mode` toggle flow unchanged.

Socket.io carries `Uint8Array` natively (binary frames), no base64. Late joiners get full state from the server doc immediately; reconnect re-joins and re-syncs the same way.

Alternatives: full y-protocols sync step 1/2 with state-vector diffs (rejected for v1: more round trips and edge cases; full-state-on-join is correct because Yjs updates are idempotent and commutative, and boards are small and ephemeral); a separate y-websocket server (rejected: second WS surface, duplicate auth); `y-socket.io` dependency (rejected: community, unmaintained risk; our provider is ~100 lines).

### D4: Excalidraw binding - element-level Y.Map, LWW by version

Inside `whiteboard-react`: a `Y.Map<id, serialized element>` per board. On local change (`onChange`), diff Excalidraw's elements against the Y.Map: new/changed elements (by `version`/`versionNonce`) become `Y.Map.set`, removals become `Y.Map.delete`; each change wrapped in a `Y.UndoManager`-tracked transaction tagged with the local client origin. On remote `Y.Map` observation: rebuild the element array and apply via `updateScene({ elements })`, reconciling through `restoreElements` with `localElements` (preserves version bookkeeping) and `refreshDimensions: false` (documented requirement for collaboration loops). Conflict rule: when the same element id changed in two places, the higher `(version, versionNonce)` wins - one side's `set` overwrites the other; CRDT ordering makes every replica converge to the same value.

Alternatives: `@excalidraw-yjs/excalidraw` fork (property-level CRDT but a hard fork: own wire format, drift from upstream, contradicts "standard engine behind adapter"); `y-excalidraw` (stale, pins Excalidraw ^0.17); snapshot relay as excalidraw.com does (superseded by the Yjs decision).

### D5: Undo - Y.UndoManager with local origin, built-in history disabled

Excalidraw's built-in undo/redo is per-client and undocumented against external updates; community-proven practice is to hide it and drive `Y.UndoManager`. The binding creates `new Y.UndoManager(yMap, { trackedOrigins: new Set([LOCAL_ORIGIN]) })`; panel controls (or keyboard through the panel) call undo/redo on it. Because undo emits inverse operations into the shared doc, it propagates to everyone; tracked origins ensure only local actions are undone.

### D6: Readonly enforcement is dual

Engine applies `viewModeEnabled`-equivalent readonly when `canDraw` is false (mode events unchanged), and the server independently ignores `whiteboard:update` from non-admitted sockets (D3). The server check is the security boundary; the engine check is UX. Spec scenario "Locked-out edits never reach others" is pinned by the server side.

### D7: Panel registry in the host

`apps/client` gets a small `RoomPanelDescriptor` registry (id, title, icon, `lazy()` component) plus a room-context injector (room slug, identity, permission flags); `active-room-view.tsx` renders aside panels from the registry instead of importing `WhiteboardPanel`. The whiteboard feature module registers its descriptor; the whiteboard package owns everything below the descriptor. Auth stays host-owned.

### D8: Bundle and assets

`vite.config.ts`: `vendor-tldraw` chunk becomes `vendor-excalidraw` (engine stays out of the critical path; the registry entry is `lazy()`). Excalidraw fonts/assets are self-hosted via `EXCALIDRAW_ASSET_PATH` (no CDN dependency), matching the self-hosted product posture.

## Risks / Trade-offs

- [Binding complexity: the onChange↔Y.Map diff loop and remote reapply] → Isolated inside `whiteboard-react` with a dedicated vitest suite driving two bound docs against one transport double: convergence, same-element LWW, delete propagation, undo propagation, readonly. No Excalidraw rendering needed in tests (binding logic operates on element arrays).
- [`reconcileElements` is exported but undocumented] → Primary application path uses the documented `restoreElements` (`localElements`, `refreshDimensions: false`); `reconcileElements` only if restore proves insufficient during implementation - decision recorded in the package tests.
- [Undo edge cases (redo ordering, rapid interleaving)] → Y.UndoManager tracked-origin pattern; e2e pins "undo propagates" and "cannot undo others"; exotic redo interleavings accepted as v1 behavior.
- [Remote update storms re-rendering the scene] → Coalesce observed Y.Map changes with a microtask-flushed batch before one `updateScene`; boards are room-scoped and short-lived, so volume is bounded.
- [Excalidraw 0.x churn] → Engine dependency pinned in `whiteboard-react` only; adapter isolates the host; upgrades are package-local.
- [Server memory growth from Y.Docs] → Same lifecycle as today's boards: dropped on room close via the existing tap; per-update cap bounds single-message abuse; doc count equals active rooms.
- [Binary frames through proxies] → Socket.io websocket transport carries binary natively (already used for nothing today, but standard); e2e runs through the real HTTP server, catching encoding issues.

## Migration Plan

Atomic cutover in this one change: server gateway/protocol, client feature, packages, docs, tests all land together; no external consumers exist for the namespace and no production deployment carries the whiteboard yet. Rollback = revert the merge commit; no data or schema migration involved (boards were and stay ephemeral).
