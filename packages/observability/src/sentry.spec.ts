import * as Sentry from '@sentry/node';
import { AppEnv } from '@ag2/config';
import { initSentry } from './sentry';

jest.mock('@sentry/node', () => ({ init: jest.fn() }));

function makeEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    NODE_ENV: 'production',
    OTEL_SERVICE_NAME: 'ag2-api',
    SENTRY_DSN: undefined,
    ...overrides,
  } as AppEnv;
}

describe('initSentry', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not initialize Sentry when SENTRY_DSN is unset', () => {
    initSentry(makeEnv());

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry with the environment and an explicit service name when DSN is set', () => {
    initSentry(makeEnv({ SENTRY_DSN: 'https://key@sentry.example/1' }), 'ag2-build-worker');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.example/1',
        environment: 'production',
        serverName: 'ag2-build-worker',
      }),
    );
  });

  it('defaults serverName to OTEL_SERVICE_NAME when not overridden', () => {
    initSentry(makeEnv({ SENTRY_DSN: 'https://key@sentry.example/1', OTEL_SERVICE_NAME: 'ag2-api' }));

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ serverName: 'ag2-api' }));
  });
});
