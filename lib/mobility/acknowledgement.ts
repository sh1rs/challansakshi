import { validateCase, type CaseStatus, type MobilityCase } from './cases';
import { sha256Hex } from '../local-sha256';

export const MAX_ACKNOWLEDGEMENT_TEXT = 8_000;
export const MAX_ACKNOWLEDGEMENT_CANDIDATES = 24;
export const MAX_ACKNOWLEDGEMENT_CONTEXTS = 3;
export type AcknowledgementLanguage = 'en' | 'hi';
export type AcknowledgementKind = 'reference' | 'date' | 'amount';
export type AcknowledgementSpan = { start: number; end: number; contextStart: number; contextEnd: number };
export type AcknowledgementCandidate = {
  id: string; kind: AcknowledgementKind; value: string; label: string;
  certainty: 'reading' | 'needs-correction'; spans: AcknowledgementSpan[];
};
export type AcknowledgementExtraction = { candidates: AcknowledgementCandidate[]; issue: 'too-long' | 'unsupported-text' | 'too-many' | null };
export type AcknowledgementContext = { start: number; end: number; highlights: { start: number; end: number }[] };
export type AcknowledgementSelection = { id: string; value: string };
export type AcknowledgementReview = { caseId: string; fingerprint: string; reference?: string; status: CaseStatus; note: string };
export type AcknowledgementOptions = { sourceLabel: string; selections: AcknowledgementSelection[]; status: CaseStatus | ''; personalNote: string; replaceReference: boolean };

const STATES: readonly CaseStatus[] = ['preparing', 'ready', 'awaiting-response', 'needs-attention', 'completed'];
const CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const UNCERTAIN = /\b(?:unknown|uncertain|unsure|maybe|perhaps|pending|unavailable|not\s+(?:available|known|confirmed|sure)|possibly|or)\b|अज्ञात|अनिश्चित|शायद|लंबित|पता\s*नहीं|उपलब्ध\s*नहीं|पुष्टि\s*नहीं|या/u;
const REF_LABEL = /^(?:(?:acknowledg(?:e)?ment|receipt|application|transaction|payment|challan)(?:\s+(?:reference|ref\.?))?(?:\s+(?:number|no\.?|id))?|reference(?:\s+(?:number|no\.?|id))?|ref\.?|utr|(?:पावती|रसीद|आवेदन|लेनदेन|लेन-देन|भुगतान|चालान)(?:\s+(?:संदर्भ|संख्या|नंबर))?|संदर्भ(?:\s+(?:संख्या|नंबर))?)$/iu;
const DATE_LABEL = /^(?:(?:acknowledg(?:e)?ment|receipt|application|transaction|payment|submission|issued)\s+date|date|(?:पावती|रसीद|आवेदन|लेनदेन|भुगतान|जमा)(?:\s+की)?\s+(?:तारीख|दिनांक)|तारीख|दिनांक)$/iu;
const AMOUNT_LABEL = /^(?:(?:transaction|payment|total)\s+amount|amount(?:\s+(?:paid|due))?|total|(?:लेनदेन|भुगतान|कुल)\s+राशि|राशि)$/iu;
const MONTHS: Record<string, number> = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12, जनवरी: 1, फरवरी: 2, फ़रवरी: 2, मार्च: 3, अप्रैल: 4, मई: 5, जून: 6, जुलाई: 7, अगस्त: 8, सितंबर: 9, सितम्बर: 9, अक्टूबर: 10, नवंबर: 11, नवम्बर: 11, दिसंबर: 12, दिसम्बर: 12 };

