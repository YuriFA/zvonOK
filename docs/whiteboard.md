# Whiteboard

Every room has a shared collaborative canvas (Excalidraw behind the engine
adapter). The board lives in memory for the lifetime of the room: opening the
panel reconnects you to the live board, and the board is dropped when the room
ends or its last participant leaves. A server restart blanks boards
mid-meeting; nothing is persisted.

## Using the board

- **Open**: press the board button in the room's right controls. The canvas
  opens over the participant grid; your camera, microphone, and screen share
  are unaffected.
- **Draw permission** follows the host lock:
  - `Host-only drawing` (default) - only the room owner can draw; everyone
    else sees a live read-only canvas.
  - `Drawing open` - every room participant (including approved guests) can
    draw.
- The owner toggles the lock from the board header; the change applies live
  to every open board.
- **Undo/redo** reverts your own actions and propagates to every participant.
  Nobody can undo someone else's action.

## Architecture

- **Engine adapter** (`packages/whiteboard-core`): the room UI, sync, and
  authorization know the canvas only through the `WhiteboardEngine` interface.
  The engine owns its document model; the host injects an opaque byte
  transport. Replacing or adding an engine never touches the room view, the
  gateway, or the permissions.
- **Default engine** (`packages/whiteboard-react`): upstream Excalidraw (MIT)
  bound to a Yjs document - `Y.Map` of elements by id (last-writer-wins by
  element `version`), `Y.Array` preserving z-order, multiplayer undo through
  `Y.UndoManager` with Excalidraw's built-in per-client history disabled.
- **Server** (`src/whiteboard/`): a Socket.io `/whiteboard` namespace mirroring
  the chat gateway's identity model (registered user via access-token cookie
  or approved guest via the room-scoped guest cookie; registered users must
  be active SFU peers). The gateway holds the authoritative in-memory
  `Y.Doc` per room: joins receive the full document state
  (`whiteboard:state`), updates are merged after admission and draw-permission
  checks and relayed to the room (`whiteboard:update`, binary Yjs updates,
  capped per message). Updates from locked-out participants are dropped
  server-side in addition to the read-only canvas.
- **Teardown**: the room board is dropped through the SfuService room-closed
  tap (the same seam the egress pipelines use), covering both room-end paths.
- **Room UI**: the whiteboard registers in the room panel registry
  (`apps/client/src/features/room/room-panels.ts`); `active-room-view` renders
  registered panels generically and imports no panel internals. The engine
  bundle (1 MB+) is lazy-loaded through the `vendor-excalidraw` chunk only
  when the panel opens.

## Local smoke

With the dev stack running, open the same room in two browser profiles (one
logged-in owner, one guest), open the board in both, and draw: strokes appear
on both canvases, a third profile joining late sees existing content, and the
owner's Lock drawing flips the guest canvas to read-only instantly. Undo on
one canvas removes that participant's stroke on both.

## Decision record

The engine adapter, the Yjs sync, and the removal of tldraw (license change
of Sep 2025 removed free production use) are documented in
`docs/adr/0003-whiteboard-engine-adapter-yjs.md`.
