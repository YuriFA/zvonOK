## MODIFIED Requirements

### Requirement: Shared canvas per room
Every active room SHALL have exactly one shared whiteboard canvas. Each room
participant (registered or approved guest) SHALL be able to open the canvas
and see its current state. Canvas changes made by an allowed drawer SHALL
reach all other open canvases in the room within normal real-time latency as
incremental updates rather than whole-board snapshots, and concurrent edits
by different participants SHALL all appear; concurrent changes to the same
element SHALL resolve deterministically by last-writer-wins on the element's
version.

#### Scenario: Two participants draw concurrently
- **WHEN** two participants with draw permission both add shapes while both canvases are open
- **THEN** both canvases end up showing both shapes

#### Scenario: Concurrent edit of the same element
- **WHEN** two participants with draw permission modify the same shape at the same time
- **THEN** every canvas converges to the same outcome determined by the element's version, and no participant sees a divergent board

#### Scenario: Viewer without draw permission
- **WHEN** drawing is locked and a non-owner participant opens the canvas
- **THEN** the canvas renders read-only and their edit attempts are not relayed to others

### Requirement: Late joiner catches up
A participant who opens the canvas after drawing began SHALL receive the
board's complete current state directly from the server-held document on
join, after which they receive live updates. A participant re-opening the
canvas in the same session SHALL see the same current state rather than a
blank board.

#### Scenario: Late joiner sees existing content
- **WHEN** a participant opens the canvas after others have drawn shapes
- **THEN** the canvas displays all previously drawn content immediately, without waiting for another participant to publish changes

### Requirement: Client canvas surface
The room UI SHALL offer the whiteboard as a room panel that opens beside or
over the participant grid, showing the shared canvas with drawing tools for
allowed drawers (freehand pen, eraser, basic shapes, text, undo/redo, and
board clear), live updates for viewers, and the current draw-lock state with
the owner's toggle. Opening and closing the panel SHALL not affect the
participant's media connections. The canvas SHALL be delivered by a swappable
engine behind the engine adapter: the room UI, sync, and authorization SHALL
NOT depend on any specific engine's API, and replacing the engine SHALL not
change panel, permission, or draw-lock behavior.

#### Scenario: Open whiteboard during a call
- **WHEN** a participant opens the whiteboard panel during an active call
- **THEN** their camera, microphone, and screen share state is unchanged

#### Scenario: Owner sees the toggle
- **WHEN** the owner has the whiteboard open
- **THEN** the panel shows the draw-lock switch in its current state

#### Scenario: Engine swap leaves the room untouched
- **WHEN** the whiteboard engine implementation is replaced with another engine conforming to the adapter
- **THEN** the panel, sync, permissions, and draw-lock behavior remain unchanged

## ADDED Requirements

### Requirement: Incremental CRDT synchronization
The whiteboard SHALL synchronize through a conflict-free replicated
document: clients exchange small updates against a shared document, and the
server SHALL hold the authoritative in-memory document per room, merge every
admitted update into it, and serve the current state plus subsequent updates
to each joined socket. The server SHALL refuse updates exceeding a per-update
size cap, and SHALL ignore updates from sockets that do not currently hold
draw permission.

#### Scenario: Small edit stays small on the wire
- **WHEN** a participant draws a single stroke on a board that already contains many shapes
- **THEN** the update sent on the wire is proportional to the edit, not to the size of the board

#### Scenario: Oversized update refused
- **WHEN** a client submits an update larger than the size cap
- **THEN** the server rejects that update and the rest of the board is unaffected

#### Scenario: Locked-out edits never reach others
- **WHEN** a participant without draw permission submits canvas updates
- **THEN** the server neither merges nor relays them, and other participants' boards are unchanged

### Requirement: Multiplayer undo
Undo and redo SHALL act on the acting participant's own actions only and
SHALL propagate to every participant's canvas. A participant SHALL NOT be
able to undo or redo another participant's actions. Any engine built-in
per-client history conflicting with these semantics SHALL be disabled.

#### Scenario: Undo is visible to everyone
- **WHEN** a participant who just drew a stroke presses undo
- **THEN** the stroke disappears from every open canvas in the room

#### Scenario: Cannot undo others
- **WHEN** a participant presses undo while the only recent action is another participant's stroke
- **THEN** the other participant's stroke remains on every canvas
