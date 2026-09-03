import {
  getExtensionEnvelopeValidationAuthority,
  validateExtensionHandoffEnvelope,
} from '../../lib/extension-handoff-contract';
import type { ExtensionEnvelopeValidationAuthority } from '../../lib/extension-handoff-envelope-core';
import { SYNTHETIC_EXTENSION_FIXTURE } from '../../lib/synthetic-extension-fixture-contract';

export const EXTENSION_BUILD_PROFILE_SCHEMA = 'challansakshi.extension-build-profile/v1' as const;
export const EXTENSION_BUILD_PROFILE_IDS = Object.freeze([
  'synthetic-development',
  'production-disabled',
] as const);

export type ExtensionBuildProfileId = (typeof EXTENSION_BUILD_PROFILE_IDS)[number];
export type ExtensionEnvelopeMode = 'synthetic' | 'real';

export type ExtensionLocationContract = Readonly<{
  protocol: 'http:' | 'https:';
  hostname: string;
  port: string;
  pathname: string;
}>;

export type ExtensionSourceRegistry = ExtensionLocationContract & Readonly<{
  allowedSearches: readonly string[];
}>;

export type EnabledSyntheticAdapterProfile = Readonly<{
  id: 'synthetic-fixture';
  routeKey: 'synthetic-fixture';
  releaseState: 'synthetic';
  enabled: true;
  supportedFields: readonly ['category', 'description'];
  destination: ExtensionLocationContract;
}>;

type DisabledOfficialAdapterBase = Readonly<{
  releaseState: 'internal-disabled';
  enabled: false;
  supportedFields: readonly [];
  reason: 'verification-evidence-missing';
  destination: ExtensionLocationContract;
}>;

export type DisabledOfficialAdapterProfile =
  | (DisabledOfficialAdapterBase & Readonly<{
    id: 'legacy-national-grievance';
    routeKey: 'legacy';
  }>)
  | (DisabledOfficialAdapterBase & Readonly<{
    id: 'nextgen-national-grievance';
    routeKey: 'nextgen';
  }>);

type ExtensionBuildProfileBase = Readonly<{
  schema: typeof EXTENSION_BUILD_PROFILE_SCHEMA;
  packageName: string;
  visibleEnvironmentLabel: string;
  manifestVersion: '0.1.0';
  minimumChromeVersion: '152';
  envelopeValidationAuthority: ExtensionEnvelopeValidationAuthority;
}>;

export type SyntheticDevelopmentBuildProfile = ExtensionBuildProfileBase & Readonly<{
  id: 'synthetic-development';
  envelopeMode: 'synthetic';
  validatorProfile: 'synthetic-development';
  sourceRegistry: ExtensionSourceRegistry & Readonly<{
    protocol: 'http:';
    hostname: '127.0.0.1';
    port: '3000';
    pathname: '/demo/extension-fixture/source';
    allowedSearches: readonly [''];
  }>;
  adapterRegistry: readonly [EnabledSyntheticAdapterProfile];
}>;

export type ProductionDisabledBuildProfile = ExtensionBuildProfileBase & Readonly<{
  id: 'production-disabled';
  envelopeMode: 'real';
  validatorProfile: 'production-disabled';
  sourceRegistry: ExtensionSourceRegistry & Readonly<{
    protocol: 'https:';
    hostname: 'challansakshi.sh1rs.com';
    port: '';
    pathname: '/review';
    allowedSearches: readonly [
      '',
      '?goal=verify',
      '?goal=understand',
      '?goal=evidence',
      '?goal=resolve',
    ];
  }>;
  adapterRegistry: readonly [DisabledOfficialAdapterProfile, DisabledOfficialAdapterProfile];
}>;

export type ExtensionBuildProfile =
  | SyntheticDevelopmentBuildProfile
  | ProductionDisabledBuildProfile;

export type ExtensionManifest = Readonly<{
  manifest_version: 3;
  name: string;
  version: '0.1.0';
  description: string;
  minimum_chrome_version: '152';
  icons: Readonly<Record<'16' | '32' | '48' | '128', string>>;
  action: Readonly<{
    default_popup: 'popup.html';
    default_title: 'ChallanSakshi Assisted Handoff';
    default_icon: Readonly<Record<'16' | '32', string>>;
  }>;
  background: Readonly<{
    service_worker: 'service-worker.js';
    type: 'module';
  }>;
  permissions: readonly ['activeTab', 'scripting', 'storage', 'alarms'];
  incognito: 'not_allowed';
  content_security_policy: Readonly<{
    extension_pages: string;
  }>;
}>;

const syntheticSourceUrl = new URL(SYNTHETIC_EXTENSION_FIXTURE.source.url);
const syntheticDestinationUrl = new URL(SYNTHETIC_EXTENSION_FIXTURE.destination.url);
const syntheticEnvelopeValidationAuthority = getExtensionEnvelopeValidationAuthority('synthetic-development');
const productionEnvelopeValidationAuthority = getExtensionEnvelopeValidationAuthority('production-disabled');
if (!syntheticEnvelopeValidationAuthority || !productionEnvelopeValidationAuthority) {
  throw new Error('Extension envelope validation authority is unavailable.');
}

