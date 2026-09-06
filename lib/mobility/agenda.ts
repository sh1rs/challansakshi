import { validateCase, type MobilityCase, type ServiceKind } from './cases';
import { followUpSummary, validateFollowUp, type FollowUpRecord } from './follow-up';
import { renewalAttention, renewalLocalDate, validateRenewal, validateRenewalTimestamp, type RenewalRecord } from './renewals';
import { sha256Hex } from '../local-sha256';

const DAY = 86_400_000;
export const AGENDA_RETENTION_MS = 90 * DAY;
export const AGENDA_UPCOMING_DAYS = 30;
export type AgendaInput = { cases: readonly MobilityCase[]; followUps: readonly FollowUpRecord[]; renewals: readonly RenewalRecord[] };
export type AgendaReasonKind = 'case-check-due' | 'source-check-due' | 'appointment' | 'needs-attention' | 'source-needs-info' | 'document-check-due' | 'document-expiry-past' | 'document-expiry-today' | 'document-expiry-soon';
export type AgendaReason = { kind: AgendaReasonKind; date: string | null; rank: number };
export type AgendaSource = { kind: 'case' | 'observation' | 'document'; label: string; date: string; freshness: 'not-recorded' | 'recent' | 'stale'; ageDays: number | null; failedCheckAt: string | null };
export type AgendaItem = {
  key: string; target: { kind: 'case' | 'renewal'; id: string }; title: string; service?: ServiceKind;
  documentKind?: RenewalRecord['kind']; reasons: AgendaReason[]; source: AgendaSource;
  fingerprint: string; expiresAt: number;
};
export type Agenda = { items: AgendaItem[]; next: AgendaItem | null; nextRefreshAt: number; today: string };

function bounded<T>(values: readonly T[], validate: (value: unknown) => T, identity: (value: T) => string): T[] {
  if (!Array.isArray(values) || values.length > 50) throw new TypeError('Read at most 50 saved records per agenda source.');
  const checked = values.map(validate);
  if (new Set(checked.map(identity)).size !== checked.length) throw new TypeError('Agenda source IDs must be unique.');
  return checked;
}
function cmp(left: string, right: string) { return left < right ? -1 : left > right ? 1 : 0; }
function reasonOrder(left: AgendaReason, right: AgendaReason) { return left.rank - right.rank || cmp(left.date ?? '9999', right.date ?? '9999') || cmp(left.kind, right.kind); }
function dateDistance(first: string, second: string) { return (Date.parse(`${first}T00:00:00Z`) - Date.parse(`${second}T00:00:00Z`)) / DAY; }
function savedRevision(value: MobilityCase) { return Object.getOwnPropertyDescriptor(value, Symbol.for('challansakshi.mobility.case-revision'))?.value ?? null; }

