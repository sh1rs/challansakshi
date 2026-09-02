import { OFFICIAL_ROUTE_REGISTRY_VERSION } from './official-destinations';
import {
  findBoundedExportSafetyMatches,
  isAuthenticConfirmedExtensionHandoffSource,
  type BoundedExportSafetyMatch,
  type ConfirmedExtensionHandoffSource,
  type LegacyIssueMapping,
} from './official-handoff';
import { sha256Hex } from './local-sha256';

export const EXTENSION_HANDOFF_SCHEMA = 'challansakshi.extension-handoff/v1' as const;
export const EXTENSION_ADAPTER_CONTRACT_VERSION = 'challansakshi.adapter-contract/v1' as const;
export const EXTENSION_HANDOFF_MAX_CODE_POINTS = 500;
export const EXTENSION_HANDOFF_MAX_UTF8_BYTES = 8192;
export const EXTENSION_HANDOFF_MAX_LIFETIME_MS = 600_000;
export const EXTENSION_HANDOFF_FUTURE_TOLERANCE_MS = 60_000;

export const EXTENSION_ENVELOPE_KEYS = Object.freeze([
  'schema', 'mode', 'packId', 'resultRevisionId', 'packRevisionId',
  'routeRegistryVersion', 'adapterContractVersion', 'description',
  'descriptionDigest', 'language', 'simpleMode', 'confirmed', 'deviceMode',
  'issuedAt', 'expiresAt', 'routeKey', 'issueCode',
] as const);

export type SupportedExtensionIssueCode =
  | 'wrong-evidence'
  | 'wrong-vehicle-number'
  | 'two-wheeler-on-four-wheeler'
  | 'four-wheeler-on-two-wheeler'
  | 'possible-duplicate-number-plate';

type ExtensionEnvelopeBase = Readonly<{
  schema: typeof EXTENSION_HANDOFF_SCHEMA;
  mode: 'real' | 'synthetic';
  packId: string;
  resultRevisionId: string;
  packRevisionId: string;
  routeRegistryVersion: typeof OFFICIAL_ROUTE_REGISTRY_VERSION;
  adapterContractVersion: typeof EXTENSION_ADAPTER_CONTRACT_VERSION;
  description: string;
  descriptionDigest: string;
  language: 'en' | 'hi';
  simpleMode: boolean;
  confirmed: true;
  deviceMode: 'private';
  issuedAt: string;
  expiresAt: string;
}>;

export type ExtensionHandoffEnvelope =
  | (ExtensionEnvelopeBase & Readonly<{
    mode: 'real';
    routeKey: 'legacy';
    issueCode: SupportedExtensionIssueCode;
  }>)
  | (ExtensionEnvelopeBase & Readonly<{
    mode: 'real';
    routeKey: 'nextgen';
    issueCode: null;
  }>)
  | (ExtensionEnvelopeBase & Readonly<{
    mode: 'synthetic';
    routeKey: 'synthetic-fixture';
    issueCode: SupportedExtensionIssueCode | null;
  }>);

export type SyntheticExtensionHandoffSource = Readonly<{
  resultRevisionId: string;
  packRevisionId: string;
  routeRegistryVersion: typeof OFFICIAL_ROUTE_REGISTRY_VERSION;
  description: string;
  confirmed: true;
  issuedAt: string;
  routeKey: 'synthetic-fixture';
  issueCode: SupportedExtensionIssueCode | null;
}>;

export type ExtensionHandoffBuildOptions = Readonly<{
  language: 'en' | 'hi';
  simpleMode: boolean;
  nowMs: number;
}>;

export type ExtensionHandoffProfile =
  | 'synthetic-development'
  | 'production-disabled'
  | 'production-candidate';

export type ExtensionHandoffValidationContext = Readonly<{
  profile: ExtensionHandoffProfile;
  nowMs: number;
  importedAtMs: number;
}>;

