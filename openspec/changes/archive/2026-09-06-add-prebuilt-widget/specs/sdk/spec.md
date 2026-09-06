# sdk

## MODIFIED Requirements

### Requirement: React binding
`@zvonok/react` SHALL provide a provider carrying SDK configuration and hooks
covering the join lifecycle, participants-and-tracks state, and device
controls, implemented as a thin layer over `@zvonok/client`. It declares
`react` >= 18 as a peer dependency. The headless hook layer adds no UI; the
package MAY additionally ship the prebuilt room component below.

#### Scenario: React consumer joins declaratively
- **WHEN** a React app renders the provider with config and uses the join hook with a token
- **THEN** the hook exposes connection state, participants, and remote tracks as React state without manual signalling wiring

## ADDED Requirements

### Requirement: Prebuilt room component
`@zvonok/react` SHALL ship a `ZvonokRoom` drop-in component that renders a
complete meeting room from minimal props (`roomSlug`, `token`, optional
display name, and lifecycle callbacks): a pre-join stage for name and device
confirmation (skippable), a video grid of local and remote participants with
name and audio-off badges, and a controls bar with microphone, camera, screen
share, and leave. The component SHALL be styled by package-owned CSS with a
namespaced class prefix and SHALL NOT require the consumer to run any
signalling, track-attachment, or capture code.

#### Scenario: Drop-in integration
- **WHEN** an external React app renders `ZvonokRoom` with a server URL, room slug, and valid room token
- **THEN** the participant joins and sees remote participants' video with working mic, camera, screen share, and leave controls - without wiring any signalling or track code

#### Scenario: Styles do not leak
- **WHEN** the component renders inside a host app with its own CSS
- **THEN** all widget styling is scoped under the package's class namespace and no host styles are required

#### Scenario: Typed failure surfaces in the UI
- **WHEN** the join fails (invalid or expired token)
- **THEN** the component renders the typed join error state and never silently shows an empty room
