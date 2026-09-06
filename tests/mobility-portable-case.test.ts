import { describe, expect, it } from 'vitest';
import { createCase } from '../lib/mobility/cases';
import { openPortableCase, PORTABLE_MAX_FILE_BYTES, previewPortableCase, restoredCaseCopy, sealPortableCase } from '../lib/mobility/portable-case';

const now = Date.parse('2026-09-06T11:00:00.000Z');
const passphrase = 'orchard violin meadow planet';
function fixture() {
  const item = createCase('challan-review', new Date(now - 86_400_000).toISOString(), 'original-case');
  item.title = 'Private case'; item.draft = 'निजी जानकारी'; item.reference = 'PRIVATE-REFERENCE';
  item.facts = [{ key: 'plate', label: 'Registration', value: 'KA01AB3317', confirmed: false, source: 'document', sourceId: 'original-local-fingerprint', page: 1 }];
  return item;
}
describe('portable encrypted case', () => {
  it('round-trips the exact preview without plaintext identifiers in the envelope', async () => {
    const item = fixture(); const serialized = await sealPortableCase(item, passphrase, now);
    expect(serialized).not.toMatch(/PRIVATE-REFERENCE|Private case|KA01AB3317|original-case|निजी|orchard/);
    expect(await openPortableCase(serialized, passphrase, now)).toEqual(JSON.parse(previewPortableCase(item, now)));
    const envelope = JSON.parse(serialized); expect(envelope.iterations).toBe(600000); expect(envelope.cipher).toBe('AES-GCM-256');
  });
  it('uses fresh random salt and nonce for identical exports', async () => {
    const first = JSON.parse(await sealPortableCase(fixture(), passphrase, now));
    const second = JSON.parse(await sealPortableCase(fixture(), passphrase, now));
    expect(first.salt).not.toBe(second.salt); expect(first.iv).not.toBe(second.iv); expect(first.ciphertext).not.toBe(second.ciphertext);
  });
  it('does not decrypt with a wrong passphrase or modified ciphertext, salt or nonce', async () => {
    const serialized = await sealPortableCase(fixture(), passphrase, now);
    await expect(openPortableCase(serialized, 'different correct length phrase', now)).rejects.toThrow('Could not open');
    for (const field of ['salt', 'iv', 'ciphertext']) {
      const altered = JSON.parse(serialized); altered[field] = (altered[field][0] === 'A' ? 'B' : 'A') + altered[field].slice(1);
      await expect(openPortableCase(JSON.stringify(altered), passphrase, now)).rejects.toThrow('Could not open');
    }
  });
  it('rejects malicious metadata and oversized files before deriving a key', async () => {
    const serialized = await sealPortableCase(fixture(), passphrase, now);
    for (const change of [{ iterations: 600000000 }, { version: 2 }, { cipher: 'AES-CBC' }, { salt: 'AAAA' }, { iv: 'not-base64' }, { extra: true }]) {
      await expect(openPortableCase(JSON.stringify({ ...JSON.parse(serialized), ...change }), passphrase, now)).rejects.toThrow('Could not open');
    }
    await expect(openPortableCase('a'.repeat(PORTABLE_MAX_FILE_BYTES + 1), passphrase, now)).rejects.toThrow('350 KB');
    await expect(openPortableCase('[]', passphrase, now)).rejects.toThrow('Could not open');
  });
  it('keeps original retention and produces independent copy identifiers', async () => {
    const original = fixture(); const first = restoredCaseCopy(original, now); const second = restoredCaseCopy(original, now);
    expect(first.id).not.toBe(original.id); expect(second.id).not.toBe(first.id);
    expect({ ...first, id: original.id }).toEqual(original);
    expect(Object.getOwnPropertySymbols(first)).toHaveLength(0);
    const serialized = await sealPortableCase(original, passphrase, now);
    await expect(openPortableCase(serialized, passphrase, now + 89 * 86_400_000)).rejects.toThrow('90-day');
  });
  it('rejects malformed case data, unsupported passphrases and future dates', async () => {
    expect(() => previewPortableCase({ ...fixture(), title: '' }, now)).toThrow();
    expect(() => previewPortableCase(fixture(), now - 2 * 86_400_000)).toThrow('ahead');
    for (const password of ['', 'short', ' '.repeat(20), 'a'.repeat(129)]) await expect(sealPortableCase(fixture(), password, now)).rejects.toThrow('passphrase');
    // Preserve Unicode passphrases exactly; do not normalize or trim secrets silently.
    const password = 'पेड़ नदी चाँद किताब हवा';
    expect(await openPortableCase(await sealPortableCase(fixture(), password, now), password, now)).toEqual(fixture());
  });
  it('captures the reviewed data before asynchronous encryption starts', async () => {
    const item = fixture(); const expected = previewPortableCase(item, now); const encrypted = sealPortableCase(item, passphrase, now);
    item.draft = 'Changed after pressing export';
    expect(JSON.stringify(await openPortableCase(await encrypted, passphrase, now), null, 2)).toBe(expected);
  });
  it('round-trips a large Unicode case and rejects it once encoded size exceeds the bound', async () => {
    const item = fixture(); item.draft = 'क'.repeat(16_000);
    item.facts = Array.from({ length: 50 }, (_, index) => ({ key: `detail-${index}`, label: `Detail ${index}`, value: 'ह'.repeat(1000), confirmed: false, source: 'citizen' as const }));
    expect(new TextEncoder().encode(previewPortableCase(item, now)).length).toBeGreaterThan(200_000);
    const serialized = await sealPortableCase(item, passphrase, now);
    expect(new TextEncoder().encode(serialized).length).toBeLessThan(PORTABLE_MAX_FILE_BYTES);
    expect(await openPortableCase(serialized, passphrase, now)).toEqual(item);
    item.facts.push(...Array.from({ length: 20 }, (_, index) => ({ key: `extra-${index}`, label: 'Extra', value: 'ह'.repeat(1000), confirmed: false, source: 'citizen' as const })));
    await expect(sealPortableCase(item, passphrase, now)).rejects.toThrow('too large');
  });
  it('rejects an authenticated file whose author supplied an invalid case', async () => {
    // Possessing the passphrase does not make a file author trusted. Build a valid
    // encrypted envelope independently around an invalid official-status claim.
    const encoder = new TextEncoder(); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const invalid = { ...fixture(), status: 'officially-verified' };
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('challansakshi-case:v1:PBKDF2-SHA256:600000:AES-GCM-256'), tagLength: 128 }, key, encoder.encode(JSON.stringify(invalid)));
    const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
    const envelope = JSON.stringify({ format: 'challansakshi-case', version: 1, kdf: 'PBKDF2-SHA256', iterations: 600000, cipher: 'AES-GCM-256', salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) });
    await expect(openPortableCase(envelope, passphrase, now)).rejects.toThrow();
  });
});
