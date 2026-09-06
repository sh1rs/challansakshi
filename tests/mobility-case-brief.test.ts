import { describe, expect, it } from 'vitest';
import { createCase, updateCase } from '../lib/mobility/cases';
import { buildCaseBrief, searchMobilityCases } from '../lib/mobility/case-brief';
const item = createCase('challan-review', '2026-09-06T10:00:00.000Z', 'brief-case');
item.title = 'PRIVATE-TITLE'; item.reference = 'PRIVATE-REFERENCE'; item.draft = 'PRIVATE-DRAFT'; item.jurisdiction = 'PRIVATE-AUTHORITY';
item.facts = [{ key: 'plate', label: 'Registration', value: 'KA01AB3317', source: 'document', confirmed: false, sourceId: 'PRIVATE-HASH' }, { key: 'home', label: 'Address', value: 'PRIVATE-ADDRESS', source: 'profile', confirmed: true }];
const options = { factKeys: [], includeDraft: false, includeReference: false, includeRecentUpdates: false };
describe('selected, plain-language case brief', () => {
  it('excludes personal fields by default and never exports hidden source metadata', () => {
    const text = buildCaseBrief(item, options); expect(text).not.toMatch(/PRIVATE-|KA01AB3317|brief-case/); expect(text).toContain('No personal details included.');
    expect(buildCaseBrief(item, { ...options, factKeys: ['plate'] })).not.toContain('PRIVATE-HASH');
  });
  it('preserves uncertainty and only includes deliberately chosen sections', () => {
    const text = buildCaseBrief(item, { ...options, factKeys: ['plate'], includeReference: true });
    expect(text).toContain('KA01AB3317 — uncertain; needs checking (document reading)'); expect(text).toContain('PRIVATE-REFERENCE'); expect(text).not.toContain('PRIVATE-DRAFT'); expect(text).not.toContain('PRIVATE-ADDRESS');
    expect(text).toContain('Compare the uncertain details');
  });
  it('distinguishes reported completion from actual acknowledgement', () => {
    const done = { ...item, status: 'completed' as const };
    expect(buildCaseBrief(done, options)).toContain('I reported the task as completed.');
    expect(buildCaseBrief(done, options)).toContain('Check the actual acknowledgement separately.');
    expect(buildCaseBrief(done, options, 'hi')).toContain('वास्तविक पावती');
  });
  it('only includes the last three citizen reports when requested', () => {
    let value = item;
    for (let index = 0; index < 5; index++) value = updateCase(value, {}, `2026-09-06T10:0${index + 1}:00.000Z`, { kind: 'citizen-report', basis: 'citizen-reported', text: `CITIZEN-UPDATE-${index}` });
    const text = buildCaseBrief(value, { ...options, includeRecentUpdates: true });
    expect(text).toContain('CITIZEN-UPDATE-4'); expect(text).toContain('CITIZEN-UPDATE-2'); expect(text).not.toContain('CITIZEN-UPDATE-1'); expect(text).not.toContain('Started a local');
  });
  it('rejects stale selections and leaves inputs unchanged', () => {
    const before = JSON.stringify(item); expect(() => buildCaseBrief(item, { ...options, factKeys: ['missing'] })).toThrow();
    expect(() => buildCaseBrief(item, { ...options, factKeys: ['plate', 'plate'] })).toThrow();
    buildCaseBrief(item, { ...options, includeDraft: true }); expect(JSON.stringify(item)).toBe(before);
  });
  it('finds a saved case by registration regardless of common formatting', () => {
    expect(searchMobilityCases([item], 'ka 01-ab 3317')).toEqual([item]);
    expect(searchMobilityCases([item], 'private reference')).toEqual([item]);
    expect(searchMobilityCases([item], 'unknown')).toEqual([]);
    expect(searchMobilityCases([item], '')).toEqual([item]);
  });
});
