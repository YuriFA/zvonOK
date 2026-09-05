# User Management Specification

## Purpose

User profiles and role administration (USER / HOST / ADMIN) for registered
accounts. Guests are out of scope here (see room spec).

## Requirements

### Requirement: Role model
A user SHALL have exactly one role: `USER`, `HOST`, or `ADMIN` (default
`USER`). Room creation requires HOST or ADMIN; role administration requires
ADMIN.

#### Scenario: Default role on registration
- **WHEN** a new user registers
- **THEN** their role is `USER` and room-creation endpoints reject them

### Requirement: Admin-only role updates
`PATCH /users/:id/role` SHALL be restricted to ADMIN and SHALL return the
user's safe fields.

#### Scenario: Non-admin attempts a role change
- **WHEN** a USER or HOST calls the endpoint
- **THEN** the request is rejected as forbidden

#### Scenario: Admin changes own role
- **WHEN** an admin targets their own id
- **THEN** the request is rejected with 403

#### Scenario: Demoting the last admin
- **WHEN** the change would leave zero ADMIN users
- **THEN** the request is rejected with 403

#### Scenario: Successful role change
- **WHEN** an admin changes another user's role
- **THEN** the role is updated and the user's `tokenVersion` is incremented,
  invalidating their refresh token

### Requirement: Safe user data exposure
User-facing responses SHALL exclude `passwordHash` and `refreshTokenHash`.

#### Scenario: Role update response
- **WHEN** `PATCH /users/:id/role` succeeds
- **THEN** the response contains the updated role and safe fields only
