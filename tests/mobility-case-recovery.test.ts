import { describe, expect, it } from 'vitest';
import { createCase, updateCase } from '../lib/mobility/cases';
import { compareWorkingCase, prepareCaseRecovery } from '../lib/mobility/case-recovery';

const at = '2026-09-06T10:00:00.000Z';
const original = () => updateCase(createCase('challan-review', at, 'recovery-case'), {
  title: 'My case', jurisdiction: 'Karnataka', draft: 'Original request',
  facts: [{ key: 'registration', label: 'Registration', value: 'KA01AB1234', source: 'document', confirmed: true, sourceId: 'notice', sourceFingerprint: 'a'.repeat(64), page: 1 }],
}, at);

describe('reviewed case recovery', () => {
  it('compares only changed editable details and exposes source-only differences', () => {
    const latest = original();
    const working = updateCase(latest, { draft: 'My unsaved request', facts: [{ ...latest.facts[0], page: 2 }] }, at);
    const changes = compareWorkingCase(working, latest);
    expect(changes.map(item => item.key)).toEqual(['draft', 'fact:registration']);
    expect(changes[1].working).toMatchObject({ page: 2, sourceId: 'notice' });
    expect(changes[1].saved).toMatchObject({ page: 1 });
  });

  it('carries only selected details while retaining latest facts, history, reference and progress', () => {
    const base = original();
    const working = updateCase(base, { draft: 'Keep my wording', reference: 'UNSELECTED', facts: [{ ...base.facts[0], value: 'KA01AB9999' }] }, at);
    const latest = updateCase(base, { title: 'Saved elsewhere', completedSteps: ['review-details'] }, at, { kind: 'updated', basis: 'local', text: 'Latest saved activity' });
    const patch = prepareCaseRecovery(working, latest, ['draft']);
    expect(patch).toEqual({ draft: 'Keep my wording', status: 'preparing' });
    const combined = updateCase(latest, patch, at);
    expect(combined.title).toBe('Saved elsewhere');
    expect(combined.reference).toBe('');
    expect(combined.facts).toEqual(latest.facts);
    expect(combined.events).toEqual(latest.events);
    expect(combined.completedSteps).toEqual(latest.completedSteps);
  });

  it('restored changed facts require confirmation and retain their actual source lineage', () => {
    const latest = original();
    const working = updateCase(latest, { facts: [{ ...latest.facts[0], value: 'KA01AB9999' }, { key: 'extra', label: 'Entered note', value: 'Retain this', source: 'citizen', confirmed: true }] }, at);
    const patch = prepareCaseRecovery(working, latest, ['fact:registration', 'fact:extra']);
    expect(patch.facts).toEqual(working.facts.map(fact => ({ ...fact, confirmed: false })));
    expect(patch.status).toBe('preparing');
    expect(latest.facts[0].confirmed).toBe(true);
    expect(working.facts[0].confirmed).toBe(true);
  });

  it('can deliberately carry a removed fact or appointment without erasing unselected details', () => {
    const latest = updateCase(original(), { appointment: { at, venue: 'Office', instructions: 'Bring original' } }, at);
    const working = updateCase(latest, { facts: [], appointment: undefined }, at);
    expect(prepareCaseRecovery(working, latest, ['fact:registration'])).toEqual({ facts: [], status: 'preparing' });
    expect(prepareCaseRecovery(working, latest, ['appointment'])).toEqual({ appointment: undefined, status: 'preparing' });
  });

  it('rejects unrelated identities, service changes, unknown/duplicate/no selections', () => {
    const latest = original(); const working = updateCase(latest, { draft: 'New text' }, at);
    for (const selected of [[], ['draft', 'draft'], ['events'], ['fact:absent']]) expect(() => prepareCaseRecovery(working, latest, selected)).toThrow();
    expect(() => compareWorkingCase({ ...working, id: 'another-case' }, latest)).toThrow();
    expect(() => compareWorkingCase({ ...working, service: 'fastag' }, latest)).toThrow();
    expect(() => compareWorkingCase({ ...working, createdAt: '2026-09-05T10:00:00Z' }, latest)).toThrow();
  });

  it('refuses to rewrite saved reported history and enforces combined schema limits', () => {
    const latest = original(); const working = updateCase(latest, { draft: 'New text' }, at);
    for (const status of ['completed', 'awaiting-response'] as const) expect(() => prepareCaseRecovery(working, updateCase(latest, { status }, at), ['draft'])).toThrow(/reported/i);
    const reported = updateCase(latest, {}, at, { kind: 'citizen-report', basis: 'citizen-reported', text: 'Submitted this request' });
    expect(() => prepareCaseRecovery(working, reported, ['draft'])).toThrow(/reported/i);
    const full = updateCase(latest, { facts: Array.from({ length: 100 }, (_, i) => ({ key: `full_${i}`, label: 'Detail', value: `${i}`, source: 'citizen' as const, confirmed: false })) }, at);
    expect(() => prepareCaseRecovery(working, full, ['fact:registration'])).toThrow();
  });
});
