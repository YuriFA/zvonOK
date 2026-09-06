# platform-api Delta

## ADDED Requirements

### Requirement: Egress endpoints
The `/v1` surface SHALL expose egress management under API-key auth and the
existing per-key rate limits: `POST /v1/rooms/:id/egress` starts a session
for a project room with validated outputs (one to three `rtmp(s)://`
endpoints and/or local HLS), `GET /v1/rooms/:id/egress` lists the room's
sessions, `GET /v1/egress/:id` inspects one session, and
`POST /v1/egress/:id/stop` stops an active session. All four SHALL be scoped
to the authenticated key's project exactly like the room endpoints.

#### Scenario: Start egress with API key
- **WHEN** a valid key posts a outputs payload with one RTMP endpoint and HLS enabled to its project's active room
- **THEN** the server responds 201 with the session id, outputs, and initial status

#### Scenario: Egress requires both outputs and valid URLs
- **WHEN** egress is started with an empty outputs payload or a non-RTMP URL
- **THEN** the server responds 400 and no session is created

#### Scenario: Rate limit applies to egress calls
- **WHEN** a key hammers the egress endpoints past its per-key budget
- **THEN** responses are 429 with a Retry-After hint, as with other `/v1` endpoints
