import { describe, expect, it } from 'vitest';
import { assessTollReview, buildTollPassport, buildTollWorksheet, type TollConcern, type TollReviewAnswers } from '../lib/toll-domain';
import { getTollGuideContent } from '../lib/guided-journey';
import { tollFixtures } from '../lib/toll-fixtures';
import { presentTollAssessment, tollText, buildLocalizedTollWorksheet } from '../lib/toll-presentation';

describe('FASTag Hindi presentation keeps decisions unchanged', () => {
  it('translates results and passport details for the real review without changing routes or findings', () => {
    for (const fixture of tollFixtures) {
      const assessment = assessTollReview(fixture.answers);
      const hi = presentTollAssessment(assessment, 'hi');
      expect(hi.finding).toBe(assessment.finding); expect(hi.route).toBe(assessment.route); expect(hi.shouldPrepareIssuerNote).toBe(assessment.shouldPrepareIssuerNote);
      expect(hi.title).toMatch(/[\u0900-\u097f]/); expect(hi.reasons.every(value => /[\u0900-\u097f]/.test(value))).toBe(true);
      expect(hi.limitations.every(value => /[\u0900-\u097f]/.test(value))).toBe(true);
      for (const item of buildTollPassport(fixture.answers, fixture.refs)) { expect(tollText(item.label, 'hi')).toMatch(/[\u0900-\u097f]/); expect(tollText(item.why, 'hi')).toMatch(/[\u0900-\u097f]/); }
    }
  });
  it('exports Hindi labels while preserving entered identifiers, uncertainty and official submission boundary', () => {
    const fixture = tollFixtures[0];
    const input = { ...fixture.refs, answers: fixture.answers, assessment: assessTollReview(fixture.answers) };
    expect(buildLocalizedTollWorksheet(input, 'en')).toBe(buildTollWorksheet(input));
    const note = buildLocalizedTollWorksheet(input, 'hi');
    expect(note).toContain(fixture.refs.tagSuffix); expect(note).toContain('भेजा नहीं गया'); expect(note).toContain('गारंटी नहीं');
    expect(note).not.toContain('RULE-BASED');
  });
});

it('translates every supported assessment and guide branch without changing its decision', () => {
  const concerns: TollConcern[] = ['unrecognised', 'duplicate', 'paid-another-way', 'fare-or-class', 'pass-or-discount', 'tag-lifecycle', 'plaza-incident', 'record-check', 'not-sure'];
  const variants: Partial<TollReviewAnswers>[] = [{}, { sourceVerified: false }, { reconciliationConfirmed: false }, { tagMappingVerified: false }, { passingImageStatus: 'not-supplied' }, { passingPlateObservation: 'match', vehicleClassObservation: 'match', officialSourceSelected: false }, { alternateReceipt: 'readable', alternateReceiptEventMatch: true }, { alternateReceipt: 'readable', alternateReceiptEventMatch: false }, { tariffOrPassRecord: 'readable', tariffOrPassConflictConfirmed: true }, { acknowledgement: 'readable' }, { creditAdjustment: 'visible' }, { recordedIntervalMinutes: -2 }, { plazaScope: 'unknown' }];
  for (const fixture of tollFixtures) for (const concern of concerns) for (const variant of variants) {
    const assessment = assessTollReview({ ...fixture.answers, concern, ...variant });
    const translated = presentTollAssessment(assessment, 'hi');
    for (const text of [translated.title, ...translated.reasons, ...translated.limitations]) expect(text).toMatch(/[\u0900-\u097f]/);
    expect(translated.route).toBe(assessment.route); expect(translated.finding).toBe(assessment.finding);
    for (const step of ['start', 'records', 'reconcile', 'packet'] as const) {
      const guide = getTollGuideContent({ step, startReady: true, sourceReady: variant.sourceVerified !== false, recordsReady: variant.officialSourceSelected !== false, finalConfirmationReady: variant.reconciliationConfirmed !== false, packetAvailable: assessment.shouldPrepareIssuerNote, exportAllowed: false, route: assessment.route, finding: assessment.finding });
      for (const text of [guide.currentLabel, guide.instruction, guide.why, guide.status, guide.next]) expect(tollText(text, 'hi')).toMatch(/[\u0900-\u097f]/);
    }
  }
});
