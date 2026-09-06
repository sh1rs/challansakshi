import { RENEWAL_RETENTION_DAYS, renewalLocalDate, validateRenewal, validateRenewalTimestamp, type RenewalRecord } from './renewals';

export const RENEWAL_STORE_EVENT = 'challansakshi:mobility-renewal-change';
export const RENEWAL_STORE_KEY = 'challansakshi-mobility-renewals-v1';
export const MAX_RENEWALS = 50;
const LOCK = 'challansakshi:mobility-renewals';
const MAX_BYTES = 150_000;
const RETENTION_MS = RENEWAL_RETENTION_DAYS * 86_400_000;
const CLOCK_SKEW_MS = 5 * 60_000;
type Envelope = { version: 1; savedAt: string; records: RenewalRecord[] };
type Change = { operation: 'save' | 'delete' | 'clear' | 'expire' | 'external'; id?: string };
const relays = new WeakSet<object>();
function notify(detail: Change) {
  if (typeof window === 'undefined') return;
  const event = new Event(RENEWAL_STORE_EVENT); Object.defineProperty(event, 'detail', { value: detail }); window.dispatchEvent(event);
}
function storage(required: boolean): Storage | null {
  if (typeof window === 'undefined') { if (required) throw new Error('Browser storage is unavailable.'); return null; }
  if (!relays.has(window)) {
    window.addEventListener('storage', event => { if (event.key === null || event.key === RENEWAL_STORE_KEY) notify({ operation: event.key === null || event.newValue === null ? 'clear' : 'external' }); }); relays.add(window);
  }
  try { return window.localStorage; } catch { throw new Error('Private-device document reminder storage is unavailable.'); }
}
function decode(raw: string | null): Envelope {
  if (raw === null) return { version: 1, savedAt: new Date().toISOString(), records: [] };
  if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Document reminder storage exceeds its size limit.');
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'records,savedAt,version' || value.version !== 1 || !Array.isArray(value.records) || value.records.length > MAX_RENEWALS) throw new Error('Invalid document reminder storage.');
  const records = value.records.map(validateRenewal);
  if (records.some(item => item.revision < 1) || new Set(records.map(item => item.id)).size !== records.length) throw new Error('Saved document reminders need unique IDs and positive revisions.');
  const savedAt = validateRenewalTimestamp(value.savedAt);
  if (Date.parse(savedAt) > Date.now() + CLOCK_SKEW_MS || records.some(item => !validTemporal(item))) throw new Error('Saved document reminder has a future save or source-check date.');
  return { version: 1, savedAt, records };
}
function expired(record: RenewalRecord) { return Date.now() - Date.parse(record.updatedAt) >= RETENTION_MS; }
function validTemporal(record: RenewalRecord) { return Date.parse(record.updatedAt) <= Date.now() + CLOCK_SKEW_MS && record.checkedOn <= renewalLocalDate(); }
function write(target: Storage, records: RenewalRecord[]) {
  if (!records.length) { target.removeItem(RENEWAL_STORE_KEY); return; }
  if (records.length > MAX_RENEWALS) throw new Error(`Keep at most ${MAX_RENEWALS} document reminders.`);
  const raw = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), records });
  if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Document reminder storage size limit reached.');
  target.setItem(RENEWAL_STORE_KEY, raw);
}
function fail(action: string, cause: unknown): Error { return new Error(`${action} ${cause instanceof Error ? cause.message : ''}`, { cause }); }
async function locked<T>(operation: () => T | Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  if (typeof navigator === 'undefined' || !navigator.locks?.request) return Promise.reject(new Error('This browser cannot safely update shared document reminders. Use a browser with Web Locks support.'));
  return await navigator.locks.request(LOCK, { mode: 'exclusive', ...(signal ? { signal } : {}) }, () => { signal?.throwIfAborted(); return operation(); });
}
function same(left: RenewalRecord, right: RenewalRecord) { return JSON.stringify(left) === JSON.stringify(right); }

