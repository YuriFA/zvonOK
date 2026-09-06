# whiteboard Delta

## Purpose

A shared canvas for every room: participants see the same board, drawing
follows a host-controlled permission switch, and the board lives in memory for
the lifetime of the room. Sync rides the room identity the join flow already
establishes, including approved guests.

## ADDED Requirements

### Requirement: Shared canvas per room
Every active room SHALL have exactly one shared whiteboard canvas. Each room
participant (registered or approved guest) SHALL be able to open the canvas
and see its current state. Canvas changes made by an allowed drawer SHALL
reach all other open canvases in the room within normal real-time latency,
and concurrent edits by different participants SHALL all appear.

#### Scenario: Two participants draw concurrently
- **WHEN** two participants with draw permission both add shapes while both canvases are open
- **THEN** both canvases end up showing both shapes

#### Scenario: Viewer without draw permission
- **WHEN** drawing is locked and a non-owner participant opens the canvas
- **THEN** the canvas renders read-only and their edit attempts are not relayed to others

### Requirement: Late joiner catches up
A participant who opens the canvas after drawing began SHALL receive the
board's current state as of their join, after which they receive live updates.
A participant re-opening the canvas in the same session SHALL see the same
current state rather than a blank board.

#### Scenario: Late joiner sees existing content
- **WHEN** a participant opens the canvas after others have drawn shapes
- **THEN** the canvas displays all previously drawn content

### Requirement: Host draw-lock switch
The room owner SHALL be able to toggle drawing between owner-only and open to
all participants. The switch SHALL default to owner-only on room creation.
The current mode SHALL be visible to every participant with the canvas open,
and changes SHALL apply live without reopening the canvas.

#### Scenario: Owner opens drawing to all
- **WHEN** the owner toggles drawing open
- **THEN** every participant's canvas becomes editable and their edits relay to the room

#### Scenario: Owner locks drawing again
- **WHEN** the owner toggles drawing back to owner-only while a guest is drawing
- **THEN** the guest's canvas turns read-only and subsequent guest edits are not relayed

### Requirement: Room-scoped authorization
Whiteboard sync SHALL only serve participants of the room: connections SHALL
carry the same room-scoped identity the join flow establishes (registered
session or approved guest), and requests from anyone else SHALL be rejected.
One participant's traffic SHALL never reach a different room's board.

#### Scenario: Unauthenticated connection rejected
- **WHEN** a socket connection without a valid room-scoped identity subscribes to a board
- **THEN** the server rejects the subscription and relays nothing

#### Scenario: Room isolation
- **WHEN** two different rooms have canvases open
- **THEN** updates in one room never appear in the other

### Requirement: Board lifetime bound to the room
The board state SHALL be held in memory only for the lifetime of its room and
SHALL NOT be persisted. When the room ends, or its last participant leaves
and room teardown runs, the board SHALL be dropped; a recreated room starts
with a blank board. Board state loss on server restart is acceptable v1
behavior.

#### Scenario: Room end clears the board
- **WHEN** the owner ends the room while the canvas has content
- **THEN** the board is discarded and no whiteboard record remains

### Requirement: Client canvas surface
The room UI SHALL offer the whiteboard as a room panel that opens beside or
over the participant grid, showing the shared canvas with drawing tools for
allowed drawers, live remote cursors or updates for viewers, and the current
draw-lock state with the owner's toggle. Opening and closing the panel SHALL
not affect the participant's media connections.

#### Scenario: Open whiteboard during a call
- **WHEN** a participant opens the whiteboard panel during an active call
- **THEN** their camera, microphone, and screen share state is unchanged

#### Scenario: Owner sees the toggle
- **WHEN** the owner has the whiteboard open
- **THEN** the panel shows the draw-lock switch in its current state
