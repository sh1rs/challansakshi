/** Text readings are untrusted observations, never proof of official origin. */
export type DocumentRole = 'notice' | 'vehicle-record' | 'enforcement-photo';
export type DocumentPage = {
  page: number;
  text: string;
  method: 'pdf-text' | 'local-ocr' | 'cloud-vision';
  /** OCR quality score on a 0–100 scale, not a probability of correctness. */
  confidence?: number;
};
export type DocumentReading = { sourceId: string; role: DocumentRole; pages: DocumentPage[]; limited: boolean; fingerprint?: string };
export type DocumentField = {
  id: string;
  sourceId: string;
  /** Source identity retained through correction. It leaves review memory only in an explicitly saved case. */
  sourceFingerprint?: string;
  role: DocumentRole;
  page: number;
  key: 'registration' | 'notice-number' | 'date' | 'amount' | 'offence' | 'location';
  value: string;
  method: DocumentPage['method'] | 'citizen-correction';
  confidence: 'readable' | 'needs-review';
  /** Minimized field excerpt, not the surrounding document or personal details. */
  excerpt: string;
};
export type DocumentEvidence = {
  fields: DocumentField[];
  comparison: 'match' | 'different' | 'inconclusive';
  limitations: string[];
};

type Key = DocumentField['key'];
const KEY_ORDER: Key[] = ['registration', 'notice-number', 'date', 'amount', 'offence', 'location'];
const MAX_TEXT = 200_000;
const MAX_VALUE = 120;
const MAX_PAGES = 12;
const labels: Record<Key | 'private', string[]> = {
  registration: ['vehicle registration number', 'vehicle registration no', 'registration number', 'registration no', 'vehicle number', 'vehicle no', 'regn no', 'reg no', 'वाहन पंजीकरण संख्या', 'पंजीकरण संख्या', 'वाहन संख्या', 'वाहन नंबर'],
  'notice-number': ['challan number', 'challan no', 'notice number', 'notice no', 'चालान संख्या', 'चालान नंबर', 'नोटिस संख्या'],
  // Event dates only. Printed, due and submission dates cannot become event dates.
  date: ['violation date', 'event date', 'incident date', 'date of offence', 'date of offense', 'घटना की तारीख', 'घटना की तिथि', 'अपराध की तारीख', 'अपराध की तिथि'],
  amount: ['total amount', 'fine amount', 'penalty amount', 'amount', 'जुर्माना राशि', 'कुल राशि', 'राशि'],
  offence: ['offence description', 'offense description', 'alleged offence', 'alleged offense', 'offence', 'offense', 'violation', 'अपराध', 'उल्लंघन'],
  location: ['violation location', 'event location', 'location', 'place of offence', 'place of offense', 'घटना स्थल', 'स्थान'],
  private: ['owner name', 'owner address', 'father name', 'name', 'address', 'chassis number', 'chassis no', 'engine number', 'engine no', 'mobile number', 'mobile no', 'phone', 'email', 'aadhaar', 'नाम', 'पता', 'मोबाइल', 'आधार', 'मालिक का नाम', 'मालिक का पता'],
};
const flatLabels = Object.entries(labels).flatMap(([key, values]) => values.map(label => ({ key: key as Key | 'private', label }))).sort((a, b) => b.label.length - a.label.length);
const escapedLabel = (label: string) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\t]+');
const labelPattern = new RegExp(`(?<![\\p{L}])(${flatLabels.map(item => escapedLabel(item.label)).join('|')})(?![\\p{L}])[ \\t]*[.:：#]?[ \\t]*`, 'giu');

function clean(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function latinDigits(value: string): string {
  return value.replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x0966));
}

