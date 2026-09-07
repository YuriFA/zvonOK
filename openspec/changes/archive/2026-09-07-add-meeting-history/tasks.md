## 1. Schema and snapshot

- [x] 1.1 Prisma: add `CallRecord` model (ownerId cascade relation, roomName, roomSlug, startedAt, endedAt, messageCount, messages Json) + migration; regenerate client
- [x] 1.2 Snapshot inside `RoomService.softDeleteRoom` for user-owned rooms in the end transaction (author labels resolved: username or `Guest`); unit tests for the snapshot (content, guest labels, project rooms excluded)

## 2. History endpoints

- [x] 2.1 Implement `GET /rooms/history` (owner-scoped, newest first, max 100, without messages), `GET /rooms/history/:id` (record + transcript), `DELETE /rooms/history/:id`; declare static `history` route before `:slug`; Swagger decorators
- [x] 2.2 Unit tests: ordering and cap, foreign record 404, deletion, route-order guard (GET /rooms/history not captured by :slug)

## 3. Client history page

- [x] 3.1 API client methods + typed errors for the three endpoints; React Query hooks with shared `history` query keys
- [x] 3.2 `/history` route (lazy + Suspense), MainHeader nav link for authenticated users, redirect to login for guests
- [x] 3.3 History page: list (name, date, duration, message count) with empty/loading/error states; transcript detail fetch + render; delete with confirmation; client tests for the page states

## 4. Verification and archive

- [x] 4.1 E2E: end a room with chat messages -> record exists -> cleanup deletes the room -> history still served; full server suite + lint green
- [x] 4.2 `pnpm openspec:validate`, archive the change, update `docs/roadmap`-adjacent parked list if needed
