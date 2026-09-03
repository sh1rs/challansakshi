import type { ExtensionHandoffEnvelope } from '../../lib/extension-handoff-contract';
import {
  DESTINATION_FINGERPRINT_SCHEMA,
  DESTINATION_INJECTION_PLAN_SCHEMA,
  preflightOrFillDestination,
  type DestinationFillPlanV1,
  type DestinationFormV1,
  type DestinationLocationV1,
  type DestinationPreviewPlanV1,
  type DestinationStructuralFingerprintV1,
} from './fill-page';
import type {
  DestinationPlanBuildResult,
  EnabledDestinationAdapterV1,
} from './destination-adapters';

// Neutral duplicated leaf literals are intentional: importing the web fixture module here would
// pull its route graph into the worker and defeat opposite-profile tree shaking.
const FIXTURE = {
  sourcePath: '/demo/extension-fixture/source',
  destinationPath: '/demo/extension-fixture/destination',
  formId: 'challansakshi-synthetic-destination-form',
  formName: 'challansakshiSyntheticDestination',
  formMarkerAttribute: 'data-challansakshi-fixture-form',
  formMarkerValue: 'v1',
  containerAttribute: 'data-challansakshi-fixture-container',
  categoryContainerValue: 'category',
  categoryId: 'challansakshi-synthetic-category',
  categoryName: 'syntheticCategory',
  categoryLabel: 'Fictional review category',
  neutralLabel: 'Choose a fictional category',
  mappedValue: '4 Wheeler Challan On 2 Wheeler',
  descriptionContainerValue: 'description',
  descriptionId: 'challansakshi-synthetic-description',
  descriptionName: 'syntheticDescription',
  descriptionLabel: 'Fictional reviewed description',
  descriptionMinLength: 1,
  descriptionMaxLength: 500,
} as const;

const ADAPTER_EXPIRES_AT_MS = 1_790_985_600_000;
const ADAPTER_REVISION = 'challansakshi.synthetic-destination/v1' as const;
const ENVELOPE_KEYS = [
  'schema', 'mode', 'packId', 'resultRevisionId', 'packRevisionId',
  'routeRegistryVersion', 'adapterContractVersion', 'description', 'descriptionDigest',
  'language', 'simpleMode', 'confirmed', 'deviceMode', 'issuedAt', 'expiresAt',
  'routeKey', 'issueCode',
] as const;

function createSyntheticAdapter(): EnabledDestinationAdapterV1 {
  const expectedLocation = Object.freeze({
    protocol: 'http:',
    hostname: '127.0.0.1',
    port: '3000',
    pathname: FIXTURE.destinationPath,
    username: '',
    password: '',
    search: '',
    hash: '',
  }) satisfies DestinationLocationV1;
  const expectedForm = Object.freeze({
    selector: Object.freeze({ kind: 'id', value: FIXTURE.formId }),
    tag: 'form',
    id: FIXTURE.formId,
    name: FIXTURE.formName,
    method: 'post',
    action: `http://127.0.0.1:3000${FIXTURE.destinationPath}`,
    markerAttribute: FIXTURE.formMarkerAttribute,
    markerValue: FIXTURE.formMarkerValue,
  }) satisfies DestinationFormV1;
  const structuralFingerprint = Object.freeze([
    DESTINATION_FINGERPRINT_SCHEMA,
    expectedLocation.protocol,
    expectedLocation.hostname,
    expectedLocation.port,
    expectedLocation.pathname,
    expectedLocation.username,
    expectedLocation.password,
    expectedLocation.search,
    expectedLocation.hash,
    expectedForm.tag,
    expectedForm.selector.kind,
    expectedForm.selector.value,
    expectedForm.id,
    expectedForm.name,
    expectedForm.method,
    expectedForm.action,
    expectedForm.markerAttribute,
    expectedForm.markerValue,
    'category',
    'select',
    'id',
    FIXTURE.categoryId,
    FIXTURE.categoryId,
    FIXTURE.categoryName,
    FIXTURE.categoryLabel,
    'section',
    FIXTURE.containerAttribute,
    FIXTURE.categoryContainerValue,
    'HTMLSelectElement.value',
    0,
    '',
    FIXTURE.neutralLabel,
    false,
    false,
    false,
    false,
    false,
    1,
    FIXTURE.mappedValue,
    FIXTURE.mappedValue,
    false,
    false,
    false,
    false,
    false,
    'description',
    'textarea',
    'id',
    FIXTURE.descriptionId,
    FIXTURE.descriptionId,
    FIXTURE.descriptionName,
    FIXTURE.descriptionLabel,
    'section',
    FIXTURE.containerAttribute,
    FIXTURE.descriptionContainerValue,
    'HTMLTextAreaElement.value',
    true,
    String(FIXTURE.descriptionMinLength),
    true,
    String(FIXTURE.descriptionMaxLength),
    FIXTURE.descriptionMinLength,
    FIXTURE.descriptionMaxLength,
    true,
    false,
    ADAPTER_REVISION,
  ] as const) satisfies DestinationStructuralFingerprintV1;
  return Object.freeze({
    schema: 'challansakshi.destination-adapter/v1',
    id: 'synthetic-fixture',
    routeKey: 'synthetic-fixture',
    adapterContractVersion: 'challansakshi.adapter-contract/v1',
    routeRegistryVersion: 'challansakshi.official-routes/v1',
    adapterRevision: ADAPTER_REVISION,
    releaseState: 'synthetic',
    enabled: true,
    supportedFields: Object.freeze(['category', 'description'] as const),
    source: Object.freeze({
      protocol: 'http:',
      hostname: '127.0.0.1',
      port: '3000',
      pathname: FIXTURE.sourcePath,
    }),
    destination: Object.freeze({
      protocol: expectedLocation.protocol,
      hostname: expectedLocation.hostname,
      port: expectedLocation.port,
      pathname: expectedLocation.pathname,
    }),
    expectedLocation,
    expectedForm,
    fields: Object.freeze(['category', 'description'] as const),
    structuralFingerprint,
    dispatchedEvents: Object.freeze([] as const),
    evidenceReference: 'tests/synthetic-extension-fixture-contract.test.ts',
    verifier: 'automated-synthetic-fixture-contract',
    legalStatus: 'synthetic-fixture-only',
    lastVerifiedAt: '2026-09-03T00:00:00.000Z',
    expiresAt: '2026-10-03T00:00:00.000Z',
  });
}

