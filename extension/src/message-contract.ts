declare const __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__: 'synthetic-development' | 'production-disabled';

export const WORKER_REQUEST_SCHEMA = 'challansakshi.worker-request/v1' as const;
export const WORKER_RESPONSE_SCHEMA = 'challansakshi.worker-response/v1' as const;
export const DEVICE_OWNER_RESET_ATTESTATION_SCHEMA =
  'challansakshi.device-owner-reset-attestation/v1' as const;

export const WORKER_COMMANDS = Object.freeze([
  'preview-current-page',
  'load-reviewed-fields',
  'fill-empty-reviewed-fields',
  'clear-staged-fields',
  'acknowledge-affected-person-inspection',
  'reset-for-device-owner',
] as const);

export type WorkerCommand = (typeof WORKER_COMMANDS)[number];

export type SourcePreviewBindingWireV1 = Readonly<{
  schema: 'challansakshi.source-preview-binding/v1';
  sourceTabId: number;
  sourceDocumentId: string;
  canonicalEnvelopeDigest: string;
  previewNotAfterMs: number;
}>;

export type DeviceOwnerResetAttestationWireV1 = Readonly<{
  schema: typeof DEVICE_OWNER_RESET_ATTESTATION_SCHEMA;
  type: 'reset-for-device-owner';
  allRelevantOfficialTabsAndBrowserProcessesClosed: true;
}>;

export type WorkerRequestV1 =
  | Readonly<{
    schema: typeof WORKER_REQUEST_SCHEMA;
    command: 'preview-current-page';
    actionTabId: number;
  }>
  | Readonly<{
    schema: typeof WORKER_REQUEST_SCHEMA;
    command: 'load-reviewed-fields';
    actionTabId: number;
    sourcePreviewBinding: SourcePreviewBindingWireV1;
  }>
  | Readonly<{
    schema: typeof WORKER_REQUEST_SCHEMA;
    command: 'fill-empty-reviewed-fields';
    actionTabId: number;
    generation: string;
    packId: string;
    effectiveExpiresAtMs: number;
  }>
  | Readonly<{
    schema: typeof WORKER_REQUEST_SCHEMA;
    command: 'clear-staged-fields';
    generation: string;
    packId: string;
    effectiveExpiresAtMs: number;
  }>
  | Readonly<{
    schema: typeof WORKER_REQUEST_SCHEMA;
    command: 'acknowledge-affected-person-inspection';
    packId: string;
    replayUntil: number;
    warningExpiresAt: number;
  }>
  | Readonly<{
    schema: typeof WORKER_REQUEST_SCHEMA;
    command: 'reset-for-device-owner';
    attestation: DeviceOwnerResetAttestationWireV1;
  }>;

export type SourcePreviewDtoV1 = Readonly<{
  language: 'en' | 'hi';
  simpleMode: boolean;
  destinationName: string;
  routeKey: string;
  routeRegistryVersion: string;
  adapterContractVersion: string;
  expiresAt: string;
  description: string;
  categoryPresentation: string | null;
}>;

export type DestinationPreviewDtoV1 = Readonly<{
  language: 'en' | 'hi';
  simpleMode: boolean;
  domain: string;
  purpose: string;
  adapterId: string;
  adapterRevision: string;
  lastVerifiedAt: string;
  adapterExpiresAt: string;
  description: string;
  categoryPresentation: string | null;
}>;

export type WarningWireV1 = Readonly<{
  state: 'needs-review';
  packId: string;
  replayUntil: number;
  warningExpiresAt: number;
}>;

export type WorkerResponseState =
  | 'source-preview'
  | 'staged'
  | 'destination-preview'
  | 'success'
  | 'partial'
  | 'needs-review'
  | 'unresolved-live'
  | 'unresolved-orphaned'
  | 'quarantined'
  | 'expired'
  | 'unsupported'
  | 'adapter-disabled'
  | 'empty'
  | 'rejected';

export type WorkerRejectedCode =
  | 'invalid-sender'
  | 'invalid-request'
  | 'action-tab-mismatch'
  | 'no-staged-fields'
  | 'stale-session'
  | 'source-preview-rejected'
  | 'source-unavailable'
  | 'source-binding-changed'
  | 'destination-not-ready'
  | 'replay-blocked'
  | 'ledger-capacity-reached'
  | 'secure-random-unavailable'
  | 'storage-unavailable'
  | 'acknowledgement-not-available'
  | 'reset-not-allowed'
  | 'operation-failed';

