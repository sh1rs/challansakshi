import { describe, expect, expectTypeOf, it } from 'vitest';
import { OFFICIAL_DESTINATIONS, OFFICIAL_ROUTE_REGISTRY_VERSION } from '../lib/official-destinations';
import {
  EXPORT_SAFE_NEUTRAL_LIMITATIONS,
  buildOfficialHandoffPack,
  buildReviewedFactProjection,
  buildSyntheticHandoffSimulation,
  canonicalOfficialHandoffPackDigestInput,
  findBoundedExportSafetyMatches,
  isAuthenticOfficialHandoffPack,
  mapLegacyIssue,
  normalizeReviewedDescription,
  validateExportSafeReviewedText,
  type BoundedExportSafetyMatch,
  type LegacyIssueMapping,
  type OfficialHandoffPack,
  type RealHandoffBuildInput,
  type SyntheticHandoffBuildInput,
  type SyntheticHandoffSimulation,
} from '../lib/official-handoff';
import type { ActionReadyReviewFacts, ReviewFact } from '../lib/public-challan';
import { TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE } from './fixtures/official-destination-fixtures';

const NOW = '2026-09-03T10:30:00.000Z';
const RESULT_REVISION = '11111111111111111111111111111111';
const PACK_REVISION = '22222222222222222222222222222222';

const fact = <T>(
  value: T,
  source: ReviewFact<T>['source'],
  overrides: Partial<ReviewFact<T>> = {},
): ReviewFact<T> => ({
  value,
  source,
  confidence: 'high',
  limitation: 'Caller text that must never be exported: https://private.example/notice.pdf',
  confirmation: 'citizen-confirmed',
  reviewRevisionId: RESULT_REVISION,
  ...overrides,
});

const readableRecord = () => fact(true, 'independent-vehicle-record');

const classConflictFacts = (
  citizenClass: 'two-wheeler' | 'four-wheeler' = 'four-wheeler',
  evidenceClass: 'two-wheeler' | 'four-wheeler' = 'two-wheeler',
): ActionReadyReviewFacts => ({
  reviewRevisionId: RESULT_REVISION,
  citizenVehicleClass: fact(citizenClass, 'independent-vehicle-record'),
  observedEvidenceVehicleClass: fact(evidenceClass, 'official-evidence-image'),
  independentReadableVehicleRecord: readableRecord(),
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
  reviewedDescription: 'I request a review of this record.\r\nThe evidence appears to show a different vehicle. Plate ending …3317.',
  confirmation: { status: 'confirmed', packRevisionId: PACK_REVISION, roleConfirmation: selfConfirmation },
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
  confirmation: { status: 'confirmed', packRevisionId: PACK_REVISION, roleConfirmation: selfConfirmation },
  generatedAt: NOW,
  ...overrides,
});

const builtRealPack = (overrides: Partial<RealHandoffBuildInput> = {}): OfficialHandoffPack => {
  const result = buildOfficialHandoffPack(realInput(overrides));
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error(`Expected a pack, received ${result.reason}`);
  return result.pack;
};

