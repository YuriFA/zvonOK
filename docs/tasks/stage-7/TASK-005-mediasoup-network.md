# TASK-070 — mediasoup Production Network Configuration

## Status
planned

## Priority
critical

## Description
Configure mediasoup WebRTC transports for production deployment. Currently `listenIps` is hard-coded to `127.0.0.1`, which means media traffic (audio/video) only works on localhost. This must be changed to listen on all interfaces with an environment-driven `announcedIp` set to the server's public IP. Additionally, the RTC port range (UDP/TCP) must be exposed in Docker Compose for media to reach the mediasoup worker.

## Scope
- Make `listenIps` configurable via environment variables (`MEDIASOUP_LISTEN_IP`, `MEDIASOUP_ANNOUNCED_IP`)
- Default to `0.0.0.0` for `ip` (listen on all interfaces)
- Require `MEDIASOUP_ANNOUNCED_IP` in production (public IP of the server)
- Make RTC port range configurable (`RTC_MIN_PORT`, `RTC_MAX_PORT`), narrow default to `40000-40099`
- Publish RTC port range (UDP + TCP) in `docker-compose.yml` server service
- Add new env vars to `.env.production.example`
- Keep localhost defaults for local development (no env vars needed)

## Out of Scope
- TURN server setup (TASK-071)
- ICE server client configuration (TASK-072)

## Technical Design

### mediasoup.config.ts changes
```typescript
webRtcTransport: {
  listenIps: [{
    ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
  }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
},
worker: {
  rtcMinPort: parseInt(process.env.RTC_MIN_PORT || '40000', 10),
  rtcMaxPort: parseInt(process.env.RTC_MAX_PORT || '40099', 10),
  // ...existing settings
},
```

### docker-compose.yml changes
```yaml
server:
  ports:
    - "${RTC_MIN_PORT:-40000}-${RTC_MAX_PORT:-40099}:${RTC_MIN_PORT:-40000}-${RTC_MAX_PORT:-40099}/udp"
    - "${RTC_MIN_PORT:-40000}-${RTC_MAX_PORT:-40099}:${RTC_MIN_PORT:-40000}-${RTC_MAX_PORT:-40099}/tcp"
  environment:
    MEDIASOUP_LISTEN_IP: "0.0.0.0"
    MEDIASOUP_ANNOUNCED_IP: ${MEDIASOUP_ANNOUNCED_IP}
    RTC_MIN_PORT: ${RTC_MIN_PORT:-40000}
    RTC_MAX_PORT: ${RTC_MAX_PORT:-40099}
```

### .env.production.example additions
```env
# mediasoup network (required for production)
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=YOUR_SERVER_PUBLIC_IP
RTC_MIN_PORT=40000
RTC_MAX_PORT=40099
```

### Why narrow port range (100 ports)
- Each mediasoup transport uses 1 UDP + 1 TCP port
- Each participant needs 2 transports (send + receive) = 4 ports
- 100 ports supports ~25 concurrent participants — sufficient for demo
- Docker port mapping of large ranges (10000 ports) is slow and resource-heavy
- Can be expanded later if needed

## Acceptance Criteria
- [ ] mediasoup listens on `0.0.0.0` with correct `announcedIp` in production
- [ ] Local development still works without setting env vars (defaults to `127.0.0.1`)
- [ ] RTC ports published in docker-compose (UDP + TCP)
- [ ] `.env.production.example` updated with new variables
- [ ] Media flows between two browsers on different networks (manual test on VPS)

## Definition of Done
- Config is environment-driven
- docker-compose exposes RTC ports
- env template updated
- No hardcoded localhost for production

## Related Files
- `apps/server/src/sfu/config/mediasoup.config.ts` — Transport config
- `docker-compose.yml` — Port publishing
- `.env.production.example` — Env template

## Dependencies
None (can be done first)

## Next Task
TASK-071 — coturn TURN Server
