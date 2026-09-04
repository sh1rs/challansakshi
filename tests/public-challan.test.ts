import { describe, expect, it } from 'vitest';
import {
  assessCitizenChallanReview,
  buildCitizenChallanWorksheet,
  calculateEnteredOfficialDeadline,
  citizenSituationForFinding,
  projectActionReadyReviewFacts,
  type CitizenChallanAnswers,
  type ReviewFact,
} from '../lib/public-challan';

const complete: CitizenChallanAnswers = {
  sourceStatus: 'official-service', imageInspected: true, plateObservation: 'match', categoryObservation: 'match', colourObservation: 'match',
  offenceObservation: 'appears-visible', timestampStatus: 'displayed', locationStatus: 'displayed',
  ownRecordAvailable: 'present', noticeCopyAvailable: 'present', custodyRecordAvailable: 'not-applicable',
};

const fact = <T>(
  value: T,
  overrides: Partial<ReviewFact<T>> = {},
): ReviewFact<T> => ({
  value,
  source: 'citizen-attestation',
  confidence: 'high',
  limitation: 'Citizen-confirmed fact used only for this review.',
  confirmation: 'citizen-confirmed',
  reviewRevisionId: 'review-1',
  ...overrides,
});

const actionReadyBase: CitizenChallanAnswers = {
  ...complete,
  categoryObservation: 'different',
  reviewRevisionId: 'review-1',
};

import { deriveImageInspected } from '../lib/public-challan';

describe('derived photograph inspection', () => {
  const unclear = {
    plateObservation: 'unclear',
    categoryObservation: 'unclear',
    colourObservation: 'unclear',
    offenceObservation: 'unclear',
    timestampStatus: 'unclear',
    locationStatus: 'unclear',
  } as const;

  it('treats a selected photograph as inspection', () => {
    expect(deriveImageInspected(unclear, true)).toBe(true);
  });

  it('stays false when nothing was recorded and no photograph was chosen', () => {
    expect(deriveImageInspected(unclear, false)).toBe(false);
  });

  it.each([
    ['plateObservation', 'different'],
    ['categoryObservation', 'match'],
    ['colourObservation', 'not-visible'],
    ['offenceObservation', 'appears-visible'],
    ['timestampStatus', 'displayed'],
    ['locationStatus', 'not-found'],
  ] as const)('counts a recorded %s as inspection', (key, value) => {
    expect(deriveImageInspected({ ...unclear, [key]: value }, false)).toBe(true);
  });
});

