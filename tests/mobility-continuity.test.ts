import { describe, expect, it } from 'vitest';
import { createMobilityTask, decodeTaskStore, encodeTaskStore } from '../lib/mobility-tasks';
import { createTaskCalendar, parseTaskBackup, taskDateState } from '../lib/mobility-continuity';

const now = '2026-09-05T10:00:00.000Z';
const task = createMobilityTask({ kind: 'challan', followUpDate: '2026-09-06' }, now, 'task-one');
describe('private checklist continuation', () => {
  it('refuses unknown store or task fields instead of restoring private free text', () => {
    const raw = JSON.parse(encodeTaskStore([task], now));
    for (const value of [{ ...raw, reply: 'private reply' }, { ...raw, tasks: [{ ...task, plate: 'KA01AA1234' }] }]) {
      expect(decodeTaskStore(JSON.stringify(value), now)).toBeNull();
      expect(parseTaskBackup(JSON.stringify(value), now)).toBeNull();
    }
  });
  it('preserves source age so export and restoration cannot revive an expired backup', () => {
    const raw = encodeTaskStore([task], now);
    expect(parseTaskBackup(raw, '2026-12-04T09:59:59.999Z')).toMatchObject({ savedAt: now, tasks: [task] });
    expect(parseTaskBackup(raw, '2026-12-04T10:00:00.000Z')).toBeNull();
    expect(parseTaskBackup(raw, '2026-09-04T10:00:00.000Z')).toBeNull();
  });
  it('rejects oversized, malformed, duplicate, over-limit and impossible task backups', () => {
    for (const raw of ['x'.repeat(40_001), '[]', 'null', JSON.stringify({ version: 1, savedAt: now, tasks: [task, task] }), JSON.stringify({ version: 1, savedAt: now, tasks: Array.from({ length: 21 }, (_, i) => ({ ...task, id: `task-${i}` })) }), JSON.stringify({ version: 1, savedAt: now, tasks: [{ ...task, followUpDate: '2026-02-30' }] })]) expect(parseTaskBackup(raw, now)).toBeNull();
  });
  it('distinguishes overdue, today and the next seven calendar days across month boundaries', () => {
    for (const [followUpDate, expected] of [['2026-08-30', 'overdue'], ['2026-08-31', 'today'], ['2026-09-07', 'upcoming'], ['2026-09-08', 'later'], ['', 'none']] as const) expect(taskDateState({ ...task, followUpDate }, '2026-08-31')).toBe(expected);
    expect(taskDateState({ ...task, status: 'done' }, '2026-09-06')).toBe('done');
  });
  it('exports an all-day personal event with an exclusive end date and no implicit alarm', () => {
    const calendar = createTaskCalendar({ ...task, followUpDate: '2028-02-29' }, now, 'en');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301');
    expect(calendar).toContain('SUMMARY:Challan review');
    expect(calendar).toContain('DTSTAMP:20260905T100000Z');
    expect(calendar).not.toMatch(/VALARM|ATTENDEE|ORGANIZER|LOCATION/);
    expect(calendar).toContain('not a legal deadline');
    expect(calendar.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('uses bounded fixed translations, valid UTF-8 line folds and rejects missing dates or injected identities', () => {
    const calendar = createTaskCalendar({ ...task, kind: 'licence' }, now, 'hi');
    expect(calendar.replace(/\r\n /g, '')).toContain('ड्राइविंग लाइसेंस');
    expect(calendar.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(() => createTaskCalendar({ ...task, followUpDate: '' }, now, 'en')).toThrow();
    expect(() => createTaskCalendar({ ...task, id: 'x\r\nATTENDEE:bad' }, now, 'en')).toThrow();
  });
});
