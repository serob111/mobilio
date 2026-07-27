import { generateApiKey } from './api-key-generator.util';

describe('generateApiKey', () => {
  it('produces a key with the expected prefix', () => {
    const { plainText } = generateApiKey();
    expect(plainText.startsWith('ag2_live_')).toBe(true);
  });

  it('derives a short display prefix that is itself a prefix of the plain text', () => {
    const { plainText, prefix } = generateApiKey();
    expect(plainText.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(plainText.length);
  });

  it('generates unique keys on each call', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.plainText).not.toBe(b.plainText);
  });
});
