import { describe, expect, it } from 'vitest';
import { hmacSha256, randomDigits, randomToken, safeEqual, sha256 } from './crypto.ts';

describe('crypto', () => {
  it('randomDigits produit exactement n chiffres, zéros initiaux compris', () => {
    for (let i = 0; i < 200; i++) expect(randomDigits(6)).toMatch(/^\d{6}$/);
  });

  it('randomToken produit des jetons distincts de 256 bits', () => {
    const a = randomToken();
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
    expect(randomToken()).not.toBe(a);
  });

  it('hmacSha256 dépend du secret', () => {
    expect(hmacSha256('s1', 'v')).not.toBe(hmacSha256('s2', 'v'));
    expect(hmacSha256('s1', 'v')).toBe(hmacSha256('s1', 'v'));
  });

  it('safeEqual compare correctement, y compris des longueurs différentes', () => {
    expect(safeEqual(sha256('a'), sha256('a'))).toBe(true);
    expect(safeEqual(sha256('a'), sha256('b'))).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
