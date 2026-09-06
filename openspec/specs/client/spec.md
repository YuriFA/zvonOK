# Client Specification

## Purpose

React 19 SPA: routing, auth state, typed API access, SFU/media management,
pre-join and guest flows, chat UI, and design-system conventions.

## Requirements

### Requirement: Routes
The app SHALL expose `/` (home), `/login`, `/register` (eager), and
`/room/:slug` (lazy-loaded with Suspense).

#### Scenario: Opening an invite link
- **WHEN** a visitor navigates to `/room/abc123`
- **THEN** the room bundle is loaded lazily and pre-join renders inside a
  Suspense boundary

### Requirement: Auth context
`AuthContext` SHALL expose `login(email, password)`,
`register(username, email, password)`, `logout()`, `refreshUser()`, and state
`{user, isLoading, isAuthenticated}`. A failed token refresh logs the user
out and redirects to login.

#### Scenario: Refresh failure on reopen
- **WHEN** the app loads with an expired session and refresh fails
- **THEN** the user is logged out and routed to `/login`

### Requirement: Typed API errors
API failures SHALL surface as typed errors from `lib/api/api.errors.ts`:
`ApiError` with `AuthError`, `ValidationError`, `NetworkError`. The client
SHALL retry once on 401 after refreshing the access token.

#### Scenario: Validation error on register
- **WHEN** the server rejects registration with field errors
- **THEN** the client raises `ValidationError` and the form shows field-level
  messages

### Requirement: Framework-agnostic core
Framework-free logic SHALL live in `src/lib/` (api client, sfu manager, media
services); React bindings live in `src/features/*/contexts`. `SfuManager` is
a facade composing connection, event routing, and stats collection; the
context only injects the instance.

#### Scenario: Using SFU outside React
- **WHEN** logic needs SFU control without React state
- **THEN** it consumes the `SfuManager` facade from `lib/sfu/` directly

### Requirement: SFU connection
The client SHALL connect a Socket.io client to the `/sfu` namespace with
automatic reconnection, managing send/recv transports, producers (with
simulcast), consumers, and quality monitoring.

#### Scenario: Network blip during a call
- **WHEN** the socket disconnects mid-call
- **THEN** reconnection is automatic and media resumes without page reload

### Requirement: Device management
`MediaDeviceService` SHALL enumerate cameras/microphones/speakers and query
permissions; `useDeviceSwitching()` switches active devices without leaving
the call; permission denial shows a fallback UI.

#### Scenario: Switching microphone mid-call
- **WHEN** the user picks another input device in device settings
- **THEN** the active producer is replaced without leaving the call

### Requirement: Screen share
The client SHALL publish screen share as a separate producer track, honoring
the server's room-level exclusive lock.

#### Scenario: Lock held by another peer
- **WHEN** the user clicks share while someone else is sharing
- **THEN** the client surfaces the rejection without disrupting the call

### Requirement: Pre-join flow
Pre-join SHALL offer device selection and display name entry (authenticated
users pre-filled), and room states: loading, error, ended.

#### Scenario: Room already ended
- **WHEN** pre-join loads a room with status `ended`
- **THEN** the ended state is shown instead of join controls

### Requirement: Guest flow
Guests SHALL join by display name: pre-approval check via HTTP-only cookie,
join request, status polling with states `idle -> waiting ->
approved | denied | error`, and persistent message identity after approval.
Room owners see and handle guest requests in the participants list.

#### Scenario: Guest waits for approval
- **WHEN** a guest submits their name for an approval-required room
- **THEN** the UI shows `waiting` until the owner approves, then the guest
  enters with a persistent identity

### Requirement: Chat UI
The room page SHALL embed the chat (message list + input) backed by the
`/chat` namespace and the messages REST API, rendering guest and user
messages distinctly.

#### Scenario: Live message arrives
- **WHEN** a `chat:message` event arrives for the joined room
- **THEN** the message list appends it, visually distinguishing guest authors

### Requirement: Server-state management
Data fetching SHALL use TanStack React Query with centralized query keys
(`lib/react-query/query-keys.ts`), staleTime 0, 3 retries for queries, 1
retry for mutations, 5-minute cache.

#### Scenario: Room data refetch on focus
- **WHEN** the user returns to the tab
- **THEN** React Query refetches stale room queries using the shared keys

### Requirement: Design system
UI SHALL use Base UI primitives in `components/ui/` styled with Tailwind CSS
v4 and `class-variance-authority` variants; feature code lives in
`features/<feature>/` (kebab-case); no barrel files.

#### Scenario: Adding a button variant
- **WHEN** a new visual variant is needed
- **THEN** it is added as a `class-variance-authority` variant on the shared
  `components/ui/button.tsx`

### Requirement: Keyboard control of room media
The room page SHALL support keyboard control of the media actions exposed by
its control bar: microphone toggle, camera toggle, and screen-share toggle,
with the guards defined in the keyboard-shortcuts capability.

#### Scenario: Camera toggle via keyboard
- **WHEN** the user presses `v` during a call
- **THEN** the camera toggles exactly as if the control-bar button was
  clicked, and the button state reflects it

### Requirement: Host controls UI
When the local participant is the host - the owner of a user-owned room or a
room-admin token holder in a project room - the app SHALL expose host controls:
mute for each remote participant, mute-all, and a room lock toggle, calling the
SDK host-control actions and surfacing server denials as errors. Every
participant SHALL see an indication when the server forcibly mutes them, and
the room SHALL show a locked state to everyone while locked.

#### Scenario: Owner mutes a participant from the participant list
- **WHEN** the owner activates the mute control on a publishing participant
- **THEN** that participant's media stops and the mute is reflected in the owner's UI

#### Scenario: Muted by host indication
- **WHEN** the server forcibly mutes the local participant
- **THEN** the app shows a muted-by-host indication and the participant's own mic control reflects the server state

#### Scenario: Locked state visible
- **WHEN** the host locks the room
- **THEN** all participants see the locked indication and new join attempts fail with the room-locked error

### Requirement: Local recording
While in a room the local user SHALL be able to record their own camera and
microphone to a file on their device. The recording SHALL start only from an
explicit user action, SHALL be indicated in the UI while active (with elapsed
time), and SHALL produce a single `.webm` download when stopped. The control
SHALL be hidden entirely when the browser provides no usable `MediaRecorder`,
and disabled when neither camera nor microphone is active. If a recorded track
ends unexpectedly (device unplug, revoked permission) or the user leaves the
room while recording, the capture SHALL stop and the already-captured material
SHALL still be saved.

#### Scenario: Start and stop a recording
- **WHEN** the user with an active camera or microphone presses the record control and later stops it
- **THEN** a single `.webm` file containing the captured material is downloaded

#### Scenario: Unsupported browser
- **WHEN** the browser exposes no usable `MediaRecorder` implementation
- **THEN** the record control is not rendered at all

#### Scenario: Nothing to record
- **WHEN** the user has neither camera nor microphone active
- **THEN** the record control is visible but disabled

#### Scenario: Device disappears mid-recording
- **WHEN** a recorded track ends unexpectedly while the recording is active
- **THEN** the recording stops and the material captured so far is saved

#### Scenario: Leaving while recording
- **WHEN** the user leaves the room while a recording is active
- **THEN** the recording stops and the material captured so far is saved