export type ExtensionHandoffRejectionReason =
  | 'not-plain-record'
  | 'invalid-property-set'
  | 'invalid-schema'
  | 'invalid-scalar'
  | 'malformed-unicode'
  | 'description-not-canonical'
  | 'description-empty'
  | 'description-too-long'
  | 'description-not-export-safe'
  | 'description-digest-mismatch'
  | 'envelope-too-large'
  | 'invalid-id'
  | 'route-registry-version-mismatch'
  | 'adapter-contract-version-mismatch'
  | 'invalid-presentation'
  | 'confirmation-or-device-mismatch'
  | 'route-issue-mismatch'
  | 'profile-mismatch'
  | 'invalid-timestamp'
  | 'invalid-validation-context'
  | 'issued-too-far-in-future'
  | 'issued-too-old'
  | 'invalid-lifetime'
  | 'envelope-expired'
  | 'effective-expiry-reached'
  | 'invalid-json'
  | 'non-canonical-json';

export type ExtensionHandoffValidationResult =
  | Readonly<{
    status: 'accepted';
    envelope: ExtensionHandoffEnvelope;
    canonicalJson: string;
    effectiveExpiresAtMs: number;
  }>
  | Readonly<{
    status: 'rejected';
    reason: ExtensionHandoffRejectionReason;
  }>;

export type ExtensionHandoffBuildResult =
  | Readonly<{ status: 'built'; envelope: ExtensionHandoffEnvelope }>
  | Readonly<{
    status: 'abstained';
    reason: 'source-not-authentic' | 'invalid-source' | 'invalid-build-options'
      | 'secure-random-unavailable' | ExtensionHandoffRejectionReason;
  }>;

const INTERNAL_TO_EXTENSION_ISSUE = Object.freeze({
  'wrong-evidence-captured': 'wrong-evidence',
  'wrong-vehicle-number-entered-by-officer': 'wrong-vehicle-number',
  'two-wheeler-on-four-wheeler': 'two-wheeler-on-four-wheeler',
  'four-wheeler-on-two-wheeler': 'four-wheeler-on-two-wheeler',
  'duplicate-number-plate': 'possible-duplicate-number-plate',
} as const satisfies Record<LegacyIssueMapping['issueCode'], SupportedExtensionIssueCode>);

const SUPPORTED_EXTENSION_ISSUES: ReadonlySet<string> = new Set(Object.values(INTERNAL_TO_EXTENSION_ISSUE));
const SYNTHETIC_SOURCE_KEYS = Object.freeze([
  'resultRevisionId', 'packRevisionId', 'routeRegistryVersion', 'description',
  'confirmed', 'issuedAt', 'routeKey', 'issueCode',
] as const);
const BUILD_OPTION_KEYS = Object.freeze(['language', 'simpleMode', 'nowMs'] as const);
const VALIDATION_CONTEXT_KEYS = Object.freeze(['profile', 'nowMs', 'importedAtMs'] as const);
const OPAQUE_ID_PATTERN = /^[0-9a-f]{32}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type PlainDataRecordRead =
  | Readonly<{ ok: true; values: Readonly<Record<string, unknown>> }>
  | Readonly<{ ok: false; reason: 'not-plain-record' | 'invalid-property-set' }>;

function readPlainDataRecord(value: unknown, expectedKeys: readonly string[]): PlainDataRecordRead {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { ok: false, reason: 'not-plain-record' };
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return { ok: false, reason: 'not-plain-record' };
    }
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))
    ) return { ok: false, reason: 'invalid-property-set' };

    const values: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
        return { ok: false, reason: 'invalid-property-set' };
      }
      values[key] = descriptor.value;
    }
    return { ok: true, values: Object.freeze(values) };
  } catch {
    return { ok: false, reason: 'not-plain-record' };
  }
}

function isWellFormedUnicode(value: string): boolean {
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
}

function allScalarStringsAreWellFormed(values: Readonly<Record<string, unknown>>): boolean {
  for (const key of EXTENSION_ENVELOPE_KEYS) {
    const value = values[key];
    if (key === 'simpleMode' || key === 'confirmed') {
      if (typeof value !== 'boolean') return false;
      continue;
    }
    if (key === 'issueCode' && value === null) continue;
    if (typeof value !== 'string' || !isWellFormedUnicode(value)) return false;
  }
  return true;
}

function canonicalTimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== 'string' || !CANONICAL_UTC_PATTERN.test(value)) return null;
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) return null;
  return milliseconds;
}

function reconstructCanonicalEnvelope(values: Readonly<Record<string, unknown>>): ExtensionHandoffEnvelope {
  return Object.freeze({
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
  } as ExtensionHandoffEnvelope);
}

function readBuildOptions(options: unknown): ExtensionHandoffBuildOptions | null {
  const read = readPlainDataRecord(options, BUILD_OPTION_KEYS);
  if (!read.ok) return null;
  const { language, simpleMode, nowMs } = read.values;
  if (
    (language !== 'en' && language !== 'hi')
    || typeof simpleMode !== 'boolean'
    || !Number.isSafeInteger(nowMs)
    || (nowMs as number) < 0
  ) return null;
  return Object.freeze({ language, simpleMode, nowMs: nowMs as number });
}

function isValidSyntheticSource(value: unknown): value is SyntheticExtensionHandoffSource {
  const read = readPlainDataRecord(value, SYNTHETIC_SOURCE_KEYS);
  if (!read.ok) return false;
  const candidate = read.values;
  const strings = [
    candidate.resultRevisionId,
    candidate.packRevisionId,
    candidate.routeRegistryVersion,
    candidate.description,
    candidate.issuedAt,
    candidate.routeKey,
  ];
  if (candidate.issueCode !== null) strings.push(candidate.issueCode);
  return strings.every((item) => typeof item === 'string' && isWellFormedUnicode(item))
    && candidate.confirmed === true
    && candidate.routeKey === 'synthetic-fixture'
    && (candidate.issueCode === null
      || (typeof candidate.issueCode === 'string' && SUPPORTED_EXTENSION_ISSUES.has(candidate.issueCode)));
}

function buildEnvelopeRecord(input: Readonly<{
  mode: 'real' | 'synthetic';
  packId: string;
  resultRevisionId: string;
  packRevisionId: string;
  routeRegistryVersion: string;
  description: string;
  language: 'en' | 'hi';
  simpleMode: boolean;
  issuedAt: string;
  routeKey: 'legacy' | 'nextgen' | 'synthetic-fixture';
  issueCode: SupportedExtensionIssueCode | null;
}>): ExtensionHandoffEnvelope | null {
  const issuedAtMs = canonicalTimestampMilliseconds(input.issuedAt);
  if (issuedAtMs === null || !Number.isSafeInteger(issuedAtMs + EXTENSION_HANDOFF_MAX_LIFETIME_MS)) return null;
  let descriptionDigest: string;
  try {
    descriptionDigest = digestExtensionDescription(input.description);
  } catch {
    return null;
  }
  return Object.freeze({
    schema: EXTENSION_HANDOFF_SCHEMA,
    mode: input.mode,
    packId: input.packId,
    resultRevisionId: input.resultRevisionId,
    packRevisionId: input.packRevisionId,
    routeRegistryVersion: input.routeRegistryVersion,
    adapterContractVersion: EXTENSION_ADAPTER_CONTRACT_VERSION,
    description: input.description,
    descriptionDigest,
    language: input.language,
    simpleMode: input.simpleMode,
    confirmed: true,
    deviceMode: 'private',
    issuedAt: input.issuedAt,
    expiresAt: new Date(issuedAtMs + EXTENSION_HANDOFF_MAX_LIFETIME_MS).toISOString(),
    routeKey: input.routeKey,
    issueCode: input.issueCode,
  } as ExtensionHandoffEnvelope);
}

export function mapLegacyIssueCodeToExtensionIssueCode(value: unknown): SupportedExtensionIssueCode | null {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(INTERNAL_TO_EXTENSION_ISSUE, value)
    ? INTERNAL_TO_EXTENSION_ISSUE[value as LegacyIssueMapping['issueCode']]
    : null;
}

export function findExtensionDescriptionSafetyMatches(value: unknown): readonly BoundedExportSafetyMatch[] {
  return findBoundedExportSafetyMatches(value);
}

