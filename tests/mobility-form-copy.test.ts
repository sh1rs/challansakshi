import { describe, expect, it } from 'vitest';
import { createCase, type MobilityCase } from '../lib/mobility/cases';
import { collectFormCopyFields, buildFormCopyReview, isFormCopyReviewCurrent, type FormCopyOptions } from '../lib/mobility/form-copy';

function fixture(): MobilityCase {
  return { ...createCase('challan-review', '2026-09-06T10:00:00.000Z', 'copy-case'), reference: 'PRIVATE-REF', jurisdiction: 'Karnataka', draft: 'PRIVATE-DRAFT', facts: [
    { key: 'plate', label: 'Registration', value: 'KA01AB3317', source: 'document', confirmed: true, sourceId: 'notice-1', page: 2 },
    { key: 'amount', label: 'Amount', value: 'UNCONFIRMED-AMOUNT', source: 'document', confirmed: false },
    { key: 'name', label: 'Name', value: 'PRIVATE-NAME', source: 'profile', confirmed: true },
    { key: 'empty', label: 'Empty reading', value: '', source: 'citizen', confirmed: true },
  ] };
}
const options = (): FormCopyOptions => ({ fieldKeys: ['fact:plate'], draftText: 'PRIVATE-DRAFT' });

describe('reviewed details for manual official-form entry', () => {
  it('offers only non-empty confirmed facts plus explicitly reviewable case fields', () => {
    const catalog = collectFormCopyFields(fixture(), 'en');
    expect(catalog.fields.map(field => field.key)).toEqual(['fact:plate', 'fact:name', 'case:reference', 'case:jurisdiction', 'case:draft']);
    expect(catalog.unconfirmedCount).toBe(1);
    expect(catalog.fields[0]).toMatchObject({ value: 'KA01AB3317', source: 'document', sourceId: 'notice-1', page: 2 });
    expect(catalog.fields.find(field => field.key === 'case:draft')?.requiresReview).toBe(true);
    expect(catalog.fields.find(field => field.key === 'case:reference')?.requiresReview).toBe(true);
  });
  it('defaults to no included sensitive values and does not mutate the case', () => {
    const value = fixture(); const original = JSON.stringify(value);
    const review = buildFormCopyReview(value, { fieldKeys: [], draftText: '' }, 'en');
    expect(review.fields).toEqual([]);
    expect(review.text).not.toMatch(/PRIVATE|KA01AB3317|Karnataka|copy-case|notice-1/);
    expect(JSON.stringify(value)).toBe(original);
  });
  it('exports exactly the selected values and provenance without unrelated case data', () => {
    const review = buildFormCopyReview(fixture(), options(), 'en');
    expect(review.fields.map(field => field.value)).toEqual(['KA01AB3317']);
    expect(review.text).toContain('Registration\nKA01AB3317');
    expect(review.text).toContain('Document reading; checked by you');
    expect(review.text).not.toMatch(/PRIVATE|UNCONFIRMED|Karnataka|copy-case|notice-1/);
    expect(review.binding).toMatch(/^[a-f0-9]{64}$/);
  });
  it('uses the exact locally edited draft without updating the case or including it by default', () => {
    const value = fixture(); const edited = '  My corrected request.\nPlease check the attached record.  ';
    const review = buildFormCopyReview(value, { fieldKeys: ['case:draft'], draftText: edited }, 'hi');
    expect(review.fields[0].value).toBe(edited); expect(review.text).toContain(edited);
    expect(review.fields[0].provenance).toContain('इस प्रति');
    expect(value.draft).toBe('PRIVATE-DRAFT');
  });
  it('keeps separate source readings separate even when their labels or values match', () => {
    const value = fixture(); value.facts.push({ ...value.facts[0], key: 'other-plate', sourceId: 'other-notice' });
    const review = buildFormCopyReview(value, { ...options(), fieldKeys: ['fact:plate', 'fact:other-plate'] }, 'en');
    expect(review.fields).toHaveLength(2);
    expect(review.fields.map(field => field.sourceId)).toEqual(['notice-1', 'other-notice']);
  });
  it.each(['fact:amount', 'fact:empty', 'fact:missing'])('rejects unavailable or unconfirmed selected field %s', key => {
    expect(() => buildFormCopyReview(fixture(), { ...options(), fieldKeys: [key] }, 'en')).toThrow();
  });
  it('rejects duplicate keys, invalid language, invalid case and invalid draft content', () => {
    expect(() => buildFormCopyReview(fixture(), { ...options(), fieldKeys: ['fact:plate', 'fact:plate'] }, 'en')).toThrow();
    expect(() => collectFormCopyFields(fixture(), 'te' as 'en')).toThrow();
    expect(() => buildFormCopyReview({ ...fixture(), version: 2 } as unknown as MobilityCase, options(), 'en')).toThrow();
    expect(() => buildFormCopyReview(fixture(), { fieldKeys: ['case:draft'], draftText: '\u0000' }, 'en')).toThrow();
    expect(() => buildFormCopyReview(fixture(), { fieldKeys: ['case:draft'], draftText: 'x'.repeat(16_001) }, 'en')).toThrow();
    expect(() => buildFormCopyReview(fixture(), { fieldKeys: ['case:draft'], draftText: '  ' }, 'en')).toThrow();
  });
  it('invalidates a review on any case, selection, draft or language change', () => {
    const value = fixture(); const selected = options(); const review = buildFormCopyReview(value, selected, 'en');
    expect(isFormCopyReviewCurrent(review, value, selected, 'en')).toBe(true);
    expect(isFormCopyReviewCurrent(review, { ...value, id: 'another-case' }, selected, 'en')).toBe(false);
    expect(isFormCopyReviewCurrent(review, { ...value, title: 'Changed even though title was not included' }, selected, 'en')).toBe(false);
    expect(isFormCopyReviewCurrent(review, value, { ...selected, fieldKeys: [] }, 'en')).toBe(false);
    expect(isFormCopyReviewCurrent(review, value, { ...selected, draftText: 'Changed draft' }, 'en')).toBe(false);
    expect(isFormCopyReviewCurrent(review, value, selected, 'hi')).toBe(false);
    value.facts[0].confirmed = false;
    expect(isFormCopyReviewCurrent(review, value, selected, 'en')).toBe(false);
  });
  it('rejects altered review text or field content rather than trusting a reused binding', () => {
    const value = fixture(); const selected = options(); const review = buildFormCopyReview(value, selected, 'en');
    expect(isFormCopyReviewCurrent({ ...review, text: 'Different reviewed text' }, value, selected, 'en')).toBe(false);
    expect(isFormCopyReviewCurrent({ ...review, fields: [{ ...review.fields[0], value: 'Different value' }] }, value, selected, 'en')).toBe(false);
  });
});
