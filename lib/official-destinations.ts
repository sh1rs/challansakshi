export const OFFICIAL_ROUTE_REGISTRY_VERSION = 'challansakshi.official-routes/v1' as const;

export const ALL_ISSUING_JURISDICTION_CODES = Object.freeze([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HP', 'HR',
  'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD',
  'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'WB',
] as const);

export type IssuingJurisdictionCode = typeof ALL_ISSUING_JURISDICTION_CODES[number];

export const NEXTGEN_JURISDICTION_CODES = Object.freeze([
  'AN', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'GA', 'GJ', 'HP', 'HR', 'JH', 'JK',
  'KA', 'LA', 'MH', 'ML', 'MN', 'MZ', 'NL', 'PB', 'PY', 'RJ', 'SK', 'TN', 'UK',
  'WB',
] as const satisfies readonly IssuingJurisdictionCode[]);

export const DELHI_JURISDICTION_CODES = Object.freeze([
  'DL',
] as const satisfies readonly IssuingJurisdictionCode[]);

// No exact legacy jurisdiction currently has retained code-specific route evidence.
export const CURRENT_LEGACY_JURISDICTION_CODES = Object.freeze(
  [] as const satisfies readonly IssuingJurisdictionCode[],
);

export type JurisdictionConfirmation =
  | Readonly<{ status: 'confirmed'; code: IssuingJurisdictionCode }>
  | Readonly<{ status: 'unconfirmed' }>;

export type OfficialDestinationKind = 'legacy' | 'nextgen' | 'delhi-manual' | 'unresolved';
export type OfficialRouteReleaseState = 'current' | 'stale' | 'disabled';

export type VerifiedOfficialRoute = Readonly<{
  serviceName: string;
  domain: string;
  purpose: string;
  verifier: string;
  evidenceRef: string;
  lastVerifiedAt: string;
  expiresAt: string;
  releaseState: OfficialRouteReleaseState;
}>;

export type OfficialFallbackRoute = VerifiedOfficialRoute & Readonly<{
  routeType: 'fallback';
  key: 'national-services-directory';
  canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services';
  purpose: 'official-services-directory';
}>;

export type OfficialAuxiliaryRoute = VerifiedOfficialRoute & Readonly<{
  routeType: 'auxiliary';
  key: 'national-record-lookup' | 'nextgen-service-landing' | 'national-services-directory' | 'virtual-courts';
  canonicalUrl: string;
  purpose: 'official-record-lookup' | 'official-service-landing' | 'official-services-directory' | 'official-court-service';
}>;

export type OfficialDestination = VerifiedOfficialRoute & Readonly<{
  routeType: 'handoff';
  key: OfficialDestinationKind;
  canonicalUrl: string;
  purpose: 'official-grievance-service' | 'official-service';
  jurisdictionScope: readonly IssuingJurisdictionCode[];
  routingRationale: string;
  fallback: OfficialFallbackRoute;
  capabilities: Readonly<{
    category: boolean;
    description: boolean;
    attachmentGuidance: boolean;
  }>;
}>;

const RETAINED_VERIFIER = 'ChallanSakshi release-route review';
const VERIFIED_AT = '2026-09-02';
const EXPIRES_AT = '2026-10-02';

const routeEvidence = (evidenceRef: string) => ({
  verifier: RETAINED_VERIFIER,
  evidenceRef,
  lastVerifiedAt: VERIFIED_AT,
  expiresAt: EXPIRES_AT,
  releaseState: 'current' as const,
});

export const OFFICIAL_FALLBACK_ROUTE: OfficialFallbackRoute = Object.freeze({
  routeType: 'fallback',
  key: 'national-services-directory',
  serviceName: 'National e-Challan services directory',
  domain: 'echallan.parivahan.gov.in',
  canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services',
  purpose: 'official-services-directory',
  ...routeEvidence('public-launch-route-review-2026-09-02#national-services-directory'),
});

