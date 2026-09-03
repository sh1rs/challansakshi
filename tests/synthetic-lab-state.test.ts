import { describe, expect, it } from 'vitest';
import { syntheticEvaluationCases } from '../lib/synthetic-evidence-corpus';
import {
  createSyntheticLabCaseState,
  reduceSyntheticLabCaseState,
} from '../lib/synthetic-lab-state';
import * as SyntheticLabState from '../lib/synthetic-lab-state';

type ProofState = {
  caseId: string;
  stage: string;
  draft: (typeof syntheticEvaluationCases)[number]['extraction'];
  confirmedResultRevisionId: string | null;
  packRevisionId: string | null;
  result: { overall: string } | null;
  simulation: {
    kind: string;
    mode: string;
    routeKey: string;
    legacyIssueSimulation: { issueCode: string } | null;
  } | null;
  routeSimulation: Record<string, unknown> | null;
  returnSimulation: Record<string, unknown> | null;
  guardrailCaseIds: readonly string[];
  extensionSimulationVisible: boolean;
  focusTargetId: string | null;
  focusRequest: number;
  announcement: string;
};

type ProofAction =
  | { type: 'START_90_SECOND_PROOF' }
  | { type: 'CONFIRM_AND_COMPARE'; resultRevisionId: string }
  | { type: 'CONFIRM_SYNTHETIC_PACK'; packRevisionId: string; generatedAt: string }
  | { type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' }
  | { type: 'RECORD_SYNTHETIC_RETURN' }
  | { type: 'CORRECT_IMAGE_OBSERVATIONS' }
  | { type: 'SHOW_GUARDRAILS' }
  | { type: 'OPEN_EXTENSION_SIMULATION' }
  | {
    type: 'EDIT_OBSERVATION';
    source: 'challan_document' | 'vehicle_record' | 'enforcement_image';
    field: string;
    property: 'value' | 'confidence' | 'visibility';
    value: string;
  };

function proofStateApi() {
  return {
    create: Reflect.get(SyntheticLabState, 'createSyntheticJudgeProofState') as undefined | ((testCase: (typeof syntheticEvaluationCases)[number]) => ProofState),
    reduce: Reflect.get(SyntheticLabState, 'reduceSyntheticJudgeProofState') as unknown as undefined | ((state: ProofState, action: ProofAction) => ProofState),
  };
}

function flagshipCase() {
  const flagship = syntheticEvaluationCases.find((item) => item.id === 'case-04-category-conflict');
  expect(flagship).toBeDefined();
  if (!flagship) throw new Error('Missing flagship case.');
  return flagship;
}

function startedProof() {
  const { create, reduce } = proofStateApi();
  expect(create).toBeTypeOf('function');
  expect(reduce).toBeTypeOf('function');
  if (!create || !reduce) throw new Error('Missing proof state API.');
  return {
    reduce,
    state: reduce(create(flagshipCase()), { type: 'START_90_SECOND_PROOF' }),
  };
}

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
    const categoryCorrected = reduceSyntheticLabCaseState(initial, {
      type: 'EDIT_OBSERVATION',
      source: 'enforcement_image',
      field: 'vehicle_category',
      property: 'value',
      value: 'Two-wheeler',
    });
    const colourCorrected = reduceSyntheticLabCaseState(categoryCorrected, {
      type: 'EDIT_OBSERVATION',
      source: 'enforcement_image',
      field: 'colour',
      property: 'value',
      value: 'Blue',
    });
    const edited = reduceSyntheticLabCaseState(colourCorrected, {
      type: 'EDIT_OBSERVATION',
      source: 'enforcement_image',
      field: 'make_model',
      property: 'value',
      value: 'Honda Activa 6G',
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

describe('90-second vertical proof state', () => {
  const RESULT_REVISION = '11111111111111111111111111111111';
  const CORRECTED_REVISION = '33333333333333333333333333333333';
  const PACK_REVISION = '22222222222222222222222222222222';
  const GENERATED_AT = '2026-09-03T10:30:00.000Z';

  it('starts on repaired case 04 and clears every stale downstream artifact', () => {
    const { create, reduce } = proofStateApi();
    expect(create).toBeTypeOf('function');
    expect(reduce).toBeTypeOf('function');
    if (!create || !reduce) return;

    const idle = create(flagshipCase());
    const hostileStaleState = {
      ...idle,
      confirmedResultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
      result: { overall: 'potential-evidence-discrepancy' },
      simulation: { kind: 'stale' },
      routeSimulation: { kind: 'stale-route' },
      returnSimulation: { kind: 'stale-return' },
      guardrailCaseIds: ['case-01-all-align'],
      extensionSimulationVisible: true,
    } as unknown as ProofState;
    const started = reduce(hostileStaleState, { type: 'START_90_SECOND_PROOF' });

    expect(started).toMatchObject({
      caseId: 'case-04-category-conflict',
      stage: 'review-pair',
      confirmedResultRevisionId: null,
      packRevisionId: null,
      result: null,
      simulation: null,
      routeSimulation: null,
      returnSimulation: null,
      guardrailCaseIds: [],
      extensionSimulationVisible: false,
      focusTargetId: 'challansakshi-proof-case-heading',
      announcement: 'Synthetic case loaded. Review the challan and image observations.',
    });
    expect(started.focusRequest).toBe(idle.focusRequest + 1);
  });

  it('keeps comparison and synthetic field-pack consent as distinct actions', () => {
    const { state, reduce } = startedProof();
    const compared = reduce(state, { type: 'CONFIRM_AND_COMPARE', resultRevisionId: RESULT_REVISION });

    expect(compared).toMatchObject({
      stage: 'finding',
      confirmedResultRevisionId: RESULT_REVISION,
      packRevisionId: null,
      simulation: null,
      focusTargetId: 'challansakshi-proof-finding-heading',
      announcement: 'Observations confirmed. The bounded comparison found a vehicle-class conflict.',
      result: { overall: 'potential-evidence-discrepancy' },
    });

    const packed = reduce(compared, {
      type: 'CONFIRM_SYNTHETIC_PACK',
      packRevisionId: PACK_REVISION,
      generatedAt: GENERATED_AT,
    });
    expect(packed).toMatchObject({
      stage: 'handoff',
      packRevisionId: PACK_REVISION,
      focusTargetId: 'challansakshi-proof-handoff-heading',
      announcement: 'Synthetic field pack confirmed. The web handoff simulation is ready.',
      simulation: {
        kind: 'synthetic-handoff-simulation',
        mode: 'synthetic',
        routeKey: 'synthetic-fixture',
        legacyIssueSimulation: { issueCode: 'four-wheeler-on-two-wheeler' },
      },
    });
    expect(JSON.stringify(packed.simulation)).not.toMatch(/https?:|canonicalUrl|official-handoff-pack/);
  });

  it('models opening and return as synthetic-only local states with no URL or government request', () => {
    const { state, reduce } = startedProof();
    const compared = reduce(state, { type: 'CONFIRM_AND_COMPARE', resultRevisionId: RESULT_REVISION });
    const packed = reduce(compared, {
      type: 'CONFIRM_SYNTHETIC_PACK',
      packRevisionId: PACK_REVISION,
      generatedAt: GENERATED_AT,
    });
    const opened = reduce(packed, { type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' });

    expect(opened).toMatchObject({
      stage: 'return',
      routeSimulation: {
        kind: 'synthetic-route-opened-locally',
        permanentLabel: 'Official handoff simulation',
        governmentRequest: 'not-performed',
      },
      focusTargetId: 'challansakshi-proof-return-heading',
      announcement: 'Official handoff simulation opened locally. Record the synthetic return.',
    });
    expect(JSON.stringify(opened.routeSimulation)).not.toMatch(/https?:|canonicalUrl|destination/);

    const recorded = reduce(opened, { type: 'RECORD_SYNTHETIC_RETURN' });
    expect(recorded).toMatchObject({
      stage: 'correction',
      returnSimulation: {
        kind: 'synthetic-citizen-recorded-example',
        permanentLabel: 'Synthetic citizen-recorded example',
        verification: 'not-verified-by-challansakshi',
      },
      focusTargetId: 'challansakshi-proof-correction-heading',
      announcement: 'Synthetic return recorded. Correct the image observations next.',
    });
    expect(JSON.stringify(recorded)).not.toMatch(/governmentRequest":"performed|official-handoff-receipt/);
  });

  it('corrects all three image observations atomically, invalidates downstream state, and recomputes to consistent', () => {
    const { state, reduce } = startedProof();
    const compared = reduce(state, { type: 'CONFIRM_AND_COMPARE', resultRevisionId: RESULT_REVISION });
    const packed = reduce(compared, {
      type: 'CONFIRM_SYNTHETIC_PACK',
      packRevisionId: PACK_REVISION,
      generatedAt: GENERATED_AT,
    });
    const opened = reduce(packed, { type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' });
    const recorded = reduce(opened, { type: 'RECORD_SYNTHETIC_RETURN' });
    const corrected = reduce(recorded, { type: 'CORRECT_IMAGE_OBSERVATIONS' });

    expect(corrected.draft.enforcement_image).toMatchObject({
      vehicle_category: { value: 'Two-wheeler' },
      colour: { value: 'Blue' },
      make_model: { value: 'Honda Activa 6G' },
    });
    expect(corrected).toMatchObject({
      stage: 'reconfirm',
      confirmedResultRevisionId: null,
      packRevisionId: null,
      result: null,
      simulation: null,
      routeSimulation: null,
      returnSimulation: null,
      focusTargetId: 'challansakshi-proof-reconfirm-heading',
      announcement: 'Image observations corrected. Earlier confirmation, pack, and return were cleared.',
    });

    const reconfirmed = reduce(corrected, {
      type: 'CONFIRM_AND_COMPARE',
      resultRevisionId: CORRECTED_REVISION,
    });
    expect(reconfirmed).toMatchObject({
      stage: 'complete',
      confirmedResultRevisionId: CORRECTED_REVISION,
      result: { overall: 'appears-consistent' },
      focusTargetId: 'challansakshi-proof-boundary-heading',
      announcement: 'Corrected observations confirmed. The result now appears consistent.',
    });
  });

  it('rejects an out-of-order correction before the synthetic return exists', () => {
    const { state, reduce } = startedProof();

    expect(reduce(state, { type: 'CORRECT_IMAGE_OBSERVATIONS' })).toBe(state);
  });

  it('clears confirmation, pack, route, and return on any material edit', () => {
    const { state, reduce } = startedProof();
    const compared = reduce(state, { type: 'CONFIRM_AND_COMPARE', resultRevisionId: RESULT_REVISION });
    const packed = reduce(compared, {
      type: 'CONFIRM_SYNTHETIC_PACK',
      packRevisionId: PACK_REVISION,
      generatedAt: GENERATED_AT,
    });
    const opened = reduce(packed, { type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' });
    const recorded = reduce(opened, { type: 'RECORD_SYNTHETIC_RETURN' });
    const edited = reduce(recorded, {
      type: 'EDIT_OBSERVATION',
      source: 'enforcement_image',
      field: 'colour',
      property: 'value',
      value: 'Silver',
    });

    expect(edited).toMatchObject({
      stage: 'reconfirm',
      confirmedResultRevisionId: null,
      packRevisionId: null,
      result: null,
      simulation: null,
      routeSimulation: null,
      returnSimulation: null,
      extensionSimulationVisible: false,
    });
  });

  it('shows guardrails in TL-05 then TL-01 order and gates the optional fixture until core completion', () => {
    const { state, reduce } = startedProof();
    const premature = reduce(state, { type: 'OPEN_EXTENSION_SIMULATION' });
    expect(premature).toBe(state);

    const compared = reduce(state, { type: 'CONFIRM_AND_COMPARE', resultRevisionId: RESULT_REVISION });
    const packed = reduce(compared, {
      type: 'CONFIRM_SYNTHETIC_PACK',
      packRevisionId: PACK_REVISION,
      generatedAt: GENERATED_AT,
    });
    const opened = reduce(packed, { type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' });
    const recorded = reduce(opened, { type: 'RECORD_SYNTHETIC_RETURN' });
    const corrected = reduce(recorded, { type: 'CORRECT_IMAGE_OBSERVATIONS' });
    const complete = reduce(corrected, { type: 'CONFIRM_AND_COMPARE', resultRevisionId: CORRECTED_REVISION });
    const guardrails = reduce(complete, { type: 'SHOW_GUARDRAILS' });

    expect(guardrails).toMatchObject({
      stage: 'guardrails',
      guardrailCaseIds: ['case-05-unclear-evidence', 'case-01-all-align'],
      focusTargetId: 'challansakshi-proof-guardrails-heading',
      announcement: 'Guardrails shown: one inconclusive case, then one consistent case.',
    });

    const extension = reduce(guardrails, { type: 'OPEN_EXTENSION_SIMULATION' });
    expect(extension).toMatchObject({
      stage: 'extension',
      extensionSimulationVisible: true,
      focusTargetId: 'challansakshi-proof-extension-heading',
      announcement: 'Synthetic extension simulation is ready on a fictional form.',
    });
  });
});
