## 1. Server: join identity enforcement

- [x] Extend `SfuJoinErrorCode` with `SFU_JOIN_UNAUTHORIZED` and `SFU_JOIN_FORBIDDEN`; remove `roomOwnerId` (and trusted `userId`/`username`) from the server `SfuJoinPayload` in `apps/server/src/sfu/interfaces/sfu.interface.ts`
- [x] Add origin-allowlist option to `resolveRoomSocketIdentity` (`auth/helpers/room-socket-auth.helper.ts`): cookie-derived identity accepted only when the handshake `Origin` matches the `CLIENT_URL` allowlist; `auth.token` path unaffected; update the `/chat` and `/whiteboard` call sites for the new signature
- [x] In `SfuService.joinRoom`: route non-token joins through `resolveRoomSocketIdentity`; load the room row once; build user peers from verified JWT claims + user record; build guest peers via `validateGuestToken` against the room slug; emit `SFU_JOIN_UNAUTHORIZED` / `SFU_JOIN_FORBIDDEN` otherwise; set `roomOwners` only for verified owner joins or token `admin` claims
- [x] Update `sfu.service.spec.ts`: join tests for user-cookie path, guest path, token path regression, unauthenticated refusal, forged owner denied host powers, cookie identity refused from non-allowlisted origin

## 2. Client: drop trusted identity fields

- [x] Remove `userId`/`username`/`roomOwnerId` trusted-identity fields from `packages/client` join payload types and `SfuManager.join` (`packages/client/src/sfu/`); keep `roomSlug` and `token`; `sfu:joined` now carries the server-verified `participant` identity (`@zvonok/react` join ack and typed `ZvonokJoinError` already covered the refusal path)
- [x] Update `apps/client` join call sites (`use-mediasoup.ts`, `use-room-sfu.ts`, `use-room-session.ts`) to stop sending identity fields; join-refusal errors surface through the kicked/leave flow
- [x] Update `packages/client` tests (`manager.test.ts`, event-router tests) and `apps/client` vitest suites for the new payload shape and error mapping

## 3. Docs and SDK versioning

- [x] Update `docs/quickstart.md` if it mentions identity payload fields (verified: quickstart is token-based, no identity payload mentions)
- [x] Bump `@zvonok/client` / `@zvonok/react` to 0.2.0 (payload identity fields removed); README bullets need no change

## 4. Verification

- [x] `pnpm -C apps/server test sfu.service.spec.ts` and full `pnpm test` green (345/345)
- [x] `pnpm -C apps/client test:run` and `pnpm -C packages/client test` green (258/258 app, 167/167 client, 47/47 react)
- [x] E2E smoke against the live dev server (12/12): cookie join returns verified identity; verified owner locks the room; locked room refuses with ROOM_LOCKED; anonymous join refused with SFU_JOIN_UNAUTHORIZED; guest path covered by unit tests; developer-key room token join succeeds from an origin-less client (SDK embed path)
- [x] `pnpm openspec:validate` passes for the change
