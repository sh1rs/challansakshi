import type { Language, LocalizedText } from './domain';

export type ResolutionIssueId =
  | 'wrong-evidence'
  | 'unclear-evidence'
  | 'grievance-rejected'
  | 'no-recorded-decision'
  | 'virtual-court'
  | 'payment-pending'
  | 'access-or-receipt';

export type ResolutionStage = 'evidence' | 'authority' | 'court' | 'payment';

export interface ResolutionIssue {
  id: ResolutionIssueId;
  icon: string;
  stage: ResolutionStage;
  title: LocalizedText;
  shortDescription: LocalizedText;
  resultLabel: LocalizedText;
  example: LocalizedText;
}

export interface ResolutionRoute {
  id: ResolutionIssueId;
  eyebrow: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  suppliedRecord: LocalizedText;
  cannotConclude: LocalizedText;
  doNow: LocalizedText[];
  keepReady: LocalizedText[];
  avoid: LocalizedText;
  officialLinks: Array<{ label: LocalizedText; href: string }>;
}

export interface TriageResult {
  issueId: ResolutionIssueId | null;
  confidence: 'matched' | 'ambiguous' | 'fallback';
  matchedTerms: string[];
  candidateIds: ResolutionIssueId[];
}

export interface PostRejectionWindow {
  orderDate: string;
  referenceDate: string;
  indicativeBoundary: string;
  elapsedDays: number;
  daysRemaining: number;
  status: 'open' | 'final-day' | 'expired';
}

export type PaymentScenarioId = 'status-conflict' | 'identifier-mismatch' | 'aligned';
export type PaymentFinding = 'status-conflict' | 'cannot-reconcile' | 'aligned';

export interface PaymentSnapshot {
  id: PaymentScenarioId;
  label: LocalizedText;
  challanNumber: string;
  receiptChallanNumber: string;
  challanAmountInr: number;
  receiptAmountInr: number;
  transactionReference: string | null;
  receiptResult: 'successful' | 'pending' | 'failed';
  displayedStatus: 'pending' | 'paid' | 'forwarded-to-virtual-court';
  paidAt: string;
  statusCapturedAt: string;
}

export interface PaymentReconciliation {
  finding: PaymentFinding;
  identifiersMatch: boolean;
  amountsMatch: boolean;
  limitations: string[];
  nextAction: 'verify-pending-transaction' | 'verify-identifiers' | 'preserve-receipt';
}

