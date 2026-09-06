# Tasks: Add Whiteboard

## Server

- [x] 1. `WhiteboardModule` scaffold: gateway on `/whiteboard` namespace with chat-gateway `ClientIdentity` auth (JWT cookie + guest cookie), room-scoped `whiteboard:join` admission via `RoomService` (active room, identity-room match), owner resolution at join
- [x] 2. Sync core in `WhiteboardService`: per-room snapshot holder (`Map<slug, {snapshot, mode}>`), `whiteboard:op` relay to room peers with draw-permission check and size caps (256 KB op / 4 MB snapshot), snapshot+mode replay on every join, `whiteboard:mode` owner-gated toggle broadcast
- [x] 3. Board teardown: drop room board via the SfuService teardown tap on both room-end paths; unit tests for cleanup
- [x] 4. Gateway unit tests: auth reject, room isolation, late-joiner snapshot, mode gating for guest vs owner, op drop for locked drawer, size-cap disconnect; two-client socket test for concurrent ops relay

## Client

- [x] 5. `features/whiteboard`: `WhiteboardProvider` context + lazy tldraw mount, `/whiteboard` socket lifecycle bound to panel open/close, snapshot load and diff relay wiring
- [x] 6. Room integration: "Board" button in room center controls, panel surface in `active-room-view` (overlay beside grid), read-only enforcement from mode, owner toggle UI, remote updates visible for viewers; component tests (panel toggle preserves media state mocked, read-only vs editable, owner toggle visible)

## Verification

- [x] 7. Real two-client smoke: register user + guest, both open board, concurrent shapes converge, late third client catches up, owner lock flips guest to read-only live; lint, unit suites, builds green
- [x] 8. Docs: `docs/whiteboard.md` usage + config, VitePress nav entry, roadmap item 7 ticked; validate specs
