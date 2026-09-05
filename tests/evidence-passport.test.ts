import { describe, expect, it } from 'vitest';
import { fixtures } from '../lib/fixtures';
import {
  buildEvidencePassportSnapshot,
  buildCustodyReadinessItem,
  buildSuppliedEvidencePassport,
  createEvidencePassportRevisionId,
  custodyScenarios,
  custodyScenarioAt,
  deriveCaseAssessment,
  evaluateCustodyTimeline,
  type CustodyScenario,
} from '../lib/evidence-passport';
import { inspectSyntheticNotice, syntheticNoticeFixtures } from '../lib/notice-safety';
import { classifyEvidenceComparison } from '../lib/domain';

describe('custody timeline engine', () => {
  it('returns all three abstention-aware states for the supplied fixtures', () => {
    expect(evaluateCustodyTimeline(custodyScenarios['sold-before-event']).finding).toBe('temporal-conflict');
    expect(evaluateCustodyTimeline(custodyScenarios['rental-unclear']).finding).toBe('insufficient-record');
    expect(evaluateCustodyTimeline(custodyScenarios['fleet-aligned']).finding).toBe('records-align');
  });

  it('binds every scenario to each fixture event without changing the scenario semantics', () => {
    for (const fixture of Object.values(fixtures)) {
      expect(evaluateCustodyTimeline(custodyScenarioAt('owner-aligned', fixture.incidentAt)).finding).toBe('records-align');
      expect(evaluateCustodyTimeline(custodyScenarioAt('sold-before-event', fixture.incidentAt)).finding).toBe('temporal-conflict');
      expect(evaluateCustodyTimeline(custodyScenarioAt('rental-unclear', fixture.incidentAt)).finding).toBe('insufficient-record');
      expect(evaluateCustodyTimeline(custodyScenarioAt('fleet-aligned', fixture.incidentAt)).finding).toBe('records-align');
    }
  });

  it('treats exact interval boundaries as included', () => {
    const scenario: CustodyScenario = {
      ...custodyScenarios['owner-aligned'],
      eventAt: custodyScenarios['owner-aligned'].intervals[0].endsAt!,
    };
    expect(evaluateCustodyTimeline(scenario).finding).toBe('records-align');
  });

  it('does not turn an unverified overlapping record into an aligned result', () => {
    const scenario: CustodyScenario = {
      ...custodyScenarios['owner-aligned'],
      intervals: custodyScenarios['owner-aligned'].intervals.map((interval) => ({ ...interval, verificationStatus: 'unverified' })),
    };
    expect(evaluateCustodyTimeline(scenario).finding).toBe('insufficient-record');
  });

  it('rejects invalid dates and reversed intervals without guessing', () => {
    const malformed: CustodyScenario = { ...custodyScenarios['owner-aligned'], eventAt: '20 Aug 2026' };
    expect(evaluateCustodyTimeline(malformed)).toMatchObject({ finding: 'insufficient-record', invalidIntervalIds: ['event-at'] });

    const reversed: CustodyScenario = {
      ...custodyScenarios['owner-aligned'],
      intervals: custodyScenarios['owner-aligned'].intervals.map((interval) => ({ ...interval, startsAt: '2026-08-21T10:00:00+05:30', endsAt: '2026-08-20T10:00:00+05:30' })),
    };
    expect(evaluateCustodyTimeline(reversed)).toMatchObject({ finding: 'insufficient-record', invalidIntervalIds: ['C1'] });
  });

  it('supports a confirmed open-ended interval', () => {
    const openEnded: CustodyScenario = {
      ...custodyScenarios['owner-aligned'],
      intervals: custodyScenarios['owner-aligned'].intervals.map((interval) => ({ ...interval, endsAt: null })),
    };
    expect(evaluateCustodyTimeline(openEnded).finding).toBe('records-align');
  });
});

