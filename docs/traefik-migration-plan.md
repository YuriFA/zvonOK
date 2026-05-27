# Traefik Migration Plan

## Goal

Replace Caddy as the entry-point reverse proxy with Traefik to support multiple isolated sites on a single VPS. Each site lives in its own repository with its own deploy workflow. Traefik is the only service that binds ports 80/443.

## Current Architecture

```
Client → Caddy (ports 80/443, TLS) → Server (NestJS :3000)
                   ↓
             Static SPA (/srv/client)
```

- Caddy image = Caddy binary + baked-in Vite build (`apps/client/Dockerfile`)
- Caddy serves static files and proxies API/WebSocket to the NestJS server
- Single project, single `docker-compose.prod.yml`

## Target Architecture

```
Client → Traefik (ports 80/443, TLS) → Caddy (internal :80) → Server (NestJS :3000)
                                               ↓
                                         Static SPA (/srv/client)

Client → Traefik (ports 80/443, TLS) → other-site-app (internal :8080)
```

- Traefik: shared gateway, owns ports 80/443, auto-HTTPS via Let's Encrypt
- Zvonok Caddy: retained for static file serving + internal API routing (no host ports)
- Other sites: independent repositories, connected via shared Docker network `web`

## VPS Directory Layout

```
~/gateway/              # Traefik — separate repo or plain directory
├── docker-compose.yml
├── acme.json           # auto-created by Traefik
└── traefik.yml         # (optional) static config

~/zvonOK/               # this repo — minimal changes
├── docker-compose.prod.yml  # modified
├── Caddyfile               # unchanged
├── turnserver.conf         # unchanged
└── ...

~/other-site/           # separate repo — fully independent
├── docker-compose.yml
└── ...
```

## Migration Steps

### Step 1: Create Shared Docker Network

```bash
docker network create web
```

This runs once on the VPS. The network persists across restarts.

### Step 2: Set Up Traefik Gateway

Create `~/gateway/docker-compose.yml`:

```yaml
services:
  traefik:
    image: traefik:v3
    container_name: traefik
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/acme.json
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=web
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --certificatesresolvers.le.acme.email=${ACME_EMAIL}
      - --certificatesresolvers.le.acme.storage=/acme.json
      - --certificatesresolvers.le.acme.tlschallenge=true
    networks:
      - web
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

networks:
  web:
    external: true
```

Create `.env`:

```env
ACME_EMAIL=you@example.com
```

Deploy:

```bash
cd ~/gateway
touch acme.json && chmod 600 acme.json
docker compose up -d
```

### Step 3: Modify Zvonok `docker-compose.prod.yml`

Changes:
1. Remove `ports` (80/443) from `caddy` service
2. Add `expose: ["80"]` to `caddy`
3. Add Traefik labels to `caddy`
4. Add `web` external network
5. Connect `caddy` to both `default` and `web` networks

```yaml
services:
  # ... migrate, server, postgres — UNCHANGED ...

  caddy:
    image: ghcr.io/${GHCR_REPO}/caddy:${IMAGE_TAG:-latest}
    container_name: zvonok-caddy
    logging:
      driver: json-file
      options:
        max-size: "30m"
        max-file: "3"
    expose:
      - "80"
    # REMOVED: ports 80/443 — Traefik owns them now
    environment:
      SITE_ADDRESS: ${SITE_ADDRESS:-localhost}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.zvonok.rule=Host(`${SITE_ADDRESS}`)"
      - "traefik.http.routers.zvonok.entrypoints=websecure"
      - "traefik.http.routers.zvonok.tls.certresolver=le"
      - "traefik.http.services.zvonok.loadbalancer.server.port=80"
    depends_on:
      server:
        condition: service_started
    networks:
      - default
      - web
    restart: unless-stopped

  # ... coturn — UNCHANGED ...

networks:
  default:
  web:
    external: true

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

### Step 4: Modify `deploy.yml`

One change in the SSH deploy script — ensure the `web` network exists before `up`:

```yaml
# In the SSH deploy script, add before "docker compose pull":
script: |
  set -e
  export GHCR_REPO="$(echo "${GITHUB_REPOSITORY}" | tr '[:upper:]' '[:lower:]')"
  cd ~/zvonOK

  # Ensure shared network exists (idempotent)
  docker network create web 2>/dev/null || true

  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin
  IMAGE_TAG="${IMAGE_TAG}" docker compose -f docker-compose.prod.yml pull
  IMAGE_TAG="${IMAGE_TAG}" docker compose -f docker-compose.prod.yml up -d --remove-orphans

  docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" \
    | grep "^ghcr.io/${GHCR_REPO}/" \
    | grep -v ":${IMAGE_TAG} \|:latest " \
    | awk '{print $2}' \
    | sort -u \
    | xargs -r docker rmi || true
