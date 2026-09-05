## MODIFIED Requirements

### Requirement: Token invalidation on credential/role change
The server SHALL bump the user's `tokenVersion` on password or role change.
Both the access and the refresh strategies SHALL reject tokens whose
`tokenVersion` differs from the stored value; a rejected access request
returns 401 so the client can attempt refresh (which fails for the same
reason, ending the session).

#### Scenario: Role change invalidates refresh
- **WHEN** an admin changes a user's role and the user later calls refresh
- **THEN** the refresh token is rejected because `tokenVersion` mismatches

#### Scenario: Stale access token rejected immediately
- **WHEN** a user's role or password was changed after their access token
  was issued, and they call any authenticated endpoint with that token
- **THEN** the server responds 401 without executing the request

#### Scenario: Deleted or missing user
- **WHEN** an access token names a user that no longer exists
- **THEN** the server responds 401
