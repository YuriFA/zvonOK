# Stage 1: Build client assets
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /app
WORKDIR /app

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter client...

ARG VITE_API_BASE_URL=""
ARG VITE_SOCKET_URL=""

RUN pnpm -C apps/client build

# Stage 2: Caddy with baked-in static assets
FROM caddy:2-alpine

COPY --from=build /app/apps/client/dist /srv/client
