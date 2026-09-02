import { describe, expect, it } from 'vitest';
import {
  ALL_ISSUING_JURISDICTION_CODES,
  CURRENT_LEGACY_JURISDICTION_CODES,
  NEXTGEN_JURISDICTION_CODES,
  OFFICIAL_AUXILIARY_ROUTES,
  OFFICIAL_DESTINATIONS,
} from '../lib/official-destinations';
import {
  DEFAULT_REVIEWED_HANDOFF_DESCRIPTION,
  activateCitizenReviewOfficialLink,
  buildCitizenReviewHandoffView,
  changeCitizenReferenceLastFour,
  changeCitizenReturnAuthorization,
  changeCitizenReturnState,
  changeCitizenReviewHandoffDescription,
  changeCitizenReviewLookupValue,
  changeCitizenReviewPackPermission,
  completeCitizenReviewCopy,
  confirmCitizenReviewHandoffPack,
  createCitizenReviewHandoffController,
  expireCitizenReviewExtensionPreparation,
  getCitizenReviewReceiptState,
  getCitizenReviewEffectGuardSignature,
  invalidateCitizenReviewHandoff,
  prepareCitizenReviewExtension,
  recordCitizenReviewReturn,
  requestCitizenReceiptDownload,
  requestCitizenReviewCopy,
  type CitizenReviewHandoffControllerState,
  type CitizenReviewHandoffViewInput,
} from '../lib/citizen-review-handoff-controller';
import { canonicalExtensionHandoffEnvelopeJson } from '../lib/extension-handoff-contract';
import { evaluatePublicExtensionRelease } from '../lib/extension-release';
import { isAuthenticOfficialHandoffPack } from '../lib/official-handoff';
import type { CitizenChallanAnswers } from '../lib/public-challan';

const NOW = '2026-09-03T10:30:00.000Z';
const NOW_MS = Date.parse(NOW);
const RESULT_REVISION = '11111111111111111111111111111111';
const PACK_REVISION = '22222222222222222222222222222222';
const NEXT_RESULT_REVISION = '33333333333333333333333333333333';
const NEXT_PACK_REVISION = '44444444444444444444444444444444';

const answers = (overrides: Partial<CitizenChallanAnswers> = {}): CitizenChallanAnswers => ({
  sourceStatus: 'official-service',
  imageInspected: true,
  plateObservation: 'different',
  categoryObservation: 'match',
  colourObservation: 'match',
  offenceObservation: 'appears-visible',
  timestampStatus: 'displayed',
  locationStatus: 'displayed',
  ownRecordAvailable: 'present',
  noticeCopyAvailable: 'present',
  custodyRecordAvailable: 'not-applicable',
  ...overrides,
});

const viewInput = (
  overrides: Partial<CitizenReviewHandoffViewInput> = {},
): CitizenReviewHandoffViewInput => ({
  answers: answers(),
  factsConfirmed: true,
  jurisdictionConfirmation: { status: 'confirmed', code: 'KA' },
  role: 'self',
  deviceMode: 'private',
  language: 'en',
  simpleMode: false,
  nowIso: NOW,
  ...overrides,
});

function completeSelfPermissions(state: CitizenReviewHandoffControllerState) {
  let next = state;
  const permissions = [
    'affectedPersonInspectedEvidence',
    'affectedPersonInspectedReadableRecord',
    'affectedPersonConfirmedEntitlement',
  ] as const;
  for (const [index, key] of permissions.entries()) {
    next = changeCitizenReviewPackPermission(next, key, true, {
      packRevisionId: `${index + 4}`.repeat(32),
    });
  }
  return next;
}