type SourcePreviewWorkerResponseV1 = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: 'preview-current-page';
    state: 'source-preview';
    preview: SourcePreviewDtoV1;
    sourcePreviewBinding: SourcePreviewBindingWireV1;
  }>;

type StagedWorkerResponseV1<C extends 'preview-current-page' | 'load-reviewed-fields'> = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: C;
    state: 'staged';
    generation: string;
    packId: string;
    effectiveExpiresAtMs: number;
  }>;

type DestinationPreviewWorkerResponseV1 = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: 'preview-current-page';
    state: 'destination-preview';
    generation: string;
    packId: string;
    effectiveExpiresAtMs: number;
    preview: DestinationPreviewDtoV1;
  }>;

type FillSuccessWorkerResponseV1 = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: 'fill-empty-reviewed-fields';
    state: 'success';
  }>;

type FillPartialWorkerResponseV1 = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: 'fill-empty-reviewed-fields';
    state: 'partial';
    code: 'partial';
    warning: WarningWireV1;
  }>;

type FillNeedsReviewWorkerResponseV1 = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: 'fill-empty-reviewed-fields';
    state: 'needs-review';
    code: 'indeterminate' | 'late-complete';
    warning: WarningWireV1;
  }>;

type PersistedWarningWorkerResponseV1<C extends WorkerCommand> = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: C;
    state: 'needs-review';
    warning: WarningWireV1;
  }>;

type FixedWorkerResponseV1<
  C extends WorkerCommand,
  S extends WorkerResponseState,
> = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: C;
    state: S;
  }>;

export type WorkerRejectedCodeForCommand<C extends WorkerCommand> =
  C extends 'preview-current-page'
    ? 'action-tab-mismatch' | 'source-preview-rejected' | 'source-unavailable'
      | 'source-binding-changed' | 'replay-blocked' | 'ledger-capacity-reached'
      | 'storage-unavailable' | 'operation-failed'
    : C extends 'load-reviewed-fields'
      ? 'action-tab-mismatch' | 'source-preview-rejected' | 'source-unavailable'
        | 'source-binding-changed' | 'replay-blocked' | 'ledger-capacity-reached'
        | 'secure-random-unavailable' | 'storage-unavailable' | 'operation-failed'
      : C extends 'fill-empty-reviewed-fields'
        ? 'action-tab-mismatch' | 'no-staged-fields' | 'stale-session' | 'source-unavailable'
          | 'source-binding-changed' | 'destination-not-ready' | 'secure-random-unavailable'
          | 'storage-unavailable' | 'operation-failed'
        : C extends 'clear-staged-fields'
          ? 'no-staged-fields' | 'stale-session' | 'storage-unavailable' | 'operation-failed'
          : C extends 'acknowledge-affected-person-inspection'
            ? 'storage-unavailable' | 'acknowledgement-not-available' | 'operation-failed'
            : 'storage-unavailable' | 'reset-not-allowed' | 'operation-failed';

type RejectedWorkerResponseV1<C extends WorkerCommand> = Readonly<{
    schema: typeof WORKER_RESPONSE_SCHEMA;
    command: C;
    state: 'rejected';
    code: WorkerRejectedCodeForCommand<C>;
  }>;

type InvalidBoundaryWorkerResponseV1 = Readonly<{
  schema: typeof WORKER_RESPONSE_SCHEMA;
  command: null;
  state: 'rejected';
  code: 'invalid-sender' | 'invalid-request';
}>;

type CommonRecoveryState = 'unresolved-live' | 'unresolved-orphaned' | 'quarantined';

export type WorkerResponseForCommand<C extends WorkerCommand | null> =
  C extends null
    ? InvalidBoundaryWorkerResponseV1
    : C extends WorkerCommand
      ? PersistedWarningWorkerResponseV1<C>
        | RejectedWorkerResponseV1<C>
        | FixedWorkerResponseV1<C, CommonRecoveryState>
        | (C extends 'preview-current-page'
          ? SourcePreviewWorkerResponseV1
            | StagedWorkerResponseV1<C>
            | DestinationPreviewWorkerResponseV1
            | FixedWorkerResponseV1<C, 'expired' | 'unsupported' | 'adapter-disabled' | 'empty'>
          : C extends 'load-reviewed-fields'
            ? StagedWorkerResponseV1<C>
              | FixedWorkerResponseV1<C, 'expired' | 'unsupported' | 'adapter-disabled'>
            : C extends 'fill-empty-reviewed-fields'
              ? FillSuccessWorkerResponseV1
                | FillPartialWorkerResponseV1
                | FillNeedsReviewWorkerResponseV1
                | FixedWorkerResponseV1<C, 'expired' | 'unsupported' | 'adapter-disabled'>
              : C extends 'clear-staged-fields'
                ? FixedWorkerResponseV1<C, 'empty' | 'expired'>
                : FixedWorkerResponseV1<C, 'empty'>)
      : never;

