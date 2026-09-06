import { describe, expect, it } from 'vitest';
import { buildRenewalCalendar, createRenewal, escapeRenewalCalendarText, foldRenewalCalendarLine, renewalAttention, renewalCalendarPreview, renewalInput, updateRenewal, validateRenewal, validateRenewalDate, type RenewalInput } from '../lib/mobility/renewals';

const AT = '2026-09-06T10:00:00.000Z';
const INPUT: RenewalInput = { kind: 'licence', label: 'My licence', vehicleLabel: 'Family scooter', expiryDate: '2026-10-06', sourceLabel: 'My original card', checkedOn: '2026-09-06', reminderDate: '2026-09-20' };
const record = () => createRenewal(INPUT, AT, 'renewal-fixture', '2026-09-06');

describe('citizen-entered document date organiser', () => {
  it('creates minimal records without identity numbers and edits without rewriting identity or retention history', () => {
    const original = record(); expect(original).toMatchObject({ basis: 'citizen-entered', revision: 0, createdAt: AT });
    const edited = updateRenewal({ ...original, revision: 4 }, { ...INPUT, expiryDate: '2027-02-01', sourceLabel: 'Replacement card' }, '2026-09-07T10:00:00.000Z', '2026-09-07');
    expect(edited).toMatchObject({ id: original.id, revision: 4, createdAt: AT, expiryDate: '2027-02-01', updatedAt: '2026-09-07T10:00:00.000Z' });
    expect(renewalInput(edited)).toEqual({ ...INPUT, expiryDate: '2027-02-01', sourceLabel: 'Replacement card' });
  });
  it.each(['insurance', 'puc', 'other'] as const)('supports %s as an entered document type without creating a service action', kind => {
    expect(createRenewal({ ...INPUT, kind, label: '', vehicleLabel: '', reminderDate: '' }, AT, 'minimal', '2026-09-06')).toMatchObject({ kind, label: '', vehicleLabel: '', reminderDate: '' });
  });
  it.each(['2026-02-29', '1900-02-29', '2024-04-31', '2026-13-01', '2026-00-20', '2026-1-01', '2026-09-06T10:00:00Z', '1899-12-31', '9999-01-01', ''])('rejects impossible or unsupported date %s', value => {
    expect(() => validateRenewalDate(value)).toThrow();
  });
  it('accepts leap dates and leaves optional reminder empty rather than guessing a deadline', () => {
    expect(validateRenewalDate('2000-02-29')).toBe('2000-02-29'); expect(validateRenewalDate('', true)).toBe('');
    expect(() => renewalCalendarPreview({ ...record(), reminderDate: '' })).toThrow(/choose/i);
  });
  it('rejects future source checks, injected verified flags, credential fields and oversized labels', () => {
    expect(() => createRenewal({ ...INPUT, checkedOn: '2026-09-07' }, AT, 'future', '2026-09-06')).toThrow(/future/i);
    for (const value of [{ ...record(), verified: true }, { ...record(), licenceNumber: 'FULL-NUMBER' }, { ...record(), basis: 'official' }, { ...record(), sourceLabel: 'x'.repeat(201) }, { ...record(), label: 'bad\nlabel' }, { ...record(), sourceLabel: '' }]) expect(() => validateRenewal(value)).toThrow();
  });
  it.each([[-1, 'past'], [0, 'today'], [1, 'soon'], [30, 'soon'], [31, 'later']] as const)('classifies expiry %i calendar days away as %s independently of source freshness', (days, expected) => {
    const expiryDate = new Date(Date.parse('2026-09-06T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10);
    const status = renewalAttention({ ...record(), expiryDate, checkedOn: '2026-08-07' }, '2026-09-06');
    expect(status).toMatchObject({ daysUntilExpiry: days, expiry: expected, source: 'stale', daysSinceCheck: 30 });
  });
  it('uses calendar days across leap day and daylight-saving transitions, with a separate chosen reminder', () => {
    expect(renewalAttention({ ...record(), expiryDate: '2028-03-01', checkedOn: '2028-02-28', reminderDate: '2028-02-29' }, '2028-02-29')).toMatchObject({ daysUntilExpiry: 1, daysSinceCheck: 1, reminderDue: true });
    expect(renewalAttention({ ...record(), expiryDate: '2026-03-09', checkedOn: '2026-03-07' }, '2026-03-08')).toMatchObject({ daysUntilExpiry: 1, daysSinceCheck: 1 });
    expect(renewalAttention({ ...record(), checkedOn: '2026-08-08', reminderDate: '' }, '2026-09-06')).toMatchObject({ source: 'recent', daysSinceCheck: 29, reminderDue: false });
  });
  it('calendar uses a stable UID and updated sequence, all-day dates and no source/vehicle/expiry disclosure or alarms', () => {
    const first = { ...record(), revision: 1 }, calendar = buildRenewalCalendar(first);
    expect(calendar).toContain('UID:document-reminder-renewal-fixture@challansakshi.local\r\n');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20260920\r\nDTEND;VALUE=DATE:20260921\r\n');
    expect(calendar).toContain('SEQUENCE:1\r\n'); expect(calendar).toContain('CLASS:PRIVATE\r\n');
    for (const privateValue of [INPUT.label, INPUT.vehicleLabel, INPUT.sourceLabel, INPUT.expiryDate, 'VALARM', 'ATTENDEE', 'ORGANIZER', 'METHOD:REQUEST']) expect(calendar).not.toContain(privateValue);
    const next = buildRenewalCalendar({ ...first, revision: 2, reminderDate: '2026-09-21' });
    expect(next.match(/^UID:.*$/mu)?.[0]).toBe(calendar.match(/^UID:.*$/mu)?.[0]); expect(next).toContain('SEQUENCE:2\r\n');
  });
  it('calendar escapes reserved characters and folds Hindi by UTF-8 octets without splitting code points', () => {
    expect(escapeRenewalCalendarText('a\\b;c,d\r\ne\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
    const line = 'DESCRIPTION:' + 'हिन्दी🙂'.repeat(60), folded = foldRenewalCalendarLine(line);
    expect(folded.replace(/\r\n /gu, '')).toBe(line);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    const calendar = buildRenewalCalendar({ ...record(), reminderDate: '2028-02-29' }, 'hi');
    expect(calendar).toContain('DTEND;VALUE=DATE:20280301'); expect(calendar).not.toContain('\ufffd');
    expect(calendar).toContain('SUMMARY:निजी दस्तावेज़');
  });
});
