export type Language = 'en' | 'hi';
export type FixtureId = 'mismatch' | 'inconclusive' | 'consistent';
export type EvidenceSourceId = 'challan' | 'enforcement' | 'vehicle-record' | 'citizen-photo';
export type Visibility = 'clear' | 'partial' | 'unclear' | 'not-visible';
export type Confidence = 'high' | 'medium' | 'low';
export type FindingKind = 'mismatch' | 'inconclusive' | 'consistent';
export type DemoCaseState = 'intake' | 'review' | 'finding' | 'readiness' | 'pack' | 'submitted' | 'under-review' | 'resolved';
export type OutcomeState = 'none' | 'quashed' | 'rejected' | 'no-resolution';
export type DemoStep = 'landing' | 'desk' | 'route' | 'intake' | 'review' | 'finding' | 'readiness' | 'pack' | 'tracking' | 'order-review' | 'order-map';

export type LocalizedText = { en: string; hi: string };

export interface ExtractedFact {
  id: string;
  label: LocalizedText;
  value: string;
  source: EvidenceSourceId;
  confidence: Confidence;
  visibility: Visibility;
  uncertainty?: LocalizedText;
  evidenceRef: string;
  userConfirmationRequired: boolean;
}

export interface ConfirmedVehicleFacts {
  registeredPlate: string;
  registeredCategory: string;
  registeredColour: string;
  observedPlate: string;
  observedCategory: string;
  observedColour: string;
  offenceAssessable: 'yes' | 'no' | 'unclear';
  observedPlateVisibility: Visibility;
  observedCategoryVisibility: Visibility;
  observedColourVisibility: Visibility;
}

export interface Discrepancy {
  field: 'registration' | 'category' | 'colour';
  registeredValue: string;
  observedValue: string;
  registeredSource: EvidenceSourceId;
  observedSource: EvidenceSourceId;
}

export interface EvidenceReadinessItem {
  id: string;
  label: LocalizedText;
  category: 'citizen' | 'authority' | 'optional';
  status: 'present' | 'missing' | 'optional';
}

export interface ContestWindow {
  issueDate: string;
  referenceDate: string;
  indicativeDeadline: string;
  elapsedDays: number;
  dayNumber: number;
  daysRemaining: number;
  status: 'open' | 'final-day' | 'expired';
}

export interface AuthorityWindow {
  acknowledgedAt: string;
  referenceDate: string;
  indicativeBoundary: string;
  elapsedDays: number;
  daysRemaining: number;
  status: 'awaiting' | 'boundary' | 'overdue';
}

export interface ClassificationResult {
  finding: FindingKind;
  discrepancies: Discrepancy[];
  limitations: string[];
}

export function guardEvidenceNavigation(
  requested: DemoStep,
  finding: FindingKind,
  confirmed: boolean,
  simulatedSubmitted: boolean,
  outcome: OutcomeState = 'none',
  orderFactsConfirmed = false,
): DemoStep {
  const protectedSteps: DemoStep[] = ['finding', 'readiness', 'pack', 'tracking', 'order-review', 'order-map'];
  const postSubmissionSteps: DemoStep[] = ['tracking', 'order-review', 'order-map'];
  if (protectedSteps.includes(requested) && !confirmed) return 'review';
  if (finding === 'consistent' && requested !== 'finding' && protectedSteps.includes(requested)) return 'finding';
  if (postSubmissionSteps.includes(requested) && !simulatedSubmitted) return 'pack';
  if (['order-review', 'order-map'].includes(requested) && outcome !== 'rejected') return 'tracking';
  if (requested === 'order-map' && !orderFactsConfirmed) return 'order-review';
  return requested;
}

const editableReviewFactIds = new Set([
  'observed-registration',
  'observed-category',
  'observed-colour',
  'offence-visible',
  'record-registration',
  'record-category',
  'record-colour',
]);

export function isReviewFactEditable(factId: string): boolean {
  return editableReviewFactIds.has(factId);
}

export function validateEvidenceReviewFacts(facts: ExtractedFact[]): { complete: boolean; invalidIds: string[] } {
  const invalidIds = facts.filter((fact) => {
    if (!isReviewFactEditable(fact.id) || fact.value.trim()) return false;
    const canBeUnavailable = fact.source === 'enforcement' && (fact.visibility === 'unclear' || fact.visibility === 'not-visible');
    return !canBeUnavailable;
  }).map((fact) => fact.id);
  return { complete: invalidIds.length === 0, invalidIds };
}

export function deriveConfirmedVehicleFacts(fallbacks: ConfirmedVehicleFacts, facts: ExtractedFact[]): ConfirmedVehicleFacts {
  const value = (id: string, fallback: string) => {
    const reviewed = facts.find((fact) => fact.id === id);
    return reviewed ? reviewed.value.trim() : fallback;
  };
  const visibility = (id: string, fallback: Visibility) => facts.find((fact) => fact.id === id)?.visibility ?? fallback;
  const offenceValue = value('offence-visible', 'unclear').toLowerCase();
  return {
    registeredPlate: value('record-registration', fallbacks.registeredPlate),
    registeredCategory: value('record-category', fallbacks.registeredCategory),
    registeredColour: value('record-colour', fallbacks.registeredColour),
    observedPlate: value('observed-registration', fallbacks.observedPlate),
    observedCategory: value('observed-category', fallbacks.observedCategory),
    observedColour: value('observed-colour', fallbacks.observedColour),
    offenceAssessable: offenceValue.startsWith('yes') ? 'yes' : offenceValue.startsWith('no') ? 'no' : 'unclear',
    observedPlateVisibility: visibility('observed-registration', fallbacks.observedPlateVisibility),
    observedCategoryVisibility: visibility('observed-category', fallbacks.observedCategoryVisibility),
    observedColourVisibility: visibility('observed-colour', fallbacks.observedColourVisibility),
  };
}

