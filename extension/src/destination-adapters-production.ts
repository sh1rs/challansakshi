import type {
  DestinationPlanBuildResult,
  DisabledDestinationAdapterV1,
} from './destination-adapters';
import type { DestinationFillPlanV1, DestinationPreviewPlanV1 } from './fill-page';

function createProductionDisabledRegistry(): readonly [
  DisabledDestinationAdapterV1,
  DisabledDestinationAdapterV1,
] {
  return Object.freeze([
    Object.freeze({
      schema: 'challansakshi.destination-adapter/v1',
      id: 'legacy-national-grievance',
      routeKey: 'legacy',
      adapterContractVersion: 'challansakshi.adapter-contract/v1',
      releaseState: 'internal-disabled',
      enabled: false,
      supportedFields: Object.freeze([] as const),
      reason: 'verification-evidence-missing',
      destination: Object.freeze({
        protocol: 'https:',
        hostname: 'echallan.parivahan.gov.in',
        port: '',
        pathname: '/gsticket',
      }),
    }),
    Object.freeze({
      schema: 'challansakshi.destination-adapter/v1',
      id: 'nextgen-national-grievance',
      routeKey: 'nextgen',
      adapterContractVersion: 'challansakshi.adapter-contract/v1',
      releaseState: 'internal-disabled',
      enabled: false,
      supportedFields: Object.freeze([] as const),
      reason: 'verification-evidence-missing',
      destination: Object.freeze({
        protocol: 'https:',
        hostname: 'echallan.parivahan.nic.in',
        port: '',
        pathname: '/grievance',
      }),
    }),
  ] as const);
}

function disabledPlanResult(value: unknown) {
  try {
    if (typeof value !== 'object' || value === null) return Object.freeze({ status: 'rejected' } as const);
    const envelope = Object.getOwnPropertyDescriptor(value, 'envelope');
    if (!envelope || !('value' in envelope) || typeof envelope.value !== 'object' || envelope.value === null) {
      return Object.freeze({ status: 'rejected' } as const);
    }
    const route = Object.getOwnPropertyDescriptor(envelope.value, 'routeKey');
    if (!route || !('value' in route)) return Object.freeze({ status: 'rejected' } as const);
    const adapter = createProductionDisabledRegistry().find((item) => item.routeKey === route.value);
    return adapter
      ? Object.freeze({ status: 'adapter-disabled' as const, adapter })
      : Object.freeze({ status: 'unsupported' as const });
  } catch {
    return Object.freeze({ status: 'rejected' } as const);
  }
}

export function getProductionDisabledDestinationAdapters(): readonly [
  DisabledDestinationAdapterV1,
  DisabledDestinationAdapterV1,
] {
  return createProductionDisabledRegistry();
}

export function buildProductionDisabledDestinationPreviewPlan(
  value: unknown,
): DestinationPlanBuildResult<DestinationPreviewPlanV1> {
  return disabledPlanResult(value);
}

export function buildProductionDisabledDestinationFillPlan(
  value: unknown,
): DestinationPlanBuildResult<DestinationFillPlanV1> {
  return disabledPlanResult(value);
}

export const productionDisabledDestinationInjectedFunction = null;
