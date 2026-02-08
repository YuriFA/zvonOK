# TASK-046 — coturn TURN Server

## Status
planned

## Priority
high

## Description

Deploy coturn TURN server for relaying media when direct P2P connection fails.

## Scope
- Install coturn
- Configure TURN server
- Enable TLS/DTLS
- Set up authentication
- Configure external IP
- Test TURN connectivity

## Technical Design

### coturn Configuration
```
listening-port=3478
external-ip=YOUR_PUBLIC_IP
lt-cred-mech
user=username:password
```

### ICE Servers
```javascript
{
  urls: 'turn:turn.example.com:3478',
  username: 'user',
  credential: 'pass'
}
```

## Acceptance Criteria
- TURN server accessible
- Authentication working
- TLS enabled
- Fallback from STUN to TURN works

## Definition of Done
- TURN server deployed
- WebRTC works through NAT

## Related Files
- `/etc/turnserver.conf`

## Next Task
TASK-046 — Production Deployment
