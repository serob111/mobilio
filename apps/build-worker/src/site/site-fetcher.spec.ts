import { fetchAndValidateSite, SiteValidationError } from './site-fetcher';

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

describe('fetchAndValidateSite', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extracts the page title from a successful HTML response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(htmlResponse('<html><head><title>  Example  Domain </title></head></html>'));

    const result = await fetchAndValidateSite('https://example.com');

    expect(result.httpStatus).toBe(200);
    expect(result.pageTitle).toBe('Example Domain');
    expect(result.contentType).toContain('text/html');
  });

  it('returns null title when no <title> tag is present', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(htmlResponse('<html><body>hi</body></html>'));

    const result = await fetchAndValidateSite('https://example.com');

    expect(result.pageTitle).toBeNull();
  });

  it('throws SiteValidationError on a non-2xx response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(htmlResponse('not found', 404));

    await expect(fetchAndValidateSite('https://example.com')).rejects.toThrow(SiteValidationError);
  });

  it('throws SiteValidationError when the network request fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('DNS lookup failed'));

    await expect(fetchAndValidateSite('https://unreachable.example')).rejects.toThrow(
      SiteValidationError,
    );
  });
});
