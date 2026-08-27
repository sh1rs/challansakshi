import type { ClassificationResult, ConfirmedVehicleFacts, FindingKind, Language, LocalizedText } from './domain';
import type { EvidenceIndexItem, EvidenceItemId } from './case-ledger';

export type OrderMapStatus = 'mentioned' | 'unclear' | 'not-found';
export type OrderCompleteness = 'yes' | 'no' | 'not-sure';
export type OrderFactId = 'order-id' | 'grievance-id' | 'challan-id' | 'order-date' | 'outcome' | 'reason' | 'next-route';

export interface OrderParagraph {
  id: `O${number}`;
  text: LocalizedText;
}

export interface OrderExtractedFact {
  id: OrderFactId;
  label: LocalizedText;
  value: string;
  sourceParagraphs: string[];
}

export interface SyntheticRejectedOrder {
  id: string;
  orderDate: string;
  grievanceNumber: string;
  challanNumber: string;
  heading: LocalizedText;
  paragraphs: OrderParagraph[];
  extractedFacts: OrderExtractedFact[];
  syntheticAuthority: true;
}

export interface OrderEvidenceRow {
  id: `P${number}`;
  label: LocalizedText;
  submittedPoint: LocalizedText;
  evidenceIds: EvidenceItemId[];
  factIds: string[];
  suggestedStatus: OrderMapStatus;
  suggestedReasonRefs: string[];
  explanation: LocalizedText;
  matchBasis: 'exact-identifier' | 'direct-phrase' | 'possible-semantic-reference' | 'no-supported-reference';
}

export interface OrderMapReview {
  status: OrderMapStatus;
  reasonRefs: string[];
  confirmed: boolean;
}

export interface OrderFactReviewValidation {
  complete: boolean;
  missingFactIds: string[];
  emptyFactIds: string[];
  invalidFactIds: string[];
  completenessAnswered: boolean;
}

export interface OrderMapReviewValidation {
  complete: boolean;
  unconfirmedRowIds: string[];
  invalidReferenceRowIds: string[];
}

export const ORDER_DATE = '2026-09-27';
export const ORDER_REVIEW_REFERENCE_DATE = '2026-10-05';
export const ORDER_ACKNOWLEDGED_DATE = '2026-08-27';

