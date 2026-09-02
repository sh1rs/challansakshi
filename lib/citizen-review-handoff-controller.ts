import type { Language } from './domain';
import {
  OFFICIAL_AUXILIARY_ROUTES,
  OFFICIAL_ROUTE_REGISTRY_VERSION,
  resolveOfficialDestination,
  type JurisdictionConfirmation,
  type OfficialAuxiliaryRoute,
  type OfficialDestination,
} from './official-destinations';
import {
  buildRealExtensionHandoffEnvelope,
  canonicalExtensionHandoffEnvelopeJson,
  EXTENSION_HANDOFF_MAX_LIFETIME_MS,
  type ExtensionHandoffEnvelope,
} from './extension-handoff-contract';
import type { PublicExtensionRelease } from './extension-release';
import {
  buildOfficialHandoffPack,
  getOfficialHandoffChecklist,
  isAuthenticOfficialHandoffPack,
  isOpaqueRevisionId,
  normalizeReviewedDescription,
  projectConfirmedExtensionHandoffSource,
  type OfficialHandoffPack,
  type PackRoleConfirmation,
  type ReviewRole,
} from './official-handoff';
import {
  createOfficialHandoffReceiptSession,
  recordCitizenReturn as buildCitizenReturnReceipt,
  recordOfficialLinkActivation,
  serializeOfficialHandoffReceipt,
  type CitizenReturnState,
  type HandoffDeviceMode,
  type OfficialHandoffReceipt,
  type OfficialHandoffReceiptSession,
  type OfficialLinkActivatedState,
} from './official-handoff-receipt';
import {
  projectActionReadyReviewFacts,
  type ActionReadyReviewProjection,
  type CitizenChallanAnswers,
} from './public-challan';

export const DEFAULT_REVIEWED_HANDOFF_DESCRIPTION =
  'I request review of this record. The evidence appears to show a different vehicle.';

export type CitizenReviewCopyField = 'lookup' | 'category' | 'description';

export type CitizenReviewBrowserEffect =
  | Readonly<{
    type: 'clipboard-write';
    token: string;
    guardSignature: string;
    field: CitizenReviewCopyField;
    value: string;
  }>
  | Readonly<{
    type: 'download-text';
    token: string;
    guardSignature: string;
    filename: 'challansakshi-redacted-continuation-receipt.json';
    mime: 'application/json;charset=utf-8';
    content: string;
  }>;

type PackConfirmation = Readonly<{
  affectedPersonPresent: boolean;
  affectedPersonInspectedEvidence: boolean;
  affectedPersonInspectedReadableRecord: boolean;
  affectedPersonConfirmedEntitlement: boolean;
  affectedPersonRequestedPreparation: boolean;
  affectedPersonConfirmedPack: boolean;
  supportedDesktopConfirmed: boolean;
  boundedSafetyReviewConfirmed: boolean;
}>;

type ExtensionHelperConfirmation = Readonly<{
  affectedPersonPresent: boolean;
  affectedPersonReviewedFields: boolean;
  affectedPersonRequestedPreparation: boolean;
}>;

type ReturnAuthorization = Readonly<{
  affectedPersonPresent: boolean;
  affectedPersonRequestedReturnRecording: boolean;
  affectedPersonConfirmedReturnState: boolean;
  affectedPersonConfirmedReferenceFragment: boolean;
}>;

export type CitizenReviewExtensionPreparation =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'failed' }>
  | Readonly<{
    status: 'prepared';
    envelope: ExtensionHandoffEnvelope;
    canonicalEnvelopeJson: string;
    expiresAtMs: number;
  }>;

