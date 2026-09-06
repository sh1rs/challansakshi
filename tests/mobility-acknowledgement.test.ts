import { describe, expect, it } from 'vitest';
import { createCase, type MobilityCase } from '../lib/mobility/cases';
import { acknowledgementCaseFingerprint, acknowledgementContextPreview, buildAcknowledgementReview, extractAcknowledgement, MAX_ACKNOWLEDGEMENT_TEXT, validateAcknowledgementReview, type AcknowledgementOptions, type AcknowledgementKind } from '../lib/mobility/acknowledgement';

const original = () => ({ ...createCase('challan-review', '2026-09-06T10:00:00.000Z', 'acknowledgement-case'), reference: 'OLD-REF-12' });
const source = 'Receipt No: R-1234\nDate: 2026-09-06\nAmount: INR 1,200.50\nDisposed. Paid. Accepted.\nUNSELECTED PRIVATE ADDRESS';
const options = (): AcknowledgementOptions => ({ sourceLabel: 'Receipt screen I opened myself', selections: [], status: 'awaiting-response', personalNote: '', replaceReference: false });
const selection = (text: string, kind: AcknowledgementKind, value?: string) => { const candidate = extractAcknowledgement(text).candidates.find(item => item.kind === kind)!; return { id: candidate.id, value: value ?? candidate.value }; };

