# Stage 1: Build NestJS application
FROM node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install dependencies (mediasoup worker downloaded as prebuilt binary)
# pnpm store is cached across builds via BuildKit mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy server source files
COPY apps/server ./apps/server

# Generate Prisma client and build NestJS
RUN pnpm -C apps/server exec prisma generate && \
    pnpm -C apps/server build

# Stage 2: Migrations runner (has prisma CLI + ts-node for prisma.config.ts)
FROM node:22-slim AS migrator

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install all dependencies (prisma CLI is a devDep, bcrypt/pg needed for seed)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# Copy Prisma schema, config, migrations, and seed
COPY apps/server/prisma ./apps/server/prisma
COPY apps/server/prisma.config.ts ./apps/server/prisma.config.ts
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json

WORKDIR /app/apps/server

RUN pnpm exec prisma generate

COPY apps/server/prisma/entrypoint.sh ./prisma/entrypoint.sh
RUN chmod +x ./prisma/entrypoint.sh

CMD ["./prisma/entrypoint.sh"]

# Stage 3: Production image
FROM node:22-slim AS production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install production dependencies only (skip scripts to avoid rebuilding)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built mediasoup worker from builder stage
COPY --from=builder /app/node_modules/.pnpm/mediasoup@*/node_modules/mediasoup/worker/out/Release/mediasoup-worker /app/mediasoup-worker

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/src/generated ./apps/server/src/generated

# Copy built application from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/dist/package.json

# Set mediasoup worker binary path
ENV MEDIASOUP_WORKER_BIN=/app/mediasoup-worker
ENV NODE_ENV=production

WORKDIR /app/apps/server

# Expose HTTP + RTC ports
EXPOSE 3000
EXPOSE 40000-40099/udp
EXPOSE 40000-40099/tcp

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]

# Stage 4: Development image (for local dev with hot reload)
FROM node:22-slim AS development

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files
COPY apps/server/package.json ./apps/server/

# Install all dependencies (dev + prod)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source files
COPY apps/server ./apps/server

WORKDIR /app/apps/server

ENV NODE_ENV=development

EXPOSE 3000

CMD ["pnpm", "dev"]