/** Read-only planning from citizen entries. Ranking never establishes an official deadline or outcome. */
export function buildAgenda(input: AgendaInput, at = new Date().toISOString()): Agenda {
  const now = Date.parse(validateRenewalTimestamp(at)); const today = renewalLocalDate(new Date(now));
  const cases = bounded(input.cases, validateCase, item => item.id);
  const followUps = bounded(input.followUps, validateFollowUp, item => item.caseId);
  const renewals = bounded(input.renewals, validateRenewal, item => item.id);
  const alive = (value: { updatedAt: string }) => now - Date.parse(value.updatedAt) < AGENDA_RETENTION_MS && Date.parse(value.updatedAt) <= now + 300_000;
  const currentCases = cases.filter(alive); const caseIds = new Set(currentCases.map(item => item.id));
  const currentFollowUps = followUps.filter(item => alive(item) && caseIds.has(item.caseId));
  const currentRenewals = renewals.filter(alive);
  const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  const boundaries = [midnight.getTime(), ...[...currentCases, ...currentFollowUps, ...currentRenewals].map(item => Date.parse(item.updatedAt) + AGENDA_RETENTION_MS)];
  const items: AgendaItem[] = [];
  for (const item of currentCases) {
    if (item.status === 'completed') continue;
    const followUp = currentFollowUps.find(record => record.caseId === item.id) ?? null;
    const summary = followUp ? followUpSummary(followUp, at) : null;
    const latest = summary?.latestObservation;
    const reasons: AgendaReason[] = [];
    if (item.followUpDate && item.followUpDate <= today) reasons.push({ kind: 'case-check-due', date: item.followUpDate, rank: 0 });
    if (followUp?.nextCheckDate && followUp.nextCheckDate <= today) reasons.push({ kind: 'source-check-due', date: followUp.nextCheckDate, rank: 0 });
    if (item.appointment) {
      const appointmentAt = Date.parse(item.appointment.at);
      if (appointmentAt >= now) {
        boundaries.push(appointmentAt + 1);
        if (dateDistance(renewalLocalDate(new Date(appointmentAt)), today) <= AGENDA_UPCOMING_DAYS) reasons.push({ kind: 'appointment', date: item.appointment.at, rank: 1 });
      }
    }
    if (item.status === 'needs-attention') reasons.push({ kind: 'needs-attention', date: null, rank: 2 });
    if (latest?.status === 'needs-info') reasons.push({ kind: 'source-needs-info', date: latest.observedAt, rank: 2 });
    if (latest && Date.parse(latest.observedAt) + 30 * DAY > now) boundaries.push(Date.parse(latest.observedAt) + 30 * DAY);
    if (!reasons.length) continue;
    reasons.sort(reasonOrder);
    items.push({
      key: `case:${item.id}`, target: { kind: 'case', id: item.id }, title: item.title, service: item.service, reasons,
      source: latest ? { kind: 'observation', label: latest.sourceLabel, date: latest.observedAt, freshness: summary!.stale ? 'stale' : 'recent', ageDays: summary!.ageDays, failedCheckAt: summary!.failedAfterObservation ? summary!.latestFailedCheck!.at : null }
        : { kind: 'case', label: '', date: item.updatedAt, freshness: 'not-recorded', ageDays: null, failedCheckAt: summary?.latestFailedCheck?.at ?? null },
      fingerprint: sha256Hex(JSON.stringify([item, savedRevision(item), followUp])),
      expiresAt: Math.min(Date.parse(item.updatedAt) + AGENDA_RETENTION_MS, followUp ? Date.parse(followUp.updatedAt) + AGENDA_RETENTION_MS : Infinity),
    });
  }
  for (const item of currentRenewals) {
    // An entered future check date is not a source freshness claim.
    if (item.checkedOn > today) continue;
    const attention = renewalAttention(item, today); const reasons: AgendaReason[] = [];
    if (attention.reminderDue) reasons.push({ kind: 'document-check-due', date: item.reminderDate, rank: 3 });
    if (attention.expiry !== 'later') reasons.push({ kind: `document-expiry-${attention.expiry}` as AgendaReasonKind, date: item.expiryDate, rank: 3 });
    if (!reasons.length) continue;
    reasons.sort(reasonOrder);
    items.push({ key: `renewal:${item.id}`, target: { kind: 'renewal', id: item.id }, title: item.label, documentKind: item.kind, reasons,
      source: { kind: 'document', label: item.sourceLabel, date: item.checkedOn, freshness: attention.source === 'stale' ? 'stale' : 'recent', ageDays: attention.daysSinceCheck, failedCheckAt: null },
      fingerprint: sha256Hex(JSON.stringify(item)), expiresAt: Date.parse(item.updatedAt) + AGENDA_RETENTION_MS });
  }
  items.sort((left, right) => left.reasons[0].rank - right.reasons[0].rank || cmp(left.reasons[0].date ?? '9999', right.reasons[0].date ?? '9999') || cmp(left.key, right.key));
  return { items, next: items[0] ?? null, nextRefreshAt: Math.min(...boundaries.filter(value => value > now)), today };
}

/** Recompute from fresh stores immediately before navigating; changed targets require a new click. */
export function currentAgendaTarget(expected: AgendaItem, input: AgendaInput, at = new Date().toISOString()): AgendaItem {
  const current = buildAgenda(input, at).items.find(item => item.key === expected.key);
  if (!current || current.fingerprint !== expected.fingerprint) throw new Error('The saved item changed, was removed or is no longer due. Review the refreshed next steps.');
  return current;
}
