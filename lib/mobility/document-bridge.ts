import type { DocumentEvidence, DocumentReading } from '../document-evidence';
import { createCase, updateCase, type MobilityCase } from './cases';

export const JURISDICTIONS = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'] as const;

/** Only explicit notice jurisdiction labels qualify. A place, vehicle prefix or RC is not the issuer. */
export function readJurisdictionHint(readings: DocumentReading[]): string {
  const matches = new Set<string>();
  for (const reading of readings.filter(item => item.role === 'notice' && !item.limited)) {
    for (const page of reading.pages.slice(0, 3)) {
      for (const line of page.text.slice(0, 200_000).split(/[\r\n]+/)) {
        const value = /^\s*(?:issuing authority|issued by|jurisdiction|state|राज्य|जारीकर्ता)\s*[:：]\s*([^\r\n]{1,160})$/iu.exec(line)?.[1];
        if (!value) continue;
        for (const state of JURISDICTIONS) if (new RegExp(`\\b${state}\\b`, 'i').test(value)) matches.add(state);
      }
    }
  }
  return matches.size === 1 ? [...matches][0] : '';
}

export function buildDocumentCase(evidence: DocumentEvidence, jurisdiction: string, language: 'en' | 'hi', now: string, id: string): MobilityCase {
  const hi = language === 'hi';
  const labels = { registration: hi ? 'पंजीकरण' : 'Registration', 'notice-number': hi ? 'चालान संख्या' : 'Challan number', date: hi ? 'घटना की तारीख' : 'Event date', amount: hi ? 'राशि' : 'Amount', offence: hi ? 'दर्ज अपराध' : 'Recorded offence', location: hi ? 'दर्ज स्थान' : 'Stated location' };
  const facts = evidence.fields.map(field => ({ key: `${field.role}.${field.key}`, label: `${field.role === 'vehicle-record' ? hi ? 'वाहन रिकॉर्ड' : 'Vehicle record' : hi ? 'चालान' : 'Notice'} · ${labels[field.key]}`, value: field.value, source: field.method === 'citizen-correction' ? 'citizen' as const : 'document' as const, sourceId: field.sourceId, ...(field.sourceFingerprint ? { sourceFingerprint: field.sourceFingerprint } : {}), page: field.page, confirmed: field.confidence === 'readable' }));
  const explanation = evidence.comparison === 'different'
    ? hi ? 'मेरे द्वारा जाँचे गए चालान और स्वतंत्र वाहन रिकॉर्ड में पंजीकरण अलग पढ़े गए हैं। कृपया संलग्न मूल रिकॉर्ड के आधार पर इसकी समीक्षा करें।' : 'The registrations I reviewed in the notice and an independent vehicle record were read differently. Please review these details against the original records I supply.'
    : evidence.comparison === 'match'
      ? hi ? 'जाँचे गए पंजीकरण मेल खाते हैं। कृपया मूल चालान के विवरण और उपलब्ध अगले कदम स्पष्ट करें।' : 'The reviewed registrations match. Please clarify the details of the original notice and the available next step.'
      : hi ? 'कुछ विवरण अस्पष्ट हैं या उपलब्ध नहीं हैं। कृपया मूल रिकॉर्ड उपलब्ध कराएँ या नीचे दिए विवरण स्पष्ट करें।' : 'Some readings are unclear or missing. Please provide or clarify the original record and the details below.';
  const draft = [hi ? 'रिकॉर्ड की समीक्षा का अनुरोध' : 'Request for a record review', explanation, ...facts.filter(fact => fact.confirmed).map(fact => `${fact.label}: ${fact.value}`), hi ? 'मैंने मूल रिकॉर्ड और संबंधित संलग्नक जाँच के लिए रखे हैं। यह अनुरोध अभी जमा नहीं हुआ है।' : 'I will provide the original records and relevant attachments for review. This request has not been submitted.'].join('\n\n');
  return updateCase(createCase('challan-review', now, id), { title: hi ? 'मेरे चालान की समीक्षा' : 'Review my challan', jurisdiction, facts, draft, status: 'ready' }, now, { kind: 'prepared', text: hi ? 'जाँचे गए दस्तावेज़ विवरण से अनुरोध तैयार किया।' : 'Prepared a request from reviewed document readings.', basis: 'local' });
}
