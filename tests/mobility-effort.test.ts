import { describe, expect, it } from 'vitest';
import {
  beginEffort, finishEffort, pauseEffort, recordEffortInteraction, recordEffortReport,
  resumeEffort, sampleEffort, setEffortPresence, exportEffort,
} from '../lib/mobility/effort';

const sessionId = '0f6d7b88-3a52-4c3c-a898-b1361fdd8e45';
const begin = (now = 0) => beginEffort({ service: 'challan-review', now, sessionId, presence: { visible: true, focused: true } });

describe('in-memory effort clock', () => {
  it('starts only when called, with no elapsed time or inferred events', () => {
    expect(begin()).toMatchObject({ sessionId, service: 'challan-review', activeDurationMs: 0, repeatedDetailCount: 0, helpNeededCount: 0, outcome: null, status: 'active' });
  });
  it('counts only the first 30 seconds since a real interaction', () => {
    const initial = begin(100);
    const idle = sampleEffort(initial, 100_000);
    expect(idle.activeDurationMs).toBe(30_000);
    expect(sampleEffort(idle, 200_000).activeDurationMs).toBe(30_000);
    expect(initial.activeDurationMs).toBe(0);
    expect(Object.isFrozen(initial)).toBe(true);
  });
  it('a new interaction resumes counting without filling the idle gap', () => {
    const activeAgain = recordEffortInteraction(begin(), 50_000);
    expect(sampleEffort(activeAgain, 60_000).activeDurationMs).toBe(40_000);
  });
  it('repeated clock samples and interactions do not double-count time', () => {
    const sample = sampleEffort(begin(), 5_000);
    const interaction = recordEffortInteraction(sampleEffort(sample, 5_000), 10_000);
    expect(sampleEffort(interaction, 40_000).activeDurationMs).toBe(40_000);
  });
  it.each(['visible', 'focused'] as const)('excludes %s loss, accounting only the old presence until the event', key => {
    const away = setEffortPresence(begin(), { visible: true, focused: true, [key]: false }, 10_000);
    expect(sampleEffort(away, 20_000).activeDurationMs).toBe(10_000);
    const returned = setEffortPresence(away, { visible: true, focused: true }, 60_000);
    expect(sampleEffort(returned, 65_000).activeDurationMs).toBe(10_000);
    expect(sampleEffort(recordEffortInteraction(returned, 65_000), 70_000).activeDurationMs).toBe(15_000);
  });
  it('does not count while initially hidden or unfocused', () => {
    const hidden = beginEffort({ service: 'fastag', now: 0, sessionId, presence: { visible: false, focused: false } });
    expect(sampleEffort(hidden, 10_000).activeDurationMs).toBe(0);
  });
  it('ignores paused time, including activity while paused; resume is an explicit interaction', () => {
    const paused = pauseEffort(begin(), 5_000);
    const interacted = recordEffortInteraction(paused, 100_000);
    const resumed = resumeEffort(interacted, 110_000);
    expect(sampleEffort(resumed, 120_000).activeDurationMs).toBe(15_000);
  });
  it('resuming while unfocused still cannot count', () => {
    const paused = setEffortPresence(pauseEffort(begin(), 5_000), { visible: true, focused: false }, 6_000);
    expect(sampleEffort(resumeEffort(paused, 10_000), 20_000).activeDurationMs).toBe(5_000);
  });
  it('counters only increase from an explicit self-report, which is also an interaction', () => {
    const repeated = recordEffortReport(begin(), 'repeated-detail', 50_000);
    const helped = recordEffortReport(repeated, 'needed-help', 60_000);
    expect(helped).toMatchObject({ repeatedDetailCount: 1, helpNeededCount: 1, activeDurationMs: 40_000 });
    expect(() => recordEffortReport(pauseEffort(helped, 61_000), 'needed-help', 62_000)).toThrow();
    expect(() => recordEffortReport(helped, 'automatically-observed' as never, 61_000)).toThrow();
  });
  it.each(['prepared', 'official-step-reported', 'stopped'] as const)('requires an explicit %s outcome and ends the session', outcome => {
    const finished = finishEffort(begin(), outcome, 5_000);
    expect(finished).toMatchObject({ outcome, status: 'finished', activeDurationMs: 5_000 });
    expect(sampleEffort(finished, 60_000)).toBe(finished);
    expect(() => recordEffortReport(finished, 'needed-help', 60_000)).toThrow();
    expect(() => resumeEffort(finished, 60_000)).toThrow();
  });
  it('can finish while paused, without counting the paused interval', () => {
    expect(finishEffort(pauseEffort(begin(), 4_000), 'stopped', 60_000).activeDurationMs).toBe(4_000);
  });
  it('rejects invalid time, service, identifiers, presence, outcomes and transitions', () => {
    for (const now of [-1, NaN, Infinity]) expect(() => begin(now)).toThrow();
    expect(() => sampleEffort(begin(500), 499)).toThrow();
    expect(() => beginEffort({ service: 'personal title' as never, now: 0, sessionId, presence: { visible: true, focused: true } })).toThrow();
    expect(() => beginEffort({ service: 'fastag', now: 0, sessionId: 'personal@example.test', presence: { visible: true, focused: true } })).toThrow();
    expect(() => setEffortPresence(begin(), { visible: 'yes', focused: true } as never, 100)).toThrow();
    expect(() => finishEffort(begin(), '' as never, 100)).toThrow();
    expect(() => resumeEffort(begin(), 100)).toThrow();
    expect(() => pauseEffort(pauseEffort(begin(), 100), 200)).toThrow();
  });
});

describe('reviewable effort export', () => {
  it('refuses an unfinished session', () => {
    expect(() => exportEffort(begin())).toThrow();
  });
  it('whitelists only the random session identifier, service, duration, self-reports and selected outcome', () => {
    const finished = finishEffort(recordEffortReport(begin(), 'needed-help', 1234.25), 'official-step-reported', 4567.89);
    const untrustedExtras = { ...finished, caseId: 'private-case', title: 'Private title', fields: ['personal'], reference: 'secret-ref', capturedAt: 'date' };
    expect(exportEffort(untrustedExtras)).toEqual({ sessionId, service: 'challan-review', activeDurationMs: 4568, selfReportedRepeatedDetails: 0, selfReportedHelpNeeded: 1, outcome: 'official-step-reported' });
    expect(JSON.stringify(exportEffort(untrustedExtras))).not.toMatch(/private|personal|secret|capturedAt|lastSample|focused/i);
  });
});