export type CitizenReviewHandoffControllerState = Readonly<{
  resultRevisionId: string;
  packRevisionId: string;
  role: ReviewRole;
  deviceMode: HandoffDeviceMode;
  reviewedDescription: string;
  descriptionError: string | null;
  packConfirmation: PackConfirmation;
  extensionHelperConfirmation: ExtensionHelperConfirmation;
  returnAuthorization: ReturnAuthorization;
  lookupValue: string;
  copyStatus:
    | Readonly<{ status: 'idle' }>
    | Readonly<{ status: 'copied'; field: CitizenReviewCopyField }>
    | Readonly<{ status: 'failed'; field: CitizenReviewCopyField }>;
  pendingCopy: Readonly<{ token: string; field: CitizenReviewCopyField }> | null;
  confirmedPack: OfficialHandoffPack | null;
  packContextSignature: string | null;
  receiptSession: OfficialHandoffReceiptSession | null;
  linkActivation: OfficialLinkActivatedState | null;
  latestReturnReceipt: OfficialHandoffReceipt | null;
  returnDraft: Readonly<{
    selectedReturnState: CitizenReturnState | null;
    referenceLastFour: string;
  }>;
  extensionPreparation: CitizenReviewExtensionPreparation;
  effectCounter: number;
}>;

export type CitizenReviewHandoffViewInput = Readonly<{
  answers: CitizenChallanAnswers;
  factsConfirmed: boolean;
  jurisdictionConfirmation: JurisdictionConfirmation | null;
  role: ReviewRole;
  deviceMode: HandoffDeviceMode;
  language: Language;
  simpleMode: boolean;
  nowIso: string;
}>;

export type CitizenReviewHandoffDraft = Readonly<{
  destination: OfficialDestination;
  fallback: OfficialDestination['fallback'];
  mappedCategory: Readonly<{ label: string; value: string }> | null;
  normalizedDescription: string;
  descriptionCodePointCount: number;
  descriptionError: string | null;
  checklist: readonly string[];
  resultRevisionId: string;
  packRevisionId: string;
}> & (
  | Readonly<{ status: 'eligible'; eligibilityReason: 'action-ready'; routeKey: 'legacy' | 'nextgen' }>
  | Readonly<{ status: 'manual'; eligibilityReason: 'manual-route-only'; routeKey: 'delhi-manual' }>
  | Readonly<{ status: 'unresolved'; eligibilityReason: 'route-unresolved'; routeKey: 'unresolved' }>
  | Readonly<{
    status: 'abstained';
    eligibilityReason: 'result-not-action-ready';
    routeKey: 'legacy' | 'nextgen' | 'delhi-manual' | 'unresolved';
  }>
);

export type CitizenReviewHandoffView = Readonly<{
  jurisdictionConfirmation: JurisdictionConfirmation;
  destination: OfficialDestination;
  lookupRoute: OfficialAuxiliaryRoute;
  actionReadyProjection: ActionReadyReviewProjection;
  draft: CitizenReviewHandoffDraft;
  contextSignature: string;
  controllerStateSignature: string;
}>;

const initialPackConfirmation = (): PackConfirmation => ({
  affectedPersonPresent: false,
  affectedPersonInspectedEvidence: false,
  affectedPersonInspectedReadableRecord: false,
  affectedPersonConfirmedEntitlement: false,
  affectedPersonRequestedPreparation: false,
  affectedPersonConfirmedPack: false,
  supportedDesktopConfirmed: false,
  boundedSafetyReviewConfirmed: false,
});

const initialExtensionHelperConfirmation = (): ExtensionHelperConfirmation => ({
  affectedPersonPresent: false,
  affectedPersonReviewedFields: false,
  affectedPersonRequestedPreparation: false,
});

const initialReturnAuthorization = (): ReturnAuthorization => ({
  affectedPersonPresent: false,
  affectedPersonRequestedReturnRecording: false,
  affectedPersonConfirmedReturnState: false,
  affectedPersonConfirmedReferenceFragment: false,
});

function requireRevision(value: string): string {
  if (!isOpaqueRevisionId(value)) throw new Error('A fresh opaque 16-byte revision ID is required.');
  return value;
}

