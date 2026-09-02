import { describe, expect, it } from 'vitest';
import {
  createOfficialHandoffReceiptSession,
  invalidateOfficialHandoffReceipt,
  recordCitizenReturn,
  recordOfficialLinkActivation,
  serializeOfficialHandoffReceipt,
  type OfficialHandoffReceipt,
} from '../lib/official-handoff-receipt';

const PACK_REVISION = 'pack-1';
const OPENED_AT = '2026-09-03T11:00:00.000Z';
const RETURNED_AT = '2026-09-03T11:05:00.000Z';

const privateSelfSession = () => createOfficialHandoffReceiptSession({
  packRevisionId: PACK_REVISION,
  resultClass: 'possible-discrepancy',
  reviewRole: 'self',
  deviceMode: 'private',
});

const activatedPrivateSelfSession = () => recordOfficialLinkActivation(privateSelfSession(), OPENED_AT);

describe('official-link observation and citizen-reported return state', () => {
  it('records link activation as the furthest direct observation without claiming submission', () => {
    expect(recordOfficialLinkActivation(privateSelfSession(), OPENED_AT)).toEqual({
      status: 'link-activated',
      packRevisionId: PACK_REVISION,
      resultClass: 'possible-discrepancy',
      reviewRole: 'self',
      deviceMode: 'private',
      linkActivatedAt: OPENED_AT,
      directObservation: 'official-service-opened-from-this-review',
      submissionObserved: false,
    });
  });

  it('requires an explicit allowed citizen return state after link activation', () => {
    expect(() => recordCitizenReturn(
      privateSelfSession() as unknown as ReturnType<typeof activatedPrivateSelfSession>,
      { selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT },
    )).toThrow(/link activation/);
    expect(() => recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState: undefined,
      localTimestamp: RETURNED_AT,
    } as never)).toThrow(/citizen return state/);
    expect(() => recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState: 'submitted-successfully',
      localTimestamp: RETURNED_AT,
    } as never)).toThrow(/citizen return state/);
  });

  it.each([
    'acknowledgement-seen',
    'portal-unavailable',
    'not-submitted',
    'needs-correction',
  ] as const)('records %s only as citizen-reported and unverified', (selectedReturnState) => {
    const receipt = recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState,
      localTimestamp: RETURNED_AT,
      ...(selectedReturnState === 'acknowledgement-seen' ? { referenceLastFour: 'AB12' } : {}),
    });

    expect(receipt).toMatchObject({
      status: 'citizen-return-recorded',
      schema: 'challansakshi.official-handoff-receipt/v1',
      selectedReturnState,
      reportingBasis: 'citizen-reported-unverified',
      officialStatusObserved: false,
    });
  });

  it('allows only an optional four-character reference fragment after acknowledgement-seen on a private device', () => {
    expect(recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'AB12',
    })).toMatchObject({ referenceLastFour: 'AB12' });
    expect(() => recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'ABC',
    })).toThrow(/exactly four/);
    expect(() => recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'FULL-REFERENCE-1234',
    })).toThrow(/exactly four/);
    expect(() => recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState: 'not-submitted',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'AB12',
    })).toThrow(/only after acknowledgement-seen/);
  });

  it('does not retain a reference fragment in shared-device mode', () => {
    const shared = createOfficialHandoffReceiptSession({
      packRevisionId: PACK_REVISION,
      resultClass: 'possible-discrepancy',
      reviewRole: 'self',
      deviceMode: 'shared',
    });
    const activated = recordOfficialLinkActivation(shared, OPENED_AT);

    expect(() => recordCitizenReturn(activated, {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'AB12',
    })).toThrow(/private device/);
    expect(recordCitizenReturn(activated, {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
    })).not.toHaveProperty('referenceLastFour');
  });

  it('requires the affected person to be present and confirm the exact helper-entered return state and fragment', () => {
    const helper = createOfficialHandoffReceiptSession({
      packRevisionId: PACK_REVISION,
      resultClass: 'possible-discrepancy',
      reviewRole: 'present-helper',
      deviceMode: 'private',
    });
    const activated = recordOfficialLinkActivation(helper, OPENED_AT);

    expect(() => recordCitizenReturn(activated, {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'AB12',
    })).toThrow(/affected person/);
    expect(() => recordCitizenReturn(activated, {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'AB12',
      helperConfirmation: {
        affectedPersonPresent: false,
        affectedPersonConfirmedReturnState: true,
        affectedPersonConfirmedReferenceFragment: true,
      },
    })).toThrow(/affected person/);
    expect(recordCitizenReturn(activated, {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'AB12',
      helperConfirmation: {
        affectedPersonPresent: true,
        affectedPersonConfirmedReturnState: true,
        affectedPersonConfirmedReferenceFragment: true,
      },
    })).toMatchObject({
      reportingBasis: 'affected-person-reported-entered-with-present-helper',
      referenceLastFour: 'AB12',
    });
  });
});

