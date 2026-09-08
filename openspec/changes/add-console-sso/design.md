## Context

- The app and the developer platform deliberately use two account systems
  (`User` with httpOnly-cookie JWTs vs `DeveloperAccount` with short-lived
  bearer tokens). This change bridges them without merging the models: the
  bridge is an explicit, persistent link column, never a username guess.
- The global `JwtAuthGuard` (APP_GUARD) protects every route unless it opts
  out via `@SkipAuthGuard()`. Every existing developer route opts out and
  applies `DevJwtGuard`; the SSO endpoint is the one route that does the
  opposite - no skip, no dev guard - so the app cookie session authenticates
  it. `JwtStrategy.validate` returns `{ id, email, role }`, so the service
  re-reads the `User` row for username and password hash.
- `User.username` and `DeveloperAccount.username` are each unique within
  their own tables; a username can exist in both. Keying the link on
  `userId` (unique, nullable) keeps first-party accounts distinct from
  unrelated third-party developer accounts that happen to share a name.
- Client: the console login page sits inside the app's `AuthProvider` at the
  router root, so `useAuth()` is available there; the dev API client must
  send cookies (`credentials: "include"`) for the SSO call, which it can do
  harmlessly on every call (matching the app's own ApiClient).

## Goals / Non-Goals

**Goals:**
- One-click console entry for signed-in site users; manual form stays for
  external developers.
- A stable, explicit user-to-developer link with predictable resolution
  rules and no permission leaks.

**Non-Goals:**
- No unification of the two account models, no shared sessions beyond this
  endpoint, no automatic dev-token refresh, no sync of future password
  changes (documented limitation: SSO copies the hash once at creation).
- No SSO in the reverse direction (a developer token never grants app
  identity).

## Decisions

1. **Link column, not username matching.** `DeveloperAccount.userId` is
   unique and nullable; SSO resolves by it. A developer account created
   independently by an external "alice" is never handed to the site's "alice"
   - the creator gets `alice-2`. Repeat SSO always returns the linked row,
   even if username collisions accumulated since.
2. **Copy the password hash at creation.** SSO-created accounts also work at
   the manual login form with the site credentials. Password later changes on
   the site do not propagate (documented limitation; re-linking semantics
   stay out of scope).
3. **Route protection via the global guard.** `@Post('auth/sso')` without
   `@SkipAuthGuard()` inside `DeveloperController` - the app cookie session
   authenticates it, `@Throttle` limits brute force, response is always 200
   with `{ token, username, created }`.
4. **Username resolution is deterministic.** `username`, then `username-2`,
   `username-3`, ... up to a bounded attempt count, then fail with 409
   (practically unreachable; keeps the loop honest). Same credentials and
   resolution for every first SSO regardless of how the collision arose.

## Risks / Trade-offs

- [Hash copy drifts after a site password change] The manual dev login keeps
  working with the old password. → Documented limitation; the SSO path is
  unaffected (link-based, no password involved). A sync hook is a later
  change if it ever matters.
- [Cookie-bearing CORS call] The console page and the API already share the
  site's CORS posture; `credentials: "include"` on the dev client matches
  the app's own client. No new CORS surface.
- [User deletion cascades the linked developer account] The link makes the
  dev account meaningless without its user; projects and keys of an
  SSO-created account disappear with the user. Acceptable for
  first-party-created accounts; externally registered developer accounts are
  never linked and unaffected.

## Migration Plan

Additive Prisma migration: nullable `userId` column + unique index + FK
(cascade) on `DeveloperAccount`. No backfill needed - existing developer
accounts stay unlinked. Rollback: drop the column and the endpoint.
