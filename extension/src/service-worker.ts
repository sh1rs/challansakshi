import {
  EXTENSION_ENVELOPE_KEYS,
  digestCanonicalExtensionHandoffEnvelopeCore,
  validateExtensionHandoffEnvelopeAgainstAuthority,
  type CanonicalExtensionHandoffEnvelope,
  type ExtensionEnvelopeValidationAuthority,
} from '../../lib/extension-handoff-envelope-core';
import {
  buildDestinationFillPlan,
  buildDestinationPreviewPlan,
  selectedDestinationAdapterRegistry,
  selectedDestinationInjectedFunction,
  type EnabledDestinationAdapterV1,
} from './destination-adapters';
import {
  validateDestinationFillInjectionResult,
  validateDestinationPreviewInjectionResult,
  validateDestinationRepreflightInjectionResult,
  type DestinationPreviewPlanV1,
} from './fill-page';
import {
  WORKER_RESPONSE_SCHEMA,
  buildFixedWorkerResponse,
  buildRejectedWorkerResponse,
  parseWorkerRequest,
  validatePopupSender,
  validateWorkerResponseForCommand,
  type WorkerCommand,
  type WorkerRequestV1,
  type WorkerResponseV1,
} from './message-contract';
import {
  NEEDS_REVIEW_WARNING_LIFETIME_MS,
  acknowledgeNeedsReview,
  armUnresolvedLive,
  assessSafetyLedgerLoad,
  nextSafetyLedgerCleanupAt,
  orphanUnresolvedLive,
  pruneSafetyLedgerAfterReconciliation,
  readSafetyLedger,
  resetSafetyLedgerForDeviceOwner,
  settleSafetyLedger,
  type NeedsReviewSafetyRecordV1,
  type SafetyLedgerReadResult,
  type SafetyLedgerV1,
  type SettlementIntentV1,
  type UnresolvedLiveSafetyRecordV1,
} from './safety-ledger';
import {
  createSourceProbePlan,
  probeChallanSakshiSource,
  validateSourcePreviewInjectionResult,
  validateSourceReprobeInjectionResult,
  type SourcePreviewBindingV1,
  type SourcePreviewValidationResult,
  type SourceReprobeValidationResult,
} from './source-probe';

declare const __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__: 'synthetic-development' | 'production-disabled';
declare const __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__: Readonly<{
  profileId: 'synthetic-development' | 'production-disabled';
  envelopeMode: 'synthetic' | 'real';
  envelopeValidationAuthority: ExtensionEnvelopeValidationAuthority;
}>;

export const EXTENSION_SESSION_STATE_KEY = 'challansakshi.session-state.v1' as const;
export const SESSION_STATE_SCHEMA = 'challansakshi.session-state/v1' as const;

export type DestinationBindingV1 = Readonly<{
  destinationTabId: number;
  destinationDocumentId: string;
}>;

export type StagedSessionStateV1 = Readonly<{
  schema: typeof SESSION_STATE_SCHEMA;
  state: 'staged';
  generation: string;
  envelope: CanonicalExtensionHandoffEnvelope;
  importedAtMs: number;
  effectiveExpiresAtMs: number;
  sourceTabId: number;
  sourceDocumentId: string;
  destination: DestinationBindingV1 | null;
}>;

export type ArmingSessionStateV1 = Readonly<{
  schema: typeof SESSION_STATE_SCHEMA;
  state: 'arming';
  generation: string;
  envelope: CanonicalExtensionHandoffEnvelope;
  importedAtMs: number;
  effectiveExpiresAtMs: number;
  sourceTabId: number;
  sourceDocumentId: string;
  destination: DestinationBindingV1;
  armNonce: string;
  attemptId: string;
  replayUntil: number;
  attemptNotAfterMs: number;
}>;

export type ConsumingSessionStateV1 = Readonly<{
  schema: typeof SESSION_STATE_SCHEMA;
  state: 'consuming';
  generation: string;
  armNonce: string;
  packId: string;
  attemptId: string;
  replayUntil: number;
  attemptNotAfterMs: number;
  destinationTabId: number;
  destinationDocumentId: string;
}>;

export type SettlingSessionStateV1 = Readonly<{
  schema: typeof SESSION_STATE_SCHEMA;
  state: 'settling';
  generation: string;
  armNonce: string;
  packId: string;
  attemptId: string;
  replayUntil: number;
  attemptNotAfterMs: number;
  destinationTabId: number;
  destinationDocumentId: string;
  intended: SettlementIntentV1;
}>;

export type SessionStateV1 =
  | StagedSessionStateV1
  | ArmingSessionStateV1
  | ConsumingSessionStateV1
  | SettlingSessionStateV1;

export type SessionValidationResult =
  | Readonly<{ status: 'ready'; session: SessionStateV1 }>
  | Readonly<{ status: 'quarantined' }>;

type DataRead =
  | Readonly<{ ok: true; fields: Readonly<Record<string, unknown>> }>
  | Readonly<{ ok: false }>;

const STAGED_KEYS = Object.freeze([
  'schema', 'state', 'generation', 'envelope', 'importedAtMs', 'effectiveExpiresAtMs',
  'sourceTabId', 'sourceDocumentId', 'destination',
] as const);
const ARMING_KEYS = Object.freeze([
  'schema', 'state', 'generation', 'envelope', 'importedAtMs', 'effectiveExpiresAtMs',
  'sourceTabId', 'sourceDocumentId', 'destination', 'armNonce', 'attemptId',
  'replayUntil', 'attemptNotAfterMs',
] as const);
const CONSUMING_KEYS = Object.freeze([
  'schema', 'state', 'generation', 'armNonce', 'packId', 'attemptId', 'replayUntil',
  'attemptNotAfterMs', 'destinationTabId', 'destinationDocumentId',
] as const);
const SETTLING_KEYS = Object.freeze([...CONSUMING_KEYS, 'intended'] as const);
const DESTINATION_KEYS = Object.freeze(['destinationTabId', 'destinationDocumentId'] as const);
const INTENT_KEYS = Object.freeze(['cause', 'terminal'] as const);
const LIVE_TERMINAL_KEYS = Object.freeze(['state', 'packId', 'replayUntil', 'outcome'] as const);
const WARNING_TERMINAL_KEYS = Object.freeze([
  'state', 'packId', 'replayUntil', 'warningExpiresAt',
] as const);
const OPAQUE_PATTERN = /^[0-9a-f]{32}$/;
const DOCUMENT_ID_PATTERN = /^[\x21-\x7e]{1,128}$/;
const quarantined = Object.freeze({ status: 'quarantined' } as const);

function readData(value: unknown, expectedKeys: readonly string[]): DataRead {
  try {
    if (
      typeof value !== 'object'
      || value === null
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return { ok: false };
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== expectedKeys.length
      || keys.some((key, index) => key !== expectedKeys[index])
    ) return { ok: false };
    const fields: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return { ok: false };
      fields[key] = descriptor.value;
    }
    return { ok: true, fields: Object.freeze(fields) };
  } catch {
    return { ok: false };
  }
}

function isOpaque(value: unknown): value is string {
  return typeof value === 'string' && OPAQUE_PATTERN.test(value);
}

function isPositiveTime(value: unknown): value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) return false;
  try {
    return Date.parse(new Date(value as number).toISOString()) === value;
  } catch {
    return false;
  }
}

function isTabId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isDocumentId(value: unknown): value is string {
  return typeof value === 'string' && DOCUMENT_ID_PATTERN.test(value);
}

function readDestination(value: unknown): DestinationBindingV1 | null {
  const read = readData(value, DESTINATION_KEYS);
  if (
    !read.ok
    || !isTabId(read.fields.destinationTabId)
    || !isDocumentId(read.fields.destinationDocumentId)
  ) return null;
  return Object.freeze({
    destinationTabId: read.fields.destinationTabId,
    destinationDocumentId: read.fields.destinationDocumentId,
  });
}

function readEnvelope(
  value: unknown,
  importedAtMs: number,
  effectiveExpiresAtMs: number,
): CanonicalExtensionHandoffEnvelope | null {
  const ordered = readData(value, EXTENSION_ENVELOPE_KEYS);
  if (!ordered.ok) return null;
  const authority = __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__;
  if (authority.profileId !== __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__) return null;
  const validated = validateExtensionHandoffEnvelopeAgainstAuthority(
    value,
    Object.freeze({
      profile: __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__,
      nowMs: importedAtMs,
      importedAtMs,
    }),
    authority.envelopeValidationAuthority,
  );
  return validated.status === 'accepted' && validated.effectiveExpiresAtMs === effectiveExpiresAtMs
    ? validated.envelope
    : null;
}

function readIntent(value: unknown, packId: string, replayUntil: number): SettlementIntentV1 | null {
  const read = readData(value, INTENT_KEYS);
  if (!read.ok) return null;
  const cause = read.fields.cause;
  const warning = readData(read.fields.terminal, WARNING_TERMINAL_KEYS);
  if (
    cause === 'injection-result'
    && warning.ok
    && warning.fields.state === 'needs-review'
    && warning.fields.packId === packId
    && warning.fields.replayUntil === replayUntil
    && isPositiveTime(warning.fields.warningExpiresAt)
    && warning.fields.warningExpiresAt > replayUntil
  ) return Object.freeze({
    cause,
    terminal: Object.freeze({
      state: 'needs-review',
      packId,
      replayUntil,
      warningExpiresAt: warning.fields.warningExpiresAt,
    }),
  });
  const replay = readData(read.fields.terminal, LIVE_TERMINAL_KEYS);
  if (
    !replay.ok
    || replay.fields.state !== 'replay'
    || replay.fields.packId !== packId
    || replay.fields.replayUntil !== replayUntil
  ) return null;
  if (cause === 'injection-result' && replay.fields.outcome === 'complete') {
    return Object.freeze({
      cause,
      terminal: Object.freeze({ state: 'replay', packId, replayUntil, outcome: 'complete' }),
    });
  }
  if (cause === 'cancelled-before-dispatch' && replay.fields.outcome === cause) {
    return Object.freeze({
      cause,
      terminal: Object.freeze({ state: 'replay', packId, replayUntil, outcome: cause }),
    });
  }
  if (cause === 'destination-tab-removed' && replay.fields.outcome === 'closed-unresolved') {
    return Object.freeze({
      cause,
      terminal: Object.freeze({
        state: 'replay', packId, replayUntil, outcome: 'closed-unresolved',
      }),
    });
  }
  return null;
}

