export const EXTENSION_SAFETY_LEDGER_KEY = 'challansakshi.safety-ledger.v1' as const;
export const SAFETY_LEDGER_SCHEMA = 'challansakshi.safety-ledger/v1' as const;
export const DEVICE_OWNER_RESET_ATTESTATION_SCHEMA = 'challansakshi.device-owner-reset-attestation/v1' as const;
export const SAFETY_LEDGER_CAPACITY = 32;
export const NEEDS_REVIEW_WARNING_LIFETIME_MS = 86_400_000;

export type ReplayOutcomeV1 =
  | 'complete'
  | 'inspected'
  | 'closed-unresolved'
  | 'cancelled-before-dispatch';

export type ReplaySafetyRecordV1 = Readonly<{
  state: 'replay';
  packId: string;
  replayUntil: number;
  outcome: ReplayOutcomeV1;
}>;

export type NeedsReviewSafetyRecordV1 = Readonly<{
  state: 'needs-review';
  packId: string;
  replayUntil: number;
  warningExpiresAt: number;
}>;

export type UnresolvedLiveSafetyRecordV1 = Readonly<{
  state: 'unresolved-live';
  armNonce: string;
  packId: string;
  replayUntil: number;
}>;

export type UnresolvedOrphanedSafetyRecordV1 = Readonly<{
  state: 'unresolved-orphaned';
  packId: string;
  replayUntil: number;
}>;

export type SafetyRecordV1 =
  | UnresolvedLiveSafetyRecordV1
  | UnresolvedOrphanedSafetyRecordV1
  | NeedsReviewSafetyRecordV1
  | ReplaySafetyRecordV1;

export type SafetyLedgerV1 = Readonly<{
  schema: typeof SAFETY_LEDGER_SCHEMA;
  records: readonly SafetyRecordV1[];
}>;

export type SettlementIntentV1 =
  | Readonly<{
    cause: 'injection-result';
    terminal: NeedsReviewSafetyRecordV1 | (ReplaySafetyRecordV1 & Readonly<{ outcome: 'complete' }>);
  }>
  | Readonly<{
    cause: 'cancelled-before-dispatch';
    terminal: ReplaySafetyRecordV1 & Readonly<{ outcome: 'cancelled-before-dispatch' }>;
  }>
  | Readonly<{
    cause: 'destination-tab-removed';
    terminal: ReplaySafetyRecordV1 & Readonly<{ outcome: 'closed-unresolved' }>;
  }>;

export type DeviceOwnerResetAttestationV1 = Readonly<{
  schema: typeof DEVICE_OWNER_RESET_ATTESTATION_SCHEMA;
  type: 'reset-for-device-owner';
  allRelevantOfficialTabsAndBrowserProcessesClosed: true;
}>;

export type SafetyLedgerIoReason =
  | 'access-level-failed'
  | 'storage-read-failed'
  | 'storage-write-failed'
  | 'storage-readback-failed'
  | 'readback-invalid'
  | 'readback-mismatch';

export type SafetyLedgerReady = Readonly<{ status: 'ready'; ledger: SafetyLedgerV1 }>;
export type SafetyLedgerQuarantined = Readonly<{ status: 'quarantined' }>;
export type SafetyLedgerUnavailable = Readonly<{
  status: 'unavailable';
  reason: SafetyLedgerIoReason;
}>;
export type SafetyLedgerReadResult = SafetyLedgerReady | SafetyLedgerQuarantined | SafetyLedgerUnavailable;

export type SafetyLedgerBlockedReason =
  | 'global-blocker'
  | 'same-pack-replay'
  | 'capacity-reached'
  | 'invalid-input'
  | 'acknowledgement-not-available'
  | 'reset-not-allowed';

