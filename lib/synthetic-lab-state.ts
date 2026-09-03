import type { SyntheticEvaluationCase } from './synthetic-evidence-corpus';
import {
  buildSyntheticActionPack,
  compareSyntheticEvidence,
  decideSyntheticResolutionPath,
  projectSyntheticClassConflictFacts,
  type SyntheticComparisonResult,
  type SyntheticEvidenceExtraction,
  type SyntheticObservation,
  type SyntheticResolutionPath,
} from './synthetic-evidence-pipeline';
import {
  buildSyntheticHandoffSimulation,
  type SyntheticHandoffSimulation,
} from './official-handoff';
import { SYNTHETIC_FIXTURE_REVIEWED_DESCRIPTION } from './synthetic-extension-fixture-contract';

export type SyntheticLabCaseStatus = 'awaiting-confirmation' | 'confirmed' | 'stale-after-edit';

const overallAnnouncementLabels: Record<SyntheticEvaluationCase['expectedOverall'], string> = {
  'potential-evidence-discrepancy': 'Potential evidence discrepancy',
  'appears-consistent': 'Evidence appears consistent',
  inconclusive: 'Evidence is inconclusive',
};

export interface SyntheticLabCaseState {
  caseId: string;
  title: string;
  description: string;
  expectedOverall: SyntheticEvaluationCase['expectedOverall'];
  original: SyntheticEvidenceExtraction;
  draft: SyntheticEvidenceExtraction;
  status: SyntheticLabCaseStatus;
  confirmed: boolean;
  result: SyntheticComparisonResult | null;
  path: SyntheticResolutionPath | null;
  actionPack: string;
  announcement: string;
}

export type SyntheticLabCaseAction =
  | { type: 'CONFIRM_AND_COMPARE' }
  | { type: 'RESET_CASE' }
  | {
    type: 'EDIT_OBSERVATION';
    source: 'challan_document' | 'vehicle_record' | 'enforcement_image';
    field: string;
    property: 'value' | 'confidence' | 'visibility';
    value: string;
  };

export type SyntheticJudgeProofStage =
  | 'idle'
  | 'review-pair'
  | 'finding'
  | 'handoff'
  | 'return'
  | 'correction'
  | 'reconfirm'
  | 'complete'
  | 'guardrails'
  | 'extension';

export type SyntheticRouteSimulation = Readonly<{
  kind: 'synthetic-route-opened-locally';
  permanentLabel: 'Official handoff simulation';
  governmentRequest: 'not-performed';
}>;

export type SyntheticCitizenReturnSimulation = Readonly<{
  kind: 'synthetic-citizen-recorded-example';
  permanentLabel: 'Synthetic citizen-recorded example';
  status: 'recorded-locally';
  verification: 'not-verified-by-challansakshi';
}>;

export interface SyntheticJudgeProofState {
  caseId: string;
  title: string;
  description: string;
  analysisProvenance: string;
  original: SyntheticEvidenceExtraction;
  draft: SyntheticEvidenceExtraction;
  stage: SyntheticJudgeProofStage;
  confirmedResultRevisionId: string | null;
  packRevisionId: string | null;
  result: SyntheticComparisonResult | null;
  path: SyntheticResolutionPath | null;
  simulation: SyntheticHandoffSimulation | null;
  routeSimulation: SyntheticRouteSimulation | null;
  returnSimulation: SyntheticCitizenReturnSimulation | null;
  correctionApplied: boolean;
  guardrailCaseIds: readonly string[];
  extensionSimulationVisible: boolean;
  focusTargetId: string | null;
  focusRequest: number;
  announcement: string;
}

export type SyntheticJudgeProofAction =
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

function cloneExtraction(value: SyntheticEvidenceExtraction): SyntheticEvidenceExtraction {
  return structuredClone(value);
}

