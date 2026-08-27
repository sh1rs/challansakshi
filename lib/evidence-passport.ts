import type { ClassificationResult, EvidenceReadinessItem, ExtractedFact, FindingKind, FixtureId, LocalizedText } from './domain';
import type { CustodyEvidenceItemId } from './case-ledger';

export const PASSPORT_RULESET_VERSION = 'challansakshi.passport-rules.2026-08-v2';

export type CustodyScenarioId = 'owner-aligned' | 'sold-before-event' | 'rental-unclear' | 'fleet-aligned';
export type CustodyRole = 'owner' | 'seller' | 'buyer' | 'family-user' | 'renter' | 'fleet-driver' | 'police-custody';
export type CustodySource = 'transfer-acknowledgement' | 'booking-record' | 'handoff-record' | 'shift-sheet' | 'theft-report' | 'citizen-confirmed-note';
export type CustodyVerification = 'confirmed' | 'unclear' | 'unverified';
export type CustodyFinding = 'temporal-conflict' | 'insufficient-record' | 'records-align';

export interface CustodyInterval {
  id: CustodyEvidenceItemId;
  label: LocalizedText;
  role: CustodyRole;
  startsAt: string;
  endsAt: string | null;
  source: CustodySource;
  sourceLabel: LocalizedText;
  verificationStatus: CustodyVerification;
  evidenceReference: string;
}

export interface CustodyScenario {
  id: CustodyScenarioId;
  title: LocalizedText;
  shortDescription: LocalizedText;
  eventAt: string;
  intervals: CustodyInterval[];
}

export interface CustodyAssessment {
  finding: CustodyFinding;
  eventAt: string;
  relevantIntervalId: string | null;
  invalidIntervalIds: string[];
  minutesFromClosestBoundary: number | null;
}

export type ReviewGroundKind = 'vehicle-mismatch' | 'evidence-limitation' | 'ownership-custody-context';
export type PermittedArtifact = 'vehicle-review-request' | 'evidence-clarification-request' | 'ownership-custody-review-request' | 'combined-review-request' | 'none';

export interface ReviewGround {
  kind: ReviewGroundKind;
  supported: boolean;
  evidenceIds: string[];
  limitations: string[];
}

export interface CaseAssessment {
  visual: ClassificationResult;
  custody: CustodyAssessment | null;
  grounds: ReviewGround[];
  permittedArtifact: PermittedArtifact;
  canPreparePack: boolean;
}

export type SuppliedEvidenceStatus = 'supplied-readable' | 'supplied-unclear' | 'not-found' | 'not-applicable' | 'verify-official';

export interface SuppliedEvidenceElement {
  id: string;
  label: LocalizedText;
  status: SuppliedEvidenceStatus;
  sourceReference: LocalizedText;
  note: LocalizedText;
}

export interface SuppliedEvidencePassport {
  elements: SuppliedEvidenceElement[];
  counts: Record<SuppliedEvidenceStatus, number>;
  notFoundIds: string[];
  unclearIds: string[];
}

export interface EvidencePassportSnapshot {
  schema: 'challansakshi.evidence-passport.v2';
  revisionId: string;
  generatedOn: string;
  syntheticOnly: true;
  localOnly: true;
  fixtureId: FixtureId;
  factRevisionId: string;
  identityFinding: FindingKind;
  custodyScenarioId: CustodyScenarioId;
  custodyScenario: CustodyScenario;
  custodyAssessment: CustodyAssessment;
  suppliedEvidence: SuppliedEvidencePassport;
  confirmations: {
    custodyReviewed: true;
    suppliedPacketScopeReviewed: true;
  };
  boundaries: string[];
  rulesetVersion: typeof PASSPORT_RULESET_VERSION;
}

const DEFAULT_EVENT_AT = '2026-08-20T09:42:00+05:30';