export type SafetyLedgerConfirmed = Readonly<{ status: 'confirmed'; ledger: SafetyLedgerV1 }>;
export type SafetyLedgerBlocked = Readonly<{
  status: 'blocked';
  reason: SafetyLedgerBlockedReason;
}>;
export type SafetyLedgerMutationResult =
  | SafetyLedgerConfirmed
  | SafetyLedgerBlocked
  | SafetyLedgerQuarantined
  | SafetyLedgerUnavailable;

export type SafetyLedgerLoadDecision =
  | Readonly<{ status: 'ready' }>
  | SafetyLedgerBlocked
  | SafetyLedgerQuarantined
  | SafetyLedgerUnavailable;

export type SafetyLedgerCleanupDecision =
  | Readonly<{ status: 'ready'; nextCleanupAt: number | null }>
  | SafetyLedgerQuarantined
  | SafetyLedgerUnavailable;

type DataRead = Readonly<{ ok: true; fields: Readonly<Record<string, unknown>> }> | Readonly<{ ok: false }>;

const LEDGER_KEYS = Object.freeze(['schema', 'records'] as const);
const LIVE_KEYS = Object.freeze(['state', 'armNonce', 'packId', 'replayUntil'] as const);
const ORPHAN_KEYS = Object.freeze(['state', 'packId', 'replayUntil'] as const);
const WARNING_KEYS = Object.freeze(['state', 'packId', 'replayUntil', 'warningExpiresAt'] as const);
const REPLAY_KEYS = Object.freeze(['state', 'packId', 'replayUntil', 'outcome'] as const);
const INTENT_KEYS = Object.freeze(['cause', 'terminal'] as const);
const ACKNOWLEDGEMENT_KEYS = Object.freeze(['packId', 'replayUntil', 'warningExpiresAt'] as const);
const RESET_KEYS = Object.freeze([
  'schema', 'type', 'allRelevantOfficialTabsAndBrowserProcessesClosed',
] as const);
const READY_KEYS = Object.freeze(['status', 'ledger'] as const);
const UNAVAILABLE_KEYS = Object.freeze(['status', 'reason'] as const);
const OPAQUE_PATTERN = /^[0-9a-f]{32}$/;
const REPLAY_OUTCOMES: ReadonlySet<string> = new Set([
  'complete', 'inspected', 'closed-unresolved', 'cancelled-before-dispatch',
]);
const IO_REASONS: ReadonlySet<string> = new Set([
  'access-level-failed', 'storage-read-failed', 'storage-write-failed',
  'storage-readback-failed', 'readback-invalid', 'readback-mismatch',
]);

const quarantined = Object.freeze({ status: 'quarantined' } as const);

function readData(candidate: unknown, keys: readonly string[]): DataRead {
  try {
    if (
      typeof candidate !== 'object'
      || candidate === null
      || Array.isArray(candidate)
      || Object.getPrototypeOf(candidate) !== Object.prototype
    ) return { ok: false };
    const ownKeys = Reflect.ownKeys(candidate);
    if (
      ownKeys.length !== keys.length
      || ownKeys.some((key, index) => key !== keys[index])
    ) return { ok: false };
    const fields: Record<string, unknown> = {};
    for (const key of keys) {
      const slot = Object.getOwnPropertyDescriptor(candidate, key);
      if (!slot || !slot.enumerable || !('value' in slot)) return { ok: false };
      fields[key] = slot.value;
    }
    return { ok: true, fields: Object.freeze(fields) };
  } catch {
    return { ok: false };
  }
}

