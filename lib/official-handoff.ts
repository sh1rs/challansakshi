import {
  OFFICIAL_DESTINATIONS,
  OFFICIAL_ROUTE_REGISTRY_VERSION,
  isActionReadyOfficialDestination,
  isVerifiedOfficialDestinationShape,
  type JurisdictionConfirmation,
  type OfficialDestination,
} from './official-destinations';
import { sha256Hex } from './local-sha256';
import type {
  ActionReadyReviewFacts,
  ActionReadySupportedSignal,
  ReviewFact,
  ReviewFactSource,
  VehicleClass,
} from './public-challan';

export const OFFICIAL_HANDOFF_SCHEMA = 'challansakshi.official-handoff/v1' as const;
export const SYNTHETIC_HANDOFF_SCHEMA = 'challansakshi.synthetic-handoff/v1' as const;
export const MAX_REVIEWED_DESCRIPTION_CODE_POINTS = 500;
export const OPAQUE_REVISION_ID_PATTERN = /^[0-9a-f]{32}$/;
export const PACK_DIGEST_PATTERN = /^[0-9a-f]{64}$/;

export function isOpaqueRevisionId(value: unknown): value is string {
  return typeof value === 'string' && OPAQUE_REVISION_ID_PATTERN.test(value);
}

export function isPackDigest(value: unknown): value is string {
  return typeof value === 'string' && PACK_DIGEST_PATTERN.test(value);
}

export const EXPORT_SAFE_NEUTRAL_LIMITATIONS = Object.freeze({
  'official-record': 'Based only on the affected person’s review of the official record; ChallanSakshi did not authenticate it.',
  'official-evidence-image': 'Based only on the affected person’s review of the supplied evidence image; image interpretation may be limited.',
  'independent-vehicle-record': 'Based only on the affected person’s review of an independent readable vehicle record; ChallanSakshi did not authenticate it.',
  'citizen-attestation': 'Based only on the affected person’s explicit report for this review; ChallanSakshi did not independently verify it.',
} as const satisfies Record<ReviewFactSource, string>);

const OFFICIAL_PACK_BRAND = Symbol('challansakshi.authentic-official-handoff-pack');
const OFFICIAL_PACK_BRAND_VALUE = Object.freeze({ kind: 'builder-issued-official-pack' as const });

export type ReviewRole = 'self' | 'present-helper';
export type HandoffResultClass = 'possible-discrepancy';

export type SelfPackRoleConfirmation = Readonly<{
  role: 'self';
  affectedPersonInspectedEvidence: boolean;
  affectedPersonInspectedReadableRecord: boolean;
  affectedPersonConfirmedEntitlement: boolean;
  affectedPersonConfirmedPack: boolean;
}>;

export type PresentHelperPackRoleConfirmation = Readonly<{
  role: 'present-helper';
  affectedPersonPresent: boolean;
  affectedPersonInspectedEvidence: boolean;
  affectedPersonInspectedReadableRecord: boolean;
  affectedPersonConfirmedEntitlement: boolean;
  affectedPersonRequestedPreparation: boolean;
  affectedPersonConfirmedPack: boolean;
}>;

export type PackRoleConfirmation = SelfPackRoleConfirmation | PresentHelperPackRoleConfirmation;

export type FieldPackConfirmation = Readonly<{
  status: 'confirmed';
  packRevisionId: string;
  roleConfirmation: PackRoleConfirmation;
}>;

type SharedHandoffBuildInput = Readonly<{
  facts: ActionReadyReviewFacts;
  resultClass: HandoffResultClass;
  resultRevisionId: string;
  packRevisionId: string;
  reviewedDescription: string;
  confirmation: FieldPackConfirmation;
  generatedAt: string;
}>;

export type RealHandoffBuildInput = SharedHandoffBuildInput & Readonly<{
  mode: 'real';
  sourceKind: 'official-service' | 'official-download';
  route: OfficialDestination;
  jurisdictionConfirmation: JurisdictionConfirmation;
  now: string | Date;
}>;

export type SyntheticHandoffBuildInput = SharedHandoffBuildInput & Readonly<{
  mode: 'synthetic';
  sourceKind: 'bundled-synthetic-record';
  routeKey: 'synthetic-fixture';
}>;

export type LegacyIssueMapping = Readonly<{
  issueCode:
    | 'wrong-evidence-captured'
    | 'wrong-vehicle-number-entered-by-officer'
    | 'two-wheeler-on-four-wheeler'
    | 'four-wheeler-on-two-wheeler'
    | 'duplicate-number-plate';
  label:
    | 'Wrong Evidence Captured'
    | 'Wrong Vehicle Number Entered By Officer'
    | '2 Wheeler Challan On 4 Wheeler'
    | '4 Wheeler Challan On 2 Wheeler'
    | 'Duplicate Number Plate';
  value:
    | 'Wrong Image'
    | 'Wrong Vehicle Number Entered By Officer'
    | '2 Wheeler Challan On 4 Wheeler'
    | '4 Wheeler Challan On 2 Wheeler'
    | 'Duplicate Number Plate';
}>;

export type ReviewedFactProjection = Readonly<{
  reviewRevisionId: string;
  citizenVehicleClass?: ReviewFact<VehicleClass>;
  observedEvidenceVehicleClass?: ReviewFact<VehicleClass>;
  independentReadableVehicleRecord?: ReviewFact<boolean>;
  wrongEvidenceBasis?: ReviewFact<'different-vehicle' | 'unrelated-scene'>;
  vehicleNumberEntryMismatchBasis?: ReviewFact<'visible-entry-mismatch'>;
  duplicatePlateIndependentBasis?: ReviewFact<'citizen-confirmed'>;
  supportedSignals: readonly [ActionReadySupportedSignal, ...ActionReadySupportedSignal[]];
}>;

type PackFactBullet = Readonly<{
  statement: string;
  source: ReviewFactSource;
  confidence: 'high';
  limitation: string;
  confirmation: 'citizen-confirmed';
  reviewRevisionId: string;
}>;

export type OfficialHandoffPack = Readonly<{
  schema: typeof OFFICIAL_HANDOFF_SCHEMA;
  kind: 'official-handoff-pack';
  mode: 'real';
  sourceKind: RealHandoffBuildInput['sourceKind'];
  reviewRole: ReviewRole;
  resultClass: HandoffResultClass;
  resultRevisionId: string;
  packRevisionId: string;
  packDigest: string;
  issueFamily: 'wrong-photo-or-wrong-vehicle';
  routeRegistryVersion: typeof OFFICIAL_ROUTE_REGISTRY_VERSION;
  destination: Readonly<{
    key: 'legacy' | 'nextgen';
    serviceName: string;
    purpose: 'official-grievance-service';
    domain: string;
    canonicalUrl: string;
    routingRationale: string;
    verifier: string;
    evidenceRef: string;
    lastVerifiedAt: string;
    expiresAt: string;
  }>;
  evidenceAssessment: 'Possible discrepancy';
  facts: ReviewedFactProjection;
  factualBullets: readonly PackFactBullet[];
  evidenceSourceAndLimitations: readonly Readonly<{
    source: ReviewFactSource;
    limitation: string;
    reviewRevisionId: string;
  }>[];
  legacyIssue: LegacyIssueMapping | null;
  description: string;
  checklist: readonly string[];
  intentionallyBlankOfficialFields: readonly string[];
  nonLegalLimitation: string;
  fieldPackConfirmation: Readonly<{
    status: 'confirmed';
    confirmedBy: 'affected-person';
    packRevisionId: string;
  }>;
  generatedAt: string;
}>;

