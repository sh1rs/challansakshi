import {
  digestCanonicalExtensionHandoffEnvelope,
  validateExtensionHandoffEnvelope,
  type ExtensionHandoffEnvelope,
} from '../../lib/extension-handoff-contract';

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

/**
 * Runs in Chrome's isolated page realm. Keep this function completely
 * self-contained: chrome.scripting serializes only its source and JSON argument.
 */
export function probeChallanSakshiSource(plan: unknown): SourceProbeResult {
  type LocalRead = { ok: true; values: Record<string, unknown> } | { ok: false };

  const reject = (code: SourceProbeRejectionCode): SourceProbeResult => Object.freeze({
    status: 'rejected' as const,
    code,
  });
  const isWellFormedUnicode = (value: string): boolean => {
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return false;
      }
    }
    return true;
  };
  const utf8ByteLength = (value: string): number => {
    let bytes = 0;
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index);
      if (unit <= 0x7f) bytes += 1;
      else if (unit <= 0x7ff) bytes += 2;
      else if (unit >= 0xd800 && unit <= 0xdbff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
      if (bytes > 8_192) return bytes;
    }
    return bytes;
  };
  const readRecord = (value: unknown, expectedKeys: readonly string[]): LocalRead => {
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
      return { ok: true, values };
    } catch {
      return { ok: false };
    }
  };
  const readStringArray = (value: unknown): readonly string[] | null => {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
      const keys = Reflect.ownKeys(value);
      if (
        keys.length !== value.length + 1
        || keys[keys.length - 1] !== 'length'
        || value.length < 1
        || value.length > 5
      ) return null;
      const result: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (keys[index] !== String(index)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          !descriptor
          || !descriptor.enumerable
          || !('value' in descriptor)
          || typeof descriptor.value !== 'string'
        ) return null;
        result.push(descriptor.value);
      }
      return result;
    } catch {
      return null;
    }
  };
  const matchesStrings = (left: readonly string[], right: readonly string[]): boolean => (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
  const isBoundedAscii = (value: unknown, maximum: number): value is string => (
    typeof value === 'string'
    && value.length <= maximum
    && /^[\x20-\x7e]*$/.test(value)
  );

  try {
    const planRead = readRecord(plan, [
      'schema',
      'sourceContractVersion',
      'expectedEnvelopeSchema',
      'expectedEnvelopeMode',
      'rootAttribute',
      'rootValue',
      'envelopeAttribute',
      'envelopeValue',
      'expectedLocation',
      'operationNotAfterMs',
    ]);
    if (!planRead.ok) return reject('invalid-plan');
    const checkedPlan = planRead.values;
    if (
      checkedPlan.schema !== 'challansakshi.source-probe-plan/v1'
      || checkedPlan.sourceContractVersion !== 'challansakshi.source-contract/v1'
      || checkedPlan.expectedEnvelopeSchema !== 'challansakshi.extension-handoff/v1'
      || (checkedPlan.expectedEnvelopeMode !== 'real' && checkedPlan.expectedEnvelopeMode !== 'synthetic')
      || checkedPlan.rootAttribute !== 'data-challansakshi-extension-handoff'
      || checkedPlan.rootValue !== 'v1'
      || checkedPlan.envelopeAttribute !== 'data-challansakshi-extension-envelope'
      || checkedPlan.envelopeValue !== 'v1'
      || !Number.isSafeInteger(checkedPlan.operationNotAfterMs)
      || (checkedPlan.operationNotAfterMs as number) < 0
    ) return reject('invalid-plan');

    const locationRead = readRecord(checkedPlan.expectedLocation, [
      'protocol', 'hostname', 'port', 'pathname', 'allowedSearches',
    ]);
    if (!locationRead.ok) return reject('invalid-plan');
    const expectedLocation = locationRead.values;
    const allowedSearches = readStringArray(expectedLocation.allowedSearches);
    if (
      !isBoundedAscii(expectedLocation.protocol, 8)
      || !isBoundedAscii(expectedLocation.hostname, 253)
      || expectedLocation.hostname.length === 0
      || !isBoundedAscii(expectedLocation.port, 5)
      || !isBoundedAscii(expectedLocation.pathname, 256)
      || expectedLocation.pathname.length === 0
      || !allowedSearches
      || allowedSearches.some((search) => !isBoundedAscii(search, 64))
    ) return reject('invalid-plan');

    const productionSearches = ['', '?goal=verify', '?goal=understand', '?goal=evidence', '?goal=resolve'];
    const isSyntheticPlan = checkedPlan.expectedEnvelopeMode === 'synthetic'
      && expectedLocation.protocol === 'http:'
      && expectedLocation.hostname === '127.0.0.1'
      && expectedLocation.port === '3000'
      && expectedLocation.pathname === '/demo/extension-fixture/source'
      && matchesStrings(allowedSearches, ['']);
    const isRealPlan = checkedPlan.expectedEnvelopeMode === 'real'
      && expectedLocation.protocol === 'https:'
      && expectedLocation.hostname === 'challansakshi.sh1rs.com'
      && expectedLocation.port === ''
      && expectedLocation.pathname === '/review'
      && matchesStrings(allowedSearches, productionSearches);
    if (!isSyntheticPlan && !isRealPlan) return reject('invalid-plan');

    if (Date.now() >= (checkedPlan.operationNotAfterMs as number)) return reject('deadline-reached');
    if (window.top !== window) return reject('not-top-frame');

    const currentLocation = window.location;
    const expectedHref = `${expectedLocation.protocol}//${expectedLocation.hostname}${
      expectedLocation.port === '' ? '' : `:${expectedLocation.port}`
    }${expectedLocation.pathname}${currentLocation.search}`;
    if (
      currentLocation.protocol !== expectedLocation.protocol
      || currentLocation.hostname !== expectedLocation.hostname
      || currentLocation.port !== expectedLocation.port
      || currentLocation.pathname !== expectedLocation.pathname
      || !allowedSearches.includes(currentLocation.search)
      || currentLocation.hash !== ''
      || currentLocation.href !== expectedHref
    ) return reject('location-mismatch');

    const roots = document.querySelectorAll('[data-challansakshi-extension-handoff]');
    const envelopes = document.querySelectorAll('[data-challansakshi-extension-envelope]');
    if (roots.length !== 1 || envelopes.length !== 1) return reject('capsule-topology-mismatch');
    const root = roots[0];
    const envelopeNode = envelopes[0];
    if (
      !root
      || !envelopeNode
      || root.nodeType !== 1
      || envelopeNode.nodeType !== 1
      || root.getAttribute('data-challansakshi-extension-handoff') !== 'v1'
      || envelopeNode.getAttribute('data-challansakshi-extension-envelope') !== 'v1'
      || root.childNodes.length !== 1
      || root.childNodes[0] !== envelopeNode
      || envelopeNode.parentNode !== root
      || envelopeNode.childNodes.length !== 1
      || envelopeNode.childNodes[0]?.nodeType !== 3
    ) return reject('capsule-topology-mismatch');

    const textNode = envelopeNode.childNodes[0] as Text;
    const raw = textNode.data;
    if (typeof raw !== 'string') return reject('capsule-topology-mismatch');
    if (raw.length > 8_192) return reject('capsule-too-large');
    if (!isWellFormedUnicode(raw)) return reject('invalid-json');
    if (utf8ByteLength(raw) > 8_192) return reject('capsule-too-large');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return reject('invalid-json');
    }
    const envelopeKeys = [
      'schema', 'mode', 'packId', 'resultRevisionId', 'packRevisionId',
      'routeRegistryVersion', 'adapterContractVersion', 'description',
      'descriptionDigest', 'language', 'simpleMode', 'confirmed', 'deviceMode',
      'issuedAt', 'expiresAt', 'routeKey', 'issueCode',
    ];
    const envelopeRead = readRecord(parsed, envelopeKeys);
    if (!envelopeRead.ok) return reject('invalid-envelope');
    const values = envelopeRead.values;
    const scalarKeys = envelopeKeys.filter((key) => key !== 'simpleMode' && key !== 'confirmed' && key !== 'issueCode');
    if (
      scalarKeys.some((key) => typeof values[key] !== 'string' || !isWellFormedUnicode(values[key] as string))
      || typeof values.simpleMode !== 'boolean'
      || values.confirmed !== true
      || (values.issueCode !== null
        && (typeof values.issueCode !== 'string' || !isWellFormedUnicode(values.issueCode)))
      || values.schema !== checkedPlan.expectedEnvelopeSchema
      || values.mode !== checkedPlan.expectedEnvelopeMode
      || !/^[0-9a-f]{32}$/.test(values.packId as string)
      || !/^[0-9a-f]{32}$/.test(values.resultRevisionId as string)
      || !/^[0-9a-f]{32}$/.test(values.packRevisionId as string)
      || !/^[0-9a-f]{64}$/.test(values.descriptionDigest as string)
      || values.routeRegistryVersion !== 'challansakshi.official-routes/v1'
      || values.adapterContractVersion !== 'challansakshi.adapter-contract/v1'
      || (values.language !== 'en' && values.language !== 'hi')
      || values.deviceMode !== 'private'
    ) return reject('invalid-envelope');

    const issueCodes = [
      'wrong-evidence',
      'wrong-vehicle-number',
      'two-wheeler-on-four-wheeler',
      'four-wheeler-on-two-wheeler',
      'possible-duplicate-number-plate',
    ];
    const routeMatches = (
      values.mode === 'real'
      && values.routeKey === 'legacy'
      && typeof values.issueCode === 'string'
      && issueCodes.includes(values.issueCode)
    ) || (
      values.mode === 'real'
      && values.routeKey === 'nextgen'
      && values.issueCode === null
    ) || (
      values.mode === 'synthetic'
      && values.routeKey === 'synthetic-fixture'
      && (values.issueCode === null
        || (typeof values.issueCode === 'string' && issueCodes.includes(values.issueCode)))
    );
    if (!routeMatches) return reject('invalid-envelope');

    const canonicalEnvelope = Object.freeze({
      schema: values.schema,
      mode: values.mode,
      packId: values.packId,
      resultRevisionId: values.resultRevisionId,
      packRevisionId: values.packRevisionId,
      routeRegistryVersion: values.routeRegistryVersion,
      adapterContractVersion: values.adapterContractVersion,
      description: values.description,
      descriptionDigest: values.descriptionDigest,
      language: values.language,
      simpleMode: values.simpleMode,
      confirmed: values.confirmed,
      deviceMode: values.deviceMode,
      issuedAt: values.issuedAt,
      expiresAt: values.expiresAt,
      routeKey: values.routeKey,
      issueCode: values.issueCode,
    }) as ExtensionHandoffEnvelope;
    if (raw !== JSON.stringify(canonicalEnvelope)) return reject('non-canonical-envelope');
    return Object.freeze({ status: 'accepted' as const, envelope: canonicalEnvelope });
  } catch {
    return reject('invalid-plan');
  }
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
const DOCUMENT_ID_PATTERN = /^[\x21-\x7e]{1,256}$/;
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
    (profile !== 'synthetic-development' && profile !== 'production-disabled')
    || !Number.isSafeInteger(sourceTabId)
    || (sourceTabId as number) < 0
    || !Number.isSafeInteger(nowMs)
    || (nowMs as number) < 0
    || !Number.isSafeInteger(importedAtMs)
    || (importedAtMs as number) < 0
    || (importedAtMs as number) > (nowMs as number)
  ) return null;
  return Object.freeze({
    profile,
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
  const validation = validateExtensionHandoffEnvelope(injection.result.envelope, {
    profile: checkedContext.profile,
    nowMs: checkedContext.nowMs,
    importedAtMs: checkedContext.importedAtMs,
  });
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
    canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelope(validation.envelope),
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