function isDenseArray(candidate: unknown): candidate is readonly unknown[] {
  try {
    if (!Array.isArray(candidate) || Object.getPrototypeOf(candidate) !== Array.prototype) return false;
    const lengthSlot = Object.getOwnPropertyDescriptor(candidate, 'length');
    if (
      !lengthSlot
      || lengthSlot.enumerable
      || !('value' in lengthSlot)
      || !Number.isSafeInteger(lengthSlot.value)
      || lengthSlot.value < 0
      || lengthSlot.value > SAFETY_LEDGER_CAPACITY
    ) return false;
    const expected = [
      ...Array.from({ length: lengthSlot.value as number }, (_, index) => String(index)),
      'length',
    ];
    const ownKeys = Reflect.ownKeys(candidate);
    if (ownKeys.length !== expected.length || !ownKeys.every((key, index) => key === expected[index])) {
      return false;
    }
    return expected.slice(0, -1).every((key) => {
      const slot = Object.getOwnPropertyDescriptor(candidate, key);
      return Boolean(slot && slot.enumerable && 'value' in slot);
    });
  } catch {
    return false;
  }
}

function isOpaque(candidate: unknown): candidate is string {
  return typeof candidate === 'string' && OPAQUE_PATTERN.test(candidate);
}

function isPositiveTime(candidate: unknown): candidate is number {
  return Number.isSafeInteger(candidate) && (candidate as number) > 0;
}

function readSafetyRecord(candidate: unknown): SafetyRecordV1 | null {
  try {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return null;
    const stateSlot = Object.getOwnPropertyDescriptor(candidate, 'state');
    if (!stateSlot || !stateSlot.enumerable || !('value' in stateSlot) || typeof stateSlot.value !== 'string') {
      return null;
    }
    const keys = stateSlot.value === 'unresolved-live'
      ? LIVE_KEYS
      : stateSlot.value === 'unresolved-orphaned'
        ? ORPHAN_KEYS
        : stateSlot.value === 'needs-review'
          ? WARNING_KEYS
          : stateSlot.value === 'replay'
            ? REPLAY_KEYS
            : null;
    if (!keys) return null;
    const read = readData(candidate, keys);
    if (!read.ok) return null;
    const fields = read.fields;
    if (!isOpaque(fields.packId) || !isPositiveTime(fields.replayUntil)) return null;
    if (fields.state === 'unresolved-live') {
      if (!isOpaque(fields.armNonce)) return null;
      return Object.freeze({
        state: 'unresolved-live',
        armNonce: fields.armNonce,
        packId: fields.packId,
        replayUntil: fields.replayUntil,
      });
    }
    if (fields.state === 'unresolved-orphaned') {
      return Object.freeze({
        state: 'unresolved-orphaned',
        packId: fields.packId,
        replayUntil: fields.replayUntil,
      });
    }
    if (fields.state === 'needs-review') {
      if (!isPositiveTime(fields.warningExpiresAt) || fields.warningExpiresAt <= fields.replayUntil) return null;
      return Object.freeze({
        state: 'needs-review',
        packId: fields.packId,
        replayUntil: fields.replayUntil,
        warningExpiresAt: fields.warningExpiresAt,
      });
    }
    if (
      fields.state !== 'replay'
      || typeof fields.outcome !== 'string'
      || !REPLAY_OUTCOMES.has(fields.outcome)
    ) return null;
    return Object.freeze({
      state: 'replay',
      packId: fields.packId,
      replayUntil: fields.replayUntil,
      outcome: fields.outcome as ReplayOutcomeV1,
    });
  } catch {
    return null;
  }
}

function isBlocker(record: SafetyRecordV1): boolean {
  return record.state === 'unresolved-live'
    || record.state === 'unresolved-orphaned'
    || record.state === 'needs-review';
}

export function validateSafetyLedger(candidate: unknown): SafetyLedgerReadResult {
  const read = readData(candidate, LEDGER_KEYS);
  if (!read.ok || read.fields.schema !== SAFETY_LEDGER_SCHEMA || !isDenseArray(read.fields.records)) {
    return quarantined;
  }
  const records: SafetyRecordV1[] = [];
  for (const entry of read.fields.records) {
    const record = readSafetyRecord(entry);
    if (!record) return quarantined;
    records.push(record);
  }
  if (records.length > SAFETY_LEDGER_CAPACITY) return quarantined;
  if (records.filter(isBlocker).length > 1) return quarantined;
  for (let index = 1; index < records.length; index += 1) {
    if (records[index - 1].packId >= records[index].packId) return quarantined;
  }
  const ledger = Object.freeze({
    schema: SAFETY_LEDGER_SCHEMA,
    records: Object.freeze(records),
  });
  return Object.freeze({ status: 'ready', ledger });
}

