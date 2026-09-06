import type { ServiceKind } from './cases';

type Copy = { en: string; hi: string };
export type MobilityService = {
  kind: ServiceKind;
  title: Copy;
  description: Copy;
  sourceUrl: string;
  sourceLabel: string;
  steps: { id: string; title: Copy; detail: Copy }[];
};
const copy = (en: string, hi: string): Copy => ({ en, hi });
const step = (id: string, en: string, hi: string, detail: string, detailHi: string) => ({ id, title: copy(en, hi), detail: copy(detail, detailHi) });
const review = step('review-details', 'Review your details', 'अपनी जानकारी जाँचें', 'Check every reading against your original records. Confirm the issuing authority or state from the record itself.', 'हर जानकारी को मूल रिकॉर्ड से मिलाएँ। जारी करने वाला प्राधिकरण या राज्य रिकॉर्ड से ही जाँचें।');
const handoff = step('official-instructions', 'Check the official instructions', 'आधिकारिक निर्देश देखें', 'Choose the relevant state and service on the official website. Requirements, fees and appointments depend on your authority and circumstances.', 'आधिकारिक वेबसाइट पर संबंधित राज्य और सेवा चुनें। आवश्यक दस्तावेज़, शुल्क और अपॉइंटमेंट प्राधिकरण और परिस्थिति पर निर्भर हैं।');
const keep = step('keep-reference', 'Keep your reference and next date', 'संदर्भ और अगली तारीख रखें', 'After you act on the official website, keep its actual acknowledgement separately. You can add your reference and a personal follow-up here.', 'आधिकारिक वेबसाइट पर कार्य करने के बाद वास्तविक पावती अलग रखें। यहाँ संदर्भ और अपनी फ़ॉलो-अप तारीख जोड़ सकते हैं।');

