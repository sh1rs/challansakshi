import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ALL_ISSUING_JURISDICTION_CODES,
  CURRENT_LEGACY_JURISDICTION_CODES,
  DELHI_JURISDICTION_CODES,
  NEXTGEN_JURISDICTION_CODES,
  OFFICIAL_AUXILIARY_ROUTES,
  OFFICIAL_DESTINATIONS,
  OFFICIAL_FALLBACK_ROUTE,
  OFFICIAL_ROUTE_REGISTRY_VERSION,
  isActionReadyOfficialDestination,
  isVerifiedOfficialDestinationShape,
  isVerifiedOfficialRouteCurrent,
  resolveOfficialDestination,
  type IssuingJurisdictionCode,
  type JurisdictionConfirmation,
  type OfficialAuxiliaryRoute,
  type OfficialDestination,
  type OfficialFallbackRoute,
} from '../lib/official-destinations';
import { TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE } from './fixtures/official-destination-fixtures';

const VERIFIED_NOW = '2026-09-03T12:00:00.000Z';
const EXPECTED_NEXTGEN_CODES = [
  'AN', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'GA', 'GJ', 'HP', 'HR', 'JH', 'JK',
  'KA', 'LA', 'MH', 'ML', 'MN', 'MZ', 'NL', 'PB', 'PY', 'RJ', 'SK', 'TN', 'UK',
  'WB',
] as const satisfies readonly IssuingJurisdictionCode[];
const EXPECTED_UNSUPPORTED_CODES = [
  'AP', 'DN', 'KL', 'LD', 'MP', 'OD', 'TR', 'TS', 'UP',
] as const satisfies readonly IssuingJurisdictionCode[];

const confirmed = (code: IssuingJurisdictionCode): JurisdictionConfirmation => ({
  status: 'confirmed',
  code,
});