export type WorkerResponseV1 = WorkerResponseForCommand<WorkerCommand | null>;

type DataRead =
  | Readonly<{ ok: true; fields: Readonly<Record<string, unknown>> }>
  | Readonly<{ ok: false }>;

const OPAQUE_PATTERN = /^[0-9a-f]{32}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const DOCUMENT_ID_PATTERN = /^[\x21-\x7e]{1,128}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const BINDING_KEYS = Object.freeze([
  'schema', 'sourceTabId', 'sourceDocumentId', 'canonicalEnvelopeDigest', 'previewNotAfterMs',
] as const);
const ATTESTATION_KEYS = Object.freeze([
  'schema', 'type', 'allRelevantOfficialTabsAndBrowserProcessesClosed',
] as const);
const WARNING_KEYS = Object.freeze(['state', 'packId', 'replayUntil', 'warningExpiresAt'] as const);
const SOURCE_PREVIEW_KEYS = Object.freeze([
  'language', 'simpleMode', 'destinationName', 'routeKey', 'routeRegistryVersion',
  'adapterContractVersion', 'expiresAt', 'description', 'categoryPresentation',
] as const);
const DESTINATION_PREVIEW_KEYS = Object.freeze([
  'language', 'simpleMode', 'domain', 'purpose', 'adapterId', 'adapterRevision',
  'lastVerifiedAt', 'adapterExpiresAt', 'description', 'categoryPresentation',
] as const);

const REQUEST_KEYS: Readonly<Record<WorkerCommand, readonly string[]>> = Object.freeze({
  'preview-current-page': Object.freeze(['schema', 'command', 'actionTabId']),
  'load-reviewed-fields': Object.freeze(['schema', 'command', 'actionTabId', 'sourcePreviewBinding']),
  'fill-empty-reviewed-fields': Object.freeze([
    'schema', 'command', 'actionTabId', 'generation', 'packId', 'effectiveExpiresAtMs',
  ]),
  'clear-staged-fields': Object.freeze([
    'schema', 'command', 'generation', 'packId', 'effectiveExpiresAtMs',
  ]),
  'acknowledge-affected-person-inspection': Object.freeze([
    'schema', 'command', 'packId', 'replayUntil', 'warningExpiresAt',
  ]),
  'reset-for-device-owner': Object.freeze(['schema', 'command', 'attestation']),
});

const STATE_MATRIX: Readonly<Record<WorkerCommand, ReadonlySet<WorkerResponseState>>> = Object.freeze({
  'preview-current-page': new Set<WorkerResponseState>([
    'source-preview', 'staged', 'destination-preview', 'needs-review', 'unresolved-live',
    'unresolved-orphaned', 'quarantined', 'expired', 'unsupported', 'adapter-disabled',
    'empty', 'rejected',
  ]),
  'load-reviewed-fields': new Set<WorkerResponseState>([
    'staged', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined',
    'expired', 'unsupported', 'adapter-disabled', 'rejected',
  ]),
  'fill-empty-reviewed-fields': new Set<WorkerResponseState>([
    'success', 'partial', 'needs-review', 'unresolved-live', 'unresolved-orphaned',
    'quarantined', 'expired', 'unsupported', 'adapter-disabled', 'rejected',
  ]),
  'clear-staged-fields': new Set<WorkerResponseState>([
    'empty', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined',
    'expired', 'rejected',
  ]),
  'acknowledge-affected-person-inspection': new Set<WorkerResponseState>([
    'empty', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined', 'rejected',
  ]),
  'reset-for-device-owner': new Set<WorkerResponseState>([
    'empty', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined', 'rejected',
  ]),
});

