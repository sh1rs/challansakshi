import { describe, expect, it } from 'vitest';
import {
  calculateAuthorityWindow,
  calculateContestWindow,
  classifyEvidenceComparison,
  evaluateEvidenceReadiness,
  getAvailableCaseActions,
  transitionDemoCase,
} from '../lib/domain';
import { fixtures } from '../lib/fixtures';

describe('contest clock', () => {
  it('shows the early contest period using calendar dates', () => {
    const result = calculateContestWindow('2026-08-20', '2026-08-27');
    expect(result).toMatchObject({ dayNumber: 8, elapsedDays: 7, daysRemaining: 38, status: 'open', indicativeDeadline: '2026-10-04' });
  });

  it('keeps D+45 as a clearly labelled indicative final day', () => {
    const result = calculateContestWindow('2026-08-20', '2026-10-04');
    expect(result.status).toBe('final-day');
    expect(result.daysRemaining).toBe(0);
  });

  it('marks the stated period as expired after D+45 without hiding portal actions', () => {
    const result = calculateContestWindow('2026-08-20', '2026-10-05');
    expect(result.status).toBe('expired');
    expect(result.daysRemaining).toBe(0);
  });
});

describe('authority response clock', () => {
  it('shows a decision still within the response period', () => {
    const result = calculateAuthorityWindow('2026-08-01', '2026-08-20');
    expect(result).toMatchObject({ status: 'awaiting', elapsedDays: 19, daysRemaining: 11 });
  });

  it('shows the D+30 verification boundary', () => {
    const result = calculateAuthorityWindow('2026-07-28', '2026-08-27');
    expect(result).toMatchObject({ status: 'boundary', elapsedDays: 30, daysRemaining: 0 });
  });

  it('shows no recorded decision after the stated response period', () => {
    const result = calculateAuthorityWindow('2026-07-27', '2026-08-27');
    expect(result).toMatchObject({ status: 'overdue', elapsedDays: 31, daysRemaining: 0 });
  });
});

describe('evidence classification', () => {
  it('classifies the clear fixture as a vehicle mismatch with three source-linked differences', () => {
    const result = classifyEvidenceComparison(fixtures.mismatch.confirmedFacts);
    expect(result.finding).toBe('mismatch');
    expect(result.discrepancies.map((item) => item.field)).toEqual(['registration', 'category', 'colour']);
    expect(result.discrepancies.every((item) => item.observedSource === 'enforcement')).toBe(true);
  });

  it('does not invent a mismatch when the plate is unreadable', () => {
    const result = classifyEvidenceComparison(fixtures.inconclusive.confirmedFacts);
    expect(result.finding).toBe('inconclusive');
    expect(result.discrepancies).toEqual([]);
    expect(result.limitations).toContain('registration-unreadable');
  });

  it('returns consistent when all material fields match and the offence is assessable', () => {
    const result = classifyEvidenceComparison(fixtures.consistent.confirmedFacts);
    expect(result).toEqual({ finding: 'consistent', discrepancies: [], limitations: [] });
  });
});

describe('evidence readiness', () => {
  it('marks the hero pack complete', () => {
    const result = evaluateEvidenceReadiness(fixtures.mismatch.readiness);
    expect(result.complete).toBe(true);
    expect(result.requiredPresent).toBe(result.requiredTotal);
  });

  it('keeps missing required evidence visible', () => {
    const result = evaluateEvidenceReadiness(fixtures.inconclusive.readiness);
    expect(result.complete).toBe(false);
    expect(result.requiredPresent).toBeLessThan(result.requiredTotal);
    expect(result.items.find((item) => item.id === 'current-photo')?.status).toBe('present');
    expect(result.items.filter((item) => item.status === 'missing').map((item) => item.id)).toEqual(['clearer-image']);
  });
});

describe('demo state machine', () => {
  it('exposes only valid actions for the current case state', () => {
    expect(getAvailableCaseActions('review')).toEqual(['CONFIRM', 'BACK']);
    expect(transitionDemoCase('review', 'CONFIRM')).toBe('finding');
    expect(transitionDemoCase('pack', 'SUBMIT')).toBe('submitted');
  });

  it('rejects invalid state transitions', () => {
    expect(() => transitionDemoCase('intake', 'SUBMIT')).toThrow('Invalid demo transition');
  });
});
