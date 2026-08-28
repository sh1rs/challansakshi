import type { LocalRecordFileMeta } from './local-record-intake';
import type {
  CitizenChallanAnswers,
  CitizenReviewAssessment,
  OfficialSourceStatus,
} from './public-challan';

export type EvidenceAcquisition =
  | 'citizen-recorded'
  | 'local-file-preview'
  | 'local-parser'
  | 'authorised-government-api';

export type EvidenceConfidence = 'high' | 'medium' | 'low' | 'inconclusive';
export type ConfirmationStatus = 'unconfirmed' | 'confirmed' | 'corrected';

export interface EvidenceSourceRef {
  id: string;
  label: string;
  kind: 'official-record-copy' | 'enforcement-image' | 'vehicle-record' | 'payment-record' | 'citizen-statement';
  acquisition: EvidenceAcquisition;
  authenticity: 'authorised-connector' | 'citizen-declared-origin' | 'unknown';
}

export interface EvidenceObservation {
  id: string;
  field: string;
  value: string;
  sourceId: string;
  confidence: EvidenceConfidence;
  confirmation: ConfirmationStatus;
  limitation?: string;
}

export interface EvidenceConflict {
  id: string;
  leftObservationId: string;
  rightObservationId: string;
  reason: 'registration' | 'vehicle-category' | 'colour' | 'offence-visibility' | 'timestamp' | 'location' | 'payment-status' | 'custody';
  materiality: 'context-only' | 'needs-clarification' | 'material';
}

export type CitizenTimelineEvent = {
  id: string;
  label: string;
  actor: 'citizen';
};

export type CitizenEvidenceView = {
  sources: EvidenceSourceRef[];
  observations: EvidenceObservation[];
  conflicts: EvidenceConflict[];
};

export type CitizenEvidenceViewInput = {
  answers: CitizenChallanAnswers;
  /** Task 4 supplies this only after its citizen confirmation gate. */
  assessment: CitizenReviewAssessment;
  /** The evidence builders accept only facts confirmed by the citizen after that gate. */
  confirmation: 'confirmed';
  recordName?: string;
  photographName?: string;
  recordMeta?: LocalRecordFileMeta;
  photographMeta?: LocalRecordFileMeta;
};

export type CitizenTimelineInput = {
  recordSelected: boolean;
  imageSelected: boolean;
  sourceConfirmed: boolean;
  observationsConfirmed: boolean;
  summaryGenerated: boolean;
};

export type CitizenEvidenceSummaryInput = CitizenEvidenceViewInput & {
  jurisdiction: string;
  vehicleSuffix: string;
  allegedOffence: string;
  eventDate: string;
  officialDeadline: string;
  materialSignals?: string[];
  missingEvidence?: string[];
  timeline: CitizenTimelineEvent[];
};

const CITIZEN_DECLARED_ORIGIN = 'citizen-declared-origin' as const;
const MAX_ARTIFACT_FIELD_LENGTH = 160;
const UNSAFE_LOCAL_REFERENCE = /(?:blob|data):[^\s]*/gi;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g;

const CITIZEN_TIMELINE_LABELS: Record<string, string> = {
  'timeline-started': 'You started a private review',
  'timeline-record-selected': 'You selected a downloaded record',
  'timeline-image-selected': 'You added a supplied photograph',
  'timeline-source-confirmed': 'You confirmed the record source',
  'timeline-observations-confirmed': 'You recorded evidence observations',
  'timeline-summary-generated': 'You generated a local case summary',
};

function sanitiseArtifactText(value: unknown, fallback = '[not entered]', maximumLength = MAX_ARTIFACT_FIELD_LENGTH): string {
  if (typeof value !== 'string') return fallback;
  const sanitised = value
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(UNSAFE_LOCAL_REFERENCE, '[omitted local reference]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength)
    .trim();
  return sanitised || fallback;
}

function displayValue(value: string): string {
  return sanitiseArtifactText(value.replaceAll('-', ' '));
}

function safeFileName(name: string | undefined, fallback: string): string {
  return sanitiseArtifactText(name, sanitiseArtifactText(fallback));
}

function maskedVehicleSuffix(value: string): string {
  if (typeof value !== 'string' || /(?:blob|data):/i.test(value)) return '[not entered]';
  const suffix = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-4);
  return suffix.length === 4 ? `…${suffix}` : '[not entered]';
}

