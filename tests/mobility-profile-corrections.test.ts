import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCase, updateCase, type CaseFact, type MobilityCase, type MobilityProfile } from '../lib/mobility/cases';
import { applyProfileCorrections, buildProfileCorrectionPreview } from '../lib/mobility/profile-corrections';
import { deleteCase, MOBILITY_STORE_EVENT, readCases, readProfile, saveCase, saveCasesAtomically, saveProfile } from '../lib/mobility/store';

const CREATED = '2026-09-06T08:00:00.000Z';
const NOW = '2026-09-06T10:00:00.000Z';
const CASES_KEY = 'challansakshi-mobility-cases-v1';
const PROFILE_KEY = 'challansakshi-mobility-profile-v1';

function installBrowser() {
  const entries = new Map<string, string>();
  const storage: Storage = {
    get length() { return entries.size; },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => { entries.delete(key); },
    setItem: (key, value) => { entries.set(key, value); },
  };
  const browser = new EventTarget() as EventTarget & { localStorage: Storage };
  browser.localStorage = storage;
  vi.stubGlobal('window', browser);
  return { browser, storage };
}

function profile(): MobilityProfile {
  return { version: 1, name: 'Asha Rao', address: 'Mysuru', language: 'en', updatedAt: NOW,
    vehicles: [
      { id: 'scooter', label: 'My scooter', registration: 'KA01AB3317' },
      { id: 'car', label: 'Family car', registration: 'KA09CD2211' },
    ] };
}

function fact(key = 'profile_name', value = 'Asha R', source: CaseFact['source'] = 'profile'): CaseFact {
  return { key, label: key === 'profile_name' ? 'Name' : key, value, source, confirmed: true };
}

function draft(id: string, facts: CaseFact[] = [fact()]): MobilityCase {
  return updateCase(createCase('licence-renew', CREATED, id), { facts, draft: 'My reviewed request: Asha R in Bengaluru.', status: 'ready' }, CREATED);
}

function savedPreview(cases: MobilityCase[] = [draft('first'), draft('second')]) {
  saveProfile(profile());
  cases.forEach(saveCase);
  return buildProfileCorrectionPreview(readProfile()!, readCases());
}

