import type { Language } from './domain';
import type { ChallanGuidedStep, GuidedCopyLabels } from './guided-journey';
import type { CitizenReviewAssessment, OfficialDeadlineStatus } from './public-challan';

export const CITIZEN_DISCLAIMER_EN = 'Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.';
export const CITIZEN_DISCLAIMER_HI = 'नागरिक ने ChallanSakshi का उपयोग करके तैयार किया। किसी सरकारी प्राधिकरण को जमा नहीं किया गया, प्रमाणित नहीं किया गया और मंज़ूर नहीं किया गया।';

type StagePresentation = {
  heading: string;
  help: string;
  action: string;
};

const stagePresentation = {
  en: {
    standard: {
      check: {
        heading: 'Check your challan',
        help: 'Answer only the questions that can still change or explain the safe result.',
        action: 'See my next step',
      },
      resolve: {
        heading: 'Your next step',
        help: 'Read the bounded finding, what it means, and the current official route.',
        action: 'Edit answers',
      },
    },
    simple: {
      check: {
        heading: 'Check your challan',
        help: 'Answer one question at a time. Use unclear when you cannot tell.',
        action: 'See my next step',
      },
      resolve: {
        heading: 'Your next step',
        help: 'Read what your answers show and where to go next.',
        action: 'Change answers',
      },
    },
  },
  hi: {
    standard: {
      check: {
        heading: 'अपना चालान जाँचें',
        help: 'केवल उन प्रश्नों का उत्तर दें जो सुरक्षित नतीजे को बदल या समझा सकते हैं।',
        action: 'अगला कदम देखें',
      },
      resolve: {
        heading: 'आपका अगला कदम',
        help: 'सावधान नतीजा, उसका मतलब और मौजूदा आधिकारिक रास्ता पढ़ें।',
        action: 'उत्तर बदलें',
      },
    },
    simple: {
      check: {
        heading: 'अपना चालान जाँचें',
        help: 'एक-एक प्रश्न का उत्तर दें। तय न हो तो अस्पष्ट चुनें।',
        action: 'अगला कदम देखें',
      },
      resolve: {
        heading: 'आपका अगला कदम',
        help: 'आपके उत्तर क्या दिखाते हैं और आगे कहाँ जाना है, पढ़ें।',
        action: 'उत्तर बदलें',
      },
    },
  },
} satisfies Record<Language, Record<'standard' | 'simple', Record<ChallanGuidedStep, StagePresentation>>>;

const tableCopy = {
  en: {
    caption: 'Citizen-recorded evidence details',
    field: 'Field',
    observation: 'Observation',
    source: 'Source',
    confidence: 'Confidence',
    confirmation: 'Confirmation',
    limitation: 'Limitation',
    none: 'None recorded',
    sourceFallback: 'Citizen-recorded source',
    confidenceHelp: 'Confidence describes how clear your recorded observation is. It does not authenticate the document.',
  },
  hi: {
    caption: 'नागरिक द्वारा दर्ज सबूत विवरण',
    field: 'फ़ील्ड',
    observation: 'अवलोकन',
    source: 'स्रोत',
    confidence: 'स्पष्टता स्तर',
    confirmation: 'पुष्टि',
    limitation: 'सीमा',
    none: 'कोई दर्ज सीमा नहीं',
    sourceFallback: 'नागरिक द्वारा दर्ज स्रोत',
    confidenceHelp: 'स्पष्टता स्तर बताता है कि आपका दर्ज अवलोकन कितना साफ़ है। यह दस्तावेज़ प्रमाणित नहीं करता।',
  },
} as const;

const guideLabels: Record<Language, GuidedCopyLabels> = {
  en: {
    doNow: 'Do this now',
    why: 'Why this matters',
    status: 'Status',
    next: 'Next',
    allSteps: 'All steps',
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
    status: 'स्थिति',
    next: 'आगे',
    allSteps: 'सभी चरण',
    stateComplete: 'पूरा',
    stateCurrent: 'अभी',
    stateUpcoming: 'आगे',
    stateSkipped: 'छोड़ा गया',
    stateBlocked: 'रुका हुआ',
    stateSafeStop: 'सुरक्षित रोक',
  },
};

