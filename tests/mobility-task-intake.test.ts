import { describe, expect, it } from 'vitest';
import { createCase, updateCase } from '../lib/mobility/cases';
import { extractTaskIntake, reviewTaskIntake, MAX_TASK_INTAKE_TEXT, type TaskIntakeKind } from '../lib/mobility/task-intake';

function values(text: string, kind: TaskIntakeKind) {
  return extractTaskIntake(text).candidates.filter(item => item.kind === kind).map(item => item.value);
}

describe('optional task-text detail review', () => {
  it('finds conventional registrations with exact source spans and does not infer a state', () => {
    const text = 'Please review ka 01 ab 3317 and MH-02-CD-9876.';
    const result = extractTaskIntake(text);
    expect(result.candidates.map(item => [item.kind, item.value])).toEqual([
      ['registration', 'KA01AB3317'], ['registration', 'MH02CD9876'],
    ]);
    expect(result.candidates.map(item => text.slice(item.spans[0].start, item.spans[0].end))).toEqual(['ka 01 ab 3317', 'MH-02-CD-9876']);
  });
  it('recognizes a conventional Delhi and Bharat series without validating ownership', () => {
    expect(values('DL8CAF1234, 22 BH 1234 AB', 'registration')).toEqual(['DL8CAF1234', '22BH1234AB']);
  });
  it.each(['XX01AB1234', 'KA01AB12345', 'xKA01AB1234x', 'KA01AB1234_suffix', 'KAO1AB1234', 'KA01AB1234@example.com', 'https://example.com/KA01AB1234', '2026-09-06', '₹500 on 06/09/2026'])('does not guess a registration from %s', text => {
    expect(values(text, 'registration')).toEqual([]);
  });
  it('requires a reference label and an identifier rather than guessing ordinary numbers', () => {
    expect(values('Payment failed for 123456789. Call 9876543210. OTP 123456.', 'reference')).toEqual([]);
    expect(values('Reference: TXN-12345; challan no. KA/2026/9876; application ID: APP_54321', 'reference')).toEqual(['TXN-12345', 'KA/2026/9876', 'APP_54321']);
    expect(values('Reference number: pending. Reference: not available.', 'reference')).toEqual([]);
  });
  it('retains conflicting and repeated references instead of choosing one', () => {
    const text = 'Reference: ABC123 or DEF456. Ref: ABC123';
    const refs = extractTaskIntake(text).candidates.filter(item => item.kind === 'reference');
    expect(refs.map(item => item.value)).toEqual(['ABC123', 'DEF456']);
    expect(refs[0].spans).toHaveLength(2);
    expect(refs[0].spans.map(span => text.slice(span.start, span.end))).toEqual(['ABC123', 'ABC123']);
  });
  it('only suggests jurisdiction from explicit state or issuing-authority context', () => {
    expect(values('I live in Karnataka and drove from Delhi to Haryana in KA01AB3317.', 'jurisdiction')).toEqual([]);
    expect(values('State: Karnataka. Issued in Delhi. Issuing authority: Bengaluru Traffic Police.', 'jurisdiction')).toEqual(['Karnataka', 'Delhi', 'Bengaluru Traffic Police']);
    expect(values('A notice from Karnataka Traffic Police needs review.', 'jurisdiction')).toEqual(['Karnataka Traffic Police']);
  });
  it('keeps ambiguous states available for explicit choice', () => {
    expect(values('State: Karnataka or Tamil Nadu', 'jurisdiction')).toEqual(['Karnataka', 'Tamil Nadu']);
  });
  it('does not extend a state label to unrelated places later in the sentence', () => {
    expect(values('State: Karnataka, but I now live in Delhi', 'jurisdiction')).toEqual(['Karnataka']);
  });
  it.each([
    'My current state: Telangana. The notice was issued in Karnataka.',
    'My home state: Telangana. Issued in Karnataka.',
    'Residential state: Telangana. State of residence: Delhi. Issuing state: Karnataka.',
    'मेरा वर्तमान राज्य: तेलंगाना। निवास राज्य: दिल्ली। राज्य: कर्नाटक।',
    'मेरे निवास का राज्य: तेलंगाना। मेरे घर का राज्य: दिल्ली। राज्य: कर्नाटक।',
    'Vehicle registration state: Maharashtra. Issuing state: Karnataka.',
  ])('leaves residential state context in the notes: %s', text => {
    expect(values(text, 'jurisdiction')).toEqual(['Karnataka']);
  });
  it('exposes alternative issuing authorities instead of treating both as one authority', () => {
    expect(values('Issuing authority: Delhi Police or Haryana Police.', 'jurisdiction')).toEqual(['Delhi Police', 'Haryana Police']);
    expect(values('Issuer: unknown.', 'jurisdiction')).toEqual([]);
  });
  it.each([
    'Please review my challan. State: Telangana (my home state).',
    'State: Telangana, where I live. Issuing state: Karnataka.',
    'राज्य: तेलंगाना (मेरा निवास राज्य)।',
    'राज्य: तेलंगाना, मेरा घर। राज्य: कर्नाटक।',
  ])('does not map a trailing residential qualifier: %s', text => {
    expect(values(text, 'jurisdiction')).toEqual(/Karnataka|कर्नाटक/u.test(text) ? ['Karnataka'] : []);
  });
  it.each([
    "Issuer: I don't know.",
    'Issuing authority: I am not sure.',
    'Issuer: Delhi Police, but I am not sure.',
    'The notice was not issued by Delhi Police.',
    'जारीकर्ता: मुझे पता नहीं।',
    'जारीकर्ता: शायद दिल्ली पुलिस।',
    'जारीकर्ता: दिल्ली पुलिस (निश्चित नहीं)।',
  ])('leaves uncertain or negated authority wording in the notes: %s', text => {
    expect(values(text, 'jurisdiction')).toEqual([]);
  });
  it.each([
    ['Issued by Delhi Police and sent to my home at 12 Private Road.', 'Delhi Police'],
    ['Issuing authority: Bengaluru Traffic Police, delivered to 12 Private Road.', 'Bengaluru Traffic Police'],
    ['जारीकर्ता: दिल्ली पुलिस और मेरे घर 12 निजी मार्ग पर भेजा गया।', 'दिल्ली पुलिस'],
    ['जारीकर्ता प्राधिकरण: बेंगलुरु यातायात पुलिस, मेरा पता 12 निजी मार्ग है।', 'बेंगलुरु यातायात पुलिस'],
  ])('retains only the named authority from narrative: %s', (text, expected) => {
    const candidates = extractTaskIntake(text).candidates.filter(item => item.kind === 'jurisdiction');
    expect(candidates.map(item => item.value)).toEqual([expected]);
    expect(text.slice(candidates[0].spans[0].start, candidates[0].spans[0].end)).toBe(expected);
    const result = reviewTaskIntake(text, candidates.map(item => ({ id: item.id, value: item.value })), 'en');
    expect(result.jurisdiction).toBe(expected);
    expect(JSON.stringify(result)).not.toMatch(/Private Road|निजी मार्ग|12/);
  });
  it('handles Hindi labels and source spans without translating arbitrary prose', () => {
    const text = 'मेरे चालान की समीक्षा करें। चालान संख्या: DL123456। राज्य: दिल्ली। वाहन DL8CAF1234';
    expect(values(text, 'reference')).toEqual(['DL123456']);
    expect(values(text, 'jurisdiction')).toEqual(['Delhi']);
    const state = extractTaskIntake(text).candidates.find(item => item.kind === 'jurisdiction')!;
    expect(text.slice(state.spans[0].start, state.spans[0].end)).toBe('दिल्ली');
  });
  it('does not extract overlong or unsafe reference fragments', () => {
    expect(values(`Ref: ${'A'.repeat(90)}123`, 'reference')).toEqual([]);
    expect(values('Ref: abc123@example.com', 'reference')).toEqual([]);
  });
  it('bounds the input without silently extracting a truncated prefix', () => {
    expect(extractTaskIntake('a'.repeat(MAX_TASK_INTAKE_TEXT + 1))).toEqual({ candidates: [], issue: 'too-long' });
    expect(extractTaskIntake('')).toEqual({ candidates: [], issue: null });
    const tooMany = Array.from({ length: 31 }, (_, index) => `KA01AB${String(index + 1).padStart(4, '0')}`).join(', ');
    expect(extractTaskIntake(tooMany)).toEqual({ candidates: [], issue: 'too-many' });
  });
  it('requires selected source candidates, validates edits, and omits unselected data', () => {
    const text = 'Reference: REF123; State: Karnataka; vehicle KA01AB3317';
    const candidates = extractTaskIntake(text).candidates;
    const plate = candidates.find(item => item.kind === 'registration')!;
    const result = reviewTaskIntake(text, [{ id: plate.id, value: 'KA 01 AB 3318' }], 'en');
    expect(result).toEqual({ reference: '', jurisdiction: '', facts: [{ key: 'task_registration_1', label: 'Vehicle registration · reviewed from your task', value: 'KA01AB3318', source: 'citizen', confirmed: true }] });
    expect(JSON.stringify(result)).not.toMatch(/sourceId|sourceFingerprint|REF123|Karnataka|spans/);
  });
  it('returns reviewed references and states with citizen provenance and case-valid facts', () => {
    const text = 'Reference: REF123; State: Karnataka; vehicle KA01AB3317';
    const selected = extractTaskIntake(text).candidates.map(item => ({ id: item.id, value: item.value }));
    const result = reviewTaskIntake(text, selected, 'hi');
    expect(result.reference).toBe('REF123'); expect(result.jurisdiction).toBe('Karnataka');
    expect(result.facts).toHaveLength(3);
    expect(result.facts.every(item => item.source === 'citizen' && item.confirmed)).toBe(true);
    expect(result.facts[0].label).toContain('आपके काम');
    const item = createCase('challan-review', '2026-09-06T10:00:00.000Z', 'intake');
    expect(() => updateCase(item, result, '2026-09-06T10:01:00.000Z')).not.toThrow();
  });
  it('rejects multiple chosen references or jurisdictions and foreign or duplicate source choices', () => {
    const text = 'Ref: ABC123 or DEF456; State: Karnataka or Delhi';
    const candidates = extractTaskIntake(text).candidates;
    for (const kind of ['reference', 'jurisdiction'] as const) {
      expect(() => reviewTaskIntake(text, candidates.filter(item => item.kind === kind).map(item => ({ id: item.id, value: item.value })), 'en')).toThrow(/Choose one/);
    }
    expect(() => reviewTaskIntake(text, [{ id: 'not-a-source', value: 'anything' }], 'en')).toThrow(/changed/);
    const selected = { id: candidates[0].id, value: candidates[0].value };
    expect(() => reviewTaskIntake(text, [selected, selected], 'en')).toThrow(/duplicate/i);
  });
  it('rejects blank, control-character and invalid edited values without guessing', () => {
    const text = 'Ref: REF123; State: Karnataka; KA01AB3317';
    const candidates = extractTaskIntake(text).candidates;
    const plate = candidates.find(item => item.kind === 'registration')!;
    const ref = candidates.find(item => item.kind === 'reference')!;
    const state = candidates.find(item => item.kind === 'jurisdiction')!;
    expect(() => reviewTaskIntake(text, [{ id: plate.id, value: 'KAO1AB3317' }], 'en')).toThrow();
    expect(() => reviewTaskIntake(text, [{ id: ref.id, value: '' }], 'en')).toThrow();
    expect(() => reviewTaskIntake(text, [{ id: state.id, value: 'Delhi\u0000' }], 'en')).toThrow();
    expect(() => reviewTaskIntake(text, [{ id: state.id, value: 'a'.repeat(161) }], 'en')).toThrow();
    expect(() => reviewTaskIntake(text, [], 'te' as 'en')).toThrow(/language/i);
  });
});
