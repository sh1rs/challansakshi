import { describe, expect, it } from 'vitest';
import { OFFICIAL_DESTINATIONS } from '../lib/official-destinations';
import {
  buildOfficialHandoffPack,
  buildSyntheticHandoffSimulation,
  type OfficialHandoffPack,
  type RealHandoffBuildInput,
  type SyntheticReviewedFactProjection,
  type SyntheticHandoffBuildInput,
} from '../lib/official-handoff';
import {
  createOfficialHandoffReceiptSession,
  invalidateOfficialHandoffReceipt,
  isCurrentOfficialHandoffReceiptState,
  recordCitizenReturn,
  recordOfficialLinkActivation,
  serializeOfficialHandoffReceipt,
  type OfficialHandoffReceipt,
  type OfficialLinkActivatedState,
} from '../lib/official-handoff-receipt';
import type { ActionReadyReviewFacts, ReviewFact } from '../lib/public-challan';

const RESULT_REVISION = '11111111111111111111111111111111';
const PACK_REVISION = '22222222222222222222222222222222';
const NEXT_PACK_REVISION = '33333333333333333333333333333333';
const NOW = '2026-09-03T10:30:00.000Z';
const OPENED_AT = '2026-09-03T11:00:00.000Z';
const RETURNED_AT = '2026-09-03T11:05:00.000Z';

const fact = <T>(value: T, source: ReviewFact<T>['source']): ReviewFact<T> => ({
  value,
  source,
  confidence: 'high',
  limitation: 'Caller limitation is replaced before export.',
  confirmation: 'citizen-confirmed',
  reviewRevisionId: RESULT_REVISION,
});

const facts: ActionReadyReviewFacts = {
  reviewRevisionId: RESULT_REVISION,
  citizenVehicleClass: fact('four-wheeler', 'independent-vehicle-record'),
  observedEvidenceVehicleClass: fact('two-wheeler', 'official-evidence-image'),
  independentReadableVehicleRecord: fact(true, 'independent-vehicle-record'),
  supportedSignals: ['vehicle-class-conflict'],
};

const syntheticFacts: SyntheticReviewedFactProjection = {
  reviewRevisionId: RESULT_REVISION,
  vehicleRecordClass: {
    value: 'two-wheeler',
    source: 'bundled-synthetic-vehicle-record',
    confidence: 'high',
    limitation: 'Bundled fictional vehicle-record observation; not independent or official verification.',
    confirmation: 'citizen-confirmed',
    reviewRevisionId: RESULT_REVISION,
  },
  evidenceImageClass: {
    value: 'four-wheeler',
    source: 'bundled-synthetic-evidence-image',
    confidence: 'high',
    limitation: 'Bundled fictional image observation; no live model or government request ran in this proof.',
    confirmation: 'citizen-confirmed',
    reviewRevisionId: RESULT_REVISION,
  },
  readableVehicleRecord: {
    value: true,
    source: 'bundled-synthetic-vehicle-record',
    confidence: 'high',
    limitation: 'Bundled fictional vehicle-record observation; not independent or official verification.',
    confirmation: 'citizen-confirmed',
    reviewRevisionId: RESULT_REVISION,
  },
  supportedSignals: ['vehicle-class-conflict'],
};

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

const input = (role: 'self' | 'present-helper' = 'self', packRevisionId = PACK_REVISION): RealHandoffBuildInput => ({
  mode: 'real',
  sourceKind: 'official-service',
  route: OFFICIAL_DESTINATIONS.nextgen,
  jurisdictionConfirmation: { status: 'confirmed', code: 'KA' },
  now: NOW,
  facts,
  resultClass: 'possible-discrepancy',
  resultRevisionId: RESULT_REVISION,
  packRevisionId,
  reviewedDescription: packRevisionId === PACK_REVISION
    ? 'I request review of this record. The evidence appears to show a different vehicle.'
    : 'I request review of this corrected pack. The evidence appears to show a different vehicle.',
  confirmation: {
    status: 'confirmed',
    packRevisionId,
    roleConfirmation: role === 'self' ? selfConfirmation : helperConfirmation,
  },
  generatedAt: NOW,
});

const pack = (role: 'self' | 'present-helper' = 'self', packRevisionId = PACK_REVISION): OfficialHandoffPack => {
  const result = buildOfficialHandoffPack(input(role, packRevisionId));
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error(`Expected pack, got ${result.reason}`);
  return result.pack;
};