function normalizeValue(key: Key, input: string): string | null {
  const value = clean(input);
  if (!value || value.length > MAX_VALUE || /(?:https?:|blob:|data:|file:|<|>|[\u202a-\u202e\u2066-\u2069])/i.test(value)) return null;
  if (key === 'registration') {
    // Deliberately no O/0, I/1, punctuation stripping, or fuzzy substitutions.
    const registration = value.toUpperCase().replace(/[\s-]/g, '');
    return /^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/.test(registration) ? registration : null;
  }
  if (key === 'notice-number') return /^(?=.*\d)[A-Z0-9][A-Z0-9/-]{1,59}$/i.test(value) ? value : null;
  if (key === 'date') {
    const date = latinDigits(value);
    const dayFirst = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(date);
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayFirst ? `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}` : '';
    if (!iso) return null;
    const timestamp = Date.parse(`${iso}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === iso ? iso : null;
  }
  if (key === 'amount') {
    const amount = latinDigits(value).replace(/^(?:Rs\.?|INR|₹)\s*/i, '').replace(/\s*(?:INR|रुपये|रु\.?)$/i, '');
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(amount)) return null;
    const number = Number(amount.replace(/,/g, ''));
    return Number.isFinite(number) && number >= 0 && number <= 10_000_000 ? String(number) : null;
  }
  return value;
}

function fieldExcerpt(key: Key, value: string): string {
  return `${labels[key][0]}: ${value}`.slice(0, 160);
}

/** Preserve a bounded ambiguous reading for correction, never for decisive comparison. */
function uncertainRegistration(input: string): string | null {
  const value = clean(input).toUpperCase();
  return /^[A-Z]{2}[A-Z0-9 -]{4,16}$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 2 ? value : null;
}

function sourceRoleLabel(role: DocumentRole, language: 'en' | 'hi'): string {
  return (language === 'hi'
    ? { notice: 'चालान', 'vehicle-record': 'वाहन रिकॉर्ड', 'enforcement-photo': 'चालान की तस्वीर' }
    : { notice: 'Challan', 'vehicle-record': 'Vehicle record', 'enforcement-photo': 'Enforcement photograph' })[role];
}

function checkedFingerprint(value: string | undefined): string | undefined {
  return value && /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : undefined;
}

function compare(fields: DocumentField[]): DocumentEvidence['comparison'] {
  const notices = fields.filter(field => field.role === 'notice' && field.key === 'registration');
  const vehicles = fields.filter(field => field.role === 'vehicle-record' && field.key === 'registration');
  if (notices.length !== 1 || vehicles.length !== 1) return 'inconclusive';
  const [notice] = notices;
  const [vehicle] = vehicles;
  if (notice.sourceId === vehicle.sourceId || notice.confidence !== 'readable' || vehicle.confidence !== 'readable') return 'inconclusive';
  if (notice.sourceFingerprint && notice.sourceFingerprint === vehicle.sourceFingerprint) return 'inconclusive';
  return notice.value === vehicle.value ? 'match' : 'different';
}

/** Extracts an allowlist of labelled fields. Never reads a photograph's plate from generic OCR text. */
export function extractDocumentEvidence(readings: DocumentReading[]): DocumentEvidence {
  const fields: DocumentField[] = [];
  const limitations: string[] = [];
  const sources = new Set<string>();
  const fingerprintSources = new Map<string, Set<string>>();
  for (const reading of readings) {
    const fingerprint = checkedFingerprint(reading.fingerprint);
    if (fingerprint) fingerprintSources.set(fingerprint, new Set([...(fingerprintSources.get(fingerprint) ?? []), reading.sourceId]));
  }
  for (const reading of readings) {
    if (!/^[a-zA-Z0-9_-]{1,96}$/.test(reading.sourceId) || sources.has(reading.sourceId)) {
      limitations.push('A repeated or invalid source reference requires review.');
      // Neither occurrence can serve as an independent comparison source.
      fields.filter(field => field.sourceId === reading.sourceId).forEach(field => { field.confidence = 'needs-review'; });
      continue;
    }
    sources.add(reading.sourceId);
    const fingerprint = checkedFingerprint(reading.fingerprint);
    const duplicateDocument = fingerprint !== undefined && (fingerprintSources.get(fingerprint)?.size ?? 0) > 1;
    if (duplicateDocument) limitations.push('The same document was selected for different sources. Add an independent vehicle record.');
    if (reading.role === 'enforcement-photo') {
      limitations.push('Photograph text is not a verified plate region; no image-plate or offence comparison was made.');
      continue;
    }
    const candidates = new Map<Key, DocumentField[]>();
    const uncertainKeys = new Set<Key>();
    const incomplete = reading.limited || reading.pages.length > MAX_PAGES || reading.pages.some(page => page.text.length > MAX_TEXT);
    if (incomplete) limitations.push(`${sourceRoleLabel(reading.role, 'en')}: only part of the document was read; review the source.`);
    for (const page of reading.pages.slice(0, MAX_PAGES)) {
      if (!Number.isInteger(page.page) || page.page < 1) continue;
      const text = page.text.slice(0, MAX_TEXT).replace(/\r\n?/g, '\n');
      const matches = [...text.matchAll(labelPattern)].filter(match => {
        const prefix = text.slice(text.lastIndexOf('\n', match.index) + 1, match.index).trim();
        return prefix === '' || /[|;]$/.test(prefix) || /[:：#]/.test(match[0]);
      });
      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const label = match[1].toLowerCase().replace(/[ \t]+/g, ' ');
        const key = flatLabels.find(item => item.label === label)?.key;
        if (!key || key === 'private' || (reading.role === 'vehicle-record' && key !== 'registration')) continue;
        const start = match.index! + match[0].length;
        const segment = text.slice(start, matches[index + 1]?.index ?? text.length).trimStart().split(/[\n|;]/, 1)[0].trim();
        const strictValue = normalizeValue(key, segment);
        const value = strictValue ?? (key === 'registration' ? uncertainRegistration(segment) : null);
        if (strictValue === null) uncertainKeys.add(key);
        if (!value) {
          continue;
        }
        const readable = strictValue !== null && !incomplete && !duplicateDocument && (reading.fingerprint === undefined || fingerprint !== undefined)
          && (page.method === 'pdf-text' || (Number.isFinite(page.confidence) && page.confidence! >= 85 && page.confidence! <= 100));
        const field: DocumentField = {
          id: `${reading.sourceId}:${key}`, sourceId: reading.sourceId, role: reading.role, page: page.page,
          ...(fingerprint ? { sourceFingerprint: fingerprint } : {}),
          key, value, method: page.method, confidence: readable ? 'readable' : 'needs-review', excerpt: clean(`${match[1]}: ${segment}`).slice(0, 160),
        };
        candidates.set(key, [...(candidates.get(key) ?? []), field]);
      }
    }
    for (const key of KEY_ORDER) {
      const options = candidates.get(key);
      if (!options?.length) continue;
      const differentValues = new Set(options.map(option => option.value));
      const selected = options.find(option => option.confidence === 'readable') ?? options[0];
      if (differentValues.size > 1 || uncertainKeys.has(key)) {
        fields.push({ ...selected, confidence: 'needs-review' });
        limitations.push(`${sourceRoleLabel(reading.role, 'en')}: conflicting ${key} readings require a correction against the source.`);
      } else fields.push(selected);
    }
  }
  return { fields, comparison: compare(fields), limitations: [...new Set(limitations)] };
}

/** Caller invalidates any prior confirmation, result and prepared artifact after a correction. */
export function correctDocumentField(evidence: DocumentEvidence, id: string, value: string): DocumentEvidence {
  const field = evidence.fields.find(item => item.id === id);
  if (!field) throw new Error('Choose a current extracted field to correct.');
  const normalized = normalizeValue(field.key, value);
  if (!normalized) throw new Error('The correction is not a supported value for this field.');
  const fields = evidence.fields.map(item => item.id === id ? {
    ...item, value: normalized, method: 'citizen-correction' as const,
    confidence: 'readable' as const, excerpt: fieldExcerpt(item.key, normalized),
  } : item);
  // Human-readable demands are deduplicated by role/key, so another source of
  // that role must be checked before removing the now-resolved field demand.
  const sameRoleFieldStillUncertain = fields.some(item => item.role === field.role
    && item.key === field.key && item.confidence === 'needs-review');
  const resolvedDemand = `${sourceRoleLabel(field.role, 'en')}: conflicting ${field.key} readings require a correction against the source.`;
  const limitations = sameRoleFieldStillUncertain ? evidence.limitations
    : evidence.limitations.filter(limitation => limitation !== resolvedDemand);
  return { ...evidence, fields, limitations, comparison: compare(fields) };
}

/** A local preparation note, not a grievance, authentication result or legal decision. */
export function buildDocumentEvidenceNote(evidence: DocumentEvidence, language: 'en' | 'hi'): string {
  const hi = language === 'hi';
  const titles: Record<Key, string> = hi
    ? { registration: 'पंजीकरण', 'notice-number': 'चालान संख्या', date: 'घटना की तारीख', amount: 'राशि', offence: 'दर्ज अपराध', location: 'स्थान' }
    : { registration: 'Registration', 'notice-number': 'Notice number', date: 'Event date', amount: 'Amount', offence: 'Recorded offence', location: 'Location' };
  const comparison = hi ? {
    match: 'नोटिस और स्वतंत्र वाहन रिकॉर्ड का पंजीकरण मेल खाता है। यह अपराध या तस्वीर पर निर्णय नहीं है।',
    different: 'नोटिस और स्वतंत्र वाहन रिकॉर्ड में पंजीकरण अलग पढ़ा गया है। स्रोत से जाँच आवश्यक है; यह कानूनी निर्णय नहीं है।',
    inconclusive: 'पंजीकरण की तुलना अभी अनिर्णायक है। अपूर्ण या अस्पष्ट जानकारी की स्रोत से जाँच करें।',
  } : {
    match: 'The notice and independent vehicle record registrations match. This is not an offence or photograph finding.',
    different: 'The notice and independent vehicle record registrations were read differently. Check the sources; this is not a legal finding.',
    inconclusive: 'The registration comparison is inconclusive. Check missing or uncertain readings against the sources.',
  };
  const methods: Record<DocumentField['method'], string> = hi
    ? { 'pdf-text': 'PDF पाठ', 'local-ocr': 'डिवाइस पर OCR', 'cloud-vision': 'क्लाउड विश्लेषण', 'citizen-correction': 'आपका सुधार' }
    : { 'pdf-text': 'PDF text', 'local-ocr': 'On-device OCR', 'cloud-vision': 'Cloud analysis', 'citizen-correction': 'Your correction' };
  const localizedLimitations = evidence.limitations.map(limitation => {
    if (!hi) return limitation;
    if (limitation.startsWith('The same document')) return 'अलग स्रोतों के लिए वही दस्तावेज़ चुना गया है। स्वतंत्र वाहन रिकॉर्ड जोड़ें।';
    if (limitation.startsWith('A repeated or invalid')) return 'दोहराए गए या अमान्य स्रोत की जाँच आवश्यक है।';
    if (limitation.startsWith('Photograph text')) return 'तस्वीर का पाठ सत्यापित नंबर प्लेट क्षेत्र नहीं है; तस्वीर की प्लेट या अपराध की तुलना नहीं की गई।';
    const source = limitation.startsWith('Challan:') ? 'चालान' : 'वाहन रिकॉर्ड';
    if (limitation.includes('only part of the document')) return `${source}: दस्तावेज़ का केवल एक भाग पढ़ा गया; स्रोत जाँचें।`;
    return `${source}: परस्पर विरोधी जानकारी मिली; स्रोत देखकर सुधारें।`;
  });
  return [
    hi ? 'चालान साक्षी — दस्तावेज़ समीक्षा नोट' : 'CHALLANSAKSHI — DOCUMENT REVIEW NOTE',
    comparison[evidence.comparison],
    hi ? 'दस्तावेज़ की प्रामाणिकता सत्यापित नहीं की गई है। कोई भुगतान या शिकायत जमा नहीं की गई।' : 'Document authenticity has not been authenticated. No payment or complaint has been submitted.',
    '',
    ...evidence.fields.map(field => `${titles[field.key]}: ${field.value} [${sourceRoleLabel(field.role, language)}, ${hi ? 'पृष्ठ' : 'page'} ${field.page}; ${methods[field.method]}; ${hi ? field.confidence === 'readable' ? 'पढ़ने योग्य' : 'जाँच आवश्यक' : field.confidence === 'readable' ? 'Readable' : 'Needs review'}]`),
    ...(localizedLimitations.length ? ['', hi ? 'सीमाएँ' : 'Limitations', ...localizedLimitations.map(limitation => `- ${limitation}`)] : []),
  ].join('\n');
}
