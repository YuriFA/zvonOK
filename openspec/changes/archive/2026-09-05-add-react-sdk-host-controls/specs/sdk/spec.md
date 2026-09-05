# sdk

## Purpose

The externally consumable SDK surface: npm-published `@zvonok/client` and `@zvonok/react` packages with a stable public contract and a quickstart path that works from a clean project against a deployed server.

## ADDED Requirements

### Requirement: Packages installable from npm
`@zvonok/client` and `@zvonok/react` SHALL be installable from the public npm
registry into a clean external project with no access to the monorepo.
Published artifacts contain built JavaScript with type declarations and
complete package metadata (name, version, license, repository). The workspace
itself keeps consuming package sources directly; publishing is a manual
versioned release per package.

#### Scenario: Clean-project install
- **WHEN** a developer outside the monorepo runs `npm i @zvonok/client` (or `@zvonok/react`)
- **THEN** the package installs with its dependencies and type declarations, and imports resolve without monorepo paths

#### Scenario: Workspace stays source-based
- **WHEN** the zvonok app imports `@zvonok/client/*` during development
- **THEN** it consumes package sources directly, without requiring a build of the package first

### Requirement: Connection and join contract
`@zvonok/client` SHALL expose a connection entry point that takes a server URL,
a room identifier, and an identity (room token for platform consumers), joins
the room over signalling, and exposes typed events for peer and track
lifecycle and join errors. A consumer following only this contract joins a
working room with remote media.

#### Scenario: Token-based join from external app
- **WHEN** an external app connects with a server URL, room slug, and a valid room token
- **THEN** the participant joins and receives remote peer and track events for other participants

#### Scenario: Invalid token surfaces typed error
- **WHEN** the connection is attempted with an expired or invalid token
- **THEN** the SDK surfaces a typed join error instead of throwing unexpectedly

### Requirement: React binding
`@zvonok/react` SHALL provide a provider carrying SDK configuration and hooks
covering the join lifecycle, participants-and-tracks state, and device
controls, implemented as a thin layer over `@zvonok/client`. It declares
`react` >= 18 as a peer dependency and adds no UI components.

#### Scenario: React consumer joins declaratively
- **WHEN** a React app renders the provider with config and uses the join hook with a token
- **THEN** the hook exposes connection state, participants, and remote tracks as React state without manual signalling wiring

### Requirement: Host control actions
The SDK SHALL expose host-control actions - mute a peer, mute all, lock and
unlock the room - that emit the corresponding signalling events and resolve
with the server result; authorization denials surface as typed errors. Actions
are available to any consumer whose identity the server authorizes.

#### Scenario: Authorized host mutes a peer
- **WHEN** an authorized participant invokes the mute action for another peer
- **THEN** the server mutes that peer and the action resolves successfully

#### Scenario: Non-host action denied
- **WHEN** a non-authorized participant invokes a host-control action
- **THEN** the SDK surfaces the server's authorization denial as a typed error

### Requirement: Quickstart reproducibility
The repository SHALL contain a quickstart document such that a developer with a
deployed server and an API key reaches a joined video room from a clean
external project by following only that document.

#### Scenario: Quickstart walkthrough
- **WHEN** a developer follows only the quickstart from an empty project: install the SDK, mint a room token via the public API with their key, and run the documented code against the deployed server
- **THEN** they join a working video room on the deployed server
