# TASK-071 — coturn TURN Server in Docker Compose

## Status
planned

## Priority
critical

## Description
Add a coturn TURN/STUN server as a service in Docker Compose for relaying media when direct connections fail. Without TURN, users behind symmetric NAT or restrictive firewalls (~10-15%) cannot establish media connections. The TURN server must be integrated into the existing Docker Compose stack with TLS support and static credentials.

## Scope
- Add `coturn` service to root `docker-compose.yml`
- Create `turnserver.conf` configuration file
- Configure static credentials (env-driven)
- Configure external IP via environment variable
- Enable STUN + TURN on port 3478 (UDP + TCP)
- Enable TLS on port 5349
- Configure relay port range (49152-49252, non-overlapping with mediasoup RTC ports)
- Publish required ports in Docker Compose
- Add coturn env vars to `.env.production.example`
- Ensure coturn starts before the server

## Out of Scope
- Dynamic TURN credentials via REST API (future improvement)
- Multiple TURN server instances / geo-distribution
- ICE server client configuration (TASK-072 handles that)

## Technical Design

### docker-compose.yml — new service
```yaml
coturn:
  image: coturn/coturn:alpine
  container_name: zvonok-coturn
  network_mode: host  # Required for correct TURN relay
  volumes:
    - ./turnserver.conf:/etc/turnserver.conf:ro
  environment:
    TURN_USER: ${TURN_USER}
    TURN_PASSWORD: ${TURN_PASSWORD}
    TURN_EXTERNAL_IP: ${TURN_EXTERNAL_IP}
    TURN_REALM: ${SITE_ADDRESS:-localhost}
  restart: unless-stopped
```

Note: `network_mode: host` is strongly recommended for TURN servers to avoid NAT hairpin issues with Docker's port mapping. The alternative (bridge + port publishing) can cause relay failures.

### turnserver.conf
```conf
# Listening
listening-port=3478
tls-listening-port=5349

# Network
external-ip=${TURN_EXTERNAL_IP}
relay-ip=0.0.0.0
min-port=49152
max-port=49252

# Auth
lt-cred-mech
user=${TURN_USER}:${TURN_PASSWORD}
realm=${TURN_REALM}

# Security
no-multicast-peers
no-cli
fingerprint
stale-nonce=600

# Logging
log-file=stdout
verbose
```

### .env.production.example additions
```env
# TURN server
TURN_USER=zvonok
TURN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
TURN_EXTERNAL_IP=YOUR_SERVER_PUBLIC_IP
```

### Port requirements on the host
| Port | Protocol | Purpose |
|------|----------|---------|
| 3478 | UDP + TCP | STUN/TURN |
| 5349 | UDP + TCP | TURNS (TLS) |
| 49152-49252 | UDP | TURN relay range |

## Acceptance Criteria
- [ ] coturn service added to docker-compose.yml
- [ ] turnserver.conf created with environment-driven values
- [ ] STUN/TURN accessible on port 3478
- [ ] Static credentials authentication works
- [ ] External IP correctly announced
- [ ] Relay ports (49152-49252) open and functional
- [ ] `.env.production.example` updated
- [ ] coturn does not conflict with mediasoup RTC port range (40000-40099)

## Definition of Done
- coturn runs as part of docker-compose stack
- TURN connectivity verified (e.g., via Trickle ICE test page)
- No port conflicts between coturn and mediasoup

## Related Files
- `docker-compose.yml` — Service definition
- `turnserver.conf` — New file, coturn configuration
- `.env.production.example` — Env template

## Dependencies
- TASK-070 (mediasoup network config) — ensures no port range overlap

## Next Task
TASK-072 — Configurable ICE Servers