export function getCitizenReviewPresentation(language: Language, simpleMode: boolean) {
  const simpleTable = language === 'hi'
    ? {
      ...tableCopy.hi,
      caption: 'आपके दर्ज किए सबूत',
      field: 'तथ्य',
      observation: 'आपका उत्तर',
      confidence: 'कितना साफ़',
      confirmation: 'किसने जाँचा',
      limitation: 'यह क्या नहीं बताता',
      confidenceHelp: 'यह बताता है कि आपका उत्तर कितना साफ़ है। यह रिकॉर्ड को असली साबित नहीं करता।',
    }
    : {
      ...tableCopy.en,
      caption: 'What you recorded',
      field: 'Fact',
      observation: 'Your answer',
      confidence: 'How clear',
      confirmation: 'Checked by',
      limitation: 'What this cannot show',
      confidenceHelp: 'This says how clear your answer is. It does not prove the record is authentic.',
    };
  const resultSections = simpleMode
    ? language === 'hi'
      ? {
        established: 'क्या साफ़ है',
        unclear: 'क्या साफ़ नहीं है',
        missing: 'आपको अभी क्या चाहिए',
        evidence: 'आपके सबूत के नोट',
        officialRoute: 'आगे कहाँ जाएँ',
      }
      : {
        established: 'What is clear',
        unclear: 'What is not clear',
        missing: 'What you still need',
        evidence: 'Your evidence notes',
        officialRoute: 'Where to go next',
      }
      : language === 'hi'
      ? {
        established: 'क्या साफ़ दिखता है',
        unclear: 'क्या जाँचना है',
        missing: 'कौन से रिकॉर्ड जोड़ने हैं',
        evidence: 'सबूत स्रोत और विश्वास',
        officialRoute: 'सटीक आधिकारिक रास्ता',
      }
      : {
        established: 'What looks clear',
        unclear: 'What to check',
        missing: 'Records to add',
        evidence: 'Evidence sources and confidence',
        officialRoute: 'Exact official route',
      };
  return {
    stages: stagePresentation[language][simpleMode ? 'simple' : 'standard'],
    table: simpleMode ? simpleTable : tableCopy[language],
    resultSections,
    resultLimitationLabel: simpleMode
      ? language === 'hi' ? 'ज़रूरी बात:' : 'Important:'
      : language === 'hi' ? 'सीमा:' : 'Limitation:',
    resultLimitation: simpleMode
      ? language === 'hi'
        ? 'यह नतीजा केवल आपके जाँचे उत्तर उपयोग करता है। ChallanSakshi ने रिकॉर्ड सत्यापित या केस तय नहीं किया।'
        : 'This result uses only answers you checked. ChallanSakshi did not verify the records or decide the case.'
      : language === 'hi'
        ? 'केवल आपके पुष्ट उत्तरों पर आधारित। ChallanSakshi ने रिकॉर्ड प्रमाणित नहीं किए या मामले का निर्णय नहीं किया।'
        : 'Based only on answers you confirmed. ChallanSakshi did not authenticate the records or decide the case.',
    guideLabels: guideLabels[language],
    progressLabel: language === 'hi' ? 'ई-चालान समीक्षा प्रगति' : 'e-Challan review progress',
    sharedInactivityNotice: language === 'hi'
      ? 'सुरक्षा के लिए, 10 मिनट तक कोई जानबूझकर गतिविधि न होने पर यह समीक्षा साफ़ हो जाती है।'
      : 'For safety, this review clears after 10 minutes without deliberate activity.',
    timelineHeading: simpleMode
      ? language === 'hi' ? 'आपने क्या किया' : 'What you did'
      : language === 'hi' ? 'नागरिक-दर्ज समयरेखा' : 'Citizen-recorded timeline',
    summaryHeading: simpleMode
      ? language === 'hi' ? 'आपका स्थानीय सारांश' : 'Your local summary'
      : language === 'hi' ? 'नागरिक सबूत सारांश' : 'Citizen evidence summary',
    summaryHelp: simpleMode
      ? language === 'hi' ? 'यह आपके उत्तरों की स्थानीय कॉपी है। यह कहीं जमा नहीं हुई।' : 'This is a local copy of your answers. It was not submitted anywhere.'
      : language === 'hi' ? 'सारांश में पुष्ट तथ्य, स्रोत, सीमाएँ और आधिकारिक हैंडऑफ शामिल हैं।' : 'The summary includes confirmed facts, sources, limitations, and the official handoff.',
    actions: {
      copy: simpleMode
        ? language === 'hi' ? 'सारांश कॉपी करें' : 'Copy this summary'
        : language === 'hi' ? 'सारांश कॉपी' : 'Copy summary',
      print: simpleMode
        ? language === 'hi' ? 'सारांश प्रिंट करें' : 'Print this summary'
        : language === 'hi' ? 'प्रिंट / पीडीएफ़' : 'Print / Save as PDF',
      download: simpleMode
        ? language === 'hi' ? 'टेक्स्ट फ़ाइल सेव करें' : 'Save a text file'
        : language === 'hi' ? 'टेक्स्ट डाउनलोड' : 'Download .txt',
    },
    disclaimer: {
      en: CITIZEN_DISCLAIMER_EN,
      hi: CITIZEN_DISCLAIMER_HI,
    },
  };
}