describe('public challan self-review', () => {
  it.each(['missing', 'unclear', 'not-applicable'] as const)('requires a readable independent record even for aligned or unclear observations: %s', (ownRecordAvailable) => {
    for (const plateObservation of ['match', 'unclear', 'different'] as const) {
      expect(assessCitizenChallanReview({ ...complete, ownRecordAvailable, plateObservation }))
        .toMatchObject({ finding: 'insufficient-review', canPrepareWorksheet: false,
          missingEvidence: expect.arrayContaining(['A readable independent vehicle record you can compare against']) });
    }
  });
  it('names both missing prerequisites before any comparisons', () => {
    expect(assessCitizenChallanReview({ ...complete, ownRecordAvailable: 'missing', imageInspected: false }).missingEvidence)
      .toEqual(['A readable independent vehicle record you can compare against', 'Officially supplied evidence image']);
  });
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

  it('keeps a generic category difference worksheet-eligible but abstains from action-ready class mapping', () => {
    const assessment = assessCitizenChallanReview(actionReadyBase);
    expect(assessment).toMatchObject({ finding: 'citizen-recorded-inconsistency', canPrepareWorksheet: true });
    expect(projectActionReadyReviewFacts(actionReadyBase)).toMatchObject({
      status: 'abstained',
      reason: 'missing-explicit-facts',
    });
  });

  it('requires both explicit two-versus-four vehicle classes and an independent readable record', () => {
    const citizenVehicleClass = fact('four-wheeler' as const, { source: 'independent-vehicle-record' });
    const observedEvidenceVehicleClass = fact('two-wheeler' as const, { source: 'official-evidence-image' });
    const independentReadableVehicleRecord = fact(true, { source: 'independent-vehicle-record' });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      citizenVehicleClass,
      observedEvidenceVehicleClass,
      independentReadableVehicleRecord,
    })).toEqual({
      status: 'eligible',
      facts: {
        reviewRevisionId: 'review-1',
        citizenVehicleClass,
        observedEvidenceVehicleClass,
        independentReadableVehicleRecord,
        supportedSignals: ['vehicle-class-conflict'],
      },
    });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      citizenVehicleClass,
      independentReadableVehicleRecord,
    })).toMatchObject({ status: 'abstained', reason: 'missing-explicit-facts' });
  });

  it('does not treat other, unclear, or same explicit classes as a supported class conflict', () => {
    const independentReadableVehicleRecord = fact(true, { source: 'independent-vehicle-record' });
    for (const [citizenVehicleClass, observedEvidenceVehicleClass] of [
      ['four-wheeler', 'four-wheeler'],
      ['other', 'two-wheeler'],
      ['unclear', 'four-wheeler'],
    ] as const) {
      expect(projectActionReadyReviewFacts({
        ...actionReadyBase,
        citizenVehicleClass: fact(citizenVehicleClass, { source: 'independent-vehicle-record' }),
        observedEvidenceVehicleClass: fact(observedEvidenceVehicleClass, { source: 'official-evidence-image' }),
        independentReadableVehicleRecord,
      })).toMatchObject({ status: 'abstained', reason: 'unsupported-signal' });
    }
  });

  it('requires a separate citizen-confirmed basis before adding a duplicate-plate signal', () => {
    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      duplicatePlateIndependentBasis: fact('none' as const),
    })).toMatchObject({ status: 'abstained', reason: 'unsupported-signal' });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      duplicatePlateIndependentBasis: fact('citizen-confirmed' as const, { confirmation: 'unconfirmed' }),
    })).toMatchObject({ status: 'abstained', reason: 'unconfirmed-fact' });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      duplicatePlateIndependentBasis: fact('citizen-confirmed' as const),
    })).toMatchObject({
      status: 'eligible',
      facts: {
        duplicatePlateIndependentBasis: { value: 'citizen-confirmed' },
        supportedSignals: ['duplicate-plate'],
      },
    });
  });

  it('requires same-revision confirmed provenance for Wrong Evidence Captured', () => {
    const wrongEvidenceBasis = fact('different-vehicle' as const, { source: 'citizen-attestation' });
    expect(projectActionReadyReviewFacts({ ...actionReadyBase, wrongEvidenceBasis })).toEqual({
      status: 'eligible',
      facts: {
        reviewRevisionId: 'review-1',
        wrongEvidenceBasis,
        supportedSignals: ['wrong-evidence'],
      },
    });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      wrongEvidenceBasis: fact('different-vehicle' as const, { confirmation: 'unconfirmed' }),
    })).toMatchObject({ status: 'abstained', reason: 'unconfirmed-fact' });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      wrongEvidenceBasis: fact('different-vehicle' as const, { reviewRevisionId: 'review-2' }),
    })).toMatchObject({ status: 'abstained', reason: 'revision-mismatch' });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      wrongEvidenceBasis: fact('different-vehicle' as const, { source: 'official-evidence-image' }),
    })).toMatchObject({ status: 'abstained', reason: 'unsupported-signal' });
  });

  it('requires equivalent same-revision provenance for Wrong Vehicle Number Entered By Officer', () => {
    const vehicleNumberEntryMismatchBasis = fact('visible-entry-mismatch' as const, { source: 'official-record' });
    expect(projectActionReadyReviewFacts({ ...actionReadyBase, vehicleNumberEntryMismatchBasis })).toEqual({
      status: 'eligible',
      facts: {
        reviewRevisionId: 'review-1',
        vehicleNumberEntryMismatchBasis,
        supportedSignals: ['vehicle-number-entry-mismatch'],
      },
    });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      vehicleNumberEntryMismatchBasis: fact('visible-entry-mismatch' as const, { source: 'official-evidence-image' }),
    })).toMatchObject({ status: 'abstained', reason: 'unsupported-signal' });
  });

  it('requires a high-confidence, non-empty, same-revision fact before carrying it into the projection', () => {
    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      wrongEvidenceBasis: fact('unrelated-scene' as const, { confidence: 'medium' }),
    })).toMatchObject({ status: 'abstained', reason: 'low-confidence-fact' });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      wrongEvidenceBasis: fact('unrelated-scene' as const, { limitation: '   ' }),
    })).toMatchObject({ status: 'abstained', reason: 'missing-explicit-facts' });

    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      reviewRevisionId: '',
      wrongEvidenceBasis: fact('unrelated-scene' as const),
    })).toMatchObject({ status: 'abstained', reason: 'missing-explicit-facts' });
  });

  it('reconstructs an action-ready fact without carrying unknown caller properties', () => {
    const projection = projectActionReadyReviewFacts({
      ...actionReadyBase,
      wrongEvidenceBasis: {
        ...fact('unrelated-scene' as const),
        citizenIdentifier: 'must-not-cross-the-projection',
      } as ReviewFact<'unrelated-scene'>,
    });

    expect(projection.status).toBe('eligible');
    expect(JSON.stringify(projection)).not.toContain('citizenIdentifier');
    expect(JSON.stringify(projection)).not.toContain('must-not-cross-the-projection');
  });

  it('requires a true independent readable-record fact for a plate-conflict signal', () => {
    const plateAnswers: CitizenChallanAnswers = {
      ...complete,
      plateObservation: 'different',
      reviewRevisionId: 'review-1',
    };
    expect(projectActionReadyReviewFacts({
      ...plateAnswers,
      independentReadableVehicleRecord: fact(false, { source: 'independent-vehicle-record' }),
    })).toMatchObject({ status: 'abstained', reason: 'record-not-independent-readable' });

    expect(projectActionReadyReviewFacts({
      ...plateAnswers,
      independentReadableVehicleRecord: fact(true, { source: 'independent-vehicle-record' }),
    })).toMatchObject({
      status: 'eligible',
      facts: { supportedSignals: ['readable-plate-conflict'] },
    });
  });

  it('abstains before projection for non-official sources and non-discrepancy assessments', () => {
    expect(projectActionReadyReviewFacts({
      ...actionReadyBase,
      sourceStatus: 'message-only',
      wrongEvidenceBasis: fact('different-vehicle' as const),
    })).toEqual({ status: 'abstained', reason: 'source-not-official' });

    expect(projectActionReadyReviewFacts({
      ...complete,
      reviewRevisionId: 'review-1',
      wrongEvidenceBasis: fact('different-vehicle' as const),
    })).toEqual({ status: 'abstained', reason: 'assessment-not-discrepancy' });
  });

  it('deduplicates supported signals in a fixed order and carries only validated same-revision facts', () => {
    const independentReadableVehicleRecord = fact(true, { source: 'independent-vehicle-record' });
    const wrongEvidenceBasis = fact('unrelated-scene' as const);
    const duplicatePlateIndependentBasis = fact('citizen-confirmed' as const);
    const projection = projectActionReadyReviewFacts({
      ...complete,
      plateObservation: 'different',
      categoryObservation: 'different',
      reviewRevisionId: 'review-1',
      independentReadableVehicleRecord,
      citizenVehicleClass: fact('four-wheeler' as const, { source: 'independent-vehicle-record' }),
      observedEvidenceVehicleClass: fact('two-wheeler' as const, { source: 'official-evidence-image' }),
      wrongEvidenceBasis,
      duplicatePlateIndependentBasis,
    });

    expect(projection).toMatchObject({
      status: 'eligible',
      facts: {
        independentReadableVehicleRecord,
        wrongEvidenceBasis,
        duplicatePlateIndependentBasis,
        supportedSignals: [
          'readable-plate-conflict',
          'vehicle-class-conflict',
          'wrong-evidence',
          'duplicate-plate',
        ],
      },
    });
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