function sourceStatusLabel(sourceStatus: OfficialSourceStatus): string {
  if (sourceStatus === 'downloaded-official-record') return 'Citizen-declared downloaded official record';
  if (sourceStatus === 'official-service') return 'Citizen-declared official-service record';
  if (sourceStatus === 'message-only') return 'Citizen-declared message-provided notice';
  return 'Official record source not selected by the citizen';
}

function imageObservation(
  id: string,
  field: string,
  value: string,
  imageInspected: boolean,
  confirmation: 'confirmed',
  limitation?: string,
): EvidenceObservation {
  const isUnavailable = value === 'unclear' || value === 'not-visible' || value === 'not-assessable-from-still' || value === 'not-found';
  const isDifferentWithoutInspection = value === 'different' && !imageInspected;
  return {
    id,
    field,
    value: displayValue(value),
    sourceId: 'source-enforcement-image',
    confidence: isUnavailable || isDifferentWithoutInspection || !imageInspected
      ? 'inconclusive'
      : value === 'different' ? 'high' : 'medium',
    confirmation,
    limitation: isUnavailable
      ? limitation
      : isDifferentWithoutInspection || !imageInspected
        ? 'The citizen did not confirm this observation against an inspected supplied still.'
        : undefined,
  };
}

function limitationFor(field: 'plate' | 'category' | 'colour' | 'offence' | 'timestamp' | 'location', value: string): string | undefined {
  const messages: Record<string, string> = {
    'plate:unclear': 'The citizen recorded that the supplied still is unclear.',
    'plate:not-visible': 'The citizen recorded that the supplied still does not show the registration plate clearly.',
    'category:unclear': 'The citizen recorded that the supplied still is unclear.',
    'category:not-visible': 'The citizen recorded that the supplied still does not show the vehicle category clearly.',
    'colour:unclear': 'The citizen recorded that the supplied still is unclear.',
    'colour:not-visible': 'The citizen recorded that the supplied still does not show the vehicle colour clearly.',
    'offence:unclear': 'The citizen recorded that the supplied still is unclear.',
    'offence:not-visible': 'The citizen recorded that the alleged offence is not visible in the supplied still.',
    'offence:not-assessable-from-still': 'The citizen recorded that the alleged offence cannot be assessed from the supplied still.',
    'timestamp:unclear': 'The citizen recorded that the timestamp is unclear in the supplied evidence.',
    'timestamp:not-found': 'The citizen could not find a timestamp in the supplied evidence.',
    'location:unclear': 'The citizen recorded that the location is unclear in the supplied evidence.',
    'location:not-found': 'The citizen could not find a location in the supplied evidence.',
  };
  return messages[`${field}:${value}`];
}

function sourceFileName(input: CitizenEvidenceViewInput, role: 'record' | 'photograph'): string | undefined {
  return role === 'record'
    ? input.recordMeta?.name ?? input.recordName
    : input.photographMeta?.name ?? input.photographName;
}

/**
 * Builds a presentation-only view from facts the citizen has already confirmed.
 * This function does not inspect source bytes, authenticate a record, or classify a case.
 */
