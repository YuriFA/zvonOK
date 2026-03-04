# TASK-037 — mediasoup Transport

## Status
planned

## Priority
high

## Description
Create mediasoup Transport for sending and receiving media between client and SFU.

## Scope
- Create WebRtcTransport for sending
- Create WebRtcTransport for receiving
- Configure transport options (iceServers, dtls)
- Return client-side transport parameters

## Technical Design

### Transport Creation
```typescript
const transport = await router.createWebRtcTransport({
  listenIps: [{ announcedIp: process.env.ANNOUNCED_IP }],
  enableTcp: true,
  enableUdp: true,
  preferUdp: true,
});
```

## Acceptance Criteria
- Send transport created
- Receive transport created
- Client can connect to transports

## Definition of Done
- Transports functional
- ICE candidates exchanged
- DTLS handshake complete

## Related Files
- `apps/server/src/sfu/transport-manager.ts`

## Next Task
TASK-038 — mediasoup Producer