function languageCheck(language: AcknowledgementLanguage) { if (language !== 'en' && language !== 'hi') throw new TypeError('Unsupported acknowledgement language.'); }
function isoDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
function dateReading(value: string): string | null {
  if (isoDate(value)) return value;
  const named = /^(\d{1,2})[ -]+([\p{L}\p{M}.]+)[ ,\-]+(\d{4})$/u.exec(value);
  const month = named && MONTHS[named[2].toLowerCase().replace(/\.$/u, '')];
  return named && month ? isoDate(`${named[3]}-${String(month).padStart(2, '0')}-${named[1].padStart(2, '0')}`) : null;
}
function amountReading(value: string): string | null {
  const match = /^(?:₹\s*|INR\s+|Rs\.?\s+)(\d+(?:,\d+)*(?:\.\d{1,2})?)$/iu.exec(value);
  if (!match) return null;
  const number = match[1];
  if (number.includes(',') && !/^(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/u.test(number)) return null;
  const clean = number.replaceAll(',', '');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/u.test(clean)) return null;
  const [whole, decimal = ''] = clean.split('.');
  return `${whole.replace(/^0+(?=\d)/u, '')}.${decimal.padEnd(2, '0')}`;
}
function referenceReading(value: string): string | null {
  return /^[A-Za-z0-9][A-Za-z0-9_./-]{0,159}$/u.test(value) && /\d/u.test(value) ? value : null;
}

