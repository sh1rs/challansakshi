import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  OFFICIAL_DESTINATIONS,
  OFFICIAL_ROUTE_REGISTRY_VERSION,
} from '../lib/official-destinations';
import {
  buildOfficialHandoffPack,
  buildReviewedFactProjection,
  buildSyntheticHandoffSimulation,
  mapLegacyIssue,
  normalizeReviewedDescription,
  type OfficialHandoffPack,
  type RealHandoffBuildInput,
  type SyntheticHandoffBuildInput,
  type SyntheticHandoffSimulation,
} from '../lib/official-handoff';
import type { ActionReadyReviewFacts, ReviewFact } from '../lib/public-challan';
import { TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE } from './fixtures/official-destination-fixtures';

const NOW = '2026-09-03T10:30:00.000Z';
const RESULT_REVISION = 'review-1';
const PACK_REVISION = 'pack-1';

const fact = <T>(
  value: T,
  source: ReviewFact<T>['source'],
  overrides: Partial<ReviewFact<T>> = {},
): ReviewFact<T> => ({
  value,
  source,
  confidence: 'high',
  limitation: 'Confirmed for this review only.',
  confirmation: 'citizen-confirmed',
  reviewRevisionId: RESULT_REVISION,
  ...overrides,
});

const classConflictFacts = (
  citizenClass: 'two-wheeler' | 'four-wheeler' = 'four-wheeler',
  evidenceClass: 'two-wheeler' | 'four-wheeler' = 'two-wheeler',
): ActionReadyReviewFacts => ({
  reviewRevisionId: RESULT_REVISION,
  citizenVehicleClass: fact(citizenClass, 'independent-vehicle-record'),
  observedEvidenceVehicleClass: fact(evidenceClass, 'official-evidence-image'),
  independentReadableVehicleRecord: fact(true, 'independent-vehicle-record'),
  supportedSignals: ['vehicle-class-conflict'],
});

const selfConfirmation = {
  role: 'self',
  affectedPersonInspectedEvidence: true,
  affectedPersonInspectedReadableRecord: true,
  affectedPersonConfirmedEntitlement: true,
  affectedPersonConfirmedPack: true,
} as const;

const helperConfirmation = {
  role: 'present-helper',
  affectedPersonPresent: true,
  affectedPersonInspectedEvidence: true,
  affectedPersonInspectedReadableRecord: true,
  affectedPersonConfirmedEntitlement: true,
  affectedPersonRequestedPreparation: true,
  affectedPersonConfirmedPack: true,
} as const;

const realInput = (overrides: Partial<RealHandoffBuildInput> = {}): RealHandoffBuildInput => ({
  mode: 'real',
  sourceKind: 'official-service',
  route: OFFICIAL_DESTINATIONS.nextgen,
  jurisdictionConfirmation: { status: 'confirmed', code: 'KA' },
  now: NOW,
  facts: classConflictFacts(),
  resultClass: 'possible-discrepancy',
  resultRevisionId: RESULT_REVISION,
  packRevisionId: PACK_REVISION,
  reviewedDescription: 'I request a review of this record.\r\nPlease verify the original evidence and vehicle mapping.',
  confirmation: {
    status: 'confirmed',
    packRevisionId: PACK_REVISION,
    roleConfirmation: selfConfirmation,
  },
  generatedAt: NOW,
  ...overrides,
});

const syntheticInput = (overrides: Partial<SyntheticHandoffBuildInput> = {}): SyntheticHandoffBuildInput => ({
  mode: 'synthetic',
  sourceKind: 'bundled-synthetic-record',
  routeKey: 'synthetic-fixture',
  facts: classConflictFacts(),
  resultClass: 'possible-discrepancy',
  resultRevisionId: RESULT_REVISION,
  packRevisionId: PACK_REVISION,
  reviewedDescription: 'Synthetic example requesting review of a fictional vehicle-class mismatch.',
  confirmation: {
    status: 'confirmed',
    packRevisionId: PACK_REVISION,
    roleConfirmation: selfConfirmation,
  },
  generatedAt: NOW,
  ...overrides,
});

