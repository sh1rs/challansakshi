import {
  OFFICIAL_AUXILIARY_ROUTES,
  OFFICIAL_DESTINATIONS,
  OFFICIAL_ROUTE_REGISTRY_VERSION,
  isVerifiedOfficialRouteCurrent,
} from './official-destinations';

export type PublicOfficialRoute = {
  id: string;
  name: string;
  domain: string;
  url: string;
  purpose: string;
  kind: 'handoff' | 'auxiliary';
  jurisdictionCodes: readonly string[];
  scope: string;
  status: 'available' | 'needs-recheck' | 'reference-only';
  lastReviewedOn: string;
  reviewExpiresOn: string;
  provenance: { reviewer: string; evidenceRef: string };
};

/** Public service metadata only; accepts a clock, never a citizen record or query. */
export function getPublicOfficialRoutes(nowIso: string) {
  const routes: PublicOfficialRoute[] = [
    ...Object.values(OFFICIAL_AUXILIARY_ROUTES),
    ...Object.values(OFFICIAL_DESTINATIONS).filter(route => route.key !== 'unresolved'),
  ].map(route => {
    const current = isVerifiedOfficialRouteCurrent(route, nowIso);
    const scoped = route.routeType !== 'handoff' || route.jurisdictionScope.length > 0;
    return {
      id: `${route.routeType}:${route.key}`,
      name: route.serviceName,
      domain: route.domain,
      url: route.canonicalUrl,
      purpose: route.purpose,
      kind: route.routeType,
      jurisdictionCodes: route.routeType === 'handoff' ? route.jurisdictionScope : [],
      scope: route.routeType === 'handoff' ? route.routingRationale : 'Public service reference. Availability for an individual record must be checked on the official service.',
      status: !current ? 'needs-recheck' : scoped ? 'available' : 'reference-only',
      lastReviewedOn: route.lastVerifiedAt,
      reviewExpiresOn: route.expiresAt,
      provenance: { reviewer: route.verifier, evidenceRef: route.evidenceRef },
    };
  });
  return {
    schemaVersion: 'challansakshi.public-official-routes/v1',
    registryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
    evaluatedAt: Number.isFinite(Date.parse(nowIso)) ? new Date(nowIso).toISOString() : null,
    statusMeaning: 'Available means the retained route review is current. It is not a live uptime check, a government integration, or confirmation that a service accepts your case.',
    limitations: [
      'Reachability alone cannot verify the purpose, jurisdiction coverage or form behavior of an official service.',
      'Review expiry is a source-maintenance date, not a citizen filing deadline.',
      'The citizen completes identity checks, payments and final submission on the official service.',
    ],
    routes,
  };
}
