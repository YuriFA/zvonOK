## Why

The app has no memory of past calls: rooms are hard-deleted by the hourly
cleanup one hour after they end (messages cascade with them), and the only
call entry points are the home page actions. Users cannot see what calls they
held, when, or how long they lasted. The parked "meeting history" item closes
this: a per-user call history that survives room cleanup.

## What Changes

- When a user-owned room is ended by its owner, the server snapshots a call
  record in the same transaction: room name/slug, started/ended timestamps,
  and the room's chat messages (author label, content, timestamp). The record
  survives the room's hard deletion.
- New server surface: `GET /rooms/history` (owner's call records, newest
  first, without message payloads), `GET /rooms/history/:id` (record with its
  chat transcript), `DELETE /rooms/history/:id` (owner removes a record).
- New client page `/history`: the signed-in user's past calls with date,
  duration, and message count; expanding a record shows its chat transcript;
  records can be deleted. Nav link appears for authenticated users.
- Platform contract unchanged: project-owned rooms still emit no user-facing
  history (they have no user host).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `room`: a new "Call history records" requirement - snapshot on owner-ended
  user rooms, owner-scoped listing/detail/deletion API, records outliving
  room cleanup.
- `client`: the "Routes" requirement gains the lazy `/history` route; a new
  "Meeting history page" requirement specifies the list, transcript view, and
  deletion behind authentication.