export function buildCitizenEvidenceView(input: CitizenEvidenceViewInput): CitizenEvidenceView {
  const recordName = safeFileName(sourceFileName(input, 'record'), sourceStatusLabel(input.answers.sourceStatus));
  const photographName = safeFileName(sourceFileName(input, 'photograph'), 'Citizen-described supplied photograph');
  const sources: EvidenceSourceRef[] = [
    {
      id: 'source-official-copy',
      label: recordName,
      kind: 'official-record-copy',
      acquisition: sourceFileName(input, 'record') ? 'local-file-preview' : 'citizen-recorded',
      authenticity: CITIZEN_DECLARED_ORIGIN,
    },
    {
      id: 'source-enforcement-image',
      label: photographName,
      kind: 'enforcement-image',
      acquisition: sourceFileName(input, 'photograph') ? 'local-file-preview' : 'citizen-recorded',
      authenticity: CITIZEN_DECLARED_ORIGIN,
    },
    {
      id: 'source-citizen-record',
      label: `Citizen-reported vehicle record: ${displayValue(input.answers.ownRecordAvailable)}`,
      kind: 'vehicle-record',
      acquisition: 'citizen-recorded',
      authenticity: CITIZEN_DECLARED_ORIGIN,
    },
  ];

  const observations: EvidenceObservation[] = [
    imageObservation('observation-registration-plate', 'Registration plate', input.answers.plateObservation, input.answers.imageInspected, input.confirmation, limitationFor('plate', input.answers.plateObservation)),
    imageObservation('observation-vehicle-category', 'Vehicle category', input.answers.categoryObservation, input.answers.imageInspected, input.confirmation, limitationFor('category', input.answers.categoryObservation)),
    imageObservation('observation-vehicle-colour', 'Vehicle colour', input.answers.colourObservation, input.answers.imageInspected, input.confirmation, limitationFor('colour', input.answers.colourObservation)),
    imageObservation('observation-alleged-offence', 'Alleged offence', input.answers.offenceObservation, input.answers.imageInspected, input.confirmation, limitationFor('offence', input.answers.offenceObservation)),
    imageObservation('observation-evidence-timestamp', 'Evidence timestamp', input.answers.timestampStatus, input.answers.imageInspected, input.confirmation, limitationFor('timestamp', input.answers.timestampStatus)),
    imageObservation('observation-evidence-location', 'Evidence location', input.answers.locationStatus, input.answers.imageInspected, input.confirmation, limitationFor('location', input.answers.locationStatus)),
    {
      id: 'observation-citizen-vehicle-record',
      field: 'Citizen vehicle record',
      value: displayValue(input.answers.ownRecordAvailable),
      sourceId: 'source-citizen-record',
      confidence: input.answers.ownRecordAvailable === 'present' ? 'medium' : 'inconclusive',
      confirmation: input.confirmation,
      limitation: input.answers.ownRecordAvailable === 'present'
        ? undefined
        : 'The citizen did not record a readable vehicle record for this comparison.',
    },
  ];

  const vehicleDifferenceMateriality = input.assessment.finding === 'citizen-recorded-inconsistency' && input.assessment.canPrepareWorksheet
    ? 'material' as const
    : 'needs-clarification' as const;
  const conflicts: EvidenceConflict[] = [];
  if (input.answers.plateObservation === 'different') {
    conflicts.push({
      id: 'conflict-registration',
      leftObservationId: 'observation-registration-plate',
      rightObservationId: 'observation-citizen-vehicle-record',
      reason: 'registration',
      materiality: vehicleDifferenceMateriality,
    });
  }
  if (input.answers.categoryObservation === 'different') {
    conflicts.push({
      id: 'conflict-vehicle-category',
      leftObservationId: 'observation-vehicle-category',
      rightObservationId: 'observation-citizen-vehicle-record',
      reason: 'vehicle-category',
      materiality: vehicleDifferenceMateriality,
    });
  }
  if (input.answers.colourObservation === 'different') {
    conflicts.push({
      id: 'conflict-colour',
      leftObservationId: 'observation-vehicle-colour',
      rightObservationId: 'observation-citizen-vehicle-record',
      reason: 'colour',
      materiality: 'context-only',
    });
  }

  return { sources, observations, conflicts };
}

