export type BoundedExportSafetyMatch =
  | 'control-character'
  | 'bidi-format'
  | 'markup-or-script'
  | 'url'
  | 'email-or-upi'
  | 'digit-like-identifier'
  | 'pan-shaped'
  | 'indian-registration'
  | 'long-mixed-identifier'
  | 'credential-or-payment-token'
  | 'raw-filename'
  | 'fabricated-official-status';

function isAsciiAlphaNumeric(character: string | undefined): boolean {
  return character !== undefined && /^[A-Za-z0-9]$/.test(character);
}

function containsAsciiBoundedMatch(value: string, pattern: RegExp): boolean {
  for (const match of value.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!isAsciiAlphaNumeric(value[start - 1]) && !isAsciiAlphaNumeric(value[end])) return true;
  }
  return false;
}

function requirePrimitiveString(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new TypeError('Export-safety input must be a primitive string.');
}

type AsciiWordToken = Readonly<{ word: string; start: number; end: number }>;

function asciiWordTokens(value: string): readonly AsciiWordToken[] {
  return Array.from(value.matchAll(/[A-Za-z0-9]+/g), (match) => Object.freeze({
    word: match[0].toLowerCase(),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

export function containsMarkupOrScriptSentinel(value: unknown): boolean {
  requirePrimitiveString(value);
  return /[<>]/.test(value) || /(?:javascript:|vbscript:|data:text\/html)/i.test(value);
}

export function containsUrlLikeValue(value: unknown): boolean {
  requirePrimitiveString(value);
  if (/(?:https?:\/\/|www\.)/i.test(value)) return true;
  const domain = /(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}/g;
  return containsAsciiBoundedMatch(value, domain);
}

export function containsEmailOrUpiHandle(value: unknown): boolean {
  requirePrimitiveString(value);
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g;
  const handle = /[A-Za-z0-9._-]{2,64}@[A-Za-z0-9._-]{2,64}/g;
  return containsAsciiBoundedMatch(value, email) || containsAsciiBoundedMatch(value, handle);
}

export function containsDigitLikeIdentifier(value: unknown): boolean {
  requirePrimitiveString(value);
  for (const match of value.matchAll(/[0-9 +().-]+/g)) {
    const count = match[0].replace(/\D/g, '').length;
    if (count >= 9 && count <= 19) return true;
  }
  return false;
}

export function containsPanShapedValue(value: unknown): boolean {
  requirePrimitiveString(value);
  return containsAsciiBoundedMatch(value, /[A-Za-z]{5}[0-9]{4}[A-Za-z]/g);
}

export function containsIndianRegistration(value: unknown): boolean {
  requirePrimitiveString(value);
  const conventional = /[A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{1,3}[ -]?[0-9]{4}/g;
  const bharat = /[0-9]{2}[ -]?BH[ -]?[0-9]{4}[ -]?[A-Za-z]{1,2}/gi;
  return containsAsciiBoundedMatch(value, conventional) || containsAsciiBoundedMatch(value, bharat);
}

export function containsLongMixedIdentifier(value: unknown): boolean {
  requirePrimitiveString(value);
  for (const match of value.matchAll(/[A-Za-z0-9_-]+/g)) {
    const compact = match[0].replace(/[_-]/g, '');
    const letters = (compact.match(/[A-Za-z]/g) ?? []).length;
    const digits = (compact.match(/[0-9]/g) ?? []).length;
    if (compact.length >= 12 && letters >= 2 && digits >= 4) return true;
  }
  return false;
}

const credentialKeywordSequences = Object.freeze([
  ['password'], ['passcode'], ['credential'], ['secret'], ['otp'], ['captcha'], ['cvv'],
  ['api', 'key'], ['key', 'api'], ['upi', 'pin'], ['pin', 'upi'],
  ['payment', 'token'], ['token', 'payment'], ['bank', 'account'], ['account', 'bank'],
  ['account', 'number'], ['number', 'account'], ['card', 'number'], ['number', 'card'],
  ['transaction', 'id'], ['id', 'transaction'],
] as const);
const credentialKeywordWords: ReadonlySet<string> = new Set(credentialKeywordSequences.flat());
const statusNouns = new Set([
  'submission', 'grievance', 'complaint', 'ticket', 'case', 'status',
  'acknowledgement', 'acknowledgment', 'confirmation', 'authority', 'government', 'police',
]);
const officialOutcomeWords = new Set([
  'success', 'successful', 'successfully', 'submitted', 'filed', 'created', 'accepted',
  'approved', 'acknowledged', 'cancelled', 'canceled', 'resolved', 'completed',
]);

function wordsMatchAt(tokens: readonly AsciiWordToken[], start: number, words: readonly string[]): boolean {
  return words.every((word, offset) => tokens[start + offset]?.word === word);
}

export function containsCredentialOrPaymentToken(value: unknown): boolean {
  requirePrimitiveString(value);
  const tokens = asciiWordTokens(value);
  for (let index = 0; index < tokens.length; index += 1) {
    for (const keyword of credentialKeywordSequences) {
      if (!wordsMatchAt(tokens, index, keyword)) continue;
      const keywordEnd = tokens[index + keyword.length - 1].end;
      const following = tokens.slice(index + keyword.length, index + keyword.length + 3);
      for (let offset = 0; offset < following.length; offset += 1) {
        const candidate = following[offset];
        if (candidate.start - keywordEnd > 48) break;
        const separator = value.slice(keywordEnd, candidate.start);
        const marked = /[:=\-–—>→\[\](){}]/u.test(separator)
          || (offset > 0 && ['value', 'code', 'number', 'id'].includes(following[offset - 1].word));
        const looksLikeValue = /[0-9]/.test(candidate.word)
          && (candidate.word.length >= 3 || /[A-Za-z]/.test(candidate.word));
        if (!credentialKeywordWords.has(candidate.word)
          && ((marked && candidate.word.length >= 2) || looksLikeValue)) return true;
      }
    }
  }
  return false;
}

export function containsRawFilename(value: unknown): boolean {
  requirePrimitiveString(value);
  for (const extension of value.matchAll(/\.(?:pdf|jpe?g|png|webp|heic|gif|tiff?|docx?|xlsx?|txt|csv)(?![A-Za-z0-9])/gi)) {
    const dot = extension.index ?? 0;
    const boundedPrefix = value.slice(Math.max(0, dot - 127), dot);
    const basename = boundedPrefix.slice(Math.max(
      boundedPrefix.lastIndexOf('/'),
      boundedPrefix.lastIndexOf('\\'),
      boundedPrefix.lastIndexOf('\n'),
      boundedPrefix.lastIndexOf('\r'),
      boundedPrefix.lastIndexOf('\t'),
    ) + 1).trim();
    if (
      basename.length > 0
      && basename.length <= 127
      && /^[\x20-\x7e]+$/.test(basename)
      && /[A-Za-z0-9]/.test(basename)
      && /[A-Za-z0-9)\]}]$/.test(basename)
    ) return true;
  }
  return false;
}

export function containsFabricatedOfficialStatus(value: unknown): boolean {
  requirePrimitiveString(value);
  const tokens = asciiWordTokens(value);
  for (let left = 0; left < tokens.length; left += 1) {
    for (let right = Math.max(0, left - 5); right <= Math.min(tokens.length - 1, left + 5); right += 1) {
      if (left === right) continue;
      const pairMatches = (statusNouns.has(tokens[left].word) && officialOutcomeWords.has(tokens[right].word))
        || (officialOutcomeWords.has(tokens[left].word) && statusNouns.has(tokens[right].word));
      if (pairMatches && Math.abs(tokens[right].start - tokens[left].start) <= 96) return true;
    }
  }
  return false;
}

/** Shared bounded matcher used by the web pack and the extension envelope. */
export function findBoundedExportSafetyMatches(value: unknown): readonly BoundedExportSafetyMatch[] {
  requirePrimitiveString(value);
  const matches: BoundedExportSafetyMatch[] = [];
  const add = (match: BoundedExportSafetyMatch, condition: boolean) => {
    if (condition) matches.push(match);
  };
  add('control-character', /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u.test(value));
  add('bidi-format', /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value));
  add('markup-or-script', containsMarkupOrScriptSentinel(value));
  add('url', containsUrlLikeValue(value));
  add('email-or-upi', containsEmailOrUpiHandle(value));
  add('digit-like-identifier', containsDigitLikeIdentifier(value));
  add('pan-shaped', containsPanShapedValue(value));
  add('indian-registration', containsIndianRegistration(value));
  add('long-mixed-identifier', containsLongMixedIdentifier(value));
  add('credential-or-payment-token', containsCredentialOrPaymentToken(value));
  add('raw-filename', containsRawFilename(value));
  add('fabricated-official-status', containsFabricatedOfficialStatus(value));
  return Object.freeze(matches);
}

export function validateExportSafeReviewedText(value: unknown): string {
  requirePrimitiveString(value);
  const matches = findBoundedExportSafetyMatches(value);
  if (matches.length > 0) {
    throw new Error(`Reviewed text failed bounded export-safety checks: ${matches.join(', ')}.`);
  }
  return value;
}
