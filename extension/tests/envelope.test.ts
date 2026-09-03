import { describe, expect, it } from 'vitest';
import {
  EXTENSION_ENVELOPE_KEYS,
  parseCanonicalExtensionHandoffEnvelopeJson,
  validateExtensionHandoffEnvelope,
  type ExtensionHandoffEnvelope,
} from '../../lib/extension-handoff-contract';
import { validateEnvelopeForBuildProfile } from '../src/manifest';

const issuedAtMs = Date.UTC(2026, 8, 3, 8, 0, 0);
const nowMs = issuedAtMs + 60_000;

const commonEnvelope = {
  packId: '00112233445566778899aabbccddeeff',
  resultRevisionId: '11112222333344445555666677778888',
  packRevisionId: '9999aaaabbbbccccddddeeeeffff0000',
  routeRegistryVersion: 'challansakshi.official-routes/v1',
  adapterContractVersion: 'challansakshi.adapter-contract/v1',
  description: 'Please review the fictional vehicle-class mismatch.',
  descriptionDigest: '2904ce189e9e2a9e7f7d59ef19b3ae9298caaff1e5158927e602029ce9f06763',
  language: 'en',
  simpleMode: false,
  confirmed: true,
  deviceMode: 'private',
  issuedAt: '2026-09-03T08:00:00.000Z',
  expiresAt: '2026-09-03T08:10:00.000Z',
} as const;

const syntheticEnvelope = Object.freeze({
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'synthetic',
  ...commonEnvelope,
  routeKey: 'synthetic-fixture',
  issueCode: 'four-wheeler-on-two-wheeler',
}) as ExtensionHandoffEnvelope;

const realEnvelope = Object.freeze({
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'real',
  ...commonEnvelope,
  routeKey: 'nextgen',
  issueCode: null,
}) as ExtensionHandoffEnvelope;

describe('extension-side envelope contract mirror', () => {
  it('accepts canonical real and synthetic records under only their matching profile', () => {
    expect(validateEnvelopeForBuildProfile(
      'synthetic-development', syntheticEnvelope, nowMs, nowMs,
    ).status).toBe('accepted');
    expect(validateEnvelopeForBuildProfile(
      'production-disabled', realEnvelope, nowMs, nowMs,
    ).status).toBe('accepted');

    expect(validateEnvelopeForBuildProfile(
      'synthetic-development', realEnvelope, nowMs, nowMs,
    )).toEqual({ status: 'rejected', reason: 'profile-mismatch' });
    expect(validateEnvelopeForBuildProfile(
      'production-disabled', syntheticEnvelope, nowMs, nowMs,
    )).toEqual({ status: 'rejected', reason: 'profile-mismatch' });
  });

  it('preserves the exact canonical property order across the JSON boundary', () => {
    const canonicalJson = JSON.stringify(syntheticEnvelope);
    const parsed = parseCanonicalExtensionHandoffEnvelopeJson(canonicalJson, {
      profile: 'synthetic-development',
      nowMs,
      importedAtMs: nowMs,
    });
    expect(parsed.status).toBe('accepted');
    if (parsed.status !== 'accepted') return;
    expect(Object.keys(parsed.envelope)).toEqual(EXTENSION_ENVELOPE_KEYS);
    expect(parsed.canonicalJson).toBe(canonicalJson);

    const reordered = JSON.stringify(Object.fromEntries([
      ...Object.entries(syntheticEnvelope).slice(1),
      Object.entries(syntheticEnvelope)[0],
    ]));
    expect(parseCanonicalExtensionHandoffEnvelopeJson(reordered, {
      profile: 'synthetic-development',
      nowMs,
      importedAtMs: nowMs,
    })).toEqual({ status: 'rejected', reason: 'non-canonical-json' });
  });

  it('rejects malformed, extra, prototype-controlled, and accessor-backed envelope values', () => {
    let getterCalls = 0;
    const accessor = { ...syntheticEnvelope } as Record<string, unknown>;
    Object.defineProperty(accessor, 'description', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return commonEnvelope.description;
      },
    });
    const inherited = Object.assign(
      Object.create({ injected: true }) as Record<string, unknown>,
      syntheticEnvelope,
    );
    const hostileProxy = new Proxy({ ...syntheticEnvelope }, {
      ownKeys: () => {
        throw new Error('must fail closed');
      },
    });

    for (const candidate of [
      null,
      [],
      { ...syntheticEnvelope, unknown: true },
      inherited,
      accessor,
      hostileProxy,
    ]) {
      expect(validateExtensionHandoffEnvelope(candidate, {
        profile: 'synthetic-development',
        nowMs,
        importedAtMs: nowMs,
      }).status).toBe('rejected');
    }
    expect(getterCalls).toBe(0);
  });
});
