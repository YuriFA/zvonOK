## Why

The `/sfu` join trusts client payload identity whenever no room token is
presented: any socket can claim an arbitrary `userId` and, by sending
`roomOwnerId`, claim ownership and gain kick / mute-all / lock powers
(`sfu.service.ts` builds the peer from the payload and populates `roomOwners`
from `payload.roomOwnerId`). This lets any caller forge host rights and
impersonate other participants - the identity hole identified in the
end-of-month-2 checkpoint review. The verified primitives to close it already
exist: room tokens (already enforced), the access-JWT cookie the app UI
already carries, and the signed guest JWT the approval flow already issues.

## What Changes

- **BREAKING** `/sfu:join` SHALL derive identity only from verified
  credentials: a room token in the payload (project rooms, unchanged), or the
  verified handshake identity of a registered user (access JWT cookie) or an
  approved guest (guest JWT bound to the room slug). Joins presenting no
  verifiable credential are refused with a coded error.
- **BREAKING** `userId`, `username`, and `roomOwnerId` in the join payload are
  no longer trusted: user identity comes from the verified access JWT (and the
  user record), guest identity from the verified guest JWT, ownership from the
  `room.ownerId` DB column. The payload fields are ignored for identity and
  removed from the SDK/app join payloads.
- Host authorization (`isRoomHost`) is grounded in server-verified state only:
  DB ownership for user-owned rooms, room-token admin claims for project
  rooms. The `roomOwners` map is populated exclusively from verified owner
  joins.
- Cookie-based identity on `/sfu` is accepted only from allowlisted app
  origins (`CLIENT_URL`); the room-token path stays origin-free for
  third-party SDK embeds. This keeps reflected CORS usable for SDK clients
  without opening a cookie-CSRF surface.
- `/sfu` join error codes gain codes for unauthenticated/forbidden joins; the
  app UI surfaces the refusal (redirect to re-auth) instead of a silent dead
  room.
- The app client stops sending `roomOwnerId` (and stops relying on payload
  `userId`) when joining; SDK types drop the trusted-identity fields.
  `@zvonok/client` reconnects re-verify credentials the same way.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `sfu`: join identity is derived from verified credentials on every path;
  host powers are grounded in DB ownership or token admin claims; new coded
  join-refusal errors; the token-path requirement's "existing paths unchanged"
  scenario is replaced by verified user/guest cookie paths.
- `room`: guest flow requirement is amended - the guest JWT issued on approval
  also authorizes the SFU join for its room (slug-bound, same verification as
  today).
- `sdk`: connection/join contract is amended - app-UI joins authenticate via
  the established handshake cookies; the SDK's platform join contract (room
  token) is unchanged, and trusted identity fields leave the SDK payload
  types.