export const custodyScenarios: Record<CustodyScenarioId, CustodyScenario> = {
  'owner-aligned': {
    id: 'owner-aligned',
    title: { en: 'Owner handoff record', hi: 'मालिक का हैंडऑफ़ रिकॉर्ड' },
    shortDescription: { en: 'The supplied interval includes the alleged event', hi: 'दिया समय-अंतराल कथित घटना को शामिल करता है' },
    eventAt: DEFAULT_EVENT_AT,
    intervals: [{
      id: 'C1',
      label: { en: 'Citizen-stated vehicle custody', hi: 'नागरिक द्वारा बताया वाहन उपयोग समय' },
      role: 'owner',
      startsAt: '2026-08-19T18:00:00+05:30',
      endsAt: '2026-08-20T23:00:00+05:30',
      source: 'citizen-confirmed-note',
      sourceLabel: { en: 'Synthetic citizen-confirmed note', hi: 'काल्पनिक नागरिक-पुष्टि नोट' },
      verificationStatus: 'confirmed',
      evidenceReference: 'CUSTODY-C1 · citizen statement',
    }],
  },
  'sold-before-event': {
    id: 'sold-before-event',
    title: { en: 'Sold vehicle', hi: 'बेचा गया वाहन' },
    shortDescription: { en: 'The event is after the supplied transfer handoff', hi: 'घटना दिए ट्रांसफ़र हैंडऑफ़ के बाद है' },
    eventAt: DEFAULT_EVENT_AT,
    intervals: [{
      id: 'C2',
      label: { en: 'Seller custody ended', hi: 'विक्रेता का वाहन उपयोग समय समाप्त' },
      role: 'seller',
      startsAt: '2024-04-01T00:00:00+05:30',
      endsAt: '2026-08-10T15:30:00+05:30',
      source: 'transfer-acknowledgement',
      sourceLabel: { en: 'Synthetic transfer acknowledgement', hi: 'काल्पनिक ट्रांसफ़र पावती' },
      verificationStatus: 'confirmed',
      evidenceReference: 'CUSTODY-C2 · transfer acknowledgement',
    }],
  },
  'rental-unclear': {
    id: 'rental-unclear',
    title: { en: 'Rental boundary unclear', hi: 'किराये की समय-सीमा अस्पष्ट' },
    shortDescription: { en: 'A booking is supplied, but its handoff is unverified', hi: 'बुकिंग दी गई है, पर हैंडऑफ़ सत्यापित नहीं है' },
    eventAt: DEFAULT_EVENT_AT,
    intervals: [{
      id: 'C3',
      label: { en: 'Rental booking interval', hi: 'किराये की बुकिंग अवधि' },
      role: 'renter',
      startsAt: '2026-08-20T08:00:00+05:30',
      endsAt: '2026-08-20T18:00:00+05:30',
      source: 'booking-record',
      sourceLabel: { en: 'Synthetic booking record; handoff missing', hi: 'काल्पनिक बुकिंग रिकॉर्ड; हैंडऑफ़ गायब' },
      verificationStatus: 'unclear',
      evidenceReference: 'CUSTODY-C3 · booking only',
    }],
  },
  'fleet-aligned': {
    id: 'fleet-aligned',
    title: { en: 'Fleet assignment aligns', hi: 'फ़्लीट असाइनमेंट मेल खाता है' },
    shortDescription: { en: 'The supplied shift includes the alleged event', hi: 'दी गई शिफ़्ट कथित घटना को शामिल करती है' },
    eventAt: DEFAULT_EVENT_AT,
    intervals: [{
      id: 'C4',
      label: { en: 'Driver assignment window', hi: 'ड्राइवर असाइनमेंट समय' },
      role: 'fleet-driver',
      startsAt: '2026-08-20T08:00:00+05:30',
      endsAt: '2026-08-20T23:00:00+05:30',
      source: 'shift-sheet',
      sourceLabel: { en: 'Synthetic shift sheet', hi: 'काल्पनिक शिफ़्ट शीट' },
      verificationStatus: 'confirmed',
      evidenceReference: 'CUSTODY-C4 · shift sheet',
    }],
  },
};

