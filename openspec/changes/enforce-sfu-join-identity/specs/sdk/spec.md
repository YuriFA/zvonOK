## MODIFIED Requirements

### Requirement: Connection and join contract
`@zvonok/client` SHALL expose a connection entry point that takes a server URL,
a room identifier, and an identity (room token for platform consumers), joins
the room over signalling, and exposes typed events for peer and track
lifecycle and join errors. A consumer following only this contract joins a
working room with remote media. The join payload SHALL NOT carry trusted
identity fields: platform consumers authenticate with a room token, and
app-embedded usage authenticates with the browser session the server already
verifies (handshake cookies). Join-refusal errors surface as typed errors on
every identity path.

#### Scenario: Token-based join from external app
- **WHEN** an external app connects with a server URL, room slug, and a valid room token
- **THEN** the participant joins and receives remote peer and track events for other participants

#### Scenario: Invalid token surfaces typed error
- **WHEN** the connection is attempted with an expired or invalid token
- **THEN** the SDK surfaces a typed join error instead of throwing unexpectedly

#### Scenario: Unauthenticated join surfaces typed error
- **WHEN** a connection is attempted with no verifiable credential
- **THEN** the SDK surfaces a typed authentication join error and does not
  retry into a dead room