export function buildSyntheticRejectedOrder(input: {
  finding: FindingKind;
  grievanceNumber: string;
  challanNumber: string;
  registeredPlate: string;
}): SyntheticRejectedOrder {
  const mismatch = input.finding === 'mismatch';
  const reason = mismatch
    ? 'The submitted material does not establish a material vehicle mismatch.'
    : 'The supplied material does not establish a basis to change the challan record.';
  const reasonHi = mismatch
    ? 'जमा सामग्री से वाहन का ठोस बेमेल स्थापित नहीं होता।'
    : 'दी गई सामग्री से चालान रिकॉर्ड बदलने का आधार स्थापित नहीं होता।';
  const orderId = input.challanNumber.endsWith('-B') ? 'DEMO-ORD-B-01' : 'DEMO-ORD-A-01';
  const paragraphs: OrderParagraph[] = [
    {
      id: 'O1',
      text: {
        en: 'The grievance and the documents uploaded with it were examined.',
        hi: 'आपत्ति और उसके साथ अपलोड किए गए दस्तावेज़ों की जाँच की गई।',
      },
    },
    {
      id: 'O2',
      text: mismatch
        ? {
          en: 'The applicant states that the vehicle shown in the enforcement image differs from the vehicle described in the submitted record.',
          hi: 'आवेदक का कहना है कि प्रवर्तन फ़ोटो में दिखता वाहन जमा रिकॉर्ड में बताए वाहन से अलग है।',
        }
        : {
          en: 'The applicant states that the supplied enforcement image is unclear and does not visibly support the recorded allegation.',
          hi: 'आवेदक का कहना है कि दी गई प्रवर्तन फ़ोटो साफ़ नहीं है और दर्ज आरोप को स्पष्ट रूप से नहीं दिखाती।',
        },
    },
    {
      id: 'O3',
      text: {
        en: `The submitted vehicle record identifies ${input.registeredPlate}.`,
        hi: `जमा वाहन रिकॉर्ड में ${input.registeredPlate} दर्ज है।`,
      },
    },
    {
      id: 'O4',
      text: {
        en: 'The enforcement image associated with the e-Challan was reviewed and was considered sufficient for the recorded offence.',
        hi: 'ई-चालान से जुड़ी प्रवर्तन फ़ोटो की समीक्षा की गई और उसे दर्ज उल्लंघन के लिए पर्याप्त माना गया।',
      },
    },
    {
      id: 'O5',
      text: { en: `${reason} The grievance is therefore rejected.`, hi: `${reasonHi} इसलिए आपत्ति अस्वीकार की जाती है।` },
    },
    {
      id: 'O6',
      text: {
        en: 'The citizen should verify any current payment or court route, applicable period, and state-specific procedure through the designated official service.',
        hi: 'नागरिक मौजूदा भुगतान या अदालत के रास्ते, लागू अवधि और राज्य-विशिष्ट प्रक्रिया को संबंधित आधिकारिक सेवा पर सत्यापित करे।',
      },
    },
  ];
  return {
    id: orderId,
    orderDate: ORDER_DATE,
    grievanceNumber: input.grievanceNumber,
    challanNumber: input.challanNumber,
    heading: { en: 'Fictional rejection order', hi: 'काल्पनिक अस्वीकृति आदेश' },
    paragraphs,
    syntheticAuthority: true,
    extractedFacts: [
      { id: 'order-id', label: { en: 'Order ID', hi: 'आदेश संख्या' }, value: orderId, sourceParagraphs: ['header.orderId'] },
      { id: 'grievance-id', label: { en: 'Linked grievance', hi: 'जुड़ी आपत्ति' }, value: input.grievanceNumber, sourceParagraphs: ['header.grievanceNumber'] },
      { id: 'challan-id', label: { en: 'Linked e-Challan', hi: 'जुड़ा ई-चालान' }, value: input.challanNumber, sourceParagraphs: ['header.challanNumber'] },
      { id: 'order-date', label: { en: 'Order date', hi: 'आदेश की तारीख' }, value: ORDER_DATE, sourceParagraphs: ['header.orderDate'] },
      { id: 'outcome', label: { en: 'Recorded outcome', hi: 'दर्ज नतीजा' }, value: 'Grievance rejected', sourceParagraphs: ['O5'] },
      { id: 'reason', label: { en: 'Stated reason', hi: 'दर्ज कारण' }, value: reason, sourceParagraphs: ['O5'] },
      { id: 'next-route', label: { en: 'Next-route wording', hi: 'अगले रास्ते का पाठ' }, value: paragraphs[5].text.en, sourceParagraphs: ['O6'] },
    ],
  };
}

