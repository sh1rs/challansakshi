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
}>;

type ExtensionConsent = Readonly<{
  supportedDesktopConfirmed: boolean;
  boundedSafetyReviewConfirmed: boolean;
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
  extensionConsent: ExtensionConsent;
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
  role: ReviewRole;
  deviceMode: HandoffDeviceMode;
  nowIso: string;
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
});

const initialExtensionConsent = (): ExtensionConsent => ({
  supportedDesktopConfirmed: false,
  boundedSafetyReviewConfirmed: false,
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
    extensionConsent: initialExtensionConsent(),
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
    extensionConsent: initialExtensionConsent(),
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

type PackPermissionKey = Exclude<keyof PackConfirmation, 'affectedPersonConfirmedPack'>;

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

export function changeCitizenExtensionConsent(
  state: CitizenReviewHandoffControllerState,
  key: keyof ExtensionConsent,
  checked: boolean,
  revisions: Readonly<{ resultRevisionId: string; packRevisionId: string; nowMs: number }>,
): CitizenReviewHandoffControllerState {
  if (
    state.extensionPreparation.status === 'prepared'
    && revisions.nowMs >= state.extensionPreparation.expiresAtMs
  ) return invalidateCitizenReviewHandoff(state, revisions);
  if (state.role === 'present-helper' && key === 'affectedPersonPresent' && !checked) {
    return invalidateCitizenReviewHandoff(state, revisions);
  }
  return {
    ...state,
    extensionConsent: { ...state.extensionConsent, [key]: checked },
    copyStatus: { status: 'idle' },
    pendingCopy: null,
    extensionPreparation: { status: 'idle' },
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

function packConfirmationContext(confirmation: PackConfirmation) {
  return {
    affectedPersonPresent: confirmation.affectedPersonPresent,
    affectedPersonInspectedEvidence: confirmation.affectedPersonInspectedEvidence,
    affectedPersonInspectedReadableRecord: confirmation.affectedPersonInspectedReadableRecord,
    affectedPersonConfirmedEntitlement: confirmation.affectedPersonConfirmedEntitlement,
    affectedPersonRequestedPreparation: confirmation.affectedPersonRequestedPreparation,
  };
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
    packConfirmation: packConfirmationContext(state.packConfirmation),
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
    extensionConsent: state.extensionConsent,
    returnAuthorization: state.returnAuthorization,
    returnDraft: state.returnDraft,
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
    role: input.role,
    deviceMode: input.deviceMode,
    nowIso: input.nowIso,
    jurisdictionConfirmation: confirmation,
    destination,
    lookupRoute,
    actionReadyProjection,
    draft,
    contextSignature: viewSignature(state, input, destination),
    controllerStateSignature: controllerStateSignature(state),
  };
}

function receiptBindingMatchesCurrentPack(state: CitizenReviewHandoffControllerState, pack: OfficialHandoffPack) {
  const receipt = state.receiptSession;
  return receipt !== null
    && receipt.status === 'not-opened'
    && receipt.packRevisionId === pack.packRevisionId
    && receipt.packDigest === pack.packDigest
    && receipt.resultClass === pack.resultClass
    && receipt.reviewRole === pack.reviewRole
    && receipt.deviceMode === state.deviceMode;
}

function activatedBindingMatchesCurrentPack(state: CitizenReviewHandoffControllerState, pack: OfficialHandoffPack) {
  const activation = state.linkActivation;
  return activation !== null
    && activation.status === 'link-activated'
    && activation.packRevisionId === pack.packRevisionId
    && activation.packDigest === pack.packDigest
    && activation.resultClass === pack.resultClass
    && activation.reviewRole === pack.reviewRole
    && activation.deviceMode === state.deviceMode;
}

function returnReceiptBindingMatchesCurrentPack(state: CitizenReviewHandoffControllerState, pack: OfficialHandoffPack) {
  const receipt = state.latestReturnReceipt;
  return receipt !== null
    && receipt.status === 'citizen-return-recorded'
    && receipt.packRevisionId === pack.packRevisionId
    && receipt.packDigest === pack.packDigest
    && receipt.resultClass === pack.resultClass
    && receipt.reviewRole === pack.reviewRole
    && receipt.deviceMode === state.deviceMode;
}

/** The sole binding check for every action derived from a confirmed real pack. */
export function isCitizenReviewCurrentPack(
  state: CitizenReviewHandoffControllerState,
  view: CitizenReviewHandoffView,
): boolean {
  const pack = state.confirmedPack;
  const viewNowMs = Date.parse(view.nowIso);
  if (
    !pack
    || !Number.isFinite(viewNowMs)
    || (state.extensionPreparation.status === 'prepared'
      && viewNowMs >= state.extensionPreparation.expiresAtMs)
    || !isAuthenticOfficialHandoffPack(pack)
    || !state.packConfirmation.affectedPersonConfirmedPack
    || !state.packContextSignature
    || state.packContextSignature !== view.contextSignature
    || state.role !== view.role
    || state.deviceMode !== view.deviceMode
    || view.draft.status !== 'eligible'
    || view.actionReadyProjection.status !== 'eligible'
    || pack.resultRevisionId !== state.resultRevisionId
    || pack.packRevisionId !== state.packRevisionId
    || pack.resultRevisionId !== view.draft.resultRevisionId
    || pack.packRevisionId !== view.draft.packRevisionId
    || pack.reviewRole !== state.role
    || pack.routeRegistryVersion !== OFFICIAL_ROUTE_REGISTRY_VERSION
    || pack.destination.key !== view.destination.key
    || pack.destination.canonicalUrl !== view.destination.canonicalUrl
    || pack.destination.expiresAt !== view.destination.expiresAt
    || pack.facts.reviewRevisionId !== state.resultRevisionId
    || pack.fieldPackConfirmation.packRevisionId !== state.packRevisionId
  ) return false;
  return receiptBindingMatchesCurrentPack(state, pack);
}

export function reconcileCitizenReviewCurrentPack(
  state: CitizenReviewHandoffControllerState,
  view: CitizenReviewHandoffView,
  revisions: Readonly<{ resultRevisionId?: string; packRevisionId: string }>,
): CitizenReviewHandoffControllerState {
  if (!state.confirmedPack || isCitizenReviewCurrentPack(state, view)) return state;
  return invalidateCitizenReviewHandoff(state, revisions);
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
  if (
    state.descriptionError
    || input.view.role !== state.role
    || input.view.deviceMode !== state.deviceMode
    || input.view.controllerStateSignature !== controllerStateSignature(state)
  ) return state;
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
  view?: CitizenReviewHandoffView,
): Readonly<{ state: CitizenReviewHandoffControllerState; effect: CitizenReviewBrowserEffect | null }> {
  if (field !== 'lookup' && (!view || !isCitizenReviewCurrentPack(state, view))) {
    return { state, effect: null };
  }
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
  view: CitizenReviewHandoffView,
  nowIso: string,
): CitizenReviewHandoffControllerState {
  if (!isCitizenReviewCurrentPack(state, view) || !state.confirmedPack || !state.receiptSession) return state;
  try {
    const linkActivation = recordOfficialLinkActivation(state.receiptSession, state.confirmedPack, nowIso);
    return { ...state, lookupValue: '', linkActivation, latestReturnReceipt: null };
  } catch {
    return state;
  }
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
  return {
    ...state,
    returnDraft: { ...state.returnDraft, referenceLastFour },
    returnAuthorization: {
      ...state.returnAuthorization,
      affectedPersonConfirmedReferenceFragment: false,
    },
    latestReturnReceipt: null,
  };
}

export function changeCitizenReturnAuthorization(
  state: CitizenReviewHandoffControllerState,
  key: keyof ReturnAuthorization,
  checked: boolean,
  revisions: Readonly<{ resultRevisionId: string; packRevisionId: string }>,
): CitizenReviewHandoffControllerState {
  if (state.role === 'present-helper' && key === 'affectedPersonPresent' && !checked) {
    return invalidateCitizenReviewHandoff(state, revisions);
  }
  const referenceCanBeConfirmed = state.deviceMode === 'private'
    && state.returnDraft.selectedReturnState === 'acknowledgement-seen'
    && state.returnDraft.referenceLastFour.length === 4;
  return {
    ...state,
    returnAuthorization: {
      ...state.returnAuthorization,
      [key]: key === 'affectedPersonConfirmedReferenceFragment'
        ? checked && referenceCanBeConfirmed
        : checked,
    },
    latestReturnReceipt: null,
  };
}

export type CitizenReviewReturnReadiness =
  | Readonly<{ status: 'ready'; reason?: never }>
  | Readonly<{
    status: 'blocked';
    reason:
      | 'current-pack-required'
      | 'official-link-not-activated'
      | 'return-state-required'
      | 'reference-fragment-incomplete'
      | 'affected-person-present-required'
      | 'affected-person-recording-request-required'
      | 'affected-person-return-state-confirmation-required'
      | 'affected-person-reference-confirmation-required';
  }>;

export function getCitizenReviewReturnReadiness(
  state: CitizenReviewHandoffControllerState,
  view: CitizenReviewHandoffView,
): CitizenReviewReturnReadiness {
  if (!isCitizenReviewCurrentPack(state, view)) return { status: 'blocked', reason: 'current-pack-required' };
  if (!state.confirmedPack || !activatedBindingMatchesCurrentPack(state, state.confirmedPack)) {
    return { status: 'blocked', reason: 'official-link-not-activated' };
  }
  if (!state.returnDraft.selectedReturnState) return { status: 'blocked', reason: 'return-state-required' };
  const fragmentLength = state.returnDraft.referenceLastFour.length;
  if (fragmentLength > 0 && fragmentLength < 4) {
    return { status: 'blocked', reason: 'reference-fragment-incomplete' };
  }
  if (state.role === 'present-helper') {
    if (!state.returnAuthorization.affectedPersonPresent) {
      return { status: 'blocked', reason: 'affected-person-present-required' };
    }
    if (!state.returnAuthorization.affectedPersonRequestedReturnRecording) {
      return { status: 'blocked', reason: 'affected-person-recording-request-required' };
    }
    if (!state.returnAuthorization.affectedPersonConfirmedReturnState) {
      return { status: 'blocked', reason: 'affected-person-return-state-confirmation-required' };
    }
    if (fragmentLength === 4 && !state.returnAuthorization.affectedPersonConfirmedReferenceFragment) {
      return { status: 'blocked', reason: 'affected-person-reference-confirmation-required' };
    }
  }
  return { status: 'ready' };
}

export function recordCitizenReviewReturn(
  state: CitizenReviewHandoffControllerState,
  view: CitizenReviewHandoffView,
  nowIso: string,
): CitizenReviewHandoffControllerState {
  if (
    getCitizenReviewReturnReadiness(state, view).status !== 'ready'
    || !state.confirmedPack
    || !state.linkActivation
    || !state.returnDraft.selectedReturnState
  ) return state;
  const fragment = state.deviceMode === 'private'
    && state.returnDraft.selectedReturnState === 'acknowledgement-seen'
    && state.returnDraft.referenceLastFour.length === 4
    ? state.returnDraft.referenceLastFour
    : undefined;
  try {
    const latestReturnReceipt = buildCitizenReturnReceipt(state.linkActivation, state.confirmedPack, {
      selectedReturnState: state.returnDraft.selectedReturnState,
      localTimestamp: nowIso,
      ...(fragment ? { referenceLastFour: fragment } : {}),
      ...(state.role === 'present-helper' ? { helperConfirmation: state.returnAuthorization } : {}),
    });
    return { ...state, latestReturnReceipt };
  } catch {
    return state;
  }
}

export function getCitizenReviewReceiptState(state: CitizenReviewHandoffControllerState) {
  return state.latestReturnReceipt ?? state.linkActivation ?? state.receiptSession;
}

export function requestCitizenReceiptDownload(
  state: CitizenReviewHandoffControllerState,
  view: CitizenReviewHandoffView,
): Readonly<{ state: CitizenReviewHandoffControllerState; effect: CitizenReviewBrowserEffect | null }> {
  if (
    state.deviceMode !== 'private'
    || !isCitizenReviewCurrentPack(state, view)
    || !state.confirmedPack
    || !state.latestReturnReceipt
    || !state.packContextSignature
    || !activatedBindingMatchesCurrentPack(state, state.confirmedPack)
    || !returnReceiptBindingMatchesCurrentPack(state, state.confirmedPack)
  ) return { state, effect: null };
  const counter = state.effectCounter + 1;
  const token = `receipt-${counter}`;
  try {
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
  } catch {
    return { state, effect: null };
  }
}

export function prepareCitizenReviewExtension(
  state: CitizenReviewHandoffControllerState,
  input: Readonly<{
    view: CitizenReviewHandoffView;
    release: PublicExtensionRelease;
    language: Language;
    simpleMode: boolean;
    nowMs: number;
  }>,
): CitizenReviewHandoffControllerState {
  if (input.release.status !== 'public-enabled') return state;
  if (getCitizenReviewExtensionReadiness(state, input.view, input.release).status !== 'ready' || !state.confirmedPack) {
    return { ...state, extensionPreparation: { status: 'failed' } };
  }
  const source = projectConfirmedExtensionHandoffSource(state.confirmedPack);
  const built = buildRealExtensionHandoffEnvelope(source, {
    language: input.language,
    simpleMode: input.simpleMode,
    nowMs: input.nowMs,
  });
  if (built.status !== 'built') return { ...state, extensionPreparation: { status: 'failed' } };
  const expiresAtMs = Date.parse(built.envelope.expiresAt);
  if (!Number.isFinite(expiresAtMs) || input.nowMs >= expiresAtMs) {
    return { ...state, extensionPreparation: { status: 'failed' } };
  }
  return {
    ...state,
    extensionPreparation: {
      status: 'prepared',
      envelope: built.envelope,
      canonicalEnvelopeJson: canonicalExtensionHandoffEnvelopeJson(built.envelope),
      expiresAtMs,
    },
  };
}

export type CitizenReviewExtensionReadiness =
  | Readonly<{ status: 'ready'; reason?: never }>
  | Readonly<{
    status: 'blocked';
    reason:
      | 'release-closed'
      | 'current-pack-required'
      | 'private-device-required'
      | 'supported-desktop-confirmation-required'
      | 'bounded-safety-review-required'
      | 'affected-person-present-required'
      | 'affected-person-field-review-required'
      | 'affected-person-preparation-request-required';
  }>;

export function getCitizenReviewExtensionReadiness(
  state: CitizenReviewHandoffControllerState,
  view: CitizenReviewHandoffView,
  release: PublicExtensionRelease,
): CitizenReviewExtensionReadiness {
  if (release.status !== 'public-enabled') return { status: 'blocked', reason: 'release-closed' };
  if (!isCitizenReviewCurrentPack(state, view)) return { status: 'blocked', reason: 'current-pack-required' };
  if (state.deviceMode !== 'private') return { status: 'blocked', reason: 'private-device-required' };
  if (!state.extensionConsent.supportedDesktopConfirmed) {
    return { status: 'blocked', reason: 'supported-desktop-confirmation-required' };
  }
  if (!state.extensionConsent.boundedSafetyReviewConfirmed) {
    return { status: 'blocked', reason: 'bounded-safety-review-required' };
  }
  if (state.role === 'present-helper') {
    if (!state.extensionConsent.affectedPersonPresent) {
      return { status: 'blocked', reason: 'affected-person-present-required' };
    }
    if (!state.extensionConsent.affectedPersonReviewedFields) {
      return { status: 'blocked', reason: 'affected-person-field-review-required' };
    }
    if (!state.extensionConsent.affectedPersonRequestedPreparation) {
      return { status: 'blocked', reason: 'affected-person-preparation-request-required' };
    }
  }
  return { status: 'ready' };
}

export function getCitizenReviewCurrentExtensionPreparation(
  state: CitizenReviewHandoffControllerState,
  view: CitizenReviewHandoffView,
  nowMs: number,
): CitizenReviewExtensionPreparation {
  if (
    state.extensionPreparation.status !== 'prepared'
    || nowMs >= state.extensionPreparation.expiresAtMs
    || !isCitizenReviewCurrentPack(state, view)
  ) return { status: 'idle' };
  return state.extensionPreparation;
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
