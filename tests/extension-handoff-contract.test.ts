import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { OFFICIAL_DESTINATIONS, OFFICIAL_ROUTE_REGISTRY_VERSION } from '../lib/official-destinations';
import {
  buildOfficialHandoffPack,
  projectConfirmedExtensionHandoffSource,
  type ConfirmedExtensionHandoffSource,
  type OfficialHandoffPack,
  type RealHandoffBuildInput,
} from '../lib/official-handoff';
import {
  EXTENSION_ADAPTER_CONTRACT_VERSION,
  EXTENSION_ENVELOPE_KEYS,
  EXTENSION_HANDOFF_SCHEMA,
  buildRealExtensionHandoffEnvelope,
  buildSyntheticExtensionHandoffEnvelope,
  canonicalExtensionHandoffEnvelopeJson,
  digestCanonicalExtensionHandoffEnvelope,
  digestExtensionDescription,
  findExtensionDescriptionSafetyMatches,
  generateOpaqueExtensionId,
  mapLegacyIssueCodeToExtensionIssueCode,
  parseCanonicalExtensionHandoffEnvelopeJson,
  validateExtensionHandoffEnvelope,
  type ExtensionHandoffEnvelope,
  type ExtensionHandoffValidationContext,
  type SyntheticExtensionHandoffSource,
} from '../lib/extension-handoff-contract';
import type { ActionReadyReviewFacts, ReviewFact } from '../lib/public-challan';

const ISSUED_AT = '2026-09-03T10:30:00.000Z';
const ISSUED_AT_MS = Date.parse(ISSUED_AT);
const EXPIRES_AT = '2026-09-03T10:40:00.000Z';
const RESULT_REVISION = '11111111111111111111111111111111';
const PACK_REVISION = '22222222222222222222222222222222';
const GENERATED_PACK_ID = '000102030405060708090a0b0c0d0e0f';
const SAFE_DESCRIPTION = 'I request a review of this record. The supplied evidence appears inconsistent. वाहन की समीक्षा करें। 😀';

const fact = <T>(value: T, source: ReviewFact<T>['source']): ReviewFact<T> => ({
  value,
  source,
  confidence: 'high',
  limitation: 'The affected person reviewed this source.',
  confirmation: 'citizen-confirmed',
  reviewRevisionId: RESULT_REVISION,
});

const facts: ActionReadyReviewFacts = {
  reviewRevisionId: RESULT_REVISION,
  wrongEvidenceBasis: fact('different-vehicle', 'citizen-attestation'),
  supportedSignals: ['wrong-evidence'],
};

const packInput = (): RealHandoffBuildInput => ({
  mode: 'real',
  sourceKind: 'official-service',
  route: OFFICIAL_DESTINATIONS.nextgen,
  jurisdictionConfirmation: { status: 'confirmed', code: 'KA' },
  now: ISSUED_AT,
  facts,
  resultClass: 'possible-discrepancy',
  resultRevisionId: RESULT_REVISION,
  packRevisionId: PACK_REVISION,
  reviewedDescription: SAFE_DESCRIPTION,
  confirmation: {
    status: 'confirmed',
    packRevisionId: PACK_REVISION,
    roleConfirmation: {
      role: 'self',
      affectedPersonInspectedEvidence: true,
      affectedPersonInspectedReadableRecord: true,
      affectedPersonConfirmedEntitlement: true,
      affectedPersonConfirmedPack: true,
    },
  },
  generatedAt: ISSUED_AT,
});

const authenticSource = (): ConfirmedExtensionHandoffSource => {
  const result = buildOfficialHandoffPack(packInput());
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error(`Expected pack, received ${result.reason}`);
  return projectConfirmedExtensionHandoffSource(result.pack);
};

const syntheticSource = (overrides: Partial<SyntheticExtensionHandoffSource> = {}): SyntheticExtensionHandoffSource => ({
  resultRevisionId: RESULT_REVISION,
  packRevisionId: PACK_REVISION,
  routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
  description: SAFE_DESCRIPTION,
  confirmed: true,
  issuedAt: ISSUED_AT,
  routeKey: 'synthetic-fixture',
  issueCode: null,
  ...overrides,
});

