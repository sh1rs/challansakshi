import type { HandoffResultClass, ReviewRole } from './official-handoff';

export const OFFICIAL_HANDOFF_RECEIPT_SCHEMA = 'challansakshi.official-handoff-receipt/v1' as const;

export type HandoffDeviceMode = 'private' | 'shared';
export type CitizenReturnState =
  | 'acknowledgement-seen'
  | 'portal-unavailable'
  | 'not-submitted'
  | 'needs-correction';

type ReceiptBinding = Readonly<{
  packRevisionId: string;
  resultClass: HandoffResultClass;
  reviewRole: ReviewRole;
  deviceMode: HandoffDeviceMode;
}>;

export type OfficialHandoffReceiptSession = ReceiptBinding & Readonly<{
  status: 'not-opened';
}>;

export type OfficialLinkActivatedState = ReceiptBinding & Readonly<{
  status: 'link-activated';
  linkActivatedAt: string;
  directObservation: 'official-service-opened-from-this-review';
  submissionObserved: false;
}>;

export type OfficialHandoffReceipt = ReceiptBinding & Readonly<{
  status: 'citizen-return-recorded';
  schema: typeof OFFICIAL_HANDOFF_RECEIPT_SCHEMA;
  localTimestamp: string;
  selectedReturnState: CitizenReturnState;
  reportingBasis:
    | 'citizen-reported-unverified'
    | 'affected-person-reported-entered-with-present-helper';
  officialStatusObserved: false;
  referenceLastFour?: string;
}>;

export type InvalidatedOfficialHandoffReceipt = Readonly<{
  status: 'invalidated';
  reason: 'pack-revision-changed';
  previousPackRevisionId: string;
  currentPackRevisionId: string;
}>;

export type OfficialHandoffReceiptState =
  | OfficialHandoffReceiptSession
  | OfficialLinkActivatedState
  | OfficialHandoffReceipt
  | InvalidatedOfficialHandoffReceipt;

export type PresentHelperReturnConfirmation = Readonly<{
  affectedPersonPresent: boolean;
  affectedPersonConfirmedReturnState: boolean;
  affectedPersonConfirmedReferenceFragment?: boolean;
}>;

export type CitizenReturnInput = Readonly<{
  selectedReturnState: CitizenReturnState;
  localTimestamp: string;
  referenceLastFour?: string;
  helperConfirmation?: PresentHelperReturnConfirmation;
}>;

export type SerializedOfficialHandoffReceipt = Readonly<{
  schema: typeof OFFICIAL_HANDOFF_RECEIPT_SCHEMA;
  packRevisionId: string;
  localTimestamp: string;
  resultClass: HandoffResultClass;
  selectedReturnState: CitizenReturnState;
  referenceLastFour?: string;
}>;

