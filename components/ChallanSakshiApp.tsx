'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  calculateAuthorityWindow,
  calculateContestWindow,
  classifyEvidenceComparison,
  deriveConfirmedVehicleFacts,
  evaluateEvidenceReadiness,
  guardEvidenceNavigation,
  isReviewFactEditable,
  validateEvidenceReviewFacts,
  type ConfirmedVehicleFacts,
  type DemoStep as StepId,
  type ExtractedFact,
  type FixtureId,
  type FindingKind,
  type Language,
  type LocalizedText,
  type OutcomeState,
} from '../lib/domain';
import { fixtureList, fixtures, type DemoFixture, type EvidenceCardData } from '../lib/fixtures';
import { ResolutionDesk, ResolutionRouteView } from './ResolutionDesk';
import { calculatePostRejectionWindow, resolutionIssues, type ResolutionIssueId } from '../lib/resolution';
import {
  buildCaseLedger,
  buildCorrectionRecords,
  buildEvidenceIndex,
  createSubmittedRevisionId,
  deriveCaseLedgerSnapshot,
} from '../lib/case-ledger';
import {
  ORDER_ACKNOWLEDGED_DATE,
  ORDER_REVIEW_REFERENCE_DATE,
  buildClarificationDraft,
  buildOrderEvidenceMap,
  buildOrderReviewArtifact,
  buildOrderReviewNote,
  buildPostDecisionCalendar,
  buildSyntheticRejectedOrder,
  createInitialOrderMapReviews,
  invalidateOrderMapConfirmations,
  validateOrderFactReview,
  validateOrderMapReview,
  type OrderCompleteness,
  type OrderExtractedFact,
  type OrderFactId,
  type OrderMapReview,
} from '../lib/order-evidence';
import { CaseLedgerTimeline, OrderMapScreen, OrderReviewScreen } from './OrderEvidenceReview';

type AnalysisMode = 'precomputed' | 'live' | 'fallback';
type Pair = { en: string; hi: string };
interface PersistedDemoStateV4 {
  version: 4;
  language: Language;
  step: StepId;
  fixtureId: FixtureId;
  facts: ExtractedFact[];
  analysisFacts: ExtractedFact[];
  confirmed: boolean;
  analysisMode: AnalysisMode;
  trackingStage: number;
  outcome: OutcomeState;
  resolutionIssue: ResolutionIssueId;
  submittedFacts: ExtractedFact[] | null;
  submittedRevisionId: string | null;
  orderExtractedFacts: OrderExtractedFact[];
  orderConfirmedFactIds: string[];
  orderCompleteness: OrderCompleteness | null;
  orderMapReviews: Record<string, OrderMapReview>;
  orderLimitationConfirmed: boolean;
  orderNoteCreated: boolean;
}

const DEMO_REFERENCE_DATE = '2026-08-27';
const STORAGE_KEY = 'challansakshi-demo-v4';
const OLD_STORAGE_KEYS = ['challansakshi-demo-v3', 'challansakshi-demo-v2', 'challansakshi-demo-v1'];
const ORDER_FACT_IDS: OrderFactId[] = ['order-id', 'grievance-id', 'challan-id', 'order-date', 'outcome', 'reason', 'next-route'];
const steps: StepId[] = ['landing', 'desk', 'route', 'intake', 'review', 'finding', 'readiness', 'pack', 'tracking', 'order-review', 'order-map'];
const evidenceSteps: StepId[] = ['intake', 'review', 'finding', 'readiness', 'pack', 'tracking', 'order-review', 'order-map'];

function isStoredFactList(value: unknown): value is ExtractedFact[] {
  return Array.isArray(value) && value.every((fact) => fact && typeof fact === 'object'
    && typeof (fact as ExtractedFact).id === 'string'
    && typeof (fact as ExtractedFact).value === 'string'
    && typeof (fact as ExtractedFact).evidenceRef === 'string');
}

function isStoredOrderReviews(value: unknown): value is Record<string, OrderMapReview> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([rowId, review]) => /^P[1-9]\d*$/.test(rowId) && review && typeof review === 'object'
    && ['mentioned', 'unclear', 'not-found'].includes((review as OrderMapReview).status)
    && Array.isArray((review as OrderMapReview).reasonRefs)
    && (review as OrderMapReview).reasonRefs.every((ref) => typeof ref === 'string')
    && typeof (review as OrderMapReview).confirmed === 'boolean');
}

function isStoredOrderFactList(value: unknown): value is OrderExtractedFact[] {
  if (!Array.isArray(value) || value.length !== ORDER_FACT_IDS.length) return false;
  const ids = new Set(value.map((fact) => fact && typeof fact === 'object' ? (fact as OrderExtractedFact).id : null));
  return ids.size === ORDER_FACT_IDS.length && ORDER_FACT_IDS.every((id) => ids.has(id)) && value.every((fact) => fact && typeof fact === 'object'
    && ORDER_FACT_IDS.includes((fact as OrderExtractedFact).id)
    && typeof (fact as OrderExtractedFact).value === 'string'
    && (fact as OrderExtractedFact).label && typeof (fact as OrderExtractedFact).label.en === 'string' && typeof (fact as OrderExtractedFact).label.hi === 'string'
    && Array.isArray((fact as OrderExtractedFact).sourceParagraphs)
    && (fact as OrderExtractedFact).sourceParagraphs.every((source) => typeof source === 'string'));
}