export function createCitizenReviewHandoffController(input: Readonly<{
  resultRevisionId: string;
  packRevisionId: string;
  role?: ReviewRole;
  deviceMode?: HandoffDeviceMode;
}>): CitizenReviewHandoffControllerState {
  return {
    resultRevisionId: requireRevision(input.resultRevisionId),
    packRevisionId: requireRevision(input.packRevisionId),
    role: input.role ?? 'self',
    deviceMode: input.deviceMode ?? 'private',
    reviewedDescription: DEFAULT_REVIEWED_HANDOFF_DESCRIPTION,
    descriptionError: null,
    packConfirmation: initialPackConfirmation(),
    extensionHelperConfirmation: initialExtensionHelperConfirmation(),
    returnAuthorization: initialReturnAuthorization(),
    lookupValue: '',
    copyStatus: { status: 'idle' },
    pendingCopy: null,
    confirmedPack: null,
    packContextSignature: null,
    receiptSession: null,
    linkActivation: null,
    latestReturnReceipt: null,
    returnDraft: { selectedReturnState: null, referenceLastFour: '' },
    extensionPreparation: { status: 'idle' },
    effectCounter: 0,
  };
}

export function invalidateCitizenReviewHandoff(
  state: CitizenReviewHandoffControllerState,
  revisions: Readonly<{ resultRevisionId?: string; packRevisionId: string }>,
): CitizenReviewHandoffControllerState {
  return {
    ...state,
    resultRevisionId: revisions.resultRevisionId === undefined
      ? state.resultRevisionId
      : requireRevision(revisions.resultRevisionId),
    packRevisionId: requireRevision(revisions.packRevisionId),
    packConfirmation: initialPackConfirmation(),
    extensionHelperConfirmation: initialExtensionHelperConfirmation(),
    returnAuthorization: initialReturnAuthorization(),
    lookupValue: '',
    copyStatus: { status: 'idle' },
    pendingCopy: null,
    confirmedPack: null,
    packContextSignature: null,
    receiptSession: null,
    linkActivation: null,
    latestReturnReceipt: null,
    returnDraft: { selectedReturnState: null, referenceLastFour: '' },
    extensionPreparation: { status: 'idle' },
  };
}

type PackPermissionKey = keyof PackConfirmation;

export function changeCitizenReviewPackPermission(
  state: CitizenReviewHandoffControllerState,
  key: PackPermissionKey,
  checked: boolean,
  revisions: Readonly<{ packRevisionId: string }>,
): CitizenReviewHandoffControllerState {
  const retained = { ...state.packConfirmation, [key]: checked, affectedPersonConfirmedPack: false };
  const invalidated = invalidateCitizenReviewHandoff(state, revisions);
  return { ...invalidated, packConfirmation: retained };
}

export function changeCitizenExtensionHelperPermission(
  state: CitizenReviewHandoffControllerState,
  key: keyof ExtensionHelperConfirmation,
  checked: boolean,
  revisions: Readonly<{ packRevisionId: string }>,
): CitizenReviewHandoffControllerState {
  const retained = { ...state.extensionHelperConfirmation, [key]: checked };
  const retainedPackConfirmation = {
    ...state.packConfirmation,
    affectedPersonConfirmedPack: false,
  };
  const invalidated = invalidateCitizenReviewHandoff(state, revisions);
  return {
    ...invalidated,
    packConfirmation: retainedPackConfirmation,
    extensionHelperConfirmation: retained,
  };
}

export function changeCitizenReviewLookupValue(
  state: CitizenReviewHandoffControllerState,
  value: string,
): CitizenReviewHandoffControllerState {
  return { ...state, lookupValue: value.trim(), copyStatus: { status: 'idle' }, pendingCopy: null };
}