export function buildOrderEvidenceMap(input: {
  classification: ClassificationResult;
  confirmedFacts: ConfirmedVehicleFacts;
  evidenceIndex: EvidenceIndexItem[];
}): OrderEvidenceRow[] {
  const availableEvidence = new Set(input.evidenceIndex.map((item) => item.id));
  const rows: OrderEvidenceRow[] = [];
  const requireEvidence = (ids: EvidenceItemId[]) => ids.filter((id) => availableEvidence.has(id));

  rows.push({
    id: 'P1',
    label: { en: 'Registered vehicle identifier', hi: 'दर्ज वाहन नंबर' },
    submittedPoint: {
      en: `The submitted vehicle record identifies ${input.confirmedFacts.registeredPlate}.`,
      hi: `जमा वाहन रिकॉर्ड में ${input.confirmedFacts.registeredPlate} दर्ज है।`,
    },
    evidenceIds: requireEvidence(['A2']), factIds: ['record-registration'],
    suggestedStatus: 'mentioned', suggestedReasonRefs: ['O3'], matchBasis: 'exact-identifier',
    explanation: { en: 'O3 repeats the exact submitted vehicle identifier.', hi: 'O3 में जमा वाहन नंबर ठीक उसी तरह दोहराया गया है।' },
  });

  const discrepancyDetails: Record<'registration' | 'category' | 'colour', {
    label: LocalizedText;
    factIds: string[];
    status: OrderMapStatus;
    refs: string[];
    explanation: LocalizedText;
  }> = {
    registration: {
      label: { en: 'Registration comparison', hi: 'वाहन नंबर की तुलना' },
      factIds: ['record-registration', 'observed-registration'], status: 'unclear', refs: ['O2', 'O4'],
      explanation: { en: 'O2 mentions a general vehicle difference and O4 mentions image review, but neither repeats the observed plate characters.', hi: 'O2 में वाहन का सामान्य अंतर और O4 में फ़ोटो समीक्षा है, लेकिन दिखे नंबर के अक्षर नहीं दोहराए गए।' },
    },
    category: {
      label: { en: 'Vehicle category comparison', hi: 'वाहन प्रकार की तुलना' },
      factIds: ['record-category', 'observed-category'], status: 'not-found', refs: [],
      explanation: { en: 'No vehicle-category terms were found in the supplied order text.', hi: 'दिए आदेश के पाठ में वाहन प्रकार का कोई शब्द नहीं मिला।' },
    },
    colour: {
      label: { en: 'Vehicle colour comparison', hi: 'वाहन के रंग की तुलना' },
      factIds: ['record-colour', 'observed-colour'], status: 'not-found', refs: [],
      explanation: { en: 'No colour comparison was found in the supplied order text.', hi: 'दिए आदेश के पाठ में रंग की तुलना नहीं मिली।' },
    },
  };

  for (const discrepancy of input.classification.discrepancies) {
    const detail = discrepancyDetails[discrepancy.field];
    const id = `P${rows.length + 1}` as const;
    rows.push({
      id,
      label: detail.label,
      submittedPoint: {
        en: `${discrepancy.registeredValue} in A2; ${discrepancy.observedValue} in A3.`,
        hi: `A2 में ${discrepancy.registeredValue}; A3 में ${discrepancy.observedValue}।`,
      },
      evidenceIds: requireEvidence(['A2', 'A3']), factIds: detail.factIds,
      suggestedStatus: detail.status, suggestedReasonRefs: detail.refs,
      explanation: detail.explanation,
      matchBasis: detail.status === 'unclear' ? 'possible-semantic-reference' : 'no-supported-reference',
    });
  }

  if (input.classification.limitations.includes('registration-unreadable')) {
    rows.push({
      id: `P${rows.length + 1}` as const,
      label: { en: 'Unreadable registration in image', hi: 'फ़ोटो में वाहन नंबर पढ़ा नहीं जा सकता' },
      submittedPoint: { en: 'The supplied image does not allow a reliable plate reading.', hi: 'दी गई फ़ोटो से वाहन नंबर भरोसे से नहीं पढ़ा जा सकता।' },
      evidenceIds: requireEvidence(['A3']), factIds: ['observed-registration'],
      suggestedStatus: 'mentioned', suggestedReasonRefs: ['O2'], matchBasis: 'direct-phrase',
      explanation: { en: 'O2 directly records the citizen’s statement that the image is unclear.', hi: 'O2 में नागरिक का यह कहना सीधे दर्ज है कि फ़ोटो साफ़ नहीं है।' },
    });
  }

  if (input.classification.limitations.includes('category-not-fully-clear')) {
    rows.push({
      id: `P${rows.length + 1}` as const,
      label: { en: 'Category visibility limitation', hi: 'वाहन प्रकार दिखने की सीमा' },
      submittedPoint: { en: 'The vehicle category is not fully clear in the supplied image.', hi: 'दी गई फ़ोटो में वाहन प्रकार पूरी तरह साफ़ नहीं है।' },
      evidenceIds: requireEvidence(['A3']), factIds: ['observed-category'],
      suggestedStatus: 'not-found', suggestedReasonRefs: [], matchBasis: 'no-supported-reference',
      explanation: { en: 'No explicit category-visibility reference was found in the supplied order text.', hi: 'दिए आदेश के पाठ में वाहन प्रकार की स्पष्टता का सीधा संदर्भ नहीं मिला।' },
    });
  }

  if (input.classification.limitations.includes('colour-not-fully-clear')) {
    rows.push({
      id: `P${rows.length + 1}` as const,
      label: { en: 'Colour visibility limitation', hi: 'रंग दिखने की सीमा' },
      submittedPoint: { en: 'The vehicle colour is not fully clear in the supplied image.', hi: 'दी गई फ़ोटो में वाहन का रंग पूरी तरह साफ़ नहीं है।' },
      evidenceIds: requireEvidence(['A3']), factIds: ['observed-colour'],
      suggestedStatus: 'not-found', suggestedReasonRefs: [], matchBasis: 'no-supported-reference',
      explanation: { en: 'No explicit colour-visibility reference was found in the supplied order text.', hi: 'दिए आदेश के पाठ में रंग की स्पष्टता का सीधा संदर्भ नहीं मिला।' },
    });
  }

  if (input.classification.limitations.includes('offence-not-assessable')) {
    rows.push({
      id: `P${rows.length + 1}` as const,
      label: { en: 'Offence visibility limitation', hi: 'उल्लंघन दिखने की सीमा' },
      submittedPoint: { en: 'The rider or alleged offence was not reliably assessable in the supplied image.', hi: 'दी गई फ़ोटो में चालक या बताए उल्लंघन का भरोसेमंद आकलन नहीं हो सका।' },
      evidenceIds: requireEvidence(['A1', 'A3']), factIds: ['offence-visible'],
      suggestedStatus: 'unclear', suggestedReasonRefs: ['O4'], matchBasis: 'possible-semantic-reference',
      explanation: { en: 'O4 says the image was considered sufficient, but does not explicitly describe rider or offence visibility.', hi: 'O4 में फ़ोटो को पर्याप्त कहा गया है, लेकिन चालक या उल्लंघन की दृश्यता साफ़ नहीं बताई गई।' },
    });
  }

  rows.push({
    id: `P${rows.length + 1}` as const,
    label: { en: 'Requested reasoned review', hi: 'कारण सहित समीक्षा का अनुरोध' },
    submittedPoint: { en: 'The citizen requested a reasoned review of the supplied evidence.', hi: 'नागरिक ने दिए सबूत की कारण सहित समीक्षा माँगी।' },
    evidenceIds: requireEvidence(['A5']), factIds: ['requested-action'],
    suggestedStatus: 'unclear', suggestedReasonRefs: ['O1', 'O5'], matchBasis: 'possible-semantic-reference',
    explanation: { en: 'O1 records review of the grievance and documents, and O5 gives a decision and reason. Neither explicitly says that a reasoned review was requested.', hi: 'O1 में आपत्ति और दस्तावेज़ों की समीक्षा तथा O5 में फैसला और कारण दर्ज है। दोनों में से कोई भी साफ़ नहीं कहता कि कारण सहित समीक्षा माँगी गई थी।' },
  });

  return rows;
}

