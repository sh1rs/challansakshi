import { findBoundedExportSafetyMatches } from './export-safety';
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

export type CanonicalExtensionHandoffEnvelope = Readonly<{
  schema: typeof EXTENSION_HANDOFF_SCHEMA;
  mode: string;
  packId: string;
  resultRevisionId: string;
  packRevisionId: string;
  routeRegistryVersion: string;
  adapterContractVersion: string;
  description: string;
  descriptionDigest: string;
  language: 'en' | 'hi';
  simpleMode: boolean;
  confirmed: true;
  deviceMode: 'private';
  issuedAt: string;
  expiresAt: string;
  routeKey: string;
  issueCode: string | null;
}>;

export type ExtensionEnvelopeRouteAuthority = Readonly<{
  routeKey: string;
  issueCodes: readonly (string | null)[];
}>;

export type ExtensionEnvelopeProfileAuthority = Readonly<{
  profile: string;
  envelopeMode: string;
}>;

export type ExtensionEnvelopeVariantAuthority = Readonly<{
  envelopeMode: string;
  routes: readonly ExtensionEnvelopeRouteAuthority[];
}>;

export type ExtensionEnvelopeValidationAuthority = Readonly<{
  routeRegistryVersion: string;
  adapterContractVersion: string;
  envelopeVariants: readonly ExtensionEnvelopeVariantAuthority[];
  profiles: readonly ExtensionEnvelopeProfileAuthority[];
}>;

export type ExtensionEnvelopeValidationContext = Readonly<{
  profile: string;
  nowMs: number;
  importedAtMs: number;
}>;

export type ExtensionEnvelopeRejectionReason =
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

export type CoreExtensionEnvelopeValidationResult =
  | Readonly<{
    status: 'accepted';
    envelope: CanonicalExtensionHandoffEnvelope;
    canonicalJson: string;
    effectiveExpiresAtMs: number;
  }>
  | Readonly<{
    status: 'rejected';
    reason: ExtensionEnvelopeRejectionReason;
  }>;

type PlainDataRecordRead =
  | Readonly<{ ok: true; values: Readonly<Record<string, unknown>> }>
  | Readonly<{ ok: false; reason: 'not-plain-record' | 'invalid-property-set' }>;

const VALIDATION_CONTEXT_KEYS = Object.freeze(['profile', 'nowMs', 'importedAtMs'] as const);
const OPAQUE_ID_PATTERN = /^[0-9a-f]{32}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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

function reconstructCanonicalEnvelope(
  values: Readonly<Record<string, unknown>>,
): CanonicalExtensionHandoffEnvelope {
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
  } as CanonicalExtensionHandoffEnvelope);
}

function findProfileAuthority(
  authority: ExtensionEnvelopeValidationAuthority,
  profile: string,
): ExtensionEnvelopeProfileAuthority | null {
  try {
    if (!Array.isArray(authority.profiles)) return null;
    const match = authority.profiles.find((candidate) => candidate.profile === profile);
    return match ?? null;
  } catch {
    return null;
  }
}

export function digestExtensionDescriptionCore(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Description must be a primitive string.');
  if (!isWellFormedUnicode(value)) throw new Error('Description must contain well-formed Unicode.');
  if (value.includes('\r') || value.normalize('NFC') !== value) {
    throw new Error('Description must already use canonical NFC/LF text.');
  }
  return sha256Hex(new TextEncoder().encode(value));
}

export function canonicalExtensionHandoffEnvelopeJsonCore(value: unknown): string {
  const read = readPlainDataRecord(value, EXTENSION_ENVELOPE_KEYS);
  if (!read.ok || read.values.schema !== EXTENSION_HANDOFF_SCHEMA) {
    throw new Error('A closed extension handoff envelope is required.');
  }
  if (!allScalarStringsAreWellFormed(read.values)) {
    throw new Error('Envelope strings must contain well-formed Unicode.');
  }
  return JSON.stringify(reconstructCanonicalEnvelope(read.values));
}

export function digestCanonicalExtensionHandoffEnvelopeCore(value: unknown): string {
  return sha256Hex(new TextEncoder().encode(canonicalExtensionHandoffEnvelopeJsonCore(value)));
}

export function validateExtensionHandoffEnvelopeAgainstAuthority(
  value: unknown,
  context: unknown,
  authority: ExtensionEnvelopeValidationAuthority,
): CoreExtensionEnvelopeValidationResult {
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
  if (findBoundedExportSafetyMatches(description).length > 0) {
    return { status: 'rejected', reason: 'description-not-export-safe' };
  }

  if (
    typeof candidate.descriptionDigest !== 'string'
    || !DIGEST_PATTERN.test(candidate.descriptionDigest)
    || digestExtensionDescriptionCore(description) !== candidate.descriptionDigest
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

  if (candidate.routeRegistryVersion !== authority.routeRegistryVersion) {
    return { status: 'rejected', reason: 'route-registry-version-mismatch' };
  }
  if (candidate.adapterContractVersion !== authority.adapterContractVersion) {
    return { status: 'rejected', reason: 'adapter-contract-version-mismatch' };
  }
  if (
    (candidate.language !== 'en' && candidate.language !== 'hi')
    || typeof candidate.simpleMode !== 'boolean'
  ) return { status: 'rejected', reason: 'invalid-presentation' };
  if (candidate.confirmed !== true || candidate.deviceMode !== 'private') {
    return { status: 'rejected', reason: 'confirmation-or-device-mismatch' };
  }

  const routeIssueMatches = authority.envelopeVariants.some((variant) => (
    variant.envelopeMode === candidate.mode
    && variant.routes.some((route) => (
      route.routeKey === candidate.routeKey
      && route.issueCodes.some((issueCode) => issueCode === candidate.issueCode)
    ))
  ));
  if (!routeIssueMatches) return { status: 'rejected', reason: 'route-issue-mismatch' };

  const contextRead = readPlainDataRecord(context, VALIDATION_CONTEXT_KEYS);
  if (!contextRead.ok) return { status: 'rejected', reason: 'invalid-validation-context' };
  const checkedContext = contextRead.values;
  if (
    typeof checkedContext.profile !== 'string'
    || !Number.isSafeInteger(checkedContext.nowMs)
    || !Number.isSafeInteger(checkedContext.importedAtMs)
    || (checkedContext.nowMs as number) < 0
    || (checkedContext.importedAtMs as number) < 0
    || (checkedContext.importedAtMs as number) > (checkedContext.nowMs as number)
  ) return { status: 'rejected', reason: 'invalid-validation-context' };

  const profileAuthority = findProfileAuthority(authority, checkedContext.profile);
  if (!profileAuthority) return { status: 'rejected', reason: 'invalid-validation-context' };
  if (candidate.mode !== profileAuthority.envelopeMode) {
    return { status: 'rejected', reason: 'profile-mismatch' };
  }

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

export function parseCanonicalExtensionHandoffEnvelopeJsonAgainstAuthority(
  serialized: unknown,
  context: unknown,
  authority: ExtensionEnvelopeValidationAuthority,
): CoreExtensionEnvelopeValidationResult {
  if (typeof serialized !== 'string' || !isWellFormedUnicode(serialized)) {
    return { status: 'rejected', reason: 'invalid-json' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { status: 'rejected', reason: 'invalid-json' };
  }
  const validation = validateExtensionHandoffEnvelopeAgainstAuthority(parsed, context, authority);
  if (validation.status !== 'accepted') return validation;
  if (serialized !== validation.canonicalJson) {
    return { status: 'rejected', reason: 'non-canonical-json' };
  }
  return validation;
}