export const resolutionIssues: ResolutionIssue[] = [
  {
    id: 'wrong-evidence',
    icon: '≠',
    stage: 'evidence',
    title: { en: 'The photo shows another vehicle', hi: 'फ़ोटो में दूसरा वाहन दिखता है' },
    shortDescription: { en: 'Compare the image with a verified vehicle record before contesting.', hi: 'आपत्ति से पहले फ़ोटो और पक्के वाहन रिकॉर्ड की तुलना करें।' },
    resultLabel: { en: 'Evidence finding + contest pack', hi: 'सबूत का नतीजा + आपत्ति पैक' },
    example: { en: 'The photo shows a different vehicle', hi: 'फ़ोटो में मेरी गाड़ी नहीं है' },
  },
  {
    id: 'unclear-evidence',
    icon: '?',
    stage: 'evidence',
    title: { en: 'The supplied image is unclear', hi: 'दी गई फ़ोटो साफ़ नहीं है' },
    shortDescription: { en: 'Separate an unreadable record from a supported mismatch claim.', hi: 'धुंधले रिकॉर्ड को वाहन बेमेल के दावे से अलग रखें।' },
    resultLabel: { en: 'Limitations + clarification request', hi: 'सीमाएँ + स्पष्टीकरण अनुरोध' },
    example: { en: 'The number plate is blurry', hi: 'नंबर प्लेट साफ़ नहीं है' },
  },
  {
    id: 'grievance-rejected',
    icon: '×',
    stage: 'authority',
    title: { en: 'My grievance was rejected', hi: 'मेरी आपत्ति अस्वीकार हो गई' },
    shortDescription: { en: 'Preserve the recorded reasons and see the time-sensitive official routes.', hi: 'दर्ज कारण सुरक्षित रखें और समय से जुड़े आधिकारिक रास्ते देखें।' },
    resultLabel: { en: 'Post-decision route + clock', hi: 'फैसले के बाद रास्ता + समय-सीमा' },
    example: { en: 'My grievance was rejected', hi: 'मेरी आपत्ति अस्वीकार हो गई' },
  },
  {
    id: 'no-recorded-decision',
    icon: '…',
    stage: 'authority',
    title: { en: 'No grievance decision is recorded', hi: 'आपत्ति का कोई फैसला दर्ज नहीं है' },
    shortDescription: { en: 'Compare the acknowledgement date with the stated response period and prepare a neutral status follow-up.', hi: 'पावती की तारीख और बताई प्रतिक्रिया अवधि मिलाकर तटस्थ स्थिति अनुरोध तैयार करें।' },
    resultLabel: { en: 'Response clock + status follow-up', hi: 'प्रतिक्रिया समय + स्थिति अनुरोध' },
    example: { en: 'No grievance reply for 30 days', hi: '30 दिन से आपत्ति का जवाब नहीं मिला' },
  },
  {
    id: 'virtual-court',
    icon: '§',
    stage: 'court',
    title: { en: 'The case moved to Virtual Court', hi: 'मामला वर्चुअल कोर्ट में चला गया' },
    shortDescription: { en: 'Understand the official search, verification, and contest handoff sequence.', hi: 'आधिकारिक खोज, सत्यापन और आपत्ति प्रक्रिया समझें।' },
    resultLabel: { en: 'Court handoff checklist', hi: 'कोर्ट प्रक्रिया की सूची' },
    example: { en: 'The case moved to Virtual Court', hi: 'मामला वर्चुअल कोर्ट में चला गया' },
  },
  {
    id: 'payment-pending',
    icon: '₹',
    stage: 'payment',
    title: { en: 'I paid, but status still says pending', hi: 'भुगतान हुआ, पर स्थिति अभी पेंडिंग है' },
    shortDescription: { en: 'Compare a fictional receipt, challan, and status snapshot before paying again.', hi: 'दोबारा भुगतान से पहले काल्पनिक रसीद, चालान और स्थिति मिलाएँ।' },
    resultLabel: { en: 'Reconciliation + safe next step', hi: 'मिलान + सुरक्षित अगला कदम' },
    example: { en: 'Payment succeeded, but status is pending', hi: 'भुगतान सफल है, लेकिन स्थिति पेंडिंग है' },
  },
  {
    id: 'access-or-receipt',
    icon: '↺',
    stage: 'payment',
    title: { en: 'Phone number or receipt problem', hi: 'फ़ोन नंबर या रसीद की समस्या' },
    shortDescription: { en: 'Find the official alternative-verification or receipt-reprint route.', hi: 'आधिकारिक वैकल्पिक सत्यापन या रसीद दोबारा पाने का रास्ता देखें।' },
    resultLabel: { en: 'Recovery route', hi: 'रिकवरी का रास्ता' },
    example: { en: 'Wrong phone number or missing receipt', hi: 'फ़ोन नंबर गलत है या रसीद नहीं मिली' },
  },
];

const officialEChallan = 'https://echallan.parivahan.gov.in/';
const officialVirtualCourt = 'https://vcourts.gov.in/virtualcourt/index.php';
const officialVirtualCourtFaq = 'https://vcourts.gov.in/virtualcourt/faq.php/web_info.php';
const officialRule = 'https://morth.gov.in/sites/default/files/Final%20Notification%20for%20amendement%20in%20Rule%20167%20and%20167A-1.pdf';