export function createInitialOrderMapReviews(rows: OrderEvidenceRow[]): Record<string, OrderMapReview> {
  return Object.fromEntries(rows.map((row) => [row.id, {
    status: row.suggestedStatus,
    reasonRefs: row.suggestedReasonRefs,
    confirmed: false,
  }]));
}

export function invalidateOrderMapConfirmations(reviews: Record<string, OrderMapReview>): Record<string, OrderMapReview> {
  return Object.fromEntries(Object.entries(reviews).map(([rowId, review]) => [rowId, { ...review, confirmed: false }]));
}

export function validateOrderFactReview(
  facts: OrderExtractedFact[],
  confirmedFactIds: string[],
  completeness: OrderCompleteness | null,
  expectedLinkage: Partial<Record<OrderFactId, string>> = {},
  dateBounds: { earliest: string; reference: string } = { earliest: ORDER_ACKNOWLEDGED_DATE, reference: ORDER_REVIEW_REFERENCE_DATE },
): OrderFactReviewValidation {
  const confirmed = new Set(confirmedFactIds);
  const missingFactIds = facts.filter((fact) => !confirmed.has(fact.id)).map((fact) => fact.id);
  const emptyFactIds = facts.filter((fact) => !fact.value.trim()).map((fact) => fact.id);
  const isCalendarDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  };
  const invalidFactIds = facts.filter((fact) => {
    if (fact.id === 'order-date') {
      if (!isCalendarDate(fact.value)) return true;
      if (fact.value < dateBounds.earliest || fact.value > dateBounds.reference) return true;
    }
    const expected = expectedLinkage[fact.id];
    return expected !== undefined && fact.value.trim().toLocaleLowerCase('en-IN') !== expected.trim().toLocaleLowerCase('en-IN');
  }).map((fact) => fact.id);
  return {
    complete: missingFactIds.length === 0 && emptyFactIds.length === 0 && invalidFactIds.length === 0 && completeness !== null,
    missingFactIds,
    emptyFactIds,
    invalidFactIds,
    completenessAnswered: completeness !== null,
  };
}

