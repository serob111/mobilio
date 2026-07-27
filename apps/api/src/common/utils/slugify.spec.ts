import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('My Cool Project')).toBe('my-cool-project');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify("Alice's Organization!")).toBe('alice-s-organization');
  });

  it('collapses repeated separators into one hyphen', () => {
    expect(slugify('foo   bar---baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });

  it('truncates to 60 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBe(60);
  });
});
