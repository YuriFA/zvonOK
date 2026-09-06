# Tasks: add-docs-site

## 1. Site

- [x] 1.1 VitePress config in `docs/.vitepress/`: nav + sidebar for
      quickstart / deployment / platform-roadmap, `srcExclude` for
      archive/, research/, adr/, internal plans; root devDependency and
      `docs:dev` / `docs:build` scripts
- [x] 1.2 Build green locally (`pnpm docs:build`), dead links pass, preview
      smoke in the browser (pages render, nav works, excluded material
      absent from dist)

## 2. Ship

- [x] 2.1 `apps/docs/Dockerfile.docs` (vitepress build stage, nginx:alpine
      runtime) and `docs` service in docker-compose.prod.yml with Traefik
      labels for `docs.${SITE_ADDRESS}` on the `web` network
- [x] 2.2 CI: build-docs job in deploy.yml pushing `ghcr.io/<repo>/docs`
      with the existing tag scheme
- [x] 2.3 deployment.md: DNS record step for docs.<domain>, docs service in
      the prod table, image build notes; roadmap item 4 flipped on
      completion
