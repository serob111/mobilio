import axios from 'axios';
import { randomUUID } from 'node:crypto';
import { CookieJar } from '../support/cookie-jar';

function uniqueEmail(label: string): string {
  return `${label}-${randomUUID()}@e2e.ag2.dev`;
}

describe('auth + RBAC + projects (e2e)', () => {
  const ownerEmail = uniqueEmail('owner');
  const viewerEmail = uniqueEmail('viewer');
  const ownerJar = new CookieJar();

  let ownerAccessToken: string;
  let organizationId: string;
  let projectId: string;

  it('registers a new user and returns tokens', async () => {
    const res = await axios.post('/api/auth/register', {
      email: ownerEmail,
      password: 'Sup3rSecret1',
      name: 'E2E Owner',
    });

    expect(res.status).toBe(201);
    expect(res.data.user.email).toBe(ownerEmail);
    expect(typeof res.data.accessToken).toBe('string');
    expect(res.data.accessTokenExpiresInSeconds).toBeGreaterThan(0);

    ownerJar.absorb(res.headers['set-cookie']);
    ownerAccessToken = res.data.accessToken;

    expect(ownerJar.get('ag2_refresh_token')).toBeDefined();
    expect(ownerJar.get('ag2_csrf_token')).toBeDefined();
  });

  it('rejects duplicate registration with the same email', async () => {
    const res = await axios.post('/api/auth/register', {
      email: ownerEmail,
      password: 'Sup3rSecret1',
      name: 'E2E Owner',
    });

    expect(res.status).toBe(409);
  });

  it('exposes the authenticated user via /auth/me', async () => {
    const res = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${ownerAccessToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data.email).toBe(ownerEmail);
  });

  it('rejects requests with no bearer token', async () => {
    const res = await axios.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('lists the auto-created organization with OWNER role', async () => {
    const res = await axios.get('/api/organizations', {
      headers: { Authorization: `Bearer ${ownerAccessToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].role).toBe('OWNER');
    organizationId = res.data[0].id;
  });

  it('lets the OWNER create a URL-mode project', async () => {
    const res = await axios.post(
      `/api/organizations/${organizationId}/projects`,
      { name: 'E2E Project', sourceType: 'URL', sourceUrl: 'https://example.com' },
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(201);
    expect(res.data.status).toBe('ACTIVE');
    projectId = res.data.id;
  });

  it('rejects creating a project with an invalid sourceUrl', async () => {
    const res = await axios.post(
      `/api/organizations/${organizationId}/projects`,
      { name: 'Bad Project', sourceType: 'URL', sourceUrl: 'not-a-url' },
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(400);
  });

  it('rejects the refresh endpoint without a matching CSRF header', async () => {
    const res = await axios.post(
      '/api/auth/refresh',
      {},
      { headers: { Cookie: ownerJar.header() } },
    );

    expect(res.status).toBe(403);
  });

  it('rotates tokens on refresh when the CSRF header matches the cookie', async () => {
    const res = await axios.post(
      '/api/auth/refresh',
      {},
      {
        headers: {
          Cookie: ownerJar.header(),
          'x-csrf-token': ownerJar.get('ag2_csrf_token'),
        },
      },
    );

    expect(res.status).toBe(200);
    expect(res.data.accessToken).not.toBe(ownerAccessToken);
    ownerAccessToken = res.data.accessToken;
    ownerJar.absorb(res.headers['set-cookie']);
  });

  describe('membership-based RBAC', () => {
    let viewerAccessToken: string;

    it('registers the second user', async () => {
      const res = await axios.post('/api/auth/register', {
        email: viewerEmail,
        password: 'Sup3rSecret1',
        name: 'E2E Viewer',
      });

      expect(res.status).toBe(201);
      viewerAccessToken = res.data.accessToken;
    });

    it('lets the OWNER add the second user as VIEWER', async () => {
      const res = await axios.post(
        `/api/organizations/${organizationId}/memberships`,
        { email: viewerEmail, role: 'VIEWER' },
        { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
      );

      expect(res.status).toBe(201);
      expect(res.data.role).toBe('VIEWER');
    });

    it('lets the VIEWER read projects', async () => {
      const res = await axios.get(`/api/organizations/${organizationId}/projects`, {
        headers: { Authorization: `Bearer ${viewerAccessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.some((p: { id: string }) => p.id === projectId)).toBe(true);
    });

    it('forbids the VIEWER from creating projects', async () => {
      const res = await axios.post(
        `/api/organizations/${organizationId}/projects`,
        { name: 'Should Fail', sourceType: 'URL', sourceUrl: 'https://evil.example.com' },
        { headers: { Authorization: `Bearer ${viewerAccessToken}` } },
      );

      expect(res.status).toBe(403);
      expect(res.data.message).toMatch(/create on Project/);
    });

    it('forbids the VIEWER from inviting members', async () => {
      const res = await axios.post(
        `/api/organizations/${organizationId}/memberships`,
        { email: uniqueEmail('nobody'), role: 'VIEWER' },
        { headers: { Authorization: `Bearer ${viewerAccessToken}` } },
      );

      expect(res.status).toBe(403);
    });

    it('forbids a non-member from accessing the organization at all', async () => {
      const outsiderRes = await axios.post('/api/auth/register', {
        email: uniqueEmail('outsider'),
        password: 'Sup3rSecret1',
        name: 'E2E Outsider',
      });

      const res = await axios.get(`/api/organizations/${organizationId}/projects`, {
        headers: { Authorization: `Bearer ${outsiderRes.data.accessToken}` },
      });

      expect(res.status).toBe(403);
    });
  });

  it('records audit log entries for the actions taken above', async () => {
    const res = await axios.get(`/api/organizations/${organizationId}/audit-logs`, {
      headers: { Authorization: `Bearer ${ownerAccessToken}` },
    });

    expect(res.status).toBe(200);
    const actions = res.data.items.map((item: { action: string }) => item.action);
    expect(actions).toEqual(
      expect.arrayContaining(['user.registered', 'project.created', 'membership.added']),
    );
  });

  it('revokes the whole refresh-token family on logout', async () => {
    const logoutRes = await axios.post(
      '/api/auth/logout',
      {},
      {
        headers: {
          Cookie: ownerJar.header(),
          'x-csrf-token': ownerJar.get('ag2_csrf_token'),
        },
      },
    );
    expect(logoutRes.status).toBe(204);

    const refreshRes = await axios.post(
      '/api/auth/refresh',
      {},
      {
        headers: {
          Cookie: ownerJar.header(),
          'x-csrf-token': ownerJar.get('ag2_csrf_token'),
        },
      },
    );
    expect(refreshRes.status).toBe(401);
  });
});

describe('observability endpoints (e2e)', () => {
  it('reports liveness', async () => {
    const res = await axios.get('/health/live');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  it('reports readiness with all dependencies up', async () => {
    const res = await axios.get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
    expect(res.data.info.postgres.status).toBe('up');
    expect(res.data.info.redis.status).toBe('up');
    expect(res.data.info.objectStorage.status).toBe('up');
  });

  it('exposes Prometheus metrics', async () => {
    const res = await axios.get('/metrics');
    expect(res.status).toBe(200);
    expect(res.data).toContain('process_cpu_seconds_total');
  });
});