/** Official information sources checked 2026-09-06. These are preparation plans, not jurisdiction-specific legal checklists. */
export const SERVICE_KINDS: readonly ServiceKind[] = ['challan-review', 'challan-payment', 'payment-status', 'fastag', 'licence-apply', 'licence-renew', 'vehicle-transfer', 'lost-documents', 'move-state'];
const services: Record<ServiceKind, MobilityService> = {
  'challan-review': {
    kind: 'challan-review', title: copy('Review a challan', 'चालान की समीक्षा'),
    description: copy('Organise the record, check the details and prepare a clear request.', 'रिकॉर्ड व्यवस्थित करें, जानकारी जाँचें और स्पष्ट अनुरोध तैयार करें।'),
    sourceUrl: 'https://echallan.parivahan.gov.in/', sourceLabel: 'MoRTH eChallan',
    steps: [review, step('prepare-request', 'Prepare your request', 'अपना अनुरोध तैयार करें', 'Describe what you observed and what you want the authority to clarify. Keep uncertainty visible and retain the original evidence.', 'अपना अवलोकन और प्राधिकरण से माँगा गया स्पष्टीकरण लिखें। अनिश्चितता स्पष्ट रखें और मूल साक्ष्य सुरक्षित रखें।'), handoff, keep],
  },
  'challan-payment': {
    kind: 'challan-payment', title: copy('Prepare to pay a challan', 'चालान भुगतान की तैयारी'),
    description: copy('Review the official record before continuing to payment yourself.', 'स्वयं भुगतान करने से पहले आधिकारिक रिकॉर्ड देखें।'),
    sourceUrl: 'https://echallan.parivahan.gov.in/', sourceLabel: 'MoRTH eChallan',
    steps: [review, step('check-record', 'Check the current official record', 'वर्तमान आधिकारिक रिकॉर्ड देखें', 'Open the official service yourself and check the vehicle, challan and amount. This workspace cannot determine whether a payment is due or complete.', 'आधिकारिक सेवा खोलकर वाहन, चालान और राशि स्वयं जाँचें। यह कार्यक्षेत्र भुगतान की देयता या पूर्णता निर्धारित नहीं करता।'), handoff, keep],
  },
  'payment-status': {
    kind: 'payment-status', title: copy('Follow up a payment', 'भुगतान का फ़ॉलो-अप'),
    description: copy('Bring your transaction reference and official receipt together.', 'लेन-देन संदर्भ और आधिकारिक रसीद एक साथ रखें।'),
    sourceUrl: 'https://echallan.parivahan.gov.in/', sourceLabel: 'MoRTH eChallan',
    steps: [step('payment-reference', 'Collect the transaction details', 'लेन-देन की जानकारी रखें', 'Keep the payment date, transaction reference and bank receipt. Do not enter card numbers, bank credentials or OTPs here.', 'भुगतान तारीख, लेन-देन संदर्भ और बैंक रसीद रखें। यहाँ कार्ड नंबर, बैंक पासवर्ड या OTP न डालें।'), step('check-payment', 'Check pending transactions yourself', 'लंबित लेन-देन स्वयं जाँचें', 'Use the official eChallan payment-status or pending-transaction service. A bank debit alone does not establish the official challan outcome.', 'आधिकारिक eChallan भुगतान-स्थिति या लंबित लेन-देन सेवा देखें। केवल बैंक से राशि कटना चालान के आधिकारिक परिणाम का प्रमाण नहीं है।'), keep],
  },
  fastag: {
    kind: 'fastag', title: copy('Resolve a FASTag concern', 'FASTag समस्या की तैयारी'),
    description: copy('Prepare toll details and contact your tag issuer through its official route.', 'टोल जानकारी तैयार करें और टैग जारी करने वाले बैंक के आधिकारिक रास्ते से संपर्क करें।'),
    sourceUrl: 'https://www.npci.org.in/product/netc/netc-fastag-helpline', sourceLabel: 'NPCI FASTag issuer helplines',
    steps: [step('toll-details', 'Collect the toll and transaction details', 'टोल और लेन-देन की जानकारी रखें', 'Review the plaza, date, vehicle and transaction entry. Keep the original statement or receipt outside this workspace.', 'प्लाज़ा, तारीख, वाहन और लेन-देन देखें। मूल स्टेटमेंट या रसीद इस कार्यक्षेत्र के बाहर रखें।'), step('issuer-contact', 'Find your issuer’s official support', 'जारीकर्ता की आधिकारिक सहायता देखें', 'Use the issuer listed on your tag account. NPCI lists issuer helplines; the issuer handles your account and complaint.', 'अपने टैग खाते में लिखे जारीकर्ता का उपयोग करें। NPCI जारीकर्ताओं की हेल्पलाइन देता है; जारीकर्ता आपका खाता और शिकायत संभालता है।'), keep],
  },
  'licence-apply': {
    kind: 'licence-apply', title: copy('Apply for a driving licence', 'ड्राइविंग लाइसेंस की तैयारी'),
    description: copy('Plan your application and any required test or visit.', 'आवेदन और आवश्यक टेस्ट या कार्यालय जाने की तैयारी करें।'),
    sourceUrl: 'https://parivahan.gov.in/parivahan/', sourceLabel: 'Parivahan licence services',
    steps: [handoff, step('licence-checklist', 'Make your personal checklist', 'अपनी दस्तावेज़ सूची बनाएँ', 'Check eligibility, learner/licence stage and accepted records for your selected state on Sarathi. Copy any official visit instructions into your appointment pack.', 'सारथी पर चुने हुए राज्य के लिए पात्रता, लर्नर/लाइसेंस चरण और स्वीकार्य दस्तावेज़ देखें। आधिकारिक निर्देश अपनी अपॉइंटमेंट तैयारी में जोड़ें।'), keep],
  },
  'licence-renew': {
    kind: 'licence-renew', title: copy('Renew a driving licence', 'ड्राइविंग लाइसेंस नवीनीकरण'),
    description: copy('Review expiry details and prepare the renewal steps for your state.', 'समाप्ति जानकारी देखें और अपने राज्य के नवीनीकरण की तैयारी करें।'),
    sourceUrl: 'https://mparivahan.parivahan.gov.in/mstatic/english/dl-info-renewal-dl.html', sourceLabel: 'Parivahan renewal information',
    steps: [review, handoff, step('renewal-records', 'Prepare the requested records', 'माँगे गए दस्तावेज़ तैयार करें', 'Use the official renewal instructions for your licence category and circumstances. Record an appointment only after you book it yourself.', 'अपने लाइसेंस वर्ग और परिस्थिति के आधिकारिक नवीनीकरण निर्देश देखें। स्वयं बुक करने के बाद ही अपॉइंटमेंट दर्ज करें।'), keep],
  },
  'vehicle-transfer': {
    kind: 'vehicle-transfer', title: copy('Transfer a vehicle', 'वाहन स्वामित्व हस्तांतरण'),
    description: copy('Prepare a sale or purchase handover with the relevant registering authority.', 'संबंधित पंजीकरण प्राधिकरण के लिए खरीद या बिक्री की तैयारी करें।'),
    sourceUrl: 'https://mparivahan.parivahan.gov.in/mstatic/english/rc-info-ownership.html', sourceLabel: 'Parivahan ownership transfer information',
    steps: [review, step('transfer-context', 'Describe your transfer', 'हस्तांतरण का विवरण दें', 'Note whether this is a sale, purchase or another transfer, and the relevant states. Check the official instructions for that situation; additional steps may apply.', 'बिक्री, खरीद या अन्य हस्तांतरण और संबंधित राज्यों का विवरण दें। अपनी परिस्थिति के आधिकारिक निर्देश देखें; अतिरिक्त चरण लागू हो सकते हैं।'), handoff, keep],
  },
  'lost-documents': {
    kind: 'lost-documents', title: copy('Replace a lost document', 'खोए दस्तावेज़ की प्रतिलिपि'),
    description: copy('Identify what is missing and prepare for the relevant duplicate-document service.', 'कौन सा दस्तावेज़ खोया है पहचानें और संबंधित प्रतिलिपि सेवा की तैयारी करें।'),
    sourceUrl: 'https://parivahan.gov.in/parivahan/', sourceLabel: 'Parivahan duplicate DL / RC services',
    steps: [step('identify-document', 'Identify the missing document', 'खोया दस्तावेज़ पहचानें', 'Specify driving licence or registration certificate and issuing authority. Keep any available reference details; do not invent missing numbers.', 'ड्राइविंग लाइसेंस या पंजीकरण प्रमाणपत्र और जारीकर्ता लिखें। उपलब्ध संदर्भ रखें; गुम नंबर का अनुमान न लगाएँ।'), handoff, keep],
  },
  'move-state': {
    kind: 'move-state', title: copy('Move to another state', 'दूसरे राज्य में स्थानांतरण'),
    description: copy('Plan the address and vehicle questions to check with both authorities.', 'पते और वाहन से जुड़े प्रश्न दोनों प्राधिकरणों के लिए तैयार करें।'),
    sourceUrl: 'https://parivahan.gov.in/parivahan/', sourceLabel: 'Parivahan vehicle and licence services',
    steps: [step('move-details', 'Record where you are moving', 'स्थानांतरण का विवरण रखें', 'Note the old and new state, move date and vehicle situation. Ask the relevant authorities which address, registration or NOC services apply.', 'पुराना और नया राज्य, तारीख और वाहन की स्थिति लिखें। संबंधित प्राधिकरणों से पूछें कि पता, पंजीकरण या NOC की कौन सी सेवाएँ लागू हैं।'), handoff, keep],
  },
};

