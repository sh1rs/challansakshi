import { sha256Hex } from '../local-sha256';
import { validateCase, type MobilityCase } from './cases';

export type FollowUpStatus = 'unknown' | 'pending' | 'needs-info' | 'completed';
export type FollowUpObservationInput = { status: FollowUpStatus; observedAt: string; sourceLabel: string; reference: string; note: string; evidenceSha256?: string };
export type FollowUpObservation = FollowUpObservationInput & { basis: 'citizen-entered'; recordedAt: string };
export type FailedFollowUp = { at: string; note: string; recordedAt: string; basis: 'citizen-entered' };
export type FollowUpRecord = {
  version: 1; caseId: string; revision: number; createdAt: string; updatedAt: string;
  observations: FollowUpObservation[]; failedChecks: FailedFollowUp[]; nextCheckDate: string;
  acknowledged: { key: string; at: string } | null;
};
export type FollowUpAttention = { key: string; reason: 'needs-info' | 'failed-check' | 'due' | 'stale'; caseId: string };

const OBSERVATION_KEYS = ['status', 'observedAt', 'sourceLabel', 'reference', 'note', 'evidenceSha256'];
const DAY_MS = 86_400_000;
const STATUSES: FollowUpStatus[] = ['unknown', 'pending', 'needs-info', 'completed'];
function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${label} must be a plain object.`);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key))) throw new TypeError(`${label} has an unexpected field.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new TypeError(`${label} must be ${required ? 'non-empty' : 'valid'} text of at most ${max} characters.`);
  return value.trim();
}
export function validateFollowUpTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new TypeError('Follow-up time must be a valid UTC ISO timestamp.');
  return value;
}
export function validateFollowUpDate(value: unknown): string {
  if (value === '') return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || Number(value.slice(0, 4)) < 1900 || Number(value.slice(0, 4)) > 9998 || !Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw new TypeError('Choose a valid follow-up date.');
  return value;
}
function caseId(value: unknown): string {
  const checked = text(value, 'Case id', 80, true);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(checked)) throw new TypeError('Case id is invalid.');
  return checked;
}
function fingerprint(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) throw new TypeError('Evidence fingerprint must be a SHA-256 value.');
  return value;
}
function observationInput(value: unknown): FollowUpObservationInput {
  const input = object(value, OBSERVATION_KEYS, 'Follow-up observation');
  if (!STATUSES.includes(input.status as FollowUpStatus)) throw new TypeError('Citizen-entered status is invalid.');
  return { status: input.status as FollowUpStatus, observedAt: validateFollowUpTimestamp(input.observedAt), sourceLabel: text(input.sourceLabel, 'Source label', 160, true), reference: text(input.reference, 'Reference', 160), note: text(input.note, 'Observation note', 500), ...(input.evidenceSha256 === undefined ? {} : { evidenceSha256: fingerprint(input.evidenceSha256) }) };
}
function observationKey(value: FollowUpObservationInput): string {
  return sha256Hex(JSON.stringify(observationInput(Object.fromEntries(OBSERVATION_KEYS.filter(key => key in value).map(key => [key, value[key as keyof FollowUpObservationInput]])))));
}
export function fingerprintFollowUpEvidence(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes.length > 5 * 1024 * 1024) throw new TypeError('Choose a non-empty evidence file of at most 5 MiB.');
  return sha256Hex(bytes);
}

