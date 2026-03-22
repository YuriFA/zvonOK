# TASK-074 — Client Build Optimization

## Status
done

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
- [x] Production build completes without errors
- [x] Initial bundle < 500KB gzipped (before lazy chunks)
- [x] Room page code (mediasoup, socket.io) is in a separate chunk
- [x] Build size documented in task completion notes
- [x] Caddy serves compressed assets

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

## Completion Notes

### Baseline (before optimization)
Single monolithic JS chunk:
- `index.js`: 863.68 KB raw / 237.06 KB gzipped

### After optimization
| Chunk | Raw | Gzipped | Load |
|-------|-----|---------|------|
| `index` (app code + Radix UI, lucide) | 317.92 KB | 101.56 KB | Initial |
| `vendor-react` (react, react-dom, react-router) | 90.05 KB | 30.60 KB | Initial |
| `vendor-data` (tanstack-query, react-hook-form, zod) | 110.57 KB | 32.86 KB | Initial |
| CSS | 36.46 KB | 7.18 KB | Initial |
| **Initial total** | **555 KB** | **172 KB** | |
| `room` (room page + features) | 84.35 KB | 21.21 KB | Lazy |
| `vendor-sfu` (mediasoup-client, socket.io-client) | 260.28 KB | 52.05 KB | Lazy |
| **Lazy total** | **344 KB** | **73 KB** | |

### Changes made
1. **`apps/client/src/main.tsx`** — `RoomPage` loaded via `React.lazy()` + `Suspense` fallback
2. **`apps/client/vite.config.ts`** — `manualChunks` for vendor splitting (`vendor-react`, `vendor-data`, `vendor-sfu`); conditional `rollup-plugin-visualizer` via `ANALYZE=true`
3. **`Caddyfile`** — Added `encode zstd gzip` for compression; added `Cache-Control: immutable` for `/assets/*`
4. **`rollup-plugin-visualizer`** added as dev dependency — run `ANALYZE=true pnpm -C apps/client build`
