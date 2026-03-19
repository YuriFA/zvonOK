# TASK-001: CI/CD Pipeline (GitHub Actions + GHCR + VPS Deploy)

> **Stage:** 12 — CI/CD & Deployment Automation
>
> **Status:** In Progress
>
> **Priority:** High

---

## Objective

Set up automated CI/CD pipelines using GitHub Actions to:
1. Run quality checks (lint, typecheck, tests, Docker build) on every push/PR to `main`
2. Build Docker images and push to GitHub Container Registry (GHCR)
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
|                                  |
|  Jobs:                           |
|  1. build-and-push (GHCR)       |
|  2. deploy (SSH to VPS)          |
+----------------------------------+
```

## Deliverables

| File | Description |
|------|-------------|
| `.github/workflows/ci.yml` | CI pipeline: lint, typecheck, unit tests, Docker build check |
| `.github/workflows/deploy.yml` | Deploy pipeline: build images, push to GHCR, SSH deploy |
| `docker-compose.prod.yml` | Production compose using `image:` from GHCR instead of `build:` |
| `scripts/setup-vps.sh` | First-time VPS setup script (Docker, firewall, deploy user) |
| `Makefile` (updated) | New targets for registry-based deployment |
| `docs/SDD.md` (updated) | Section 9.6 CI/CD documentation |

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or domain |
| `VPS_USER` | SSH user on VPS (e.g., `deploy`) |
| `VPS_SSH_KEY` | Private SSH key for VPS access |
| `PRODUCTION_ENV` | Full `.env` file content for production |

Note: `GITHUB_TOKEN` is automatically available in Actions for GHCR auth.

## Acceptance Criteria

- [ ] CI runs lint, typecheck, tests, and Docker build check on every PR to main
- [ ] CI blocks merge on failure
- [ ] Deploy workflow builds and pushes images to GHCR on push to main
- [ ] Deploy workflow SSHes to VPS and runs `docker compose pull && up -d`
- [ ] `docker-compose.prod.yml` pulls images from GHCR instead of building locally
- [ ] `scripts/setup-vps.sh` provisions a fresh Ubuntu VPS with Docker and firewall
- [ ] SDD updated with CI/CD documentation
