import { describe, expect, it } from 'vitest';
import { buildDocumentEvidenceNote, correctDocumentField, extractDocumentEvidence, type DocumentReading } from '../lib/document-evidence';

const reading = (sourceId: string, role: DocumentReading['role'], text: string, options: Partial<DocumentReading['pages'][number]> = {}): DocumentReading => ({
  sourceId, role, limited: false, pages: [{ page: 1, text, method: 'pdf-text', ...options }],
});
const pair = (notice = 'KA 01 AB 3817', vehicle = 'KA01AB3317') => [
  reading('notice-1', 'notice', `Registration No: ${notice}`),
  reading('vehicle-1', 'vehicle-record', `Vehicle Number: ${vehicle}`),
];

describe('document evidence extraction', () => {
  it('extracts labelled notice fields with bounded source references', () => {
    const evidence = extractDocumentEvidence([reading('notice-1', 'notice', [
      'Name: Example Person', 'Address: 17 Private Road', 'Registration Number: KA 01 AB 3817',
      'Challan No: BLR-2026-102', 'Violation Date: 05/09/2026', 'Total Amount: Rs. 1,000',
      'Offence: Signal violation', 'Location: MG Road Junction',
    ].join('\n'))]);
    expect(evidence.fields.map(({ key, value }) => [key, value])).toEqual([
      ['registration', 'KA01AB3817'], ['notice-number', 'BLR-2026-102'], ['date', '2026-09-05'],
      ['amount', '1000'], ['offence', 'Signal violation'], ['location', 'MG Road Junction'],
    ]);
    expect(evidence.fields.every(field => field.sourceId === 'notice-1' && field.page === 1 && field.confidence === 'readable')).toBe(true);
    expect(JSON.stringify(evidence)).not.toMatch(/Example Person|Private Road/);
  });

  it('supports Hindi labels and Indian digits without claiming document authenticity', () => {
    const evidence = extractDocumentEvidence([reading('hindi-notice', 'notice', 'वाहन पंजीकरण संख्या: DL 1 CAA 1234\nचालान संख्या: DL-2026-42\nघटना की तारीख: ०५/०९/२०२६\nजुर्माना राशि: ₹ १,५००\nअपराध: लाल बत्ती पार करना\nस्थान: मुख्य चौराहा')]);
    expect(evidence.fields.map(({ key, value }) => [key, value])).toEqual([
      ['registration', 'DL1CAA1234'], ['notice-number', 'DL-2026-42'], ['date', '2026-09-05'],
      ['amount', '1500'], ['offence', 'लाल बत्ती पार करना'], ['location', 'मुख्य चौराहा'],
    ]);
  });

  it('compares only independently sourced notice and vehicle registrations', () => {
    const evidence = extractDocumentEvidence(pair());
    expect(evidence.comparison).toBe('different');
    expect(extractDocumentEvidence(pair('KA-01-AB-3817', 'KA01AB3817')).comparison).toBe('match');
    expect(extractDocumentEvidence([reading('same', 'notice', 'Vehicle No: KA01AB3817'), reading('same', 'vehicle-record', 'Vehicle No: KA01AB3317')]).comparison).toBe('inconclusive');
  });

  it('does not treat OCR text anywhere in a photograph as a plate reading', () => {
    const evidence = extractDocumentEvidence([
      ...pair('KA01AB3817', 'KA01AB3817'),
      reading('photo', 'enforcement-photo', 'Registration No: KA01AB9999', { method: 'local-ocr', confidence: 99 }),
    ]);
    expect(evidence.comparison).toBe('match');
    expect(evidence.fields.some(field => field.role === 'enforcement-photo')).toBe(false);
    expect(evidence.limitations.some(value => /photograph/i.test(value))).toBe(true);
  });

  it('requires a registration label and does not substitute ambiguous OCR characters', () => {
    expect(extractDocumentEvidence([reading('n', 'notice', 'KA01AB3817')]).fields).toEqual([]);
    expect(extractDocumentEvidence(pair('KAO1AB3817')).comparison).toBe('inconclusive');
    expect(extractDocumentEvidence(pair('KA01AB38I7')).comparison).toBe('inconclusive');
    expect(extractDocumentEvidence(pair('KA.01.AB.3817')).comparison).toBe('inconclusive');
    expect(extractDocumentEvidence(pair('22 BH 1234 AA', '22-BH-1234-AA')).comparison).toBe('match');
  });

  it.each(['KA O1 AB 1234', 'KAO1AB1234'])('retains ambiguous labelled %s for correction without substituting O/0', (candidate) => {
    const readings = pair(candidate, 'KA01AB1234');
    readings[0].pages[0] = { ...readings[0].pages[0], method: 'local-ocr', confidence: 91 };
    const evidence = extractDocumentEvidence(readings);
    const notice = evidence.fields.find(field => field.role === 'notice' && field.key === 'registration');
    expect(notice).toMatchObject({ value: candidate, confidence: 'needs-review', method: 'local-ocr' });
    expect(evidence.comparison).toBe('inconclusive');
    expect(correctDocumentField(evidence, notice!.id, 'KA01AB1234').comparison).toBe('match');
    expect(() => correctDocumentField(evidence, notice!.id, candidate)).toThrow();
  });

  it('does not retain free text or overlong sensitive content as an uncertain plate', () => {
    for (const text of ['Example Person', 'KA - ONE', 'KA01 private house at 1234', 'KA01AB1234 <script>', 'KA01AB12345678901234']) {
      const evidence = extractDocumentEvidence([reading('notice', 'notice', `Registration No: ${text}`)]);
      expect(evidence.fields, text).toEqual([]);
    }
  });

  it('abstains when a source has conflicting labelled candidates on one or several pages', () => {
    const readings = pair();
    readings[0].pages.push({ page: 2, text: 'Registration No: KA01AB9999', method: 'pdf-text' });
    const evidence = extractDocumentEvidence(readings);
    expect(evidence.comparison).toBe('inconclusive');
    expect(evidence.fields.filter(field => field.sourceId === 'notice-1' && field.key === 'registration')).toHaveLength(1);
    expect(evidence.fields.find(field => field.sourceId === 'notice-1')?.confidence).toBe('needs-review');
  });

  it('does not turn uncertain OCR or partial reads into decisive comparisons', () => {
    const uncertain = pair();
    uncertain[0].pages[0] = { ...uncertain[0].pages[0], method: 'local-ocr', confidence: 60 };
    expect(extractDocumentEvidence(uncertain).comparison).toBe('inconclusive');
    const partial = pair();
    partial[0].limited = true;
    expect(extractDocumentEvidence(partial).comparison).toBe('inconclusive');
    uncertain[0].pages[0].confidence = 95;
    expect(extractDocumentEvidence(uncertain).comparison).toBe('different');
  });

  it('does not ignore an invalid second labelled registration and trust the first', () => {
    const readings = pair();
    readings[0].pages.push({ page: 2, text: 'Registration No: KAO1AB3817', method: 'local-ocr', confidence: 90 });
    const evidence = extractDocumentEvidence(readings);
    expect(evidence.comparison).toBe('inconclusive');
    expect(evidence.fields[0].confidence).toBe('needs-review');
  });

  it('does not read the tail of a punctuated or overlong registration as a valid plate', () => {
    for (const malformed of ['KA.01.AB.3817', 'XKA01AB3817', 'KA01AB38170', '22BH1234A']) {
      expect(extractDocumentEvidence(pair(malformed)).comparison, malformed).toBe('inconclusive');
    }
  });

  it('keeps multiple sources per role inconclusive even if one would make a match', () => {
    const evidence = extractDocumentEvidence([...pair(), reading('vehicle-2', 'vehicle-record', 'Registration No: KA01AB3817')]);
    expect(evidence.comparison).toBe('inconclusive');
  });

  it('does not treat the same document under two source IDs as independent', () => {
    const readings = pair('KA01AB3817', 'KA01AB3817').map(item => ({ ...item, fingerprint: 'a'.repeat(64) }));
    const evidence = extractDocumentEvidence(readings);
    expect(evidence.comparison).toBe('inconclusive');
    expect(evidence.fields.every(field => field.confidence === 'needs-review')).toBe(true);
    expect(evidence.limitations.join(' ')).toMatch(/same document|identical document/i);
    const noticeCorrected = correctDocumentField(evidence, evidence.fields[0].id, 'KA01AB3817');
    const bothCorrected = correctDocumentField(noticeCorrected, evidence.fields[1].id, 'KA01AB3317');
    expect(bothCorrected.comparison).toBe('inconclusive');
  });

  it('allows distinct document fingerprints to support an independent comparison', () => {
    const readings = pair().map((item, index) => ({ ...item, fingerprint: String(index + 1).repeat(64) }));
    expect(extractDocumentEvidence(readings).comparison).toBe('different');
  });

  it('requires an explicit correction for OCR without a usable quality score', () => {
    for (const confidence of [undefined, Number.NaN, 101, -1]) {
      const readings = pair();
      readings[0].pages[0] = { ...readings[0].pages[0], method: 'local-ocr', confidence };
      expect(extractDocumentEvidence(readings).comparison).toBe('inconclusive');
    }
  });

  it('does not infer a legal deadline from unrelated dates or parse invalid calendar dates', () => {
    const evidence = extractDocumentEvidence([reading('notice-1', 'notice', 'Print Date: 01/09/2026\nDue Date: 10/09/2026\nViolation Date: 31/02/2026')]);
    expect(evidence.fields.filter(field => field.key === 'date')).toEqual([]);
  });

  it('stops selected text values before private labels and omits unrelated identifiers', () => {
    const evidence = extractDocumentEvidence([reading('notice-1', 'notice', 'Offence: Signal violation Owner Name: Private Person\nLocation: MG Road Address: Private House\nChassis Number: PERSONAL123\nEngine Number: SECRET999')]);
    expect(evidence.fields.map(field => field.value)).toEqual(['Signal violation', 'MG Road']);
    expect(JSON.stringify(evidence)).not.toMatch(/Private Person|Private House|PERSONAL123|SECRET999/);
    expect(evidence.fields.every(field => field.excerpt.length <= 160)).toBe(true);
  });

  it('preserves source page and method for supporting extracted fields', () => {
    const evidence = extractDocumentEvidence([{ sourceId: 'notice', role: 'notice', limited: false, pages: [
      { page: 3, text: 'Registration No:\nMH-02-A-1234', method: 'local-ocr', confidence: 96 },
    ] }]);
    expect(evidence.fields[0]).toMatchObject({ sourceId: 'notice', page: 3, value: 'MH02A1234', method: 'local-ocr', confidence: 'readable' });
    expect(evidence.fields[0].excerpt).toBe('Registration No: MH-02-A-1234');
  });

  it('abstains on truncated documents and does not expose unsafe source identifiers', () => {
    const readings = pair();
    readings[0].pages[0].text += `\n${'irrelevant '.repeat(21_000)}`;
    expect(extractDocumentEvidence(readings).comparison).toBe('inconclusive');
    const invalid = extractDocumentEvidence([reading('blob:private-file', 'notice', 'Registration No: KA01AB3817')]);
    expect(invalid.fields).toEqual([]);
    expect(JSON.stringify(invalid)).not.toContain('blob:private-file');
  });
});

