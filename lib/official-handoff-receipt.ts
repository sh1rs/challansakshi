import {
  isAuthenticOfficialHandoffPack,
  isOpaqueRevisionId,
  isPackDigest,
  type HandoffResultClass,
  type OfficialHandoffPack,
  type ReviewRole,
} from './official-handoff';

export const OFFICIAL_HANDOFF_RECEIPT_SCHEMA = 'challansakshi.official-handoff-receipt/v1' as const;

export type HandoffDeviceMode = 'private' | 'shared';
export type CitizenReturnState =
  | 'acknowledgement-seen'
  | 'portal-unavailable'
  | 'not-submitted'
  | 'needs-correction';

type ReceiptBinding = Readonly<{
  packRevisionId: string;
  packDigest: string;
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

export type PresentHelperReturnConfirmation = Readonly<{
  affectedPersonPresent: boolean;
  affectedPersonRequestedReturnRecording: boolean;
  affectedPersonConfirmedReturnState: boolean;
  affectedPersonConfirmedReferenceFragment?: boolean;
}>;

type ConfirmedHelperReturnAuthorization = Readonly<{
  affectedPersonPresent: true;
  affectedPersonRequestedReturnRecording: true;
  affectedPersonConfirmedReturnState: true;
  affectedPersonConfirmedReferenceFragment: boolean;
}>;

export type OfficialHandoffReceipt = ReceiptBinding & Readonly<{
  status: 'citizen-return-recorded';
  schema: typeof OFFICIAL_HANDOFF_RECEIPT_SCHEMA;
  linkActivatedAt: string;
  localTimestamp: string;
  selectedReturnState: CitizenReturnState;
  reportingBasis:
    | 'citizen-reported-unverified'
    | 'affected-person-reported-entered-with-present-helper';
  officialStatusObserved: false;
  helperReturnAuthorization?: ConfirmedHelperReturnAuthorization;
  referenceLastFour?: string;
}>;

export type InvalidatedOfficialHandoffReceipt = Readonly<{
  status: 'invalidated';
  reason: 'pack-binding-changed';
  previousPackRevisionId: string;
  previousPackDigest: string;
  currentPackRevisionId: string;
  currentPackDigest: string;
}>;

export type OfficialHandoffReceiptState =
  | OfficialHandoffReceiptSession
  | OfficialLinkActivatedState
  | OfficialHandoffReceipt
  | InvalidatedOfficialHandoffReceipt;

export type CitizenReturnInput = Readonly<{
  selectedReturnState: CitizenReturnState;
  localTimestamp: string;
  referenceLastFour?: string;
  helperConfirmation?: PresentHelperReturnConfirmation;
}>;

export type SerializedOfficialHandoffReceipt = Readonly<{
  schema: typeof OFFICIAL_HANDOFF_RECEIPT_SCHEMA;
  packRevisionId: string;
  packDigest: string;
  localTimestamp: string;
  resultClass: HandoffResultClass;
  selectedReturnState: CitizenReturnState;
  referenceLastFour?: string;
}>;

const STATE_BRAND = Symbol('challansakshi.authentic-handoff-receipt-state');
const SESSION_BRAND = Object.freeze({ state: 'not-opened' as const });
const ACTIVATED_BRAND = Object.freeze({ state: 'link-activated' as const });
const RECEIPT_BRAND = Object.freeze({ state: 'citizen-return-recorded' as const });
const INVALIDATED_BRAND = Object.freeze({ state: 'invalidated' as const });

const SESSION_KEYS = ['status', 'packRevisionId', 'packDigest', 'resultClass', 'reviewRole', 'deviceMode'] as const;
const ACTIVATED_KEYS = [
  ...SESSION_KEYS,
  'linkActivatedAt', 'directObservation', 'submissionObserved',
] as const;
const RECEIPT_BASE_KEYS = [
  'status', 'schema', 'packRevisionId', 'packDigest', 'resultClass', 'reviewRole', 'deviceMode',
  'linkActivatedAt', 'localTimestamp', 'selectedReturnState', 'reportingBasis', 'officialStatusObserved',
] as const;
const INVALIDATED_KEYS = [
  'status', 'reason', 'previousPackRevisionId', 'previousPackDigest',
  'currentPackRevisionId', 'currentPackDigest',
] as const;

const returnStates = new Set<CitizenReturnState>([
  'acknowledgement-seen',
  'portal-unavailable',
  'not-submitted',
  'needs-correction',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function stateBrandIs(value: object, brand: object): boolean {
  return (value as Record<PropertyKey, unknown>)[STATE_BRAND] === brand;
}

function brandAndFreeze<T extends object>(value: T, brand: object): Readonly<T> {
  Object.defineProperty(value, STATE_BRAND, {
    value: brand,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(value);
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value;
}

function isFourCharacterFragment(value: string): boolean {
  return Array.from(value).length === 4 && /^[\p{L}\p{N}]{4}$/u.test(value);
}

function assertAuthenticPack(pack: unknown, message: string): asserts pack is OfficialHandoffPack {
  if (!isAuthenticOfficialHandoffPack(pack)) throw new Error(message);
}

function bindingMatchesPack(binding: ReceiptBinding, pack: OfficialHandoffPack): boolean {
  return binding.packRevisionId === pack.packRevisionId
    && binding.packDigest === pack.packDigest
    && binding.resultClass === pack.resultClass
    && binding.reviewRole === pack.reviewRole;
}

function validBindingShape(value: Record<string, unknown>): boolean {
  return isOpaqueRevisionId(value.packRevisionId)
    && isPackDigest(value.packDigest)
    && value.resultClass === 'possible-discrepancy'
    && (value.reviewRole === 'self' || value.reviewRole === 'present-helper')
    && (value.deviceMode === 'private' || value.deviceMode === 'shared');
}

function isAuthenticSession(value: unknown): value is OfficialHandoffReceiptSession {
  return isPlainRecord(value)
    && hasExactKeys(value, SESSION_KEYS)
    && stateBrandIs(value, SESSION_BRAND)
    && value.status === 'not-opened'
    && validBindingShape(value);
}

function isAuthenticActivated(value: unknown): value is OfficialLinkActivatedState {
  return isPlainRecord(value)
    && hasExactKeys(value, ACTIVATED_KEYS)
    && stateBrandIs(value, ACTIVATED_BRAND)
    && value.status === 'link-activated'
    && validBindingShape(value)
    && isCanonicalTimestamp(value.linkActivatedAt)
    && value.directObservation === 'official-service-opened-from-this-review'
    && value.submissionObserved === false;
}

function helperAuthorizationIsValid(value: unknown, hasFragment: boolean): value is ConfirmedHelperReturnAuthorization {
  if (!isPlainRecord(value)) return false;
  const expectedKeys = [
    'affectedPersonPresent',
    'affectedPersonRequestedReturnRecording',
    'affectedPersonConfirmedReturnState',
    'affectedPersonConfirmedReferenceFragment',
  ];
  return hasExactKeys(value, expectedKeys)
    && value.affectedPersonPresent === true
    && value.affectedPersonRequestedReturnRecording === true
    && value.affectedPersonConfirmedReturnState === true
    && value.affectedPersonConfirmedReferenceFragment === hasFragment;
}

function expectedReceiptKeys(receipt: Record<string, unknown>): readonly string[] {
  const keys: string[] = [...RECEIPT_BASE_KEYS];
  if (receipt.reviewRole === 'present-helper') keys.push('helperReturnAuthorization');
  if (receipt.referenceLastFour !== undefined) keys.push('referenceLastFour');
  return keys;
}

function isAuthenticReceipt(value: unknown): value is OfficialHandoffReceipt {
  if (!isPlainRecord(value) || !hasExactKeys(value, expectedReceiptKeys(value))) return false;
  if (
    !stateBrandIs(value, RECEIPT_BRAND)
    || value.status !== 'citizen-return-recorded'
    || value.schema !== OFFICIAL_HANDOFF_RECEIPT_SCHEMA
    || !validBindingShape(value)
    || !isCanonicalTimestamp(value.linkActivatedAt)
    || !isCanonicalTimestamp(value.localTimestamp)
    || new Date(value.localTimestamp).getTime() < new Date(value.linkActivatedAt).getTime()
    || !returnStates.has(value.selectedReturnState as CitizenReturnState)
    || value.officialStatusObserved !== false
  ) return false;
  const hasFragment = value.referenceLastFour !== undefined;
  if (hasFragment && (
    value.deviceMode !== 'private'
    || value.selectedReturnState !== 'acknowledgement-seen'
    || typeof value.referenceLastFour !== 'string'
    || !isFourCharacterFragment(value.referenceLastFour)
  )) return false;
  if (value.reviewRole === 'self') {
    return value.reportingBasis === 'citizen-reported-unverified'
      && value.helperReturnAuthorization === undefined;
  }
  return value.reportingBasis === 'affected-person-reported-entered-with-present-helper'
    && helperAuthorizationIsValid(value.helperReturnAuthorization, hasFragment);
}

function isAuthenticInvalidated(value: unknown): value is InvalidatedOfficialHandoffReceipt {
  return isPlainRecord(value)
    && hasExactKeys(value, INVALIDATED_KEYS)
    && stateBrandIs(value, INVALIDATED_BRAND)
    && value.status === 'invalidated'
    && value.reason === 'pack-binding-changed'
    && isOpaqueRevisionId(value.previousPackRevisionId)
    && isPackDigest(value.previousPackDigest)
    && isOpaqueRevisionId(value.currentPackRevisionId)
    && isPackDigest(value.currentPackDigest);
}

function assertAuthenticState(value: unknown): asserts value is OfficialHandoffReceiptState {
  if (!isAuthenticSession(value) && !isAuthenticActivated(value) && !isAuthenticReceipt(value) && !isAuthenticInvalidated(value)) {
    throw new Error('An authentic receipt state with an exact variant shape is required.');
  }
}

export function createOfficialHandoffReceiptSession(
  pack: OfficialHandoffPack,
  deviceMode: HandoffDeviceMode,
): OfficialHandoffReceiptSession {
  assertAuthenticPack(pack, 'An authentic official handoff pack is required.');
  if (deviceMode !== 'private' && deviceMode !== 'shared') throw new Error('A valid device mode is required.');
  return brandAndFreeze({
    status: 'not-opened' as const,
    packRevisionId: pack.packRevisionId,
    packDigest: pack.packDigest,
    resultClass: pack.resultClass,
    reviewRole: pack.reviewRole,
    deviceMode,
  }, SESSION_BRAND);
}

export function recordOfficialLinkActivation(
  session: OfficialHandoffReceiptSession,
  currentPack: OfficialHandoffPack,
  linkActivatedAt: string,
): OfficialLinkActivatedState {
  assertAuthenticPack(currentPack, 'An authentic current pack is required for link activation.');
  if (!isAuthenticSession(session)) throw new Error('An authentic unopened receipt session is required.');
  if (!bindingMatchesPack(session, currentPack)) throw new Error('The receipt session does not match the authentic current pack.');
  if (!isCanonicalTimestamp(linkActivatedAt)) throw new Error('Link activation requires a canonical local timestamp.');
  return brandAndFreeze({
    status: 'link-activated' as const,
    packRevisionId: session.packRevisionId,
    packDigest: session.packDigest,
    resultClass: session.resultClass,
    reviewRole: session.reviewRole,
    deviceMode: session.deviceMode,
    linkActivatedAt,
    directObservation: 'official-service-opened-from-this-review' as const,
    submissionObserved: false as const,
  }, ACTIVATED_BRAND);
}

function validateHelperConfirmation(
  input: CitizenReturnInput,
  hasReferenceFragment: boolean,
): ConfirmedHelperReturnAuthorization {
  const confirmation = input.helperConfirmation;
  if (!isPlainRecord(confirmation) || confirmation.affectedPersonPresent !== true) {
    throw new Error('The affected person must be present for helper return recording.');
  }
  if (confirmation.affectedPersonRequestedReturnRecording !== true) {
    throw new Error('The affected person must have requested this return recording.');
  }
  if (confirmation.affectedPersonConfirmedReturnState !== true) {
    throw new Error('The affected person must confirm the exact return state.');
  }
  if (hasReferenceFragment && confirmation.affectedPersonConfirmedReferenceFragment !== true) {
    throw new Error('The affected person must confirm the exact reference fragment.');
  }
  return Object.freeze({
    affectedPersonPresent: true,
    affectedPersonRequestedReturnRecording: true,
    affectedPersonConfirmedReturnState: true,
    affectedPersonConfirmedReferenceFragment: hasReferenceFragment,
  });
}

export function recordCitizenReturn(
  state: OfficialLinkActivatedState,
  currentPack: OfficialHandoffPack,
  input: CitizenReturnInput,
): OfficialHandoffReceipt {
  assertAuthenticPack(currentPack, 'An authentic current pack is required for return recording.');
  if (!isAuthenticActivated(state)) throw new Error('An authentic link-activated state is required before recording a return.');
  if (!bindingMatchesPack(state, currentPack)) throw new Error('The link-activated state does not match the authentic current pack.');
  if (!isPlainRecord(input) || !returnStates.has(input.selectedReturnState)) {
    throw new Error('Select an explicit allowed citizen return state.');
  }
  if (!isCanonicalTimestamp(input.localTimestamp)) throw new Error('Citizen return requires a canonical local timestamp.');
  if (new Date(input.localTimestamp).getTime() < new Date(state.linkActivatedAt).getTime()) {
    throw new Error('Citizen return timestamp cannot be before link activation.');
  }

  const hasReferenceFragment = input.referenceLastFour !== undefined;
  if (hasReferenceFragment) {
    if (input.selectedReturnState !== 'acknowledgement-seen') {
      throw new Error('A reference fragment may be recorded only after acknowledgement-seen.');
    }
    if (state.deviceMode !== 'private') throw new Error('A reference fragment may be retained only on a private device.');
    if (typeof input.referenceLastFour !== 'string' || !isFourCharacterFragment(input.referenceLastFour)) {
      throw new Error('The optional reference fragment must contain exactly four letters or numbers.');
    }
  }

  const helperReturnAuthorization = state.reviewRole === 'present-helper'
    ? validateHelperConfirmation(input, hasReferenceFragment)
    : undefined;
  const receipt = {
    status: 'citizen-return-recorded' as const,
    schema: OFFICIAL_HANDOFF_RECEIPT_SCHEMA,
    packRevisionId: state.packRevisionId,
    packDigest: state.packDigest,
    resultClass: state.resultClass,
    reviewRole: state.reviewRole,
    deviceMode: state.deviceMode,
    linkActivatedAt: state.linkActivatedAt,
    localTimestamp: input.localTimestamp,
    selectedReturnState: input.selectedReturnState,
    reportingBasis: state.reviewRole === 'present-helper'
      ? 'affected-person-reported-entered-with-present-helper' as const
      : 'citizen-reported-unverified' as const,
    officialStatusObserved: false as const,
    ...(helperReturnAuthorization === undefined ? {} : { helperReturnAuthorization }),
    ...(input.referenceLastFour === undefined ? {} : { referenceLastFour: input.referenceLastFour }),
  };
  return brandAndFreeze(receipt, RECEIPT_BRAND);
}

export function isCurrentOfficialHandoffReceiptState(
  state: OfficialHandoffReceiptState,
  currentPack: OfficialHandoffPack,
): boolean {
  assertAuthenticPack(currentPack, 'An authentic current pack is required for receipt currentness.');
  assertAuthenticState(state);
  if (state.status === 'invalidated') return false;
  return bindingMatchesPack(state, currentPack);
}

export function invalidateOfficialHandoffReceipt(
  state: OfficialHandoffReceiptState,
  currentPack: OfficialHandoffPack,
): OfficialHandoffReceiptState {
  assertAuthenticPack(currentPack, 'An authentic current pack is required for receipt invalidation.');
  assertAuthenticState(state);
  if (state.status === 'invalidated' || bindingMatchesPack(state, currentPack)) return state;
  return brandAndFreeze({
    status: 'invalidated' as const,
    reason: 'pack-binding-changed' as const,
    previousPackRevisionId: state.packRevisionId,
    previousPackDigest: state.packDigest,
    currentPackRevisionId: currentPack.packRevisionId,
    currentPackDigest: currentPack.packDigest,
  }, INVALIDATED_BRAND);
}

/** Serializes an exact redacted allowlist; transition proof and role labels remain in memory only. */
export function serializeOfficialHandoffReceipt(
  receipt: OfficialHandoffReceipt,
  currentPack: OfficialHandoffPack,
): string {
  assertAuthenticPack(currentPack, 'An authentic current pack is required for receipt serialization.');
  if (!isPlainRecord(receipt) || !hasExactKeys(receipt, expectedReceiptKeys(receipt))) {
    throw new Error('A recorded receipt with the exact receipt shape is required.');
  }
  if (!isAuthenticReceipt(receipt)) throw new Error('A valid authentic recorded receipt is required.');
  if (!bindingMatchesPack(receipt, currentPack)) throw new Error('The receipt does not match the authentic current pack.');
  if (receipt.deviceMode !== 'private') throw new Error('Continuation receipts are available only on private devices.');

  const redacted: SerializedOfficialHandoffReceipt = {
    schema: OFFICIAL_HANDOFF_RECEIPT_SCHEMA,
    packRevisionId: receipt.packRevisionId,
    packDigest: receipt.packDigest,
    localTimestamp: receipt.localTimestamp,
    resultClass: receipt.resultClass,
    selectedReturnState: receipt.selectedReturnState,
    ...(receipt.referenceLastFour === undefined ? {} : { referenceLastFour: receipt.referenceLastFour }),
  };
  return JSON.stringify(redacted);
}