type ConfirmedExtensionHandoffSourceBase = Readonly<{
  resultRevisionId: string;
  packRevisionId: string;
  routeRegistryVersion: typeof OFFICIAL_ROUTE_REGISTRY_VERSION;
  description: string;
  confirmed: true;
  issuedAt: string;
}>;

export type ConfirmedExtensionHandoffSource =
  | (ConfirmedExtensionHandoffSourceBase & Readonly<{
    routeKey: 'legacy';
    issueCode: LegacyIssueMapping['issueCode'];
  }>)
  | (ConfirmedExtensionHandoffSourceBase & Readonly<{
    routeKey: 'nextgen';
    issueCode: null;
  }>);

export type SyntheticHandoffSimulation = Readonly<{
  schema: typeof SYNTHETIC_HANDOFF_SCHEMA;
  kind: 'synthetic-handoff-simulation';
  mode: 'synthetic';
  sourceKind: 'bundled-synthetic-record';
  routeKey: 'synthetic-fixture';
  permanentLabel: 'Synthetic demonstration data';
  reviewRole: ReviewRole;
  resultClass: HandoffResultClass;
  resultRevisionId: string;
  packRevisionId: string;
  issueFamily: 'wrong-photo-or-wrong-vehicle';
  facts: ReviewedFactProjection;
  factualBullets: readonly PackFactBullet[];
  legacyIssueSimulation: LegacyIssueMapping | null;
  description: string;
  checklist: readonly string[];
  nonLegalLimitation: string;
  fieldPackConfirmation: Readonly<{
    status: 'confirmed';
    confirmedBy: 'affected-person';
    packRevisionId: string;
  }>;
  generatedAt: string;
}>;

export type OfficialHandoffAbstentionReason =
  | 'invalid-real-input'
  | 'route-not-action-ready'
  | 'result-not-action-ready'
  | 'result-revision-mismatch'
  | 'pack-confirmation-stale'
  | 'role-confirmation-incomplete'
  | 'invalid-revision-id'
  | 'invalid-reviewed-facts'
  | 'invalid-description'
  | 'description-not-export-safe'
  | 'invalid-timestamp'
  | 'generated-at-mismatch';

export type SyntheticHandoffAbstentionReason =
  | 'invalid-synthetic-input'
  | 'result-not-action-ready'
  | 'result-revision-mismatch'
  | 'pack-confirmation-stale'
  | 'role-confirmation-incomplete'
  | 'invalid-revision-id'
  | 'invalid-reviewed-facts'
  | 'invalid-description'
  | 'description-not-export-safe'
  | 'invalid-timestamp';

export type OfficialHandoffBuildResult =
  | Readonly<{ status: 'built'; pack: OfficialHandoffPack }>
  | Readonly<{ status: 'abstained'; reason: OfficialHandoffAbstentionReason }>;

export type SyntheticHandoffBuildResult =
  | Readonly<{ status: 'built'; simulation: SyntheticHandoffSimulation }>
  | Readonly<{ status: 'abstained'; reason: SyntheticHandoffAbstentionReason }>;

const supportedSignals = new Set<ActionReadySupportedSignal>([
  'readable-plate-conflict',
  'vehicle-class-conflict',
  'wrong-evidence',
  'vehicle-number-entry-mismatch',
  'duplicate-plate',
]);

const factSources = new Set<ReviewFactSource>([
  'official-record',
  'official-evidence-image',
  'independent-vehicle-record',
  'citizen-attestation',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value;
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

/** Normalizes citizen-reviewed text without ever truncating it. */
export function normalizeReviewedDescription(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('Reviewed description must be a primitive string.');
  }
  if (!isWellFormedUnicode(value)) {
    throw new Error('Reviewed description must contain well-formed Unicode.');
  }
  const normalized = value.replace(/\r\n?/g, '\n').normalize('NFC');
  if (normalized.trim().length === 0) {
    throw new Error('Reviewed description must be non-empty.');
  }
  const codePointCount = Array.from(normalized).length;
  if (codePointCount > MAX_REVIEWED_DESCRIPTION_CODE_POINTS) {
    throw new Error(`Reviewed description has ${codePointCount} Unicode code points; the maximum is 500 Unicode code points. Text was not truncated.`);
  }
  return normalized;
}

export type BoundedExportSafetyMatch =
  | 'control-character'
  | 'bidi-format'
  | 'markup-or-script'
  | 'url'
  | 'email-or-upi'
  | 'digit-like-identifier'
  | 'pan-shaped'
  | 'indian-registration'
  | 'long-mixed-identifier'
  | 'credential-or-payment-token'
  | 'raw-filename'
  | 'fabricated-official-status';

function isAsciiAlphaNumeric(character: string | undefined): boolean {
  return character !== undefined && /^[A-Za-z0-9]$/.test(character);
}

function containsAsciiBoundedMatch(value: string, pattern: RegExp): boolean {
  for (const match of value.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!isAsciiAlphaNumeric(value[start - 1]) && !isAsciiAlphaNumeric(value[end])) return true;
  }
  return false;
}

function requirePrimitiveString(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new TypeError('Export-safety input must be a primitive string.');
}

type AsciiWordToken = Readonly<{ word: string; start: number; end: number }>;

