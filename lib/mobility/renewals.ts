/** Dates transcribed by the citizen, never a verification of a document or legal deadline. */
export const RENEWAL_KINDS = ['licence', 'insurance', 'puc', 'other'] as const;
export type RenewalKind = typeof RENEWAL_KINDS[number];
export type RenewalInput = {
  kind: RenewalKind; label: string; vehicleLabel: string; expiryDate: string;
  sourceLabel: string; checkedOn: string; reminderDate: string;
};
export type RenewalRecord = RenewalInput & {
  version: 1; id: string; revision: number; basis: 'citizen-entered'; createdAt: string; updatedAt: string;
};
export type RenewalLanguage = 'en' | 'hi';
export const RENEWAL_RETENTION_DAYS = 90;
export const RENEWAL_SOON_DAYS = 30;
export const RENEWAL_STALE_DAYS = 30;
const DAY = 86_400_000;
const INPUT_KEYS = ['kind', 'label', 'vehicleLabel', 'expiryDate', 'sourceLabel', 'checkedOn', 'reminderDate'];
const RECORD_KEYS = [...INPUT_KEYS, 'version', 'id', 'revision', 'basis', 'createdAt', 'updatedAt'];

export function renewalKindLabel(kind: RenewalKind, language: RenewalLanguage = 'en'): string {
  const labels: Record<RenewalKind, [string, string]> = { licence: ['Driving licence', 'ड्राइविंग लाइसेंस'], insurance: ['Insurance', 'बीमा'], puc: ['PUC certificate', 'PUC प्रमाणपत्र'], other: ['Other document', 'अन्य दस्तावेज़'] };
  return labels[kind][language === 'hi' ? 1 : 0];
}
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Document reminder must be a plain object.');
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key)) || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError('Document reminder has missing or unexpected fields.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== 'string' || value.trim().length > max || required && !value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) throw new TypeError(`${label} must be ${required ? 'non-empty ' : ''}text of at most ${max} characters.`);
  return value.trim();
}
export function validateRenewalDate(value: unknown, optional = false): string {
  if (optional && value === '') return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || Number(value.slice(0, 4)) < 1900 || Number(value.slice(0, 4)) > 9998 || !Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw new TypeError('Use a real calendar date in YYYY-MM-DD format.');
  return value;
}
export function validateRenewalTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new TypeError('Use a valid UTC save timestamp.');
  return value;
}
export function validateRenewalId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(value)) throw new TypeError('Document reminder ID is invalid.');
  return value;
}
export function renewalLocalDate(date = new Date()): string {
  return validateRenewalDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
}
export function validateRenewalInput(value: unknown): RenewalInput {
  const input = object(value, INPUT_KEYS);
  if (!RENEWAL_KINDS.includes(input.kind as RenewalKind)) throw new TypeError('Choose a supported document type.');
  return {
    kind: input.kind as RenewalKind, label: text(input.label, 'Document label', 100), vehicleLabel: text(input.vehicleLabel, 'Vehicle label', 100),
    expiryDate: validateRenewalDate(input.expiryDate), sourceLabel: text(input.sourceLabel, 'Source label', 200, true),
    checkedOn: validateRenewalDate(input.checkedOn), reminderDate: validateRenewalDate(input.reminderDate, true),
  };
}
export function validateRenewal(value: unknown): RenewalRecord {
  const input = object(value, RECORD_KEYS);
  if (input.version !== 1 || input.basis !== 'citizen-entered' || !Number.isSafeInteger(input.revision) || (input.revision as number) < 0) throw new TypeError('Invalid document reminder version, source basis or revision.');
  const createdAt = validateRenewalTimestamp(input.createdAt), updatedAt = validateRenewalTimestamp(input.updatedAt);
  if (updatedAt < createdAt) throw new TypeError('Save time cannot precede creation.');
  return { version: 1, id: validateRenewalId(input.id), revision: input.revision as number, basis: 'citizen-entered', createdAt, updatedAt, ...validateRenewalInput(Object.fromEntries(INPUT_KEYS.map(key => [key, input[key]]))) };
}
export function renewalInput(record: RenewalRecord): RenewalInput {
  return validateRenewalInput(Object.fromEntries(INPUT_KEYS.map(key => [key, record[key as keyof RenewalInput]])));
}
function checkedInput(input: RenewalInput, today: string): RenewalInput {
  const checked = validateRenewalInput(input);
  if (checked.checkedOn > validateRenewalDate(today)) throw new TypeError('The date you checked the source cannot be in the future.');
  return checked;
}
export function createRenewal(input: RenewalInput, at = new Date().toISOString(), id: string = crypto.randomUUID(), today = renewalLocalDate()): RenewalRecord {
  return validateRenewal({ ...checkedInput(input, today), version: 1, id, revision: 0, basis: 'citizen-entered', createdAt: at, updatedAt: at });
}
export function updateRenewal(record: RenewalRecord, input: RenewalInput, at = new Date().toISOString(), today = renewalLocalDate()): RenewalRecord {
  return validateRenewal({ ...validateRenewal(record), ...checkedInput(input, today), updatedAt: at });
}
/** UTC is used only to subtract date labels, never to convert an entered day to local time. */
export function renewalAttention(record: RenewalRecord, today = renewalLocalDate()) {
  const item = validateRenewal(record), day = validateRenewalDate(today);
  const daysUntilExpiry = (Date.parse(`${item.expiryDate}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY;
  const daysSinceCheck = (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${item.checkedOn}T00:00:00Z`)) / DAY;
  return {
    daysUntilExpiry, daysSinceCheck,
    expiry: daysUntilExpiry < 0 ? 'past' as const : daysUntilExpiry === 0 ? 'today' as const : daysUntilExpiry <= RENEWAL_SOON_DAYS ? 'soon' as const : 'later' as const,
    source: daysSinceCheck < 0 ? 'future' as const : daysSinceCheck >= RENEWAL_STALE_DAYS ? 'stale' as const : 'recent' as const,
    reminderDue: Boolean(item.reminderDate && item.reminderDate <= day),
  };
}
export function escapeRenewalCalendarText(value: string): string { return value.replace(/\\/gu, '\\\\').replace(/\r\n|\r|\n/gu, '\\n').replace(/;/gu, '\\;').replace(/,/gu, '\\,'); }
/** RFC 5545 lines fold at 75 UTF-8 octets, including the continuation space. */
export function foldRenewalCalendarLine(line: string): string {
  const encoder = new TextEncoder(); let result = '', chunk = '', bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) { result += chunk + '\r\n'; chunk = ' '; bytes = 1; }
    chunk += character; bytes += size;
  }
  return result + chunk;
}
export function renewalCalendarPreview(record: RenewalRecord, language: RenewalLanguage = 'en') {
  const item = validateRenewal(record);
  if (!item.reminderDate) throw new TypeError('Choose your reminder date before making a calendar file.');
  return { date: item.reminderDate, summary: language === 'hi' ? `निजी दस्तावेज़ जाँच: ${renewalKindLabel(item.kind, language)}` : `Personal document check: ${renewalKindLabel(item.kind, language)}`, description: language === 'hi' ? 'अपना मूल रिकॉर्ड फिर जाँचें। यह निजी अनुस्मारक है; आधिकारिक अपॉइंटमेंट या कानूनी समय-सीमा नहीं।' : 'Recheck your original record. This is a personal reminder, not an official appointment or legal deadline.' };
}
export function buildRenewalCalendar(record: RenewalRecord, language: RenewalLanguage = 'en'): string {
  const item = validateRenewal(record), preview = renewalCalendarPreview(item, language);
  const end = new Date(Date.parse(`${preview.date}T00:00:00Z`) + DAY).toISOString().slice(0, 10).replaceAll('-', '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ChallanSakshi//Personal document reminder//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:document-reminder-${item.id}@challansakshi.local`, `DTSTAMP:${item.updatedAt.replace(/[-:]/gu, '').replace(/\.\d{3}/u, '')}`, `SEQUENCE:${item.revision}`,
    `DTSTART;VALUE=DATE:${preview.date.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${escapeRenewalCalendarText(preview.summary)}`, `DESCRIPTION:${escapeRenewalCalendarText(preview.description)}`,
    'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'];
  return lines.map(foldRenewalCalendarLine).join('\r\n') + '\r\n';
}
