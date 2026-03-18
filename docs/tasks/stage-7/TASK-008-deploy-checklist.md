# TASK-073 — Production Deployment Checklist

## Status
planned

## Priority
high

## Description
Create a comprehensive deployment guide for running the full application stack on a VPS with Docker Compose. The previous TASK-046 was written before Docker Compose infrastructure existed. This task replaces it with an up-to-date checklist covering the actual deployment process: VPS setup, domain/DNS, firewall, Docker Compose, and verification.

## Scope
- Create `docs/deployment.md` with step-by-step deployment guide
- VPS requirements and prerequisites
- DNS and domain configuration
- Firewall rules (HTTP/HTTPS + RTC ports + TURN ports)
- `.env` configuration walkthrough
- `docker compose up` execution and verification
- Health check / smoke test procedure
- Troubleshooting common issues
- Update procedure (pull, rebuild, restart)

## Out of Scope
- CI/CD pipeline (future)
- Monitoring/alerting stack (future, stage 10)
- Multi-server / horizontal scaling

## Technical Design

### `docs/deployment.md` structure

```markdown
# Deployment Guide

## Prerequisites
- VPS with 2+ CPU cores, 2GB+ RAM (mediasoup needs CPU for media processing)
- Ubuntu 22.04+ / Debian 12+ (or any Docker-compatible OS)
- Docker Engine 24+ and Docker Compose v2
- Domain name with DNS A record pointing to server IP
- Ports open: 80, 443, 3478, 5349, 40000-40099 (UDP+TCP), 49152-49252 (UDP)

## Step 1: Clone and configure
git clone <repo>
cp .env.production.example .env
# Edit .env — fill in all values

## Step 2: DNS
A record: example.com -> SERVER_IP

## Step 3: Firewall
ufw allow 80,443/tcp
ufw allow 3478,5349/tcp
ufw allow 3478,5349/udp
ufw allow 40000:40099/tcp
ufw allow 40000:40099/udp
ufw allow 49152:49252/udp

## Step 4: Deploy
docker compose up -d --build

## Step 5: Verify
- Open https://example.com — should see login page
- Register two accounts, create a room, join from two browsers
- Check TURN: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

## Updating
docker compose pull
docker compose up -d --build

## Troubleshooting
- Media not flowing: check MEDIASOUP_ANNOUNCED_IP, RTC ports, firewall
- TURN not working: check coturn logs, TURN_EXTERNAL_IP, relay ports
- Caddy TLS error: check DNS propagation, port 80/443 open
```

## Acceptance Criteria
- [ ] `docs/deployment.md` exists with complete step-by-step guide
- [ ] All required ports and firewall rules documented
- [ ] `.env` configuration walkthrough covers all variables
- [ ] Verification steps included (manual smoke test)
- [ ] Troubleshooting section covers common media/TURN/TLS issues
- [ ] Update procedure documented

## Definition of Done
- Deployment guide written and reviewed
- Someone can follow the guide to deploy from scratch on a fresh VPS

## Related Files
- `docs/deployment.md` — New file
- `.env.production.example` — Reference
- `docker-compose.yml` — Reference

## Dependencies
- TASK-070 (mediasoup network) — env vars must be finalized
- TASK-071 (coturn) — TURN service must be in docker-compose
- TASK-072 (ICE servers) — ICE configuration must be in place

## Next Task
TASK-074 — Client Build Optimization