export function getService(kind: ServiceKind): MobilityService {
  if (!Object.prototype.hasOwnProperty.call(services, kind)) throw new TypeError('Unknown mobility service');
  return services[kind];
}

export type ServiceInference = { kind: ServiceKind | null; choices: ServiceKind[] };
/** Deterministic hints only: unresolved or multi-intent requests always require a choice. */
export function inferService(text: string): ServiceInference {
  const value = text.toLocaleLowerCase().normalize('NFKC').slice(0, 2000);
  const matches = new Set<ServiceKind>();
  const challan = /challan|चालान|fine\b/.test(value);
  const licence = /licen[cs]e|\bdl\b|लाइसेंस|लाइसेन्स/.test(value);
  const paymentStatus = /payment\s*(status|pending|fail|stuck)|paid|debited|receipt|भुगतान.*(स्थिति|अटक|विफल)|पैसे कट|रसीद/.test(value);
  if (/fast\s*tag|toll|फास्टैग|फास्ट टैग|टोल/.test(value)) matches.add('fastag');
  if (paymentStatus && (!matches.has('fastag') || challan)) matches.add('payment-status');
  if (challan && !paymentStatus) {
    if (/pay|भुगतान|भरना/.test(value)) matches.add('challan-payment');
    if (/wrong|review|dispute|गलत|समीक्षा|शिकायत/.test(value) || !/pay|भुगतान|भरना/.test(value)) matches.add('challan-review');
  }
  const lost = /lost|duplicate|missing|खो[यए]|गुम|प्रतिलिपि/.test(value);
  if (lost && /licen[cs]e|\bdl\b|\brc\b|document|wallet|registration|लाइसेंस|दस्तावेज़|दस्तावेज|बटुआ|पंजीकरण/.test(value)) matches.add('lost-documents');
  if (licence && !lost) {
    if (/renew|expir|नवीनीकरण|समाप्त/.test(value)) matches.add('licence-renew');
    else if (/apply|new|learn|आवेदन|नया|लर्नर/.test(value)) matches.add('licence-apply');
    else { matches.add('licence-apply'); matches.add('licence-renew'); }
  }
  if (/transfer|bought|buy|sold|selling|ownership|हस्तांतरण|खरीद|बेच|स्वामित्व/.test(value)) matches.add('vehicle-transfer');
  if (/\bmov(e|ed|ing)\b|\brelocat|\binterstate\b|दूसरे राज्य|स्थानांतरण/.test(value)) matches.add('move-state');
  const choices = [...matches];
  return { kind: choices.length === 1 ? choices[0] : null, choices: choices.length ? choices : [...SERVICE_KINDS] };
}

