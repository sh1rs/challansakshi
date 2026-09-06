import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCase, updateCase } from '../lib/mobility/cases';
import { addFollowUpObservation, createFollowUp, scheduleFollowUp } from '../lib/mobility/follow-up';
import { deleteAllFollowUps, deleteFollowUp, FOLLOW_UP_STORE_EVENT, readFollowUps, reconcileFollowUps, saveFollowUp } from '../lib/mobility/follow-up-store';
import { deleteCase, readCases, saveCase } from '../lib/mobility/store';

const NOW = '2026-09-06T10:00:00.000Z';
const KEY = 'challansakshi-mobility-follow-ups-v1';
function install() {
  const entries = new Map<string, string>();
  const storage: Storage = { get length() { return entries.size; }, clear: () => entries.clear(), getItem: key => entries.get(key) ?? null, key: index => [...entries.keys()][index] ?? null, removeItem: key => { entries.delete(key); }, setItem: (key, value) => { entries.set(key, value); } };
  const browser = new EventTarget() as EventTarget & { localStorage: Storage }; browser.localStorage = storage; vi.stubGlobal('window', browser);
  return { storage, browser };
}
function savedCase(id = 'follow-up-case') { const value = createCase('licence-renew', NOW, id); saveCase(value); return readCases().find(item => item.id === id)!; }
function scheduled(id = 'follow-up-case') { return scheduleFollowUp(createFollowUp(id, NOW), '2026-09-07', NOW); }

