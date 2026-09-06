# Tasks: add-platform-webhooks

## 1. Storage and configuration

- [x] 1.1 Prisma: nullable `webhookUrl`/`webhookSecret` on `Project` + migration
- [x] 1.2 Developer module: `PUT`/`DELETE /developers/projects/:id/webhooks` with ownership guard, https URL validation, secret generation; unit tests (own project ok, foreign 404, bad URL 400, replace rotates secret)

## 2. Dispatcher core

- [x] 2.1 `WebhooksModule` + `WebhookDispatcher`: room-to-project resolution, user-room and unconfigured no-op, typed emit methods
- [x] 2.2 Signer and delivery: `sha256=HMAC(secret, "{ts}.{body}")` headers, 5s timeout, non-2xx = failure
- [x] 2.3 Retry chain: 5 attempts at 10s/30s/2m/10m/30m, drop after exhaustion, per-project FIFO, fire-and-forget with error containment; unit tests with a local HTTP stub (signature validity, retry schedule, drop, FIFO order, user-room silence)

## 3. Emission points

- [x] 3.1 `SfuModule` wiring; `room.started` on first peer + `participant.joined` in `joinRoom`
- [x] 3.2 `participant.left` with reason (leave/kick/disconnect/room-end) in `removePeer`; `room.ended` in the room-end path; unit tests for each emission and reason mapping

## 4. E2E and docs

- [x] 4.1 Socket-level e2e: in-process HTTP receiver asserts signature headers, `room.started`/`joined`/`left`/`ended` sequence for a project room, and silence for a user room
- [x] 4.2 Docs: webhook section in deployment/quickstart-adjacent docs; flip roadmap queue item 1 status
- [x] 4.3 Full verification: server suite, e2e, lint, tsc
