import { describe, expect, it } from 'vitest';
import { changeCitizenReviewAnswer, confirmCitizenReviewState, confirmCitizenReviewHelper, createCitizenReviewState, getCitizenReviewFactsSignature, invalidateCitizenReviewFacts, selectCitizenReviewFile } from '../lib/citizen-review-state';
import { assessCitizenChallanReview } from '../lib/public-challan';

function mismatch() {
  let state = createCitizenReviewState();
  state = changeCitizenReviewAnswer(state, 'source', 'official-service');
  state = changeCitizenReviewAnswer(state, 'own-record', 'present');
  return changeCitizenReviewAnswer(state, 'plate', 'different');
}

describe('adaptive review confirmation', () => {
  it('retains the full aligned manual review and asks each next dependency once', () => {
    let state = createCitizenReviewState();
    for (const [id, value, missing] of [
      ['source', 'official-service', ['own-record']],
      ['own-record', 'present', ['plate']],
      ['plate', 'match', ['vehicle-category']],
      ['vehicle-category', 'match', ['offence-visibility']],
      ['offence-visibility', 'appears-visible', ['timestamp']],
      ['timestamp', 'displayed', ['location']],
      ['location', 'displayed', []],
    ] as const) {
      state = changeCitizenReviewAnswer(state, id, value);
      expect(confirmCitizenReviewState(state, 'self').missing).toEqual(missing);
    }
    expect(state.answers).toMatchObject({ imageInspected: true, plateObservation: 'match', categoryObservation: 'match', offenceObservation: 'appears-visible', timestampStatus: 'displayed', locationStatus: 'displayed' });
    expect(assessCitizenChallanReview(state.answers).finding).toBe('entries-do-not-support-mismatch');
    expect(confirmCitizenReviewState(state, 'self').state.phase).toBe('resolve');
  });
  it('retains a category difference after a manually recorded hidden plate', () => {
    let state = changeCitizenReviewAnswer(createCitizenReviewState(), 'source', 'official-service');
    state = changeCitizenReviewAnswer(state, 'own-record', 'present');
    state = changeCitizenReviewAnswer(state, 'plate', 'not-visible');
    expect(confirmCitizenReviewState(state, 'self').missing).toEqual(['vehicle-category']);
    state = changeCitizenReviewAnswer(state, 'vehicle-category', 'different');
    expect(state.answers).toMatchObject({ imageInspected: true, plateObservation: 'not-visible', categoryObservation: 'different' });
    expect(state.answeredQuestionIds['vehicle-category']).toBe(true);
    expect(confirmCitizenReviewState(state, 'self').missing).toEqual([]);
    expect(assessCitizenChallanReview(state.answers).finding).toBe('citizen-recorded-inconsistency');
  });
  it('clears previously inspected selected-photo state on unavailable and requires an answer after selecting again', () => {
    let state = changeCitizenReviewAnswer(createCitizenReviewState(), 'source', 'official-service');
    state = selectCitizenReviewFile(state, 'photograph', true);
    state = changeCitizenReviewAnswer(state, 'own-record', 'present');
    state = changeCitizenReviewAnswer(state, 'plate', 'match');
    expect(state.answers.imageInspected).toBe(true);
    state = changeCitizenReviewAnswer(state, 'plate', 'unavailable');
    expect(state.answers.imageInspected).toBe(false);
    expect(state.photograph).toEqual({ present: false, version: 2 });
    expect(assessCitizenChallanReview(state.answers).finding).toBe('insufficient-review');
    const unavailable = confirmCitizenReviewState(state, 'self').state;
    const selected = selectCitizenReviewFile(unavailable, 'photograph', true);
    expect(selected.photograph).toEqual({ present: true, version: 3 });
    expect(selected.confirmedFactsSignature).toBe('');
    expect(confirmCitizenReviewState(selected, 'self').missing).toEqual(['plate']);
    const replaced = selectCitizenReviewFile(selected, 'photograph', true);
    expect(replaced.photograph.version).toBe(4);
    expect(confirmCitizenReviewState(replaced, 'self').missing).toEqual(['plate']);
  });
  it('validates a missing source without selecting a role or entering Resolve', () => {
    const result = confirmCitizenReviewState(createCitizenReviewState(), 'self');
    expect(result.missing).toEqual(['source']);
    expect(result.state).toMatchObject({ role: 'unselected', phase: 'check', confirmedFactsSignature: '', helperConfirmedSignature: '' });
  });
  it('confirms the target self role and enters Resolve in one transition', () => {
    const result = confirmCitizenReviewState(mismatch(), 'self');
    expect(result.missing).toEqual([]);
    expect(result.state.phase).toBe('resolve');
    expect(result.state.role).toBe('self');
    expect(result.state.confirmedFactsSignature).toBe(getCitizenReviewFactsSignature(result.state));
  });
  it('requires the helper and affected person in order and invalidates both on edit', () => {
    const helper = confirmCitizenReviewState(mismatch(), 'helper').state;
    expect(helper.phase).toBe('check');
    expect(helper.helperConfirmedSignature).toBe('');
    const confirmed = confirmCitizenReviewHelper(helper);
    expect(confirmed.phase).toBe('resolve');
    expect(confirmed.helperConfirmedSignature).toBe(confirmed.confirmedFactsSignature);
    const edited = changeCitizenReviewAnswer(confirmed, 'plate', 'match');
    expect(edited.confirmedFactsSignature).toBe('');
    expect(edited.helperConfirmedSignature).toBe('');
    expect(edited.phase).toBe('check');
  });
  it('does not allow affected-person confirmation to bypass the helper', () => {
    const state = mismatch();
    expect(confirmCitizenReviewHelper(state)).toBe(state);
  });
  it('distinguishes query-seeded and direct message paths without evidence confirmation', () => {
    expect(createCitizenReviewState('message')).toMatchObject({ phase: 'resolve', role: 'unselected', confirmedFactsSignature: '', answeredQuestionIds: { source: true } });
    const direct = changeCitizenReviewAnswer(createCitizenReviewState(), 'source', 'message-only');
    expect(direct.phase).toBe('check');
    expect(confirmCitizenReviewState(direct, 'self').state).toMatchObject({ phase: 'resolve', role: 'unselected', confirmedFactsSignature: '' });
  });
  it('invalidates file replacement even when a photograph remains selected', () => {
    const selected = selectCitizenReviewFile(mismatch(), 'photograph', true);
    const confirmed = confirmCitizenReviewState(selected, 'self').state;
    const replaced = selectCitizenReviewFile(confirmed, 'photograph', true);
    expect(replaced.photograph.version).toBe(2);
    expect(replaced.confirmedFactsSignature).toBe('');
    expect(getCitizenReviewFactsSignature(replaced)).not.toBe(getCitizenReviewFactsSignature(confirmed));
  });
  it('unavailable photo clears every image answer and remains a terminal missing-image answer', () => {
    let state = selectCitizenReviewFile(mismatch(), 'photograph', true);
    state = changeCitizenReviewAnswer(state, 'plate', 'unavailable');
    expect(state.photograph.present).toBe(false);
    expect(state.answers.plateObservation).toBe('unclear');
    expect(state.answeredQuestionIds).toEqual({ source: true, 'own-record': true, plate: true });
    expect(confirmCitizenReviewState(state, 'self').missing).toEqual([]);
    const selectedAgain = selectCitizenReviewFile(state, 'photograph', true);
    expect(confirmCitizenReviewState(selectedAgain, 'self').missing).toEqual(['plate']);
  });
  it('does not let photograph selection answer the plate question', () => {
    let state = changeCitizenReviewAnswer(createCitizenReviewState(), 'source', 'official-service');
    state = changeCitizenReviewAnswer(state, 'own-record', 'present');
    state = selectCitizenReviewFile(state, 'photograph', true);
    expect(confirmCitizenReviewState(state, 'self').missing).toEqual(['plate']);
  });
  it('entering edit retains answers but clears authority', () => {
    const state = confirmCitizenReviewState(mismatch(), 'self').state;
    const edited = invalidateCitizenReviewFacts(state);
    expect(edited.answers.plateObservation).toBe('different');
    expect(edited.confirmedFactsSignature).toBe('');
    expect(edited.phase).toBe('check');
  });
});