const officialHandoffEnglish = {
  eyebrow: 'Prepared for',
  abstainedHeading: 'Official handoff is not ready',
  purpose: {
    'official-grievance-service': 'Official grievance service',
    'official-service': 'Official service',
  },
  verified: 'Route last verified',
  categoryHeading: 'Reviewed category',
  categoryLabel: 'Category value for the official service',
  copyCategory: 'Copy reviewed category',
  descriptionHeading: 'Reviewed description',
  descriptionLabel: 'Description to review before using the official service',
  descriptionCounter: 'of 500 Unicode code points',
  copyDescription: 'Copy reviewed description',
  sharedInstruction: 'Select this reviewed description and type or paste it into the official service yourself.',
  fallback: {
    heading: 'The original official service did not work for you.',
    body: 'This is your report, not a verified government service status. Your field pack and original destination have not changed.',
    openPrefix: 'Open the official services directory',
  },
  roles: {
    self: {
      heading: 'My case',
      confirmation: 'I checked the evidence and my vehicle record, I am entitled to raise this matter, and I have reviewed this description.',
    },
    helper: {
      heading: 'Helping someone present',
      submitBoundary: 'The affected person—not the helper—must independently authenticate, declare, and submit on the official service.',
      confirmations: {
        affectedPersonPresentAndReviewed: 'The affected person is present, checked the evidence and their vehicle record, and confirmed they are entitled to raise this matter.',
        affectedPersonRequestedAndConfirmedPack: 'They asked me to prepare this and have reviewed and confirmed this description.',
      },
    },
  },
  openHeading: 'Open the official service',
  openBody: 'Opens {domain} in a new tab. Sign in, check every field, and submit there yourself. Nothing is sent from ChallanSakshi.',
  openPrefix: 'Open',
  activated: 'Official service opened from this review. ChallanSakshi cannot see what happened there.',
  returnAnnouncements: {
    self: {
      recorded: 'Return note recorded in this tab only. Citizen-reported and unverified; not a submission or official acceptance.',
    },
    helper: {
      recorded: 'Return note recorded in this tab only for the affected person. Affected-person-reported and entered by the present helper; unverified. Not a submission or official acceptance.',
    },
  },
  copyStatusLabel: 'Copy status',
  copyFeedback: {
    category: {
      failed: 'Copy failed. The reviewed category remains visible and selectable; copy it manually. Nothing opened.',
      copied: 'Reviewed category copied. Nothing opened or was submitted.',
    },
    description: {
      failed: 'Copy failed. The reviewed description remains visible and selectable; copy it manually. Nothing opened.',
      copied: 'Reviewed description copied. Nothing opened or was submitted.',
    },
  },
  eligibility: {
    manual: 'This official destination has no verified field-compatible form in this release. Use the official site and review its current options yourself.',
    unresolved: 'The issuing jurisdiction is not confirmed or no current verified route is available. Use only the official services directory.',
    abstained: 'This review does not support a confirmed field pack. Check the missing or unclear evidence before preparing official information.',
  },
  returnHeading: 'What happened on the official service?',
  returnStates: {
    acknowledgementSeen: 'I saw an acknowledgement on the official service',
    portalUnavailable: 'The official portal did not work for me',
    notSubmitted: 'I did not submit',
    correctionNeeded: 'I need to correct my pack',
  },
  referenceLabel: 'Last 4 characters of the official reference, recorded by you',
  returnAuthorization: {
    affectedPersonConfirmedReturn: 'The affected person is still present and confirmed this return note (and the reference characters, if entered).',
  },
  returnReadiness: {
    currentPackRequired: 'Confirm the reviewed description first.',
    officialLinkNotActivated: 'Open the official service from this review first.',
    returnStateRequired: 'Choose what happened on the official service.',
    referenceFragmentIncomplete: 'Enter exactly four reference characters or leave the field blank.',
    affectedPersonPresentRequired: 'The affected person must still be present.',
    affectedPersonRecordingRequestRequired: 'The affected person must confirm this return note.',
    affectedPersonReturnStateConfirmationRequired: 'The affected person must confirm what happened.',
    affectedPersonReferenceConfirmationRequired: 'The affected person must confirm the four reference characters.',
  },
  recordReturn: 'Record this return locally',
  receiptDownload: 'Download redacted continuation receipt',
  helper: {
    heading: 'Optional desktop helper',
    independence: 'The helper is optional. The complete field pack and official link work without it.',
    reviewLink: 'Review desktop helper and installation',
    prepare: 'Already installed? Prepare reviewed fields',
    confirmations: {
      supportedDesktop: 'I am using supported desktop Google Chrome. This is product support, not a security guarantee.',
      boundedSafetyReview: 'I reviewed these fields and removed names, contact details, full vehicle, challan, reference or government-ID numbers, credentials, authentication codes, and payment information.',
      affectedPersonPresent: 'The affected person is still present.',
      affectedPersonReviewedFields: 'The affected person separately reviewed and confirmed the exact fields.',
      affectedPersonRequestedPreparation: 'The affected person asked me to prepare, load, and place these fields.',
    },
    submitBoundary: 'The affected person must inspect the result and independently authenticate, declare, and submit.',
    prepared: 'Prepared on this page only. Open the ChallanSakshi extension on this tab to preview and load the reviewed fields. Nothing has opened or been filled.',
    failed: 'The reviewed fields could not be prepared. Nothing opened or was filled.',
    clear: 'Clear prepared fields',
  },
} as const;

const officialHandoffSimpleEnglish = {
  ...officialHandoffEnglish,
  roles: {
    self: {
      ...officialHandoffEnglish.roles.self,
      confirmation: 'I checked the evidence and my vehicle record, this matter is mine to raise, and I have read this description.',
    },
    helper: {
      ...officialHandoffEnglish.roles.helper,
      submitBoundary: 'The person—not the helper—must sign in, declare, and submit on the official site.',
      confirmations: {
        affectedPersonPresentAndReviewed: 'The person is here, checked the evidence and their vehicle record, and confirmed this matter is theirs to raise.',
        affectedPersonRequestedAndConfirmedPack: 'They asked me to prepare this and have read and confirmed this description.',
      },
    },
  },
  openBody: 'Opens {domain} in a new tab. Sign in, check every field, and send it there yourself. ChallanSakshi sends nothing.',
  returnStates: {
    acknowledgementSeen: 'I saw an acknowledgement',
    portalUnavailable: 'The official site did not work',
    notSubmitted: 'I did not send it',
    correctionNeeded: 'I need to fix my pack',
  },
  returnAnnouncements: {
    self: {
      recorded: 'Your return note is recorded only on this tab and is not verified. ChallanSakshi did not submit it or verify acceptance.',
    },
    helper: {
      recorded: 'Return note for the present person is recorded only on this tab. The helper only typed it; it is not verified. ChallanSakshi did not submit it or verify acceptance.',
    },
  },
  returnAuthorization: {
    affectedPersonConfirmedReturn: 'The person is still here and confirmed this return note (and the reference characters, if entered).',
  },
  helper: {
    ...officialHandoffEnglish.helper,
    independence: 'This helper is optional. You can use the field pack and official link without it.',
  },
} as const;

