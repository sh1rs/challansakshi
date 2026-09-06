import { validateCase, type MobilityCase } from './cases';
import { readCases } from './store';
import { validateFollowUp, validateFollowUpTimestamp, type FollowUpRecord } from './follow-up';

export const FOLLOW_UP_STORE_EVENT = 'challansakshi:mobility-follow-up-change';
const KEY = 'challansakshi-mobility-follow-ups-v1';
const CASE_REVISION = Symbol.for('challansakshi.mobility.case-revision');
const EXPIRY_MS = 90 * 86_400_000;
const MAX_RECORDS = 50;
const MAX_BYTES = 2 * 1024 * 1024;
const relays = new WeakSet<object>();
type Envelope = { version: 1; savedAt: string; records: FollowUpRecord[] };

function notify(): void { if (typeof window !== 'undefined') window.dispatchEvent(new Event(FOLLOW_UP_STORE_EVENT)); }
function storage(required: boolean): Storage | null {
  if (typeof window === 'undefined') { if (required) throw new Error('Browser storage is unavailable.'); return null; }
  if (!relays.has(window)) {
    window.addEventListener('storage', event => { if (event.key === null || event.key === KEY) notify(); }); relays.add(window);
  }
  try { return window.localStorage; } catch { throw new Error('Private-device follow-up storage is unavailable.'); }
}
function decode(raw: string | null): Envelope {
  if (raw === null) return { version: 1, savedAt: new Date().toISOString(), records: [] };
  if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Saved follow-up data exceeds its size limit.');
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'records,savedAt,version' || value.version !== 1 || !Array.isArray(value.records) || value.records.length > MAX_RECORDS) throw new Error(`Invalid follow-up store; keep at most ${MAX_RECORDS} records.`);
  const records = value.records.map(validateFollowUp);
  if (records.some(item => item.revision < 1) || new Set(records.map(item => item.caseId)).size !== records.length) throw new Error('Saved follow-up records must have unique cases and positive revisions.');
  return { version: 1, savedAt: validateFollowUpTimestamp(value.savedAt), records };
}
function write(target: Storage, records: FollowUpRecord[]): void {
  if (records.length > MAX_RECORDS) throw new Error(`Keep at most ${MAX_RECORDS} saved follow-up records.`);
  const raw = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), records });
  if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Follow-up storage size limit reached.');
  target.setItem(KEY, raw);
}
function expired(record: FollowUpRecord): boolean { return Date.now() - Date.parse(record.updatedAt) >= EXPIRY_MS; }
function failure(message: string, cause: unknown): Error { return new Error(`${message} ${cause instanceof Error ? cause.message : ''}`, { cause }); }
function revision(value: MobilityCase): unknown { return Object.getOwnPropertyDescriptor(value, CASE_REVISION)?.value; }

/** The caller must retain a snapshot read from readCases(), including its revision. */
export function assertExactSavedFollowUpCase(value: MobilityCase): MobilityCase {
  const original = validateCase(value);
  const saved = readCases().find(item => item.id === original.id);
  if (!saved) throw new Error('This saved case was deleted or expired. Follow-up changes were not saved.');
  if (!Number.isSafeInteger(revision(original)) || revision(original) !== revision(saved) || JSON.stringify(original) !== JSON.stringify(saved)) throw new Error('Stale case: the saved case changed or contains unsaved edits. Reload the saved case before updating follow-up.');
  return saved;
}

export function readFollowUps(savedCases: readonly MobilityCase[] = readCases()): FollowUpRecord[] {
  const target = storage(false); if (!target) return [];
  try {
    const ids = new Set(savedCases.map(item => validateCase(item).id));
    const envelope = decode(target.getItem(KEY));
    const records = envelope.records.filter(item => ids.has(item.caseId) && !expired(item));
    if (records.length !== envelope.records.length) {
      if (records.length === 0) target.removeItem(KEY); else write(target, records);
      notify();
    }
    return records;
  } catch (cause) { throw failure('Could not read saved follow-ups.', cause); }
}

/** Call after the main case store was successfully read or changed. */
export function reconcileFollowUps(savedCases: readonly MobilityCase[]): FollowUpRecord[] { return readFollowUps(savedCases); }

export function saveFollowUp(value: FollowUpRecord, expectedCase: MobilityCase, options: { consent: boolean }): FollowUpRecord {
  if (options?.consent !== true) throw new Error('Explicit private-device save consent is required.');
  const checked = validateFollowUp(value);
  if (checked.caseId !== expectedCase.id) throw new Error('The follow-up must match the saved case.');
  if (Date.parse(checked.updatedAt) > Date.now()) throw new Error('Follow-up save time cannot be in the future.');
  const target = storage(true)!;
  try {
    assertExactSavedFollowUpCase(expectedCase);
    const raw = target.getItem(KEY); const envelope = decode(raw);
    const index = envelope.records.findIndex(item => item.caseId === checked.caseId);
    if (index < 0 && checked.revision !== 0) throw new Error('Stale follow-up: this record was deleted. Refresh before saving.');
    if (index >= 0) {
      const original = envelope.records[index];
      if (expired(original) || checked.revision !== original.revision) throw new Error('Stale follow-up: another tab changed or expired this record. Refresh before saving.');
      if (checked.createdAt !== original.createdAt || checked.updatedAt < original.updatedAt || JSON.stringify(checked.observations.slice(0, original.observations.length)) !== JSON.stringify(original.observations) || JSON.stringify(checked.failedChecks.slice(0, original.failedChecks.length)) !== JSON.stringify(original.failedChecks)) throw new Error('Earlier follow-up history cannot be silently replaced.');
      if (JSON.stringify(checked) === JSON.stringify(original)) return original;
    } else if (envelope.records.length >= MAX_RECORDS) throw new Error(`Keep at most ${MAX_RECORDS} saved follow-up records.`);
    if (!Number.isSafeInteger(checked.revision + 1)) throw new Error('Follow-up revision limit reached.');
    const saved = validateFollowUp({ ...checked, revision: checked.revision + 1 });
    const records = [...envelope.records]; if (index < 0) records.push(saved); else records[index] = saved;
    assertExactSavedFollowUpCase(expectedCase);
    if (target.getItem(KEY) !== raw) throw new Error('Stale follow-up: saved data changed. Refresh before saving.');
    write(target, records); notify(); return saved;
  } catch (cause) { throw failure('Could not save follow-up.', cause); }
}

export function deleteFollowUp(caseId: string): void {
  if (typeof caseId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(caseId)) throw new TypeError('Case id is invalid.');
  const target = storage(true)!;
  try {
    const envelope = decode(target.getItem(KEY)); const records = envelope.records.filter(item => item.caseId !== caseId);
    if (records.length === envelope.records.length) return;
    if (records.length === 0) target.removeItem(KEY); else write(target, records); notify();
  } catch (cause) { throw failure('Could not delete follow-up.', cause); }
}
export function deleteAllFollowUps(): void {
  const target = storage(true)!;
  try { target.removeItem(KEY); notify(); } catch (cause) { throw failure('Could not clear saved follow-ups.', cause); }
}