export function changeCitizenReviewHandoffDescription(
  state: CitizenReviewHandoffControllerState,
  value: string,
  revisions: Readonly<{ packRevisionId: string }>,
): CitizenReviewHandoffControllerState {
  let normalized: string;
  let error: string | null = null;
  try {
    normalized = value.replace(/\r\n?/g, '\n').normalize('NFC');
    normalizeReviewedDescription(normalized);
  } catch (cause) {
    normalized = value.replace(/\r\n?/g, '\n').normalize('NFC');
    error = cause instanceof Error ? cause.message : 'Reviewed description is invalid.';
  }
  const invalidated = invalidateCitizenReviewHandoff(state, revisions);
  return { ...invalidated, reviewedDescription: normalized, descriptionError: error };
}

function projectCurrentFacts(state: CitizenReviewHandoffControllerState, input: CitizenReviewHandoffViewInput) {
  const answers: CitizenChallanAnswers = { ...input.answers };
  delete answers.citizenVehicleClass;
  delete answers.observedEvidenceVehicleClass;
  delete answers.independentReadableVehicleRecord;
  delete answers.wrongEvidenceBasis;
  delete answers.vehicleNumberEntryMismatchBasis;
  delete answers.duplicatePlateIndependentBasis;
  answers.reviewRevisionId = state.resultRevisionId;
  if (
    input.factsConfirmed
    && (answers.sourceStatus === 'official-service' || answers.sourceStatus === 'downloaded-official-record')
    && answers.imageInspected
    && answers.plateObservation === 'different'
    && answers.ownRecordAvailable === 'present'
  ) {
    answers.independentReadableVehicleRecord = {
      value: true,
      source: 'independent-vehicle-record',
      confidence: 'high',
      limitation: 'Projected only from the affected person’s same-revision readable comparison record confirmation.',
      confirmation: 'citizen-confirmed',
      reviewRevisionId: state.resultRevisionId,
    };
  }
  return input.factsConfirmed
    ? projectActionReadyReviewFacts(answers)
    : { status: 'abstained', reason: 'missing-explicit-facts' } as const;
}

function viewSignature(state: CitizenReviewHandoffControllerState, input: CitizenReviewHandoffViewInput, route: OfficialDestination) {
  return JSON.stringify({
    resultRevisionId: state.resultRevisionId,
    packRevisionId: state.packRevisionId,
    routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
    jurisdictionConfirmation: input.jurisdictionConfirmation,
    routeKey: route.key,
    answers: input.answers,
    factsConfirmed: input.factsConfirmed,
    role: input.role,
    deviceMode: input.deviceMode,
    language: input.language,
    simpleMode: input.simpleMode,
    reviewedDescription: state.reviewedDescription,
    packConfirmation: state.packConfirmation,
    extensionHelperConfirmation: state.extensionHelperConfirmation,
  });
}

function controllerStateSignature(state: CitizenReviewHandoffControllerState) {
  return JSON.stringify({
    resultRevisionId: state.resultRevisionId,
    packRevisionId: state.packRevisionId,
    role: state.role,
    deviceMode: state.deviceMode,
    reviewedDescription: state.reviewedDescription,
    descriptionError: state.descriptionError,
    packConfirmation: state.packConfirmation,
    extensionHelperConfirmation: state.extensionHelperConfirmation,
  });
}

export function getCitizenReviewEffectGuardSignature(state: CitizenReviewHandoffControllerState) {
  return controllerStateSignature(state);
}

