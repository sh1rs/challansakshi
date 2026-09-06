import { validateCase, type CaseFact, type MobilityCase, type MobilityCasePatch } from './cases';

const EDITABLE_FIELDS = ['title', 'jurisdiction', 'reference', 'draft', 'followUpDate', 'appointment'] as const;
type EditableField = typeof EDITABLE_FIELDS[number];
export type RecoveryChange = { key: string; field: EditableField | 'fact'; label: string; saved: string | CaseFact | MobilityCase['appointment']; working: string | CaseFact | MobilityCase['appointment'] };

function pair(workingValue: MobilityCase, savedValue: MobilityCase) {
  const working = validateCase(workingValue); const saved = validateCase(savedValue);
  if (working.id !== saved.id || working.service !== saved.service || working.createdAt !== saved.createdAt) throw new Error('Compare versions of the same case only.');
  return { working, saved };
}

export function hasReportedCaseHistory(value: MobilityCase): boolean {
  return value.status === 'completed' || value.status === 'awaiting-response'
    || value.events.some(event => event.kind === 'citizen-report' || event.basis === 'citizen-reported');
}

export function compareWorkingCase(workingValue: MobilityCase, savedValue: MobilityCase): RecoveryChange[] {
  const { working, saved } = pair(workingValue, savedValue);
  const changes: RecoveryChange[] = [];
  for (const field of EDITABLE_FIELDS) {
    if (JSON.stringify(working[field]) !== JSON.stringify(saved[field])) changes.push({ key: field, field, label: field, saved: saved[field], working: working[field] });
  }
  const keys = new Set([...saved.facts.map(fact => fact.key), ...working.facts.map(fact => fact.key)]);
  for (const key of keys) {
    const savedFact = saved.facts.find(fact => fact.key === key); const workingFact = working.facts.find(fact => fact.key === key);
    if (JSON.stringify(savedFact) !== JSON.stringify(workingFact)) changes.push({ key: `fact:${key}`, field: 'fact', label: workingFact?.label ?? savedFact!.label, saved: savedFact, working: workingFact });
  }
  return changes;
}

/** Prepare an unsaved patch only. The caller must re-read the exact latest saved version before applying. */
export function prepareCaseRecovery(workingValue: MobilityCase, savedValue: MobilityCase, selected: readonly string[]): MobilityCasePatch {
  const { working, saved } = pair(workingValue, savedValue);
  if (hasReportedCaseHistory(saved)) throw new Error('This saved case has reported activity. Keep that record unchanged and download your working note before reloading.');
  const changes = compareWorkingCase(working, saved);
  if (!Array.isArray(selected) || selected.length < 1 || selected.length > 206 || new Set(selected).size !== selected.length || selected.some(key => !changes.some(change => change.key === key))) {
    throw new Error('Select changed details from the current comparison.');
  }
  const patch: MobilityCasePatch = {};
  for (const field of EDITABLE_FIELDS) {
    if (selected.includes(field)) Object.assign(patch, { [field]: working[field] });
  }
  const factKeys = selected.filter(key => key.startsWith('fact:')).map(key => key.slice(5));
  if (factKeys.length) {
    patch.facts = saved.facts.filter(fact => !factKeys.includes(fact.key));
    for (const key of factKeys) {
      const fact = working.facts.find(item => item.key === key);
      if (fact) patch.facts.push({ ...fact, confirmed: false });
    }
  }
  // Carried wording and details need another review; reported outcomes are excluded above.
  patch.status = 'preparing';
  validateCase({ ...saved, ...patch });
  return patch;
}
