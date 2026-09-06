# Design: add-docs-site

## Context

The VPS runs a single Traefik gateway that owns host ports 80/443, terminates
TLS per-domain via Let's Encrypt, and routes to per-site containers on the
shared external docker network `web` (docs/traefik-migration-plan.md). This
repo's prod compose already joins that pattern for the main site: a Caddy
container with Traefik labels (`Host(\`${SITE_ADDRESS}\`)`, le certresolver,
plain HTTP on port 80). Documentation content lives as repo markdown;
the docs site must publish it without forking the content.

## Decisions

- **D1 - VitePress, rooted at `docs/`.** The working markdown is the site
  source; there is no content copy to drift. VitePress is the boring choice:
  markdown-first, zero-config local search, clean default theme, same Vite
  toolchain the team already runs. `vitepress` is a root devDependency with
  root scripts `docs:dev` / `docs:build`; site config lives in
  `docs/.vitepress/`. Rejected: Docusaurus (heavier, React overlap buys
  nothing here), MkDocs (foreign Python toolchain), a hand-rolled
  md-to-HTML script (we would rebuild nav, search, and dead-link checking
  badly).
- **D2 - Curated page set, everything else excluded.** v1 nav: Quickstart,
  Deployment, Platform roadmap. `srcExclude` hides archive/, research/,
  adr/, and planning docs - the site must not leak internal material
  (spec scenario). Dead-link checking stays on (VitePress default) so the
  published set stays consistent.
- **D3 - Own container via the add-a-site pattern.** New `docs` service in
  docker-compose.prod.yml: `nginx:alpine` serving the baked static output,
  Traefik labels `Host(\`docs.${SITE_ADDRESS}\`)` + le certresolver, joined
  to the external `web` network. Independent from the main Caddy: a docs
  rebuild never restarts the app's edge proxy. Dev compose is untouched -
  local preview is `pnpm docs:dev`.
- **D4 - Image flow mirrors the existing pattern.** `apps/docs/Dockerfile.docs`
  (node build stage running the VitePress build, nginx runtime stage), a
  build-docs job in deploy.yml pushing `ghcr.io/<repo>/docs` with the same
  tagging scheme as server/caddy, compose pulls `${IMAGE_TAG:-latest}`.
- **D5 - DNS is an operator step.** `docs.<domain>` needs an A record to the
  VPS before the first deploy; documented in deployment.md next to the
  gateway setup. Traefik obtains the certificate on first request.

## Risks / Trade-offs

- Root-level devDependency for docs tooling slightly widens the install
  surface; acceptable for one static-site generator and keeps scripts at the
  root where the other repo-wide commands live.
- Publishing deployment.md publicly exposes VPS topology details (paths,
  ports, gateway layout). It contains no credentials or IPs; the operator
  can move it out of the curated set later by editing the nav config alone.
- VitePress renders the curated markdown mostly as-is, but docs written for
  repo-context (e.g. "run pnpm -C apps/server ...") read slightly
  developer-centric; fine for a developer-facing platform product.

## Migration Plan

Additive only: new config, new Dockerfile, new compose service, new CI job.
No existing behavior changes. First deploy after the DNS record exists.

## Open Questions

- None - the roadmap fixed the domain pattern and content seed.
