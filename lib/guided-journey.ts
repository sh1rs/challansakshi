export type GuidedStepState =
  | 'complete'
  | 'current'
  | 'upcoming'
  | 'skipped'
  | 'blocked'
  | 'safe-stop';

export type GuidedStepDefinition<Id extends string = string> = {
  id: Id;
  label: string;
};

export type GuidedProgressStep<Id extends string = string> = GuidedStepDefinition<Id> & {
  state: GuidedStepState;
};

export type GuidedStatusTone = 'needs-action' | 'ready' | 'safe-stop' | 'complete';

export type GuidedStepContent = {
  currentLabel: string;
  instruction: string;
  why: string;
  status: string;
  statusTone: GuidedStatusTone;
  next: string;
};

export function buildGuidedProgress<Id extends string>(
  steps: readonly GuidedStepDefinition<Id>[],
  current: Id,
  overrides: Partial<Record<Id, GuidedStepState>> = {},
): GuidedProgressStep<Id>[] {
  const currentIndex = steps.findIndex((step) => step.id === current);
  if (currentIndex < 0) throw new RangeError(`Unknown guided journey step: ${current}`);

  return steps.map((step, index) => ({
    ...step,
    state: overrides[step.id] ?? (index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming'),
  }));
}

export type ChallanGuidedStep = 'safety' | 'source' | 'observations' | 'result';

const challanStepLabels = {
  en: {
    safety: 'Start safely',
    source: 'Get official record',
    observations: 'Check the evidence',
    result: 'Decide and resolve',
  },
  hi: {
    safety: 'सुरक्षित शुरुआत',
    source: 'आधिकारिक रिकॉर्ड पाएँ',
    observations: 'सबूत जाँचें',
    result: 'निर्णय और समाधान',
  },
} as const;

function challanSteps(language: 'en' | 'hi'): readonly GuidedStepDefinition<ChallanGuidedStep>[] {
  return (['safety', 'source', 'observations', 'result'] as const).map((id) => ({
    id,
    label: challanStepLabels[language][id],
  }));
}

export function buildChallanGuidedProgress(
  current: ChallanGuidedStep,
  sourceStatus: string,
  language: 'en' | 'hi' = 'en',
): GuidedProgressStep<ChallanGuidedStep>[] {
  const stoppedAtUnverifiedMessage = current === 'result' && sourceStatus === 'message-only';
  return buildGuidedProgress(challanSteps(language), current, stoppedAtUnverifiedMessage ? {
    source: 'safe-stop',
    observations: 'skipped',
  } : {});
}

export function getChallanGuideContent({
  step,
  safetyReady,
  sourceStatus,
  jurisdictionSelected,
  observationsReady,
  worksheetAvailable,
  resultAvailable = worksheetAvailable,
  exportAllowed,
  language = 'en',
  simpleMode = false,
}: {
  step: ChallanGuidedStep;
  safetyReady: boolean;
  sourceStatus: string;
  jurisdictionSelected: boolean;
  observationsReady: boolean;
  worksheetAvailable: boolean;
  resultAvailable?: boolean;
  exportAllowed: boolean;
  language?: 'en' | 'hi';
  simpleMode?: boolean;
}): GuidedStepContent {
  if (language === 'hi') {
    if (step === 'safety') return {
      currentLabel: '4 में से चरण 1 · सुरक्षित शुरुआत',
      instruction: simpleMode
        ? 'बताएँ कौन जाँच रहा है और डिवाइस निजी है या साझा।'
        : 'चुनें कि समीक्षा कौन कर रहा है और डिवाइस निजी है या साझा।',
      why: simpleMode
        ? 'इससे जानकारी और स्थानीय कॉपी सुरक्षित रहती है।'
        : 'इन विकल्पों से सहमति, डाउनलोड और साझा डिवाइस से बाहर निकलना नियंत्रित होता है।',
      status: safetyReady ? 'सुरक्षा विकल्प दर्ज हैं' : 'समीक्षक, डिवाइस और सभी ज़रूरी स्वीकृतियाँ चुनें',
      statusTone: safetyReady ? 'ready' : 'needs-action',
      next: 'रिकॉर्ड कहाँ से मिला, यह दर्ज करें।',
    };

    if (step === 'source') {
      if (sourceStatus === 'message-only') return {
        currentLabel: '4 में से चरण 2 · आधिकारिक रिकॉर्ड पाएँ',
        instruction: simpleMode
          ? 'संदेश के लिंक का उपयोग न करें। आधिकारिक सेवा स्वयं खोलें।'
          : 'आधिकारिक रिकॉर्ड स्वयं खोलें। फिर चालान प्रिंट, रसीद, स्क्रीनशॉट या दी गई तस्वीर यहाँ लाएँ।',
        why: 'केवल संदेश या भेजा हुआ लिंक रिकॉर्ड जाँचने के लिए पर्याप्त नहीं है।',
        status: 'सुरक्षित रोक: सबूत तुलना से पहले रिकॉर्ड जाँचें',
        statusTone: 'safe-stop',
        next: 'रिकॉर्ड पाने के लिए जाँचा हुआ आधिकारिक रास्ता उपयोग करें; सबूत तुलना छोड़ दी जाएगी।',
      };
      const sourceReady = sourceStatus !== 'not-selected' && jurisdictionSelected;
      return {
        currentLabel: '4 में से चरण 2 · आधिकारिक रिकॉर्ड पाएँ',
        instruction: simpleMode
          ? 'आधिकारिक सेवा खोलें, फिर फ़ाइल चुनें या तथ्य स्वयं लिखें।'
          : 'आधिकारिक रिकॉर्ड स्वयं खोलें। फिर चालान प्रिंट, रसीद, स्क्रीनशॉट या दी गई तस्वीर यहाँ लाएँ।',
        why: simpleMode
          ? 'संदेश का लिंक असली रिकॉर्ड साबित नहीं करता।'
          : 'संदेश या भेजा हुआ लिंक रिकॉर्ड की जाँच नहीं करता। सरकारी पासवर्ड, गुप्त अंक, पहचान विवरण या भुगतान जानकारी यहाँ न दें।',
        status: sourceReady
          ? 'आपने स्रोत दर्ज किया और रिकॉर्ड देखने का तरीका चुना'
          : 'आधिकारिक स्रोत और रिकॉर्ड देखने का तरीका अभी चाहिए',
        statusTone: sourceReady ? 'ready' : 'needs-action',
        next: 'सबूत तुलना से पहले अपने दर्ज किए हर तथ्य की पुष्टि करें।',
      };
    }

    if (step === 'observations') return {
      currentLabel: '4 में से चरण 3 · सबूत जाँचें',
      instruction: simpleMode
        ? 'एक-एक तथ्य देखें और जो साफ़ न हो उसे अस्पष्ट चुनें।'
        : 'एक आधिकारिक तस्वीर की एक वाहन रिकॉर्ड से तुलना करें और केवल दिखने वाले तथ्य दर्ज करें।',
      why: simpleMode
        ? 'नतीजा केवल आपके पुष्ट उत्तर उपयोग करता है।'
        : 'समीक्षा केवल उन्हीं तथ्यों का उपयोग कर सकती है जिन्हें आपने स्वयं पुष्ट किया।',
      status: observationsReady ? 'सावधान समीक्षा के लिए तैयार' : 'जो दिखे, अस्पष्ट हो या न दिया गया हो, वह दर्ज करें',
      statusTone: observationsReady ? 'ready' : 'needs-action',
      next: 'देखें कि आपके उत्तर क्या दिखाते हैं और क्या स्थापित नहीं कर सकते।',
    };

    const safeStop = sourceStatus === 'message-only';
    return {
      currentLabel: '4 में से चरण 4 · निर्णय और समाधान',
      instruction: safeStop
        ? 'तुलना या चुनौती से पहले आधिकारिक सेवा पर रिकॉर्ड जाँचें।'
        : simpleMode
          ? 'नतीजा, गायब रिकॉर्ड और अगला आधिकारिक रास्ता पढ़ें।'
          : 'नतीजा पढ़ें, गायब चीज़ें जाँचें और केवल दिखाया गया आधिकारिक रास्ता उपयोग करें।',
      why: safeStop
        ? 'केवल संदेश से भरोसेमंद सबूत तुलना नहीं हो सकती।'
        : simpleMode
          ? 'यह जानकारी तैयार करता है; केस जमा या तय नहीं करता।'
          : 'तैयारी पत्र जानकारी व्यवस्थित करता है; यह केस जमा या तय नहीं करता।',
      status: safeStop
        ? 'सुरक्षित रोक: सबूत तुलना छोड़ दी गई'
        : resultAvailable && !exportAllowed
          ? 'नतीजा तैयार है; साझा डिवाइस पर कॉपी और डाउनलोड बंद हैं'
          : resultAvailable
            ? worksheetAvailable ? 'स्थानीय तैयारी पत्र उपलब्ध है' : 'सावधान नतीजा उपलब्ध है'
            : 'जाने से पहले नतीजा और गायब सबूत देखें',
      statusTone: safeStop ? 'safe-stop' : resultAvailable ? 'complete' : 'ready',
      next: safeStop
        ? 'जाँची हुई आधिकारिक सेवा स्वतंत्र रूप से खोलें।'
        : 'नीचे दिखाया आधिकारिक रास्ता उपयोग करें; चालान साक्षी केस जमा नहीं करता।',
    };
  }

  if (step === 'safety') return {
    currentLabel: 'Step 1 of 4 · Start safely',
    instruction: simpleMode
      ? 'Who is checking? Is this device private or shared?'
      : 'Choose the reviewer and device.',
    why: simpleMode
      ? 'This keeps your information and local copies safer.'
      : 'These choices control consent, downloads, and the shared-device exit.',
    status: safetyReady ? 'Privacy and device choices confirmed' : 'Choose the reviewer, device, and required confirmations',
    statusTone: safetyReady ? 'ready' : 'needs-action',
    next: 'Verify where the official record came from.',
  };

  if (step === 'source') {
    if (sourceStatus === 'message-only') return {
      currentLabel: 'Step 2 of 4 · Get the official record',
      instruction: 'Open the official record, then add its facts or a supplied record.',
      why: 'A message or forwarded link alone does not verify the record.',
      status: 'Safe stop: verify the record before comparing evidence',
      statusTone: 'safe-stop',
      next: 'Use the verified official route to obtain the record; evidence comparison will stay skipped.',
    };
    const sourceReady = sourceStatus !== 'not-selected' && jurisdictionSelected;
    return {
      currentLabel: 'Step 2 of 4 · Get the official record',
      instruction: simpleMode
        ? 'Open an official service, then choose a file here or type the facts yourself.'
        : 'Open the official record, then add its facts or a supplied record.',
      why: simpleMode
        ? 'A message link does not prove the record is official.'
        : 'A message or forwarded link alone does not verify the record. ChallanSakshi never needs your government password, CAPTCHA, OTP, Aadhaar details, or payment credentials.',
      status: sourceReady ? 'Source and review method recorded' : 'Official source and record needed',
      statusTone: sourceReady ? 'ready' : 'needs-action',
      next: 'Confirm entered facts before comparing evidence.',
    };
  }

  if (step === 'observations') return {
    currentLabel: 'Step 3 of 4 · Check the evidence',
      instruction: simpleMode
        ? 'Check one fact at a time. Choose unclear when you cannot tell.'
      : 'Compare one official image with one vehicle record. Record visible facts.',
    why: simpleMode
      ? 'The result uses only answers you confirmed.'
      : 'The review can use only facts you personally confirmed.',
    status: observationsReady ? 'Ready for a conservative review' : 'Record what is visible, unclear, or not supplied',
    statusTone: observationsReady ? 'ready' : 'needs-action',
    next: 'See what your entries support—and what they cannot establish.',
  };

  const safeStop = sourceStatus === 'message-only';
  return {
    currentLabel: 'Step 4 of 4 · Decide and resolve',
    instruction: safeStop
      ? 'Verify the record through an official service before comparing or contesting anything.'
      : simpleMode
        ? 'Read the result, missing records, and the official next step.'
        : 'Read the finding, check what is missing, then use the official route.',
    why: safeStop
      ? 'A message-only source cannot support a reliable evidence comparison.'
      : simpleMode
        ? 'This prepares information. It does not submit or decide the case.'
        : 'The worksheet prepares information; it does not submit or decide the case.',
    status: safeStop
      ? 'Safe stop: evidence comparison was skipped'
      : resultAvailable && !exportAllowed
        ? worksheetAvailable
          ? 'Worksheet ready to review; copy and download are disabled on this shared device'
          : 'Result ready to review; copy and download are disabled on this shared device'
        : resultAvailable
          ? worksheetAvailable ? 'Local preparation worksheet available' : 'Conservative review result available'
          : 'Review the finding and missing evidence before leaving',
    statusTone: safeStop ? 'safe-stop' : resultAvailable ? 'complete' : 'ready',
    next: safeStop
      ? 'Open the verified official service independently.'
      : 'Use the official destination shown below; ChallanSakshi does not submit the case.',
  };
}

export type TollGuidedStep = 'start' | 'records' | 'reconcile' | 'packet';

const tollSteps: readonly GuidedStepDefinition<TollGuidedStep>[] = [
  { id: 'start', label: 'Choose how to review' },
  { id: 'records', label: 'Record one transaction' },
  { id: 'reconcile', label: 'Check what agrees' },
  { id: 'packet', label: 'Prepare the next action' },
];

export function buildTollGuidedProgress(current: TollGuidedStep): GuidedProgressStep<TollGuidedStep>[] {
  return buildGuidedProgress(tollSteps, current);
}

export function getTollGuideContent({
  step,
  startReady,
  sourceReady,
  recordsReady,
  finalConfirmationReady,
  packetAvailable,
  exportAllowed,
}: {
  step: TollGuidedStep;
  startReady: boolean;
  sourceReady: boolean;
  recordsReady: boolean;
  finalConfirmationReady: boolean;
  packetAvailable: boolean;
  exportAllowed: boolean;
}): GuidedStepContent {
  if (step === 'start') return {
    currentLabel: 'Step 1 of 4 · Choose how to review',
    instruction: 'Choose manual review or a fictional example, then identify this device.',
    why: 'This controls which privacy boundary and export rules apply.',
    status: startReady ? 'Review mode and device confirmed' : 'Choose the review mode, device, and required safety confirmations',
    statusTone: startReady ? 'ready' : 'needs-action',
    next: 'Record one official debit without entering account credentials.',
  };

  if (step === 'records') {
    const status = !sourceReady
      ? 'Official account source still needs confirmation'
      : !recordsReady
        ? 'Complete the applicable transaction facts—or mark them unknown'
        : !finalConfirmationReady
          ? 'Final event confirmation still needed'
          : 'Transaction record is ready to map';
    return {
      currentLabel: 'Step 2 of 4 · Record one transaction',
      instruction: 'Use one official debit and record facts from that event.',
      why: 'Mixing reader time, debit-post time, SMS time, or two crossings can create a false conflict.',
      status,
      statusTone: sourceReady && recordsReady && finalConfirmationReady ? 'ready' : 'needs-action',
      next: !finalConfirmationReady && sourceReady && recordsReady
        ? 'Confirm the combined record after your last edit, then map it.'
        : 'Map where the entered records agree, conflict, or remain unknown.',
    };
  }

  if (step === 'reconcile') return {
    currentLabel: 'Step 3 of 4 · Check what agrees',
    instruction: 'Review where records agree, conflict, or remain unknown.',
    why: 'This is a question map, not a bank or toll decision.',
    status: 'Map ready to review',
    statusTone: 'ready',
    next: 'Check the evidence list and the independently verified official route.',
  };

  return {
    currentLabel: 'Step 4 of 4 · Prepare the next action',
    instruction: 'Open the verified official route first, then review missing evidence.',
    why: 'The account provider or responsible authority remains the decision-maker.',
    status: packetAvailable && !exportAllowed
      ? 'Preparation note ready to review; copy and download are disabled on this shared device'
      : packetAvailable
        ? 'Official route and local preparation note ready'
        : 'Official route ready; preparation note withheld until missing records are verified',
    statusTone: packetAvailable ? 'complete' : 'safe-stop',
    next: 'Use the official destination before opening optional audit detail.',
  };
}

export type SyntheticGuidedScreen =
  | 'intake'
  | 'review'
  | 'finding'
  | 'passport'
  | 'readiness'
  | 'pack'
  | 'tracking'
  | 'order-review'
  | 'order-map';

export type SyntheticGuidedStage = 'intake' | 'review' | 'finding' | 'readiness' | 'pack' | 'tracking';

export type GuidedCopyLabels = {
  doNow: string;
  why: string;
  status: string;
  next: string;
  allSteps: string;
  stateComplete: string;
  stateCurrent: string;
  stateUpcoming: string;
  stateSkipped: string;
  stateBlocked: string;
  stateSafeStop: string;
};

export type SyntheticGuideState = {
  reviewComplete?: boolean;
  passportReviewsComplete?: boolean;
  passportFrozen?: boolean;
  submissionComplete?: boolean;
  outcomeSelected?: boolean;
  orderFactsComplete?: boolean;
  orderMapComplete?: boolean;
  orderLimitationConfirmed?: boolean;
  orderNoteCreated?: boolean;
};

export type SyntheticGuide = GuidedStepContent & {
  steps: GuidedProgressStep<SyntheticGuidedStage>[];
  progressLabel: string;
  labels: GuidedCopyLabels;
};

const syntheticStageOrder: readonly SyntheticGuidedStage[] = [
  'intake',
  'review',
  'finding',
  'readiness',
  'pack',
  'tracking',
];

const syntheticScreenStage: Record<SyntheticGuidedScreen, SyntheticGuidedStage> = {
  intake: 'intake',
  review: 'review',
  finding: 'finding',
  passport: 'finding',
  readiness: 'readiness',
  pack: 'pack',
  tracking: 'tracking',
  'order-review': 'tracking',
  'order-map': 'tracking',
};

const syntheticStageLabels = {
  en: {
    intake: 'Evidence',
    review: 'Verify',
    finding: 'Finding',
    readiness: 'Readiness',
    pack: 'Pack',
    tracking: 'Track',
  },
  hi: {
    intake: 'सबूत',
    review: 'जाँच',
    finding: 'नतीजा',
    readiness: 'तैयारी',
    pack: 'पैक',
    tracking: 'स्थिति',
  },
} satisfies Record<'en' | 'hi', Record<SyntheticGuidedStage, string>>;

const syntheticScreenLabels = {
  en: {
    intake: 'Evidence intake',
    review: 'Fact verification',
    finding: 'Evidence finding',
    passport: 'Evidence passport',
    readiness: 'Evidence readiness',
    pack: 'Contest pack',
    tracking: 'Case tracking',
    'order-review': 'Order review',
    'order-map': 'Order map',
  },
  hi: {
    intake: 'सबूत चुनना',
    review: 'जानकारी की जाँच',
    finding: 'सबूत का नतीजा',
    passport: 'सबूत पासपोर्ट',
    readiness: 'सबूत की तैयारी',
    pack: 'आपत्ति पैक',
    tracking: 'केस की स्थिति',
    'order-review': 'आदेश की जाँच',
    'order-map': 'आदेश मानचित्र',
  },
} satisfies Record<'en' | 'hi', Record<SyntheticGuidedScreen, string>>;

type SyntheticScreenCopy = Omit<GuidedStepContent, 'currentLabel'>;

const syntheticScreenCopy = {
  en: {
    intake: {
      instruction: 'Choose one fictional case and inspect the three supplied demo records.',
      why: 'Starting from a fixed synthetic packet keeps the walkthrough safe and repeatable.',
      status: 'Three fictional records are ready; real uploads are not accepted',
      statusTone: 'ready',
      next: 'Run the demo analysis, then verify every extracted fact yourself.',
    },
    review: {
      instruction: 'Check each extracted demo fact against the supplied fictional records.',
      why: 'The finding can use only facts a person has reviewed and confirmed.',
      status: 'Human confirmation is required before the finding',
      statusTone: 'needs-action',
      next: 'Confirm the facts to see a cautious evidence finding.',
    },
    finding: {
      instruction: 'Read what the confirmed demo evidence supports—and what remains uncertain.',
      why: 'The product describes supplied-record agreement or conflict; it does not decide guilt or validity.',
      status: 'A cautious finding is ready from the confirmed fictional facts',
      statusTone: 'ready',
      next: 'Review identity, time, and supplied-packet completeness in the local passport.',
    },
    passport: {
      instruction: 'Review the fictional identity comparison, custody timeline, and supplied-packet scope.',
      why: 'Keeping identity, time, and completeness separate prevents one clue from becoming an unsupported conclusion.',
      status: 'The timeline and packet scope require your review',
      statusTone: 'needs-action',
      next: 'Confirm both reviews to continue to evidence readiness.',
    },
    readiness: {
      instruction: 'Check which demo items are present, missing, optional, or still unclear.',
      why: 'Completeness describes this supplied packet only; it is not a legal-sufficiency score.',
      status: 'Required demo items are listed and uncertainty stays visible',
      statusTone: 'ready',
      next: 'Prepare the permitted fictional artifact without inventing missing evidence.',
    },
    pack: {
      instruction: 'Review the generated fictional draft, evidence index, and explicit limitations.',
      why: 'A useful preparation pack must stay traceable to confirmed facts and show what it cannot establish.',
      status: 'Fictional draft only; nothing has been filed or sent',
      statusTone: 'needs-action',
      next: 'Run the mock submission only when the local demo pack reads correctly.',
    },
    tracking: {
      instruction: 'Follow the simulated ledger and choose one fictional authority outcome.',
      why: 'The demo makes source, citizen, rules, and simulated authority actions distinguishable.',
      status: 'Simulation only; no authority or government system was contacted',
      statusTone: 'ready',
      next: 'Inspect the fictional outcome or start another synthetic case.',
    },
    'order-review': {
      instruction: 'Verify what the supplied fictional rejection order actually says.',
      why: 'Order text must be confirmed before it can be mapped to the frozen demo evidence revision.',
      status: 'Fictional order facts require your verification',
      statusTone: 'needs-action',
      next: 'Confirm the order facts and its supplied-page scope, then open the evidence map.',
    },
    'order-map': {
      instruction: 'Check each suggested link between the frozen demo evidence and the fictional order text.',
      why: 'This describes textual coverage only; it does not score legal adequacy or prove consideration.',
      status: 'Suggested references require confirmation before a local review note is created',
      statusTone: 'needs-action',
      next: 'Confirm every mapping and the scope limitation before creating the fictional review note.',
    },
  },
  hi: {
    intake: {
      instruction: 'एक काल्पनिक केस चुनें और दिए गए तीन डेमो रिकॉर्ड देखें।',
      why: 'तय काल्पनिक पैकेट से शुरुआत करने पर डेमो सुरक्षित और दोहराने योग्य रहता है।',
      status: 'तीन काल्पनिक रिकॉर्ड तैयार हैं; असली अपलोड स्वीकार नहीं किए जाते',
      statusTone: 'ready',
      next: 'डेमो विश्लेषण चलाएँ, फिर निकाली गई हर जानकारी खुद जाँचें।',
    },
    review: {
      instruction: 'निकाली गई हर डेमो जानकारी को दिए काल्पनिक रिकॉर्ड से मिलाएँ।',
      why: 'नतीजे में केवल वही जानकारी इस्तेमाल होगी जिसे किसी व्यक्ति ने जाँचकर पक्का किया है।',
      status: 'नतीजे से पहले आपकी पुष्टि ज़रूरी है',
      statusTone: 'needs-action',
      next: 'सावधान सबूत नतीजा देखने के लिए जानकारी पक्की करें।',
    },
    finding: {
      instruction: 'पढ़ें कि पक्के डेमो सबूत क्या दिखाते हैं और क्या अभी अनिश्चित है।',
      why: 'उत्पाद केवल दिए रिकॉर्ड का मेल या अंतर बताता है; दोष या वैधता तय नहीं करता।',
      status: 'पक्की काल्पनिक जानकारी से सावधान नतीजा तैयार है',
      statusTone: 'ready',
      next: 'स्थानीय पासपोर्ट में पहचान, समय और दिए पैकेट की पूर्णता देखें।',
    },
    passport: {
      instruction: 'काल्पनिक पहचान तुलना, वाहन-संबंध समय-रेखा और दिए पैकेट का दायरा जाँचें।',
      why: 'पहचान, समय और पूर्णता को अलग रखने से एक संकेत बिना आधार के निष्कर्ष नहीं बनता।',
      status: 'समय-रेखा और पैकेट के दायरे की आपकी जाँच बाकी है',
      statusTone: 'needs-action',
      next: 'सबूत तैयारी पर जाने के लिए दोनों समीक्षाएँ पक्की करें।',
    },
    readiness: {
      instruction: 'देखें कि कौन-सी डेमो चीज़ मौजूद, गायब, वैकल्पिक या अभी अस्पष्ट है।',
      why: 'पूर्णता केवल इस दिए पैकेट का वर्णन है; यह कानूनी पर्याप्तता का स्कोर नहीं है।',
      status: 'ज़रूरी डेमो चीज़ें सूचीबद्ध हैं और अनिश्चितता साफ़ है',
      statusTone: 'ready',
      next: 'गायब सबूत गढ़े बिना अनुमत काल्पनिक दस्तावेज़ तैयार करें।',
    },
    pack: {
      instruction: 'बना हुआ काल्पनिक मसौदा, सबूत सूची और साफ़ सीमाएँ जाँचें।',
      why: 'उपयोगी तैयारी पैक पक्की जानकारी तक पता लगाने योग्य होना चाहिए और अपनी सीमाएँ दिखानी चाहिए।',
      status: 'केवल काल्पनिक मसौदा; कुछ भी जमा या भेजा नहीं गया',
      statusTone: 'needs-action',
      next: 'स्थानीय डेमो पैक सही पढ़ने पर ही नकली जमा प्रक्रिया चलाएँ।',
    },
    tracking: {
      instruction: 'काल्पनिक केस इतिहास देखें और एक काल्पनिक प्राधिकरण नतीजा चुनें।',
      why: 'डेमो में स्रोत, नागरिक, नियम और नकली प्राधिकरण कार्रवाई अलग रहती है।',
      status: 'केवल सिमुलेशन; किसी प्राधिकरण या सरकारी सिस्टम से संपर्क नहीं हुआ',
      statusTone: 'ready',
      next: 'काल्पनिक नतीजा देखें या दूसरा सिंथेटिक केस शुरू करें।',
    },
    'order-review': {
      instruction: 'जाँचें कि दिया काल्पनिक अस्वीकृति आदेश वास्तव में क्या कहता है।',
      why: 'आदेश को जमे हुए डेमो सबूत रिविज़न से मिलाने से पहले उसके पाठ की पुष्टि ज़रूरी है।',
      status: 'काल्पनिक आदेश की जानकारी की आपकी जाँच बाकी है',
      statusTone: 'needs-action',
      next: 'आदेश की जानकारी और दिए पन्नों का दायरा पक्का कर सबूत मानचित्र खोलें।',
    },
    'order-map': {
      instruction: 'जमे हुए डेमो सबूत और काल्पनिक आदेश के बीच हर सुझाया संबंध जाँचें।',
      why: 'यह केवल पाठ में उल्लेख दिखाता है; कानूनी पर्याप्तता नहीं आँकता और विचार किया जाना साबित नहीं करता।',
      status: 'स्थानीय समीक्षा नोट से पहले सुझाए संदर्भों की पुष्टि ज़रूरी है',
      statusTone: 'needs-action',
      next: 'काल्पनिक समीक्षा नोट बनाने से पहले हर मिलान और दायरे की सीमा पक्की करें।',
    },
  },
} satisfies Record<'en' | 'hi', Record<SyntheticGuidedScreen, SyntheticScreenCopy>>;

const syntheticGuideLabels = {
  en: {
    doNow: 'Do this now',
    why: 'Why this matters',
    status: 'Demo status',
    next: 'Next',
    allSteps: 'See all demo steps',
    stateComplete: 'Completed',
    stateCurrent: 'Current',
    stateUpcoming: 'Upcoming',
    stateSkipped: 'Skipped',
    stateBlocked: 'Blocked',
    stateSafeStop: 'Safe stop',
  },
  hi: {
    doNow: 'अभी यह करें',
    why: 'यह क्यों ज़रूरी है',
    status: 'डेमो स्थिति',
    next: 'आगे',
    allSteps: 'डेमो के सभी चरण देखें',
    stateComplete: 'पूरा',
    stateCurrent: 'अभी',
    stateUpcoming: 'आगे आने वाला',
    stateSkipped: 'छोड़ा गया',
    stateBlocked: 'रुका हुआ',
    stateSafeStop: 'सुरक्षित रोक',
  },
} satisfies Record<'en' | 'hi', GuidedCopyLabels>;

export function getSyntheticGuide({
  step,
  language,
  state = {},
}: {
  step: SyntheticGuidedScreen;
  language: 'en' | 'hi';
  state?: SyntheticGuideState;
}): SyntheticGuide {
  const currentStage = syntheticScreenStage[step];
  const currentIndex = syntheticStageOrder.indexOf(currentStage);
  const stages = syntheticStageOrder.map((id) => ({ id, label: syntheticStageLabels[language][id] }));
  const stageLabel = syntheticStageLabels[language][currentStage];
  const screenLabel = syntheticScreenLabels[language][step];
  const screenSuffix = screenLabel === stageLabel ? '' : ` · ${screenLabel}`;
  const currentLabel = language === 'hi'
    ? `काल्पनिक डेमो · 6 में से चरण ${currentIndex + 1} · ${stageLabel}${screenSuffix}`
    : `SYNTHETIC DEMO · Step ${currentIndex + 1} of 6 · ${stageLabel}${screenSuffix}`;
  const progressOverrides: Partial<Record<SyntheticGuidedStage, GuidedStepState>> = {};
  if (state.submissionComplete || state.passportFrozen) {
    syntheticStageOrder.forEach((stage) => { progressOverrides[stage] = 'complete'; });
    progressOverrides[currentStage] = 'current';
  }

  let dynamicCopy: SyntheticScreenCopy = syntheticScreenCopy[language][step];

  if (step === 'review' && state.reviewComplete) {
    dynamicCopy = language === 'hi'
      ? {
        ...dynamicCopy,
        status: 'हर डेमो जानकारी की जाँच और पुष्टि हो गई है',
        statusTone: 'ready',
        next: 'सावधान सबूत नतीजा देखें।',
      }
      : {
        ...dynamicCopy,
        status: 'Every demo fact has been reviewed and confirmed',
        statusTone: 'ready',
        next: 'Continue to the cautious evidence finding.',
      };
  }

  if (step === 'passport') {
    if (state.passportFrozen) {
      dynamicCopy = language === 'hi'
        ? {
          ...dynamicCopy,
          status: 'जमा किया गया स्थानीय पासपोर्ट समीक्षा के लिए तैयार है',
          statusTone: 'complete',
          next: 'नकली केस इतिहास पर वापस जाएँ।',
        }
        : {
          ...dynamicCopy,
          status: 'Frozen local passport is ready to review',
          statusTone: 'complete',
          next: 'Return to the simulated case ledger.',
        };
    } else if (state.passportReviewsComplete) {
      dynamicCopy = language === 'hi'
        ? {
          ...dynamicCopy,
          status: 'समय-रेखा और दिए पैकेट के दायरे की पुष्टि हो गई है',
          statusTone: 'ready',
          next: 'सबूत तैयारी पर जाएँ।',
        }
        : {
          ...dynamicCopy,
          status: 'Timeline and supplied-packet scope confirmed',
          statusTone: 'ready',
          next: 'Continue to evidence readiness.',
        };
    }
  }

  if (step === 'pack' && state.submissionComplete) {
    dynamicCopy = language === 'hi'
      ? {
        ...dynamicCopy,
        status: 'काल्पनिक पैक केवल स्थानीय सिमुलेशन में जमा हुआ है',
        statusTone: 'complete',
        next: 'नकली केस इतिहास और स्थिति देखें।',
      }
      : {
        ...dynamicCopy,
        status: 'Fictional pack submitted to the local simulation only',
        statusTone: 'complete',
        next: 'View the simulated case ledger and status.',
      };
  }

  if (step === 'tracking' && state.submissionComplete) {
    dynamicCopy = language === 'hi'
      ? {
        ...dynamicCopy,
        status: state.outcomeSelected
          ? 'काल्पनिक नतीजा स्थानीय केस इतिहास में दर्ज है'
          : 'काल्पनिक जमा प्रक्रिया स्थानीय केस इतिहास में दर्ज है',
        statusTone: state.outcomeSelected ? 'complete' : 'ready',
        next: state.outcomeSelected
          ? 'नतीजे के कारण देखें या दूसरा सिंथेटिक केस शुरू करें।'
          : 'केस आगे बढ़ाएँ और एक काल्पनिक प्राधिकरण नतीजा चुनें।',
      }
      : {
        ...dynamicCopy,
        status: state.outcomeSelected
          ? 'Fictional outcome recorded in the local case ledger'
          : 'Fictional submission recorded in the local case ledger',
        statusTone: state.outcomeSelected ? 'complete' : 'ready',
        next: state.outcomeSelected
          ? 'Review the recorded reasons or start another synthetic case.'
          : 'Advance the case and choose one fictional authority outcome.',
      };
  }

  if (step === 'order-review' && state.orderFactsComplete) {
    dynamicCopy = language === 'hi'
      ? {
        ...dynamicCopy,
        status: 'काल्पनिक आदेश की जानकारी और दिए पन्नों के दायरे की पुष्टि हो गई है',
        statusTone: 'ready',
        next: 'सबूत मानचित्र खोलें और हर सुझाया पाठ संबंध जाँचें।',
      }
      : {
        ...dynamicCopy,
        status: 'Fictional order facts and supplied-page scope confirmed',
        statusTone: 'ready',
        next: 'Open the evidence map and verify each suggested textual link.',
      };
  }

  if (step === 'order-map') {
    const mapAndScopeComplete = state.orderMapComplete && state.orderLimitationConfirmed;
    if (state.orderNoteCreated && mapAndScopeComplete) {
      dynamicCopy = language === 'hi'
        ? {
          ...dynamicCopy,
          status: 'काल्पनिक आदेश-समीक्षा नोट स्थानीय रूप से बन गया है',
          statusTone: 'complete',
          next: 'स्थानीय नोट देखें या डाउनलोड करें, फिर सही डेमो रास्ता चुनें।',
        }
        : {
          ...dynamicCopy,
          status: 'Fictional order-review note created locally',
          statusTone: 'complete',
          next: 'Review or download the local note, then choose the appropriate demo route.',
        };
    } else if (mapAndScopeComplete) {
      dynamicCopy = language === 'hi'
        ? {
          ...dynamicCopy,
          status: 'हर पाठ संबंध और दायरे की सीमा पक्की है',
          statusTone: 'ready',
          next: 'स्थानीय काल्पनिक आदेश-समीक्षा नोट बनाएँ।',
        }
        : {
          ...dynamicCopy,
          status: 'Every textual link and the scope limitation are confirmed',
          statusTone: 'ready',
          next: 'Create the local fictional order-review note.',
        };
    } else if (state.orderMapComplete) {
      dynamicCopy = language === 'hi'
        ? {
          ...dynamicCopy,
          status: 'पाठ संबंध पक्के हैं; दायरे की सीमा की पुष्टि बाकी है',
          statusTone: 'needs-action',
          next: 'स्थानीय नोट बनाने से पहले दायरे की सीमा पक्की करें।',
        }
        : {
          ...dynamicCopy,
          status: 'Textual links confirmed; scope limitation still needs confirmation',
          statusTone: 'needs-action',
          next: 'Confirm the scope limitation before creating the local note.',
        };
    }
  }

  return {
    currentLabel,
    ...dynamicCopy,
    steps: buildGuidedProgress(stages, currentStage, progressOverrides),
    progressLabel: language === 'hi' ? 'काल्पनिक डेमो की प्रगति' : 'Synthetic demo progress',
    labels: syntheticGuideLabels[language],
  };
}
