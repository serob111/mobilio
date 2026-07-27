import { createPrismaClient } from './client';

describe('createPrismaClient', () => {
  it('builds a client exposing every domain model, without eagerly connecting', () => {
    const client = createPrismaClient({
      databaseUrl: 'postgresql://user:pass@localhost:5432/does-not-need-to-exist',
    });

    expect(client.user).toBeDefined();
    expect(client.organization).toBeDefined();
    expect(client.team).toBeDefined();
    expect(client.membership).toBeDefined();
    expect(client.refreshToken).toBeDefined();
    expect(client.apiKey).toBeDefined();
    expect(client.project).toBeDefined();
    expect(client.auditLog).toBeDefined();
  });
});
