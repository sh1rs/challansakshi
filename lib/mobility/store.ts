import { validateCase, validateProfile, type MobilityCase, type MobilityProfile } from './cases';

export const MOBILITY_STORE_EVENT = 'challansakshi:mobility-store-change';

const CASES_KEY = 'challansakshi-mobility-cases-v1';
const PROFILE_KEY = 'challansakshi-mobility-profile-v1';
const MAX_CASES = 50;
const EXPIRY_MS = 90 * 24 * 60 * 60 * 1_000;
const CASE_REVISION = Symbol.for('challansakshi.mobility.case-revision');

type CasesEnvelope = {
  version: 1;
  savedAt: string;
  cases: MobilityCase[];
  revisions: Record<string, number>;
};

type ProfileEnvelope = {
  version: 1;
  savedAt: string;
  profile: MobilityProfile;
};

type MobilityStoreDetail = {
  area: 'cases' | 'profile' | 'all';
  operation: 'save' | 'delete' | 'expire' | 'external';
  id?: string;
  expiredIds?: string[];
};

const relayTargets = new WeakSet<object>();

function browserWindow(): Window | null {
  return typeof window === 'undefined' ? null : window;
}

function browserStorage(required: boolean): Storage | null {
  const browser = browserWindow();
  if (!browser) {
    if (required) throw new Error('Browser storage is unavailable during server rendering.');
    return null;
  }
  ensureStorageRelay(browser);
  try {
    return browser.localStorage;
  } catch (cause) {
    if (required) throw storeError('Browser storage is unavailable.', cause);
    throw storeError('Browser storage could not be read.', cause);
  }
}

function storeError(message: string, cause: unknown): Error {
  const detail = cause instanceof Error && cause.message ? ` ${cause.message}` : '';
  return new Error(`${message}${detail}`, { cause });
}

function eventWithDetail(detail: MobilityStoreDetail): Event {
  if (typeof CustomEvent === 'function') return new CustomEvent(MOBILITY_STORE_EVENT, { detail });
  const event = new Event(MOBILITY_STORE_EVENT);
  Object.defineProperty(event, 'detail', { value: detail, enumerable: true });
  return event;
}

function emit(detail: MobilityStoreDetail): void {
  browserWindow()?.dispatchEvent(eventWithDetail(detail));
}

function ensureStorageRelay(browser: Window): void {
  if (relayTargets.has(browser)) return;
  browser.addEventListener('storage', (event) => {
    const key = (event as StorageEvent).key;
    if (key !== null && key !== CASES_KEY && key !== PROFILE_KEY) return;
    const area = key === CASES_KEY ? 'cases' : key === PROFILE_KEY ? 'profile' : 'all';
    browser.dispatchEvent(eventWithDetail({ area, operation: 'external' }));
  });
  relayTargets.add(browser);
}

function plainRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must be a plain object.`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const unexpected = Reflect.ownKeys(value).find((key) => typeof key !== 'string' || !keys.includes(key));
  if (unexpected !== undefined) throw new TypeError(`${label} has an unexpected field: ${String(unexpected)}.`);
  const missing = keys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing !== undefined) throw new TypeError(`${label} is missing ${missing}.`);
}

function isValidTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/u.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1
    && month <= 12
    && day >= 1
    && day <= monthDays[month - 1]
    && Number(match[4]) <= 23
    && Number(match[5]) <= 59
    && Number(match[6] ?? '0') <= 59
    && Number(match[10] ?? '0') <= 23
    && Number(match[11] ?? '0') <= 59;
}

function validTimestamp(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length > 64 || !isValidTimestamp(value)) {
    throw new TypeError(`${label} must be a valid ISO timestamp.`);
  }
  return value;
}

function revisionMap(value: unknown, caseIds: readonly string[]): Record<string, number> {
  const input = plainRecord(value, 'Mobility case revisions');
  const ids = Object.keys(input);
  if (ids.length !== caseIds.length || ids.some((id) => !caseIds.includes(id))) {
    throw new TypeError('Mobility case revisions must match saved case ids.');
  }
  const result: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const id of caseIds) {
    const value = input[id];
    if (!Number.isSafeInteger(value) || (value as number) < 1) throw new TypeError('Mobility case revisions must be positive integers.');
    result[id] = value as number;
  }
  return result;
}

function decodeCases(raw: string): CasesEnvelope {
  const input = plainRecord(JSON.parse(raw) as unknown, 'Mobility case store');
  exactKeys(input, ['version', 'savedAt', 'cases', 'revisions'], 'Mobility case store');
  if (input.version !== 1) throw new TypeError('Mobility case store version must be 1.');
  if (!Array.isArray(input.cases) || input.cases.length > MAX_CASES) {
    throw new TypeError(`Mobility case store cannot contain more than ${MAX_CASES} cases.`);
  }
  const cases = input.cases.map(validateCase);
  const ids = cases.map((caseValue) => caseValue.id);
  if (new Set(ids).size !== ids.length) throw new TypeError('Mobility case ids must be unique.');
  return {
    version: 1,
    savedAt: validTimestamp(input.savedAt, 'Mobility case store savedAt'),
    cases,
    revisions: revisionMap(input.revisions, ids),
  };
}

function decodeProfile(raw: string): ProfileEnvelope {
  const input = plainRecord(JSON.parse(raw) as unknown, 'Mobility profile store');
  exactKeys(input, ['version', 'savedAt', 'profile'], 'Mobility profile store');
  if (input.version !== 1) throw new TypeError('Mobility profile store version must be 1.');
  return {
    version: 1,
    savedAt: validTimestamp(input.savedAt, 'Mobility profile store savedAt'),
    profile: validateProfile(input.profile),
  };
}

function attachRevision(caseValue: MobilityCase, revision: number): MobilityCase {
  Object.defineProperty(caseValue, CASE_REVISION, {
    configurable: true,
    enumerable: false,
    value: revision,
    writable: true,
  });
  return caseValue;
}

function currentRevision(value: MobilityCase): number | undefined {
  const revision = (value as MobilityCase & { [CASE_REVISION]?: unknown })[CASE_REVISION];
  return Number.isSafeInteger(revision) && (revision as number) > 0 ? revision as number : undefined;
}

function expired(updatedAt: string, now = Date.now()): boolean {
  return now - Date.parse(updatedAt) >= EXPIRY_MS;
}

function emptyCasesEnvelope(): CasesEnvelope {
  return { version: 1, savedAt: new Date().toISOString(), cases: [], revisions: Object.create(null) as Record<string, number> };
}

function loadCases(storage: Storage): CasesEnvelope {
  const raw = storage.getItem(CASES_KEY);
  return raw === null ? emptyCasesEnvelope() : decodeCases(raw);
}

function writeCases(storage: Storage, envelope: CasesEnvelope): void {
  storage.setItem(CASES_KEY, JSON.stringify(envelope));
}

function removeCaseKey(storage: Storage): void {
  storage.removeItem(CASES_KEY);
}

function pruneExpiredCases(storage: Storage, envelope: CasesEnvelope): CasesEnvelope {
  const cases = envelope.cases.filter((caseValue) => !expired(caseValue.updatedAt));
  if (cases.length === envelope.cases.length) return envelope;
  if (cases.length === 0) {
    removeCaseKey(storage);
  } else {
    const revisions: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const caseValue of cases) revisions[caseValue.id] = envelope.revisions[caseValue.id];
    writeCases(storage, { version: 1, savedAt: new Date().toISOString(), cases, revisions });
  }
  emit({ area: 'cases', operation: 'expire', expiredIds: envelope.cases.filter(item => !cases.some(active => active.id === item.id)).map(item => item.id) });
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    cases,
    revisions: Object.fromEntries(cases.map((caseValue) => [caseValue.id, envelope.revisions[caseValue.id]])),
  };
}

function sameCase(left: MobilityCase, right: MobilityCase): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function tryAttachRevision(caseValue: MobilityCase, revision: number): void {
  try {
    attachRevision(caseValue, revision);
  } catch {
    // Frozen caller values remain valid; a later update must start from readCases().
  }
}

export function readCases(): MobilityCase[] {
  const storage = browserStorage(false);
  if (!storage) return [];
  try {
    const envelope = pruneExpiredCases(storage, loadCases(storage));
    return envelope.cases.map((caseValue) => attachRevision(caseValue, envelope.revisions[caseValue.id]));
  } catch (cause) {
    throw storeError('Could not read stored mobility cases.', cause);
  }
}

export function saveCase(caseValue: MobilityCase): void {
  const storage = browserStorage(true) as Storage;
  const expectedRevision = currentRevision(caseValue);
  const checked = validateCase(caseValue);
  try {
    const envelope = pruneExpiredCases(storage, loadCases(storage));
    const index = envelope.cases.findIndex((item) => item.id === checked.id);
    if (index === -1 && expectedRevision !== undefined) {
      throw new Error('Stale mobility case conflict: this saved case was deleted or expired. Create a new case before saving again.');
    }
    if (index === -1 && envelope.cases.length >= MAX_CASES) {
      throw new Error(`Only ${MAX_CASES} mobility cases can be saved on this device.`);
    }
    let revision = 1;
    const cases = [...envelope.cases];
    const revisions: Record<string, number> = Object.assign(Object.create(null), envelope.revisions) as Record<string, number>;
    if (index === -1) {
      cases.push(checked);
    } else {
      const storedRevision = envelope.revisions[checked.id];
      if (expectedRevision === undefined) {
        if (sameCase(checked, envelope.cases[index])) return;
        throw new Error('Stale mobility case conflict: read the latest saved case before updating it.');
      }
      if (expectedRevision !== storedRevision) {
        throw new Error('Stale mobility case conflict: another tab saved a newer revision.');
      }
      revision = storedRevision + 1;
      cases[index] = checked;
    }
    revisions[checked.id] = revision;
    writeCases(storage, { version: 1, savedAt: new Date().toISOString(), cases, revisions });
    tryAttachRevision(caseValue, revision);
    emit({ area: 'cases', operation: 'save', id: checked.id });
  } catch (cause) {
    throw storeError('Could not save mobility cases.', cause);
  }
}

/** Save a reviewed batch with one storage write, after checking every original. */
export function saveCasesAtomically(
  updates: readonly { original: MobilityCase; next: MobilityCase }[],
  expectedProfile: MobilityProfile,
): MobilityCase[] {
  if (!Array.isArray(updates) || updates.length === 0 || updates.length > MAX_CASES) {
    throw new TypeError(`Select between 1 and ${MAX_CASES} saved cases for a batch update.`);
  }
  const profile = validateProfile(expectedProfile);
  const checked = updates.map(({ original, next }) => ({ original: validateCase(original), next: validateCase(next) }));
  if (new Set(checked.map(({ original }) => original.id)).size !== checked.length) {
    throw new TypeError('Batch case ids must be unique.');
  }
  const storage = browserStorage(true) as Storage;
  try {
    // Do not prune here: a rejected batch must not perform a preliminary write.
    const casesRaw = storage.getItem(CASES_KEY);
    const profileRaw = storage.getItem(PROFILE_KEY);
    const envelope = casesRaw === null ? emptyCasesEnvelope() : decodeCases(casesRaw);
    const storedProfile = profileRaw === null ? null : decodeProfile(profileRaw).profile;
    if (!storedProfile || expired(storedProfile.updatedAt) || JSON.stringify(profile) !== JSON.stringify(storedProfile)) {
      throw new Error('Stale profile conflict: reusable details changed, expired or were deleted. Refresh the correction preview.');
    }
    const cases = [...envelope.cases];
    const revisions: Record<string, number> = Object.assign(Object.create(null), envelope.revisions) as Record<string, number>;
    for (const { original, next } of checked) {
      const index = cases.findIndex(item => item.id === original.id);
      if (index === -1 || expired(cases[index].updatedAt)) {
        throw new Error('Stale mobility case conflict: a selected case was deleted or expired. Refresh the correction preview.');
      }
      if (currentRevision(original) === undefined || currentRevision(original) !== revisions[original.id] || !sameCase(original, cases[index])) {
        throw new Error('Stale mobility case conflict: a selected case changed. Refresh the correction preview.');
      }
      if (next.id !== original.id || next.createdAt !== original.createdAt || next.service !== original.service || Date.parse(next.updatedAt) < Date.parse(original.updatedAt)) {
        throw new TypeError('A batch update must preserve the saved case identity and revision order.');
      }
      if (!Number.isSafeInteger(revisions[original.id] + 1)) throw new Error('The saved case revision limit has been reached.');
      cases[index] = next;
      revisions[original.id] += 1;
    }
    if (storage.getItem(CASES_KEY) !== casesRaw || storage.getItem(PROFILE_KEY) !== profileRaw) {
      throw new Error('Stale mobility case or profile conflict: saved data changed. Refresh the correction preview.');
    }
    writeCases(storage, { version: 1, savedAt: new Date().toISOString(), cases, revisions });
    const result = checked.map(({ next }) => attachRevision(next, revisions[next.id]));
    emit({ area: 'cases', operation: 'save' });
    return result;
  } catch (cause) {
    throw storeError('Could not save the mobility correction batch.', cause);
  }
}

export function deleteCase(id: string): void {
  const storage = browserStorage(true) as Storage;
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(id)) throw new TypeError('Case id is invalid.');
  try {
    const envelope = pruneExpiredCases(storage, loadCases(storage));
    const cases = envelope.cases.filter((caseValue) => caseValue.id !== id);
    if (cases.length === envelope.cases.length) return;
    if (cases.length === 0) {
      removeCaseKey(storage);
    } else {
      const revisions: Record<string, number> = Object.create(null) as Record<string, number>;
      for (const caseValue of cases) revisions[caseValue.id] = envelope.revisions[caseValue.id];
      writeCases(storage, { version: 1, savedAt: new Date().toISOString(), cases, revisions });
    }
    emit({ area: 'cases', operation: 'delete', id });
  } catch (cause) {
    throw storeError('Could not delete the mobility case.', cause);
  }
}

export function readProfile(): MobilityProfile | null {
  const storage = browserStorage(false);
  if (!storage) return null;
  try {
    const raw = storage.getItem(PROFILE_KEY);
    if (raw === null) return null;
    const envelope = decodeProfile(raw);
    if (!expired(envelope.profile.updatedAt)) return envelope.profile;
    storage.removeItem(PROFILE_KEY);
    emit({ area: 'profile', operation: 'expire' });
    return null;
  } catch (cause) {
    throw storeError('Could not read stored mobility profile.', cause);
  }
}

export function saveProfile(profile: MobilityProfile): void {
  const storage = browserStorage(true) as Storage;
  const checked = validateProfile(profile);
  try {
    const envelope: ProfileEnvelope = { version: 1, savedAt: new Date().toISOString(), profile: checked };
    storage.setItem(PROFILE_KEY, JSON.stringify(envelope));
    emit({ area: 'profile', operation: 'save' });
  } catch (cause) {
    throw storeError('Could not save mobility profile.', cause);
  }
}

export function deleteAllMobilityData(): void {
  const storage = browserStorage(true) as Storage;
  try {
    storage.removeItem(CASES_KEY);
    storage.removeItem(PROFILE_KEY);
    emit({ area: 'all', operation: 'delete' });
  } catch (cause) {
    throw storeError('Could not delete mobility data.', cause);
  }
}