function readAttemptTuple(fields: Readonly<Record<string, unknown>>) {
  if (
    !isOpaque(fields.generation)
    || !isOpaque(fields.armNonce)
    || !isOpaque(fields.packId)
    || !isOpaque(fields.attemptId)
    || fields.armNonce === fields.attemptId
    || !isPositiveTime(fields.replayUntil)
    || !isPositiveTime(fields.attemptNotAfterMs)
    || fields.attemptNotAfterMs > fields.replayUntil
    || !isTabId(fields.destinationTabId)
    || !isDocumentId(fields.destinationDocumentId)
  ) return null;
  return Object.freeze({
    generation: fields.generation,
    armNonce: fields.armNonce,
    packId: fields.packId,
    attemptId: fields.attemptId,
    replayUntil: fields.replayUntil,
    attemptNotAfterMs: fields.attemptNotAfterMs,
    destinationTabId: fields.destinationTabId,
    destinationDocumentId: fields.destinationDocumentId,
  });
}

export function validateSessionState(value: unknown): SessionValidationResult {
  const discriminant = readData(value, ['schema', 'state']);
  if (!discriminant.ok) {
    // The discriminant read is intentionally strict only when followed by the full member read.
    try {
      if (typeof value !== 'object' || value === null) return quarantined;
      const schema = Object.getOwnPropertyDescriptor(value, 'schema');
      const state = Object.getOwnPropertyDescriptor(value, 'state');
      if (
        !schema || !schema.enumerable || !('value' in schema)
        || !state || !state.enumerable || !('value' in state)
        || schema.value !== SESSION_STATE_SCHEMA
        || typeof state.value !== 'string'
      ) return quarantined;
    } catch {
      return quarantined;
    }
  }
  let state: unknown;
  try {
    const descriptor = typeof value === 'object' && value !== null
      ? Object.getOwnPropertyDescriptor(value, 'state')
      : undefined;
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return quarantined;
    state = descriptor.value;
  } catch {
    return quarantined;
  }

  if (state === 'staged' || state === 'arming') {
    const read = readData(value, state === 'staged' ? STAGED_KEYS : ARMING_KEYS);
    if (
      !read.ok
      || read.fields.schema !== SESSION_STATE_SCHEMA
      || read.fields.state !== state
      || !isOpaque(read.fields.generation)
      || !isPositiveTime(read.fields.importedAtMs)
      || !isPositiveTime(read.fields.effectiveExpiresAtMs)
      || read.fields.importedAtMs >= read.fields.effectiveExpiresAtMs
      || !isTabId(read.fields.sourceTabId)
      || !isDocumentId(read.fields.sourceDocumentId)
    ) return quarantined;
    const envelope = readEnvelope(
      read.fields.envelope,
      read.fields.importedAtMs,
      read.fields.effectiveExpiresAtMs,
    );
    if (!envelope) return quarantined;
    if (state === 'staged') {
      const destination = read.fields.destination === null
        ? null
        : readDestination(read.fields.destination);
      if (read.fields.destination !== null && !destination) return quarantined;
      return Object.freeze({
        status: 'ready',
        session: Object.freeze({
          schema: SESSION_STATE_SCHEMA,
          state,
          generation: read.fields.generation,
          envelope,
          importedAtMs: read.fields.importedAtMs,
          effectiveExpiresAtMs: read.fields.effectiveExpiresAtMs,
          sourceTabId: read.fields.sourceTabId,
          sourceDocumentId: read.fields.sourceDocumentId,
          destination,
        }),
      });
    }
    const destination = readDestination(read.fields.destination);
    if (
      !destination
      || !isOpaque(read.fields.armNonce)
      || !isOpaque(read.fields.attemptId)
      || read.fields.armNonce === read.fields.attemptId
      || !isPositiveTime(read.fields.replayUntil)
      || read.fields.replayUntil !== read.fields.effectiveExpiresAtMs
      || !isPositiveTime(read.fields.attemptNotAfterMs)
      || read.fields.attemptNotAfterMs > read.fields.replayUntil
    ) return quarantined;
    return Object.freeze({
      status: 'ready',
      session: Object.freeze({
        schema: SESSION_STATE_SCHEMA,
        state,
        generation: read.fields.generation,
        envelope,
        importedAtMs: read.fields.importedAtMs,
        effectiveExpiresAtMs: read.fields.effectiveExpiresAtMs,
        sourceTabId: read.fields.sourceTabId,
        sourceDocumentId: read.fields.sourceDocumentId,
        destination,
        armNonce: read.fields.armNonce,
        attemptId: read.fields.attemptId,
        replayUntil: read.fields.replayUntil,
        attemptNotAfterMs: read.fields.attemptNotAfterMs,
      }),
    });
  }

  if (state === 'consuming' || state === 'settling') {
    const read = readData(value, state === 'consuming' ? CONSUMING_KEYS : SETTLING_KEYS);
    if (
      !read.ok
      || read.fields.schema !== SESSION_STATE_SCHEMA
      || read.fields.state !== state
    ) return quarantined;
    const tuple = readAttemptTuple(read.fields);
    if (!tuple) return quarantined;
    if (state === 'consuming') {
      return Object.freeze({
        status: 'ready',
        session: Object.freeze({ schema: SESSION_STATE_SCHEMA, state, ...tuple }),
      });
    }
    const intended = readIntent(read.fields.intended, tuple.packId, tuple.replayUntil);
    if (!intended) return quarantined;
    return Object.freeze({
      status: 'ready',
      session: Object.freeze({ schema: SESSION_STATE_SCHEMA, state, ...tuple, intended }),
    });
  }
  return quarantined;
}

type SessionIoResult =
  | Readonly<{ status: 'ready'; session: SessionStateV1 | null }>
  | Readonly<{ status: 'quarantined' }>
  | Readonly<{ status: 'unavailable' }>;

type CanonicalLifecycle = Readonly<{
  status: 'ready';
  session: SessionStateV1 | null;
  ledger: SafetyLedgerV1;
  stagedExpired: boolean;
}> | Readonly<{ status: 'quarantined' | 'unavailable' }>;

type AlarmName = 'session-expiry' | 'ledger-cleanup' | 'attempt-watchdog';
type DeferredResponse = Readonly<{ deferred: true }>;
type RequestResult = WorkerResponseV1 | DeferredResponse;
type WorkerPreviewPlanResult =
  | ReturnType<typeof buildDestinationPreviewPlan>
  | Readonly<{ status: 'expired' | 'adapter-expired' }>;
type WorkerPlanResult = WorkerPreviewPlanResult | ReturnType<typeof buildDestinationFillPlan>;
type BuiltPreviewPlan = Extract<WorkerPreviewPlanResult, { status: 'built' }>;
type BuiltFillPlan = Extract<ReturnType<typeof buildDestinationFillPlan>, { status: 'built' }>;
type StagedPreviewTiming = 'current' | 'effective-expired' | 'adapter-expired' | 'operation-expired';
type PreparedFillDispatch = Readonly<{
  status: 'prepared';
  consuming: ConsumingSessionStateV1;
  fillPlan: BuiltFillPlan['plan'];
  sourceAuthorization: SourcePreviewBindingV1;
  sourceImportedAtMs: number;
}>;

const SESSION_EXPIRY_ALARM: AlarmName = 'session-expiry';
const LEDGER_CLEANUP_ALARM: AlarmName = 'ledger-cleanup';
const ATTEMPT_WATCHDOG_ALARM: AlarmName = 'attempt-watchdog';
const OPERATION_WINDOW_MS = 30_000;
const CATEGORY_PRESENTATION = __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development'
  ? '4 Wheeler Challan On 2 Wheeler'
  : null;
const DESTINATION_PURPOSE = __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development'
  ? 'Place the reviewed fictional category and description into the two blank synthetic fields.'
  : 'Real-site filling is disabled pending current verification and authorisation.';

function destinationNameForRoute(routeKey: string) {
  if (__CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development') {
    return 'Fictional destination fixture';
  }
  return routeKey === 'legacy'
    ? 'National eChallan grievance (Legacy)'
    : 'National eChallan grievance (NextGen)';
}

let sessionTrustedAccess: Promise<boolean> | null = null;
let lifecycleTail: Promise<void> = Promise.resolve();
const closedInFlightTuples = new Set<string>();

function enqueueLifecycle<T>(job: () => Promise<T> | T): Promise<T> {
  const run = lifecycleTail.then(job, job);
  lifecycleTail = run.then(() => undefined, () => undefined);
  return run;
}

function unavailableSession(): SessionIoResult {
  return Object.freeze({ status: 'unavailable' });
}

async function ensureSessionTrustedAccess(): Promise<boolean> {
  if (sessionTrustedAccess === null) {
    sessionTrustedAccess = (async () => {
      try {
        await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
        return true;
      } catch {
        return false;
      }
    })();
  }
  const granted = await sessionTrustedAccess;
  if (!granted) sessionTrustedAccess = null;
  return granted;
}

