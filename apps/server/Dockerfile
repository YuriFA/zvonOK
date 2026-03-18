# Stage 1: Build mediasoup worker + NestJS application
FROM node:22-alpine AS mediasoup-builder

# Install build dependencies for mediasoup worker
# Required: Python 3, make, g++, py3-pip
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install dependencies (this will build mediasoup worker from source)
RUN pnpm install --frozen-lockfile

# Copy server source files
COPY apps/server ./apps/server

# Generate Prisma client and build NestJS
RUN pnpm -C apps/server exec prisma generate && \
    pnpm -C apps/server build

# Stage 2: Migrations runner (has prisma CLI + ts-node for prisma.config.ts)
FROM node:22-alpine AS migrator

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install all dependencies (prisma CLI is a devDep)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy Prisma schema, config, and migrations
COPY apps/server/prisma ./apps/server/prisma
COPY apps/server/prisma.config.ts ./apps/server/prisma.config.ts
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json

WORKDIR /app/apps/server

CMD ["npx", "prisma", "migrate", "deploy"]

# Stage 3: Production image
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install production dependencies only (skip scripts to avoid rebuilding)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built mediasoup worker from builder stage
COPY --from=mediasoup-builder /app/node_modules/.pnpm/mediasoup@*/node_modules/mediasoup/worker/out/Release/mediasoup-worker /app/mediasoup-worker

# Copy Prisma schema and generated client from builder
COPY --from=mediasoup-builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=mediasoup-builder /app/apps/server/src/generated ./apps/server/src/generated

# Copy built application from builder
COPY --from=mediasoup-builder /app/apps/server/dist ./apps/server/dist

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

# Stage 3: Development image (for local dev with hot reload)
FROM node:22-alpine AS development

WORKDIR /app

# Install build dependencies for mediasoup worker
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package.json files
COPY apps/server/package.json ./apps/server/

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/server ./apps/server

WORKDIR /app/apps/server

ENV NODE_ENV=development

EXPOSE 3000

CMD ["pnpm", "dev"]