describe('local acknowledgement readings', () => {
  it('extracts only explicitly labelled bounded readings with exact unchanged source spans', () => {
    const result = extractAcknowledgement(source);
    expect(result.issue).toBeNull();
    expect(result.candidates.map(item => [item.kind, item.value, item.certainty])).toEqual([['reference', 'R-1234', 'reading'], ['date', '2026-09-06', 'reading'], ['amount', '1200.50', 'reading']]);
    for (const item of result.candidates) for (const span of item.spans) {
      expect(source.slice(span.contextStart, span.contextEnd)).toContain(item.label);
      expect(source.slice(span.start, span.end)).not.toBe('');
    }
    expect(Object.keys(result)).not.toContain('status');
  });
  it('groups repeat readings but keeps conflicting references and semantic kinds separate', () => {
    const result = extractAcknowledgement('Reference: A-12\nReceipt No: A-12\nApplication No: B-13\nDate: 2026-09-06\nPayment date: 2026-09-07');
    expect(result.candidates).toHaveLength(4);
    expect(result.candidates[0].spans).toHaveLength(2);
    const selected = result.candidates.filter(value => value.kind === 'reference').map(value => ({ id: value.id, value: value.value }));
    expect(() => buildAcknowledgementReview(original(), 'Reference: A-12\nReceipt No: A-12\nApplication No: B-13\nDate: 2026-09-06\nPayment date: 2026-09-07', { ...options(), selections: selected, replaceReference: true }, 'en')).toThrow(/one current/i);
  });
  it.each(['06/09/2026', '09-06-2026', '2026-02-30', 'tomorrow', 'perhaps 2026-09-06'])('does not guess a date from %s', value => {
    const text = `Date: ${value}`; const candidate = extractAcknowledgement(text).candidates[0];
    expect(candidate.certainty).toBe('needs-correction');
    expect(() => buildAcknowledgementReview(original(), text, { ...options(), selections: [selection(text, 'date')] }, 'en')).toThrow();
  });
  it.each(['500', 'USD 500', 'INR 12,34', 'INR 500 or 600', 'INR -1', '₹1000000000', 'INR 500.005'])('does not guess currency/round malformed or ambiguous amount %s', value => {
    expect(extractAcknowledgement(`Amount: ${value}`).candidates[0].certainty).toBe('needs-correction');
  });
  it('reads explicit month names and currency amounts without inferring outcomes', () => {
    const result = extractAcknowledgement('रसीद संख्या: HI-12; तारीख: 6 सितंबर 2026; राशि: ₹1,23,456.70\nभुगतान हुआ; निस्तारित');
    expect(result.candidates.map(item => item.value)).toEqual(['HI-12', '2026-09-06', '123456.70']);
    expect(extractAcknowledgement('Date: 29 February 2024').candidates[0].value).toBe('2024-02-29');
    expect(extractAcknowledgement('Paid 500 on 6 September 2026, R-1234').candidates).toEqual([]);
  });
  it.each(['R-12 or R-13', 'not available', 'R-12?', '<img src=x onerror=alert(1)>', 'R-12 and sent to my private address'])('classifies uncertain/injected reference %s for correction', value => {
    expect(extractAcknowledgement(`Reference: ${value}`).candidates[0].certainty).toBe('needs-correction');
  });
  it('does not silently turn an adjacent bare alternative into an unambiguous reading', () => {
    for (const text of ['Reference: R-12 | R-13', 'Reference: R-12; R-13']) {
      expect(extractAcknowledgement(text).candidates[0].certainty).toBe('needs-correction');
    }
  });
  it('rejects overlong/unsupported text and too many candidates as a whole', () => {
    expect(extractAcknowledgement('x'.repeat(MAX_ACKNOWLEDGEMENT_TEXT + 1))).toEqual({ candidates: [], issue: 'too-long' });
    expect(extractAcknowledgement('Reference: R-12\u0000')).toEqual({ candidates: [], issue: 'unsupported-text' });
    expect(extractAcknowledgement('Reference: R-12\u202E')).toEqual({ candidates: [], issue: 'unsupported-text' });
    expect(extractAcknowledgement(Array.from({ length: 25 }, (_, i) => `Reference: R-${i}`).join('\n'))).toEqual({ candidates: [], issue: 'too-many' });
  });
  it('groups repeated full-line context across all candidates without amplifying source text', () => {
    const text = 'Ref: R1;'.repeat(999);
    expect(extractAcknowledgement(text).candidates[0].spans).toHaveLength(999);
    const preview = acknowledgementContextPreview(text);
    expect(preview.totalOccurrences).toBe(999); expect(preview.totalContexts).toBe(1); expect(preview.contexts).toHaveLength(1);
    expect(preview.contexts.reduce((total, context) => total + context.end - context.start, 0)).toBe(text.length);
    expect(preview.contexts[0].highlights).toHaveLength(999);
    for (const span of preview.contexts[0].highlights) expect(text.slice(span.start, span.end)).toBe('R1');
    const conflict = acknowledgementContextPreview('Ref: R1; Ref: R2; Date: 2026-09-06; Amount: INR 50');
    expect(conflict.contexts).toHaveLength(1); expect(conflict.contexts[0].highlights).toHaveLength(4);
  });
  it('bounds distinct context previews while preserving complete candidate conflicts and occurrence counts', () => {
    const text = ['Ref: R1', 'Ref: R2', 'Ref: R3', 'Ref: R4', 'Ref: R5'].join('\n');
    const preview = acknowledgementContextPreview(text);
    expect(preview.contexts).toHaveLength(3); expect(preview.totalContexts).toBe(5); expect(preview.totalOccurrences).toBe(5);
    expect(extractAcknowledgement(text).candidates.map(candidate => candidate.value)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
    expect(preview.contexts.map(context => text.slice(context.start, context.end))).toEqual(['Ref: R1', 'Ref: R2', 'Ref: R3']);
    expect(acknowledgementContextPreview('x'.repeat(MAX_ACKNOWLEDGEMENT_TEXT + 1)).contexts).toEqual([]);
  });
});

describe('reviewed citizen report boundary', () => {
  it('never selects progress based on paid/accepted/disposed words', () => {
    expect(() => buildAcknowledgementReview(original(), source, { ...options(), personalNote: 'I want to record this.', status: '' }, 'en')).toThrow(/Choose the progress/);
    const review = buildAcknowledgementReview(original(), source, { ...options(), personalNote: 'I still need to check what this means.', status: 'needs-attention' }, 'en');
    expect(review.status).toBe('needs-attention'); expect(review.note).not.toContain('Disposed');
  });
  it('requires explicit choice before replacing a different current reference', () => {
    expect(() => buildAcknowledgementReview(original(), source, { ...options(), selections: [selection(source, 'reference')] }, 'en')).toThrow(/different reference/);
    const review = buildAcknowledgementReview(original(), source, { ...options(), selections: [selection(source, 'reference')], replaceReference: true }, 'en');
    expect(review.reference).toBe('R-1234');
    expect(original().reference).toBe('OLD-REF-12');
  });
  it('leaves the current reference unchanged when no reference is selected', () => {
    const review = buildAcknowledgementReview(original(), source, { ...options(), selections: [selection(source, 'date')] }, 'en');
    expect(review).not.toHaveProperty('reference');
    expect(review.note).not.toMatch(/R-1234|PRIVATE ADDRESS|OLD-REF|Disposed/);
    expect(review.note).toContain('Date I read: 2026-09-06');
  });
  it('records only the reviewed values and source label, marks corrections and keeps raw context out', () => {
    const text = 'Date: 06/09/2026\nAmount: INR 500\nPRIVATE RAW LINE';
    const review = buildAcknowledgementReview(original(), text, { ...options(), selections: [selection(text, 'date', '2026-09-06'), selection(text, 'amount')], personalNote: 'I need to understand the response.' }, 'en');
    expect(review.note).toContain('2026-09-06 (corrected by me)');
    expect(review.note).toContain('Amount I read (INR): 500.00');
    expect(review.note).not.toMatch(/06\/09\/2026|PRIVATE RAW/);
    expect(review.note).toContain('source, payment and official outcome not verified');
  });
  it('accepts a short own update without inventing any labelled fields', () => {
    const review = buildAcknowledgementReview(original(), 'The page shows unclear wording.', { ...options(), personalNote: 'I cannot understand the reply.' }, 'hi');
    expect(review.note).toContain('मेरा अतिरिक्त नोट: I cannot understand the reply.');
    expect(review).not.toHaveProperty('reference');
  });
  it('rejects missing source, malformed selected fields, overlong notes and unsupported language without truncation', () => {
    const valid = { ...options(), personalNote: 'My update' };
    for (const patch of [{ sourceLabel: '' }, { sourceLabel: 'x'.repeat(121) }, { sourceLabel: 'one\ntwo' }, { personalNote: 'x'.repeat(351) }, { personalNote: 'bad\u0000' }, { selections: [{ id: 'made-up', value: '123' }] }]) expect(() => buildAcknowledgementReview(original(), source, { ...valid, ...patch }, 'en')).toThrow();
    expect(() => buildAcknowledgementReview(original(), source, valid, 'te' as 'en')).toThrow();
    const full = buildAcknowledgementReview(original(), source, { ...valid, sourceLabel: 'x'.repeat(120), personalNote: 'x'.repeat(350), selections: [selection(source, 'reference', 'R'.repeat(159) + '1'), selection(source, 'date'), selection(source, 'amount')], replaceReference: true }, 'en');
    expect(full.note.length).toBeLessThanOrEqual(1_000); expect(full.note).toContain('x'.repeat(350));
  });
  it('validates root callbacks against the exact full current case and display language', () => {
    const value = original(); const review = buildAcknowledgementReview(value, source, { ...options(), personalNote: 'My report' }, 'en');
    expect(acknowledgementCaseFingerprint(value, 'en')).toMatch(/^[a-f0-9]{64}$/);
    expect(validateAcknowledgementReview(review, value, 'en')).toEqual(review);
    for (const changed of [{ ...value, id: 'other' }, { ...value, draft: 'New wording' }, { ...value, reference: 'NEW-1' }, { ...value, status: 'completed' as const }]) expect(() => validateAcknowledgementReview(review, changed, 'en')).toThrow(/changed/);
    expect(() => validateAcknowledgementReview(review, value, 'hi')).toThrow(/changed/);
    for (const altered of [{ ...review, status: 'paid' }, { ...review, note: 'x'.repeat(1001) }, { ...review, note: ' trimmed ' }, { ...review, reference: '' }, { ...review, secret: 'unexpected' }]) expect(() => validateAcknowledgementReview(altered, value, 'en')).toThrow();
    expect(() => validateAcknowledgementReview(review, { ...value, version: 2 } as unknown as MobilityCase, 'en')).toThrow();
  });
});
