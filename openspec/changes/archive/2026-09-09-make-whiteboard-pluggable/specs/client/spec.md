## ADDED Requirements

### Requirement: Room panel registry
The room page SHALL assemble its side panels from a panel registry: each
panel registers an id, title, icon, and lazy-loaded component, and the host
injects the room context (room slug, participant identity, permissions) when
mounting it. The whiteboard SHALL be a registry consumer, and the room page
SHALL NOT import registered panels' internals directly. Authentication and
room identity SHALL be owned by the host, never by a panel.

#### Scenario: Whiteboard opens through the registry
- **WHEN** a participant opens the whiteboard panel
- **THEN** the panel component is lazy-loaded through its registry entry and mounted with the injected room context

#### Scenario: Adding a panel leaves the room view generic
- **WHEN** a new panel registers itself with the room panel registry
- **THEN** it becomes available in the room UI without the room view gaining knowledge of the panel's internals
