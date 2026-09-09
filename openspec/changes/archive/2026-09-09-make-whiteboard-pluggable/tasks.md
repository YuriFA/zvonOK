# Tasks: make-whiteboard-pluggable

## 1. Scaffold

- [x] 1.1 Record ADR-0003: whiteboard engine adapter, Yjs choice, tldraw reversal
- [x] 1.2 Scaffold `packages/whiteboard-core` (package, tsconfig, vitest)
- [x] 1.3 Scaffold `packages/whiteboard-react` (package, tsconfig, vitest)

## 2. Core contracts

- [x] 2.1 Adapter contract (`WhiteboardEngine`, `WhiteboardSession`) and wire constants (`protocol.ts`)
- [x] 2.2 Yjs room helpers (`yjs-room.ts`: element map + order array)
- [x] 2.3 Client transport over structural `WhiteboardSocketLike` with pre-subscribe buffering
- [x] 2.4 Core unit tests

## 3. Server

- [x] 3.1 Gateway backed by authoritative in-memory `Y.Doc` per room
- [x] 3.2 Behavior parity: join state/mode, incremental update admission (size, permission), board teardown on room close
- [x] 3.3 Server unit tests (service + gateway)
- [x] 3.4 E2E rewrite on real sockets (convergence, late joiner, lock enforcement, rejoin)

## 4. Engine

- [x] 4.1 Excalidraw-Yjs binding (element map + order, LWW by version/versionNonce, echo and stale-snapshot guards, in-place point mutation handling)
- [x] 4.2 `Y.UndoManager` wiring with tracked local origin; engine keydown capture
- [x] 4.3 Readonly enforcement (engine view mode + server-side admission)
- [x] 4.4 Binding tests (convergence, late joiner, echo, stale snapshot, pre-attach replay, freedraw growth)
- [x] 4.5 Panel and hook (`use-whiteboard-panel`: socket lifecycle, expired-cookie recovery via host `refreshSession`, mode tracking)

## 5. Host integration

- [x] 5.1 Minimal room panel registry (`room-panels.ts`)
- [x] 5.2 Whiteboard feature onto `packages/whiteboard-react` via adapter
- [x] 5.3 Dependency swap (drop tldraw, add `@zvonok/whiteboard-react`, server `yjs`) and vite chunk rename
- [x] 5.4 Client test pass (registry + room route)

## 6. Docs

- [x] 6.1 Rewrite `docs/whiteboard.md` (user guide, ops notes)
- [x] 6.2 Roadmap note: whiteboard item points at ADR-0003 and this change

## 7. Verify

- [x] 7.1 Run all suites (packages, client, server unit, server e2e)
- [x] 7.2 Typecheck and lint clean
- [x] 7.3 Local smoke with the dev stack (owner + guest profiles): draw convergence, late joiner sees board, owner lock flips guest to read-only, undo visible on both, media unaffected while panel opens
