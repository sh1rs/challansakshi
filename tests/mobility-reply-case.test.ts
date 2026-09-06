import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCase, updateCase } from '../lib/mobility/cases';
import { deleteCase, readCases, saveCase } from '../lib/mobility/store';
import { prepareReplyFollowUp, saveReviewedReplyFollowUp } from '../lib/mobility/reply-case';

const NOW = '2026-09-06T10:00:00.000Z';
const NOTE = 'Citizen reply review note — not submitted\n\nThe reply says approved and disposed. I still need clarification.';
const KEY = 'challansakshi-mobility-cases-v1';
function install() {
  const entries = new Map<string, string>();
  const storage: Storage = { get length() { return entries.size; }, clear() { entries.clear(); }, getItem: key => entries.get(key) ?? null, key: index => [...entries.keys()][index] ?? null, removeItem(key) { entries.delete(key); }, setItem(key, value) { entries.set(key, value); } };
  const browser = new EventTarget() as EventTarget & { localStorage: Storage }; browser.localStorage = storage; vi.stubGlobal('window', browser); return storage;
}
function parent(status: 'completed' | 'awaiting-response' = 'completed') {
  const item = updateCase(createCase('licence-renew', NOW, 'original-case'), { title: 'Existing renewal', status, jurisdiction: 'Karnataka', reference: 'OLD-REF', draft: 'Original submitted wording', facts: [{ key: 'name', label: 'Name', value: 'Asha', source: 'document', confirmed: true, sourceId: 'old-source', page: 2 }], completedSteps: ['done'], appointment: { at: '2026-09-10T10:00:00.000Z', venue: 'Original visit', instructions: 'Bring original papers' } }, NOW);
  saveCase(item); return readCases()[0];
}

describe('a reviewed reply becomes a separate local preparation case', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('keeps the complete note and always starts preparing without inferring official status', () => {
    const result = prepareReplyFollowUp(NOTE, 'en', undefined, NOW, 'fresh-case');
    expect(result).toMatchObject({ id: 'fresh-case', service: 'challan-review', draft: NOTE, status: 'preparing', facts: [], reference: '', jurisdiction: '', completedSteps: [], followUpDate: '' });
    expect(result.appointment).toBeUndefined();
    expect(result.events.at(-1)).toMatchObject({ kind: 'follow-up', basis: 'local' });
    expect(result.events.at(-1)?.text).toContain('not an official status update');
  });

  it.each(['completed', 'awaiting-response'] as const)('copies only reviewed context from a %s case while preserving its full history', status => {
    install(); const original = parent(status); const before = JSON.stringify(original);
    const preview = prepareReplyFollowUp(NOTE, 'en', original, NOW, 'fresh-case');
    expect(preview).toMatchObject({ service: original.service, jurisdiction: original.jurisdiction, reference: original.reference, status: 'preparing', draft: NOTE, completedSteps: [] });
    expect(preview.facts).toEqual([{ ...original.facts[0], confirmed: false }]);
    expect(preview.appointment).toBeUndefined(); expect(preview.events).toHaveLength(2);
    expect(JSON.stringify(preview)).not.toContain(original.id);
    const saved = saveReviewedReplyFollowUp(preview, { note: NOTE, language: 'en', relatedCase: original, consent: true });
    expect(saved.id).toBe('fresh-case'); expect(readCases()).toHaveLength(2);
    expect(JSON.stringify(readCases().find(item => item.id === original.id))).toBe(before);
  });

  it('rejects blank, oversized, changed, or silently normalized notes instead of truncating them', () => {
    install();
    expect(() => prepareReplyFollowUp('', 'en', undefined, NOW, 'fresh')).toThrow();
    expect(() => prepareReplyFollowUp('x'.repeat(16_001), 'en', undefined, NOW, 'fresh')).toThrow(/16,000|16000/);
    expect(() => prepareReplyFollowUp(` ${NOTE}`, 'en', undefined, NOW, 'fresh')).toThrow(/exact|unchanged/i);
    const preview = prepareReplyFollowUp(NOTE, 'en', undefined, NOW, 'fresh');
    expect(() => saveReviewedReplyFollowUp(preview, { note: `${NOTE}\nChanged`, language: 'en', consent: true })).toThrow(/review/i);
    expect(() => saveReviewedReplyFollowUp({ ...preview, draft: 'Edited behind the review' }, { note: NOTE, language: 'en', consent: true })).toThrow(/review/i);
    expect(readCases()).toEqual([]);
  });

  it('requires explicit private-device consent before reading or writing storage', () => {
    vi.stubGlobal('window', undefined);
    const preview = prepareReplyFollowUp(NOTE, 'en', undefined, NOW, 'fresh');
    expect(() => saveReviewedReplyFollowUp(preview, { note: NOTE, language: 'en', consent: false })).toThrow(/consent/i);
  });

  it('rejects stale same-timestamp revisions, same-revision content changes, and unstamped parent copies', () => {
    const storage = install(); const original = parent(); const preview = prepareReplyFollowUp(NOTE, 'en', original, NOW, 'fresh');
    const options = { note: NOTE, language: 'en' as const, relatedCase: original, consent: true };
    expect(() => saveReviewedReplyFollowUp(preview, { ...options, relatedCase: { ...original } })).toThrow(/stale|saved|revision/i);
    const envelope = JSON.parse(storage.getItem(KEY)!); envelope.cases[0].reference = 'Changed without a revision event'; storage.setItem(KEY, JSON.stringify(envelope));
    expect(() => saveReviewedReplyFollowUp(preview, options)).toThrow(/changed|stale/i);
    envelope.cases[0].reference = original.reference; envelope.revisions[original.id] += 1; storage.setItem(KEY, JSON.stringify(envelope));
    const before = storage.getItem(KEY); expect(() => saveReviewedReplyFollowUp(preview, options)).toThrow(/changed|stale/i);
    expect(storage.getItem(KEY)).toBe(before);
  });

  it.each(['deleted', 'expired'] as const)('does not create a case from a %s selected parent', reason => {
    const storage = install(); const original = parent(); const preview = prepareReplyFollowUp(NOTE, 'en', original, NOW, 'fresh');
    if (reason === 'deleted') deleteCase(original.id);
    else { const envelope = JSON.parse(storage.getItem(KEY)!); envelope.cases[0].updatedAt = '2026-06-08T10:00:00.000Z'; envelope.cases[0].createdAt = envelope.cases[0].updatedAt; envelope.cases[0].events = [{ ...envelope.cases[0].events[0], at: envelope.cases[0].updatedAt }]; storage.setItem(KEY, JSON.stringify(envelope)); }
    expect(() => saveReviewedReplyFollowUp(preview, { note: NOTE, language: 'en', relatedCase: original, consent: true })).toThrow(/deleted|expired|changed|stale/i);
    expect(readCases().find(item => item.id === 'fresh')).toBeUndefined();
  });

  it('prevents duplicate reviewed saves and leaves malformed storage intact', () => {
    const storage = install(); const preview = prepareReplyFollowUp(NOTE, 'hi', undefined, NOW, 'fresh');
    const options = { note: NOTE, language: 'hi' as const, consent: true };
    saveReviewedReplyFollowUp(preview, options);
    expect(() => saveReviewedReplyFollowUp(preview, options)).toThrow(/already|fresh|new/i);
    storage.setItem(KEY, '{bad');
    expect(() => saveReviewedReplyFollowUp(prepareReplyFollowUp(NOTE, 'en', undefined, NOW, 'another'), { note: NOTE, language: 'en', consent: true })).toThrow();
    expect(storage.getItem(KEY)).toBe('{bad');
  });
});