describe('pack-revision binding and redacted continuation serialization', () => {
  const recordedReceipt = (): OfficialHandoffReceipt => recordCitizenReturn(activatedPrivateSelfSession(), {
    selectedReturnState: 'acknowledgement-seen',
    localTimestamp: RETURNED_AT,
    referenceLastFour: 'AB12',
  });

  it('invalidates a link or receipt state on any pack revision change but not on the same revision', () => {
    const receipt = recordedReceipt();
    expect(invalidateOfficialHandoffReceipt(receipt, PACK_REVISION)).toBe(receipt);
    expect(invalidateOfficialHandoffReceipt(receipt, 'pack-2')).toEqual({
      status: 'invalidated',
      reason: 'pack-revision-changed',
      previousPackRevisionId: PACK_REVISION,
      currentPackRevisionId: 'pack-2',
    });
    expect(invalidateOfficialHandoffReceipt(activatedPrivateSelfSession(), 'pack-2')).toMatchObject({
      status: 'invalidated',
      reason: 'pack-revision-changed',
    });
  });

  it('serializes the literal private-device continuation allowlist and nothing else', () => {
    const receipt = {
      ...recordedReceipt(),
      lookupValue: 'CHALLAN-SECRET',
      rawFilename: 'private-photo.jpg',
      fullIdentifier: 'KA01SECRET',
      fullReference: 'OFFICIAL-REFERENCE-AB12',
      evidenceText: 'private evidence detail',
      claimedOfficialStatus: 'accepted',
    } as OfficialHandoffReceipt;

    const serialized = serializeOfficialHandoffReceipt(receipt, PACK_REVISION);
    expect(JSON.parse(serialized)).toEqual({
      schema: 'challansakshi.official-handoff-receipt/v1',
      packRevisionId: PACK_REVISION,
      localTimestamp: RETURNED_AT,
      resultClass: 'possible-discrepancy',
      selectedReturnState: 'acknowledgement-seen',
      referenceLastFour: 'AB12',
    });
    expect(serialized).not.toMatch(/lookup|filename|fullIdentifier|fullReference|evidence|officialStatus|CHALLAN-SECRET|private-photo|KA01SECRET|OFFICIAL-REFERENCE|accepted/i);
  });

  it('omits the optional fragment key for non-acknowledgement return states', () => {
    const receipt = recordCitizenReturn(activatedPrivateSelfSession(), {
      selectedReturnState: 'portal-unavailable',
      localTimestamp: RETURNED_AT,
    });
    expect(JSON.parse(serializeOfficialHandoffReceipt(receipt, PACK_REVISION))).toEqual({
      schema: 'challansakshi.official-handoff-receipt/v1',
      packRevisionId: PACK_REVISION,
      localTimestamp: RETURNED_AT,
      resultClass: 'possible-discrepancy',
      selectedReturnState: 'portal-unavailable',
    });
  });

  it('rejects shared-device serialization and stale pack revisions', () => {
    const shared = recordCitizenReturn(recordOfficialLinkActivation(createOfficialHandoffReceiptSession({
      packRevisionId: PACK_REVISION,
      resultClass: 'possible-discrepancy',
      reviewRole: 'self',
      deviceMode: 'shared',
    }), OPENED_AT), {
      selectedReturnState: 'not-submitted',
      localTimestamp: RETURNED_AT,
    });

    expect(() => serializeOfficialHandoffReceipt(shared, PACK_REVISION)).toThrow(/private devices/);
    expect(() => serializeOfficialHandoffReceipt(recordedReceipt(), 'pack-2')).toThrow(/pack revision/);
    expect(() => serializeOfficialHandoffReceipt(
      invalidateOfficialHandoffReceipt(recordedReceipt(), 'pack-2') as never,
      'pack-2',
    )).toThrow(/recorded receipt/);
  });

  it('rejects a runtime-forged result class instead of exporting an official-status-like value', () => {
    const forged = {
      ...recordedReceipt(),
      resultClass: 'accepted',
    } as unknown as OfficialHandoffReceipt;

    expect(() => serializeOfficialHandoffReceipt(forged, PACK_REVISION)).toThrow(/recorded receipt/);
  });
});
