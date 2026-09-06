import { validateCase, type CaseStatus, type MobilityCase, type ServiceKind } from './cases';
import { LIFE_EVENTS } from './services';

export const JOURNEY_RETENTION_MS = 90 * 86_400_000;
export const MAX_JOURNEY_LINKS = 10;
export const MAX_JOURNEYS = 10;
export const JOURNEY_EVENT_IDS = ['learning', 'buy-used', 'selling', 'moving', 'lost-wallet'] as const;
export type JourneyEventId = typeof JOURNEY_EVENT_IDS[number];

/** Only link metadata is persisted. Labels and progress are read from current sources. */
export type JourneyPlan = {
  version: 1;
  id: string;
  eventId: JourneyEventId;
  caseIds: string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
};
export type JourneyNextKind = 'link-case' | 'review-attention' | 'personal-follow-up' | 'prepare' | 'official-step' | 'follow-up' | 'review-reported-completion';
export type JourneySummary = {
  total: number;
  completedReported: number;
  missingLinks: number;
  status: 'empty' | 'needs-attention' | 'in-progress' | 'awaiting-response' | 'completed-reported';
  cases: { id: string; service: ServiceKind; title: string; status: CaseStatus; personalCheckDue: boolean }[];
  next: { kind: JourneyNextKind; caseId?: string };
};

export function journeyTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new TypeError('Plan time must be a valid UTC timestamp.');
  return value;
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(value)) throw new TypeError('Plan or case ID is invalid.');
  return value;
}
export function getJourneyEvent(eventId: JourneyEventId) {
  if (!JOURNEY_EVENT_IDS.includes(eventId)) throw new TypeError('Unknown life event.');
  const definition = LIFE_EVENTS.find(item => item.id === eventId);
  if (!definition) throw new TypeError('Unknown life event.');
  return { ...definition, title: { ...definition.title }, description: { ...definition.description }, services: [...definition.services] };
}
export function validateJourney(value: unknown): JourneyPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('A plan must be a plain object.');
  const input = value as Record<string, unknown>;
  const keys = ['version', 'id', 'eventId', 'caseIds', 'createdAt', 'updatedAt', 'revision'];
  if (Reflect.ownKeys(input).length !== keys.length || Reflect.ownKeys(input).some(key => typeof key !== 'string' || !keys.includes(key))) throw new TypeError('Plan contains missing or unexpected fields.');
  if (input.version !== 1 || !JOURNEY_EVENT_IDS.includes(input.eventId as JourneyEventId)) throw new TypeError('Unknown plan version or life event.');
  if (!Array.isArray(input.caseIds) || input.caseIds.length > MAX_JOURNEY_LINKS) throw new TypeError(`A plan can link at most ${MAX_JOURNEY_LINKS} cases.`);
  const caseIds = input.caseIds.map(identifier);
  if (new Set(caseIds).size !== caseIds.length) throw new TypeError('Plan case links must be unique.');
  const createdAt = journeyTimestamp(input.createdAt); const updatedAt = journeyTimestamp(input.updatedAt);
  if (updatedAt < createdAt) throw new TypeError('Plan time cannot precede its creation.');
  if (!Number.isSafeInteger(input.revision) || (input.revision as number) < 0) throw new TypeError('Plan revision is invalid.');
  return { version: 1, id: identifier(input.id), eventId: input.eventId as JourneyEventId, caseIds, createdAt, updatedAt, revision: input.revision as number };
}
export function createJourney(eventId: JourneyEventId, caseIds: string[], at = new Date().toISOString(), id = crypto.randomUUID()): JourneyPlan {
  if (!caseIds.length) throw new TypeError('Link at least one saved case to create a plan.');
  return validateJourney({ version: 1, id, eventId, caseIds, createdAt: at, updatedAt: at, revision: 0 });
}

/** On-device summary of explicitly linked cases; no dependencies block official steps. */
export function summarizeJourney(value: JourneyPlan, savedCases: readonly MobilityCase[], at = new Date().toISOString()): JourneySummary {
  const plan = validateJourney(value); const now = Date.parse(journeyTimestamp(at));
  if (!Array.isArray(savedCases) || savedCases.length > 50) throw new TypeError('Read at most 50 saved cases.');
  const date = new Date(now); const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const validated = savedCases.map(validateCase);
  if (new Set(validated.map(item => item.id)).size !== validated.length) throw new TypeError('Saved case IDs must be unique.');
  const current = new Map(validated.filter(item => now - Date.parse(item.updatedAt) < JOURNEY_RETENTION_MS).map(item => [item.id, item]));
  const cases = plan.caseIds.flatMap(id => { const item = current.get(id); return item ? [{ id, service: item.service, title: item.title, status: item.status, personalCheckDue: item.status !== 'completed' && Boolean(item.followUpDate && item.followUpDate <= today) }] : []; });
  const completedReported = cases.filter(item => item.status === 'completed').length;
  const priorities: CaseStatus[] = ['needs-attention', 'preparing', 'ready', 'awaiting-response', 'completed'];
  const selected = [...cases].sort((a, b) => (a.personalCheckDue ? 0 : priorities.indexOf(a.status)) - (b.personalCheckDue ? 0 : priorities.indexOf(b.status)))[0];
  const nextKinds: Record<CaseStatus, JourneyNextKind> = { 'needs-attention': 'review-attention', preparing: 'prepare', ready: 'official-step', 'awaiting-response': 'follow-up', completed: 'review-reported-completion' };
  const status = !selected ? 'empty' : selected.status === 'needs-attention' || selected.personalCheckDue ? 'needs-attention' : completedReported === cases.length ? 'completed-reported' : selected.status === 'awaiting-response' ? 'awaiting-response' : 'in-progress';
  return { total: cases.length, completedReported, missingLinks: plan.caseIds.length - cases.length, status, cases, next: selected ? { kind: selected.personalCheckDue ? 'personal-follow-up' : nextKinds[selected.status], caseId: selected.id } : { kind: 'link-case' } };
}