const validationContext = (
  profile: ExtensionHandoffValidationContext['profile'] = 'production-disabled',
  nowMs = ISSUED_AT_MS,
  importedAtMs = nowMs,
): ExtensionHandoffValidationContext => ({ profile, nowMs, importedAtMs });

const installDeterministicCrypto = () => {
  let calls = 0;
  vi.stubGlobal('crypto', {
    getRandomValues: (bytes: Uint8Array) => {
      calls += 1;
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.byteLength).toBe(16);
      bytes.set(Array.from({ length: 16 }, (_unused, index) => index));
      return bytes;
    },
  });
  return () => calls;
};

const builtRealEnvelope = (): ExtensionHandoffEnvelope => {
  installDeterministicCrypto();
  const result = buildRealExtensionHandoffEnvelope(authenticSource(), {
    language: 'en',
    simpleMode: false,
    nowMs: ISSUED_AT_MS,
  });
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error(`Expected envelope, received ${result.reason}`);
  return result.envelope;
};

const builtSyntheticEnvelope = (): ExtensionHandoffEnvelope => {
  installDeterministicCrypto();
  const result = buildSyntheticExtensionHandoffEnvelope(syntheticSource(), {
    language: 'hi',
    simpleMode: true,
    nowMs: ISSUED_AT_MS,
  });
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error(`Expected envelope, received ${result.reason}`);
  return result.envelope;
};

const withDescription = (envelope: ExtensionHandoffEnvelope, description: string): ExtensionHandoffEnvelope => ({
  ...envelope,
  description,
  descriptionDigest: digestExtensionDescription(description),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reduced extension envelope construction', () => {
  it('accepts only the authenticated reduced source API and reconstructs the exact canonical property order', () => {
    const envelope = builtRealEnvelope();

    expect(Object.keys(envelope)).toEqual(EXTENSION_ENVELOPE_KEYS);
    expect(envelope).toEqual({
      schema: EXTENSION_HANDOFF_SCHEMA,
      mode: 'real',
      packId: GENERATED_PACK_ID,
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
      routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
      adapterContractVersion: EXTENSION_ADAPTER_CONTRACT_VERSION,
      description: SAFE_DESCRIPTION,
      descriptionDigest: digestExtensionDescription(SAFE_DESCRIPTION),
      language: 'en',
      simpleMode: false,
      confirmed: true,
      deviceMode: 'private',
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
      routeKey: 'nextgen',
      issueCode: null,
    });
    expect(Object.isFrozen(envelope)).toBe(true);
    for (const forbidden of [
      'facts', 'evidence', 'filename', 'lookupValue', 'receipt', 'reference',
      'canonicalUrl', 'domain', 'packDigest', 'destination',
    ]) expect(envelope).not.toHaveProperty(forbidden);
  });

  it('does not accept an OfficialHandoffPack at its type or runtime boundary', () => {
    expectTypeOf<Parameters<typeof buildRealExtensionHandoffEnvelope>[0]>()
      .toEqualTypeOf<ConfirmedExtensionHandoffSource>();
    expectTypeOf<OfficialHandoffPack>().not.toExtend<ConfirmedExtensionHandoffSource>();

    const result = buildOfficialHandoffPack(packInput());
    expect(result.status).toBe('built');
    if (result.status !== 'built') return;
    installDeterministicCrypto();
    expect(buildRealExtensionHandoffEnvelope(result.pack as unknown as ConfirmedExtensionHandoffSource, {
      language: 'en', simpleMode: false, nowMs: ISSUED_AT_MS,
    })).toEqual({ status: 'abstained', reason: 'source-not-authentic' });
  });

  it('rejects copied, serialized, altered, and accessor-shaped reduced sources without invoking accessors', () => {
    const source = authenticSource();
    let getterCalls = 0;
    const accessor = Object.defineProperty({}, 'resultRevisionId', {
      enumerable: true,
      get: () => { getterCalls += 1; return RESULT_REVISION; },
    });
    installDeterministicCrypto();
    for (const candidate of [
      { ...source },
      JSON.parse(JSON.stringify(source)),
      { ...source, description: 'Changed after confirmation.' },
      accessor,
    ]) {
      expect(buildRealExtensionHandoffEnvelope(candidate as ConfirmedExtensionHandoffSource, {
        language: 'en', simpleMode: false, nowMs: ISSUED_AT_MS,
      })).toEqual({ status: 'abstained', reason: 'source-not-authentic' });
    }
    expect(getterCalls).toBe(0);
  });

  it('generates an opaque lowercase ID only from one 16-byte getRandomValues fill', () => {
    const calls = installDeterministicCrypto();
    expect(generateOpaqueExtensionId()).toBe(GENERATED_PACK_ID);
    expect(calls()).toBe(1);
  });

  it('fails closed when secure random bytes are unavailable or the API does not fill the supplied array', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generateOpaqueExtensionId()).toThrow(/secure random bytes unavailable/i);

    vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array(16) });
    expect(() => generateOpaqueExtensionId()).toThrow(/secure random bytes unavailable/i);
  });

  it('abstains without throwing when a synthetic description is not canonical', () => {
    installDeterministicCrypto();
    for (const description of ['Cafe\u0301', 'line one\r\nline two']) {
      const build = () => buildSyntheticExtensionHandoffEnvelope(syntheticSource({ description }), {
        language: 'en', simpleMode: false, nowMs: ISSUED_AT_MS,
      });
      expect(build).not.toThrow();
      expect(build()).toEqual({ status: 'abstained', reason: 'invalid-source' });
    }
  });

  it.each([
    ['wrong-evidence-captured', 'wrong-evidence'],
    ['wrong-vehicle-number-entered-by-officer', 'wrong-vehicle-number'],
    ['two-wheeler-on-four-wheeler', 'two-wheeler-on-four-wheeler'],
    ['four-wheeler-on-two-wheeler', 'four-wheeler-on-two-wheeler'],
    ['duplicate-number-plate', 'possible-duplicate-number-plate'],
  ] as const)('maps the internal Legacy issue %s to only %s', (internalCode, extensionCode) => {
    expect(mapLegacyIssueCodeToExtensionIssueCode(internalCode)).toBe(extensionCode);
  });

  it('rejects unknown Legacy issue codes instead of inventing a mapping', () => {
    expect(mapLegacyIssueCodeToExtensionIssueCode('other')).toBeNull();
    expect(mapLegacyIssueCodeToExtensionIssueCode({ toString: () => 'wrong-evidence-captured' })).toBeNull();
  });
});

