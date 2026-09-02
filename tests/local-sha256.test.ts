import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../lib/local-sha256';

describe('browser-safe local SHA-256', () => {
  it.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['नमस्ते😀', '79604aaaa1e5479b66d87aa80510040492a6c6fb069afa299c6dce8fa67c0d8b'],
  ])('matches the official SHA-256 vector for %j', (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });

  it('hashes bytes without Node crypto or asynchronous browser APIs', () => {
    expect(sha256Hex(new Uint8Array([0x61, 0x62, 0x63])))
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
