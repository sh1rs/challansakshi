import type { ExtensionHandoffEnvelope } from '../../lib/extension-handoff-contract';
import {
  buildProductionDisabledDestinationFillPlan,
  buildProductionDisabledDestinationPreviewPlan,
  getProductionDisabledDestinationAdapters,
  productionDisabledDestinationInjectedFunction,
} from './destination-adapters-production';
import {
  buildSyntheticDestinationFillPlan,
  buildSyntheticDestinationPreviewPlan,
  getSyntheticDestinationAdapters,
  syntheticDestinationInjectedFunction,
} from './destination-adapters-synthetic';
import type {
  DestinationFillPlanV1,
  DestinationFormV1,
  DestinationLocationV1,
  DestinationPreviewPlanV1,
  DestinationStructuralFingerprintV1,
} from './fill-page';

declare const __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__: 'synthetic-development' | 'production-disabled';

export const DESTINATION_ADAPTER_SCHEMA = 'challansakshi.destination-adapter/v1' as const;

type RouteLocation = Readonly<{
  protocol: 'http:' | 'https:';
  hostname: string;
  port: string;
  pathname: string;
}>;

export type EnabledDestinationAdapterV1 = Readonly<{
  schema: typeof DESTINATION_ADAPTER_SCHEMA;
  id: 'synthetic-fixture';
  routeKey: 'synthetic-fixture';
  adapterContractVersion: 'challansakshi.adapter-contract/v1';
  routeRegistryVersion: 'challansakshi.official-routes/v1';
  adapterRevision: 'challansakshi.synthetic-destination/v1';
  releaseState: 'synthetic';
  enabled: true;
  supportedFields: readonly ['category', 'description'];
  source: RouteLocation;
  destination: RouteLocation;
  expectedLocation: DestinationLocationV1;
  expectedForm: DestinationFormV1;
  fields: readonly ['category', 'description'];
  structuralFingerprint: DestinationStructuralFingerprintV1;
  dispatchedEvents: readonly [];
  evidenceReference: 'tests/synthetic-extension-fixture-contract.test.ts';
  verifier: 'automated-synthetic-fixture-contract';
  legalStatus: 'synthetic-fixture-only';
  lastVerifiedAt: '2026-09-03T00:00:00.000Z';
  expiresAt: '2026-10-03T00:00:00.000Z';
}>;

export type DisabledDestinationAdapterV1 = Readonly<{
  schema: typeof DESTINATION_ADAPTER_SCHEMA;
  id: 'legacy-national-grievance' | 'nextgen-national-grievance';
  routeKey: 'legacy' | 'nextgen';
  adapterContractVersion: 'challansakshi.adapter-contract/v1';
  releaseState: 'internal-disabled';
  enabled: false;
  supportedFields: readonly [];
  reason: 'verification-evidence-missing';
  destination: RouteLocation;
}>;

export type DestinationAdapterV1 = EnabledDestinationAdapterV1 | DisabledDestinationAdapterV1;

export type DestinationPreviewPlanBuildInput = Readonly<{
  envelope: ExtensionHandoffEnvelope;
  effectiveExpiresAtMs: number;
  operationNotAfterMs: number;
}>;

export type DestinationFillPlanBuildInput = DestinationPreviewPlanBuildInput & Readonly<{
  attemptId: string;
}>;

export type DestinationPlanBuildResult<Plan> =
  | Readonly<{ status: 'built'; adapter: EnabledDestinationAdapterV1; plan: Plan }>
  | Readonly<{ status: 'adapter-disabled'; adapter: DisabledDestinationAdapterV1 }>
  | Readonly<{ status: 'unsupported' }>
  | Readonly<{ status: 'rejected' }>;

export const selectedDestinationAdapterRegistry: readonly DestinationAdapterV1[] =
  __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development'
    ? getSyntheticDestinationAdapters()
    : getProductionDisabledDestinationAdapters();

export const buildDestinationPreviewPlan: (
  value: unknown,
) => DestinationPlanBuildResult<DestinationPreviewPlanV1> =
  __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development'
    ? buildSyntheticDestinationPreviewPlan
    : buildProductionDisabledDestinationPreviewPlan;

export const buildDestinationFillPlan: (
  value: unknown,
) => DestinationPlanBuildResult<DestinationFillPlanV1> =
  __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development'
    ? buildSyntheticDestinationFillPlan
    : buildProductionDisabledDestinationFillPlan;

export const selectedDestinationInjectedFunction =
  __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__ === 'synthetic-development'
    ? syntheticDestinationInjectedFunction
    : productionDisabledDestinationInjectedFunction;

export {
  getProductionDisabledDestinationAdapters,
  getSyntheticDestinationAdapters,
};