function emptySafetyLedger(): SafetyLedgerV1 {
  return Object.freeze({ schema: SAFETY_LEDGER_SCHEMA, records: Object.freeze([]) });
}

function unavailable(reason: SafetyLedgerIoReason): SafetyLedgerUnavailable {
  return Object.freeze({ status: 'unavailable', reason });
}

function blocked(reason: SafetyLedgerBlockedReason): SafetyLedgerBlocked {
  return Object.freeze({ status: 'blocked', reason });
}

let trustedAccess: Promise<boolean> | null = null;

async function ensureTrustedAccess(): Promise<boolean> {
  if (trustedAccess === null) {
    trustedAccess = (async () => {
      try {
        await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
        return true;
      } catch {
        return false;
      }
    })();
  }
  const granted = await trustedAccess;
  if (!granted) trustedAccess = null;
  return granted;
}

function readStoredContainer(candidate: unknown): SafetyLedgerReadResult | null {
  try {
    if (
      typeof candidate !== 'object'
      || candidate === null
      || Array.isArray(candidate)
      || Object.getPrototypeOf(candidate) !== Object.prototype
    ) return null;
    const ownKeys = Reflect.ownKeys(candidate);
    if (ownKeys.length === 0) {
      return Object.freeze({ status: 'ready', ledger: emptySafetyLedger() });
    }
    if (ownKeys.length !== 1 || ownKeys[0] !== EXTENSION_SAFETY_LEDGER_KEY) return null;
    const slot = Object.getOwnPropertyDescriptor(candidate, EXTENSION_SAFETY_LEDGER_KEY);
    if (!slot || !slot.enumerable || !('value' in slot)) return null;
    return validateSafetyLedger(slot.value);
  } catch {
    return null;
  }
}

export async function readSafetyLedger(): Promise<SafetyLedgerReadResult> {
  if (!(await ensureTrustedAccess())) return unavailable('access-level-failed');
  let raw: unknown;
  try {
    raw = await chrome.storage.local.get(EXTENSION_SAFETY_LEDGER_KEY);
  } catch {
    return unavailable('storage-read-failed');
  }
  const parsed = readStoredContainer(raw);
  return parsed ?? unavailable('storage-read-failed');
}

function normalizeReadResult(candidate: unknown): SafetyLedgerReadResult {
  const statusSlot = (() => {
    try {
      return typeof candidate === 'object' && candidate !== null
        ? Object.getOwnPropertyDescriptor(candidate, 'status')
        : undefined;
    } catch {
      return undefined;
    }
  })();
  if (!statusSlot || !statusSlot.enumerable || !('value' in statusSlot)) return quarantined;
  if (statusSlot.value === 'quarantined') {
    const read = readData(candidate, ['status']);
    return read.ok ? quarantined : quarantined;
  }
  if (statusSlot.value === 'unavailable') {
    const read = readData(candidate, UNAVAILABLE_KEYS);
    if (
      !read.ok
      || typeof read.fields.reason !== 'string'
      || !IO_REASONS.has(read.fields.reason)
    ) return quarantined;
    return unavailable(read.fields.reason as SafetyLedgerIoReason);
  }
  if (statusSlot.value === 'ready') {
    const read = readData(candidate, READY_KEYS);
    if (!read.ok) return quarantined;
    return validateSafetyLedger(read.fields.ledger);
  }
  return quarantined;
}

