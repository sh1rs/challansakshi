import type {
  ExtractedFact,
  FindingKind,
  FixtureId,
  LocalizedText,
  OutcomeState,
  Visibility,
} from './domain';

export type EvidenceItemId = 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
export type LedgerActor = 'supplied-record' | 'analysis' | 'citizen' | 'rules' | 'simulated-authority';
export type CaseLedgerEventType =
  | 'records-loaded'
  | 'analysis-recorded'
  | 'corrections-recorded'
  | 'facts-confirmed'
  | 'finding-recorded'
  | 'pack-prepared'
  | 'submission-acknowledged'
  | 'authority-review-recorded'
  | 'authority-order-recorded'
  | 'no-decision-status-recorded'
  | 'order-extraction-confirmed'
  | 'order-map-confirmed';

export interface EvidenceIndexItem {
  id: EvidenceItemId;
  sourceId: 'challan' | 'vehicle-record' | 'enforcement' | 'citizen-photo' | 'citizen-comparison';
  label: LocalizedText;
  summary: string;
}

export interface CorrectionRecord {
  factId: string;
  source: ExtractedFact['source'];
  evidenceId: EvidenceItemId;
  evidenceReference: string;
  initialValue: string;
  confirmedValue: string;
  initialVisibility: Visibility;
  confirmedVisibility: Visibility;
  valueChanged: boolean;
  visibilityChanged: boolean;
  actor: 'citizen';
  revisionId: string;
}

export interface CaseLedgerEvent {
  id: string;
  sequence: number;
  type: CaseLedgerEventType;
  recordedOn: string;
  actor: LedgerActor;
  label: LocalizedText;
  detail: LocalizedText;
  evidenceIds: EvidenceItemId[];
  revisionId: string | null;
}

export interface BuildCaseLedgerInput {
  fixtureId: FixtureId;
  issueDate: string;
  analysisMode: 'precomputed' | 'live' | 'fallback';
  confirmed: boolean;
  corrections: CorrectionRecord[];
  finding: FindingKind;
  packPrepared: boolean;
  submitted: boolean;
  submittedRevisionId: string | null;
  trackingStage: number;
  outcome: OutcomeState;
  orderFactsConfirmed: boolean;
  orderMapConfirmed: boolean;
}

export interface CaseLedgerSnapshot {
  stage: 'notice' | 'evidence-review' | 'contest-ready' | 'submitted' | 'authority-review' | 'decision-recorded' | 'order-reviewed';
  lastEvent: CaseLedgerEvent;
  activeClock: 'contest' | 'authority' | 'post-decision' | 'none';
  canReviewOrder: boolean;
  submittedRevisionId: string | null;
}

const actorLabels: Record<LedgerActor, LocalizedText> = {
  'supplied-record': { en: 'Supplied synthetic record', hi: 'दिया गया सिंथेटिक रिकॉर्ड' },
  analysis: { en: 'Source-linked analysis', hi: 'स्रोत से जुड़ा विश्लेषण' },
  citizen: { en: 'Citizen review', hi: 'नागरिक की समीक्षा' },
  rules: { en: 'Deterministic rules', hi: 'नियम-आधारित जाँच' },
  'simulated-authority': { en: 'Simulated authority', hi: 'काल्पनिक प्राधिकरण' },
};

export function getLedgerActorLabel(actor: LedgerActor): LocalizedText {
  return actorLabels[actor];
}

export function evidenceIdForSource(source: ExtractedFact['source']): EvidenceItemId {
  if (source === 'challan') return 'A1';
  if (source === 'vehicle-record') return 'A2';
  if (source === 'enforcement') return 'A3';
  return 'A4';
}

export function buildEvidenceIndex(input: {
  challanNumber: string;
  registeredPlate: string;
  observedPlate: string;
  submittedRevisionId: string | null;
}): EvidenceIndexItem[] {
  return [
    { id: 'A1', sourceId: 'challan', label: { en: 'Synthetic e-Challan', hi: 'सिंथेटिक ई-चालान' }, summary: input.challanNumber },
    { id: 'A2', sourceId: 'vehicle-record', label: { en: 'Synthetic vehicle record', hi: 'सिंथेटिक वाहन रिकॉर्ड' }, summary: input.registeredPlate || 'Unavailable' },
    { id: 'A3', sourceId: 'enforcement', label: { en: 'Enforcement image and observations', hi: 'प्रवर्तन फ़ोटो और अवलोकन' }, summary: input.observedPlate || 'Unavailable / unclear' },
    { id: 'A4', sourceId: 'citizen-photo', label: { en: 'Citizen demo photograph', hi: 'नागरिक की डेमो फ़ोटो' }, summary: 'Synthetic' },
    { id: 'A5', sourceId: 'citizen-comparison', label: { en: 'Citizen-confirmed comparison and request', hi: 'नागरिक द्वारा पक्की तुलना और अनुरोध' }, summary: input.submittedRevisionId ?? 'Not submitted' },
  ];
}