const returnStates = new Set<CitizenReturnState>([
  'acknowledgement-seen',
  'portal-unavailable',
  'not-submitted',
  'needs-correction',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value;
}

function isFourCharacterFragment(value: string): boolean {
  return Array.from(value).length === 4 && /^[\p{L}\p{N}]{4}$/u.test(value);
}

export function createOfficialHandoffReceiptSession(binding: ReceiptBinding): OfficialHandoffReceiptSession {
  if (
    !isRecord(binding)
    || !nonEmpty(binding.packRevisionId)
    || binding.resultClass !== 'possible-discrepancy'
    || (binding.reviewRole !== 'self' && binding.reviewRole !== 'present-helper')
    || (binding.deviceMode !== 'private' && binding.deviceMode !== 'shared')
  ) throw new Error('A valid confirmed pack binding is required.');
  return Object.freeze({
    status: 'not-opened',
    packRevisionId: binding.packRevisionId,
    resultClass: binding.resultClass,
    reviewRole: binding.reviewRole,
    deviceMode: binding.deviceMode,
  });
}

export function recordOfficialLinkActivation(
  session: OfficialHandoffReceiptSession,
  linkActivatedAt: string,
): OfficialLinkActivatedState {
  if (!isRecord(session) || session.status !== 'not-opened') {
    throw new Error('Official link activation can be recorded only for a current unopened handoff session.');
  }
  if (!isCanonicalTimestamp(linkActivatedAt)) throw new Error('Link activation requires a canonical local timestamp.');
  return Object.freeze({
    status: 'link-activated',
    packRevisionId: session.packRevisionId,
    resultClass: session.resultClass,
    reviewRole: session.reviewRole,
    deviceMode: session.deviceMode,
    linkActivatedAt,
    directObservation: 'official-service-opened-from-this-review',
    submissionObserved: false,
  });
}

function validateHelperConfirmation(
  input: CitizenReturnInput,
  hasReferenceFragment: boolean,
): boolean {
  const confirmation = input.helperConfirmation;
  return isRecord(confirmation)
    && confirmation.affectedPersonPresent === true
    && confirmation.affectedPersonConfirmedReturnState === true
    && (!hasReferenceFragment || confirmation.affectedPersonConfirmedReferenceFragment === true);
}

export function recordCitizenReturn(
  state: OfficialLinkActivatedState,
  input: CitizenReturnInput,
): OfficialHandoffReceipt {
  if (!isRecord(state) || state.status !== 'link-activated') {
    throw new Error('A current official link activation is required before recording a return.');
  }
  if (!isRecord(input) || !returnStates.has(input.selectedReturnState)) {
    throw new Error('Select an explicit allowed citizen return state.');
  }
  if (!isCanonicalTimestamp(input.localTimestamp)) {
    throw new Error('Citizen return requires a canonical local timestamp.');
  }

  const hasReferenceFragment = input.referenceLastFour !== undefined;
  if (hasReferenceFragment) {
    if (input.selectedReturnState !== 'acknowledgement-seen') {
      throw new Error('A reference fragment may be recorded only after acknowledgement-seen.');
    }
    if (state.deviceMode !== 'private') {
      throw new Error('A reference fragment may be retained only on a private device.');
    }
    if (typeof input.referenceLastFour !== 'string' || !isFourCharacterFragment(input.referenceLastFour)) {
      throw new Error('The optional reference fragment must contain exactly four letters or numbers.');
    }
  }

  if (state.reviewRole === 'present-helper' && !validateHelperConfirmation(input, hasReferenceFragment)) {
    throw new Error('The affected person must be present and explicitly confirm the exact return entry.');
  }

  const receipt: OfficialHandoffReceipt = Object.freeze({
    status: 'citizen-return-recorded',
    schema: OFFICIAL_HANDOFF_RECEIPT_SCHEMA,
    packRevisionId: state.packRevisionId,
    resultClass: state.resultClass,
    reviewRole: state.reviewRole,
    deviceMode: state.deviceMode,
    localTimestamp: input.localTimestamp,
    selectedReturnState: input.selectedReturnState,
    reportingBasis: state.reviewRole === 'present-helper'
      ? 'affected-person-reported-entered-with-present-helper'
      : 'citizen-reported-unverified',
    officialStatusObserved: false,
    ...(input.referenceLastFour === undefined ? {} : { referenceLastFour: input.referenceLastFour }),
  });
  return receipt;
}

export function invalidateOfficialHandoffReceipt<T extends OfficialHandoffReceiptState>(
  state: T,
  currentPackRevisionId: string,
): T | InvalidatedOfficialHandoffReceipt {
  if (!isRecord(state) || state.status === 'invalidated') return state;
  if (!nonEmpty(currentPackRevisionId)) throw new Error('A current pack revision is required.');
  if (state.packRevisionId === currentPackRevisionId) return state;
  return Object.freeze({
    status: 'invalidated',
    reason: 'pack-revision-changed',
    previousPackRevisionId: state.packRevisionId,
    currentPackRevisionId,
  });
}

/** Serializes an exact redacted allowlist; operational labels stay in memory only. */
export function serializeOfficialHandoffReceipt(
  receipt: OfficialHandoffReceipt,
  currentPackRevisionId: string,
): string {
  if (!isRecord(receipt) || receipt.status !== 'citizen-return-recorded') {
    throw new Error('A recorded receipt is required for continuation serialization.');
  }
  if (receipt.deviceMode !== 'private') {
    throw new Error('Continuation receipts are available only on private devices.');
  }
  if (receipt.packRevisionId !== currentPackRevisionId) {
    throw new Error('The receipt no longer matches the current pack revision.');
  }
  if (
    receipt.schema !== OFFICIAL_HANDOFF_RECEIPT_SCHEMA
    || receipt.resultClass !== 'possible-discrepancy'
    || !returnStates.has(receipt.selectedReturnState)
    || !isCanonicalTimestamp(receipt.localTimestamp)
  ) {
    throw new Error('The recorded receipt is invalid.');
  }
  if (receipt.referenceLastFour !== undefined && (
    receipt.selectedReturnState !== 'acknowledgement-seen'
    || !isFourCharacterFragment(receipt.referenceLastFour)
  )) throw new Error('The recorded receipt contains an invalid reference fragment.');

  const redacted: SerializedOfficialHandoffReceipt = {
    schema: OFFICIAL_HANDOFF_RECEIPT_SCHEMA,
    packRevisionId: receipt.packRevisionId,
    localTimestamp: receipt.localTimestamp,
    resultClass: receipt.resultClass,
    selectedReturnState: receipt.selectedReturnState,
    ...(receipt.referenceLastFour === undefined ? {} : { referenceLastFour: receipt.referenceLastFour }),
  };
  return JSON.stringify(redacted);
}