describe('document corrections and notes', () => {
  it('validates a correction and recomputes the comparison without mutating extraction', () => {
    const evidence = extractDocumentEvidence(pair());
    const id = evidence.fields.find(field => field.role === 'notice')!.id;
    const corrected = correctDocumentField(evidence, id, 'KA 01 AB 3317');
    expect(corrected.comparison).toBe('match');
    expect(corrected.fields.find(field => field.id === id)).toMatchObject({ value: 'KA01AB3317', method: 'citizen-correction', confidence: 'readable' });
    expect(evidence.comparison).toBe('different');
    expect(evidence.fields.find(field => field.id === id)?.value).toBe('KA01AB3817');
  });

  it('rejects unknown field IDs and invalid corrections', () => {
    const evidence = extractDocumentEvidence(pair());
    expect(() => correctDocumentField(evidence, 'missing', 'KA01AB3317')).toThrow();
    expect(() => correctDocumentField(evidence, evidence.fields[0].id, 'KA01AB33I7')).toThrow();
    expect(() => correctDocumentField(evidence, evidence.fields[0].id, '')).toThrow();
  });

  it('rejects unsafe or oversized textual corrections before generating a note', () => {
    const evidence = extractDocumentEvidence([reading('notice', 'notice', 'Offence: Signal violation')]);
    for (const value of ['<script>bad</script>', 'https://private.example/path', 'x'.repeat(121), 'Text\u202eevil']) {
      expect(() => correctDocumentField(evidence, evidence.fields[0].id, value)).toThrow();
    }
  });

  it('allows explicit correction to resolve a low-confidence reading', () => {
    const readings = pair();
    readings[0].pages[0] = { ...readings[0].pages[0], method: 'local-ocr', confidence: 50 };
    const evidence = extractDocumentEvidence(readings);
    expect(correctDocumentField(evidence, evidence.fields[0].id, 'KA01AB3817').comparison).toBe('different');
  });

  it('builds a neutral source-linked English note distinguishing a registration match from an offence finding', () => {
    const note = buildDocumentEvidenceNote(extractDocumentEvidence(pair('KA01AB3817', 'KA01AB3817')), 'en');
    expect(note).toContain('KA01AB3817');
    expect(note).toContain('Challan, page 1; PDF text');
    expect(note).toContain('Vehicle record, page 1; PDF text');
    expect(note).not.toContain('notice-1');
    expect(note).not.toContain('vehicle-1');
    expect(note).toMatch(/registration.*match/i);
    expect(note).toMatch(/not.*(?:offence|offense)/i);
    expect(note).toMatch(/not.*authenticat/i);
    expect(note).not.toMatch(/valid challan|dispute approved|officially verified/i);
  });

  it('builds a Hindi note without raw document text or a legal conclusion', () => {
    const note = buildDocumentEvidenceNote(extractDocumentEvidence(pair()), 'hi');
    expect(note).toContain('पंजीकरण');
    expect(note).toContain('चालान, पृष्ठ 1');
    expect(note).toContain('वाहन रिकॉर्ड, पृष्ठ 1');
    expect(note).not.toContain('notice-1');
    expect(note).toContain('प्रामाणिकता');
    expect(note).toContain('निर्णय नहीं');
  });

  it('uses human source names in limitations and corrections instead of opaque IDs', () => {
    const readings = pair();
    readings[0].limited = true;
    let evidence = extractDocumentEvidence(readings);
    evidence = correctDocumentField(evidence, evidence.fields[0].id, 'KA01AB3817');
    const en = buildDocumentEvidenceNote(evidence, 'en');
    expect(en).not.toContain('notice-1');
    expect(en).toContain('Your correction');
    const hi = buildDocumentEvidenceNote(evidence, 'hi');
    expect(hi).toContain('आपका सुधार');
    expect(hi).not.toContain('vehicle-1');
  });
});