export const OFFICIAL_AUXILIARY_ROUTES = Object.freeze({
  'national-record-lookup': Object.freeze({
    routeType: 'auxiliary',
    key: 'national-record-lookup',
    serviceName: 'National e-Challan record lookup',
    domain: 'echallan.parivahan.gov.in',
    canonicalUrl: 'https://echallan.parivahan.gov.in/index/accused-challan',
    purpose: 'official-record-lookup',
    ...routeEvidence('public-launch-route-review-2026-09-02#national-record-lookup'),
  }),
  'nextgen-service-landing': Object.freeze({
    routeType: 'auxiliary',
    key: 'nextgen-service-landing',
    serviceName: 'NextGen e-Challan services',
    domain: 'echallan.parivahan.nic.in',
    canonicalUrl: 'https://echallan.parivahan.nic.in/challan/challan-services',
    purpose: 'official-service-landing',
    ...routeEvidence('public-launch-route-review-2026-09-02#nextgen-service-landing'),
  }),
  'national-services-directory': Object.freeze({
    routeType: 'auxiliary',
    key: 'national-services-directory',
    serviceName: 'National e-Challan services directory',
    domain: 'echallan.parivahan.gov.in',
    canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services',
    purpose: 'official-services-directory',
    ...routeEvidence('public-launch-route-review-2026-09-02#national-services-directory'),
  }),
  'virtual-courts': Object.freeze({
    routeType: 'auxiliary',
    key: 'virtual-courts',
    serviceName: 'Virtual Courts',
    domain: 'vcourts.gov.in',
    canonicalUrl: 'https://vcourts.gov.in/virtualcourt/index.php',
    purpose: 'official-court-service',
    ...routeEvidence('public-launch-route-review-2026-09-02#virtual-courts'),
  }),
} as const satisfies Record<OfficialAuxiliaryRoute['key'], OfficialAuxiliaryRoute>);

const grievanceCapabilities = Object.freeze({
  category: false,
  description: true,
  attachmentGuidance: false,
});

const manualCapabilities = Object.freeze({
  category: false,
  description: false,
  attachmentGuidance: false,
});

export const OFFICIAL_DESTINATIONS = Object.freeze({
  legacy: Object.freeze({
    routeType: 'handoff',
    key: 'legacy',
    serviceName: 'National e-Challan grievance service',
    domain: 'echallan.parivahan.gov.in',
    canonicalUrl: 'https://echallan.parivahan.gov.in/gsticket',
    purpose: 'official-grievance-service',
    jurisdictionScope: CURRENT_LEGACY_JURISDICTION_CODES,
    routingRationale: 'Used only for an explicitly enumerated jurisdiction with current retained code-specific route evidence; none are approved in this release.',
    fallback: OFFICIAL_FALLBACK_ROUTE,
    capabilities: Object.freeze({ category: true, description: true, attachmentGuidance: true }),
    ...routeEvidence('public-launch-route-review-2026-09-02#legacy-grievance'),
  }),
  nextgen: Object.freeze({
    routeType: 'handoff',
    key: 'nextgen',
    serviceName: 'NextGen e-Challan grievance service',
    domain: 'echallan.parivahan.nic.in',
    canonicalUrl: 'https://echallan.parivahan.nic.in/grievance',
    purpose: 'official-grievance-service',
    jurisdictionScope: NEXTGEN_JURISDICTION_CODES,
    routingRationale: 'The retained national service route review explicitly directed these issuing-jurisdiction codes to NextGen.',
    fallback: OFFICIAL_FALLBACK_ROUTE,
    capabilities: grievanceCapabilities,
    ...routeEvidence('public-launch-route-review-2026-09-02#nextgen-grievance'),
  }),
  'delhi-manual': Object.freeze({
    routeType: 'handoff',
    key: 'delhi-manual',
    serviceName: 'Delhi Traffic Police',
    domain: 'traffic.delhipolice.gov.in',
    canonicalUrl: 'https://traffic.delhipolice.gov.in/',
    purpose: 'official-service',
    jurisdictionScope: DELHI_JURISDICTION_CODES,
    routingRationale: 'Delhi was separately linked to its official landing page; no form-compatible grievance contract is asserted.',
    fallback: OFFICIAL_FALLBACK_ROUTE,
    capabilities: manualCapabilities,
    ...routeEvidence('public-launch-route-review-2026-09-02#delhi-official-landing'),
  }),
  unresolved: Object.freeze({
    routeType: 'handoff',
    key: 'unresolved',
    serviceName: 'National e-Challan services directory',
    domain: 'echallan.parivahan.gov.in',
    canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services',
    purpose: 'official-service',
    jurisdictionScope: CURRENT_LEGACY_JURISDICTION_CODES,
    routingRationale: 'No current verified jurisdiction-specific grievance route can be selected; use only the official services directory.',
    fallback: OFFICIAL_FALLBACK_ROUTE,
    capabilities: manualCapabilities,
    ...routeEvidence('public-launch-route-review-2026-09-02#national-services-directory'),
  }),
} as const satisfies Record<OfficialDestinationKind, OfficialDestination>);