export const resolutionRoutes: Record<ResolutionIssueId, ResolutionRoute> = {
  'wrong-evidence': {
    id: 'wrong-evidence',
    eyebrow: { en: 'Evidence route', hi: 'सबूत का रास्ता' },
    title: { en: 'Compare the accusation with your verified record', hi: 'आरोप और पक्के रिकॉर्ड की तुलना करें' },
    summary: { en: 'Use the flagship evidence flow to verify each observation before a mismatch finding or contest draft is created.', hi: 'वाहन बेमेल का नतीजा या मसौदा बनने से पहले हर जानकारी जाँचने के लिए मुख्य डेमो खोलें।' },
    suppliedRecord: { en: 'The fictional photo and vehicle record appear to describe different vehicles.', hi: 'काल्पनिक फ़ोटो और वाहन रिकॉर्ड अलग वाहन बताते दिखते हैं।' },
    cannotConclude: { en: 'A comparison cannot decide legality, rider identity, innocence, or the authority’s final outcome.', hi: 'तुलना से वैधता, चालक की पहचान, निर्दोषता या अंतिम नतीजा तय नहीं होता।' },
    doNow: [
      { en: 'Review the challan, enforcement image, and vehicle record side by side.', hi: 'चालान, प्रवर्तन फ़ोटो और वाहन रिकॉर्ड साथ रखकर देखें।' },
      { en: 'Correct every extracted observation before confirming it.', hi: 'पुष्टि से पहले हर निकाली गई जानकारी सुधारें।' },
      { en: 'Prepare a source-indexed contest only if the verified facts support one.', hi: 'सिर्फ़ पक्के तथ्य समर्थन करें तो स्रोत वाली आपत्ति तैयार करें।' },
    ],
    keepReady: [
      { en: 'The supplied challan and enforcement image', hi: 'दिया गया चालान और प्रवर्तन फ़ोटो' },
      { en: 'A current vehicle record and photograph', hi: 'मौजूदा वाहन रिकॉर्ड और फ़ोटो' },
    ],
    avoid: { en: 'Do not call the challan illegal or identify another rider from an image.', hi: 'चालान को गैरकानूनी न कहें और फ़ोटो से दूसरे चालक की पहचान न करें।' },
    officialLinks: [{ label: { en: 'Official e-Challan portal', hi: 'आधिकारिक ई-चालान पोर्टल' }, href: officialEChallan }],
  },
  'unclear-evidence': {
    id: 'unclear-evidence',
    eyebrow: { en: 'Clarification route', hi: 'स्पष्टीकरण का रास्ता' },
    title: { en: 'Document what the image cannot reliably show', hi: 'जो फ़ोटो भरोसे से नहीं दिखाती, उसे साफ़ लिखें' },
    summary: { en: 'An unreadable plate or missing scene context supports a clarification request—not an invented vehicle mismatch.', hi: 'न पढ़ा जा सकने वाला नंबर या अधूरा दृश्य स्पष्टीकरण माँगने का आधार है—गढ़े हुए वाहन बेमेल का नहीं।' },
    suppliedRecord: { en: 'The fictional image does not reliably show the plate or enough context to assess the allegation.', hi: 'काल्पनिक फ़ोटो में नंबर या आरोप जाँचने लायक पूरा दृश्य साफ़ नहीं है।' },
    cannotConclude: { en: 'An unclear image does not prove that the offence did not happen.', hi: 'धुंधली फ़ोटो से यह साबित नहीं होता कि उल्लंघन हुआ ही नहीं।' },
    doNow: [
      { en: 'Record exactly which plate characters or scene elements are unreadable.', hi: 'कौन-से अक्षर या दृश्य हिस्से पढ़े नहीं जा सकते, साफ़ लिखें।' },
      { en: 'Ask the designated authority to review the original-resolution evidence.', hi: 'संबंधित प्राधिकरण से मूल गुणवत्ता वाला सबूत जाँचने को कहें।' },
      { en: 'Keep the request neutral: ask for clarification rather than alleging a mismatch.', hi: 'अनुरोध तटस्थ रखें: वाहन बेमेल का आरोप लगाने के बजाय स्पष्टीकरण माँगें।' },
    ],
    keepReady: [
      { en: 'The supplied low-resolution image', hi: 'दी गई कम गुणवत्ता वाली फ़ोटो' },
      { en: 'A note of every missing or unreadable element', hi: 'हर गायब या न पढ़े जा सकने वाले हिस्से की सूची' },
    ],
    avoid: { en: 'Never guess hidden plate characters or claim that missing context proves innocence.', hi: 'छिपे नंबर का अनुमान न लगाएँ और अधूरे दृश्य को निर्दोषता का सबूत न कहें।' },
    officialLinks: [{ label: { en: 'Official e-Challan portal', hi: 'आधिकारिक ई-चालान पोर्टल' }, href: officialEChallan }],
  },
  'grievance-rejected': {
    id: 'grievance-rejected',
    eyebrow: { en: 'Post-decision route', hi: 'फैसले के बाद का रास्ता' },
    title: { en: 'Preserve the reasons before choosing the next route', hi: 'अगला रास्ता चुनने से पहले दर्ज कारण सुरक्षित रखें' },
    summary: { en: 'The central rule describes a time-limited choice after a reasoned rejection. The route and deposit method can be state-specific.', hi: 'केंद्रीय नियम कारण सहित अस्वीकृति के बाद समय-सीमित विकल्प बताता है। तरीका और जमा की प्रक्रिया राज्य के अनुसार बदल सकती है।' },
    suppliedRecord: { en: 'A fictional order records that the submitted material did not establish a material vehicle mismatch.', hi: 'काल्पनिक आदेश में लिखा है कि जमा सामग्री से वाहन का बड़ा अंतर स्थापित नहीं हुआ।' },
    cannotConclude: { en: 'ChallanSakshi cannot decide whether to pay or seek court review, or whether the order is legally correct.', hi: 'ChallanSakshi यह तय नहीं कर सकता कि भुगतान करें या अदालत जाएँ, या आदेश कानूनी रूप से सही है।' },
    doNow: [
      { en: 'Download the reasoned order and preserve the submitted evidence index.', hi: 'कारण सहित आदेश और जमा सबूतों की सूची डाउनलोड कर सुरक्षित रखें।' },
      { en: 'Verify the order date and the current state-specific payment or court route.', hi: 'आदेश की तारीख और राज्य का मौजूदा भुगतान या अदालत वाला रास्ता जाँचें।' },
      { en: 'If considering court review, confirm the appropriate court and any state-specified deposit method.', hi: 'अदालत जाने पर सही अदालत और राज्य द्वारा बताए जमा तरीके की पुष्टि करें।' },
    ],
    keepReady: [
      { en: 'Reasoned rejection order', hi: 'कारण सहित अस्वीकृति आदेश' },
      { en: 'Original contest pack and acknowledgement', hi: 'मूल आपत्ति पैक और पावती' },
    ],
    avoid: { en: 'Do not assume that the central rule’s 50% deposit process is implemented identically in every state.', hi: 'यह न मानें कि केंद्रीय नियम की 50% जमा प्रक्रिया हर राज्य में बिल्कुल एक जैसी है।' },
    officialLinks: [
      { label: { en: 'Read amended Rule 167', hi: 'संशोधित नियम 167 पढ़ें' }, href: officialRule },
      { label: { en: 'Open Virtual Courts', hi: 'वर्चुअल कोर्ट खोलें' }, href: officialVirtualCourt },
    ],
  },
  'no-recorded-decision': {
    id: 'no-recorded-decision',
    eyebrow: { en: 'Authority-response route', hi: 'प्राधिकरण प्रतिक्रिया का रास्ता' },
    title: { en: 'Preserve the acknowledgement and verify the current status', hi: 'पावती सुरक्षित रखें और मौजूदा स्थिति सत्यापित करें' },
    summary: { en: 'The central rule describes a 30-day resolution period for a properly contested challan. A supplied status with no decision needs official verification, not an automatic legal conclusion.', hi: 'केंद्रीय नियम सही तरह दर्ज आपत्ति के लिए 30 दिन की समाधान अवधि बताता है। दी गई स्थिति में फैसला न होने पर आधिकारिक जाँच ज़रूरी है, अपने आप कानूनी निष्कर्ष नहीं।' },
    suppliedRecord: { en: 'A fictional grievance was acknowledged on 27 August 2026; its dated status snapshot on 27 September contains no recorded decision or order.', hi: 'काल्पनिक आपत्ति 27 अगस्त 2026 को दर्ज हुई; 27 सितंबर की स्थिति में कोई फैसला या आदेश दर्ज नहीं है।' },
    cannotConclude: { en: 'The supplied snapshot does not prove that no order exists elsewhere or that every condition of the central rule was satisfied.', hi: 'दिया गया स्क्रीनशॉट यह साबित नहीं करता कि कोई आदेश कहीं और नहीं है या केंद्रीय नियम की हर शर्त पूरी हुई।' },
    doNow: [
      { en: 'Preserve the grievance acknowledgement and a dated status snapshot.', hi: 'आपत्ति की पावती और तारीख वाला स्थिति स्क्रीनशॉट सुरक्षित रखें।' },
      { en: 'Check the current official portal and the designated state authority for an uploaded order.', hi: 'अपलोड आदेश के लिए मौजूदा आधिकारिक पोर्टल और राज्य के संबंधित प्राधिकरण को जाँचें।' },
      { en: 'Use a neutral follow-up asking for the current status and a copy of any reasoned decision.', hi: 'मौजूदा स्थिति और कारण सहित किसी फैसले की प्रति के लिए तटस्थ अनुरोध करें।' },
    ],
    keepReady: [
      { en: 'Grievance acknowledgement and linked challan number', hi: 'आपत्ति पावती और जुड़ा चालान नंबर' },
      { en: 'Dated status snapshot and original evidence pack', hi: 'तारीख वाला स्थिति स्क्रीनशॉट और मूल सबूत पैक' },
    ],
    avoid: { en: 'Do not state that the challan has automatically disappeared from every system; verify the official record before acting.', hi: 'यह न कहें कि चालान हर सिस्टम से अपने आप हट गया; आगे बढ़ने से पहले आधिकारिक रिकॉर्ड जाँचें।' },
    officialLinks: [
      { label: { en: 'Official e-Challan portal', hi: 'आधिकारिक ई-चालान पोर्टल' }, href: officialEChallan },
      { label: { en: 'Read amended Rule 167', hi: 'संशोधित नियम 167 पढ़ें' }, href: officialRule },
    ],
  },
  'virtual-court': {
    id: 'virtual-court',
    eyebrow: { en: 'Official court handoff', hi: 'आधिकारिक कोर्ट प्रक्रिया' },
    title: { en: 'Search, verify, then choose the official case action', hi: 'खोजें, सत्यापन करें, फिर आधिकारिक कार्रवाई चुनें' },
    summary: { en: 'The official Virtual Courts flow can locate a case, verify access, and show a payment or contest route. A contest request can lead to an assigned physical court and date.', hi: 'आधिकारिक वर्चुअल कोर्ट प्रक्रिया मामला खोजती है, पहुँच सत्यापित करती है और भुगतान या आपत्ति का रास्ता दिखाती है। आपत्ति पर भौतिक अदालत और तारीख मिल सकती है।' },
    suppliedRecord: { en: 'A fictional e-Challan status says the case was forwarded to Virtual Court.', hi: 'काल्पनिक ई-चालान स्थिति बताती है कि मामला वर्चुअल कोर्ट भेजा गया।' },
    cannotConclude: { en: 'A portal handoff does not mean ChallanSakshi filed, paid, listed, or verified a real case.', hi: 'पोर्टल का रास्ता दिखाने का अर्थ यह नहीं कि ChallanSakshi ने असली मामला दाखिल, भुगतान, सूचीबद्ध या सत्यापित किया।' },
    doNow: [
      { en: 'Search on the official Virtual Courts service using an accepted case identifier.', hi: 'स्वीकार्य केस पहचान से आधिकारिक वर्चुअल कोर्ट सेवा पर खोजें।' },
      { en: 'Complete verification only on the official service; never enter an OTP here.', hi: 'सत्यापन केवल आधिकारिक सेवा पर करें; यहाँ कभी OTP न डालें।' },
      { en: 'If requesting to contest, record the assigned physical court and date shown by the official service.', hi: 'आपत्ति करने पर आधिकारिक सेवा में दिखी भौतिक अदालत और तारीख लिख लें।' },
    ],
    keepReady: [
      { en: 'Challan or case identifier and vehicle details', hi: 'चालान या केस पहचान और वाहन विवरण' },
      { en: 'Contest pack, prior order, and displayed court date', hi: 'आपत्ति पैक, पिछला आदेश और दिखाई गई अदालत की तारीख' },
    ],
    avoid: { en: 'If both portals display a payment option, do not pay on both systems.', hi: 'दोनों पोर्टल पर भुगतान दिखे तो दोनों जगह भुगतान न करें।' },
    officialLinks: [
      { label: { en: 'Open Virtual Courts', hi: 'वर्चुअल कोर्ट खोलें' }, href: officialVirtualCourt },
      { label: { en: 'Read official Virtual Courts FAQ', hi: 'आधिकारिक वर्चुअल कोर्ट FAQ पढ़ें' }, href: officialVirtualCourtFaq },
    ],
  },
  'payment-pending': {
    id: 'payment-pending',
    eyebrow: { en: 'Payment-status route', hi: 'भुगतान स्थिति का रास्ता' },
    title: { en: 'Reconcile the supplied records before paying again', hi: 'दोबारा भुगतान से पहले दिए रिकॉर्ड मिलाएँ' },
    summary: { en: 'Compare the challan identifier, amount, receipt result, transaction reference, and displayed status. The prototype does not verify a bank or live government record.', hi: 'चालान पहचान, रकम, रसीद का नतीजा, लेन-देन संदर्भ और दिखाई स्थिति मिलाएँ। प्रोटोटाइप बैंक या लाइव सरकारी रिकॉर्ड सत्यापित नहीं करता।' },
    suppliedRecord: { en: 'The selected fictional receipt and status snapshot may agree, conflict, or refer to different challans.', hi: 'चुनी काल्पनिक रसीद और स्थिति आपस में मिल सकती हैं, टकरा सकती हैं या अलग चालान की हो सकती हैं।' },
    cannotConclude: { en: 'A screenshot alone cannot prove settlement, refund eligibility, or the live portal status.', hi: 'सिर्फ़ स्क्रीनशॉट से भुगतान पूरा होना, रिफंड या लाइव पोर्टल स्थिति साबित नहीं होती।' },
    doNow: [
      { en: 'Match the challan number and amount on the receipt before relying on it.', hi: 'रसीद पर चालान नंबर और रकम पहले मिलाएँ।' },
      { en: 'Use the official pending-transaction or status route before attempting another payment.', hi: 'दूसरे भुगतान से पहले आधिकारिक पेंडिंग लेन-देन या स्थिति जाँचें।' },
      { en: 'Preserve the transaction reference and current status snapshot.', hi: 'लेन-देन संदर्भ और मौजूदा स्थिति का स्क्रीनशॉट सुरक्षित रखें।' },
    ],
    keepReady: [
      { en: 'Receipt, transaction reference, and challan identifier', hi: 'रसीद, लेन-देन संदर्भ और चालान पहचान' },
      { en: 'A dated snapshot of the displayed status', hi: 'दिखाई गई स्थिति का तारीख वाला स्क्रीनशॉट' },
    ],
    avoid: { en: 'Do not pay again or pay on both e-Challan and Virtual Courts before verifying status.', hi: 'स्थिति जाँचे बिना दोबारा या ई-चालान और वर्चुअल कोर्ट दोनों पर भुगतान न करें।' },
    officialLinks: [{ label: { en: 'Official e-Challan payment/status service', hi: 'आधिकारिक ई-चालान भुगतान/स्थिति सेवा' }, href: officialEChallan }],
  },
  'access-or-receipt': {
    id: 'access-or-receipt',
    eyebrow: { en: 'Access recovery route', hi: 'पहुँच वापस पाने का रास्ता' },
    title: { en: 'Use only the official verification or receipt-reprint route', hi: 'केवल आधिकारिक सत्यापन या रसीद दोबारा पाने का रास्ता इस्तेमाल करें' },
    summary: { en: 'The official Virtual Courts help describes alternative vehicle-detail verification when the challan phone number is wrong, and a receipt view/reprint route after verification.', hi: 'आधिकारिक वर्चुअल कोर्ट मदद गलत फ़ोन नंबर होने पर वाहन विवरण से वैकल्पिक सत्यापन और सत्यापन के बाद रसीद देखने/दोबारा निकालने का रास्ता बताती है।' },
    suppliedRecord: { en: 'A fictional citizen cannot receive the expected verification message or cannot find a payment receipt.', hi: 'काल्पनिक नागरिक को सत्यापन संदेश नहीं मिल रहा या भुगतान रसीद नहीं मिल रही।' },
    cannotConclude: { en: 'ChallanSakshi cannot recover an OTP, alter a phone number, or retrieve a real receipt.', hi: 'ChallanSakshi OTP वापस नहीं ला सकता, फ़ोन नंबर बदल नहीं सकता या असली रसीद निकाल नहीं सकता।' },
    doNow: [
      { en: 'Open the official case and choose the alternative verification offered there.', hi: 'आधिकारिक केस खोलें और वहीं दिया वैकल्पिक सत्यापन चुनें।' },
      { en: 'Enter engine or chassis details only on the official service—not in this prototype.', hi: 'इंजन या चेसिस विवरण केवल आधिकारिक सेवा पर डालें—इस प्रोटोटाइप में नहीं।' },
      { en: 'After verification, use the official view or reprint receipt action.', hi: 'सत्यापन के बाद आधिकारिक रसीद देखें या दोबारा निकालें।' },
    ],
    keepReady: [
      { en: 'Case or challan identifier', hi: 'केस या चालान पहचान' },
      { en: 'Vehicle details requested by the official service', hi: 'आधिकारिक सेवा द्वारा माँगा वाहन विवरण' },
    ],
    avoid: { en: 'Never share an OTP, Aadhaar, full chassis number, or payment credentials with this prototype.', hi: 'इस प्रोटोटाइप से OTP, आधार, पूरा चेसिस नंबर या भुगतान जानकारी कभी साझा न करें।' },
    officialLinks: [
      { label: { en: 'Open Virtual Courts', hi: 'वर्चुअल कोर्ट खोलें' }, href: officialVirtualCourt },
      { label: { en: 'Read official recovery FAQ', hi: 'आधिकारिक रिकवरी FAQ पढ़ें' }, href: officialVirtualCourtFaq },
    ],
  },
};