const DAY_MS = 86_400_000;

function dateOnlyToUtc(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Expected an ISO calendar date, received: ${value}`);
  }
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcToDateOnly(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

function addCalendarDays(value: string, days: number): string {
  return utcToDateOnly(dateOnlyToUtc(value) + days * DAY_MS);
}

function calendarDayDifference(later: string, earlier: string): number {
  return Math.floor((dateOnlyToUtc(later) - dateOnlyToUtc(earlier)) / DAY_MS);
}

/**
 * Product convention: issue date is Day 0 and D+45 is shown as the indicative,
 * provisionally included deadline day. The official source does not settle
 * cutoff times, holiday rollover, or a contrary inclusive-day interpretation,
 * so the UI labels this as an estimate and keeps the official-portal route open.
 */
export function calculateContestWindow(issueDate: string, referenceDate: string): ContestWindow {
  const indicativeDeadline = addCalendarDays(issueDate, 45);
  const elapsedDays = Math.max(0, calendarDayDifference(referenceDate, issueDate));
  const rawRemaining = calendarDayDifference(indicativeDeadline, referenceDate);
  const status = rawRemaining > 0 ? 'open' : rawRemaining === 0 ? 'final-day' : 'expired';

  return {
    issueDate,
    referenceDate,
    indicativeDeadline,
    elapsedDays,
    dayNumber: elapsedDays + 1,
    daysRemaining: Math.max(0, rawRemaining),
    status,
  };
}

/** Uses the mock/official acknowledgement date as Day 0; D+30 is the boundary. */
export function calculateAuthorityWindow(acknowledgedAt: string, referenceDate: string): AuthorityWindow {
  const indicativeBoundary = addCalendarDays(acknowledgedAt, 30);
  const elapsedDays = Math.max(0, calendarDayDifference(referenceDate, acknowledgedAt));
  const rawRemaining = calendarDayDifference(indicativeBoundary, referenceDate);
  const status = rawRemaining > 0 ? 'awaiting' : rawRemaining === 0 ? 'boundary' : 'overdue';

  return {
    acknowledgedAt,
    referenceDate,
    indicativeBoundary,
    elapsedDays,
    daysRemaining: Math.max(0, rawRemaining),
    status,
  };
}

function comparable(value: string): string {
  return value.trim().replace(/[\s-]+/g, '').toLocaleLowerCase('en-IN');
}

export function classifyEvidenceComparison(facts: ConfirmedVehicleFacts): ClassificationResult {
  const limitations: string[] = [];
  const unclear = facts.observedPlateVisibility === 'unclear' || facts.observedPlateVisibility === 'not-visible';

  if (unclear) limitations.push('registration-unreadable');
  if (facts.observedCategoryVisibility !== 'clear') limitations.push('category-not-fully-clear');
  if (facts.observedColourVisibility !== 'clear') limitations.push('colour-not-fully-clear');
  if (facts.offenceAssessable !== 'yes') limitations.push('offence-not-assessable');

  if (unclear) {
    return { finding: 'inconclusive', discrepancies: [], limitations };
  }

  const discrepancies: Discrepancy[] = [];
  const pairs: Array<{
    field: Discrepancy['field'];
    registered: string;
    observed: string;
    visibility: Visibility;
  }> = [
    { field: 'registration', registered: facts.registeredPlate, observed: facts.observedPlate, visibility: facts.observedPlateVisibility },
    { field: 'category', registered: facts.registeredCategory, observed: facts.observedCategory, visibility: facts.observedCategoryVisibility },
    { field: 'colour', registered: facts.registeredColour, observed: facts.observedColour, visibility: facts.observedColourVisibility },
  ];

  for (const pair of pairs) {
    if (pair.visibility === 'clear' && comparable(pair.registered) !== comparable(pair.observed)) {
      discrepancies.push({
        field: pair.field,
        registeredValue: pair.registered,
        observedValue: pair.observed,
        registeredSource: 'vehicle-record',
        observedSource: 'enforcement',
      });
    }
  }

  if (discrepancies.length > 0) return { finding: 'mismatch', discrepancies, limitations };
  if (limitations.length > 0) return { finding: 'inconclusive', discrepancies: [], limitations };
  return { finding: 'consistent', discrepancies: [], limitations: [] };
}

export function evaluateEvidenceReadiness(items: EvidenceReadinessItem[]): {
  items: EvidenceReadinessItem[];
  requiredPresent: number;
  requiredTotal: number;
  complete: boolean;
} {
  const required = items.filter((item) => item.category !== 'optional');
  const requiredPresent = required.filter((item) => item.status === 'present').length;
  return {
    items,
    requiredPresent,
    requiredTotal: required.length,
    complete: required.length > 0 && requiredPresent === required.length,
  };
}

const transitions: Record<DemoCaseState, Partial<Record<string, DemoCaseState>>> = {
  intake: { ANALYSE: 'review' },
  review: { CONFIRM: 'finding', BACK: 'intake' },
  finding: { CONTINUE: 'readiness', BACK: 'review' },
  readiness: { PREPARE: 'pack', BACK: 'finding' },
  pack: { SUBMIT: 'submitted', BACK: 'readiness' },
  submitted: { ADVANCE: 'under-review' },
  'under-review': { RESOLVE: 'resolved' },
  resolved: { REOPEN: 'under-review' },
};

export function transitionDemoCase(current: DemoCaseState, event: string): DemoCaseState {
  const next = transitions[current][event];
  if (!next) throw new Error(`Invalid demo transition: ${current} -> ${event}`);
  return next;
}

export function getAvailableCaseActions(state: DemoCaseState): string[] {
  return Object.keys(transitions[state]);
}
