# TASK-061 — Client Build and Deployment

## Status
planned

## Priority
high

## Description
Configure production build and deployment process for the React client. Set up environment variables, build optimization, and deployment workflow.

## Scope
- Production build configuration
- Environment variable management
- Static asset optimization
- Build optimization (code splitting, lazy loading)
- Deployment to production server
- Caddy static file serving

## Out of Scope
- Server deployment (TASK-047)
- CI/CD pipeline setup (future)

## Technical Design

### Build Configuration
```bash
# Production build
pnpm build
```

### Environment Variables
```env
# .env.production
VITE_SOCKET_URL=wss://example.com
VITE_API_BASE_URL=https://example.com
```

### Caddy Configuration
```
example.com {
    reverse_proxy /api localhost:3000
    root * /var/www/client/dist
    file_server
}
```

### Build Optimizations
- Code splitting by route
- Lazy loading for heavy components
- Tree shaking
- Minification
- Gzip compression

## Acceptance Criteria
- [ ] Production build works without errors
- [ ] Environment variables properly configured
- [ ] Static assets optimized
- [ ] Build size optimized (< 500KB gzipped)
- [ ] Deployed to production server
- [ ] Serves via Caddy
- [ ] Works with HTTPS

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in build config
- Production tested
- Deployment documented

## Related Files
- `apps/client/vite.config.ts` — Build configuration
- `apps/client/.env.production` — Production env vars
- `apps/client/package.json` — Build scripts
- `Caddyfile` — Static file serving

## Next Task
TASK-048 — Network Info
