import baseConfig from '../../eslint.config.mjs';

export default [
  { ignores: ['generated/**'] },
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          // @prisma/client and pg are real runtime dependencies, used by
          // the generated Prisma client (generated/**, excluded from
          // lint/static-analysis scope above) rather than by hand-written
          // src/ files that this rule scans.
          ignoredDependencies: ['@prisma/client', 'pg'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