const REJECTED_CODE_MATRIX: Readonly<Record<WorkerCommand, ReadonlySet<WorkerRejectedCode>>> =
  Object.freeze({
    'preview-current-page': new Set<WorkerRejectedCode>([
      'action-tab-mismatch', 'source-preview-rejected', 'source-unavailable',
      'source-binding-changed', 'replay-blocked', 'ledger-capacity-reached',
      'storage-unavailable', 'operation-failed',
    ]),
    'load-reviewed-fields': new Set<WorkerRejectedCode>([
      'action-tab-mismatch', 'source-preview-rejected', 'source-unavailable',
      'source-binding-changed', 'replay-blocked', 'ledger-capacity-reached',
      'secure-random-unavailable', 'storage-unavailable', 'operation-failed',
    ]),
    'fill-empty-reviewed-fields': new Set<WorkerRejectedCode>([
      'action-tab-mismatch', 'no-staged-fields', 'stale-session', 'source-unavailable',
      'source-binding-changed', 'destination-not-ready', 'secure-random-unavailable',
      'storage-unavailable', 'operation-failed',
    ]),
    'clear-staged-fields': new Set<WorkerRejectedCode>([
      'no-staged-fields', 'stale-session', 'storage-unavailable', 'operation-failed',
    ]),
    'acknowledge-affected-person-inspection': new Set<WorkerRejectedCode>([
      'storage-unavailable', 'acknowledgement-not-available', 'operation-failed',
    ]),
    'reset-for-device-owner': new Set<WorkerRejectedCode>([
      'storage-unavailable', 'reset-not-allowed', 'operation-failed',
    ]),
  });

function readData(value: unknown, expectedKeys: readonly string[], exactKeys = true): DataRead {
  try {
    if (
      typeof value !== 'object'
      || value === null
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return { ok: false };
    const keys = Reflect.ownKeys(value);
    if (exactKeys && (
      keys.length !== expectedKeys.length
      || keys.some((key, index) => key !== expectedKeys[index])
    )) return { ok: false };
    const fields: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return { ok: false };
      fields[key] = descriptor.value;
    }
    return { ok: true, fields: Object.freeze(fields) };
  } catch {
    return { ok: false };
  }
}

function hasExactDiscriminant(
  read: DataRead,
  command: WorkerCommand | null,
  state: WorkerResponseState,
): read is Extract<DataRead, { ok: true }> {
  return read.ok
    && read.fields.schema === WORKER_RESPONSE_SCHEMA
    && read.fields.command === command
    && read.fields.state === state;
}

function isCommand(value: unknown): value is WorkerCommand {
  return typeof value === 'string' && (WORKER_COMMANDS as readonly string[]).includes(value);
}

function isTabId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isPositiveTime(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function isRepresentableEpoch(value: unknown): value is number {
  if (!isPositiveTime(value)) return false;
  try {
    const iso = new Date(value).toISOString();
    return Date.parse(iso) === value;
  } catch {
    return false;
  }
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  try {
    return Number.isSafeInteger(parsed) && new Date(parsed).toISOString() === value;
  } catch {
    return false;
  }
}

function isDisplayText(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\r')) return false;
  try {
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (next < 0xdc00 || next > 0xdfff) return false;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    }
    return value.normalize('NFC') === value && Array.from(value).length <= 500;
  } catch {
    return false;
  }
}

function readBinding(value: unknown): SourcePreviewBindingWireV1 | null {
  const read = readData(value, BINDING_KEYS);
  if (!read.ok) return null;
  const binding = read.fields;
  if (
    binding.schema !== 'challansakshi.source-preview-binding/v1'
    || !isTabId(binding.sourceTabId)
    || typeof binding.sourceDocumentId !== 'string'
    || !DOCUMENT_ID_PATTERN.test(binding.sourceDocumentId)
    || typeof binding.canonicalEnvelopeDigest !== 'string'
    || !DIGEST_PATTERN.test(binding.canonicalEnvelopeDigest)
    || !isRepresentableEpoch(binding.previewNotAfterMs)
  ) return null;
  return Object.freeze({
    schema: 'challansakshi.source-preview-binding/v1',
    sourceTabId: binding.sourceTabId,
    sourceDocumentId: binding.sourceDocumentId,
    canonicalEnvelopeDigest: binding.canonicalEnvelopeDigest,
    previewNotAfterMs: binding.previewNotAfterMs,
  });
}

function readAttestation(value: unknown): DeviceOwnerResetAttestationWireV1 | null {
  const read = readData(value, ATTESTATION_KEYS);
  if (
    !read.ok
    || read.fields.schema !== DEVICE_OWNER_RESET_ATTESTATION_SCHEMA
    || read.fields.type !== 'reset-for-device-owner'
    || read.fields.allRelevantOfficialTabsAndBrowserProcessesClosed !== true
  ) return null;
  return Object.freeze({
    schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
    type: 'reset-for-device-owner',
    allRelevantOfficialTabsAndBrowserProcessesClosed: true,
  });
}

