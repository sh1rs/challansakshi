import { describe, expect, it } from 'vitest';
import { syntheticEvaluationCases } from '../lib/synthetic-evidence-corpus';
import {
  createSyntheticLabCaseState,
  reduceSyntheticLabCaseState,
} from '../lib/synthetic-lab-state';

describe('synthetic Test Lab review state', () => {
  it('does not expose a result, action, or pack before citizen confirmation', () => {
    const state = createSyntheticLabCaseState(syntheticEvaluationCases[2]);

    expect(state.status).toBe('awaiting-confirmation');
    expect(state.confirmed).toBe(false);
    expect(state.result).toBeNull();
    expect(state.path).toBeNull();
    expect(state.actionPack).toBe('');
  });

  it('computes the result from the current observations only after confirmation', () => {
    const initial = createSyntheticLabCaseState(syntheticEvaluationCases[2]);
    const confirmed = reduceSyntheticLabCaseState(initial, { type: 'CONFIRM_AND_COMPARE' });

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.result?.overall).toBe('potential-evidence-discrepancy');
    expect(confirmed.path?.id).toBe('prepare-official-review');
    expect(confirmed.actionPack).toContain('SYNTHETIC EVIDENCE ACTION PACK');
    expect(confirmed.announcement).toBe('Comparison complete: Potential evidence discrepancy.');
  });

  it('invalidates the prior result and action when any compared fact changes', () => {
    const initial = createSyntheticLabCaseState(syntheticEvaluationCases[2]);
    const confirmed = reduceSyntheticLabCaseState(initial, { type: 'CONFIRM_AND_COMPARE' });
    const edited = reduceSyntheticLabCaseState(confirmed, {
      type: 'EDIT_OBSERVATION',
      source: 'enforcement_image',
      field: 'vehicle_category',
      property: 'value',
      value: 'Scooter',
    });

    expect(edited.status).toBe('stale-after-edit');
    expect(edited.confirmed).toBe(false);
    expect(edited.result).toBeNull();
    expect(edited.path).toBeNull();
    expect(edited.actionPack).toBe('');
    expect(edited.announcement).toBe('Previous confirmation cleared because evidence changed.');
  });

  it('changes a category-conflict outcome when the conflicting input is corrected', () => {
    const initial = createSyntheticLabCaseState(syntheticEvaluationCases[3]);
    const edited = reduceSyntheticLabCaseState(initial, {
      type: 'EDIT_OBSERVATION',
      source: 'enforcement_image',
      field: 'vehicle_category',
      property: 'value',
      value: 'Scooter',
    });
    const reconfirmed = reduceSyntheticLabCaseState(edited, { type: 'CONFIRM_AND_COMPARE' });

    expect(reconfirmed.result?.overall).toBe('appears-consistent');
    expect(reconfirmed.path?.id).toBe('no-dispute-basis-found');
  });

  it('invalidates and rebuilds the pack when an exported record detail changes', () => {
    const initial = createSyntheticLabCaseState(syntheticEvaluationCases[1]);
    const confirmed = reduceSyntheticLabCaseState(initial, { type: 'CONFIRM_AND_COMPARE' });
    const edited = reduceSyntheticLabCaseState(confirmed, {
      type: 'EDIT_OBSERVATION',
      source: 'challan_document',
      field: 'challan_number',
      property: 'value',
      value: 'CS-LAB-REVIEWED-002',
    });

    expect(edited.status).toBe('stale-after-edit');
    expect(edited.actionPack).toBe('');

    const reconfirmed = reduceSyntheticLabCaseState(edited, { type: 'CONFIRM_AND_COMPARE' });
    expect(reconfirmed.actionPack).toContain('Challan reference: CS-LAB-REVIEWED-002');
    expect(reconfirmed.actionPack).not.toContain('Challan reference: CS-LAB-2026-001');
  });

  it('restores the selected case without retaining edits or confirmation', () => {
    const initial = createSyntheticLabCaseState(syntheticEvaluationCases[1]);
    const edited = reduceSyntheticLabCaseState(initial, {
      type: 'EDIT_OBSERVATION',
      source: 'enforcement_image',
      field: 'registration',
      property: 'value',
      value: 'KA01AB3317',
    });
    const reset = reduceSyntheticLabCaseState(edited, { type: 'RESET_CASE' });

    expect(reset.draft.enforcement_image.registration.value).toBe('KA01AB3817');
    expect(reset.status).toBe('awaiting-confirmation');
    expect(reset.confirmed).toBe(false);
  });

  it('ignores inherited or unknown observation fields', () => {
    const initial = createSyntheticLabCaseState(syntheticEvaluationCases[1]);
    const unchanged = reduceSyntheticLabCaseState(initial, {
      type: 'EDIT_OBSERVATION',
      source: 'vehicle_record',
      field: '__proto__',
      property: 'confidence',
      value: 'not-a-confidence',
    });

    expect(unchanged).toBe(initial);
  });
});
