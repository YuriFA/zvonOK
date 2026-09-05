# Authentication Specification

## Purpose

Registration, login, JWT session management (access + refresh in HTTP-only
cookies), account lockout, and token invalidation for the WebRTC chat server.

## Requirements

### Requirement: User registration
The server SHALL register a user from a unique email, unique username, and a
password of at least 6 characters containing uppercase, lowercase, a number,
and no spaces, hashed with bcrypt (10 rounds). The endpoint is rate-limited to
5 requests per minute.

#### Scenario: Valid registration
- **WHEN** `POST /auth/register` receives a valid email, username, and password
- **THEN** the user is created and access + refresh tokens are set as HTTP-only
  cookies (`SameSite=Lax`, `Secure` in production)

#### Scenario: Weak password
- **WHEN** the password lacks an uppercase letter or is under 6 characters
- **THEN** the request is rejected with a validation error and no user is created

### Requirement: Login with account lockout
The server SHALL verify credentials with bcrypt and lock the account for 15
minutes after 5 failed attempts, resetting the counter on success. The endpoint
is rate-limited to 10 requests per minute.

#### Scenario: Five failed attempts
- **WHEN** a fifth consecutive invalid password is submitted for a user
- **THEN** `lockedUntil` is set 15 minutes ahead and further logins are rejected
  until it expires

### Requirement: Token pair in HTTP-only cookies
The server SHALL issue an access token (15 minutes) and a refresh token
(7 days) as HTTP-only cookies. The refresh token is stored hashed
(`refreshTokenHash`) with a single active token per user; a new login replaces
the previous hash.

#### Scenario: Access token expiry
- **WHEN** the access token is expired and the refresh cookie is valid
- **THEN** `POST /auth/refresh-token` rotates both cookies and stores the new
  refresh hash

### Requirement: Refresh rotation with reuse detection
On refresh the server SHALL validate the JWT (including `jti`), compare the
presented token hash against the stored hash using timing-safe comparison, and
rotate tokens on success. A reused (already rotated) token fails the
comparison.

#### Scenario: Reused refresh token
- **WHEN** a refresh token that was already rotated is presented again
- **THEN** the hash comparison fails and no tokens are issued

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

### Requirement: Logout
`POST /auth/logout` SHALL clear the stored refresh hash and remove both
cookies.

#### Scenario: Logout
- **WHEN** an authenticated user calls `POST /auth/logout`
- **THEN** the refresh hash is removed server-side and both cookies are cleared

### Requirement: Current user profile
`GET /auth/me` SHALL return the authenticated user's safe fields only (no
`passwordHash`, no `refreshTokenHash`).

#### Scenario: Profile fetch
- **WHEN** a valid access cookie is presented to `GET /auth/me`
- **THEN** the response contains id, email, username, and role, and never a
  password or token hash
