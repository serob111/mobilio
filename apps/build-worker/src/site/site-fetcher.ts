const FETCH_TIMEOUT_MS = 20_000;
const MAX_SNIFF_BYTES = 5 * 1024 * 1024;
const USER_AGENT = 'ag2-build-worker/1.0 (+https://ag2.dev)';

export interface SiteFetchResult {
  readonly requestedUrl: string;
  readonly resolvedUrl: string;
  readonly httpStatus: number;
  readonly contentType: string;
  readonly contentLengthBytes: number;
  readonly pageTitle: string | null;
  readonly fetchDurationMs: number;
  readonly fetchedAt: string;
}

export class SiteValidationError extends Error {}

/**
 * The real (non-mocked) validation step v1.2 ships: prove the project's
 * source URL is actually reachable and looks like a web app before a build
 * is recorded as successful. Full DOM rendering/asset crawling is the
 * Capacitor pipeline's job in v1.3 — this only needs enough of the body to
 * sniff a page title, so it reads a capped prefix rather than the whole
 * response.
 */
export async function fetchAndValidateSite(url: string): Promise<SiteFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SiteValidationError(`Failed to reach ${url}: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new SiteValidationError(`${url} responded with HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const isHtml = contentType.includes('text/html');
  const body = isHtml ? await readCappedText(response, MAX_SNIFF_BYTES) : '';

  return {
    requestedUrl: url,
    resolvedUrl: response.url || url,
    httpStatus: response.status,
    contentType,
    contentLengthBytes: isHtml
      ? Buffer.byteLength(body)
      : Number(response.headers.get('content-length') ?? 0),
    pageTitle: isHtml ? extractTitle(body) : null,
    fetchDurationMs: Date.now() - startedAt,
    fetchedAt: new Date().toISOString(),
  };
}

async function readCappedText(response: Response, capBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return '';
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (received < capBytes) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
      received += value.byteLength;
    }
  }

  await reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf-8');
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match || !match[1]) {
    return null;
  }
  const decoded = match[1].replace(/\s+/g, ' ').trim();
  return decoded.length > 0 ? decoded.slice(0, 500) : null;
}