export function validateOrderMapReview(
  rows: OrderEvidenceRow[],
  reviews: Record<string, OrderMapReview>,
  validParagraphIds: string[],
): OrderMapReviewValidation {
  const validRefs = new Set(validParagraphIds);
  const unconfirmedRowIds = rows.filter((row) => !reviews[row.id]?.confirmed).map((row) => row.id);
  const invalidReferenceRowIds = rows.filter((row) => {
    const review = reviews[row.id];
    if (!review) return true;
    if (review.status === 'not-found') return review.reasonRefs.length > 0;
    return review.reasonRefs.length === 0 || review.reasonRefs.some((ref) => !validRefs.has(ref));
  }).map((row) => row.id);
  return {
    complete: unconfirmedRowIds.length === 0 && invalidReferenceRowIds.length === 0,
    unconfirmedRowIds,
    invalidReferenceRowIds,
  };
}

export function orderStatusLabel(status: OrderMapStatus, language: Language, completeness: OrderCompleteness): string {
  if (status === 'mentioned') return language === 'hi' ? 'स्पष्ट उल्लेख' : 'Explicitly mentioned';
  if (status === 'unclear') return language === 'hi' ? 'संदर्भ साफ़ नहीं' : 'Reference unclear';
  if (completeness === 'yes') return language === 'hi' ? 'दिए गए आदेश के पाठ में नहीं मिला' : 'Not found in supplied order text';
  return language === 'hi' ? 'दिए गए पन्नों में नहीं मिला' : 'Not found in supplied pages';
}

export function buildClarificationDraft(input: {
  language: Language;
  challanNumber: string;
  grievanceNumber: string;
  completeness: OrderCompleteness;
  rows: OrderEvidenceRow[];
  reviews: Record<string, OrderMapReview>;
}): string | null {
  const notFound = input.rows.filter((row) => input.reviews[row.id]?.status === 'not-found').map((row) => row.id);
  const unclear = input.rows.filter((row) => input.reviews[row.id]?.status === 'unclear').map((row) => row.id);
  if (notFound.length === 0 && unclear.length === 0) return null;
  const incompleteOpening = input.completeness === 'yes'
    ? ''
    : input.language === 'hi'
      ? 'कृपया पूरा आदेश और उससे जुड़े सभी परिशिष्ट उपलब्ध कराएँ।\n\n'
      : 'Please provide the complete order and any linked annexures.\n\n';
  if (input.language === 'hi') {
    return `विषय: ई-चालान ${input.challanNumber} पर दर्ज कारणों के स्पष्टीकरण का अनुरोध\n\n${incompleteOpening}मैंने आपत्ति ${input.grievanceNumber} के साथ जमा सबूत सूची से दिए गए काल्पनिक आदेश का मिलान किया।\n\n${notFound.length ? `दिए गए ${input.completeness === 'yes' ? 'आदेश के पाठ' : 'पन्नों'} में जमा बिंदु ${notFound.join(', ')} का स्पष्ट उल्लेख नहीं मिला। ` : ''}${unclear.length ? `${unclear.join(', ')} के संदर्भ साफ़ नहीं थे। ` : ''}इसका अर्थ यह नहीं कि इन बिंदुओं पर विचार नहीं हुआ या आदेश अमान्य है।\n\nयदि उपलब्ध हो, कृपया आदेश या उससे जुड़े परिशिष्ट का वह हिस्सा उपलब्ध कराएँ जिसमें इन बिंदुओं पर दर्ज कारण दिए गए हैं।\n\nयह अनुरोध केवल दर्ज कारण समझने के लिए है। समीक्षा रिकॉर्ड में जमा बिंदु, आदेश के अनुच्छेद और नागरिक द्वारा पक्के किए मिलान सुरक्षित हैं।`;
  }
  return `Subject: Request for clarification of recorded reasons for e-Challan ${input.challanNumber}\n\n${incompleteOpening}I reviewed the supplied fictional order against the evidence index submitted with grievance ${input.grievanceNumber}.\n\n${notFound.length ? `In the supplied ${input.completeness === 'yes' ? 'order text' : 'pages'}, I could not find an explicit reference to submitted points ${notFound.join(', ')}. ` : ''}${unclear.length ? `The references to ${unclear.join(', ')} were unclear. ` : ''}This note does not state that those points were ignored or that the order is invalid.\n\nIf available, please provide the part of the order or any linked annexure that records the reasons concerning these points.\n\nThis request seeks clarity on the recorded reasons only. The review record preserves the submitted points, supplied order paragraphs, and citizen-confirmed mappings.`;
}

