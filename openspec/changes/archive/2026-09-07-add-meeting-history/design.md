## Context

- Ended user rooms are hard-deleted by the hourly cleanup one hour after
  `endedAt`, messages cascading. Any history built on the `Room`/`Message`
  rows is therefore bounded to that window - history requires its own
  storage.
- A user-owned room ends only through the owner's `DELETE /rooms/:id`
  (`RoomService.softDeleteRoom` + `SfuService.endRoom`). Project-owned rooms
  are ended via the public API and have no user host.
- The chat surface is `GET /messages/:roomId` (public, paginated) today;
  messages carry `userId` (nullable for guests), `guestId`, `content`,
  `createdAt`.
- Client conventions: React Router routes in `lib/config/routes.ts` (room page
  lazy with Suspense), TanStack React Query with shared query keys, typed API
  errors from `lib/api/api.errors.ts`, Tailwind + shared UI primitives,
  `MainHeader` for navigation.

## Goals / Non-Goals

**Goals:**
- A durable per-user call history that outlives room cleanup.
- Chat transcripts preserved per call without keeping dead rooms alive.
- Small surface: three owner-scoped endpoints + one client page.

**Non-Goals:**
- No server-side recordings for user rooms (platform egress stays
  project-only; recordings playback is dashboard/recordings-API territory).
- No analytics (participant counts are not tracked today; no aggregates).
- No active-call listing on the history page (live calls are visible in the
  room itself; records cover past calls only).
- No retention policy for history records yet - records live until the owner
  deletes them (documented; a retention sweep would mirror the rooms cleanup
  pattern and is a later decision).

## Decisions

1. **Snapshot at end, not retention extension.** When `softDeleteRoom` runs
   for a user-owned room, a `CallRecord` row is written in the same Prisma
   transaction. Extending the 1-hour room retention instead would grow live
   storage and delay cleanup for a different purpose; a snapshot freezes the
   call's identity and transcript at exactly the moment it ended.
2. **Transcript as a JSON column, not a child table.** The snapshot is
   written once and read whole; no queries target individual messages inside
   it. A separate `CallRecordMessage` table would buy query power nothing
   uses. Shape: `[{ author, content, createdAt }]` where `author` is the
   username or `Guest` (resolved at snapshot time - user renames later do not
   rewrite history). Size is bounded by the room's message count; typical
   calls carry tens of messages.
3. **Endpoints under the room controller, static routes before `:slug`.**
   `GET /rooms/history`, `GET /rooms/history/:id`, `DELETE
   /rooms/history/:id`, all behind the JWT guard, owner-scoped. NestJS
   resolves same-controller routes in declaration order, so the static
   `history` segment must be declared before the `:slug` route; a unit test
   pins that `GET /rooms/history` is not captured by `:slug`. Slug collision
   is not a realistic concern (slugs are server-generated, not user input).
4. **List without payloads, detail with transcript.** The list endpoint omits
   the messages JSON (newest first, paginated cap of 100) so the page loads
   without dragging every transcript; the detail endpoint returns the record
   with messages.
5. **Additive Prisma model.** `CallRecord { id, ownerId -> User (cascade),
   roomName, roomSlug, startedAt, endedAt, messageCount, messages Json }`
   with an `ownerId` index. Records are created only from user-owned rooms;
   the project-room path never touches the table.
6. **Client page mirrors existing patterns.** `/history` registered eager in
   `ROUTES`, rendered lazy like the room page; query hooks with shared keys
   (`history` namespace); mutation with confirmation (existing dialog/toast
   conventions) for deletion; MainHeader nav link shown when
   `isAuthenticated`.

## Risks / Trade-offs

- [Snapshot failure blocks room end] The snapshot writes inside the end-room
  transaction; a failure would prevent ending the room. → The write is a
  single insert with data already in memory; if it still fails, the room end
  fails loudly (same contract as today) rather than silently losing history.
- [Transcript privacy] Call transcripts persist beyond the 1-hour room
  retention and are plaintext (E2E encryption is parked). → Owner-scoped
  access + delete endpoint give the owner control; a retention sweep for
  records is an explicit later decision, not silently absent.
- [Large transcripts] A pathological room with thousands of messages makes a
  heavy detail payload. → Accepted for v1; pagination inside a snapshot is
  meaningless and capping would lose data. `messageCount` surfaces the size
  before fetching.

## Migration Plan

Additive Prisma migration (new table). No backfill - calls that ended before
this change are already deleted or will be within the hour; history starts
from deployment. Rollback: drop the table; room ending is untouched.
