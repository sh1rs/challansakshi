import { describe, expect, it } from 'vitest';
import { buildAgenda, currentAgendaTarget } from '../lib/mobility/agenda';
import { createCase, updateCase } from '../lib/mobility/cases';
import { addFollowUpObservation, createFollowUp, recordFailedFollowUp, scheduleFollowUp } from '../lib/mobility/follow-up';
import { createRenewal } from '../lib/mobility/renewals';

const AT = '2026-09-06T10:00:00.000Z';
const caseAt = (id: string, status: 'preparing' | 'needs-attention' | 'completed' = 'preparing') => updateCase(createCase('licence-renew', AT, id), { status, title: `Saved ${id}` }, AT);
const dueCase = (id = 'due') => updateCase(caseAt(id), { followUpDate: '2026-09-06' }, AT);
const renewal = () => ({ ...createRenewal({ kind: 'insurance', label: 'Insurance', vehicleLabel: 'Private vehicle', expiryDate: '2026-09-20', sourceLabel: 'My certificate', checkedOn: '2026-08-01', reminderDate: '' }, AT, 'renewal'), revision: 1 });

describe('read-only returning-user agenda', () => {
  it('has deterministic priority and ID ties, combines reasons per target and excludes completed cases', () => {
    const appointment = updateCase(caseAt('appointment'), { appointment: { at: '2026-09-07T11:00:00.000Z', venue: 'My entered venue', instructions: '' } }, AT);
    const both = updateCase(dueCase('b'), { status: 'needs-attention' }, AT);
    const completed = updateCase(dueCase('completed'), { status: 'completed' }, AT);
    const input = { cases: [caseAt('attention', 'needs-attention'), appointment, both, dueCase('a'), completed], followUps: [], renewals: [renewal()] };
    const before = JSON.stringify(input); const agenda = buildAgenda(input, AT);
    expect(agenda.items.map(item => item.key)).toEqual(['case:a', 'case:b', 'case:appointment', 'case:attention', 'renewal:renewal']);
    expect(agenda.next?.key).toBe('case:a'); expect(agenda.items[1].reasons).toHaveLength(2);
    expect(buildAgenda({ ...input, cases: [...input.cases].reverse() }, AT).items).toEqual(agenda.items);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('keeps personal check dates and old source information distinct, retaining an observation after a failed check', () => {
    const started = '2026-08-01T10:00:00.000Z';
    let record = addFollowUpObservation(createFollowUp('source', started), { status: 'pending', sourceLabel: 'My saved acknowledgement', observedAt: started, reference: 'private-ref', note: 'private-note' }, started);
    record = recordFailedFollowUp(record, { at: AT, note: 'Could not check' }, AT); record = scheduleFollowUp(record, '2026-09-06', AT);
    const item = buildAgenda({ cases: [caseAt('source')], followUps: [record], renewals: [] }, AT).next!;
    expect(item.reasons).toEqual([{ kind: 'source-check-due', date: '2026-09-06', rank: 0 }]);
    expect(item.source).toMatchObject({ label: 'My saved acknowledgement', freshness: 'stale', date: started, ageDays: 36, failedCheckAt: AT });
    expect(JSON.stringify(item)).not.toMatch(/private-ref|private-note|Could not check/);
    expect(buildAgenda({ cases: [caseAt('source')], followUps: [{ ...record, nextCheckDate: '' }], renewals: [] }, AT).items).toEqual([]);
  });
  it('uses local calendar days at midnight and removes past appointment times', () => {
    const before = new Date(2026, 8, 6, 23, 59, 59, 0); const midnight = new Date(2026, 8, 7, 0, 0, 0, 0);
    const item = updateCase(caseAt('tomorrow'), { followUpDate: '2026-09-07' }, AT);
    const input = { cases: [item], followUps: [], renewals: [] };
    expect(buildAgenda(input, before.toISOString()).items).toHaveLength(0);
    expect(buildAgenda(input, before.toISOString()).nextRefreshAt).toBe(midnight.getTime());
    expect(buildAgenda(input, midnight.toISOString()).next?.key).toBe('case:tomorrow');
    const appointment = updateCase(caseAt('appointment'), { appointment: { at: '2026-09-06T10:00:01.000Z', venue: 'Entered venue', instructions: '' } }, AT);
    expect(buildAgenda({ ...input, cases: [appointment] }, AT).nextRefreshAt).toBe(Date.parse(appointment.appointment!.at) + 1);
    expect(buildAgenda({ ...input, cases: [appointment] }, '2026-09-06T10:00:01.001Z').items).toHaveLength(0);
  });
  it('filters expired and unlinked records without renewing timestamps or duplicating facts', () => {
    const old = '2026-06-08T10:00:00.000Z'; const expired = updateCase(createCase('fastag', old, 'expired'), { followUpDate: '2026-09-01' }, old);
    const follow = scheduleFollowUp(createFollowUp('missing', AT), '2026-09-06', AT);
    const doc = { ...renewal(), createdAt: old, updatedAt: old };
    expect(buildAgenda({ cases: [expired], followUps: [follow], renewals: [doc] }, AT).items).toEqual([]);
    expect(doc.updatedAt).toBe(old);
    expect(buildAgenda({ cases: [caseAt('ordinary')], followUps: [], renewals: [{ ...renewal(), expiryDate: '2028-01-01' }] }, AT).items).toEqual([]);
  });
  it('rejects deleted, completed, revised and changed targets including same-revision edits', () => {
    const input = { cases: [dueCase()], followUps: [], renewals: [] }; const target = buildAgenda(input, AT).next!;
    expect(currentAgendaTarget(target, input, AT).key).toBe(target.key);
    expect(() => currentAgendaTarget(target, { ...input, cases: [] }, AT)).toThrow(/changed|removed/);
    expect(() => currentAgendaTarget(target, { ...input, cases: [updateCase(input.cases[0], { title: 'Changed' }, AT)] }, AT)).toThrow(/changed/);
    expect(() => currentAgendaTarget(target, { ...input, cases: [updateCase(input.cases[0], { status: 'completed' }, AT)] }, AT)).toThrow(/changed/);
    const revision = Symbol.for('challansakshi.mobility.case-revision'); Object.defineProperty(input.cases[0], revision, { value: 2 });
    expect(() => currentAgendaTarget(target, input, AT)).toThrow(/changed/);
    const docInput = { cases: [], followUps: [], renewals: [renewal()] }; const doc = buildAgenda(docInput, AT).next!;
    expect(() => currentAgendaTarget(doc, { ...docInput, renewals: [{ ...renewal(), sourceLabel: 'Changed certificate' }] }, AT)).toThrow(/changed/);
  });
  it('validates bounds, duplicates, malformed records and time', () => {
    const input = { cases: [], followUps: [], renewals: [] };
    expect(() => buildAgenda({ ...input, cases: Array.from({ length: 51 }, (_, index) => dueCase(`case-${index}`)) }, AT)).toThrow(/50/);
    expect(() => buildAgenda({ ...input, cases: [dueCase(), dueCase()] }, AT)).toThrow(/unique/);
    expect(() => buildAgenda({ ...input, renewals: [{ ...renewal(), checkedOn: '2026-02-31' }] }, AT)).toThrow(/date/);
    expect(() => buildAgenda(input, '2026-02-31T10:00:00.000Z')).toThrow(/timestamp/);
  });
});
