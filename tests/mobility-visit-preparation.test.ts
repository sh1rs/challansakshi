import { afterEach, describe, expect, it } from 'vitest';
import { createCase, updateCase } from '../lib/mobility/cases';
import { previewVisitCalendar, previewVisitPack, reviewedVisitCalendar, reviewedVisitPack, visitCalendarDetails, visitInstructionLines, visitIsoToLocalTime, visitLocalTimeToIso } from '../lib/mobility/visit-preparation';

const NOW = '2026-09-06T10:00:00.000Z';
const current = () => updateCase(createCase('licence-renew', NOW, 'visit-test-one'), {
  appointment: { at: '2026-09-20T05:00:00.000Z', venue: 'My entered RTO', instructions: 'Bring the originals listed in my booking.\nKeep my booking record ready.' },
  reference: 'PRIVATE-REFERENCE', draft: 'PRIVATE-FULL-DRAFT',
  facts: [{ key: 'name', label: 'Name', value: 'PRIVATE-CITIZEN-NAME', source: 'citizen', confirmed: true }, { key: 'unconfirmed', label: 'Unconfirmed', value: 'PRIVATE-UNREVIEWED', source: 'profile', confirmed: false }],
}, NOW, { kind: 'citizen-report', text: 'PRIVATE-TIMELINE', basis: 'citizen-reported' });
const options = { includeReference: false, factKeys: [] as string[] };
const originalTimeZone = process.env.TZ;
afterEach(() => { if (originalTimeZone === undefined) delete process.env.TZ; else process.env.TZ = originalTimeZone; });

