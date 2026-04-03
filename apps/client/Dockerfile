# Stage 1: Build client assets
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app

# Switch to non-root user before installing deps.
# chown ensures the node user can write to WORKDIR.
RUN chown node:node /app
USER node

# Copy workspace manifests first so pnpm install is cached independently of source changes
COPY --chown=node:node pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --chown=node:node apps/client/package.json ./apps/client/
COPY --chown=node:node packages/video-layout/package.json ./packages/video-layout/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store,uid=1000 pnpm install --frozen-lockfile --filter client...

ARG VITE_API_BASE_URL=""
ARG VITE_SOCKET_URL=""

# Copy only the source trees that the client build actually needs
COPY --chown=node:node apps/client ./apps/client
COPY --chown=node:node packages/video-layout ./packages/video-layout

RUN pnpm -C apps/client build

# Stage 2: Caddy with baked-in static assets
FROM caddy:2-alpine

COPY --from=build /app/apps/client/dist /srv/client