export const LIFE_EVENTS: { id: string; title: Copy; description: Copy; services: ServiceKind[] }[] = [
  { id: 'learning', title: copy('Learning to drive', 'ड्राइविंग सीख रहे हैं'), description: copy('Start a licence application plan. Check the learner stage, eligibility and test requirements for your selected state on the official service.', 'लाइसेंस आवेदन की योजना बनाएँ। आधिकारिक सेवा पर अपने चुने राज्य के लर्नर चरण, पात्रता और टेस्ट आवश्यकताएँ जाँचें।'), services: ['licence-apply'] },
  { id: 'buy-used', title: copy('Buying a used vehicle', 'पुराना वाहन खरीद रहे हैं'), description: copy('Start with ownership transfer. Review any challan record separately and contact the FASTag issuer about the tag account.', 'पहले स्वामित्व हस्तांतरण की तैयारी करें। चालान रिकॉर्ड अलग जाँचें और FASTag खाते के लिए जारीकर्ता से संपर्क करें।'), services: ['vehicle-transfer', 'challan-review', 'fastag'] },
  { id: 'selling', title: copy('Selling a vehicle', 'वाहन बेच रहे हैं'), description: copy('Prepare the ownership handover with the registering authority. Separately ask your FASTag issuer about closing or updating your tag account.', 'पंजीकरण प्राधिकरण के लिए स्वामित्व हस्तांतरण की तैयारी करें। FASTag खाता बंद या अपडेट करने के लिए जारीकर्ता से अलग संपर्क करें।'), services: ['vehicle-transfer', 'fastag'] },
  { id: 'moving', title: copy('Moving home', 'घर बदल रहे हैं'), description: copy('Start a move plan for your old and new state. Review licence renewal separately if it is relevant to you.', 'पुराने और नए राज्य की स्थानांतरण योजना बनाएँ। ज़रूरत हो तो लाइसेंस नवीनीकरण की अलग समीक्षा करें।'), services: ['move-state', 'licence-renew'] },
  { id: 'lost-wallet', title: copy('Lost a wallet or documents', 'बटुआ या दस्तावेज़ खो गए'), description: copy('Start with duplicate DL or RC preparation. If a FASTag account is also affected, prepare a separate issuer follow-up.', 'DL या RC की प्रतिलिपि से शुरू करें। FASTag खाता भी प्रभावित हो तो जारीकर्ता के लिए अलग फ़ॉलो-अप तैयार करें।'), services: ['lost-documents', 'fastag'] },
];
