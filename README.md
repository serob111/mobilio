# ag2 — Mobile App Builder Platform

A SaaS platform that turns a website (URL or uploaded static build) into a native Android/iOS app — competing with AppMySite, MobiLoud, Median, and Appmaker.

This repo is built milestone by milestone against a full roadmap (v1.0 → v5.0). **Milestones v1.0 (Platform Foundation), v1.1 (Auth + Dashboard UI), and v1.2 (Build Engine) are done.**

## What's in v1.0 — Platform Foundation

- **Monorepo**: Nx + pnpm, `apps/api` (NestJS) + `packages/{contracts,config,database}`.
- **Auth**: JWT access tokens + rotating refresh tokens (httpOnly cookie, family/reuse detection), argon2id password hashing, double-submit CSRF protection on cookie-authenticated endpoints.
- **Multi-tenancy & RBAC**: Organizations, teams, memberships, CASL-driven permissions over a fixed `OrgRole` set (OWNER/ADMIN/DEVELOPER/BILLING/VIEWER).
- **Projects**: create/list/update/archive, URL-mode and Upload-mode (upload-mode metadata now; the actual asset pipeline lands in v1.3).
- **API keys**: scoped, hashed, revocable.
- **Storage**: S3-compatible object storage port + adapter (MinIO locally; any S3-compatible provider in prod).
- **Queue**: BullMQ. `emails` queue is fully wired (real SMTP send via nodemailer, welcome email on registration). `builds` queue is registered as a contract-only producer, with the processor landing in v1.2.
- **Observability**: structured logging (pino) with request correlation IDs, OpenTelemetry tracing (OTLP → Jaeger), Prometheus metrics (`/metrics`), Terminus health checks (`/health/live`, `/health/ready`).
- **Security**: Helmet, CORS allowlist, Redis-backed rate limiting (safe across horizontally-scaled replicas), audit logging on every mutating action.
- **Docker**: multi-stage production Dockerfile, full local stack via `docker-compose.yml` (Postgres, Redis, MinIO, Mailpit, Jaeger, Prometheus, Grafana).

See `packages/contracts/src/rbac/role-permission-matrix.ts` for the canonical RBAC policy and `packages/database/prisma/schema.prisma` for the data model.

## What's in v1.1 — Auth + Dashboard UI

- **`apps/web`**: Next.js (App Router) + Tailwind v4 + a hand-built shadcn/ui component set, talking to the real `apps/api` over HTTP (no mocks).
- **Auth pages**: login/register, wired to the real JWT + refresh-cookie flow, with the same CASL role-permission matrix (`@ag2/contracts`) reused client-side to hide/disable actions a user's role can't perform.
- **Dashboard**: org switcher, projects (create/list/detail/edit/archive), team members (invite/role-change/remove), teams, API keys (with the standard one-time-reveal-then-hash pattern), audit log, org settings.
- Deliberately not built: password reset (no backend endpoint yet), creating a second organization from the UI, editing your own profile — all honestly labeled as not-yet-available rather than faked.

## What's in v1.2 — Build Engine

- **`apps/build-worker`**: a standalone BullMQ consumer for the `builds` queue — isolated per-job workspace (own temp directory, cleaned up on success or failure), real source-URL fetch + validation (HTTP status, content-type, page title, capped-size read — no toolchain-specific work yet), JSON build manifest generation, artifact upload to object storage, retry policy (2 attempts, exponential backoff) with the build only marked `FAILED` in the DB once retries are exhausted.
- **Live build logs**: the worker publishes log lines and status transitions to Redis pub/sub (`build-logs:*` / `build-status:*`); `apps/api` bridges that to connected dashboard clients over a JWT-authenticated Socket.IO gateway (`/builds` namespace), scoped per build via room membership and re-checked against the viewer's RBAC on every subscribe.
- **Dashboard**: a "Builds" tab on the project page — trigger a build (platform + artifact type), a live-updating log viewer, and artifact download (signed URL, gated by a separate `DOWNLOAD_ARTIFACT` permission so `VIEWER`s can watch a build without being able to pull its output).
- **Shared packages** extracted so `apps/api` and `apps/build-worker` can't drift on how they talk to Redis, S3, or tracing: `packages/queue` (Redis URL parsing, queue retry/retention policy), `packages/observability` (OpenTelemetry bootstrap, Sentry init), `packages/storage` (moved from `apps/api` in this milestone).
- Deliberately scoped out: no Android/iOS toolchain yet (Capacitor project generation, Gradle/Xcode builds) — that's v1.3/v1.4/v4.0. Upload-mode projects are rejected at trigger time with a clear 400, not silently accepted and left to fail.

## Getting started

```sh
cp .env.example .env          # fill in real secrets for anything beyond local dev
cp apps/web/.env.example apps/web/.env.local
pnpm install
docker compose up -d postgres redis minio minio-init mailpit jaeger prometheus grafana
pnpm exec nx run database:migrate-deploy   # apply migrations
pnpm exec nx run api:serve                 # API dev server on :3000, hot reload
pnpm exec nx run web:dev                   # dashboard dev server on :4200, hot reload
pnpm exec nx run build-worker:serve        # build worker, hot reload
```

Or run the API and build worker themselves in Docker too:

```sh
docker compose up -d --build api build-worker
```

Local service UIs: dashboard `http://localhost:4200` · API docs `http://localhost:3000/api/docs` · Mailpit `http://localhost:8025` · MinIO console `http://localhost:9001` · Jaeger `http://localhost:16686` · Prometheus `http://localhost:9090` · Grafana `http://localhost:3001`.

## Common tasks

```sh
pnpm exec nx run-many -t lint       # lint everything
pnpm exec nx run-many -t test       # unit + integration tests (needs the docker-compose services up)
pnpm exec nx e2e api-e2e            # black-box API e2e suite (spins up its own api:serve instance)
pnpm exec nx run-many -t build      # build every project
pnpm exec nx run database:studio    # Prisma Studio
```

CI (`.github/workflows/ci.yml`) runs lint, build, test (against real Postgres/Redis service containers), and a Docker image build on every push/PR.

**Note:** `apps/web`'s production build is pinned to webpack (`next build --webpack`) rather than Turbopack, and explicitly sets `NODE_ENV=production` in its Nx target — both work around a real flaky-build issue found in Next.js 16.2.10 + Nx's `run-commands` executor (which otherwise injects `NODE_ENV=development` into a production build, causing a non-deterministic prerender crash on `/_not-found` or `/_global-error`). See `apps/web/project.json`.

## Roadmap

v1.0 Platform Foundation ✅ → v1.1 Auth + Dashboard UI ✅ → v1.2 Build Engine ✅ → v1.3 Android Runtime Template (Capacitor) → v1.4 APK/AAB Builder → v2.0 Firebase Push → v2.1 Billing (Stripe) → v2.2 Teams/Orgs polish → v3.0 Analytics/Crash Reporting → v3.1 Native feature modules → v4.0 iOS Builder → v4.1 Admin Panel & Observability → v5.0 Marketplace/Plugins & White Label.
