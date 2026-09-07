## 1. Server: developer read surface

- [x] 1.1 `GET /developers/projects` (own projects + room count) in `DeveloperController`/`DeveloperService`; ownership-scoped unit tests
- [x] 1.2 `GET /developers/projects/:id/rooms` and `GET /developers/projects/:id/recordings` with the project-ownership check (foreign 404); unit tests
- [x] 1.3 `GET /developers/projects/:id/recordings/:egressId/file` wrapping `RecordingsService.download` (Range/206 preserved); unit tests for delegation and foreign 404

## 2. Client: console foundation

- [x] 2.1 `features/console`: dev API service (register/login/projects/keys/webhooks/rooms/recordings), `DevAuthContext` with `sessionStorage` token, typed errors
- [x] 2.2 Routes `/console` and `/console/login` (lazy), console header with logout, redirect rules for unauthenticated visitors
- [x] 2.3 Console login/register page; MainHeader "For developers" link

## 3. Client: console views

- [x] 3.1 Projects list + create project form
- [x] 3.2 Project detail: API keys (create with show-once banner + copy, revoke with confirmation), webhook URL set/remove with show-once secret
- [x] 3.3 Project detail: rooms list; recordings list with in-browser playback (blob URL) and download link; loading/empty/error states throughout

## 4. Tests and verification

- [x] 4.1 Client tests: dev auth context (login/register/expiry clears token), console pages (list, keys show-once, recording playback stub), guest redirect
- [x] 4.2 Server unit tests green; new developer-controller specs for the three endpoints
- [x] 4.3 E2E: register -> create project -> create key -> list rooms/recordings -> foreign project 404 (platform-style harness)
- [x] 4.4 Full server + client suites and lint green; `pnpm openspec:validate`; archive the change