export function digestExtensionDescription(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Description must be a primitive string.');
  if (!isWellFormedUnicode(value)) throw new Error('Description must contain well-formed Unicode.');
  if (value.includes('\r') || value.normalize('NFC') !== value) {
    throw new Error('Description must already use canonical NFC/LF text.');
  }
  return sha256Hex(new TextEncoder().encode(value));
}

export function generateOpaqueExtensionId(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Secure random bytes unavailable.');
  }
  const bytes = new Uint8Array(16);
  const returned = cryptoApi.getRandomValues(bytes);
  if (returned !== bytes || returned.byteLength !== 16) {
    throw new Error('Secure random bytes unavailable.');
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function canonicalExtensionHandoffEnvelopeJson(value: unknown): string {
  const read = readPlainDataRecord(value, EXTENSION_ENVELOPE_KEYS);
  if (!read.ok || read.values.schema !== EXTENSION_HANDOFF_SCHEMA) {
    throw new Error('A closed extension handoff envelope is required.');
  }
  if (!allScalarStringsAreWellFormed(read.values)) {
    throw new Error('Envelope strings must contain well-formed Unicode.');
  }
  return JSON.stringify(reconstructCanonicalEnvelope(read.values));
}

export function digestCanonicalExtensionHandoffEnvelope(value: unknown): string {
  return sha256Hex(new TextEncoder().encode(canonicalExtensionHandoffEnvelopeJson(value)));
}

export function validateExtensionHandoffEnvelope(
  value: unknown,
  context: ExtensionHandoffValidationContext,
): ExtensionHandoffValidationResult {
  const read = readPlainDataRecord(value, EXTENSION_ENVELOPE_KEYS);
  if (!read.ok) return { status: 'rejected', reason: read.reason };
  const candidate = read.values;

  if (candidate.schema !== EXTENSION_HANDOFF_SCHEMA) return { status: 'rejected', reason: 'invalid-schema' };
  if (!allScalarStringsAreWellFormed(candidate)) {
    const containsMalformedString = EXTENSION_ENVELOPE_KEYS.some((key) => (
      typeof candidate[key] === 'string' && !isWellFormedUnicode(candidate[key] as string)
    ));
    return { status: 'rejected', reason: containsMalformedString ? 'malformed-unicode' : 'invalid-scalar' };
  }

  const description = candidate.description as string;
  if (description.includes('\r') || description.normalize('NFC') !== description) {
    return { status: 'rejected', reason: 'description-not-canonical' };
  }
  if (description.trim().length === 0) return { status: 'rejected', reason: 'description-empty' };
  if (Array.from(description).length > EXTENSION_HANDOFF_MAX_CODE_POINTS) {
    return { status: 'rejected', reason: 'description-too-long' };
  }
  if (findExtensionDescriptionSafetyMatches(description).length > 0) {
    return { status: 'rejected', reason: 'description-not-export-safe' };
  }

  if (
    typeof candidate.descriptionDigest !== 'string'
    || !DIGEST_PATTERN.test(candidate.descriptionDigest)
    || digestExtensionDescription(description) !== candidate.descriptionDigest
  ) return { status: 'rejected', reason: 'description-digest-mismatch' };

  const canonicalEnvelope = reconstructCanonicalEnvelope(candidate);
  const canonicalJson = JSON.stringify(canonicalEnvelope);
  if (new TextEncoder().encode(canonicalJson).byteLength > EXTENSION_HANDOFF_MAX_UTF8_BYTES) {
    return { status: 'rejected', reason: 'envelope-too-large' };
  }

  if (
    typeof candidate.packId !== 'string' || !OPAQUE_ID_PATTERN.test(candidate.packId)
    || typeof candidate.resultRevisionId !== 'string' || !OPAQUE_ID_PATTERN.test(candidate.resultRevisionId)
    || typeof candidate.packRevisionId !== 'string' || !OPAQUE_ID_PATTERN.test(candidate.packRevisionId)
  ) return { status: 'rejected', reason: 'invalid-id' };
  if (candidate.routeRegistryVersion !== OFFICIAL_ROUTE_REGISTRY_VERSION) {
    return { status: 'rejected', reason: 'route-registry-version-mismatch' };
  }
  if (candidate.adapterContractVersion !== EXTENSION_ADAPTER_CONTRACT_VERSION) {
    return { status: 'rejected', reason: 'adapter-contract-version-mismatch' };
  }
  if (
    (candidate.language !== 'en' && candidate.language !== 'hi')
    || typeof candidate.simpleMode !== 'boolean'
  ) return { status: 'rejected', reason: 'invalid-presentation' };
  if (candidate.confirmed !== true || candidate.deviceMode !== 'private') {
    return { status: 'rejected', reason: 'confirmation-or-device-mismatch' };
  }

  const routeIssueMatches = (
    candidate.mode === 'real'
    && candidate.routeKey === 'legacy'
    && typeof candidate.issueCode === 'string'
    && SUPPORTED_EXTENSION_ISSUES.has(candidate.issueCode)
  ) || (
    candidate.mode === 'real'
    && candidate.routeKey === 'nextgen'
    && candidate.issueCode === null
  ) || (
    candidate.mode === 'synthetic'
    && candidate.routeKey === 'synthetic-fixture'
    && (candidate.issueCode === null
      || (typeof candidate.issueCode === 'string' && SUPPORTED_EXTENSION_ISSUES.has(candidate.issueCode)))
  );
  if (!routeIssueMatches) return { status: 'rejected', reason: 'route-issue-mismatch' };

  const contextRead = readPlainDataRecord(context, VALIDATION_CONTEXT_KEYS);
  if (!contextRead.ok) return { status: 'rejected', reason: 'invalid-validation-context' };
  const checkedContext = contextRead.values;
  if (
    (checkedContext.profile !== 'synthetic-development'
      && checkedContext.profile !== 'production-disabled'
      && checkedContext.profile !== 'production-candidate')
    || !Number.isSafeInteger(checkedContext.nowMs)
    || !Number.isSafeInteger(checkedContext.importedAtMs)
    || (checkedContext.nowMs as number) < 0
    || (checkedContext.importedAtMs as number) < 0
    || (checkedContext.importedAtMs as number) > (checkedContext.nowMs as number)
  ) return { status: 'rejected', reason: 'invalid-validation-context' };

  const profileMatches = checkedContext.profile === 'synthetic-development'
    ? candidate.mode === 'synthetic'
    : (checkedContext.profile === 'production-disabled' || checkedContext.profile === 'production-candidate')
      && candidate.mode === 'real';
  if (!profileMatches) return { status: 'rejected', reason: 'profile-mismatch' };

  const issuedAtMs = canonicalTimestampMilliseconds(candidate.issuedAt);
  const expiresAtMs = canonicalTimestampMilliseconds(candidate.expiresAt);
  if (issuedAtMs === null || expiresAtMs === null) return { status: 'rejected', reason: 'invalid-timestamp' };
  const nowMs = checkedContext.nowMs as number;
  const importedAtMs = checkedContext.importedAtMs as number;
  if (issuedAtMs > nowMs + EXTENSION_HANDOFF_FUTURE_TOLERANCE_MS) {
    return { status: 'rejected', reason: 'issued-too-far-in-future' };
  }
  if (issuedAtMs < nowMs - EXTENSION_HANDOFF_MAX_LIFETIME_MS) {
    return { status: 'rejected', reason: 'issued-too-old' };
  }
  if (
    expiresAtMs <= issuedAtMs
    || expiresAtMs - issuedAtMs > EXTENSION_HANDOFF_MAX_LIFETIME_MS
  ) return { status: 'rejected', reason: 'invalid-lifetime' };
  if (nowMs >= expiresAtMs) return { status: 'rejected', reason: 'envelope-expired' };

  const effectiveExpiresAtMs = Math.min(
    expiresAtMs,
    importedAtMs + EXTENSION_HANDOFF_MAX_LIFETIME_MS,
  );
  if (!Number.isSafeInteger(effectiveExpiresAtMs) || nowMs >= effectiveExpiresAtMs) {
    return { status: 'rejected', reason: 'effective-expiry-reached' };
  }

  return Object.freeze({
    status: 'accepted',
    envelope: canonicalEnvelope,
    canonicalJson,
    effectiveExpiresAtMs,
  });
}

export function parseCanonicalExtensionHandoffEnvelopeJson(
  serialized: unknown,
  context: ExtensionHandoffValidationContext,
): ExtensionHandoffValidationResult {
  if (typeof serialized !== 'string' || !isWellFormedUnicode(serialized)) {
    return { status: 'rejected', reason: 'invalid-json' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { status: 'rejected', reason: 'invalid-json' };
  }
  const validation = validateExtensionHandoffEnvelope(parsed, context);
  if (validation.status !== 'accepted') return validation;
  if (serialized !== validation.canonicalJson) {
    return { status: 'rejected', reason: 'non-canonical-json' };
  }
  return validation;
}

export function buildRealExtensionHandoffEnvelope(
  source: ConfirmedExtensionHandoffSource,
  options: ExtensionHandoffBuildOptions,
): ExtensionHandoffBuildResult {
  if (!isAuthenticConfirmedExtensionHandoffSource(source)) {
    return { status: 'abstained', reason: 'source-not-authentic' };
  }
  const checkedOptions = readBuildOptions(options);
  if (!checkedOptions) return { status: 'abstained', reason: 'invalid-build-options' };

  let packId: string;
  try {
    packId = generateOpaqueExtensionId();
  } catch {
    return { status: 'abstained', reason: 'secure-random-unavailable' };
  }
  const issueCode = source.routeKey === 'legacy'
    ? mapLegacyIssueCodeToExtensionIssueCode(source.issueCode)
    : null;
  if (source.routeKey === 'legacy' && issueCode === null) {
    return { status: 'abstained', reason: 'invalid-source' };
  }
  const envelope = buildEnvelopeRecord({
    mode: 'real',
    packId,
    resultRevisionId: source.resultRevisionId,
    packRevisionId: source.packRevisionId,
    routeRegistryVersion: source.routeRegistryVersion,
    description: source.description,
    language: checkedOptions.language,
    simpleMode: checkedOptions.simpleMode,
    issuedAt: source.issuedAt,
    routeKey: source.routeKey,
    issueCode,
  });
  if (!envelope) return { status: 'abstained', reason: 'invalid-source' };
  const validation = validateExtensionHandoffEnvelope(envelope, {
    profile: 'production-disabled',
    nowMs: checkedOptions.nowMs,
    importedAtMs: checkedOptions.nowMs,
  });
  return validation.status === 'accepted'
    ? Object.freeze({ status: 'built', envelope: validation.envelope })
    : { status: 'abstained', reason: validation.reason };
}

export function buildSyntheticExtensionHandoffEnvelope(
  source: SyntheticExtensionHandoffSource,
  options: ExtensionHandoffBuildOptions,
): ExtensionHandoffBuildResult {
  if (!isValidSyntheticSource(source)) return { status: 'abstained', reason: 'invalid-source' };
  const checkedOptions = readBuildOptions(options);
  if (!checkedOptions) return { status: 'abstained', reason: 'invalid-build-options' };

  let packId: string;
  try {
    packId = generateOpaqueExtensionId();
  } catch {
    return { status: 'abstained', reason: 'secure-random-unavailable' };
  }
  const envelope = buildEnvelopeRecord({
    mode: 'synthetic',
    packId,
    resultRevisionId: source.resultRevisionId,
    packRevisionId: source.packRevisionId,
    routeRegistryVersion: source.routeRegistryVersion,
    description: source.description,
    language: checkedOptions.language,
    simpleMode: checkedOptions.simpleMode,
    issuedAt: source.issuedAt,
    routeKey: 'synthetic-fixture',
    issueCode: source.issueCode,
  });
  if (!envelope) return { status: 'abstained', reason: 'invalid-source' };
  const validation = validateExtensionHandoffEnvelope(envelope, {
    profile: 'synthetic-development',
    nowMs: checkedOptions.nowMs,
    importedAtMs: checkedOptions.nowMs,
  });
  return validation.status === 'accepted'
    ? Object.freeze({ status: 'built', envelope: validation.envelope })
    : { status: 'abstained', reason: validation.reason };
}
