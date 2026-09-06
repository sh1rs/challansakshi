import { validateCase, type MobilityCase } from './cases';
import { journeyTimestamp, JOURNEY_RETENTION_MS, MAX_JOURNEYS, validateJourney, type JourneyPlan } from './journeys';
import { readCases } from './store';

export const JOURNEY_STORE_EVENT = 'challansakshi:mobility-journey-change';
const KEY = 'challansakshi-mobility-journeys-v1';
const LOCK = 'challansakshi-mobility-journeys';
const MAX_BYTES = 32 * 1024;
const CASE_REVISION = Symbol.for('challansakshi.mobility.case-revision');
const relays = new WeakSet<object>();
type Envelope = { version: 1; plans: JourneyPlan[] };
export class JourneyStoreError extends Error {
  constructor(public readonly code: 'consent' | 'conflict' | 'unavailable' | 'malformed' | 'limit' | 'case-changed', message: string) { super(message); this.name = 'JourneyStoreError'; }
}
function emit(): void { window.dispatchEvent(new Event(JOURNEY_STORE_EVENT)); }
function storage(): Storage {
  try {
    if (typeof window === 'undefined') throw new Error();
    if (!relays.has(window)) {
      window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) emit(); });
      relays.add(window);
    }
    return window.localStorage;
  } catch { throw new JourneyStoreError('unavailable', 'Private-device plan storage is unavailable.'); }
}
async function locked<T>(work: (target: Storage) => T, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const target = storage();
  if (!window.navigator?.locks?.request) throw new JourneyStoreError('unavailable', 'This browser cannot save linked plans. Your existing cases remain available.');
  return window.navigator.locks.request(LOCK, { signal }, () => {
    signal?.throwIfAborted();
    try { return work(target); }
    catch (cause) { if (cause instanceof JourneyStoreError) throw cause; throw new JourneyStoreError('unavailable', 'The local plan action could not be completed.'); }
  });
}
function decode(raw: string | null): Envelope {
  if (raw === null) return { version: 1, plans: [] };
  try {
    if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error();
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'plans,version' || value.version !== 1 || !Array.isArray(value.plans) || value.plans.length > MAX_JOURNEYS) throw new Error();
    const plans = value.plans.map(validateJourney);
    if (plans.some(item => item.revision < 1 || Date.parse(item.updatedAt) > Date.now()) || new Set(plans.map(item => item.id)).size !== plans.length) throw new Error();
    return { version: 1, plans };
  } catch { throw new JourneyStoreError('malformed', 'Saved plans are malformed or exceed their storage limit. Clear only plans to recover.'); }
}
function write(target: Storage, raw: string | null, plans: JourneyPlan[]): void {
  if (target.getItem(KEY) !== raw) throw new JourneyStoreError('conflict', 'Plans changed before this write. Reload the saved plans.');
  if (!plans.length) target.removeItem(KEY);
  else {
    const encoded = JSON.stringify({ version: 1, plans });
    if (plans.length > MAX_JOURNEYS || new TextEncoder().encode(encoded).length > MAX_BYTES) throw new JourneyStoreError('limit', `Keep at most ${MAX_JOURNEYS} plans within the storage limit.`);
    target.setItem(KEY, encoded);
  }
  emit();
}
function active(plan: JourneyPlan): boolean { return Date.now() - Date.parse(plan.updatedAt) < JOURNEY_RETENTION_MS; }
function increment(plan: JourneyPlan): number {
  if (!Number.isSafeInteger(plan.revision + 1)) throw new JourneyStoreError('limit', 'The plan revision limit has been reached.');
  return plan.revision + 1;
}
function exactPlan(stored: JourneyPlan | undefined, original: JourneyPlan | null): void {
  if (!stored && original) throw new JourneyStoreError('conflict', 'This plan was deleted or expired. Start a new plan.');
  if (stored && (!original || !active(stored) || JSON.stringify(stored) !== JSON.stringify(validateJourney(original)))) throw new JourneyStoreError('conflict', 'This plan changed or expired. Reload before saving.');
}
function revision(value: MobilityCase): unknown { return Object.getOwnPropertyDescriptor(value, CASE_REVISION)?.value; }
function exactCases(ids: readonly string[], reviewed: readonly MobilityCase[]): void {
  const current = readCases();
  if (ids.length !== reviewed.length || new Set(reviewed.map(item => item.id)).size !== reviewed.length || reviewed.some(item => !ids.includes(item.id))) throw new JourneyStoreError('case-changed', 'Review exactly the selected saved cases.');
  for (const expected of reviewed) {
    const checked = validateCase(expected); const saved = current.find(item => item.id === checked.id);
    if (!saved || !Number.isSafeInteger(revision(expected)) || revision(expected) !== revision(saved) || JSON.stringify(checked) !== JSON.stringify(saved)) throw new JourneyStoreError('case-changed', 'A reviewed case changed, expired or was deleted. Review the current cases again.');
  }
}

