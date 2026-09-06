/** A deterministic, synthetic-only workflow. It cannot contact a real portal. */
export type AssistanceScenario = 'success' | 'mismatched-receipt' | 'timeout';
export type AssistanceStage = 'review' | 'private' | 'approval' | 'approved' | 'executing' | 'inconclusive' | 'checking' | 'retry' | 'complete';
export type AssistanceAction = {
  caseId: string;
  caseRevision: number;
  recipient: 'synthetic-renewal-desk' | 'synthetic-transfer-desk';
  amountPaise: number;
  request: string;
};
type Approval = { executionKey: string; actionFingerprint: string; approvedAt: number; expiresAt: number };
type Attempt = { executionKey: string; actionFingerprint: string };
export type SyntheticReceipt = AssistanceAction & {
  kind: 'synthetic'; executionKey: string; reference: string; actionFingerprint: string;
};
type EventCode = 'created' | 'edited' | 'private-started' | 'private-finished' | 'private-cancelled' | 'approved' | 'execution-started' | 'receipt-matched' | 'receipt-mismatch' | 'timeout' | 'interrupted' | 'outcome-check' | 'no-record' | 'review-again' | 'resumed';
export type AssistanceSession = {
  version: 1;
  id: string;
  scenario: AssistanceScenario;
  stage: AssistanceStage;
  action: AssistanceAction;
  privateCompleted: boolean;
  approval: Approval | null;
  attempt: Attempt | null;
  receipt: SyntheticReceipt | null;
  reason: 'timeout' | 'interrupted' | 'receipt-mismatch' | null;
  events: EventCode[];
};
export type AssistanceEvent =
  | { type: 'edit'; action: AssistanceAction }
  | { type: 'approve'; executionKey: string }
  | { type: 'receipt'; receipt: unknown }
  | { type: 'outcome'; receipt: unknown | null }
  | { type: 'begin-private' | 'finish-private' | 'cancel-private' | 'execute' | 'timeout' | 'interrupt' | 'check-outcome' | 'review-again' };

const STAGES: AssistanceStage[] = ['review', 'private', 'approval', 'approved', 'executing', 'inconclusive', 'checking', 'retry', 'complete'];
const SCENARIOS: AssistanceScenario[] = ['success', 'mismatched-receipt', 'timeout'];
const EVENT_CODES: EventCode[] = ['created', 'edited', 'private-started', 'private-finished', 'private-cancelled', 'approved', 'execution-started', 'receipt-matched', 'receipt-mismatch', 'timeout', 'interrupted', 'outcome-check', 'no-record', 'review-again', 'resumed'];
const ACTION_KEYS = ['caseId', 'caseRevision', 'recipient', 'amountPaise', 'request'];
const APPROVAL_TTL_MS = 5 * 60_000;
const MAX_EVENTS = 80;
const MAX_RECORDS = 20;