export function parseWorkerRequest(value: unknown): WorkerRequestV1 | null {
  const discriminant = readData(value, ['schema', 'command'], false);
  if (
    !discriminant.ok
    || discriminant.fields.schema !== WORKER_REQUEST_SCHEMA
    || !isCommand(discriminant.fields.command)
  ) return null;
  const command = discriminant.fields.command;
  const read = readData(value, REQUEST_KEYS[command]);
  if (!read.ok || read.fields.schema !== WORKER_REQUEST_SCHEMA || read.fields.command !== command) {
    return null;
  }
  const fields = read.fields;
  if (command === 'preview-current-page' && isTabId(fields.actionTabId)) {
    return Object.freeze({ schema: WORKER_REQUEST_SCHEMA, command, actionTabId: fields.actionTabId });
  }
  if (command === 'load-reviewed-fields' && isTabId(fields.actionTabId)) {
    const sourcePreviewBinding = readBinding(fields.sourcePreviewBinding);
    if (!sourcePreviewBinding) return null;
    return Object.freeze({
      schema: WORKER_REQUEST_SCHEMA,
      command,
      actionTabId: fields.actionTabId,
      sourcePreviewBinding,
    });
  }
  if (
    command === 'fill-empty-reviewed-fields'
    && isTabId(fields.actionTabId)
    && typeof fields.generation === 'string'
    && OPAQUE_PATTERN.test(fields.generation)
    && typeof fields.packId === 'string'
    && OPAQUE_PATTERN.test(fields.packId)
    && isRepresentableEpoch(fields.effectiveExpiresAtMs)
  ) return Object.freeze({
    schema: WORKER_REQUEST_SCHEMA,
    command,
    actionTabId: fields.actionTabId,
    generation: fields.generation,
    packId: fields.packId,
    effectiveExpiresAtMs: fields.effectiveExpiresAtMs,
  });
  if (
    command === 'clear-staged-fields'
    && typeof fields.generation === 'string'
    && OPAQUE_PATTERN.test(fields.generation)
    && typeof fields.packId === 'string'
    && OPAQUE_PATTERN.test(fields.packId)
    && isRepresentableEpoch(fields.effectiveExpiresAtMs)
  ) return Object.freeze({
    schema: WORKER_REQUEST_SCHEMA,
    command,
    generation: fields.generation,
    packId: fields.packId,
    effectiveExpiresAtMs: fields.effectiveExpiresAtMs,
  });
  if (
    command === 'acknowledge-affected-person-inspection'
    && typeof fields.packId === 'string'
    && OPAQUE_PATTERN.test(fields.packId)
    && isRepresentableEpoch(fields.replayUntil)
    && isRepresentableEpoch(fields.warningExpiresAt)
    && fields.warningExpiresAt > fields.replayUntil
  ) return Object.freeze({
    schema: WORKER_REQUEST_SCHEMA,
    command,
    packId: fields.packId,
    replayUntil: fields.replayUntil,
    warningExpiresAt: fields.warningExpiresAt,
  });
  if (command === 'reset-for-device-owner') {
    const attestation = readAttestation(fields.attestation);
    if (attestation) return Object.freeze({ schema: WORKER_REQUEST_SCHEMA, command, attestation });
  }
  return null;
}

function requireBuilt<T extends WorkerRequestV1>(candidate: unknown): T {
  const parsed = parseWorkerRequest(candidate);
  if (!parsed) throw new TypeError('Invalid worker request.');
  return parsed as T;
}

export function buildPreviewCurrentPageRequest(actionTabId: number) {
  return requireBuilt<Extract<WorkerRequestV1, { command: 'preview-current-page' }>>({
    schema: WORKER_REQUEST_SCHEMA, command: 'preview-current-page', actionTabId,
  });
}

export function buildLoadReviewedFieldsRequest(
  actionTabId: number,
  sourcePreviewBinding: SourcePreviewBindingWireV1,
) {
  return requireBuilt<Extract<WorkerRequestV1, { command: 'load-reviewed-fields' }>>({
    schema: WORKER_REQUEST_SCHEMA,
    command: 'load-reviewed-fields',
    actionTabId,
    sourcePreviewBinding,
  });
}

export function buildFillEmptyReviewedFieldsRequest(
  actionTabId: number,
  generation: string,
  packId: string,
  effectiveExpiresAtMs: number,
) {
  return requireBuilt<Extract<WorkerRequestV1, { command: 'fill-empty-reviewed-fields' }>>({
    schema: WORKER_REQUEST_SCHEMA,
    command: 'fill-empty-reviewed-fields',
    actionTabId,
    generation,
    packId,
    effectiveExpiresAtMs,
  });
}

