import { z } from 'zod';

const booleanFromString = z
  .union([z.literal('true'), z.literal('false')])
  .transform((value) => value === 'true');

const csv = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

/** Treats an unset env var (empty string, common in .env files) as absent rather than an invalid URL. */
const optionalUrl = () =>
  z
    .union([z.literal(''), z.string().url()])
    .optional()
    .transform((value) => (value ? value : undefined));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_URL: z.string().url().default('http://localhost:3000'),
  CORS_ALLOWED_ORIGINS: csv.default(['http://localhost:4200']),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),
  BUILD_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  // Base64-encoded 256-bit AES-GCM key. Encrypts per-project Android
  // signing keystores (and their store/key passwords) at rest — the only
  // secret that protects every app a customer has ever published, so a
  // malformed key fails loudly at boot rather than at the first build.
  SIGNING_KEY_ENCRYPTION_KEY: z
    .string()
    .min(1, 'SIGNING_KEY_ENCRYPTION_KEY is required')
    .refine(
      (value) => {
        try {
          return Buffer.from(value, 'base64').length === 32;
        } catch {
          return false;
        }
      },
      { message: 'SIGNING_KEY_ENCRYPTION_KEY must be a base64-encoded 256-bit (32-byte) key' },
    ),

  S3_ENDPOINT: optionalUrl(),
  // Only needed when S3_ENDPOINT isn't reachable from outside the server's
  // own network (e.g. local Docker Compose, where S3_ENDPOINT is the
  // internal `http://minio:9000` service name) — presigned URLs handed to
  // a browser are signed against this instead. Unused against real S3/R2,
  // where the endpoint is already publicly reachable.
  S3_PUBLIC_ENDPOINT: optionalUrl(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanFromString.default(true),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: booleanFromString.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email(),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default('http://localhost:4318'),
  OTEL_SERVICE_NAME: z.string().default('ag2-api'),
  SENTRY_DSN: optionalUrl(),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  // Deliberately stricter than the general THROTTLE_LIMIT (anti-spam on
  // credential-issuing endpoints). Overridable so a test/CI environment
  // that legitimately registers or logs in many accounts in a short window
  // doesn't trip a limit tuned for real abusive traffic — production
  // deployments should leave these at their defaults.
  AUTH_REGISTER_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;