describe('reviewed handoff description normalization', () => {
  it('normalizes CRLF and lone CR to LF before applying Unicode NFC', () => {
    expect(normalizeReviewedDescription('Cafe\u0301\r\nनमस्ते\rnext')).toBe('Café\nनमस्ते\nnext');
  });

  it('counts Unicode code points rather than UTF-16 code units for emoji and Devanagari', () => {
    expect(Array.from(normalizeReviewedDescription('😀'.repeat(500)))).toHaveLength(500);
    expect(Array.from(normalizeReviewedDescription('क'.repeat(500)))).toHaveLength(500);
    expect(() => normalizeReviewedDescription('😀'.repeat(501))).toThrow(/500 Unicode code points/);
    expect(() => normalizeReviewedDescription('क'.repeat(501))).toThrow(/500 Unicode code points/);
  });

  it('applies NFC before the 500-code-point boundary without silently truncating combining text', () => {
    const exactlyFiveHundredAfterNfc = 'e\u0301'.repeat(500);
    const tooLongAfterNfc = 'e\u0301'.repeat(501);

    expect(normalizeReviewedDescription(exactlyFiveHundredAfterNfc)).toBe('é'.repeat(500));
    expect(() => normalizeReviewedDescription(tooLongAfterNfc)).toThrow(/501.*500 Unicode code points/);
    expect(tooLongAfterNfc).toHaveLength(1002);
  });

  it('rejects empty text and malformed lone-surrogate Unicode', () => {
    expect(() => normalizeReviewedDescription(' \r\n ')).toThrow(/non-empty/);
    expect(() => normalizeReviewedDescription('\ud800')).toThrow(/well-formed Unicode/);
  });
});

describe('supported issue mapping', () => {
  it('maps all exact verified Legacy categories from explicit confirmed facts', () => {
    expect(TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE.destination).toMatchObject({
      key: 'legacy',
      capabilities: { category: true },
    });

    expect(mapLegacyIssue({
      reviewRevisionId: RESULT_REVISION,
      wrongEvidenceBasis: fact('different-vehicle', 'citizen-attestation'),
      supportedSignals: ['wrong-evidence'],
    })).toEqual({
      issueCode: 'wrong-evidence-captured',
      label: 'Wrong Evidence Captured',
      value: 'Wrong Image',
    });
    expect(mapLegacyIssue({
      reviewRevisionId: RESULT_REVISION,
      vehicleNumberEntryMismatchBasis: fact('visible-entry-mismatch', 'official-record'),
      supportedSignals: ['vehicle-number-entry-mismatch'],
    })).toEqual({
      issueCode: 'wrong-vehicle-number-entered-by-officer',
      label: 'Wrong Vehicle Number Entered By Officer',
      value: 'Wrong Vehicle Number Entered By Officer',
    });
    expect(mapLegacyIssue(classConflictFacts('four-wheeler', 'two-wheeler'))).toEqual({
      issueCode: 'two-wheeler-on-four-wheeler',
      label: '2 Wheeler Challan On 4 Wheeler',
      value: '2 Wheeler Challan On 4 Wheeler',
    });
    expect(mapLegacyIssue(classConflictFacts('two-wheeler', 'four-wheeler'))).toEqual({
      issueCode: 'four-wheeler-on-two-wheeler',
      label: '4 Wheeler Challan On 2 Wheeler',
      value: '4 Wheeler Challan On 2 Wheeler',
    });
    expect(mapLegacyIssue({
      reviewRevisionId: RESULT_REVISION,
      duplicatePlateIndependentBasis: fact('citizen-confirmed', 'citizen-attestation'),
      supportedSignals: ['duplicate-plate'],
    })).toEqual({
      issueCode: 'duplicate-number-plate',
      label: 'Duplicate Number Plate',
      value: 'Duplicate Number Plate',
    });
  });

  it('abstains from a Legacy category for a generic plate conflict or unclear class facts', () => {
    expect(mapLegacyIssue({
      reviewRevisionId: RESULT_REVISION,
      independentReadableVehicleRecord: fact(true, 'independent-vehicle-record'),
      supportedSignals: ['readable-plate-conflict'],
    })).toBeNull();
    expect(mapLegacyIssue({
      ...classConflictFacts(),
      observedEvidenceVehicleClass: fact('unclear', 'official-evidence-image'),
    })).toBeNull();
  });

  it('reconstructs a neutral fact projection without unknown caller properties', () => {
    const facts = {
      ...classConflictFacts(),
      directIdentifier: 'KA01SECRET',
      citizenVehicleClass: {
        ...classConflictFacts().citizenVehicleClass,
        rawFilename: 'private-registration.pdf',
      },
    } as unknown as ActionReadyReviewFacts;

    const projection = buildReviewedFactProjection(facts);
    expect(projection).toMatchObject({
      reviewRevisionId: RESULT_REVISION,
      supportedSignals: ['vehicle-class-conflict'],
      citizenVehicleClass: {
        value: 'four-wheeler',
        source: 'independent-vehicle-record',
        confirmation: 'citizen-confirmed',
      },
    });
    expect(JSON.stringify(projection)).not.toContain('directIdentifier');
    expect(JSON.stringify(projection)).not.toContain('rawFilename');
    expect(JSON.stringify(projection)).not.toContain('private-registration.pdf');
  });
});

