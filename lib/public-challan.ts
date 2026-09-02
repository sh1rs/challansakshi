export type OfficialSourceStatus = 'not-selected' | 'official-service' | 'downloaded-official-record' | 'message-only';
export type Observation = 'match' | 'different' | 'unclear' | 'not-visible';
export type OffenceObservation = 'appears-visible' | 'not-visible' | 'not-assessable-from-still' | 'unclear';
export type RecordAvailability = 'present' | 'missing' | 'unclear' | 'not-applicable';
export type CitizenReviewFinding =
  | 'source-not-verified'
  | 'citizen-recorded-inconsistency'
  | 'supplied-image-unclear'
  | 'entries-do-not-support-mismatch'
  | 'insufficient-review';

export type CitizenSituation =
  | 'source-not-verified'
  | 'insufficient-review'
  | 'records-appear-consistent'
  | 'evidence-unclear'
  | 'material-inconsistency-recorded';

export type VehicleClass = 'two-wheeler' | 'four-wheeler' | 'other' | 'unclear';
export type ReviewFactSource = 'official-record' | 'official-evidence-image' | 'independent-vehicle-record' | 'citizen-attestation';
export type ReviewFactConfidence = 'high' | 'medium' | 'low' | 'unclear';
export type ReviewFactConfirmation = 'citizen-confirmed' | 'unconfirmed';

export type ReviewFact<T> = Readonly<{
  value: T;
  source: ReviewFactSource;
  confidence: ReviewFactConfidence;
  limitation: string;
  confirmation: ReviewFactConfirmation;
  reviewRevisionId: string;
}>;

export interface CitizenChallanAnswers {
  sourceStatus: OfficialSourceStatus;
  imageInspected: boolean;
  plateObservation: Observation;
  categoryObservation: Observation;
  colourObservation: Observation;
  offenceObservation: OffenceObservation;
  timestampStatus: 'displayed' | 'unclear' | 'not-found';
  locationStatus: 'displayed' | 'unclear' | 'not-found';
  ownRecordAvailable: RecordAvailability;
  noticeCopyAvailable: RecordAvailability;
  custodyRecordAvailable: RecordAvailability;
  reviewRevisionId?: string;
  citizenVehicleClass?: ReviewFact<VehicleClass>;
  observedEvidenceVehicleClass?: ReviewFact<VehicleClass>;
  independentReadableVehicleRecord?: ReviewFact<boolean>;
  wrongEvidenceBasis?: ReviewFact<'different-vehicle' | 'unrelated-scene' | 'none'>;
  vehicleNumberEntryMismatchBasis?: ReviewFact<'visible-entry-mismatch' | 'none'>;
  duplicatePlateIndependentBasis?: ReviewFact<'citizen-confirmed' | 'none'>;
}

export type ActionReadySupportedSignal =
  | 'readable-plate-conflict'
  | 'vehicle-class-conflict'
  | 'wrong-evidence'
  | 'vehicle-number-entry-mismatch'
  | 'duplicate-plate';

export type ActionReadyReviewFacts = Readonly<{
  reviewRevisionId: string;
  citizenVehicleClass?: ReviewFact<VehicleClass>;
  observedEvidenceVehicleClass?: ReviewFact<VehicleClass>;
  independentReadableVehicleRecord?: ReviewFact<boolean>;
  wrongEvidenceBasis?: ReviewFact<'different-vehicle' | 'unrelated-scene'>;
  vehicleNumberEntryMismatchBasis?: ReviewFact<'visible-entry-mismatch'>;
  duplicatePlateIndependentBasis?: ReviewFact<'citizen-confirmed'>;
  supportedSignals: readonly [ActionReadySupportedSignal, ...ActionReadySupportedSignal[]];
}>;

export type ActionReadyAbstentionReason =
  | 'source-not-official'
  | 'assessment-not-discrepancy'
  | 'missing-explicit-facts'
  | 'record-not-independent-readable'
  | 'unconfirmed-fact'
  | 'low-confidence-fact'
  | 'revision-mismatch'
  | 'unsupported-signal';

export type ActionReadyReviewProjection =
  | Readonly<{ status: 'eligible'; facts: ActionReadyReviewFacts }>
  | Readonly<{ status: 'abstained'; reason: ActionReadyAbstentionReason }>;

export interface CitizenReviewAssessment {
  finding: CitizenReviewFinding;
  canPrepareWorksheet: boolean;
  materialSignals: string[];
  cautions: string[];
  missingEvidence: string[];
}