export function buildClearStagedFieldsRequest(
  generation: string,
  packId: string,
  effectiveExpiresAtMs: number,
) {
  return requireBuilt<Extract<WorkerRequestV1, { command: 'clear-staged-fields' }>>({
    schema: WORKER_REQUEST_SCHEMA,
    command: 'clear-staged-fields',
    generation,
    packId,
    effectiveExpiresAtMs,
  });
}

export function buildAcknowledgeAffectedPersonInspectionRequest(
  packId: string,
  replayUntil: number,
  warningExpiresAt: number,
) {
  return requireBuilt<Extract<WorkerRequestV1, { command: 'acknowledge-affected-person-inspection' }>>({
    schema: WORKER_REQUEST_SCHEMA,
    command: 'acknowledge-affected-person-inspection',
    packId,
    replayUntil,
    warningExpiresAt,
  });
}

export function buildResetForDeviceOwnerRequest(attestation: DeviceOwnerResetAttestationWireV1) {
  return requireBuilt<Extract<WorkerRequestV1, { command: 'reset-for-device-owner' }>>({
    schema: WORKER_REQUEST_SCHEMA, command: 'reset-for-device-owner', attestation,
  });
}

export function validatePopupSender(sender: unknown, expectedOrigin: unknown): boolean {
  try {
    if (
      typeof sender !== 'object'
      || sender === null
      || typeof expectedOrigin !== 'string'
      || expectedOrigin.length === 0
    ) return false;
    const urlDescriptor = Object.getOwnPropertyDescriptor(sender, 'url');
    const idDescriptor = Object.getOwnPropertyDescriptor(sender, 'id');
    if (
      !urlDescriptor || !urlDescriptor.enumerable || !('value' in urlDescriptor)
      || !idDescriptor || !idDescriptor.enumerable || !('value' in idDescriptor)
      || typeof urlDescriptor.value !== 'string'
      || typeof idDescriptor.value !== 'string'
    ) return false;
    const parsed = new URL(urlDescriptor.value);
    return parsed.protocol === 'chrome-extension:'
      && parsed.username === ''
      && parsed.password === ''
      && parsed.port === ''
      && parsed.pathname === '/popup.html'
      && parsed.search === ''
      && parsed.hash === ''
      && `${parsed.protocol}//${parsed.host}` === expectedOrigin
      && parsed.hostname === idDescriptor.value;
  } catch {
    return false;
  }
}

function readWarning(value: unknown): WarningWireV1 | null {
  const read = readData(value, WARNING_KEYS);
  if (
    !read.ok
    || read.fields.state !== 'needs-review'
    || typeof read.fields.packId !== 'string'
    || !OPAQUE_PATTERN.test(read.fields.packId)
    || !isRepresentableEpoch(read.fields.replayUntil)
    || !isRepresentableEpoch(read.fields.warningExpiresAt)
    || read.fields.warningExpiresAt <= read.fields.replayUntil
  ) return null;
  return Object.freeze({
    state: 'needs-review',
    packId: read.fields.packId,
    replayUntil: read.fields.replayUntil,
    warningExpiresAt: read.fields.warningExpiresAt,
  });
}

function readSourcePreview(value: unknown): SourcePreviewDtoV1 | null {
  if (__CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ !== 'synthetic-development') return null;
  const read = readData(value, SOURCE_PREVIEW_KEYS);
  if (!read.ok) return null;
  const item = read.fields;
  if (
    (item.language !== 'en' && item.language !== 'hi')
    || typeof item.simpleMode !== 'boolean'
    || item.destinationName !== 'Fictional destination fixture'
    || item.routeKey !== 'synthetic-fixture'
    || item.routeRegistryVersion !== 'challansakshi.official-routes/v1'
    || item.adapterContractVersion !== 'challansakshi.adapter-contract/v1'
    || !isCanonicalIso(item.expiresAt)
    || !isDisplayText(item.description)
    || (item.categoryPresentation !== null
      && item.categoryPresentation !== '4 Wheeler Challan On 2 Wheeler')
  ) return null;
  return Object.freeze({
    language: item.language,
    simpleMode: item.simpleMode,
    destinationName: item.destinationName,
    routeKey: item.routeKey,
    routeRegistryVersion: item.routeRegistryVersion,
    adapterContractVersion: item.adapterContractVersion,
    expiresAt: item.expiresAt,
    description: item.description,
    categoryPresentation: item.categoryPresentation,
  }) as SourcePreviewDtoV1;
}