export function buildCitizenReviewHandoffView(
  state: CitizenReviewHandoffControllerState,
  input: CitizenReviewHandoffViewInput,
): CitizenReviewHandoffView {
  const confirmation = input.jurisdictionConfirmation ?? { status: 'unconfirmed' as const };
  const destination = resolveOfficialDestination(confirmation, input.nowIso);
  const actionReadyProjection = projectCurrentFacts(state, input);
  const routeStatus = destination.key === 'delhi-manual'
    ? 'manual' as const
    : destination.key === 'unresolved'
      ? 'unresolved' as const
      : actionReadyProjection.status === 'eligible'
        ? 'eligible' as const
        : 'abstained' as const;
  const draft = {
    status: routeStatus,
    eligibilityReason: routeStatus === 'eligible'
      ? 'action-ready'
      : routeStatus === 'manual'
        ? 'manual-route-only'
        : routeStatus === 'unresolved'
          ? 'route-unresolved'
          : 'result-not-action-ready',
    routeKey: destination.key,
    destination,
    fallback: destination.fallback,
    mappedCategory: null,
    normalizedDescription: state.reviewedDescription,
    descriptionCodePointCount: Array.from(state.reviewedDescription).length,
    descriptionError: state.descriptionError,
    checklist: destination.key === 'legacy' || destination.key === 'nextgen'
      ? getOfficialHandoffChecklist(destination.key)
      : [],
    resultRevisionId: state.resultRevisionId,
    packRevisionId: state.packRevisionId,
  } as CitizenReviewHandoffDraft;
  const lookupRoute = destination.key === 'nextgen'
    ? OFFICIAL_AUXILIARY_ROUTES['nextgen-service-landing']
    : OFFICIAL_AUXILIARY_ROUTES['national-record-lookup'];
  return {
    jurisdictionConfirmation: confirmation,
    destination,
    lookupRoute,
    actionReadyProjection,
    draft,
    contextSignature: viewSignature(state, input, destination),
    controllerStateSignature: controllerStateSignature(state),
  };
}

function roleConfirmation(state: CitizenReviewHandoffControllerState): PackRoleConfirmation {
  const confirmation = state.packConfirmation;
  return state.role === 'self'
    ? {
      role: 'self',
      affectedPersonInspectedEvidence: confirmation.affectedPersonInspectedEvidence,
      affectedPersonInspectedReadableRecord: confirmation.affectedPersonInspectedReadableRecord,
      affectedPersonConfirmedEntitlement: confirmation.affectedPersonConfirmedEntitlement,
      affectedPersonConfirmedPack: true,
    }
    : {
      role: 'present-helper',
      affectedPersonPresent: confirmation.affectedPersonPresent,
      affectedPersonInspectedEvidence: confirmation.affectedPersonInspectedEvidence,
      affectedPersonInspectedReadableRecord: confirmation.affectedPersonInspectedReadableRecord,
      affectedPersonConfirmedEntitlement: confirmation.affectedPersonConfirmedEntitlement,
      affectedPersonRequestedPreparation: confirmation.affectedPersonRequestedPreparation,
      affectedPersonConfirmedPack: true,
    };
}

export function confirmCitizenReviewHandoffPack(
  state: CitizenReviewHandoffControllerState,
  input: Readonly<{
    view: CitizenReviewHandoffView;
    sourceKind: 'official-service' | 'official-download';
    nowIso: string;
  }>,
): CitizenReviewHandoffControllerState {
  if (input.view.draft.status !== 'eligible' || input.view.actionReadyProjection.status !== 'eligible') return state;
  if (state.descriptionError || input.view.controllerStateSignature !== controllerStateSignature(state)) return state;
  const built = buildOfficialHandoffPack({
    mode: 'real',
    sourceKind: input.sourceKind,
    route: input.view.destination,
    jurisdictionConfirmation: input.view.jurisdictionConfirmation,
    now: input.nowIso,
    facts: input.view.actionReadyProjection.facts,
    resultClass: 'possible-discrepancy',
    resultRevisionId: state.resultRevisionId,
    packRevisionId: state.packRevisionId,
    reviewedDescription: state.reviewedDescription,
    confirmation: {
      status: 'confirmed',
      packRevisionId: state.packRevisionId,
      roleConfirmation: roleConfirmation(state),
    },
    generatedAt: input.nowIso,
  });
  if (built.status !== 'built') return state;
  const packConfirmation = { ...state.packConfirmation, affectedPersonConfirmedPack: true };
  return {
    ...state,
    packConfirmation,
    confirmedPack: built.pack,
    packContextSignature: input.view.contextSignature,
    receiptSession: createOfficialHandoffReceiptSession(built.pack, state.deviceMode),
    linkActivation: null,
    latestReturnReceipt: null,
    returnDraft: { selectedReturnState: null, referenceLastFour: '' },
  };
}

