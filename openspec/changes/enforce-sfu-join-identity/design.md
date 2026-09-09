## Context

`SfuService.joinRoom` builds the peer from the client payload when no room
token is present (`sfu.service.ts:309-324`) and records `payload.roomOwnerId`
into the `roomOwners` map (`:338-340`); `isRoomHost` (`:810-815`) grants kick /
mute-all / lock to whoever matches that map. Verified primitives that already
exist and are reused, not reinvented:

- `RoomTokenHelper.verify` - project-room tokens (claims: `participantId`,
  `name`, `roomId`, `keyId`, `publish`, `admin`), already enforced at join via
  `resolveTokenPeer`.
- `resolveRoomSocketIdentity` (`auth/helpers/room-socket-auth.helper.ts`) -
  resolves a handshake identity for the `/chat` gateway from
  `handshake.auth.token`, the `access_token` cookie (user JWT), or the
  `zvonok_guest_<slug>` cookie (guest JWT); used with `JwtService` +
  `GuestService`.
- `GuestService.validateGuestToken(token, slug)` - verifies the guest JWT
  issued at approval (`guestId`, `roomSlug`, `displayName`, `scope: 'room'`).
- `JwtStrategy` secrets/config - `JWT_ACCESS_SECRET`, user claims `sub`/`id`,
  `role`.

The app UI today sends `{roomId, userId, username, roomOwnerId, roomSlug}`
(`apps/client/src/hooks/use-mediasoup.ts:159-161`); the SDK
(`packages/client`) spreads the same payload shape and already has a `token`
field. The `/sfu` gateway uses reflected CORS with credentials so SDK clients
from arbitrary origins can connect.

## Goals / Non-Goals

- Goals: no unverified identity reaches peer state or authorization; host
  powers grounded in DB ownership or token admin claims; SDK embeds (no app
  cookies) keep working unchanged; no new REST surface.
- Non-Goals: changing room-token minting or claims; migrating the app UI to
  project-room tokens; touching `/chat` auth; refreshing access cookies on a
  different schedule than today.

## Decisions

### D1. Verify at join time with the existing handshake helper
At `sfu:join`: if `payload.token` is present, take the existing
`resolveTokenPeer` path unchanged. Otherwise call
`resolveRoomSocketIdentity(socket, jwtService, guestService)`:
- user identity -> load the room row (`prisma.room.findUnique`) once, derive
  display name from the user record, and derive ownership from
  `room.ownerId === verified user id`;
- guest identity -> require `guestService.validateGuestToken(token, slug)`
  to match the target room's slug (the room row supplies the slug);
- neither -> emit `sfu:join-error` with a new coded error
  (`SFU_JOIN_UNAUTHORIZED`) and create no peer.

Reuses the exact code path `/chat` already trusts; no handshake middleware
change, no new endpoint. The room row is fetched once per join (indexed PK
lookup) - negligible load.

### D2. Cookie identity is origin-gated; token path stays origin-free
`resolveRoomSocketIdentity` accepts cookies; on a reflected-CORS namespace
that would let a malicious page drive a WS join carrying the visitor's cookies
(WS CSRF). Gate it: accept cookie-derived identity only when
`client.handshake.headers.origin` matches the configured app origin allowlist
(`CLIENT_URL`, comma-separated list). The room-token path never reads cookies
and stays acceptable from any origin. Non-browser clients (no `Origin`
header) using only `handshake.auth.token` with a room token are unaffected.

### D3. Ownership map populated from verified joins only
`roomOwners` is set exclusively when a verified user identity's id equals the
room row's `ownerId`, or when a room token carries `admin`. The
`roomOwnerId` payload field is removed from `SfuJoinPayload` (server),
`SfuJoinOptions`-equivalents (SDK), and the app call sites
(`use-mediasoup.ts`, `use-room-sfu.ts`, `use-room-session.ts`).
`isRoomHost` logic itself stays as-is (owner match or `admin` claim).

### D4. New join error codes, old ones unchanged
Extend `SfuJoinErrorCode` with `SFU_JOIN_UNAUTHORIZED` (no verifiable
credential) and `SFU_JOIN_FORBIDDEN` (credential valid but wrong room for the
guest path). Existing `ROOM_TOKEN_*` codes and `ROOM_LOCKED` keep their
meaning. The app UI maps `SFU_JOIN_UNAUTHORIZED` to a redirect into the auth
flow instead of retrying.

### D5. SDK types drop trusted identity fields
`SfuJoinPayload` (server, `sfu.interface.ts`) becomes
`{roomId, token?, ...}`; the SDK join payload keeps `roomId`, `roomSlug`,
`token` and drops `userId`/`username`/`roomOwnerId` from its
trusted-identity position. `@zvonok/client`'s `ZvonokRoom`/hooks stop
requiring an explicit `username` for the app-embedded path - the display name
arrives verified from the server identity. SDK ships as a patch/minor bump
(breaking for anyone relying on payload identity forging - none documented;
the quickstart path is token-based and unchanged).

### Rejected: server-minted join tickets via a new REST endpoint
Would unify all paths onto payload credentials, but adds an endpoint, a UI
pre-join round trip, reconnect ticket refresh, and a second signed-artifact
format alongside room tokens - for no security gain over D1, which reuses
already-issued and already-verified credentials.

### Rejected: strict CORS on `/sfu`
Would close the cookie surface trivially but breaks third-party SDK embeds
from arbitrary origins - a platform promise (quickstart embeds). D2 gives the
same closure only where cookies are actually honored.

## Risks / Trade-offs

- App UI joins now fail when the access cookie has expired mid-session
  (today they silently succeed with forged-ish identity). Mitigated by the
  D4 UI mapping (redirect to re-auth); the same cookie already gates `/chat`,
  so expiry behavior is consistent across namespaces.
- `resolveRoomSocketIdentity` grows an origin-check parameter - a small,
  explicit signature change to a shared helper; `/chat` passes its existing
  strict-origin context unchanged.
- DB read added to every non-token join (one indexed PK lookup).

## Migration Plan

1. Server enforcement + payload field removal land together with the app UI
   and SDK updates in this change (single deployable unit; no
   credential-less client is expected in the wild - the SDK is days old).
2. No data migration; no schema change.
3. Rollback = revert the deploy; no persistent state depends on the new
   fields.

## Open Questions

(none - cookie origin allowlist reuses `CLIENT_URL`; multi-origin support via
comma-separated list, same parsing as existing CORS config helpers.)