function normalizedFact(fact: ExtractedFact): string {
  return [fact.id, fact.value.trim(), fact.visibility, fact.source, fact.evidenceRef].join('|');
}

/** A stable local identifier for the core citizen-confirmed facts in this synthetic demo. Not a cryptographic integrity proof. */
export function createSubmittedRevisionId(fixtureId: FixtureId, facts: ExtractedFact[]): string {
  const input = `${fixtureId}::${facts.map(normalizedFact).sort().join('::')}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `SUB-${fixtureId.toUpperCase()}-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
}

export function buildCorrectionRecords(
  analysisFacts: ExtractedFact[],
  confirmedFacts: ExtractedFact[],
  revisionId: string,
): CorrectionRecord[] {
  return confirmedFacts.flatMap((confirmedFact) => {
    const initial = analysisFacts.find((fact) => fact.id === confirmedFact.id);
    if (!initial) return [];
    const valueChanged = initial.value !== confirmedFact.value;
    const visibilityChanged = initial.visibility !== confirmedFact.visibility;
    if (!valueChanged && !visibilityChanged) return [];
    return [{
      factId: confirmedFact.id,
      source: confirmedFact.source,
      evidenceId: evidenceIdForSource(confirmedFact.source),
      evidenceReference: confirmedFact.evidenceRef,
      initialValue: initial.value,
      confirmedValue: confirmedFact.value,
      initialVisibility: initial.visibility,
      confirmedVisibility: confirmedFact.visibility,
      valueChanged,
      visibilityChanged,
      actor: 'citizen' as const,
      revisionId,
    }];
  });
}

const demoDates = {
  review: '2026-08-27',
  authorityReview: '2026-09-10',
  outcome: '2026-09-27',
  orderReview: '2026-10-05',
};