const activated = (
  currentPack: OfficialHandoffPack = pack(),
  deviceMode: 'private' | 'shared' = 'private',
  openedAt = OPENED_AT,
) => recordOfficialLinkActivation(
  createOfficialHandoffReceiptSession(currentPack, deviceMode),
  currentPack,
  openedAt,
);

describe('authentic official-pack binding and link observation', () => {
  it('creates an exact pack-revision-and-digest-bound private session', () => {
    const currentPack = pack();
    const session = createOfficialHandoffReceiptSession(currentPack, 'private');
    expect(session).toEqual({
      status: 'not-opened',
      packRevisionId: PACK_REVISION,
      packDigest: currentPack.packDigest,
      resultClass: 'possible-discrepancy',
      reviewRole: 'self',
      deviceMode: 'private',
    });
    expect(Object.keys(session)).toEqual([
      'status', 'packRevisionId', 'packDigest', 'resultClass', 'reviewRole', 'deviceMode',
    ]);
  });

  it('records link activation as the furthest direct observation without claiming submission', () => {
    const currentPack = pack();
    expect(recordOfficialLinkActivation(
      createOfficialHandoffReceiptSession(currentPack, 'private'),
      currentPack,
      OPENED_AT,
    )).toEqual({
      status: 'link-activated',
      packRevisionId: PACK_REVISION,
      packDigest: currentPack.packDigest,
      resultClass: 'possible-discrepancy',
      reviewRole: 'self',
      deviceMode: 'private',
      linkActivatedAt: OPENED_AT,
      directObservation: 'official-service-opened-from-this-review',
      submissionObserved: false,
    });
  });

  it('rejects missing, synthetic, copied, altered, and wrong-digest packs at every entry boundary', () => {
    const currentPack = pack();
    const copied = { ...currentPack } as OfficialHandoffPack;
    const altered = { ...currentPack, description: 'Changed after confirmation.' } as OfficialHandoffPack;
    const wrongDigest = { ...currentPack, packDigest: '0'.repeat(64) } as OfficialHandoffPack;
    const syntheticInput: SyntheticHandoffBuildInput = {
      mode: 'synthetic', sourceKind: 'bundled-synthetic-record', routeKey: 'synthetic-fixture',
      facts: syntheticFacts, resultClass: 'possible-discrepancy', resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION, reviewedDescription: 'Synthetic description.',
      confirmation: { status: 'confirmed', packRevisionId: PACK_REVISION, roleConfirmation: selfConfirmation },
      generatedAt: NOW,
    };
    const synthetic = buildSyntheticHandoffSimulation(syntheticInput);
    expect(synthetic.status).toBe('built');

    for (const invalid of [undefined, copied, altered, wrongDigest, synthetic.status === 'built' ? synthetic.simulation : null]) {
      expect(() => createOfficialHandoffReceiptSession(invalid as OfficialHandoffPack, 'private')).toThrow(/authentic official handoff pack/);
    }

    const session = createOfficialHandoffReceiptSession(currentPack, 'private');
    expect(() => recordOfficialLinkActivation(session, copied, OPENED_AT)).toThrow(/authentic current pack/);
    const open = recordOfficialLinkActivation(session, currentPack, OPENED_AT);
    expect(() => recordCitizenReturn(open, copied, {
      selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT,
    })).toThrow(/authentic current pack/);
    const receipt = recordCitizenReturn(open, currentPack, {
      selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT,
    });
    expect(() => serializeOfficialHandoffReceipt(receipt, copied)).toThrow(/authentic current pack/);
    expect(() => invalidateOfficialHandoffReceipt(receipt, copied)).toThrow(/authentic current pack/);
    expect(() => isCurrentOfficialHandoffReceiptState(receipt, copied)).toThrow(/authentic current pack/);
  });
});

