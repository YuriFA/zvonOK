# Add Whiteboard

## Why

A meeting-grade whiteboard is the next platform item (roadmap item 7). VideoSDK-class platforms ship a shared canvas in every call; zvonok rooms have none. Building one from scratch is a known failure mode, so the change integrates an existing canvas library over a thin sync transport instead of implementing drawing primitives.

## What Changes

- New server `WhiteboardModule`: a Socket.io-scoped sync channel (`whiteboard:*` events) that relays canvas operations between room participants, serves the current snapshot to late joiners, and holds it in memory per room.
- Access control: every room participant (registered or guest) can view; drawing follows a host-controlled "drawing unlocked" switch that defaults to owner-only drawing.
- Client: whiteboard panel in the room view rendering an integrated canvas library (tldraw-class), with local tool UX, remote cursors/updates, and a Join/Leave lifecycle bound to the existing room socket session.
- Room end or last-participant teardown drops the in-memory board; nothing is persisted in v1 (no DB model).
- No changes to auth, chat, room, or sfu requirements; the whiteboard rides the participant identity the room join already establishes.

## Capabilities

### New Capabilities
- `whiteboard`: shared canvas per room - sync transport, snapshot delivery to late joiners, host draw-lock, participant visibility, in-memory lifetime bound to the room.

### Modified Capabilities
<!-- none - all existing specs stay as-is -->