/** Fresh reads need no lock. Expiry writes re-read and validate under the shared feature lock. */
export async function readRenewals(): Promise<RenewalRecord[]> {
  const target = storage(false); if (!target) return [];
  try {
    const initial = decode(target.getItem(RENEWAL_STORE_KEY));
    if (!initial.records.some(expired)) return initial.records;
    return await locked(() => {
      const envelope = decode(target.getItem(RENEWAL_STORE_KEY)), records = envelope.records.filter(item => !expired(item));
      if (records.length !== envelope.records.length) { write(target, records); notify({ operation: 'expire' }); }
      return records;
    });
  } catch (cause) { throw fail('Could not read document reminders.', cause); }
}
export async function assertCurrentRenewal(expected: RenewalRecord): Promise<RenewalRecord> {
  const checked = validateRenewal(expected), current = (await readRenewals()).find(item => item.id === checked.id);
  if (!current) throw new Error('This document reminder was deleted or expired. Reopen the organiser.');
  if (!same(current, checked)) throw new Error('This document reminder changed. Reload its saved version.');
  return current;
}
/** Existing edits must supply the full saved source, not just its revision. */
export async function saveRenewal(value: RenewalRecord, options: { consent: boolean; expected?: RenewalRecord; signal?: AbortSignal }): Promise<RenewalRecord> {
  if (options?.consent !== true) throw new Error('Explicit private-device save consent is required.');
  const checked = validateRenewal(value), expected = options.expected ? validateRenewal(options.expected) : null, target = storage(true)!;
  try {
    return await locked(() => {
      if (!validTemporal(checked) || expired(checked)) throw new Error('Use a current save time and a source-check date that is not in the future.');
      const envelope = decode(target.getItem(RENEWAL_STORE_KEY)), original = envelope.records.find(item => item.id === checked.id);
      if (!original && (checked.revision !== 0 || expected) || original && (!expected || !same(original, expected) || expected.id !== checked.id || expired(original) || original.revision !== checked.revision || checked.createdAt !== original.createdAt || checked.updatedAt < original.updatedAt)) throw new Error('Stale document reminder: changed, deleted or expired. Reload before saving.');
      if (!Number.isSafeInteger(checked.revision + 1)) throw new Error('Document reminder revision limit reached.');
      const saved = validateRenewal({ ...checked, revision: checked.revision + 1 });
      const records = envelope.records.filter(item => item.id !== checked.id && !expired(item)); records.push(saved);
      write(target, records); notify({ operation: 'save', id: saved.id }); return saved;
    }, options.signal);
  } catch (cause) { throw fail('Could not save document reminder.', cause); }
}
export async function deleteRenewal(expected: RenewalRecord, signal?: AbortSignal): Promise<void> {
  const checked = validateRenewal(expected), target = storage(true)!;
  if (checked.revision < 1) throw new TypeError('Use the saved revision before deleting.');
  try {
    await locked(() => {
      const envelope = decode(target.getItem(RENEWAL_STORE_KEY)), original = envelope.records.find(item => item.id === checked.id);
      if (!original || !same(original, checked) || expired(original)) throw new Error('This document reminder changed, expired or was deleted. Reload before deleting.');
      write(target, envelope.records.filter(item => item.id !== checked.id)); notify({ operation: 'delete', id: checked.id });
    }, signal);
  } catch (cause) { throw fail('Could not delete document reminder.', cause); }
}
/** Explicit privacy erasure remains available even when safe writes are unsupported. */
export async function deleteAllRenewals(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const target = storage(true)!;
  try {
    if (typeof navigator === 'undefined' || !navigator.locks?.request) { signal?.throwIfAborted(); target.removeItem(RENEWAL_STORE_KEY); notify({ operation: 'clear' }); return; }
    await locked(() => { target.removeItem(RENEWAL_STORE_KEY); notify({ operation: 'clear' }); }, signal);
  } catch (cause) { throw fail('Could not clear document reminders.', cause); }
}
