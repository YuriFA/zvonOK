## Context

- Developer auth already exists end-to-end: `POST /developers/auth/register|login`
  returns a bearer JWT (`JWT_DEV_SECRET`, `DEV_TOKEN_TTL_MINUTES`, subject =
  account id), and `DevJwtGuard`/`DevAccount` protect the key and webhook
  endpoints. No session, no refresh token - the client re-login on expiry.
- What the dashboard needs that does not exist yet: listing the account's
  projects, and project-scoped reads of rooms and recordings under developer
  auth (today those live under `/v1` with API keys, which the console should
  not have to paste around).
- Existing services to reuse: `RecordingsService.list(projectId)` and
  `RecordingsService.download(...)` (Range-aware, finalized MP4 or raw parts),
  and the project-rooms query (`prisma.room.findMany` where `projectId`).
- Client conventions: feature modules in `src/features/<name>`, TanStack Query
  with key factories in `lib/react-query/query-keys.ts`, lazy routes in
  `main.tsx`, Tailwind + shared UI primitives, typed errors from
  `lib/api/api.errors.ts`.

## Goals / Non-Goals

**Goals:**
- The smallest surface that makes the platform visible: projects, keys,
  webhooks, rooms, recordings - driven end-to-end from the browser.
- Zero changes to the `/v1` contract or the API-key model.

**Non-Goals:**
- No analytics/usage charts, no room creation from the console, no egress
  start/stop UI (the prebuilt widget and `/v1` cover creation; egress control
  from a UI is a later slice if wanted).
- No developer token refresh flow - the token is short-lived by design; the
  console re-prompts login on expiry.
- No persistent developer session across tabs beyond `sessionStorage`.

## Decisions

1. **Reads under dev-token auth, not API-key pasting.** Three small endpoints
   on the existing `DeveloperController` (`GET /developers/projects`,
   `GET /developers/projects/:id/rooms`,
   `GET /developers/projects/:id/recordings`) plus the recording download
   `GET /developers/projects/:id/recordings/:egressId/file`. Ownership check
   is one query (`project.developerAccountId === account.id`, else 404 - same
   indistinguishable-404 stance as the rest of the platform).
2. **Reuse `RecordingsService` for list and download.** It already handles
   finalized-vs-parts serving, Range/206, and content types; the developer
   endpoints wrap it with an ownership check instead of duplicating file
   logic. `DeveloperModule` imports `EgressModule` (already exports
   `RecordingsService`; no cycle - EgressModule does not import Developer).
3. **Recording playback via blob URL, not query-param tokens.** The console
   fetches the file with `Authorization: Bearer <devToken>` and plays from
   `URL.createObjectURL`. Putting the dev token in a `<video src>` query
   param would leak it into logs; a blob keeps the token in headers only.
4. **`sessionStorage` for the dev token.** Short-lived (minutes) by design,
   console-only surface, cleared on logout/expiry; the app's user session
   (httpOnly cookies) is untouched and separate. A `DevAuthContext` mirrors
   the existing `AuthContext` shape (`isAuthenticated`, `isLoading`, login,
   register, logout).
5. **Console is its own feature module** (`src/features/console`) - it
   consumes the developer API, not the room/media features. Routes: `/console`
   (redirects to `/console/login` when unauthenticated), `/console/login`
   (login+register tabs), `/console/projects/:id` (detail). One nav entry in
   `MainHeader` labeled "For developers" shown always (it is a separate
   account type from the app login).

## Risks / Trade-offs

- [Dev token in sessionStorage is XSS-readable] Same trade-off class as any
  SPA token storage; the surface is the developer's own console and the token
  is short-lived. → Documented; httpOnly cookie flow would be a later
  hardening change touching the auth module.
- [Recording downloads bypass the API-key audit path] Developers now download
  with their own auth. → Same ownership rules, same files, one more guarded
  route; no permission change.
- [Console grows past v1] Keys/webhooks/rooms/recordings is already the
  platform's full surface; anything more (usage graphs, egress control) is
  explicitly parked to keep this change shippable.

## Migration Plan

No schema changes. Additive endpoints on an existing controller and a new
client feature module. Rollback: revert; `/v1` and the app are untouched.