function asciiWordTokens(value: string): readonly AsciiWordToken[] {
  return Array.from(value.matchAll(/[A-Za-z0-9]+/g), (match) => Object.freeze({
    word: match[0].toLowerCase(),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

export function containsMarkupOrScriptSentinel(value: unknown): boolean {
  requirePrimitiveString(value);
  return /[<>]/.test(value) || /(?:javascript:|vbscript:|data:text\/html)/i.test(value);
}

export function containsUrlLikeValue(value: unknown): boolean {
  requirePrimitiveString(value);
  if (/(?:https?:\/\/|www\.)/i.test(value)) return true;
  const domain = /(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}/g;
  return containsAsciiBoundedMatch(value, domain);
}

export function containsEmailOrUpiHandle(value: unknown): boolean {
  requirePrimitiveString(value);
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g;
  const handle = /[A-Za-z0-9._-]{2,64}@[A-Za-z0-9._-]{2,64}/g;
  return containsAsciiBoundedMatch(value, email) || containsAsciiBoundedMatch(value, handle);
}

export function containsDigitLikeIdentifier(value: unknown): boolean {
  requirePrimitiveString(value);
  for (const match of value.matchAll(/[0-9 +().-]+/g)) {
    const count = match[0].replace(/\D/g, '').length;
    if (count >= 9 && count <= 19) return true;
  }
  return false;
}

export function containsPanShapedValue(value: unknown): boolean {
  requirePrimitiveString(value);
  return containsAsciiBoundedMatch(value, /[A-Za-z]{5}[0-9]{4}[A-Za-z]/g);
}

export function containsIndianRegistration(value: unknown): boolean {
  requirePrimitiveString(value);
  const conventional = /[A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{1,3}[ -]?[0-9]{4}/g;
  const bharat = /[0-9]{2}[ -]?BH[ -]?[0-9]{4}[ -]?[A-Za-z]{1,2}/gi;
  return containsAsciiBoundedMatch(value, conventional) || containsAsciiBoundedMatch(value, bharat);
}

export function containsLongMixedIdentifier(value: unknown): boolean {
  requirePrimitiveString(value);
  for (const match of value.matchAll(/[A-Za-z0-9_-]+/g)) {
    const compact = match[0].replace(/[_-]/g, '');
    const letters = (compact.match(/[A-Za-z]/g) ?? []).length;
    const digits = (compact.match(/[0-9]/g) ?? []).length;
    if (compact.length >= 12 && letters >= 2 && digits >= 4) return true;
  }
  return false;
}

const credentialKeywordSequences = Object.freeze([
  ['password'], ['passcode'], ['credential'], ['secret'], ['otp'], ['captcha'], ['cvv'],
  ['api', 'key'], ['key', 'api'], ['upi', 'pin'], ['pin', 'upi'],
  ['payment', 'token'], ['token', 'payment'], ['bank', 'account'], ['account', 'bank'],
  ['account', 'number'], ['number', 'account'], ['card', 'number'], ['number', 'card'],
  ['transaction', 'id'], ['id', 'transaction'],
] as const);
const credentialKeywordWords: ReadonlySet<string> = new Set(credentialKeywordSequences.flat());
const statusNouns = new Set([
  'submission', 'grievance', 'complaint', 'ticket', 'case', 'status',
  'acknowledgement', 'acknowledgment', 'confirmation', 'authority', 'government', 'police',
]);
const officialOutcomeWords = new Set([
  'success', 'successful', 'successfully', 'submitted', 'filed', 'created', 'accepted',
  'approved', 'acknowledged', 'cancelled', 'canceled', 'resolved', 'completed',
]);

function wordsMatchAt(tokens: readonly AsciiWordToken[], start: number, words: readonly string[]): boolean {
  return words.every((word, offset) => tokens[start + offset]?.word === word);
}

export function containsCredentialOrPaymentToken(value: unknown): boolean {
  requirePrimitiveString(value);
  const tokens = asciiWordTokens(value);
  for (let index = 0; index < tokens.length; index += 1) {
    for (const keyword of credentialKeywordSequences) {
      if (!wordsMatchAt(tokens, index, keyword)) continue;
      const keywordEnd = tokens[index + keyword.length - 1].end;
      const following = tokens.slice(index + keyword.length, index + keyword.length + 3);
      for (let offset = 0; offset < following.length; offset += 1) {
        const candidate = following[offset];
        if (candidate.start - keywordEnd > 48) break;
        const separator = value.slice(keywordEnd, candidate.start);
        const marked = /[:=\-–—>→\[\](){}]/u.test(separator)
          || (offset > 0 && ['value', 'code', 'number', 'id'].includes(following[offset - 1].word));
        const looksLikeValue = /[0-9]/.test(candidate.word)
          && (candidate.word.length >= 3 || /[A-Za-z]/.test(candidate.word));
        if (!credentialKeywordWords.has(candidate.word)
          && ((marked && candidate.word.length >= 2) || looksLikeValue)) return true;
      }
    }
  }
  return false;
}

export function containsRawFilename(value: unknown): boolean {
  requirePrimitiveString(value);
  for (const extension of value.matchAll(/\.(?:pdf|jpe?g|png|webp|heic|gif|tiff?|docx?|xlsx?|txt|csv)(?![A-Za-z0-9])/gi)) {
    const dot = extension.index ?? 0;
    const boundedPrefix = value.slice(Math.max(0, dot - 127), dot);
    const basename = boundedPrefix.slice(Math.max(
      boundedPrefix.lastIndexOf('/'),
      boundedPrefix.lastIndexOf('\\'),
      boundedPrefix.lastIndexOf('\n'),
      boundedPrefix.lastIndexOf('\r'),
      boundedPrefix.lastIndexOf('\t'),
    ) + 1).trim();
    if (
      basename.length > 0
      && basename.length <= 127
      && /^[\x20-\x7e]+$/.test(basename)
      && /[A-Za-z0-9]/.test(basename)
      && /[A-Za-z0-9)\]}]$/.test(basename)
    ) return true;
  }
  return false;
}

export function containsFabricatedOfficialStatus(value: unknown): boolean {
  requirePrimitiveString(value);
  const tokens = asciiWordTokens(value);
  for (let left = 0; left < tokens.length; left += 1) {
    for (let right = Math.max(0, left - 5); right <= Math.min(tokens.length - 1, left + 5); right += 1) {
      if (left === right) continue;
      const pairMatches = (statusNouns.has(tokens[left].word) && officialOutcomeWords.has(tokens[right].word))
        || (officialOutcomeWords.has(tokens[left].word) && statusNouns.has(tokens[right].word));
      if (pairMatches && Math.abs(tokens[right].start - tokens[left].start) <= 96) return true;
    }
  }
  return false;
}

/** Shared bounded matcher used by the web pack and the extension envelope. */
export function findBoundedExportSafetyMatches(value: unknown): readonly BoundedExportSafetyMatch[] {
  requirePrimitiveString(value);
  const matches: BoundedExportSafetyMatch[] = [];
  const add = (match: BoundedExportSafetyMatch, condition: boolean) => {
    if (condition) matches.push(match);
  };
  add('control-character', /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u.test(value));
  add('bidi-format', /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value));
  add('markup-or-script', containsMarkupOrScriptSentinel(value));
  add('url', containsUrlLikeValue(value));
  add('email-or-upi', containsEmailOrUpiHandle(value));
  add('digit-like-identifier', containsDigitLikeIdentifier(value));
  add('pan-shaped', containsPanShapedValue(value));
  add('indian-registration', containsIndianRegistration(value));
  add('long-mixed-identifier', containsLongMixedIdentifier(value));
  add('credential-or-payment-token', containsCredentialOrPaymentToken(value));
  add('raw-filename', containsRawFilename(value));
  add('fabricated-official-status', containsFabricatedOfficialStatus(value));
  return Object.freeze(matches);
}

export function validateExportSafeReviewedText(value: unknown): string {
  requirePrimitiveString(value);
  const matches = findBoundedExportSafetyMatches(value);
  if (matches.length > 0) {
    throw new Error(`Reviewed text failed bounded export-safety checks: ${matches.join(', ')}.`);
  }
  return value;
}

function cloneFact<T>(candidate: unknown, revisionId: string): ReviewFact<T> | null {
  if (!isRecord(candidate)) return null;
  if (
    !factSources.has(candidate.source as ReviewFactSource)
    || candidate.confidence !== 'high'
    || candidate.confirmation !== 'citizen-confirmed'
    || !isOpaqueRevisionId(candidate.reviewRevisionId)
    || candidate.reviewRevisionId !== revisionId
    || !nonEmptyText(candidate.limitation)
  ) return null;

  return Object.freeze({
    value: candidate.value as T,
    source: candidate.source as ReviewFactSource,
    confidence: 'high' as const,
    limitation: EXPORT_SAFE_NEUTRAL_LIMITATIONS[candidate.source as ReviewFactSource],
    confirmation: 'citizen-confirmed' as const,
    reviewRevisionId: revisionId,
  });
}

function twoVersusFour(left: unknown, right: unknown): boolean {
  return (left === 'two-wheeler' && right === 'four-wheeler')
    || (left === 'four-wheeler' && right === 'two-wheeler');
}

/** Rebuilds only the neutral, provenance-bearing fields approved by Task 1. */
export function buildReviewedFactProjection(facts: ActionReadyReviewFacts): ReviewedFactProjection {
  if (!isRecord(facts)) throw new Error('Action-ready facts are invalid.');
  const reviewRevisionCandidate = facts.reviewRevisionId;
  const supportedSignalsCandidate = facts.supportedSignals;
  if (!isOpaqueRevisionId(reviewRevisionCandidate) || !Array.isArray(supportedSignalsCandidate)) {
    throw new Error('Action-ready facts are invalid.');
  }
  const reviewRevisionId = reviewRevisionCandidate;
  const signals = [...supportedSignalsCandidate];
  if (
    signals.length === 0
    || signals.some((signal) => !supportedSignals.has(signal))
    || new Set(signals).size !== signals.length
  ) throw new Error('Action-ready facts contain invalid supported signals.');

  const projection: {
    reviewRevisionId: string;
    citizenVehicleClass?: ReviewFact<VehicleClass>;
    observedEvidenceVehicleClass?: ReviewFact<VehicleClass>;
    independentReadableVehicleRecord?: ReviewFact<boolean>;
    wrongEvidenceBasis?: ReviewFact<'different-vehicle' | 'unrelated-scene'>;
    vehicleNumberEntryMismatchBasis?: ReviewFact<'visible-entry-mismatch'>;
    duplicatePlateIndependentBasis?: ReviewFact<'citizen-confirmed'>;
    supportedSignals: readonly [ActionReadySupportedSignal, ...ActionReadySupportedSignal[]];
  } = {
    reviewRevisionId,
    supportedSignals: Object.freeze(signals) as readonly [ActionReadySupportedSignal, ...ActionReadySupportedSignal[]],
  };

  if (facts.citizenVehicleClass !== undefined) {
    const cloned = cloneFact<VehicleClass>(facts.citizenVehicleClass, reviewRevisionId);
    if (!cloned || cloned.source !== 'independent-vehicle-record'
      || !['two-wheeler', 'four-wheeler', 'other', 'unclear'].includes(cloned.value)) {
      throw new Error('Citizen vehicle-class fact is invalid.');
    }
    projection.citizenVehicleClass = cloned;
  }
  if (facts.observedEvidenceVehicleClass !== undefined) {
    const cloned = cloneFact<VehicleClass>(facts.observedEvidenceVehicleClass, reviewRevisionId);
    if (!cloned || cloned.source !== 'official-evidence-image'
      || !['two-wheeler', 'four-wheeler', 'other', 'unclear'].includes(cloned.value)) {
      throw new Error('Evidence vehicle-class fact is invalid.');
    }
    projection.observedEvidenceVehicleClass = cloned;
  }
  if (facts.independentReadableVehicleRecord !== undefined) {
    const cloned = cloneFact<boolean>(facts.independentReadableVehicleRecord, reviewRevisionId);
    if (!cloned || cloned.source !== 'independent-vehicle-record' || cloned.value !== true) {
      throw new Error('Independent readable-record fact is invalid.');
    }
    projection.independentReadableVehicleRecord = cloned;
  }
  if (facts.wrongEvidenceBasis !== undefined) {
    const cloned = cloneFact<'different-vehicle' | 'unrelated-scene'>(facts.wrongEvidenceBasis, reviewRevisionId);
    if (!cloned || cloned.source !== 'citizen-attestation'
      || !['different-vehicle', 'unrelated-scene'].includes(cloned.value)) {
      throw new Error('Wrong-evidence basis is invalid.');
    }
    projection.wrongEvidenceBasis = cloned;
  }
  if (facts.vehicleNumberEntryMismatchBasis !== undefined) {
    const cloned = cloneFact<'visible-entry-mismatch'>(facts.vehicleNumberEntryMismatchBasis, reviewRevisionId);
    if (!cloned || cloned.source !== 'official-record' || cloned.value !== 'visible-entry-mismatch') {
      throw new Error('Vehicle-number entry-mismatch basis is invalid.');
    }
    projection.vehicleNumberEntryMismatchBasis = cloned;
  }
  if (facts.duplicatePlateIndependentBasis !== undefined) {
    const cloned = cloneFact<'citizen-confirmed'>(facts.duplicatePlateIndependentBasis, reviewRevisionId);
    if (!cloned || cloned.source !== 'citizen-attestation' || cloned.value !== 'citizen-confirmed') {
      throw new Error('Duplicate-plate independent basis is invalid.');
    }
    projection.duplicatePlateIndependentBasis = cloned;
  }

  if (signals.includes('readable-plate-conflict') && !projection.independentReadableVehicleRecord) {
    throw new Error('Readable plate conflict requires an independent readable record.');
  }
  if (signals.includes('vehicle-class-conflict') && (
    !projection.citizenVehicleClass
    || !projection.observedEvidenceVehicleClass
    || !projection.independentReadableVehicleRecord
    || !twoVersusFour(projection.citizenVehicleClass.value, projection.observedEvidenceVehicleClass.value)
  )) throw new Error('Vehicle-class conflict requires explicit confirmed two-versus-four facts.');
  if (signals.includes('wrong-evidence') && !projection.wrongEvidenceBasis) {
    throw new Error('Wrong-evidence signal requires an explicit basis.');
  }
  if (signals.includes('vehicle-number-entry-mismatch') && !projection.vehicleNumberEntryMismatchBasis) {
    throw new Error('Vehicle-number entry mismatch requires an explicit basis.');
  }
  if (signals.includes('duplicate-plate') && !projection.duplicatePlateIndependentBasis) {
    throw new Error('Duplicate-plate signal requires an independent citizen-confirmed basis.');
  }

  return Object.freeze(projection);
}

/** Maps only exact currently specified Legacy labels and values; otherwise abstains. */
export function mapLegacyIssue(facts: ActionReadyReviewFacts | ReviewedFactProjection): LegacyIssueMapping | null {
  let projection: ReviewedFactProjection;
  try {
    projection = buildReviewedFactProjection(facts as ActionReadyReviewFacts);
  } catch {
    return null;
  }

  const matches: LegacyIssueMapping[] = [];
  if (
    projection.supportedSignals.includes('wrong-evidence')
    && projection.wrongEvidenceBasis?.source === 'citizen-attestation'
    && (projection.wrongEvidenceBasis.value === 'different-vehicle'
      || projection.wrongEvidenceBasis.value === 'unrelated-scene')
  ) matches.push(Object.freeze({
    issueCode: 'wrong-evidence-captured',
    label: 'Wrong Evidence Captured',
    value: 'Wrong Image',
  }));
  if (
    projection.supportedSignals.includes('vehicle-number-entry-mismatch')
    && projection.vehicleNumberEntryMismatchBasis?.source === 'official-record'
    && projection.vehicleNumberEntryMismatchBasis.value === 'visible-entry-mismatch'
  ) matches.push(Object.freeze({
    issueCode: 'wrong-vehicle-number-entered-by-officer',
    label: 'Wrong Vehicle Number Entered By Officer',
    value: 'Wrong Vehicle Number Entered By Officer',
  }));
  if (
    projection.supportedSignals.includes('vehicle-class-conflict')
    && projection.citizenVehicleClass?.source === 'independent-vehicle-record'
    && projection.citizenVehicleClass.value === 'four-wheeler'
    && projection.observedEvidenceVehicleClass?.source === 'official-evidence-image'
    && projection.observedEvidenceVehicleClass.value === 'two-wheeler'
  ) matches.push(Object.freeze({
    issueCode: 'two-wheeler-on-four-wheeler',
    label: '2 Wheeler Challan On 4 Wheeler',
    value: '2 Wheeler Challan On 4 Wheeler',
  }));
  if (
    projection.supportedSignals.includes('vehicle-class-conflict')
    && projection.citizenVehicleClass?.source === 'independent-vehicle-record'
    && projection.citizenVehicleClass.value === 'two-wheeler'
    && projection.observedEvidenceVehicleClass?.source === 'official-evidence-image'
    && projection.observedEvidenceVehicleClass.value === 'four-wheeler'
  ) matches.push(Object.freeze({
    issueCode: 'four-wheeler-on-two-wheeler',
    label: '4 Wheeler Challan On 2 Wheeler',
    value: '4 Wheeler Challan On 2 Wheeler',
  }));
  if (
    projection.supportedSignals.includes('duplicate-plate')
    && projection.duplicatePlateIndependentBasis?.source === 'citizen-attestation'
    && projection.duplicatePlateIndependentBasis.value === 'citizen-confirmed'
    && projection.independentReadableVehicleRecord?.source === 'independent-vehicle-record'
    && projection.independentReadableVehicleRecord.value === true
  ) matches.push(Object.freeze({
    issueCode: 'duplicate-number-plate',
    label: 'Duplicate Number Plate',
    value: 'Duplicate Number Plate',
  }));

  return matches.length === 1 ? matches[0] : null;
}

function roleConfirmationIsComplete(value: unknown): value is PackRoleConfirmation {
  if (!isRecord(value)) return false;
  const shared = value.affectedPersonInspectedEvidence === true
    && value.affectedPersonInspectedReadableRecord === true
    && value.affectedPersonConfirmedEntitlement === true
    && value.affectedPersonConfirmedPack === true;
  if (!shared) return false;
  if (value.role === 'self') return true;
  return value.role === 'present-helper'
    && value.affectedPersonPresent === true
    && value.affectedPersonRequestedPreparation === true;
}

function validateSharedInput(input: SharedHandoffBuildInput):
  | Readonly<{
    ok: true;
    facts: ReviewedFactProjection;
    description: string;
    role: ReviewRole;
    resultRevisionId: string;
    packRevisionId: string;
    generatedAt: string;
  }>
  | Readonly<{
    ok: false;
    reason: Exclude<OfficialHandoffAbstentionReason, 'invalid-real-input' | 'route-not-action-ready' | 'generated-at-mismatch'>;
  }> {
  if (input.resultClass !== 'possible-discrepancy') {
    return { ok: false, reason: 'result-not-action-ready' };
  }
  const resultRevisionCandidate: unknown = input.resultRevisionId;
  const packRevisionCandidate: unknown = input.packRevisionId;
  const factsCandidate: unknown = input.facts;
  if (
    !isOpaqueRevisionId(resultRevisionCandidate)
    || !isOpaqueRevisionId(packRevisionCandidate)
    || !isRecord(factsCandidate)
  ) return { ok: false, reason: 'invalid-revision-id' };
  const reviewRevisionCandidate: unknown = factsCandidate.reviewRevisionId;
  if (!isOpaqueRevisionId(reviewRevisionCandidate)) return { ok: false, reason: 'invalid-revision-id' };
  if (reviewRevisionCandidate !== resultRevisionCandidate) {
    return { ok: false, reason: 'result-revision-mismatch' };
  }
  const confirmationCandidate: unknown = input.confirmation;
  if (!isRecord(confirmationCandidate)) return { ok: false, reason: 'pack-confirmation-stale' };
  const confirmedPackRevisionCandidate: unknown = confirmationCandidate.packRevisionId;
  if (!isOpaqueRevisionId(confirmedPackRevisionCandidate)) return { ok: false, reason: 'invalid-revision-id' };
  if (
    confirmationCandidate.status !== 'confirmed'
    || confirmedPackRevisionCandidate !== packRevisionCandidate
  ) return { ok: false, reason: 'pack-confirmation-stale' };
  const roleConfirmationCandidate: unknown = confirmationCandidate.roleConfirmation;
  if (!roleConfirmationIsComplete(roleConfirmationCandidate)) {
    return { ok: false, reason: 'role-confirmation-incomplete' };
  }
  const generatedAtCandidate: unknown = input.generatedAt;
  if (!isCanonicalTimestamp(generatedAtCandidate)) return { ok: false, reason: 'invalid-timestamp' };

  let facts: ReviewedFactProjection;
  try {
    facts = buildReviewedFactProjection(factsCandidate as unknown as ActionReadyReviewFacts);
  } catch {
    return { ok: false, reason: 'invalid-reviewed-facts' };
  }
  let description: string;
  try {
    description = normalizeReviewedDescription(input.reviewedDescription);
  } catch {
    return { ok: false, reason: 'invalid-description' };
  }
  try {
    validateExportSafeReviewedText(description);
  } catch {
    return { ok: false, reason: 'description-not-export-safe' };
  }
  return {
    ok: true,
    facts,
    description,
    role: roleConfirmationCandidate.role,
    resultRevisionId: resultRevisionCandidate,
    packRevisionId: packRevisionCandidate,
    generatedAt: generatedAtCandidate,
  };
}

function projectFactBullets(facts: ReviewedFactProjection): readonly PackFactBullet[] {
  const bullets: PackFactBullet[] = [];
  const add = (statement: string, fact: ReviewFact<unknown>) => bullets.push(Object.freeze({
    statement,
    source: fact.source,
    confidence: 'high',
    limitation: fact.limitation,
    confirmation: 'citizen-confirmed',
    reviewRevisionId: fact.reviewRevisionId,
  }));

  if (facts.citizenVehicleClass) {
    add(`The affected person's readable vehicle record shows a ${facts.citizenVehicleClass.value}.`, facts.citizenVehicleClass);
  }
  if (facts.observedEvidenceVehicleClass) {
    add(`The supplied evidence image appears to show a ${facts.observedEvidenceVehicleClass.value}.`, facts.observedEvidenceVehicleClass);
  }
  if (facts.wrongEvidenceBasis) {
    add(
      facts.wrongEvidenceBasis.value === 'unrelated-scene'
        ? 'The affected person confirmed that the supplied evidence appears to show an unrelated scene.'
        : 'The affected person confirmed that the supplied evidence appears to show a different vehicle.',
      facts.wrongEvidenceBasis,
    );
  }
  if (facts.vehicleNumberEntryMismatchBasis) {
    add('The reviewed official record supports a possible vehicle-number entry mismatch.', facts.vehicleNumberEntryMismatchBasis);
  }
  if (facts.duplicatePlateIndependentBasis) {
    add('The affected person separately reported an independent basis for a possible duplicate number plate.', facts.duplicatePlateIndependentBasis);
  }
  if (bullets.length === 0 && facts.independentReadableVehicleRecord) {
    add('The affected person confirmed that an independent readable vehicle record was reviewed.', facts.independentReadableVehicleRecord);
  }
  return Object.freeze(bullets);
}

function projectSources(facts: ReviewedFactProjection): OfficialHandoffPack['evidenceSourceAndLimitations'] {
  const candidates = [
    facts.citizenVehicleClass,
    facts.observedEvidenceVehicleClass,
    facts.independentReadableVehicleRecord,
    facts.wrongEvidenceBasis,
    facts.vehicleNumberEntryMismatchBasis,
    facts.duplicatePlateIndependentBasis,
  ];
  const projected: Array<Readonly<{
    source: ReviewFactSource;
    limitation: string;
    reviewRevisionId: string;
  }>> = [];
  for (const fact of candidates) {
    if (!fact) continue;
    projected.push(Object.freeze({
      source: fact.source,
      limitation: fact.limitation,
      reviewRevisionId: fact.reviewRevisionId,
    }));
  }
  return Object.freeze(projected);
}

const intentionallyBlankOfficialFields = Object.freeze([
  'challan or notice identifier',
  'identity and contact details',
  'CAPTCHA or OTP',
  'offence selection',
  'declaration and submission',
  'payment details',
] as const);

const nextgenChecklist = Object.freeze([
  'Enter the challan number directly on the official service, or use the separate private-device copy aid.',
  'Choose any offence requested by the official service yourself.',
  'Review the description before submitting on the official service.',
] as const);

const legacyChecklist = Object.freeze([
  'Enter the challan number directly on the official service, or use the separate private-device copy aid.',
  'Review the category and description before submitting on the official service.',
  'Choose any original JPEG, JPG, or PNG attachment directly on the official service; ChallanSakshi does not process or upload it.',
] as const);

export type OfficialHandoffChecklistRoute = 'legacy' | 'nextgen';

/** Single source of truth for the exact pre-confirmation and built-pack checklist. */
export function getOfficialHandoffChecklist(route: OfficialHandoffChecklistRoute): readonly string[] {
  return route === 'legacy' ? legacyChecklist : nextgenChecklist;
}

const syntheticChecklist = Object.freeze([
  'This is a fictional field-pack simulation for the synthetic proof lane.',
  'No government service is contacted and no official compatibility is asserted.',
] as const);

type OfficialHandoffPackWithoutDigest = Omit<OfficialHandoffPack, 'packDigest'>;
type MutableOfficialHandoffPack = { -readonly [Key in keyof OfficialHandoffPack]: OfficialHandoffPack[Key] };

const officialPackKeys = [
  'schema', 'kind', 'mode', 'sourceKind', 'reviewRole', 'resultClass', 'resultRevisionId',
  'packRevisionId', 'packDigest', 'issueFamily', 'routeRegistryVersion', 'destination',
  'evidenceAssessment', 'facts', 'factualBullets', 'evidenceSourceAndLimitations',
  'legacyIssue', 'description', 'checklist', 'intentionallyBlankOfficialFields',
  'nonLegalLimitation', 'fieldPackConfirmation', 'generatedAt',
] as const;

const issuedOfficialPacks = new WeakSet<object>();
const CONFIRMED_EXTENSION_SOURCE_BRAND = Symbol('challansakshi.authentic-confirmed-extension-handoff-source');
const CONFIRMED_EXTENSION_SOURCE_BRAND_VALUE = Object.freeze({ kind: 'builder-issued-extension-capability' as const });
const confirmedExtensionSources = new WeakSet<object>();
const confirmedExtensionSourceBindings = new WeakMap<object, Readonly<{
  pack: OfficialHandoffPack;
  digest: string;
}>>();
const confirmedExtensionSourceKeys = [
  'resultRevisionId',
  'packRevisionId',
  'routeRegistryVersion',
  'description',
  'confirmed',
  'issuedAt',
  'routeKey',
  'issueCode',
] as const;
const legacyIssueCodes = new Set<LegacyIssueMapping['issueCode']>([
  'wrong-evidence-captured',
  'wrong-vehicle-number-entered-by-officer',
  'two-wheeler-on-four-wheeler',
  'four-wheeler-on-two-wheeler',
  'duplicate-number-plate',
]);

function sameOwnStringKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function deepFreeze<T>(value: T): T {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  return Object.freeze(value);
}

function isDeepFrozen(value: unknown, seen = new Set<object>()): boolean {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return true;
  if (seen.has(value)) return true;
  seen.add(value);
  if (!Object.isFrozen(value)) return false;
  return Reflect.ownKeys(value).every((key) => isDeepFrozen((value as Record<PropertyKey, unknown>)[key], seen));
}

function canonicalPackDigestInput(pack: OfficialHandoffPackWithoutDigest): string {
  return JSON.stringify({
    schema: pack.schema,
    kind: pack.kind,
    mode: pack.mode,
    sourceKind: pack.sourceKind,
    reviewRole: pack.reviewRole,
    resultClass: pack.resultClass,
    resultRevisionId: pack.resultRevisionId,
    packRevisionId: pack.packRevisionId,
    issueFamily: pack.issueFamily,
    routeRegistryVersion: pack.routeRegistryVersion,
    destination: {
      key: pack.destination.key,
      serviceName: pack.destination.serviceName,
      purpose: pack.destination.purpose,
      domain: pack.destination.domain,
      canonicalUrl: pack.destination.canonicalUrl,
      routingRationale: pack.destination.routingRationale,
      verifier: pack.destination.verifier,
      evidenceRef: pack.destination.evidenceRef,
      lastVerifiedAt: pack.destination.lastVerifiedAt,
      expiresAt: pack.destination.expiresAt,
    },
    evidenceAssessment: pack.evidenceAssessment,
    facts: pack.facts,
    factualBullets: pack.factualBullets,
    evidenceSourceAndLimitations: pack.evidenceSourceAndLimitations,
    legacyIssue: pack.legacyIssue,
    description: pack.description,
    checklist: pack.checklist,
    intentionallyBlankOfficialFields: pack.intentionallyBlankOfficialFields,
    nonLegalLimitation: pack.nonLegalLimitation,
    fieldPackConfirmation: pack.fieldPackConfirmation,
    generatedAt: pack.generatedAt,
  });
}

export function canonicalOfficialHandoffPackDigestInput(pack: OfficialHandoffPack): string {
  if (!isAuthenticOfficialHandoffPack(pack)) throw new Error('An authentic official handoff pack is required.');
  return canonicalPackDigestInput(pack);
}

function destinationMatchesCurrentRegistry(pack: OfficialHandoffPack): boolean {
  if (pack.destination.key !== 'legacy' && pack.destination.key !== 'nextgen') return false;
  const expected = OFFICIAL_DESTINATIONS[pack.destination.key];
  return expected.releaseState === 'current'
    && isVerifiedOfficialDestinationShape(expected, pack.generatedAt)
    && pack.destination.serviceName === expected.serviceName
    && pack.destination.purpose === 'official-grievance-service'
    && pack.destination.domain === expected.domain
    && pack.destination.canonicalUrl === expected.canonicalUrl
    && pack.destination.routingRationale === expected.routingRationale
    && pack.destination.verifier === expected.verifier
    && pack.destination.evidenceRef === expected.evidenceRef
    && pack.destination.lastVerifiedAt === expected.lastVerifiedAt
    && pack.destination.expiresAt === expected.expiresAt;
}

/** Accepts only a live builder-issued real pack whose complete digest binding still matches. */
export function isAuthenticOfficialHandoffPack(candidate: unknown): candidate is OfficialHandoffPack {
  if (!isRecord(candidate) || Object.getPrototypeOf(candidate) !== Object.prototype) return false;
  if (!issuedOfficialPacks.has(candidate) || !sameOwnStringKeys(candidate, officialPackKeys)) return false;
  const brand = (candidate as Record<PropertyKey, unknown>)[OFFICIAL_PACK_BRAND];
  if (!isRecord(brand) || brand.issuer !== OFFICIAL_PACK_BRAND_VALUE || brand.digest !== candidate.packDigest) return false;
  if (
    candidate.schema !== OFFICIAL_HANDOFF_SCHEMA
    || candidate.kind !== 'official-handoff-pack'
    || candidate.mode !== 'real'
    || (candidate.sourceKind !== 'official-service' && candidate.sourceKind !== 'official-download')
    || (candidate.reviewRole !== 'self' && candidate.reviewRole !== 'present-helper')
    || candidate.resultClass !== 'possible-discrepancy'
    || !isOpaqueRevisionId(candidate.resultRevisionId)
    || !isOpaqueRevisionId(candidate.packRevisionId)
    || !isPackDigest(candidate.packDigest)
    || candidate.routeRegistryVersion !== OFFICIAL_ROUTE_REGISTRY_VERSION
    || candidate.issueFamily !== 'wrong-photo-or-wrong-vehicle'
    || candidate.evidenceAssessment !== 'Possible discrepancy'
    || !isCanonicalTimestamp(candidate.generatedAt)
    || !isRecord(candidate.destination)
    || !destinationMatchesCurrentRegistry(candidate as OfficialHandoffPack)
    || !isRecord(candidate.fieldPackConfirmation)
    || candidate.fieldPackConfirmation.status !== 'confirmed'
    || candidate.fieldPackConfirmation.confirmedBy !== 'affected-person'
    || candidate.fieldPackConfirmation.packRevisionId !== candidate.packRevisionId
    || !isDeepFrozen(candidate)
  ) return false;
  try {
    if (normalizeReviewedDescription(candidate.description as string) !== candidate.description) return false;
    validateExportSafeReviewedText(candidate.description as string);
    return sha256Hex(canonicalPackDigestInput(candidate as OfficialHandoffPack)) === candidate.packDigest;
  } catch {
    return false;
  }
}

/** Accepts only the exact reduced capability objects issued from authentic real packs. */
export function isAuthenticConfirmedExtensionHandoffSource(
  value: unknown,
): value is ConfirmedExtensionHandoffSource {
  try {
    if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return false;
    if (!confirmedExtensionSources.has(value)) return false;
    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    if (!sameOwnStringKeys(value, confirmedExtensionSourceKeys)) return false;

    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== confirmedExtensionSourceKeys.length + 1
      || ownKeys[ownKeys.length - 1] !== CONFIRMED_EXTENSION_SOURCE_BRAND
      || (value as Record<PropertyKey, unknown>)[CONFIRMED_EXTENSION_SOURCE_BRAND]
        !== CONFIRMED_EXTENSION_SOURCE_BRAND_VALUE
    ) return false;
    for (const key of confirmedExtensionSourceKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || descriptor.configurable || descriptor.writable || !('value' in descriptor)) {
        return false;
      }
    }

    const binding = confirmedExtensionSourceBindings.get(value);
    if (
      !binding
      || !isPackDigest(binding.digest)
      || !isAuthenticOfficialHandoffPack(binding.pack)
      || binding.pack.packDigest !== binding.digest
    ) return false;

    const candidate = value as Record<string, unknown>;
    if (
      !isOpaqueRevisionId(candidate.resultRevisionId)
      || !isOpaqueRevisionId(candidate.packRevisionId)
      || candidate.routeRegistryVersion !== OFFICIAL_ROUTE_REGISTRY_VERSION
      || candidate.confirmed !== true
      || !isCanonicalTimestamp(candidate.issuedAt)
      || !isDeepFrozen(value)
      || candidate.resultRevisionId !== binding.pack.resultRevisionId
      || candidate.packRevisionId !== binding.pack.packRevisionId
      || candidate.description !== binding.pack.description
      || candidate.issuedAt !== binding.pack.generatedAt
      || candidate.routeKey !== binding.pack.destination.key
    ) return false;
    if (normalizeReviewedDescription(candidate.description) !== candidate.description) return false;
    validateExportSafeReviewedText(candidate.description);

    if (candidate.routeKey === 'nextgen') {
      return candidate.issueCode === null && binding.pack.legacyIssue === null;
    }
    return candidate.routeKey === 'legacy'
      && typeof candidate.issueCode === 'string'
      && legacyIssueCodes.has(candidate.issueCode as LegacyIssueMapping['issueCode'])
      && binding.pack.legacyIssue?.issueCode === candidate.issueCode;
  } catch {
    return false;
  }
}

