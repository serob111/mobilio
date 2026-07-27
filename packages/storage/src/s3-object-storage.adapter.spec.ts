import { randomUUID } from 'node:crypto';
import { S3ObjectStorage } from './s3-object-storage.adapter';

const config = {
  bucket: 'ag2-dev',
  region: 'us-east-1',
  endpoint: process.env['TEST_S3_ENDPOINT'] ?? 'http://localhost:9000',
  forcePathStyle: true,
  accessKeyId: 'ag2_minio_admin',
  secretAccessKey: 'ag2_minio_admin_secret',
};

describe('S3ObjectStorage (integration against MinIO)', () => {
  const storage = new S3ObjectStorage(config);

  it('confirms the bucket is reachable', async () => {
    await expect(storage.checkConnectivity()).resolves.toBeUndefined();
  });

  it('writes, heads, and deletes an object round-trip', async () => {
    const key = `test/${randomUUID()}.txt`;
    const body = Buffer.from('hello from the ag2 test suite');

    await storage.putObject({ key, body, contentType: 'text/plain' });

    const head = await storage.headObject(key);
    expect(head).not.toBeNull();
    expect(head?.contentLength).toBe(body.length);

    await storage.deleteObject(key);
    const afterDelete = await storage.headObject(key);
    expect(afterDelete).toBeNull();
  });

  it('returns null from headObject for a key that was never written', async () => {
    const result = await storage.headObject(`test/${randomUUID()}-missing.txt`);
    expect(result).toBeNull();
  });

  it('produces a working pre-signed download URL', async () => {
    const key = `test/${randomUUID()}.txt`;
    await storage.putObject({
      key,
      body: Buffer.from('signed url content'),
      contentType: 'text/plain',
    });

    const url = await storage.getSignedDownloadUrl(key, 60);
    const response = await fetch(url);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('signed url content');

    await storage.deleteObject(key);
  });

  it('signs external URLs against publicEndpoint when configured', async () => {
    const publicStorage = new S3ObjectStorage({
      ...config,
      endpoint: 'http://internal-only.invalid:9000',
      publicEndpoint: config.endpoint,
    });

    const key = `test/${randomUUID()}.txt`;
    await storage.putObject({
      key,
      body: Buffer.from('external url content'),
      contentType: 'text/plain',
    });

    const internalUrl = await publicStorage.getSignedDownloadUrl(key, 60);
    expect(internalUrl.startsWith('http://internal-only.invalid:9000')).toBe(true);

    const externalUrl = await publicStorage.getSignedDownloadUrl(key, 60, { external: true });
    expect(externalUrl.startsWith(config.endpoint)).toBe(true);

    const response = await fetch(externalUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('external url content');

    await storage.deleteObject(key);
  });
});
