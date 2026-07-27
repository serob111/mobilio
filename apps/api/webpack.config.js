const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ["./src/assets"],
      optimization: false,
      outputHashing: 'none',
      // Not relied on for the Docker image: its runtime-dependency
      // detection misses packages (e.g. @opentelemetry/sdk-node, tslib).
      // The image instead installs the workspace's full root package.json
      // production dependencies. See docker/api.Dockerfile.
      generatePackageJson: false,
      sourceMap: true,
    })
  ],
};
