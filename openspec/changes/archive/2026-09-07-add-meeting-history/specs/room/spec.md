## ADDED Requirements

### Requirement: Call history records
When the owner ends a user-owned room, the server SHALL create a call history
record in the same transaction that ends the room: the room's name, slug,
started and ended timestamps, message count, and a snapshot of the room's
chat messages (author label, content, timestamp). The record SHALL belong to
the owner and SHALL survive the room's hard deletion by cleanup. Project-owned
rooms SHALL NOT create call history records. The owner SHALL be able to list
their records newest first (without message payloads), fetch one record with
its transcript, and delete a record; other users' records SHALL respond 404.

#### Scenario: Ending a room snapshots its call
- **WHEN** a host user ends their room via the app API
- **THEN** a call history record is created carrying the room name, slug, started/ended timestamps, and the chat messages sent in the room

#### Scenario: History outlives the room
- **WHEN** the hourly cleanup hard-deletes the ended room and its messages
- **THEN** the call history record and its transcript snapshot remain fetchable by the owner

#### Scenario: Listing and reading own history
- **WHEN** a signed-in user requests their call history and then one record's detail
- **THEN** the list is newest first without message payloads and the detail returns the record with its chat transcript

#### Scenario: Foreign history is invisible
- **WHEN** a user requests another user's call history record
- **THEN** the server responds 404 for both detail and deletion

#### Scenario: Owner deletes a record
- **WHEN** the owner deletes one of their call history records
- **THEN** the record is removed and subsequent requests respond 404
