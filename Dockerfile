# ── Stage 1: dependency install ───────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10.28.2

# Copy only manifests — layer cached unless lockfile/manifests change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: build API ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.28.2

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm --filter api build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@10.28.2

# Non-root user for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy manifests for prod-only install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter api

# Copy Prisma schema (needed for generate + migrate:deploy)
COPY apps/api/prisma ./apps/api/prisma

# Copy compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Generate Prisma client in production context
RUN cd apps/api && npx prisma generate

# Create upload directories and set ownership
RUN mkdir -p /app/apps/api/uploads /app/apps/api/private_uploads && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 10000

# Run compiled JS directly — proper SIGTERM, no pnpm wrapper overhead.
# Migrations run separately via Railway release command before this starts.
CMD ["node", "apps/api/dist/src/main.js"]
