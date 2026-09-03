import {
  digestCanonicalExtensionHandoffEnvelopeCore,
  validateExtensionHandoffEnvelopeAgainstAuthority,
  type CanonicalExtensionHandoffEnvelope,
  type ExtensionEnvelopeValidationAuthority,
} from '../../lib/extension-handoff-envelope-core';
import { probeProductionChallanSakshiSource } from './source-probe-production';
import { probeSyntheticChallanSakshiSource } from './source-probe-synthetic';
import type { ExtensionBuildProfileId, ExtensionEnvelopeMode, ExtensionSourceRegistry } from './manifest';

declare const __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__: ExtensionBuildProfileId;
declare const __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__: Readonly<{
  profileId: ExtensionBuildProfileId;
  envelopeMode: ExtensionEnvelopeMode;
  sourceRegistry: ExtensionSourceRegistry;
  envelopeValidationAuthority: ExtensionEnvelopeValidationAuthority;
}>;

type ExtensionHandoffEnvelope = CanonicalExtensionHandoffEnvelope;

export const SOURCE_CONTRACT_VERSION = 'challansakshi.source-contract/v1' as const;
export const SOURCE_PROBE_PLAN_SCHEMA = 'challansakshi.source-probe-plan/v1' as const;
export const SOURCE_PREVIEW_BINDING_SCHEMA = 'challansakshi.source-preview-binding/v1' as const;

export type SourceProbePlanV1 = Readonly<{
  schema: typeof SOURCE_PROBE_PLAN_SCHEMA;
  sourceContractVersion: typeof SOURCE_CONTRACT_VERSION;
  expectedEnvelopeSchema: 'challansakshi.extension-handoff/v1';
  expectedEnvelopeMode: 'real' | 'synthetic';
  rootAttribute: 'data-challansakshi-extension-handoff';
  rootValue: 'v1';
  envelopeAttribute: 'data-challansakshi-extension-envelope';
  envelopeValue: 'v1';
  expectedLocation: Readonly<{
    protocol: 'https:' | 'http:';
    hostname: string;
    port: string;
    pathname: string;
    allowedSearches: readonly string[];
  }>;
  operationNotAfterMs: number;
}>;

export type SourcePreviewBindingV1 = Readonly<{
  schema: typeof SOURCE_PREVIEW_BINDING_SCHEMA;
  sourceTabId: number;
  sourceDocumentId: string;
  canonicalEnvelopeDigest: string;
  previewNotAfterMs: number;
}>;

export type SourceProbeRejectionCode =
  | 'invalid-plan'
  | 'not-top-frame'
  | 'deadline-reached'
  | 'location-mismatch'
  | 'capsule-topology-mismatch'
  | 'capsule-too-large'
  | 'invalid-json'
  | 'invalid-envelope'
  | 'non-canonical-envelope';

export type SourceProbeResult =
  | Readonly<{ status: 'accepted'; envelope: ExtensionHandoffEnvelope }>
  | Readonly<{ status: 'rejected'; code: SourceProbeRejectionCode }>;

export type SourceValidationContext = Readonly<{
  profile: 'synthetic-development' | 'production-disabled';
  sourceTabId: number;
  nowMs: number;
  importedAtMs: number;
}>;

export type SourcePreviewValidationRejectionReason =
  | 'invalid-validation-context'
  | 'invalid-injection-result'
  | 'source-probe-rejected'
  | 'invalid-envelope';

export type SourcePreviewValidationResult =
  | Readonly<{
    status: 'accepted';
    envelope: ExtensionHandoffEnvelope;
    canonicalJson: string;
    effectiveExpiresAtMs: number;
    binding: SourcePreviewBindingV1;
  }>
  | Readonly<{
    status: 'rejected';
    reason: SourcePreviewValidationRejectionReason;
  }>;

export type SourceReprobeValidationResult = SourcePreviewValidationResult | Readonly<{
  status: 'rejected';
  reason: 'preview-expired' | 'source-document-mismatch' | 'source-binding-mismatch';
}>;

export const probeChallanSakshiSource = __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development'
  ? probeSyntheticChallanSakshiSource
  : probeProductionChallanSakshiSource;

export function createSourceProbePlan(operationNotAfterMs: number): SourceProbePlanV1 {
  if (!Number.isSafeInteger(operationNotAfterMs) || operationNotAfterMs < 0) {
    throw new Error('Invalid source probe deadline.');
  }
  const authority = __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__;
  if (authority.profileId !== __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__) {
    throw new Error('Invalid compile-time source authority.');
  }
  return Object.freeze({
    schema: SOURCE_PROBE_PLAN_SCHEMA,
    sourceContractVersion: SOURCE_CONTRACT_VERSION,
    expectedEnvelopeSchema: 'challansakshi.extension-handoff/v1',
    expectedEnvelopeMode: authority.envelopeMode,
    rootAttribute: 'data-challansakshi-extension-handoff',
    rootValue: 'v1',
    envelopeAttribute: 'data-challansakshi-extension-envelope',
    envelopeValue: 'v1',
    expectedLocation: Object.freeze({
      protocol: authority.sourceRegistry.protocol,
      hostname: authority.sourceRegistry.hostname,
      port: authority.sourceRegistry.port,
      pathname: authority.sourceRegistry.pathname,
      allowedSearches: Object.freeze([...authority.sourceRegistry.allowedSearches]),
    }),
    operationNotAfterMs,
  });
}

