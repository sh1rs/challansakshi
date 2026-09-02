import {
  OFFICIAL_ROUTE_REGISTRY_VERSION,
  isActionReadyOfficialDestination,
  type JurisdictionConfirmation,
  type OfficialDestination,
} from './official-destinations';
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
  | 'invalid-reviewed-facts'
  | 'invalid-description'
  | 'invalid-timestamp';

export type SyntheticHandoffAbstentionReason =
  | 'invalid-synthetic-input'
  | 'result-not-action-ready'
  | 'result-revision-mismatch'
  | 'pack-confirmation-stale'
  | 'role-confirmation-incomplete'
  | 'invalid-reviewed-facts'
  | 'invalid-description'
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
export function normalizeReviewedDescription(value: string): string {
  if (typeof value !== 'string' || !isWellFormedUnicode(value)) {
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

function cloneFact<T>(candidate: unknown, revisionId: string): ReviewFact<T> | null {
  if (!isRecord(candidate)) return null;
  if (
    !factSources.has(candidate.source as ReviewFactSource)
    || candidate.confidence !== 'high'
    || candidate.confirmation !== 'citizen-confirmed'
    || candidate.reviewRevisionId !== revisionId
    || !nonEmptyText(candidate.limitation)
  ) return null;

  return Object.freeze({
    value: candidate.value as T,
    source: candidate.source as ReviewFactSource,
    confidence: 'high' as const,
    limitation: candidate.limitation.trim(),
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
  if (!isRecord(facts) || !nonEmptyText(facts.reviewRevisionId) || !Array.isArray(facts.supportedSignals)) {
    throw new Error('Action-ready facts are invalid.');
  }
  const reviewRevisionId = facts.reviewRevisionId.trim();
  const signals = [...facts.supportedSignals];
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
    if (!cloned || cloned.source === 'official-evidence-image'
      || !['different-vehicle', 'unrelated-scene'].includes(cloned.value)) {
      throw new Error('Wrong-evidence basis is invalid.');
    }
    projection.wrongEvidenceBasis = cloned;
  }
  if (facts.vehicleNumberEntryMismatchBasis !== undefined) {
    const cloned = cloneFact<'visible-entry-mismatch'>(facts.vehicleNumberEntryMismatchBasis, reviewRevisionId);
    if (!cloned || cloned.source === 'official-evidence-image' || cloned.value !== 'visible-entry-mismatch') {
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

  if (
    projection.supportedSignals.includes('vehicle-number-entry-mismatch')
    && projection.vehicleNumberEntryMismatchBasis?.value === 'visible-entry-mismatch'
  ) return Object.freeze({
    issueCode: 'wrong-vehicle-number-entered-by-officer',
    label: 'Wrong Vehicle Number Entered By Officer',
    value: 'Wrong Vehicle Number Entered By Officer',
  });

  if (projection.supportedSignals.includes('vehicle-class-conflict')) {
    if (
      projection.citizenVehicleClass?.value === 'four-wheeler'
      && projection.observedEvidenceVehicleClass?.value === 'two-wheeler'
    ) return Object.freeze({
      issueCode: 'two-wheeler-on-four-wheeler',
      label: '2 Wheeler Challan On 4 Wheeler',
      value: '2 Wheeler Challan On 4 Wheeler',
    });
    if (
      projection.citizenVehicleClass?.value === 'two-wheeler'
      && projection.observedEvidenceVehicleClass?.value === 'four-wheeler'
    ) return Object.freeze({
      issueCode: 'four-wheeler-on-two-wheeler',
      label: '4 Wheeler Challan On 2 Wheeler',
      value: '4 Wheeler Challan On 2 Wheeler',
    });
  }

  if (
    projection.supportedSignals.includes('duplicate-plate')
    && projection.duplicatePlateIndependentBasis?.value === 'citizen-confirmed'
  ) return Object.freeze({
    issueCode: 'duplicate-number-plate',
    label: 'Duplicate Number Plate',
    value: 'Duplicate Number Plate',
  });

  if (
    projection.supportedSignals.includes('wrong-evidence')
    && projection.wrongEvidenceBasis
  ) return Object.freeze({
    issueCode: 'wrong-evidence-captured',
    label: 'Wrong Evidence Captured',
    value: 'Wrong Image',
  });

  return null;
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
  | Readonly<{ ok: true; facts: ReviewedFactProjection; description: string; role: ReviewRole }>
  | Readonly<{ ok: false; reason: Exclude<OfficialHandoffAbstentionReason, 'invalid-real-input' | 'route-not-action-ready'> }> {
  if (input.resultClass !== 'possible-discrepancy') {
    return { ok: false, reason: 'result-not-action-ready' };
  }
  if (!nonEmptyText(input.resultRevisionId) || input.facts?.reviewRevisionId !== input.resultRevisionId) {
    return { ok: false, reason: 'result-revision-mismatch' };
  }
  if (
    !nonEmptyText(input.packRevisionId)
    || !isRecord(input.confirmation)
    || input.confirmation.status !== 'confirmed'
    || input.confirmation.packRevisionId !== input.packRevisionId
  ) return { ok: false, reason: 'pack-confirmation-stale' };
  if (!roleConfirmationIsComplete(input.confirmation.roleConfirmation)) {
    return { ok: false, reason: 'role-confirmation-incomplete' };
  }
  if (!isCanonicalTimestamp(input.generatedAt)) return { ok: false, reason: 'invalid-timestamp' };

  let facts: ReviewedFactProjection;
  try {
    facts = buildReviewedFactProjection(input.facts);
  } catch {
    return { ok: false, reason: 'invalid-reviewed-facts' };
  }
  let description: string;
  try {
    description = normalizeReviewedDescription(input.reviewedDescription);
  } catch {
    return { ok: false, reason: 'invalid-description' };
  }
  return {
    ok: true,
    facts,
    description,
    role: input.confirmation.roleConfirmation.role,
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

const syntheticChecklist = Object.freeze([
  'This is a fictional field-pack simulation for the synthetic proof lane.',
  'No government service is contacted and no official compatibility is asserted.',
] as const);

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
  if (!isActionReadyOfficialDestination(input.route, input.jurisdictionConfirmation, input.now)) {
    return { status: 'abstained', reason: 'route-not-action-ready' };
  }
  const shared = validateSharedInput(input);
  if (!shared.ok) return { status: 'abstained', reason: shared.reason };

  const route = input.route;
  const legacyIssue = route.key === 'legacy' ? mapLegacyIssue(shared.facts) : null;
  if (route.key === 'legacy' && !legacyIssue) {
    return { status: 'abstained', reason: 'invalid-reviewed-facts' };
  }
  const pack: OfficialHandoffPack = Object.freeze({
    schema: OFFICIAL_HANDOFF_SCHEMA,
    kind: 'official-handoff-pack',
    mode: 'real',
    sourceKind: input.sourceKind,
    reviewRole: shared.role,
    resultClass: 'possible-discrepancy',
    resultRevisionId: input.resultRevisionId,
    packRevisionId: input.packRevisionId,
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
    checklist: route.key === 'legacy' ? legacyChecklist : nextgenChecklist,
    intentionallyBlankOfficialFields,
    nonLegalLimitation: 'This is a user-reviewed factual preparation aid, not a filing, legal opinion, official communication, or prediction of the authority’s decision.',
    fieldPackConfirmation: Object.freeze({
      status: 'confirmed',
      confirmedBy: 'affected-person',
      packRevisionId: input.packRevisionId,
    }),
    generatedAt: input.generatedAt,
  });
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
    resultRevisionId: input.resultRevisionId,
    packRevisionId: input.packRevisionId,
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
      packRevisionId: input.packRevisionId,
    }),
    generatedAt: input.generatedAt,
  });
  return Object.freeze({ status: 'built', simulation });
}
