import type { DocumentField } from './document-evidence';
import { coachText } from './voice-coach-copy';

export type VoiceLanguage = 'en' | 'hi' | 'te';
export type CoachContext = {
  stage: 'read' | 'check' | 'prepared';
  busy: boolean;
  hasNotice: boolean;
  hasVehicleRecord: boolean;
  hasPhoto: boolean;
  comparison: 'match' | 'different' | 'inconclusive';
  fields: Array<{ id: string; key: DocumentField['key']; role: 'notice' | 'vehicle-record' }>;
  activeFieldId: string | null;
  hasError: boolean;
};
export type CoachAction =
  | { type: 'show-upload'; role: 'notice' | 'vehicle-record' }
  | { type: 'show-photo' }
  | { type: 'show-sources' }
  | { type: 'review-documents' }
  | { type: 'edit-field'; fieldId: string }
  | { type: 'suggest-correction'; fieldId: string; value: string };
export type CoachReply = { text: string; action?: CoachAction; intent: string };

type FieldKey = DocumentField['key'];
type FieldTarget = { key: FieldKey; role?: 'notice' | 'vehicle-record' };

// Deliberately bounded commands. This module has no microphone, network, file,
// document-text, or DOM access. The UI must recheck actions against current state.
const MAX_UTTERANCE = 320;
const MAX_VALUE = 120;
const MAX_FIELDS = 64;
const unsafeCharacters = /[\u0000-\u001f\u007f\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069<>]/;
const ambiguous = /(?:^|\s)(?:do not|don't|dont|not|never|stop|cancel|or|and|मत|नहीं|नही|रद्द|या|और|nahi|nahin|mat|లేదా|మరియు)(?:\s|$)|వద్దు|చేయకు|మార్చకు|[;"“”]/i;
const restricted = /\b(?:submit|pay|payment|confirm|prepare|finalize|delete|otp|captcha)\b|जमा|भुगतान|पुष्टि|तैयार|समर्पित|చెల్లించ|చెల్లింపు|సమర్పించ|నిర్ధారించ|సిద్ధం/i;

const fieldNames: Record<FieldKey, readonly string[]> = {
  registration: ['registration', 'registration number', 'vehicle number', 'number plate', 'plate', 'पंजीकरण', 'पंजीकरण संख्या', 'वाहन नंबर', 'नंबर प्लेट', 'రిజిస్ట్రేషన్', 'రిజిస్ట్రేషన్ నంబర్', 'వాహన నంబర్'],
  'notice-number': ['challan number', 'notice number', 'चालान नंबर', 'चालान संख्या', 'చలాన్ నంబర్', 'చలాన్ సంఖ్య'],
  date: ['date', 'event date', 'तारीख', 'तिथि', 'तारीख़', 'తేదీ', 'తేది'],
  amount: ['amount', 'fine amount', 'राशि', 'जुर्माना राशि', 'మొత్తం', 'జరిమానా మొత్తం'],
  offence: ['offence', 'offense', 'recorded offence', 'अपराध', 'उल्लंघन', 'ఉల్లంఘన', 'నేరం'],
  location: ['location', 'place', 'स्थान', 'जगह', 'ప్రదేశం', 'స్థలం'],
};
const roleNames = {
  notice: ['challan', 'notice', 'चालान', 'చలాన్'],
  'vehicle-record': ['rc', 'vehicle record', 'आरसी', 'वाहन रिकॉर्ड', 'ఆర్సీ', 'వాహన రికార్డు'],
} as const;

function fieldTarget(input: string): FieldTarget | null {
  for (const [key, names] of Object.entries(fieldNames) as [FieldKey, readonly string[]][]) {
    for (const name of names) {
      if (input === name) return { key };
      for (const [role, aliases] of Object.entries(roleNames) as [FieldTarget['role'], readonly string[]][]) {
        for (const alias of aliases) {
          if ([`${alias} ${name}`, `${alias} का ${name}`, `${name} on ${alias}`, `${name} in ${alias}`].includes(input)) return { key, role };
        }
      }
    }
  }
  return null;
}

function normalizeCommand(input: string): string {
  return input.toLowerCase().replace(/[?!.।]+$/u, '').trim()
    .replace(/^(?:(?:can|could) you |please |कृपया |దయచేసి )+/u, '').replace(/ please$/u, '');
}

const digitWords: Readonly<Record<string, string>> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  'शून्य': '0', 'जीरो': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पाँच': '5', 'पांच': '5', 'छह': '6', 'छः': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
  'సున్నా': '0', 'సున్న': '0', 'ఒకటి': '1', 'ఒక': '1', 'రెండు': '2', 'మూడు': '3', 'నాలుగు': '4', 'ఐదు': '5', 'ఆరు': '6', 'ఏడు': '7', 'ఎనిమిది': '8', 'తొమ్మిది': '9',
};
const smallNumbers: Readonly<Record<string, number>> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  'दस': 10, 'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  'పది': 10, 'ఇరవై': 20, 'ముప్పై': 30, 'నలభై': 40, 'యాభై': 50, 'అరవై': 60, 'డెబ్బై': 70, 'ఎనభై': 80, 'తొంభై': 90,
};
const scales: Readonly<Record<string, number>> = { hundred: 100, 'सौ': 100, 'వంద': 100, 'వందలు': 100, thousand: 1000, 'हजार': 1000, 'हज़ार': 1000, 'వెయ్యి': 1000, 'వేలు': 1000 };