function copyValue(state: CitizenReviewHandoffControllerState, field: CitizenReviewCopyField): string {
  if (field === 'lookup') return state.lookupValue.trim();
  if (!state.confirmedPack || !isAuthenticOfficialHandoffPack(state.confirmedPack)) return '';
  if (field === 'description') return state.confirmedPack.description;
  return state.confirmedPack.legacyIssue?.value ?? '';
}

export function requestCitizenReviewCopy(
  state: CitizenReviewHandoffControllerState,
  field: CitizenReviewCopyField,
): Readonly<{ state: CitizenReviewHandoffControllerState; effect: CitizenReviewBrowserEffect | null }> {
  const value = copyValue(state, field);
  if (state.deviceMode !== 'private' || !value) return { state, effect: null };
  const counter = state.effectCounter + 1;
  const token = `copy-${counter}`;
  const guardSignature = getCitizenReviewEffectGuardSignature(state);
  return {
    state: { ...state, effectCounter: counter, pendingCopy: { token, field }, copyStatus: { status: 'idle' } },
    effect: { type: 'clipboard-write', token, guardSignature, field, value },
  };
}

export function completeCitizenReviewCopy(
  state: CitizenReviewHandoffControllerState,
  token: string,
  succeeded: boolean,
): CitizenReviewHandoffControllerState {
  if (!state.pendingCopy || state.pendingCopy.token !== token) return state;
  const field = state.pendingCopy.field;
  return {
    ...state,
    lookupValue: succeeded && field === 'lookup' ? '' : state.lookupValue,
    pendingCopy: null,
    copyStatus: succeeded ? { status: 'copied', field } : { status: 'failed', field },
  };
}

export function activateCitizenReviewOfficialLink(
  state: CitizenReviewHandoffControllerState,
  nowIso: string,
): CitizenReviewHandoffControllerState {
  if (!state.confirmedPack || !state.receiptSession) return state;
  const linkActivation = recordOfficialLinkActivation(state.receiptSession, state.confirmedPack, nowIso);
  return { ...state, lookupValue: '', linkActivation, latestReturnReceipt: null };
}

export function changeCitizenReturnState(
  state: CitizenReviewHandoffControllerState,
  selectedReturnState: CitizenReturnState,
): CitizenReviewHandoffControllerState {
  return {
    ...state,
    returnDraft: { selectedReturnState, referenceLastFour: '' },
    returnAuthorization: initialReturnAuthorization(),
    latestReturnReceipt: null,
  };
}

export function changeCitizenReferenceLastFour(
  state: CitizenReviewHandoffControllerState,
  value: string,
): CitizenReviewHandoffControllerState {
  const referenceLastFour = state.deviceMode === 'private'
    && state.returnDraft.selectedReturnState === 'acknowledgement-seen'
    ? Array.from(value.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 4).join('')
    : '';
  return { ...state, returnDraft: { ...state.returnDraft, referenceLastFour }, latestReturnReceipt: null };
}

export function changeCitizenReturnAuthorization(
  state: CitizenReviewHandoffControllerState,
  key: keyof ReturnAuthorization,
  checked: boolean,
): CitizenReviewHandoffControllerState {
  return { ...state, returnAuthorization: { ...state.returnAuthorization, [key]: checked }, latestReturnReceipt: null };
}

