import type { CitizenChallanAnswers } from './public-challan';

export type CitizenReviewDecisionQuestionId = 'source' | 'own-record' | 'plate' | 'vehicle-category' | 'offence-visibility' | 'timestamp' | 'location';
export type CitizenReviewInputId = CitizenReviewDecisionQuestionId | 'vehicle-colour' | 'notice-copy' | 'custody-record';
export type CitizenReviewAnsweredQuestionIds = Readonly<Partial<Record<CitizenReviewInputId, true>>>;
export type CitizenReviewQuestionReason = 'establish-source' | 'establish-readable-comparison-record' | 'establish-first-image-signal' | 'category-can-override-plate-uncertainty' | 'aligned-image-requires-offence-check' | 'aligned-image-requires-timestamp-check' | 'aligned-image-requires-location-check';
export type CitizenReviewQuestionPlanInput = Readonly<{
  answers: CitizenChallanAnswers;
  answeredQuestionIds: CitizenReviewAnsweredQuestionIds;
  hasSelectedPhotograph: boolean;
}>;
export type CitizenReviewQuestionPlan = Readonly<{
  visible: readonly CitizenReviewDecisionQuestionId[];
  required: readonly CitizenReviewDecisionQuestionId[];
  missing: readonly CitizenReviewDecisionQuestionId[];
  completion: 'needs-answer' | 'result-ready';
  reasonByQuestion: Readonly<Partial<Record<CitizenReviewDecisionQuestionId, CitizenReviewQuestionReason>>>;
}>;
export type ReconciledCitizenReviewAdaptiveState = Readonly<{
  answers: CitizenChallanAnswers;
  answeredQuestionIds: CitizenReviewAnsweredQuestionIds;
  clearedInputIds: readonly CitizenReviewInputId[];
}>;

export const CITIZEN_REVIEW_DECISION_QUESTION_ORDER = ['source', 'own-record', 'plate', 'vehicle-category', 'offence-visibility', 'timestamp', 'location'] as const;
export const CITIZEN_REVIEW_INPUT_ORDER = [...CITIZEN_REVIEW_DECISION_QUESTION_ORDER, 'vehicle-colour', 'notice-copy', 'custody-record'] as const;
export const CITIZEN_REVIEW_DEFAULT_ANSWERS: Readonly<CitizenChallanAnswers> = {
  sourceStatus: 'not-selected', imageInspected: false, ownRecordAvailable: 'unclear',
  plateObservation: 'unclear', categoryObservation: 'unclear', colourObservation: 'unclear',
  offenceObservation: 'unclear', timestampStatus: 'unclear', locationStatus: 'unclear',
  noticeCopyAvailable: 'unclear', custodyRecordAvailable: 'unclear',
};
export const CITIZEN_REVIEW_ANSWER_KEY_BY_ID = {
  source: 'sourceStatus', 'own-record': 'ownRecordAvailable', plate: 'plateObservation',
  'vehicle-category': 'categoryObservation', 'offence-visibility': 'offenceObservation',
  timestamp: 'timestampStatus', location: 'locationStatus', 'vehicle-colour': 'colourObservation',
  'notice-copy': 'noticeCopyAvailable', 'custody-record': 'custodyRecordAvailable',
} as const satisfies Record<CitizenReviewInputId, keyof CitizenChallanAnswers>;

/** Presentation dependencies only: findings remain owned by public-challan. */
export function deriveCitizenReviewQuestionPlan(input: CitizenReviewQuestionPlanInput): CitizenReviewQuestionPlan {
  const { answers, answeredQuestionIds } = input;
  const required: CitizenReviewDecisionQuestionId[] = [];
  const missing: CitizenReviewDecisionQuestionId[] = [];
  const reasonByQuestion: Partial<Record<CitizenReviewDecisionQuestionId, CitizenReviewQuestionReason>> = {};
  const ask = (id: CitizenReviewDecisionQuestionId, reason: CitizenReviewQuestionReason) => {
    required.push(id);
    reasonByQuestion[id] = reason;
    if (!answeredQuestionIds[id] || (id === 'source' && answers.sourceStatus === 'not-selected')) missing.push(id);
    return missing.length === 0;
  };
  const result = (): CitizenReviewQuestionPlan => ({ visible: required, required, missing,
    completion: missing.length ? 'needs-answer' : 'result-ready', reasonByQuestion });
  if (!ask('source', 'establish-source') || answers.sourceStatus === 'message-only') return result();
  if (!ask('own-record', 'establish-readable-comparison-record') || answers.ownRecordAvailable !== 'present') return result();
  if (!ask('plate', 'establish-first-image-signal') || !answers.imageInspected || answers.plateObservation === 'different') return result();
  if (!ask('vehicle-category', 'category-can-override-plate-uncertainty')
    || answers.categoryObservation !== 'match' || answers.plateObservation !== 'match') return result();
  if (!ask('offence-visibility', 'aligned-image-requires-offence-check') || answers.offenceObservation !== 'appears-visible') return result();
  if (!ask('timestamp', 'aligned-image-requires-timestamp-check') || answers.timestampStatus !== 'displayed') return result();
  ask('location', 'aligned-image-requires-location-check');
  return result();
}

/** Clear both values and answeredness atomically; one pass reaches a fixed point. */
export function reconcileCitizenReviewAdaptiveState(input: CitizenReviewQuestionPlanInput): ReconciledCitizenReviewAdaptiveState {
  const plan = deriveCitizenReviewQuestionPlan(input);
  const active = new Set<CitizenReviewInputId>(plan.required);
  const official = input.answers.sourceStatus === 'official-service' || input.answers.sourceStatus === 'downloaded-official-record';
  if (official) {
    active.add('notice-copy');
    active.add('custody-record');
    if (plan.completion === 'result-ready' && input.answers.ownRecordAvailable === 'present' && input.answers.imageInspected) {
      active.add('vehicle-colour');
    }
  }
  let answers = input.answers;
  let answeredQuestionIds = input.answeredQuestionIds;
  const clearedInputIds: CitizenReviewInputId[] = [];
  for (const id of CITIZEN_REVIEW_INPUT_ORDER) {
    if (active.has(id) && input.answeredQuestionIds[id]) continue;
    const key = CITIZEN_REVIEW_ANSWER_KEY_BY_ID[id];
    if (answers[key] !== CITIZEN_REVIEW_DEFAULT_ANSWERS[key] || answeredQuestionIds[id]) {
      answers = { ...answers, [key]: CITIZEN_REVIEW_DEFAULT_ANSWERS[key] };
      const nextIds = { ...answeredQuestionIds };
      delete nextIds[id];
      answeredQuestionIds = nextIds;
      clearedInputIds.push(id);
    }
  }
  const imageInspected = active.has('plate')
    && (answeredQuestionIds.plate ? input.answers.imageInspected : input.hasSelectedPhotograph);
  if (answers.imageInspected !== imageInspected) answers = { ...answers, imageInspected };
  return { answers, answeredQuestionIds, clearedInputIds };
}