describe('closed real and synthetic handoff builders', () => {
  it('builds a confirmed NextGen description-only official pack with route evidence and no direct identifier', () => {
    const result = buildOfficialHandoffPack(realInput({
      sourceKind: 'official-download',
      confirmation: {
        status: 'confirmed',
        packRevisionId: PACK_REVISION,
        roleConfirmation: helperConfirmation,
      },
    }));

    expect(result.status).toBe('built');
    if (result.status !== 'built') return;
    expect(result.pack).toMatchObject({
      schema: 'challansakshi.official-handoff/v1',
      kind: 'official-handoff-pack',
      mode: 'real',
      sourceKind: 'official-download',
      reviewRole: 'present-helper',
      resultClass: 'possible-discrepancy',
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
      routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
      destination: {
        key: 'nextgen',
        canonicalUrl: 'https://echallan.parivahan.nic.in/grievance',
        domain: 'echallan.parivahan.nic.in',
        lastVerifiedAt: '2026-09-02',
        evidenceRef: 'public-launch-route-review-2026-09-02#nextgen-grievance',
      },
      legacyIssue: null,
      description: 'I request a review of this record.\nPlease verify the original evidence and vehicle mapping.',
      fieldPackConfirmation: { status: 'confirmed', confirmedBy: 'affected-person' },
      generatedAt: NOW,
    });
    expect(result.pack.checklist).toEqual([
      'Enter the challan number directly on the official service, or use the separate private-device copy aid.',
      'Choose any offence requested by the official service yourself.',
      'Review the description before submitting on the official service.',
    ]);
    expect(result.pack.intentionallyBlankOfficialFields).toEqual([
      'challan or notice identifier',
      'identity and contact details',
      'CAPTCHA or OTP',
      'offence selection',
      'declaration and submission',
      'payment details',
    ]);
    expect(JSON.stringify(result.pack)).not.toContain('KA01SECRET');
    expect(JSON.stringify(result.pack)).not.toContain('rawFilename');
  });

  it('fails Delhi, unresolved, and the tests-only Legacy fixture closed for real pack authority', () => {
    expect(buildOfficialHandoffPack(realInput({
      route: OFFICIAL_DESTINATIONS['delhi-manual'],
      jurisdictionConfirmation: { status: 'confirmed', code: 'DL' },
    }))).toEqual({ status: 'abstained', reason: 'route-not-action-ready' });
    expect(buildOfficialHandoffPack(realInput({
      route: OFFICIAL_DESTINATIONS.unresolved,
      jurisdictionConfirmation: { status: 'unconfirmed' },
    }))).toEqual({ status: 'abstained', reason: 'route-not-action-ready' });
    expect(buildOfficialHandoffPack(realInput({
      route: TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE.destination,
      jurisdictionConfirmation: TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE.confirmation,
    }))).toEqual({ status: 'abstained', reason: 'route-not-action-ready' });
  });

  it('requires result, fact, pack, and confirmation revisions to match exactly', () => {
    expect(buildOfficialHandoffPack(realInput({ resultRevisionId: 'review-2' })))
      .toEqual({ status: 'abstained', reason: 'result-revision-mismatch' });
    expect(buildOfficialHandoffPack(realInput({
      confirmation: {
        status: 'confirmed',
        packRevisionId: 'pack-2',
        roleConfirmation: selfConfirmation,
      },
    }))).toEqual({ status: 'abstained', reason: 'pack-confirmation-stale' });
  });

  it('requires the affected person confirmation contract for self and present-helper roles', () => {
    expect(buildOfficialHandoffPack(realInput({
      confirmation: {
        status: 'confirmed',
        packRevisionId: PACK_REVISION,
        roleConfirmation: { ...selfConfirmation, affectedPersonConfirmedEntitlement: false },
      },
    }))).toEqual({ status: 'abstained', reason: 'role-confirmation-incomplete' });
    expect(buildOfficialHandoffPack(realInput({
      confirmation: {
        status: 'confirmed',
        packRevisionId: PACK_REVISION,
        roleConfirmation: { ...helperConfirmation, affectedPersonPresent: false },
      },
    }))).toEqual({ status: 'abstained', reason: 'role-confirmation-incomplete' });
    expect(buildOfficialHandoffPack(realInput({
      confirmation: {
        status: 'confirmed',
        packRevisionId: PACK_REVISION,
        roleConfirmation: { ...helperConfirmation, affectedPersonRequestedPreparation: false },
      },
    }))).toEqual({ status: 'abstained', reason: 'role-confirmation-incomplete' });
  });

  it('builds a permanently labelled synthetic simulation with no official URL or compatibility assertion', () => {
    const result = buildSyntheticHandoffSimulation(syntheticInput());

    expect(result.status).toBe('built');
    if (result.status !== 'built') return;
    expect(result.simulation).toMatchObject({
      schema: 'challansakshi.synthetic-handoff/v1',
      kind: 'synthetic-handoff-simulation',
      mode: 'synthetic',
      sourceKind: 'bundled-synthetic-record',
      routeKey: 'synthetic-fixture',
      permanentLabel: 'Synthetic demonstration data',
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
    });
    expect(result.simulation).not.toHaveProperty('formCompatibility');
    expect(JSON.stringify(result.simulation)).not.toContain('canonicalUrl');
    expect(JSON.stringify(result.simulation)).not.toContain('officialUrl');
    expect(JSON.stringify(result.simulation)).not.toContain('lastVerifiedAt');
  });

  it('runtime-rejects cross-mode, cross-source, and cross-route wrapper inputs', () => {
    expect(buildOfficialHandoffPack(syntheticInput() as unknown as RealHandoffBuildInput))
      .toEqual({ status: 'abstained', reason: 'invalid-real-input' });
    expect(buildSyntheticHandoffSimulation(realInput() as unknown as SyntheticHandoffBuildInput))
      .toEqual({ status: 'abstained', reason: 'invalid-synthetic-input' });
    expect(buildOfficialHandoffPack({
      ...realInput(),
      sourceKind: 'bundled-synthetic-record',
    } as unknown as RealHandoffBuildInput)).toEqual({ status: 'abstained', reason: 'invalid-real-input' });
    expect(buildSyntheticHandoffSimulation({
      ...syntheticInput(),
      routeKey: 'nextgen',
      canonicalUrl: OFFICIAL_DESTINATIONS.nextgen.canonicalUrl,
    } as unknown as SyntheticHandoffBuildInput)).toEqual({ status: 'abstained', reason: 'invalid-synthetic-input' });
  });

  it('keeps the real and synthetic input and output wrappers structurally incompatible', () => {
    expectTypeOf<RealHandoffBuildInput>().not.toMatchTypeOf<SyntheticHandoffBuildInput>();
    expectTypeOf<OfficialHandoffPack>().not.toMatchTypeOf<SyntheticHandoffSimulation>();
    expectTypeOf<SyntheticHandoffSimulation>().not.toMatchTypeOf<OfficialHandoffPack>();
  });
});