describe('canonical JSON, digest, and plain-record validation', () => {
  it('round-trips a JSON-serialized plain record and returns a newly reconstructed canonical frozen record', () => {
    const original = builtRealEnvelope();
    const reordered = {
      issueCode: original.issueCode,
      routeKey: original.routeKey,
      ...JSON.parse(JSON.stringify(original)),
    };
    const result = validateExtensionHandoffEnvelope(reordered, validationContext());

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') return;
    expect(result.envelope).not.toBe(reordered);
    expect(Object.keys(result.envelope)).toEqual(EXTENSION_ENVELOPE_KEYS);
    expect(Object.isFrozen(result.envelope)).toBe(true);
    expect(result.canonicalJson).toBe(JSON.stringify(result.envelope));
    expect(result.effectiveExpiresAtMs).toBe(Date.parse(EXPIRES_AT));
  });

  it('produces literal SHA-256 bindings over normalized UTF-8 description and canonical JSON bytes', () => {
    const envelope = builtRealEnvelope();
    expect(digestExtensionDescription('नमस्ते😀'))
      .toBe('79604aaaa1e5479b66d87aa80510040492a6c6fb069afa299c6dce8fa67c0d8b');
    expect(envelope.descriptionDigest).toBe(digestExtensionDescription(SAFE_DESCRIPTION));
    expect(digestCanonicalExtensionHandoffEnvelope(envelope))
      .toBe(digestCanonicalExtensionHandoffEnvelope(JSON.parse(canonicalExtensionHandoffEnvelopeJson(envelope))));
  });

  it('refuses to hash malformed or noncanonical description text instead of normalizing reviewed copy', () => {
    for (const description of ['bad\ud800text', 'Cafe\u0301', 'line one\r\nline two']) {
      expect(() => digestExtensionDescription(description)).toThrow(/well-formed Unicode|canonical NFC\/LF/i);
    }
  });

  it('accepts only byte-for-byte canonical JSON and rejects whitespace, reordering, and duplicate-key encodings', () => {
    const envelope = builtRealEnvelope();
    const canonical = canonicalExtensionHandoffEnvelopeJson(envelope);
    expect(parseCanonicalExtensionHandoffEnvelopeJson(canonical, validationContext()).status).toBe('accepted');
    expect(parseCanonicalExtensionHandoffEnvelopeJson(` ${canonical}`, validationContext()))
      .toEqual({ status: 'rejected', reason: 'non-canonical-json' });
    const parsed = JSON.parse(canonical) as Record<string, unknown>;
    const { issueCode, ...rest } = parsed;
    expect(parseCanonicalExtensionHandoffEnvelopeJson(JSON.stringify({
      issueCode,
      ...rest,
    }), validationContext())).toEqual({ status: 'rejected', reason: 'non-canonical-json' });
    expect(parseCanonicalExtensionHandoffEnvelopeJson(
      canonical.replace('{', '{"schema":"challansakshi.extension-handoff/v1",'),
      validationContext(),
    )).toEqual({ status: 'rejected', reason: 'non-canonical-json' });
  });

  it('rejects non-plain, inherited, accessor, symbol, nested, missing, and unknown properties without coercion', () => {
    const envelope = builtRealEnvelope();
    let hostileCalls = 0;
    const accessor = Object.defineProperty({ ...envelope }, 'description', {
      enumerable: true,
      get: () => { hostileCalls += 1; return SAFE_DESCRIPTION; },
    });
    const symbolRecord = { ...envelope, [Symbol('hidden')]: 'secret' };
    const inherited = Object.assign(Object.create({ schema: EXTENSION_HANDOFF_SCHEMA }), envelope);
    const missing = { ...envelope } as Record<string, unknown>;
    delete missing.packId;

    for (const candidate of [
      null,
      [],
      Object.assign(Object.create(null), envelope),
      inherited,
      accessor,
      symbolRecord,
      { ...envelope, nested: { evidence: 'forbidden' } },
      missing,
      { ...envelope, toJSON: () => { hostileCalls += 1; return envelope; } },
    ]) expect(validateExtensionHandoffEnvelope(candidate, validationContext()).status).toBe('rejected');
    expect(hostileCalls).toBe(0);
  });

  it('rejects null and boolean values in string positions without throwing or coercing them', () => {
    const envelope = builtRealEnvelope();
    for (const description of [null, false]) {
      expect(() => validateExtensionHandoffEnvelope({
        ...envelope,
        description,
      }, validationContext())).not.toThrow();
      expect(validateExtensionHandoffEnvelope({
        ...envelope,
        description,
      }, validationContext())).toEqual({ status: 'rejected', reason: 'invalid-scalar' });
    }
  });

  it('rejects a mismatched description digest and malformed lowercase hex IDs', () => {
    const envelope = builtRealEnvelope();
    expect(validateExtensionHandoffEnvelope({
      ...envelope,
      descriptionDigest: '0'.repeat(64),
    }, validationContext())).toEqual({ status: 'rejected', reason: 'description-digest-mismatch' });

    for (const candidate of [
      'a'.repeat(31),
      'A'.repeat(32),
      'g'.repeat(32),
    ]) expect(validateExtensionHandoffEnvelope({ ...envelope, packId: candidate }, validationContext()))
      .toEqual({ status: 'rejected', reason: 'invalid-id' });
    expect(validateExtensionHandoffEnvelope({
      ...envelope,
      packId: { toString: () => GENERATED_PACK_ID },
    }, validationContext())).toEqual({ status: 'rejected', reason: 'invalid-scalar' });
  });

  it('measures the complete canonical JSON at the exact 8,192 UTF-8 byte boundary', () => {
    const envelope = builtRealEnvelope();
    const base = { ...envelope, routeRegistryVersion: '' };
    const baseBytes = new TextEncoder().encode(JSON.stringify(base)).byteLength;
    const recordAt = (bytes: number) => ({
      ...envelope,
      routeRegistryVersion: 'x'.repeat(bytes - baseBytes),
    });
    const below = recordAt(8191);
    const at = recordAt(8192);
    const above = recordAt(8193);
    expect(new TextEncoder().encode(JSON.stringify(below))).toHaveLength(8191);
    expect(new TextEncoder().encode(JSON.stringify(at))).toHaveLength(8192);
    expect(new TextEncoder().encode(JSON.stringify(above))).toHaveLength(8193);
    expect(validateExtensionHandoffEnvelope(below, validationContext()))
      .toEqual({ status: 'rejected', reason: 'route-registry-version-mismatch' });
    expect(validateExtensionHandoffEnvelope(at, validationContext()))
      .toEqual({ status: 'rejected', reason: 'route-registry-version-mismatch' });
    expect(validateExtensionHandoffEnvelope(above, validationContext()))
      .toEqual({ status: 'rejected', reason: 'envelope-too-large' });
  });
});