```

### Step 5: Add a New Site (Example)

`~/other-site/docker-compose.yml`:

```yaml
services:
  app:
    image: your-image:latest
    container_name: other-site
    expose:
      - "8080"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.other-site.rule=Host(`subdomain.yourdomain.com`)"
      - "traefik.http.routers.other-site.entrypoints=websecure"
      - "traefik.http.routers.other-site.tls.certresolver=le"
      - "traefik.http.services.other-site.loadbalancer.server.port=8080"
    networks:
      - default
      - web
    restart: unless-stopped

networks:
  web:
    external: true
```

Own `deploy.yml` in the new site's repo:

```yaml
name: Deploy

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Copy compose to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "docker-compose.yml"
          target: ~/other-site

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            set -e
            docker network create web 2>/dev/null || true
            cd ~/other-site
            docker compose pull
            docker compose up -d --remove-orphans
```

## What Does NOT Change

| File / Component | Status |
|-----------------|--------|
| `Caddyfile` | Unchanged (internal routing) |
| `apps/client/Dockerfile` | Unchanged (Caddy + baked-in SPA) |
| `apps/server/Dockerfile` | Unchanged |
| `turnserver.conf` | Unchanged |
| `docker-compose.yml` (dev) | Unchanged |
| Build jobs in `deploy.yml` | Unchanged |
| Server code | Unchanged |
| Client code | Unchanged |

## What Changes

| File / Component | Change |
|-----------------|--------|
| `docker-compose.prod.yml` | Remove caddy ports 80/443, add expose/labels/networks |
| `.github/workflows/deploy.yml` | Add `docker network create web` in deploy script |
| VPS: `~/gateway/` | New directory with Traefik compose |

## DNS

| Domain | Type | Value |
|--------|------|-------|
| `yourdomain.com` | A | VPS IP |
| `subdomain.yourdomain.com` | A | VPS IP |

Traefik auto-provisions Let's Encrypt certs for each domain on first request.

## Execution Order on VPS

```bash
# 1. Create shared network
docker network create web

# 2. Start Traefik gateway
cd ~/gateway && docker compose up -d

# 3. Redeploy zvonok (via GitHub Actions or manually)
cd ~/zvonOK
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Deploy other sites independently
cd ~/other-site && docker compose up -d
```

## Rollback

If Traefik causes issues:

1. Stop Traefik: `cd ~/gateway && docker compose down`
2. Revert `docker-compose.prod.yml` to restore caddy ports 80/443
3. `docker compose -f docker-compose.prod.yml up -d`
4. Zvonok works standalone again (self-signed TLS or `tls internal`)

## Trade-offs

| Aspect | Assessment |
|--------|-----------|
| Double proxy (Traefik → Caddy) | ~1-2ms added latency per request; negligible at current scale |
| Operational complexity | One more service to manage (Traefik) |
| Isolation | Full — each project is independent |
| TLS | Automatic for all domains via single Traefik instance |
| Scalability | Easy to add more sites without touching existing ones |