function parseAppHash(hash: string): { step: StepId; issueId?: ResolutionIssueId } | null {
  const raw = hash.replace(/^#/, '');
  if (raw === 'how-it-works') return { step: 'landing' };
  if (raw.startsWith('route/')) {
    const issueId = raw.slice('route/'.length) as ResolutionIssueId;
    return resolutionIssues.some((item) => item.id === issueId) ? { step: 'route', issueId } : null;
  }
  return steps.includes(raw as StepId) ? { step: raw as StepId } : null;
}

function hashForStep(step: StepId, issueId: ResolutionIssueId): string {
  return step === 'route' ? `#route/${issueId}` : `#${step}`;
}

const copy = {
  prototype: { en: 'Independent hackathon prototype · Synthetic demo data', hi: 'स्वतंत्र हैकाथॉन प्रोटोटाइप · सिंथेटिक डेमो डेटा' },
  evidenceBefore: { en: 'Evidence before action.', hi: 'कार्रवाई से पहले सबूत समझें।' },
  navHow: { en: 'How it works', hi: 'यह कैसे काम करता है' },
  reset: { en: 'Start over', hi: 'फिर से शुरू करें' },
  landingQuestion: { en: 'Does the challan photo show your vehicle?', hi: 'क्या चालान की फ़ोटो में आपका ही वाहन है?' },
  landingLead: { en: 'Before you pay or contest an e-Challan, understand what its supplied evidence actually shows.', hi: 'ई-चालान भरने या आपत्ति दर्ज करने से पहले समझें कि उसमें दिया सबूत वास्तव में क्या दिखाता है।' },
  tryDemo: { en: 'Try the demo challan', hi: 'डेमो चालान देखें' },
  noSignup: { en: 'No sign-up · No real documents · About 90 seconds', hi: 'साइन-अप नहीं · असली दस्तावेज़ नहीं · लगभग 90 सेकंड' },
  evidenceLinked: { en: 'Evidence-linked', hi: 'सबूत से जुड़ा' },
  evidenceLinkedSub: { en: 'Every finding shows its source', hi: 'हर नतीजा अपना स्रोत दिखाता है' },
  deadlineAware: { en: 'Deadline-aware', hi: 'समय-सीमा स्पष्ट' },
  deadlineAwareSub: { en: 'Rules—not AI—calculate dates', hi: 'तारीखें नियम तय करते हैं, AI नहीं' },
  honest: { en: 'Honest by design', hi: 'ईमानदार तरीका' },
  honestSub: { en: 'Never invents a dispute', hi: 'आपत्ति का कारण नहीं गढ़ता' },
  howEyebrow: { en: 'A calmer next step', hi: 'अगला कदम, साफ़ और आसान' },
  howTitle: { en: 'From confusing evidence to a clear, factual contest.', hi: 'उलझे सबूत से साफ़ और तथ्य-आधारित आपत्ति तक।' },
  how1: { en: 'Read the supplied evidence', hi: 'दिए गए सबूत पढ़ें' },
  how1p: { en: 'Review a synthetic challan, vehicle record, and photographs side by side.', hi: 'सिंथेटिक चालान, वाहन रिकॉर्ड और फ़ोटो को साथ रखकर देखें।' },
  how2: { en: 'Verify every fact', hi: 'हर जानकारी जाँचें' },
  how2p: { en: 'Correct what the analysis read before any comparison is made.', hi: 'तुलना से पहले पढ़ी गई जानकारी सुधारें या पक्की करें।' },
  how3: { en: 'Prepare the next action', hi: 'अगली कार्रवाई तैयार करें' },
  how3p: { en: 'See deadlines and build an indexed pack from confirmed facts only.', hi: 'समय-सीमा देखें और सिर्फ़ पक्की जानकारी से क्रमवार पैक बनाएँ।' },
  independence: { en: 'Independent by design.', hi: 'स्वतंत्र प्रोटोटाइप।' },
  disclaimer: { en: 'Not affiliated with MoRTH, Parivahan, traffic police, or any court. Synthetic records only. Not legal advice.', hi: 'MoRTH, Parivahan, ट्रैफ़िक पुलिस या किसी अदालत से संबद्ध नहीं। केवल सिंथेटिक रिकॉर्ड। यह कानूनी सलाह नहीं है।' },
  chooseCase: { en: 'Choose a demo case', hi: 'डेमो मामला चुनें' },
  changeAnytime: { en: 'Switch fixtures to see how the evidence rules change the result.', hi: 'सबूत के अनुसार नतीजा कैसे बदलता है, यह देखने के लिए डेमो बदलें।' },
  selected: { en: 'Selected', hi: 'चुना गया' },
  openCase: { en: 'Open this demo', hi: 'यह डेमो खोलें' },
  evidenceIntake: { en: 'Evidence intake', hi: 'सबूत इकट्ठा करें' },
  evidenceIntro: { en: 'Three fictional records are ready for a side-by-side review.', hi: 'तुलना के लिए तीन काल्पनिक रिकॉर्ड तैयार हैं।' },
  uploadWarning: { en: 'Demo only. Do not upload a real RC, licence, identity document, or personal information.', hi: 'सिर्फ़ डेमो। असली आरसी, लाइसेंस, पहचान पत्र या निजी जानकारी अपलोड न करें।' },
  synthetic: { en: 'SYNTHETIC DEMO DATA', hi: 'सिंथेटिक डेमो डेटा' },
  loaded: { en: 'Loaded', hi: 'लोड हो गया' },
  replace: { en: 'Replace demo file', hi: 'डेमो फ़ाइल बदलें' },
  whyMatters: { en: 'Why it matters', hi: 'यह क्यों ज़रूरी है' },
  analyse: { en: 'Analyse the evidence', hi: 'सबूत जाँचें' },
  analysing: { en: 'Comparing supplied records…', hi: 'दिए गए रिकॉर्ड मिलाए जा रहे हैं…' },
  precomputed: { en: 'Precomputed demo analysis', hi: 'पहले से तैयार डेमो विश्लेषण' },
  live: { en: 'Live model analysis', hi: 'लाइव मॉडल विश्लेषण' },
  fallback: { en: 'Precomputed fallback active', hi: 'पहले से तैयार विश्लेषण चालू है' },
  back: { en: 'Back', hi: 'पीछे' },
  reviewFacts: { en: 'Review the extracted facts', hi: 'मिली जानकारी जाँचें' },
  reviewLead: { en: 'Review every source. Correct the comparison fields; synthetic challan identifiers stay locked to their source fixture.', hi: 'हर स्रोत जाँचें। तुलना वाली जानकारी सुधारें; सिंथेटिक चालान पहचान अपने स्रोत रिकॉर्ड के अनुसार लॉक रहती है।' },
  rerun: { en: 'Re-run AI analysis', hi: 'AI विश्लेषण फिर चलाएँ' },
  rerunning: { en: 'Re-running analysis…', hi: 'विश्लेषण फिर चल रहा है…' },
  source: { en: 'Source', hi: 'स्रोत' },
  confidence: { en: 'Image clarity', hi: 'फ़ोटो की स्पष्टता' },
  clear: { en: 'Clear', hi: 'साफ़' },
  partial: { en: 'Partly clear', hi: 'कुछ हद तक साफ़' },
  unclear: { en: 'Unclear', hi: 'साफ़ नहीं' },
  notVisible: { en: 'Not visible', hi: 'दिखाई नहीं देता' },
  confirmFacts: { en: 'I reviewed these extracted facts and corrected anything inaccurate.', hi: 'मैंने मिली जानकारी जाँच ली है और जो गलत था उसे सुधार दिया है।' },
  confirmationNeeded: { en: 'Confirm the review before continuing.', hi: 'आगे बढ़ने से पहले जाँच की पुष्टि करें।' },
  seeFinding: { en: 'See the evidence finding', hi: 'जाँच का नतीजा देखें' },
  findingEyebrow: { en: 'Evidence finding', hi: 'सबूत की जाँच का नतीजा' },
  possibleMismatch: { en: 'Possible vehicle mismatch', hi: 'वाहन शायद मेल नहीं खाता' },
  mismatchLead: { en: 'The supplied records contain multiple inconsistencies that may support a grievance.', hi: 'दिए गए रिकॉर्ड में कई अंतर हैं, जो आपत्ति में मदद कर सकते हैं।' },
  inconclusive: { en: 'Evidence is inconclusive', hi: 'सबूत साफ़ नहीं हैं' },
  inconclusiveLead: { en: 'One or more supplied observations are not clear enough for a reliable conclusion. The product will not invent a mismatch.', hi: 'दी गई एक या अधिक जानकारियाँ भरोसेमंद नतीजे के लिए पर्याप्त साफ़ नहीं हैं। यह प्रोडक्ट कोई अंतर नहीं गढ़ेगा।' },
  consistent: { en: 'No material mismatch found', hi: 'कोई बड़ा अंतर नहीं मिला' },
  consistentLead: { en: 'The supplied records appear to describe the same vehicle, and the visible evidence appears consistent with the allegation.', hi: 'दिए गए रिकॉर्ड एक ही वाहन से जुड़े दिखते हैं और दिखाई दे रहा सबूत आरोप से मेल खाता है।' },
  notLegalDecision: { en: 'This is not a legal decision. The designated authority makes the final decision.', hi: 'यह कानूनी फैसला नहीं है। अंतिम निर्णय संबंधित प्राधिकरण करता है।' },
  whatMeans: { en: 'What this means', hi: 'इसका क्या मतलब है' },
  whatNotProve: { en: 'What this does not prove', hi: 'इससे क्या साबित नहीं होता' },
  whyFlagged: { en: 'Why this was flagged', hi: 'अंतर क्यों दिखा' },
  recordSource: { en: 'Vehicle record source', hi: 'वाहन रिकॉर्ड का स्रोत' },
  imageSource: { en: 'Enforcement image source', hi: 'चालान फ़ोटो का स्रोत' },
  contestClock: { en: 'Indicative contest clock', hi: 'अनुमानित आपत्ति समय-सीमा' },
  demoDate: { en: 'Fictional demo date: 27 Aug 2026', hi: 'काल्पनिक डेमो तारीख: 27 अगस्त 2026' },
  daysLeft: { en: 'days remaining', hi: 'दिन बाकी' },
  dayOf: { en: 'Day', hi: 'दिन' },
  deadlineCaution: { en: 'Calculated from the issue date using a transparent product convention. Confirm the deadline and state route on the official portal.', hi: 'यह गणना जारी करने की तारीख से की गई है। अंतिम तारीख और राज्य का तरीका आधिकारिक पोर्टल पर जाँचें।' },
  officialSource: { en: 'Read the official March 2026 source', hi: 'मार्च 2026 का आधिकारिक स्रोत पढ़ें' },
  officialPortal: { en: 'Continue on the official e-Challan portal', hi: 'आधिकारिक ई-चालान पोर्टल पर जाएँ' },
  evidenceReadiness: { en: 'Evidence readiness', hi: 'सबूतों की तैयारी' },
  readinessLead: { en: 'See what is present, what is missing, and who can supply it.', hi: 'देखें कि क्या मौजूद है, क्या नहीं है और उसे कौन दे सकता है।' },
  citizenCanSupply: { en: 'Citizen can supply', hi: 'नागरिक दे सकता है' },
  authorityHas: { en: 'Authority should possess', hi: 'प्राधिकरण के पास होना चाहिए' },
  optional: { en: 'Optional support', hi: 'वैकल्पिक मदद' },
  present: { en: 'Present', hi: 'मौजूद' },
  missing: { en: 'Missing', hi: 'नहीं मिला' },
  optionalStatus: { en: 'Optional', hi: 'वैकल्पिक' },
  noInvent: { en: 'Missing evidence will not be invented or silently marked complete.', hi: 'गायब सबूत न गढ़े जाएँगे, न उन्हें बिना बताए पूरा माना जाएगा।' },
  preparePack: { en: 'Prepare my contest pack', hi: 'मेरी आपत्ति का पैक तैयार करें' },
  prepareClarification: { en: 'Prepare a clarification request', hi: 'स्पष्टीकरण का अनुरोध तैयार करें' },
  contestPack: { en: 'Evidence-backed contest pack', hi: 'सबूतों पर आधारित आपत्ति पैक' },
  packLead: { en: 'Generated only from the facts you reviewed and confirmed.', hi: 'केवल आपकी जाँची और पक्की की गई जानकारी से बनाया गया।' },
  simulatedOnly: { en: 'SIMULATED ONLY — nothing will be sent to a government system.', hi: 'सिर्फ़ डेमो — किसी सरकारी सिस्टम पर कुछ नहीं भेजा जाएगा।' },
  caseSummary: { en: 'Case summary', hi: 'मामले का सार' },
  discrepancies: { en: 'Specific observations', hi: 'खास बातें' },
  evidenceIndex: { en: 'Evidence index', hi: 'सबूतों की क्रमवार सूची' },
  declaration: { en: 'Citizen declaration placeholder', hi: 'नागरिक की घोषणा के लिए जगह' },
  requestedAction: { en: 'Requested action', hi: 'अनुरोध' },
  copyText: { en: 'Copy contest text', hi: 'आपत्ति का मसौदा कॉपी करें' },
  copied: { en: 'Copied', hi: 'कॉपी हो गया' },
  printPack: { en: 'Print / save as PDF', hi: 'प्रिंट / PDF में सेव करें' },
  editFacts: { en: 'Edit verified facts', hi: 'पक्की जानकारी सुधारें' },
  submitDemo: { en: 'Proceed to simulated submission', hi: 'डेमो जमा करने की प्रक्रिया देखें' },
  tracking: { en: 'Simulated submission & tracking', hi: 'डेमो जमा और स्थिति' },
  trackingLead: { en: 'No information was sent to a government system.', hi: 'किसी सरकारी सिस्टम पर कोई जानकारी नहीं भेजी गई।' },
  fictionalRef: { en: 'Fictional grievance number', hi: 'काल्पनिक शिकायत नंबर' },
  timeline: { en: 'Case timeline', hi: 'मामले की समयरेखा' },
  evidenceReviewed: { en: 'Evidence reviewed', hi: 'सबूत जाँचे गए' },
  packPrepared: { en: 'Contest pack prepared', hi: 'आपत्ति पैक तैयार' },
  submissionReceived: { en: 'Simulated submission received', hi: 'डेमो आपत्ति दर्ज' },
  underReview: { en: 'Under authority review', hi: 'प्राधिकरण की समीक्षा जारी' },
  reasonedOutcome: { en: 'Reasoned outcome', hi: 'कारण सहित नतीजा' },
  moveForward: { en: 'Move demo case forward', hi: 'डेमो मामला आगे बढ़ाएँ' },
  chooseOutcome: { en: 'Simulate an outcome', hi: 'डेमो नतीजा चुनें' },
  quashed: { en: 'Quashed with reasons', hi: 'कारण सहित चालान हटाया गया' },
  rejected: { en: 'Rejected with reasons', hi: 'कारण सहित आपत्ति अस्वीकार' },
  noResolution: { en: 'No recorded resolution', hi: 'कोई नतीजा दर्ज नहीं' },
  quashedTitle: { en: 'Fictional order: challan quashed', hi: 'काल्पनिक आदेश: चालान हटाया गया' },
  quashedReason: { en: 'Reason recorded: the vehicle in the supplied enforcement image did not match the registered vehicle record.', hi: 'दर्ज कारण: चालान की फ़ोटो वाला वाहन पंजीकरण रिकॉर्ड से मेल नहीं खाता था।' },
  rejectedTitle: { en: 'Fictional order: contest rejected', hi: 'काल्पनिक आदेश: आपत्ति अस्वीकार' },
  rejectedReason: { en: 'Reason recorded: the submitted material was not sufficient to establish a material vehicle mismatch.', hi: 'दर्ज कारण: दिए गए रिकॉर्ड से वाहन का बड़ा अंतर स्पष्ट नहीं हुआ।' },
  neutralNext: { en: 'Read the recorded reasons, preserve the pack, and verify current official options and deadlines. This prototype does not recommend legal action.', hi: 'दर्ज कारण पढ़ें, पैक सुरक्षित रखें और आधिकारिक विकल्प व तारीखें जाँचें। यह प्रोटोटाइप कानूनी कार्रवाई की सलाह नहीं देता।' },
  noResolutionTitle: { en: 'No decision recorded within the stated response period', hi: 'बताई गई अवधि में कोई निर्णय दर्ज नहीं' },
  noResolutionBody: { en: 'As of the fictional status snapshot dated 27 Sep 2026, no decision is recorded. The official answer describes a 30-day resolution period for a properly contested challan, but ChallanSakshi cannot verify every legal condition or the current state implementation. Check the official portal and designated state authority before acting.', hi: '27 सितंबर 2026 की काल्पनिक स्थिति में कोई निर्णय दर्ज नहीं है। आधिकारिक उत्तर सही तरह दर्ज आपत्ति के लिए 30 दिन की निर्णय अवधि बताता है, लेकिन ChallanSakshi सभी कानूनी शर्तें या राज्य का मौजूदा तरीका पक्का नहीं कर सकता। आगे बढ़ने से पहले आधिकारिक पोर्टल और संबंधित राज्य प्राधिकरण जाँचें।' },
  viewPack: { en: 'View contest pack', hi: 'आपत्ति पैक देखें' },
  anotherDemo: { en: 'Choose another demo', hi: 'दूसरा डेमो चुनें' },
  consistentRefusal: { en: 'ChallanSakshi will not create an accusatory contest when the supplied evidence appears consistent.', hi: 'जब दिए गए सबूत आपस में मिलते हैं, ChallanSakshi आरोप लगाने वाली आपत्ति तैयार नहीं करेगा।' },
  currentStateRoute: { en: 'Verify the current state-specific process before acting.', hi: 'आगे बढ़ने से पहले राज्य का मौजूदा तरीका जाँचें।' },
} satisfies Record<string, Pair>;

const sourceNames: Record<ExtractedFact['source'], Pair> = {
  challan: { en: 'Synthetic e-Challan', hi: 'सिंथेटिक ई-चालान' },
  enforcement: { en: 'Enforcement image', hi: 'चालान की फ़ोटो' },
  'vehicle-record': { en: 'Vehicle record', hi: 'वाहन रिकॉर्ड' },
  'citizen-photo': { en: 'Citizen photograph', hi: 'नागरिक की फ़ोटो' },
};

const limitationCopy: Record<string, Pair> = {
  'registration-unreadable': { en: 'The enforcement-image registration cannot be read reliably.', hi: 'प्रवर्तन फ़ोटो में वाहन नंबर भरोसे से नहीं पढ़ा जा सकता।' },
  'category-not-fully-clear': { en: 'The vehicle category is not fully clear in the supplied image.', hi: 'दी गई फ़ोटो में वाहन का प्रकार पूरी तरह साफ़ नहीं है।' },
  'colour-not-fully-clear': { en: 'The vehicle colour is not fully clear in the supplied image.', hi: 'दी गई फ़ोटो में वाहन का रंग पूरी तरह साफ़ नहीं है।' },
  'offence-not-assessable': { en: 'The alleged offence cannot be assessed reliably from the supplied image.', hi: 'दी गई फ़ोटो से बताए गए उल्लंघन की भरोसेमंद जाँच नहीं हो सकती।' },
};

const resolutionStageCopy: Record<(typeof resolutionIssues)[number]['stage'], Pair> = {
  evidence: { en: 'Evidence', hi: 'सबूत' },
  authority: { en: 'Authority', hi: 'प्राधिकरण' },
  court: { en: 'Court', hi: 'अदालत' },
  payment: { en: 'Payment', hi: 'भुगतान' },
};

function local(pair: LocalizedText | Pair, language: Language): string {
  return pair[language];
}

function describeLimitation(code: string, language: Language): string {
  return local(limitationCopy[code] ?? { en: 'The supplied record has an unresolved evidence limitation.', hi: 'दिए गए रिकॉर्ड में सबूत की एक सीमा अभी बाकी है।' }, language);
}

function formatDate(value: string, language: Language): string {
  const date = new Date(`${value}T00:00:00+05:30`);
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(date);
}

function ShieldMark() {
  return <span className="brand-mark" aria-hidden="true"><span>स</span></span>;
}

function StatusPill({ mode, language }: { mode: AnalysisMode; language: Language }) {
  const labels = mode === 'live' ? copy.live : mode === 'fallback' ? copy.fallback : copy.precomputed;
  return <span className={`status-pill status-${mode}`}><span aria-hidden="true" />{local(labels, language)}</span>;
}

function AppHeader({ language, setLanguage, step, onReset, onHome, onDesk }: {
  language: Language;
  setLanguage: (language: Language) => void;
  step: StepId;
  onReset: () => void;
  onHome: () => void;
  onDesk: () => void;
}) {
  return (
    <>
      <div className="prototype-bar"><span className="prototype-dot" aria-hidden="true" />{local(copy.prototype, language)}</div>
      <header className="site-header shell">
        <button type="button" className="brand brand-button" onClick={onHome} aria-label="ChallanSakshi home">
          <ShieldMark />
          <span><strong>ChallanSakshi</strong><small>चालान साक्षी</small></span>
        </button>
        <nav aria-label={language === 'hi' ? 'मुख्य नेविगेशन' : 'Primary navigation'}>
          {step === 'landing' && <><button type="button" className="reset-link resolution-nav-link" onClick={onDesk}>{language === 'hi' ? 'रिज़ॉल्यूशन डेस्क' : 'Resolution desk'}</button><a href="#how-it-works">{local(copy.navHow, language)}</a></>}
          {step !== 'landing' && <button type="button" className="reset-link" onClick={onReset}>{local(copy.reset, language)}</button>}
          <div className="language-switch" role="group" aria-label={language === 'hi' ? 'भाषा' : 'Language'}>
            <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
            <button type="button" className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')} aria-pressed={language === 'hi'}>हिं</button>
          </div>
        </nav>
      </header>
    </>
  );
}

function Progress({ step, language }: { step: StepId; language: Language }) {
  if (!evidenceSteps.includes(step)) return null;
  const items: Array<{ id: StepId; label: Pair }> = [
    { id: 'intake', label: { en: 'Evidence', hi: 'सबूत' } },
    { id: 'review', label: { en: 'Verify', hi: 'जाँच' } },
    { id: 'finding', label: { en: 'Finding', hi: 'नतीजा' } },
    { id: 'readiness', label: { en: 'Readiness', hi: 'तैयारी' } },
    { id: 'pack', label: { en: 'Pack', hi: 'पैक' } },
    { id: 'tracking', label: { en: 'Track', hi: 'स्थिति' } },
  ];
  const progressStep: StepId = step === 'order-review' || step === 'order-map' ? 'tracking' : step;
  const activeIndex = items.findIndex((item) => item.id === progressStep);
  return (
    <div className="progress-wrap">
      <ol className="progress shell" aria-label={language === 'hi' ? 'डेमो के चरण' : 'Demo progress'}>
        {items.map((item, index) => (
          <li key={item.id} className={index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''} aria-current={index === activeIndex ? 'step' : undefined}>
            <span>{index < activeIndex ? '✓' : index + 1}</span><small>{local(item.label, language)}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function BackButton({ onClick, language }: { onClick: () => void; language: Language }) {
  return <button className="back-button" type="button" onClick={onClick}><span aria-hidden="true">←</span>{local(copy.back, language)}</button>;
}

function FixturePicker({ fixtureId, language, onSelect }: { fixtureId: FixtureId; language: Language; onSelect: (id: FixtureId) => void }) {
  return (
    <div className="fixture-picker" role="group" aria-label={local(copy.chooseCase, language)}>
      {fixtureList.map((item) => {
        const active = item.id === fixtureId;
        return (
          <button key={item.id} type="button" className={`fixture-option finding-${item.expectedFinding} ${active ? 'active' : ''}`} onClick={() => onSelect(item.id)} aria-pressed={active}>
            <span className="fixture-code">{item.code}</span>
            <strong>{local(item.title, language)}</strong>
            <small>{local(item.shortDescription, language)}</small>
            <span className="fixture-select">{active ? local(copy.selected, language) : local(copy.openCase, language)} <b aria-hidden="true">{active ? '✓' : '→'}</b></span>
          </button>
        );
      })}
    </div>
  );
}

function EvidencePhoto({ fixture, label, id, citizen = false }: { fixture: DemoFixture; label: string; id?: string; citizen?: boolean }) {
  const panel = citizen ? (fixture.id === 'mismatch' ? 'right' : fixture.photoPanel) : fixture.photoPanel;
  return (
    <div id={id} className={`evidence-photo photo-panel-${panel} ${citizen ? 'citizen-evidence' : ''}`} role="img" aria-label={label}>
      <span className="synthetic-stamp">SYNTHETIC DEMO DATA</span>
      <span className="photo-corner-label">{citizen ? 'CITIZEN PHOTO' : 'ENFORCEMENT IMAGE'}</span>
      <span className="photo-plate">{citizen ? fixture.confirmedFacts.registeredPlate : fixture.confirmedFacts.observedPlate}</span>
    </div>
  );
}

function ChallanPreview({ fixture, language }: { fixture: DemoFixture; language: Language }) {
  return (
    <div className="document-preview challan-preview" aria-label={local(copy.synthetic, language)}>
      <span className="diagonal-watermark">SYNTHETIC DEMO DATA</span>
      <div className="doc-heading"><span>CS</span><div><b>DEMO e-CHALLAN</b><small>FICTIONAL NOTICE</small></div></div>
      <dl>
        <div><dt>CHALLAN</dt><dd>{fixture.challanNumber}</dd></div>
        <div><dt>ISSUED</dt><dd>{formatDate(fixture.issueDate, language)}</dd></div>
        <div><dt>VEHICLE</dt><dd>{fixture.allegedRegistration}</dd></div>
        <div><dt>AMOUNT</dt><dd>{fixture.amount}</dd></div>
      </dl>
      <p>{local(fixture.offence, language)}</p>
    </div>
  );
}

function VehicleRecordPreview({ fixture, language }: { fixture: DemoFixture; language: Language }) {
  return (
    <div className="document-preview record-preview">
      <span className="diagonal-watermark">SYNTHETIC DEMO DATA</span>
      <div className="doc-heading"><span>VR</span><div><b>VEHICLE DATA CARD</b><small>NOT AN OFFICIAL RC</small></div></div>
      <dl>
        <div><dt>{language === 'hi' ? 'वाहन नंबर' : 'IDENTIFIER'}</dt><dd>{fixture.confirmedFacts.registeredPlate}</dd></div>
        <div><dt>{language === 'hi' ? 'प्रकार' : 'CATEGORY'}</dt><dd>{fixture.confirmedFacts.registeredCategory}</dd></div>
        <div><dt>{language === 'hi' ? 'रंग' : 'COLOUR'}</dt><dd>{fixture.confirmedFacts.registeredColour}</dd></div>
        <div><dt>{language === 'hi' ? 'डेमो नाम' : 'DISPLAY NAME'}</dt><dd>{fixture.ownerDisplay}</dd></div>
      </dl>
    </div>
  );
}

function EvidenceCard({ card, fixture, language }: {
  card: EvidenceCardData;
  fixture: DemoFixture;
  language: Language;
}) {
  return (
    <article className="evidence-card" id={`source-${card.id}`}>
      <div className="evidence-card-head">
        <span className="source-number">{card.id === 'challan' ? '01' : card.id === 'vehicle-record' ? '02' : '03'}</span>
        <div><h3>{local(card.title, language)}</h3><span className="synthetic-chip">{local(copy.synthetic, language)}</span></div>
        <span className="loaded-chip"><b aria-hidden="true">✓</b>{local(copy.loaded, language)}</span>
      </div>
      {card.id === 'challan' && <ChallanPreview fixture={fixture} language={language} />}
      {card.id === 'vehicle-record' && <VehicleRecordPreview fixture={fixture} language={language} />}
      {card.id === 'citizen-photo' && <EvidencePhoto fixture={fixture} citizen label={local(card.title, language)} />}
      <div className="evidence-why"><strong>{local(copy.whyMatters, language)}</strong><p>{local(card.why, language)}</p></div>
      <div className="replace-row">
        <span>{language === 'hi' ? 'पहले से लोड काल्पनिक फ़ाइल' : 'Preloaded fictional fixture'}</span>
        <b>{language === 'hi' ? 'कोई अपलोड नहीं' : 'No uploads accepted'}</b>
      </div>
    </article>
  );
}

function Landing({ language, onStart, onOpenDesk, onOpenRoute }: { language: Language; onStart: () => void; onOpenDesk: () => void; onOpenRoute: (issueId: ResolutionIssueId) => void }) {
  return (
    <main tabIndex={-1}>
      <section className="hero shell" id="landing">
        <div className="hero-copy">
          <p className="eyebrow"><span />{local(copy.evidenceBefore, language)}</p>
          <h1>{language === 'hi' ? <>क्या चालान की फ़ोटो में <em>आपका</em> ही वाहन है?</> : <>Does the challan photo show <em>your</em> vehicle?</>}</h1>
          <p className="hero-lede">{local(copy.landingLead, language)}</p>
          <div className="hero-actions">
            <Button type="button" onClick={onStart}>{local(copy.tryDemo, language)} <span aria-hidden="true">→</span></Button>
            <Button variant="secondary" type="button" onClick={onOpenDesk}>{language === 'hi' ? 'अपनी अगली राह खोजें' : 'Find my next step'}</Button>
          </div>
          <p className="microcopy"><span aria-hidden="true">◉</span>{local(copy.noSignup, language)}</p>
        </div>
        <div className="evidence-scene" aria-label="Synthetic evidence comparison preview">
          <div className="case-meta"><span>DEMO CASE · ASHA</span><span>{language === 'hi' ? '45 दिन की अवधि का 8वाँ दिन' : 'Day 8 of 45'}</span></div>
          <EvidencePhoto fixture={fixtures.mismatch} label="Synthetic enforcement photo of a white motorcycle" />
          <div className="finding-card"><span className="finding-icon" aria-hidden="true">!</span><div><small>{local(copy.possibleMismatch, language).toUpperCase()}</small><strong>{language === 'hi' ? 'दिए गए 3 विवरण अलग दिखते हैं' : '3 supplied details appear inconsistent'}</strong></div></div>
          <div className="comparison-row">
            <div><small>{language === 'hi' ? 'वाहन रिकॉर्ड' : 'VEHICLE RECORD'}</small><strong>{language === 'hi' ? 'नीला स्कूटर' : 'Blue scooter'}</strong><span>TEST-26-SC-3317</span></div>
            <span className="versus">≠</span>
            <div><small>{language === 'hi' ? 'चालान की फ़ोटो' : 'ENFORCEMENT IMAGE'}</small><strong>{language === 'hi' ? 'सफ़ेद मोटरसाइकिल' : 'White motorcycle'}</strong><span>TEST-26-MC-3817</span></div>
          </div>
          <p className="scene-note">{local(copy.notLegalDecision, language)}</p>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product safeguards">
        <div className="shell trust-items">
          <p><strong>{local(copy.evidenceLinked, language)}</strong><span>{local(copy.evidenceLinkedSub, language)}</span></p>
          <p><strong>{local(copy.deadlineAware, language)}</strong><span>{local(copy.deadlineAwareSub, language)}</span></p>
          <p><strong>{local(copy.honest, language)}</strong><span>{local(copy.honestSub, language)}</span></p>
        </div>
      </section>

      <section className="breadth-section shell" id="resolution-coverage">
        <div className="breadth-heading">
          <div><p className="eyebrow"><span />{language === 'hi' ? 'एक सबूत प्रणाली · सात मुश्किल पड़ाव' : 'One evidence system · seven difficult moments'}</p><h2>{language === 'hi' ? 'पहली सूचना से नतीजे, कोर्ट हैंडऑफ़ या भुगतान-स्थिति तक साफ़ अगला कदम।' : 'A clear next step through outcome, court handoff, or payment-status recovery.'}</h2></div>
          <div><p>{language === 'hi' ? 'गलत या धुंधली फ़ोटो, अस्वीकार आपत्ति, वर्चुअल कोर्ट, पेंडिंग भुगतान और रसीद/फ़ोन की समस्या—हर रास्ता स्रोत, सीमा और आधिकारिक हैंडऑफ़ दिखाता है।' : 'Wrong or unclear evidence, a rejected grievance, Virtual Court, a pending payment, or access trouble—every route shows sources, limits, and an official handoff.'}</p><button type="button" onClick={onOpenDesk}>{language === 'hi' ? 'पूरा रिज़ॉल्यूशन डेस्क खोलें' : 'Explore the full resolution desk'} <span aria-hidden="true">→</span></button></div>
        </div>
        <div className="breadth-grid">
          {resolutionIssues.map((issue) => <button type="button" key={issue.id} onClick={() => issue.id === 'wrong-evidence' ? onStart() : onOpenRoute(issue.id)}><span aria-hidden="true">{issue.icon}</span><div><small>{local(resolutionStageCopy[issue.stage], language).toUpperCase()}</small><strong>{local(issue.title, language)}</strong><p>{local(issue.resultLabel, language)}</p></div><b aria-hidden="true">→</b></button>)}
        </div>
      </section>

      <section className="how shell" id="how-it-works">
        <p className="eyebrow"><span />{local(copy.howEyebrow, language)}</p>
        <h2>{local(copy.howTitle, language)}</h2>
        <div className="how-grid">
          <article><b>01</b><h3>{local(copy.how1, language)}</h3><p>{local(copy.how1p, language)}</p></article>
          <article><b>02</b><h3>{local(copy.how2, language)}</h3><p>{local(copy.how2p, language)}</p></article>
          <article><b>03</b><h3>{local(copy.how3, language)}</h3><p>{local(copy.how3p, language)}</p></article>
        </div>
        <div className="independence-note"><strong>{local(copy.independence, language)}</strong><p>{local(copy.disclaimer, language)}</p></div>
      </section>
      <Footer language={language} />
    </main>
  );
}

function Footer({ language }: { language: Language }) {
  return (
    <footer className="site-footer">
      <div className="shell"><div className="footer-brand"><ShieldMark /><span><strong>ChallanSakshi</strong><small>{local(copy.evidenceBefore, language)}</small></span></div><p>{local(copy.disclaimer, language)} {local(copy.currentStateRoute, language)}</p></div>
    </footer>
  );
}

function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`screen-shell shell ${className}`} tabIndex={-1}>{children}</main>;
}

function SourcePreview({ fixture, confirmed, language, kind }: { fixture: DemoFixture; confirmed: ConfirmedVehicleFacts; language: Language; kind: 'record' | 'image' }) {
  return (
    <section className="source-preview" id={kind === 'record' ? 'finding-record' : 'finding-enforcement'}>
      <div className="source-preview-label"><span>{kind === 'record' ? 'RC' : 'IMG'}</span><div><small>{kind === 'record' ? local(copy.recordSource, language) : local(copy.imageSource, language)}</small><strong>{kind === 'record' ? confirmed.registeredPlate : confirmed.observedPlate}</strong><em>{language === 'hi' ? 'नागरिक द्वारा पक्की पढ़ाई' : 'Citizen-confirmed reading'}</em></div></div>
      {kind === 'record' ? <VehicleRecordPreview fixture={fixture} language={language} /> : <EvidencePhoto fixture={fixture} label={local(copy.imageSource, language)} />}
    </section>
  );
}

function ContestClock({ fixture, language }: { fixture: DemoFixture; language: Language }) {
  const clock = calculateContestWindow(fixture.issueDate, DEMO_REFERENCE_DATE);
  return (
    <aside className="clock-card">
      <div className="clock-top"><div><span>{local(copy.contestClock, language)}</span><strong>{local(copy.dayOf, language)} {clock.dayNumber} <small>/ 45</small></strong></div><div className="days-badge"><b>{clock.daysRemaining}</b><span>{local(copy.daysLeft, language)}</span></div></div>
      <div className="clock-bar" aria-label={`${clock.dayNumber} of 45 days`}><span style={{ width: `${Math.min(100, (clock.dayNumber / 45) * 100)}%` }} /></div>
      <dl className="clock-dates"><div><dt>{language === 'hi' ? 'जारी' : 'Issued'}</dt><dd>{formatDate(clock.issueDate, language)}</dd></div><div><dt>{language === 'hi' ? 'अनुमानित अंतिम दिन' : 'Indicative deadline'}</dt><dd>{formatDate(clock.indicativeDeadline, language)}</dd></div></dl>
      <p><b>{local(copy.demoDate, language)}</b> {local(copy.deadlineCaution, language)}</p>
      <a href="https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars" target="_blank" rel="noreferrer">{local(copy.officialSource, language)} <span aria-hidden="true">↗</span></a>
    </aside>
  );
}

function FindingPanel({ finding, fixture, facts, language }: { finding: FindingKind; fixture: DemoFixture; facts: ExtractedFact[]; language: Language }) {
  const confirmed = deriveConfirmedVehicleFacts(fixture.confirmedFacts, facts);
  const result = classifyEvidenceComparison(confirmed);
  const title = finding === 'mismatch' ? copy.possibleMismatch : finding === 'inconclusive' ? copy.inconclusive : copy.consistent;
  const lead = finding === 'mismatch' ? copy.mismatchLead : finding === 'inconclusive' ? copy.inconclusiveLead : copy.consistentLead;
  return (
    <>
      <section className={`finding-hero finding-${finding}`}>
        <span className="finding-big-icon" aria-hidden="true">{finding === 'mismatch' ? '!' : finding === 'inconclusive' ? '?' : '✓'}</span>
        <div><p>{local(copy.findingEyebrow, language)}</p><h1>{local(title, language)}</h1><span>{local(lead, language)}</span></div>
      </section>

      <div className="source-comparison">
        <SourcePreview fixture={fixture} confirmed={confirmed} language={language} kind="record" />
        <span className={`comparison-symbol symbol-${finding}`} aria-hidden="true">{finding === 'consistent' ? '=' : finding === 'mismatch' ? '≠' : '?'}</span>
        <SourcePreview fixture={fixture} confirmed={confirmed} language={language} kind="image" />
      </div>

      {finding === 'mismatch' && (
        <section className="discrepancy-section">
          <div className="section-heading"><p className="eyebrow"><span />{local(copy.whyFlagged, language)}</p><h2>{result.discrepancies.length} {language === 'hi' ? 'खास अंतर मिले' : 'specific differences found'}</h2></div>
          <div className="discrepancy-table">
            {result.discrepancies.map((item) => (
              <article key={item.field}>
                <span className="discrepancy-field">{item.field === 'registration' ? (language === 'hi' ? 'वाहन नंबर' : 'Registration') : item.field === 'category' ? (language === 'hi' ? 'वाहन प्रकार' : 'Vehicle category') : (language === 'hi' ? 'रंग' : 'Colour')}</span>
                <div><small>{local(copy.recordSource, language)}</small><strong>{item.registeredValue}</strong><a href="#finding-record">{local(copy.source, language)} 01</a></div>
                <span className="mini-not-equal">≠</span>
                <div><small>{local(copy.imageSource, language)}</small><strong>{item.observedValue}</strong><a href="#finding-enforcement">{local(copy.source, language)} 02</a></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {result.limitations.length > 0 && (
        <section className="limitations-panel">
          <div><span aria-hidden="true">?</span><h2>{finding === 'mismatch' ? (language === 'hi' ? 'सबूत की अतिरिक्त सीमाएँ' : 'Additional evidence limits') : (language === 'hi' ? 'क्या साफ़ नहीं है?' : 'What remains unclear?')}</h2></div>
          <ul>{result.limitations.map((code) => <li key={code}>{describeLimitation(code, language)}</li>)}</ul>
        </section>
      )}

      {finding === 'consistent' && (
        <section className="refusal-panel"><span aria-hidden="true">✓</span><div><h2>{language === 'hi' ? 'सबूत के बिना दावा नहीं' : 'No unsupported claim'}</h2><p>{local(copy.consistentRefusal, language)}</p></div></section>
      )}

      <section className="meaning-grid">
        <article><span className="meaning-number">01</span><h3>{local(copy.whatMeans, language)}</h3><p>{finding === 'mismatch'
          ? (language === 'hi' ? `नागरिक द्वारा पक्की जानकारी में ${result.discrepancies.length} खास वाहन अंतर हैं।` : `The citizen-confirmed comparison contains ${result.discrepancies.length} specific vehicle ${result.discrepancies.length === 1 ? 'difference' : 'differences'}.`)
          : finding === 'inconclusive'
            ? (language === 'hi' ? `नतीजा केवल इन ${result.limitations.length} दर्ज सीमाओं के कारण अधूरा है।` : `The finding is inconclusive only because of the ${result.limitations.length} evidence ${result.limitations.length === 1 ? 'limit' : 'limits'} listed above.`)
            : (language === 'hi' ? 'नागरिक द्वारा पक्की वाहन जानकारी में कोई बड़ा अंतर नहीं मिला।' : 'No material difference was found in the citizen-confirmed vehicle facts.')}</p></article>
        <article><span className="meaning-number">02</span><h3>{local(copy.whatNotProve, language)}</h3><p>{local(copy.notLegalDecision, language)} {language === 'hi' ? 'फ़ोटो से चालक की पहचान या चालान की कानूनी स्थिति अपने आप तय नहीं होती।' : 'The supplied image does not by itself establish rider identity or the challan’s legal status.'}</p></article>
      </section>
    </>
  );
}

function buildContestDraft(fixture: DemoFixture, facts: ExtractedFact[], language: Language): string {
  const confirmed = deriveConfirmedVehicleFacts(fixture.confirmedFacts, facts);
  const result = classifyEvidenceComparison(confirmed);
  if (result.finding === 'mismatch') {
    const observations = result.discrepancies.map((item) => {
      const label = item.field === 'registration'
        ? (language === 'hi' ? 'वाहन नंबर' : 'registration')
        : item.field === 'category'
          ? (language === 'hi' ? 'वाहन प्रकार' : 'vehicle category')
          : (language === 'hi' ? 'रंग' : 'colour');
      return `${label}: ${item.registeredValue} ≠ ${item.observedValue}`;
    }).join(language === 'hi' ? '; ' : '; ');
    const limits = result.limitations.map((code) => describeLimitation(code, language)).join(' ');
    return language === 'hi'
      ? `विषय: वाहन के संभावित बेमेल के कारण ई-चालान की समीक्षा का अनुरोध\n\nकृपया चालान ${fixture.challanNumber} की समीक्षा करें। नागरिक द्वारा जाँची गई तुलना में ये खास अंतर हैं: ${observations}।${limits ? ` सबूत की अतिरिक्त सीमा: ${limits}` : ''} यह मसौदा केवल दिए और पक्के किए गए रिकॉर्ड की तुलना करता है; इससे चालान की वैधता या चालक की पहचान तय नहीं होती। कृपया दिए गए सबूत की समीक्षा कर कारण सहित उचित आदेश दर्ज करें।`
      : `Subject: Request to review e-Challan for a possible vehicle mismatch\n\nI request review of e-Challan ${fixture.challanNumber}. The citizen-confirmed comparison contains these specific observations: ${observations}.${limits ? ` Additional evidence limitation: ${limits}` : ''} This draft only compares the supplied and confirmed records; it does not decide the challan's validity or rider identity. I request a reasoned review of the supplied evidence and an appropriate order on the designated portal.`;
  }
  const limitations = result.limitations.map((code) => describeLimitation(code, language)).join(' ');
  return language === 'hi'
    ? `विषय: उपलब्ध फ़ोटो और रिकॉर्ड की समीक्षा का अनुरोध\n\nकृपया चालान ${fixture.challanNumber} की समीक्षा करें। नागरिक द्वारा जाँची गई जानकारी में ये सीमाएँ दर्ज हैं: ${limitations} मैं कोई वाहन बेमेल दावा नहीं कर रहा/रही हूँ। कृपया मूल फ़ोटो और संबंधित रिकॉर्ड की समीक्षा कर कारण सहित निर्णय दें।`
    : `Subject: Request to review the available image and record\n\nI request review of e-Challan ${fixture.challanNumber}. The citizen-confirmed record contains these evidence limitations: ${limitations} I am not asserting a vehicle mismatch. Please review the original image and related record and provide a reasoned decision.`;
}

export default function ChallanSakshiApp() {
  const [language, setLanguage] = useState<Language>('en');
  const [step, setStep] = useState<StepId>('landing');
  const [fixtureId, setFixtureId] = useState<FixtureId>('mismatch');
  const [facts, setFacts] = useState<ExtractedFact[]>(fixtures.mismatch.extractedFacts);
  const [analysisFacts, setAnalysisFacts] = useState<ExtractedFact[]>(fixtures.mismatch.extractedFacts);
  const [confirmed, setConfirmed] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('precomputed');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);
  const [trackingStage, setTrackingStage] = useState(2);
  const [outcome, setOutcome] = useState<OutcomeState>('none');
  const [resolutionIssue, setResolutionIssue] = useState<ResolutionIssueId>('wrong-evidence');
  const [submittedFacts, setSubmittedFacts] = useState<ExtractedFact[] | null>(null);
  const [submittedRevisionId, setSubmittedRevisionId] = useState<string | null>(null);
  const [orderExtractedFacts, setOrderExtractedFacts] = useState<OrderExtractedFact[]>([]);
  const [orderConfirmedFactIds, setOrderConfirmedFactIds] = useState<string[]>([]);
  const [orderCompleteness, setOrderCompleteness] = useState<OrderCompleteness | null>(null);
  const [orderMapReviews, setOrderMapReviews] = useState<Record<string, OrderMapReview>>({});
  const [orderLimitationConfirmed, setOrderLimitationConfirmed] = useState(false);
  const [orderNoteCreated, setOrderNoteCreated] = useState(false);
  const [orderFormError, setOrderFormError] = useState('');
  const [orderCopied, setOrderCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const fixture = fixtures[fixtureId];
  const grievanceNumber = fixture.id === 'mismatch' ? 'DEMO-GRV-A-0827-17' : 'DEMO-GRV-B-0827-09';
  const confirmedVehicleFacts = useMemo(() => deriveConfirmedVehicleFacts(fixture.confirmedFacts, facts), [fixture, facts]);
  const classification = useMemo(() => classifyEvidenceComparison(confirmedVehicleFacts), [confirmedVehicleFacts]);
  const reviewValidation = useMemo(() => validateEvidenceReviewFacts(facts), [facts]);
  const readiness = useMemo(() => {
    const items = fixture.readiness.filter((item) => item.id !== 'clearer-image');
    if (classification.finding === 'inconclusive') {
      items.push({ id: 'clearer-image', label: { en: 'Clearer original enforcement image or clarification', hi: 'साफ़ मूल प्रवर्तन फ़ोटो या स्पष्टीकरण' }, category: 'authority', status: 'missing' });
    }
    return evaluateEvidenceReadiness(items);
  }, [classification.finding, fixture]);
  const contestDraft = useMemo(() => buildContestDraft(fixture, facts, language), [fixture, facts, language]);
  const simulatedSubmitted = submittedFacts !== null && submittedRevisionId !== null;
  const submittedVehicleFacts = useMemo(
    () => deriveConfirmedVehicleFacts(fixture.confirmedFacts, submittedFacts ?? facts),
    [fixture, submittedFacts, facts],
  );
  const submittedClassification = useMemo(() => classifyEvidenceComparison(submittedVehicleFacts), [submittedVehicleFacts]);
  const activeRevisionId = submittedRevisionId ?? (confirmed ? createSubmittedRevisionId(fixtureId, facts) : null);
  const corrections = useMemo(
    () => activeRevisionId ? buildCorrectionRecords(analysisFacts, submittedFacts ?? facts, activeRevisionId) : [],
    [activeRevisionId, analysisFacts, submittedFacts, facts],
  );
  const evidenceIndex = useMemo(() => buildEvidenceIndex({
    challanNumber: fixture.challanNumber,
    registeredPlate: submittedVehicleFacts.registeredPlate,
    observedPlate: submittedVehicleFacts.observedPlate,
    submittedRevisionId,
  }), [fixture.challanNumber, submittedVehicleFacts.registeredPlate, submittedVehicleFacts.observedPlate, submittedRevisionId]);
  const rejectedOrder = useMemo(() => buildSyntheticRejectedOrder({
    finding: submittedClassification.finding,
    grievanceNumber,
    challanNumber: fixture.challanNumber,
    registeredPlate: submittedVehicleFacts.registeredPlate,
  }), [submittedClassification.finding, grievanceNumber, fixture.challanNumber, submittedVehicleFacts.registeredPlate]);
  const orderRows = useMemo(() => buildOrderEvidenceMap({
    classification: submittedClassification,
    confirmedFacts: submittedVehicleFacts,
    evidenceIndex,
  }), [submittedClassification, submittedVehicleFacts, evidenceIndex]);
  const effectiveOrderExtractedFacts = orderExtractedFacts.length === rejectedOrder.extractedFacts.length ? orderExtractedFacts : rejectedOrder.extractedFacts;
  const orderFactValidation = useMemo(
    () => validateOrderFactReview(
      effectiveOrderExtractedFacts,
      orderConfirmedFactIds,
      orderCompleteness,
      {
        'order-id': rejectedOrder.id,
        'grievance-id': rejectedOrder.grievanceNumber,
        'challan-id': rejectedOrder.challanNumber,
        outcome: 'Grievance rejected',
      },
      { earliest: ORDER_ACKNOWLEDGED_DATE, reference: ORDER_REVIEW_REFERENCE_DATE },
    ),
    [effectiveOrderExtractedFacts, orderConfirmedFactIds, orderCompleteness, rejectedOrder],
  );
  const orderMapValidation = useMemo(
    () => validateOrderMapReview(orderRows, orderMapReviews, rejectedOrder.paragraphs.map((paragraph) => paragraph.id)),
    [orderRows, orderMapReviews, rejectedOrder.paragraphs],
  );
  const orderReviewPrerequisitesComplete = orderFactValidation.complete && orderMapValidation.complete && orderLimitationConfirmed;
  const effectiveOrderNoteCreated = orderNoteCreated && orderReviewPrerequisitesComplete;
  const orderWorkflowComplete = outcome === 'rejected' && Boolean(submittedRevisionId) && effectiveOrderNoteCreated;
  const ledgerFinding = simulatedSubmitted ? submittedClassification.finding : classification.finding;
  const packPrepared = simulatedSubmitted || (confirmed && reviewValidation.complete && ledgerFinding !== 'consistent' && readiness.complete);
  const ledgerEvents = useMemo(() => buildCaseLedger({
    fixtureId,
    issueDate: fixture.issueDate,
    analysisMode,
    confirmed: simulatedSubmitted || (confirmed && reviewValidation.complete),
    corrections,
    finding: ledgerFinding,
    packPrepared,
    submitted: simulatedSubmitted,
    submittedRevisionId,
    trackingStage,
    outcome,
    orderFactsConfirmed: orderFactValidation.complete,
    orderMapConfirmed: orderWorkflowComplete,
  }), [fixtureId, fixture.issueDate, analysisMode, confirmed, reviewValidation.complete, corrections, ledgerFinding, packPrepared, simulatedSubmitted, submittedRevisionId, trackingStage, outcome, orderFactValidation.complete, orderWorkflowComplete]);
  const ledgerSnapshot = useMemo(() => deriveCaseLedgerSnapshot(ledgerEvents, submittedRevisionId), [ledgerEvents, submittedRevisionId]);
  const latestLedgerDate = ledgerEvents.reduce((latest, event) => event.recordedOn > latest ? event.recordedOn : latest, DEMO_REFERENCE_DATE);
  const extractedOrderDate = effectiveOrderExtractedFacts.find((fact) => fact.id === 'order-date')?.value;
  const reviewedOrderDate = extractedOrderDate && !orderFactValidation.invalidFactIds.includes('order-date') ? extractedOrderDate : rejectedOrder.orderDate;
  const postRejectionClock = useMemo(() => calculatePostRejectionWindow(reviewedOrderDate, ORDER_REVIEW_REFERENCE_DATE), [reviewedOrderDate]);
  const orderReviewNote = useMemo(() => submittedRevisionId && orderCompleteness && orderRows.every((row) => orderMapReviews[row.id]) ? buildOrderReviewNote({
    language,
    generatedOn: ORDER_REVIEW_REFERENCE_DATE,
    order: rejectedOrder,
    extractedFacts: effectiveOrderExtractedFacts,
    completeness: orderCompleteness,
    rows: orderRows,
    reviews: orderMapReviews,
    evidenceIndex,
    submittedRevisionId,
  }) : '', [language, submittedRevisionId, orderCompleteness, rejectedOrder, effectiveOrderExtractedFacts, orderRows, orderMapReviews, evidenceIndex]);
  const clarificationDraft = useMemo(() => orderCompleteness ? buildClarificationDraft({
    language,
    challanNumber: fixture.challanNumber,
    grievanceNumber,
    completeness: orderCompleteness,
    rows: orderRows,
    reviews: orderMapReviews,
  }) : null, [language, orderCompleteness, fixture.challanNumber, grievanceNumber, orderRows, orderMapReviews]);
  const renderStep = guardEvidenceNavigation(step, classification.finding, confirmed && reviewValidation.complete, simulatedSubmitted, outcome, orderFactValidation.complete);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const saved = JSON.parse(stored) as Partial<PersistedDemoStateV4>;
          if (saved.version !== 4) throw new Error('Unsupported persisted state');
          if (saved.language === 'en' || saved.language === 'hi') setLanguage(saved.language);
          if (saved.fixtureId && fixtures[saved.fixtureId]) {
            setFixtureId(saved.fixtureId);
            const restoredFacts = isStoredFactList(saved.facts) ? saved.facts : fixtures[saved.fixtureId].extractedFacts;
            setFacts(restoredFacts);
            setAnalysisFacts(isStoredFactList(saved.analysisFacts) ? saved.analysisFacts : fixtures[saved.fixtureId].extractedFacts);
          }
          if (saved.step && steps.includes(saved.step)) setStep(saved.step);
          setConfirmed(Boolean(saved.confirmed));
          if (saved.analysisMode) setAnalysisMode(saved.analysisMode);
          if (typeof saved.trackingStage === 'number') setTrackingStage(saved.trackingStage);
          if (saved.outcome) setOutcome(saved.outcome);
          if (saved.resolutionIssue && resolutionIssues.some((item) => item.id === saved.resolutionIssue)) setResolutionIssue(saved.resolutionIssue);
          const storedSubmissionIsValid = Boolean(saved.fixtureId && fixtures[saved.fixtureId]
            && isStoredFactList(saved.submittedFacts)
            && typeof saved.submittedRevisionId === 'string'
            && createSubmittedRevisionId(saved.fixtureId, saved.submittedFacts) === saved.submittedRevisionId);
          if (storedSubmissionIsValid && saved.submittedFacts && typeof saved.submittedRevisionId === 'string') {
            setSubmittedFacts(saved.submittedFacts);
            setSubmittedRevisionId(saved.submittedRevisionId);
          }
          if (storedSubmissionIsValid) {
            if (isStoredOrderFactList(saved.orderExtractedFacts)) setOrderExtractedFacts(saved.orderExtractedFacts);
            if (Array.isArray(saved.orderConfirmedFactIds)) setOrderConfirmedFactIds(saved.orderConfirmedFactIds.filter((id): id is string => typeof id === 'string'));
            if (saved.orderCompleteness === 'yes' || saved.orderCompleteness === 'no' || saved.orderCompleteness === 'not-sure') setOrderCompleteness(saved.orderCompleteness);
            if (isStoredOrderReviews(saved.orderMapReviews)) setOrderMapReviews(saved.orderMapReviews);
            setOrderLimitationConfirmed(Boolean(saved.orderLimitationConfirmed));
            setOrderNoteCreated(Boolean(saved.orderNoteCreated));
          } else if (saved.step === 'tracking' || saved.step === 'order-review' || saved.step === 'order-map') {
            setStep('pack');
            setOutcome('none');
          }
        }
        const location = parseAppHash(window.location.hash);
        if (location) {
          setStep(location.step);
          if (location.issueId) setResolutionIssue(location.issueId);
        } else {
          setStep('landing');
          window.history.replaceState({ step: 'landing' }, '', '#landing');
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        OLD_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const location = parseAppHash(window.location.hash);
      if (!location) return;
      setStep(location.step);
      if (location.issueId) setResolutionIssue(location.issueId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const persisted: PersistedDemoStateV4 = {
      version: 4,
      language,
      step: renderStep,
      fixtureId,
      facts,
      analysisFacts,
      confirmed,
      analysisMode,
      trackingStage,
      outcome,
      resolutionIssue,
      submittedFacts,
      submittedRevisionId,
      orderExtractedFacts,
      orderConfirmedFactIds,
      orderCompleteness,
      orderMapReviews,
      orderLimitationConfirmed,
      orderNoteCreated,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en';
  }, [language, renderStep, fixtureId, facts, analysisFacts, confirmed, analysisMode, trackingStage, outcome, resolutionIssue, submittedFacts, submittedRevisionId, orderExtractedFacts, orderConfirmedFactIds, orderCompleteness, orderMapReviews, orderLimitationConfirmed, orderNoteCreated, hydrated]);

  useEffect(() => {
    if (!hydrated || renderStep === step) return;
    window.history.replaceState({ step: renderStep, issueId: resolutionIssue }, '', hashForStep(renderStep, resolutionIssue));
  }, [hydrated, renderStep, step, resolutionIssue]);

  useEffect(() => {
    if (!hydrated) return;
    const focusTimer = window.setTimeout(() => document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(focusTimer);
  }, [hydrated, renderStep, resolutionIssue]);

  const go = (next: StepId, nextIssueId?: ResolutionIssueId) => {
    setFormError('');
    setCopied(false);
    if (nextIssueId) setResolutionIssue(nextIssueId);
    setStep(next);
    const issueForHistory = nextIssueId ?? resolutionIssue;
    window.history.pushState({ step: next, issueId: issueForHistory }, '', hashForStep(next, issueForHistory));
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const clearOrderWorkflow = () => {
    setOrderExtractedFacts([]);
    setOrderConfirmedFactIds([]);
    setOrderCompleteness(null);
    setOrderMapReviews({});
    setOrderLimitationConfirmed(false);
    setOrderNoteCreated(false);
    setOrderFormError('');
    setOrderCopied(false);
  };

  const invalidateAfterEvidenceChange = () => {
    setConfirmed(false);
    setSubmittedFacts(null);
    setSubmittedRevisionId(null);
    setTrackingStage(2);
    setOutcome('none');
    clearOrderWorkflow();
  };

  const chooseFixture = (nextId: FixtureId) => {
    setFixtureId(nextId);
    setFacts(fixtures[nextId].extractedFacts);
    setAnalysisFacts(fixtures[nextId].extractedFacts);
    invalidateAfterEvidenceChange();
    setAnalysisMode('precomputed');
    setAnalysisMessage('');
  };

  const resetDemo = () => {
    const message = language === 'hi' ? 'क्या यह डेमो फिर से शुरू करना है? आपके बदलाव हट जाएँगे।' : 'Start this demo over? Your edits and progress will be cleared.';
    if (!window.confirm(message)) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setFixtureId('mismatch');
    setFacts(fixtures.mismatch.extractedFacts);
    setAnalysisFacts(fixtures.mismatch.extractedFacts);
    invalidateAfterEvidenceChange();
    setAnalysisMode('precomputed');
    setAnalysisMessage('');
    setResolutionIssue('wrong-evidence');
    go('landing');
  };

  const runInitialAnalysis = () => {
    setAnalysisBusy(true);
    setFacts(fixtures[fixtureId].extractedFacts);
    setAnalysisFacts(fixtures[fixtureId].extractedFacts);
    invalidateAfterEvidenceChange();
    window.setTimeout(() => { setAnalysisBusy(false); setAnalysisMode('precomputed'); go('review'); }, 650);
  };

  const rerunLiveAnalysis = async () => {
    setAnalysisBusy(true);
    setAnalysisMessage('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId }),
      });
      const data = await response.json() as { analysis?: { facts?: Array<{ field?: string; value?: string; confidence?: string; visibility?: string; uncertainty?: string; evidence_reference?: string }> }; error?: string; fallback?: boolean };
      if (!response.ok || !data.analysis?.facts) throw new Error(data.error || 'Live analysis unavailable');
      const idByField: Record<string, string> = {
        observed_registration: 'observed-registration', observed_category: 'observed-category', observed_colour: 'observed-colour', offence_assessable: 'offence-visible',
      };
      const nextFacts = facts.map((item) => {
        const incoming = data.analysis?.facts?.find((candidate) => idByField[candidate.field || ''] === item.id);
        if (!incoming?.value) return item;
        const visibility = ['clear', 'partial', 'unclear', 'not-visible'].includes(incoming.visibility || '') ? incoming.visibility as ExtractedFact['visibility'] : item.visibility;
        const confidence = ['high', 'medium', 'low'].includes(incoming.confidence || '') ? incoming.confidence as ExtractedFact['confidence'] : item.confidence;
        return { ...item, value: incoming.value, visibility, confidence, evidenceRef: incoming.evidence_reference || item.evidenceRef };
      });
      setFacts(nextFacts);
      setAnalysisFacts(nextFacts.map((item) => ({ ...item })));
      invalidateAfterEvidenceChange();
      setAnalysisMode('live');
      setAnalysisMessage(language === 'hi' ? 'लाइव विश्लेषण पूरा हुआ। इस्तेमाल से पहले हर जानकारी फिर जाँचें।' : 'Live analysis completed. Review every observation again before using it.');
    } catch {
      setAnalysisMode('fallback');
      setAnalysisMessage(language === 'hi' ? 'लाइव विश्लेषण उपलब्ध नहीं था। भरोसेमंद डेमो विश्लेषण इस्तेमाल हो रहा है।' : 'Live analysis was unavailable. The reliable precomputed demo analysis remains active.');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const updateFact = (id: string, patch: Partial<ExtractedFact>) => {
    setFacts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    invalidateAfterEvidenceChange();
  };

  const continueFromReview = () => {
    if (!reviewValidation.complete) {
      setFormError(language === 'hi' ? 'खाली तुलना फ़ील्ड भरें, या फ़ोटो की स्पष्टता “साफ़ नहीं” या “दिखाई नहीं देता” चुनें।' : 'Complete blank comparison fields, or mark an unavailable image observation as unclear or not visible.');
      document.getElementById(`fact-${reviewValidation.invalidIds[0]}`)?.focus();
      return;
    }
    if (!confirmed) {
      setFormError(local(copy.confirmationNeeded, language));
      document.getElementById('fact-confirmation')?.focus();
      return;
    }
    go('finding');
  };

  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(contestDraft); setCopied(true); }
    catch { setAnalysisMessage(language === 'hi' ? 'कॉपी नहीं हो सका। टेक्स्ट चुनकर कॉपी करें।' : 'Could not copy automatically. Select the draft and copy it manually.'); }
  };

  const openResolutionRoute = (issueId: ResolutionIssueId) => {
    go('route', issueId);
  };

  const startResolutionEvidence = (issueId: 'wrong-evidence' | 'unclear-evidence') => {
    setResolutionIssue(issueId);
    chooseFixture(issueId === 'unclear-evidence' ? 'inconclusive' : 'mismatch');
    go('intake');
  };

  const downloadBlob = (contents: string, mimeType: string, filename: string) => {
    const blob = new Blob([contents], { type: mimeType });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  };

  const submitDemo = () => {
    if (!confirmed || !reviewValidation.complete || classification.finding === 'consistent') return;
    const frozenFacts = facts.map((fact) => ({ ...fact, label: { ...fact.label }, uncertainty: fact.uncertainty ? { ...fact.uncertainty } : undefined }));
    const revisionId = createSubmittedRevisionId(fixtureId, frozenFacts);
    setSubmittedFacts(frozenFacts);
    setSubmittedRevisionId(revisionId);
    setTrackingStage(2);
    setOutcome('none');
    clearOrderWorkflow();
    go('tracking');
  };

  const selectOutcome = (next: Exclude<OutcomeState, 'none'>) => {
    setOutcome(next);
    setTrackingStage(4);
    setOrderFormError('');
    setOrderCopied(false);
    if (next === 'rejected') {
      setOrderExtractedFacts(rejectedOrder.extractedFacts.map((fact) => ({ ...fact, label: { ...fact.label }, sourceParagraphs: [...fact.sourceParagraphs] })));
      setOrderConfirmedFactIds([]);
      setOrderCompleteness(null);
      setOrderMapReviews(createInitialOrderMapReviews(orderRows));
      setOrderLimitationConfirmed(false);
      setOrderNoteCreated(false);
    } else {
      clearOrderWorkflow();
    }
  };

  const updateOrderFact = (id: string, value: string) => {
    setOrderExtractedFacts((current) => {
      const source = current.length === rejectedOrder.extractedFacts.length ? current : rejectedOrder.extractedFacts;
      return source.map((fact) => fact.id === id ? { ...fact, value } : { ...fact });
    });
    setOrderConfirmedFactIds((current) => current.filter((factId) => factId !== id));
    setOrderNoteCreated(false);
    setOrderFormError('');
  };

  const confirmOrderFact = (id: string, checked: boolean) => {
    setOrderConfirmedFactIds((current) => checked ? [...new Set([...current, id])] : current.filter((factId) => factId !== id));
    setOrderNoteCreated(false);
    setOrderFormError('');
  };

  const continueFromOrderReview = () => {
    if (!orderFactValidation.complete) {
      const error = language === 'hi'
        ? 'आगे बढ़ने से पहले आदेश की हर जानकारी जाँचें और पन्नों की पूर्णता का जवाब दें।'
        : 'Review every order fact and answer the document-completeness question before continuing.';
      setOrderFormError(error);
      const firstId = orderFactValidation.emptyFactIds[0] ?? orderFactValidation.invalidFactIds[0] ?? orderFactValidation.missingFactIds[0];
      if (firstId) document.getElementById(`order-fact-${firstId}`)?.focus();
      return;
    }
    const storedRowIds = Object.keys(orderMapReviews);
    if (storedRowIds.length !== orderRows.length || !orderRows.every((row) => orderMapReviews[row.id])) setOrderMapReviews(createInitialOrderMapReviews(orderRows));
    setOrderFormError('');
    go('order-map');
  };

  const updateOrderMapReview = (rowId: string, patch: Partial<OrderMapReview>) => {
    setOrderMapReviews((current) => ({ ...current, [rowId]: { ...current[rowId], ...patch } }));
    setOrderNoteCreated(false);
    setOrderFormError('');
  };

  const createOrderNote = () => {
    if (!orderMapValidation.complete || !orderLimitationConfirmed) {
      setOrderFormError(language === 'hi' ? 'नोट बनाने से पहले सभी मिलान और दायरे की सीमा जाँचें।' : 'Review every mapping and confirm the scope limitation before creating the note.');
      const firstRow = orderMapValidation.unconfirmedRowIds[0] ?? orderMapValidation.invalidReferenceRowIds[0];
      if (firstRow) document.getElementById(`mapping-card-${firstRow}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setOrderNoteCreated(true);
    setOrderFormError('');
    window.setTimeout(() => {
      const note = document.getElementById('order-review-note');
      note?.focus({ preventScroll: true });
      note?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }, 0);
  };

  const copyClarification = async () => {
    if (!clarificationDraft) return;
    try {
      await navigator.clipboard.writeText(clarificationDraft);
      setOrderCopied(true);
    } catch {
      setOrderFormError(language === 'hi' ? 'कॉपी नहीं हो सका। टेक्स्ट चुनकर कॉपी करें।' : 'Could not copy automatically. Select the text and copy it manually.');
    }
  };

  const downloadOrderReview = () => {
    if (!orderWorkflowComplete || !submittedRevisionId || !orderCompleteness) return;
    const artifact = buildOrderReviewArtifact({
      generatedOn: ORDER_REVIEW_REFERENCE_DATE,
      order: rejectedOrder,
      extractedFacts: effectiveOrderExtractedFacts,
      completeness: orderCompleteness,
      rows: orderRows,
      reviews: orderMapReviews,
      evidenceIndex,
      submittedRevisionId,
    });
    downloadBlob(JSON.stringify(artifact, null, 2), 'application/json', `challansakshi-${rejectedOrder.id}-order-review.json`);
  };

  const downloadPostDecisionCalendar = () => {
    if (!orderWorkflowComplete) return;
    const calendar = buildPostDecisionCalendar({
      orderDate: postRejectionClock.orderDate,
      indicativeBoundary: postRejectionClock.indicativeBoundary,
      orderId: rejectedOrder.id,
      generatedOn: ORDER_REVIEW_REFERENCE_DATE,
    });
    downloadBlob(calendar, 'text/calendar;charset=utf-8', `challansakshi-${rejectedOrder.id}-indicative-reminder.ics`);
  };

  const downloadCaseManifest = () => {
    const contestClock = calculateContestWindow(fixture.issueDate, latestLedgerDate);
    const authorityClock = simulatedSubmitted ? calculateAuthorityWindow(ORDER_ACKNOWLEDGED_DATE, latestLedgerDate) : null;
    const completedOrderReview = orderWorkflowComplete && submittedRevisionId && orderCompleteness
      ? buildOrderReviewArtifact({
        generatedOn: ORDER_REVIEW_REFERENCE_DATE,
        order: rejectedOrder,
        extractedFacts: effectiveOrderExtractedFacts,
        completeness: orderCompleteness,
        rows: orderRows,
        reviews: orderMapReviews,
        evidenceIndex,
        submittedRevisionId,
      })
      : null;
    const manifest = {
      schema: 'challansakshi.case-manifest.v2',
      generatedOn: latestLedgerDate,
      syntheticOnly: true,
      case: {
        fixtureId,
        challanNumber: fixture.challanNumber,
        issueDate: fixture.issueDate,
        allegedOffence: fixture.offence.en,
        amount: fixture.amount,
        authority: fixture.authority.en,
      },
      citizenReview: {
        confirmed,
        meaning: 'Citizen confirmed these source readings as reviewed; this is not official verification.',
        analysisSnapshot: analysisFacts.map((item) => ({ id: item.id, value: item.value, source: item.source, evidenceReference: item.evidenceRef, confidence: item.confidence, visibility: item.visibility })),
        activeFacts: (submittedFacts ?? facts).map((item) => ({ id: item.id, value: item.value, source: item.source, evidenceReference: item.evidenceRef, confidence: item.confidence, visibility: item.visibility })),
        corrections,
      },
      deterministicAssessment: {
        finding: submittedClassification.finding,
        discrepancies: submittedClassification.discrepancies,
        limitations: submittedClassification.limitations,
        readiness: { requiredPresent: readiness.requiredPresent, requiredTotal: readiness.requiredTotal, complete: readiness.complete },
      },
      evidenceIndex,
      submission: simulatedSubmitted ? {
        grievanceNumber,
        acknowledgedOn: ORDER_ACKNOWLEDGED_DATE,
        revisionId: submittedRevisionId,
        frozenLocalDemoSnapshot: true,
      } : null,
      ledger: { ...ledgerSnapshot, events: ledgerEvents },
      activeOutcomeScenario: outcome,
      orderReview: completedOrderReview ?? (outcome === 'rejected' ? {
        status: 'citizen-review-incomplete',
        sourceOrder: rejectedOrder,
        extractedFacts: effectiveOrderExtractedFacts,
        completeness: orderCompleteness,
      } : null),
      clocks: {
        convention: 'Issue date is Day 0; D+45 is shown as an indicative boundary. Verify current official cutoffs and state route.',
        contest: contestClock,
        authorityResponse: authorityClock,
        postDecision: orderWorkflowComplete ? postRejectionClock : null,
      },
      generatedArtifact: {
        kind: submittedClassification.finding === 'mismatch' ? 'vehicle-review-request' : submittedClassification.finding === 'inconclusive' ? 'evidence-clarification-request' : 'none',
        draft: submittedClassification.finding === 'consistent' ? null : contestDraft,
        orderReviewNote: orderWorkflowComplete ? orderReviewNote : null,
        clarificationDraft: orderWorkflowComplete ? clarificationDraft : null,
      },
      ruleset: { version: 'challansakshi.rules.2026-08', jurisdiction: 'India demo; official and state-specific routes must be verified' },
      sources: [
        { name: 'MoRTH parliamentary answer cited by the prototype', url: 'https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars', lastChecked: '2026-08-27' },
        { name: 'e-Challan official service', url: 'https://echallan.parivahan.gov.in/', lastChecked: '2026-08-27' },
      ],
      boundaries: [
        'Not a legal decision or legal advice.',
        'No real government, court, bank, or vehicle system was contacted.',
        'The designated authority makes the final decision.',
        'Order mapping describes textual coverage only, not legal adequacy.',
      ],
    };
    downloadBlob(JSON.stringify(manifest, null, 2), 'application/json', `challansakshi-${fixture.challanNumber}-manifest.json`);
  };

  return (
    <div className="app-root">
      <AppHeader language={language} setLanguage={setLanguage} step={renderStep} onReset={resetDemo} onHome={() => go('landing')} onDesk={() => go('desk')} />
      <Progress step={renderStep} language={language} />

      {renderStep === 'landing' && <Landing language={language} onStart={() => startResolutionEvidence('wrong-evidence')} onOpenDesk={() => go('desk')} onOpenRoute={openResolutionRoute} />}

      {renderStep === 'desk' && <><ResolutionDesk language={language} onBack={() => go('landing')} onOpenRoute={openResolutionRoute} onStartEvidence={startResolutionEvidence} /><Footer language={language} /></>}

      {renderStep === 'route' && <><ResolutionRouteView language={language} issueId={resolutionIssue} onBack={() => go(orderWorkflowComplete && resolutionIssue === 'grievance-rejected' ? 'order-map' : 'desk')} onStartEvidence={startResolutionEvidence} postRejectionContext={orderWorkflowComplete && resolutionIssue === 'grievance-rejected' ? { orderDate: postRejectionClock.orderDate, referenceDate: postRejectionClock.referenceDate } : undefined} /><Footer language={language} /></>}

      {renderStep === 'intake' && (
        <>
          <Screen>
            <BackButton onClick={() => go('landing')} language={language} />
            <div className="screen-heading"><p className="eyebrow"><span />{local(copy.chooseCase, language)}</p><h1>{local(copy.evidenceIntake, language)}</h1><p>{local(copy.evidenceIntro, language)} {local(copy.changeAnytime, language)}</p></div>
            <FixturePicker fixtureId={fixtureId} language={language} onSelect={chooseFixture} />
            <div className="privacy-warning" role="note"><span aria-hidden="true">!</span><div><strong>{language === 'hi' ? 'असली दस्तावेज़ अपलोड न करें' : 'Keep real documents out of this prototype'}</strong><p>{local(copy.uploadWarning, language)}</p></div></div>
            <div className="analysis-row"><StatusPill mode={analysisMode} language={language} /><span>{language === 'hi' ? 'AI गलती कर सकता है। अगला चरण हर जानकारी की जाँच करवाता है।' : 'AI can misread evidence. The next step requires human verification.'}</span></div>
            <div className="evidence-grid">
              {fixture.evidenceCards.map((card) => <EvidenceCard key={card.id} card={card} fixture={fixture} language={language} />)}
            </div>
            <div className="sticky-action"><div><strong>{language === 'hi' ? '3 में से 3 काल्पनिक रिकॉर्ड तैयार' : '3 of 3 fictional records ready'}</strong><span>{language === 'hi' ? 'यह प्रोटोटाइप असली फ़ाइल अपलोड स्वीकार नहीं करता।' : 'This prototype does not accept real file uploads.'}</span></div><Button type="button" onClick={runInitialAnalysis} disabled={analysisBusy}>{analysisBusy ? local(copy.analysing, language) : local(copy.analyse, language)} <span aria-hidden="true">→</span></Button></div>
          </Screen>
          <Footer language={language} />
        </>
      )}

      {renderStep === 'review' && (
        <>
          <Screen>
            <BackButton onClick={() => go('intake')} language={language} />
            <div className="review-heading-row"><div className="screen-heading"><p className="eyebrow"><span />{local(copy.reviewFacts, language)}</p><h1>{local(copy.reviewFacts, language)}</h1><p>{local(copy.reviewLead, language)}</p></div><div className="analysis-controls"><StatusPill mode={analysisMode} language={language} /><Button variant="secondary" type="button" onClick={rerunLiveAnalysis} disabled={analysisBusy}>{analysisBusy ? local(copy.rerunning, language) : local(copy.rerun, language)}</Button></div></div>
            {analysisMessage && <p className={`analysis-message ${analysisMode === 'fallback' ? 'warning' : ''}`} role="status">{analysisMessage}</p>}
            <div className="review-layout">
              <aside className="review-source-sticky"><EvidencePhoto fixture={fixture} label={local(copy.imageSource, language)} /><div><span className="synthetic-chip">{local(copy.synthetic, language)}</span><p>{local(fixture.imageNote, language)}</p></div></aside>
              <div className="fact-groups">
                {(['challan', 'enforcement', 'vehicle-record'] as ExtractedFact['source'][]).map((source) => (
                  <section className="fact-group" key={source}>
                    <div className="fact-group-heading"><span>{source === 'challan' ? '01' : source === 'enforcement' ? '02' : '03'}</span><div><h2>{local(sourceNames[source], language)}</h2><small>{facts.some((item) => item.source === source && isReviewFactEditable(item.id)) ? (language === 'hi' ? 'तुलना वाली जानकारी सुधार सकते हैं' : 'Comparison fields can be corrected') : (language === 'hi' ? 'काल्पनिक स्रोत पहचान · केवल पढ़ने के लिए' : 'Fictional source metadata · read only')}</small></div></div>
                    {facts.filter((item) => item.source === source).map((item) => {
                      const editable = isReviewFactEditable(item.id);
                      return (
                        <div className={`fact-row ${editable ? '' : 'fact-row-readonly'}`} key={item.id}>
                          <label htmlFor={`fact-${item.id}`}>{local(item.label, language)}{!editable && <small>{language === 'hi' ? 'स्रोत रिकॉर्ड' : 'source record'}</small>}</label>
                          <input id={`fact-${item.id}`} value={item.value} maxLength={180} readOnly={!editable} onChange={editable ? (event) => updateFact(item.id, { value: event.target.value }) : undefined} />
                          <div className="fact-meta"><span><b>{local(copy.source, language)}:</b> {item.evidenceRef}</span>{item.source === 'enforcement' && <label>{local(copy.confidence, language)}<select value={item.visibility} onChange={(event) => updateFact(item.id, { visibility: event.target.value as ExtractedFact['visibility'] })}><option value="clear">{local(copy.clear, language)}</option><option value="partial">{local(copy.partial, language)}</option><option value="unclear">{local(copy.unclear, language)}</option><option value="not-visible">{local(copy.notVisible, language)}</option></select></label>}</div>
                          {item.uncertainty && <p className="fact-note"><span aria-hidden="true">i</span>{local(item.uncertainty, language)}</p>}
                        </div>
                      );
                    })}
                  </section>
                ))}
              </div>
            </div>
            <div className={`confirmation-box ${formError ? 'has-error' : ''}`}><label><input id="fact-confirmation" type="checkbox" checked={confirmed} onChange={(event) => { if (!event.target.checked) invalidateAfterEvidenceChange(); else setConfirmed(true); setFormError(''); }} /><span><b aria-hidden="true">✓</b></span><strong>{local(copy.confirmFacts, language)}</strong></label>{formError && <p role="alert">{formError}</p>}</div>
            <div className="page-actions"><Button variant="secondary" type="button" onClick={() => go('intake')}>{local(copy.back, language)}</Button><Button type="button" onClick={continueFromReview}>{local(copy.seeFinding, language)} <span aria-hidden="true">→</span></Button></div>
          </Screen>
          <Footer language={language} />
        </>
      )}

      {renderStep === 'finding' && (
        <>
          <Screen className="finding-screen">
            <BackButton onClick={() => go('review')} language={language} />
            <FindingPanel finding={classification.finding} fixture={fixture} facts={facts} language={language} />
            <div className="finding-bottom-grid"><ContestClock fixture={fixture} language={language} /><div className="authority-note"><span aria-hidden="true">§</span><div><h3>{language === 'hi' ? 'राज्य का तरीका अलग हो सकता है' : 'The state route may vary'}</h3><p>{language === 'hi' ? 'राज्य सरकार आपत्ति जमा करने का तरीका और संबंधित प्राधिकरण तय करती है। मौजूदा तरीका आधिकारिक पोर्टल पर जाँचें।' : 'The State Government specifies how a contest is submitted and which authority handles it. Verify the current route before acting.'}</p><a href="https://echallan.parivahan.gov.in/" target="_blank" rel="noreferrer">{local(copy.officialPortal, language)} <span aria-hidden="true">↗</span></a></div></div></div>
            <div className="page-actions finding-actions"><Button variant="secondary" type="button" onClick={() => go('review')}>{local(copy.editFacts, language)}</Button>{classification.finding === 'consistent' ? <><Button variant="secondary" type="button" onClick={() => go('intake')}>{local(copy.anotherDemo, language)}</Button><a className="button button-primary" href="https://echallan.parivahan.gov.in/" target="_blank" rel="noreferrer">{local(copy.officialPortal, language)} ↗</a></> : <Button type="button" onClick={() => go('readiness')}>{local(copy.evidenceReadiness, language)} <span aria-hidden="true">→</span></Button>}</div>
          </Screen>
          <Footer language={language} />
        </>
      )}

      {renderStep === 'readiness' && classification.finding !== 'consistent' && (
        <>
          <Screen>
            <BackButton onClick={() => go('finding')} language={language} />
            <div className="screen-heading readiness-title"><p className="eyebrow"><span />{local(copy.evidenceReadiness, language)}</p><h1>{readiness.complete ? (language === 'hi' ? 'आपके ज़रूरी सबूत तैयार हैं' : 'Your core evidence is ready') : (language === 'hi' ? 'कुछ सबूत अभी साफ़ नहीं हैं' : 'Some evidence is still unclear')}</h1><p>{local(copy.readinessLead, language)}</p></div>
            <div className="readiness-meter"><div><strong>{readiness.requiredPresent} / {readiness.requiredTotal}</strong><span>{language === 'hi' ? 'ज़रूरी चीज़ें मौजूद' : 'required items present'}</span></div><div className="readiness-bar"><span style={{ width: `${(readiness.requiredPresent / readiness.requiredTotal) * 100}%` }} /></div><b className={readiness.complete ? 'complete' : 'incomplete'}>{readiness.complete ? (language === 'hi' ? 'मूल पैक तैयार' : 'Core pack ready') : (language === 'hi' ? 'स्पष्टीकरण ज़रूरी' : 'Clarification needed')}</b></div>
            <div className="readiness-columns">
              {(['citizen', 'authority', 'optional'] as const).map((category) => (
                <section key={category}>
                  <div className="readiness-column-head"><span>{category === 'citizen' ? 'C' : category === 'authority' ? 'A' : '+'}</span><div><h2>{category === 'citizen' ? local(copy.citizenCanSupply, language) : category === 'authority' ? local(copy.authorityHas, language) : local(copy.optional, language)}</h2><small>{category === 'optional' ? (language === 'hi' ? 'मददगार, पर ज़रूरी नहीं' : 'Helpful, not required') : (language === 'hi' ? 'पैक में जाँचा गया' : 'Checked for the pack')}</small></div></div>
                  <ul>{readiness.items.filter((item) => item.category === category).map((item) => <li key={item.id} className={`item-${item.status}`}><span aria-hidden="true">{item.status === 'present' ? '✓' : item.status === 'missing' ? '!' : '+'}</span><strong>{local(item.label, language)}</strong><small>{item.status === 'present' ? local(copy.present, language) : item.status === 'missing' ? local(copy.missing, language) : local(copy.optionalStatus, language)}</small></li>)}</ul>
                </section>
              ))}
            </div>
            <div className="no-invention-note"><span aria-hidden="true">i</span><div><strong>{language === 'hi' ? 'सबूत की सीमा साफ़ रहेगी' : 'Evidence limits stay visible'}</strong><p>{local(copy.noInvent, language)} {classification.finding === 'inconclusive' && (language === 'hi' ? 'पैक वाहन बेमेल का दावा नहीं करेगा।' : 'The pack will not claim a vehicle mismatch.')}</p></div></div>
            <div className="page-actions"><Button variant="secondary" type="button" onClick={() => go('finding')}>{local(copy.back, language)}</Button><Button type="button" onClick={() => go('pack')}>{classification.finding === 'inconclusive' ? local(copy.prepareClarification, language) : local(copy.preparePack, language)} <span aria-hidden="true">→</span></Button></div>
          </Screen>
          <Footer language={language} />
        </>
      )}

      {renderStep === 'pack' && classification.finding !== 'consistent' && (
        <>
          <Screen className="pack-screen">
            <BackButton onClick={() => go('readiness')} language={language} />
            <div className="screen-heading"><p className="eyebrow"><span />{local(copy.contestPack, language)}</p><h1>{local(copy.contestPack, language)}</h1><p>{local(copy.packLead, language)}</p></div>
            <div className="simulation-banner"><span aria-hidden="true">!</span><strong>{local(copy.simulatedOnly, language)}</strong></div>
            <article className="print-pack" id="contest-pack">
              <header><div className="pack-brand"><ShieldMark /><div><strong>ChallanSakshi</strong><span>चालान साक्षी · {local(copy.evidenceBefore, language)}</span></div></div><div className="pack-meta"><span>SYNTHETIC DEMO DATA</span><b>{language === 'hi' ? 'बनाया गया: 27 अगस्त 2026' : 'Generated: 27 Aug 2026'}</b></div></header>
              <section className="pack-summary"><div><small>{local(copy.caseSummary, language)}</small><h2>{classification.finding === 'mismatch' ? local(copy.possibleMismatch, language) : local(copy.inconclusive, language)}</h2><p>{fixture.challanNumber} · {fixture.amount} · {local(fixture.offence, language)}</p></div><div className="pack-clock"><b>{calculateContestWindow(fixture.issueDate, DEMO_REFERENCE_DATE).daysRemaining}</b><span>{local(copy.daysLeft, language)}</span></div></section>
              <section className="pack-section"><h3>01 · {language === 'hi' ? 'आपत्ति का मसौदा' : 'Contest draft'}</h3><pre>{contestDraft}</pre></section>
              <section className="pack-section"><h3>02 · {local(copy.discrepancies, language)}</h3>{classification.finding === 'mismatch' ? <><ol>{classification.discrepancies.map((item) => <li key={item.field}><b>{item.field}</b><span>{item.registeredValue} ≠ {item.observedValue}</span></li>)}</ol>{classification.limitations.length > 0 && <p>{classification.limitations.map((code) => describeLimitation(code, language)).join(' ')}</p>}</> : <p>{classification.limitations.map((code) => describeLimitation(code, language)).join(' ')} {language === 'hi' ? 'वाहन बेमेल का दावा नहीं किया गया।' : 'No vehicle mismatch is asserted.'}</p>}</section>
              <section className="pack-section"><h3>03 · {local(copy.evidenceIndex, language)}</h3><ol className="evidence-index">{evidenceIndex.map((item) => <li key={item.id}><b>{item.id}</b><span>{local(item.label, language)}</span><small>{item.summary}</small></li>)}</ol></section>
              <section className="pack-two-col"><div><h3>04 · {local(copy.declaration, language)}</h3><p>{language === 'hi' ? 'मैं पुष्टि करता/करती हूँ कि ऊपर की जानकारी मेरी समीक्षा के अनुसार सही है।' : 'I confirm that the information above is accurate to the best of my review.'}</p><span className="signature-line">{language === 'hi' ? 'नाम / हस्ताक्षर / तारीख' : 'Name / signature / date'}</span></div><div><h3>05 · {local(copy.requestedAction, language)}</h3><p>{language === 'hi' ? 'दिए गए सबूत की कारण सहित समीक्षा और उचित आदेश।' : 'A reasoned review of the supplied evidence and an appropriate order.'}</p></div></section>
              <footer>{local(copy.disclaimer, language)} {local(copy.currentStateRoute, language)}</footer>
            </article>
            <div className="pack-tools"><Button variant="secondary" type="button" onClick={copyDraft}>{copied ? local(copy.copied, language) : local(copy.copyText, language)} <span aria-hidden="true">{copied ? '✓' : '⧉'}</span></Button><Button variant="secondary" type="button" onClick={downloadCaseManifest}>{language === 'hi' ? 'केस रिकॉर्ड (.json)' : 'Download case record (.json)'} <span aria-hidden="true">↓</span></Button><Button variant="secondary" type="button" onClick={() => window.print()}>{local(copy.printPack, language)} <span aria-hidden="true">↗</span></Button><Button variant="quiet" type="button" onClick={() => go('review')}>{local(copy.editFacts, language)}</Button></div>
            {analysisMessage && <p className="analysis-message" role="status">{analysisMessage}</p>}
            <div className="page-actions"><Button variant="secondary" type="button" onClick={() => go('readiness')}>{local(copy.back, language)}</Button><Button type="button" onClick={submitDemo}>{local(copy.submitDemo, language)} <span aria-hidden="true">→</span></Button></div>
          </Screen>
          <Footer language={language} />
        </>
      )}

      {renderStep === 'tracking' && classification.finding !== 'consistent' && (
        <>
          <Screen className="tracking-screen">
            <BackButton onClick={() => go('pack')} language={language} />
            <div className="tracking-heading"><div><p className="eyebrow"><span />{local(copy.tracking, language)}</p><h1>{local(copy.tracking, language)}</h1><p>{local(copy.trackingLead, language)}</p></div><div className="fictional-reference"><small>{local(copy.fictionalRef, language)}</small><strong>{grievanceNumber}</strong><span>{local(copy.synthetic, language)}</span></div></div>
            <div className="simulation-banner strong"><span aria-hidden="true">!</span><div><strong>{language === 'hi' ? 'डेमो आपत्ति दर्ज की गई' : 'Simulated submission received'}</strong><p>{local(copy.trackingLead, language)} {language === 'hi' ? 'यह संदर्भ नंबर पूरी तरह काल्पनिक है।' : 'This reference number is entirely fictional.'}</p></div></div>
            <div className="tracking-layout">
              <section className="timeline-card"><div className="card-title"><span>01</span><div><h2>{language === 'hi' ? 'पता लगाने योग्य केस इतिहास' : 'Traceable case history'}</h2><small>{language === 'hi' ? 'स्रोत, नागरिक, नियम और काल्पनिक प्राधिकरण अलग दिखते हैं' : 'Source, citizen, rules, and simulated authority stay distinct'}</small></div></div><CaseLedgerTimeline events={ledgerEvents} language={language} />{trackingStage < 3 && <Button type="button" onClick={() => setTrackingStage(3)}>{local(copy.moveForward, language)} <span aria-hidden="true">→</span></Button>}</section>
              <aside className="track-summary"><div className="card-title"><span>02</span><div><h2>{language === 'hi' ? 'डेमो समय-सीमा' : 'Demo timing'}</h2><small>{language === 'hi' ? 'नियम से गणना' : 'Calculated by rules'}</small></div></div><dl><div><dt>{language === 'hi' ? 'डेमो जमा तारीख' : 'Demo acknowledged'}</dt><dd>27 Aug 2026</dd></div><div><dt>{language === 'hi' ? 'बताई गई अवधि' : 'Stated response period'}</dt><dd>30 days</dd></div><div><dt>{language === 'hi' ? 'स्थिति' : 'Status'}</dt><dd>{trackingStage < 3 ? local(copy.submissionReceived, language) : trackingStage === 3 ? local(copy.underReview, language) : local(copy.reasonedOutcome, language)}</dd></div></dl><button type="button" onClick={() => go('pack')}>{local(copy.viewPack, language)} <span aria-hidden="true">→</span></button></aside>
            </div>

            {trackingStage >= 3 && (
              <section className="outcome-simulator"><div className="section-heading"><p className="eyebrow"><span />{local(copy.chooseOutcome, language)}</p><h2>{language === 'hi' ? 'प्राधिकरण का काल्पनिक नतीजा चुनें' : 'Choose a fictional authority outcome scenario'}</h2><p>{language === 'hi' ? 'हर विकल्प उसी डेमो की अलग शाखा है; केवल चुनी शाखा केस इतिहास में सक्रिय रहती है।' : 'Each option is a separate branch of the same demo; only the selected branch remains active in the case history.'}</p></div><div className="outcome-buttons"><button className={outcome === 'quashed' ? 'active' : ''} type="button" onClick={() => selectOutcome('quashed')}><span>✓</span><strong>{local(copy.quashed, language)}</strong><small>{language === 'hi' ? 'कारण रिकॉर्ड में दिखेंगे' : 'Reasons remain on record'}</small></button><button className={outcome === 'rejected' ? 'active' : ''} type="button" onClick={() => selectOutcome('rejected')}><span>×</span><strong>{local(copy.rejected, language)}</strong><small>{language === 'hi' ? 'आदेश को सबूत से मिलाएँ' : 'Map the order to evidence'}</small></button><button className={outcome === 'no-resolution' ? 'active' : ''} type="button" onClick={() => selectOutcome('no-resolution')}><span>…</span><strong>{local(copy.noResolution, language)}</strong><small>{language === 'hi' ? '30 दिन के बाद स्थिति जाँचें' : 'Verify status after 30 days'}</small></button></div></section>
            )}

            {outcome !== 'none' && (
              <section className={`outcome-card outcome-${outcome}`}>
                <div className="outcome-mark" aria-hidden="true">{outcome === 'quashed' ? '✓' : outcome === 'rejected' ? '×' : '…'}</div>
                <div><span className="synthetic-chip">FICTIONAL DEMO OUTCOME</span><h2>{outcome === 'quashed' ? local(copy.quashedTitle, language) : outcome === 'rejected' ? local(copy.rejectedTitle, language) : local(copy.noResolutionTitle, language)}</h2><p>{outcome === 'quashed' ? local(copy.quashedReason, language) : outcome === 'rejected' ? (classification.finding === 'mismatch' ? local(copy.rejectedReason, language) : (language === 'hi' ? 'दर्ज कारण: दी गई धुंधली सामग्री से चालान रिकॉर्ड बदलने का आधार स्पष्ट नहीं हुआ।' : 'Reason recorded: the supplied unclear material did not establish a basis to change the challan record.')) : local(copy.noResolutionBody, language)}</p>{outcome === 'rejected' && <><p className="neutral-note">{local(copy.neutralNext, language)}</p><div className="order-review-entry"><div><strong>{language === 'hi' ? 'आदेश में आपके सबूतों का उल्लेख कहाँ है?' : 'Where does the order mention your evidence?'}</strong><p>{language === 'hi' ? 'दिए काल्पनिक आदेश को उसी जमा रिविज़न के हर पक्के बिंदु से मिलाएँ।' : 'Compare the supplied fictional order with every confirmed point in the frozen local submission revision.'}</p><small>{submittedRevisionId}</small></div><Button type="button" onClick={() => go('order-review')}>{language === 'hi' ? 'इस आदेश को मेरे सबूतों से मिलाएँ' : 'Compare this order with my evidence'} <span aria-hidden="true">→</span></Button></div></>}{outcome === 'no-resolution' && (() => { const authorityClock = calculateAuthorityWindow('2026-08-27', '2026-09-27'); return <div className="authority-clock"><b>{authorityClock.elapsedDays}</b><span>{language === 'hi' ? '27 सितंबर तक बीते कैलेंडर दिन' : 'calendar days elapsed as of 27 Sep'}</span><small>{language === 'hi' ? '30 दिन की सीमा पार — आधिकारिक स्थिति जाँचें' : '30-day boundary passed — verify official status'}</small></div>; })()}<div className="outcome-links"><button type="button" onClick={() => go('pack')}>{local(copy.viewPack, language)}</button>{outcome === 'no-resolution' && <button type="button" onClick={() => openResolutionRoute('no-recorded-decision')}>{language === 'hi' ? 'स्थिति फॉलो-अप रास्ता देखें' : 'Open status follow-up route'} →</button>}<a href="https://echallan.parivahan.gov.in/" target="_blank" rel="noreferrer">{local(copy.officialPortal, language)} ↗</a><a href="https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars" target="_blank" rel="noreferrer">{local(copy.officialSource, language)} ↗</a></div></div>
              </section>
            )}
            <div className="resolution-reveal"><div><p className="eyebrow"><span />{language === 'hi' ? 'दूसरा चरण · आगे बढ़ने की संभावना' : 'SECONDARY SCALE PATH'}</p><h2>{language === 'hi' ? 'इसी भरोसेमंद तरीके से जुड़े रास्ते' : 'Adjacent routes using the same trust pattern'}</h2><p>{language === 'hi' ? 'मुख्य सबूत-से-आदेश डेमो पूरा हुआ। अलग रिज़ॉल्यूशन डेस्क दिखाता है कि यही सावधानी बाद में जवाब न मिलने, वर्चुअल कोर्ट, पेंडिंग भुगतान और पहुँच की समस्या तक कैसे बढ़ सकती है।' : 'The flagship evidence-to-order story is complete. A separate Resolution Desk shows how the same safeguards could later extend to no recorded decision, Virtual Court, pending payment, and access problems.'}</p></div><Button type="button" onClick={() => go('desk')}>{language === 'hi' ? 'दूसरे रास्ते देखें' : 'Explore adjacent routes'} <span aria-hidden="true">→</span></Button></div>
            <div className="page-actions"><Button variant="secondary" type="button" onClick={() => go('pack')}>{local(copy.viewPack, language)}</Button><Button variant="secondary" type="button" onClick={downloadCaseManifest}>{language === 'hi' ? 'केस रिकॉर्ड डाउनलोड करें' : 'Download case record'} <span aria-hidden="true">↓</span></Button><Button type="button" onClick={() => go('intake')}>{local(copy.anotherDemo, language)} <span aria-hidden="true">→</span></Button></div>
          </Screen>
          <Footer language={language} />
        </>
      )}

      {renderStep === 'order-review' && outcome === 'rejected' && simulatedSubmitted && (
        <>
          <OrderReviewScreen
            language={language}
            order={rejectedOrder}
            extractedFacts={effectiveOrderExtractedFacts}
            confirmedFactIds={orderConfirmedFactIds}
            completeness={orderCompleteness}
            error={orderFormError}
            onFactChange={updateOrderFact}
            onFactConfirmation={confirmOrderFact}
            onCompletenessChange={(value) => {
              setOrderCompleteness(value);
              setOrderMapReviews((current) => invalidateOrderMapConfirmations(current));
              setOrderLimitationConfirmed(false);
              setOrderNoteCreated(false);
              setOrderFormError('');
            }}
            onContinue={continueFromOrderReview}
            onBack={() => go('tracking')}
          />
          <Footer language={language} />
        </>
      )}

      {renderStep === 'order-map' && outcome === 'rejected' && simulatedSubmitted && orderCompleteness && submittedRevisionId && (
        <>
          <OrderMapScreen
            language={language}
            order={rejectedOrder}
            completeness={orderCompleteness}
            rows={orderRows}
            reviews={orderMapReviews}
            evidenceIndex={evidenceIndex}
            ledgerEvents={ledgerEvents}
            postClock={postRejectionClock}
            limitationConfirmed={orderLimitationConfirmed}
            noteCreated={effectiveOrderNoteCreated}
            note={orderReviewNote}
            clarificationDraft={clarificationDraft}
            error={orderFormError}
            copied={orderCopied}
            onReviewChange={updateOrderMapReview}
            onLimitationConfirmation={(checked) => { setOrderLimitationConfirmed(checked); setOrderNoteCreated(false); setOrderFormError(''); }}
            onCreateNote={createOrderNote}
            onCopyClarification={copyClarification}
            onDownloadNote={downloadOrderReview}
            onDownloadManifest={downloadCaseManifest}
            onDownloadCalendar={downloadPostDecisionCalendar}
            onOpenRoute={() => openResolutionRoute('grievance-rejected')}
            onBack={() => go('order-review')}
          />
          <Footer language={language} />
        </>
      )}
    </div>
  );
}