describe('citizen-controlled visit preparation', () => {
  it('round-trips the booked local time with its correct UTC offset', () => {
    process.env.TZ = 'Asia/Kolkata';
    expect(visitLocalTimeToIso('2026-09-20T10:30')).toBe('2026-09-20T05:00:00.000Z');
    expect(visitIsoToLocalTime('2026-09-20T05:00:00.000Z')).toBe('2026-09-20T10:30');
    expect(visitLocalTimeToIso('2028-02-29T23:59')).toBe('2028-02-29T18:29:00.000Z');
  });
  it.each(['2026-02-29T10:30', '2026-04-31T10:30', '2026-13-01T10:30', '2026-00-10T10:30', '2026-09-00T10:30', '2026-09-20T24:00', '2026-09-20T10:60', '2026-09-20', '2026-09-20T10:30Z', ''])('rejects impossible or ambiguous-format local dates: %s', value => {
    expect(() => visitLocalTimeToIso(value)).toThrow();
  });
  it('refuses DST gaps and repeated clock-change times instead of choosing an instant for the citizen', () => {
    process.env.TZ = 'America/New_York';
    expect(() => visitLocalTimeToIso('2026-03-08T02:30')).toThrow(/does not exist/);
    expect(() => visitLocalTimeToIso('2026-11-01T01:30')).toThrow(/occurs twice/);
    expect(visitLocalTimeToIso('2026-11-01T03:30')).toBe('2026-11-01T08:30:00.000Z');
  });
  it('derives only non-empty citizen-entered lines and preserves duplicate source line identities', () => {
    const lines = visitInstructionLines('  First source line\r\n\r\nFirst source line\n• My second item');
    expect(lines.map(item => [item.line, item.source])).toEqual([[1, 'First source line'], [3, 'First source line'], [4, '• My second item']]);
    expect(lines.every(item => !item.selected && !item.packed)).toBe(true);
    expect(visitInstructionLines('')).toEqual([]);
  });
  it('rejects overlong or too many instruction lines without silently truncating', () => {
    expect(() => visitInstructionLines('a'.repeat(2001))).toThrow();
    expect(() => visitInstructionLines(Array(41).fill('One').join('\n'))).toThrow(/40/);
    expect(() => visitInstructionLines('hidden\u0000control')).toThrow();
  });
  it('keeps a valid tab-separated source line intact in the exact pack', () => {
    const item = current(); item.appointment!.instructions = 'Bring:\toriginals from my booking';
    expect(previewVisitPack(item, visitInstructionLines(item.appointment!.instructions), options).text).toContain('Bring:\toriginals from my booking');
  });
  it('preserves leading blank source lines and booking seconds in their exact reviewed previews', () => {
    const item = current(); item.appointment!.instructions = '\n  My source instruction\n'; item.appointment!.at = '2026-10-20T10:30:45.123+05:30';
    const lines = visitInstructionLines(item.appointment!.instructions); lines[0].selected = true;
    const preview = previewVisitPack(item, lines, options);
    expect(preview.text).toContain(item.appointment!.instructions); expect(preview.text).toContain('Your instruction line 2: My source instruction');
    expect(visitCalendarDetails(item).local).toMatch(/:45$/u); expect(previewVisitCalendar(item).text).toContain('DTSTART:20261020T050045Z');
  });
  it('defaults to the appointment and source instructions without full case private data', () => {
    const item = current(), lines = visitInstructionLines(item.appointment!.instructions), preview = previewVisitPack(item, lines, options);
    expect(preview.text).toContain('Venue entered by you: My entered RTO');
    expect(preview.text).toContain(item.appointment!.instructions); expect(preview.text).toContain('No lines selected.');
    for (const value of ['PRIVATE-REFERENCE', 'PRIVATE-FULL-DRAFT', 'PRIVATE-CITIZEN-NAME', 'PRIVATE-UNREVIEWED', 'PRIVATE-TIMELINE', 'visit-test-one']) expect(preview.text).not.toContain(value);
    expect(preview.text).toContain('not an appointment confirmation'); expect(preview.text).toContain('have not been checked by ChallanSakshi');
  });
  it('exports reviewed citizen wording with its exact source and readiness only after selection', () => {
    const item = current(), lines = visitInstructionLines(item.appointment!.instructions); lines[0] = { ...lines[0], wording: 'My edited packing description', selected: true, packed: true };
    const preview = previewVisitPack(item, lines, { includeReference: true, factKeys: ['name'] });
    expect(preview.text).toContain('[x] My edited packing description'); expect(preview.text).toContain(`Your instruction line 1: ${lines[0].source}`);
    expect(preview.text).toContain('PRIVATE-REFERENCE'); expect(preview.text).toContain('PRIVATE-CITIZEN-NAME'); expect(preview.text).not.toContain('PRIVATE-UNREVIEWED');
  });
  it('rejects invented source lines, skipped source entries, and unreviewed facts', () => {
    const item = current(), lines = visitInstructionLines(item.appointment!.instructions);
    expect(() => previewVisitPack(item, [{ ...lines[0], source: 'Invented legal requirement' }, lines[1]], options)).toThrow(/source/);
    expect(() => previewVisitPack(item, [lines[0]], options)).toThrow(/matches/);
    expect(() => previewVisitPack(item, [{ ...lines[0], packed: true }, lines[1]], options)).toThrow(/reviewed/);
    expect(() => previewVisitPack(item, lines, { includeReference: false, factKeys: ['unconfirmed'] })).toThrow(/confirmed/);
    expect(() => previewVisitPack(item, lines, { includeReference: false, factKeys: ['name', 'name'] })).toThrow();
  });
  it('binds explicit pack approval to the exact case, language, checklist, options and bytes', () => {
    const item = current(), lines = visitInstructionLines(item.appointment!.instructions), preview = previewVisitPack(item, lines, options);
    expect(() => reviewedVisitPack(preview, item, lines, options, 'en', false)).toThrow(/Review/);
    expect(reviewedVisitPack(preview, item, lines, options, 'en', true)).toBe(preview.text);
    for (const modified of [{ ...item, id: 'another-case' }, { ...item, appointment: { ...item.appointment!, venue: 'Changed venue' } }, { ...item, draft: 'Changed case' }]) expect(() => reviewedVisitPack(preview, modified, lines, options, 'en', true)).toThrow(/changed/);
    expect(() => reviewedVisitPack(preview, item, [{ ...lines[0], selected: true }, lines[1]], options, 'en', true)).toThrow(/changed/);
    expect(() => reviewedVisitPack(preview, item, lines, { ...options, includeReference: true }, 'en', true)).toThrow(/changed/);
    expect(() => reviewedVisitPack(preview, item, lines, options, 'hi', true)).toThrow(/changed/);
    expect(() => reviewedVisitPack({ ...preview, text: preview.text + 'Injected' }, item, lines, options, 'en', true)).toThrow(/changed/);
  });
  it('requires an entered valid booking and venue and permits past bookings without claiming upcoming status', () => {
    expect(() => previewVisitCalendar(createCase('licence-renew', NOW, 'empty'))).toThrow(/booking/);
    expect(() => previewVisitCalendar({ ...current(), appointment: { ...current().appointment!, venue: '' } })).toThrow();
    expect(() => previewVisitCalendar({ ...current(), appointment: { ...current().appointment!, at: '2026-02-30T10:00:00.000Z' } })).toThrow();
    expect(previewVisitCalendar({ ...current(), appointment: { ...current().appointment!, at: '2025-01-01T10:00:00.000Z' } }).text).toContain('DTSTART:20250101T100000Z');
  });
  it('creates a minimal private calendar with a stable case event identity and no guessed duration or alarm', () => {
    const item = current(), preview = previewVisitCalendar(item), text = preview.text.replace(/\r\n /gu, '');
    expect(text).toContain('UID:personal-visit-visit-test-one@challansakshi.local'); expect(text).toContain('DTSTART:20260920T050000Z'); expect(text).toContain('CLASS:PRIVATE');
    for (const value of ['PRIVATE-', 'My entered RTO', 'Bring the originals', 'LOCATION:', 'DTEND:', 'DURATION:', 'VALARM', 'ORGANIZER:', 'ATTENDEE:', 'STATUS:CONFIRMED']) expect(text).not.toContain(value);
    const changed = previewVisitCalendar({ ...item, appointment: { ...item.appointment!, at: '2026-09-21T05:00:00.000Z' } }).text;
    expect(changed.match(/UID:[^\r]+/u)?.[0]).toBe(preview.text.match(/UID:[^\r]+/u)?.[0]);
    expect(previewVisitCalendar({ ...item, id: 'second-case' }).text.match(/UID:[^\r]+/u)?.[0]).not.toBe(preview.text.match(/UID:[^\r]+/u)?.[0]);
  });
  it('canonicalizes valid imported offset and fractional timestamps into UTC iCalendar values', () => {
    const item = { ...current(), updatedAt: '2026-09-06T15:30:01.12+05:30', appointment: { ...current().appointment!, at: '2026-10-20T10:30+05:30' } };
    const calendar = previewVisitCalendar(item).text;
    expect(calendar).toContain('DTSTAMP:20260906T100001Z'); expect(calendar).toContain('LAST-MODIFIED:20260906T100001Z'); expect(calendar).toContain('DTSTART:20261020T050000Z');
    process.env.TZ = 'Asia/Kolkata'; expect(visitIsoToLocalTime(item.appointment.at)).toBe('2026-10-20T10:30');
  });
  it('folds Hindi calendar UTF-8 lines within 75 octets and requires new approval after changes', () => {
    const item = current(), preview = previewVisitCalendar(item, 'hi');
    for (const line of preview.text.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(visitCalendarDetails(item, 'hi').summary).toContain('निजी');
    expect(() => reviewedVisitCalendar(preview, item, 'hi', false)).toThrow(/Review/);
    expect(reviewedVisitCalendar(preview, item, 'hi', true)).toBe(preview.text);
    expect(() => reviewedVisitCalendar(preview, item, 'en', true)).toThrow(/changed/);
    expect(() => reviewedVisitCalendar(preview, { ...item, appointment: { ...item.appointment!, instructions: 'New source' } }, 'hi', true)).toThrow(/changed/);
    expect(() => reviewedVisitCalendar({ ...preview, text: 'BEGIN:FORGED' }, item, 'hi', true)).toThrow(/changed/);
  });
});
