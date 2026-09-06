import { describe, expect, it } from 'vitest';
import { extractDocumentEvidence, type DocumentReading } from '../lib/document-evidence';
import { buildDocumentCase, readJurisdictionHint } from '../lib/mobility/document-bridge';

const reading = (text: string, sourceId = 'notice'): DocumentReading => ({ sourceId, role: sourceId === 'notice' ? 'notice' : 'vehicle-record', limited: false, pages: [{ page: 1, method: 'pdf-text', text }] });
describe('document to connected case', () => {
  it('uses explicit source jurisdiction and never a registration prefix or current GPS', () => {
    expect(readJurisdictionHint([reading('Registration Number: KA01AB1234\nLocation: Delhi')])).toBe('');
    expect(readJurisdictionHint([reading('Issuing Authority: Karnataka Traffic Police')])).toBe('Karnataka');
    expect(readJurisdictionHint([reading('State: Delhi\nVehicle Number: KA01AB1234')])).toBe('Delhi');
    expect(readJurisdictionHint([reading('State: Delhi\nJurisdiction: Karnataka')])).toBe('');
    expect(readJurisdictionHint([reading('State: Tamil Nadu', 'vehicle')])).toBe('');
  });
  it('keeps both registration sources and builds a factual request without an offence conclusion', () => {
    const evidence = extractDocumentEvidence([reading('Registration Number: KA01AB1234\nChallan Number: TEST123\nAmount: 100'), reading('Registration Number: KA01AB5678', 'vehicle')]);
    const result = buildDocumentCase(evidence, 'Delhi', 'en', '2026-09-06T10:00:00.000Z', 'case-test');
    expect(result.facts.map(fact => fact.key)).toContain('notice.registration');
    expect(result.facts.map(fact => fact.key)).toContain('vehicle-record.registration');
    expect(result.draft).toContain('KA01AB1234');
    expect(result.draft).toContain('KA01AB5678');
    expect(result.draft).toContain('review');
    expect(result.status).toBe('ready');
    expect(result.events.every(event => event.basis === 'local')).toBe(true);
    expect(JSON.stringify(result)).not.toContain('sourceFingerprint');
  });
  it('does not present uncertain readings as confirmed facts', () => {
    const result = buildDocumentCase({ fields: [{ id:'a',sourceId:'a',role:'notice',page:1,key:'registration',value:'KAO1AB1234',method:'local-ocr',confidence:'needs-review',excerpt:'Registration: KAO1AB1234' }], comparison:'inconclusive',limitations:[] }, '', 'en', '2026-09-06T10:00:00.000Z', 'case-test');
    expect(result.facts[0].confirmed).toBe(false);
    expect(result.draft).toContain('unclear');
    expect(result.draft).not.toContain('KAO1AB1234');
  });
  it('preserves the source fingerprint through explicit case creation, without carrying original text or bytes', () => {
    const source = { ...reading('Registration Number: KA01AB1234\nOwner Address: Private unrelated text'), fingerprint: 'b'.repeat(64) };
    const evidence = extractDocumentEvidence([source]);
    const result = buildDocumentCase(evidence, '', 'en', '2026-09-06T10:00:00.000Z', 'source-case');
    expect(result.facts[0]).toMatchObject({ sourceId: source.sourceId, sourceFingerprint: source.fingerprint, page: 1 });
    expect(JSON.stringify(result)).not.toContain('Private unrelated text');
    expect(result.facts[0].confirmed).toBe(evidence.fields[0].confidence === 'readable');
  });
});
