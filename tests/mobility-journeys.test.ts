import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCase, updateCase } from '../lib/mobility/cases';
import { createJourney, summarizeJourney, validateJourney } from '../lib/mobility/journeys';
import { deleteAllJourneys, deleteJourney, readJourneys, saveJourney } from '../lib/mobility/journey-store';
import { deleteCase, readCases, saveCase } from '../lib/mobility/store';

const NOW = '2026-09-06T10:00:00.000Z';
const KEY = 'challansakshi-mobility-journeys-v1';

function install() {
  const entries = new Map<string, string>();
  const storage: Storage = { get length() { return entries.size; }, clear: () => entries.clear(), getItem: key => entries.get(key) ?? null, key: index => [...entries.keys()][index] ?? null, removeItem: key => { entries.delete(key); }, setItem: (key, value) => { entries.set(key, value); } };
  let queue = Promise.resolve();
  const browser = new EventTarget() as EventTarget & { localStorage: Storage; navigator: unknown };
  browser.localStorage = storage;
  browser.navigator = { locks: { request: (_name: string, options: (() => unknown) | { signal?: AbortSignal }, work?: () => unknown) => {
    const result = queue.then(() => { if (typeof options === 'function') return options(); options.signal?.throwIfAborted(); return work!(); });
    queue = result.then(() => undefined, () => undefined); return result;
  } } };
  vi.stubGlobal('window', browser);
  return { storage, browser, hold: () => { let release!: () => void; queue = new Promise<void>(resolve => { release = resolve; }); return release; } };
}
function storedCases() {
  for (const [id, service] of [['transfer', 'vehicle-transfer'], ['tag', 'fastag']] as const) {
    saveCase(updateCase(createCase(service, NOW, id), { title: `Private ${id}`, draft: 'Do not copy my private facts', facts: [{ key: 'name', label: 'Name', value: 'Private citizen', source: 'citizen', confirmed: true }] }, NOW));
  }
  return readCases();
}