export function createFollowUp(id: string, now: string): FollowUpRecord {
  return { version: 1, caseId: caseId(id), revision: 0, createdAt: validateFollowUpTimestamp(now), updatedAt: now, observations: [], failedChecks: [], nextCheckDate: '', acknowledged: null };
}
export function validateFollowUp(value: unknown): FollowUpRecord {
  const input = object(value, ['version', 'caseId', 'revision', 'createdAt', 'updatedAt', 'observations', 'failedChecks', 'nextCheckDate', 'acknowledged'], 'Follow-up record');
  if (input.version !== 1 || !Number.isSafeInteger(input.revision) || (input.revision as number) < 0) throw new TypeError('Follow-up version or revision is invalid.');
  if (!Array.isArray(input.observations) || input.observations.length > 20) throw new TypeError('Keep at most 20 source observations per case.');
  if (!Array.isArray(input.failedChecks) || input.failedChecks.length > 10) throw new TypeError('Keep at most 10 failed check records per case.');
  const createdAt = validateFollowUpTimestamp(input.createdAt);
  const updatedAt = validateFollowUpTimestamp(input.updatedAt);
  if (updatedAt < createdAt) throw new TypeError('Follow-up update time cannot precede creation.');
  const observations = input.observations.map(value => {
    const item = object(value, [...OBSERVATION_KEYS, 'basis', 'recordedAt'], 'Stored observation');
    if (item.basis !== 'citizen-entered') throw new TypeError('Observations must be explicitly citizen-entered.');
    const base = observationInput(Object.fromEntries(OBSERVATION_KEYS.filter(key => key in item).map(key => [key, item[key]])));
    const recordedAt = validateFollowUpTimestamp(item.recordedAt);
    if (base.observedAt > recordedAt || recordedAt < createdAt || recordedAt > updatedAt) throw new TypeError('Observation time cannot be future or outside the saved record history.');
    return { ...base, recordedAt, basis: 'citizen-entered' as const };
  });
  const failedChecks = input.failedChecks.map(value => {
    const item = object(value, ['at', 'note', 'recordedAt', 'basis'], 'Failed check');
    if (item.basis !== 'citizen-entered') throw new TypeError('Failed checks must be citizen-entered.');
    const at = validateFollowUpTimestamp(item.at); const recordedAt = validateFollowUpTimestamp(item.recordedAt);
    if (at > recordedAt || recordedAt < createdAt || recordedAt > updatedAt) throw new TypeError('Failed-check time cannot be future or outside the saved history.');
    return { at, recordedAt, note: text(item.note, 'Failed-check note', 500, true), basis: 'citizen-entered' as const };
  });
  if (new Set(observations.map(observationKey)).size !== observations.length || new Set(failedChecks.map(item => JSON.stringify([item.at, item.note]))).size !== failedChecks.length) throw new TypeError('Duplicate follow-up observations are not allowed.');
  let acknowledged: FollowUpRecord['acknowledged'] = null;
  if (input.acknowledged !== null) {
    const item = object(input.acknowledged, ['key', 'at'], 'Attention acknowledgement');
    acknowledged = { key: fingerprint(item.key), at: validateFollowUpTimestamp(item.at) };
    if (acknowledged.at < createdAt || acknowledged.at > updatedAt) throw new TypeError('Acknowledgement time is outside the saved history.');
  }
  return { version: 1, caseId: caseId(input.caseId), revision: input.revision as number, createdAt, updatedAt, observations, failedChecks, nextCheckDate: validateFollowUpDate(input.nextCheckDate), acknowledged };
}
function currentRecord(value: FollowUpRecord, now: string): FollowUpRecord {
  const checked = validateFollowUp(value); validateFollowUpTimestamp(now);
  if (now < checked.updatedAt) throw new TypeError('Follow-up time cannot move backwards.');
  return checked;
}
export function addFollowUpObservation(value: FollowUpRecord, inputValue: FollowUpObservationInput, now: string): FollowUpRecord {
  const current = currentRecord(value, now); const input = observationInput(inputValue);
  if (input.observedAt > now) throw new TypeError('Observation time cannot be in the future.');
  if (current.observations.some(item => observationKey(item) === observationKey(input))) return current;
  return validateFollowUp({ ...current, updatedAt: now, observations: [...current.observations, { ...input, basis: 'citizen-entered', recordedAt: now }] });
}
export function recordFailedFollowUp(value: FollowUpRecord, inputValue: { at: string; note: string }, now: string): FollowUpRecord {
  const current = currentRecord(value, now); const input = object(inputValue, ['at', 'note'], 'Failed-check entry');
  const at = validateFollowUpTimestamp(input.at); const note = text(input.note, 'Failed-check note', 500, true);
  if (at > now) throw new TypeError('Failed-check time cannot be in the future.');
  if (current.failedChecks.some(item => item.at === at && item.note === note)) return current;
  return validateFollowUp({ ...current, updatedAt: now, failedChecks: [...current.failedChecks, { at, note, recordedAt: now, basis: 'citizen-entered' }] });
}
export function scheduleFollowUp(value: FollowUpRecord, date: string, now: string): FollowUpRecord {
  const current = currentRecord(value, now); const nextCheckDate = validateFollowUpDate(date);
  return nextCheckDate === current.nextCheckDate ? current : validateFollowUp({ ...current, nextCheckDate, updatedAt: now });
}
export function followUpSummary(value: FollowUpRecord, now: string) {
  const current = validateFollowUp(value); validateFollowUpTimestamp(now);
  const latestObservation = [...current.observations].reverse().sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null;
  const latestFailedCheck = [...current.failedChecks].reverse().sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  const ageDays = latestObservation ? Math.max(0, Math.floor((Date.parse(now) - Date.parse(latestObservation.observedAt)) / DAY_MS)) : null;
  return { latestObservation, latestFailedCheck, ageDays, stale: ageDays !== null && ageDays >= 30, failedAfterObservation: Boolean(latestFailedCheck && (!latestObservation || latestFailedCheck.at > latestObservation.observedAt || (latestFailedCheck.at === latestObservation.observedAt && latestFailedCheck.recordedAt > latestObservation.recordedAt))) };
}
export function followUpAttention(value: FollowUpRecord, now: string, today = now.slice(0, 10)): FollowUpAttention | null {
  const current = validateFollowUp(value); validateFollowUpDate(today); const summary = followUpSummary(current, now);
  const reason = summary.latestObservation?.status === 'needs-info' ? 'needs-info' : summary.failedAfterObservation ? 'failed-check' : current.nextCheckDate && current.nextCheckDate <= today ? 'due' : summary.stale && summary.latestObservation?.status !== 'completed' ? 'stale' : null;
  if (!reason) return null;
  const key = sha256Hex(JSON.stringify([current.caseId, reason, current.nextCheckDate, summary.latestObservation ? observationKey(summary.latestObservation) : null, summary.latestFailedCheck ? [summary.latestFailedCheck.at, summary.latestFailedCheck.note] : null]));
  return current.acknowledged?.key === key ? null : { key, reason, caseId: current.caseId };
}
export function acknowledgeFollowUp(value: FollowUpRecord, key: string, now: string, today = now.slice(0, 10)): FollowUpRecord {
  const current = currentRecord(value, now); const attention = followUpAttention(current, now, today);
  if (!attention || attention.key !== key) throw new Error('This attention item changed or was already seen. Refresh before acknowledging it.');
  return validateFollowUp({ ...current, acknowledged: { key, at: now }, updatedAt: now });
}

