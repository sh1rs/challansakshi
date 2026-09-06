import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRenewal, renewalInput, updateRenewal, type RenewalRecord } from '../lib/mobility/renewals';
import { assertCurrentRenewal, deleteAllRenewals, deleteRenewal, readRenewals, RENEWAL_STORE_EVENT, RENEWAL_STORE_KEY as KEY, saveRenewal } from '../lib/mobility/renewal-store';

const NOW = '2026-09-06T10:00:00.000Z';
const input = { kind: 'licence' as const, label: 'My licence', vehicleLabel: '', expiryDate: '2026-10-06', sourceLabel: 'Original card', checkedOn: '2026-09-06', reminderDate: '' };
const create = (id = 'renewal-first') => createRenewal(input, NOW, id, '2026-09-06');
function install(withLocks = true) {
  const entries = new Map<string, string>();
  const storage: Storage = { get length() { return entries.size; }, clear: () => entries.clear(), getItem: key => entries.get(key) ?? null, key: index => [...entries.keys()][index] ?? null, removeItem: key => { entries.delete(key); }, setItem: (key, value) => { entries.set(key, value); } };
  const browser = new EventTarget() as EventTarget & { localStorage: Storage }; browser.localStorage = storage;
  let queue: Promise<unknown> = Promise.resolve(); const lockNames: string[] = [];
  const locks = { request: (name: string, options: { signal?: AbortSignal }, action: () => unknown) => {
    lockNames.push(name); const run = queue.catch(() => {}).then(() => { options.signal?.throwIfAborted(); return action(); }); queue = run; return run;
  } };
  vi.stubGlobal('window', browser); vi.stubGlobal('navigator', withLocks ? { locks } : {});
  return { storage, browser, lockNames };
}
const save = (record = create(), expected?: RenewalRecord) => saveRenewal(record, { consent: true, expected });
function raw(records: RenewalRecord[]) { return JSON.stringify({ version: 1, savedAt: NOW, records }); }

