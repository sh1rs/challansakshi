import { createCase, updateCase, validateCase, type MobilityCase } from './cases';
import { readCases, saveCase } from './store';

type Language = 'en' | 'hi';
const REVISION = Symbol.for('challansakshi.mobility.case-revision');
function revision(value: MobilityCase): unknown { return Object.getOwnPropertyDescriptor(value, REVISION)?.value; }
function checkedNote(note: string): string {
  if (typeof note !== 'string' || !note.trim()) throw new TypeError('Prepare and review a non-empty reply note first.');
  if (note.length > 16_000) throw new TypeError('This complete note exceeds the 16,000-character case limit. Download the existing note instead; nothing was shortened.');
  if (note !== note.trim()) throw new TypeError('Keep the exact prepared note unchanged. Prepare it again or download the existing note instead.');
  return note;
}

/** Only the already-reviewed note is accepted; the original reply is never an input. */
export function prepareReplyFollowUp(note: string, language: Language, relatedCase?: MobilityCase, now = new Date().toISOString(), id = crypto.randomUUID()): MobilityCase {
  const draft = checkedNote(note);
  if (language !== 'en' && language !== 'hi') throw new TypeError('Choose English or Hindi.');
  const parent = relatedCase ? validateCase(relatedCase) : undefined;
  if (parent?.id === id) throw new TypeError('A reply follow-up must have a new case identity.');
  const result = updateCase(createCase(parent?.service ?? 'challan-review', now, id), {
    title: language === 'hi' ? 'उत्तर के बाद की तैयारी' : 'Reply follow-up preparation',
    draft, jurisdiction: parent?.jurisdiction ?? '', reference: parent?.reference ?? '',
    facts: parent?.facts.map(fact => ({ ...fact, confirmed: false })) ?? [],
  }, now, {
    kind: 'follow-up', basis: 'local', text: language === 'hi'
      ? 'नागरिक के जाँचे उत्तर समीक्षा नोट से नई तैयारी शुरू हुई। यह आधिकारिक स्थिति अपडेट नहीं है; पुराने केस में बदलाव नहीं हुआ।'
      : 'Started a new preparation from the citizen-reviewed reply note. This is not an official status update; existing cases were not changed.',
  });
  if (result.draft !== note) throw new TypeError('The case must keep the exact reviewed note unchanged. Download the existing note instead.');
  return result;
}

/** Synchronous final checks immediately precede the single new-case store write. */
export function saveReviewedReplyFollowUp(preview: MobilityCase, options: { note: string; language: Language; relatedCase?: MobilityCase; consent: boolean }): MobilityCase {
  if (options.consent !== true) throw new Error('Explicit private-device save consent is required.');
  const value = validateCase(preview);
  const expected = prepareReplyFollowUp(options.note, options.language, options.relatedCase, value.createdAt, value.id);
  if (JSON.stringify(value) !== JSON.stringify(expected)) throw new Error('The note or selected case details changed. Review the complete new case again before saving.');
  if (Date.parse(value.createdAt) > Date.now() + 300_000 || Date.now() - Date.parse(value.createdAt) >= 90 * 86_400_000) throw new Error('This case preview expired or its date is invalid. Prepare a fresh review.');
  const cases = readCases();
  if (revision(value) !== undefined || cases.some(item => item.id === value.id)) throw new Error('This follow-up was already saved. Prepare a new review to create another case.');
  if (options.relatedCase) {
    const parent = options.relatedCase;
    const saved = cases.find(item => item.id === parent.id);
    if (!saved) throw new Error('The related saved case was deleted or expired. Choose a related case again or start without one.');
    if (!Number.isSafeInteger(revision(parent)) || revision(parent) !== revision(saved) || JSON.stringify(parent) !== JSON.stringify(saved)) throw new Error('The related saved case changed. Reload and review its latest details before saving.');
  }
  saveCase(value);
  return value;
}