const syntheticDevelopmentProfile: SyntheticDevelopmentBuildProfile = Object.freeze({
  schema: EXTENSION_BUILD_PROFILE_SCHEMA,
  id: 'synthetic-development',
  envelopeMode: 'synthetic',
  packageName: 'ChallanSakshi Assisted Handoff — Synthetic Development',
  visibleEnvironmentLabel: 'Synthetic development · fictional fixtures only',
  manifestVersion: '0.1.0',
  minimumChromeVersion: '152',
  envelopeValidationAuthority: syntheticEnvelopeValidationAuthority,
  validatorProfile: 'synthetic-development',
  sourceRegistry: Object.freeze({
    protocol: syntheticSourceUrl.protocol as 'http:',
    hostname: syntheticSourceUrl.hostname as '127.0.0.1',
    port: syntheticSourceUrl.port as '3000',
    pathname: SYNTHETIC_EXTENSION_FIXTURE.source.path,
    allowedSearches: Object.freeze([''] as const),
  }),
  adapterRegistry: Object.freeze([
    Object.freeze({
      id: 'synthetic-fixture',
      routeKey: 'synthetic-fixture',
      releaseState: 'synthetic',
      enabled: true,
      supportedFields: Object.freeze(['category', 'description'] as const),
      destination: Object.freeze({
        protocol: syntheticDestinationUrl.protocol as 'http:',
        hostname: syntheticDestinationUrl.hostname,
        port: syntheticDestinationUrl.port,
        pathname: SYNTHETIC_EXTENSION_FIXTURE.destination.path,
      }),
    }),
  ] as const),
});

const productionDisabledProfile: ProductionDisabledBuildProfile = Object.freeze({
  schema: EXTENSION_BUILD_PROFILE_SCHEMA,
  id: 'production-disabled',
  envelopeMode: 'real',
  packageName: 'ChallanSakshi Assisted Handoff',
  visibleEnvironmentLabel: 'Production disabled · internal review only',
  manifestVersion: '0.1.0',
  minimumChromeVersion: '152',
  envelopeValidationAuthority: productionEnvelopeValidationAuthority,
  validatorProfile: 'production-disabled',
  sourceRegistry: Object.freeze({
    protocol: 'https:',
    hostname: 'challansakshi.sh1rs.com',
    port: '',
    pathname: '/review',
    allowedSearches: Object.freeze([
      '',
      '?goal=verify',
      '?goal=understand',
      '?goal=evidence',
      '?goal=resolve',
    ] as const),
  }),
  adapterRegistry: Object.freeze([
    Object.freeze({
      id: 'legacy-national-grievance',
      routeKey: 'legacy',
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
      id: 'nextgen-national-grievance',
      routeKey: 'nextgen',
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
  ] as const),
});

const profiles = Object.freeze({
  'synthetic-development': syntheticDevelopmentProfile,
  'production-disabled': productionDisabledProfile,
});

export function getExtensionBuildProfile(value: unknown): ExtensionBuildProfile | null {
  if (value === 'synthetic-development') return profiles['synthetic-development'];
  if (value === 'production-disabled') return profiles['production-disabled'];
  return null;
}

function isCanonicalBuildProfile(value: unknown): value is ExtensionBuildProfile {
  return value === syntheticDevelopmentProfile || value === productionDisabledProfile;
}

export function buildManifest(profile: unknown): ExtensionManifest {
  if (!isCanonicalBuildProfile(profile)) throw new Error('Invalid extension build profile.');
  return Object.freeze({
    manifest_version: 3,
    name: profile.packageName,
    version: profile.manifestVersion,
    description: 'Places reviewed ChallanSakshi description text and, when supported, category into blank fields after explicit approval.',
    minimum_chrome_version: profile.minimumChromeVersion,
    icons: Object.freeze({
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    }),
    action: Object.freeze({
      default_popup: 'popup.html',
      default_title: 'ChallanSakshi Assisted Handoff',
      default_icon: Object.freeze({
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
      }),
    }),
    background: Object.freeze({
      service_worker: 'service-worker.js',
      type: 'module',
    }),
    permissions: Object.freeze(['activeTab', 'scripting', 'storage', 'alarms'] as const),
    incognito: 'not_allowed',
    content_security_policy: Object.freeze({
      extension_pages: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'",
    }),
  });
}

export function validateEnvelopeForBuildProfile(
  profileId: unknown,
  envelope: unknown,
  nowMs: number,
  importedAtMs: number,
) {
  const profile = getExtensionBuildProfile(profileId);
  if (!profile) return Object.freeze({ status: 'rejected', reason: 'invalid-build-profile' } as const);
  return validateExtensionHandoffEnvelope(envelope, {
    profile: profile.validatorProfile,
    nowMs,
    importedAtMs,
  });
}
