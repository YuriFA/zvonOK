# webhooks Delta

## ADDED Requirements

### Requirement: Egress events
Project-owned rooms SHALL emit `egress.started` when a session goes live,
`egress.stopped` when it ends (carrying the end reason `stopped` or
`room-ended`), and `egress.failed` when it fails (carrying an error reason).
Events SHALL identify the room (id, slug) and the egress session (id,
outputs) and SHALL be signed and retried by the same delivery contract as
room lifecycle events. User-owned rooms SHALL NOT emit egress events.

#### Scenario: Egress lifecycle reaches the consumer
- **WHEN** a project room's egress session goes live and is later stopped via the API
- **THEN** the project's endpoint receives `egress.started` followed by `egress.stopped` with reason `stopped`

#### Scenario: Failed egress notifies the consumer
- **WHEN** a session exhausts its retry budget and fails
- **THEN** the endpoint receives `egress.failed` with the error reason

#### Scenario: User-owned rooms stay silent for egress
- **WHEN** an egress session runs on a user-owned room
- **THEN** no egress webhook events are emitted for it