function readDestinationPreview(value: unknown): DestinationPreviewDtoV1 | null {
  if (__CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ !== 'synthetic-development') return null;
  const read = readData(value, DESTINATION_PREVIEW_KEYS);
  if (!read.ok) return null;
  const item = read.fields;
  if (
    (item.language !== 'en' && item.language !== 'hi')
    || typeof item.simpleMode !== 'boolean'
    || item.domain !== '127.0.0.1:3000'
    || item.purpose !== 'Place the reviewed fictional category and description into the two blank synthetic fields.'
    || item.adapterId !== 'synthetic-fixture'
    || item.adapterRevision !== 'challansakshi.synthetic-destination/v1'
    || item.lastVerifiedAt !== '2026-09-03T00:00:00.000Z'
    || item.adapterExpiresAt !== '2026-10-03T00:00:00.000Z'
    || !isDisplayText(item.description)
    || item.categoryPresentation !== '4 Wheeler Challan On 2 Wheeler'
  ) return null;
  return Object.freeze({
    language: item.language,
    simpleMode: item.simpleMode,
    domain: item.domain,
    purpose: item.purpose,
    adapterId: item.adapterId,
    adapterRevision: item.adapterRevision,
    lastVerifiedAt: item.lastVerifiedAt,
    adapterExpiresAt: item.adapterExpiresAt,
    description: item.description,
    categoryPresentation: item.categoryPresentation,
  }) as DestinationPreviewDtoV1;
}