const patterns: Array<{ issueId: ResolutionIssueId; terms: RegExp[] }> = [
  { issueId: 'no-recorded-decision', terms: [/no decision/, /no reply/, /no response/, /30\s*days?/, /30\s*din/, /grievance.*pending/, /फैसला नहीं/, /जवाब नहीं/] },
  { issueId: 'payment-pending', terms: [/payment/, /paid/, /paisa/, /deduct/, /debit/, /status.*pending/, /payment.*pending/, /paid.*pending/, /भुगतान/, /पैसे/] },
  { issueId: 'virtual-court', terms: [/virtual\s*court/, /court/, /अदालत/, /कोर्ट/] },
  { issueId: 'grievance-rejected', terms: [/reject/, /rejected/, /grievance.*reject/, /complaint.*reject/, /अस्वीकार/, /शिकायत.*अस्वीकार/] },
  { issueId: 'access-or-receipt', terms: [/wrong\s*(phone|mobile)\s*number/, /otp/, /phone/, /mobile/, /receipt/, /acknowledg/, /रसीद/, /फ़ोन/, /फोन/] },
  { issueId: 'unclear-evidence', terms: [/blur/, /blurry/, /unclear/, /unreadable/, /not visible/, /dhund/, /धुंध/, /साफ़ नहीं/] },
  { issueId: 'wrong-evidence', terms: [/another vehicle/, /different vehicle/, /meri gaadi nahi/, /mismatch/, /wrong\s*(vehicle|car|bike|scooter|plate)/, /(vehicle|car|bike|scooter|plate).*wrong/, /(colour|color).*(wrong|different)/, /दूसरा वाहन/, /मेरी गाड़ी नहीं/, /गलत.*(वाहन|गाड़ी|नंबर)/] },
];