export function buildCaseLedger(input: BuildCaseLedgerInput): CaseLedgerEvent[] {
  const events: Omit<CaseLedgerEvent, 'sequence'>[] = [];
  const add = (event: Omit<CaseLedgerEvent, 'sequence'>) => events.push(event);
  const revisionId = input.submittedRevisionId;

  add({
    id: `${input.fixtureId}-records-loaded`, type: 'records-loaded', recordedOn: input.issueDate,
    actor: 'supplied-record', evidenceIds: ['A1', 'A2', 'A3', 'A4'], revisionId: null,
    label: { en: 'Synthetic records loaded', hi: 'सिंथेटिक रिकॉर्ड लोड हुए' },
    detail: { en: 'Challan, vehicle record, enforcement image, and citizen photo entered this local demo.', hi: 'चालान, वाहन रिकॉर्ड, प्रवर्तन फ़ोटो और नागरिक की फ़ोटो इस स्थानीय डेमो में जोड़ी गईं।' },
  });

  add({
    id: `${input.fixtureId}-analysis-recorded`, type: 'analysis-recorded', recordedOn: demoDates.review,
    actor: 'analysis', evidenceIds: ['A1', 'A2', 'A3', 'A4'], revisionId: null,
    label: { en: 'Source-linked observations recorded', hi: 'स्रोत से जुड़े अवलोकन दर्ज हुए' },
    detail: input.analysisMode === 'live'
      ? { en: 'A live model run produced observations for citizen review.', hi: 'लाइव मॉडल ने नागरिक समीक्षा के लिए अवलोकन बनाए।' }
      : { en: 'The reliable precomputed analysis was loaded for citizen review.', hi: 'नागरिक समीक्षा के लिए भरोसेमंद पहले से तैयार विश्लेषण लोड हुआ।' },
  });

  if (input.confirmed) {
    if (input.corrections.length > 0) {
      add({
        id: `${input.fixtureId}-corrections-recorded`, type: 'corrections-recorded', recordedOn: demoDates.review,
        actor: 'citizen', evidenceIds: [...new Set(input.corrections.map((item) => item.evidenceId))], revisionId,
        label: { en: 'Citizen corrections recorded', hi: 'नागरिक के सुधार दर्ज हुए' },
        detail: { en: `${input.corrections.length} source reading ${input.corrections.length === 1 ? 'change was' : 'changes were'} preserved with the original observation.`, hi: `${input.corrections.length} स्रोत-पठन बदलाव मूल अवलोकन के साथ सुरक्षित रखे गए।` },
      });
    }
    add({
      id: `${input.fixtureId}-facts-confirmed`, type: 'facts-confirmed', recordedOn: demoDates.review,
      actor: 'citizen', evidenceIds: ['A1', 'A2', 'A3'], revisionId,
      label: { en: 'Facts confirmed as reviewed', hi: 'जानकारी समीक्षा के बाद पक्की की गई' },
      detail: { en: 'Confirmation means the citizen reviewed the readings; it is not official verification.', hi: 'पुष्टि का अर्थ है कि नागरिक ने पठन जाँचे; यह आधिकारिक सत्यापन नहीं है।' },
    });
    add({
      id: `${input.fixtureId}-finding-recorded`, type: 'finding-recorded', recordedOn: demoDates.review,
      actor: 'rules', evidenceIds: ['A2', 'A3'], revisionId,
      label: { en: 'Deterministic finding generated', hi: 'नियम-आधारित नतीजा बना' },
      detail: input.finding === 'mismatch'
        ? { en: 'The confirmed records contain a possible vehicle mismatch.', hi: 'पक्के रिकॉर्ड में वाहन का संभावित बेमेल है।' }
        : input.finding === 'inconclusive'
          ? { en: 'The supplied evidence remains inconclusive.', hi: 'दिया गया सबूत अभी भी अनिर्णायक है।' }
          : { en: 'The supplied vehicle facts appear consistent; no contest was generated.', hi: 'दिए वाहन तथ्य मिलते दिखते हैं; कोई आपत्ति नहीं बनाई गई।' },
    });
  }

  if (input.packPrepared && input.finding !== 'consistent' && revisionId) {
    add({
      id: `${input.fixtureId}-pack-prepared`, type: 'pack-prepared', recordedOn: demoDates.review,
      actor: 'rules', evidenceIds: ['A1', 'A2', 'A3', 'A4', 'A5'], revisionId,
      label: { en: 'Evidence pack prepared', hi: 'सबूत पैक तैयार हुआ' },
      detail: { en: `The active pack is tied to revision ${revisionId}.`, hi: `मौजूदा पैक रिविज़न ${revisionId} से जुड़ा है।` },
    });
  }

  if (input.submitted && input.finding !== 'consistent' && revisionId) {
    add({
      id: `${input.fixtureId}-submission-acknowledged`, type: 'submission-acknowledged', recordedOn: demoDates.review,
      actor: 'simulated-authority', evidenceIds: ['A1', 'A2', 'A3', 'A4', 'A5'], revisionId,
      label: { en: 'Simulated submission acknowledged', hi: 'काल्पनिक जमा की पावती मिली' },
      detail: { en: 'No government system was contacted.', hi: 'किसी सरकारी सिस्टम से संपर्क नहीं हुआ।' },
    });
  }

  if (input.submitted && input.finding !== 'consistent' && input.trackingStage >= 3 && revisionId) {
    add({
      id: `${input.fixtureId}-authority-review`, type: 'authority-review-recorded', recordedOn: demoDates.authorityReview,
      actor: 'simulated-authority', evidenceIds: ['A1', 'A2', 'A3', 'A4', 'A5'], revisionId,
      label: { en: 'Fictional review status recorded', hi: 'काल्पनिक समीक्षा स्थिति दर्ज हुई' },
      detail: { en: 'This is a simulated status branch, not an official event.', hi: 'यह काल्पनिक स्थिति शाखा है, आधिकारिक घटना नहीं।' },
    });
  }

  if (input.submitted && input.finding !== 'consistent' && input.trackingStage >= 4 && revisionId && (input.outcome === 'quashed' || input.outcome === 'rejected')) {
    add({
      id: `${input.fixtureId}-authority-order-${input.outcome}`, type: 'authority-order-recorded', recordedOn: demoDates.outcome,
      actor: 'simulated-authority', evidenceIds: ['A1', 'A2', 'A3', 'A4', 'A5'], revisionId,
      label: input.outcome === 'rejected'
        ? { en: 'Fictional rejection order recorded', hi: 'काल्पनिक अस्वीकृति आदेश दर्ज हुआ' }
        : { en: 'Fictional quashing order recorded', hi: 'काल्पनिक निरस्तीकरण आदेश दर्ज हुआ' },
      detail: { en: 'Only the currently selected fictional outcome scenario is active.', hi: 'केवल अभी चुना गया काल्पनिक नतीजा सक्रिय है।' },
    });
  } else if (input.submitted && input.finding !== 'consistent' && input.trackingStage >= 4 && revisionId && input.outcome === 'no-resolution') {
    add({
      id: `${input.fixtureId}-no-decision-status`, type: 'no-decision-status-recorded', recordedOn: demoDates.outcome,
      actor: 'simulated-authority', evidenceIds: ['A5'], revisionId,
      label: { en: 'No decision shown in fictional snapshot', hi: 'काल्पनिक स्थिति में कोई फैसला नहीं दिखा' },
      detail: { en: 'No order exists in the supplied fictional status snapshot, so there is no order-to-evidence map.', hi: 'दिए काल्पनिक स्थिति रिकॉर्ड में कोई आदेश नहीं है, इसलिए आदेश-से-सबूत मानचित्र नहीं है।' },
    });
  }

  if (input.finding !== 'consistent' && input.outcome === 'rejected' && input.orderFactsConfirmed && revisionId) {
    add({
      id: `${input.fixtureId}-order-extraction-confirmed`, type: 'order-extraction-confirmed', recordedOn: demoDates.orderReview,
      actor: 'citizen', evidenceIds: ['A5'], revisionId,
      label: { en: 'Order facts confirmed as read', hi: 'आदेश के तथ्य पढ़कर पक्के किए गए' },
      detail: { en: 'The citizen confirmed the extraction from the supplied fictional pages.', hi: 'नागरिक ने दी गई काल्पनिक पन्नों से निकली जानकारी पक्की की।' },
    });
  }
  if (input.finding !== 'consistent' && input.outcome === 'rejected' && input.orderMapConfirmed && revisionId) {
    add({
      id: `${input.fixtureId}-order-map-confirmed`, type: 'order-map-confirmed', recordedOn: demoDates.orderReview,
      actor: 'citizen', evidenceIds: ['A2', 'A3', 'A5'], revisionId,
      label: { en: 'Order-to-evidence map reviewed', hi: 'आदेश-से-सबूत मानचित्र जाँचा गया' },
      detail: { en: 'Every mapping row was reviewed before the neutral note became available.', hi: 'तटस्थ नोट उपलब्ध होने से पहले हर मैपिंग पंक्ति जाँची गई।' },
    });
  }

  return events.map((event, index) => ({ ...event, sequence: index + 1 }));
}

