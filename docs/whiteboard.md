# Whiteboard

Every room has a shared collaborative canvas (powered by tldraw). The board
lives in memory for the lifetime of the room: opening the panel reconnects you
to the live board, and the board is dropped when the room ends or its last
participant leaves. A server restart blanks boards mid-meeting; nothing is
persisted.

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

## Architecture

- Server: `src/whiteboard/` - a Socket.io `/whiteboard` namespace mirroring
  the chat gateway's identity model (registered user via access-token cookie
  or approved guest via the room-scoped guest cookie). Registered users must
  be active SFU peers of the room (`SfuService.hasPeerInSlug`).
- Sync: clients publish their full serialized tldraw store after edits
  (throttled); the server stores the latest snapshot per room and relays it
  to the other participants, who union-merge records by id (erasures
  propagate via id-set diff). Payloads are capped (4 MB per snapshot) and
  oversized boards are refused.
- Teardown: the room board is dropped through the SfuService room-closed tap
  (the same seam the egress pipelines use), covering both room-end paths.
- Client: `src/features/whiteboard/` - `useWhiteboard` owns the socket and
  sync; `WhiteboardPanel` lazy-loads tldraw into the `vendor-tldraw` chunk
  (the bundle is 1 MB+, kept out of the critical path).

## Local smoke

With the dev stack running, open the same room in two browser profiles (one
logged-in owner, one guest), open the board in both, and draw: shapes appear
on both canvases, a third profile joining late sees existing content, and the
owner's Lock drawing flips the guest canvas to read-only instantly.
