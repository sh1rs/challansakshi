import type { CaseFact } from './cases';
import { JURISDICTIONS } from './document-bridge';

export const MAX_TASK_INTAKE_TEXT = 2000;
const MAX_CANDIDATES = 30;
export type TaskIntakeKind = 'registration' | 'reference' | 'jurisdiction';
/** Offsets refer to the unchanged input string; they are for the in-memory review only. */
export type TaskIntakeCandidate = { id: string; kind: TaskIntakeKind; value: string; spans: { start: number; end: number }[] };
export type TaskIntakeExtraction = { candidates: TaskIntakeCandidate[]; issue: 'too-long' | 'too-many' | null };
export type TaskIntakeSelection = { id: string; value: string };
export type TaskIntakeReviewResult = { facts: CaseFact[]; reference: string; jurisdiction: string };

const PREFIXES = 'AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TG|TN|TR|TS|UA|UK|UP|WB';
// Recognition of conventional written forms only: no official validity, ownership or state inference.
const REGISTRATION = `(?:(?:${PREFIXES})[ -]?\\d{1,2}[ -]?[A-Z]{1,3}[ -]?\\d{4}|\\d{2}[ -]?BH[ -]?\\d{4}[ -]?[A-Z]{2})`;
const REFERENCE_TOKEN = '[A-Za-z0-9][A-Za-z0-9_/-]{2,79}(?![\\p{L}\\p{N}_/@-])';
const REFERENCE_LABEL = '(?:(?:challan|transaction|payment|application|acknowledg(?:e)?ment|receipt)[ \\t]+(?:reference(?:[ \\t]+(?:number|no\\.?|id))?|ref\\.?|number|no\\.?|id)|reference(?:[ \\t]+(?:number|no\\.?|id))?|ref\\.?|(?:चालान|लेन-देन|लेनदेन|भुगतान|आवेदन|पावती|रसीद)[ \\t]+(?:संख्या|नंबर|संदर्भ)|संदर्भ(?:[ \\t]+(?:संख्या|नंबर))?)';
const AUTHORITY_END = '(?:Traffic Police|Transport Department|Transport Authority|Transport Office|Police|RTO|यातायात पुलिस|ट्रैफिक पुलिस|परिवहन विभाग|पुलिस|आरटीओ)';
const AUTHORITY_WORD = "[\\p{L}\\p{M}][\\p{L}\\p{M}'’\\-]{0,35}";
const NAMED_AUTHORITY = `(?:${AUTHORITY_WORD}[ \\t]+){1,6}?${AUTHORITY_END}`;
const UNCERTAIN_JURISDICTION = /\b(?:unknown|uncertain|unsure|maybe|perhaps|guess(?:ing)?|not[ \t]+(?:sure|known|available|confirmed)|(?:do[ \t]+not|don['’]?t)[ \t]+know|(?:may|might|could)[ \t]+be|(?:not|never)[ \t]+issued[ \t]+(?:by|in))\b|(?:पता|मालूम|निश्चित)[ \t]+नहीं|नहीं[ \t]+(?:पता|मालूम)|अज्ञात|शायद|संभवतः|अनिश्चित/iu;
const HINDI_STATES: Record<string, string> = {
  'अंडमान और निकोबार द्वीपसमूह': 'Andaman and Nicobar Islands', 'आंध्र प्रदेश': 'Andhra Pradesh', 'अरुणाचल प्रदेश': 'Arunachal Pradesh', 'असम': 'Assam', 'बिहार': 'Bihar', 'चंडीगढ़': 'Chandigarh', 'छत्तीसगढ़': 'Chhattisgarh', 'दादरा और नगर हवेली और दमन और दीव': 'Dadra and Nagar Haveli and Daman and Diu', 'दिल्ली': 'Delhi', 'गोवा': 'Goa', 'गुजरात': 'Gujarat', 'हरियाणा': 'Haryana', 'हिमाचल प्रदेश': 'Himachal Pradesh', 'जम्मू और कश्मीर': 'Jammu and Kashmir', 'झारखंड': 'Jharkhand', 'कर्नाटक': 'Karnataka', 'केरल': 'Kerala', 'लद्दाख': 'Ladakh', 'लक्षद्वीप': 'Lakshadweep', 'मध्य प्रदेश': 'Madhya Pradesh', 'महाराष्ट्र': 'Maharashtra', 'मणिपुर': 'Manipur', 'मेघालय': 'Meghalaya', 'मिजोरम': 'Mizoram', 'नागालैंड': 'Nagaland', 'ओडिशा': 'Odisha', 'पुदुचेरी': 'Puducherry', 'पंजाब': 'Punjab', 'राजस्थान': 'Rajasthan', 'सिक्किम': 'Sikkim', 'तमिलनाडु': 'Tamil Nadu', 'तमिल नाडु': 'Tamil Nadu', 'तेलंगाना': 'Telangana', 'त्रिपुरा': 'Tripura', 'उत्तर प्रदेश': 'Uttar Pradesh', 'उत्तराखंड': 'Uttarakhand', 'पश्चिम बंगाल': 'West Bengal',
};
const STATE_NAMES = new Map([...JURISDICTIONS.map(value => [value.toLowerCase(), value] as const), ...Object.entries(HINDI_STATES)]);
const STATE_PATTERN = [...STATE_NAMES.keys()].sort((a, b) => b.length - a.length).join('|');

function normaliseRegistration(value: string): string {
  return value.replace(/[ -]/g, '').toUpperCase();
}
function fieldText(text: string, start: number): string {
  return text.slice(start).split(/[\n;.!?।]/u, 1)[0].split(/,[ \t]*(?:(?:reference|ref|state|jurisdiction|issuing authority|संदर्भ|राज्य)\s*[:=])/iu, 1)[0];
}
function uncertainJurisdiction(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start).split(/[\n;.!?।]/u).at(-1)?.slice(-160) ?? '';
  const after = text.slice(end).split(/[\n;.!?।]/u, 1)[0].slice(0, 120);
  return UNCERTAIN_JURISDICTION.test(before + text.slice(start, end) + after)
    || /\bnot[ \t]*$/iu.test(before)
    || /^[ \t]*(?:नहीं|नही)(?![\p{L}\p{M}])/u.test(after)
    || /^[ \t]*\?/u.test(text.slice(end));
}
function trailingResidence(text: string, end: number): boolean {
  const after = text.slice(end, end + 160).split(/[\n;.!?।]/u, 1)[0];
  const annotation = /^[ \t]*[([]([^\])]{0,120})[)\]]/u.exec(after)?.[1];
  if (annotation && /\b(?:home|residen(?:ce|tial)|native|current|present|registration|where[ \t]+I[ \t]+(?:live|reside))\b|निवास|आवास|घर|वर्तमान|मौजूदा|पंजीकरण/u.test(annotation.toLowerCase())) return true;
  return /^[ \t]*(?:[,—–-][ \t]*)?(?:(?:my|our|the)[ \t]+)?(?:home|residence|residential|native[ \t]+state|(?:current|present)[ \t]+state|where[ \t]+I[ \t]+(?:live|reside))(?![\p{L}\p{M}])|^[ \t]*(?:[,—–-][ \t]*)?(?:(?:मेरा|मेरे|मेरी|हमारा)[ \t]+)?(?:निवास|आवास|घर|वर्तमान[ \t]+राज्य|मौजूदा[ \t]+राज्य)(?![\p{L}\p{M}])/iu.test(after);
}

