import axios from 'axios';
import { randomUUID } from 'node:crypto';

function uniqueEmail(label: string): string {
  return `${label}-${randomUUID()}@e2e.ag2.dev`;
}

describe('builds (e2e)', () => {
  const ownerEmail = uniqueEmail('build-owner');
  const viewerEmail = uniqueEmail('build-viewer');

  let ownerAccessToken: string;
  let viewerAccessToken: string;
  let organizationId: string;
  let urlProjectId: string;
  let uploadProjectId: string;
  let buildId: string;

  it('registers the owner and creates a URL-mode and an upload-mode project', async () => {
    const registerRes = await axios.post('/api/auth/register', {
      email: ownerEmail,
      password: 'Sup3rSecret1',
      name: 'E2E Build Owner',
    });
    expect(registerRes.status).toBe(201);
    ownerAccessToken = registerRes.data.accessToken;

    const orgsRes = await axios.get('/api/organizations', {
      headers: { Authorization: `Bearer ${ownerAccessToken}` },
    });
    organizationId = orgsRes.data[0].id;

    const urlProjectRes = await axios.post(
      `/api/organizations/${organizationId}/projects`,
      { name: 'Buildable Project', sourceType: 'URL', sourceUrl: 'https://example.com' },
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );
    expect(urlProjectRes.status).toBe(201);
    urlProjectId = urlProjectRes.data.id;

    const uploadProjectRes = await axios.post(
      `/api/organizations/${organizationId}/projects`,
      { name: 'Upload Project', sourceType: 'UPLOAD' },
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );
    expect(uploadProjectRes.status).toBe(201);
    uploadProjectId = uploadProjectRes.data.id;
  });

  it('lets the OWNER trigger a build on a URL-mode project', async () => {
    const res = await axios.post(
      `/api/organizations/${organizationId}/projects/${urlProjectId}/builds`,
      { platform: 'ANDROID', artifactType: 'APK' },
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(201);
    expect(res.data.status).toBe('QUEUED');
    expect(res.data.platform).toBe('ANDROID');
    expect(res.data.artifactType).toBe('APK');
    expect(res.data.artifacts).toEqual([]);
    buildId = res.data.id;
  });

  it('rejects triggering a build on an upload-mode project', async () => {
    const res = await axios.post(
      `/api/organizations/${organizationId}/projects/${uploadProjectId}/builds`,
      { platform: 'ANDROID', artifactType: 'APK' },
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(400);
  });

  it('rejects an invalid platform/artifactType combination payload', async () => {
    const res = await axios.post(
      `/api/organizations/${organizationId}/projects/${urlProjectId}/builds`,
      { platform: 'NOT_A_PLATFORM', artifactType: 'APK' },
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(400);
  });

  it('lists builds for the project including the one just triggered', async () => {
    const res = await axios.get(
      `/api/organizations/${organizationId}/projects/${urlProjectId}/builds`,
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(200);
    expect(res.data.some((build: { id: string }) => build.id === buildId)).toBe(true);
  });

  it('fetches a single build by id', async () => {
    const res = await axios.get(
      `/api/organizations/${organizationId}/projects/${urlProjectId}/builds/${buildId}`,
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(buildId);
    expect(Array.isArray(res.data.artifacts)).toBe(true);
  });

  it('404s for a build id that does not belong to the project', async () => {
    const res = await axios.get(
      `/api/organizations/${organizationId}/projects/${uploadProjectId}/builds/${buildId}`,
      { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
    );

    expect(res.status).toBe(404);
  });

  it('returns an org-wide overview with real counts and the project name attached', async () => {
    const res = await axios.get(`/api/organizations/${organizationId}/builds?limit=10`, {
      headers: { Authorization: `Bearer ${ownerAccessToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data.counts.total).toBeGreaterThanOrEqual(1);
    expect(
      res.data.counts.queued +
        res.data.counts.inProgress +
        res.data.counts.succeeded +
        res.data.counts.failed +
        res.data.counts.cancelled,
    ).toBe(res.data.counts.total);

    const match = res.data.recent.find((build: { id: string }) => build.id === buildId);
    expect(match).toBeDefined();
    expect(match.project).toEqual({ id: urlProjectId, name: 'Buildable Project', slug: expect.any(String) });
  });

  describe('RBAC', () => {
    it('lets a VIEWER read builds but not trigger or download artifacts', async () => {
      const registerRes = await axios.post('/api/auth/register', {
        email: viewerEmail,
        password: 'Sup3rSecret1',
        name: 'E2E Build Viewer',
      });
      viewerAccessToken = registerRes.data.accessToken;

      const membershipRes = await axios.post(
        `/api/organizations/${organizationId}/memberships`,
        { email: viewerEmail, role: 'VIEWER' },
        { headers: { Authorization: `Bearer ${ownerAccessToken}` } },
      );
      expect(membershipRes.status).toBe(201);

      const readRes = await axios.get(
        `/api/organizations/${organizationId}/projects/${urlProjectId}/builds`,
        { headers: { Authorization: `Bearer ${viewerAccessToken}` } },
      );
      expect(readRes.status).toBe(200);

      const overviewRes = await axios.get(`/api/organizations/${organizationId}/builds`, {
        headers: { Authorization: `Bearer ${viewerAccessToken}` },
      });
      expect(overviewRes.status).toBe(200);

      const triggerRes = await axios.post(
        `/api/organizations/${organizationId}/projects/${urlProjectId}/builds`,
        { platform: 'ANDROID', artifactType: 'APK' },
        { headers: { Authorization: `Bearer ${viewerAccessToken}` } },
      );
      expect(triggerRes.status).toBe(403);
    });
  });
});
