# Proposal: add-docs-site

## Why

Stage 2 queue item 4 (docs/platform-roadmap.md). Platform consumers need
docs they can link: a public `docs.<domain>` site behind the existing Traefik
gateway. The repo already keeps the source of truth as markdown
(docs/quickstart.md and neighbors); the site publishes that content without a
second place to edit.

## What Changes

- VitePress site rooted at `docs/` - the working markdown IS the site source
  (single source of truth). Curated page set for v1: quickstart, deployment,
  platform roadmap; internal material (archive, research, adr, plans)
  excluded via `srcExclude`. Root scripts `docs:dev` / `docs:build`
  (vitepress as a root devDependency)
- New `apps/docs/Dockerfile.docs`: build stage runs the VitePress build,
  runtime stage is `nginx:alpine` serving the static output
- `docker-compose.prod.yml`: new `docs` service with Traefik labels for
  `docs.${SITE_ADDRESS}` (le certresolver, plain-HTTP port 80) on the shared
  external `web` network - the standard add-a-site pattern
- CI (`deploy.yml`): build-docs job pushing `ghcr.io/<repo>/docs`, pulled by
  compose like the existing server/caddy images
- Docs: deployment.md gets the DNS record step (docs.<domain> A record to
  the VPS), the docs service row, and the build notes; roadmap flips on
  completion

## Capabilities

### New Capabilities

- `docs-site`: the public documentation site surface

## Impact

- Root package.json (+1 devDependency, +2 scripts), new VitePress config
  under `docs/.vitepress/`, new Dockerfile, prod compose, CI workflow,
  deployment docs
- No server, client, package, or database changes; nothing in the app
  runtime path