describe('locked private-device document reminder storage', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('has SSR-safe reads, explicit consent and empty-browser cleanup without Web Locks', async () => {
    vi.stubGlobal('window', undefined); expect(await readRenewals()).toEqual([]);
    await expect(saveRenewal(create(), { consent: false })).rejects.toThrow(/consent/i);
    install(false); expect(await readRenewals()).toEqual([]); await expect(deleteAllRenewals()).resolves.toBeUndefined();
    await expect(save()).rejects.toThrow(/web locks/i);
  });
  it('allows explicit privacy erasure of existing malformed data without Web Locks while saves remain unavailable', async () => {
    const { storage } = install(false); storage.setItem(KEY, '{malformed'); storage.setItem('other', 'keep');
    await expect(deleteAllRenewals()).resolves.toBeUndefined(); expect(storage.getItem(KEY)).toBeNull(); expect(storage.getItem('other')).toBe('keep');
    await expect(save()).rejects.toThrow(/web locks/i);
  });
  it.each(['one', 'all'] as const)('cancels a queued %s reminder deletion without removing saved data', async kind => {
    const { storage } = install(); const original = await save(); const before = storage.getItem(KEY); const controller = new AbortController();
    const pending = kind === 'one' ? deleteRenewal(original, controller.signal) : deleteAllRenewals(controller.signal);
    controller.abort(); await expect(pending).rejects.toThrow(); expect(storage.getItem(KEY)).toBe(before);
  });
  it('checks deletion cancellation before unsupported-browser removal and again inside a lock', async () => {
    const { storage } = install(false); storage.setItem(KEY, '{malformed'); const cancelled = new AbortController(); cancelled.abort();
    await expect(deleteAllRenewals(cancelled.signal)).rejects.toThrow(); expect(storage.getItem(KEY)).toBe('{malformed');
    const controller = new AbortController();
    vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, work: () => unknown) => { controller.abort(); return Promise.resolve().then(work); } } });
    await expect(deleteAllRenewals(controller.signal)).rejects.toThrow(); expect(storage.getItem(KEY)).toBe('{malformed');
  });
  it('stores revisions and emits local changes without keeping documents or touching unrelated stores', async () => {
    const { storage, browser } = install(); storage.setItem('unrelated', 'keep'); const changes: Event[] = [];
    browser.addEventListener(RENEWAL_STORE_EVENT, event => changes.push(event));
    const first = await save(); expect(first.revision).toBe(1); expect(await readRenewals()).toEqual([first]);
    const edited = await save(updateRenewal(first, { ...input, label: 'Updated label' }, NOW, '2026-09-06'), first);
    expect(edited.revision).toBe(2); expect(changes).toHaveLength(2);
    await deleteRenewal(edited); expect(await readRenewals()).toEqual([]); expect(storage.getItem('unrelated')).toBe('keep');
  });
  it('serializes concurrent creates rather than overwriting the first writer', async () => {
    const { lockNames } = install(); const results = await Promise.all([save(create('first')), save(create('second'))]);
    expect(await readRenewals()).toEqual(results); expect(new Set(lockNames).size).toBe(1);
  });
  it('serializes an empty-store clear behind an already queued create so it cannot return before the write', async () => {
    const { storage } = install();
    await Promise.all([save(), deleteAllRenewals()]);
    expect(storage.getItem(KEY)).toBeNull(); expect(await readRenewals()).toEqual([]);
  });
  it('allows exactly one simultaneous edit from the same source and rejects stale deletion and resurrection', async () => {
    install(); const original = await save();
    const changes = await Promise.allSettled(['first edit', 'second edit'].map(label => save(updateRenewal(original, { ...input, label }, NOW, '2026-09-06'), original)));
    expect(changes.filter(value => value.status === 'fulfilled')).toHaveLength(1);
    expect(changes.filter(value => value.status === 'rejected')).toHaveLength(1);
    await expect(deleteRenewal(original)).rejects.toThrow(/changed/i);
    const latest = (await readRenewals())[0]; await deleteRenewal(latest);
    await expect(save(updateRenewal(latest, input, NOW, '2026-09-06'), latest)).rejects.toThrow(/stale/i);
  });
  it('checks the full snapshot, including same-revision manual changes, inside the lock', async () => {
    const { storage } = install(); const original = await save();
    storage.setItem(KEY, raw([{ ...original, sourceLabel: 'Changed without revision' }])); const before = storage.getItem(KEY);
    await expect(assertCurrentRenewal(original)).rejects.toThrow(/changed/i);
    await expect(save(updateRenewal(original, input, NOW, '2026-09-06'), original)).rejects.toThrow(/stale/i);
    await expect(deleteRenewal(original)).rejects.toThrow(/changed/i); expect(storage.getItem(KEY)).toBe(before);
  });
  it('refuses edits without an expected saved source and protects identity/creation time', async () => {
    install(); const original = await save();
    await expect(save(original)).rejects.toThrow(/stale/i);
    await expect(save({ ...original, createdAt: '2026-09-05T10:00:00.000Z' }, original)).rejects.toThrow(/stale/i);
    await expect(save({ ...original, id: 'another-id' }, original)).rejects.toThrow(/stale/i);
  });
  it('does not extend retention on reads and prunes at exactly 90 days', async () => {
    const { storage } = install(); const original = await save(), before = storage.getItem(KEY);
    vi.setSystemTime(new Date(Date.parse(NOW) + 90 * 86_400_000 - 1)); expect(await readRenewals()).toEqual([original]); expect(storage.getItem(KEY)).toBe(before);
    vi.setSystemTime(new Date(Date.parse(NOW) + 90 * 86_400_000)); expect(await readRenewals()).toEqual([]); expect(storage.getItem(KEY)).toBeNull();
    await expect(save(updateRenewal(original, renewalInput(original), new Date().toISOString(), '2026-12-05'), original)).rejects.toThrow(/stale/i);
  });
  it('an explicit save renews retention and an expiry prune rechecks newer data under the same lock', async () => {
    const { lockNames } = install(); const original = await save();
    vi.setSystemTime(new Date(Date.parse(NOW) + 89 * 86_400_000));
    const saved = await save(updateRenewal(original, input, new Date().toISOString(), '2026-12-04'), original);
    vi.setSystemTime(new Date(Date.parse(NOW) + 90 * 86_400_000)); expect(await readRenewals()).toEqual([saved]);
    expect(new Set(lockNames).size).toBe(1);
  });
  it('validates the whole store before any expiry prune and permits explicit malformed-data recovery', async () => {
    const { storage } = install(); const original = { ...create(), revision: 1 };
    for (const bad of ['{broken', raw([original, original]), raw([{ ...original, verified: true } as unknown as RenewalRecord]), raw(Array.from({ length: 51 }, (_, i) => ({ ...original, id: `row-${i}` }))), 'x'.repeat(150001)]) {
      storage.setItem(KEY, bad); await expect(readRenewals()).rejects.toThrow(); await expect(save()).rejects.toThrow(); expect(storage.getItem(KEY)).toBe(bad);
    }
    await deleteAllRenewals(); expect(storage.getItem(KEY)).toBeNull();
  });
  it('rejects future record/check/envelope timestamps without silently extending retention', async () => {
    const { storage } = install(); const original = { ...create(), revision: 1 };
    for (const modified of [{ ...original, updatedAt: '2027-09-06T10:00:00.000Z' }, { ...original, checkedOn: '2026-09-07' }]) {
      const stored = raw([modified]); storage.setItem(KEY, stored); await expect(readRenewals()).rejects.toThrow(/future/i); expect(storage.getItem(KEY)).toBe(stored);
    }
    storage.setItem(KEY, JSON.stringify({ version: 1, savedAt: '2027-09-06T10:00:00.000Z', records: [] })); await expect(readRenewals()).rejects.toThrow(/future/i);
  });
  it('enforces 50 records without modifying existing data, and preserves it on quota failure', async () => {
    const { storage } = install(); storage.setItem(KEY, raw(Array.from({ length: 50 }, (_, i) => ({ ...create(`record-${i}`), revision: 1 }))));
    const full = storage.getItem(KEY); await expect(save()).rejects.toThrow(/50/i); expect(storage.getItem(KEY)).toBe(full);
    await deleteAllRenewals(); const original = await save(), before = storage.getItem(KEY);
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    await expect(save(updateRenewal(original, input, NOW, '2026-09-06'), original)).rejects.toThrow(/quota/i); expect(storage.getItem(KEY)).toBe(before);
  });
  it('native clear, deletion and updates relay while unrelated keys do not; clearing erases only this feature', async () => {
    const { storage, browser } = install(); await save(); storage.setItem('other-feature', 'keep'); const operations: string[] = [];
    browser.addEventListener(RENEWAL_STORE_EVENT, event => operations.push((event as CustomEvent).detail.operation));
    for (const [key, newValue] of [[KEY, '{}'], [KEY, null], [null, null], ['unrelated', null]]) { const event = new Event('storage'); Object.defineProperties(event, { key: { value: key }, newValue: { value: newValue } }); browser.dispatchEvent(event); }
    expect(operations).toEqual(['external', 'clear', 'clear']); await deleteAllRenewals(); expect(storage.getItem('other-feature')).toBe('keep');
  });
  it('queued save cancellation cannot write after its approval is withdrawn', async () => {
    const { storage } = install(); const controller = new AbortController(); const pending = saveRenewal(create(), { consent: true, signal: controller.signal }); controller.abort();
    await expect(pending).rejects.toThrow(); expect(storage.getItem(KEY)).toBeNull();
  });
});