function recordsWith(
  ledger: SafetyLedgerV1,
  replacement: SafetyRecordV1,
  previousIndex: number | null,
): SafetyLedgerV1 | null {
  const records = [...ledger.records];
  if (previousIndex === null) records.push(replacement);
  else records.splice(previousIndex, 1, replacement);
  records.sort((left, right) => left.packId < right.packId ? -1 : left.packId > right.packId ? 1 : 0);
  const validation = validateSafetyLedger({ schema: SAFETY_LEDGER_SCHEMA, records });
  return validation.status === 'ready' ? validation.ledger : null;
}

function recordsWithout(ledger: SafetyLedgerV1, index: number): SafetyLedgerV1 | null {
  const records = ledger.records.filter((_record, recordIndex) => recordIndex !== index);
  const validation = validateSafetyLedger({ schema: SAFETY_LEDGER_SCHEMA, records });
  return validation.status === 'ready' ? validation.ledger : null;
}

function sameRecord(left: SafetyRecordV1, right: SafetyRecordV1): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function writeSafetyLedger(ledger: SafetyLedgerV1): Promise<SafetyLedgerMutationResult> {
  if (!(await ensureTrustedAccess())) return unavailable('access-level-failed');
  try {
    await chrome.storage.local.set({ [EXTENSION_SAFETY_LEDGER_KEY]: ledger });
  } catch {
    return unavailable('storage-write-failed');
  }
  let raw: unknown;
  try {
    raw = await chrome.storage.local.get(EXTENSION_SAFETY_LEDGER_KEY);
  } catch {
    return unavailable('storage-readback-failed');
  }
  const parsed = readStoredContainer(raw);
  if (!parsed || parsed.status !== 'ready') return unavailable('readback-invalid');
  if (JSON.stringify(parsed.ledger) !== JSON.stringify(ledger)) return unavailable('readback-mismatch');
  return Object.freeze({ status: 'confirmed', ledger: parsed.ledger });
}

function passThrough(state: SafetyLedgerReadResult): SafetyLedgerQuarantined | SafetyLedgerUnavailable | null {
  if (state.status === 'quarantined') return quarantined;
  if (state.status === 'unavailable') return state;
  return null;
}

export function assessSafetyLedgerLoad(candidate: unknown, packId: unknown): SafetyLedgerLoadDecision {
  const state = normalizeReadResult(candidate);
  const stopped = passThrough(state);
  if (stopped) return stopped;
  if (state.status !== 'ready' || !isOpaque(packId)) return blocked('invalid-input');
  if (state.ledger.records.some(isBlocker)) return blocked('global-blocker');
  if (state.ledger.records.some((record) => record.packId === packId)) return blocked('same-pack-replay');
  if (state.ledger.records.length >= SAFETY_LEDGER_CAPACITY) return blocked('capacity-reached');
  return Object.freeze({ status: 'ready' });
}

export async function armUnresolvedLive(
  candidate: unknown,
  proposed: unknown,
): Promise<SafetyLedgerMutationResult> {
  const state = normalizeReadResult(candidate);
  const stopped = passThrough(state);
  if (stopped) return stopped;
  const record = readSafetyRecord(proposed);
  if (state.status !== 'ready' || !record || record.state !== 'unresolved-live') return quarantined;
  const decision = assessSafetyLedgerLoad(state, record.packId);
  if (decision.status !== 'ready') return decision;
  const next = recordsWith(state.ledger, record, null);
  return next ? writeSafetyLedger(next) : quarantined;
}

