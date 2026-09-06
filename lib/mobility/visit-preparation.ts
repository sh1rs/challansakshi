import { validateCase, type MobilityCase } from './cases';
import { escapeRenewalCalendarText, foldRenewalCalendarLine, validateRenewalDate } from './renewals';

export type VisitLanguage = 'en' | 'hi';
export type VisitChecklistItem = { line: number; source: string; wording: string; selected: boolean; packed: boolean };
export type VisitPackOptions = { includeReference: boolean; factKeys: string[] };
export type VisitPreview = { binding: string; text: string };
export const MAX_VISIT_LINES = 40;

function canonicalVisitTimestamp(at: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/u.exec(at);
  if (!match || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? '0') > 59 || Number(match[6] ?? '0') > 23 || Number(match[7] ?? '0') > 59 || !Number.isFinite(Date.parse(at))) throw new TypeError('Use a valid booking timestamp with a time zone.');
  validateRenewalDate(match[1]);
  return new Date(at).toISOString();
}

/** Local input must round-trip exactly: Date otherwise silently normalizes invalid/DST-gap dates. */
export function visitLocalTimeToIso(value: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) throw new TypeError('Enter a real local booking date and time.');
  validateRenewalDate(value.slice(0, 10));
  const [year, month, day, hour, minute] = value.split(/[-T:]/u).map(Number);
  if (hour > 23 || minute > 59) throw new TypeError('Enter a real local booking date and time.');
  const result = new Date(year, month - 1, day, hour, minute);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day || result.getHours() !== hour || result.getMinutes() !== minute) throw new TypeError('That local time does not exist in this device’s time zone. Check your booking time.');
  // Ambiguous clock-change times cannot identify one booking instant without an offset.
  for (const offset of [-120, -60, -30, 30, 60, 120]) {
    const other = new Date(result.getTime() + offset * 60_000);
    if (other.getFullYear() === year && other.getMonth() === month - 1 && other.getDate() === day && other.getHours() === hour && other.getMinutes() === minute) throw new TypeError('That local time occurs twice in this device’s time zone. Use a device time zone matching the booking’s unambiguous time.');
  }
  return result.toISOString();
}
export function visitIsoToLocalTime(at: string): string {
  const date = new Date(canonicalVisitTimestamp(at));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function visitInstructionLines(instructions: string): VisitChecklistItem[] {
  if (typeof instructions !== 'string' || instructions.length > 2_000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(instructions)) throw new TypeError('Keep the entered instructions within 2,000 characters.');
  const lines = instructions.split(/\r\n|\r|\n/u).map((source, index) => ({ line: index + 1, source: source.trim(), wording: source.trim(), selected: false, packed: false })).filter(item => item.source);
  if (lines.length > MAX_VISIT_LINES) throw new TypeError(`Use at most ${MAX_VISIT_LINES} non-empty instruction lines. Review and combine your source lines yourself; none will be silently omitted.`);
  return lines;
}
function checkedItems(instructions: string, items: VisitChecklistItem[]): VisitChecklistItem[] {
  const source = visitInstructionLines(instructions);
  if (!Array.isArray(items) || items.length !== source.length) throw new TypeError('The checklist no longer matches the entered instructions. Review it again.');
  return items.map((item, index) => {
    if (!item || Object.keys(item).sort().join(',') !== 'line,packed,selected,source,wording' || item.line !== source[index].line || item.source !== source[index].source || typeof item.wording !== 'string' || item.wording.length > 2_000 || /[\u0000-\u0008\u000a-\u001f\u007f]/u.test(item.wording) || typeof item.selected !== 'boolean' || typeof item.packed !== 'boolean' || item.packed && !item.selected || item.selected && !item.wording.trim()) throw new TypeError('Each checklist item must match its source line and have separately reviewed wording.');
    return { ...item, wording: item.wording.trim() };
  });
}
function checkedSource(caseValue: MobilityCase, language: VisitLanguage) {
  if (!['en', 'hi'].includes(language)) throw new TypeError('Choose English or Hindi.');
  const current = validateCase(caseValue);
  if (!current.appointment) throw new TypeError('Enter details from a booking you made before preparing a visit pack.');
  canonicalVisitTimestamp(current.appointment.at);
  if (!current.appointment.venue.trim()) throw new TypeError('Enter the venue from your booking.');
  // Keep the entered source text and line positions intact after schema validation.
  if (caseValue.appointment!.venue.length > 500 || caseValue.appointment!.instructions.length > 2_000) throw new TypeError('Keep the venue within 500 characters and instructions within 2,000 characters.');
  current.appointment = { ...current.appointment, venue: caseValue.appointment!.venue, instructions: caseValue.appointment!.instructions };
  return current as MobilityCase & { appointment: NonNullable<MobilityCase['appointment']> };
}
function selectedFacts(current: MobilityCase, options: VisitPackOptions) {
  if (!options || Object.keys(options).sort().join(',') !== 'factKeys,includeReference' || typeof options.includeReference !== 'boolean' || !Array.isArray(options.factKeys) || options.factKeys.length > current.facts.length || new Set(options.factKeys).size !== options.factKeys.length) throw new TypeError('Review the optional case details again.');
  return options.factKeys.map(key => {
    const fact = current.facts.find(item => item.key === key && item.confirmed);
    if (!fact) throw new TypeError('Only currently confirmed facts you selected can be included.');
    return fact;
  });
}
export function previewVisitPack(caseValue: MobilityCase, items: VisitChecklistItem[], options: VisitPackOptions, language: VisitLanguage = 'en'): VisitPreview {
  const current = checkedSource(caseValue, language), checklist = checkedItems(current.appointment.instructions, items), facts = selectedFacts(current, options);
  const hi = language === 'hi', at = new Date(current.appointment.at);
  const text = [hi ? 'निजी कार्यालय-यात्रा नोट — अपॉइंटमेंट की पुष्टि नहीं' : 'PERSONAL VISIT PACK — not an appointment confirmation', '',
    `${hi ? 'आपकी दर्ज तारीख और समय' : 'Date and time entered by you'}: ${at.toLocaleString(hi ? 'hi-IN' : 'en-IN')} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
    `${hi ? 'आपका दर्ज स्थान' : 'Venue entered by you'}: ${current.appointment.venue}`, '',
    hi ? 'आपके द्वारा लिखे आधिकारिक निर्देश:' : 'Official instructions copied by you:', current.appointment.instructions || (hi ? 'कोई निर्देश दर्ज नहीं।' : 'No instructions entered.'), '',
    hi ? 'मेरी चुनी और जाँची तैयारी सूची:' : 'My selected and reviewed packing checklist:',
    ...(checklist.some(item => item.selected) ? checklist.filter(item => item.selected).flatMap(item => [`[${item.packed ? 'x' : ' '}] ${item.wording}`, `${hi ? 'आपके निर्देश की पंक्ति' : 'Your instruction line'} ${item.line}: ${item.source}`]) : [hi ? 'कोई पंक्ति नहीं चुनी।' : 'No lines selected.']),
    ...(options.includeReference && current.reference ? ['', `${hi ? 'मेरा चुना संदर्भ' : 'My selected reference'}: ${current.reference}`] : []),
    ...(facts.length ? ['', hi ? 'मेरे चुने और पुष्टि किए तथ्य:' : 'My selected, citizen-confirmed facts:', ...facts.map(fact => `- ${fact.label}: ${fact.value} (${fact.source})`)] : []), '',
    hi ? 'यह आपके अपने रिकॉर्ड की निजी तैयारी है। ऊपर के निर्देश आपने दर्ज किए हैं; चालान साक्षी ने उनकी जाँच नहीं की है। अपनी वास्तविक बुकिंग और स्रोत की वर्तमान आवश्यकताएँ फिर जाँचें।' : 'This is personal preparation from your own record. The instructions above were entered by you and have not been checked by ChallanSakshi. Recheck your actual booking and the current requirements in your source.',
  ].join('\n');
  return { binding: JSON.stringify({ current, checklist, options, language }), text };
}
export function reviewedVisitPack(preview: VisitPreview, caseValue: MobilityCase, items: VisitChecklistItem[], options: VisitPackOptions, language: VisitLanguage, consent: boolean): string {
  if (!consent) throw new TypeError('Review the exact visit pack and choose to download it.');
  const next = previewVisitPack(caseValue, items, options, language);
  if (preview.binding !== next.binding || preview.text !== next.text) throw new TypeError('The case, instructions or selected contents changed. Review the visit pack again.');
  return next.text;
}
export function visitCalendarDetails(caseValue: MobilityCase, language: VisitLanguage = 'en') {
  const current = checkedSource(caseValue, language);
  return { at: canonicalVisitTimestamp(current.appointment.at), local: `${visitIsoToLocalTime(current.appointment.at)}:${String(new Date(current.appointment.at).getSeconds()).padStart(2, '0')}`, zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    summary: language === 'hi' ? 'मेरी बुकिंग से निजी कार्यालय यात्रा' : 'Personal visit from my booking',
    description: language === 'hi' ? 'यह मेरी दर्ज बुकिंग का निजी कैलेंडर नोट है। चालान साक्षी ने बुकिंग की पुष्टि नहीं की। अपने वास्तविक रिकॉर्ड में समय और निर्देश फिर जाँचें।' : 'Personal calendar note from my entered booking. ChallanSakshi has not confirmed the booking. Recheck the time and instructions in your actual record.',
  };
}
export function previewVisitCalendar(caseValue: MobilityCase, language: VisitLanguage = 'en'): VisitPreview {
  const current = checkedSource(caseValue, language), details = visitCalendarDetails(current, language);
  const stamp = (value: string) => canonicalVisitTimestamp(value).replace(/[-:]/gu, '').replace(/\.\d{3}/u, '');
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ChallanSakshi//Personal visit preparation//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:personal-visit-${current.id}@challansakshi.local`, `DTSTAMP:${stamp(current.updatedAt)}`, `LAST-MODIFIED:${stamp(current.updatedAt)}`, `DTSTART:${stamp(details.at)}`,
    `SUMMARY:${escapeRenewalCalendarText(details.summary)}`, `DESCRIPTION:${escapeRenewalCalendarText(details.description)}`, 'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'].map(foldRenewalCalendarLine).join('\r\n') + '\r\n';
  return { binding: JSON.stringify({ current, language }), text };
}
export function reviewedVisitCalendar(preview: VisitPreview, caseValue: MobilityCase, language: VisitLanguage, consent: boolean): string {
  if (!consent) throw new TypeError('Review this personal calendar entry and choose to download it.');
  const next = previewVisitCalendar(caseValue, language);
  if (preview.binding !== next.binding || preview.text !== next.text) throw new TypeError('The booking or case changed. Review the calendar again.');
  return next.text;
}