/** Labelled single-field lines/semicolon-separated fields only. Raw text stays with the caller. */
export function extractAcknowledgement(text: string): AcknowledgementExtraction {
  if (typeof text !== 'string' || text.length > MAX_ACKNOWLEDGEMENT_TEXT) return { candidates: [], issue: 'too-long' };
  if (CONTROLS.test(text)) return { candidates: [], issue: 'unsupported-text' };
  const candidates: AcknowledgementCandidate[] = [];
  for (const segment of text.matchAll(/[^\n\r;|]+/gu)) {
    const match = /^\s*([^:=#]{1,70}?)\s*[:=#]\s*(\S(?:.*\S)?)\s*$/u.exec(segment[0]);
    if (!match) continue;
    const label = match[1].trim();
    const kind: AcknowledgementKind | null = REF_LABEL.test(label) ? 'reference' : DATE_LABEL.test(label) ? 'date' : AMOUNT_LABEL.test(label) ? 'amount' : null;
    if (!kind) continue;
    const start = segment.index + segment[0].lastIndexOf(match[2]);
    let end = start + match[2].length;
    // A bare alternative after a separator belongs to this reading's uncertainty,
    // rather than disappearing when the next segment has no field label.
    let cursor = segment.index + segment[0].length;
    while (text[cursor] === ';' || text[cursor] === '|') {
      const tail = /^[^\n\r;|]*/u.exec(text.slice(cursor + 1))![0];
      if (!tail.trim() || /^\s*[^:=#]{1,70}\s*[:=#]/u.test(tail)) break;
      end = cursor + 1 + tail.trimEnd().length; cursor += 1 + tail.length;
    }
    const raw = text.slice(start, end);
    const converted = kind === 'reference' ? referenceReading(raw) : kind === 'date' ? dateReading(raw) : amountReading(raw);
    const uncertain = UNCERTAIN.test(raw.toLowerCase());
    const value = converted && !uncertain ? converted : raw;
    const certainty = converted && !uncertain ? 'reading' : 'needs-correction';
    const contextStart = Math.max(text.lastIndexOf('\n', start), text.lastIndexOf('\r', start)) + 1;
    const lineEnd = text.slice(end).search(/[\n\r]/u);
    const span = { start, end, contextStart, contextEnd: lineEnd < 0 ? text.length : end + lineEnd };
    const prior = candidates.find(candidate => candidate.kind === kind && candidate.value === value && candidate.certainty === certainty);
    if (prior) prior.spans.push(span);
    else candidates.push({ id: `${kind}-${start}-${end}`, kind, value, label, certainty, spans: [span] });
    if (candidates.length > MAX_ACKNOWLEDGEMENT_CANDIDATES) return { candidates: [], issue: 'too-many' };
  }
  return { candidates, issue: null };
}

/** One source line renders once, even when many candidates point to it. The complete paste stays with the caller. */
export function acknowledgementContextPreview(text: string): { contexts: AcknowledgementContext[]; totalContexts: number; totalOccurrences: number } {
  const extraction = extractAcknowledgement(text);
  const grouped = new Map<string, AcknowledgementContext>();
  let totalOccurrences = 0;
  for (const candidate of extraction.candidates) for (const span of candidate.spans) {
    totalOccurrences += 1;
    const key = `${span.contextStart}:${span.contextEnd}`;
    const context = grouped.get(key) ?? { start: span.contextStart, end: span.contextEnd, highlights: [] };
    context.highlights.push({ start: span.start, end: span.end }); grouped.set(key, context);
  }
  const contexts = [...grouped.values()].sort((left, right) => left.start - right.start).slice(0, MAX_ACKNOWLEDGEMENT_CONTEXTS).map(context => {
    const highlights: AcknowledgementContext['highlights'] = [];
    for (const span of context.highlights.sort((left, right) => left.start - right.start || left.end - right.end)) {
      const previous = highlights.at(-1);
      if (previous && span.start <= previous.end) previous.end = Math.max(previous.end, span.end);
      else highlights.push({ ...span });
    }
    return { ...context, highlights };
  });
  return { contexts, totalContexts: grouped.size, totalOccurrences };
}

export function acknowledgementCaseFingerprint(caseValue: MobilityCase, language: AcknowledgementLanguage): string {
  languageCheck(language);
  return sha256Hex(JSON.stringify({ version: 'acknowledgement-v1', caseValue: validateCase(caseValue), language }));
}
export function acknowledgementStatusLabel(status: CaseStatus, language: AcknowledgementLanguage): string {
  languageCheck(language);
  const labels: Record<CaseStatus, [string, string]> = {
    preparing: ['Still preparing', 'अभी तैयारी कर रहा/रही हूँ'], ready: ['Ready for my next step', 'मेरे अगले चरण के लिए तैयार'],
    'awaiting-response': ['Awaiting a response', 'उत्तर की प्रतीक्षा'], 'needs-attention': ['Needs my attention', 'मुझे ध्यान देना है'], completed: ['Completed, as reported by me', 'मेरे अनुसार पूरा हुआ'],
  };
  if (!STATES.includes(status)) throw new TypeError('Choose your reported progress.');
  return labels[status][language === 'hi' ? 1 : 0];
}
function bounded(value: unknown, max: number, label: string, required = false): string {
  if (typeof value !== 'string' || value.length > max || CONTROLS.test(value) || required && !value.trim()) throw new TypeError(`Check ${label} (${max} characters maximum).`);
  return value.trim();
}

/** This creates a preview only. The UI still requires review of the exact resulting note. */
export function buildAcknowledgementReview(caseValue: MobilityCase, text: string, options: AcknowledgementOptions, language: AcknowledgementLanguage): AcknowledgementReview {
  const fingerprint = acknowledgementCaseFingerprint(caseValue, language);
  const checked = validateCase(caseValue); const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const extraction = extractAcknowledgement(text);
  if (extraction.issue || !text.trim()) throw new TypeError(t('Use a non-empty supported source text within the review limit.', 'समीक्षा सीमा में समर्थित गैर-खाली स्रोत पाठ दें।'));
  if (!options || !Array.isArray(options.selections) || options.selections.length > 3 || new Set(options.selections.map(value => value?.id)).size !== options.selections.length) throw new TypeError('Choose at most one reading of each kind.');
  const sourceLabel = bounded(options.sourceLabel, 120, 'the source label', true);
  if (/[\r\n]/u.test(sourceLabel)) throw new TypeError('Use one line for the source label.');
  const personalNote = bounded(options.personalNote, 350, 'your added note');
  const status = options.status;
  if (!STATES.includes(status as CaseStatus)) throw new TypeError(t('Choose the progress you want to report; it is never read from the pasted text.', 'जिस प्रगति की सूचना देनी है वह चुनें; चिपकाए पाठ से प्रगति नहीं चुनी जाती।'));
  const fields: string[] = []; const kinds = new Set<AcknowledgementKind>(); let reference: string | undefined;
  for (const selection of options.selections) {
    const candidate = extraction.candidates.find(item => item.id === selection?.id);
    if (!candidate || kinds.has(candidate.kind)) throw new TypeError('Choose one current reading of each kind, or leave it out.');
    kinds.add(candidate.kind);
    const input = bounded(selection.value, 160, 'the selected reading', true);
    let value: string | null;
    if (candidate.kind === 'reference') value = referenceReading(input);
    else if (candidate.kind === 'date') value = isoDate(input);
    else value = amountReading(`INR ${input}`);
    if (!value || candidate.certainty === 'needs-correction' && input === candidate.value) throw new TypeError(t('Correct the uncertain reading or leave it out. Dates need YYYY-MM-DD; amounts need a number in INR.', 'अनिश्चित मान सुधारें या छोड़ दें। तारीख YYYY-MM-DD और राशि INR में संख्या होनी चाहिए।'));
    if (candidate.kind === 'reference') {
      reference = value;
      if (checked.reference && checked.reference !== reference && options.replaceReference !== true) throw new TypeError(t('Check that this different reference belongs to this case before replacing the current reference.', 'वर्तमान संदर्भ बदलने से पहले जाँचें कि अलग संदर्भ इसी केस का है।'));
    }
    const label = candidate.kind === 'reference' ? t('Reference I checked', 'मेरे द्वारा जाँचा संदर्भ') : candidate.kind === 'date' ? t('Date I read', 'मेरे द्वारा पढ़ी तारीख') : t('Amount I read (INR)', 'मेरे द्वारा पढ़ी राशि (INR)');
    const edited = candidate.certainty === 'needs-correction' || value !== candidate.value;
    fields.push(`${label}: ${value}${edited ? t(' (corrected by me)', ' (मेरे द्वारा सुधारा)') : ''}`);
  }
  if (!fields.length && !personalNote) throw new TypeError(t('Select a reading or add your own short update.', 'कोई मान चुनें या अपना छोटा अपडेट जोड़ें।'));
  const note = [t('My report from supplied text', 'दिए पाठ से मेरी रिपोर्ट'), `${t('Source named by me', 'मेरे द्वारा बताया स्रोत')}: ${sourceLabel}`, ...fields, ...(personalNote ? [`${t('My added note', 'मेरा अतिरिक्त नोट')}: ${personalNote}`] : []), `${t('Progress I chose', 'मेरे द्वारा चुनी प्रगति')}: ${acknowledgementStatusLabel(status as CaseStatus, language)}`, t('Citizen-reported only; source, payment and official outcome not verified.', 'केवल नागरिक की रिपोर्ट; स्रोत, भुगतान और आधिकारिक परिणाम सत्यापित नहीं हैं।')].join('\n');
  if (note.length > 1_000) throw new TypeError(t('This timeline note exceeds 1,000 characters. Shorten the source label or added note, or leave out a reading.', 'समयरेखा नोट 1,000 अक्षरों से बड़ा है। स्रोत नाम या अतिरिक्त नोट छोटा करें या कोई मान छोड़ें।'));
  return { caseId: checked.id, fingerprint, ...(reference !== undefined ? { reference } : {}), status: status as CaseStatus, note };
}

/** Caller boundary: recheck the current working case immediately before applying this reviewed report. */
export function validateAcknowledgementReview(value: unknown, caseValue: MobilityCase, language: AcknowledgementLanguage): AcknowledgementReview {
  const checked = validateCase(caseValue); const fingerprint = acknowledgementCaseFingerprint(checked, language);
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Invalid acknowledgement review.');
  const input = value as Record<string, unknown>;
  if (Reflect.ownKeys(input).some(key => typeof key !== 'string' || !['caseId', 'fingerprint', 'reference', 'status', 'note'].includes(key)) || input.caseId !== checked.id || input.fingerprint !== fingerprint || !STATES.includes(input.status as CaseStatus)) throw new TypeError('The case changed. Review this report against the current case again.');
  const note = bounded(input.note, 1_000, 'the reviewed note', true);
  if (note !== input.note) throw new TypeError('Review the exact timeline note.');
  let reference: string | undefined;
  if (input.reference !== undefined) { reference = bounded(input.reference, 160, 'the reviewed reference', true); if (!referenceReading(reference) || reference !== input.reference) throw new TypeError('Invalid reviewed reference.'); }
  return { caseId: checked.id, fingerprint, ...(reference !== undefined ? { reference } : {}), status: input.status as CaseStatus, note };
}