function latinDigits(input: string): string {
  return input.replace(/[०-९౦-౯]/g, digit => String(digit.charCodeAt(0) - (digit >= '౦' ? 0x0c66 : 0x0966)));
}

function digitSequence(input: string): string {
  return input.split(/\s+/u).map(token => digitWords[token.toLowerCase()] ?? token).join('');
}

/** Numeric phrases are intentionally conservative: digit sequences or one
 * explicit scale, not a general arithmetic parser or fuzzy transcription. */
function spokenAmount(input: string): string | null {
  const value = latinDigits(input).toLowerCase().replace(/^(?:rs\.?|inr|₹)\s*/u, '').replace(/\s*(?:rupees|रुपये|रुपए|రూపాయలు|రూపాయల|inr)$/u, '').trim();
  if (/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/u.test(value)) {
    const number = Number(value.replace(/,/g, ''));
    return number <= 10_000_000 ? String(number) : null;
  }
  const tokens = value.split(/\s+/u);
  if (tokens.every(token => digitWords[token] !== undefined || /^\d$/u.test(token))) {
    const number = Number(tokens.map(token => digitWords[token] ?? token).join(''));
    return number <= 10_000_000 ? String(number) : null;
  }
  if (tokens.length === 1 && smallNumbers[value] !== undefined) return String(smallNumbers[value]);
  if (tokens.length === 2 && scales[tokens[1]] !== undefined) {
    const multiplier = digitWords[tokens[0]] !== undefined ? Number(digitWords[tokens[0]]) : /^\d{1,2}$/u.test(tokens[0]) ? Number(tokens[0]) : smallNumbers[tokens[0]];
    return multiplier && multiplier <= 99 ? String(multiplier * scales[tokens[1]]) : null;
  }
  // Never guess whether "one twenty" means 120, 1.20, or 20.
  if (tokens.length === 2 && smallNumbers[tokens[0]] >= 20 && Number(digitWords[tokens[1]]) > 0) return String(smallNumbers[tokens[0]] + Number(digitWords[tokens[1]]));
  return null;
}

function correctionValue(key: FieldKey, input: string, explicit: boolean): string | null {
  if (!input || input.length > MAX_VALUE || unsafeCharacters.test(input) || /(?:https?:|blob:|data:|file:)/iu.test(input)) return null;
  const value = latinDigits(input);
  if (key === 'registration') {
    const registration = digitSequence(value).replace(/-/g, '').toUpperCase();
    return /^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/u.test(registration) ? registration : null;
  }
  if (key === 'date') {
    const dayFirst = /^(\d{2})[/-](\d{2})[/-](\d{4})$/u.exec(value);
    const iso = /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : dayFirst ? `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}` : '';
    const timestamp = iso ? Date.parse(`${iso}T00:00:00Z`) : NaN;
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === iso ? iso : null;
  }
  if (key === 'amount') return spokenAmount(value);
  if (key === 'notice-number') {
    const number = digitSequence(value).toUpperCase();
    return /^(?=.*\d)[A-Z0-9][A-Z0-9/-]{1,59}$/u.test(number) ? number : null;
  }
  // Free text needs an explicit "set value to ..." instruction. Navigation
  // language is never silently inserted as an offence or location.
  if (!explicit || /^(?:open|show|edit|change|set|click|go|upload|add)\b/iu.test(value)) return null;
  return value;
}