export function createSyntheticJudgeProofState(
  testCase: SyntheticEvaluationCase,
): SyntheticJudgeProofState {
  return {
    caseId: testCase.id,
    title: testCase.title,
    description: testCase.description,
    analysisProvenance: testCase.analysisProvenance
      ?? 'Manual browser-local observations · no model call in this proof.',
    original: cloneExtraction(testCase.extraction),
    draft: cloneExtraction(testCase.extraction),
    stage: 'idle',
    confirmedResultRevisionId: null,
    packRevisionId: null,
    result: null,
    path: null,
    simulation: null,
    routeSimulation: null,
    returnSimulation: null,
    correctionApplied: false,
    guardrailCaseIds: Object.freeze([]),
    extensionSimulationVisible: false,
    focusTargetId: null,
    focusRequest: 0,
    announcement: '',
  };
}

function moveProofFocus(
  state: SyntheticJudgeProofState,
  focusTargetId: string,
  announcement: string,
): Pick<SyntheticJudgeProofState, 'focusTargetId' | 'focusRequest' | 'announcement'> {
  return {
    focusTargetId,
    focusRequest: state.focusRequest + 1,
    announcement,
  };
}

function invalidateSyntheticProofDownstream(
  state: SyntheticJudgeProofState,
  draft: SyntheticEvidenceExtraction,
  options: Readonly<{ correctionApplied: boolean; announcement: string }>,
): SyntheticJudgeProofState {
  return {
    ...state,
    draft,
    stage: 'reconfirm',
    confirmedResultRevisionId: null,
    packRevisionId: null,
    result: null,
    path: null,
    simulation: null,
    routeSimulation: null,
    returnSimulation: null,
    correctionApplied: options.correctionApplied,
    guardrailCaseIds: Object.freeze([]),
    extensionSimulationVisible: false,
    ...moveProofFocus(
      state,
      'challansakshi-proof-reconfirm-heading',
      options.announcement,
    ),
  };
}

