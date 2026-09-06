import type { ServiceKind } from './cases';
import { SERVICE_KINDS } from './services';

export const EFFORT_IDLE_MS = 30_000;
export const EFFORT_OUTCOMES = ['prepared', 'official-step-reported', 'stopped'] as const;
export type EffortOutcome = typeof EFFORT_OUTCOMES[number];
export type EffortPresence = Readonly<{ visible: boolean; focused: boolean }>;
export type EffortSession = Readonly<{
  sessionId: string;
  service: ServiceKind;
  status: 'active' | 'paused' | 'finished';
  activeDurationMs: number;
  lastSampleMs: number;
  lastInteractionMs: number;
  visible: boolean;
  focused: boolean;
  repeatedDetailCount: number;
  helpNeededCount: number;
  outcome: EffortOutcome | null;
}>;
export type EffortExport = {
  sessionId: string;
  service: ServiceKind;
  activeDurationMs: number;
  selfReportedRepeatedDetails: number;
  selfReportedHelpNeeded: number;
  outcome: EffortOutcome;
};

function checkTime(now: number, previous = 0) {
  if (!Number.isFinite(now) || now < previous) throw new TypeError('Use a non-negative monotonic clock.');
}
function checkPresence(presence: EffortPresence) {
  if (!presence || typeof presence.visible !== 'boolean' || typeof presence.focused !== 'boolean') throw new TypeError('Invalid page presence.');
}
function checkIdentity(sessionId: string, service: ServiceKind) {
  if (typeof sessionId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(sessionId) || !SERVICE_KINDS.includes(service)) throw new TypeError('Use a random session UUID and a known service.');
}

/** Caller supplies performance.now(), never wall-clock time or case details. Nothing is persisted. */
export function beginEffort({ service, now, presence, sessionId = crypto.randomUUID() }: { service: ServiceKind; now: number; presence: EffortPresence; sessionId?: string }): EffortSession {
  checkTime(now); checkPresence(presence); checkIdentity(sessionId, service);
  return Object.freeze({ sessionId, service, status: 'active', activeDurationMs: 0, lastSampleMs: now, lastInteractionMs: now, visible: presence.visible, focused: presence.focused, repeatedDetailCount: 0, helpNeededCount: 0, outcome: null });
}

/** Integrate only the still-recent portion of the interval; delayed timers cannot fill idle gaps. */
export function sampleEffort(session: EffortSession, now: number): EffortSession {
  checkTime(now, session.lastSampleMs);
  if (session.status === 'finished') return session;
  const end = Math.min(now, session.lastInteractionMs + EFFORT_IDLE_MS);
  const elapsed = session.status === 'active' && session.visible && session.focused ? Math.max(0, end - session.lastSampleMs) : 0;
  return Object.freeze({ ...session, activeDurationMs: session.activeDurationMs + elapsed, lastSampleMs: now });
}

export function recordEffortInteraction(session: EffortSession, now: number): EffortSession {
  if (session.status === 'finished') return sampleEffort(session, now);
  return Object.freeze({ ...sampleEffort(session, now), lastInteractionMs: now });
}

/** Presence changes do not themselves count as user activity. */
export function setEffortPresence(session: EffortSession, presence: EffortPresence, now: number): EffortSession {
  checkPresence(presence);
  if (session.status === 'finished') return sampleEffort(session, now);
  return Object.freeze({ ...sampleEffort(session, now), visible: presence.visible, focused: presence.focused });
}

export function pauseEffort(session: EffortSession, now: number): EffortSession {
  if (session.status !== 'active') throw new TypeError('Only an active measurement can pause.');
  return Object.freeze({ ...sampleEffort(session, now), status: 'paused' });
}

export function resumeEffort(session: EffortSession, now: number): EffortSession {
  if (session.status !== 'paused') throw new TypeError('Only a paused measurement can resume.');
  return Object.freeze({ ...recordEffortInteraction(session, now), status: 'active' });
}

export function recordEffortReport(session: EffortSession, report: 'repeated-detail' | 'needed-help', now: number): EffortSession {
  if (session.status !== 'active' || !['repeated-detail', 'needed-help'].includes(report)) throw new TypeError('Self-report during an active measurement.');
  const key = report === 'repeated-detail' ? 'repeatedDetailCount' : 'helpNeededCount';
  if (!Number.isSafeInteger(session[key]) || session[key] === Number.MAX_SAFE_INTEGER) throw new TypeError('Invalid self-report count.');
  return Object.freeze({ ...recordEffortInteraction(session, now), [key]: session[key] + 1 });
}

export function finishEffort(session: EffortSession, outcome: EffortOutcome, now: number): EffortSession {
  if (session.status === 'finished' || !EFFORT_OUTCOMES.includes(outcome)) throw new TypeError('Choose your outcome before finishing.');
  return Object.freeze({ ...sampleEffort(session, now), status: 'finished', outcome });
}

/** Explicit whitelist: no case identifiers, content, wall-clock times, event data or page history. */
export function exportEffort(session: EffortSession): EffortExport {
  if (session.status !== 'finished' || !session.outcome || !EFFORT_OUTCOMES.includes(session.outcome)) throw new TypeError('Finish and review the measurement first.');
  checkIdentity(session.sessionId, session.service);
  if (!Number.isFinite(session.activeDurationMs) || session.activeDurationMs < 0 || ![session.repeatedDetailCount, session.helpNeededCount].every(value => Number.isSafeInteger(value) && value >= 0)) throw new TypeError('Invalid measurement.');
  return { sessionId: session.sessionId, service: session.service, activeDurationMs: Math.round(session.activeDurationMs), selfReportedRepeatedDetails: session.repeatedDetailCount, selfReportedHelpNeeded: session.helpNeededCount, outcome: session.outcome };
}