/** Conservative candidates, never confirmed facts. No network, storage, OCR or model calls. */
export function extractTaskIntake(text: string): TaskIntakeExtraction {
  if (typeof text !== 'string' || text.length > MAX_TASK_INTAKE_TEXT) return { candidates: [], issue: 'too-long' };
  const candidates: TaskIntakeCandidate[] = [];
  const add = (kind: TaskIntakeKind, value: string, start: number, end: number) => {
    const previous = candidates.find(item => item.kind === kind && item.value === value);
    if (previous) {
      if (!previous.spans.some(span => span.start === start && span.end === end)) previous.spans.push({ start, end });
    } else candidates.push({ id: `${kind}-${start}-${end}`, kind, value, spans: [{ start, end }] });
  };
  for (const match of text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_/@])${REGISTRATION}(?![\\p{L}\\p{N}_/@])`, 'giu'))) {
    add('registration', normaliseRegistration(match[0]), match.index, match.index + match[0].length);
  }

  const labels = new RegExp(`(?<![\\p{L}\\p{N}_])${REFERENCE_LABEL}(?:[ \\t]*[:#=][ \\t]*|[ \\t]+(?:is[ \\t]+)?)`, 'giu');
  for (const label of text.matchAll(labels)) {
    let start = label.index + label[0].length;
    const token = new RegExp(`^(${REFERENCE_TOKEN})`, 'u').exec(text.slice(start));
    if (!token || !/\d/u.test(token[1])) continue;
    add('reference', token[1], start, start + token[1].length);
    start += token[1].length;
    // Only explicit adjacent alternatives continue this label's scope.
    for (;;) {
      const alternative = new RegExp(`^([ \\t]*(?:[,|]|(?:or|and|या|और)(?![\\p{L}\\p{N}]))[ \\t]*)(${REFERENCE_TOKEN})`, 'iu').exec(text.slice(start));
      if (!alternative || !/\d/u.test(alternative[2])) break;
      const offset = start + alternative[1].length;
      add('reference', alternative[2], offset, offset + alternative[2].length);
      start += alternative[0].length;
    }
  }

  const stateLabels = /(?<![\p{L}\p{N}_])(?:issuing state|state|jurisdiction|राज्य|क्षेत्राधिकार)(?:[ \t]*[:=][ \t]*|[ \t]+is[ \t]+)|(?<![\p{L}\p{N}_])issued[ \t]+in[ \t]+/giu;
  for (const label of text.matchAll(stateLabels)) {
    const prefix = text.slice(Math.max(0, label.index - 80), label.index);
    if (/^(?:state|राज्य)/iu.test(label[0]) && /(?:current|home|residential|residence|native|present|permanent|destination|origin|old|new|previous|registration|registered|vehicle|(?:resid(?:e|ing)|liv(?:e|ing))(?:[ \t]+in)?|वर्तमान|मौजूदा|आवासीय|मूल|पुराना|नया|पंजीकरण|वाहन|(?:निवास|आवास|घर|रहने)(?:[ \t]+का)?)[ \t-]*$/iu.test(prefix)) continue;
    const offset = label.index + label[0].length;
    const first = new RegExp(`^([ \\t]*)(${STATE_PATTERN})(?![\\p{L}\\p{N}])`, 'iu').exec(text.slice(offset));
    if (!first) continue;
    const firstStart = offset + first[1].length; const firstEnd = offset + first[0].length;
    if (!trailingResidence(text, firstEnd) && !uncertainJurisdiction(text, firstStart, firstEnd)) add('jurisdiction', STATE_NAMES.get(first[2].toLowerCase())!, firstStart, firstEnd);
    let cursor = offset + first[0].length;
    for (;;) {
      const alternative = new RegExp(`^([ \\t]*(?:[,/|]|(?:or|and|या|और)(?![\\p{L}\\p{N}]))[ \\t]*)(${STATE_PATTERN})(?![\\p{L}\\p{N}])`, 'iu').exec(text.slice(cursor));
      if (!alternative) break;
      const start = cursor + alternative[1].length; const end = cursor + alternative[0].length;
      if (!trailingResidence(text, end) && !uncertainJurisdiction(text, start, end)) add('jurisdiction', STATE_NAMES.get(alternative[2].toLowerCase())!, start, end);
      cursor += alternative[0].length;
    }
  }
  const authorityLabels = /(?<![\p{L}\p{N}_])(?:issuing authority|issued by|issuer|जारीकर्ता प्राधिकरण|जारीकर्ता)(?:[ \t]*[:=][ \t]*|[ \t]+(?:is[ \t]+)?)/giu;
  for (const label of text.matchAll(authorityLabels)) {
    const offset = label.index + label[0].length;
    const segment = fieldText(text, offset);
    const separators = [...segment.matchAll(/[ \t]+(?:or|या|and|और|\/)[ \t]+/giu)].filter(match => {
      if (!/\b(?:and)\b|और/iu.test(match[0])) return true;
      const named = new RegExp(AUTHORITY_END, 'iu');
      return named.test(segment.slice(0, match.index)) && named.test(segment.slice(match.index + match[0].length));
    });
    let cursor = 0;
    for (const separator of [...separators.map(match => ({ index: match.index, length: match[0].length })), { index: segment.length, length: 0 }]) {
      const part = segment.slice(cursor, separator.index);
      const named = new RegExp(`^([ \\t]*)(${NAMED_AUTHORITY})(?![\\p{L}\\p{M}\\p{N}])`, 'iu').exec(part);
      const start = offset + cursor + (named?.[1].length ?? 0);
      cursor = separator.index + separator.length;
      if (!named) continue;
      const value = named[2];
      if (value.length > 160 || uncertainJurisdiction(text, start, start + value.length)) continue;
      add('jurisdiction', value, start, start + value.length);
    }
  }
  // The named authority is explicit context; a standalone place name is not.
  for (const match of text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])(?:${STATE_PATTERN})[ \\t]+${AUTHORITY_END}(?![\\p{L}\\p{N}])`, 'giu'))) {
    const start = match.index; const end = start + match[0].length;
    if (!uncertainJurisdiction(text, start, end) && !candidates.some(item => item.kind === 'jurisdiction' && item.spans.some(span => span.start <= start && span.end >= end))) add('jurisdiction', match[0], start, end);
  }
  if (candidates.length > MAX_CANDIDATES) return { candidates: [], issue: 'too-many' };
  const order: TaskIntakeKind[] = ['registration', 'reference', 'jurisdiction'];
  candidates.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.spans[0].start - b.spans[0].start);
  return { candidates, issue: null };
}

/** Called only by the explicit review action. Source spans and raw prose are not persisted. */
export function reviewTaskIntake(text: string, selections: TaskIntakeSelection[], language: 'en' | 'hi'): TaskIntakeReviewResult {
  if (language !== 'en' && language !== 'hi') throw new Error('Unsupported review language.');
  const extraction = extractTaskIntake(text);
  if (extraction.issue) throw new Error('Shorten the task before reviewing these details.');
  if (!Array.isArray(selections) || selections.length > MAX_CANDIDATES) throw new Error('Too many selected details.');
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const usedIds = new Set<string>(); const counts: Record<TaskIntakeKind, number> = { registration: 0, reference: 0, jurisdiction: 0 };
  const result: TaskIntakeReviewResult = { facts: [], reference: '', jurisdiction: '' };
  for (const selection of selections) {
    const candidate = extraction.candidates.find(item => item.id === selection.id);
    if (!candidate) throw new Error(t('The source text changed. Review these details again.', 'स्रोत पाठ बदल गया। जानकारी फिर जाँचें।'));
    if (usedIds.has(selection.id)) throw new Error('Duplicate selected source.');
    usedIds.add(selection.id);
    if (typeof selection.value !== 'string' || /[\u0000-\u001F\u007F]/u.test(selection.value)) throw new Error(t('Remove unsupported characters from the selected detail.', 'चुनी जानकारी से असमर्थित अक्षर हटाएँ।'));
    let value = selection.value.trim();
    if (!value || value.length > 160) throw new Error(t('Each selected detail needs a value of at most 160 characters, or leave it out.', 'हर चुनी जानकारी में 160 अक्षरों तक मान दें या उसे छोड़ दें।'));
    counts[candidate.kind] += 1;
    if (candidate.kind !== 'registration' && counts[candidate.kind] > 1) throw new Error(t('Choose one reference and one state or issuing authority at most.', 'अधिकतम एक संदर्भ और एक राज्य या जारीकर्ता चुनें।'));
    const suffix = t(' · reviewed from your task', ' · आपके काम से समीक्षा की गई');
    if (candidate.kind === 'registration') {
      if (!new RegExp(`^${REGISTRATION}$`, 'iu').test(value)) throw new Error(t('Check the vehicle registration format, or leave it in your notes.', 'वाहन नंबर का प्रारूप जाँचें या उसे अपने नोट में रहने दें।'));
      value = normaliseRegistration(value);
      if (result.facts.some(fact => fact.key.startsWith('task_registration_') && fact.value === value)) throw new Error(t('The selected vehicle registrations repeat. Keep one copy.', 'चुने वाहन नंबर दोहराए गए हैं। एक प्रति रखें।'));
      result.facts.push({ key: `task_registration_${counts.registration}`, label: t('Vehicle registration', 'वाहन पंजीकरण') + suffix, value, source: 'citizen', confirmed: true });
    } else {
      if (candidate.kind === 'reference') result.reference = value;
      else result.jurisdiction = value;
      result.facts.push({ key: `task_${candidate.kind}`, label: (candidate.kind === 'reference' ? t('Reference', 'संदर्भ') : t('State / issuing authority', 'राज्य / जारीकर्ता प्राधिकरण')) + suffix, value, source: 'citizen', confirmed: true });
    }
  }
  return result;
}
