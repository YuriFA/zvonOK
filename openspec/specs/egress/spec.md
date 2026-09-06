# Egress Specification

## Purpose

Server-side egress: broadcast a live project room's media out of the SFU to
RTMP endpoints and/or as a served HLS live playlist, with a supervised
lifecycle, project-scoped ownership, and room-end teardown.

## Requirements
### Requirement: Start egress for a project room
A platform consumer SHALL start an egress session for one of its project's
active rooms with at least one output: one to three RTMP(S) endpoints
(`rtmp://` or `rtmps://`) and/or local HLS output. The session SHALL be
recorded as belonging to the key's project. Requests for another project's
room SHALL respond 404; requests for an ended room, with no outputs, or with
invalid endpoint URLs SHALL respond 400; a second concurrent active session
for the same room SHALL respond 409.

#### Scenario: Start RTMP and HLS egress
- **WHEN** a valid key starts egress with one RTMP endpoint and HLS enabled for its project's active room
- **THEN** a session is created with a unique id, the requested outputs, and an initial status of `starting`

#### Scenario: Second active egress refused
- **WHEN** a key starts egress for a room that already has an active session
- **THEN** the server responds 409 and the existing session is unaffected

#### Scenario: Invalid RTMP target rejected
- **WHEN** egress is requested with a URL whose scheme is neither rtmp nor rtmps
- **THEN** the server responds 400 and no session is created

### Requirement: Egress media program
While a session is live, the server SHALL produce a continuous program from
the room's live media: all participants' audio mixed together, and published
video composited into a single video canvas (the active screen share shown in
place of camera tiles while one exists). The program SHALL reflect room
membership changes within a bounded update window, during which a brief
output interruption is acceptable. A room with no video producers SHALL still
produce a valid audio-only program.

#### Scenario: Late participant is included
- **WHEN** a participant starts publishing after the egress session went live
- **THEN** the program reflects the new participant within the bounded update window

#### Scenario: Audio-only room
- **WHEN** egress runs on a room where no participant publishes video
- **THEN** the output remains a valid program carrying the mixed audio

#### Scenario: Screen share replaces camera canvas
- **WHEN** a participant shares their screen during a live session
- **THEN** the composited video shows the screen share while it lasts

### Requirement: RTMP output
For each configured RTMP(S) endpoint the session SHALL push the program over
RTMP. The session SHALL continue while at least one endpoint remains
reachable and SHALL transition to `failed` when none do. Endpoint URLs SHALL
NOT be logged at any level.

#### Scenario: One endpoint of two dies
- **WHEN** one of two configured RTMP endpoints stops accepting the stream
- **THEN** the session stays live and keeps pushing to the other endpoint

#### Scenario: All endpoints unreachable
- **WHEN** every configured RTMP endpoint fails persistently
- **THEN** the session transitions to `failed` with an error reason

### Requirement: HLS output and playback
With HLS enabled the session SHALL maintain a live playlist of recent
segments at a per-session unguessable path served over HTTPS by the server,
returned in the session's outputs. The playlist and segments SHALL be
fetchable without platform credentials while present, and the final playlist
SHALL remain fetchable after the session ends until the files are removed by
retention cleanup.

#### Scenario: Viewer watches mid-session
- **WHEN** an unauthenticated viewer polls the playlist URL during a live session
- **THEN** the playlist resolves and its segment window advances with the live program

#### Scenario: Playlist survives session end
- **WHEN** the session ends normally
- **THEN** the final playlist and its segments remain fetchable at the same path

### Requirement: Egress lifecycle and inspection
A session SHALL move through `starting`, `live`, `stopping`, and a terminal
`ended` (with reason `stopped` or `room-ended`) or `failed` (with error
reason). A consumer SHALL inspect a session via `GET /v1/egress/:id` and its
room's sessions via `GET /v1/rooms/:id/egress`; both SHALL be scoped to the
key's project, with other projects' sessions responding 404. Transient
pipeline failures SHALL be retried a bounded number of times before the
session fails.

#### Scenario: Inspect a live session
- **WHEN** a key fetches one of its project's live sessions
- **THEN** the response carries the session id, room id, status `live`, outputs, and start time

#### Scenario: Pipeline crash recovers
- **WHEN** the media pipeline dies while the session is live
- **THEN** the server restarts it within the retry budget and the session returns to `live`

#### Scenario: Cross-project session hidden
- **WHEN** a key fetches another project's session
- **THEN** the server responds 404

### Requirement: Stop egress
`POST /v1/egress/:id/stop` SHALL gracefully stop one of its project's active
sessions; the session SHALL terminate its outputs and become `ended` with
reason `stopped`. Stopping an already-terminal session SHALL respond 409.

#### Scenario: Stop a live session
- **WHEN** a key stops its project's live session
- **THEN** the RTMP pushes and HLS updates cease and the session reports `ended` with reason `stopped`

### Requirement: Egress ends with the room
When a room ends - by its owner, via the public API, or through user-flow
teardown - its active egress session SHALL stop and report `ended` with
reason `room-ended`.

#### Scenario: Room ends during egress
- **WHEN** a room with a live egress session is ended
- **THEN** the session reports `ended` with reason `room-ended` and its outputs have stopped
