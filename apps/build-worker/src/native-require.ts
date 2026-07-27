/**
 * Webpack statically rewrites `require`/`require.resolve` calls at build time,
 * turning `require.resolve('@capacitor/cli/package.json')` into a
 * webpack-internal module id lookup inside the bundled Docker image
 * (`dist/apps/build-worker/main.js`) instead of a real filesystem path.
 * Capacitor generation needs the real, unbundled Node.js resolver to find
 * where `@capacitor/cli` actually lives on disk, so the require call is
 * hidden from webpack's static analysis via `eval` — the same trick
 * webpack's own `__non_webpack_require__` global uses internally. This
 * works identically whether the code is bundled (Docker/production) or run
 * directly (Jest, `nx serve`).
 */
export const nativeRequire: NodeRequire = eval('require');
