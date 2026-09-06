import { updateCase, validateCase, validateProfile, type CaseFact, type MobilityCase, type MobilityProfile } from './cases';
import { saveCasesAtomically } from './store';

export type ProfileCorrection = {
  key: string;
  label: string;
  nextLabel: string;
  before: string;
  after: string;
};

export type ProfileCorrectionCase = {
  original: MobilityCase;
  changes: ProfileCorrection[];
  preservedFacts: number;
};

export type ProfileCorrectionExclusion = {
  caseId: string;
  title: string;
  reason: 'completed' | 'awaiting-response' | 'citizen-reported' | 'no-profile-facts' | 'missing-profile-value' | 'event-limit';
};

export type ProfileCorrectionPreview = {
  profile: MobilityProfile;
  cases: ProfileCorrectionCase[];
  excluded: ProfileCorrectionExclusion[];
  unchangedCount: number;
};

function replacement(fact: CaseFact, profile: MobilityProfile): { value: string; label: string } | null {
  if (fact.source !== 'profile') return null;
  if (fact.key === 'profile_name') return { value: profile.name, label: fact.label };
  if (fact.key === 'profile_address') return { value: profile.address, label: fact.label };
  // Keep the former workspace key readable for drafts created before the new prefix.
  const prefix = fact.key.startsWith('profile_vehicle_') ? 'profile_vehicle_' : fact.key.startsWith('vehicle_') ? 'vehicle_' : '';
  if (!prefix) return null;
  const vehicle = profile.vehicles.find(item => item.id === fact.key.slice(prefix.length));
  return vehicle ? { value: vehicle.registration, label: vehicle.label } : null;
}

function historyExclusion(item: MobilityCase): ProfileCorrectionExclusion['reason'] | null {
  if (item.status === 'completed') return 'completed';
  if (item.status === 'awaiting-response') return 'awaiting-response';
  // Reports have free-form text, with no structured submission flag. Preserve all
  // reported activity rather than guessing whether a report describes submission.
  if (item.events.some(event => event.kind === 'citizen-report' || event.basis === 'citizen-reported')) return 'citizen-reported';
  return null;
}

export function buildProfileCorrectionPreview(profileValue: MobilityProfile, caseValues: readonly MobilityCase[]): ProfileCorrectionPreview {
  const profile = validateProfile(profileValue);
  if (!Array.isArray(caseValues) || caseValues.length > 50) throw new TypeError('A correction preview supports at most 50 saved cases.');
  const originals = caseValues.map(validateCase);
  if (new Set(originals.map(item => item.id)).size !== originals.length) throw new TypeError('Preview case ids must be unique.');
  const result: ProfileCorrectionPreview = { profile, cases: [], excluded: [], unchangedCount: 0 };
  for (const original of originals) {
    const exclude = (reason: ProfileCorrectionExclusion['reason']) => {
      result.excluded.push({ caseId: original.id, title: original.title, reason });
    };
    const history = historyExclusion(original);
    if (history) { exclude(history); continue; }
    const profileFacts = original.facts.filter(fact => fact.source === 'profile');
    if (profileFacts.length === 0) { exclude('no-profile-facts'); continue; }
    const changes: ProfileCorrection[] = [];
    let matched = 0;
    for (const fact of original.facts) {
      const next = replacement(fact, profile);
      if (!next) continue;
      matched += 1;
      if (fact.value !== next.value || fact.label !== next.label) {
        changes.push({ key: fact.key, label: fact.label, nextLabel: next.label, before: fact.value, after: next.value });
      }
    }
    if (changes.length === 0) {
      if (matched === 0) exclude('missing-profile-value');
      else result.unchangedCount += 1;
      continue;
    }
    if (original.events.length >= 200) { exclude('event-limit'); continue; }
    result.cases.push({ original, changes, preservedFacts: original.facts.length - matched });
  }
  return result;
}

export function applyProfileCorrections(
  preview: ProfileCorrectionPreview,
  selectedIds: readonly string[],
  now: string,
  language: 'en' | 'hi' = 'en',
): MobilityCase[] {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0 || selectedIds.length > 50) throw new TypeError('Select between 1 and 50 drafts to update.');
  if (new Set(selectedIds).size !== selectedIds.length) throw new TypeError('Selected case ids must be unique; duplicate selections are not allowed.');
  const checked = buildProfileCorrectionPreview(preview.profile, preview.cases.map(item => item.original));
  const updates = selectedIds.map(id => {
    const candidate = checked.cases.find(item => item.original.id === id);
    if (!candidate) throw new Error('A selected case is no longer eligible in this preview. Refresh and select drafts again.');
    const facts = candidate.original.facts.map(fact => {
      const change = candidate.changes.find(item => item.key === fact.key);
      return change ? { ...fact, value: change.after, label: change.nextLabel, confirmed: false } : fact;
    });
    const next = updateCase(candidate.original, {
      facts,
      ...(candidate.original.status === 'ready' ? { status: 'preparing' as const } : {}),
    }, now, {
      kind: 'updated', basis: 'local',
      text: language === 'hi'
        ? `आपकी समीक्षा के बाद सहेजी प्रोफ़ाइल से ${candidate.changes.length} तथ्य सुधारे गए। इन तथ्यों और पुराने मसौदे के शब्दों को फिर जाँचें।`
        : `Applied ${candidate.changes.length} reviewed corrections from saved reusable details. Recheck these facts and the existing draft wording.`,
    });
    return { original: candidate.original, next };
  });
  return saveCasesAtomically(updates, checked.profile);
}
