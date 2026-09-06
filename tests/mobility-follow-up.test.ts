import { describe, expect, it } from 'vitest';
import { createCase } from '../lib/mobility/cases';
import {
  acknowledgeFollowUp, addFollowUpObservation, buildFollowUpCalendar, createFollowUp, fingerprintFollowUpEvidence,
  followUpAttention, followUpSummary, recordFailedFollowUp, scheduleFollowUp, validateFollowUp,
  type FollowUpObservationInput,
} from '../lib/mobility/follow-up';

const NOW = '2026-09-06T10:00:00.000Z';
const observedAt = '2026-09-06T09:00:00.000Z';
const input = (patch: Partial<FollowUpObservationInput> = {}): FollowUpObservationInput => ({ status: 'pending', observedAt, sourceLabel: 'My acknowledgement copy', reference: 'MY-REF-01', note: 'Awaiting a reply shown in my record.', ...patch });

describe('citizen-entered follow-up observations', () => {
  it('retains source, observation time and optional byte fingerprint without claiming verified status', () => {
    const sha256 = fingerprintFollowUpEvidence(new TextEncoder().encode('abc'));
    expect(sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const next = addFollowUpObservation(createFollowUp('case-one', NOW), input({ evidenceSha256: sha256 }), NOW);
    expect(next.observations[0]).toMatchObject({ ...input(), evidenceSha256: sha256, basis: 'citizen-entered', recordedAt: NOW });
    expect(() => addFollowUpObservation(next, { ...input(), verified: true } as never, NOW)).toThrow(/unexpected/i);
    expect(() => addFollowUpObservation(next, { ...input(), status: 'officially-verified' } as never, NOW)).toThrow(/status/i);
  });

  it('preserves the last observed status and time after a later failed check', () => {
    let record = addFollowUpObservation(createFollowUp('case-one', NOW), input(), NOW);
    record = recordFailedFollowUp(record, { at: '2026-09-06T11:00:00.000Z', note: 'The record page did not load.' }, '2026-09-06T11:01:00.000Z');
    const summary = followUpSummary(record, '2026-09-06T11:02:00.000Z');
    expect(summary.latestObservation).toMatchObject({ status: 'pending', observedAt });
    expect(summary.latestFailedCheck).toMatchObject({ note: 'The record page did not load.' });
    expect(summary.failedAfterObservation).toBe(true);
  });

  it('uses observation time rather than entry order and surfaces stale age honestly', () => {
    let record = addFollowUpObservation(createFollowUp('case-one', NOW), input(), NOW);
    record = addFollowUpObservation(record, input({ status: 'needs-info', observedAt: '2026-08-01T09:00:00.000Z' }), NOW);
    expect(followUpSummary(record, NOW).latestObservation?.status).toBe('pending');
    expect(followUpSummary(record, '2026-10-07T10:00:00.000Z')).toMatchObject({ stale: true, ageDays: 31 });
    expect(followUpSummary(createFollowUp('case-empty', NOW), NOW)).toMatchObject({ latestObservation: null, ageDays: null, stale: false });
  });

  it('recognizes a later failed check even when minute-precision input has the same observed time', () => {
    let record = addFollowUpObservation(createFollowUp('case-one', NOW), input({ observedAt: NOW }), NOW);
    record = recordFailedFollowUp(record, { at: NOW, note: 'Could not check again.' }, '2026-09-06T10:00:30.000Z');
    expect(followUpSummary(record, '2026-09-06T10:00:31.000Z').failedAfterObservation).toBe(true);
    expect(followUpAttention(record, '2026-09-06T10:00:31.000Z')?.reason).toBe('failed-check');
  });

  it('deduplicates identical observations and failed checks without moving the save timestamp', () => {
    const original = addFollowUpObservation(createFollowUp('case-one', NOW), input(), NOW);
    expect(addFollowUpObservation(original, input(), '2026-09-07T10:00:00.000Z')).toEqual(original);
    const failed = recordFailedFollowUp(original, { at: NOW, note: 'Could not load.' }, NOW);
    expect(recordFailedFollowUp(failed, { at: NOW, note: 'Could not load.' }, '2026-09-07T10:00:00.000Z')).toEqual(failed);
  });

  it('deduplicates acknowledged attention but exposes new observations and changed schedules', () => {
    let record = scheduleFollowUp(addFollowUpObservation(createFollowUp('case-one', NOW), input(), NOW), '2026-09-06', NOW);
    const attention = followUpAttention(record, NOW)!;
    expect(attention.reason).toBe('due');
    record = acknowledgeFollowUp(record, attention.key, NOW);
    expect(followUpAttention(record, NOW)).toBeNull();
    expect(followUpAttention(record, '2026-09-07T10:00:00.000Z')).toBeNull();
    record = scheduleFollowUp(record, '2026-09-07', NOW);
    expect(followUpAttention(record, '2026-09-07T10:00:00.000Z')?.reason).toBe('due');
    record = addFollowUpObservation(record, input({ status: 'needs-info', observedAt: NOW }), NOW);
    expect(followUpAttention(record, NOW)?.reason).toBe('needs-info');
    expect(() => acknowledgeFollowUp(record, attention.key, NOW)).toThrow(/changed|stale/i);
  });

  it('rejects impossible dates, future observations, missing source labels, raw records and excessive histories', () => {
    const record = createFollowUp('case-one', NOW);
    expect(() => scheduleFollowUp(record, '2026-02-30', NOW)).toThrow(/date/i);
    expect(() => scheduleFollowUp(record, '0000-01-01', NOW)).toThrow(/date/i);
    expect(() => addFollowUpObservation(record, input({ observedAt: '2026-09-07T00:00:00.000Z' }), NOW)).toThrow(/future/i);
    expect(() => addFollowUpObservation(record, input({ sourceLabel: ' ' }), NOW)).toThrow(/source/i);
    expect(() => addFollowUpObservation(record, { ...input(), rawDocument: 'private' } as never, NOW)).toThrow(/unexpected/i);
    expect(() => validateFollowUp({ ...record, observations: Array(21).fill({}) })).toThrow(/20/i);
    expect(() => fingerprintFollowUpEvidence(new Uint8Array(5 * 1024 * 1024 + 1))).toThrow(/5 MiB/i);
  });

  it('creates a personal all-day event with stable UID, revision sequence and exclusive leap-day end', () => {
    const caseValue = createCase('licence-renew', NOW, 'calendar-case');
    const record = { ...scheduleFollowUp(createFollowUp(caseValue.id, NOW), '2028-02-29', NOW), revision: 3 };
    const calendar = buildFollowUpCalendar(caseValue, record, NOW, 'en');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301');
    expect(calendar).toContain('DTSTAMP:20260906T100000Z');
    expect(calendar).toContain('SEQUENCE:3');
    expect(calendar).toContain('CLASS:PRIVATE');
    expect(calendar).not.toMatch(/ATTENDEE|ORGANIZER|VALARM|LOCATION/);
    expect(calendar).toContain('Personal reminder');
    const moved = buildFollowUpCalendar(caseValue, { ...record, nextCheckDate: '2028-03-01', revision: 4 }, NOW, 'en');
    expect(calendar.match(/^UID:.+$/m)?.[0]).toBe(moved.match(/^UID:.+$/m)?.[0]);
    expect(moved).toContain('SEQUENCE:4');
    expect(calendar.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('escapes text injection, folds UTF-8 at 75 octets and keeps raw notes out of calendar exports', () => {
    const caseValue = { ...createCase('licence-renew', NOW, 'calendar-case'), title: 'समीक्षा; नाम, पता \\ जाँचें\nBEGIN:VEVENT' };
    const record = { ...scheduleFollowUp(addFollowUpObservation(createFollowUp(caseValue.id, NOW), input({ note: 'Private note not for calendar' }), NOW), '2026-12-31', NOW), revision: 1 };
    const calendar = buildFollowUpCalendar(caseValue, record, NOW, 'hi');
    const unfolded = calendar.replace(/\r\n /g, '');
    expect(unfolded).toContain('समीक्षा\\; नाम\\, पता \\\\ जाँचें\\nBEGIN:VEVENT');
    expect(calendar.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(calendar.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
    expect(calendar).not.toContain('Private note not for calendar');
    expect(unfolded).toContain('DTEND;VALUE=DATE:20270101');
    expect(() => buildFollowUpCalendar(caseValue, { ...record, nextCheckDate: '' }, NOW, 'en')).toThrow(/date/i);
    expect(() => buildFollowUpCalendar(caseValue, { ...record, caseId: 'other' }, NOW, 'en')).toThrow(/case/i);
  });
});
