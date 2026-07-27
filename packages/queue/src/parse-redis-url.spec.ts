import { parseRedisUrl } from './parse-redis-url';

describe('parseRedisUrl', () => {
  it('parses host, port, and credentials', () => {
    expect(parseRedisUrl('redis://user:pass@redis-host:6380')).toEqual({
      host: 'redis-host',
      port: 6380,
      username: 'user',
      password: 'pass',
      tls: undefined,
    });
  });

  it('defaults to port 6379 when unspecified', () => {
    expect(parseRedisUrl('redis://localhost').port).toBe(6379);
  });

  it('enables tls for rediss:// urls', () => {
    expect(parseRedisUrl('rediss://localhost').tls).toEqual({});
  });

  it('leaves username/password undefined when absent', () => {
    const result = parseRedisUrl('redis://localhost:6379');
    expect(result.username).toBeUndefined();
    expect(result.password).toBeUndefined();
  });
});
