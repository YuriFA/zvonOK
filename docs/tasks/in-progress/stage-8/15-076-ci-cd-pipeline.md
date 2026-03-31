# TASK-076: CI/CD Pipeline (GitHub Actions + GHCR + VPS Deploy)

> **Status:** in-progress
> **Priority:** High
> **Created:** 2026-03-19
> **Updated:** 2026-04-01

---

## Objective

Set up automated CI/CD pipelines using GitHub Actions to:
1. Run quality checks (lint, typecheck, tests, Docker build) on every push/PR to `main`
2. Build Docker images (server, client, migrator) and push to GitHub Container Registry (GHCR)
3. Deploy to a VPS via SSH on successful push to `main`

## Architecture

```
Push to main / PR
    |
    v
+----------------------------------+
|  CI Workflow (ci.yml)            |
|  Trigger: push/PR to main       |
|                                  |
|  Jobs (parallel):                |
|  1. lint-and-typecheck           |
|  2. test-server (Jest)           |
|  3. test-client (Vitest)         |
|  4. build-check (Docker)         |
+----------------+-----------------+
                 |
                 | all green + push to main
                 v
+----------------------------------+
|  Deploy Workflow (deploy.yml)    |
|  Trigger: push to main          |
|  Environment: production        |
|                                  |
|  Jobs:                           |
|  1. build-and-push (GHCR)       |
|     - server image               |
|     - client image               |
|     - migrator image             |
|     Tags: latest + git SHA       |
|  2. deploy (SSH to VPS)          |
|     - copy compose + config      |
|     - docker compose pull && up  |
|     - health check (60s)         |
+----------------------------------+
```

## Deliverables

| File | Description |
|------|-------------|
| `.github/workflows/ci.yml` | CI pipeline: lint, typecheck, unit tests, Docker build check |
| `.github/workflows/deploy.yml` | Deploy pipeline: build 3 images, push to GHCR, SSH deploy with health check |
| `docker-compose.prod.yml` | Production compose using `image:` from GHCR instead of `build:` |
| `Caddyfile` | Reverse proxy config (copied to VPS during deploy) |
| `turnserver.conf` | TURN server config (copied to VPS during deploy) |
| `scripts/setup-vps.sh` | First-time VPS setup script (Docker, firewall, deploy user) |
| `Makefile` (updated) | `prod-*` targets for registry-based deployment |
| `docs/SDD.md` (updated) | Section 9.6 CI/CD documentation |

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or domain |
| `VPS_USER` | SSH user on VPS (e.g., `deploy`) |
| `VPS_SSH_KEY` | Private SSH key for VPS access |
| `GHCR_TOKEN` | GitHub PAT with `packages:read` scope (used on VPS for `docker login ghcr.io`) |

Note: `GITHUB_TOKEN` is automatically available in Actions for GHCR push auth.

## Branch Protection

In GitHub repo Settings → Branches → `main`:
- Enable **Require status checks to pass before merging**
- Select all 4 CI jobs: `Lint & Typecheck`, `Server Tests`, `Client Tests`, `Docker Build Check`
- Enable **Require branches to be up to date before merging**

## Environment Protection

The `deploy` job uses `environment: production` in `deploy.yml`. In GitHub Settings → Environments → `production`:
- Optionally enable **Required reviewers** for manual deploy approval
- Optionally set **Wait timer** (e.g., 5 min) before deploy starts

## Rollback

Previous images remain in GHCR tagged with git SHA. To rollback:
1. SSH to VPS manually
2. Edit `docker-compose.prod.yml` to pin specific SHA tags
3. `docker compose -f docker-compose.prod.yml up -d`

Or re-run a previous successful GitHub Actions deploy job.

## Acceptance Criteria

- [ ] CI runs lint, typecheck, tests, and Docker build check on every PR to main
- [ ] CI blocks merge on failure (branch protection enabled)
- [ ] Deploy workflow builds and pushes 3 images (server, client, migrator) to GHCR on push to main
- [ ] Deploy workflow copies Caddyfile and turnserver.conf to VPS via SCP
- [ ] Deploy workflow SSHes to VPS, pulls images, runs `docker compose up -d`
- [ ] Health check verifies server responds within 60s after deploy
- [ ] `docker-compose.prod.yml` pulls images from GHCR instead of building locally
- [ ] `scripts/setup-vps.sh` provisions a fresh Ubuntu VPS with Docker and firewall
- [ ] `GHCR_TOKEN` secret configured (not `PRODUCTION_ENV`)
- [ ] SDD updated with CI/CD documentation (section 9.6)
