import { describe, expect, it } from 'vitest';
import { assessTollReview, buildTollPassport, buildTollWorksheet, calculateRecordedIntervalMinutes, type TollReviewAnswers } from '../lib/toll-domain';
import { tollFixtures } from '../lib/toll-fixtures';

const base: TollReviewAnswers = tollFixtures[0].answers;

describe('TollSakshi deterministic review', () => {
  it('fails closed before issuer verification', () => {
    const result = assessTollReview({ ...base, sourceVerified: false });
    expect(result.finding).toBe('insufficient');
    expect(result.route).toBe('verify-records');
  });

  it('fails closed when the final same-transaction attestation is absent', () => {
    const result = assessTollReview({ ...base, reconciliationConfirmed: false });
    expect(result.finding).toBe('insufficient');
    expect(result.shouldPrepareIssuerNote).toBe(false);
  });

  it('finds a citizen-recorded vehicle conflict without alleging fraud', () => {
    const result = assessTollReview(base);
    expect(result.finding).toBe('possible-vehicle-mismatch');
    expect(result.route).toBe('issuer');
    expect(JSON.stringify(result)).not.toMatch(/cloned|fraudulent|guaranteed refund/i);
  });

  it('requires all conservative duplicate-pattern inputs', () => {
    const fixture = tollFixtures[1].answers;
    expect(assessTollReview(fixture).finding).toBe('possible-duplicate-pattern');
    expect(assessTollReview({ ...fixture, samePlaza: false }).finding).toBe('insufficient');
    expect(assessTollReview({ ...fixture, creditAdjustment: 'not-checked' }).finding).toBe('insufficient');
    expect(assessTollReview({ ...fixture, timestampType: 'sms-received' }).finding).toBe('insufficient');
    expect(assessTollReview({ ...fixture, directionKnown: false }).finding).toBe('insufficient');
    expect(assessTollReview({ ...fixture, secondTimestampRecorded: false }).finding).toBe('insufficient');
    expect(assessTollReview({ ...fixture, recordedIntervalMinutes: -6 }).finding).toBe('insufficient');
    expect(assessTollReview(fixture).title).toMatch(/citizen-reported/i);
    expect(assessTollReview(fixture).limitations.join(' ')).toMatch(/does not decide.*NETC/i);
  });

  it('calculates entered reader-time intervals without an eligibility threshold', () => {
    expect(calculateRecordedIntervalMinutes('2026-08-24T18:05', '2026-08-24T18:11')).toBe(6);
    expect(calculateRecordedIntervalMinutes('2026-08-25T18:05', '2026-08-24T18:11')).toBeLessThan(0);
    expect(calculateRecordedIntervalMinutes('not-a-date', '2026-08-24T18:11')).toBeNull();
  });

  it('withholds a vehicle mismatch when no tag-linked vehicle suffix was recorded', () => {
    const result = assessTollReview({ ...base, vehicleSuffixRecorded: false });
    expect(result.finding).toBe('unrecognised-issuer-route');
  });

  it('withholds a vehicle mismatch when the official tag mapping was not verified', () => {
    const result = assessTollReview({ ...base, tagMappingVerified: false });
    expect(result.finding).toBe('unrecognised-issuer-route');
  });

  it('refuses to create a dispute where a corresponding credit is visible', () => {
    const result = assessTollReview({ ...tollFixtures[1].answers, creditAdjustment: 'visible' });
    expect(result.finding).toBe('already-corrected');
    expect(result.shouldPrepareIssuerNote).toBe(false);
  });

  it('keeps an aligned refusal path', () => {
    const result = assessTollReview(tollFixtures[2].answers);
    expect(result.finding).toBe('records-align');
    expect(result.shouldPrepareIssuerNote).toBe(false);
  });

  it('does not call partial aligned vehicle fields a reconciled toll event', () => {
    const result = assessTollReview({ ...tollFixtures[2].answers, transactionSuffixRecorded: false });
    expect(result.finding).toBe('insufficient');
    expect(result.shouldPrepareIssuerNote).toBe(false);
  });

  it('does not suppress an unrecognised crossing merely because entered vehicle fields match', () => {
    const result = assessTollReview({ ...base, passingPlateObservation: 'match', vehicleClassObservation: 'match' });
    expect(result.finding).toBe('unrecognised-issuer-route');
    expect(result.route).toBe('issuer');
  });

  it('routes 1033 only for a recorded National Highway plaza problem', () => {
    expect(assessTollReview({ ...base, concern: 'plaza-incident', plazaScope: 'national-highway' }).route).toBe('1033');
    expect(assessTollReview({ ...base, concern: 'plaza-incident', plazaScope: 'state-city-private' }).route).toBe('verify-records');
  });

  it('requires an event-matched alternate receipt and limits 1033 by plaza scope', () => {
    const supported = { ...base, concern: 'paid-another-way' as const, alternateReceipt: 'readable' as const, alternateReceiptEventMatch: true };
    expect(assessTollReview(supported).route).toBe('issuer-and-1033');
    expect(assessTollReview({ ...supported, plazaScope: 'state-city-private' }).route).toBe('issuer');
    expect(assessTollReview({ ...supported, alternateReceiptEventMatch: false }).finding).toBe('insufficient');
    expect(assessTollReview({ ...supported, timestampType: 'sms-received' }).finding).toBe('insufficient');
  });

  it('does not infer a fare or pass conflict from record availability alone', () => {
    const result = assessTollReview({ ...base, concern: 'fare-or-class', tariffOrPassRecord: 'readable', tariffOrPassConflictConfirmed: false });
    expect(result.finding).toBe('insufficient');
    expect(result.shouldPrepareIssuerNote).toBe(false);
    const supported = { ...base, concern: 'fare-or-class' as const, tariffOrPassRecord: 'readable' as const, tariffOrPassConflictConfirmed: true };
    expect(assessTollReview({ ...supported, timestampType: 'debit-posted' }).finding).toBe('insufficient');
  });

  it('builds a 14-element transaction passport', () => {
    const passport = buildTollPassport(base, { tagSuffix: '4721', vehicleSuffix: '2248', transactionSuffix: '8034', plaza: 'Demo Plaza' });
    expect(passport).toHaveLength(14);
    expect(passport.map((item) => item.id)).toEqual(Array.from({ length: 14 }, (_, index) => `TP${index + 1}`));
    expect(passport.find((item) => item.id === 'TP3')?.status).toBe('readable');
  });

  it('places the no-inspection boundary at the start of an issuer worksheet', () => {
    const fixture = tollFixtures[0];
    const assessment = assessTollReview(fixture.answers);
    const output = buildTollWorksheet({ ...fixture.refs, answers: fixture.answers, assessment });
    expect(output.split('\n')[1]).toMatch(/^Based only on your answers/);
    expect(output).toContain('not a chargeback');
    expect(output).not.toContain('must refund');
  });

  it('returns a non-request summary when the domain withholds an issuer note', () => {
    const fixture = tollFixtures[2];
    const assessment = assessTollReview(fixture.answers);
    const output = buildTollWorksheet({ ...fixture.refs, answers: fixture.answers, assessment });
    expect(output).toContain('NO ISSUER DISPUTE NOTE PREPARED');
    expect(output).not.toContain('NEUTRAL ISSUER REQUEST');
  });

  it('watermarks every synthetic artifact', () => {
    const fixture = tollFixtures[0];
    const assessment = assessTollReview(fixture.answers);
    const output = buildTollWorksheet({ ...fixture.refs, answers: fixture.answers, assessment, synthetic: true });
    expect(output.split('\n')[0]).toBe('SYNTHETIC FIXTURE — NOT A REAL TRANSACTION');
  });
});
