## Why

The developer platform is real but invisible: keys, rooms, and recordings are
only reachable through raw `/v1` calls with curl. The parked "developer
dashboard UI" item turns the platform into something a developer can actually
see and drive - the strongest portfolio artifact of the whole direction.

## What Changes

- Developer-scoped read endpoints (bearer dev-token auth that already exists):
  `GET /developers/projects` (own projects), `GET /developers/projects/:id/rooms`
  (project rooms), `GET /developers/projects/:id/recordings` (project
  recordings), and `GET /developers/projects/:id/recordings/:egressId/file`
  (recording download under developer auth, ownership-checked). Foreign
  projects respond 404.
- New client `/console` section behind developer login/register: projects list
  and creation; per-project detail with API keys (create with show-once
  banner, list with revoked state, revoke), webhook endpoint configuration,
  room list, and recordings with in-browser playback (blob fetch with the dev
  token) and download.
- No changes to the `/v1` contract, API-key model, or webhook behavior.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `developer`: new "Projects listing" and "Developer media views" requirements
  covering the read surface under dev-token auth with strict project
  ownership.
- `client`: new "Developer console" requirement covering the authenticated
  console section: dev session, projects, keys, webhooks, rooms, and
  recording playback.
