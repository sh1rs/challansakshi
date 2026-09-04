import { deriveImageInspected, type CitizenChallanAnswers } from './public-challan';
import {
  CITIZEN_REVIEW_ANSWER_KEY_BY_ID,
  CITIZEN_REVIEW_DEFAULT_ANSWERS,
  CITIZEN_REVIEW_INPUT_ORDER,
  deriveCitizenReviewQuestionPlan,
  reconcileCitizenReviewAdaptiveState,
  type CitizenReviewAnsweredQuestionIds,
  type CitizenReviewInputId,
} from './citizen-review-question-plan';

export type CitizenReviewRole = 'unselected' | 'self' | 'helper';
export type CitizenReviewDevice = 'unknown' | 'private' | 'shared';
export type CitizenReviewPhase = 'check' | 'resolve';
type SelectionVersion = Readonly<{ present: boolean; version: number }>;
export type CitizenReviewState = Readonly<{
  answers: CitizenChallanAnswers;
  answeredQuestionIds: CitizenReviewAnsweredQuestionIds;
  role: CitizenReviewRole;
  phase: CitizenReviewPhase;
  record: SelectionVersion;
  photograph: SelectionVersion;
  manualEntry: boolean;
  confirmedFactsSignature: string;
  helperConfirmedSignature: string;
}>;

export function createCitizenReviewState(initialGoal: 'message' | null = null): CitizenReviewState {
  return {
    answers: { ...CITIZEN_REVIEW_DEFAULT_ANSWERS, sourceStatus: initialGoal === 'message' ? 'message-only' : 'not-selected' },
    answeredQuestionIds: initialGoal === 'message' ? { source: true } : {},
    role: 'unselected', phase: initialGoal === 'message' ? 'resolve' : 'check',
    record: { present: false, version: 0 }, photograph: { present: false, version: 0 },
    manualEntry: true, confirmedFactsSignature: '', helperConfirmedSignature: '',
  };
}

export function getCitizenReviewAnswers(state: CitizenReviewState): CitizenChallanAnswers {
  return { ...state.answers, imageInspected: deriveImageInspected(state.answers, state.photograph.present) };
}

export function getCitizenReviewFactsSignature(state: CitizenReviewState): string {
  const answers = getCitizenReviewAnswers(state);
  const answered = CITIZEN_REVIEW_INPUT_ORDER.filter(id => state.answeredQuestionIds[id]);
  return JSON.stringify({
    role: state.role, manualEntry: state.manualEntry, imageInspected: answers.imageInspected,
    answered: answered.map(id => [id, answers[CITIZEN_REVIEW_ANSWER_KEY_BY_ID[id]]]),
    record: state.record, photograph: state.photograph,
    actionFacts: [answers.reviewRevisionId, answers.citizenVehicleClass, answers.observedEvidenceVehicleClass,
      answers.independentReadableVehicleRecord, answers.wrongEvidenceBasis,
      answers.vehicleNumberEntryMismatchBasis, answers.duplicatePlateIndependentBasis],
  });
}

export function invalidateCitizenReviewFacts(state: CitizenReviewState): CitizenReviewState {
  return { ...state, phase: 'check', confirmedFactsSignature: '', helperConfirmedSignature: '' };
}

export function changeCitizenReviewAnswer(state: CitizenReviewState, id: CitizenReviewInputId, value: string): CitizenReviewState {
  let answers = { ...state.answers, [CITIZEN_REVIEW_ANSWER_KEY_BY_ID[id]]: value };
  let answeredQuestionIds: CitizenReviewAnsweredQuestionIds = { ...state.answeredQuestionIds, [id]: true };
  let photograph = state.photograph;
  if (id === 'plate' && value === 'unavailable') {
    const ids = { ...answeredQuestionIds };
    for (const imageId of ['plate', 'vehicle-category', 'vehicle-colour', 'offence-visibility', 'timestamp', 'location'] as const) {
      delete ids[imageId];
      const key = CITIZEN_REVIEW_ANSWER_KEY_BY_ID[imageId];
      answers = { ...answers, [key]: CITIZEN_REVIEW_DEFAULT_ANSWERS[key] };
    }
    answeredQuestionIds = { ...ids, plate: true };
    photograph = { present: false, version: photograph.version + 1 };
  }
  answers = { ...answers, imageInspected: deriveImageInspected(answers, photograph.present) };
  const reconciled = reconcileCitizenReviewAdaptiveState({ answers, answeredQuestionIds, hasSelectedPhotograph: photograph.present });
  return invalidateCitizenReviewFacts({ ...state, ...reconciled, photograph });
}

export function selectCitizenReviewFile(state: CitizenReviewState, kind: 'record' | 'photograph', present: boolean): CitizenReviewState {
  let answeredQuestionIds = state.answeredQuestionIds;
  if (kind === 'photograph' && present && answeredQuestionIds.plate && !deriveImageInspected(state.answers, state.photograph.present)) {
    const ids = { ...answeredQuestionIds };
    delete ids.plate;
    answeredQuestionIds = ids;
  }
  return invalidateCitizenReviewFacts({
    ...state, answeredQuestionIds,
    [kind]: { present, version: state[kind].version + 1 },
    manualEntry: kind === 'record' ? !present : state.manualEntry,
  });
}

export function confirmCitizenReviewState(state: CitizenReviewState, role: 'self' | 'helper') {
  const plan = deriveCitizenReviewQuestionPlan({ answers: getCitizenReviewAnswers(state), answeredQuestionIds: state.answeredQuestionIds, hasSelectedPhotograph: state.photograph.present });
  if (plan.missing.length) return { state, missing: plan.missing };
  if (state.answers.sourceStatus === 'message-only') {
    return { state: { ...state, role: 'unselected' as const, phase: 'resolve' as const, confirmedFactsSignature: '', helperConfirmedSignature: '' }, missing: [] };
  }
  const next = { ...state, role, phase: role === 'self' ? 'resolve' as const : 'check' as const, helperConfirmedSignature: '' };
  return { state: { ...next, confirmedFactsSignature: getCitizenReviewFactsSignature(next) }, missing: [] };
}

export function confirmCitizenReviewHelper(state: CitizenReviewState): CitizenReviewState {
  if (state.role !== 'helper' || !state.confirmedFactsSignature || state.confirmedFactsSignature !== getCitizenReviewFactsSignature(state)) return state;
  return { ...state, helperConfirmedSignature: state.confirmedFactsSignature, phase: 'resolve' };
}
