# TASK-074 — Client Build Optimization

## Status
planned

## Priority
medium

## Description
Optimize the React client production build for deployment. The basic build pipeline already works (multi-stage Dockerfile, Vite build, Caddy serving). This task focuses on build size optimization and code splitting to ensure fast load times over the network.

Note: This replaces the original TASK-061 (TASK-004-client-build.md). The Dockerfile, env vars, and Caddy serving were already implemented in TASK-044 (TASK-001-https-caddy.md). What remains is build optimization.

## Scope
- Audit current production build size (`pnpm -C apps/client build` + analyze output)
- Route-based code splitting with `React.lazy()` for heavy routes (room page)
- Lazy load mediasoup-client (only needed on room page)
- Vite build analysis (rollup-plugin-visualizer or similar)
- Verify tree shaking works for Radix UI components
- Gzip/Brotli pre-compression if Caddy doesn't handle it automatically
- Target: < 500KB gzipped for initial load (excluding lazy chunks)

## Out of Scope
- CDN setup
- Service worker / PWA
- Image optimization (no user-uploaded images exist)

## Technical Design

### Code splitting targets
```typescript
// routes — lazy load room page (heaviest: mediasoup-client, socket.io-client)
const RoomPage = React.lazy(() => import('./routes/room'));

// Already small pages — no need to split
import LoginPage from './routes/login';
import RegisterPage from './routes/register';
import HomePage from './routes/home';
```

### Build analysis
```bash
# Add to vite.config.ts temporarily
import { visualizer } from 'rollup-plugin-visualizer';
// plugins: [visualizer({ open: true })]

# Or analyze after build
npx vite-bundle-visualizer
```

### Caddy compression
Caddy automatically compresses responses with gzip/zstd. Verify via `Content-Encoding` response header. If needed, enable `encode` directive in Caddyfile:
```
encode zstd gzip
```

## Acceptance Criteria
- [ ] Production build completes without errors
- [ ] Initial bundle < 500KB gzipped (before lazy chunks)
- [ ] Room page code (mediasoup, socket.io) is in a separate chunk
- [ ] Build size documented in task completion notes
- [ ] Caddy serves compressed assets

## Definition of Done
- Build size measured and optimized
- Code splitting implemented for heavy routes
- Compression verified

## Related Files
- `apps/client/vite.config.ts` — Build configuration
- `apps/client/src/main.tsx` — Route definitions
- `Caddyfile` — Compression settings

## Dependencies
None (can be done independently, but after TASK-070 for testing)

## Next Task
None (final Stage 7 task)
