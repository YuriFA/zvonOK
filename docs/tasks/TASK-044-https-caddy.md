# TASK-044 — Caddy Reverse Proxy with HTTPS

## Status
planned

## Priority
high

## Description
Set up Caddy as a reverse proxy with automatic HTTPS for production deployment.

## Scope
- Install Caddy
- Configure Caddyfile
- Automatic HTTPS with Let's Encrypt
- Proxy to NestJS backend
- Proxy to Vite frontend
- WebSocket support

## Technical Design

### Caddyfile
```
webrtc-chat.example.com {
    reverse_proxy localhost:3000
    handle /ws* {
        reverse_proxy localhost:3000
    }
}
```

## Acceptance Criteria
- Caddy installed and running
- Automatic HTTPS working
- WebSocket connections proxied
- Frontend and backend accessible

## Definition of Done
- HTTPS working with valid certificate
- All services proxied correctly

## Related Files
- `Caddyfile`

## Next Task
TASK-045 — coturn TURN Server