function requestedCorrection(input: string): { target: FieldTarget | 'active' | null; value: string } | null {
  const politeInput = input.replace(/^(?:(?:can|could) you |please |कृपया |దయచేసి )+/iu, '').replace(/ please$/iu, '');
  const english = /^(?:set|change|correct)(?: the)? (.+?) (?:to|as) (.+)$/iu.exec(politeInput);
  if (english) return { target: normalizeCommand(english[1]) === 'value' ? 'active' : fieldTarget(normalizeCommand(english[1])), value: english[2] };
  const generic = /^(?:use|suggest|enter|वैल्यू|मान|విలువ|వాల్యూ) (.+)$/iu.exec(politeInput);
  if (generic) return { target: 'active', value: generic[1] };
  const hindi = /^(.+?) को (.+?) (?:करो|करें|बदलो|बदलें)$/u.exec(politeInput);
  if (hindi) return { target: fieldTarget(normalizeCommand(hindi[1])), value: hindi[2] };
  const telugu = /^(.+?) (.+?) ?గా (?:మార్చు|మార్చండి|పెట్టు)$/u.exec(politeInput);
  if (telugu) return { target: fieldTarget(normalizeCommand(telugu[1])), value: telugu[2] };
  return null;
}

export function describeCoachStep(context: CoachContext, language: VoiceLanguage): string {
  if (context.busy) return coachText('busy', language);
  if (context.hasError) return coachText('recovery', language);
  if (context.stage === 'prepared') return coachText('prepared', language);
  if (context.activeFieldId && context.fields.some(field => field.id === context.activeFieldId)) return coachText('edit', language);
  return coachText(context.stage === 'read' && !context.hasNotice ? 'read' : 'check', language);
}

