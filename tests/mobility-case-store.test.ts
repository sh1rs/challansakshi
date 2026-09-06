import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCase, updateCase, type MobilityProfile } from '../lib/mobility/cases';
import {
  deleteAllMobilityData,
  deleteCase,
  MOBILITY_STORE_EVENT,
  readCases,
  readProfile,
  saveCase,
  saveProfile,
} from '../lib/mobility/store';

type MemoryStorage = Storage & { entries: Map<string, string> };

function memoryStorage(): MemoryStorage {
  const entries = new Map<string, string>();
  return {
    entries,
    get length() { return entries.size; },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => { entries.delete(key); },
    setItem: (key, value) => { entries.set(key, value); },
  };
}

function installBrowser(storage: Storage = memoryStorage()) {
  const target = new EventTarget() as EventTarget & { localStorage: Storage };
  target.localStorage = storage;
  vi.stubGlobal('window', target);
  return target;
}

function profile(updatedAt = '2026-09-06T08:00:00.000Z'): MobilityProfile {
  return {
    version: 1,
    name: 'Asha Rao',
    language: 'en',
    vehicles: [{ id: 'vehicle-1', label: 'Scooter', registration: 'KA01AB3317' }],
    address: 'Bengaluru',
    updatedAt,
  };
}

describe('mobility browser store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('is SSR-safe for reads and reports that browser writes are unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(readCases()).toEqual([]);
    expect(readProfile()).toBeNull();
    expect(() => saveCase(createCase('fastag', '2026-09-06T09:00:00.000Z', 'case-ssr'))).toThrow(/browser storage/i);
    expect(() => deleteAllMobilityData()).toThrow(/browser storage/i);
  });

  it('persists validated case and profile data and emits a same-tab support event', () => {
    const browser = installBrowser();
    const events: Event[] = [];
    browser.addEventListener(MOBILITY_STORE_EVENT, (event) => events.push(event));
    const caseValue = createCase('challan-review', '2026-09-06T09:00:00.000Z', 'case-1');

    saveCase(caseValue);
    saveProfile(profile());

    expect(readCases()).toEqual([caseValue]);
    expect(readProfile()).toEqual(profile());
    expect(events).toHaveLength(2);
  });

  it('relays relevant native storage events for cross-tab subscribers', () => {
    const browser = installBrowser();
    const changes: Event[] = [];
    browser.addEventListener(MOBILITY_STORE_EVENT, (event) => changes.push(event));
    readCases();
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: 'challansakshi-mobility-cases-v1' });

    browser.dispatchEvent(event);

    expect(changes).toHaveLength(1);
  });

  it('expires case and profile records after 90 days and removes their dedicated keys', () => {
    const storage = memoryStorage();
    installBrowser(storage);
    const staleAt = '2026-06-08T09:59:59.999Z';
    vi.setSystemTime(new Date(staleAt));
    saveCase(createCase('lost-documents', staleAt, 'case-stale'));
    saveProfile(profile(staleAt));
    vi.setSystemTime(new Date('2026-09-06T10:00:00.000Z'));

    expect(readCases()).toEqual([]);
    expect(readProfile()).toBeNull();
    expect([...storage.entries.keys()]).toEqual([]);
  });

  it('keeps records just inside the 90-day expiry boundary', () => {
    installBrowser();
    const freshAt = '2026-06-08T10:00:00.001Z';
    vi.setSystemTime(new Date(freshAt));
    saveCase(createCase('move-state', freshAt, 'case-fresh'));
    vi.setSystemTime(new Date('2026-09-06T10:00:00.000Z'));

    expect(readCases()).toHaveLength(1);
  });

  it('identifies only records actually removed by an expiry read', () => {
    const browser = installBrowser();
    const old = '2026-06-08T09:59:59.999Z'; vi.setSystemTime(new Date(old));
    saveCase(createCase('fastag', old, 'expired-one'));
    const fresh = '2026-06-09T10:00:00.000Z'; vi.setSystemTime(new Date(fresh));
    saveCase(createCase('licence-renew', fresh, 'still-here'));
    const details: unknown[] = []; browser.addEventListener(MOBILITY_STORE_EVENT, event => details.push((event as CustomEvent).detail));
    vi.setSystemTime(new Date('2026-09-06T10:00:00.000Z'));
    expect(readCases().map(item => item.id)).toEqual(['still-here']);
    expect(details).toEqual([{ area: 'cases', operation: 'expire', expiredIds: ['expired-one'] }]);
  });

  it('enforces the strict 50-case limit without evicting an existing case', () => {
    installBrowser();
    for (let index = 0; index < 50; index += 1) {
      saveCase(createCase('fastag', `2026-09-06T09:${String(index).padStart(2, '0')}:00.000Z`, `case-${index}`));
    }

    expect(() => saveCase(createCase('fastag', '2026-09-06T09:59:00.000Z', 'case-50'))).toThrow(/50/);
    expect(readCases()).toHaveLength(50);
  });

  it('rejects stale tab updates while accepting the first revision', () => {
    installBrowser();
    saveCase(createCase('payment-status', '2026-09-06T08:00:00.000Z', 'case-conflict'));
    const tabA = readCases()[0];
    const tabB = readCases()[0];
    saveCase(updateCase(tabB, { reference: 'B saved first' }, '2026-09-06T08:05:00.000Z'));

    expect(() => saveCase(updateCase(tabA, { reference: 'A is stale' }, '2026-09-06T08:06:00.000Z'))).toThrow(/conflict|stale/i);
    expect(readCases()[0].reference).toBe('B saved first');
  });

  it('does not resurrect a case deleted from another tab', () => {
    installBrowser();
    saveCase(createCase('fastag', '2026-09-06T08:00:00.000Z', 'case-deleted-elsewhere'));
    const staleEditor = readCases()[0];
    deleteCase(staleEditor.id);

    expect(() => saveCase(updateCase(staleEditor, { draft: 'Stale edit' }, '2026-09-06T08:05:00.000Z'))).toThrow(/deleted|expired|conflict/i);
    expect(readCases()).toEqual([]);
  });

  it('does not resurrect an expired case through a previously opened editor', () => {
    installBrowser();
    const oldTime = '2026-06-08T09:59:59.999Z';
    vi.setSystemTime(new Date(oldTime));
    saveCase(createCase('lost-documents', oldTime, 'case-expired-editor'));
    const staleEditor = readCases()[0];
    vi.setSystemTime(new Date('2026-09-06T10:00:00.000Z'));

    expect(() => saveCase(updateCase(staleEditor, { draft: 'Late edit' }, '2026-09-06T10:00:00.000Z'))).toThrow(/deleted|expired|conflict/i);
    expect(readCases()).toEqual([]);
  });

  it('throws honestly for malformed reads and failed writes', () => {
    const malformed = memoryStorage();
    malformed.setItem('challansakshi-mobility-cases-v1', '{bad json');
    installBrowser(malformed);
    expect(() => readCases()).toThrow(/read stored mobility cases/i);

    const quota = memoryStorage();
    quota.setItem = () => { throw new Error('quota exceeded'); };
    installBrowser(quota);
    expect(() => saveCase(createCase('fastag', '2026-09-06T09:00:00.000Z', 'case-quota'))).toThrow(/save mobility cases/i);
  });

  it('deletes only mobility case/profile data and keeps the existing checklist intact', () => {
    const storage = memoryStorage();
    storage.setItem('challansakshi-private-tasks-v1', 'existing-checklist');
    storage.setItem('unrelated', 'keep');
    installBrowser(storage);
    saveCase(createCase('licence-renew', '2026-09-06T09:00:00.000Z', 'case-delete'));
    saveProfile(profile());

    deleteCase('case-delete');
    expect(readCases()).toEqual([]);
    saveCase(createCase('licence-renew', '2026-09-06T09:00:00.000Z', 'case-delete-all'));
    deleteAllMobilityData();

    expect(readCases()).toEqual([]);
    expect(readProfile()).toBeNull();
    expect(storage.getItem('challansakshi-private-tasks-v1')).toBe('existing-checklist');
    expect(storage.getItem('unrelated')).toBe('keep');
  });
});