function readSettlementIntent(candidate: unknown): SettlementIntentV1 | null {
  const read = readData(candidate, INTENT_KEYS);
  if (!read.ok || typeof read.fields.cause !== 'string') return null;
  const terminal = readSafetyRecord(read.fields.terminal);
  if (!terminal || (terminal.state !== 'replay' && terminal.state !== 'needs-review')) return null;
  if (
    read.fields.cause === 'injection-result'
    && (terminal.state === 'needs-review' || terminal.outcome === 'complete')
  ) return Object.freeze({ cause: 'injection-result', terminal }) as SettlementIntentV1;
  if (
    read.fields.cause === 'cancelled-before-dispatch'
    && terminal.state === 'replay'
    && terminal.outcome === 'cancelled-before-dispatch'
  ) return Object.freeze({ cause: 'cancelled-before-dispatch', terminal }) as SettlementIntentV1;
  if (
    read.fields.cause === 'destination-tab-removed'
    && terminal.state === 'replay'
    && terminal.outcome === 'closed-unresolved'
  ) return Object.freeze({ cause: 'destination-tab-removed', terminal }) as SettlementIntentV1;
  return null;
}

export async function settleSafetyLedger(
  candidate: unknown,
  expectedLive: unknown,
  intended: unknown,
): Promise<SafetyLedgerMutationResult> {
  const state = normalizeReadResult(candidate);
  const stopped = passThrough(state);
  if (stopped) return stopped;
  const expected = readSafetyRecord(expectedLive);
  const intent = readSettlementIntent(intended);
  if (
    state.status !== 'ready'
    || !expected
    || expected.state !== 'unresolved-live'
    || !intent
    || intent.terminal.packId !== expected.packId
    || intent.terminal.replayUntil !== expected.replayUntil
  ) return quarantined;

  const index = state.ledger.records.findIndex((record) => record.packId === expected.packId);
  const current = index < 0 ? null : state.ledger.records[index];
  if (current && sameRecord(current, intent.terminal)) {
    return Object.freeze({ status: 'confirmed', ledger: state.ledger });
  }
  const cancellationWithoutMarker = intent.cause === 'cancelled-before-dispatch' && current === null;
  if (!cancellationWithoutMarker && (!current || !sameRecord(current, expected))) return quarantined;
  if (cancellationWithoutMarker && state.ledger.records.length >= SAFETY_LEDGER_CAPACITY) return quarantined;
  const next = recordsWith(state.ledger, intent.terminal, current === null ? null : index);
  return next ? writeSafetyLedger(next) : quarantined;
}

export async function orphanUnresolvedLive(
  candidate: unknown,
  expectedLive: unknown,
  sessionStateAbsent: unknown,
): Promise<SafetyLedgerMutationResult> {
  const state = normalizeReadResult(candidate);
  const stopped = passThrough(state);
  if (stopped) return stopped;
  const expected = readSafetyRecord(expectedLive);
  if (state.status !== 'ready' || expected?.state !== 'unresolved-live' || sessionStateAbsent !== true) {
    return quarantined;
  }
  const index = state.ledger.records.findIndex((record) => record.packId === expected.packId);
  if (index < 0 || !sameRecord(state.ledger.records[index], expected)) return quarantined;
  const orphan = Object.freeze({
    state: 'unresolved-orphaned' as const,
    packId: expected.packId,
    replayUntil: expected.replayUntil,
  });
  const next = recordsWith(state.ledger, orphan, index);
  return next ? writeSafetyLedger(next) : quarantined;
}

function readAcknowledgement(candidate: unknown): NeedsReviewSafetyRecordV1 | null {
  const read = readData(candidate, ACKNOWLEDGEMENT_KEYS);
  if (
    !read.ok
    || !isOpaque(read.fields.packId)
    || !isPositiveTime(read.fields.replayUntil)
    || !isPositiveTime(read.fields.warningExpiresAt)
    || read.fields.warningExpiresAt <= read.fields.replayUntil
  ) return null;
  return Object.freeze({
    state: 'needs-review',
    packId: read.fields.packId,
    replayUntil: read.fields.replayUntil,
    warningExpiresAt: read.fields.warningExpiresAt,
  });
}