export function citizenSituationForFinding(finding: CitizenReviewFinding): CitizenSituation {
  if (finding === 'citizen-recorded-inconsistency') return 'material-inconsistency-recorded';
  if (finding === 'supplied-image-unclear') return 'evidence-unclear';
  if (finding === 'entries-do-not-support-mismatch') return 'records-appear-consistent';
  return finding;
}

export interface OfficialDeadlineStatus {
  deadline: string;
  referenceDate: string;
  daysRemaining: number;
  status: 'open' | 'today' | 'passed' | 'not-entered';
}

const DAY_MS = 86_400_000;

function dateOnlyToUtc(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Expected an ISO calendar date, received: ${value}`);
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const canonical = new Date(timestamp).toISOString().slice(0, 10);
  if (canonical !== value) throw new Error(`Expected a valid calendar date, received: ${value}`);
  return timestamp;
}

/** Uses only the deadline the citizen says is displayed by an official service. It does not infer a legal deadline. */
export function calculateEnteredOfficialDeadline(deadline: string, referenceDate: string): OfficialDeadlineStatus {
  if (!deadline) return { deadline: '', referenceDate, daysRemaining: 0, status: 'not-entered' };
  const difference = Math.floor((dateOnlyToUtc(deadline) - dateOnlyToUtc(referenceDate)) / DAY_MS);
  return {
    deadline,
    referenceDate,
    daysRemaining: Math.max(0, difference),
    status: difference > 0 ? 'open' : difference === 0 ? 'today' : 'passed',
  };
}

export function assessCitizenChallanReview(answers: CitizenChallanAnswers): CitizenReviewAssessment {
  if (answers.sourceStatus === 'message-only' || answers.sourceStatus === 'not-selected') {
    return {
      finding: 'source-not-verified',
      canPrepareWorksheet: false,
      materialSignals: [answers.sourceStatus === 'not-selected' ? 'The record source has not been selected.' : 'The notice has not yet been independently checked on an official service.'],
      cautions: ['Do not pay, call, or open a portal from the message. Independently type or open the official e-Challan or state service.'],
      missingEvidence: ['Official notice or official-service status', 'Officially supplied evidence image'],
    };
  }

  if (!answers.imageInspected) {
    return {
      finding: 'insufficient-review',
      canPrepareWorksheet: false,
      materialSignals: ['The officially supplied image has not been inspected.'],
      cautions: ['A vehicle-mismatch worksheet should not be prepared without first inspecting the evidence the authority supplied.'],
      missingEvidence: ['Officially supplied evidence image'],
    };
  }

  const materialSignals: string[] = [];
  if (answers.plateObservation === 'different') materialSignals.push('You recorded that the readable plate details differ.');
  if (answers.categoryObservation === 'different') materialSignals.push('You recorded that the vehicle category differs.');
  if (answers.colourObservation === 'different') materialSignals.push('You recorded a colour difference.');
  if (answers.offenceObservation === 'not-visible') materialSignals.push('You recorded that the alleged offence is not visible in the supplied image.');
  if (answers.timestampStatus === 'not-found') materialSignals.push('You could not find a timestamp in the supplied evidence.');
  if (answers.locationStatus === 'not-found') materialSignals.push('You could not find a location in the supplied evidence.');

  const missingEvidence: string[] = [];
  if (answers.ownRecordAvailable !== 'present') missingEvidence.push('A vehicle record you can compare against');
  if (answers.noticeCopyAvailable !== 'present') missingEvidence.push('A copy of the official notice');
  if (answers.custodyRecordAvailable === 'missing') missingEvidence.push('Any available event-time custody record (context only)');

  const cautions = [
    'These are your observations. ChallanSakshi did not inspect or authenticate the records.',
    'A colour difference alone is not treated as an action-ready vehicle mismatch.',
    'A still image may not be able to establish every alleged offence.',
  ];

  const hasVehicleConflict = answers.plateObservation === 'different'
    || answers.categoryObservation === 'different';

  if (hasVehicleConflict && answers.ownRecordAvailable === 'present') {
    return { finding: 'citizen-recorded-inconsistency', canPrepareWorksheet: true, materialSignals, cautions, missingEvidence };
  }

  if (hasVehicleConflict) {
    return {
      finding: 'insufficient-review',
      canPrepareWorksheet: false,
      materialSignals,
      cautions: [
        ...cautions,
        'A readable vehicle record is required before treating a plate or category observation as a comparison.',
      ],
      missingEvidence,
    };
  }

  const imageUnclear = answers.plateObservation === 'unclear'
    || answers.plateObservation === 'not-visible'
    || answers.categoryObservation === 'unclear'
    || answers.categoryObservation === 'not-visible'
    || answers.offenceObservation === 'unclear'
    || answers.offenceObservation === 'not-visible'
    || answers.offenceObservation === 'not-assessable-from-still'
    || answers.timestampStatus !== 'displayed'
    || answers.locationStatus !== 'displayed';

  if (imageUnclear) {
    return { finding: 'supplied-image-unclear', canPrepareWorksheet: true, materialSignals, cautions, missingEvidence };
  }

  if (answers.plateObservation === 'match' && answers.categoryObservation === 'match') {
    return { finding: 'entries-do-not-support-mismatch', canPrepareWorksheet: false, materialSignals, cautions, missingEvidence };
  }

  return { finding: 'insufficient-review', canPrepareWorksheet: false, materialSignals, cautions, missingEvidence };
}

const MAX_REVIEW_FACT_TEXT_LENGTH = 256;
const reviewFactSources = new Set<ReviewFactSource>([
  'official-record',
  'official-evidence-image',
  'independent-vehicle-record',
  'citizen-attestation',
]);

type CheckedFact<T> =
  | Readonly<{ ok: true; fact: ReviewFact<T> }>
  | Readonly<{ ok: false; reason: ActionReadyAbstentionReason }>;

type ProjectedActionFacts = {
  citizenVehicleClass?: ReviewFact<VehicleClass>;
  observedEvidenceVehicleClass?: ReviewFact<VehicleClass>;
  independentReadableVehicleRecord?: ReviewFact<boolean>;
  wrongEvidenceBasis?: ReviewFact<'different-vehicle' | 'unrelated-scene'>;
  vehicleNumberEntryMismatchBasis?: ReviewFact<'visible-entry-mismatch'>;
  duplicatePlateIndependentBasis?: ReviewFact<'citizen-confirmed'>;
};

function boundedFactText(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && Array.from(value.trim()).length <= MAX_REVIEW_FACT_TEXT_LENGTH;
}

function checkReviewFact<T>(fact: ReviewFact<T> | undefined, reviewRevisionId: string): CheckedFact<T> {
  if (!fact || typeof fact !== 'object') return { ok: false, reason: 'missing-explicit-facts' };
  if (fact.confirmation !== 'citizen-confirmed') return { ok: false, reason: 'unconfirmed-fact' };
  if (fact.confidence !== 'high') return { ok: false, reason: 'low-confidence-fact' };
  if (!boundedFactText(fact.limitation) || !boundedFactText(fact.reviewRevisionId)) {
    return { ok: false, reason: 'missing-explicit-facts' };
  }
  if (fact.reviewRevisionId.trim() !== reviewRevisionId) return { ok: false, reason: 'revision-mismatch' };
  if (!reviewFactSources.has(fact.source)) return { ok: false, reason: 'missing-explicit-facts' };
  return {
    ok: true,
    fact: Object.freeze({
      value: fact.value,
      source: fact.source,
      confidence: fact.confidence,
      limitation: fact.limitation.trim(),
      confirmation: fact.confirmation,
      reviewRevisionId,
    }),
  };
}

function isTwoVersusFour(left: VehicleClass, right: VehicleClass): boolean {
  return (left === 'two-wheeler' && right === 'four-wheeler')
    || (left === 'four-wheeler' && right === 'two-wheeler');
}

/**
 * Projects only same-revision, high-confidence citizen-confirmed facts that can
 * be consumed by an official handoff builder. The broader worksheet assessment
 * remains intentionally independent from this stricter form-compatibility gate.
 */
export function projectActionReadyReviewFacts(answers: CitizenChallanAnswers): ActionReadyReviewProjection {
  if (answers.sourceStatus !== 'official-service' && answers.sourceStatus !== 'downloaded-official-record') {
    return { status: 'abstained', reason: 'source-not-official' };
  }
  if (assessCitizenChallanReview(answers).finding !== 'citizen-recorded-inconsistency') {
    return { status: 'abstained', reason: 'assessment-not-discrepancy' };
  }
  if (!boundedFactText(answers.reviewRevisionId)) {
    return { status: 'abstained', reason: 'missing-explicit-facts' };
  }

  const reviewRevisionId = answers.reviewRevisionId.trim();
  const supportedSignals: ActionReadySupportedSignal[] = [];
  const projectedFacts: ProjectedActionFacts = {};
  let plateOrClassError: ActionReadyAbstentionReason | undefined;
  let explicitBasisError: ActionReadyAbstentionReason | undefined;

  let readableRecord: ReviewFact<boolean> | undefined;
  const checkedReadableRecord = () => {
    if (readableRecord) return { ok: true, fact: readableRecord } as const;
    const checked = checkReviewFact(answers.independentReadableVehicleRecord, reviewRevisionId);
    if (!checked.ok) return checked;
    if (checked.fact.source !== 'independent-vehicle-record') {
      return { ok: false, reason: 'unsupported-signal' } as const;
    }
    if (checked.fact.value !== true) {
      return { ok: false, reason: 'record-not-independent-readable' } as const;
    }
    readableRecord = checked.fact;
    return { ok: true, fact: readableRecord } as const;
  };

  if (answers.plateObservation === 'different') {
    const record = checkedReadableRecord();
    if (!record.ok) plateOrClassError = record.reason;
    else {
      projectedFacts.independentReadableVehicleRecord = record.fact;
      supportedSignals.push('readable-plate-conflict');
    }
  }

  if (answers.categoryObservation === 'different') {
    const citizenClass = checkReviewFact(answers.citizenVehicleClass, reviewRevisionId);
    const evidenceClass = checkReviewFact(answers.observedEvidenceVehicleClass, reviewRevisionId);
    const record = checkedReadableRecord();
    if (!citizenClass.ok) {
      plateOrClassError ??= citizenClass.reason;
    } else if (!evidenceClass.ok) {
      plateOrClassError ??= evidenceClass.reason;
    } else if (!record.ok) {
      plateOrClassError ??= record.reason;
    } else if (
      citizenClass.fact.source !== 'independent-vehicle-record'
      || evidenceClass.fact.source !== 'official-evidence-image'
      || !isTwoVersusFour(citizenClass.fact.value, evidenceClass.fact.value)
    ) {
      plateOrClassError ??= 'unsupported-signal';
    } else {
      projectedFacts.citizenVehicleClass = citizenClass.fact;
      projectedFacts.observedEvidenceVehicleClass = evidenceClass.fact;
      projectedFacts.independentReadableVehicleRecord = record.fact;
      supportedSignals.push('vehicle-class-conflict');
    }
  }

  if (answers.wrongEvidenceBasis) {
    if (answers.wrongEvidenceBasis.value === 'none') {
      explicitBasisError ??= 'unsupported-signal';
    } else {
      const checked = checkReviewFact(answers.wrongEvidenceBasis, reviewRevisionId);
      if (!checked.ok) explicitBasisError ??= checked.reason;
      else if (checked.fact.source === 'official-evidence-image') explicitBasisError ??= 'unsupported-signal';
      else if (checked.fact.value !== 'different-vehicle' && checked.fact.value !== 'unrelated-scene') {
        explicitBasisError ??= 'unsupported-signal';
      } else {
        projectedFacts.wrongEvidenceBasis = checked.fact as ReviewFact<'different-vehicle' | 'unrelated-scene'>;
        supportedSignals.push('wrong-evidence');
      }
    }
  }

  if (answers.vehicleNumberEntryMismatchBasis) {
    if (answers.vehicleNumberEntryMismatchBasis.value === 'none') {
      explicitBasisError ??= 'unsupported-signal';
    } else {
      const checked = checkReviewFact(answers.vehicleNumberEntryMismatchBasis, reviewRevisionId);
      if (!checked.ok) explicitBasisError ??= checked.reason;
      else if (checked.fact.source === 'official-evidence-image' || checked.fact.value !== 'visible-entry-mismatch') {
        explicitBasisError ??= 'unsupported-signal';
      } else {
        projectedFacts.vehicleNumberEntryMismatchBasis = checked.fact as ReviewFact<'visible-entry-mismatch'>;
        supportedSignals.push('vehicle-number-entry-mismatch');
      }
    }
  }

  if (answers.duplicatePlateIndependentBasis) {
    if (answers.duplicatePlateIndependentBasis.value === 'none') {
      explicitBasisError ??= 'unsupported-signal';
    } else {
      const checked = checkReviewFact(answers.duplicatePlateIndependentBasis, reviewRevisionId);
      if (!checked.ok) explicitBasisError ??= checked.reason;
      else if (checked.fact.source !== 'citizen-attestation' || checked.fact.value !== 'citizen-confirmed') {
        explicitBasisError ??= 'unsupported-signal';
      } else {
        projectedFacts.duplicatePlateIndependentBasis = checked.fact as ReviewFact<'citizen-confirmed'>;
        supportedSignals.push('duplicate-plate');
      }
    }
  }

  if (supportedSignals.length === 0) {
    return {
      status: 'abstained',
      reason: explicitBasisError ?? plateOrClassError ?? 'unsupported-signal',
    };
  }

  return {
    status: 'eligible',
    facts: Object.freeze({
      reviewRevisionId,
      ...projectedFacts,
      supportedSignals: Object.freeze([...supportedSignals]) as readonly [ActionReadySupportedSignal, ...ActionReadySupportedSignal[]],
    }),
  };
}

export interface CitizenWorksheetInput {
  stateLabel: string;
  vehicleSuffix: string;
  allegedOffence: string;
  eventDate: string;
  officialDeadline: string;
  assessment: CitizenReviewAssessment;
  answers: CitizenChallanAnswers;
}

export function buildCitizenChallanWorksheet(input: CitizenWorksheetInput): string {
  const observation = (value: string) => value.replaceAll('-', ' ');
  if (!input.assessment.canPrepareWorksheet) {
    return [
      'CHALLANSAKSHI — CITIZEN SELF-REVIEW SUMMARY',
      'Based only on your answers. ChallanSakshi did not inspect the photograph, challan, RC, authority record, or official status.',
      '',
      'NO DISPUTE REQUEST PREPARED',
      'This result does not support preparing a dispute or clarification request from the entered observations.',
      '',
      'RULE-BASED SELF-REVIEW RESULT',
      observation(input.assessment.finding),
      ...input.assessment.materialSignals.map((item) => `- ${item}`),
      '',
      'SAFE NEXT STEP',
      '- Re-check the official record, current status, applicable route, and any displayed date directly on the responsible official service.',
      '- Do not use a phone number or link copied from a message.',
      '',
      'IMPORTANT LIMITS',
      ...input.assessment.cautions.map((item) => `- ${item}`),
    ].join('\n');
  }
  const lines = [
    'CHALLANSAKSHI — CITIZEN SELF-REVIEW WORKSHEET',
    'Based only on your answers. ChallanSakshi did not inspect the photograph, challan, RC, authority record, or official status.',
    '',
    'PURPOSE',
    'A local, user-controlled preparation note. This is not a filing, legal opinion, proof of invalidity, or government acknowledgement.',
    '',
    'MINIMISED CASE DETAILS',
    `State / jurisdiction selected: ${input.stateLabel || '[not selected]'}`,
    `Vehicle registration suffix: ${input.vehicleSuffix ? `…${input.vehicleSuffix}` : '[not entered]'}`,
    `Event date shown: ${input.eventDate || '[not entered]'}`,
    `Officially displayed deadline copied by citizen: ${input.officialDeadline || '[not entered]'}`,
    `Alleged offence category: ${input.allegedOffence || '[not selected]'}`,
    '',
    'YOUR OBSERVATIONS OF THE OFFICIAL RECORD',
    `Plate comparison: ${observation(input.answers.plateObservation)}`,
    `Vehicle-category comparison: ${observation(input.answers.categoryObservation)}`,
    `Colour comparison: ${observation(input.answers.colourObservation)}`,
    `Offence visibility: ${observation(input.answers.offenceObservation)}`,
    `Evidence timestamp: ${observation(input.answers.timestampStatus)}`,
    `Evidence location: ${observation(input.answers.locationStatus)}`,
    '',
    'RULE-BASED SELF-REVIEW RESULT',
    observation(input.assessment.finding),
    ...input.assessment.materialSignals.map((item) => `- ${item}`),
    '',
    'RECORDS TO CHECK BEFORE USING AN OFFICIAL ROUTE',
    ...(input.assessment.missingEvidence.length ? input.assessment.missingEvidence.map((item) => `- ${item}`) : ['- No missing item was recorded in this limited checklist.']),
    '- Re-check the current status and route on the official service immediately before acting.',
    '',
    'NEUTRAL CLARIFICATION REQUEST (EDIT BEFORE USE)',
    'I request review of the evidence supplied with the notice. Based on my own inspection, the fields recorded above may require clarification. Please verify the vehicle identifier, vehicle category, alleged-offence evidence, event timestamp, location, and the basis of the notice. I will add the full official identifiers only inside the verified official service.',
    '',
    'IMPORTANT LIMITS',
    ...input.assessment.cautions.map((item) => `- ${item}`),
    '- Nothing from this worksheet is transferred to a government portal. Re-enter required details only on the verified official service.',
  ];
  return lines.join('\n');
}
