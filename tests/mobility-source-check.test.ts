import { describe, expect, it, vi } from 'vitest';
import { createCase, type MobilityCase } from '../lib/mobility/cases';
import { collectSourceFingerprints, checkSourceFile, MAX_SOURCE_CHECK_FILE_BYTES } from '../lib/mobility/source-check';

const content = new TextEncoder().encode('An original notice, with exact bytes.');
const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', content)), value => value.toString(16).padStart(2, '0')).join('');
function fixture(): MobilityCase {
  return { ...createCase('challan-review', '2026-09-06T10:00:00.000Z', 'fingerprint-case'), facts: [
    { key: 'plate', label: 'Registration', value: 'KA01AB3317', source: 'document', confirmed: true, sourceId: 'notice-1', page: 1, sourceFingerprint: hash },
    { key: 'amount', label: 'Amount', value: '100', source: 'document', confirmed: false, sourceId: 'notice-copy', page: 1, sourceFingerprint: hash },
    { key: 'old', label: 'Older document detail', value: 'Unknown source', source: 'document', confirmed: false },
    { key: 'own', label: 'My explanation', value: 'Entered by me', source: 'citizen', confirmed: true },
  ] };
}
function file(bytes = content, type = 'application/pdf') {
  const buffer = Uint8Array.from(bytes).buffer;
  return { size: bytes.length, type, arrayBuffer: vi.fn(async () => buffer) };
}

describe('local original-file fingerprint check', () => {
  it('groups identical retained hashes and counts only document details without fingerprints', () => {
    expect(collectSourceFingerprints(fixture())).toEqual({ missingFingerprintCount: 1, groups: [{ fingerprint: hash, facts: [
      { key: 'plate', label: 'Registration', sourceId: 'notice-1', page: 1 },
      { key: 'amount', label: 'Amount', sourceId: 'notice-copy', page: 1 },
    ] }] });
  });
  it('matches exact bytes, returns only source metadata, and clears the read buffer', async () => {
    const selected = file(); const buffer = await selected.arrayBuffer();
    const result = await checkSourceFile(fixture(), selected);
    expect(result.status).toBe('match'); expect(result.fingerprint).toBe(hash);
    expect(result.matchedFacts.map(fact => fact.label)).toEqual(['Registration', 'Amount']);
    expect(JSON.stringify(result)).not.toMatch(/KA01AB3317|An original notice|100/);
    expect(new Uint8Array(buffer).every(value => value === 0)).toBe(true);
  });
  it('returns unmatched for different bytes without attributing tampering', async () => {
    const result = await checkSourceFile(fixture(), file(new TextEncoder().encode('A different file')));
    expect(result).toMatchObject({ status: 'unmatched', matchedFacts: [] });
    expect(JSON.stringify(result)).not.toMatch(/tamper|forg|authentic/i);
  });
  it.each([0, MAX_SOURCE_CHECK_FILE_BYTES + 1, NaN, -1])('rejects invalid size %s before reading', async size => {
    const selected = { ...file(), size };
    await expect(checkSourceFile(fixture(), selected)).rejects.toMatchObject({ code: 'invalid-file' });
    expect(selected.arrayBuffer).not.toHaveBeenCalled();
  });
  it('rejects unsupported types and absent fingerprints before reading', async () => {
    const unsupported = file(content, 'text/plain');
    await expect(checkSourceFile(fixture(), unsupported)).rejects.toMatchObject({ code: 'invalid-file' });
    expect(unsupported.arrayBuffer).not.toHaveBeenCalled();
    const selected = file(); const noSources = createCase('challan-review', '2026-09-06T10:00:00.000Z', 'empty');
    expect(collectSourceFingerprints(noSources)).toEqual({ missingFingerprintCount: 0, groups: [] });
    await expect(checkSourceFile(noSources, selected)).rejects.toMatchObject({ code: 'no-fingerprints' });
    expect(selected.arrayBuffer).not.toHaveBeenCalled();
  });
  it.each(['f'.repeat(63), 'G'.repeat(64), hash.toUpperCase(), ''])('rejects an invalid retained hash %s', value => {
    const item = fixture(); item.facts[0].sourceFingerprint = value;
    expect(() => collectSourceFingerprints(item)).toThrow();
  });
  it('clears mismatched file bytes and bounds reads again before hashing', async () => {
    const selected = file(); selected.size += 1;
    const buffer = await selected.arrayBuffer();
    await expect(checkSourceFile(fixture(), selected)).rejects.toMatchObject({ code: 'invalid-file' });
    expect(new Uint8Array(buffer).every(value => value === 0)).toBe(true);
  });
  it('uses a pre-read case snapshot and leaves the case untouched', async () => {
    const item = fixture(); const original = JSON.stringify(item); let release!: (value: ArrayBuffer) => void;
    const selected = { size: content.length, type: 'image/png', arrayBuffer: () => new Promise<ArrayBuffer>(resolve => { release = resolve; }) };
    const pending = checkSourceFile(item, selected);
    expect(JSON.stringify(item)).toBe(original);
    item.facts[0].label = 'Changed after selecting';
    release(Uint8Array.from(content).buffer);
    expect((await pending).matchedFacts[0].label).toBe('Registration');
  });
});