type DataRecordRead =
  | Readonly<{ ok: true; values: Readonly<Record<string, unknown>> }>
  | Readonly<{ ok: false }>;

const SOURCE_CONTEXT_KEYS = Object.freeze(['profile', 'sourceTabId', 'nowMs', 'importedAtMs'] as const);
const INJECTION_RESULT_KEYS = Object.freeze(['frameId', 'documentId', 'result'] as const);
const ACCEPTED_PROBE_RESULT_KEYS = Object.freeze(['status', 'envelope'] as const);
const REJECTED_PROBE_RESULT_KEYS = Object.freeze(['status', 'code'] as const);
const BINDING_KEYS = Object.freeze([
  'schema', 'sourceTabId', 'sourceDocumentId', 'canonicalEnvelopeDigest', 'previewNotAfterMs',
] as const);
const DOCUMENT_ID_PATTERN = /^[\x21-\x7e]{1,128}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const PROBE_REJECTION_CODES: ReadonlySet<string> = new Set([
  'invalid-plan',
  'not-top-frame',
  'deadline-reached',
  'location-mismatch',
  'capsule-topology-mismatch',
  'capsule-too-large',
  'invalid-json',
  'invalid-envelope',
  'non-canonical-envelope',
]);

function readPlainDataRecord(value: unknown, expectedKeys: readonly string[]): DataRecordRead {
  try {
    if (
      typeof value !== 'object'
      || value === null
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return { ok: false };
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))
    ) return { ok: false };
    const values: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return { ok: false };
      values[key] = descriptor.value;
    }
    return { ok: true, values: Object.freeze(values) };
  } catch {
    return { ok: false };
  }
}

function readExactSingleInjectionResult(value: unknown): Readonly<{
  documentId: string;
  result: SourceProbeResult;
}> | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    if (value.length !== 1 || Reflect.ownKeys(value).join(',') !== '0,length') return null;
    const itemDescriptor = Object.getOwnPropertyDescriptor(value, '0');
    if (!itemDescriptor || !itemDescriptor.enumerable || !('value' in itemDescriptor)) return null;
    const itemRead = readPlainDataRecord(itemDescriptor.value, INJECTION_RESULT_KEYS);
    if (!itemRead.ok) return null;
    const { frameId, documentId, result } = itemRead.values;
    if (
      frameId !== 0
      || typeof documentId !== 'string'
      || !DOCUMENT_ID_PATTERN.test(documentId)
    ) return null;

    const acceptedRead = readPlainDataRecord(result, ACCEPTED_PROBE_RESULT_KEYS);
    if (acceptedRead.ok && acceptedRead.values.status === 'accepted') {
      return Object.freeze({
        documentId,
        result: Object.freeze({
          status: 'accepted' as const,
          envelope: acceptedRead.values.envelope as ExtensionHandoffEnvelope,
        }),
      });
    }
    const rejectedRead = readPlainDataRecord(result, REJECTED_PROBE_RESULT_KEYS);
    if (
      rejectedRead.ok
      && rejectedRead.values.status === 'rejected'
      && typeof rejectedRead.values.code === 'string'
      && PROBE_REJECTION_CODES.has(rejectedRead.values.code)
    ) {
      return Object.freeze({
        documentId,
        result: Object.freeze({
          status: 'rejected' as const,
          code: rejectedRead.values.code as SourceProbeRejectionCode,
        }),
      });
    }
    return null;
  } catch {
    return null;
  }
}

function readValidationContext(value: unknown): SourceValidationContext | null {
  const read = readPlainDataRecord(value, SOURCE_CONTEXT_KEYS);
  if (!read.ok) return null;
  const { profile, sourceTabId, nowMs, importedAtMs } = read.values;
  if (
    profile !== __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__
    || !Number.isSafeInteger(sourceTabId)
    || (sourceTabId as number) < 0
    || !Number.isSafeInteger(nowMs)
    || (nowMs as number) < 0
    || !Number.isSafeInteger(importedAtMs)
    || (importedAtMs as number) < 0
    || (importedAtMs as number) > (nowMs as number)
  ) return null;
  return Object.freeze({
    profile: __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__,
    sourceTabId: sourceTabId as number,
    nowMs: nowMs as number,
    importedAtMs: importedAtMs as number,
  });
}