describe('reviewed handoff description normalization and export safety', () => {
  it('normalizes CRLF and lone CR to LF before applying Unicode NFC', () => {
    expect(normalizeReviewedDescription('Cafe\u0301\r\nनमस्ते\rnext')).toBe('Café\nनमस्ते\nnext');
  });

  it('counts Unicode code points and never truncates emoji, Devanagari, or combining text', () => {
    expect(Array.from(normalizeReviewedDescription('😀'.repeat(500)))).toHaveLength(500);
    expect(Array.from(normalizeReviewedDescription('क'.repeat(500)))).toHaveLength(500);
    expect(normalizeReviewedDescription('e\u0301'.repeat(500))).toBe('é'.repeat(500));
    expect(() => normalizeReviewedDescription('😀'.repeat(501))).toThrow(/501.*500 Unicode code points/);
    expect(() => normalizeReviewedDescription('क'.repeat(501))).toThrow(/501.*500 Unicode code points/);
    expect(() => normalizeReviewedDescription('e\u0301'.repeat(501))).toThrow(/501.*500 Unicode code points/);
  });

  it('rejects empty text and malformed lone-surrogate Unicode', () => {
    expect(() => normalizeReviewedDescription(' \r\n ')).toThrow(/non-empty/);
    expect(() => normalizeReviewedDescription('\ud800')).toThrow(/well-formed Unicode/);
  });

  it.each([
    ['markup-or-script', '<script>alert(1)</script>'],
    ['url', 'See https://example.com/path'],
    ['url', 'See records.example.in today'],
    ['email-or-upi', 'Write to person@example.com'],
    ['email-or-upi', 'Pay citizen@okbank'],
    ['digit-like-identifier', 'Call +91 98765 43210'],
    ['digit-like-identifier', 'Aadhaar 1234 5678 9012'],
    ['pan-shaped', 'PAN ABCDE1234F'],
    ['indian-registration', 'Vehicle KA 01 AB 1234'],
    ['indian-registration', 'Vehicle 22 BH 1234 AB'],
    ['long-mixed-identifier', 'Reference CASE_12ABCD345678'],
    ['credential-or-payment-token', 'password: hunter2'],
    ['credential-or-payment-token', 'payment token=abc123xyz'],
    ['raw-filename', 'Selected private-notice.jpg'],
    ['fabricated-official-status', 'Grievance submitted successfully'],
    ['fabricated-official-status', 'Official status: accepted'],
  ] as const)('detects bounded export-safety class %s', (expected, text) => {
    expect(findBoundedExportSafetyMatches(normalizeReviewedDescription(text))).toContain(expected);
    expect(() => validateExportSafeReviewedText(normalizeReviewedDescription(text))).toThrow(/export-safety/);
  });

  it('permits ordinary Hindi, emoji, and explicit masked last-four prose', () => {
    const valid = normalizeReviewedDescription('मैं इस रिकॉर्ड की समीक्षा का अनुरोध करता हूँ। वाहन का नंबर …3317 पर समाप्त होता है। 😀');
    expect(findBoundedExportSafetyMatches(valid)).toEqual([]);
    expect(validateExportSafeReviewedText(valid)).toBe(valid);
  });

  it.each([
    'https://private.example/challan',
    'person@example.com',
    'ABCDE1234F',
    'KA 01 AB 1234',
    '98765 43210',
    'password: secret123',
    'raw-evidence.png',
    'Ticket created and accepted by the authority',
  ])('refuses a real pack whose editable description contains prohibited text: %s', (reviewedDescription) => {
    expect(buildOfficialHandoffPack(realInput({ reviewedDescription }))).toEqual({
      status: 'abstained',
      reason: 'description-not-export-safe',
    });
  });

  it('exports stable named matcher results for Task 3 reuse', () => {
    const match: BoundedExportSafetyMatch = 'url';
    expect(match).toBe('url');
  });
});