export function validateWorkerResponseForCommand<C extends WorkerCommand | null>(
  value: unknown,
  expectedCommand: C,
): WorkerResponseForCommand<C> | null;
export function validateWorkerResponseForCommand(
  value: unknown,
  expectedCommand: WorkerCommand | null,
): WorkerResponseV1 | null {
  if (expectedCommand !== null && !isCommand(expectedCommand)) return null;
  const discriminant = readData(value, ['schema', 'command', 'state'], false);
  if (
    !discriminant.ok
    || discriminant.fields.schema !== WORKER_RESPONSE_SCHEMA
    || typeof discriminant.fields.state !== 'string'
  ) return null;
  const command = discriminant.fields.command;
  const state = discriminant.fields.state as WorkerResponseState;

  if (expectedCommand === null) {
    const rejected = readData(value, ['schema', 'command', 'state', 'code']);
    if (
      !hasExactDiscriminant(rejected, null, 'rejected')
      || command !== null
      || state !== 'rejected'
      || (rejected.fields.code !== 'invalid-sender' && rejected.fields.code !== 'invalid-request')
    ) return null;
    return Object.freeze({
      schema: WORKER_RESPONSE_SCHEMA,
      command: null,
      state: 'rejected',
      code: rejected.fields.code,
    });
  }

  if (command !== expectedCommand || !STATE_MATRIX[expectedCommand].has(state)) return null;
  if (state === 'source-preview') {
    const read = readData(value, ['schema', 'command', 'state', 'preview', 'sourcePreviewBinding']);
    const preview = read.ok ? readSourcePreview(read.fields.preview) : null;
    const sourcePreviewBinding = read.ok ? readBinding(read.fields.sourcePreviewBinding) : null;
    if (
      !hasExactDiscriminant(read, expectedCommand, state)
      || !preview
      || !sourcePreviewBinding
      || expectedCommand !== 'preview-current-page'
    ) return null;
    return Object.freeze({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'source-preview',
      preview,
      sourcePreviewBinding,
    });
  }
  if (state === 'staged') {
    const read = readData(value, [
      'schema', 'command', 'state', 'generation', 'packId', 'effectiveExpiresAtMs',
    ]);
    if (
      !hasExactDiscriminant(read, expectedCommand, state)
      || (expectedCommand !== 'preview-current-page' && expectedCommand !== 'load-reviewed-fields')
      || typeof read.fields.generation !== 'string'
      || !OPAQUE_PATTERN.test(read.fields.generation)
      || typeof read.fields.packId !== 'string'
      || !OPAQUE_PATTERN.test(read.fields.packId)
      || !isRepresentableEpoch(read.fields.effectiveExpiresAtMs)
    ) return null;
    return Object.freeze({
      schema: WORKER_RESPONSE_SCHEMA,
      command: expectedCommand,
      state: 'staged',
      generation: read.fields.generation,
      packId: read.fields.packId,
      effectiveExpiresAtMs: read.fields.effectiveExpiresAtMs,
    });
  }
  if (state === 'destination-preview') {
    const read = readData(value, [
      'schema', 'command', 'state', 'generation', 'packId', 'effectiveExpiresAtMs', 'preview',
    ]);
    const preview = read.ok ? readDestinationPreview(read.fields.preview) : null;
    if (
      !hasExactDiscriminant(read, expectedCommand, state)
      || expectedCommand !== 'preview-current-page'
      || typeof read.fields.generation !== 'string'
      || !OPAQUE_PATTERN.test(read.fields.generation)
      || typeof read.fields.packId !== 'string'
      || !OPAQUE_PATTERN.test(read.fields.packId)
      || !isRepresentableEpoch(read.fields.effectiveExpiresAtMs)
      || !preview
    ) return null;
    return Object.freeze({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'destination-preview',
      generation: read.fields.generation,
      packId: read.fields.packId,
      effectiveExpiresAtMs: read.fields.effectiveExpiresAtMs,
      preview,
    });
  }
  if (state === 'partial' || state === 'needs-review') {
    let immediate: boolean;
    try {
      immediate = Reflect.ownKeys(value as object).length === 5;
    } catch {
      return null;
    }
    if (immediate) {
      const read = readData(value, ['schema', 'command', 'state', 'code', 'warning']);
      const warning = read.ok ? readWarning(read.fields.warning) : null;
      if (
        !hasExactDiscriminant(read, expectedCommand, state)
        || expectedCommand !== 'fill-empty-reviewed-fields'
        || !warning
      ) return null;
      if (state === 'partial' && read.fields.code === 'partial') {
        return Object.freeze({
          schema: WORKER_RESPONSE_SCHEMA,
          command: expectedCommand,
          state,
          code: 'partial',
          warning,
        });
      }
      if (
        state === 'needs-review'
        && (read.fields.code === 'indeterminate' || read.fields.code === 'late-complete')
      ) return Object.freeze({
        schema: WORKER_RESPONSE_SCHEMA,
        command: expectedCommand,
        state,
        code: read.fields.code,
        warning,
      });
      return null;
    }
    const read = readData(value, ['schema', 'command', 'state', 'warning']);
    const warning = read.ok ? readWarning(read.fields.warning) : null;
    if (
      !hasExactDiscriminant(read, expectedCommand, state)
      || state !== 'needs-review'
      || !warning
    ) return null;
    return Object.freeze({
      schema: WORKER_RESPONSE_SCHEMA,
      command: expectedCommand,
      state,
      warning,
    }) as WorkerResponseV1;
  }
  if (state === 'rejected') {
    const read = readData(value, ['schema', 'command', 'state', 'code']);
    if (
      !hasExactDiscriminant(read, expectedCommand, state)
      || typeof read.fields.code !== 'string'
      || !REJECTED_CODE_MATRIX[expectedCommand].has(read.fields.code as WorkerRejectedCode)
    ) return null;
    return Object.freeze({
      schema: WORKER_RESPONSE_SCHEMA,
      command: expectedCommand,
      state: 'rejected',
      code: read.fields.code as WorkerRejectedCode,
    }) as WorkerResponseV1;
  }
  const read = readData(value, ['schema', 'command', 'state']);
  if (!hasExactDiscriminant(read, expectedCommand, state)) return null;
  return Object.freeze({
    schema: WORKER_RESPONSE_SCHEMA,
    command: expectedCommand,
    state,
  }) as WorkerResponseV1;
}

export function buildRejectedWorkerResponse(
  command: WorkerCommand | null,
  code: WorkerRejectedCode,
): WorkerResponseV1 {
  const candidate = { schema: WORKER_RESPONSE_SCHEMA, command, state: 'rejected', code };
  const validated = validateWorkerResponseForCommand(candidate, command);
  if (!validated) throw new TypeError('Invalid rejected worker response.');
  return validated;
}

export function buildFixedWorkerResponse(
  command: WorkerCommand,
  state: Extract<WorkerResponseState,
    'success' | 'unresolved-live' | 'unresolved-orphaned' | 'quarantined' | 'expired'
    | 'unsupported' | 'adapter-disabled' | 'empty'>,
): WorkerResponseV1 {
  const candidate = { schema: WORKER_RESPONSE_SCHEMA, command, state };
  const validated = validateWorkerResponseForCommand(candidate, command);
  if (!validated) throw new TypeError('Invalid fixed worker response.');
  return validated;
}
