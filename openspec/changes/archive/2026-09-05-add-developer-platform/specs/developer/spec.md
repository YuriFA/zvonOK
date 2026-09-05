## Purpose

Developer accounts, projects, and API keys let third-party consumers provision rooms and mint participant tokens on the zvonok platform without zvonok user accounts.

## ADDED Requirements

### Requirement: Developer registration
The server SHALL allow developer account registration with a unique username
and a password satisfying the same policy as user accounts. Registration does
not require or verify an email address.

#### Scenario: Successful registration
- **WHEN** a developer registers with an unused username and a compliant password
- **THEN** the account is created and a developer session token is returned

#### Scenario: Duplicate username
- **WHEN** a developer registers with an already-taken username
- **THEN** the server responds 409 and no account is created

### Requirement: Developer login
The server SHALL authenticate developers with username and password and issue a
short-lived bearer session token for developer management endpoints. Repeated
failures MAY lock the account temporarily, mirroring user login behavior.

#### Scenario: Valid credentials
- **WHEN** a developer logs in with correct credentials
- **THEN** a bearer session token is returned for management calls

#### Scenario: Wrong password
- **WHEN** a developer logs in with a wrong password
- **THEN** the server responds 401 and no token is issued

### Requirement: Projects
A developer account SHALL own one or more projects. A project is the unit of
ownership for API keys and rooms; every API key and every platform-created room
belongs to exactly one project.

#### Scenario: Default project
- **WHEN** a developer account is created
- **THEN** it starts with ability to create projects, and at least one project can be created or seeded before any API key is issued

### Requirement: API key issuance and storage
Creating an API key SHALL return the full key value exactly once; the server
stores only a hash of the key. Key material is never returned again by any
endpoint.

#### Scenario: Key shown once
- **WHEN** a developer creates an API key for a project
- **THEN** the response contains the full key and the key list afterwards shows only metadata (id, creation time, revocation state), never the key material

### Requirement: API key revocation
Revoking an API key SHALL take effect immediately: subsequent platform API
requests with that key are rejected.

#### Scenario: Revoked key rejected
- **WHEN** a revoked key is used on any `/v1` endpoint
- **THEN** the server responds 401

### Requirement: Project isolation
An API key SHALL only access rooms, tokens, and resources of the project it
belongs to.

#### Scenario: Cross-project room access
- **WHEN** a key from project A is used to mint a token for a room of project B
- **THEN** the server responds 404 and no token is issued

### Requirement: CLI seeding
A seed script SHALL create a developer account, a project, and an API key from
environment variables or arguments, for bootstrapping when no registration UI
exists.

#### Scenario: Seed run on empty database
- **WHEN** the seed script runs with credentials supplied via environment
- **THEN** a developer account with one project and one API key exists and the key material is printed once