function readSessionContainer(value: unknown): SessionIoResult {
  try {
    if (
      typeof value !== 'object'
      || value === null
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return Object.freeze({ status: 'quarantined' });
    const keys = Reflect.ownKeys(value);
    if (keys.length === 0) return Object.freeze({ status: 'ready', session: null });
    if (keys.length !== 1 || keys[0] !== EXTENSION_SESSION_STATE_KEY) {
      return Object.freeze({ status: 'quarantined' });
    }
    const slot = Object.getOwnPropertyDescriptor(value, EXTENSION_SESSION_STATE_KEY);
    if (!slot || !slot.enumerable || !('value' in slot)) {
      return Object.freeze({ status: 'quarantined' });
    }
    const validated = validateSessionState(slot.value);
    return validated.status === 'ready'
      ? Object.freeze({ status: 'ready', session: validated.session })
      : Object.freeze({ status: 'quarantined' });
  } catch {
    return Object.freeze({ status: 'quarantined' });
  }
}

async function readSessionState(): Promise<SessionIoResult> {
  if (!(await ensureSessionTrustedAccess())) return unavailableSession();
  try {
    return readSessionContainer(await chrome.storage.session.get(EXTENSION_SESSION_STATE_KEY));
  } catch {
    return unavailableSession();
  }
}

async function writeSessionState(session: SessionStateV1): Promise<SessionIoResult> {
  const checked = validateSessionState(session);
  if (checked.status !== 'ready' || !(await ensureSessionTrustedAccess())) {
    return checked.status === 'ready'
      ? unavailableSession()
      : Object.freeze({ status: 'quarantined' });
  }
  try {
    await chrome.storage.session.set({ [EXTENSION_SESSION_STATE_KEY]: checked.session });
  } catch {
    return unavailableSession();
  }
  let readback: SessionIoResult;
  try {
    readback = readSessionContainer(await chrome.storage.session.get(EXTENSION_SESSION_STATE_KEY));
  } catch {
    return unavailableSession();
  }
  if (readback.status !== 'ready' || readback.session === null) return readback;
  return JSON.stringify(readback.session) === JSON.stringify(checked.session)
    ? readback
    : Object.freeze({ status: 'quarantined' });
}

async function removeSessionState(): Promise<SessionIoResult> {
  if (!(await ensureSessionTrustedAccess())) return unavailableSession();
  try {
    await chrome.storage.session.remove(EXTENSION_SESSION_STATE_KEY);
  } catch {
    return unavailableSession();
  }
  let readback: SessionIoResult;
  try {
    readback = readSessionContainer(await chrome.storage.session.get(EXTENSION_SESSION_STATE_KEY));
  } catch {
    return unavailableSession();
  }
  return readback.status === 'ready' && readback.session === null
    ? readback
    : readback.status === 'quarantined'
      ? readback
      : unavailableSession();
}

function liveFromSession(
  session: ArmingSessionStateV1 | ConsumingSessionStateV1 | SettlingSessionStateV1,
): UnresolvedLiveSafetyRecordV1 {
  return Object.freeze({
    state: 'unresolved-live',
    armNonce: session.armNonce,
    packId: session.state === 'arming' ? session.envelope.packId : session.packId,
    replayUntil: session.replayUntil,
  });
}

function inFlightTupleKey(session: ConsumingSessionStateV1): string {
  return JSON.stringify([
    session.generation,
    session.armNonce,
    session.packId,
    session.attemptId,
    session.replayUntil,
    session.attemptNotAfterMs,
    session.destinationTabId,
    session.destinationDocumentId,
  ]);
}

function liveMatches(
  ledger: SafetyLedgerV1,
  session: ArmingSessionStateV1 | ConsumingSessionStateV1 | SettlingSessionStateV1,
): boolean {
  const expected = liveFromSession(session);
  const current = ledger.records.find((record) => record.packId === expected.packId);
  return current?.state === 'unresolved-live'
    && current.armNonce === expected.armNonce
    && current.replayUntil === expected.replayUntil;
}

function hasUnrelatedBlocker(
  ledger: SafetyLedgerV1,
  session: ArmingSessionStateV1 | ConsumingSessionStateV1 | SettlingSessionStateV1,
): boolean {
  const packId = session.state === 'arming' ? session.envelope.packId : session.packId;
  return ledger.records.some((record) => record.packId !== packId && record.state !== 'replay');
}

function cancellationIntent(
  session: ArmingSessionStateV1 | ConsumingSessionStateV1,
): SettlementIntentV1 {
  const packId = session.state === 'arming' ? session.envelope.packId : session.packId;
  return Object.freeze({
    cause: 'cancelled-before-dispatch',
    terminal: Object.freeze({
      state: 'replay', packId, replayUntil: session.replayUntil,
      outcome: 'cancelled-before-dispatch',
    }),
  });
}

function toSettling(
  session: ArmingSessionStateV1 | ConsumingSessionStateV1,
  intended: SettlementIntentV1,
): SettlingSessionStateV1 {
  const destination = session.state === 'arming'
    ? session.destination
    : Object.freeze({
      destinationTabId: session.destinationTabId,
      destinationDocumentId: session.destinationDocumentId,
    });
  return Object.freeze({
    schema: SESSION_STATE_SCHEMA,
    state: 'settling',
    generation: session.generation,
    armNonce: session.armNonce,
    packId: session.state === 'arming' ? session.envelope.packId : session.packId,
    attemptId: session.attemptId,
    replayUntil: session.replayUntil,
    attemptNotAfterMs: session.attemptNotAfterMs,
    destinationTabId: destination.destinationTabId,
    destinationDocumentId: destination.destinationDocumentId,
    intended,
  });
}

function readyLedger(ledger: SafetyLedgerV1): SafetyLedgerReadResult {
  return Object.freeze({ status: 'ready', ledger });
}

function mutationFailure(
  value: Readonly<{ status: string }>,
): Readonly<{ status: 'quarantined' | 'unavailable' }> {
  return Object.freeze({ status: value.status === 'quarantined' ? 'quarantined' : 'unavailable' });
}

async function finishSettlement(
  settling: SettlingSessionStateV1,
  ledger: SafetyLedgerV1,
): Promise<CanonicalLifecycle> {
  const settled = await settleSafetyLedger(
    readyLedger(ledger),
    liveFromSession(settling),
    settling.intended,
  );
  if (settled.status !== 'confirmed') return mutationFailure(settled);
  const removed = await removeSessionState();
  if (removed.status !== 'ready' || removed.session !== null) {
    return Object.freeze({ status: removed.status === 'quarantined' ? 'quarantined' : 'unavailable' });
  }
  return Object.freeze({
    status: 'ready', session: null, ledger: settled.ledger, stagedExpired: false,
  });
}

async function persistAndFinishSettlement(
  session: ArmingSessionStateV1 | ConsumingSessionStateV1,
  intended: SettlementIntentV1,
  ledger: SafetyLedgerV1,
): Promise<CanonicalLifecycle> {
  const settling = toSettling(session, intended);
  const written = await writeSessionState(settling);
  if (written.status !== 'ready' || written.session?.state !== 'settling') {
    return Object.freeze({ status: written.status === 'quarantined' ? 'quarantined' : 'unavailable' });
  }
  return finishSettlement(written.session, ledger);
}

async function pruneLedger(ledger: SafetyLedgerV1, nowMs: number): Promise<SafetyLedgerReadResult> {
  const pruned = await pruneSafetyLedgerAfterReconciliation(readyLedger(ledger), nowMs);
  if (pruned.status === 'confirmed') return readyLedger(pruned.ledger);
  if (pruned.status === 'quarantined') return Object.freeze({ status: 'quarantined' });
  return Object.freeze({ status: 'unavailable', reason: 'storage-read-failed' });
}

async function clearAlarm(name: AlarmName): Promise<void> {
  try {
    if (name === SESSION_EXPIRY_ALARM) await chrome.alarms.clear('session-expiry');
    else if (name === LEDGER_CLEANUP_ALARM) await chrome.alarms.clear('ledger-cleanup');
    else await chrome.alarms.clear('attempt-watchdog');
  } catch {
    // A stale one-shot alarm is never authoritative.
  }
}

async function createAlarm(name: AlarmName, when: number): Promise<boolean> {
  if (!Number.isSafeInteger(when) || when <= 0) return false;
  try {
    if (name === SESSION_EXPIRY_ALARM) await chrome.alarms.create('session-expiry', { when });
    else if (name === LEDGER_CLEANUP_ALARM) await chrome.alarms.create('ledger-cleanup', { when });
    else await chrome.alarms.create('attempt-watchdog', { when });
    return true;
  } catch {
    return false;
  }
}

async function scheduleCanonical(session: SessionStateV1 | null, ledger: SafetyLedgerV1): Promise<void> {
  if (session?.state === 'staged') {
    await createAlarm(SESSION_EXPIRY_ALARM, session.effectiveExpiresAtMs);
  } else await clearAlarm(SESSION_EXPIRY_ALARM);
  if (session?.state === 'consuming' && session.attemptNotAfterMs > Date.now()) {
    await createAlarm(ATTEMPT_WATCHDOG_ALARM, session.attemptNotAfterMs);
  } else await clearAlarm(ATTEMPT_WATCHDOG_ALARM);
  const cleanup = nextSafetyLedgerCleanupAt(readyLedger(ledger));
  if (cleanup.status === 'ready' && cleanup.nextCleanupAt !== null) {
    await createAlarm(LEDGER_CLEANUP_ALARM, cleanup.nextCleanupAt);
  } else await clearAlarm(LEDGER_CLEANUP_ALARM);
}

async function reconcileLifecycle(schedule = true): Promise<CanonicalLifecycle> {
  const sessionRead = await readSessionState();
  let ledgerRead = await readSafetyLedger();
  if (sessionRead.status !== 'ready' || ledgerRead.status !== 'ready') {
    return Object.freeze({
      status: sessionRead.status === 'quarantined' || ledgerRead.status === 'quarantined'
        ? 'quarantined'
        : 'unavailable',
    });
  }
  let session = sessionRead.session;
  let ledger = ledgerRead.ledger;

  if (
    session !== null
    && session.state !== 'staged'
    && hasUnrelatedBlocker(ledger, session)
  ) return Object.freeze({ status: 'quarantined' });

  if (session?.state === 'settling') {
    const finished = await finishSettlement(session, ledger);
    if (finished.status !== 'ready') return finished;
    session = finished.session;
    ledger = finished.ledger;
  } else if (session?.state === 'arming') {
    const arming = session;
    const current = ledger.records.find((record) => record.packId === arming.envelope.packId);
    if (current !== undefined && !liveMatches(ledger, arming)) {
      return Object.freeze({ status: 'quarantined' });
    }
    const cancelled = await persistAndFinishSettlement(
      arming,
      cancellationIntent(arming),
      ledger,
    );
    if (cancelled.status !== 'ready') return cancelled;
    session = null;
    ledger = cancelled.ledger;
  } else if (session?.state === 'consuming') {
    if (!liveMatches(ledger, session)) return Object.freeze({ status: 'quarantined' });
  } else if (session?.state === 'staged') {
    const staged = session;
    const conflict = ledger.records.some((record) => (
      record.state !== 'replay' || record.packId === staged.envelope.packId
    ));
    if (conflict) return Object.freeze({ status: 'quarantined' });
  } else {
    const live = ledger.records.find((record) => record.state === 'unresolved-live');
    if (live?.state === 'unresolved-live') {
      const orphaned = await orphanUnresolvedLive(readyLedger(ledger), live, true);
      if (orphaned.status !== 'confirmed') return mutationFailure(orphaned);
      ledger = orphaned.ledger;
    }
  }

  ledgerRead = await pruneLedger(ledger, Date.now());
  if (ledgerRead.status !== 'ready') {
    return Object.freeze({ status: ledgerRead.status === 'quarantined' ? 'quarantined' : 'unavailable' });
  }
  ledger = ledgerRead.ledger;
  let stagedExpired = false;
  if (session?.state === 'staged' && Date.now() >= session.effectiveExpiresAtMs) {
    const removed = await removeSessionState();
    if (removed.status !== 'ready' || removed.session !== null) {
      return Object.freeze({ status: removed.status === 'quarantined' ? 'quarantined' : 'unavailable' });
    }
    session = null;
    stagedExpired = true;
  }
  if (schedule) {
    await scheduleCanonical(session, ledger);
    if (session?.state === 'staged' && Date.now() >= session.effectiveExpiresAtMs) {
      const removed = await removeSessionState();
      if (removed.status !== 'ready' || removed.session !== null) {
        return Object.freeze({
          status: removed.status === 'quarantined' ? 'quarantined' : 'unavailable',
        });
      }
      session = null;
      stagedExpired = true;
      await clearAlarm(SESSION_EXPIRY_ALARM);
    }
    ledgerRead = await pruneLedger(ledger, Date.now());
    if (ledgerRead.status !== 'ready') {
      return Object.freeze({
        status: ledgerRead.status === 'quarantined' ? 'quarantined' : 'unavailable',
      });
    }
    ledger = ledgerRead.ledger;
  }
  return Object.freeze({ status: 'ready', session, ledger, stagedExpired });
}

function checkedResponse(candidate: unknown, command: WorkerCommand): WorkerResponseV1 {
  return validateWorkerResponseForCommand(candidate, command)
    ?? buildFixedWorkerResponse(command, 'quarantined');
}

function warningResponse(command: WorkerCommand, warning: NeedsReviewSafetyRecordV1): WorkerResponseV1 {
  return checkedResponse({
    schema: WORKER_RESPONSE_SCHEMA,
    command,
    state: 'needs-review',
    warning: {
      state: 'needs-review',
      packId: warning.packId,
      replayUntil: warning.replayUntil,
      warningExpiresAt: warning.warningExpiresAt,
    },
  }, command);
}

function stagedResponse(
  command: 'preview-current-page' | 'load-reviewed-fields',
  session: StagedSessionStateV1,
): WorkerResponseV1 {
  return checkedResponse({
    schema: WORKER_RESPONSE_SCHEMA,
    command,
    state: 'staged',
    generation: session.generation,
    packId: session.envelope.packId,
    effectiveExpiresAtMs: session.effectiveExpiresAtMs,
  }, command);
}

async function invalidateStaged(
  command: 'preview-current-page' | 'fill-empty-reviewed-fields',
  code: 'source-unavailable' | 'source-binding-changed',
): Promise<WorkerResponseV1> {
  const removed = await removeSessionState();
  if (removed.status !== 'ready' || removed.session !== null) {
    return removed.status === 'quarantined'
      ? buildFixedWorkerResponse(command, 'quarantined')
      : buildRejectedWorkerResponse(command, 'storage-unavailable');
  }
  await clearAlarm(SESSION_EXPIRY_ALARM);
  return buildRejectedWorkerResponse(command, code);
}

async function expireStaged(
  command: 'preview-current-page' | 'load-reviewed-fields' | 'fill-empty-reviewed-fields'
    | 'clear-staged-fields',
): Promise<WorkerResponseV1> {
  const removed = await removeSessionState();
  if (removed.status !== 'ready' || removed.session !== null) {
    return removed.status === 'quarantined'
      ? buildFixedWorkerResponse(command, 'quarantined')
      : buildRejectedWorkerResponse(command, 'storage-unavailable');
  }
  await clearAlarm(SESSION_EXPIRY_ALARM);
  return buildFixedWorkerResponse(command, 'expired');
}

function fixedBlocker(command: WorkerCommand, lifecycle: CanonicalLifecycle): WorkerResponseV1 | null {
  if (lifecycle.status !== 'ready') {
    return lifecycle.status === 'quarantined'
      ? buildFixedWorkerResponse(command, 'quarantined')
      : buildRejectedWorkerResponse(command, 'storage-unavailable');
  }
  const blocker = lifecycle.ledger.records.find((record) => (
    record.state === 'unresolved-live'
    || record.state === 'unresolved-orphaned'
    || record.state === 'needs-review'
  ));
  if (blocker?.state === 'unresolved-live') return buildFixedWorkerResponse(command, 'unresolved-live');
  if (blocker?.state === 'unresolved-orphaned') {
    return buildFixedWorkerResponse(command, 'unresolved-orphaned');
  }
  if (blocker?.state === 'needs-review') return warningResponse(command, blocker);
  if (lifecycle.session?.state === 'consuming') {
    return buildFixedWorkerResponse(command, 'unresolved-live');
  }
  return null;
}

function readActiveTabId(value: unknown): number | null {
  try {
    if (!Array.isArray(value) || value.length !== 1) return null;
    const item = Object.getOwnPropertyDescriptor(value, '0');
    if (!item || !item.enumerable || !('value' in item) || typeof item.value !== 'object' || item.value === null) {
      return null;
    }
    const id = Object.getOwnPropertyDescriptor(item.value, 'id');
    return id && id.enumerable && 'value' in id && Number.isSafeInteger(id.value) && id.value >= 0
      ? id.value
      : null;
  } catch {
    return null;
  }
}

type TabUrlAuthority = Readonly<{
  protocol: 'http:' | 'https:';
  hostname: string;
  port: string;
  pathname: string;
  username?: '';
  password?: '';
  search?: string;
  hash?: '';
  allowedSearches?: readonly string[];
}>;

function tabMatchesUrl(value: unknown, expectedTabId: number, authority: TabUrlAuthority): boolean {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const id = Object.getOwnPropertyDescriptor(value, 'id');
    const url = Object.getOwnPropertyDescriptor(value, 'url');
    if (
      !id || !id.enumerable || !('value' in id) || id.value !== expectedTabId
      || !url || !url.enumerable || !('value' in url) || typeof url.value !== 'string'
    ) return false;
    const parsed = new URL(url.value);
    const searchMatches = authority.allowedSearches === undefined
      ? parsed.search === (authority.search ?? '')
      : authority.allowedSearches.includes(parsed.search);
    return parsed.protocol === authority.protocol
      && parsed.hostname === authority.hostname
      && parsed.port === authority.port
      && parsed.pathname === authority.pathname
      && parsed.username === ''
      && parsed.password === ''
      && searchMatches
      && parsed.hash === (authority.hash ?? '');
  } catch {
    return false;
  }
}