const officialHandoffHindi = {
  eyebrow: 'इसके लिए तैयार',
  abstainedHeading: 'आधिकारिक हैंडऑफ़ अभी तैयार नहीं है',
  purpose: {
    'official-grievance-service': 'आधिकारिक शिकायत सेवा',
    'official-service': 'आधिकारिक सेवा',
  },
  verified: 'रास्ते की अंतिम जाँच',
  categoryHeading: 'समीक्षित श्रेणी',
  categoryLabel: 'आधिकारिक सेवा के लिए श्रेणी मान',
  copyCategory: 'समीक्षित श्रेणी कॉपी करें',
  descriptionHeading: 'समीक्षित विवरण',
  descriptionLabel: 'आधिकारिक सेवा उपयोग करने से पहले जाँचने वाला विवरण',
  descriptionCounter: '500 यूनिकोड कोड पॉइंट में से',
  copyDescription: 'समीक्षित विवरण कॉपी करें',
  sharedInstruction: 'इस समीक्षित विवरण को चुनें और आधिकारिक सेवा में स्वयं टाइप या पेस्ट करें।',
  fallback: {
    heading: 'मूल आधिकारिक सेवा आपके लिए नहीं चली।',
    body: 'यह आपकी रिपोर्ट है, किसी सरकारी रुकावट की सत्यापित सूचना नहीं। आपका फ़ील्ड पैक और मूल गंतव्य नहीं बदले हैं।',
    openPrefix: 'आधिकारिक सेवा निर्देशिका खोलें',
  },
  roles: {
    self: {
      heading: 'मेरा मामला',
      confirmation: 'मैंने सबूत और अपना वाहन रिकॉर्ड जाँचा है, मुझे यह मामला उठाने का अधिकार है, और मैंने यह विवरण जाँच लिया है।',
    },
    helper: {
      heading: 'मौजूद व्यक्ति की मदद',
      submitBoundary: 'मददगार नहीं, प्रभावित व्यक्ति को आधिकारिक सेवा पर स्वयं प्रमाणीकरण, घोषणा और जमा करना होगा।',
      confirmations: {
        affectedPersonPresentAndReviewed: 'प्रभावित व्यक्ति मौजूद है, उसने सबूत और अपना वाहन रिकॉर्ड जाँचा है, और पुष्टि की है कि उसे यह मामला उठाने का अधिकार है।',
        affectedPersonRequestedAndConfirmedPack: 'उन्होंने मुझसे इसे तैयार करने को कहा है और यह विवरण जाँचकर पुष्ट किया है।',
      },
    },
  },
  openHeading: 'आधिकारिक सेवा खोलें',
  openBody: '{domain} नए टैब में खुलेगा। वहाँ स्वयं साइन इन करें, हर फ़ील्ड जाँचें और जमा करें। ChallanSakshi से कुछ नहीं भेजा जाता।',
  openPrefix: 'आधिकारिक सेवा खोलें',
  activated: 'आधिकारिक सेवा इस समीक्षा से खोली गई। ChallanSakshi वहाँ हुई कार्रवाई नहीं देख सकता।',
  returnAnnouncements: {
    self: {
      recorded: 'वापसी नोट केवल इस टैब में दर्ज हुआ। नागरिक द्वारा बताया गया और असत्यापित; यह जमा या आधिकारिक स्वीकृति नहीं है।',
    },
    helper: {
      recorded: 'प्रभावित व्यक्ति का वापसी नोट केवल इस टैब में दर्ज हुआ। प्रभावित व्यक्ति द्वारा बताया गया और मौजूद मददगार द्वारा दर्ज; असत्यापित। यह जमा या आधिकारिक स्वीकृति नहीं है।',
    },
  },
  copyStatusLabel: 'कॉपी की स्थिति',
  copyFeedback: {
    category: {
      failed: 'कॉपी नहीं हुई। समीक्षित श्रेणी दिखती और चुनी जा सकती है; इसे स्वयं कॉपी करें। कुछ नहीं खुला।',
      copied: 'समीक्षित श्रेणी कॉपी हुई। कुछ नहीं खुला या जमा हुआ।',
    },
    description: {
      failed: 'कॉपी नहीं हुई। समीक्षित विवरण दिखता और चुना जा सकता है; इसे स्वयं कॉपी करें। कुछ नहीं खुला।',
      copied: 'समीक्षित विवरण कॉपी हुआ। कुछ नहीं खुला या जमा हुआ।',
    },
  },
  eligibility: {
    manual: 'इस आधिकारिक गंतव्य के लिए इस रिलीज़ में सत्यापित फ़ील्ड-संगत फ़ॉर्म नहीं है। आधिकारिक साइट उपयोग करें और उसके मौजूदा विकल्प स्वयं जाँचें।',
    unresolved: 'जारी करने वाला क्षेत्र पुष्ट नहीं है या कोई मौजूदा सत्यापित रास्ता उपलब्ध नहीं है। केवल आधिकारिक सेवा निर्देशिका उपयोग करें।',
    abstained: 'यह समीक्षा पुष्ट फ़ील्ड पैक का समर्थन नहीं करती। आधिकारिक जानकारी तैयार करने से पहले गायब या अस्पष्ट सबूत जाँचें।',
  },
  returnHeading: 'आधिकारिक सेवा पर क्या हुआ?',
  returnStates: {
    acknowledgementSeen: 'मुझे आधिकारिक सेवा पर पावती दिखी',
    portalUnavailable: 'आधिकारिक पोर्टल मेरे लिए नहीं चला',
    notSubmitted: 'मैंने जमा नहीं किया',
    correctionNeeded: 'मुझे अपने पैक में सुधार करना है',
  },
  referenceLabel: 'आधिकारिक संदर्भ के अंतिम चार अक्षर, आपके द्वारा दर्ज',
  returnAuthorization: {
    affectedPersonConfirmedReturn: 'प्रभावित व्यक्ति अभी भी मौजूद है और उसने यह वापसी नोट (और दर्ज किए गए संदर्भ अक्षर, यदि कोई हों) पुष्ट किया है।',
  },
  returnReadiness: {
    currentPackRequired: 'पहले समीक्षित विवरण की पुष्टि करें।',
    officialLinkNotActivated: 'पहले इस समीक्षा से आधिकारिक सेवा खोलें।',
    returnStateRequired: 'आधिकारिक सेवा पर क्या हुआ, यह चुनें।',
    referenceFragmentIncomplete: 'संदर्भ के ठीक चार अक्षर दर्ज करें या फ़ील्ड खाली छोड़ें।',
    affectedPersonPresentRequired: 'प्रभावित व्यक्ति का अभी भी मौजूद होना ज़रूरी है।',
    affectedPersonRecordingRequestRequired: 'प्रभावित व्यक्ति को यह वापसी नोट पुष्ट करना होगा।',
    affectedPersonReturnStateConfirmationRequired: 'प्रभावित व्यक्ति को पुष्ट करना होगा कि क्या हुआ।',
    affectedPersonReferenceConfirmationRequired: 'प्रभावित व्यक्ति को संदर्भ के चार अक्षर पुष्ट करने होंगे।',
  },
  recordReturn: 'यह वापसी स्थानीय रूप से दर्ज करें',
  receiptDownload: 'संपादित निरंतरता रसीद डाउनलोड करें',
  helper: {
    heading: 'वैकल्पिक डेस्कटॉप मददगार',
    independence: 'मददगार वैकल्पिक है। पूरा फ़ील्ड पैक और आधिकारिक लिंक इसके बिना काम करते हैं।',
    reviewLink: 'डेस्कटॉप मददगार और इंस्टॉलेशन जाँचें',
    prepare: 'पहले से इंस्टॉल है? समीक्षित फ़ील्ड तैयार करें',
    confirmations: {
      supportedDesktop: 'मैं समर्थित डेस्कटॉप Google Chrome उपयोग कर रहा हूँ। यह उत्पाद समर्थन है, सुरक्षा की गारंटी नहीं।',
      boundedSafetyReview: 'मैंने फ़ील्ड जाँचे और नाम, संपर्क विवरण, पूरे वाहन, चालान, संदर्भ या सरकारी पहचान नंबर, क्रेडेंशियल, प्रमाणीकरण कोड और भुगतान जानकारी हटा दी।',
      affectedPersonPresent: 'प्रभावित व्यक्ति अभी भी मौजूद है।',
      affectedPersonReviewedFields: 'प्रभावित व्यक्ति ने हर फ़ील्ड अलग से जाँचकर पुष्ट किया है।',
      affectedPersonRequestedPreparation: 'प्रभावित व्यक्ति ने मुझसे इन फ़ील्ड को तैयार, लोड और रखने को कहा है।',
    },
    submitBoundary: 'प्रभावित व्यक्ति को नतीजा जाँचकर स्वयं प्रमाणीकरण, घोषणा और जमा करना होगा।',
    prepared: 'केवल इस पेज पर तैयार है। समीक्षित फ़ील्ड का प्रीव्यू और लोड करने के लिए इसी टैब पर ChallanSakshi एक्सटेंशन खोलें। कुछ नहीं खुला या भरा है।',
    failed: 'समीक्षित फ़ील्ड तैयार नहीं हो सके। कुछ नहीं खुला या भरा है।',
    clear: 'तैयार फ़ील्ड साफ़ करें',
  },
} as const;