export function buildCitizenTimeline(input: CitizenTimelineInput): CitizenTimelineEvent[] {
  const event = (id: string): CitizenTimelineEvent => ({ id, label: CITIZEN_TIMELINE_LABELS[id], actor: 'citizen' });
  const timeline: CitizenTimelineEvent[] = [event('timeline-started')];
  if (input.recordSelected) timeline.push(event('timeline-record-selected'));
  if (input.imageSelected) timeline.push(event('timeline-image-selected'));
  if (input.sourceConfirmed) timeline.push(event('timeline-source-confirmed'));
  if (input.observationsConfirmed) timeline.push(event('timeline-observations-confirmed'));
  if (input.summaryGenerated) timeline.push(event('timeline-summary-generated'));
  return timeline;
}

function summaryList(items: string[], emptyMessage: string): string[] {
  const sanitisedItems = items.map((item) => sanitiseArtifactText(item, '[not entered]'));
  return sanitisedItems.length ? sanitisedItems.map((item) => `- ${item}`) : [`- ${emptyMessage}`];
}

function canonicalTimelineLines(timeline: CitizenTimelineEvent[]): string[] {
  const renderedIds = new Set<string>();
  return timeline.flatMap((event) => {
    const label = CITIZEN_TIMELINE_LABELS[event.id];
    if (!label || renderedIds.has(event.id)) return [];
    renderedIds.add(event.id);
    return [`- ${label}`];
  });
}

export function buildCitizenEvidenceSummary(input: CitizenEvidenceSummaryInput): string {
  const view = buildCitizenEvidenceView(input);
  const materialSignals = input.materialSignals ?? input.assessment.materialSignals;
  const missingEvidence = input.missingEvidence ?? input.assessment.missingEvidence;
  const observationLines = view.observations.map((observation) => {
    const limitation = observation.limitation ? ` Limitation: ${observation.limitation}` : '';
    return `- ${observation.field}: ${observation.value} (confidence: ${observation.confidence}; confirmed by citizen).${limitation}`;
  });

  return [
    'CHALLANSAKSHI — CITIZEN EVIDENCE SUMMARY',
    'Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.',
    '',
    'MINIMISED CASE DETAILS',
    `Jurisdiction or service: ${sanitiseArtifactText(input.jurisdiction)}`,
    `Vehicle registration suffix: ${maskedVehicleSuffix(input.vehicleSuffix)}`,
    `Alleged offence category: ${sanitiseArtifactText(input.allegedOffence)}`,
    `Event date shown: ${sanitiseArtifactText(input.eventDate)}`,
    `Officially displayed deadline copied by citizen: ${sanitiseArtifactText(input.officialDeadline)}`,
    '',
    'CITIZEN-PROVIDED SOURCE REGISTER',
    ...view.sources.map((source) => `- ${source.label} (${source.kind}; ${source.acquisition}; ${source.authenticity})`),
    '',
    'CITIZEN-CONFIRMED OBSERVATIONS',
    ...observationLines,
    '',
    'MATERIAL SIGNALS',
    ...summaryList(materialSignals, 'No material signal was recorded in this limited self-review.'),
    '',
    'RECORDS STILL NEEDED',
    ...summaryList(missingEvidence, 'No missing record was recorded in this limited checklist.'),
    '',
    'CITIZEN-RECORDED TIMELINE',
    ...canonicalTimelineLines(input.timeline),
    '',
    'NEUTRAL CLARIFICATION REQUEST',
    'I request review of the evidence supplied with the notice. Based on my own recorded observations, the listed fields may require clarification. Please verify the vehicle identifier, vehicle category, alleged-offence evidence, event timestamp, location, and basis of the notice. I will enter full official identifiers only inside the verified official service.',
    '',
    'IMPORTANT LIMITS AND OFFICIAL HANDOFF REMINDER',
    'Nothing was submitted, authenticated, or approved by a government authority.',
    'This summary records only citizen-provided source details and citizen-confirmed observations. It is not a legal conclusion or proof of invalidity.',
    'Re-check the current status, route, and any displayed date directly on the responsible official service before acting.',
  ].join('\n');
}