export function classifyResolutionIssue(input: string): TriageResult {
  const normalized = input.trim().toLocaleLowerCase('en-IN');
  if (!normalized) return { issueId: null, confidence: 'fallback', matchedTerms: [], candidateIds: [] };

  const scored = patterns.map((candidate) => ({
    issueId: candidate.issueId,
    matches: [...new Set(candidate.terms.flatMap((term) => normalized.match(term)?.[0] || []))],
  })).filter((candidate) => candidate.matches.length > 0).sort((a, b) => b.matches.length - a.matches.length);

  if (scored.length === 0) return { issueId: null, confidence: 'fallback', matchedTerms: [], candidateIds: [] };
  const topScore = scored[0].matches.length;
  const tied = scored.filter((candidate) => candidate.matches.length === topScore);
  if (tied.length > 1) {
    return {
      issueId: null,
      confidence: 'ambiguous',
      matchedTerms: [...new Set(tied.flatMap((candidate) => candidate.matches))],
      candidateIds: tied.map((candidate) => candidate.issueId),
    };
  }

  return { issueId: scored[0].issueId, confidence: 'matched', matchedTerms: scored[0].matches, candidateIds: [scored[0].issueId] };
}

const DAY_MS = 86_400_000;

function dateOnlyToUtc(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Expected an ISO calendar date, received: ${value}`);
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function dateFromUtc(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function calculatePostRejectionWindow(orderDate: string, referenceDate: string): PostRejectionWindow {
  const order = dateOnlyToUtc(orderDate);
  const reference = dateOnlyToUtc(referenceDate);
  const indicativeBoundary = dateFromUtc(order + 30 * DAY_MS);
  const elapsedDays = Math.max(0, Math.floor((reference - order) / DAY_MS));
  const rawRemaining = Math.floor((dateOnlyToUtc(indicativeBoundary) - reference) / DAY_MS);
  return {
    orderDate,
    referenceDate,
    indicativeBoundary,
    elapsedDays,
    daysRemaining: Math.max(0, rawRemaining),
    status: rawRemaining > 0 ? 'open' : rawRemaining === 0 ? 'final-day' : 'expired',
  };
}

export const paymentScenarios: Record<PaymentScenarioId, PaymentSnapshot> = {
  'status-conflict': {
    id: 'status-conflict',
    label: { en: 'Receipt succeeds; status pending', hi: 'रसीद सफल; स्थिति पेंडिंग' },
    challanNumber: 'CS-DEMO-PAY-2041',
    receiptChallanNumber: 'CS-DEMO-PAY-2041',
    challanAmountInr: 1000,
    receiptAmountInr: 1000,
    transactionReference: 'DEMO-TXN-882041',
    receiptResult: 'successful',
    displayedStatus: 'pending',
    paidAt: '2026-08-24',
    statusCapturedAt: '2026-08-27',
  },
  'identifier-mismatch': {
    id: 'identifier-mismatch',
    label: { en: 'Receipt belongs to another challan', hi: 'रसीद दूसरे चालान की है' },
    challanNumber: 'CS-DEMO-PAY-2041',
    receiptChallanNumber: 'CS-DEMO-PAY-2401',
    challanAmountInr: 1000,
    receiptAmountInr: 1000,
    transactionReference: 'DEMO-TXN-882401',
    receiptResult: 'successful',
    displayedStatus: 'pending',
    paidAt: '2026-08-24',
    statusCapturedAt: '2026-08-27',
  },
  aligned: {
    id: 'aligned',
    label: { en: 'Receipt and displayed status align', hi: 'रसीद और स्थिति मेल खाते हैं' },
    challanNumber: 'CS-DEMO-PAY-2041',
    receiptChallanNumber: 'CS-DEMO-PAY-2041',
    challanAmountInr: 1000,
    receiptAmountInr: 1000,
    transactionReference: 'DEMO-TXN-882041',
    receiptResult: 'successful',
    displayedStatus: 'paid',
    paidAt: '2026-08-24',
    statusCapturedAt: '2026-08-27',
  },
};

export function reconcilePayment(snapshot: PaymentSnapshot): PaymentReconciliation {
  const identifiersMatch = snapshot.challanNumber === snapshot.receiptChallanNumber;
  const amountsMatch = snapshot.challanAmountInr === snapshot.receiptAmountInr;
  const limitations: string[] = ['supplied-records-only', 'no-live-bank-verification', 'no-live-portal-verification'];

  if (!identifiersMatch || !amountsMatch || !snapshot.transactionReference) {
    if (!identifiersMatch) limitations.push('challan-identifier-mismatch');
    if (!amountsMatch) limitations.push('amount-mismatch');
    if (!snapshot.transactionReference) limitations.push('transaction-reference-missing');
    return { finding: 'cannot-reconcile', identifiersMatch, amountsMatch, limitations, nextAction: 'verify-identifiers' };
  }

  if (snapshot.receiptResult === 'successful' && snapshot.displayedStatus === 'pending') {
    return { finding: 'status-conflict', identifiersMatch, amountsMatch, limitations, nextAction: 'verify-pending-transaction' };
  }

  if (snapshot.receiptResult === 'successful' && snapshot.displayedStatus === 'paid') {
    return { finding: 'aligned', identifiersMatch, amountsMatch, limitations, nextAction: 'preserve-receipt' };
  }

  limitations.push('payment-state-not-conclusive');
  return { finding: 'cannot-reconcile', identifiersMatch, amountsMatch, limitations, nextAction: 'verify-pending-transaction' };
}

export function localize(value: LocalizedText, language: Language): string {
  return value[language];
}