const officialHandoffSimpleHindi = {
  ...officialHandoffHindi,
  roles: {
    self: {
      ...officialHandoffHindi.roles.self,
      confirmation: 'मैंने सबूत और अपना वाहन रिकॉर्ड देख लिया है, यह मामला उठाना मेरा हक़ है, और यह विवरण मैंने पढ़ लिया है।',
    },
    helper: {
      ...officialHandoffHindi.roles.helper,
      submitBoundary: 'व्यक्ति को खुद साइन इन, घोषणा और आधिकारिक साइट पर जमा करना होगा; मददगार यह नहीं करेगा।',
      confirmations: {
        affectedPersonPresentAndReviewed: 'व्यक्ति यहाँ मौजूद है, उसने सबूत और अपना वाहन रिकॉर्ड देख लिया है, और कहा है कि यह मामला उठाना उसका हक़ है।',
        affectedPersonRequestedAndConfirmedPack: 'उन्होंने मुझसे इसे तैयार करने को कहा है और यह विवरण पढ़कर पुष्ट किया है।',
      },
    },
  },
  openBody: '{domain} नए टैब में खुलेगा। वहाँ खुद साइन इन करें, हर फ़ील्ड देखें और जमा करें। ChallanSakshi कुछ नहीं भेजता।',
  returnStates: {
    acknowledgementSeen: 'मुझे पावती दिखी',
    portalUnavailable: 'आधिकारिक साइट नहीं चली',
    notSubmitted: 'मैंने नहीं भेजा',
    correctionNeeded: 'मुझे अपना पैक ठीक करना है',
  },
  returnAnnouncements: {
    self: {
      recorded: 'आपका वापसी नोट केवल इस टैब में दर्ज है और सत्यापित नहीं है। ChallanSakshi ने इसे जमा नहीं किया या स्वीकृति सत्यापित नहीं की।',
    },
    helper: {
      recorded: 'मौजूद व्यक्ति का वापसी नोट केवल इस टैब में दर्ज है। मददगार ने केवल लिखा; यह सत्यापित नहीं है। ChallanSakshi ने इसे जमा नहीं किया या स्वीकृति सत्यापित नहीं की।',
    },
  },
  returnAuthorization: {
    affectedPersonConfirmedReturn: 'व्यक्ति अभी भी यहाँ है और उसने यह वापसी नोट (और लिखे गए संदर्भ अक्षर, अगर कोई हों) पुष्ट किया है।',
  },
  helper: {
    ...officialHandoffHindi.helper,
    independence: 'यह मददगार वैकल्पिक है। फ़ील्ड पैक और आधिकारिक लिंक इसके बिना भी काम करते हैं।',
  },
} as const;

export function getOfficialHandoffPresentation(language: Language, simpleMode: boolean) {
  if (language === 'hi') return simpleMode ? officialHandoffSimpleHindi : officialHandoffHindi;
  return simpleMode ? officialHandoffSimpleEnglish : officialHandoffEnglish;
}