describe('official destination registry', () => {
  it('owns the four exact compile-time handoff URLs', () => {
    expect(OFFICIAL_DESTINATIONS.legacy.canonicalUrl).toBe('https://echallan.parivahan.gov.in/gsticket');
    expect(OFFICIAL_DESTINATIONS.nextgen.canonicalUrl).toBe('https://echallan.parivahan.nic.in/grievance');
    expect(OFFICIAL_DESTINATIONS['delhi-manual'].canonicalUrl).toBe('https://traffic.delhipolice.gov.in/');
    expect(OFFICIAL_DESTINATIONS.unresolved.canonicalUrl).toBe('https://echallan.parivahan.gov.in/index/challan-services');
  });

  it('owns the exact auxiliary lookup, landing, directory, and court URLs', () => {
    expect(OFFICIAL_AUXILIARY_ROUTES['national-record-lookup'].canonicalUrl)
      .toBe('https://echallan.parivahan.gov.in/index/accused-challan');
    expect(OFFICIAL_AUXILIARY_ROUTES['nextgen-service-landing'].canonicalUrl)
      .toBe('https://echallan.parivahan.nic.in/challan/challan-services');
    expect(OFFICIAL_AUXILIARY_ROUTES['national-services-directory'].canonicalUrl)
      .toBe('https://echallan.parivahan.gov.in/index/challan-services');
    expect(OFFICIAL_AUXILIARY_ROUTES['virtual-courts'].canonicalUrl)
      .toBe('https://vcourts.gov.in/virtualcourt/index.php');
  });

  it('keeps the approved production legacy jurisdiction tuple literally empty', () => {
    expect(CURRENT_LEGACY_JURISDICTION_CODES).toEqual([]);
    expect(Object.isFrozen(CURRENT_LEGACY_JURISDICTION_CODES)).toBe(true);
    expect(OFFICIAL_DESTINATIONS.legacy.jurisdictionScope).toEqual([]);
  });

  it.each(EXPECTED_NEXTGEN_CODES)('resolves confirmed %s only to NextGen', (code) => {
    expect(resolveOfficialDestination(confirmed(code), VERIFIED_NOW).key).toBe('nextgen');
  });

  it('keeps the route code lists equal to the independently specified literal sets', () => {
    expect(NEXTGEN_JURISDICTION_CODES).toEqual(EXPECTED_NEXTGEN_CODES);
    expect(DELHI_JURISDICTION_CODES).toEqual(['DL']);
    expect(ALL_ISSUING_JURISDICTION_CODES).toEqual([
      'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HP', 'HR',
      'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD',
      'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'WB',
    ]);
  });

  it('resolves confirmed DL only to the Delhi manual service', () => {
    const code: IssuingJurisdictionCode = 'DL';
    expect(resolveOfficialDestination(confirmed(code), VERIFIED_NOW).key).toBe('delhi-manual');
  });

  it('fails every supported but unverified jurisdiction closed instead of inferring legacy by complement', () => {
    expect(EXPECTED_UNSUPPORTED_CODES.map((code) => resolveOfficialDestination(confirmed(code), VERIFIED_NOW).key))
      .toEqual(['unresolved', 'unresolved', 'unresolved', 'unresolved', 'unresolved', 'unresolved', 'unresolved', 'unresolved', 'unresolved']);
  });

  it('fails unconfirmed and malformed runtime inputs closed', () => {
    expect(resolveOfficialDestination({ status: 'unconfirmed' }, VERIFIED_NOW).key).toBe('unresolved');
    expect(resolveOfficialDestination({ status: 'confirmed', code: 'XX' } as unknown as JurisdictionConfirmation, VERIFIED_NOW).key)
      .toBe('unresolved');
    expect(resolveOfficialDestination({ status: 'confirmed' } as unknown as JurisdictionConfirmation, VERIFIED_NOW).key)
      .toBe('unresolved');
    expect(resolveOfficialDestination({ status: 'confirmed', code: 7 } as unknown as JurisdictionConfirmation, VERIFIED_NOW).key)
      .toBe('unresolved');
  });

  it('fails a route older than thirty days closed', () => {
    expect(resolveOfficialDestination(confirmed('KA'), '2026-10-03T12:00:00.000Z').key).toBe('unresolved');
  });

  it('never lets hostile citizen properties influence the selected compile-time URL', () => {
    const hostile = {
      status: 'confirmed' as const,
      code: 'KA' as const,
      hostname: 'attacker.example',
      path: '/steal',
      query: '?challan=secret',
      fragment: '#redirect',
      canonicalUrl: 'https://attacker.example/steal?challan=secret#redirect',
    };

    expect(resolveOfficialDestination(hostile, VERIFIED_NOW).canonicalUrl)
      .toBe('https://echallan.parivahan.nic.in/grievance');
  });

  it('retains jurisdiction scope, rationale, verification evidence, and an explicit fallback on every handoff record', () => {
    expect(OFFICIAL_ROUTE_REGISTRY_VERSION).toMatch(/^challansakshi\.official-routes\/v\d+$/);
    for (const destination of Object.values(OFFICIAL_DESTINATIONS)) {
      expect(destination.routeType).toBe('handoff');
      expect(destination.routingRationale.length).toBeGreaterThan(0);
      expect(destination.verifier.length).toBeGreaterThan(0);
      expect(destination.evidenceRef.length).toBeGreaterThan(0);
      expect(destination.fallback).toBe(OFFICIAL_FALLBACK_ROUTE);
      expect(destination.fallback.routeType).toBe('fallback');
      expect(destination.fallback.canonicalUrl).toBe('https://echallan.parivahan.gov.in/index/challan-services');
    }
    expect(OFFICIAL_DESTINATIONS.nextgen.jurisdictionScope).toEqual(EXPECTED_NEXTGEN_CODES);
    expect(OFFICIAL_DESTINATIONS['delhi-manual'].jurisdictionScope).toEqual(['DL']);
  });

  it('keeps auxiliary and fallback records structurally and runtime-ineligible as grievance destinations', () => {
    expectTypeOf<OfficialAuxiliaryRoute>().not.toMatchTypeOf<OfficialDestination>();
    expectTypeOf<OfficialFallbackRoute>().not.toMatchTypeOf<OfficialDestination>();

    for (const auxiliary of Object.values(OFFICIAL_AUXILIARY_ROUTES)) {
      expect(isActionReadyOfficialDestination(auxiliary, confirmed('KA'), VERIFIED_NOW)).toBe(false);
    }
    expect(isActionReadyOfficialDestination(OFFICIAL_FALLBACK_ROUTE, confirmed('KA'), VERIFIED_NOW)).toBe(false);
    expect(isActionReadyOfficialDestination(OFFICIAL_DESTINATIONS['delhi-manual'], confirmed('DL'), VERIFIED_NOW)).toBe(false);
    expect(isActionReadyOfficialDestination(OFFICIAL_DESTINATIONS.unresolved, { status: 'unconfirmed' }, VERIFIED_NOW)).toBe(false);
  });

  it('rejects a handoff record whose fallback relationship is not the exact fallback record kind and purpose', () => {
    const auxiliaryFallback = {
      ...OFFICIAL_DESTINATIONS.nextgen,
      fallback: OFFICIAL_AUXILIARY_ROUTES['national-services-directory'],
    } as unknown as OfficialDestination;

    expect(isVerifiedOfficialDestinationShape(auxiliaryFallback, VERIFIED_NOW)).toBe(false);
    expect(isActionReadyOfficialDestination(auxiliaryFallback, confirmed('KA'), VERIFIED_NOW)).toBe(false);
  });

  it('binds action readiness to exact registry identity, matching jurisdiction confirmation, and current time', () => {
    const canonicalNextgen = OFFICIAL_DESTINATIONS.nextgen;
    const fabricatedSameShape = {
      ...canonicalNextgen,
      capabilities: { ...canonicalNextgen.capabilities },
    } as OfficialDestination;
    const arbitraryUrl = {
      ...canonicalNextgen,
      domain: 'attacker.example',
      canonicalUrl: 'https://attacker.example/grievance',
    } as OfficialDestination;

    expect(isActionReadyOfficialDestination(canonicalNextgen, confirmed('KA'), VERIFIED_NOW)).toBe(true);
    expect(isVerifiedOfficialDestinationShape(fabricatedSameShape, VERIFIED_NOW)).toBe(true);
    expect(isActionReadyOfficialDestination(fabricatedSameShape, confirmed('KA'), VERIFIED_NOW)).toBe(false);
    expect(isVerifiedOfficialDestinationShape(arbitraryUrl, VERIFIED_NOW)).toBe(false);
    expect(isActionReadyOfficialDestination(arbitraryUrl, confirmed('KA'), VERIFIED_NOW)).toBe(false);
    expect(isActionReadyOfficialDestination(OFFICIAL_DESTINATIONS.legacy, confirmed('AP'), VERIFIED_NOW)).toBe(false);
    expect(isActionReadyOfficialDestination(canonicalNextgen, { status: 'unconfirmed' }, VERIFIED_NOW)).toBe(false);
    expect(isActionReadyOfficialDestination(
      canonicalNextgen,
      { status: 'confirmed' } as unknown as JurisdictionConfirmation,
      VERIFIED_NOW,
    )).toBe(false);
    expect(isActionReadyOfficialDestination(canonicalNextgen, confirmed('KA'), '2026-10-03T12:00:00.000Z')).toBe(false);
  });

  it('keeps the fully verified Legacy fixture valid for pure tests but outside production routing authority', () => {
    const fixture = TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE;

    expect(fixture).toMatchObject({
      jurisdictionCode: 'AP',
      confirmation: { status: 'confirmed', code: 'AP' },
      destination: {
        routeType: 'handoff',
        key: 'legacy',
        canonicalUrl: 'https://echallan.parivahan.gov.in/gsticket',
        verifier: 'Task 1 test-only route verifier',
        evidenceRef: 'tests/fixtures/official-destination-fixtures.ts#legacy-handoff',
        lastVerifiedAt: '2026-09-02',
        expiresAt: '2026-10-02',
        releaseState: 'current',
        jurisdictionScope: ['AP'],
        capabilities: { category: true, description: true, attachmentGuidance: true },
        fallback: {
          routeType: 'fallback',
          canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services',
          verifier: 'Task 1 test-only route verifier',
          evidenceRef: 'tests/fixtures/official-destination-fixtures.ts#legacy-fallback',
        },
      },
    });
    expect(isVerifiedOfficialDestinationShape(fixture.destination, VERIFIED_NOW)).toBe(true);
    expect(resolveOfficialDestination(fixture.confirmation, VERIFIED_NOW).key).toBe('unresolved');
    expect(isActionReadyOfficialDestination(fixture.destination, fixture.confirmation, VERIFIED_NOW)).toBe(false);
  });

  it.each(['__proto__', 'constructor', 'toString', 'not-a-destination-kind'])(
    'returns false without throwing for inherited or unknown destination key %s',
    (key) => {
      const hostileUnknownInput = {
        routeType: 'handoff',
        key,
        canonicalUrl: undefined,
        domain: undefined,
        purpose: undefined,
        routingRationale: 'Hostile unknown input must fail closed.',
        jurisdictionScope: [],
        capabilities: { category: false, description: false, attachmentGuidance: false },
      };
      let result: boolean | undefined;

      expect(() => {
        result = isVerifiedOfficialDestinationShape(hostileUnknownInput, VERIFIED_NOW);
      }).not.toThrow();
      expect(result).toBe(false);
    },
  );

  it.each([
    ['handoff', OFFICIAL_DESTINATIONS.nextgen],
    ['auxiliary', OFFICIAL_AUXILIARY_ROUTES['national-record-lookup']],
    ['fallback', OFFICIAL_FALLBACK_ROUTE],
  ] as const)('rejects stale, disabled, missing-evidence, and malformed-date %s metadata independently', (_kind, route) => {
    expect(isVerifiedOfficialRouteCurrent({ ...route, releaseState: 'stale' }, VERIFIED_NOW)).toBe(false);
    expect(isVerifiedOfficialRouteCurrent({ ...route, releaseState: 'disabled' }, VERIFIED_NOW)).toBe(false);
    expect(isVerifiedOfficialRouteCurrent({ ...route, evidenceRef: '' }, VERIFIED_NOW)).toBe(false);
    expect(isVerifiedOfficialRouteCurrent({ ...route, verifier: '' }, VERIFIED_NOW)).toBe(false);
    expect(isVerifiedOfficialRouteCurrent({ ...route, lastVerifiedAt: '2026-02-30' }, VERIFIED_NOW)).toBe(false);
    expect(isVerifiedOfficialRouteCurrent({ ...route, expiresAt: 'not-a-date' }, VERIFIED_NOW)).toBe(false);
  });
});
