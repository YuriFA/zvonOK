# Tasks: add-react-sdk-host-controls

## 1. Publishable `@zvonok/client`

- [x] 1.1 Build config: `tsconfig.build.json` emitting `dist/` (ESM js + d.ts), `build` script in `packages/client`
- [x] 1.2 Package metadata: `publishConfig` (dist exports, `files: ["dist"]`), `license`, `repository`; workspace source exports untouched
- [x] 1.3 Pack smoke: `pnpm pack`, install the tarball into a throwaway project, imports and types resolve

## 2. `@zvonok/react` package

- [x] 2.1 Scaffold `packages/react`: manifest (dep `@zvonok/client`, peer `react` >= 18, publish-ready metadata), tsconfig, vitest, workspace wiring
- [x] 2.2 Config provider carrying server URL and SDK options
- [x] 2.3 Join lifecycle hook: connect/join with room slug + room token, connection state, typed join errors
- [x] 2.4 Participants-and-tracks hook: peer join/leave, track subscribe/unsubscribe as React state
- [x] 2.5 Device controls hooks and host-control action wrappers (mute, mute-all, lock)
- [x] 2.6 Unit tests for provider and hooks (jsdom, mocked `@zvonok/client` managers)

## 3. Server host controls

- [x] 3.1 Interfaces and gateway events: `sfu:mute-peer`, `sfu:mute-all`, `sfu:lock-room`; `sfu:peer-muted`, muted-by-host flag, `sfu:error` codes
- [x] 3.2 Service enforcement: host resolution (room owner vs admin-token), server-side producer pause, mute-all snapshot excluding host, in-memory lock state gating the join path and cleared on room end
- [x] 3.3 Unit tests: authorization matrix (owner / admin-token / non-host), mute and lock state transitions
- [x] 3.4 Socket-level e2e: non-host denial, lock refuses token join, mute reaches target

## 4. App migration to `@zvonok/react`

- [x] 4.1 Rewire `use-room-session`/`use-room-sfu` and state contexts onto `@zvonok/react` hooks; context public APIs unchanged
- [x] 4.2 Existing client suite passes without test edits

## 5. App host controls UI

- [x] 5.1 Per-participant mute control in the participants list for owner/admin
- [x] 5.2 Mute-all and room lock toggle controls with locked indication
- [x] 5.3 Muted-by-host indication and typed denial surfacing
- [x] 5.4 Client tests: host sees controls, non-host does not, muted-by-host state, lock state

## 6. Publish, docs, verify

- [x] 6.1 Root `LICENSE` (MIT) and final package metadata/readmes
- [ ] 6.2 Publish `@zvonok/client` and `@zvonok/react` (needs user-owned `@zvonok` npm org and login; pack-verify first)
- [x] 6.3 `docs/quickstart.md`: clean project, curl room + token, React snippet, join on the VPS
- [x] 6.4 `docs/deployment.md` publish notes; flip roadmap change #2 status
- [x] 6.5 Full verification: server + client + package suites, e2e, browser smoke of host controls