export function recordCitizenReviewReturn(
  state: CitizenReviewHandoffControllerState,
  nowIso: string,
): CitizenReviewHandoffControllerState {
  if (!state.confirmedPack || !state.linkActivation || !state.returnDraft.selectedReturnState) return state;
  const fragment = state.deviceMode === 'private'
    && state.returnDraft.selectedReturnState === 'acknowledgement-seen'
    && state.returnDraft.referenceLastFour.length === 4
    ? state.returnDraft.referenceLastFour
    : undefined;
  const latestReturnReceipt = buildCitizenReturnReceipt(state.linkActivation, state.confirmedPack, {
    selectedReturnState: state.returnDraft.selectedReturnState,
    localTimestamp: nowIso,
    ...(fragment ? { referenceLastFour: fragment } : {}),
    ...(state.role === 'present-helper' ? { helperConfirmation: state.returnAuthorization } : {}),
  });
  return { ...state, latestReturnReceipt };
}

export function getCitizenReviewReceiptState(state: CitizenReviewHandoffControllerState) {
  return state.latestReturnReceipt ?? state.linkActivation ?? state.receiptSession;
}

export function requestCitizenReceiptDownload(
  state: CitizenReviewHandoffControllerState,
): Readonly<{ state: CitizenReviewHandoffControllerState; effect: CitizenReviewBrowserEffect | null }> {
  if (
    state.deviceMode !== 'private'
    || !state.confirmedPack
    || !state.latestReturnReceipt
    || !state.packContextSignature
  ) return { state, effect: null };
  const counter = state.effectCounter + 1;
  const token = `receipt-${counter}`;
  return {
    state: { ...state, effectCounter: counter },
    effect: {
      type: 'download-text',
      token,
      guardSignature: getCitizenReviewEffectGuardSignature(state),
      filename: 'challansakshi-redacted-continuation-receipt.json',
      mime: 'application/json;charset=utf-8',
      content: serializeOfficialHandoffReceipt(state.latestReturnReceipt, state.confirmedPack),
    },
  };
}

export function prepareCitizenReviewExtension(
  state: CitizenReviewHandoffControllerState,
  input: Readonly<{
    release: PublicExtensionRelease;
    language: Language;
    simpleMode: boolean;
    nowMs: number;
  }>,
): CitizenReviewHandoffControllerState {
  if (input.release.status !== 'public-enabled') return { ...state, extensionPreparation: { status: 'idle' } };
  const helperAllowed = state.role === 'self' || (
    state.extensionHelperConfirmation.affectedPersonPresent
    && state.extensionHelperConfirmation.affectedPersonReviewedFields
    && state.extensionHelperConfirmation.affectedPersonRequestedPreparation
  );
  if (
    state.deviceMode !== 'private'
    || !state.confirmedPack
    || !isAuthenticOfficialHandoffPack(state.confirmedPack)
    || !state.packConfirmation.supportedDesktopConfirmed
    || !state.packConfirmation.boundedSafetyReviewConfirmed
    || !helperAllowed
  ) return { ...state, extensionPreparation: { status: 'failed' } };
  const source = projectConfirmedExtensionHandoffSource(state.confirmedPack);
  const built = buildRealExtensionHandoffEnvelope(source, {
    language: input.language,
    simpleMode: input.simpleMode,
    nowMs: input.nowMs,
  });
  if (built.status !== 'built') return { ...state, extensionPreparation: { status: 'failed' } };
  return {
    ...state,
    extensionPreparation: {
      status: 'prepared',
      envelope: built.envelope,
      canonicalEnvelopeJson: canonicalExtensionHandoffEnvelopeJson(built.envelope),
      expiresAtMs: input.nowMs + EXTENSION_HANDOFF_MAX_LIFETIME_MS,
    },
  };
}

export function clearCitizenReviewExtensionPreparation(state: CitizenReviewHandoffControllerState) {
  return { ...state, extensionPreparation: { status: 'idle' } as const };
}

export function expireCitizenReviewExtensionPreparation(
  state: CitizenReviewHandoffControllerState,
  nowMs: number,
  revisions: Readonly<{ packRevisionId: string }>,
): CitizenReviewHandoffControllerState {
  if (state.extensionPreparation.status !== 'prepared' || nowMs < state.extensionPreparation.expiresAtMs) return state;
  return invalidateCitizenReviewHandoff(state, revisions);
}