describe('reviewed profile corrections', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('previews only existing profile-sourced facts and matches multiple vehicles by stable id', () => {
    const preview = buildProfileCorrectionPreview(profile(), [draft('first', [
      fact(), fact('profile_address', 'Bengaluru'),
      fact('profile_vehicle_car', 'KA09OLD1'), fact('vehicle_scooter', 'KA01OLD2'),
      fact('profile_vehicle_removed', 'KA01KEEP'),
      fact('citizen_name', 'Citizen input'), fact('document_name', 'Document input', 'document'),
    ]), draft('citizen', [fact('profile_name', 'My chosen name', 'citizen')]),
    draft('document', [fact('profile_address', 'Original address', 'document')])]);

    expect(preview.cases).toHaveLength(1);
    expect(preview.cases[0].changes.map(change => [change.key, change.before, change.after])).toEqual([
      ['profile_name', 'Asha R', 'Asha Rao'], ['profile_address', 'Bengaluru', 'Mysuru'],
      ['profile_vehicle_car', 'KA09OLD1', 'KA09CD2211'], ['vehicle_scooter', 'KA01OLD2', 'KA01AB3317'],
    ]);
    expect(preview.cases[0].preservedFacts).toBe(3);
    expect(preview.excluded.map(item => item.reason)).toEqual(['no-profile-facts', 'no-profile-facts']);
  });

  it('keeps completed, awaiting-response and cases with citizen-reported activity out of the batch', () => {
    const completed = updateCase(draft('completed'), { status: 'completed' }, NOW);
    const awaiting = updateCase(draft('awaiting'), { status: 'awaiting-response' }, NOW);
    const reported = updateCase(draft('reported'), { status: 'preparing' }, NOW,
      { kind: 'citizen-report', basis: 'citizen-reported', text: 'I submitted the request.' });
    const preview = buildProfileCorrectionPreview(profile(), [completed, awaiting, reported]);

    expect(preview.cases).toEqual([]);
    expect(preview.excluded.map(item => item.reason)).toEqual(['completed', 'awaiting-response', 'citizen-reported']);
  });

  it('changes selected saved drafts in one write and preserves wording, citizen facts and unselected cases', () => {
    const { storage, browser } = installBrowser();
    const preview = savedPreview([draft('first', [fact(), fact('personal_note', 'Keep my words', 'citizen')]), draft('second'), draft('third')]);
    const unselected = readCases()[2];
    const events: Event[] = [];
    browser.addEventListener(MOBILITY_STORE_EVENT, event => events.push(event));
    const writes = vi.spyOn(storage, 'setItem');

    const result = applyProfileCorrections(preview, ['first', 'second'], NOW);

    expect(writes).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(result).toHaveLength(2);
    const saved = readCases();
    expect(saved[0].facts[0]).toMatchObject({ value: 'Asha Rao', source: 'profile', confirmed: false });
    expect(saved[0].facts[1]).toEqual(fact('personal_note', 'Keep my words', 'citizen'));
    expect(saved[0].draft).toBe('My reviewed request: Asha R in Bengaluru.');
    expect(saved[0].status).toBe('preparing');
    expect(saved[0].events.at(-1)).toMatchObject({ kind: 'updated', basis: 'local' });
    expect(saved[2]).toEqual(unselected);
    expect(readProfile()).toEqual(profile());
  });

  it('rejects the entire batch when any selected case has a newer revision, even at the same timestamp', () => {
    const { storage } = installBrowser();
    const preview = savedPreview();
    saveCase(updateCase(readCases()[1], { reference: 'Another tab saved' }, CREATED));
    const before = storage.getItem(CASES_KEY);
    const writes = vi.spyOn(storage, 'setItem');

    expect(() => applyProfileCorrections(preview, ['first', 'second'], NOW)).toThrow(/stale|conflict/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
    expect(writes).not.toHaveBeenCalled();
  });

  it('does not resurrect a deleted draft or partially update another selected draft', () => {
    const { storage } = installBrowser();
    const preview = savedPreview();
    deleteCase('second');
    const before = storage.getItem(CASES_KEY);

    expect(() => applyProfileCorrections(preview, ['first', 'second'], NOW)).toThrow(/deleted|stale|conflict/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
    expect(readCases().map(item => item.facts[0].value)).toEqual(['Asha R']);
  });

  it.each(['content', 'timestamp', 'deleted'] as const)('rejects a stale profile after a %s change', change => {
    const { storage } = installBrowser();
    const preview = savedPreview();
    if (change === 'deleted') storage.removeItem(PROFILE_KEY);
    else saveProfile({ ...profile(), ...(change === 'content' ? { name: 'Asha Sharma' } : { updatedAt: '2026-09-06T10:01:00.000Z' }) });
    const before = storage.getItem(CASES_KEY);

    expect(() => applyProfileCorrections(preview, ['first', 'second'], NOW)).toThrow(/profile.*(changed|stale|conflict)|stale.*profile/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
  });

  it('excludes cases at the event cap and rejects selecting one without a partial update', () => {
    const { storage } = installBrowser();
    let full = draft('full');
    for (let index = 0; index < 199; index += 1) {
      full = updateCase(full, {}, CREATED, { kind: 'updated', text: 'Local edit', basis: 'local' });
    }
    const preview = savedPreview([draft('first'), full]);
    const before = storage.getItem(CASES_KEY);

    expect(preview.excluded).toContainEqual({ caseId: 'full', title: 'Driving licence renewal', reason: 'event-limit' });
    expect(() => applyProfileCorrections(preview, ['first', 'full'], NOW)).toThrow(/preview|selected/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
  });

  it('leaves all data and revisions unchanged on a storage write failure', () => {
    const { storage } = installBrowser();
    const preview = savedPreview();
    const before = storage.getItem(CASES_KEY);
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });

    expect(() => applyProfileCorrections(preview, ['first', 'second'], NOW)).toThrow(/quota/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
  });

  it('never adds new profile fields and leaves a removed vehicle registration available for citizen review', () => {
    const preview = buildProfileCorrectionPreview(profile(), [draft('removed', [fact('profile_vehicle_removed', 'OLD-KEEP')]), draft('empty', [])]);
    expect(preview.cases).toEqual([]);
    expect(preview.excluded.map(item => item.reason)).toEqual(['missing-profile-value', 'no-profile-facts']);
  });

  it('previews intentional clearing of name/address and handles unchanged profiles without an update', () => {
    const cleared = buildProfileCorrectionPreview({ ...profile(), name: '', address: '' }, [draft('first', [fact(), fact('profile_address', 'Bengaluru')])]);
    expect(cleared.cases[0].changes.map(change => change.after)).toEqual(['', '']);
    const unchanged = buildProfileCorrectionPreview(profile(), [draft('first', [fact('profile_name', 'Asha Rao')])]);
    expect(unchanged.cases).toEqual([]);
    expect(unchanged.unchangedCount).toBe(1);
  });

  it('rejects duplicate, unknown or empty selections before writing', () => {
    const { storage } = installBrowser();
    const preview = savedPreview();
    const writes = vi.spyOn(storage, 'setItem');
    expect(() => applyProfileCorrections(preview, [], NOW)).toThrow(/select/i);
    expect(() => applyProfileCorrections(preview, ['first', 'first'], NOW)).toThrow(/duplicate|unique/i);
    expect(() => applyProfileCorrections(preview, ['unknown'], NOW)).toThrow(/preview|selected/i);
    expect(writes).not.toHaveBeenCalled();
  });

  it('rejects a selection that became completed since the preview without changing another draft', () => {
    const { storage } = installBrowser();
    const preview = savedPreview();
    saveCase(updateCase(readCases()[1], { status: 'completed' }, NOW));
    const before = storage.getItem(CASES_KEY);
    expect(() => applyProfileCorrections(preview, ['first', 'second'], NOW)).toThrow(/stale|conflict/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
  });

  it('keeps changes to unselected cases while saving only the reviewed selection', () => {
    installBrowser();
    const preview = savedPreview();
    saveCase(updateCase(readCases()[1], { draft: 'Newer words in the unselected draft.' }, NOW));
    applyProfileCorrections(preview, ['first'], NOW);
    const stored = readCases();
    expect(stored[0].facts[0].value).toBe('Asha Rao');
    expect(stored[1].facts[0].value).toBe('Asha R');
    expect(stored[1].draft).toBe('Newer words in the unselected draft.');
  });

  it('makes pre-correction editor revisions stale and returns saved revisions for deliberate further edits', () => {
    installBrowser();
    const preview = savedPreview();
    const oldEditor = readCases()[0];
    const [saved] = applyProfileCorrections(preview, ['first'], NOW);
    expect(() => saveCase(updateCase(oldEditor, { draft: 'Unsaved editor words' }, NOW))).toThrow(/stale|conflict/i);
    expect(() => saveCase(updateCase(saved, { reference: 'Deliberate new edit' }, NOW))).not.toThrow();
    expect(readCases()[0].facts[0].value).toBe('Asha Rao');
    expect(readCases()[0].reference).toBe('Deliberate new edit');
  });

  it('rejects an expired selected case without an expiry-pruning write', () => {
    const { storage } = installBrowser();
    savedPreview();
    const originals = readCases();
    const later = '2026-12-06T10:00:00.000Z';
    vi.setSystemTime(new Date(later));
    saveProfile({ ...profile(), updatedAt: later });
    const preview = buildProfileCorrectionPreview(readProfile()!, originals);
    const before = storage.getItem(CASES_KEY);
    const writes = vi.spyOn(storage, 'setItem');
    const removals = vi.spyOn(storage, 'removeItem');
    expect(() => applyProfileCorrections(preview, ['first', 'second'], later)).toThrow(/expired|stale|conflict/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
    expect(writes).not.toHaveBeenCalled();
    expect(removals).not.toHaveBeenCalled();
  });

  it('requires stored originals and cannot use the batch API to change case identity', () => {
    const { storage } = installBrowser();
    savedPreview();
    const original = readCases()[0];
    const before = storage.getItem(CASES_KEY);
    const unversioned = JSON.parse(JSON.stringify(original)) as MobilityCase;
    expect(() => saveCasesAtomically([{ original: unversioned, next: updateCase(original, { draft: 'Changed' }, NOW) }], profile())).toThrow(/stale|conflict/i);
    expect(() => saveCasesAtomically([{ original, next: { ...original, id: 'different-id' } }], profile())).toThrow(/identity/i);
    expect(storage.getItem(CASES_KEY)).toBe(before);
  });

  it('caps previews at the saved store limit and rejects duplicate case ids', () => {
    expect(() => buildProfileCorrectionPreview(profile(), Array.from({ length: 51 }, (_, index) => draft(`case-${index}`)))).toThrow(/50/i);
    expect(() => buildProfileCorrectionPreview(profile(), [draft('same'), draft('same')])).toThrow(/unique|duplicate/i);
  });
});