export function deriveCaseLedgerSnapshot(events: CaseLedgerEvent[], submittedRevisionId: string | null): CaseLedgerSnapshot {
  if (events.length === 0) throw new Error('A case ledger requires at least one event');
  const lastEvent = events[events.length - 1];
  const has = (type: CaseLedgerEventType) => events.some((event) => event.type === type);
  const hasRejectedOrder = events.some((event) => event.type === 'authority-order-recorded' && event.id.endsWith('-rejected'));
  const hasQuashedOrder = events.some((event) => event.type === 'authority-order-recorded' && event.id.endsWith('-quashed'));
  const stage: CaseLedgerSnapshot['stage'] = has('order-map-confirmed')
    ? 'order-reviewed'
    : has('authority-order-recorded') || has('no-decision-status-recorded')
      ? 'decision-recorded'
      : has('authority-review-recorded')
        ? 'authority-review'
        : has('submission-acknowledged')
          ? 'submitted'
          : has('pack-prepared')
            ? 'contest-ready'
            : has('facts-confirmed')
              ? 'evidence-review'
              : 'notice';
  return {
    stage,
    lastEvent,
    activeClock: hasRejectedOrder ? 'post-decision' : hasQuashedOrder ? 'none' : has('submission-acknowledged') ? 'authority' : 'contest',
    canReviewOrder: hasRejectedOrder,
    submittedRevisionId,
  };
}