const evidenceFields: Record<string, string> = {
  'Registration plate': 'नंबर प्लेट',
  'Vehicle category': 'वाहन श्रेणी',
  'Vehicle colour': 'वाहन रंग',
  'Alleged offence': 'आरोपित अपराध',
  'Evidence timestamp': 'सबूत समय',
  'Evidence location': 'सबूत स्थान',
  'Citizen vehicle record': 'नागरिक वाहन रिकॉर्ड',
  'Official notice copy': 'आधिकारिक नोटिस की कॉपी',
  'Event-time custody record': 'घटना-समय अभिरक्षा रिकॉर्ड',
};

const evidenceValues: Record<string, string> = {
  match: 'मेल खाता',
  different: 'अलग',
  unclear: 'अस्पष्ट',
  'not visible': 'दिखाई नहीं देता',
  'appears visible': 'दिखाई देता है',
  'not assessable from still': 'एक तस्वीर से तय नहीं',
  displayed: 'दिखाया गया',
  'not found': 'नहीं मिला',
  present: 'उपलब्ध',
  missing: 'गायब',
  'not applicable': 'लागू नहीं',
};

const limitations: Record<string, string> = {
  'The citizen recorded that the supplied still is unclear.': 'नागरिक ने दर्ज किया कि दी गई तस्वीर अस्पष्ट है।',
  'The citizen recorded that the supplied still does not show the registration plate clearly.': 'नागरिक ने दर्ज किया कि दी गई तस्वीर में नंबर प्लेट साफ़ नहीं दिखती।',
  'The citizen recorded that the supplied still does not show the vehicle category clearly.': 'नागरिक ने दर्ज किया कि दी गई तस्वीर में वाहन श्रेणी साफ़ नहीं दिखती।',
  'The citizen recorded that the supplied still does not show the vehicle colour clearly.': 'नागरिक ने दर्ज किया कि दी गई तस्वीर में वाहन का रंग साफ़ नहीं दिखता।',
  'The citizen recorded that the alleged offence is not visible in the supplied still.': 'नागरिक ने दर्ज किया कि आरोपित अपराध दी गई तस्वीर में नहीं दिखता।',
  'The citizen recorded that the alleged offence cannot be assessed from the supplied still.': 'नागरिक ने दर्ज किया कि आरोपित अपराध एक तस्वीर से तय नहीं किया जा सकता।',
  'The citizen recorded that the timestamp is unclear in the supplied evidence.': 'नागरिक ने दर्ज किया कि सबूत में समय अस्पष्ट है।',
  'The citizen could not find a timestamp in the supplied evidence.': 'नागरिक को दिए गए सबूत में समय नहीं मिला।',
  'The citizen recorded that the location is unclear in the supplied evidence.': 'नागरिक ने दर्ज किया कि सबूत में स्थान अस्पष्ट है।',
  'The citizen could not find a location in the supplied evidence.': 'नागरिक को दिए गए सबूत में स्थान नहीं मिला।',
  'The citizen did not confirm this observation against an inspected supplied still.': 'नागरिक ने इस अवलोकन को देखी हुई तस्वीर से पुष्ट नहीं किया।',
  'The citizen did not record a readable vehicle record for this comparison.': 'नागरिक ने तुलना के लिए पढ़ने योग्य वाहन रिकॉर्ड दर्ज नहीं किया।',
};

const simpleLimitationsEn: Record<string, string> = {
  'The citizen recorded that the supplied still is unclear.': 'The photo is not clear enough to decide.',
  'The citizen recorded that the supplied still does not show the registration plate clearly.': 'The number plate is not clear enough to read.',
  'The citizen recorded that the supplied still does not show the vehicle category clearly.': 'The vehicle type is not clear enough to identify.',
  'The citizen recorded that the supplied still does not show the vehicle colour clearly.': 'The vehicle colour is not clear enough to identify.',
  'The citizen recorded that the alleged offence is not visible in the supplied still.': 'The alleged offence cannot be seen in this photo.',
  'The citizen recorded that the alleged offence cannot be assessed from the supplied still.': 'One photo cannot show whether this offence happened.',
  'The citizen recorded that the timestamp is unclear in the supplied evidence.': 'The time is not clear.',
  'The citizen could not find a timestamp in the supplied evidence.': 'No time was found.',
  'The citizen recorded that the location is unclear in the supplied evidence.': 'The place is not clear.',
  'The citizen could not find a location in the supplied evidence.': 'No place was found.',
  'The citizen did not confirm this observation against an inspected supplied still.': 'The supplied photo was not checked for this answer.',
  'The citizen did not record a readable vehicle record for this comparison.': 'A readable vehicle record is still needed.',
};

const simpleLimitationsHi: Record<string, string> = {
  'The citizen recorded that the supplied still is unclear.': 'तस्वीर निर्णय के लिए पर्याप्त साफ़ नहीं है।',
  'The citizen recorded that the supplied still does not show the registration plate clearly.': 'नंबर प्लेट साफ़ नहीं पढ़ी जा सकती।',
  'The citizen recorded that the supplied still does not show the vehicle category clearly.': 'वाहन का प्रकार साफ़ नहीं दिखता।',
  'The citizen recorded that the supplied still does not show the vehicle colour clearly.': 'वाहन का रंग साफ़ नहीं दिखता।',
  'The citizen recorded that the alleged offence is not visible in the supplied still.': 'इस तस्वीर में आरोपित अपराध नहीं दिखता।',
  'The citizen recorded that the alleged offence cannot be assessed from the supplied still.': 'एक तस्वीर से यह अपराध तय नहीं हो सकता।',
  'The citizen recorded that the timestamp is unclear in the supplied evidence.': 'समय साफ़ नहीं है।',
  'The citizen could not find a timestamp in the supplied evidence.': 'समय नहीं मिला।',
  'The citizen recorded that the location is unclear in the supplied evidence.': 'स्थान साफ़ नहीं है।',
  'The citizen could not find a location in the supplied evidence.': 'स्थान नहीं मिला।',
  'The citizen did not confirm this observation against an inspected supplied still.': 'इस उत्तर के लिए दी गई तस्वीर नहीं जाँची गई।',
  'The citizen did not record a readable vehicle record for this comparison.': 'पढ़ने योग्य वाहन रिकॉर्ड अभी चाहिए।',
};