function readPlainInput(value: unknown, expectedKeys: readonly string[]): Record<string, unknown> | null {
  try {
    if (
      typeof value !== 'object'
      || value === null
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length) return null;
    for (let index = 0; index < expectedKeys.length; index += 1) {
      if (keys[index] !== expectedKeys[index]) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, expectedKeys[index]!);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readSyntheticEnvelopeRecord(value: unknown): Record<string, unknown> | null {
  return readPlainInput(value, ENVELOPE_KEYS);
}

function validateSyntheticEnvelope(
  envelope: Record<string, unknown>,
  adapter: EnabledDestinationAdapterV1,
): ExtensionHandoffEnvelope | null {
  if (
    envelope.schema !== 'challansakshi.extension-handoff/v1'
    || envelope.mode !== 'synthetic'
    || envelope.routeKey !== 'synthetic-fixture'
    || envelope.issueCode !== 'four-wheeler-on-two-wheeler'
    || envelope.routeRegistryVersion !== adapter.routeRegistryVersion
    || envelope.adapterContractVersion !== adapter.adapterContractVersion
    || typeof envelope.description !== 'string'
    || envelope.description.length < FIXTURE.descriptionMinLength
    || envelope.description.length > FIXTURE.descriptionMaxLength
    || envelope.confirmed !== true
    || envelope.deviceMode !== 'private'
  ) return null;
  return envelope as unknown as ExtensionHandoffEnvelope;
}

function readPlanTimes(input: Record<string, unknown>) {
  if (
    !Number.isSafeInteger(input.effectiveExpiresAtMs)
    || (input.effectiveExpiresAtMs as number) <= 0
    || !Number.isSafeInteger(input.operationNotAfterMs)
    || (input.operationNotAfterMs as number) <= 0
    || (input.operationNotAfterMs as number) > (input.effectiveExpiresAtMs as number)
    || (input.operationNotAfterMs as number) > ADAPTER_EXPIRES_AT_MS
  ) return null;
  return {
    effectiveExpiresAtMs: input.effectiveExpiresAtMs as number,
    operationNotAfterMs: input.operationNotAfterMs as number,
  };
}

function basePlan(
  adapter: EnabledDestinationAdapterV1,
  times: { effectiveExpiresAtMs: number; operationNotAfterMs: number },
) {
  return {
    schema: DESTINATION_INJECTION_PLAN_SCHEMA,
    adapterId: adapter.id,
    adapterContractVersion: adapter.adapterContractVersion,
    routeRegistryVersion: adapter.routeRegistryVersion,
    adapterRevision: adapter.adapterRevision,
    expectedLocation: adapter.expectedLocation,
    expectedForm: adapter.expectedForm,
    fields: adapter.fields,
    structuralFingerprint: adapter.structuralFingerprint,
    dispatchedEvents: adapter.dispatchedEvents,
    effectiveExpiresAtMs: times.effectiveExpiresAtMs,
    adapterExpiresAtMs: ADAPTER_EXPIRES_AT_MS,
    operationNotAfterMs: times.operationNotAfterMs,
  } as const;
}

export function getSyntheticDestinationAdapters(): readonly [EnabledDestinationAdapterV1] {
  return Object.freeze([createSyntheticAdapter()] as const);
}

export function buildSyntheticDestinationPreviewPlan(
  value: unknown,
): DestinationPlanBuildResult<DestinationPreviewPlanV1> {
  const input = readPlainInput(value, ['envelope', 'effectiveExpiresAtMs', 'operationNotAfterMs']);
  if (!input) return Object.freeze({ status: 'rejected' });
  const envelopeRecord = readSyntheticEnvelopeRecord(input.envelope);
  if (!envelopeRecord) return Object.freeze({ status: 'rejected' });
  const adapter = createSyntheticAdapter();
  const checkedEnvelope = validateSyntheticEnvelope(envelopeRecord, adapter);
  if (!checkedEnvelope) {
    return Object.freeze({
      status: envelopeRecord.mode === 'synthetic' && envelopeRecord.routeKey === 'synthetic-fixture'
        ? 'unsupported'
        : 'rejected',
    });
  }
  const times = readPlanTimes(input);
  if (!times) return Object.freeze({ status: 'rejected' });
  const base = basePlan(adapter, times);
  const plan = Object.freeze({
    schema: base.schema,
    operation: 'preview',
    adapterId: base.adapterId,
    adapterContractVersion: base.adapterContractVersion,
    routeRegistryVersion: base.routeRegistryVersion,
    adapterRevision: base.adapterRevision,
    expectedLocation: base.expectedLocation,
    expectedForm: base.expectedForm,
    fields: base.fields,
    structuralFingerprint: base.structuralFingerprint,
    dispatchedEvents: base.dispatchedEvents,
    effectiveExpiresAtMs: base.effectiveExpiresAtMs,
    adapterExpiresAtMs: base.adapterExpiresAtMs,
    operationNotAfterMs: base.operationNotAfterMs,
    values: null,
  }) satisfies DestinationPreviewPlanV1;
  void checkedEnvelope;
  return Object.freeze({ status: 'built', adapter, plan });
}

export function buildSyntheticDestinationFillPlan(
  value: unknown,
): DestinationPlanBuildResult<DestinationFillPlanV1> {
  const input = readPlainInput(value, [
    'envelope', 'effectiveExpiresAtMs', 'operationNotAfterMs', 'attemptId',
  ]);
  if (!input) return Object.freeze({ status: 'rejected' });
  const envelopeRecord = readSyntheticEnvelopeRecord(input.envelope);
  if (!envelopeRecord) return Object.freeze({ status: 'rejected' });
  const adapter = createSyntheticAdapter();
  const checkedEnvelope = validateSyntheticEnvelope(envelopeRecord, adapter);
  if (!checkedEnvelope) {
    return Object.freeze({
      status: envelopeRecord.mode === 'synthetic' && envelopeRecord.routeKey === 'synthetic-fixture'
        ? 'unsupported'
        : 'rejected',
    });
  }
  const times = readPlanTimes(input);
  if (!times || typeof input.attemptId !== 'string' || !/^[0-9a-f]{32}$/.test(input.attemptId)) {
    return Object.freeze({ status: 'rejected' });
  }
  const base = basePlan(adapter, times);
  const plan = Object.freeze({
    schema: base.schema,
    operation: 'fill',
    adapterId: base.adapterId,
    adapterContractVersion: base.adapterContractVersion,
    routeRegistryVersion: base.routeRegistryVersion,
    adapterRevision: base.adapterRevision,
    expectedLocation: base.expectedLocation,
    expectedForm: base.expectedForm,
    fields: base.fields,
    structuralFingerprint: base.structuralFingerprint,
    dispatchedEvents: base.dispatchedEvents,
    effectiveExpiresAtMs: base.effectiveExpiresAtMs,
    adapterExpiresAtMs: base.adapterExpiresAtMs,
    operationNotAfterMs: base.operationNotAfterMs,
    attemptId: input.attemptId,
    values: Object.freeze({
      category: FIXTURE.mappedValue,
      description: checkedEnvelope.description,
    }),
  }) satisfies DestinationFillPlanV1;
  return Object.freeze({ status: 'built', adapter, plan });
}

export const syntheticDestinationInjectedFunction = preflightOrFillDestination;