function confirmedSelfState() {
  const base = createCitizenReviewHandoffController({
    resultRevisionId: RESULT_REVISION,
    packRevisionId: PACK_REVISION,
  });
  const permitted = completeSelfPermissions(base);
  const view = buildCitizenReviewHandoffView(permitted, viewInput());
  const confirmed = confirmCitizenReviewHandoffPack(permitted, {
    view,
    sourceKind: 'official-service',
    nowIso: NOW,
  });
  expect(confirmed.confirmedPack && isAuthenticOfficialHandoffPack(confirmed.confirmedPack)).toBe(true);
  return confirmed;
}

describe('real citizen handoff route and action-ready projection', () => {
  it('resolves every literal issuing code through the registry and keeps production Legacy empty', () => {
    expect(CURRENT_LEGACY_JURISDICTION_CODES).toEqual([]);
    const nextgen = new Set<string>(NEXTGEN_JURISDICTION_CODES);
    const initial = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
    });

    for (const code of ALL_ISSUING_JURISDICTION_CODES) {
      const view = buildCitizenReviewHandoffView(initial, viewInput({
        jurisdictionConfirmation: { status: 'confirmed', code },
      }));
      expect(view.destination.key, code).toBe(
        code === 'DL' ? 'delhi-manual' : nextgen.has(code) ? 'nextgen' : 'unresolved',
      );
    }
    expect(buildCitizenReviewHandoffView(initial, viewInput({ jurisdictionConfirmation: null })).destination)
      .toBe(OFFICIAL_DESTINATIONS.unresolved);
    expect(buildCitizenReviewHandoffView(initial, viewInput({ jurisdictionConfirmation: { status: 'unconfirmed' } })).destination)
      .toBe(OFFICIAL_DESTINATIONS.unresolved);
  });

  it('derives lookup and handoff only from typed registry records', () => {
    const initial = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
    });
    const nextgen = buildCitizenReviewHandoffView(initial, viewInput());
    const delhi = buildCitizenReviewHandoffView(initial, viewInput({
      jurisdictionConfirmation: { status: 'confirmed', code: 'DL' },
    }));

    expect(nextgen.destination).toBe(OFFICIAL_DESTINATIONS.nextgen);
    expect(nextgen.lookupRoute).toBe(OFFICIAL_AUXILIARY_ROUTES['nextgen-service-landing']);
    expect(delhi.destination).toBe(OFFICIAL_DESTINATIONS['delhi-manual']);
    expect(delhi.lookupRoute).toBe(OFFICIAL_AUXILIARY_ROUTES['national-record-lookup']);
    expect(nextgen.destination.canonicalUrl).not.toContain('KA');
  });

  it('projects only the directly established readable-plate conflict from the current UI', () => {
    const initial = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
    });
    const eligible = buildCitizenReviewHandoffView(initial, viewInput());
    expect(eligible.draft.status).toBe('eligible');
    expect(eligible.actionReadyProjection).toMatchObject({
      status: 'eligible',
      facts: {
        reviewRevisionId: RESULT_REVISION,
        supportedSignals: ['readable-plate-conflict'],
        independentReadableVehicleRecord: {
          value: true,
          source: 'independent-vehicle-record',
          confidence: 'high',
          confirmation: 'citizen-confirmed',
          reviewRevisionId: RESULT_REVISION,
        },
      },
    });

    for (const unsupported of [
      answers({ plateObservation: 'match', categoryObservation: 'different' }),
      answers({ plateObservation: 'match', colourObservation: 'different' }),
      answers({ sourceStatus: 'message-only' }),
      answers({ ownRecordAvailable: 'unclear' }),
      answers({ imageInspected: false }),
    ]) {
      const view = buildCitizenReviewHandoffView(initial, viewInput({ answers: unsupported }));
      expect(view.draft.status).not.toBe('eligible');
      expect(view.actionReadyProjection.status).toBe('abstained');
    }
  });
});

