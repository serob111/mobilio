# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
# Pin the exact pnpm version so every stage resolves dependencies
# identically to local dev (Corepack otherwise grabs whatever it considers
# "latest", which can silently ignore config — e.g. pnpm 11 no longer
# reads package.json's "pnpm.overrides" field the way 9.x does).
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate
WORKDIR /workspace

# ── deps: install the full workspace (dev deps included, needed to build) ──
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/queue/package.json ./packages/queue/package.json
COPY packages/observability/package.json ./packages/observability/package.json
RUN pnpm install --frozen-lockfile

# ── build: generate the Prisma client, then bundle the server ──────────────
FROM deps AS build
COPY . .
RUN pnpm exec prisma generate --schema packages/database/prisma/schema.prisma
RUN pnpm exec nx run api:build --configuration=production

# ── runtime: install the workspace's production deps into a slim image ─────
# apps/api has no package.json of its own with a real dependency list (Nx's
# integrated-monorepo style; webpack's own dependency auto-detection for
# Docker images proved unreliable — it silently dropped several runtime
# packages, e.g. @opentelemetry/sdk-node and tslib). Instead this installs
# the workspace root's full production "dependencies" set and runs the
# built bundle against that node_modules, which is simpler and correct for
# a monorepo with a single deployable app.
FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S ag2 && adduser -S ag2 -G ag2
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/queue/package.json ./packages/queue/package.json
COPY packages/observability/package.json ./packages/observability/package.json
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    pnpm install --prod --frozen-lockfile && \
    apk del .build-deps
COPY --from=build /workspace/dist/apps/api ./dist/apps/api
RUN chown -R ag2:ag2 /app
USER ag2
EXPOSE 3000
ENTRYPOINT ["node", "dist/apps/api/main.js"]
