/**
 * axios has no built-in cookie jar in Node. These e2e tests hit real HTTP
 * endpoints (not an in-process app), so we parse Set-Cookie ourselves and
 * replay the relevant cookies on the next request — the same thing a
 * browser would do automatically.
 */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  absorb(setCookieHeaders: string[] | undefined): void {
    for (const header of setCookieHeaders ?? []) {
      const pair = header.split(';')[0];
      if (!pair) {
        continue;
      }
      const [name, value] = pair.split('=');
      if (name && value !== undefined) {
        this.cookies.set(name.trim(), value.trim());
      }
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}
