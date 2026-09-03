import { OFFICIAL_ROUTE_REGISTRY_VERSION } from './official-destinations';
import {
  isAuthenticConfirmedExtensionHandoffSource,
  type ConfirmedExtensionHandoffSource,
  type LegacyIssueMapping,
} from './official-handoff';
import {
  findBoundedExportSafetyMatches,
  type BoundedExportSafetyMatch,
} from './export-safety';
import {
  EXTENSION_ADAPTER_CONTRACT_VERSION,
  EXTENSION_HANDOFF_MAX_LIFETIME_MS,
  EXTENSION_HANDOFF_SCHEMA,
  canonicalExtensionHandoffEnvelopeJsonCore,
  digestCanonicalExtensionHandoffEnvelopeCore,
  digestExtensionDescriptionCore,
  parseCanonicalExtensionHandoffEnvelopeJsonAgainstAuthority,
  validateExtensionHandoffEnvelopeAgainstAuthority,
  type ExtensionEnvelopeRejectionReason,
  type ExtensionEnvelopeValidationAuthority,
} from './extension-handoff-envelope-core';

export {
  EXTENSION_ADAPTER_CONTRACT_VERSION,
  EXTENSION_ENVELOPE_KEYS,
  EXTENSION_HANDOFF_FUTURE_TOLERANCE_MS,
  EXTENSION_HANDOFF_MAX_CODE_POINTS,
  EXTENSION_HANDOFF_MAX_LIFETIME_MS,
  EXTENSION_HANDOFF_MAX_UTF8_BYTES,
  EXTENSION_HANDOFF_SCHEMA,
} from './extension-handoff-envelope-core';

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

export type ExtensionHandoffRejectionReason = ExtensionEnvelopeRejectionReason;

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

export const SUPPORTED_EXTENSION_ISSUE_CODES = Object.freeze([
  'wrong-evidence',
  'wrong-vehicle-number',
  'two-wheeler-on-four-wheeler',
  'four-wheeler-on-two-wheeler',
  'possible-duplicate-number-plate',
] as const satisfies readonly SupportedExtensionIssueCode[]);

const SUPPORTED_EXTENSION_ISSUES: ReadonlySet<string> = new Set(SUPPORTED_EXTENSION_ISSUE_CODES);
const REAL_EXTENSION_ROUTES = Object.freeze([
  Object.freeze({
    routeKey: 'legacy',
    issueCodes: SUPPORTED_EXTENSION_ISSUE_CODES,
  }),
  Object.freeze({
    routeKey: 'nextgen',
    issueCodes: Object.freeze([null] as const),
  }),
] as const);
const SYNTHETIC_EXTENSION_ROUTES = Object.freeze([
  Object.freeze({
    routeKey: 'synthetic-fixture',
    issueCodes: Object.freeze([null, ...SUPPORTED_EXTENSION_ISSUE_CODES]),
  }),
] as const);

const EXTENSION_ENVELOPE_PROFILE_AUTHORITIES = Object.freeze({
  'synthetic-development': Object.freeze({
    profile: 'synthetic-development',
    envelopeMode: 'synthetic',
    routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
    adapterContractVersion: EXTENSION_ADAPTER_CONTRACT_VERSION,
    routes: SYNTHETIC_EXTENSION_ROUTES,
  }),
  'production-disabled': Object.freeze({
    profile: 'production-disabled',
    envelopeMode: 'real',
    routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
    adapterContractVersion: EXTENSION_ADAPTER_CONTRACT_VERSION,
    routes: REAL_EXTENSION_ROUTES,
  }),
  'production-candidate': Object.freeze({
    profile: 'production-candidate',
    envelopeMode: 'real',
    routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
    adapterContractVersion: EXTENSION_ADAPTER_CONTRACT_VERSION,
    routes: REAL_EXTENSION_ROUTES,
  }),
} as const satisfies Record<ExtensionHandoffProfile, ExtensionEnvelopeValidationAuthority['profiles'][number]>);

const ALL_EXTENSION_ENVELOPE_AUTHORITIES: ExtensionEnvelopeValidationAuthority = Object.freeze({
  profiles: Object.freeze([
    EXTENSION_ENVELOPE_PROFILE_AUTHORITIES['synthetic-development'],
    EXTENSION_ENVELOPE_PROFILE_AUTHORITIES['production-disabled'],
    EXTENSION_ENVELOPE_PROFILE_AUTHORITIES['production-candidate'],
  ]),
});

export function getExtensionEnvelopeValidationAuthority(
  profile: unknown,
): ExtensionEnvelopeValidationAuthority | null {
  if (
    profile !== 'synthetic-development'
    && profile !== 'production-disabled'
    && profile !== 'production-candidate'
  ) return null;
  return Object.freeze({
    profiles: Object.freeze([EXTENSION_ENVELOPE_PROFILE_AUTHORITIES[profile]]),
  });
}

const SYNTHETIC_SOURCE_KEYS = Object.freeze([
  'resultRevisionId', 'packRevisionId', 'routeRegistryVersion', 'description',
  'confirmed', 'issuedAt', 'routeKey', 'issueCode',
] as const);
const BUILD_OPTION_KEYS = Object.freeze(['language', 'simpleMode', 'nowMs'] as const);
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

function canonicalTimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== 'string' || !CANONICAL_UTC_PATTERN.test(value)) return null;
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) return null;
  return milliseconds;
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
  return digestExtensionDescriptionCore(value);
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
  return canonicalExtensionHandoffEnvelopeJsonCore(value);
}

export function digestCanonicalExtensionHandoffEnvelope(value: unknown): string {
  return digestCanonicalExtensionHandoffEnvelopeCore(value);
}

export function validateExtensionHandoffEnvelope(
  value: unknown,
  context: ExtensionHandoffValidationContext,
): ExtensionHandoffValidationResult {
  return validateExtensionHandoffEnvelopeAgainstAuthority(
    value,
    context,
    ALL_EXTENSION_ENVELOPE_AUTHORITIES,
  ) as ExtensionHandoffValidationResult;
}

export function parseCanonicalExtensionHandoffEnvelopeJson(
  serialized: unknown,
  context: ExtensionHandoffValidationContext,
): ExtensionHandoffValidationResult {
  return parseCanonicalExtensionHandoffEnvelopeJsonAgainstAuthority(
    serialized,
    context,
    ALL_EXTENSION_ENVELOPE_AUTHORITIES,
  ) as ExtensionHandoffValidationResult;
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
