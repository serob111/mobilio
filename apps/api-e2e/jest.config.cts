export default {
  displayName: 'api-e2e',
  preset: '../../jest.preset.js',
  globalSetup: '<rootDir>/src/support/global-setup.ts',
  globalTeardown: '<rootDir>/src/support/global-teardown.ts',
  setupFiles: ['<rootDir>/src/support/test-setup.ts'],
  testEnvironment: 'node',
  // Spec files hit a real, shared API instance and share its per-IP rate
  // limits (e.g. 5 registrations/window on /auth/register). Running them
  // as parallel workers races that shared budget across files and causes
  // spurious 429s; one worker keeps each file's calls sequential instead.
  maxWorkers: 1,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/api-e2e',
};