/** Serialized cleanup changes links/revision only; it never renews retention. */
export async function reconcileJourneys(): Promise<JourneyPlan[]> {
  if (typeof window === 'undefined') return [];
  if (storage().getItem(KEY) === null) return [];
  return locked(target => {
    const raw = target.getItem(KEY); const envelope = decode(raw);
    const ids = new Set(readCases().map(item => item.id));
    const plans = envelope.plans.filter(active).map(plan => {
      const caseIds = plan.caseIds.filter(id => ids.has(id));
      return caseIds.length === plan.caseIds.length ? plan : { ...plan, caseIds, revision: increment(plan) };
    });
    if (JSON.stringify(plans) !== JSON.stringify(envelope.plans)) write(target, raw, plans);
    return plans;
  });
}
export const readJourneys = reconcileJourneys;

export async function saveJourney(value: JourneyPlan, options: { original: JourneyPlan | null; cases: readonly MobilityCase[]; consent: boolean; signal?: AbortSignal }): Promise<JourneyPlan> {
  if (options?.consent !== true) throw new JourneyStoreError('consent', 'Explicit private-device save consent is required.');
  const checked = validateJourney(value);
  const original = options.original ? validateJourney(options.original) : null;
  const reviewedCases = options.cases.map(validateCase);
  return locked(target => {
    const raw = target.getItem(KEY); const envelope = decode(raw);
    const stored = envelope.plans.find(item => item.id === checked.id);
    exactPlan(stored, original);
    if (checked.revision !== (stored?.revision ?? 0) || original && original.id !== checked.id) throw new JourneyStoreError('conflict', 'Plan identity or revision changed.');
    if (!stored && (!checked.caseIds.length || checked.revision !== 0)) throw new JourneyStoreError('case-changed', 'Link at least one saved case to create a new plan.');
    if (stored && (checked.createdAt !== stored.createdAt || checked.eventId !== stored.eventId)) throw new JourneyStoreError('conflict', 'An existing plan must keep its identity and life event.');
    if (Date.parse(checked.createdAt) > Date.now() || Date.parse(checked.updatedAt) > Date.now()) throw new JourneyStoreError('malformed', 'Plan save time cannot be in the future.');
    exactCases(checked.caseIds, reviewedCases);
    if (stored && JSON.stringify(checked.caseIds) === JSON.stringify(stored.caseIds)) return stored;
    const plans = envelope.plans.filter(active);
    if (!stored && plans.length >= MAX_JOURNEYS) throw new JourneyStoreError('limit', `Keep at most ${MAX_JOURNEYS} saved plans.`);
    const saved = validateJourney({ ...checked, updatedAt: journeyTimestamp(new Date().toISOString()), revision: increment(checked) });
    const index = plans.findIndex(item => item.id === checked.id);
    if (index < 0) plans.push(saved); else plans[index] = saved;
    exactCases(checked.caseIds, reviewedCases);
    write(target, raw, plans);
    return saved;
  }, options.signal);
}
export async function deleteJourney(original: JourneyPlan, signal?: AbortSignal): Promise<void> {
  const checked = validateJourney(original);
  return locked(target => {
    const raw = target.getItem(KEY); const envelope = decode(raw);
    exactPlan(envelope.plans.find(item => item.id === checked.id), checked);
    write(target, raw, envelope.plans.filter(item => item.id !== checked.id));
  }, signal);
}
/** Explicitly removes plan metadata only, including unreadable data. */
export async function deleteAllJourneys(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const target = storage();
  // An unsupported browser cannot queue a plan write. Explicit deletion still works.
  if (!window.navigator?.locks?.request) { signal?.throwIfAborted(); target.removeItem(KEY); emit(); return; }
  return locked(target => { target.removeItem(KEY); emit(); }, signal);
}