export function buildOrderReviewNote(input: {
  language: Language;
  generatedOn: string;
  order: SyntheticRejectedOrder;
  extractedFacts: OrderExtractedFact[];
  completeness: OrderCompleteness;
  rows: OrderEvidenceRow[];
  reviews: Record<string, OrderMapReview>;
  evidenceIndex: EvidenceIndexItem[];
  submittedRevisionId: string;
}): string {
  const line = (value: LocalizedText) => value[input.language];
  const heading = input.language === 'hi' ? 'आदेश समीक्षा नोट' : 'ORDER REVIEW NOTE';
  const boundary = input.language === 'hi'
    ? 'यह दिए गए आदेश के पाठ और जमा सबूतों का नागरिक द्वारा पक्का किया मिलान है। यह अपील, कानूनी राय या आधिकारिक फाइलिंग नहीं है।'
    : 'Citizen-confirmed comparison of supplied order text and submitted evidence. This is not an appeal, legal opinion, or official filing.';
  const caveat = input.language === 'hi'
    ? '“नहीं मिला” का अर्थ यह नहीं कि प्राधिकरण ने उस बिंदु पर विचार नहीं किया या आदेश अमान्य है। वह दूसरे पन्ने, परिशिष्ट या रिकॉर्ड में हो सकता है।'
    : '“Not found” does not mean the authority ignored the point or that the order is invalid. It may appear in another page, annexure, or record.';
  const mapLines = input.rows.map((row) => {
    const review = input.reviews[row.id];
    const refs = review.reasonRefs.length ? review.reasonRefs.join(', ') : (input.language === 'hi' ? 'कोई अनुच्छेद नहीं' : 'No paragraph');
    return `${row.id} · ${line(row.label)}\n  ${orderStatusLabel(review.status, input.language, input.completeness)} · ${row.evidenceIds.join(', ')} · ${refs}\n  ${line(row.submittedPoint)}`;
  }).join('\n\n');
  const corrections = input.extractedFacts.flatMap((fact) => {
    const initial = input.order.extractedFacts.find((item) => item.id === fact.id);
    return initial && initial.value !== fact.value ? [`${fact.id}: ${initial.value} → ${fact.value}`] : [];
  });
  const correctionSection = corrections.length
    ? `\n\n${input.language === 'hi' ? 'नागरिक द्वारा सुधारी गई आदेश जानकारी' : 'CITIZEN-CORRECTED ORDER FACTS'}\n${corrections.join('\n')}`
    : '';
  const factValue = (id: OrderFactId, fallback: string) => input.extractedFacts.find((fact) => fact.id === id)?.value ?? fallback;
  const completenessLabel: Record<OrderCompleteness, LocalizedText> = {
    yes: { en: 'Complete order supplied', hi: 'पूरा आदेश दिया गया' },
    no: { en: 'Pages or annexures missing', hi: 'पन्ने या परिशिष्ट नहीं मिले' },
    'not-sure': { en: 'Completeness not certain', hi: 'पूर्णता पक्की नहीं' },
  };
  const translateSummary = (summary: string) => {
    if (input.language !== 'hi') return summary;
    if (summary === 'Synthetic') return 'सिंथेटिक';
    if (summary === 'Not submitted') return 'जमा नहीं हुआ';
    if (summary === 'Unavailable') return 'उपलब्ध नहीं';
    if (summary === 'Unavailable / unclear') return 'उपलब्ध नहीं / साफ़ नहीं';
    return summary;
  };
  const localizedEvidenceLines = input.evidenceIndex.map((item) => `${item.id} · ${line(item.label)} · ${translateSummary(item.summary)}`).join('\n');
  const section = input.language === 'hi'
    ? {
      case: 'मामला', revision: 'जमा रिविज़न', completeness: 'आदेश की पूर्णता', evidence: 'सबूत सूची', map: 'नागरिक द्वारा पक्का उल्लेख मानचित्र', scope: 'दायरा',
      final: 'किसी सरकारी सिस्टम से संपर्क नहीं हुआ। नामित प्राधिकरण ही फैसला लेने वाला निकाय है।',
    }
    : {
      case: 'CASE', revision: 'Submitted revision', completeness: 'Order completeness', evidence: 'EVIDENCE INDEX', map: 'CITIZEN-CONFIRMED MENTION MAP', scope: 'SCOPE',
      final: 'No government system was contacted. The designated authority remains the decision-maker.',
    };
  return `${heading}\nchallansakshi.order-review.v1 · ${input.generatedOn}\n\n${boundary}\n\n${section.case}\n${factValue('challan-id', input.order.challanNumber)} · ${factValue('grievance-id', input.order.grievanceNumber)} · ${factValue('order-id', input.order.id)}\n${input.language === 'hi' ? 'आदेश तारीख' : 'Order date'}: ${factValue('order-date', input.order.orderDate)}\n${section.revision}: ${input.submittedRevisionId}\n${section.completeness}: ${line(completenessLabel[input.completeness])}\n\n${section.evidence}\n${localizedEvidenceLines}\n\n${section.map}\n${mapLines}${correctionSection}\n\n${section.scope}\n${caveat}\n${section.final}`;
}

