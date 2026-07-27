import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { RedisThrottlerStorageService } from './redis-throttler-storage.service';

const REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

describe('RedisThrottlerStorageService (integration)', () => {
  let redis: Redis;
  let service: RedisThrottlerStorageService;
  let throttlerName: string;

  beforeAll(() => {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    service = new RedisThrottlerStorageService(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(() => {
    throttlerName = `test-${randomUUID()}`;
  });

  it('increments hit count across calls with the same key', async () => {
    const key = randomUUID();
    const first = await service.increment(key, 60_000, 5, 0, throttlerName);
    const second = await service.increment(key, 60_000, 5, 0, throttlerName);

    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
    expect(first.isBlocked).toBe(false);
    expect(second.isBlocked).toBe(false);
  });

  it('marks the key as blocked once the limit is exceeded', async () => {
    const key = randomUUID();

    for (let i = 0; i < 3; i++) {
      await service.increment(key, 60_000, 3, 30_000, throttlerName);
    }
    const overLimit = await service.increment(key, 60_000, 3, 30_000, throttlerName);

    expect(overLimit.isBlocked).toBe(true);
    expect(overLimit.timeToBlockExpire).toBeGreaterThan(0);
  });

  it('keeps hit counts isolated between different keys', async () => {
    const keyA = randomUUID();
    const keyB = randomUUID();

    await service.increment(keyA, 60_000, 5, 0, throttlerName);
    await service.increment(keyA, 60_000, 5, 0, throttlerName);
    const resultB = await service.increment(keyB, 60_000, 5, 0, throttlerName);

    expect(resultB.totalHits).toBe(1);
  });

  it('keeps hit counts isolated between different throttler names for the same key', async () => {
    const key = randomUUID();

    await service.increment(key, 60_000, 5, 0, `${throttlerName}-a`);
    const resultB = await service.increment(key, 60_000, 5, 0, `${throttlerName}-b`);

    expect(resultB.totalHits).toBe(1);
  });
});
