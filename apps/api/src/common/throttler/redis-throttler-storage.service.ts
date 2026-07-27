import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ThrottlerStorage } from '@nestjs/throttler';
import { REDIS_CLIENT } from '../redis/redis-client.token';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed ThrottlerStorage so rate limits are enforced consistently
 * across every horizontally scaled API instance. The default in-memory
 * storage from @nestjs/throttler only sees requests hitting that one
 * process, which is unsafe once the API runs as more than one replica.
 */
@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage {
  private static readonly SCRIPT = `
    local hitsKey = KEYS[1]
    local blockKey = KEYS[2]
    local ttlMs = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local blockDurationMs = tonumber(ARGV[3])

    local blockTtl = redis.call('PTTL', blockKey)
    if blockTtl > 0 then
      local hits = tonumber(redis.call('GET', hitsKey) or '0')
      return {hits, blockTtl, 1, blockTtl}
    end

    local hits = redis.call('INCR', hitsKey)
    if hits == 1 then
      redis.call('PEXPIRE', hitsKey, ttlMs)
    end
    local ttl = redis.call('PTTL', hitsKey)

    local isBlocked = 0
    local blockTtlResult = 0
    if hits > limit then
      isBlocked = 1
      if blockDurationMs > 0 then
        redis.call('SET', blockKey, '1', 'PX', blockDurationMs)
        blockTtlResult = blockDurationMs
      end
    end

    return {hits, ttl, isBlocked, blockTtlResult}
  `;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttler:${throttlerName}:hits:${key}`;
    const blockKey = `throttler:${throttlerName}:blocked:${key}`;

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = (await this.redis.eval(
      RedisThrottlerStorageService.SCRIPT,
      2,
      hitsKey,
      blockKey,
      ttl,
      limit,
      blockDuration,
    )) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: Math.ceil(timeToExpire / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
    };
  }
}
