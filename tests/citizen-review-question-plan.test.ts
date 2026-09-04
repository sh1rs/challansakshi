import { describe, expect, it } from 'vitest';
import * as planner from '../lib/citizen-review-question-plan';
import { assessCitizenChallanReview, type CitizenChallanAnswers } from '../lib/public-challan';
import type { CitizenReviewAnsweredQuestionIds } from '../lib/citizen-review-question-plan';

const aligned: CitizenChallanAnswers = {
  sourceStatus: 'official-service', ownRecordAvailable: 'present', imageInspected: true,
  plateObservation: 'match', categoryObservation: 'match', colourObservation: 'unclear',
  offenceObservation: 'appears-visible', timestampStatus: 'displayed', locationStatus: 'displayed',
  noticeCopyAvailable: 'unclear', custodyRecordAvailable: 'unclear',
};
const all: CitizenReviewAnsweredQuestionIds = {
  source: true, 'own-record': true, plate: true, 'vehicle-category': true,
  'offence-visibility': true, timestamp: true, location: true,
};
describe('adaptive question plan', () => {
  it.each([
    [{}, ['source']],
    [{ source: true }, ['own-record']],
    [{ source: true, 'own-record': true }, ['plate']],
    [{ source: true, 'own-record': true, plate: true }, ['vehicle-category']],
    [{ source: true, 'own-record': true, plate: true, 'vehicle-category': true }, ['offence-visibility']],
    [{ source: true, 'own-record': true, plate: true, 'vehicle-category': true, 'offence-visibility': true }, ['timestamp']],
    [{ source: true, 'own-record': true, plate: true, 'vehicle-category': true, 'offence-visibility': true, timestamp: true }, ['location']],
  ] as const)('stops at the first unanswered input despite selected photograph: %j', (answeredQuestionIds, missing) => {
    expect(planner.deriveCitizenReviewQuestionPlan({ answers: aligned, answeredQuestionIds, hasSelectedPhotograph: true }))
      .toMatchObject({ missing, completion: 'needs-answer' });
  });
  it.each([
    [{ sourceStatus: 'message-only' }, ['source'], 'source-not-verified'],
    [{ ownRecordAvailable: 'missing' }, ['source', 'own-record'], 'insufficient-review'],
    [{ ownRecordAvailable: 'unclear' }, ['source', 'own-record'], 'insufficient-review'],
    [{ ownRecordAvailable: 'not-applicable' }, ['source', 'own-record'], 'insufficient-review'],
    [{ imageInspected: false, plateObservation: 'unclear' }, ['source', 'own-record', 'plate'], 'insufficient-review'],
    [{ plateObservation: 'different' }, ['source', 'own-record', 'plate'], 'citizen-recorded-inconsistency'],
    [{ plateObservation: 'not-visible', categoryObservation: 'different' }, ['source', 'own-record', 'plate', 'vehicle-category'], 'citizen-recorded-inconsistency'],
    [{ plateObservation: 'unclear' }, ['source', 'own-record', 'plate', 'vehicle-category'], 'supplied-image-unclear'],
    [{ categoryObservation: 'not-visible' }, ['source', 'own-record', 'plate', 'vehicle-category'], 'supplied-image-unclear'],
    [{ categoryObservation: 'unclear' }, ['source', 'own-record', 'plate', 'vehicle-category'], 'supplied-image-unclear'],
    [{ plateObservation: 'not-visible' }, ['source', 'own-record', 'plate', 'vehicle-category'], 'supplied-image-unclear'],
    [{ offenceObservation: 'unclear' }, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility'], 'supplied-image-unclear'],
    [{ offenceObservation: 'not-visible' }, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility'], 'supplied-image-unclear'],
    [{ offenceObservation: 'not-assessable-from-still' }, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility'], 'supplied-image-unclear'],
    [{ timestampStatus: 'not-found' }, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility', 'timestamp'], 'supplied-image-unclear'],
    [{ timestampStatus: 'unclear' }, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility', 'timestamp'], 'supplied-image-unclear'],
    [{ locationStatus: 'unclear' }, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility', 'timestamp', 'location'], 'supplied-image-unclear'],
    [{ locationStatus: 'not-found' }, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility', 'timestamp', 'location'], 'supplied-image-unclear'],
    [{}, ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility', 'timestamp', 'location'], 'entries-do-not-support-mismatch'],
  ] as const)('terminates at the earliest decisive branch: %j', (overrides, required, finding) => {
    const answers = { ...aligned, ...overrides } as CitizenChallanAnswers;
    const plan = planner.deriveCitizenReviewQuestionPlan({ answers, answeredQuestionIds: all, hasSelectedPhotograph: false });
    expect(plan).toMatchObject({ visible: required, required, missing: [], completion: 'result-ready' });
    expect(Object.keys(plan.reasonByQuestion)).toEqual(required);
    expect(assessCitizenChallanReview(answers).finding).toBe(finding);
  });
  it('clears stale downstream answers and IDs in one convergent transition', () => {
    const input = { answers: { ...aligned, plateObservation: 'different' as const }, answeredQuestionIds: all, hasSelectedPhotograph: false };
    const next = planner.reconcileCitizenReviewAdaptiveState(input);
    expect(next.answeredQuestionIds).toEqual({ source: true, 'own-record': true, plate: true });
    expect(next.answers).toMatchObject({ plateObservation: 'different', categoryObservation: 'unclear', offenceObservation: 'unclear', timestampStatus: 'unclear', locationStatus: 'unclear' });
    expect(next.clearedInputIds).toEqual(['vehicle-category', 'offence-visibility', 'timestamp', 'location']);
    const again = planner.reconcileCitizenReviewAdaptiveState({ ...next, hasSelectedPhotograph: false });
    expect(again.clearedInputIds).toEqual([]);
    expect(again.answers).toBe(next.answers);
    expect(again.answeredQuestionIds).toBe(next.answeredQuestionIds);
  });
  it('clears optional image context on the unavailable image branch without reopening plate', () => {
    const next = planner.reconcileCitizenReviewAdaptiveState({ answers: { ...aligned, imageInspected: false, plateObservation: 'unclear', colourObservation: 'different' }, answeredQuestionIds: { ...all, 'vehicle-colour': true }, hasSelectedPhotograph: false });
    expect(next.answeredQuestionIds).toEqual({ source: true, 'own-record': true, plate: true });
    expect(next.answers).toMatchObject({ imageInspected: false, colourObservation: 'unclear' });
    expect(planner.deriveCitizenReviewQuestionPlan({ ...next, hasSelectedPhotograph: false }).completion).toBe('result-ready');
  });
  it('clears every old comparison and optional answer when source becomes message-only', () => {
    const next = planner.reconcileCitizenReviewAdaptiveState({ answers: { ...aligned, sourceStatus: 'message-only', colourObservation: 'different', noticeCopyAvailable: 'present', custodyRecordAvailable: 'missing' }, answeredQuestionIds: { ...all, 'vehicle-colour': true, 'notice-copy': true, 'custody-record': true }, hasSelectedPhotograph: false });
    expect(next.answeredQuestionIds).toEqual({ source: true });
    expect(next.answers).toMatchObject({ imageInspected: false, ownRecordAvailable: 'unclear', plateObservation: 'unclear', categoryObservation: 'unclear', colourObservation: 'unclear', noticeCopyAvailable: 'unclear', custodyRecordAvailable: 'unclear' });
    const again = planner.reconcileCitizenReviewAdaptiveState({ ...next, hasSelectedPhotograph: false });
    expect(again.clearedInputIds).toEqual([]);
    expect(again.answers).toBe(next.answers);
  });
  it('preserves explicitly answered optional context after a terminal official review', () => {
    const answers = { ...aligned, colourObservation: 'different' as const, noticeCopyAvailable: 'present' as const, custodyRecordAvailable: 'missing' as const };
    const answeredQuestionIds = { ...all, 'vehicle-colour': true, 'notice-copy': true, 'custody-record': true } as const;
    const next = planner.reconcileCitizenReviewAdaptiveState({ answers, answeredQuestionIds, hasSelectedPhotograph: false });
    expect(next.answers).toBe(answers);
    expect(next.answeredQuestionIds).toBe(answeredQuestionIds);
    expect(next.clearedInputIds).toEqual([]);
  });
  it('preserves applicable optional availability answers before the decision branch is complete', () => {
    const input = {
      answers: { ...aligned, noticeCopyAvailable: 'present' as const, custodyRecordAvailable: 'missing' as const },
      answeredQuestionIds: { source: true, 'notice-copy': true, 'custody-record': true } as const,
      hasSelectedPhotograph: false,
    };

    const next = planner.reconcileCitizenReviewAdaptiveState(input);
    expect(next.answers).toMatchObject({ noticeCopyAvailable: 'present', custodyRecordAvailable: 'missing' });
    expect(next.answeredQuestionIds).toMatchObject({ source: true, 'notice-copy': true, 'custody-record': true });
    expect(next.clearedInputIds).not.toContain('notice-copy');
    expect(next.clearedInputIds).not.toContain('custody-record');

    const again = planner.reconcileCitizenReviewAdaptiveState({ ...next, hasSelectedPhotograph: false });
    expect(again.clearedInputIds).toEqual([]);
    expect(again.answers).toBe(next.answers);
    expect(again.answeredQuestionIds).toBe(next.answeredQuestionIds);
  });
});