export function reduceSyntheticJudgeProofState(
  state: SyntheticJudgeProofState,
  action: SyntheticJudgeProofAction,
): SyntheticJudgeProofState {
  if (action.type === 'START_90_SECOND_PROOF') {
    return {
      ...state,
      draft: cloneExtraction(state.original),
      stage: 'review-pair',
      confirmedResultRevisionId: null,
      packRevisionId: null,
      result: null,
      path: null,
      simulation: null,
      routeSimulation: null,
      returnSimulation: null,
      correctionApplied: false,
      guardrailCaseIds: Object.freeze([]),
      extensionSimulationVisible: false,
      ...moveProofFocus(
        state,
        'challansakshi-proof-case-heading',
        'Synthetic case loaded. Review the challan and image observations.',
      ),
    };
  }

  if (action.type === 'EDIT_OBSERVATION') {
    const draft = cloneExtraction(state.draft);
    const source = draft[action.source] as unknown as Record<string, SyntheticObservation>;
    if (!Object.hasOwn(source, action.field)) return state;
    const observation = source[action.field];
    if (!observation) return state;
    if (action.property === 'value') observation.value = action.value.slice(0, 160);
    if (action.property === 'confidence') {
      if (!['high', 'medium', 'low'].includes(action.value)) return state;
      observation.confidence = action.value as SyntheticObservation['confidence'];
    }
    if (action.property === 'visibility') {
      if (!['clear', 'partial', 'unclear', 'not-visible'].includes(action.value)) return state;
      observation.visibility = action.value as SyntheticObservation['visibility'];
    }
    return invalidateSyntheticProofDownstream(state, draft, {
      correctionApplied: false,
      announcement: 'Evidence changed. Earlier confirmation, pack, and return were cleared.',
    });
  }

  if (action.type === 'CONFIRM_AND_COMPARE') {
    if (
      state.stage !== 'review-pair'
      && !(state.stage === 'reconfirm' && state.correctionApplied)
    ) return state;
    if (!/^[0-9a-f]{32}$/.test(action.resultRevisionId)) return state;
    const result = compareSyntheticEvidence(state.draft);
    const path = decideSyntheticResolutionPath(result);
    const completedCorrection = state.correctionApplied && result.overall === 'appears-consistent';
    return {
      ...state,
      stage: completedCorrection ? 'complete' : 'finding',
      confirmedResultRevisionId: action.resultRevisionId,
      packRevisionId: null,
      result,
      path,
      simulation: null,
      routeSimulation: null,
      returnSimulation: null,
      guardrailCaseIds: Object.freeze([]),
      extensionSimulationVisible: false,
      ...moveProofFocus(
        state,
        completedCorrection
          ? 'challansakshi-proof-boundary-heading'
          : 'challansakshi-proof-finding-heading',
        completedCorrection
          ? 'Corrected observations confirmed. The result now appears consistent.'
          : 'Observations confirmed. The bounded comparison found a vehicle-class conflict.',
      ),
    };
  }

  if (action.type === 'CONFIRM_SYNTHETIC_PACK') {
    if (
      state.stage !== 'finding'
      || !state.result
      || state.result.overall !== 'potential-evidence-discrepancy'
      || !state.confirmedResultRevisionId
    ) return state;
    const projection = projectSyntheticClassConflictFacts({
      extraction: state.draft,
      resultRevisionId: state.confirmedResultRevisionId,
      confirmation: {
        status: 'confirmed',
        resultRevisionId: state.confirmedResultRevisionId,
      },
    });
    if (projection.status !== 'eligible') return state;
    const built = buildSyntheticHandoffSimulation({
      mode: 'synthetic',
      sourceKind: 'bundled-synthetic-record',
      routeKey: 'synthetic-fixture',
      facts: projection.facts,
      resultClass: 'possible-discrepancy',
      resultRevisionId: state.confirmedResultRevisionId,
      packRevisionId: action.packRevisionId,
      reviewedDescription: SYNTHETIC_FIXTURE_REVIEWED_DESCRIPTION,
      confirmation: {
        status: 'confirmed',
        packRevisionId: action.packRevisionId,
        roleConfirmation: {
          role: 'self',
          affectedPersonInspectedEvidence: true,
          affectedPersonInspectedReadableRecord: true,
          affectedPersonConfirmedEntitlement: true,
          affectedPersonConfirmedPack: true,
        },
      },
      generatedAt: action.generatedAt,
    });
    if (built.status !== 'built') return state;
    return {
      ...state,
      stage: 'handoff',
      packRevisionId: action.packRevisionId,
      simulation: built.simulation,
      routeSimulation: null,
      returnSimulation: null,
      ...moveProofFocus(
        state,
        'challansakshi-proof-handoff-heading',
        'Synthetic field pack confirmed. The web handoff simulation is ready.',
      ),
    };
  }

  if (action.type === 'SIMULATE_OFFICIAL_ROUTE_OPEN') {
    if (state.stage !== 'handoff' || !state.simulation) return state;
    return {
      ...state,
      stage: 'return',
      routeSimulation: Object.freeze({
        kind: 'synthetic-route-opened-locally',
        permanentLabel: 'Official handoff simulation',
        governmentRequest: 'not-performed',
      }),
      returnSimulation: null,
      ...moveProofFocus(
        state,
        'challansakshi-proof-return-heading',
        'Official handoff simulation opened locally. Record the synthetic return.',
      ),
    };
  }

  if (action.type === 'RECORD_SYNTHETIC_RETURN') {
    if (state.stage !== 'return' || !state.routeSimulation) return state;
    return {
      ...state,
      stage: 'correction',
      returnSimulation: Object.freeze({
        kind: 'synthetic-citizen-recorded-example',
        permanentLabel: 'Synthetic citizen-recorded example',
        status: 'recorded-locally',
        verification: 'not-verified-by-challansakshi',
      }),
      ...moveProofFocus(
        state,
        'challansakshi-proof-correction-heading',
        'Synthetic return recorded. Correct the image observations next.',
      ),
    };
  }

  if (action.type === 'CORRECT_IMAGE_OBSERVATIONS') {
    if (state.stage !== 'correction' || !state.returnSimulation) return state;
    const draft = cloneExtraction(state.draft);
    draft.enforcement_image.vehicle_category.value = 'Two-wheeler';
    draft.enforcement_image.colour.value = 'Blue';
    draft.enforcement_image.make_model.value = 'Honda Activa 6G';
    return invalidateSyntheticProofDownstream(state, draft, {
      correctionApplied: true,
      announcement: 'Image observations corrected. Earlier confirmation, pack, and return were cleared.',
    });
  }

  if (action.type === 'SHOW_GUARDRAILS') {
    if (state.stage !== 'complete') return state;
    return {
      ...state,
      stage: 'guardrails',
      guardrailCaseIds: Object.freeze([
        'case-05-unclear-evidence',
        'case-01-all-align',
      ]),
      extensionSimulationVisible: false,
      ...moveProofFocus(
        state,
        'challansakshi-proof-guardrails-heading',
        'Guardrails shown: one inconclusive case, then one consistent case.',
      ),
    };
  }

  if (action.type === 'OPEN_EXTENSION_SIMULATION') {
    if (state.stage !== 'guardrails') return state;
    return {
      ...state,
      stage: 'extension',
      extensionSimulationVisible: true,
      ...moveProofFocus(
        state,
        'challansakshi-proof-extension-heading',
        'Synthetic extension simulation is ready on a fictional form.',
      ),
    };
  }

  return state;
}

