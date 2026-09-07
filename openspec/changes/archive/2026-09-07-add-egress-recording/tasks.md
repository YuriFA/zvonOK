## 1. Configuration and schema

- [x] 1.1 Add `EGRESS_RECORDINGS_DIR` to `egress.config.ts` (default `<cwd>/data/egress-recordings`) and document it in `apps/server/.env.example` or env docs
- [x] 1.2 Prisma migration: add nullable `recordingSizeBytes BigInt?` and `recordingFinalizedAt DateTime?` to `Egress`; extend `EgressOutputs` type with `record: boolean`

## 2. Recording sink in the pipeline

- [x] 2.1 Extend `composeEgressArgs` with the MPEG-TS tee branch (`recording-<part>.ts`) and unit-test the argv for record-only, record+HLS, and record+RTMP combinations
- [x] 2.2 Wire part tracking in `EgressService`: record sink path per restart index, part file list maintained across supervised restarts

## 3. Finalization and lifecycle

- [x] 3.1 Implement finalization on session end: concat remux of parts to `recording.mp4` (stream copy), metadata update (`recordingSizeBytes`, `recordingFinalizedAt`), part cleanup, remux-failure fallback to raw parts
- [x] 3.2 Keep recording directories intact on server-restart reconciliation (`failed` sessions serve raw parts); unit-test the reconciliation path

## 4. Platform API surface

- [x] 4.1 Implement `RecordingsController`: `GET /v1/recordings` (project-scoped list, room filter, newest first), `GET /v1/recordings/:egressId/file` (Range-supported download, correct content types), `DELETE /v1/recordings/:egressId` (removes files + 404 after)
- [x] 4.2 Expose `recordingUrl` and `recordingSizeBytes` on `EgressSessionView` for record sessions
- [x] 4.3 Unit tests for scoping (foreign project 404/absent), Range 206 handling, content types, deletion semantics

## 5. Verification and docs

- [x] 5.1 Extend the egress e2e: start a record-only session against the fake-media pipeline, assert the finalized MP4 exists with audio+video streams (ffprobe) and the API list/download/delete cycle passes
- [x] 5.2 Full server suite (`pnpm -C apps/server test` + `test:e2e`) and lint green
- [x] 5.3 Update `docs/egress.md` (record output, recordings API, disk usage math) and run `pnpm openspec:validate`; archive the change