describe('citizen-reported return transitions', () => {
  it('requires an exact authentic activated state and explicit allowed citizen return state', () => {
    const currentPack = pack();
    const open = activated(currentPack);
    expect(() => recordCitizenReturn({ ...open } as OfficialLinkActivatedState, currentPack, {
      selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT,
    })).toThrow(/authentic link-activated state/);
    expect(() => recordCitizenReturn({
      status: 'link-activated',
      packRevisionId: currentPack.packRevisionId,
      packDigest: currentPack.packDigest,
      resultClass: currentPack.resultClass,
      reviewRole: currentPack.reviewRole,
      deviceMode: 'private',
      linkActivatedAt: OPENED_AT,
      directObservation: 'official-service-opened-from-this-review',
      submissionObserved: false,
    } as OfficialLinkActivatedState, currentPack, {
      selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT,
    })).toThrow(/authentic link-activated state/);
    expect(() => recordCitizenReturn(open, currentPack, {
      selectedReturnState: 'submitted-successfully', localTimestamp: RETURNED_AT,
    } as never)).toThrow(/citizen return state/);
  });

  it.each([
    'acknowledgement-seen',
    'portal-unavailable',
    'not-submitted',
    'needs-correction',
  ] as const)('records %s only as citizen-reported and unverified', (selectedReturnState) => {
    const currentPack = pack();
    const receipt = recordCitizenReturn(activated(currentPack), currentPack, {
      selectedReturnState,
      localTimestamp: RETURNED_AT,
      ...(selectedReturnState === 'acknowledgement-seen' ? { referenceLastFour: 'AB12' } : {}),
    });
    expect(receipt).toMatchObject({
      status: 'citizen-return-recorded',
      selectedReturnState,
      reportingBasis: 'citizen-reported-unverified',
      officialStatusObserved: false,
      linkActivatedAt: OPENED_AT,
    });
  });

  it('allows only an optional four-character reference fragment after acknowledgement-seen on private devices', () => {
    const currentPack = pack();
    expect(recordCitizenReturn(activated(currentPack), currentPack, {
      selectedReturnState: 'acknowledgement-seen', localTimestamp: RETURNED_AT, referenceLastFour: 'AB12',
    })).toMatchObject({ referenceLastFour: 'AB12' });
    for (const referenceLastFour of ['ABC', 'FULL-REFERENCE-1234']) {
      expect(() => recordCitizenReturn(activated(currentPack), currentPack, {
        selectedReturnState: 'acknowledgement-seen', localTimestamp: RETURNED_AT, referenceLastFour,
      })).toThrow(/exactly four/);
    }
    expect(() => recordCitizenReturn(activated(currentPack), currentPack, {
      selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT, referenceLastFour: 'AB12',
    })).toThrow(/only after acknowledgement-seen/);
    expect(() => recordCitizenReturn(activated(currentPack, 'shared'), currentPack, {
      selectedReturnState: 'acknowledgement-seen', localTimestamp: RETURNED_AT, referenceLastFour: 'AB12',
    })).toThrow(/private device/);
  });

  it('requires a separate affected-person request to record a helper return', () => {
    const helperPack = pack('present-helper');
    const open = activated(helperPack);
    const base = {
      selectedReturnState: 'acknowledgement-seen' as const,
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'AB12',
      helperConfirmation: {
        affectedPersonPresent: true,
        affectedPersonRequestedReturnRecording: true,
        affectedPersonConfirmedReturnState: true,
        affectedPersonConfirmedReferenceFragment: true,
      },
    };
    expect(() => recordCitizenReturn(open, helperPack, {
      ...base,
      helperConfirmation: { ...base.helperConfirmation, affectedPersonRequestedReturnRecording: false },
    })).toThrow(/requested this return recording/);
    expect(() => recordCitizenReturn(open, helperPack, {
      ...base,
      helperConfirmation: { ...base.helperConfirmation, affectedPersonPresent: false },
    })).toThrow(/affected person/);
    expect(recordCitizenReturn(open, helperPack, base)).toMatchObject({
      reviewRole: 'present-helper',
      reportingBasis: 'affected-person-reported-entered-with-present-helper',
      referenceLastFour: 'AB12',
    });
  });

  it('accepts a return timestamp equal to activation and rejects an earlier timestamp', () => {
    const currentPack = pack();
    expect(recordCitizenReturn(activated(currentPack), currentPack, {
      selectedReturnState: 'not-submitted', localTimestamp: OPENED_AT,
    })).toMatchObject({ localTimestamp: OPENED_AT });
    expect(() => recordCitizenReturn(activated(currentPack), currentPack, {
      selectedReturnState: 'not-submitted', localTimestamp: '2026-09-03T10:59:59.999Z',
    })).toThrow(/before link activation/);
  });
});