describe('private-device follow-up store', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('is SSR-safe for reads and requires explicit private-device consent for saves', () => {
    vi.stubGlobal('window', undefined); expect(readFollowUps()).toEqual([]);
    expect(() => saveFollowUp(scheduled(), createCase('licence-renew', NOW, 'follow-up-case'), { consent: false })).toThrow(/consent/i);
    expect(() => deleteAllFollowUps()).toThrow(/browser/i);
  });

  it('persists a revision-bound record for an exact saved case and emits a same-tab event', () => {
    const { browser } = install(); const original = savedCase(); const events: Event[] = [];
    browser.addEventListener(FOLLOW_UP_STORE_EVENT, event => events.push(event));
    const saved = saveFollowUp(scheduled(), original, { consent: true });
    expect(saved.revision).toBe(1); expect(readFollowUps()).toEqual([saved]); expect(events).toHaveLength(1);
    expect(readCases()[0]).toEqual(original);
    const unchanged = saveFollowUp(saved, original, { consent: true });
    expect(unchanged.revision).toBe(1); expect(events).toHaveLength(1);
  });

  it('rejects unsaved case edits and stale same-timestamp case revisions without writing follow-ups', () => {
    const { storage } = install(); const original = savedCase();
    expect(() => saveFollowUp(scheduled(), { ...original, draft: 'Unsaved edit' }, { consent: true })).toThrow(/saved|stale/i);
    expect(storage.getItem(KEY)).toBeNull();
    saveCase(updateCase(readCases()[0], { reference: 'Another tab changed the case' }, NOW));
    expect(() => saveFollowUp(scheduled(), original, { consent: true })).toThrow(/stale|changed/i);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('rejects stale follow-up drafts and does not resurrect deleted follow-ups or cases', () => {
    const { storage } = install(); const original = savedCase(); const first = saveFollowUp(scheduled(), original, { consent: true });
    saveFollowUp(scheduleFollowUp(first, '2026-09-08', NOW), original, { consent: true });
    const before = storage.getItem(KEY);
    expect(() => saveFollowUp(scheduleFollowUp(first, '2026-09-09', NOW), original, { consent: true })).toThrow(/stale|changed/i);
    expect(storage.getItem(KEY)).toBe(before);
    deleteFollowUp(original.id);
    expect(() => saveFollowUp(first, original, { consent: true })).toThrow(/deleted|stale/i);
    deleteCase(original.id);
    expect(() => saveFollowUp(scheduled(), original, { consent: true })).toThrow(/case.*(deleted|saved)|stale/i);
  });

  it('preserves earlier source observations when new records are appended and refuses silent history replacement', () => {
    install(); const original = savedCase();
    const first = saveFollowUp(addFollowUpObservation(scheduled(), { status: 'pending', sourceLabel: 'My receipt', reference: '', note: '', observedAt: NOW }, NOW), original, { consent: true });
    expect(() => saveFollowUp({ ...first, observations: [] }, original, { consent: true })).toThrow(/history/i);
    const second = saveFollowUp(addFollowUpObservation(first, { status: 'needs-info', sourceLabel: 'My follow-up record', reference: '', note: '', observedAt: NOW }, NOW), original, { consent: true });
    expect(second.observations).toHaveLength(2); expect(second.observations[0]).toEqual(first.observations[0]);
  });

  it('reports malformed storage and never overwrites it while trying to save', () => {
    const { storage } = install(); const original = savedCase(); storage.setItem(KEY, '{broken-json');
    expect(() => readFollowUps()).toThrow(/read/i);
    expect(() => saveFollowUp(scheduled(), original, { consent: true })).toThrow();
    expect(storage.getItem(KEY)).toBe('{broken-json');
  });

  it('rejects oversized and duplicate record collections without pruning or replacing the unreadable data', () => {
    const { storage } = install(); const original = savedCase(); const record = { ...scheduled(), revision: 1 };
    for (const records of [Array.from({ length: 51 }, (_, index) => ({ ...record, caseId: `case-${index}` })), [record, record]]) {
      const raw = JSON.stringify({ version: 1, savedAt: NOW, records }); storage.setItem(KEY, raw);
      expect(() => readFollowUps()).toThrow();
      expect(() => saveFollowUp(scheduled(), original, { consent: true })).toThrow();
      expect(storage.getItem(KEY)).toBe(raw);
    }
  });

  it('keeps data untouched on quota errors', () => {
    const { storage } = install(); const original = savedCase();
    const first = saveFollowUp(scheduled(), original, { consent: true }); const before = storage.getItem(KEY);
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    expect(() => saveFollowUp(scheduleFollowUp(first, '2026-09-09', NOW), original, { consent: true })).toThrow(/quota/i);
    expect(storage.getItem(KEY)).toBe(before);
  });

  it('expires records after 90 days and cleans records for deleted cases after validation', () => {
    install(); const original = savedCase(); saveFollowUp(scheduled(), original, { consent: true });
    vi.setSystemTime(new Date('2026-12-04T10:00:00.000Z'));
    // The saved case can be kept alive independently; follow-up retention is per record.
    saveCase(updateCase(original, {}, '2026-12-04T10:00:00.000Z'));
    vi.setSystemTime(new Date('2026-12-05T10:00:00.000Z'));
    expect(readFollowUps()).toEqual([]);
    vi.setSystemTime(new Date(NOW));
    const nextCase = savedCase('other-case'); saveFollowUp(scheduled('other-case'), nextCase, { consent: true });
    deleteCase(nextCase.id); expect(reconcileFollowUps(readCases())).toEqual([]);
  });

  it('relays cross-tab storage events and only clears its own data', () => {
    const { storage, browser } = install(); const original = savedCase(); saveFollowUp(scheduled(), original, { consent: true });
    storage.setItem('unrelated', 'keep'); const events: Event[] = []; browser.addEventListener(FOLLOW_UP_STORE_EVENT, event => events.push(event));
    const external = new Event('storage'); Object.defineProperty(external, 'key', { value: KEY }); browser.dispatchEvent(external);
    expect(events).toHaveLength(1);
    deleteAllFollowUps(); expect(storage.getItem(KEY)).toBeNull(); expect(storage.getItem('unrelated')).toBe('keep'); expect(readCases()).toHaveLength(1);
  });
});