describe('pack, copy, return, and receipt lifecycle', () => {
  it('builds only after separate exact pack confirmation and keeps preview/authentic checklist parity', () => {
    const initial = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
    });
    const permitted = completeSelfPermissions(initial);
    const view = buildCitizenReviewHandoffView(permitted, viewInput());

    expect(permitted.confirmedPack).toBeNull();
    expect(permitted.packConfirmation.affectedPersonConfirmedPack).toBe(false);
    const confirmed = confirmCitizenReviewHandoffPack(permitted, {
      view,
      sourceKind: 'official-service',
      nowIso: NOW,
    });
    expect(confirmed.packConfirmation.affectedPersonConfirmedPack).toBe(true);
    expect(confirmed.confirmedPack?.checklist).toBe(view.draft.checklist);
    expect(confirmed.confirmedPack?.generatedAt).toBe(NOW);
  });

  it('resolves clipboard text from current private state and clears only a successfully copied lookup', () => {
    const confirmed = changeCitizenReviewLookupValue(confirmedSelfState(), '  CHALLAN-TEST-42  ');
    const requested = requestCitizenReviewCopy(confirmed, 'lookup');
    expect(requested.effect).toMatchObject({
      type: 'clipboard-write',
      field: 'lookup',
      value: 'CHALLAN-TEST-42',
    });
    const failed = completeCitizenReviewCopy(requested.state, requested.effect?.token ?? '', false);
    expect(failed.lookupValue).toBe('CHALLAN-TEST-42');
    expect(failed.copyStatus).toEqual({ status: 'failed', field: 'lookup' });

    const retried = requestCitizenReviewCopy(failed, 'lookup');
    const copied = completeCitizenReviewCopy(retried.state, retried.effect?.token ?? '', true);
    expect(copied.lookupValue).toBe('');
    expect(copied.copyStatus).toEqual({ status: 'copied', field: 'lookup' });

    const shared = requestCitizenReviewCopy({ ...confirmed, deviceMode: 'shared' }, 'lookup');
    expect(shared.effect).toBeNull();
  });

  it('keeps authentic activation separate from the latest corrected citizen return receipt', () => {
    const activated = activateCitizenReviewOfficialLink(confirmedSelfState(), NOW);
    expect(activated.linkActivation?.status).toBe('link-activated');
    expect(activated.lookupValue).toBe('');

    const selected = changeCitizenReturnState(activated, 'acknowledgement-seen');
    const withFragment = changeCitizenReferenceLastFour(selected, 'A1B2');
    const recorded = recordCitizenReviewReturn(withFragment, '2026-09-03T10:31:00.000Z');
    expect(recorded.latestReturnReceipt).toMatchObject({
      status: 'citizen-return-recorded',
      selectedReturnState: 'acknowledgement-seen',
      referenceLastFour: 'A1B2',
    });

    const corrected = changeCitizenReturnState(recorded, 'needs-correction');
    expect(corrected.linkActivation).toBe(activated.linkActivation);
    expect(corrected.latestReturnReceipt).toBeNull();
    expect(corrected.returnDraft.referenceLastFour).toBe('');
    expect(getCitizenReviewReceiptState(corrected)).toBe(activated.linkActivation);
  });

  it('requires every present-helper return authorization and serializes one guarded redacted download', () => {
    let state = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
      role: 'present-helper',
    });
    const permissions = [
      'affectedPersonPresent',
      'affectedPersonInspectedEvidence',
      'affectedPersonInspectedReadableRecord',
      'affectedPersonConfirmedEntitlement',
      'affectedPersonRequestedPreparation',
    ] as const;
    for (const [index, key] of permissions.entries()) {
      state = changeCitizenReviewPackPermission(state, key, true, { packRevisionId: `${index + 4}`.repeat(32) });
    }
    const view = buildCitizenReviewHandoffView(state, viewInput({ role: 'present-helper' }));
    state = confirmCitizenReviewHandoffPack(state, { view, sourceKind: 'official-service', nowIso: NOW });
    state = activateCitizenReviewOfficialLink(state, NOW);
    state = changeCitizenReturnState(state, 'acknowledgement-seen');
    state = changeCitizenReferenceLastFour(state, '9Z8Y');
    expect(() => recordCitizenReviewReturn(state, '2026-09-03T10:31:00.000Z')).toThrow(/affected person/i);

    for (const key of [
      'affectedPersonPresent',
      'affectedPersonRequestedReturnRecording',
      'affectedPersonConfirmedReturnState',
      'affectedPersonConfirmedReferenceFragment',
    ] as const) state = changeCitizenReturnAuthorization(state, key, true);
    state = recordCitizenReviewReturn(state, '2026-09-03T10:31:00.000Z');
    const requested = requestCitizenReceiptDownload(state);
    expect(requested.effect).toMatchObject({
      type: 'download-text',
      filename: 'challansakshi-redacted-continuation-receipt.json',
      mime: 'application/json;charset=utf-8',
    });
    expect(requested.effect?.type).toBe('download-text');
    const content = requested.effect?.type === 'download-text' ? requested.effect.content : '{}';
    expect(JSON.parse(content)).toEqual({
      schema: 'challansakshi.official-handoff-receipt/v1',
      packRevisionId: state.confirmedPack?.packRevisionId,
      packDigest: state.confirmedPack?.packDigest,
      localTimestamp: '2026-09-03T10:31:00.000Z',
      resultClass: 'possible-discrepancy',
      selectedReturnState: 'acknowledgement-seen',
      referenceLastFour: '9Z8Y',
    });
    expect(requested.effect?.guardSignature).toBe(getCitizenReviewEffectGuardSignature(state));
  });

  it('offers typed fallback only for portal-unavailable without changing the pack or destination', () => {
    const confirmed = confirmedSelfState();
    const activated = activateCitizenReviewOfficialLink(confirmed, NOW);
    const unavailable = changeCitizenReturnState(activated, 'portal-unavailable');
    const view = buildCitizenReviewHandoffView(unavailable, viewInput());

    expect(view.draft.fallback).toBe(OFFICIAL_DESTINATIONS.nextgen.fallback);
    expect(unavailable.confirmedPack).toBe(confirmed.confirmedPack);
    expect(view.destination).toBe(OFFICIAL_DESTINATIONS.nextgen);
    expect(view.destination.canonicalUrl).toBe('https://echallan.parivahan.nic.in/grievance');
  });

  it('synchronously clears all downstream state and replaces revisions on material invalidation', () => {
    let state = activateCitizenReviewOfficialLink(confirmedSelfState(), NOW);
    state = changeCitizenReturnState(state, 'not-submitted');
    state = recordCitizenReviewReturn(state, '2026-09-03T10:31:00.000Z');
    state = changeCitizenReviewLookupValue(state, 'PRIVATE-LOOKUP');
    const invalidated = invalidateCitizenReviewHandoff(state, {
      resultRevisionId: NEXT_RESULT_REVISION,
      packRevisionId: NEXT_PACK_REVISION,
    });

    expect(invalidated).toMatchObject({
      resultRevisionId: NEXT_RESULT_REVISION,
      packRevisionId: NEXT_PACK_REVISION,
      lookupValue: '',
      copyStatus: { status: 'idle' },
      confirmedPack: null,
      receiptSession: null,
      linkActivation: null,
      latestReturnReceipt: null,
      returnDraft: { selectedReturnState: null, referenceLastFour: '' },
      extensionPreparation: { status: 'idle' },
    });
    expect(invalidated.packConfirmation.affectedPersonConfirmedPack).toBe(false);
  });

  it('normalizes description edits, invalidates the pack, and never silently truncates', () => {
    const confirmed = confirmedSelfState();
    const edited = changeCitizenReviewHandoffDescription(
      confirmed,
      'Cafe\u0301\r\n' + '😀'.repeat(500),
      { packRevisionId: NEXT_PACK_REVISION },
    );
    expect(edited.reviewedDescription.startsWith('Café\n')).toBe(true);
    expect(edited.descriptionError).toMatch(/505.*500 Unicode code points/);
    expect(edited.confirmedPack).toBeNull();
    expect(edited.reviewedDescription).not.toBe(DEFAULT_REVIEWED_HANDOFF_DESCRIPTION);
  });
});

