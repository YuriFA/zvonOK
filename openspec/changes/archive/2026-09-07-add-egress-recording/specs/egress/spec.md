## MODIFIED Requirements

### Requirement: Start egress for a project room
A platform consumer SHALL start an egress session for one of its project's
active rooms with at least one output: one to three RTMP(S) endpoints
(`rtmp://` or `rtmps://`), local HLS output, and/or local recording output
(`record`). The session SHALL be recorded as belonging to the key's project.
Requests for another project's room SHALL respond 404; requests for an ended
room, with no outputs, or with invalid endpoint URLs SHALL respond 400; a
second concurrent active session for the same room SHALL respond 409.

#### Scenario: Start RTMP and HLS egress
- **WHEN** a valid key starts egress with one RTMP endpoint and HLS enabled for its project's active room
- **THEN** a session is created with a unique id, the requested outputs, and an initial status of `starting`

#### Scenario: Start recording-only egress
- **WHEN** a valid key starts egress with `record: true` and no other outputs for its project's active room
- **THEN** a session is created with the recording output and status `starting`

#### Scenario: Second active egress refused
- **WHEN** a key starts egress for a room that already has an active session
- **THEN** the server responds 409 and the existing session is unaffected

#### Scenario: Invalid RTMP target rejected
- **WHEN** egress is requested with a URL whose scheme is neither rtmp nor rtmps
- **THEN** the server responds 400 and no session is created

## ADDED Requirements

### Requirement: Recording output
While a session with the recording output is live, the server SHALL write the
same composited program carried by other outputs to disk under the recordings
directory, one file per session. A supervised pipeline restart SHALL continue
writing to a new part file without truncating previously written parts. When
the session reaches `ended`, all parts SHALL be finalized into a single
seekable recording without re-encoding; the raw parts SHALL then be removed.
If the server crashes mid-session, the parts written so far SHALL remain on
disk and remain downloadable. The recording SHALL be deleted from disk when
the consumer deletes it via the recordings API.

#### Scenario: Recording survives a pipeline restart
- **WHEN** the FFmpeg program restarts during a live recording session and the session later ends
- **THEN** the finalized recording contains the material from before and after the restart, apart from the bounded restart gap

#### Scenario: Finalized recording is downloadable
- **WHEN** a session with the recording output ends with reason `stopped`
- **THEN** the session view exposes a `recordingUrl` and a download request with the project's API key returns the finalized file

#### Scenario: Crashed session keeps its material
- **WHEN** the server restarts while a recording session is live
- **THEN** the session is reconciled to `failed` and the parts written so far remain downloadable

#### Scenario: Consumer deletes a recording
- **WHEN** a valid key deletes a session's recording
- **THEN** the stored files are removed from disk and subsequent download requests respond 404

## MODIFIED Requirements

### Requirement: Egress lifecycle and inspection
A session SHALL move through `starting`, `live`, `stopping`, and a terminal
`ended` (with reason `stopped` or `room-ended`) or `failed` (with error
reason). A consumer SHALL inspect a session via `GET /v1/egress/:id` and its
room's sessions via `GET /v1/rooms/:id/egress`; both SHALL be scoped to the
key's project, with other projects' sessions responding 404. Transient
pipeline failures SHALL be retried a bounded number of times before the
session fails. Inspection SHALL report the session's outputs, timing, end
reason, and - for sessions with the recording output - the finalized
recording's URL and size.

#### Scenario: Inspect a live session
- **WHEN** a key fetches one of its project's live sessions
- **THEN** the response carries the session id, room id, status `live`, outputs, and start time

#### Scenario: Pipeline crash recovers
- **WHEN** the media pipeline dies while the session is live
- **THEN** the server restarts it within the retry budget and the session returns to `live`

#### Scenario: Cross-project session hidden
- **WHEN** a key fetches another project's session
- **THEN** the server responds 404

#### Scenario: Session view exposes recording metadata
- **WHEN** a finished recording session is fetched with a valid project key
- **THEN** the view includes the recording URL and its byte size