export function answerCoach(utterance: string, context: CoachContext, language: VoiceLanguage): CoachReply {
  const reply = (intent: string, key: Parameters<typeof coachText>[0], action?: CoachAction): CoachReply => ({ intent, text: coachText(key, language), ...(action ? { action } : {}) });
  if (utterance.length > MAX_UTTERANCE || unsafeCharacters.test(utterance) || context.fields.length > MAX_FIELDS) return reply('unknown', 'unknown');
  const original = utterance.normalize('NFC').trim().replace(/\s+/gu, ' ');
  const command = normalizeCommand(original);
  if (!command) return reply('unknown', 'unknown');
  if (ambiguous.test(command) || /^(?:no|रुको|ఆపు)(?:\s|$)/u.test(command)) return reply('ambiguous', 'ambiguous');
  if (restricted.test(command)) return reply('boundary', 'boundary');
  if (context.busy) return reply('busy', 'busy');

  if (/^(?:what (?:(?:do|should) i (?:do|check)(?: here| next| on this screen)?|is this step)|what next|explain(?: this| this step| the step)?|help(?: me)?|where am i|repeat|अब क्या करना है|अब क्या करूँ|अगला कदम क्या है|मदद करो|फिर से बोलो|kya karna hai|ab kya karu|ఇప్పుడు ఏం చేయాలి|ఏం చేయాలి|తర్వాత ఏం చేయాలి|సహాయం చేయి|మళ్ళీ చెప్పు|మళ్లీ చెప్పు)$/u.test(command)) {
    return { intent: 'explain-step', text: describeCoachStep(context, language) };
  }
  if (/^(?:what(?: is|'s) missing|what else do i need|what evidence (?:is missing|do i need)|what is left|missing evidence|क्या बाकी है|क्या चाहिए|क्या कम है|kya chahiye|kya baki hai|ఇంకా ఏమి కావాలి|ఏమి కావాలి|ఏం కావాలి|ఏ ఆధారాలు కావాలి)$/u.test(command)) {
    return reply('missing-evidence', !context.hasNotice ? 'missingNotice' : !context.hasVehicleRecord ? 'missingRecord' : !context.hasPhoto ? 'missingPhoto' : 'missingUnknown');
  }
  if (/^(?:(?:show|open|inspect)(?: me)?(?: the)? (?:photo|photograph|image)|(?:photo|image) (?:kholo|dikhao)|(?:तस्वीर|फोटो) (?:दिखाओ|दिखाएँ|खोलो|खोलें)|(?:ఫోటో|చిత్రం) (?:చూపించు|చూపించండి|తెరువు|తెరవండి|ఓపెన్ చేయి|ఓపెన్ చేయండి))$/u.test(command)) return reply('show-photo', 'photo', { type: 'show-photo' });
  if (/^(?:(?:show|open)(?: the)? (?:source|sources|source records|originals)|(?:source|sources) (?:kholo|dikhao)|(?:स्रोत|मूल रिकॉर्ड) (?:दिखाओ|दिखाएँ|खोलो|खोलें)|(?:సోర్స్|మూలం|మూలాలు|మూల పత్రాలు) (?:చూపించు|చూపించండి|తెరువు|తెరవండి))$/u.test(command)) {
    return context.hasNotice || context.hasVehicleRecord ? reply('show-sources', 'sources', { type: 'show-sources' }) : reply('unavailable', 'missingNotice');
  }
  if (/^(?:go back(?: to review)?|back(?: to review)?|review documents|समीक्षा पर वापस जाओ|वापस जाओ|दस्तावेज़ जाँचो|wapas jao|(?:మళ్ళీ|మళ్లీ) సమీక్ష చూపించు|వెనక్కి వెళ్ళు|వెనక్కి వెళ్లు|పత్రాలు సమీక్షించు)$/u.test(command)) return reply('review-documents', 'review', { type: 'review-documents' });

  const upload = /^(?:add|upload|choose)(?: a| my| the)? (.+)$/u.exec(command)?.[1]
    ?? /^(.+?) (?:जोड़ो|जोड़ें|चुनो|చేర్చు|జోడించు|జోడించండి|ఎంచుకో|jodo)$/u.exec(command)?.[1];
  if (upload) {
    const role = (Object.keys(roleNames) as ('notice' | 'vehicle-record')[]).find(key => (roleNames[key] as readonly string[]).includes(upload));
    if (role) return reply('show-upload', role === 'notice' ? 'uploadNotice' : 'uploadRecord', { type: 'show-upload', role });
  }

  const correction = requestedCorrection(original);
  if (correction || context.activeFieldId) {
    const activeFields = context.fields.filter(field => field.id === context.activeFieldId);
    const active = activeFields.length === 1 && context.stage === 'check' ? activeFields[0] : null;
    if (correction && (!active || !correction.target || (correction.target !== 'active' && (correction.target.key !== active.key || (correction.target.role && correction.target.role !== active.role))))) return reply('open-field', 'openField');
    if (active) {
      const value = correctionValue(active.key, correction?.value ?? original, Boolean(correction));
      if (value && active.id && active.id.length <= 256) return reply('suggest-correction', 'suggestion', { type: 'suggest-correction', fieldId: active.id, value });
      if (correction) return reply('invalid-value', 'invalidValue');
    }
  }

  const edit = /^(?:edit|correct|change)(?: the| my)? (.+)$/u.exec(command)?.[1]
    ?? /^(.+?) (?:बदलो|बदलें|सुधारो|सुधारें|ठीक करो|మార్చు|మార్చండి|సరిచేయి|సరిచేయండి|badlo|badle|sahi karo)$/u.exec(command)?.[1];
  if (edit) {
    const target = fieldTarget(edit);
    if (!target) return reply('clarify-field', 'clarifyField');
    const candidates = context.fields.filter(field => field.key === target.key && (!target.role || field.role === target.role));
    if (candidates.length > 1) return reply('clarify-field', 'clarifyField');
    if (candidates.length !== 1 || !candidates[0].id || candidates[0].id.length > 256) return reply('unavailable-field', 'unavailableField');
    return reply('edit-field', 'edit', { type: 'edit-field', fieldId: candidates[0].id });
  }
  return reply('unknown', context.activeFieldId ? 'invalidValue' : 'unknown');
}

export function getCoachPrompts(context: CoachContext, language: VoiceLanguage): string[] {
  const keys = context.stage === 'prepared'
    ? ['promptStep', 'promptBack'] as const
    : context.activeFieldId
      ? ['promptStep', 'promptSource'] as const
      : context.hasNotice
        ? ['promptStep', 'promptMissing', 'promptPhoto'] as const
        : ['promptStep', 'promptMissing'] as const;
  return keys.map(key => coachText(key, language));
}