const issuingCodes = new Set<string>(ALL_ISSUING_JURISDICTION_CODES);
const nextgenCodes = new Set<string>(NEXTGEN_JURISDICTION_CODES);
const delhiCodes = new Set<string>(DELHI_JURISDICTION_CODES);
const legacyCodes = new Set<string>(CURRENT_LEGACY_JURISDICTION_CODES);
const DAY_MS = 86_400_000;
const MAX_ROUTE_AGE_DAYS = 30;

function parseCalendarDate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

function nowAsUtcCalendarDate(now: string | Date): number | null {
  const date = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (!Number.isFinite(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isVerifiedOfficialRouteCurrent(route: unknown, now: string | Date): route is VerifiedOfficialRoute {
  if (!route || typeof route !== 'object') return false;
  const record = route as Partial<VerifiedOfficialRoute> & { canonicalUrl?: unknown };
  if (record.releaseState !== 'current') return false;
  if (![record.serviceName, record.domain, record.purpose, record.verifier, record.evidenceRef].every(nonEmpty)) return false;

  const verifiedAt = parseCalendarDate(record.lastVerifiedAt);
  const expiresAt = parseCalendarDate(record.expiresAt);
  const currentDate = nowAsUtcCalendarDate(now);
  if (verifiedAt === null || expiresAt === null || currentDate === null) return false;
  if (verifiedAt > currentDate || currentDate > expiresAt) return false;
  if ((currentDate - verifiedAt) / DAY_MS > MAX_ROUTE_AGE_DAYS) return false;

  if (record.canonicalUrl !== undefined) {
    if (!nonEmpty(record.canonicalUrl)) return false;
    try {
      const url = new URL(record.canonicalUrl);
      if (url.protocol !== 'https:' || url.hostname !== record.domain || url.username || url.password) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function isCurrentOfficialFallback(route: unknown, now: string | Date): route is OfficialFallbackRoute {
  if (!route || typeof route !== 'object') return false;
  const fallback = route as Partial<OfficialFallbackRoute>;
  return fallback.routeType === 'fallback'
    && fallback.key === 'national-services-directory'
    && fallback.purpose === 'official-services-directory'
    && fallback.canonicalUrl === 'https://echallan.parivahan.gov.in/index/challan-services'
    && isVerifiedOfficialRouteCurrent(fallback, now);
}

const destinationContracts: Readonly<Record<OfficialDestinationKind, Readonly<{
  canonicalUrl: string;
  domain: string;
  purpose: OfficialDestination['purpose'];
  capabilities: OfficialDestination['capabilities'];
}>>> = Object.freeze({
  legacy: Object.freeze({
    canonicalUrl: 'https://echallan.parivahan.gov.in/gsticket',
    domain: 'echallan.parivahan.gov.in',
    purpose: 'official-grievance-service',
    capabilities: Object.freeze({ category: true, description: true, attachmentGuidance: true }),
  }),
  nextgen: Object.freeze({
    canonicalUrl: 'https://echallan.parivahan.nic.in/grievance',
    domain: 'echallan.parivahan.nic.in',
    purpose: 'official-grievance-service',
    capabilities: grievanceCapabilities,
  }),
  'delhi-manual': Object.freeze({
    canonicalUrl: 'https://traffic.delhipolice.gov.in/',
    domain: 'traffic.delhipolice.gov.in',
    purpose: 'official-service',
    capabilities: manualCapabilities,
  }),
  unresolved: Object.freeze({
    canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services',
    domain: 'echallan.parivahan.gov.in',
    purpose: 'official-service',
    capabilities: manualCapabilities,
  }),
});

function isOfficialDestinationKind(value: unknown): value is OfficialDestinationKind {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(destinationContracts, value);
}

/** Validates metadata and the fixed destination shape, but grants no routing authority. */
export function isVerifiedOfficialDestinationShape(route: unknown, now: string | Date): route is OfficialDestination {
  if (!route || typeof route !== 'object') return false;
  const destination = route as Partial<OfficialDestination>;
  if (destination.routeType !== 'handoff' || !isOfficialDestinationKind(destination.key)) return false;
  const contract = destinationContracts[destination.key];
  if (
    destination.canonicalUrl !== contract.canonicalUrl
    || destination.domain !== contract.domain
    || destination.purpose !== contract.purpose
    || !nonEmpty(destination.routingRationale)
  ) return false;
  if (!Array.isArray(destination.jurisdictionScope)) return false;
  if (!destination.jurisdictionScope.every((code) => typeof code === 'string' && issuingCodes.has(code))) return false;
  if (new Set(destination.jurisdictionScope).size !== destination.jurisdictionScope.length) return false;
  if (!destination.capabilities || typeof destination.capabilities !== 'object') return false;
  if (
    destination.capabilities.category !== contract.capabilities.category
    || destination.capabilities.description !== contract.capabilities.description
    || destination.capabilities.attachmentGuidance !== contract.capabilities.attachmentGuidance
  ) return false;
  return isVerifiedOfficialRouteCurrent(destination, now)
    && isCurrentOfficialFallback(destination.fallback, now);
}

export function isActionReadyOfficialDestination(
  candidate: OfficialDestination | OfficialAuxiliaryRoute | OfficialFallbackRoute,
  confirmation: JurisdictionConfirmation,
  now: string | Date,
): candidate is OfficialDestination & { key: 'legacy' | 'nextgen' } {
  const resolved = resolveOfficialDestination(confirmation, now);
  return (resolved.key === 'legacy' || resolved.key === 'nextgen')
    && candidate === resolved;
}

function unresolvedDestination(): OfficialDestination {
  return OFFICIAL_DESTINATIONS.unresolved;
}

/** Resolves only an allowlisted, citizen-confirmed issuing-jurisdiction code. */
export function resolveOfficialDestination(input: JurisdictionConfirmation, now: string | Date): OfficialDestination {
  if (!input || typeof input !== 'object' || input.status !== 'confirmed') return unresolvedDestination();
  if (typeof input.code !== 'string' || !issuingCodes.has(input.code)) return unresolvedDestination();

  let candidate: OfficialDestination;
  if (nextgenCodes.has(input.code)) candidate = OFFICIAL_DESTINATIONS.nextgen;
  else if (delhiCodes.has(input.code)) candidate = OFFICIAL_DESTINATIONS['delhi-manual'];
  else if (legacyCodes.has(input.code)) candidate = OFFICIAL_DESTINATIONS.legacy;
  else return unresolvedDestination();

  if (!isVerifiedOfficialDestinationShape(candidate, now)) return unresolvedDestination();
  return candidate;
}
