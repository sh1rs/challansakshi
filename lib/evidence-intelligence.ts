import type { LocalRecordFileMeta } from './local-record-intake';
import type { Language } from './domain';
import {
  CITIZEN_DISCLAIMER_EN,
  CITIZEN_DISCLAIMER_HI,
  localizeAssessment,
  localizeEvidenceConfidence,
  localizeEvidenceConfirmation,
  localizeEvidenceField,
  localizeEvidenceLimitation,
  localizeEvidenceValue,
} from './citizen-review-presentation';
import {
  assessCitizenChallanReview,
  type CitizenChallanAnswers,
  type CitizenReviewAssessment,
  type OfficialSourceStatus,
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

export type CitizenEvidencePresentationObservation = Omit<
  EvidenceObservation,
  'field' | 'value' | 'confidence' | 'confirmation' | 'limitation'
> & {
  field: string;
  value: string;
  confidence: string;
  confirmation: string;
  limitation?: string;
};

export type CitizenEvidencePresentationView = {
  sources: EvidenceSourceRef[];
  observations: CitizenEvidencePresentationObservation[];
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
  language?: Language;
  simpleMode?: boolean;
};

export type CitizenTimelineInput = {
  recordSelected: boolean;
  imageSelected: boolean;
  sourceConfirmed: boolean;
  observationsConfirmed: boolean;
  summaryGenerated: boolean;
  language?: Language;
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
const UNSAFE_LOCAL_REFERENCE = /(?:blob|data|file|filesystem):[^\s]*/gi;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g;

const CITIZEN_TIMELINE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    'timeline-started': 'You started a private review',
    'timeline-record-selected': 'You selected a downloaded record',
    'timeline-image-selected': 'You added a supplied photograph',
    'timeline-source-confirmed': 'You recorded the record source',
    'timeline-observations-confirmed': 'You recorded evidence observations',
    'timeline-summary-generated': 'You generated a local case summary',
  },
  hi: {
    'timeline-started': 'आपने निजी समीक्षा शुरू की',
    'timeline-record-selected': 'आपने डाउनलोड किया रिकॉर्ड चुना',
    'timeline-image-selected': 'आपने दी गई तस्वीर जोड़ी',
    'timeline-source-confirmed': 'आपने रिकॉर्ड का स्रोत दर्ज किया',
    'timeline-observations-confirmed': 'आपने सबूत के अवलोकन पुष्ट किए',
    'timeline-summary-generated': 'आपने स्थानीय केस सारांश बनाया',
  },
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

function artifactFallback(language: Language) {
  return language === 'hi' ? '[दर्ज नहीं]' : '[not entered]';
}

function maskedVehicleSuffix(value: string, language: Language = 'en'): string {
  if (typeof value !== 'string' || /(?:blob|data|file|filesystem):/i.test(value)) {
    return artifactFallback(language);
  }
  const suffix = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-4);
  return suffix.length === 4 ? `…${suffix}` : artifactFallback(language);
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
 * This function does not inspect source bytes or authenticate a record. It reuses the deterministic conservative classifier for materiality and makes no independent or legal classification.
 */
export function buildCitizenEvidenceView(input: CitizenEvidenceViewInput): CitizenEvidenceView {
  const currentAssessment = assessCitizenChallanReview(input.answers);
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

  const vehicleDifferenceMateriality = currentAssessment.finding === 'citizen-recorded-inconsistency' && currentAssessment.canPrepareWorksheet
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

export function buildCitizenEvidencePresentationView(
  view: CitizenEvidenceView,
  { language, simpleMode }: { language: Language; simpleMode: boolean },
): CitizenEvidencePresentationView {
  const officialFallbackHi: Record<string, string> = {
    'Citizen-declared downloaded official record': 'नागरिक द्वारा दर्ज डाउनलोड किया आधिकारिक रिकॉर्ड',
    'Citizen-declared official-service record': 'नागरिक द्वारा दर्ज आधिकारिक सेवा रिकॉर्ड',
    'Citizen-declared message-provided notice': 'नागरिक द्वारा दर्ज संदेश से मिला नोटिस',
    'Official record source not selected by the citizen': 'नागरिक ने आधिकारिक रिकॉर्ड स्रोत नहीं चुना',
  };
  const sourceLabels: Record<string, string> = language === 'hi'
    ? {
      'source-official-copy': view.sources[0]?.acquisition === 'local-file-preview'
        ? `नागरिक द्वारा चुनी रिकॉर्ड कॉपी: ${view.sources[0].label}`
        : officialFallbackHi[view.sources[0]?.label ?? ''] ?? 'नागरिक द्वारा दर्ज आधिकारिक रिकॉर्ड',
      'source-enforcement-image': view.sources[1]?.acquisition === 'local-file-preview'
        ? `नागरिक द्वारा चुनी तस्वीर: ${view.sources[1].label}`
        : 'नागरिक द्वारा वर्णित दी गई तस्वीर',
      'source-citizen-record': `नागरिक द्वारा दर्ज वाहन रिकॉर्ड: ${localizeEvidenceValue(
        view.sources[2]?.label.split(': ').at(-1) ?? '',
        'hi',
      )}`,
    }
    : {};
  return {
    sources: view.sources.map((source) => ({
      ...source,
      label: sourceLabels[source.id] ?? source.label,
    })),
    observations: view.observations.map((observation) => ({
      ...observation,
      field: localizeEvidenceField(observation.field, language),
      value: localizeEvidenceValue(observation.value, language),
      confidence: localizeEvidenceConfidence(observation.confidence, language),
      confirmation: localizeEvidenceConfirmation(observation.confirmation, language),
      limitation: localizeEvidenceLimitation(observation.limitation, language, simpleMode),
    })),
    conflicts: view.conflicts,
  };
}

export function buildCitizenTimeline(input: CitizenTimelineInput): CitizenTimelineEvent[] {
  const labels = CITIZEN_TIMELINE_LABELS[input.language ?? 'en'];
  const event = (id: string): CitizenTimelineEvent => ({ id, label: labels[id], actor: 'citizen' });
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

function canonicalTimelineLines(timeline: CitizenTimelineEvent[], language: Language): string[] {
  const labels = CITIZEN_TIMELINE_LABELS[language];
  const renderedIds = new Set<string>();
  return timeline.flatMap((event) => {
    const label = labels[event.id];
    if (!label || renderedIds.has(event.id)) return [];
    renderedIds.add(event.id);
    return [`- ${label}`];
  });
}

export function buildCitizenEvidenceSummary(input: CitizenEvidenceSummaryInput): string {
  const language = input.language ?? 'en';
  const canonicalView = buildCitizenEvidenceView(input);
  const view = buildCitizenEvidencePresentationView(canonicalView, {
    language,
    simpleMode: input.simpleMode ?? false,
  });
  const materialSignals = input.materialSignals ?? input.assessment.materialSignals;
  const missingEvidence = input.missingEvidence ?? input.assessment.missingEvidence;
  const observationLines = view.observations.map((observation) => {
    const limitation = observation.limitation ? ` Limitation: ${observation.limitation}` : '';
    return `- ${observation.field}: ${observation.value} (confidence: ${observation.confidence}; confirmed by citizen).${limitation}`;
  });

  if (input.simpleMode) {
    const simpleAssessment = localizeAssessment({
      ...input.assessment,
      materialSignals,
      missingEvidence,
    }, language, true);
    if (language === 'hi') {
      const simpleObservations = view.observations.map((observation) => {
        const limitation = observation.limitation ? ` ध्यान दें: ${observation.limitation}` : '';
        return `- ${observation.field}: ${observation.value}। स्पष्टता: ${observation.confidence}। आपने यह प्रविष्टि जाँची।${limitation}`;
      });
      return [
        'CHALLANSAKSHI — आपका स्थानीय सारांश',
        CITIZEN_DISCLAIMER_EN,
        CITIZEN_DISCLAIMER_HI,
        '',
        'आपकी जानकारी',
        `सेवा: ${sanitiseArtifactText(input.jurisdiction, artifactFallback('hi'))}`,
        `वाहन नंबर के अंतिम अक्षर/अंक: ${maskedVehicleSuffix(input.vehicleSuffix, 'hi')}`,
        `आरोपित अपराध: ${sanitiseArtifactText(input.allegedOffence, artifactFallback('hi'))}`,
        `दिखाई घटना तारीख: ${sanitiseArtifactText(input.eventDate, artifactFallback('hi'))}`,
        `कॉपी की गई आधिकारिक तारीख: ${sanitiseArtifactText(input.officialDeadline, artifactFallback('hi'))}`,
        '',
        'जानकारी कहाँ से आई',
        ...view.sources.map((source) => `- ${source.label}`),
        '',
        'आपने क्या देखा',
        ...simpleObservations,
        '',
        'क्या जाँच चाहिए',
        ...summaryList(simpleAssessment.materialSignals, 'कोई बड़ा अंतर दर्ज नहीं हुआ।'),
        '',
        'आपको अभी क्या चाहिए',
        ...summaryList(simpleAssessment.missingEvidence, 'कोई गायब रिकॉर्ड दर्ज नहीं हुआ।'),
        '',
        'आपने क्या किया',
        ...canonicalTimelineLines(input.timeline, 'hi'),
        '',
        'क्या पूछें',
        'इन तथ्यों को आधिकारिक सेवा पर जाँचें। जहाँ जानकारी साफ़ नहीं है, वहाँ स्पष्टीकरण माँगें।',
        '',
        'आगे क्या करें',
        'यह सारांश कहीं भेजा नहीं गया। जिम्मेदार आधिकारिक सेवा स्वयं खोलें और मौजूदा स्थिति फिर जाँचें।',
      ].join('\n');
    }

    const simpleObservations = view.observations.map((observation) => {
      const limitation = observation.limitation ? ` Note: ${observation.limitation}` : '';
      return `- ${observation.field}: ${observation.value}. Clarity: ${observation.confidence}. You checked this entry.${limitation}`;
    });
    return [
      'CHALLANSAKSHI — YOUR LOCAL SUMMARY',
      CITIZEN_DISCLAIMER_EN,
      '',
      'YOUR INFORMATION',
      `Service: ${sanitiseArtifactText(input.jurisdiction)}`,
      `Last 4 vehicle characters: ${maskedVehicleSuffix(input.vehicleSuffix)}`,
      `Alleged offence: ${sanitiseArtifactText(input.allegedOffence)}`,
      `Event date shown: ${sanitiseArtifactText(input.eventDate)}`,
      `Official date you copied: ${sanitiseArtifactText(input.officialDeadline)}`,
      '',
      'WHERE THE INFORMATION CAME FROM',
      ...view.sources.map((source) => `- ${source.label}`),
      '',
      'WHAT YOU SAW',
      ...simpleObservations,
      '',
      'WHAT MAY NEED CHECKING',
      ...summaryList(simpleAssessment.materialSignals, 'No major difference was recorded.'),
      '',
      'WHAT YOU STILL NEED',
      ...summaryList(simpleAssessment.missingEvidence, 'No missing record was marked.'),
      '',
      'WHAT YOU DID',
      ...canonicalTimelineLines(input.timeline, 'en'),
      '',
      'WHAT TO ASK',
      'Please check these facts on the official service. Ask for clarification where the information is not clear.',
      '',
      'WHAT TO DO NEXT',
      'This summary was not sent anywhere. Open the responsible official service yourself and check the current status again.',
    ].join('\n');
  }

  if (language === 'hi') {
    const localizedAssessment = localizeAssessment(input.assessment, 'hi');
    const hindiObservationLines = view.observations.map((observation) => {
      const limitation = observation.limitation ? ` सीमा: ${observation.limitation}` : '';
      return `- ${observation.field}: ${observation.value} (स्पष्टता: ${observation.confidence}; ${observation.confirmation})।${limitation}`;
    });
    return [
      'CHALLANSAKSHI — नागरिक सबूत सारांश',
      CITIZEN_DISCLAIMER_EN,
      CITIZEN_DISCLAIMER_HI,
      '',
      input.simpleMode ? 'आपकी दर्ज की हुई जानकारी' : 'न्यूनतम केस विवरण',
      `क्षेत्राधिकार या सेवा: ${sanitiseArtifactText(input.jurisdiction, artifactFallback('hi'))}`,
      `वाहन नंबर के अंतिम अक्षर/अंक: ${maskedVehicleSuffix(input.vehicleSuffix, 'hi')}`,
      `आरोपित अपराध श्रेणी: ${sanitiseArtifactText(input.allegedOffence, artifactFallback('hi'))}`,
      `दिखाई घटना तारीख: ${sanitiseArtifactText(input.eventDate, artifactFallback('hi'))}`,
      `नागरिक द्वारा कॉपी की गई आधिकारिक तारीख: ${sanitiseArtifactText(input.officialDeadline, artifactFallback('hi'))}`,
      '',
      'नागरिक द्वारा दिए स्रोत',
      ...view.sources.map((source) => `- ${source.label}`),
      '',
      'नागरिक द्वारा पुष्ट अवलोकन',
      ...hindiObservationLines,
      '',
      'महत्वपूर्ण संकेत',
      ...summaryList(localizedAssessment.materialSignals, 'इस सीमित समीक्षा में कोई महत्वपूर्ण संकेत दर्ज नहीं हुआ।'),
      '',
      'अभी आवश्यक रिकॉर्ड',
      ...summaryList(localizedAssessment.missingEvidence, 'इस सीमित सूची में कोई गायब रिकॉर्ड दर्ज नहीं हुआ।'),
      '',
      input.simpleMode ? 'आपने क्या किया' : 'नागरिक-दर्ज समयरेखा',
      ...canonicalTimelineLines(input.timeline, 'hi'),
      '',
      'तटस्थ स्पष्टीकरण अनुरोध',
      'मैं नोटिस के साथ दिए गए सबूत की समीक्षा का अनुरोध करता/करती हूँ। मेरे दर्ज अवलोकनों के आधार पर सूचीबद्ध फ़ील्ड को स्पष्टीकरण की आवश्यकता हो सकती है। कृपया वाहन पहचान, वाहन श्रेणी, आरोपित अपराध के सबूत, घटना समय, स्थान और नोटिस के आधार की जाँच करें। मैं पूरे आधिकारिक पहचान विवरण केवल जाँची हुई आधिकारिक सेवा में दर्ज करूँगा/करूँगी।',
      '',
      'महत्वपूर्ण सीमाएँ और आधिकारिक हैंडऑफ',
      'किसी सरकारी प्राधिकरण को कुछ भी जमा, प्रमाणित या मंज़ूर नहीं किया गया।',
      'यह सारांश केवल नागरिक द्वारा दिए स्रोत और पुष्ट अवलोकन दर्ज करता है। यह कानूनी निष्कर्ष या अमान्यता का प्रमाण नहीं है।',
      'कार्रवाई से पहले जिम्मेदार आधिकारिक सेवा पर मौजूदा स्थिति, रास्ता और दिखाई तारीख फिर जाँचें।',
    ].join('\n');
  }

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
    ...canonicalTimelineLines(input.timeline, 'en'),
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
