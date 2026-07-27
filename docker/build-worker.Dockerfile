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
COPY apps/build-worker/package.json ./apps/build-worker/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/queue/package.json ./packages/queue/package.json
COPY packages/observability/package.json ./packages/observability/package.json
RUN pnpm install --frozen-lockfile

# ── build: generate the Prisma client, then bundle the worker ──────────────
FROM deps AS build
COPY . .
RUN pnpm exec prisma generate --schema packages/database/prisma/schema.prisma
RUN pnpm exec nx run build-worker:build --configuration=production

# ── runtime: Debian (not Alpine) — Android build-tools' aapt2 binary is ────
# glibc-linked and does not run on musl. This stage carries the full
# Android/Gradle release-build toolchain (v1.4): JDK 21, Android SDK
# cmdline-tools, and a pre-warmed Gradle dependency cache so `assembleRelease`
# / `bundleRelease` can run fully offline — this environment's build-worker
# containers have no outbound internet access at runtime.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
RUN groupadd -r ag2 && useradd -r -g ag2 -m -d /home/ag2 ag2
WORKDIR /app

# ── Node production deps (same rationale as before: no per-app dependency
# list to trust webpack's auto-detection with, so this installs the
# workspace root's full production "dependencies" set) ─────────────────────
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/build-worker/package.json ./apps/build-worker/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/queue/package.json ./packages/queue/package.json
COPY packages/observability/package.json ./packages/observability/package.json
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate && \
    apt-get update && apt-get install -y --no-install-recommends python3 make g++ && \
    pnpm install --prod --frozen-lockfile && \
    apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# ── JDK 21 (Temurin) — Debian bookworm's apt repos only carry JDK 17, but
# the AGP/Kotlin toolchain Capacitor 8's generated projects require JDK 21.
# Fetched as a pinned tarball rather than depending on backports/testing. ──
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    curl -sSL -o /tmp/jdk.tar.gz https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_linux_hotspot_21.0.5_11.tar.gz && \
    mkdir -p /opt/jdk && \
    tar -xzf /tmp/jdk.tar.gz -C /opt/jdk --strip-components=1 && \
    rm /tmp/jdk.tar.gz
ENV JAVA_HOME=/opt/jdk

# ── Android SDK cmdline-tools + the exact components the generated
# project's compileSdk/targetSdk (36, per @capacitor/android@8.4.2's
# template) needs. ──────────────────────────────────────────────────────────
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$JAVA_HOME/bin:$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools && \
    curl -sSL -o /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
    unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools && \
    mv /tmp/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/latest && \
    rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools && \
    yes | sdkmanager --licenses --sdk_root=$ANDROID_SDK_ROOT >/dev/null && \
    sdkmanager --sdk_root=$ANDROID_SDK_ROOT "platform-tools" "platforms;android-36" "build-tools;36.0.0"

# ── Warm the Gradle dependency cache: generate a vanilla (unmodified)
# Capacitor Android project at the exact same pinned version the app
# generates at runtime, and run assembleRelease + bundleRelease against it.
# Our own manifest/gradle/signing edits never add or remove a Gradle
# dependency, so this is the complete dependency graph runtime builds need.
# The scratch project is discarded afterward; only $GRADLE_USER_HOME (the
# actual multi-GB cache) is kept in the image.
ENV GRADLE_USER_HOME=/opt/gradle-home
# Capacitor's CLI resolves the `@capacitor/android` platform package via
# normal Node resolution from the *current working directory* (not from the
# CLI script's own location), so the scratch project has to live where that
# walk-up actually finds it — one level under /app/node_modules, right next
# to the real (pnpm-symlinked) @capacitor/android entry.
RUN mkdir -p /app/node_modules/.gradle-warmup/www && \
    cd /app/node_modules/.gradle-warmup && \
    printf '{"name":"gradle-warmup","version":"1.0.0","private":true}' > package.json && \
    printf '<!doctype html><title>warmup</title>' > www/index.html && \
    printf '{\n  "appId": "com.ag2apps.warmup.app",\n  "appName": "Warmup",\n  "webDir": "www",\n  "server": { "url": "https://example.com" }\n}' > capacitor.config.json && \
    node /app/node_modules/@capacitor/cli/bin/capacitor add android && \
    cd android && \
    chmod +x gradlew && \
    ./gradlew assembleRelease bundleRelease --no-daemon --stacktrace && \
    cd / && rm -rf /app/node_modules/.gradle-warmup && \
    chown -R ag2:ag2 $GRADLE_USER_HOME

COPY --from=build /workspace/dist/apps/build-worker ./dist/apps/build-worker
RUN chown -R ag2:ag2 /app
USER ag2
ENTRYPOINT ["node", "dist/apps/build-worker/main.js"]