describe('supported Legacy issue mapping', () => {
  const candidates: readonly Readonly<{
    name: string;
    facts: ActionReadyReviewFacts;
    want: LegacyIssueMapping;
  }>[] = [
    {
      name: 'wrong evidence',
      facts: {
        reviewRevisionId: RESULT_REVISION,
        wrongEvidenceBasis: fact('different-vehicle' as const, 'citizen-attestation'),
        supportedSignals: ['wrong-evidence'],
      } satisfies ActionReadyReviewFacts,
      want: { issueCode: 'wrong-evidence-captured', label: 'Wrong Evidence Captured', value: 'Wrong Image' },
    },
    {
      name: 'officer entry mismatch',
      facts: {
        reviewRevisionId: RESULT_REVISION,
        vehicleNumberEntryMismatchBasis: fact('visible-entry-mismatch' as const, 'official-record'),
        supportedSignals: ['vehicle-number-entry-mismatch'],
      } satisfies ActionReadyReviewFacts,
      want: {
        issueCode: 'wrong-vehicle-number-entered-by-officer',
        label: 'Wrong Vehicle Number Entered By Officer',
        value: 'Wrong Vehicle Number Entered By Officer',
      },
    },
    {
      name: 'two-wheeler on four-wheeler',
      facts: classConflictFacts('four-wheeler', 'two-wheeler'),
      want: {
        issueCode: 'two-wheeler-on-four-wheeler',
        label: '2 Wheeler Challan On 4 Wheeler',
        value: '2 Wheeler Challan On 4 Wheeler',
      },
    },
    {
      name: 'four-wheeler on two-wheeler',
      facts: classConflictFacts('two-wheeler', 'four-wheeler'),
      want: {
        issueCode: 'four-wheeler-on-two-wheeler',
        label: '4 Wheeler Challan On 2 Wheeler',
        value: '4 Wheeler Challan On 2 Wheeler',
      },
    },
    {
      name: 'duplicate plate with independent record',
      facts: {
        reviewRevisionId: RESULT_REVISION,
        independentReadableVehicleRecord: readableRecord(),
        duplicatePlateIndependentBasis: fact('citizen-confirmed' as const, 'citizen-attestation'),
        supportedSignals: ['duplicate-plate'],
      } satisfies ActionReadyReviewFacts,
      want: { issueCode: 'duplicate-number-plate', label: 'Duplicate Number Plate', value: 'Duplicate Number Plate' },
    },
  ];

  it('maps all exact verified Legacy categories only from their exact source/value relationship', () => {
    expect(TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE.destination).toMatchObject({ key: 'legacy', capabilities: { category: true } });
    for (const candidate of candidates) expect(mapLegacyIssue(candidate.facts)).toEqual(candidate.want);
  });

  it('rejects forged sources and contradictory value/signal relationships', () => {
    expect(mapLegacyIssue({ ...candidates[0].facts, wrongEvidenceBasis: fact('different-vehicle', 'official-record') } as ActionReadyReviewFacts)).toBeNull();
    expect(mapLegacyIssue({ ...candidates[1].facts, vehicleNumberEntryMismatchBasis: fact('visible-entry-mismatch', 'citizen-attestation') } as ActionReadyReviewFacts)).toBeNull();
    expect(mapLegacyIssue({ ...candidates[4].facts, duplicatePlateIndependentBasis: fact('citizen-confirmed', 'official-record') } as ActionReadyReviewFacts)).toBeNull();
    expect(mapLegacyIssue({
      reviewRevisionId: RESULT_REVISION,
      wrongEvidenceBasis: fact('different-vehicle', 'citizen-attestation'),
      supportedSignals: ['vehicle-number-entry-mismatch'],
    } as ActionReadyReviewFacts)).toBeNull();
    expect(mapLegacyIssue({
      reviewRevisionId: RESULT_REVISION,
      duplicatePlateIndependentBasis: fact('citizen-confirmed', 'citizen-attestation'),
      supportedSignals: ['duplicate-plate'],
    })).toBeNull();
  });

  it('returns null for every simultaneous pair instead of selecting the first category', () => {
    for (let left = 0; left < candidates.length; left += 1) {
      for (let right = left + 1; right < candidates.length; right += 1) {
        const leftFacts = candidates[left].facts;
        const rightFacts = candidates[right].facts;
        const merged = {
          ...leftFacts,
          ...rightFacts,
          citizenVehicleClass: leftFacts.citizenVehicleClass ?? rightFacts.citizenVehicleClass,
          observedEvidenceVehicleClass: leftFacts.observedEvidenceVehicleClass ?? rightFacts.observedEvidenceVehicleClass,
          independentReadableVehicleRecord: leftFacts.independentReadableVehicleRecord ?? rightFacts.independentReadableVehicleRecord,
          wrongEvidenceBasis: leftFacts.wrongEvidenceBasis ?? rightFacts.wrongEvidenceBasis,
          vehicleNumberEntryMismatchBasis: leftFacts.vehicleNumberEntryMismatchBasis ?? rightFacts.vehicleNumberEntryMismatchBasis,
          duplicatePlateIndependentBasis: leftFacts.duplicatePlateIndependentBasis ?? rightFacts.duplicatePlateIndependentBasis,
          supportedSignals: [...leftFacts.supportedSignals, ...rightFacts.supportedSignals],
        } as unknown as ActionReadyReviewFacts;
        expect(mapLegacyIssue(merged), `${candidates[left].name} + ${candidates[right].name}`).toBeNull();
      }
    }
  });
});

