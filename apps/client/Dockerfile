# Stage 1: Build client assets
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /app
WORKDIR /app

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter client...

# Build args for Vite env vars (baked at build time)
ARG VITE_API_BASE_URL=""
ARG VITE_SOCKET_URL=""

# Build client
RUN pnpm -C apps/client build

# Stage 2: Output — just the dist folder
# This stage is used by docker-compose to copy files into a shared volume
FROM alpine:3.20 AS production

# Copy built assets from builder
COPY --from=build /app/apps/client/dist /srv/client

# This container's only job is to hold the built files.
# In docker-compose, we use it as a volume source for Caddy.
CMD ["echo", "Client build complete. Files available at /srv/client"]