export function localizeEvidenceField(value: string, language: Language) {
  return language === 'hi' ? evidenceFields[value] ?? value : value;
}

export function localizeEvidenceValue(value: string, language: Language) {
  return language === 'hi' ? evidenceValues[value] ?? value : value;
}

export function localizeEvidenceConfidence(value: string, language: Language) {
  if (language === 'en') return value;
  return ({ high: 'उच्च', medium: 'मध्यम', low: 'कम', inconclusive: 'अनिर्णायक' } as Record<string, string>)[value] ?? value;
}

export function localizeEvidenceConfirmation(value: string, language: Language) {
  if (language === 'en') return value;
  return ({ confirmed: 'नागरिक द्वारा पुष्ट', unconfirmed: 'अपुष्ट', corrected: 'सुधारा गया' } as Record<string, string>)[value] ?? value;
}

export function localizeEvidenceLimitation(
  value: string | undefined,
  language: Language,
  simpleMode = false,
) {
  if (!value) return value;
  if (simpleMode) {
    return language === 'hi'
      ? simpleLimitationsHi[value] ?? limitations[value] ?? value
      : simpleLimitationsEn[value] ?? value;
  }
  if (language === 'en') return value;
  return limitations[value] ?? value;
}

const assessmentHi: Record<string, string> = {
  'The record source has not been selected.': 'रिकॉर्ड का स्रोत नहीं चुना गया है।',
  'The notice has not yet been independently checked on an official service.': 'नोटिस की अभी आधिकारिक सेवा पर स्वतंत्र जाँच नहीं हुई है।',
  'The officially supplied image has not been inspected.': 'आधिकारिक रूप से दी गई तस्वीर नहीं देखी गई है।',
  'You recorded that the readable plate details differ.': 'आपने दर्ज किया कि पढ़ने योग्य नंबर प्लेट विवरण अलग हैं।',
  'You recorded that the vehicle category differs.': 'आपने दर्ज किया कि वाहन श्रेणी अलग है।',
  'You recorded a colour difference.': 'आपने रंग का अंतर दर्ज किया।',
  'You recorded that the alleged offence is not visible in the supplied image.': 'आपने दर्ज किया कि आरोपित अपराध दी गई तस्वीर में नहीं दिखता।',
  'You could not find a timestamp in the supplied evidence.': 'आपको दिए गए सबूत में समय नहीं मिला।',
  'You could not find a location in the supplied evidence.': 'आपको दिए गए सबूत में स्थान नहीं मिला।',
  'A vehicle record you can compare against': 'तुलना के लिए पढ़ने योग्य वाहन रिकॉर्ड',
  'A readable independent vehicle record you can compare against': 'तुलना के लिए पढ़ने योग्य स्वतंत्र वाहन रिकॉर्ड',
  'A copy of the official notice': 'आधिकारिक नोटिस की कॉपी',
  'Any available event-time custody record (context only)': 'घटना समय का उपलब्ध अभिरक्षा रिकॉर्ड, केवल संदर्भ के लिए',
  'Official notice or official-service status': 'आधिकारिक नोटिस या सेवा स्थिति',
  'Officially supplied evidence image': 'आधिकारिक रूप से दी गई सबूत तस्वीर',
  'These are your observations. ChallanSakshi did not inspect or authenticate the records.': 'ये आपके अवलोकन हैं। ChallanSakshi ने रिकॉर्ड देखे या प्रमाणित नहीं किए।',
  'A colour difference alone is not treated as an action-ready vehicle mismatch.': 'केवल रंग का अंतर कार्रवाई योग्य वाहन बेमेल नहीं माना जाता।',
  'A still image may not be able to establish every alleged offence.': 'एक स्थिर तस्वीर हर आरोपित अपराध स्थापित नहीं कर सकती।',
  'A readable vehicle record is required before treating a plate or category observation as a comparison.': 'नंबर प्लेट या श्रेणी के अवलोकन को तुलना मानने से पहले पढ़ने योग्य वाहन रिकॉर्ड चाहिए।',
  'A vehicle-mismatch worksheet should not be prepared without first inspecting the evidence the authority supplied.': 'प्राधिकरण द्वारा दिए सबूत को देखे बिना वाहन-बेमेल तैयारी पत्र नहीं बनाना चाहिए।',
  'Do not pay, call, or open a portal from the message. Independently type or open the official e-Challan or state service.': 'संदेश से भुगतान, कॉल या पोर्टल न खोलें। आधिकारिक ई-चालान या राज्य सेवा स्वयं खोलें।',
};

