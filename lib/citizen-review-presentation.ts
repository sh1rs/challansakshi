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
      safety: {
        heading: 'Set the privacy boundary',
        help: 'Choose who is reviewing, what kind of device this is, and each safety acknowledgement.',
        action: 'Continue safely',
      },
      source: {
        heading: 'Open the official service',
        help: 'Choose the official route yourself, record how you obtained the copy, then choose a local file or manual facts.',
        action: 'Continue to fact checking',
      },
      observations: {
        heading: 'Check the selected record beside every fact',
        help: 'Record only what you can personally read. Mark anything else unclear or not supplied.',
        action: 'Decide and resolve',
      },
      result: {
        heading: 'What your confirmed entries support',
        help: 'Read the conservative finding, missing evidence, timeline, and exact official route.',
        action: 'Edit answers',
      },
    },
    simple: {
      safety: {
        heading: 'Choose a safe way to start',
        help: 'Tell us who is checking and whether this device is yours or shared.',
        action: 'Start',
      },
      source: {
        heading: 'Find the record yourself',
        help: 'Open an official service. Then choose a file here or type the facts yourself.',
        action: 'Check the facts',
      },
      observations: {
        heading: 'Check one fact at a time',
        help: 'Choose what you can see. Use unclear when you cannot tell.',
        action: 'See the result',
      },
      result: {
        heading: 'What your answers show',
        help: 'Read what is clear, what is missing, and where to go next.',
        action: 'Change answers',
      },
    },
  },
  hi: {
    standard: {
      safety: {
        heading: 'गोपनीयता सीमा तय करें',
        help: 'समीक्षक, डिवाइस का प्रकार और हर सुरक्षा स्वीकृति चुनें।',
        action: 'सुरक्षित रूप से आगे',
      },
      source: {
        heading: 'आधिकारिक सेवा खोलें',
        help: 'आधिकारिक रास्ता स्वयं चुनें, कॉपी मिलने का तरीका दर्ज करें, फिर स्थानीय फ़ाइल या मैन्युअल तथ्य चुनें।',
        action: 'तथ्य जाँच पर आगे',
      },
      observations: {
        heading: 'हर तथ्य के साथ चुना रिकॉर्ड जाँचें',
        help: 'केवल वही दर्ज करें जो आप स्वयं पढ़ सकें। बाकी को अस्पष्ट या नहीं दिया गया चिह्नित करें।',
        action: 'निर्णय और समाधान',
      },
      result: {
        heading: 'आपकी पुष्ट प्रविष्टियाँ क्या दिखाती हैं',
        help: 'सावधान नतीजा, गायब सबूत, समयरेखा और सटीक आधिकारिक रास्ता पढ़ें।',
        action: 'उत्तर बदलें',
      },
    },
    simple: {
      safety: {
        heading: 'सुरक्षित शुरुआत चुनें',
        help: 'बताएँ कौन जाँच रहा है और डिवाइस निजी है या साझा।',
        action: 'शुरू करें',
      },
      source: {
        heading: 'रिकॉर्ड स्वयं खोजें',
        help: 'आधिकारिक सेवा खोलें। फिर फ़ाइल चुनें या तथ्य स्वयं लिखें।',
        action: 'तथ्य जाँचें',
      },
      observations: {
        heading: 'एक-एक तथ्य जाँचें',
        help: 'जो दिखे वही चुनें। तय न हो तो अस्पष्ट चुनें।',
        action: 'नतीजा देखें',
      },
      result: {
        heading: 'आपके उत्तर क्या दिखाते हैं',
        help: 'क्या साफ़ है, क्या गायब है और आगे कहाँ जाना है, पढ़ें।',
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

const evidenceFields: Record<string, string> = {
  'Registration plate': 'नंबर प्लेट',
  'Vehicle category': 'वाहन श्रेणी',
  'Vehicle colour': 'वाहन रंग',
  'Alleged offence': 'आरोपित अपराध',
  'Evidence timestamp': 'सबूत समय',
  'Evidence location': 'सबूत स्थान',
  'Citizen vehicle record': 'नागरिक वाहन रिकॉर्ड',
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