describe('Unicode and bounded description safeguards', () => {
  it('accepts normalized LF English, Hindi, combining marks, Indic shaping, and valid surrogate-pair emoji', () => {
    const envelope = builtRealEnvelope();
    for (const description of [
      'Please review this record.\nThe image appears inconsistent.',
      'मैं इस रिकॉर्ड की समीक्षा का अनुरोध करता हूँ। वाहन …3317 पर समाप्त होता है।',
      'Café क़िला क्षि 😀',
      '😀'.repeat(500),
      'क'.repeat(500),
    ]) expect(validateExtensionHandoffEnvelope(
      withDescription(envelope, description), validationContext(),
    ).status).toBe('accepted');
  });

  it('rejects lone high/low surrogates before digesting, normalization, encoding, or sizing', () => {
    const envelope = builtRealEnvelope();
    for (const description of ['bad\ud800text', 'bad\udc00text']) {
      expect(validateExtensionHandoffEnvelope({ ...envelope, description }, validationContext()))
        .toEqual({ status: 'rejected', reason: 'malformed-unicode' });
      expect(() => digestExtensionDescription(description)).toThrow(/well-formed Unicode/i);
    }
  });

  it('requires already-normalized NFC text with LF line endings and no silent truncation', () => {
    const envelope = builtRealEnvelope();
    for (const description of ['Cafe\u0301', 'line one\r\nline two', 'line one\rline two']) {
      expect(validateExtensionHandoffEnvelope(
        { ...envelope, description }, validationContext(),
      )).toEqual({ status: 'rejected', reason: 'description-not-canonical' });
    }
    expect(validateExtensionHandoffEnvelope(
      withDescription(envelope, '😀'.repeat(501)), validationContext(),
    )).toEqual({ status: 'rejected', reason: 'description-too-long' });
  });

  it('rejects every C0/C1 control except LF and every exact bidi-format character', () => {
    const envelope = builtRealEnvelope();
    const controls = [
      ...Array.from({ length: 10 }, (_unused, value) => value),
      ...Array.from({ length: 21 }, (_unused, value) => value + 0x0b),
      ...Array.from({ length: 33 }, (_unused, value) => value + 0x7f),
    ];
    for (const codePoint of controls) {
      const description = `Review${String.fromCodePoint(codePoint)}record`;
      expect(findExtensionDescriptionSafetyMatches(description)).toContain('control-character');
      expect(validateExtensionHandoffEnvelope(
        { ...envelope, description }, validationContext(),
      ).status).toBe('rejected');
    }
    const bidi = [0x061c, 0x200e, 0x200f, ...Array.from({ length: 5 }, (_, value) => value + 0x202a),
      ...Array.from({ length: 4 }, (_, value) => value + 0x2066)];
    for (const codePoint of bidi) {
      const description = `Review${String.fromCodePoint(codePoint)}record`;
      expect(validateExtensionHandoffEnvelope(
        { ...envelope, description }, validationContext(),
      )).toEqual({ status: 'rejected', reason: 'description-not-export-safe' });
    }
  });

  it.each([
    ['markup-or-script', '<review>'],
    ['markup-or-script', 'javascript:alert'],
    ['url', 'See https://example.com'],
    ['url', 'See records.example.in'],
    ['email-or-upi', 'person@example.com'],
    ['email-or-upi', 'citizen@okbank'],
    ['digit-like-identifier', '+91 98765 43210'],
    ['pan-shaped', 'ABCDE1234F'],
    ['indian-registration', 'KA 01 AB 1234'],
    ['indian-registration', '22 BH 1234 AB'],
    ['long-mixed-identifier', 'CASE_12ABCD345678'],
  ] as const)('reuses the exact bounded %s predicate for %s', (expected, description) => {
    expect(findExtensionDescriptionSafetyMatches(description)).toContain(expected);
    const envelope = builtRealEnvelope();
    expect(validateExtensionHandoffEnvelope(
      withDescription(envelope, description), validationContext(),
    )).toEqual({ status: 'rejected', reason: 'description-not-export-safe' });
  });

  it.each([
    'मैं इस रिकॉर्ड की समीक्षा का अनुरोध करता हूँ। वाहन …3317 पर समाप्त होता है। 😀',
    'Plate ending …3317. Please review the record.',
    'The citizen completes OTP and CAPTCHA on the official service without sharing either value.',
  ])('keeps valid Hindi, emoji, masked-last-four, and neutral guidance negative: %s', (description) => {
    expect(findExtensionDescriptionSafetyMatches(description)).toEqual([]);
  });
});

