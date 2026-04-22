# TASK-096 — Guest Message Identity & Persistence

> **Status:** completed
> **Priority:** high
> **Created:** 2026-04-22

---

## Description

Guest messages are not identified as "own" on the client (currentUserId is empty for guests) and are not persisted to the database. Fix both issues. Also fix message list ordering — messages were rendered newest-first instead of oldest-first.

## Scope

- Schema: make `userId` nullable, add `guestId String?` to `Message`
- Server: save guest messages to DB via new `saveGuestMessage()` method
- Server: include `userId: guestId` in guest message broadcast payload
- Server: normalise guest messages in `getMessages()` — expose `guestId` as `userId`, provide `user` shape
- Server: change `getMessages()` order from `createdAt: 'desc'` to `'asc'` (oldest-first)
- Server: add `GET /rooms/:slug/me` endpoint via `FlexibleRoomAuthGuard` — returns `{ userId, isGuest }`
- Client: add `roomApi.getRoomMe()` to resolve current identity for guests
- Client: `RoomPage` resolves guest identity via `/rooms/:slug/me` on entering active view
- Client: pass `currentUserId` down through `RoomView` instead of reading `user?.id` inline
- Client: remove `.reverse()` from `MessageList` — data now arrives oldest-first
- Client: fix `loadHistory` prepend → append (`[...prev, ...newMessages]`) to match `asc` order
- Client: add `isGuest?: boolean` to `Message` type
- Client: fix `useChat` — track `currentUserId` in a ref to avoid socket reconnect on identity resolve

## Technical Design

### Schema change
```prisma
model Message {
  userId    String?   // nullable — null for guest messages
  guestId   String?   // UUID from guest JWT — null for user messages
  // relation to User is optional (no relation when guestId is set)
}
```

### `GET /rooms/:slug/me`
Protected by `FlexibleRoomAuthGuard` which accepts both JWT user cookies and guest JWT cookies.
Returns `{ userId: string; isGuest: boolean }`.
Used by the client to resolve the guest's identity once they enter the active room view.

### Message ordering
Server returns messages `orderBy: { createdAt: 'asc' }`.  
Client renders them in the same order — no reversal needed.  
`loadHistory` (pagination) appends older pages to the end: `[...prev, ...newMessages]`.

### Guest message broadcast
Adds `userId: guestId` to top-level payload so client `isOwn` check works.

## Acceptance Criteria

- [x] Guest messages saved to DB
- [x] Chat history includes guest messages
- [x] Guest sees own messages aligned right (`isOwn = true`)
- [x] Registered users unaffected
- [x] Migration runs cleanly
- [x] Messages render oldest-first (bottom = newest)
- [x] Guest identity resolved via `/rooms/:slug/me` REST endpoint

## Related Files

- `apps/server/prisma/schema.prisma`
- `apps/server/src/chat/chat.service.ts`
- `apps/server/src/chat/chat.service.spec.ts`
- `apps/server/src/chat/chat.gateway.ts`
- `apps/server/src/room/room.controller.ts`
- `apps/server/src/room/guards/flexible-room-auth.guard.ts`
- `apps/client/src/features/chat/types/chat.types.ts`
- `apps/client/src/features/chat/hooks/use-chat.ts`
- `apps/client/src/features/chat/components/message-list.tsx`
- `apps/client/src/features/chat/components/__tests__/message-list.test.tsx`
- `apps/client/src/features/room/services/room-api.ts`
- `apps/client/src/features/room/components/room-view.tsx`
- `apps/client/src/routes/room.tsx`
- `apps/client/src/routes/__tests__/room.test.tsx`
