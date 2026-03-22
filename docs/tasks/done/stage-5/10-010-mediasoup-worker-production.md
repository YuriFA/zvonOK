# TASK-010 — Production Worker Binary

## Status
completed

## Priority
medium

## Description
Configure mediasoup worker binary for production deployment. Mediasoup automatically downloads prebuilt binary from GitHub Releases during `pnpm install`, falling back to C++ compilation (requires Python + C++ compiler). With `ignore-scripts=true` in `.npmrc`, the binary won't build and server will crash with `ENOENT`.

## Implementation

### Files Created
- `apps/server/Dockerfile` - Multi-stage Dockerfile with 3 stages
- `.dockerignore` - Excludes unnecessary files from build context

### Dockerfile Stages

**Stage 1: mediasoup-builder**
- Base: `node:22-alpine`
- Installs: `python3`, `make`, `g++` (build deps for mediasoup)
- Runs `pnpm install` which builds mediasoup worker

**Stage 2: production**
- Base: `node:22-alpine`
- Installs: `dumb-init` (proper signal handling)
- Runs `pnpm install --prod --ignore-scripts` (no rebuild)
- Copies compiled worker binary from builder stage
- Sets `MEDIASOUP_WORKER_BIN=/app/mediasoup-worker`

**Stage 3: development**
- Base: `node:22-alpine`
- Installs build deps for local development
- Runs `pnpm dev` with hot reload

### Build Commands
```bash
# Production build
docker build -f apps/server/Dockerfile --target production -t webrtc-chat-server .

# Development build
docker build -f apps/server/Dockerfile --target development -t webrtc-chat-server:dev .
```

### CI/CD Options
- **Option A:** Use `MEDIASOUP_FORCE_WORKER_PREBUILT_DOWNLOAD=true pnpm install`
- **Option B:** Cache compiled binary between builds (current approach with multi-stage)

### Development Fallback
Manual worker rebuild when needed:
```bash
cd node_modules/.pnpm/mediasoup@*/node_modules/mediasoup && npm run worker:build
```

## Acceptance Criteria
- [x] Dockerfile with multi-stage build for mediasoup worker
- [x] .dockerignore file for clean builds
- [ ] CI/CD pipeline configured for worker binary handling (future)
- [x] Documentation for manual rebuild process
- [x] Server starts without ENOENT error in container

## Notes
- Prebuilt binaries available for: Linux (x64/arm64), macOS (x64/arm64), Windows (x64)
- Worker binary path: `node_modules/.pnpm/mediasoup@*/node_modules/mediasoup/worker/out/Release/mediasoup-worker`
- For ARM Macs: Docker builds will work but may use Rosetta 2 in CI

## Dependencies
- TASK-001 — mediasoup Worker Setup (completed)
