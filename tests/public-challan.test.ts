import { describe, expect, it } from 'vitest';
import { assessCitizenChallanReview, buildCitizenChallanWorksheet, calculateEnteredOfficialDeadline, citizenSituationForFinding, type CitizenChallanAnswers } from '../lib/public-challan';

const complete: CitizenChallanAnswers = {
  sourceStatus: 'official-service', imageInspected: true, plateObservation: 'match', categoryObservation: 'match', colourObservation: 'match',
  offenceObservation: 'appears-visible', timestampStatus: 'displayed', locationStatus: 'displayed',
  ownRecordAvailable: 'present', noticeCopyAvailable: 'present', custodyRecordAvailable: 'not-applicable',
};

describe('public challan self-review', () => {
  it('blocks a message-only notice before comparison', () => {
    const result = assessCitizenChallanReview({ ...complete, sourceStatus: 'message-only' });
    expect(result.finding).toBe('source-not-verified');
    expect(result.canPrepareWorksheet).toBe(false);
  });

  it('does not assume an official source before the citizen chooses one', () => {
    const result = assessCitizenChallanReview({ ...complete, sourceStatus: 'not-selected' });
    expect(result.finding).toBe('source-not-verified');
    expect(result.canPrepareWorksheet).toBe(false);
  });

  it('blocks a vehicle conclusion when the supplied image was not inspected', () => {
    const result = assessCitizenChallanReview({ ...complete, imageInspected: false });
    expect(result.finding).toBe('insufficient-review');
    expect(result.canPrepareWorksheet).toBe(false);
  });

  it('treats readable plate or category conflict as a citizen-recorded inconsistency', () => {
    expect(assessCitizenChallanReview({ ...complete, plateObservation: 'different' }).finding).toBe('citizen-recorded-inconsistency');
    expect(assessCitizenChallanReview({ ...complete, categoryObservation: 'different' }).finding).toBe('citizen-recorded-inconsistency');
  });

  it.each(['missing', 'unclear', 'not-applicable'] as const)('does not anchor a vehicle mismatch to memory when the comparison record is %s', (ownRecordAvailable) => {
    const result = assessCitizenChallanReview({
      ...complete,
      plateObservation: 'different',
      offenceObservation: 'unclear',
      timestampStatus: 'unclear',
      locationStatus: 'unclear',
      ownRecordAvailable,
    });
    expect(result.finding).toBe('insufficient-review');
    expect(result.canPrepareWorksheet).toBe(false);
    expect(result.cautions).toContain('A readable vehicle record is required before treating a plate or category observation as a comparison.');
  });

  it('does not use colour alone as an action-ready mismatch', () => {
    const result = assessCitizenChallanReview({ ...complete, colourObservation: 'different' });
    expect(result.finding).toBe('entries-do-not-support-mismatch');
    expect(result.canPrepareWorksheet).toBe(false);
  });

  it('preserves unclear and not-visible evidence as an uncertainty finding', () => {
    expect(assessCitizenChallanReview({ ...complete, plateObservation: 'unclear' }).finding).toBe('supplied-image-unclear');
    expect(assessCitizenChallanReview({ ...complete, offenceObservation: 'not-visible' }).finding).toBe('supplied-image-unclear');
  });

  it('uses only a citizen-entered official deadline', () => {
    expect(calculateEnteredOfficialDeadline('', '2026-08-28').status).toBe('not-entered');
    expect(calculateEnteredOfficialDeadline('2026-08-28', '2026-08-28').status).toBe('today');
    expect(calculateEnteredOfficialDeadline('2026-09-02', '2026-08-28').daysRemaining).toBe(5);
    expect(calculateEnteredOfficialDeadline('2026-08-20', '2026-08-28').status).toBe('passed');
    expect(() => calculateEnteredOfficialDeadline('2026-02-30', '2026-08-28')).toThrow();
  });

  it.each([
    ['source-not-verified', 'source-not-verified'],
    ['insufficient-review', 'insufficient-review'],
    ['entries-do-not-support-mismatch', 'records-appear-consistent'],
    ['supplied-image-unclear', 'evidence-unclear'],
    ['citizen-recorded-inconsistency', 'material-inconsistency-recorded'],
  ] as const)('maps the stable citizen situation alias for %s', (finding, situation) => {
    expect(citizenSituationForFinding(finding)).toBe(situation);
  });

  it('places the no-inspection boundary at the start of every worksheet', () => {
    const assessment = assessCitizenChallanReview({ ...complete, plateObservation: 'different' });
    const output = buildCitizenChallanWorksheet({ stateLabel: 'Karnataka', vehicleSuffix: '3317', allegedOffence: 'Helmet', eventDate: '2026-08-20', officialDeadline: '', assessment, answers: { ...complete, plateObservation: 'different' } });
    expect(output.split('\n')[1]).toMatch(/^Based only on your answers/);
    expect(output).not.toContain('TEST-26');
    expect(output).toContain('Nothing from this worksheet is transferred');
  });

  it('returns a non-request summary for an aligned refusal', () => {
    const assessment = assessCitizenChallanReview(complete);
    const output = buildCitizenChallanWorksheet({ stateLabel: 'Central e-Challan service', vehicleSuffix: '3317', allegedOffence: 'Helmet', eventDate: '', officialDeadline: '', assessment, answers: complete });
    expect(output).toContain('NO DISPUTE REQUEST PREPARED');
    expect(output).not.toContain('NEUTRAL CLARIFICATION REQUEST');
  });
});
