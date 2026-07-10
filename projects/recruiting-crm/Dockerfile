# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
# Copy the prisma schema BEFORE install so the `postinstall: prisma generate` hook
# succeeds, and `@prisma/engines` downloads the query + schema-engine binaries here.
COPY prisma ./prisma
RUN npm ci

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
# Build-only placeholders: lib/env.ts validates these at import time, and `next build`
# evaluates route modules to collect page data. Server-only env vars are NOT inlined into
# the build output — the real values are injected at runtime by docker-compose. No DB
# connection happens during build (Prisma connects lazily), so placeholders are safe.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXTAUTH_SECRET="build-only-placeholder-not-used-at-runtime"
RUN npm run build

# ── Stage 3: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone Next.js server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets — must be at .next/static relative to working directory
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public directory
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI + full @prisma scope (client, engines, get-platform, …) + schema —
# needed for `prisma migrate deploy` at startup. The whole @prisma scope is copied
# (not just @prisma/client) because the migrate CLI requires @prisma/engines et al.
# The entrypoint invokes node_modules/prisma/build/index.js directly (not the .bin
# symlink, which Docker would dereference into a path-broken plain file).
COPY --from=builder /app/node_modules/prisma                 ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma                 ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma                ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma        ./prisma

# Resume/file upload storage directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Entrypoint script
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
