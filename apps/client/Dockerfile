# Stage 1: Build client assets
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy client package.json
COPY apps/client/package.json ./apps/client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy client source files
COPY apps/client ./apps/client

# Build args for Vite env vars (baked at build time)
ARG VITE_API_BASE_URL=""
ARG VITE_SOCKET_URL=""

# Build client
RUN pnpm -C apps/client build

# Stage 2: Output — just the dist folder
# This stage is used by docker-compose to copy files into a shared volume
FROM alpine:3.20 AS production

# Copy built assets from builder
COPY --from=builder /app/apps/client/dist /srv/client

# This container's only job is to hold the built files.
# In docker-compose, we use it as a volume source for Caddy.
CMD ["echo", "Client build complete. Files available at /srv/client"]