export function custodyScenarioAt(scenarioId: CustodyScenarioId, eventAt: string): CustodyScenario {
  const scenario = custodyScenarios[scenarioId];
  return {
    ...scenario,
    title: { ...scenario.title },
    shortDescription: { ...scenario.shortDescription },
    eventAt,
    intervals: scenario.intervals.map((interval) => ({
      ...interval,
      label: { ...interval.label },
      sourceLabel: { ...interval.sourceLabel },
    })),
  };
}

function instant(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function intervalContains(interval: CustodyInterval, eventAt: number): boolean {
  const start = instant(interval.startsAt);
  const end = interval.endsAt ? instant(interval.endsAt) : null;
  if (start === null || (interval.endsAt && end === null)) return false;
  return eventAt >= start && (end === null || eventAt <= end);
}

export function evaluateCustodyTimeline(scenario: CustodyScenario): CustodyAssessment {
  const eventAt = instant(scenario.eventAt);
  if (eventAt === null) {
    return { finding: 'insufficient-record', eventAt: scenario.eventAt, relevantIntervalId: null, invalidIntervalIds: ['event-at'], minutesFromClosestBoundary: null };
  }

  const invalidIntervalIds = scenario.intervals.filter((interval) => {
    const start = instant(interval.startsAt);
    const end = interval.endsAt ? instant(interval.endsAt) : null;
    return start === null || (interval.endsAt !== null && end === null) || (start !== null && end !== null && start > end);
  }).map((interval) => interval.id);
  if (invalidIntervalIds.length > 0 || scenario.intervals.length === 0) {
    return { finding: 'insufficient-record', eventAt: scenario.eventAt, relevantIntervalId: null, invalidIntervalIds, minutesFromClosestBoundary: null };
  }

  const confirmedContaining = scenario.intervals.find((interval) => interval.verificationStatus === 'confirmed' && intervalContains(interval, eventAt));
  if (confirmedContaining) {
    return { finding: 'records-align', eventAt: scenario.eventAt, relevantIntervalId: confirmedContaining.id, invalidIntervalIds: [], minutesFromClosestBoundary: 0 };
  }

  const uncertainContaining = scenario.intervals.find((interval) => interval.verificationStatus !== 'confirmed' && intervalContains(interval, eventAt));
  if (uncertainContaining || !scenario.intervals.some((interval) => interval.verificationStatus === 'confirmed')) {
    return { finding: 'insufficient-record', eventAt: scenario.eventAt, relevantIntervalId: uncertainContaining?.id ?? null, invalidIntervalIds: [], minutesFromClosestBoundary: null };
  }

  const boundaries = scenario.intervals
    .filter((interval) => interval.verificationStatus === 'confirmed')
    .flatMap((interval) => [instant(interval.startsAt), interval.endsAt ? instant(interval.endsAt) : null])
    .filter((value): value is number => value !== null);
  const closest = boundaries.length ? Math.min(...boundaries.map((value) => Math.abs(eventAt - value))) : null;
  return {
    finding: 'temporal-conflict',
    eventAt: scenario.eventAt,
    relevantIntervalId: scenario.intervals.find((interval) => interval.verificationStatus === 'confirmed')?.id ?? null,
    invalidIntervalIds: [],
    minutesFromClosestBoundary: closest === null ? null : Math.round(closest / 60_000),
  };
}

export function deriveCaseAssessment(
  visual: ClassificationResult,
  custody: CustodyAssessment | null,
  custodyReviewed: boolean,
): CaseAssessment {
  const grounds: ReviewGround[] = [];
  if (visual.finding === 'mismatch') {
    grounds.push({ kind: 'vehicle-mismatch', supported: true, evidenceIds: ['A2', 'A3', 'A5'], limitations: visual.limitations });
  } else if (visual.finding === 'inconclusive') {
    grounds.push({ kind: 'evidence-limitation', supported: true, evidenceIds: ['A1', 'A3', 'A5'], limitations: visual.limitations });
  }
  if (custodyReviewed && custody?.finding === 'temporal-conflict') {
    grounds.push({
      kind: 'ownership-custody-context',
      supported: true,
      evidenceIds: custody.relevantIntervalId ? [custody.relevantIntervalId] : [],
      limitations: ['does-not-identify-driver', 'does-not-establish-legal-ownership-or-liability'],
    });
  }

  const supportedKinds = new Set(grounds.filter((ground) => ground.supported).map((ground) => ground.kind));
  let permittedArtifact: PermittedArtifact = 'none';
  if (supportedKinds.has('ownership-custody-context') && supportedKinds.size > 1) permittedArtifact = 'combined-review-request';
  else if (supportedKinds.has('vehicle-mismatch')) permittedArtifact = 'vehicle-review-request';
  else if (supportedKinds.has('evidence-limitation')) permittedArtifact = 'evidence-clarification-request';
  else if (supportedKinds.has('ownership-custody-context')) permittedArtifact = 'ownership-custody-review-request';

  return { visual, custody, grounds, permittedArtifact, canPreparePack: permittedArtifact !== 'none' };
}

export function buildCustodyReadinessItem(
  assessment: CaseAssessment,
  scenario: CustodyScenario,
): EvidenceReadinessItem | null {
  const custodyGround = assessment.grounds.find((ground) => ground.supported && ground.kind === 'ownership-custody-context');
  if (!custodyGround) return null;
  const evidenceId = custodyGround.evidenceIds[0] ?? assessment.custody?.relevantIntervalId ?? 'unlinked';
  const interval = scenario.intervals.find((item) => item.id === evidenceId);
  return {
    id: `custody-record-${evidenceId.toLowerCase()}`,
    label: {
      en: `Vehicle relationship record (${evidenceId})`,
      hi: `वाहन संबंध रिकॉर्ड (${evidenceId})`,
    },
    category: 'citizen',
    status: interval?.verificationStatus === 'confirmed' ? 'present' : 'missing',
  };
}

function statusForVisibility(visibility: ExtractedFact['visibility'] | undefined): SuppliedEvidenceStatus {
  return visibility === 'clear' ? 'supplied-readable' : 'supplied-unclear';
}

function localizeEvidenceReference(reference: string | undefined, fallback: LocalizedText): LocalizedText {
  const english = reference ?? fallback.en;
  const knownHindiReferences: Record<string, string> = {
    'Enforcement image · plate region': 'प्रवर्तन फ़ोटो · नंबर प्लेट हिस्सा',
    'Enforcement image · alleged offence area': 'प्रवर्तन फ़ोटो · बताए उल्लंघन का हिस्सा',
    'Enforcement image · rider area': 'प्रवर्तन फ़ोटो · चालक हिस्सा',
    'Enforcement image · road context': 'प्रवर्तन फ़ोटो · सड़क संदर्भ',
  };
  return {
    en: english,
    hi: knownHindiReferences[english] ?? fallback.hi,
  };
}

export function buildSuppliedEvidencePassport(fixtureId: FixtureId, facts: ExtractedFact[]): SuppliedEvidencePassport {
  const fact = (id: string) => facts.find((item) => item.id === id);
  const observedPlate = fact('observed-registration');
  const offence = fact('offence-visible');
  const imageVisibility = [fact('observed-registration'), fact('observed-category'), fact('observed-colour')]
    .some((item) => item?.visibility === 'clear') ? 'supplied-readable' : 'supplied-unclear';

  const elements: SuppliedEvidenceElement[] = [
    {
      id: 'EP1',
      label: { en: 'Enforcement photograph', hi: 'प्रवर्तन फ़ोटो' },
      status: imageVisibility,
      sourceReference: { en: 'Synthetic e-Challan attachment', hi: 'काल्पनिक ई-चालान अटैचमेंट' },
      note: { en: 'The image is supplied; individual details may still be unclear.', hi: 'फ़ोटो दी गई है; उसके अलग-अलग विवरण फिर भी अस्पष्ट हो सकते हैं।' },
    },
    {
      id: 'EP2',
      label: { en: 'Vehicle plate visible', hi: 'वाहन नंबर दिखाई देता है' },
      status: statusForVisibility(observedPlate?.visibility),
      sourceReference: localizeEvidenceReference(observedPlate?.evidenceRef, { en: 'Enforcement image · plate region', hi: 'प्रवर्तन फ़ोटो · नंबर प्लेट हिस्सा' }),
      note: { en: 'Status describes the citizen-supplied image, not the original camera file.', hi: 'यह स्थिति नागरिक को मिली फ़ोटो बताती है, मूल कैमरा फ़ाइल नहीं।' },
    },
    {
      id: 'EP3',
      label: { en: 'Alleged offence visually assessable', hi: 'बताया उल्लंघन फ़ोटो से जाँचा जा सकता है' },
      status: offence?.visibility === 'clear' && /^yes/i.test(offence.value) ? 'supplied-readable' : 'supplied-unclear',
      sourceReference: localizeEvidenceReference(offence?.evidenceRef, { en: 'Enforcement image · alleged offence area', hi: 'प्रवर्तन फ़ोटो · बताए उल्लंघन का हिस्सा' }),
      note: { en: 'An unclear status preserves uncertainty; it does not disprove the allegation.', hi: 'अस्पष्ट स्थिति अनिश्चितता बचाती है; यह आरोप को गलत साबित नहीं करती।' },
    },
    {
      id: 'EP4',
      label: { en: 'Date, time, and place', hi: 'तारीख, समय और स्थान' },
      status: 'supplied-readable',
      sourceReference: { en: 'Synthetic challan · event block', hi: 'काल्पनिक चालान · घटना हिस्सा' },
      note: { en: 'All three values appear in the fictional notice.', hi: 'तीनों जानकारी काल्पनिक नोटिस में दिखती हैं।' },
    },
    {
      id: 'EP5',
      label: { en: 'Violated provision', hi: 'बताया गया कानूनी प्रावधान' },
      status: 'verify-official',
      sourceReference: { en: 'Synthetic challan · offence description only', hi: 'काल्पनिक चालान · केवल उल्लंघन विवरण' },
      note: { en: 'The offence is named, but this demo packet does not verify a provision number.', hi: 'उल्लंघन लिखा है, पर यह डेमो पैकेट प्रावधान नंबर सत्यापित नहीं करता।' },
    },
    {
      id: 'EP6',
      label: { en: 'Device measurement', hi: 'उपकरण से माप' },
      status: 'not-applicable',
      sourceReference: { en: 'Helmet allegation fixture', hi: 'हेलमेट आरोप उदाहरण' },
      note: { en: 'No speed, weight, or other measured value is part of this fictional allegation.', hi: 'इस काल्पनिक आरोप में गति, वजन या दूसरा माप शामिल नहीं है।' },
    },
    {
      id: 'EP7',
      label: { en: 'Original-resolution image', hi: 'मूल रेज़ोल्यूशन वाली फ़ोटो' },
      status: 'not-found',
      sourceReference: { en: 'Fictional packet supplied to citizen', hi: 'नागरिक को दिया काल्पनिक पैकेट' },
      note: { en: 'Only the rendered attachment is present in this demo packet.', hi: 'इस डेमो पैकेट में केवल दिखाई गई अटैचमेंट मौजूद है।' },
    },
    {
      id: 'EP8',
      label: { en: 'Electronic-record certificate', hi: 'इलेक्ट्रॉनिक रिकॉर्ड प्रमाणपत्र' },
      status: 'not-found',
      sourceReference: { en: 'Fictional packet supplied to citizen', hi: 'नागरिक को दिया काल्पनिक पैकेट' },
      note: { en: 'Not found in the supplied demo packet; it may exist elsewhere in an official record.', hi: 'दिए डेमो पैकेट में नहीं मिला; आधिकारिक रिकॉर्ड में कहीं और हो सकता है।' },
    },
  ];

  if (fixtureId === 'inconclusive') {
    elements[1] = { ...elements[1], status: 'supplied-unclear' };
    elements[2] = { ...elements[2], status: 'supplied-unclear' };
  }

  const statuses: SuppliedEvidenceStatus[] = ['supplied-readable', 'supplied-unclear', 'not-found', 'not-applicable', 'verify-official'];
  const counts = Object.fromEntries(statuses.map((status) => [status, elements.filter((element) => element.status === status).length])) as Record<SuppliedEvidenceStatus, number>;
  return {
    elements,
    counts,
    notFoundIds: elements.filter((element) => element.status === 'not-found').map((element) => element.id),
    unclearIds: elements.filter((element) => element.status === 'supplied-unclear').map((element) => element.id),
  };
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

export function createEvidencePassportRevisionId(input: {
  fixtureId: FixtureId;
  factRevisionId: string;
  identityFinding: FindingKind;
  custodyScenarioId: CustodyScenarioId;
  eventAt: string;
  suppliedEvidence: SuppliedEvidencePassport;
}): string {
  const statuses = input.suppliedEvidence.elements.map((element) => `${element.id}:${element.status}`).join('|');
  const scenario = custodyScenarioAt(input.custodyScenarioId, input.eventAt);
  const custodyRecord = scenario.intervals.map((interval) => [
    interval.id,
    interval.role,
    interval.startsAt,
    interval.endsAt ?? 'open-ended',
    interval.source,
    interval.verificationStatus,
    interval.evidenceReference,
  ].join(':')).join('|');
  return `PASS-${input.fixtureId.toUpperCase()}-${stableHash(`${input.factRevisionId}|${input.identityFinding}|${scenario.id}|${scenario.eventAt}|${custodyRecord}|${statuses}|${PASSPORT_RULESET_VERSION}`)}`;
}

export function buildEvidencePassportSnapshot(input: {
  generatedOn: string;
  fixtureId: FixtureId;
  factRevisionId: string;
  identityFinding: FindingKind;
  custodyScenarioId: CustodyScenarioId;
  eventAt: string;
  suppliedEvidence: SuppliedEvidencePassport;
  custodyReviewed: boolean;
  suppliedPacketScopeReviewed: boolean;
}): EvidencePassportSnapshot | null {
  if (!input.custodyReviewed || !input.suppliedPacketScopeReviewed) return null;
  const scenario = custodyScenarioAt(input.custodyScenarioId, input.eventAt);
  return {
    schema: 'challansakshi.evidence-passport.v2',
    revisionId: createEvidencePassportRevisionId(input),
    generatedOn: input.generatedOn,
    syntheticOnly: true,
    localOnly: true,
    fixtureId: input.fixtureId,
    factRevisionId: input.factRevisionId,
    identityFinding: input.identityFinding,
    custodyScenarioId: input.custodyScenarioId,
    custodyScenario: scenario,
    custodyAssessment: evaluateCustodyTimeline(scenario),
    suppliedEvidence: input.suppliedEvidence,
    confirmations: { custodyReviewed: true, suppliedPacketScopeReviewed: true },
    boundaries: [
      'This local demo passport is not government-issued identity proof or official verification.',
      'The revision ID is a deterministic local reference, not a cryptographic integrity proof.',
      'Custody timing does not identify the driver or decide responsibility.',
      'Not found describes only the fictional packet supplied to the citizen and does not determine legal validity.',
    ],
    rulesetVersion: PASSPORT_RULESET_VERSION,
  };
}
