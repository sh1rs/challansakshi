import type { SyntheticEvaluationCase } from './synthetic-evidence-corpus';
import {
  buildSyntheticActionPack,
  compareSyntheticEvidence,
  decideSyntheticResolutionPath,
  type SyntheticComparisonResult,
  type SyntheticEvidenceExtraction,
  type SyntheticObservation,
  type SyntheticResolutionPath,
} from './synthetic-evidence-pipeline';

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

function cloneExtraction(value: SyntheticEvidenceExtraction): SyntheticEvidenceExtraction {
  return structuredClone(value);
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