describe('closed real and synthetic handoff builders', () => {
  it('builds a confirmed NextGen-only official pack with neutral projected limitations and opaque revisions', () => {
    const pack = builtRealPack({
      sourceKind: 'official-download',
      confirmation: { status: 'confirmed', packRevisionId: PACK_REVISION, roleConfirmation: helperConfirmation },
    });

    expect(pack).toMatchObject({
      schema: 'challansakshi.official-handoff/v1',
      kind: 'official-handoff-pack',
      mode: 'real',
      sourceKind: 'official-download',
      reviewRole: 'present-helper',
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
      routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
      destination: {
        key: 'nextgen',
        canonicalUrl: 'https://echallan.parivahan.nic.in/grievance',
        evidenceRef: 'public-launch-route-review-2026-09-02#nextgen-grievance',
      },
      legacyIssue: null,
      description: 'I request a review of this record.\nThe evidence appears to show a different vehicle. Plate ending …3317.',
      fieldPackConfirmation: { status: 'confirmed', confirmedBy: 'affected-person' },
      generatedAt: NOW,
    });
    expect(pack.packDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(pack.checklist).toEqual([
      'Enter the challan number directly on the official service, or use the separate private-device copy aid.',
      'Choose any offence requested by the official service yourself.',
      'Review the description before submitting on the official service.',
    ]);
    expect(new Set(pack.evidenceSourceAndLimitations.map((entry) => entry.limitation)))
      .toEqual(new Set([
        EXPORT_SAFE_NEUTRAL_LIMITATIONS['independent-vehicle-record'],
        EXPORT_SAFE_NEUTRAL_LIMITATIONS['official-evidence-image'],
      ]));
    expect(JSON.stringify(pack)).not.toMatch(/private\.example|notice\.pdf|rawFilename|directIdentifier/);
  });

  it('reconstructs facts and replaces every caller limitation with a fixed source-specific neutral limitation', () => {
    const projection = buildReviewedFactProjection({
      ...classConflictFacts(),
      directIdentifier: 'KA01SECRET1234',
      citizenVehicleClass: {
        ...classConflictFacts().citizenVehicleClass,
        limitation: 'password: secret123; source https://private.example; private-record.pdf',
        rawFilename: 'private-record.pdf',
      },
    } as unknown as ActionReadyReviewFacts);

    expect(projection.citizenVehicleClass?.limitation).toBe(EXPORT_SAFE_NEUTRAL_LIMITATIONS['independent-vehicle-record']);
    expect(JSON.stringify(projection)).not.toMatch(/secret123|private\.example|private-record|KA01SECRET/);
  });

  it('requires canonical opaque 32-hex result/review/pack revisions', () => {
    expect(buildOfficialHandoffPack(realInput({ resultRevisionId: 'review-1' })))
      .toEqual({ status: 'abstained', reason: 'invalid-revision-id' });
    expect(buildOfficialHandoffPack(realInput({ packRevisionId: 'A'.repeat(32) })))
      .toEqual({ status: 'abstained', reason: 'invalid-revision-id' });
    expect(buildOfficialHandoffPack(realInput({ facts: { ...classConflictFacts(), reviewRevisionId: '3'.repeat(32) } })))
      .toEqual({ status: 'abstained', reason: 'result-revision-mismatch' });
    expect(buildOfficialHandoffPack(realInput({ packRevisionId: 'private-record.pdf' })))
      .toEqual({ status: 'abstained', reason: 'invalid-revision-id' });
    expect(buildOfficialHandoffPack(realInput({ resultRevisionId: 'https://private.example/revision' })))
      .toEqual({ status: 'abstained', reason: 'invalid-revision-id' });
  });

  it('fails Delhi, unresolved, and the tests-only Legacy fixture closed for real pack authority', () => {
    expect(buildOfficialHandoffPack(realInput({ route: OFFICIAL_DESTINATIONS['delhi-manual'], jurisdictionConfirmation: { status: 'confirmed', code: 'DL' } })))
      .toEqual({ status: 'abstained', reason: 'route-not-action-ready' });
    expect(buildOfficialHandoffPack(realInput({ route: OFFICIAL_DESTINATIONS.unresolved, jurisdictionConfirmation: { status: 'unconfirmed' } })))
      .toEqual({ status: 'abstained', reason: 'route-not-action-ready' });
    expect(buildOfficialHandoffPack(realInput({
      route: TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE.destination,
      jurisdictionConfirmation: TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE.confirmation,
    }))).toEqual({ status: 'abstained', reason: 'route-not-action-ready' });
  });

  it('requires same-revision pack confirmation and complete self/present-helper contracts', () => {
    expect(buildOfficialHandoffPack(realInput({
      confirmation: { status: 'confirmed', packRevisionId: '3'.repeat(32), roleConfirmation: selfConfirmation },
    }))).toEqual({ status: 'abstained', reason: 'pack-confirmation-stale' });
    expect(buildOfficialHandoffPack(realInput({
      confirmation: { status: 'confirmed', packRevisionId: PACK_REVISION, roleConfirmation: { ...selfConfirmation, affectedPersonConfirmedEntitlement: false } },
    }))).toEqual({ status: 'abstained', reason: 'role-confirmation-incomplete' });
    expect(buildOfficialHandoffPack(realInput({
      confirmation: { status: 'confirmed', packRevisionId: PACK_REVISION, roleConfirmation: { ...helperConfirmation, affectedPersonPresent: false } },
    }))).toEqual({ status: 'abstained', reason: 'role-confirmation-incomplete' });
  });

  it('authenticates only the deeply frozen builder-issued pack and its recomputed digest', () => {
    const pack = builtRealPack();
    expect(isAuthenticOfficialHandoffPack(pack)).toBe(true);
    expect(JSON.parse(canonicalOfficialHandoffPackDigestInput(pack))).toMatchObject({
      schema: 'challansakshi.official-handoff/v1', resultRevisionId: RESULT_REVISION, packRevisionId: PACK_REVISION,
    });
    expect(canonicalOfficialHandoffPackDigestInput(pack)).not.toContain('packDigest');
    expect(Object.isFrozen(pack)).toBe(true);
    expect(Object.isFrozen(pack.destination)).toBe(true);
    expect(Object.isFrozen(pack.facts.citizenVehicleClass)).toBe(true);
    expect(Object.isFrozen(pack.factualBullets[0])).toBe(true);
    expect(Object.isFrozen(pack.evidenceSourceAndLimitations[0])).toBe(true);

    expect(isAuthenticOfficialHandoffPack({ ...pack })).toBe(false);
    expect(isAuthenticOfficialHandoffPack({ ...pack, description: 'Changed text' })).toBe(false);
    expect(isAuthenticOfficialHandoffPack({ ...pack, packDigest: '0'.repeat(64) })).toBe(false);
    expect(isAuthenticOfficialHandoffPack(null)).toBe(false);
    const synthetic = buildSyntheticHandoffSimulation(syntheticInput());
    expect(synthetic.status).toBe('built');
    if (synthetic.status === 'built') expect(isAuthenticOfficialHandoffPack(synthetic.simulation)).toBe(false);
  });

  it('builds a labelled synthetic simulation without an official URL, digest, or compatibility assertion', () => {
    const result = buildSyntheticHandoffSimulation(syntheticInput());
    expect(result.status).toBe('built');
    if (result.status !== 'built') return;
    expect(result.simulation).toMatchObject({
      schema: 'challansakshi.synthetic-handoff/v1', kind: 'synthetic-handoff-simulation', mode: 'synthetic',
      sourceKind: 'bundled-synthetic-record', routeKey: 'synthetic-fixture', permanentLabel: 'Synthetic demonstration data',
    });
    expect(result.simulation).not.toHaveProperty('packDigest');
    expect(result.simulation).not.toHaveProperty('formCompatibility');
    expect(JSON.stringify(result.simulation)).not.toMatch(/canonicalUrl|officialUrl|lastVerifiedAt/);
  });

  it('runtime-rejects cross-mode, cross-source, and cross-route wrapper inputs', () => {
    expect(buildOfficialHandoffPack(syntheticInput() as unknown as RealHandoffBuildInput))
      .toEqual({ status: 'abstained', reason: 'invalid-real-input' });
    expect(buildSyntheticHandoffSimulation(realInput() as unknown as SyntheticHandoffBuildInput))
      .toEqual({ status: 'abstained', reason: 'invalid-synthetic-input' });
    expect(buildOfficialHandoffPack({ ...realInput(), sourceKind: 'bundled-synthetic-record' } as unknown as RealHandoffBuildInput))
      .toEqual({ status: 'abstained', reason: 'invalid-real-input' });
    expect(buildSyntheticHandoffSimulation({ ...syntheticInput(), routeKey: 'nextgen', canonicalUrl: OFFICIAL_DESTINATIONS.nextgen.canonicalUrl } as unknown as SyntheticHandoffBuildInput))
      .toEqual({ status: 'abstained', reason: 'invalid-synthetic-input' });
  });

  it('keeps the real and synthetic input and output wrappers structurally incompatible', () => {
    expectTypeOf<RealHandoffBuildInput>().not.toMatchTypeOf<SyntheticHandoffBuildInput>();
    expectTypeOf<OfficialHandoffPack>().not.toMatchTypeOf<SyntheticHandoffSimulation>();
    expectTypeOf<SyntheticHandoffSimulation>().not.toMatchTypeOf<OfficialHandoffPack>();
  });
});
