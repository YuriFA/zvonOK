## ADDED Requirements

### Requirement: Developer console
The app SHALL expose a `/console` section (lazy-loaded) for developer
accounts. It SHALL offer registration and login against the developer auth
surface and keep the returned dev token in `sessionStorage` (console-only,
cleared on tab close and logout). While authenticated, the console SHALL list
the developer's projects and let them create a project; selecting a project
SHALL show its API keys (create with the full key shown exactly once, revoke
with confirmation), webhook endpoint configuration, room list, and recordings
with in-browser playback and download. Console fetches SHALL attach the dev
token as a bearer header and surface failures through the typed API errors;
unauthenticated visitors SHALL be redirected to the console login.

#### Scenario: Developer signs in
- **WHEN** a developer logs in on the console with valid credentials
- **THEN** the token is stored for the session and the project list renders

#### Scenario: Creating an API key
- **WHEN** the developer creates a key from the console
- **THEN** the full key value is displayed once with a copy action and only its metadata appears afterwards

#### Scenario: Configuring a webhook
- **WHEN** the developer sets or removes the project webhook endpoint
- **THEN** the console reflects the current webhook URL and the returned signing secret is shown once

#### Scenario: Playing a recording
- **WHEN** the developer plays one of the project's finalized recordings
- **THEN** the video plays in the browser from a short-lived blob URL fetched with the dev token

#### Scenario: Session expiry
- **WHEN** a console request fails with an authentication error
- **THEN** the stored token is cleared and the console login renders