describe('local life-event plans', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('accepts only known events, bounded unique case links and exact metadata schema', () => {
    const plan = createJourney('buy-used', ['transfer'], NOW, 'plan-one');
    expect(validateJourney(plan)).toEqual(plan);
    expect(Object.keys(plan).sort()).toEqual(['caseIds', 'createdAt', 'eventId', 'id', 'revision', 'updatedAt', 'version']);
    for (const patch of [{ eventId: 'invented' }, { caseIds: ['transfer', 'transfer'] }, { caseIds: Array.from({ length: 11 }, (_, i) => `case-${i}`) }, { id: '__proto__' }, { updatedAt: '2026-02-30T10:00:00.000Z' }, { revision: -1 }, { title: 'Unexpected private label' }]) {
      expect(() => validateJourney({ ...plan, ...patch })).toThrow();
    }
    expect(() => createJourney('buy-used', [], NOW)).toThrow(/link|case/i);
  });

  it('aggregates only explicit active links and gives one next step without official completion claims', () => {
    const ready = updateCase(createCase('vehicle-transfer', NOW, 'transfer'), { status: 'ready' }, NOW);
    const attention = updateCase(createCase('fastag', NOW, 'tag'), { status: 'needs-attention' }, NOW);
    const unlinked = updateCase(createCase('challan-review', NOW, 'unlinked'), { status: 'completed' }, NOW);
    const plan = createJourney('buy-used', ['transfer', 'tag'], NOW, 'one');
    const original = JSON.stringify([plan, ready, attention, unlinked]);
    const summary = summarizeJourney(plan, [ready, attention, unlinked], NOW);
    expect(summary).toMatchObject({ total: 2, completedReported: 0, status: 'needs-attention', next: { kind: 'review-attention', caseId: 'tag' } });
    expect(summary.cases.map(item => item.id)).toEqual(['transfer', 'tag']);
    expect(summary.next).not.toHaveProperty('blockedBy');
    expect(JSON.stringify([plan, ready, attention, unlinked])).toBe(original);
    const completed = summarizeJourney(plan, [updateCase(ready, { status: 'completed' }, NOW), updateCase(attention, { status: 'completed' }, NOW)], NOW);
    expect(completed).toMatchObject({ status: 'completed-reported', completedReported: 2, next: { kind: 'review-reported-completion' } });
    expect(summarizeJourney(plan, [], NOW)).toMatchObject({ status: 'empty', total: 0, missingLinks: 2, next: { kind: 'link-case' } });
    expect(summarizeJourney(plan, [ready], '2026-12-05T10:00:00.000Z').total).toBe(0);
  });

  it('is SSR-safe, requires explicit consent and refuses uncoordinated browser writes', async () => {
    vi.stubGlobal('window', undefined);
    expect(await readJourneys()).toEqual([]);
    const plan = createJourney('buy-used', ['transfer'], NOW, 'one');
    await expect(saveJourney(plan, { original: null, cases: [], consent: false })).rejects.toThrow(/consent/i);
    const { browser } = install(); const cases = storedCases(); browser.navigator = {};
    expect(await readJourneys()).toEqual([]);
    await deleteAllJourneys();
    await expect(saveJourney(plan, { original: null, cases: [cases[0]], consent: true })).rejects.toThrow(/browser.*save/i);
    browser.localStorage.setItem(KEY, '{unreadable');
    await deleteAllJourneys(); expect(browser.localStorage.getItem(KEY)).toBeNull();
  });

  it.each(['one', 'all'] as const)('cancels a queued %s plan deletion before it can remove saved data', async kind => {
    const { storage, hold } = install(); const cases = storedCases();
    const original = await saveJourney(createJourney('buy-used', ['transfer'], NOW, 'one'), { original: null, cases: [cases[0]], consent: true });
    const before = storage.getItem(KEY); const release = hold(); const controller = new AbortController();
    const pending = kind === 'one' ? deleteJourney(original, controller.signal) : deleteAllJourneys(controller.signal);
    controller.abort(); release(); await expect(pending).rejects.toThrow(); expect(storage.getItem(KEY)).toBe(before);
  });

  it('checks deletion cancellation before unsupported-browser removal and again inside a lock', async () => {
    const { browser, storage } = install(); storage.setItem(KEY, '{malformed'); browser.navigator = {};
    const cancelled = new AbortController(); cancelled.abort();
    await expect(deleteAllJourneys(cancelled.signal)).rejects.toThrow(); expect(storage.getItem(KEY)).toBe('{malformed');
    const controller = new AbortController();
    browser.navigator = { locks: { request: (_name: string, _options: unknown, work: () => unknown) => { controller.abort(); return Promise.resolve().then(work); } } };
    await expect(deleteAllJourneys(controller.signal)).rejects.toThrow(); expect(storage.getItem(KEY)).toBe('{malformed');
  });

  it('prioritizes a due personal follow-up without treating it as an official deadline', () => {
    const preparing = createCase('vehicle-transfer', NOW, 'transfer');
    const waiting = updateCase(createCase('fastag', NOW, 'tag'), { status: 'awaiting-response', followUpDate: '2026-09-06' }, NOW);
    const plan = createJourney('buy-used', ['transfer', 'tag'], NOW, 'one');
    expect(summarizeJourney(plan, [preparing, waiting], NOW)).toMatchObject({ status: 'needs-attention', next: { kind: 'personal-follow-up', caseId: 'tag' } });
    expect(summarizeJourney(plan, [preparing, updateCase(waiting, { status: 'completed' }, NOW)], NOW).next.caseId).toBe('transfer');
    expect(() => summarizeJourney(plan, Array.from({ length: 51 }, (_, index) => createCase('fastag', NOW, `case-${index}`)), NOW)).toThrow(/50/i);
  });

  it('saves only selected IDs and metadata without modifying cases or extending an unchanged plan', async () => {
    const { storage } = install(); const cases = storedCases(); const before = JSON.stringify(readCases());
    const saved = await saveJourney(createJourney('buy-used', ['transfer'], NOW, 'one'), { original: null, cases: [cases[0]], consent: true });
    expect(saved.revision).toBe(1); expect(await readJourneys()).toEqual([saved]);
    expect(storage.getItem(KEY)).not.toMatch(/Private|facts|draft|title|name|reference/);
    expect(JSON.stringify(readCases())).toBe(before);
    vi.setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    expect(await saveJourney(saved, { original: saved, cases: [cases[0]], consent: true })).toEqual(saved);
  });

  it('rejects reviewed cases that changed, disappeared or contain unsaved changes', async () => {
    const { storage } = install(); const cases = storedCases(); const plan = createJourney('buy-used', ['transfer'], NOW, 'one');
    await expect(saveJourney(plan, { original: null, cases: [{ ...cases[0], title: 'Unsaved' }], consent: true })).rejects.toThrow(/case|review/i);
    saveCase(updateCase(readCases()[0], { title: 'Another tab' }, NOW));
    await expect(saveJourney(plan, { original: null, cases: [cases[0]], consent: true })).rejects.toThrow(/case|review/i);
    deleteCase('transfer');
    await expect(saveJourney(plan, { original: null, cases: [cases[0]], consent: true })).rejects.toThrow(/case|review/i);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('serializes concurrent plan writes and refuses stale revisions, changed snapshots and deleted-plan resurrection', async () => {
    const { storage } = install(); const cases = storedCases();
    const saved = await saveJourney(createJourney('buy-used', ['transfer'], NOW, 'one'), { original: null, cases: [cases[0]], consent: true });
    const writes = await Promise.allSettled([
      saveJourney({ ...saved, caseIds: ['transfer', 'tag'] }, { original: saved, cases, consent: true }),
      saveJourney({ ...saved, caseIds: ['tag'] }, { original: saved, cases: [cases[1]], consent: true }),
    ]);
    expect(writes.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(writes.filter(item => item.status === 'rejected')).toHaveLength(1);
    await expect(deleteJourney(saved)).rejects.toThrow(/changed|conflict/i);
    const current = (await readJourneys())[0];
    const raw = JSON.parse(storage.getItem(KEY)!); raw.plans[0].caseIds = ['tag']; storage.setItem(KEY, JSON.stringify(raw));
    await expect(deleteJourney(current)).rejects.toThrow(/changed|conflict/i);
    await deleteJourney((await readJourneys())[0]);
    await expect(saveJourney(current, { original: current, cases, consent: true })).rejects.toThrow(/deleted|conflict/i);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('reconciles deleted/expired case links, preserving empty plans and original retention timestamps', async () => {
    install(); const cases = storedCases();
    const saved = await saveJourney(createJourney('buy-used', ['transfer', 'tag'], NOW, 'one'), { original: null, cases, consent: true });
    deleteCase('transfer');
    const pruned = (await readJourneys())[0];
    expect(pruned).toMatchObject({ caseIds: ['tag'], revision: 2, updatedAt: saved.updatedAt });
    deleteCase('tag');
    expect((await readJourneys())[0]).toMatchObject({ caseIds: [], revision: 3, updatedAt: saved.updatedAt });
    vi.setSystemTime(new Date('2026-12-05T10:00:00.000Z'));
    expect(await readJourneys()).toEqual([]);
  });

  it('bounds storage, rejects malformed data without replacement, and supports explicit clear-all', async () => {
    const { storage } = install(); const cases = storedCases();
    for (let index = 0; index < 10; index++) await saveJourney(createJourney('buy-used', ['transfer'], NOW, `plan-${index}`), { original: null, cases: [cases[0]], consent: true });
    await expect(saveJourney(createJourney('buy-used', ['transfer'], NOW, 'overflow'), { original: null, cases: [cases[0]], consent: true })).rejects.toThrow(/10|limit/i);
    const broken = '{broken private data'; storage.setItem(KEY, broken);
    await expect(readJourneys()).rejects.toThrow();
    await expect(saveJourney(createJourney('buy-used', ['transfer'], NOW, 'new'), { original: null, cases: [cases[0]], consent: true })).rejects.toThrow();
    expect(storage.getItem(KEY)).toBe(broken);
    await deleteAllJourneys(); expect(storage.getItem(KEY)).toBeNull(); expect(readCases()).toHaveLength(2);
  });

  it('cancels a queued save before its lock starts and does not write reviewed links afterward', async () => {
    const { storage, hold } = install(); const cases = storedCases(); const release = hold(); const controller = new AbortController();
    const pending = saveJourney(createJourney('buy-used', ['transfer'], NOW, 'cancelled'), { original: null, cases: [cases[0]], consent: true, signal: controller.signal });
    controller.abort(); release();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(storage.getItem(KEY)).toBeNull();
  });
});