describe('exact receipt validation, currentness, invalidation, and continuation serialization', () => {
  const recorded = (currentPack: OfficialHandoffPack = pack()): OfficialHandoffReceipt => recordCitizenReturn(
    activated(currentPack), currentPack,
    { selectedReturnState: 'acknowledgement-seen', localTimestamp: RETURNED_AT, referenceLastFour: 'AB12' },
  );

  it('binds currentness to both authentic pack revision and digest and invalidates on either change', () => {
    const currentPack = pack();
    const receipt = recorded(currentPack);
    expect(isCurrentOfficialHandoffReceiptState(receipt, currentPack)).toBe(true);
    expect(invalidateOfficialHandoffReceipt(receipt, currentPack)).toBe(receipt);

    const changedPack = pack('self', NEXT_PACK_REVISION);
    expect(isCurrentOfficialHandoffReceiptState(receipt, changedPack)).toBe(false);
    expect(invalidateOfficialHandoffReceipt(receipt, changedPack)).toEqual({
      status: 'invalidated',
      reason: 'pack-binding-changed',
      previousPackRevisionId: PACK_REVISION,
      previousPackDigest: currentPack.packDigest,
      currentPackRevisionId: NEXT_PACK_REVISION,
      currentPackDigest: changedPack.packDigest,
    });

    const reusedRevisionWithChangedContentResult = buildOfficialHandoffPack({
      ...input('self', PACK_REVISION),
      reviewedDescription: 'I request review of this edited pack. The evidence appears to show a different vehicle.',
    });
    expect(reusedRevisionWithChangedContentResult.status).toBe('built');
    if (reusedRevisionWithChangedContentResult.status === 'built') {
      expect(reusedRevisionWithChangedContentResult.pack.packRevisionId).toBe(PACK_REVISION);
      expect(reusedRevisionWithChangedContentResult.pack.packDigest).not.toBe(currentPack.packDigest);
      expect(isCurrentOfficialHandoffReceiptState(receipt, reusedRevisionWithChangedContentResult.pack)).toBe(false);
    }
  });

  it('serializes the literal private continuation allowlist including the pack digest and nothing else', () => {
    const currentPack = pack();
    const receipt = {
      ...recorded(currentPack),
      lookupValue: 'CHALLAN-SECRET',
      rawFilename: 'private-photo.jpg',
      fullIdentifier: 'KA01SECRET',
      fullReference: 'OFFICIAL-REFERENCE-AB12',
      evidenceText: 'private evidence detail',
      claimedOfficialStatus: 'accepted',
    } as OfficialHandoffReceipt;

    expect(() => serializeOfficialHandoffReceipt(receipt, currentPack)).toThrow(/exact receipt shape/);
    const serialized = serializeOfficialHandoffReceipt(recorded(currentPack), currentPack);
    expect(JSON.parse(serialized)).toEqual({
      schema: 'challansakshi.official-handoff-receipt/v1',
      packRevisionId: PACK_REVISION,
      packDigest: currentPack.packDigest,
      localTimestamp: RETURNED_AT,
      resultClass: 'possible-discrepancy',
      selectedReturnState: 'acknowledgement-seen',
      referenceLastFour: 'AB12',
    });
    expect(serialized).not.toMatch(/lookup|filename|fullIdentifier|fullReference|evidence|officialStatus|CHALLAN-SECRET|private-photo|KA01SECRET|OFFICIAL-REFERENCE|accepted/i);
  });

  it('rejects shared serialization, invalidated state, unknown keys, inherited state, and forged invariant fields', () => {
    const currentPack = pack();
    const shared = recordCitizenReturn(activated(currentPack, 'shared'), currentPack, {
      selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT,
    });
    expect(() => serializeOfficialHandoffReceipt(shared, currentPack)).toThrow(/private devices/);

    const valid = recorded(currentPack);
    const forgedVariants = [
      { ...valid, reportingBasis: 'officially-verified' },
      { ...valid, officialStatusObserved: true },
      { ...valid, resultClass: 'accepted' },
      { ...valid, packDigest: '0'.repeat(64) },
      { ...valid, unknown: 'value' },
    ];
    for (const forged of forgedVariants) {
      expect(() => serializeOfficialHandoffReceipt(forged as OfficialHandoffReceipt, currentPack)).toThrow();
    }
    const inherited = Object.create(valid) as OfficialHandoffReceipt;
    expect(() => serializeOfficialHandoffReceipt(inherited, currentPack)).toThrow(/exact receipt shape/);
    const invalidated = invalidateOfficialHandoffReceipt(valid, pack('self', NEXT_PACK_REVISION));
    expect(() => serializeOfficialHandoffReceipt(invalidated as never, currentPack)).toThrow(/recorded receipt/);
  });
});