/** Reconstructs the only confirmed pack fields the extension is permitted to consume. */
export function projectConfirmedExtensionHandoffSource(
  pack: OfficialHandoffPack,
): ConfirmedExtensionHandoffSource {
  if (!isAuthenticOfficialHandoffPack(pack)) {
    throw new Error('An authentic official handoff pack is required to issue an extension capability.');
  }
  const sharedSource = {
    resultRevisionId: pack.resultRevisionId,
    packRevisionId: pack.packRevisionId,
    routeRegistryVersion: pack.routeRegistryVersion,
    description: pack.description,
    confirmed: true,
    issuedAt: pack.generatedAt,
  } as const;
  let source: ConfirmedExtensionHandoffSource;
  if (pack.destination.key === 'legacy') {
    const legacyIssue = pack.legacyIssue;
    if (legacyIssue === null) throw new Error('An authentic Legacy pack requires an exact mapped issue.');
    source = { ...sharedSource, routeKey: 'legacy', issueCode: legacyIssue.issueCode };
  } else {
    if (pack.legacyIssue !== null) throw new Error('An authentic NextGen pack cannot carry a Legacy issue.');
    source = { ...sharedSource, routeKey: 'nextgen', issueCode: null };
  }
  Object.defineProperty(source, CONFIRMED_EXTENSION_SOURCE_BRAND, {
    value: CONFIRMED_EXTENSION_SOURCE_BRAND_VALUE,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  confirmedExtensionSources.add(source);
  confirmedExtensionSourceBindings.set(source, Object.freeze({ pack, digest: pack.packDigest }));
  deepFreeze(source);
  if (!isAuthenticConfirmedExtensionHandoffSource(source)) {
    confirmedExtensionSources.delete(source);
    confirmedExtensionSourceBindings.delete(source);
    throw new Error('The reduced extension handoff capability could not be authenticated.');
  }
  return source;
}

function instantMilliseconds(value: string | Date): number | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function isRealWrapperInput(input: unknown): input is RealHandoffBuildInput {
  return isRecord(input)
    && input.mode === 'real'
    && (input.sourceKind === 'official-service' || input.sourceKind === 'official-download')
    && isRecord(input.route)
    && isRecord(input.jurisdictionConfirmation)
    && !hasOwn(input, 'routeKey');
}

function isSyntheticWrapperInput(input: unknown): input is SyntheticHandoffBuildInput {
  return isRecord(input)
    && input.mode === 'synthetic'
    && input.sourceKind === 'bundled-synthetic-record'
    && input.routeKey === 'synthetic-fixture'
    && !hasOwn(input, 'route')
    && !hasOwn(input, 'canonicalUrl')
    && !hasOwn(input, 'officialUrl')
    && !hasOwn(input, 'jurisdictionConfirmation')
    && !hasOwn(input, 'now');
}

export function buildOfficialHandoffPack(input: RealHandoffBuildInput): OfficialHandoffBuildResult {
  if (!isRealWrapperInput(input)) return { status: 'abstained', reason: 'invalid-real-input' };
  const routeReadyNow = input.now;
  if (!isActionReadyOfficialDestination(input.route, input.jurisdictionConfirmation, routeReadyNow)) {
    return { status: 'abstained', reason: 'route-not-action-ready' };
  }
  const shared = validateSharedInput(input);
  if (!shared.ok) return { status: 'abstained', reason: shared.reason };
  const routeReadyInstant = instantMilliseconds(routeReadyNow);
  if (routeReadyInstant === null || new Date(shared.generatedAt).getTime() !== routeReadyInstant) {
    return { status: 'abstained', reason: 'generated-at-mismatch' };
  }

  const route = input.route;
  const legacyIssue = route.key === 'legacy' ? mapLegacyIssue(shared.facts) : null;
  if (route.key === 'legacy' && !legacyIssue) {
    return { status: 'abstained', reason: 'invalid-reviewed-facts' };
  }
  const pack: MutableOfficialHandoffPack = {
    schema: OFFICIAL_HANDOFF_SCHEMA,
    kind: 'official-handoff-pack',
    mode: 'real',
    sourceKind: input.sourceKind,
    reviewRole: shared.role,
    resultClass: 'possible-discrepancy',
    resultRevisionId: shared.resultRevisionId,
    packRevisionId: shared.packRevisionId,
    packDigest: '',
    issueFamily: 'wrong-photo-or-wrong-vehicle',
    routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
    destination: Object.freeze({
      key: route.key,
      serviceName: route.serviceName,
      purpose: 'official-grievance-service',
      domain: route.domain,
      canonicalUrl: route.canonicalUrl,
      routingRationale: route.routingRationale,
      verifier: route.verifier,
      evidenceRef: route.evidenceRef,
      lastVerifiedAt: route.lastVerifiedAt,
      expiresAt: route.expiresAt,
    }),
    evidenceAssessment: 'Possible discrepancy',
    facts: shared.facts,
    factualBullets: projectFactBullets(shared.facts),
    evidenceSourceAndLimitations: projectSources(shared.facts),
    legacyIssue,
    description: shared.description,
    checklist: getOfficialHandoffChecklist(route.key),
    intentionallyBlankOfficialFields,
    nonLegalLimitation: 'This is a user-reviewed factual preparation aid, not a filing, legal opinion, official communication, or prediction of the authority’s decision.',
    fieldPackConfirmation: Object.freeze({
      status: 'confirmed',
      confirmedBy: 'affected-person',
      packRevisionId: shared.packRevisionId,
    }),
    generatedAt: shared.generatedAt,
  };
  pack.packDigest = sha256Hex(canonicalPackDigestInput(pack));
  Object.defineProperty(pack, OFFICIAL_PACK_BRAND, {
    value: Object.freeze({ issuer: OFFICIAL_PACK_BRAND_VALUE, digest: pack.packDigest }),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  issuedOfficialPacks.add(pack);
  deepFreeze(pack);
  if (!isAuthenticOfficialHandoffPack(pack)) {
    issuedOfficialPacks.delete(pack);
    return { status: 'abstained', reason: 'invalid-real-input' };
  }
  return Object.freeze({ status: 'built', pack });
}

export function buildSyntheticHandoffSimulation(input: SyntheticHandoffBuildInput): SyntheticHandoffBuildResult {
  if (!isSyntheticWrapperInput(input)) return { status: 'abstained', reason: 'invalid-synthetic-input' };
  const shared = validateSharedInput(input);
  if (!shared.ok) return { status: 'abstained', reason: shared.reason };

  const simulation: SyntheticHandoffSimulation = Object.freeze({
    schema: SYNTHETIC_HANDOFF_SCHEMA,
    kind: 'synthetic-handoff-simulation',
    mode: 'synthetic',
    sourceKind: 'bundled-synthetic-record',
    routeKey: 'synthetic-fixture',
    permanentLabel: 'Synthetic demonstration data',
    reviewRole: shared.role,
    resultClass: 'possible-discrepancy',
    resultRevisionId: shared.resultRevisionId,
    packRevisionId: shared.packRevisionId,
    issueFamily: 'wrong-photo-or-wrong-vehicle',
    facts: shared.facts,
    factualBullets: projectFactBullets(shared.facts),
    legacyIssueSimulation: mapLegacyIssue(shared.facts),
    description: shared.description,
    checklist: syntheticChecklist,
    nonLegalLimitation: 'This is a fictional proof artifact, not an official pack, filing, legal opinion, or government result.',
    fieldPackConfirmation: Object.freeze({
      status: 'confirmed',
      confirmedBy: 'affected-person',
      packRevisionId: shared.packRevisionId,
    }),
    generatedAt: shared.generatedAt,
  });
  return Object.freeze({ status: 'built', simulation });
}
