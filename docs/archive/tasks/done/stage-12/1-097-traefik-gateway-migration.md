# TASK-097 — Traefik gateway migration (multi-site VPS)

> **Status:** completed
> **Priority:** high
> **Created:** 2026-08-27
> **Completed:** 2026-08-29

---

## Description

Route production traffic through a shared Traefik gateway so that multiple repositories can be deployed on the same VPS, each on its own subdomain. Executes `docs/traefik-migration-plan.md` with one correction: the plan's "Caddyfile unchanged" claim is wrong. With `SITE_ADDRESS` set to a real domain, the current Caddyfile enables automatic HTTPS — the `http://{$SITE_ADDRESS}` block answers every plain-HTTP request with a permanent redirect to HTTPS. Behind Traefik (which terminates TLS and forwards plain HTTP) this causes an infinite redirect loop. Fix: an HTTP-only Caddy config for prod (`Caddyfile.traefik`) sharing routing rules with the dev config through a snippet (`Caddyfile.routes`).

## Scope

- `Caddyfile.routes` — extracted routing/security-headers snippet (single source of truth)
- `Caddyfile` — dev/standalone config, imports the snippet, behavior unchanged
- `Caddyfile.traefik` — prod config: `:80` only, no TLS, no redirects
- `docker-compose.prod.yml` — caddy: `expose` instead of host ports, Traefik labels, external `web` network
- `.github/workflows/deploy.yml` — copy new config files, ensure `web` network exists
- Docs: correct `docs/traefik-migration-plan.md`, update `docs/deployment.md` (new architecture, new-site checklist)

Out of scope: VPS-side setup (gateway directory, DNS) — performed manually via wizard; client/server code.

## Technical Design

### Request path (prod)

```
Browser → Traefik :443 (TLS, Let's Encrypt TLS-ALPN) → zvonok-caddy :80 (plain HTTP)
        → server :3000 (API/WebSocket) | static SPA (/srv/client)
```

WebRTC media (UDP/TCP 40000–40099) and coturn (host network, 3478/5349) bypass the HTTP proxy — unchanged.

### Caddy config split

| File | Used by | TLS | Redirects |
|------|---------|-----|-----------|
| `Caddyfile` | `docker-compose.yml` (dev/standalone) | self-managed (LE or internal) | HTTP → HTTPS |
| `Caddyfile.traefik` | `docker-compose.prod.yml` (behind Traefik) | none (Traefik terminates) | none |

Both import `Caddyfile.routes` for API routes, static SPA fallback, security headers, logging.

### Traefik labels (caddy service)

`traefik.enable=true`, router rule `Host(\`${SITE_ADDRESS}\`)`, entrypoint `websecure`, certresolver `le`, service port 80.

## Acceptance Criteria

- [x] `docker compose -f docker-compose.prod.yml config` validates
- [x] Dev stack (`docker-compose.yml`) behavior unchanged (still self-managed TLS)
- [x] `Caddyfile.traefik` serves all routes over plain HTTP with no redirect
- [x] `deploy.yml` copies `Caddyfile.traefik` + `Caddyfile.routes` and creates the `web` network idempotently
- [x] `docs/deployment.md` has a new-site onboarding checklist
- [x] VPS wizard script generated

## Result

Executed 2026-08-29 via `scripts/setup-traefik-gateway.sh`. Zvonok now serves on `zvonok.<domain>` behind the shared Traefik gateway (`~/gateway`, Let's Encrypt via TLS-ALPN). The apex domain is no longer routed (404 at the edge) — an apex→subdomain redirect router can be added to the gateway later if needed. Note: during execution the `GHCR_TOKEN` secret had expired and was rotated (symptom: `docker login ghcr.io` → `denied: denied` on the VPS).

## Related Files

- `Caddyfile`, `Caddyfile.routes`, `Caddyfile.traefik`
- `docker-compose.prod.yml`
- `.github/workflows/deploy.yml`
- `docs/traefik-migration-plan.md`, `docs/deployment.md`
