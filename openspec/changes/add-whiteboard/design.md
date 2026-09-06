# Design: Add Whiteboard

## Context

Rooms already have a real-time identity layer: the chat gateway (`/chat`
namespace) authenticates each socket as either a registered user (JWT cookie)
or an approved guest (`guestId` + `roomSlug` via GuestService), and room
ownership lives in `RoomService`. There is no generic pubsub channel; chat is
the only Socket.io namespace besides the SFU. The client renders rooms from
`features/room` around an `active-room-view` grid with `aside-panel` as the
side-surface precedent. Roadmap item 7 mandates integrating an existing canvas
library, not building drawing primitives.

## Goals / Non-Goals

**Goals**
- One shared board per room with live sync, catch-up on late join, and a
  host-controlled draw-lock that defaults to owner-only.
- Guests participate on the same footing as chat: view always, draw per lock.
- Board lifetime bound to the room (in memory, dropped on teardown).
- Client surface: a room panel that opens without disturbing media state.

**Non-Goals**
- Persistence, versioning, export, board templates (parked).
- Server-side conflict resolution or op log replay - the client store merges.
- Multi-board per room, board sharing across rooms, public read-only links.
- New keyboard shortcuts (would modify the keyboard-shortcuts spec; skipped).

## Decisions

### D1 - Canvas library: tldraw over excalidraw/raw Yjs

`tldraw` ships a document store with explicit `serialize`/`loadSnapshot`/
`applyDiff` entry points designed for exactly this integration shape: our
transport relays store diffs, the local store merges, and the server never
understands drawing semantics. Excalidraw's collaboration story assumes its
own Firebase stack or a custom poll layer with last-write-wins element
merging; raw Yjs means building the entire tool UX. tldraw's free tier
watermark is acceptable for an internal platform. If the React 19 peer
dependency fights Vite 7 at install time, the fallback is excalidraw with
`onChange`/`updateScene` relaying full element lists; the spec does not
change either way.

### D2 - Transport: dedicated `/whiteboard` namespace mirroring the chat gateway

Same `ClientIdentity` union and `authenticate()` mechanics as
`ChatGateway` (JWT cookie via `JwtService`, guest cookie via
`GuestService`), but room-scoped: clients must emit `whiteboard:join` with
the room slug and are admitted only if the identity's room matches and the
room is active; `RoomService` resolves the room and its owner. Events:

- `whiteboard:join` -> server replies `whiteboard:snapshot` (serialized
  store) plus `whiteboard:mode`; later ops arrive as `whiteboard:op`.
- `whiteboard:op` (client -> server): a store diff; relayed to other room
  sockets as `whiteboard:op` when the sender may draw, silently dropped
  otherwise (the client already renders read-only, so this is defense in
  depth).
- `whiteboard:mode` (owner only): `{ mode: 'owner' | 'open' }`; broadcast
  to the room.

Room isolation is enforced by tracking each socket's admitted room slug and
broadcasting within that room only. A second `whiteboard:join` re-sends the
current snapshot (re-open case).

### D3 - Server state: dumb snapshot holder, no op log

`WhiteboardService` keeps `Map<roomSlug, { snapshot: string; mode: 'owner' |
'open' }>` where `snapshot` is the latest full serialized store, refreshed by
merging relayed diffs server-side via the same snapshot semantics the client
uses (tldraw store diff application; server stays library-coupled but state
stays small - one snapshot, not a log). Op payloads are size-capped (256 KB
per op, 4 MB per snapshot) to bound memory; exceeding the cap closes the
offending socket. Guards on the snapshot endpoint prevent unbounded growth.

### D4 - Teardown: hook the same two room-end paths as egress

`SfuService` teardown is the single funnel for both room-end flows; the
whiteboard registers a tap there (the seam added for egress) to drop the
room's board on `teardownRoom`. Server restart losing boards is accepted
spec behavior, so no reconcile pass is needed.

### D5 - Client surface: `features/whiteboard` panel in the room view

`WhiteboardProvider` (feature context, lazy-loads the tldraw bundle on first
open) exposes `{ open, setOpen, mode, toggleMode }`. `active-room-view`
renders the panel as a full-height overlay beside the grid (aside-panel
pattern); a "Board" button lands in the room center controls. Editing
enabled = `mode === 'open' || isOwner`, resolved from the room context the
view already has. The panel mounts/unmounts its own `/whiteboard` socket
connection on open/close; media connections never touch it.

### D6 - Owner determination on the socket

The gateway resolves ownership at `whiteboard:join` time via `RoomService`
(room owner userId vs authenticated userId; guests are never owners) and
re-checks on each `whiteboard:mode` emit, so a demoted or ended-room owner
cannot flip the lock with a stale session.

## Risks / Trade-offs

- **tldraw bundle weight** (~1 MB+) - mitigated by lazy-loading on first
  panel open; pre-join and call join paths unaffected.
- **Server snapshot merge keeps the library server-side** - acceptable
  because the server already bundles heavy native deps; if this becomes a
  pain, the snapshot can move to "last writer publishes full snapshot"
  without contract changes.
- **No persistence** - a refresh mid-meeting loses nothing (snapshot
  re-fetched), but a server restart blanks boards mid-meeting; spec'd and
  communicated.
- **Diff relay is trust-the-client for shape** - size caps bound abuse;
  malformed diffs fail the sender's store merge and are dropped before
  relay.

## Open Questions

None - library fallback (D1) and restart loss (D4) are decided behaviors.