export function createSyntheticLabCaseState(testCase: SyntheticEvaluationCase): SyntheticLabCaseState {
  return {
    caseId: testCase.id,
    title: testCase.title,
    description: testCase.description,
    expectedOverall: testCase.expectedOverall,
    original: cloneExtraction(testCase.extraction),
    draft: cloneExtraction(testCase.extraction),
    status: 'awaiting-confirmation',
    confirmed: false,
    result: null,
    path: null,
    actionPack: '',
    announcement: 'Review the source observations before comparing them.',
  };
}

export function reduceSyntheticLabCaseState(
  state: SyntheticLabCaseState,
  action: SyntheticLabCaseAction,
): SyntheticLabCaseState {
  if (action.type === 'RESET_CASE') {
    return {
      ...state,
      draft: cloneExtraction(state.original),
      status: 'awaiting-confirmation',
      confirmed: false,
      result: null,
      path: null,
      actionPack: '',
      announcement: 'The original test vector has been restored. Review it before comparing.',
    };
  }

  if (action.type === 'CONFIRM_AND_COMPARE') {
    const result = compareSyntheticEvidence(state.draft);
    const path = decideSyntheticResolutionPath(result);
    return {
      ...state,
      status: 'confirmed',
      confirmed: true,
      result,
      path,
      actionPack: buildSyntheticActionPack(state.draft, result, path),
      announcement: `Comparison complete: ${overallAnnouncementLabels[result.overall]}.`,
    };
  }

  const draft = cloneExtraction(state.draft);
  const source = draft[action.source] as unknown as Record<string, SyntheticObservation>;
  if (!Object.hasOwn(source, action.field)) return state;
  const observation = source[action.field];
  if (!observation) return state;
  if (action.property === 'value') observation.value = action.value.slice(0, 160);
  if (action.property === 'confidence' && ['high', 'medium', 'low'].includes(action.value)) {
    observation.confidence = action.value as SyntheticObservation['confidence'];
  }
  if (action.property === 'visibility' && ['clear', 'partial', 'unclear', 'not-visible'].includes(action.value)) {
    observation.visibility = action.value as SyntheticObservation['visibility'];
  }

  return {
    ...state,
    draft,
    status: state.confirmed ? 'stale-after-edit' : 'awaiting-confirmation',
    confirmed: false,
    result: null,
    path: null,
    actionPack: '',
    announcement: state.confirmed
      ? 'Previous confirmation cleared because evidence changed.'
      : 'Evidence changed. Review the updated values before comparing.',
  };
}
