## ADDED Requirements

### Requirement: App-session sign-in
A signed-in app user SHALL obtain a developer session through
`POST /developers/auth/sso` authenticated by the app's cookie session. The
endpoint SHALL find the developer account linked to that user via a stored,
unique `userId` reference and return a fresh dev token for it. When no linked
account exists, the endpoint SHALL create one: it takes the user's username,
suffixing it (`-2`, `-3`, ...) until unique among developer accounts when the
name is taken by an account linked to nobody, and stores the user's password
hash so the same credentials work at the manual login form. The link and the
created account SHALL persist across sessions; unauthenticated requests SHALL
respond 401. Responses SHALL carry the dev token, the resolved developer
username, and whether the account was newly created.

#### Scenario: First sign-in from the site
- **WHEN** an app user without a linked developer account calls the SSO endpoint
- **THEN** a developer account is created and linked to them, and the response carries a working dev token, their username, and created=true

#### Scenario: Repeat sign-in reuses the account
- **WHEN** a linked app user calls the SSO endpoint again
- **THEN** the same developer account is returned (created=false), regardless of username collisions that happened in between

#### Scenario: Username taken by an unlinked developer account
- **WHEN** the user's app username matches a developer account linked to nobody
- **THEN** the created developer account gets the username with a numeric suffix instead of failing or reusing that account

#### Scenario: Copied credentials work manually
- **WHEN** an SSO-created developer logs in at the manual login form with the site credentials
- **THEN** the login succeeds against the linked developer account

#### Scenario: Unauthenticated request
- **WHEN** the SSO endpoint is called without a valid app session
- **THEN** the server responds 401 and no account is created or linked