function record(value: unknown, allowed: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${label} must be a plain object.`);
  const input = value as Record<string, unknown>;
  if (Reflect.ownKeys(input).some(key => typeof key !== 'string' || !allowed.includes(key))) throw new TypeError(`${label} has an unexpected field.`);
  if (allowed.some(key => !Object.hasOwn(input, key))) throw new TypeError(`${label} has a missing field.`);
  return input;
}
function text(value: unknown, label: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new TypeError(`${label} must contain 1 to ${max} text characters.`);
  return value;
}
function id(value: unknown, label: string): string {
  const clean = text(value, label, 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(clean)) throw new TypeError(`${label} contains unsupported characters.`);
  return clean;
}
function integer(value: unknown, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new TypeError(`${label} is outside its allowed range.`);
  return value as number;
}
function action(value: unknown): AssistanceAction {
  const input = record(value, ACTION_KEYS, 'Reviewed action');
  if (!['synthetic-renewal-desk', 'synthetic-transfer-desk'].includes(input.recipient as string)) throw new TypeError('Recipient must be a synthetic desk.');
  return {
    caseId: id(input.caseId, 'Case id'), caseRevision: integer(input.caseRevision, 'Case revision', 1),
    recipient: input.recipient as AssistanceAction['recipient'], amountPaise: integer(input.amountPaise, 'Practice amount', 0, 100_000),
    request: text(input.request, 'Practice request'),
  };
}
export function assistanceActionFingerprint(value: AssistanceAction): string {
  // Exact canonical binding, not a claim of cryptographic authentication.
  return JSON.stringify(action(value));
}
function receipt(value: unknown): SyntheticReceipt {
  const input = record(value, [...ACTION_KEYS, 'kind', 'executionKey', 'reference', 'actionFingerprint'], 'Synthetic receipt');
  if (input.kind !== 'synthetic') throw new TypeError('Receipt must be explicitly synthetic.');
  return {
    ...action(Object.fromEntries(ACTION_KEYS.map(key => [key, input[key]]))),
    kind: 'synthetic', executionKey: id(input.executionKey, 'Receipt execution key'),
    reference: id(input.reference, 'Synthetic reference'), actionFingerprint: text(input.actionFingerprint, 'Receipt binding', 2_000),
  };
}
function matches(current: AssistanceSession, value: SyntheticReceipt): boolean {
  return Boolean(current.attempt && value.executionKey === current.attempt.executionKey
    && value.actionFingerprint === current.attempt.actionFingerprint
    && receiptFingerprint(value) === assistanceActionFingerprint(current.action));
}
function receiptFingerprint(value: SyntheticReceipt): string {
  return assistanceActionFingerprint(action(Object.fromEntries(ACTION_KEYS.map(key => [key, value[key as keyof SyntheticReceipt]]))));
}

export function validateAssistanceSession(value: unknown): AssistanceSession {
  const input = record(value, ['version', 'id', 'scenario', 'stage', 'action', 'privateCompleted', 'approval', 'attempt', 'receipt', 'reason', 'events'], 'Assistance session');
  if (input.version !== 1 || !STAGES.includes(input.stage as AssistanceStage) || !SCENARIOS.includes(input.scenario as AssistanceScenario)) throw new TypeError('Assistance session version, stage or scenario is invalid.');
  if (typeof input.privateCompleted !== 'boolean') throw new TypeError('Private completion must be boolean.');
  if (!Array.isArray(input.events) || input.events.length === 0 || input.events.length > MAX_EVENTS || input.events[0] !== 'created' || input.events.some(event => !EVENT_CODES.includes(event))) throw new TypeError(`Assistance history must contain 1 to ${MAX_EVENTS} valid events.`);
  if (input.reason !== null && !['timeout', 'interrupted', 'receipt-mismatch'].includes(input.reason as string)) throw new TypeError('Assistance outcome reason is invalid.');
  let approval: Approval | null = null;
  let attempt: Attempt | null = null;
  if (input.approval !== null) {
    const item = record(input.approval, ['executionKey', 'actionFingerprint', 'approvedAt', 'expiresAt'], 'Approval');
    approval = { executionKey: id(item.executionKey, 'Approval execution key'), actionFingerprint: text(item.actionFingerprint, 'Approval binding', 2_000), approvedAt: integer(item.approvedAt, 'Approval time'), expiresAt: integer(item.expiresAt, 'Approval expiry') };
    if (approval.expiresAt !== approval.approvedAt + APPROVAL_TTL_MS) throw new TypeError('Approval expiry is invalid.');
  }
  if (input.attempt !== null) {
    const item = record(input.attempt, ['executionKey', 'actionFingerprint'], 'Attempt');
    attempt = { executionKey: id(item.executionKey, 'Attempt execution key'), actionFingerprint: text(item.actionFingerprint, 'Attempt binding', 2_000) };
  }
  const result: AssistanceSession = {
    version: 1, id: id(input.id, 'Session id'), scenario: input.scenario as AssistanceScenario, stage: input.stage as AssistanceStage,
    action: action(input.action), privateCompleted: input.privateCompleted, approval, attempt,
    receipt: input.receipt === null ? null : receipt(input.receipt), reason: input.reason as AssistanceSession['reason'], events: [...input.events] as EventCode[],
  };
  const needsPrivateCompletion = !['review', 'private'].includes(result.stage);
  const needsApproval = ['approved', 'executing'].includes(result.stage);
  const needsAttempt = ['executing', 'inconclusive', 'checking', 'retry', 'complete'].includes(result.stage);
  if (result.privateCompleted !== needsPrivateCompletion || Boolean(result.approval) !== needsApproval || Boolean(result.attempt) !== needsAttempt) throw new TypeError('Assistance state invariant failed: private completion, approval or attempt does not match the stage.');
  if ((result.stage === 'inconclusive') !== Boolean(result.reason)) throw new TypeError('Assistance state invariant failed: inconclusive reason.');
  const binding = assistanceActionFingerprint(result.action);
  if (result.approval && result.approval.actionFingerprint !== binding) throw new TypeError('Approval binding does not match the reviewed action.');
  if (result.attempt && (result.attempt.actionFingerprint !== binding || (result.approval && result.approval.executionKey !== result.attempt.executionKey))) throw new TypeError('Attempt binding does not match the reviewed action or approval.');
  if (result.stage === 'complete' && (!result.receipt || !matches(result, result.receipt))) throw new TypeError('A complete outcome requires a matching synthetic receipt.');
  if (result.receipt && !['complete', 'checking', 'inconclusive'].includes(result.stage)) throw new TypeError('Receipt is not valid in this stage.');
  return result;
}

export function createAssistanceSession(sessionId: string, scenario: AssistanceScenario = 'success'): AssistanceSession {
  return validateAssistanceSession({
    version: 1, id: sessionId, scenario, stage: 'review',
    action: { caseId: 'DEMO-RENEW-01', caseRevision: 1, recipient: 'synthetic-renewal-desk', amountPaise: 25_000, request: 'Please check this fictional licence renewal practice request.' },
    privateCompleted: false, approval: null, attempt: null, receipt: null, reason: null, events: ['created'],
  });
}

function assertFreshApproval(current: AssistanceSession, now: number): void {
  if (!current.approval) throw new Error('Explicit reviewed approval is required.');
  if (now < current.approval.approvedAt) throw new Error('Approval clock moved backwards. Review and approve again.');
  if (now >= current.approval.expiresAt) throw new Error('Approval expired. Review and approve again.');
}

export function transitionAssistance(value: AssistanceSession, event: AssistanceEvent, now: number): AssistanceSession {
  const current = validateAssistanceSession(value);
  integer(now, 'Current time');
  if (!event || typeof event !== 'object') throw new TypeError('Assistance event is invalid.');
  const extra = event.type === 'edit' ? ['action'] : event.type === 'approve' ? ['executionKey'] : ['receipt', 'outcome'].includes(event.type) ? ['receipt'] : [];
  record(event, ['type', ...extra], 'Assistance event');
  const allow = (...stages: AssistanceStage[]) => { if (!stages.includes(current.stage)) throw new Error(`This action is not allowed in the ${current.stage} stage. Follow the review and outcome-check steps.`); };
  const next: AssistanceSession = { ...current, events: [...current.events] };
  const log = (code: EventCode) => { next.events.push(code); };
  switch (event.type) {
    case 'edit':
      allow('review', 'approval', 'approved', 'retry', 'complete');
      next.action = action(event.action); next.stage = 'review'; next.privateCompleted = false; next.approval = null; next.attempt = null; next.receipt = null; next.reason = null; log('edited'); break;
    case 'begin-private':
      allow('review'); next.stage = 'private'; log('private-started'); break;
    case 'finish-private':
      allow('private'); next.privateCompleted = true; next.stage = 'approval'; log('private-finished'); break;
    case 'cancel-private':
      allow('private'); next.stage = 'review'; log('private-cancelled'); break;
    case 'approve':
      allow('approval'); next.approval = { executionKey: id(event.executionKey, 'Execution key'), actionFingerprint: assistanceActionFingerprint(current.action), approvedAt: now, expiresAt: now + APPROVAL_TTL_MS }; next.stage = 'approved'; log('approved'); break;
    case 'execute':
      allow('approved'); assertFreshApproval(current, now); next.stage = 'executing'; next.attempt = { executionKey: current.approval!.executionKey, actionFingerprint: current.approval!.actionFingerprint }; log('execution-started'); break;
    case 'timeout': case 'interrupt':
      allow('executing'); next.stage = 'inconclusive'; next.approval = null; next.reason = event.type === 'timeout' ? 'timeout' : 'interrupted'; log(next.reason); break;
    case 'receipt': {
      allow('executing'); const observed = receipt(event.receipt); next.receipt = observed; next.approval = null;
      if (matches(current, observed)) { next.stage = 'complete'; log('receipt-matched'); }
      else { next.stage = 'inconclusive'; next.reason = 'receipt-mismatch'; log('receipt-mismatch'); }
      break;
    }
    case 'check-outcome':
      allow('inconclusive'); next.stage = 'checking'; next.reason = null; log('outcome-check'); break;
    case 'outcome': {
      allow('checking');
      if (event.receipt === null) { next.stage = 'retry'; next.receipt = null; log('no-record'); }
      else {
        const observed = receipt(event.receipt); next.receipt = observed;
        if (matches(current, observed)) { next.stage = 'complete'; log('receipt-matched'); }
        else { next.stage = 'inconclusive'; next.reason = 'receipt-mismatch'; log('receipt-mismatch'); }
      }
      break;
    }
    case 'review-again':
      allow('approved', 'retry'); next.stage = 'approval'; next.approval = null; next.attempt = null; next.receipt = null; log('review-again'); break;
    default: throw new TypeError('Unknown assistance event.');
  }
  return validateAssistanceSession(next);
}

export function observeAssistance(value: AssistanceSession, reader: () => string): { blocked: true; stage: 'private' } | { blocked: false; stage: AssistanceStage; text: string } {
  const current = validateAssistanceSession(value);
  if (current.stage === 'private') return { blocked: true, stage: 'private' };
  return { blocked: false, stage: current.stage, text: text(reader(), 'Synthetic observation', 2_000) };
}

export type SyntheticPortal = ReturnType<typeof createSyntheticPortal>;
export type SyntheticPortalResult = { kind: 'receipt'; receipt: SyntheticReceipt; duplicate: boolean } | { kind: 'timeout'; duplicate: false };
export function createSyntheticPortal(initial: readonly SyntheticReceipt[] = []) {
  if (!Array.isArray(initial) || initial.length > MAX_RECORDS) throw new TypeError(`Synthetic portal supports at most ${MAX_RECORDS} records.`);
  const records = new Map<string, SyntheticReceipt>();
  for (const value of initial) {
    const checked = receipt(value);
    if (checked.actionFingerprint !== receiptFingerprint(checked) || records.has(checked.executionKey)) throw new TypeError('Synthetic portal record has a duplicate key or mismatched binding.');
    records.set(checked.executionKey, checked);
  }
  return {
    execute(value: AssistanceSession, now: number): SyntheticPortalResult {
      const current = validateAssistanceSession(value); integer(now, 'Current time');
      if (current.stage !== 'executing' || !current.attempt) throw new Error('Synthetic execution requires an approved executing stage.');
      assertFreshApproval(current, now);
      const existing = records.get(current.attempt.executionKey);
      if (existing) {
        if (!matches(current, existing)) throw new Error('This execution key was already used for a different reviewed action.');
        return { kind: 'receipt', receipt: { ...existing }, duplicate: true };
      }
      if (records.size >= MAX_RECORDS) throw new Error('Synthetic portal record limit reached. Start a new practice run.');
      const stored: SyntheticReceipt = { ...current.action, kind: 'synthetic', executionKey: current.attempt.executionKey, actionFingerprint: current.attempt.actionFingerprint, reference: `SYNTHETIC-${records.size + 1}` };
      records.set(stored.executionKey, stored);
      if (current.scenario === 'timeout') return { kind: 'timeout', duplicate: false };
      if (current.scenario === 'mismatched-receipt') return { kind: 'receipt', receipt: { ...stored, amountPaise: stored.amountPaise === 100_000 ? stored.amountPaise - 100 : stored.amountPaise + 100 }, duplicate: false };
      return { kind: 'receipt', receipt: { ...stored }, duplicate: false };
    },
    checkOutcome(value: AssistanceSession): SyntheticReceipt | null {
      const current = validateAssistanceSession(value);
      if (current.stage !== 'checking' || !current.attempt) throw new Error('Check outcome is required before inspecting an interrupted execution.');
      const stored = records.get(current.attempt.executionKey);
      return stored ? { ...stored } : null;
    },
    snapshot(): SyntheticReceipt[] { return [...records.values()].map(item => ({ ...item })); },
  };
}

export function serializeAssistanceCheckpoint(value: AssistanceSession, records: readonly SyntheticReceipt[]): string {
  return JSON.stringify({ version: 1, session: validateAssistanceSession(value), records: createSyntheticPortal(records).snapshot() });
}
export function restoreAssistanceCheckpoint(raw: string): { session: AssistanceSession; records: SyntheticReceipt[] } {
  if (typeof raw !== 'string' || raw.length > 100_000) throw new TypeError('Synthetic checkpoint is too large.');
  const input = record(JSON.parse(raw) as unknown, ['version', 'session', 'records'], 'Synthetic checkpoint');
  if (input.version !== 1) throw new TypeError('Synthetic checkpoint version is invalid.');
  let session = validateAssistanceSession(input.session);
  const records = createSyntheticPortal(input.records as SyntheticReceipt[]).snapshot();
  if (session.stage === 'private') session = { ...session, stage: 'review', approval: null, privateCompleted: false };
  else if (session.stage === 'executing' || session.stage === 'checking') session = { ...session, stage: 'inconclusive', approval: null, reason: 'interrupted' };
  else if (session.stage === 'approved') session = { ...session, stage: 'approval', approval: null };
  // Resumption never preserves permission to execute. History remains bounded.
  return { session: validateAssistanceSession(session), records };
}