async function actionTabMatches(
  expectedTabId: number,
  authority: TabUrlAuthority,
): Promise<boolean> {
  try {
    const result = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (readActiveTabId(result) !== expectedTabId) return false;
    return retainedTabMatches(expectedTabId, authority);
  } catch {
    return false;
  }
}

async function retainedTabMatches(
  expectedTabId: number,
  authority: TabUrlAuthority,
): Promise<boolean> {
  try {
    return tabMatchesUrl(await chrome.tabs.get(expectedTabId), expectedTabId, authority);
  } catch {
    return false;
  }
}

function sourceTabUrlAuthority(deadline: number): TabUrlAuthority {
  return createSourceProbePlan(deadline).expectedLocation;
}

function destinationTabUrlAuthority(routeKey: string): TabUrlAuthority | null {
  const adapter = selectedDestinationAdapterRegistry.find((item) => item.routeKey === routeKey);
  if (!adapter) return null;
  if (adapter.enabled) return adapter.expectedLocation;
  return Object.freeze({
    protocol: adapter.destination.protocol,
    hostname: adapter.destination.hostname,
    port: adapter.destination.port,
    pathname: adapter.destination.pathname,
    username: '',
    password: '',
    search: '',
    hash: '',
  });
}

function nextOperationDeadline(nowMs: number, ...limits: number[]): number | null {
  const windowEnd = nowMs + OPERATION_WINDOW_MS;
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0 || !Number.isSafeInteger(windowEnd)) return null;
  const deadline = Math.min(windowEnd, ...limits);
  return Number.isSafeInteger(deadline) && deadline > nowMs ? deadline : null;
}

async function runSourcePreview(
  tabId: number,
  deadline: number,
  importedAtMs: number,
): Promise<SourcePreviewValidationResult | null> {
  try {
    const raw = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      world: 'ISOLATED',
      func: probeChallanSakshiSource,
      args: [createSourceProbePlan(deadline)],
    });
    return validateSourcePreviewInjectionResult(raw, {
      profile: __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__,
      sourceTabId: tabId,
      nowMs: Date.now(),
      importedAtMs,
    });
  } catch {
    return null;
  }
}

async function runSourceReprobe(
  source: Readonly<{ sourceTabId: number; importedAtMs: number }>,
  deadline: number,
  binding: SourcePreviewBindingV1,
): Promise<SourceReprobeValidationResult | null> {
  try {
    if (!(await retainedTabMatches(source.sourceTabId, sourceTabUrlAuthority(deadline)))) {
      return null;
    }
    const raw = await chrome.scripting.executeScript({
      target: { tabId: source.sourceTabId, frameIds: [0] },
      world: 'ISOLATED',
      func: probeChallanSakshiSource,
      args: [createSourceProbePlan(deadline)],
    });
    return validateSourceReprobeInjectionResult(raw, {
      profile: __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__,
      sourceTabId: source.sourceTabId,
      nowMs: Date.now(),
      importedAtMs: source.importedAtMs,
    }, binding);
  } catch {
    return null;
  }
}

function sourceBinding(session: StagedSessionStateV1 | ArmingSessionStateV1): SourcePreviewBindingV1 {
  return Object.freeze({
    schema: 'challansakshi.source-preview-binding/v1',
    sourceTabId: session.sourceTabId,
    sourceDocumentId: session.sourceDocumentId,
    canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelopeCore(session.envelope),
    previewNotAfterMs: Date.parse(session.envelope.expiresAt),
  });
}

function enabledAdapterExpiry(adapter: EnabledDestinationAdapterV1): number | null {
  const value = Date.parse(adapter.expiresAt);
  return Number.isSafeInteger(value) && value > Date.now() ? value : null;
}

function makePreviewPlan(
  envelope: CanonicalExtensionHandoffEnvelope,
  effectiveExpiresAtMs: number,
): WorkerPreviewPlanResult {
  const nowMs = Date.now();
  if (nowMs >= effectiveExpiresAtMs) return Object.freeze({ status: 'expired' });
  const selected = selectedDestinationAdapterRegistry.find((adapter) => (
    adapter.routeKey === envelope.routeKey
  ));
  const adapterExpiry = selected?.enabled ? enabledAdapterExpiry(selected) : undefined;
  if (adapterExpiry === null) {
    return Object.freeze({ status: 'adapter-expired' });
  }
  const deadline = adapterExpiry === undefined
    ? nextOperationDeadline(nowMs, effectiveExpiresAtMs)
    : nextOperationDeadline(nowMs, effectiveExpiresAtMs, adapterExpiry);
  return deadline === null
    ? Object.freeze({ status: 'rejected' })
    : buildDestinationPreviewPlan({ envelope, effectiveExpiresAtMs, operationNotAfterMs: deadline });
}

function stagedPreviewTiming(
  session: StagedSessionStateV1,
  previewPlan: BuiltPreviewPlan,
): StagedPreviewTiming {
  const nowMs = Date.now();
  if (nowMs >= session.effectiveExpiresAtMs) return 'effective-expired';
  const adapterExpiresAtMs = Date.parse(previewPlan.adapter.expiresAt);
  if (!isPositiveTime(adapterExpiresAtMs) || nowMs >= adapterExpiresAtMs) {
    return 'adapter-expired';
  }
  return nowMs >= previewPlan.plan.operationNotAfterMs ? 'operation-expired' : 'current';
}

function routeFailure(
  command: WorkerCommand,
  result: WorkerPlanResult,
): WorkerResponseV1 | null {
  if (result.status === 'expired') return buildFixedWorkerResponse(command, 'expired');
  if (result.status === 'adapter-expired') return buildFixedWorkerResponse(command, 'adapter-disabled');
  if (result.status === 'adapter-disabled') return buildFixedWorkerResponse(command, 'adapter-disabled');
  if (result.status === 'unsupported') return buildFixedWorkerResponse(command, 'unsupported');
  if (result.status === 'rejected') return buildFixedWorkerResponse(command, 'unsupported');
  return null;
}