describe('supplied-evidence passport', () => {
  it('maps the mismatch fixture without deciding legal validity', () => {
    const passport = buildSuppliedEvidencePassport('mismatch', fixtures.mismatch.extractedFacts);
    expect(passport.counts['not-found']).toBe(2);
    expect(passport.notFoundIds).toEqual(['EP7', 'EP8']);
    expect(passport.elements.find((element) => element.id === 'EP6')?.status).toBe('not-applicable');
    expect(passport.elements.find((element) => element.id === 'EP5')?.status).toBe('verify-official');
  });

  it('preserves unreadable evidence as unclear rather than absent', () => {
    const passport = buildSuppliedEvidencePassport('inconclusive', fixtures.inconclusive.extractedFacts);
    expect(passport.elements.find((element) => element.id === 'EP2')?.status).toBe('supplied-unclear');
    expect(passport.elements.find((element) => element.id === 'EP3')?.status).toBe('supplied-unclear');
  });

  it('describes the synthetic physical plate in both passport languages', () => {
    const passport = buildSuppliedEvidencePassport('consistent', fixtures.consistent.extractedFacts);
    const plate = passport.elements.find((element) => element.id === 'EP2');
    expect(plate?.sourceReference).toEqual({
      en: 'Synthetic enforcement image · physical plate',
      hi: 'सिंथेटिक प्रवर्तन फ़ोटो · वाहन की नंबर प्लेट',
    });
    expect(plate?.note.en).toContain('Confirm the visible characters yourself');
  });

  it('creates a stable revision only after both citizen confirmations', () => {
    const suppliedEvidence = buildSuppliedEvidencePassport('mismatch', fixtures.mismatch.extractedFacts);
    const base = {
      generatedOn: '2026-08-27', fixtureId: 'mismatch' as const, factRevisionId: 'REV-MISMATCH-1234', identityFinding: 'mismatch' as const,
      custodyScenarioId: 'owner-aligned' as const, eventAt: fixtures.mismatch.incidentAt, suppliedEvidence,
    };
    expect(buildEvidencePassportSnapshot({ ...base, custodyReviewed: true, suppliedPacketScopeReviewed: false })).toBeNull();
    const snapshot = buildEvidencePassportSnapshot({ ...base, custodyReviewed: true, suppliedPacketScopeReviewed: true });
    expect(snapshot?.revisionId).toBe(createEvidencePassportRevisionId(base));
    expect(snapshot?.custodyScenario.eventAt).toBe(fixtures.mismatch.incidentAt);
    expect(snapshot?.boundaries.join(' ')).toContain('does not identify the driver');
    expect(snapshot?.boundaries.join(' ')).toContain('not a cryptographic integrity proof');
  });

  it('changes the revision when a custody scenario changes', () => {
    const suppliedEvidence = buildSuppliedEvidencePassport('mismatch', fixtures.mismatch.extractedFacts);
    const shared = { fixtureId: 'mismatch' as const, factRevisionId: 'REV-MISMATCH-1234', identityFinding: 'mismatch' as const, eventAt: fixtures.mismatch.incidentAt, suppliedEvidence };
    const owner = createEvidencePassportRevisionId({ ...shared, custodyScenarioId: 'owner-aligned' });
    const sold = createEvidencePassportRevisionId({ ...shared, custodyScenarioId: 'sold-before-event' });
    expect(owner).not.toBe(sold);
  });

  it('changes the revision when the alleged event instant changes', () => {
    const suppliedEvidence = buildSuppliedEvidencePassport('consistent', fixtures.consistent.extractedFacts);
    const shared = { fixtureId: 'consistent' as const, factRevisionId: 'REV-CONSISTENT-1234', identityFinding: 'consistent' as const, custodyScenarioId: 'sold-before-event' as const, suppliedEvidence };
    const morning = createEvidencePassportRevisionId({ ...shared, eventAt: fixtures.consistent.incidentAt });
    const evening = createEvidencePassportRevisionId({ ...shared, eventAt: fixtures.inconclusive.incidentAt });
    expect(morning).not.toBe(evening);
  });
});