const assessmentSimpleEn: Record<string, string> = {
  'The record source has not been selected.': 'Choose where the record came from.',
  'The notice has not yet been independently checked on an official service.': 'Check the notice on an official service.',
  'The officially supplied image has not been inspected.': 'Check the supplied photo first.',
  'You recorded that the readable plate details differ.': 'The number plate looks different.',
  'You recorded that the vehicle category differs.': 'The vehicle type looks different.',
  'You recorded a colour difference.': 'The vehicle colour looks different.',
  'You recorded that the alleged offence is not visible in the supplied image.': 'The alleged offence is not visible in the photo.',
  'You could not find a timestamp in the supplied evidence.': 'No time was found in the evidence.',
  'You could not find a location in the supplied evidence.': 'No place was found in the evidence.',
  'A vehicle record you can compare against': 'A readable vehicle record',
  'A readable independent vehicle record you can compare against': 'A readable independent vehicle record',
  'A copy of the official notice': 'The official notice copy',
  'Any available event-time custody record (context only)': 'Any record showing who had the vehicle then',
  'Official notice or official-service status': 'The official notice or current status',
  'Officially supplied evidence image': 'The photo supplied with the notice',
  'These are your observations. ChallanSakshi did not inspect or authenticate the records.': 'These are your answers. ChallanSakshi did not check the records.',
  'A colour difference alone is not treated as an action-ready vehicle mismatch.': 'Colour alone is not enough to claim the vehicle is different.',
  'A still image may not be able to establish every alleged offence.': 'One photo may not show whether every offence happened.',
  'A readable vehicle record is required before treating a plate or category observation as a comparison.': 'A readable vehicle record is needed before comparing the plate or vehicle type.',
  'A vehicle-mismatch worksheet should not be prepared without first inspecting the evidence the authority supplied.': 'Check the supplied evidence before preparing a mismatch note.',
  'Do not pay, call, or open a portal from the message. Independently type or open the official e-Challan or state service.': 'Do not use the message link. Open the official service yourself.',
};

const assessmentSimpleHi: Record<string, string> = {
  'The record source has not been selected.': 'रिकॉर्ड कहाँ से मिला, यह चुनें।',
  'The notice has not yet been independently checked on an official service.': 'नोटिस आधिकारिक सेवा पर जाँचें।',
  'The officially supplied image has not been inspected.': 'पहले दी गई तस्वीर जाँचें।',
  'You recorded that the readable plate details differ.': 'नंबर प्लेट अलग दिखती है।',
  'You recorded that the vehicle category differs.': 'वाहन का प्रकार अलग दिखता है।',
  'You recorded a colour difference.': 'वाहन का रंग अलग दिखता है।',
  'You recorded that the alleged offence is not visible in the supplied image.': 'तस्वीर में आरोपित अपराध नहीं दिखता।',
  'You could not find a timestamp in the supplied evidence.': 'सबूत में समय नहीं मिला।',
  'You could not find a location in the supplied evidence.': 'सबूत में स्थान नहीं मिला।',
  'A vehicle record you can compare against': 'पढ़ने योग्य वाहन रिकॉर्ड',
  'A readable independent vehicle record you can compare against': 'पढ़ने योग्य स्वतंत्र वाहन रिकॉर्ड',
  'A copy of the official notice': 'आधिकारिक नोटिस की कॉपी',
  'Any available event-time custody record (context only)': 'उस समय वाहन किसके पास था, उसका रिकॉर्ड',
  'Official notice or official-service status': 'आधिकारिक नोटिस या मौजूदा स्थिति',
  'Officially supplied evidence image': 'नोटिस के साथ दी गई तस्वीर',
  'These are your observations. ChallanSakshi did not inspect or authenticate the records.': 'ये आपके उत्तर हैं। ChallanSakshi ने रिकॉर्ड नहीं जाँचे।',
  'A colour difference alone is not treated as an action-ready vehicle mismatch.': 'केवल रंग से वाहन अलग नहीं माना जा सकता।',
  'A still image may not be able to establish every alleged offence.': 'एक तस्वीर हर अपराध साबित नहीं कर सकती।',
  'A readable vehicle record is required before treating a plate or category observation as a comparison.': 'नंबर प्लेट या वाहन प्रकार की तुलना के लिए पढ़ने योग्य वाहन रिकॉर्ड चाहिए।',
  'A vehicle-mismatch worksheet should not be prepared without first inspecting the evidence the authority supplied.': 'बेमेल नोट बनाने से पहले दी गई तस्वीर जाँचें।',
  'Do not pay, call, or open a portal from the message. Independently type or open the official e-Challan or state service.': 'संदेश का लिंक उपयोग न करें। आधिकारिक सेवा स्वयं खोलें।',
};

export function localizeAssessmentItems(
  items: string[],
  language: Language,
  simpleMode = false,
) {
  if (simpleMode) {
    const dictionary = language === 'hi' ? assessmentSimpleHi : assessmentSimpleEn;
    return items.map((item) => dictionary[item] ?? (language === 'hi' ? assessmentHi[item] : undefined) ?? item);
  }
  return language === 'hi' ? items.map((item) => assessmentHi[item] ?? item) : [...items];
}

export function localizeAssessment(
  assessment: CitizenReviewAssessment,
  language: Language,
  simpleMode = false,
) {
  return {
    materialSignals: localizeAssessmentItems(assessment.materialSignals, language, simpleMode),
    cautions: localizeAssessmentItems(assessment.cautions, language, simpleMode),
    missingEvidence: localizeAssessmentItems(assessment.missingEvidence, language, simpleMode),
  };
}

export function localizeDeadline(deadline: OfficialDeadlineStatus, language: Language, simpleMode: boolean) {
  if (language === 'hi') {
    if (deadline.status === 'open') return simpleMode
      ? `कॉपी की तारीख तक ${deadline.daysRemaining} दिन बाकी`
      : `कॉपी की गई आधिकारिक तारीख तक ${deadline.daysRemaining} कैलेंडर दिन`;
    if (deadline.status === 'today') return 'कॉपी की गई आधिकारिक तारीख आज है';
    return 'कॉपी की गई आधिकारिक तारीख बीत चुकी है';
  }
  if (deadline.status === 'open') return simpleMode
    ? `${deadline.daysRemaining} days until the copied date`
    : `${deadline.daysRemaining} calendar days to the copied official date`;
  if (deadline.status === 'today') return 'The copied official date is today';
  return 'The copied official date has passed';
}