describe('time, route, version, and profile closure', () => {
  const validationApis = [
    ['record validator', (envelope: unknown, context: unknown) => (
      validateExtensionHandoffEnvelope(envelope, context as ExtensionHandoffValidationContext)
    )],
    ['canonical JSON parser', (envelope: unknown, context: unknown) => (
      parseCanonicalExtensionHandoffEnvelopeJson(
        JSON.stringify(envelope), context as ExtensionHandoffValidationContext,
      )
    )],
  ] as const;

  it.each(validationApis)('%s preserves registry-version rejection before invalid context', (
    _name, validate,
  ) => {
    const envelope = {
      ...builtRealEnvelope(),
      routeRegistryVersion: 'challansakshi.official-routes/invalid',
    };
    const invalidContext = {
      profile: 'invented-profile',
      nowMs: 'not-a-number',
      importedAtMs: ISSUED_AT_MS,
    };

    expect(validate(envelope, invalidContext)).toEqual({
      status: 'rejected', reason: 'route-registry-version-mismatch',
    });
  });

  it.each(validationApis)('%s preserves global route/issue rejection before profile mismatch', (
    _name, validate,
  ) => {
    const envelope = {
      ...builtRealEnvelope(),
      routeKey: 'legacy',
      issueCode: null,
    };

    expect(validate(envelope, validationContext('synthetic-development'))).toEqual({
      status: 'rejected', reason: 'route-issue-mismatch',
    });
  });

  it('accepts canonical UTC timestamps with exactly 60 seconds of future tolerance', () => {
    const envelope = builtRealEnvelope();
    expect(validateExtensionHandoffEnvelope(
      envelope, validationContext('production-disabled', ISSUED_AT_MS - 60_000),
    ).status).toBe('accepted');
    expect(validateExtensionHandoffEnvelope(
      envelope, validationContext('production-disabled', ISSUED_AT_MS - 60_001),
    )).toEqual({ status: 'rejected', reason: 'issued-too-far-in-future' });
  });

  it('rejects stale, expired, reversed, over-ten-minute, and noncanonical timestamps', () => {
    const envelope = builtRealEnvelope();
    expect(validateExtensionHandoffEnvelope(
      envelope, validationContext('production-disabled', ISSUED_AT_MS + 600_001),
    )).toEqual({ status: 'rejected', reason: 'issued-too-old' });
    expect(validateExtensionHandoffEnvelope(
      envelope, validationContext('production-disabled', Date.parse(EXPIRES_AT)),
    )).toEqual({ status: 'rejected', reason: 'envelope-expired' });
    expect(validateExtensionHandoffEnvelope({
      ...envelope, expiresAt: ISSUED_AT,
    }, validationContext())).toEqual({ status: 'rejected', reason: 'invalid-lifetime' });
    expect(validateExtensionHandoffEnvelope({
      ...envelope, expiresAt: '2026-09-03T10:40:00.001Z',
    }, validationContext())).toEqual({ status: 'rejected', reason: 'invalid-lifetime' });
    for (const issuedAt of ['2026-09-03T10:30:00Z', '2026-09-03T16:00:00.000+05:30', 'not-a-date']) {
      expect(validateExtensionHandoffEnvelope({ ...envelope, issuedAt }, validationContext()))
        .toEqual({ status: 'rejected', reason: 'invalid-timestamp' });
    }
  });

  it('computes effective expiry from the earlier envelope/import ten-minute boundary', () => {
    const envelope = builtRealEnvelope();
    const nowMs = ISSUED_AT_MS - 60_000;
    const result = validateExtensionHandoffEnvelope(
      envelope, validationContext('production-disabled', nowMs, nowMs),
    );
    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') expect(result.effectiveExpiresAtMs).toBe(ISSUED_AT_MS + 540_000);
    expect(validateExtensionHandoffEnvelope(
      envelope, validationContext('production-disabled', nowMs + 600_000, nowMs),
    )).toEqual({ status: 'rejected', reason: 'effective-expiry-reached' });
  });

  it('validates the context as an exact own-data record before reading it', () => {
    const envelope = builtRealEnvelope();
    let hostileCalls = 0;
    const accessor = Object.defineProperties({}, {
      profile: {
        enumerable: true,
        get: () => { hostileCalls += 1; throw new Error('must not run'); },
      },
      nowMs: { enumerable: true, value: ISSUED_AT_MS },
      importedAtMs: { enumerable: true, value: ISSUED_AT_MS },
    });
    const inherited = Object.assign(Object.create({ profile: 'production-disabled' }), {
      nowMs: ISSUED_AT_MS,
      importedAtMs: ISSUED_AT_MS,
    });

    for (const context of [
      accessor,
      inherited,
      { ...validationContext(), userCase: 'secret' },
      { ...validationContext(), nowMs: { valueOf: () => { hostileCalls += 1; return ISSUED_AT_MS; } } },
    ]) {
      expect(() => validateExtensionHandoffEnvelope(
        envelope, context as ExtensionHandoffValidationContext,
      )).not.toThrow();
      expect(validateExtensionHandoffEnvelope(
        envelope, context as ExtensionHandoffValidationContext,
      )).toEqual({ status: 'rejected', reason: 'invalid-validation-context' });
    }
    expect(hostileCalls).toBe(0);
  });

  it('rejects route/issue/version/confirmation/device combinations outside the closed union', () => {
    const envelope = builtRealEnvelope();
    const candidates: Array<readonly [Record<string, unknown>, string]> = [
      [{ routeRegistryVersion: 'other' }, 'route-registry-version-mismatch'],
      [{ adapterContractVersion: 'other' }, 'adapter-contract-version-mismatch'],
      [{ confirmed: false as true }, 'confirmation-or-device-mismatch'],
      [{ deviceMode: 'shared' as 'private' }, 'confirmation-or-device-mismatch'],
      [{ routeKey: 'legacy', issueCode: null }, 'route-issue-mismatch'],
      [{ routeKey: 'nextgen', issueCode: 'wrong-evidence' }, 'route-issue-mismatch'],
    ];
    for (const [change, reason] of candidates) {
      expect(validateExtensionHandoffEnvelope({ ...envelope, ...change }, validationContext()))
        .toEqual({ status: 'rejected', reason });
    }
  });

  it('rejects real envelopes in the synthetic profile and synthetic envelopes in both production profiles', () => {
    const real = builtRealEnvelope();
    const synthetic = builtSyntheticEnvelope();
    expect(validateExtensionHandoffEnvelope(real, validationContext('synthetic-development')))
      .toEqual({ status: 'rejected', reason: 'profile-mismatch' });
    expect(validateExtensionHandoffEnvelope(synthetic, validationContext('production-disabled')))
      .toEqual({ status: 'rejected', reason: 'profile-mismatch' });
    expect(validateExtensionHandoffEnvelope(synthetic, validationContext('production-candidate')))
      .toEqual({ status: 'rejected', reason: 'profile-mismatch' });
    expect(validateExtensionHandoffEnvelope(synthetic, validationContext('synthetic-development')).status)
      .toBe('accepted');
  });
});