export function buildOrderReviewArtifact(input: {
  generatedOn: string;
  order: SyntheticRejectedOrder;
  extractedFacts: OrderExtractedFact[];
  completeness: OrderCompleteness;
  rows: OrderEvidenceRow[];
  reviews: Record<string, OrderMapReview>;
  evidenceIndex: EvidenceIndexItem[];
  submittedRevisionId: string;
}) {
  const orderParagraphIds = new Set(input.order.paragraphs.map((item) => item.id));
  const evidenceIds = new Set(input.evidenceIndex.map((item) => item.id));
  const mappings = input.rows.map((row) => {
    const review = input.reviews[row.id];
    if (!review) throw new Error(`Missing review for ${row.id}`);
    if (!review.confirmed) throw new Error(`Unconfirmed review for ${row.id}`);
    if (row.evidenceIds.some((id) => !evidenceIds.has(id))) throw new Error(`Unknown evidence reference in ${row.id}`);
    if (review.reasonRefs.some((id) => !orderParagraphIds.has(id as OrderParagraph['id']))) throw new Error(`Unknown order reference in ${row.id}`);
    if (review.status === 'not-found' && review.reasonRefs.length > 0) throw new Error(`Not-found review cannot cite an order paragraph in ${row.id}`);
    if (review.status !== 'not-found' && review.reasonRefs.length === 0) throw new Error(`Missing order reference in ${row.id}`);
    return {
      pointId: row.id,
      submittedPoint: row.submittedPoint,
      evidenceIds: row.evidenceIds,
      factIds: row.factIds,
      suggested: { status: row.suggestedStatus, reasonRefs: row.suggestedReasonRefs, matchBasis: row.matchBasis },
      citizenReview: {
        status: review.status,
        reasonRefs: review.reasonRefs,
        confirmed: review.confirmed,
        changed: review.status !== row.suggestedStatus || review.reasonRefs.join('|') !== row.suggestedReasonRefs.join('|'),
      },
    };
  });
  const citizenCorrections = input.extractedFacts.flatMap((fact) => {
    const initial = input.order.extractedFacts.find((item) => item.id === fact.id);
    if (!initial || initial.value === fact.value) return [];
    return [{ factId: fact.id, initialValue: initial.value, citizenConfirmedValue: fact.value, sourceParagraphs: fact.sourceParagraphs }];
  });
  return {
    schema: 'challansakshi.order-review.v1',
    generatedOn: input.generatedOn,
    syntheticOnly: true,
    submittedRevisionId: input.submittedRevisionId,
    sourceOrder: input.order,
    extractedFacts: input.extractedFacts,
    citizenCorrections,
    completeness: input.completeness,
    evidenceIndex: input.evidenceIndex,
    mappings,
    boundaries: [
      'Text coverage, not legal adequacy.',
      'Not an appeal, legal opinion, or official filing.',
      'No government system was contacted.',
      'Not found in supplied text does not establish what another record contains.',
    ],
  };
}

export function buildPostDecisionCalendar(input: {
  orderDate: string;
  indicativeBoundary: string;
  orderId: string;
  generatedOn?: string;
}): string {
  const compact = (date: string) => date.replaceAll('-', '');
  const uid = `${input.orderId.toLowerCase()}-indicative-boundary@challansakshi.demo`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChallanSakshi//Synthetic Demo//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${compact(input.generatedOn ?? ORDER_REVIEW_REFERENCE_DATE)}T000000Z`,
    `DTSTART;VALUE=DATE:${compact(input.indicativeBoundary)}`,
    'SUMMARY:Verify indicative post-order route',
    `DESCRIPTION:Synthetic reminder calculated from fictional order date ${input.orderDate}. Verify the current official route and cutoff.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
