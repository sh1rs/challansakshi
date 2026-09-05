import { decodeTaskStore, encodeTaskStore, type MobilityTask } from './mobility-tasks';

export const TASK_BACKUP_MAX_BYTES = 40_000;
export type TaskBackup = { savedAt: string; tasks: MobilityTask[] };
export const taskKindNames = { challan: ['Challan review', 'चालान समीक्षा'], fastag: ['FASTag check', 'FASTag जाँच'], reply: ['Authority reply', 'प्राधिकरण का उत्तर'], insurance: ['Insurance renewal', 'बीमा नवीनीकरण'], puc: ['PUC renewal', 'PUC नवीनीकरण'], licence: ['Driving licence', 'ड्राइविंग लाइसेंस'] };

/** Reads the existing exact metadata schema. The original savedAt keeps its 90-day expiry. */
export function parseTaskBackup(raw: string, now: string): TaskBackup | null {
  if (raw.length > TASK_BACKUP_MAX_BYTES || new TextEncoder().encode(raw).length > TASK_BACKUP_MAX_BYTES) return null;
  const tasks = decodeTaskStore(raw, now);
  return tasks ? { tasks, savedAt: (JSON.parse(raw) as { savedAt: string }).savedAt } : null;
}
export function taskDateState(task: MobilityTask, today: string): 'done' | 'none' | 'overdue' | 'today' | 'upcoming' | 'later' {
  if (task.status === 'done') return 'done';
  if (!task.followUpDate || !today) return 'none';
  const days = (Date.parse(`${task.followUpDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  return days < 0 ? 'overdue' : days === 0 ? 'today' : days <= 7 ? 'upcoming' : 'later';
}
function calendarText(value: string): string { return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
/** RFC 5545: fold at 75 octets without splitting UTF-8 characters. */
function foldLine(value: string): string {
  let line = ''; let bytes = 0; const lines: string[] = []; const encoder = new TextEncoder();
  for (const char of value) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { lines.push(line); line = ' '; bytes = 1; }
    line += char; bytes += size;
  }
  lines.push(line); return lines.join('\r\n');
}
export function createTaskCalendar(task: MobilityTask, now: string, language: 'en' | 'hi'): string {
  // Validate every property before anything can become calendar syntax.
  if (!task.followUpDate || !decodeTaskStore(encodeTaskStore([task], now), now)) throw new Error('Invalid calendar task');
  const date = task.followUpDate.replace(/-/g, '');
  const nextDate = new Date(Date.parse(`${task.followUpDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, '');
  const description = language === 'hi'
    ? 'आपकी चुनी हुई फॉलो-अप तारीख। यह कानूनी समय सीमा या आधिकारिक स्थिति की जाँच नहीं है। अपने कैलेंडर में सूचना सेट करें। ChallanSakshi सूचना नहीं भेजता।'
    : 'Your chosen follow-up date; not a legal deadline or an official status check. Set notifications in your calendar. ChallanSakshi does not send reminders.';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ChallanSakshi//Private checklist//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${task.id}@challansakshi.sh1rs.com`, `DTSTAMP:${now.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${nextDate}`, `SUMMARY:${calendarText(taskKindNames[task.kind][language === 'hi' ? 1 : 0])}`, `DESCRIPTION:${calendarText(description)}`, 'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n';
}
