import { EnvValidationError, loadEnv } from './load-env';

function validEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/ag2',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    COOKIE_SECRET: 'c'.repeat(32),
    S3_ACCESS_KEY_ID: 'minioadmin',
    S3_SECRET_ACCESS_KEY: 'minioadmin',
    S3_BUCKET: 'ag2-dev',
    SMTP_HOST: 'localhost',
    SMTP_FROM: 'noreply@ag2.dev',
    ...overrides,
  };
}

describe('loadEnv', () => {
  it('parses a valid environment and applies defaults', () => {
    const env = loadEnv(validEnv());

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(env.JWT_REFRESH_TTL_DAYS).toBe(30);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('splits CORS_ALLOWED_ORIGINS on commas and trims whitespace', () => {
    const env = loadEnv(validEnv({ CORS_ALLOWED_ORIGINS: 'https://a.com, https://b.com' }));
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
  });

  it('coerces numeric env vars from strings', () => {
    const env = loadEnv(validEnv({ PORT: '4000', THROTTLE_LIMIT: '250' }));
    expect(env.PORT).toBe(4000);
    expect(env.THROTTLE_LIMIT).toBe(250);
  });

  it('throws EnvValidationError with a descriptive message when a required var is missing', () => {
    const env = validEnv();
    delete env['DATABASE_URL'];
    expect(() => loadEnv(env)).toThrow(EnvValidationError);
    expect(() => loadEnv(env)).toThrow(/DATABASE_URL/);
  });

  it('rejects secrets shorter than 32 characters', () => {
    expect(() => loadEnv(validEnv({ JWT_ACCESS_SECRET: 'too-short' }))).toThrow(
      EnvValidationError,
    );
  });

  it('rejects a malformed DATABASE_URL', () => {
    expect(() => loadEnv(validEnv({ DATABASE_URL: 'not-a-url' }))).toThrow(EnvValidationError);
  });
});