describe('combined case assessment', () => {
  it('preserves the no-dispute refusal when visual and custody records align', () => {
    const visual = classifyEvidenceComparison(fixtures.consistent.confirmedFacts);
    const custody = evaluateCustodyTimeline(custodyScenarios['owner-aligned']);
    expect(deriveCaseAssessment(visual, custody, true)).toMatchObject({ permittedArtifact: 'none', canPreparePack: false });
  });

  it('allows a narrowly scoped custody review even when the image is consistent', () => {
    const visual = classifyEvidenceComparison(fixtures.consistent.confirmedFacts);
    const scenario = custodyScenarioAt('sold-before-event', fixtures.consistent.incidentAt);
    const custody = evaluateCustodyTimeline(scenario);
    const assessment = deriveCaseAssessment(visual, custody, true);
    expect(assessment).toMatchObject({ permittedArtifact: 'ownership-custody-review-request', canPreparePack: true });
    expect(buildCustodyReadinessItem(assessment, scenario)).toMatchObject({ id: 'custody-record-c2', status: 'present' });
  });

  it('combines supported grounds without changing the visual result', () => {
    const visual = classifyEvidenceComparison(fixtures.mismatch.confirmedFacts);
    const custody = evaluateCustodyTimeline(custodyScenarios['sold-before-event']);
    const assessment = deriveCaseAssessment(visual, custody, true);
    expect(assessment).toMatchObject({ permittedArtifact: 'combined-review-request', canPreparePack: true });
    expect(assessment.visual.finding).toBe('mismatch');
  });

  it('does not use an unclear custody record as a review ground', () => {
    const visual = classifyEvidenceComparison(fixtures.consistent.confirmedFacts);
    const custody = evaluateCustodyTimeline(custodyScenarios['rental-unclear']);
    expect(deriveCaseAssessment(visual, custody, true)).toMatchObject({ permittedArtifact: 'none', canPreparePack: false });
  });
});

describe('compact notice preflight', () => {
  it('flags an executable notice and a credential request without opening either link', () => {
    const apk = inspectSyntheticNotice(syntheticNoticeFixtures['apk-message'].message);
    const otp = inspectSyntheticNotice(syntheticNoticeFixtures['short-link-request'].message);
    expect(apk).toMatchObject({ risk: 'pause-and-verify' });
    expect(apk.signals).toContain('apk-or-executable');
    expect(otp).toMatchObject({ risk: 'pause-and-verify' });
    expect(otp.signals).toEqual(expect.arrayContaining(['shortened-link', 'credential-request']));
  });

  it('keeps an obscured short-link example at caution when no unsafe request is present', () => {
    const result = inspectSyntheticNotice(syntheticNoticeFixtures['forwarded-unclear'].message);
    expect(result).toMatchObject({ risk: 'caution', officialHostPresent: false });
    expect(result.signals).toContain('shortened-link');
  });

  it('uses a deliberately limited result for an official-domain example', () => {
    const result = inspectSyntheticNotice(syntheticNoticeFixtures['official-route'].message);
    expect(result).toMatchObject({ risk: 'no-obvious-indicator', officialHostPresent: true });
    expect(result.signals).toContain('official-domain');
  });

  it('never treats a linkless or unknown message as safe', () => {
    expect(inspectSyntheticNotice('A traffic notice may exist.').risk).toBe('caution');
    expect(inspectSyntheticNotice('Pay now at https://traffic-notice.example/').risk).toBe('caution');
  });

  it('requires an exact clean HTTPS official origin', () => {
    expect(inspectSyntheticNotice('Open http://echallan.parivahan.gov.in/').risk).toBe('caution');
    expect(inspectSyntheticNotice('Open https://echallan.parivahan.gov.in:8443/').risk).toBe('caution');
    expect(inspectSyntheticNotice('Open https://demo@echallan.parivahan.gov.in/').risk).toBe('pause-and-verify');
    expect(inspectSyntheticNotice('Open https://echallan.parivahan.gov.in.attacker.example/').risk).toBe('caution');
    expect(inspectSyntheticNotice('Open https://xn--echllan-9za.example/').risk).toBe('caution');
  });

  it('stops on remote-access and personal-payment requests even without a link', () => {
    const remote = inspectSyntheticNotice('Install AnyDesk and share your screen so RTO support can clear the notice.');
    const payment = inspectSyntheticNotice('Send money to this personal UPI ID to settle the fine.');
    expect(remote).toMatchObject({ risk: 'pause-and-verify' });
    expect(remote.signals).toContain('remote-access-request');
    expect(payment).toMatchObject({ risk: 'pause-and-verify' });
    expect(payment.signals).toContain('personal-payment-request');
  });
});
