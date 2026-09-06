# sfu

## MODIFIED Requirements

### Requirement: Transport lifecycle
The server SHALL create send and receive WebRTC transports per peer
(`sfu:create-send-transport`, `sfu:create-recv-transport`), connect them via
`sfu:connect-transport` (`{transportId, dtlsParameters}`), and deliver ICE
server configuration (STUN/TURN) in the transport-created payload. When a
TURN auth secret is configured, the TURN entry SHALL carry ephemeral
credentials: a username encoding an expiry timestamp (at least 6 hours ahead)
and a password computed as `base64(HMAC-SHA1(secret, username))`, verifiable
by coturn's `use-auth-secret` mechanism. Static shared TURN
username/password credentials SHALL NOT be used.

#### Scenario: Transport created with ICE credentials
- **WHEN** a peer creates a send transport
- **THEN** the response contains the transport parameters plus STUN/TURN
  configuration for ICE gathering, with freshly minted ephemeral TURN
  credentials when the auth secret is configured

#### Scenario: Credentials expire safely
- **WHEN** the server mints TURN credentials twice for different transports
- **THEN** each credential carries an expiry at least 6 hours in the future
  and a password that only holders of the shared secret could produce

#### Scenario: Local development without a secret
- **WHEN** no TURN auth secret is configured but a TURN URL is
- **THEN** the TURN entry is delivered URL-only and the client can still
  reach the unauthenticated development coturn
