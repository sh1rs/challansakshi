import { sha256Hex } from '../local-sha256';
import { validateCase, type MobilityCase } from './cases';

export type FormCopyLanguage = 'en' | 'hi';
export type FormCopyField = {
  key: string;
  label: string;
  value: string;
  source: 'document' | 'citizen' | 'profile' | 'case' | 'draft';
  provenance: string;
  requiresReview: boolean;
  sourceId?: string;
  page?: number;
};
export type FormCopyCatalog = { fields: FormCopyField[]; unconfirmedCount: number };
export type FormCopyOptions = { fieldKeys: string[]; draftText: string };
export type FormCopyReview = { fields: FormCopyField[]; text: string; binding: string };

function checkLanguage(language: unknown): asserts language is FormCopyLanguage {
  if (language !== 'en' && language !== 'hi') throw new TypeError('Unsupported form-copy language.');
}
function collectCheckedFields(item: MobilityCase, language: FormCopyLanguage): FormCopyCatalog {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const descriptions = {
    document: t('Document reading; checked by you', 'दस्तावेज़ से पढ़ी जानकारी; आपने जाँची'),
    citizen: t('Entered or edited by you; checked by you', 'आपने दर्ज या संपादित किया; आपने जाँचा'),
    profile: t('Copied from reusable details; checked by you', 'दोबारा उपयोग की जानकारी से लिया; आपने जाँचा'),
  };
  const fields: FormCopyField[] = item.facts.filter(fact => fact.confirmed && fact.value.trim()).map(fact => ({
    key: `fact:${fact.key}`, label: fact.label, value: fact.value, source: fact.source,
    provenance: descriptions[fact.source], requiresReview: false,
    ...(fact.sourceId ? { sourceId: fact.sourceId } : {}), ...(fact.page ? { page: fact.page } : {}),
  }));
  if (item.reference) fields.push({ key: 'case:reference', label: t('Reference entered in this case', 'इस केस में दर्ज संदर्भ'), value: item.reference, source: 'case', provenance: t('Entered in this case; review against your actual record', 'इस केस में दर्ज किया; वास्तविक रिकॉर्ड से जाँचें'), requiresReview: true });
  if (item.jurisdiction) fields.push({ key: 'case:jurisdiction', label: t('State / authority entered in this case', 'इस केस में दर्ज राज्य / प्राधिकरण'), value: item.jurisdiction, source: 'case', provenance: t('Entered in this case; check the authority named in your record', 'इस केस में दर्ज किया; रिकॉर्ड में दिए प्राधिकरण से मिलाएँ'), requiresReview: true });
  if (item.draft.trim()) fields.push({ key: 'case:draft', label: t('My request wording for this copy', 'इस प्रति के लिए मेरे अनुरोध की भाषा'), value: item.draft, source: 'draft', provenance: t('Your preparation draft; local edits apply only to this copy', 'आपका तैयारी मसौदा; यहाँ के बदलाव केवल इस प्रति में हैं'), requiresReview: true });
  return { fields, unconfirmedCount: item.facts.filter(fact => !fact.confirmed && fact.value.trim()).length };
}

/** No portal field names or limits are inferred. This catalog does not select or approve anything. */
export function collectFormCopyFields(caseValue: MobilityCase, language: FormCopyLanguage): FormCopyCatalog {
  checkLanguage(language);
  return collectCheckedFields(validateCase(caseValue), language);
}

/** The returned text is the exact download preview, not an approval or a submitted form. */
export function buildFormCopyReview(caseValue: MobilityCase, options: FormCopyOptions, language: FormCopyLanguage): FormCopyReview {
  checkLanguage(language);
  const checked = validateCase(caseValue); const catalog = collectCheckedFields(checked, language);
  if (!options || !Array.isArray(options.fieldKeys) || options.fieldKeys.length > 103 || options.fieldKeys.some(key => typeof key !== 'string') || new Set(options.fieldKeys).size !== options.fieldKeys.length) throw new TypeError('Review the selected copy fields.');
  if (typeof options.draftText !== 'string' || options.draftText.length > 16_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(options.draftText)) throw new TypeError('Check the draft wording before reviewing this copy.');
  if (options.fieldKeys.some(key => !catalog.fields.some(field => field.key === key))) throw new TypeError('A selected detail is missing, empty or no longer confirmed. Review the case again.');
  if (options.fieldKeys.includes('case:draft') && !options.draftText.trim()) throw new TypeError('Enter draft wording for the selected copy, or leave the draft out.');
  const fields = catalog.fields.filter(field => options.fieldKeys.includes(field.key)).map(field => ({ ...field, ...(field.key === 'case:draft' ? { value: options.draftText } : {}) }));
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const blocks = [t('SELECTED DETAILS FOR MANUAL ENTRY', 'स्वयं दर्ज करने के लिए चुने विवरण')];
  if (fields.length) for (const field of fields) blocks.push(`${field.label}\n${field.value}\n${t('Source', 'स्रोत')}: ${field.provenance}`);
  else blocks.push(t('No details selected.', 'कोई विवरण नहीं चुना।'));
  blocks.push(t('These are selected case details, not a portal-specific form or an official verification. Check each destination field and the current official instructions. Nothing has been submitted by this note.', 'ये चुने हुए केस विवरण हैं, किसी पोर्टल का विशेष फ़ॉर्म या आधिकारिक सत्यापन नहीं। हर गंतव्य फ़ील्ड और मौजूदा आधिकारिक निर्देश जाँचें। इस नोट से कुछ जमा नहीं हुआ है।'));
  // The complete case participates in invalidation, but only an opaque binding and selected fields leave this function.
  const binding = sha256Hex(JSON.stringify({ version: 'form-copy-v1', caseValue: checked, language, fieldKeys: options.fieldKeys, draftText: options.draftText }));
  return { fields, text: blocks.join('\n\n'), binding };
}

/** A checkbox must still approve this exact preview in the UI; a matching binding alone is not approval. */
export function isFormCopyReviewCurrent(review: FormCopyReview, caseValue: MobilityCase, options: FormCopyOptions, language: FormCopyLanguage): boolean {
  try {
    const current = buildFormCopyReview(caseValue, options, language);
    return Boolean(review && review.binding === current.binding && review.text === current.text && JSON.stringify(review.fields) === JSON.stringify(current.fields));
  } catch { return false; }
}
