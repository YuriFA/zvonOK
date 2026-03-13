# Stage 1: Build mediasoup worker
FROM node:22-alpine AS mediasoup-builder

# Install build dependencies for mediasoup worker
# Required: Python 3, make, g++, py3-pip
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install dependencies (this will build mediasoup worker)
RUN pnpm install --frozen-lockfile

# Stage 2: Production image
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

# Copy Prisma schema and generated client
COPY apps/server/prisma ./apps/server/prisma
COPY apps/server/src/generated ./apps/server/src/generated

# Copy built application
COPY apps/server/dist ./apps/server/dist

# Set mediasoup worker binary path
ENV MEDIASOUP_WORKER_BIN=/app/mediasoup-worker
ENV NODE_ENV=production

WORKDIR /app/apps/server

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

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