function newOpaque(exclusions: readonly string[] = []): string | null {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return /^[0-9a-f]{32}$/.test(value) && !exclusions.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function sourcePreviewResponse(
  result: Extract<SourcePreviewValidationResult, { status: 'accepted' }>,
): WorkerResponseV1 {
  return checkedResponse({
    schema: WORKER_RESPONSE_SCHEMA,
    command: 'preview-current-page',
    state: 'source-preview',
    preview: {
      language: result.envelope.language,
      simpleMode: result.envelope.simpleMode,
      destinationName: destinationNameForRoute(result.envelope.routeKey),
      routeKey: result.envelope.routeKey,
      routeRegistryVersion: result.envelope.routeRegistryVersion,
      adapterContractVersion: result.envelope.adapterContractVersion,
      expiresAt: result.envelope.expiresAt,
      description: result.envelope.description,
      categoryPresentation: result.envelope.issueCode === 'four-wheeler-on-two-wheeler'
        ? CATEGORY_PRESENTATION
        : null,
    },
    sourcePreviewBinding: result.binding,
  }, 'preview-current-page');
}

function destinationPreviewResponse(
  session: StagedSessionStateV1,
  plan: DestinationPreviewPlanV1,
  adapter: EnabledDestinationAdapterV1,
): WorkerResponseV1 {
  return checkedResponse({
    schema: WORKER_RESPONSE_SCHEMA,
    command: 'preview-current-page',
    state: 'destination-preview',
    generation: session.generation,
    packId: session.envelope.packId,
    effectiveExpiresAtMs: session.effectiveExpiresAtMs,
    preview: {
      language: session.envelope.language,
      simpleMode: session.envelope.simpleMode,
      domain: `${adapter.destination.hostname}${adapter.destination.port ? `:${adapter.destination.port}` : ''}`,
      purpose: DESTINATION_PURPOSE,
      adapterId: adapter.id,
      adapterRevision: adapter.adapterRevision,
      lastVerifiedAt: adapter.lastVerifiedAt,
      adapterExpiresAt: adapter.expiresAt,
      description: session.envelope.description,
      categoryPresentation: CATEGORY_PRESENTATION,
    },
  }, 'preview-current-page');
}

async function previewCurrentPage(
  request: Extract<WorkerRequestV1, { command: 'preview-current-page' }>,
): Promise<WorkerResponseV1> {
  const lifecycle = await reconcileLifecycle();
  const blocker = fixedBlocker(request.command, lifecycle);
  if (blocker) return blocker;
  if (lifecycle.status !== 'ready') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (lifecycle.stagedExpired) return buildFixedWorkerResponse(request.command, 'expired');
  const stagedForUrl = lifecycle.session?.state === 'staged' ? lifecycle.session : null;
  const actionUrlAuthority = stagedForUrl !== null && request.actionTabId !== stagedForUrl.sourceTabId
    ? destinationTabUrlAuthority(stagedForUrl.envelope.routeKey)
    : sourceTabUrlAuthority(stagedForUrl?.effectiveExpiresAtMs ?? Date.now());
  const actionTabMatched = actionUrlAuthority !== null
    && await actionTabMatches(request.actionTabId, actionUrlAuthority);
  if (
    lifecycle.session?.state === 'staged'
    && Date.now() >= lifecycle.session.effectiveExpiresAtMs
  ) return expireStaged(request.command);
  if (!actionTabMatched) {
    if (lifecycle.session?.state === 'staged') return stagedResponse(request.command, lifecycle.session);
    return buildRejectedWorkerResponse(request.command, 'action-tab-mismatch');
  }

  if (lifecycle.session?.state === 'staged') {
    let staged = lifecycle.session;
    if (Date.now() >= staged.effectiveExpiresAtMs) return expireStaged(request.command);
    if (
      request.actionTabId === staged.sourceTabId
      || (staged.destination !== null && request.actionTabId !== staged.destination.destinationTabId)
    ) return stagedResponse(request.command, staged);
    const previewPlan = makePreviewPlan(staged.envelope, staged.effectiveExpiresAtMs);
    if (previewPlan.status === 'expired') return expireStaged(request.command);
    const route = routeFailure(request.command, previewPlan);
    if (route || previewPlan.status !== 'built') return route ?? buildFixedWorkerResponse(request.command, 'unsupported');
    const deadline = previewPlan.plan.operationNotAfterMs;
    const rechecked = await runSourceReprobe(staged, deadline, sourceBinding(staged));
    const sourceTiming = stagedPreviewTiming(staged, previewPlan);
    if (sourceTiming === 'effective-expired') return expireStaged(request.command);
    if (sourceTiming === 'adapter-expired') {
      return buildFixedWorkerResponse(request.command, 'adapter-disabled');
    }
    if (sourceTiming === 'operation-expired') return stagedResponse(request.command, staged);
    if (
      !rechecked
      || rechecked.status !== 'accepted'
      || rechecked.effectiveExpiresAtMs !== staged.effectiveExpiresAtMs
    ) {
      if (rechecked?.status === 'rejected' && rechecked.reason === 'preview-expired') {
        return expireStaged(request.command);
      }
      return invalidateStaged(
        request.command,
        rechecked?.status === 'accepted'
          || rechecked?.reason === 'source-document-mismatch'
          || rechecked?.reason === 'source-binding-mismatch'
          || rechecked?.reason === 'invalid-envelope'
          ? 'source-binding-changed'
          : 'source-unavailable',
      );
    }
    let destinationRaw: unknown;
    let destinationTransportFailed = false;
    try {
      destinationRaw = await chrome.scripting.executeScript({
        target: { tabId: request.actionTabId, frameIds: [0] },
        world: 'ISOLATED',
        func: selectedDestinationInjectedFunction!,
        args: [previewPlan.plan],
      });
    } catch {
      destinationTransportFailed = true;
    }
    const destinationTiming = stagedPreviewTiming(staged, previewPlan);
    if (destinationTiming === 'effective-expired') return expireStaged(request.command);
    if (destinationTiming === 'adapter-expired') {
      return buildFixedWorkerResponse(request.command, 'adapter-disabled');
    }
    if (destinationTiming === 'operation-expired') return stagedResponse(request.command, staged);
    if (destinationTransportFailed) return stagedResponse(request.command, staged);
    const destination = validateDestinationPreviewInjectionResult(destinationRaw);
    if (destination.status !== 'accepted') return stagedResponse(request.command, staged);
    staged = Object.freeze({
      schema: SESSION_STATE_SCHEMA,
      state: 'staged',
      generation: staged.generation,
      envelope: staged.envelope,
      importedAtMs: staged.importedAtMs,
      effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
      sourceTabId: staged.sourceTabId,
      sourceDocumentId: staged.sourceDocumentId,
      destination: Object.freeze({
        destinationTabId: request.actionTabId,
        destinationDocumentId: destination.documentId,
      }),
    });
    const stored = await writeSessionState(staged);
    if (stored.status !== 'ready' || stored.session?.state !== 'staged') {
      return stored.status === 'quarantined'
        ? buildFixedWorkerResponse(request.command, 'quarantined')
        : buildRejectedWorkerResponse(request.command, 'storage-unavailable');
    }
    const storedTiming = stagedPreviewTiming(stored.session, previewPlan);
    if (storedTiming === 'effective-expired') return expireStaged(request.command);
    if (storedTiming === 'adapter-expired') {
      return buildFixedWorkerResponse(request.command, 'adapter-disabled');
    }
    if (storedTiming === 'operation-expired') return stagedResponse(request.command, stored.session);
    return destinationPreviewResponse(stored.session, previewPlan.plan, previewPlan.adapter);
  }

  const nowMs = Date.now();
  const deadline = nextOperationDeadline(nowMs, nowMs + OPERATION_WINDOW_MS);
  if (deadline === null) return buildRejectedWorkerResponse(request.command, 'operation-failed');
  const source = await runSourcePreview(request.actionTabId, deadline, nowMs);
  if (!source || source.status !== 'accepted') {
    return buildRejectedWorkerResponse(request.command, source?.reason === 'source-probe-rejected'
      ? 'source-preview-rejected'
      : 'source-unavailable');
  }
  const currentLedger = await pruneLedger(lifecycle.ledger, Date.now());
  if (currentLedger.status === 'quarantined') {
    return buildFixedWorkerResponse(request.command, 'quarantined');
  }
  if (currentLedger.status === 'unavailable') {
    return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  const decision = assessSafetyLedgerLoad(readyLedger(currentLedger.ledger), source.envelope.packId);
  if (decision.status === 'quarantined') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (decision.status === 'unavailable') return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  if (decision.status === 'blocked') {
    return buildRejectedWorkerResponse(request.command,
      decision.reason === 'capacity-reached' ? 'ledger-capacity-reached' : 'replay-blocked');
  }
  const previewPlan = makePreviewPlan(source.envelope, source.effectiveExpiresAtMs);
  const route = routeFailure(request.command, previewPlan);
  if (route) return route;
  return sourcePreviewResponse(source);
}

async function loadReviewedFields(
  request: Extract<WorkerRequestV1, { command: 'load-reviewed-fields' }>,
): Promise<WorkerResponseV1> {
  if (request.actionTabId !== request.sourcePreviewBinding.sourceTabId) {
    return buildRejectedWorkerResponse(request.command, 'action-tab-mismatch');
  }
  const lifecycle = await reconcileLifecycle();
  const blocker = fixedBlocker(request.command, lifecycle);
  if (blocker) return blocker;
  if (lifecycle.status !== 'ready') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (lifecycle.stagedExpired) return buildFixedWorkerResponse(request.command, 'expired');
  if (
    lifecycle.session?.state === 'staged'
    && Date.now() >= lifecycle.session.effectiveExpiresAtMs
  ) return expireStaged(request.command);
  if (Date.now() >= request.sourcePreviewBinding.previewNotAfterMs) {
    return buildFixedWorkerResponse(request.command, 'expired');
  }
  const actionTabMatched = await actionTabMatches(
    request.actionTabId,
    sourceTabUrlAuthority(request.sourcePreviewBinding.previewNotAfterMs),
  );
  if (
    lifecycle.session?.state === 'staged'
    && Date.now() >= lifecycle.session.effectiveExpiresAtMs
  ) return expireStaged(request.command);
  if (Date.now() >= request.sourcePreviewBinding.previewNotAfterMs) {
    return buildFixedWorkerResponse(request.command, 'expired');
  }
  if (!actionTabMatched) {
    return buildRejectedWorkerResponse(request.command, 'action-tab-mismatch');
  }
  const nowMs = Date.now();
  const deadline = nextOperationDeadline(nowMs, request.sourcePreviewBinding.previewNotAfterMs);
  if (deadline === null) return buildFixedWorkerResponse(request.command, 'expired');
  let raw: unknown;
  let sourceTransportFailed = false;
  try {
    raw = await chrome.scripting.executeScript({
      target: { tabId: request.actionTabId, frameIds: [0] },
      world: 'ISOLATED',
      func: probeChallanSakshiSource,
      args: [createSourceProbePlan(deadline)],
    });
  } catch {
    sourceTransportFailed = true;
  }
  if (
    lifecycle.session?.state === 'staged'
    && Date.now() >= lifecycle.session.effectiveExpiresAtMs
  ) return expireStaged(request.command);
  if (Date.now() >= request.sourcePreviewBinding.previewNotAfterMs) {
    return buildFixedWorkerResponse(request.command, 'expired');
  }
  if (sourceTransportFailed) {
    return buildRejectedWorkerResponse(request.command, 'source-unavailable');
  }
  const source = validateSourceReprobeInjectionResult(raw, {
    profile: __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__,
    sourceTabId: request.actionTabId,
    nowMs: Date.now(),
    importedAtMs: nowMs,
  }, request.sourcePreviewBinding);
  if (source.status !== 'accepted') {
    if (source.reason === 'preview-expired') return buildFixedWorkerResponse(request.command, 'expired');
    return buildRejectedWorkerResponse(request.command,
      source.reason === 'source-probe-rejected' ? 'source-preview-rejected' : 'source-binding-changed');
  }
  const currentLedger = await pruneLedger(lifecycle.ledger, Date.now());
  if (currentLedger.status === 'quarantined') {
    return buildFixedWorkerResponse(request.command, 'quarantined');
  }
  if (currentLedger.status === 'unavailable') {
    return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  const decision = assessSafetyLedgerLoad(readyLedger(currentLedger.ledger), source.envelope.packId);
  if (decision.status === 'quarantined') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (decision.status === 'unavailable') return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  if (decision.status === 'blocked') {
    return buildRejectedWorkerResponse(request.command,
      decision.reason === 'capacity-reached' ? 'ledger-capacity-reached' : 'replay-blocked');
  }
  const previewPlan = makePreviewPlan(source.envelope, source.effectiveExpiresAtMs);
  const route = routeFailure(request.command, previewPlan);
  if (route) return route;
  if (lifecycle.session?.state === 'staged') {
    const existingBinding = sourceBinding(lifecycle.session);
    if (
      lifecycle.session.envelope.packId === source.envelope.packId
      && lifecycle.session.effectiveExpiresAtMs === source.effectiveExpiresAtMs
      && JSON.stringify(lifecycle.session.envelope) === JSON.stringify(source.envelope)
      && JSON.stringify(existingBinding) === JSON.stringify(request.sourcePreviewBinding)
    ) return stagedResponse(request.command, lifecycle.session);
  }
  const generation = newOpaque([
    source.envelope.packId, source.envelope.resultRevisionId, source.envelope.packRevisionId,
  ]);
  if (generation === null) return buildRejectedWorkerResponse(request.command, 'secure-random-unavailable');
  const staged: StagedSessionStateV1 = Object.freeze({
    schema: SESSION_STATE_SCHEMA,
    state: 'staged',
    generation,
    envelope: source.envelope,
    importedAtMs: nowMs,
    effectiveExpiresAtMs: source.effectiveExpiresAtMs,
    sourceTabId: request.actionTabId,
    sourceDocumentId: request.sourcePreviewBinding.sourceDocumentId,
    destination: null,
  });
  const stored = await writeSessionState(staged);
  if (stored.status !== 'ready' || stored.session?.state !== 'staged') {
    return stored.status === 'quarantined'
      ? buildFixedWorkerResponse(request.command, 'quarantined')
      : buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  if (Date.now() >= stored.session.effectiveExpiresAtMs) return expireStaged(request.command);
  await clearAlarm(SESSION_EXPIRY_ALARM);
  if (Date.now() >= stored.session.effectiveExpiresAtMs) return expireStaged(request.command);
  const alarmCreated = await createAlarm(SESSION_EXPIRY_ALARM, staged.effectiveExpiresAtMs);
  if (!alarmCreated) {
    const expired = Date.now() >= stored.session.effectiveExpiresAtMs;
    const removed = await removeSessionState();
    return removed.status === 'ready' && removed.session === null
      ? expired
        ? buildFixedWorkerResponse(request.command, 'expired')
        : buildRejectedWorkerResponse(request.command, 'operation-failed')
      : removed.status === 'quarantined'
        ? buildFixedWorkerResponse(request.command, 'quarantined')
        : buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  if (Date.now() >= stored.session.effectiveExpiresAtMs) return expireStaged(request.command);
  return stagedResponse(request.command, stored.session);
}

async function clearStagedFields(
  request: Extract<WorkerRequestV1, { command: 'clear-staged-fields' }>,
): Promise<WorkerResponseV1> {
  const lifecycle = await reconcileLifecycle();
  const blocker = fixedBlocker(request.command, lifecycle);
  if (blocker) return blocker;
  if (lifecycle.status !== 'ready') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (lifecycle.stagedExpired) return buildFixedWorkerResponse(request.command, 'expired');
  if (lifecycle.session?.state !== 'staged') {
    return buildRejectedWorkerResponse(request.command, 'no-staged-fields');
  }
  if (
    lifecycle.session.generation !== request.generation
    || lifecycle.session.envelope.packId !== request.packId
    || lifecycle.session.effectiveExpiresAtMs !== request.effectiveExpiresAtMs
  ) return buildRejectedWorkerResponse(request.command, 'stale-session');
  const removed = await removeSessionState();
  if (removed.status !== 'ready' || removed.session !== null) {
    return removed.status === 'quarantined'
      ? buildFixedWorkerResponse(request.command, 'quarantined')
      : buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  await clearAlarm(SESSION_EXPIRY_ALARM);
  return buildFixedWorkerResponse(request.command, 'empty');
}

async function cancelBeforeDispatch(
  session: ArmingSessionStateV1 | ConsumingSessionStateV1,
  failure: WorkerResponseV1,
): Promise<WorkerResponseV1> {
  const ledger = await readSafetyLedger();
  if (ledger.status !== 'ready') {
    return ledger.status === 'quarantined'
      ? buildFixedWorkerResponse('fill-empty-reviewed-fields', 'quarantined')
      : buildRejectedWorkerResponse('fill-empty-reviewed-fields', 'storage-unavailable');
  }
  const settled = await persistAndFinishSettlement(session, cancellationIntent(session), ledger.ledger);
  if (settled.status !== 'ready') {
    return settled.status === 'quarantined'
      ? buildFixedWorkerResponse('fill-empty-reviewed-fields', 'quarantined')
      : buildRejectedWorkerResponse('fill-empty-reviewed-fields', 'storage-unavailable');
  }
  await scheduleCanonical(null, settled.ledger);
  return failure;
}

async function completeFill(
  consuming: ConsumingSessionStateV1,
  raw: unknown,
  transportFailed: boolean,
): Promise<WorkerResponseV1> {
  const lifecycle = await reconcileLifecycle(false);
  if (lifecycle.status !== 'ready') {
    return lifecycle.status === 'quarantined'
      ? buildFixedWorkerResponse('fill-empty-reviewed-fields', 'quarantined')
      : buildRejectedWorkerResponse('fill-empty-reviewed-fields', 'storage-unavailable');
  }
  const session = lifecycle.session;
  if (!session || session.state !== 'consuming' || JSON.stringify(session) !== JSON.stringify(consuming)) {
    if (closedInFlightTuples.delete(inFlightTupleKey(consuming))) {
      return buildRejectedWorkerResponse('fill-empty-reviewed-fields', 'operation-failed');
    }
    const record = lifecycle.ledger.records.find((item) => item.packId === consuming.packId);
    if (record?.state === 'unresolved-orphaned') {
      return buildFixedWorkerResponse('fill-empty-reviewed-fields', 'unresolved-orphaned');
    }
    if (record?.state === 'replay' && record.outcome === 'closed-unresolved') {
      return buildRejectedWorkerResponse('fill-empty-reviewed-fields', 'operation-failed');
    }
    return buildFixedWorkerResponse('fill-empty-reviewed-fields', 'quarantined');
  }
  if (transportFailed) return buildFixedWorkerResponse('fill-empty-reviewed-fields', 'unresolved-live');
  const validated = validateDestinationFillInjectionResult(
    raw,
    consuming.destinationDocumentId,
    consuming.attemptId,
  );
  if (validated.status !== 'accepted') {
    return buildFixedWorkerResponse('fill-empty-reviewed-fields', 'unresolved-live');
  }
  const settledAtMs = Date.now();
  const timelyComplete = validated.result.status === 'complete'
    && settledAtMs < consuming.attemptNotAfterMs;
  const warningExpiresAt = settledAtMs + NEEDS_REVIEW_WARNING_LIFETIME_MS;
  if (!Number.isSafeInteger(warningExpiresAt) || warningExpiresAt <= consuming.replayUntil) {
    return buildFixedWorkerResponse('fill-empty-reviewed-fields', 'unresolved-live');
  }
  const terminal = timelyComplete
    ? Object.freeze({
      state: 'replay' as const,
      packId: consuming.packId,
      replayUntil: consuming.replayUntil,
      outcome: 'complete' as const,
    })
    : Object.freeze({
      state: 'needs-review' as const,
      packId: consuming.packId,
      replayUntil: consuming.replayUntil,
      warningExpiresAt,
    });
  const intended: SettlementIntentV1 = Object.freeze({
    cause: 'injection-result',
    terminal,
  });
  const finished = await persistAndFinishSettlement(consuming, intended, lifecycle.ledger);
  if (finished.status !== 'ready') {
    return finished.status === 'quarantined'
      ? buildFixedWorkerResponse('fill-empty-reviewed-fields', 'quarantined')
      : buildFixedWorkerResponse('fill-empty-reviewed-fields', 'unresolved-live');
  }
  const pruned = await pruneLedger(finished.ledger, Date.now());
  const finalLedger = pruned.status === 'ready' ? pruned.ledger : finished.ledger;
  await scheduleCanonical(null, finalLedger);
  if (timelyComplete) return buildFixedWorkerResponse('fill-empty-reviewed-fields', 'success');
  const currentLedger = await pruneLedger(finalLedger, Date.now());
  if (currentLedger.status === 'quarantined') {
    return buildFixedWorkerResponse('fill-empty-reviewed-fields', 'quarantined');
  }
  if (currentLedger.status === 'unavailable') {
    return buildRejectedWorkerResponse('fill-empty-reviewed-fields', 'storage-unavailable');
  }
  const warning = terminal as NeedsReviewSafetyRecordV1;
  const warningStillCurrent = currentLedger.ledger.records.some((record) => (
    record.state === 'needs-review'
    && JSON.stringify(record) === JSON.stringify(warning)
  ));
  if (!warningStillCurrent) {
    return buildRejectedWorkerResponse('fill-empty-reviewed-fields', 'operation-failed');
  }
  const code = validated.result.status === 'partial'
    ? 'partial'
    : validated.result.status === 'complete'
      ? 'late-complete'
      : 'indeterminate';
  return checkedResponse({
    schema: WORKER_RESPONSE_SCHEMA,
    command: 'fill-empty-reviewed-fields',
    state: code === 'partial' ? 'partial' : 'needs-review',
    code,
    warning,
  }, 'fill-empty-reviewed-fields');
}

async function prepareFillDispatch(
  request: Extract<WorkerRequestV1, { command: 'fill-empty-reviewed-fields' }>,
): Promise<WorkerResponseV1 | PreparedFillDispatch> {
  const lifecycle = await reconcileLifecycle();
  const blocker = fixedBlocker(request.command, lifecycle);
  if (blocker) return blocker;
  if (lifecycle.status !== 'ready') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (lifecycle.stagedExpired) return buildFixedWorkerResponse(request.command, 'expired');
  let staged = lifecycle.session?.state === 'staged' ? lifecycle.session : null;
  if (!staged) return buildRejectedWorkerResponse(request.command, 'no-staged-fields');
  if (Date.now() >= staged.effectiveExpiresAtMs) return expireStaged(request.command);
  if (
    staged.generation !== request.generation
    || staged.envelope.packId !== request.packId
    || staged.effectiveExpiresAtMs !== request.effectiveExpiresAtMs
  ) return buildRejectedWorkerResponse(request.command, 'stale-session');
  const previewPlan = makePreviewPlan(staged.envelope, staged.effectiveExpiresAtMs);
  if (previewPlan.status === 'expired') return expireStaged(request.command);
  const route = routeFailure(request.command, previewPlan);
  if (route || previewPlan.status !== 'built') {
    return route ?? buildFixedWorkerResponse(request.command, 'unsupported');
  }
  if (staged.destination === null) {
    return buildRejectedWorkerResponse(request.command, 'destination-not-ready');
  }
  const actionTabMatched = await actionTabMatches(
    request.actionTabId,
    previewPlan.adapter.expectedLocation,
  );
  if (Date.now() >= staged.effectiveExpiresAtMs) return expireStaged(request.command);
  if (!actionTabMatched || request.actionTabId !== staged.destination.destinationTabId) {
    return buildRejectedWorkerResponse(request.command, 'action-tab-mismatch');
  }
  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);
  const sourceImportedAtMs = staged.importedAtMs;
  const source = await runSourceReprobe(staged, previewPlan.plan.operationNotAfterMs, sourceAuthorization);
  const sourceTiming = stagedPreviewTiming(staged, previewPlan);
  if (sourceTiming === 'effective-expired') return expireStaged(request.command);
  if (sourceTiming === 'adapter-expired') {
    return buildFixedWorkerResponse(request.command, 'adapter-disabled');
  }
  if (sourceTiming === 'operation-expired') {
    return invalidateStaged(request.command, 'source-unavailable');
  }
  if (
    !source
    || source.status !== 'accepted'
    || source.effectiveExpiresAtMs !== staged.effectiveExpiresAtMs
  ) {
    if (source?.status === 'rejected' && source.reason === 'preview-expired') {
      return expireStaged(request.command);
    }
    return invalidateStaged(
      request.command,
      source?.status === 'accepted'
        || source?.reason === 'source-binding-mismatch'
        || source?.reason === 'source-document-mismatch'
        || source?.reason === 'invalid-envelope'
        ? 'source-binding-changed'
        : 'source-unavailable',
    );
  }
  let destinationRaw: unknown;
  let destinationTransportFailed = false;
  try {
    destinationRaw = await chrome.scripting.executeScript({
      target: { tabId: staged.destination.destinationTabId, frameIds: [0] },
      world: 'ISOLATED',
      func: selectedDestinationInjectedFunction!,
      args: [previewPlan.plan],
    });
  } catch {
    destinationTransportFailed = true;
  }
  const destinationTiming = stagedPreviewTiming(staged, previewPlan);
  if (destinationTiming === 'effective-expired') return expireStaged(request.command);
  if (destinationTiming === 'adapter-expired') {
    return buildFixedWorkerResponse(request.command, 'adapter-disabled');
  }
  if (destinationTiming === 'operation-expired' || destinationTransportFailed) {
    return buildRejectedWorkerResponse(request.command, 'destination-not-ready');
  }
  const preflight = validateDestinationRepreflightInjectionResult(
    destinationRaw,
    staged.destination.destinationDocumentId,
  );
  if (preflight.status !== 'accepted') {
    return buildRejectedWorkerResponse(request.command, 'destination-not-ready');
  }
  const attemptedAtMs = Date.now();
  const adapterExpiresAtMs = Date.parse(previewPlan.adapter.expiresAt);
  const attemptNotAfterMs = nextOperationDeadline(
    attemptedAtMs,
    staged.effectiveExpiresAtMs,
    adapterExpiresAtMs,
  );
  if (attemptNotAfterMs === null) {
    if (attemptedAtMs >= staged.effectiveExpiresAtMs) return expireStaged(request.command);
    if (!isPositiveTime(adapterExpiresAtMs) || attemptedAtMs >= adapterExpiresAtMs) {
      return buildFixedWorkerResponse(request.command, 'adapter-disabled');
    }
    return buildRejectedWorkerResponse(request.command, 'operation-failed');
  }
  const armNonce = newOpaque([staged.generation, staged.envelope.packId]);
  const attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);
  if (armNonce === null || attemptId === null) {
    return buildRejectedWorkerResponse(request.command, 'secure-random-unavailable');
  }
  const fillBuilt = buildDestinationFillPlan({
    envelope: staged.envelope,
    effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
    operationNotAfterMs: attemptNotAfterMs,
    attemptId,
  });
  const fillRoute = routeFailure(request.command, fillBuilt);
  if (fillRoute || fillBuilt.status !== 'built') {
    return fillRoute ?? buildRejectedWorkerResponse(request.command, 'operation-failed');
  }
  let arming: ArmingSessionStateV1 | null = Object.freeze({
    schema: SESSION_STATE_SCHEMA,
    state: 'arming',
    generation: staged.generation,
    envelope: staged.envelope,
    importedAtMs: staged.importedAtMs,
    effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
    sourceTabId: staged.sourceTabId,
    sourceDocumentId: staged.sourceDocumentId,
    destination: staged.destination,
    armNonce,
    attemptId,
    replayUntil: staged.effectiveExpiresAtMs,
    attemptNotAfterMs,
  });
  const armedSession = await writeSessionState(arming);
  if (armedSession.status !== 'ready' || armedSession.session?.state !== 'arming') {
    return armedSession.status === 'quarantined'
      ? buildFixedWorkerResponse(request.command, 'quarantined')
      : buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  const live = liveFromSession(arming);
  const armedLedger = await armUnresolvedLive(readyLedger(lifecycle.ledger), live);
  if (armedLedger.status !== 'confirmed') {
    const cancelled = await cancelBeforeDispatch(
      arming,
      buildRejectedWorkerResponse(request.command, 'operation-failed'),
    );
    return armedLedger.status === 'quarantined'
      ? buildFixedWorkerResponse(request.command, 'quarantined')
      : cancelled;
  }
  const consuming: ConsumingSessionStateV1 = Object.freeze({
    schema: SESSION_STATE_SCHEMA,
    state: 'consuming',
    generation: arming.generation,
    armNonce: arming.armNonce,
    packId: arming.envelope.packId,
    attemptId: arming.attemptId,
    replayUntil: arming.replayUntil,
    attemptNotAfterMs: arming.attemptNotAfterMs,
    destinationTabId: arming.destination.destinationTabId,
    destinationDocumentId: arming.destination.destinationDocumentId,
  });
  const consumed = await writeSessionState(consuming);
  if (consumed.status !== 'ready' || consumed.session?.state !== 'consuming') {
    return cancelBeforeDispatch(arming, buildRejectedWorkerResponse(request.command, 'operation-failed'));
  }
  staged = null;
  arming = null;
  await clearAlarm(SESSION_EXPIRY_ALARM);
  await clearAlarm(ATTEMPT_WATCHDOG_ALARM);
  if (!(await createAlarm(ATTEMPT_WATCHDOG_ALARM, consuming.attemptNotAfterMs))) {
    return cancelBeforeDispatch(consuming, buildRejectedWorkerResponse(request.command, 'operation-failed'));
  }
  return Object.freeze({
    status: 'prepared',
    consuming,
    fillPlan: fillBuilt.plan,
    sourceAuthorization,
    sourceImportedAtMs,
  });
}

async function fillEmptyReviewedFields(
  request: Extract<WorkerRequestV1, { command: 'fill-empty-reviewed-fields' }>,
  deliver: (response: WorkerResponseV1, expectedCommand: WorkerCommand | null) => void,
): Promise<RequestResult> {
  let prepared: PreparedFillDispatch | null = null;
  {
    const preparationResult = await prepareFillDispatch(request);
    if (!('status' in preparationResult) || preparationResult.status !== 'prepared') {
      return preparationResult as WorkerResponseV1;
    }
    prepared = preparationResult as PreparedFillDispatch;
  }
  const consuming = prepared.consuming;
  const fillPlan = prepared.fillPlan;
  const sourceImportedAtMs = prepared.sourceImportedAtMs;
  let sourceAuthorization: SourcePreviewBindingV1 | null = prepared.sourceAuthorization;
  prepared = null;
  let finalSource = await runSourceReprobe(
    Object.freeze({
      sourceTabId: sourceAuthorization.sourceTabId,
      importedAtMs: sourceImportedAtMs,
    }),
    consuming.attemptNotAfterMs,
    sourceAuthorization,
  );
  sourceAuthorization = null;
  if (!finalSource || finalSource.status !== 'accepted') {
    const expired = Date.now() >= consuming.attemptNotAfterMs
      || (finalSource?.status === 'rejected' && finalSource.reason === 'preview-expired');
    finalSource = null;
    return cancelBeforeDispatch(
      consuming,
      expired
        ? buildFixedWorkerResponse(request.command, 'expired')
        : buildRejectedWorkerResponse(request.command, 'source-binding-changed'),
    );
  }
  if (Date.now() >= consuming.attemptNotAfterMs) {
    finalSource = null;
    return cancelBeforeDispatch(
      consuming,
      buildFixedWorkerResponse(request.command, 'expired'),
    );
  }
  if (finalSource.effectiveExpiresAtMs !== consuming.replayUntil) {
    finalSource = null;
    return cancelBeforeDispatch(consuming, buildRejectedWorkerResponse(request.command, 'source-binding-changed'));
  }
  finalSource = null;
  const destinationStillActive = await actionTabMatches(
    consuming.destinationTabId,
    fillPlan.expectedLocation,
  );
  const attemptExpired = Date.now() >= consuming.attemptNotAfterMs;
  if (!destinationStillActive || attemptExpired) {
    return cancelBeforeDispatch(
      consuming,
      attemptExpired
        ? buildFixedWorkerResponse(request.command, 'expired')
        : buildRejectedWorkerResponse(request.command, 'action-tab-mismatch'),
    );
  }
  let dispatch: Promise<unknown>;
  try {
    dispatch = chrome.scripting.executeScript({
      target: { tabId: consuming.destinationTabId, documentIds: [consuming.destinationDocumentId] },
      world: 'ISOLATED',
      func: selectedDestinationInjectedFunction!,
      args: [fillPlan],
    });
  } catch {
    dispatch = Promise.reject(new Error('dispatch-failed'));
  }
  void dispatch.then(
    (raw) => enqueueLifecycle(() => completeFill(consuming, raw, false)),
    () => enqueueLifecycle(() => completeFill(consuming, null, true)),
  ).then((response) => deliver(response, request.command), () => deliver(
    buildRejectedWorkerResponse(request.command, 'operation-failed'),
    request.command,
  ));
  return Object.freeze({ deferred: true });
}

async function acknowledgeInspection(
  request: Extract<WorkerRequestV1, { command: 'acknowledge-affected-person-inspection' }>,
): Promise<WorkerResponseV1> {
  const lifecycle = await reconcileLifecycle();
  if (lifecycle.status !== 'ready') {
    return lifecycle.status === 'quarantined'
      ? buildFixedWorkerResponse(request.command, 'quarantined')
      : buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  const unresolved = lifecycle.ledger.records.find((record) => (
    record.state === 'unresolved-live' || record.state === 'unresolved-orphaned'
  ));
  if (unresolved?.state === 'unresolved-live') return buildFixedWorkerResponse(request.command, 'unresolved-live');
  if (unresolved?.state === 'unresolved-orphaned') {
    return buildFixedWorkerResponse(request.command, 'unresolved-orphaned');
  }
  const acknowledged = await acknowledgeNeedsReview(readyLedger(lifecycle.ledger), {
    packId: request.packId,
    replayUntil: request.replayUntil,
    warningExpiresAt: request.warningExpiresAt,
  }, Date.now());
  if (acknowledged.status === 'confirmed') {
    await scheduleCanonical(lifecycle.session, acknowledged.ledger);
    return buildFixedWorkerResponse(request.command, 'empty');
  }
  if (acknowledged.status === 'quarantined') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (acknowledged.status === 'unavailable') {
    return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  const warning = lifecycle.ledger.records.find((record) => record.state === 'needs-review');
  return warning?.state === 'needs-review'
    ? warningResponse(request.command, warning)
    : buildRejectedWorkerResponse(request.command, 'acknowledgement-not-available');
}

async function resetForDeviceOwner(
  request: Extract<WorkerRequestV1, { command: 'reset-for-device-owner' }>,
): Promise<WorkerResponseV1> {
  const lifecycle = await reconcileLifecycle();
  if (lifecycle.status === 'ready') {
    const blocker = lifecycle.ledger.records.find((record) => (
      record.state === 'unresolved-live'
      || record.state === 'unresolved-orphaned'
      || record.state === 'needs-review'
    ));
    if (blocker?.state === 'unresolved-live') {
      return buildFixedWorkerResponse(request.command, 'unresolved-live');
    }
    if (blocker?.state === 'needs-review') return warningResponse(request.command, blocker);
    if (lifecycle.session !== null) {
      return buildRejectedWorkerResponse(request.command, 'reset-not-allowed');
    }
    const reset = await resetSafetyLedgerForDeviceOwner(
      readyLedger(lifecycle.ledger),
      true,
      request.attestation,
    );
    if (reset.status === 'confirmed') {
      await scheduleCanonical(null, reset.ledger);
      return buildFixedWorkerResponse(request.command, 'empty');
    }
    if (reset.status === 'quarantined') return buildFixedWorkerResponse(request.command, 'quarantined');
    if (reset.status === 'unavailable') {
      return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
    }
    return blocker?.state === 'unresolved-orphaned'
      ? buildFixedWorkerResponse(request.command, 'unresolved-orphaned')
      : buildRejectedWorkerResponse(request.command, 'reset-not-allowed');
  }
  if (lifecycle.status === 'unavailable') {
    return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  }
  const session = await readSessionState();
  if (session.status !== 'ready' || session.session !== null) {
    return session.status === 'unavailable'
      ? buildRejectedWorkerResponse(request.command, 'storage-unavailable')
      : buildFixedWorkerResponse(request.command, 'quarantined');
  }
  const ledger = await readSafetyLedger();
  if (ledger.status === 'unavailable') return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  const reset = await resetSafetyLedgerForDeviceOwner(ledger, true, request.attestation);
  if (reset.status === 'confirmed') {
    await scheduleCanonical(null, reset.ledger);
    return buildFixedWorkerResponse(request.command, 'empty');
  }
  if (reset.status === 'quarantined') return buildFixedWorkerResponse(request.command, 'quarantined');
  if (reset.status === 'unavailable') return buildRejectedWorkerResponse(request.command, 'storage-unavailable');
  return buildRejectedWorkerResponse(request.command, 'reset-not-allowed');
}

async function processWorkerRequest(
  request: WorkerRequestV1,
  deliver: (response: WorkerResponseV1, expectedCommand: WorkerCommand | null) => void,
): Promise<RequestResult> {
  switch (request.command) {
    case 'preview-current-page': return previewCurrentPage(request);
    case 'load-reviewed-fields': return loadReviewedFields(request);
    case 'fill-empty-reviewed-fields': return fillEmptyReviewedFields(request, deliver);
    case 'clear-staged-fields': return clearStagedFields(request);
    case 'acknowledge-affected-person-inspection': return acknowledgeInspection(request);
    case 'reset-for-device-owner': return resetForDeviceOwner(request);
  }
}

function guardedResponder(sendResponse: (response: unknown) => void) {
  let sent = false;
  return (response: WorkerResponseV1, expectedCommand: WorkerCommand | null) => {
    if (sent) return;
    const validated = validateWorkerResponseForCommand(response, expectedCommand);
    if (!validated) return;
    sent = true;
    try {
      sendResponse(validated);
    } catch {
      // A closed popup naturally drops its one response; nothing is retried.
    }
  };
}

async function handleRemovedTab(tabId: number): Promise<void> {
  const candidate = await readSessionState();
  if (
    candidate.status !== 'ready'
    || candidate.session === null
    || candidate.session.state === 'staged'
  ) return;
  const candidateDestinationTabId = candidate.session.state === 'arming'
    ? candidate.session.destination.destinationTabId
    : candidate.session.destinationTabId;
  if (candidateDestinationTabId !== tabId) return;
  const lifecycle = await reconcileLifecycle(false);
  if (
    lifecycle.status !== 'ready'
    || lifecycle.session?.state !== 'consuming'
    || lifecycle.session.destinationTabId !== tabId
    || !liveMatches(lifecycle.ledger, lifecycle.session)
  ) return;
  const session = lifecycle.session;
  const intended: SettlementIntentV1 = Object.freeze({
    cause: 'destination-tab-removed',
    terminal: Object.freeze({
      state: 'replay', packId: session.packId, replayUntil: session.replayUntil,
      outcome: 'closed-unresolved',
    }),
  });
  const finished = await persistAndFinishSettlement(session, intended, lifecycle.ledger);
  if (finished.status !== 'ready') return;
  closedInFlightTuples.add(inFlightTupleKey(session));
  const pruned = await pruneLedger(finished.ledger, Date.now());
  await scheduleCanonical(null, pruned.status === 'ready' ? pruned.ledger : finished.ledger);
}

async function handleReplacedTab(addedTabId: number, removedTabId: number): Promise<void> {
  const candidate = await readSessionState();
  if (
    candidate.status !== 'ready'
    || candidate.session === null
    || candidate.session.state === 'staged'
  ) return;
  const destinationTabId = candidate.session.state === 'arming'
    ? candidate.session.destination.destinationTabId
    : candidate.session.destinationTabId;
  if (destinationTabId !== addedTabId && destinationTabId !== removedTabId) return;
  await reconcileLifecycle();
}

function readAlarmName(value: unknown): AlarmName | null | 'unknown' {
  try {
    if (typeof value !== 'object' || value === null) return null;
    const name = Object.getOwnPropertyDescriptor(value, 'name');
    if (!name || !name.enumerable || !('value' in name) || typeof name.value !== 'string') return null;
    return name.value === SESSION_EXPIRY_ALARM
      || name.value === LEDGER_CLEANUP_ALARM
      || name.value === ATTEMPT_WATCHDOG_ALARM
      ? name.value
      : 'unknown';
  } catch {
    return null;
  }
}

function registerWorkerListeners() {
  chrome.runtime.onMessage.addListener((
    rawRequest: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    const respond = guardedResponder(sendResponse);
    if (!validatePopupSender(sender, self.location.origin)) {
      respond(buildRejectedWorkerResponse(null, 'invalid-sender'), null);
      return true;
    }
    const request = parseWorkerRequest(rawRequest);
    if (!request) {
      respond(buildRejectedWorkerResponse(null, 'invalid-request'), null);
      return true;
    }
    void enqueueLifecycle(() => processWorkerRequest(request, respond))
      .then((result) => {
        if (!('deferred' in result)) respond(result, request.command);
      })
      .catch(() => respond(
        buildRejectedWorkerResponse(request.command, 'operation-failed'),
        request.command,
      ));
    return true;
  });
  chrome.runtime.onStartup.addListener(() => {
    void enqueueLifecycle(() => reconcileLifecycle()).then(() => undefined, () => undefined);
  });
  chrome.runtime.onInstalled.addListener(() => {
    void enqueueLifecycle(() => reconcileLifecycle()).then(() => undefined, () => undefined);
  });
  chrome.tabs.onRemoved.addListener((tabId: number) => {
    if (!Number.isSafeInteger(tabId) || tabId < 0) return;
    void enqueueLifecycle(() => handleRemovedTab(tabId)).then(() => undefined, () => undefined);
  });
  chrome.tabs.onReplaced.addListener((addedTabId: number, removedTabId: number) => {
    if (
      !Number.isSafeInteger(addedTabId) || addedTabId < 0
      || !Number.isSafeInteger(removedTabId) || removedTabId < 0
    ) return;
    void enqueueLifecycle(() => handleReplacedTab(addedTabId, removedTabId))
      .then(() => undefined, () => undefined);
  });
  chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
    const name = readAlarmName(alarm);
    if (name === null || name === 'unknown') return;
    void enqueueLifecycle(() => reconcileLifecycle()).then(() => undefined, () => undefined);
  });
  void enqueueLifecycle(() => reconcileLifecycle()).then(() => undefined, () => undefined);
}

if (typeof chrome !== 'undefined') registerWorkerListeners();
