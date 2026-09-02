import type {
  IssuingJurisdictionCode,
  JurisdictionConfirmation,
  OfficialDestination,
  OfficialFallbackRoute,
} from '../../lib/official-destinations';

const TEST_ONLY_LEGACY_FALLBACK: OfficialFallbackRoute = Object.freeze({
  routeType: 'fallback',
  key: 'national-services-directory',
  serviceName: 'Test-only national e-Challan services directory',
  domain: 'echallan.parivahan.gov.in',
  canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services',
  purpose: 'official-services-directory',
  verifier: 'Task 1 test-only route verifier',
  evidenceRef: 'tests/fixtures/official-destination-fixtures.ts#legacy-fallback',
  lastVerifiedAt: '2026-09-02',
  expiresAt: '2026-10-02',
  releaseState: 'current',
});

const TEST_ONLY_LEGACY_CODE = 'AP' as const satisfies IssuingJurisdictionCode;

const TEST_ONLY_LEGACY_DESTINATION: OfficialDestination = Object.freeze({
  routeType: 'handoff',
  key: 'legacy',
  serviceName: 'Test-only national e-Challan grievance service',
  domain: 'echallan.parivahan.gov.in',
  canonicalUrl: 'https://echallan.parivahan.gov.in/gsticket',
  purpose: 'official-grievance-service',
  jurisdictionScope: Object.freeze([TEST_ONLY_LEGACY_CODE]),
  routingRationale: 'Test-only retained route evidence exercises future pure Legacy mapping without changing production routing.',
  fallback: TEST_ONLY_LEGACY_FALLBACK,
  capabilities: Object.freeze({
    category: true,
    description: true,
    attachmentGuidance: true,
  }),
  verifier: 'Task 1 test-only route verifier',
  evidenceRef: 'tests/fixtures/official-destination-fixtures.ts#legacy-handoff',
  lastVerifiedAt: '2026-09-02',
  expiresAt: '2026-10-02',
  releaseState: 'current',
});

export const TEST_ONLY_VERIFIED_LEGACY_DESTINATION_FIXTURE: Readonly<{
  jurisdictionCode: IssuingJurisdictionCode;
  confirmation: JurisdictionConfirmation;
  destination: OfficialDestination;
}> = Object.freeze({
  jurisdictionCode: TEST_ONLY_LEGACY_CODE,
  confirmation: Object.freeze({ status: 'confirmed', code: TEST_ONLY_LEGACY_CODE }),
  destination: TEST_ONLY_LEGACY_DESTINATION,
});
