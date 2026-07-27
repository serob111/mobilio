//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // apps/web imports @ag2/contracts (packages/contracts/src) via a tsconfig
  // path mapping — that source lives outside this app's own directory, so
  // Next needs to be told it's allowed to resolve/compile it.
  experimental: {
    externalDir: true,
  },
};

module.exports = nextConfig;