function calendarText(value: string): string { return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
function foldCalendarLine(value: string): string {
  let current = ''; let bytes = 0; const lines: string[] = []; const encoder = new TextEncoder();
  for (const char of value) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { lines.push(current); current = ' '; bytes = 1; }
    current += char; bytes += size;
  }
  lines.push(current); return lines.join('\r\n');
}
export function buildFollowUpCalendar(caseValue: MobilityCase, recordValue: FollowUpRecord, now: string, language: 'en' | 'hi'): string {
  const caseRecord = validateCase(caseValue); const record = validateFollowUp(recordValue); validateFollowUpTimestamp(now);
  if (record.caseId !== caseRecord.id) throw new TypeError('Calendar reminder must match the saved case.');
  if (!record.nextCheckDate) throw new TypeError('Choose a date for the personal follow-up reminder.');
  if (record.revision < 1) throw new TypeError('Save the reviewed follow-up date before downloading it.');
  if (language !== 'en' && language !== 'hi') throw new TypeError('Calendar language is invalid.');
  const end = new Date(Date.parse(`${record.nextCheckDate}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
  const description = language === 'hi' ? 'निजी अनुस्मारक: अपने सहेजे केस और रिकॉर्ड फिर जाँचें। यह आधिकारिक अपॉइंटमेंट, सत्यापित स्थिति या कानूनी समय सीमा नहीं है। कोई स्वचालित निगरानी या संदेश नहीं भेजा जाता।' : 'Personal reminder: review your saved case and your own records. This is not an official appointment, verified status or legal deadline. No automatic monitoring or messages are sent.';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ChallanSakshi//Personal follow-up//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:follow-up-${caseRecord.id}@challansakshi.local`, `SEQUENCE:${record.revision}`, `DTSTAMP:${now.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${record.nextCheckDate.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${end.replace(/-/g, '')}`, `SUMMARY:${calendarText(`${language === 'hi' ? 'फ़ॉलो-अप' : 'Follow up'}: ${caseRecord.title}`)}`, `DESCRIPTION:${calendarText(description)}`, 'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'].map(foldCalendarLine).join('\r\n') + '\r\n';
}
