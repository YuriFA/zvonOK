# TASK-072 — Configurable ICE Servers (STUN/TURN)

> **Status:** done
> **Priority:** critical
> **Created:** 2026-03-18

---

## Description
Currently the client has hard-coded Google public STUN servers in `apps/client/src/lib/config.ts`. For production with a coturn TURN server, the client needs to know the TURN server address and credentials. Instead of hard-coding them, implement a server-side API endpoint that returns ICE server configuration. This allows the server to control TURN credentials and makes configuration environment-driven.

## Scope
- Add `GET /rooms/:slug/ice-servers` API endpoint on the server (or embed in an existing response)
- Endpoint returns ICE server list including STUN + TURN with credentials
- Server reads TURN config from environment variables
- Client fetches ICE servers before joining a call and passes them to mediasoup
- Remove hard-coded Google STUN servers from client config
- Keep Google STUN as fallback in the server-side config

## Out of Scope
- Dynamic/ephemeral TURN credentials with HMAC (future enhancement)
- Client-side TURN credential rotation

## Technical Design

### Option A: Dedicated endpoint (recommended)
```
GET /rooms/:slug/ice-servers
Authorization: Bearer <token>

Response 200:
{
  "iceServers": [
    { "urls": ["stun:stun1.l.google.com:19302"] },
    {
      "urls": ["turn:YOUR_SERVER:3478", "turns:YOUR_SERVER:5349"],
      "username": "zvonok",
      "credential": "password"
    }
  ]
}
```

### Option B: Embed in existing room join response
Return `iceServers` as part of the `sfu:joined` socket event payload. This avoids an extra HTTP request.

### Server-side
```typescript
// room.controller.ts or sfu.gateway.ts
getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ];

  const turnUrl = process.env.TURN_URL;       // e.g. "turn:example.com:3478"
  const turnsUrl = process.env.TURNS_URL;      // e.g. "turns:example.com:5349"
  const turnUser = process.env.TURN_USER;
  const turnPassword = process.env.TURN_PASSWORD;

  if (turnUrl && turnUser && turnPassword) {
    servers.push({
      urls: [turnUrl, ...(turnsUrl ? [turnsUrl] : [])],
      username: turnUser,
      credential: turnPassword,
    });
  }

  return servers;
}
```

### Client-side changes
- `apps/client/src/lib/config.ts` — remove hard-coded `servers.iceServers`
- `apps/client/src/hooks/use-mediasoup.ts` or SFU connection — fetch ICE servers before creating transports
- Pass `iceServers` to mediasoup-client `device.createRecvTransport()` / `device.createSendTransport()` if needed (note: mediasoup manages its own ICE via the server-created transport, so this may only be needed for the client's ICE gathering)

### Environment variables
```env
# .env.production.example additions
TURN_URL=turn:YOUR_SERVER:3478
TURNS_URL=turns:YOUR_SERVER:5349
# TURN_USER and TURN_PASSWORD already added by TASK-071
```

### Important note about mediasoup
In an SFU architecture with mediasoup, ICE candidates are exchanged between the client and the **mediasoup server** (not peer-to-peer). The TURN server is used when the client cannot reach the mediasoup server's RTC ports directly. The `iceServers` config is set on the mediasoup `WebRtcTransport` server-side via `webRtcTransportOptions`, not on the client. This means:

1. The **server** needs the ICE servers config for `createWebRtcTransport()`
2. The mediasoup transport already has ICE candidates from the server — the client connects to those
3. If the client is behind restrictive NAT, the TURN server must be configured on the **server-side** mediasoup transport

This task must investigate whether mediasoup's `WebRtcTransportOptions` supports `iceServers` (TURN) or if the TURN relay is only needed at the network level.

## Acceptance Criteria
- [x] ICE server configuration is environment-driven on the server
- [x] Client no longer has hard-coded STUN/TURN servers
- [x] TURN credentials are not exposed in client source code (fetched at runtime)
- [ ] Calls work with TURN when direct connection fails
- [x] Local development still works without TURN configuration (STUN-only fallback)

## Definition of Done
- ICE servers configurable via env vars
- Client receives TURN credentials from server
- Tested: call works when STUN-only fails (TURN relay)
- `.env.production.example` updated

## Related Files
- `apps/client/src/lib/config.ts` — Current hard-coded ICE servers
- `apps/server/src/sfu/config/mediasoup.config.ts` — mediasoup transport options
- `apps/server/src/sfu/sfu.gateway.ts` — Socket events
- `apps/server/src/sfu/sfu.service.ts` — Transport creation
- `.env.production.example` — Env template

## Dependencies
- TASK-071 (coturn TURN server) — TURN server must exist for integration testing

## Next Task
TASK-073 — Production Deployment Checklist
