# Proposal: make-whiteboard-pluggable

## Why

tldraw's license change (v4.0, Sep 2025) removed free production use entirely: the tldraw ^5.4.0 dependency already in the repo cannot legally ship to a production deployment without a paid key (last public price anchor $6,000/yr, now unpublished "value-based"), and without a key the editor stops rendering after five seconds (research: `docs/research/embeddable-whiteboard-chat-plugins.md`). At the same time the product direction is a constructor-style client where room capabilities (whiteboard now, chat later) are isolated widgets with shared auth - which the current tldraw-embedded feature cannot serve.

## What Changes

- **BREAKING** (wire): the `/whiteboard` Socket.io namespace switches from full-snapshot relay (`whiteboard:op` / `whiteboard:snapshot` carrying serialized tldraw stores) to Yjs updates over y-protocols sync messages against a server-held `Y.Doc`.
- Remove tldraw from the repository entirely (dependency, `vendor-tldraw` chunk, snapshot relay protocol, tests). No license is purchased; the possibility of a tldraw engine later is preserved by the adapter interface, not by carried code.
- Replace the engine with upstream Excalidraw (MIT) behind a new `WhiteboardEngine` adapter: the host knows engines only through the interface; each engine is a lazy-loaded module owning its document model.
- **BREAKING** (undo semantics): Excalidraw's built-in undo is disabled and replaced with `Y.UndoManager` scoped to local origins - undo reverts the user's own actions and propagates to all participants.
- Sync becomes CRDT-based: clients exchange small Yjs updates; the NestJS gateway holds one in-memory `Y.Doc` per room, merges updates, answers late joiners directly, and drops the doc through the existing room-closed tap. Per-update byte cap replaces the 4 MB snapshot cap. Element-level conflict resolution is last-writer-wins by Excalidraw `version`/`versionNonce`; property-level merging is explicitly out of scope.
- New pnpm workspace packages following the `client`/`react` precedent: `@zvonok/whiteboard-core` (framework-free: engine interface, Yjs provider over Socket.io, wire types; consumed by both apps/client and apps/server) and `@zvonok/whiteboard-react` (Excalidraw engine + panel UI + hook; consumed by apps/client). Publishing to npm is deferred with the parked SDK publish decision.
- Room UI gains a minimal panel registry (id, icon, title, lazy component, injected room context: room slug, identity, permissions); the whiteboard becomes its first registrant, and apps/client stops importing whiteboard internals directly.
- Boards remain ephemeral (in-memory, room lifetime, no persistence, no Prisma changes); host draw-lock, room-scoped authorization, guest admission, and the panel UX are unchanged in behavior.
- ADR-0003 records the decision (and the reversal of the roadmap principle "integrate before building, never from scratch"); `docs/whiteboard.md`, README, and `docs/platform-roadmap.md` are updated with it.

## Capabilities

### New Capabilities

(none - the change reworks the existing whiteboard capability and adds one client-side requirement)

### Modified Capabilities

- `whiteboard`: sync requirement rewritten from snapshot relay to Yjs CRDT with a server-held doc; engine neutrality requirement added (canvas surface delivered by any engine conforming to the adapter); undo requirement specified as multiplayer (own actions, propagated); wire events and payload caps change; late-joiner, draw-lock, authorization, and lifetime requirements carry over unchanged.
- `client`: new requirement for a room panel registry through which room panels (whiteboard first) are registered and mounted with injected room context; the whiteboard feature consumes the new `@zvonok/whiteboard-*` packages instead of a hardcoded engine.

## Impact

- **apps/server**: `src/whiteboard/` gateway and service rewritten - Y.Doc map keyed by room, y-protocols sync/awareness handling, admission-gated update acceptance (updates from sockets without draw rights are dropped), update size cap, existing room-closed teardown reused; `whiteboard.types.ts` replaced. New deps: `yjs` (+ transitive `lib0`). Unit tests and `test/whiteboard.e2e-spec.ts` rewritten for the new protocol.
- **apps/client**: `src/features/whiteboard/` rewritten onto the engine adapter and panel registry; `active-room-view.tsx` panel wiring goes through the registry; `vite.config.ts` manual chunk `vendor-tldraw` becomes `vendor-excalidraw`. Deps: remove `tldraw`, add workspace packages; Excalidraw assets self-hosted (`EXCALIDRAW_ASSET_PATH`).
- **packages**: new `packages/whiteboard-core` and `packages/whiteboard-react` mirroring existing package configs (source exports in dev, `publishConfig` for later, `workspace:*` cross-deps, colocated vitest).
- **Docs**: `docs/whiteboard.md` (architecture section, "powered by tldraw" line), README feature description, `docs/platform-roadmap.md` note, new `docs/adr/0003-whiteboard-engine-adapter-yjs.md`.
- **Compatibility**: the `/whiteboard` namespace protocol has no external consumers (in-repo client only, not part of the published SDK), so the breaking wire change ships atomically with the client.
