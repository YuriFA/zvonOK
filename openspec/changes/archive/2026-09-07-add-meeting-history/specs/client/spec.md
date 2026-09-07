## MODIFIED Requirements

### Requirement: Routes
The app SHALL expose `/` (home), `/login`, `/register` (eager), `/history`
(lazy-loaded with Suspense), and `/room/:slug` (lazy-loaded with Suspense).

#### Scenario: Opening an invite link
- **WHEN** a visitor navigates to `/room/abc123`
- **THEN** the room bundle is loaded lazily and pre-join renders inside a
  Suspense boundary

#### Scenario: Opening history
- **WHEN** a signed-in user navigates to `/history`
- **THEN** the history bundle is loaded lazily inside a Suspense boundary

## ADDED Requirements

### Requirement: Meeting history page
Signed-in users SHALL see a navigation entry to `/history`. The page SHALL
list the user's call history records newest first, showing the call name,
date, duration, and message count, with empty, loading, and error states.
Selecting a record SHALL fetch its detail and display the chat transcript
(author label, content, timestamp per message). The page SHALL let the owner
delete a record after confirmation. Unauthenticated visitors SHALL be
redirected to login.

#### Scenario: Viewing history
- **WHEN** a signed-in user with recorded calls opens `/history`
- **THEN** the page lists their calls newest first with name, date, duration, and message count

#### Scenario: Reading a transcript
- **WHEN** the user selects one of their call records
- **THEN** the record's chat transcript renders with author labels and timestamps

#### Scenario: Deleting a record
- **WHEN** the user confirms deletion of one of their records
- **THEN** the record is removed from the list

#### Scenario: Guest redirected
- **WHEN** an unauthenticated visitor opens `/history`
- **THEN** they are redirected to `/login`