export async function acknowledgeNeedsReview(
  candidate: unknown,
  acknowledgement: unknown,
  nowMs: unknown,
): Promise<SafetyLedgerMutationResult> {
  const state = normalizeReadResult(candidate);
  const stopped = passThrough(state);
  if (stopped) return stopped;
  const expected = readAcknowledgement(acknowledgement);
  if (state.status !== 'ready' || !expected || !isPositiveTime(nowMs)) return blocked('invalid-input');
  const index = state.ledger.records.findIndex((record) => record.packId === expected.packId);
  const current = index < 0 ? null : state.ledger.records[index];
  if (
    !current
    || current.state !== 'needs-review'
    || !sameRecord(current, expected)
    || nowMs >= current.warningExpiresAt
  ) return blocked('acknowledgement-not-available');
  if (nowMs < current.replayUntil) {
    const inspected = Object.freeze({
      state: 'replay' as const,
      packId: current.packId,
      replayUntil: current.replayUntil,
      outcome: 'inspected' as const,
    });
    const next = recordsWith(state.ledger, inspected, index);
    return next ? writeSafetyLedger(next) : quarantined;
  }
  const next = recordsWithout(state.ledger, index);
  return next ? writeSafetyLedger(next) : quarantined;
}

export async function pruneSafetyLedgerAfterReconciliation(
  candidate: unknown,
  nowMs: unknown,
): Promise<SafetyLedgerMutationResult> {
  const state = normalizeReadResult(candidate);
  const stopped = passThrough(state);
  if (stopped) return stopped;
  if (state.status !== 'ready' || !isPositiveTime(nowMs)) return blocked('invalid-input');
  const retained = state.ledger.records.filter((record) => {
    if (record.state === 'replay') return nowMs < record.replayUntil;
    if (record.state === 'needs-review') return nowMs < record.warningExpiresAt;
    return true;
  });
  if (retained.length === state.ledger.records.length) {
    return Object.freeze({ status: 'confirmed', ledger: state.ledger });
  }
  const validation = validateSafetyLedger({ schema: SAFETY_LEDGER_SCHEMA, records: retained });
  return validation.status === 'ready' ? writeSafetyLedger(validation.ledger) : quarantined;
}

export function nextSafetyLedgerCleanupAt(candidate: unknown): SafetyLedgerCleanupDecision {
  const state = normalizeReadResult(candidate);
  const stopped = passThrough(state);
  if (stopped) return stopped;
  if (state.status !== 'ready') return quarantined;
  let nextCleanupAt: number | null = null;
  for (const record of state.ledger.records) {
    const point = record.state === 'replay'
      ? record.replayUntil
      : record.state === 'needs-review'
        ? record.warningExpiresAt
        : null;
    if (point !== null && (nextCleanupAt === null || point < nextCleanupAt)) nextCleanupAt = point;
  }
  return Object.freeze({ status: 'ready', nextCleanupAt });
}

function isResetAttestation(candidate: unknown): candidate is DeviceOwnerResetAttestationV1 {
  const read = readData(candidate, RESET_KEYS);
  return read.ok
    && read.fields.schema === DEVICE_OWNER_RESET_ATTESTATION_SCHEMA
    && read.fields.type === 'reset-for-device-owner'
    && read.fields.allRelevantOfficialTabsAndBrowserProcessesClosed === true;
}

export async function resetSafetyLedgerForDeviceOwner(
  candidate: unknown,
  sessionStateAbsent: unknown,
  attestation: unknown,
): Promise<SafetyLedgerMutationResult> {
  const state = normalizeReadResult(candidate);
  if (state.status === 'unavailable') return state;
  if (sessionStateAbsent !== true || !isResetAttestation(attestation)) {
    return blocked('reset-not-allowed');
  }
  if (state.status === 'quarantined') return writeSafetyLedger(emptySafetyLedger());
  const orphanIndex = state.ledger.records.findIndex((record) => record.state === 'unresolved-orphaned');
  if (orphanIndex < 0) return blocked('reset-not-allowed');
  const next = recordsWithout(state.ledger, orphanIndex);
  return next ? writeSafetyLedger(next) : quarantined;
}
