import { describe, expect, it } from 'vitest';
import { correctDocumentField, extractDocumentEvidence, type DocumentReading } from '../lib/document-evidence';

// Reproducible synthetic corpus: no fixtures from citizens, randomness or new dependencies.
const cases = Array.from({ length: 48 }, (_, index) => ({
  notice: `KA01AB${String(1000 + index)}`,
  vehicle: `KA01AB${String(1000 + (index % 2 ? index + 1 : index))}`,
}));
function reading(sourceId: string, role: DocumentReading['role'], plate: string): DocumentReading {
  return { sourceId, role, limited: false, pages: [{ page: 1, method: 'pdf-text', text: `Registration No: ${plate}` }] };
}

describe('synthetic document comparison properties', () => {
  it('preserves comparison under source ordering and harmless plate spacing', () => {
    for (const [index, entry] of cases.entries()) {
      const pair = [reading(`n-${index}`, 'notice', entry.notice), reading(`v-${index}`, 'vehicle-record', entry.vehicle)];
      const expected = entry.notice === entry.vehicle ? 'match' : 'different';
      expect(extractDocumentEvidence(pair).comparison).toBe(expected);
      expect(extractDocumentEvidence([...pair].reverse()).comparison).toBe(expected);
      pair[0].pages[0].text = `Registration No: ${entry.notice.slice(0, 2)}-${entry.notice.slice(2, 4)} ${entry.notice.slice(4, 6)} ${entry.notice.slice(6)}`;
      expect(extractDocumentEvidence(pair).comparison).toBe(expected);
    }
  });

  it('abstains when certainty or source independence is removed', () => {
    for (const [index, entry] of cases.entries()) {
      const notice = reading(`n-${index}`, 'notice', entry.notice);
      const vehicle = reading(`v-${index}`, 'vehicle-record', entry.vehicle);
      expect(extractDocumentEvidence([notice]).comparison).toBe('inconclusive');
      expect(extractDocumentEvidence([{ ...notice, limited: true }, vehicle]).comparison).toBe('inconclusive');
      expect(extractDocumentEvidence([notice, { ...vehicle, sourceId: notice.sourceId }]).comparison).toBe('inconclusive');
      notice.pages[0] = { ...notice.pages[0], method: 'local-ocr', confidence: index };
      expect(extractDocumentEvidence([notice, vehicle]).comparison).toBe('inconclusive');
    }
  });

  it('cannot restore independence by relabelling or correcting the same document', () => {
    for (const [index, entry] of cases.entries()) {
      const fingerprint = index.toString(16).padStart(64, '0');
      const evidence = extractDocumentEvidence([
        { ...reading(`n-${index}`, 'notice', entry.notice), fingerprint },
        { ...reading(`v-${index}`, 'vehicle-record', entry.vehicle), fingerprint },
      ]);
      const correctedNotice = correctDocumentField(evidence, `n-${index}:registration`, entry.notice);
      const correctedBoth = correctDocumentField(correctedNotice, `v-${index}:registration`, entry.vehicle);
      expect(correctedBoth.comparison).toBe('inconclusive');
      expect(correctedBoth.fields.every(field => field.sourceFingerprint === fingerprint)).toBe(true);
    }
  });

  it('does not promote arbitrary photograph text into registration findings', () => {
    for (const [index, entry] of cases.entries()) {
      const notice = reading(`n-${index}`, 'notice', entry.notice);
      const vehicle = reading(`v-${index}`, 'vehicle-record', entry.vehicle);
      const photo = reading(`p-${index}`, 'enforcement-photo', 'KA01AB9999');
      const evidence = extractDocumentEvidence([notice, vehicle, photo]);
      expect(evidence.comparison).toBe(extractDocumentEvidence([notice, vehicle]).comparison);
      expect(evidence.fields.some(field => field.role === 'enforcement-photo')).toBe(false);
    }
  });
});
