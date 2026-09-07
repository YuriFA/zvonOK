## ADDED Requirements

### Requirement: Recordings endpoints
The platform API SHALL expose a project-scoped recordings surface with API-key
authentication: list recordings (filterable by room, newest first), download a
session's finalized recording (HTTP Range supported), and delete a recording.
Access SHALL be limited to the key's own project: another project's recording
SHALL respond 404. Downloads SHALL be served after finalization for ended
sessions and SHALL serve the raw parts for sessions reconciled as `failed`
after a server crash. Deletion SHALL remove the stored files.

#### Scenario: List and download own recordings
- **WHEN** a valid key lists recordings for its project and downloads one by egress id
- **THEN** the list contains the session and the download returns the recording bytes with `Content-Type: video/mp4`

#### Scenario: Another project's recording is invisible
- **WHEN** a key requests a recording belonging to a different project
- **THEN** the server responds 404 for the download and the recording is absent from the list

#### Scenario: Range request seeks into the file
- **WHEN** a download request carries a `Range: bytes=N-` header
- **THEN** the server responds `206 Partial Content` with the requested byte range

#### Scenario: Deleting removes the file
- **WHEN** a valid key deletes a recording
- **THEN** the files are removed from disk and a subsequent download responds 404