function readSourcePreviewBindingV1(
  value: unknown,
  nowMs: unknown,
): SourcePreviewBindingV1 | null {
  if (!Number.isSafeInteger(nowMs) || (nowMs as number) < 0) return null;
  const read = readPlainDataRecord(value, BINDING_KEYS);
  if (!read.ok) return null;
  const binding = read.values;
  if (
    binding.schema !== SOURCE_PREVIEW_BINDING_SCHEMA
    || !Number.isSafeInteger(binding.sourceTabId)
    || (binding.sourceTabId as number) < 0
    || typeof binding.sourceDocumentId !== 'string'
    || !DOCUMENT_ID_PATTERN.test(binding.sourceDocumentId)
    || typeof binding.canonicalEnvelopeDigest !== 'string'
    || !DIGEST_PATTERN.test(binding.canonicalEnvelopeDigest)
    || !Number.isSafeInteger(binding.previewNotAfterMs)
    || (binding.previewNotAfterMs as number) <= (nowMs as number)
  ) return null;
  return Object.freeze({
    schema: SOURCE_PREVIEW_BINDING_SCHEMA,
    sourceTabId: binding.sourceTabId as number,
    sourceDocumentId: binding.sourceDocumentId,
    canonicalEnvelopeDigest: binding.canonicalEnvelopeDigest,
    previewNotAfterMs: binding.previewNotAfterMs as number,
  });
}

export function isSourcePreviewBindingV1(
  value: unknown,
  nowMs: unknown,
): value is SourcePreviewBindingV1 {
  return readSourcePreviewBindingV1(value, nowMs) !== null;
}

export function validateSourcePreviewInjectionResult(
  injectionResults: unknown,
  context: unknown,
): SourcePreviewValidationResult {
  const checkedContext = readValidationContext(context);
  if (!checkedContext) {
    return Object.freeze({ status: 'rejected', reason: 'invalid-validation-context' });
  }
  const injection = readExactSingleInjectionResult(injectionResults);
  if (!injection) {
    return Object.freeze({ status: 'rejected', reason: 'invalid-injection-result' });
  }
  if (injection.result.status !== 'accepted') {
    return Object.freeze({ status: 'rejected', reason: 'source-probe-rejected' });
  }
  const validation = validateExtensionHandoffEnvelopeAgainstAuthority(
    injection.result.envelope,
    Object.freeze({
      profile: checkedContext.profile,
      nowMs: checkedContext.nowMs,
      importedAtMs: checkedContext.importedAtMs,
    }),
    __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__.envelopeValidationAuthority,
  );
  if (validation.status !== 'accepted') {
    return Object.freeze({ status: 'rejected', reason: 'invalid-envelope' });
  }
  const expiresAtMs = new Date(validation.envelope.expiresAt).getTime();
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= checkedContext.nowMs) {
    return Object.freeze({ status: 'rejected', reason: 'invalid-envelope' });
  }
  const binding = Object.freeze({
    schema: SOURCE_PREVIEW_BINDING_SCHEMA,
    sourceTabId: checkedContext.sourceTabId,
    sourceDocumentId: injection.documentId,
    canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelopeCore(validation.envelope),
    previewNotAfterMs: expiresAtMs,
  });
  return Object.freeze({
    status: 'accepted',
    envelope: validation.envelope,
    canonicalJson: validation.canonicalJson,
    effectiveExpiresAtMs: validation.effectiveExpiresAtMs,
    binding,
  });
}

function digestsMatch(left: string, right: string): boolean {
  if (left.length !== 64 || right.length !== 64) return false;
  let difference = 0;
  for (let index = 0; index < 64; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function validateSourceReprobeInjectionResult(
  injectionResults: unknown,
  context: unknown,
  expectedBinding: unknown,
): SourceReprobeValidationResult {
  const checkedContext = readValidationContext(context);
  if (!checkedContext) {
    return Object.freeze({ status: 'rejected', reason: 'invalid-validation-context' });
  }
  const checkedBinding = readSourcePreviewBindingV1(expectedBinding, checkedContext.nowMs);
  if (!checkedBinding) {
    return Object.freeze({ status: 'rejected', reason: 'preview-expired' });
  }
  const validated = validateSourcePreviewInjectionResult(injectionResults, checkedContext);
  if (validated.status !== 'accepted') return validated;
  if (
    checkedBinding.sourceTabId !== checkedContext.sourceTabId
    || validated.binding.sourceDocumentId !== checkedBinding.sourceDocumentId
  ) {
    return Object.freeze({ status: 'rejected', reason: 'source-document-mismatch' });
  }
  if (
    validated.binding.previewNotAfterMs !== checkedBinding.previewNotAfterMs
    || !digestsMatch(
      validated.binding.canonicalEnvelopeDigest,
      checkedBinding.canonicalEnvelopeDigest,
    )
  ) {
    return Object.freeze({ status: 'rejected', reason: 'source-binding-mismatch' });
  }
  return validated;
}