describe('closed extension preparation', () => {
  const publicEnabled = evaluatePublicExtensionRelease({
    releaseState: 'public-enabled',
    environmentEnabled: true,
    storeApproval: 'approved',
    adapterReleaseState: 'public-enabled',
    firstPartyLandingUrl: '/extension',
    extensionId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    storeUrl: 'https://chromewebstore.google.com/detail/challansakshi-assisted-handoff/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  });

  it('does nothing under the checked-in closed release and builds only from an authentic reduced source in the test-only open path', () => {
    const confirmed = confirmedSelfState();
    const closed = prepareCitizenReviewExtension(confirmed, {
      release: evaluatePublicExtensionRelease({}),
      language: 'en',
      simpleMode: false,
      nowMs: NOW_MS,
    });
    expect(closed.extensionPreparation).toEqual({ status: 'idle' });

    let eligible = changeCitizenReviewPackPermission(confirmed, 'supportedDesktopConfirmed', true, {
      packRevisionId: NEXT_PACK_REVISION,
    });
    const view = buildCitizenReviewHandoffView(eligible, viewInput());
    eligible = confirmCitizenReviewHandoffPack(eligible, {
      view,
      sourceKind: 'official-service',
      nowIso: NOW,
    });
    eligible = changeCitizenReviewPackPermission(eligible, 'boundedSafetyReviewConfirmed', true, {
      packRevisionId: NEXT_PACK_REVISION,
    });
    const rebuiltView = buildCitizenReviewHandoffView(eligible, viewInput());
    eligible = confirmCitizenReviewHandoffPack(eligible, {
      view: rebuiltView,
      sourceKind: 'official-service',
      nowIso: NOW,
    });
    const prepared = prepareCitizenReviewExtension(eligible, {
      release: publicEnabled,
      language: 'en',
      simpleMode: false,
      nowMs: NOW_MS,
    });
    expect(prepared.extensionPreparation.status).toBe('prepared');
    if (prepared.extensionPreparation.status === 'prepared') {
      expect(prepared.extensionPreparation.canonicalEnvelopeJson)
        .toBe(canonicalExtensionHandoffEnvelopeJson(prepared.extensionPreparation.envelope));
    }
  });

  it('expires the capsule, clears the pack, and requires fresh exact pack confirmation', () => {
    let state = confirmedSelfState();
    state = changeCitizenReviewPackPermission(state, 'supportedDesktopConfirmed', true, {
      packRevisionId: NEXT_PACK_REVISION,
    });
    let view = buildCitizenReviewHandoffView(state, viewInput());
    state = confirmCitizenReviewHandoffPack(state, { view, sourceKind: 'official-service', nowIso: NOW });
    state = changeCitizenReviewPackPermission(state, 'boundedSafetyReviewConfirmed', true, {
      packRevisionId: '77777777777777777777777777777777',
    });
    view = buildCitizenReviewHandoffView(state, viewInput());
    state = confirmCitizenReviewHandoffPack(state, { view, sourceKind: 'official-service', nowIso: NOW });
    state = prepareCitizenReviewExtension(state, {
      release: publicEnabled,
      language: 'en',
      simpleMode: false,
      nowMs: NOW_MS,
    });
    expect(state.extensionPreparation.status).toBe('prepared');
    const expired = expireCitizenReviewExtensionPreparation(state, NOW_MS + 600_001, {
      packRevisionId: '88888888888888888888888888888888',
    });
    expect(expired.extensionPreparation).toEqual({ status: 'idle' });
    expect(expired.confirmedPack).toBeNull();
    expect(expired.packConfirmation.affectedPersonConfirmedPack).toBe(false);
  });
});
