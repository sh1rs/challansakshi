export type ExtensionReleaseConfiguration = Readonly<{
  releaseState: 'production-disabled' | 'public-enabled';
  environmentEnabled: boolean;
  storeApproval: 'not-approved' | 'approved';
  adapterReleaseState: 'internal-disabled' | 'public-enabled';
  firstPartyLandingUrl: string | null;
  extensionId: string | null;
  storeUrl: string | null;
}>;

export type PublicExtensionRelease =
  | Readonly<{
    status: 'closed';
    publicHelperAvailable: false;
    acquisition: null;
  }>
  | Readonly<{
    status: 'public-enabled';
    publicHelperAvailable: true;
    acquisition: Readonly<{
      firstPartyLandingUrl: '/extension';
      extensionId: string;
      storeUrl: string;
    }>;
  }>;

const RELEASE_KEYS = Object.freeze([
  'releaseState',
  'environmentEnabled',
  'storeApproval',
  'adapterReleaseState',
  'firstPartyLandingUrl',
  'extensionId',
  'storeUrl',
] as const);
const FIRST_PARTY_LANDING_URL = '/extension' as const;
const STORE_URL_PREFIX = 'https://chromewebstore.google.com/detail/challansakshi-assisted-handoff/' as const;
const APPROVED_PUBLIC_EXTENSION_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const APPROVED_PUBLIC_STORE_URL = `${STORE_URL_PREFIX}${APPROVED_PUBLIC_EXTENSION_ID}` as const;
const CHROME_EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

const CLOSED_RELEASE: PublicExtensionRelease = Object.freeze({
  status: 'closed',
  publicHelperAvailable: false,
  acquisition: null,
});

export const CURRENT_EXTENSION_RELEASE_STATE: ExtensionReleaseConfiguration = Object.freeze({
  releaseState: 'production-disabled',
  environmentEnabled: false,
  storeApproval: 'not-approved',
  adapterReleaseState: 'internal-disabled',
  firstPartyLandingUrl: null,
  extensionId: null,
  storeUrl: null,
});

function readExactConfiguration(value: unknown): Readonly<Record<string, unknown>> | null {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== RELEASE_KEYS.length
      || keys.some((key) => typeof key !== 'string'
        || !RELEASE_KEYS.includes(key as typeof RELEASE_KEYS[number]))
    ) return null;
    const result: Record<string, unknown> = {};
    for (const key of RELEASE_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return Object.freeze(result);
  } catch {
    return null;
  }
}

/**
 * Evaluates only a closed deploy-time configuration. Invalid, incomplete, or
 * noncanonical acquisition data always produces the same data-free closed state.
 */
export function evaluatePublicExtensionRelease(value: unknown): PublicExtensionRelease {
  const candidate = readExactConfiguration(value);
  if (!candidate) return CLOSED_RELEASE;
  if (
    candidate.releaseState !== 'public-enabled'
    || candidate.environmentEnabled !== true
    || candidate.storeApproval !== 'approved'
    || candidate.adapterReleaseState !== 'public-enabled'
    || candidate.firstPartyLandingUrl !== FIRST_PARTY_LANDING_URL
    || typeof candidate.extensionId !== 'string'
    || !CHROME_EXTENSION_ID_PATTERN.test(candidate.extensionId)
    || candidate.extensionId !== APPROVED_PUBLIC_EXTENSION_ID
    || typeof candidate.storeUrl !== 'string'
    || candidate.storeUrl !== APPROVED_PUBLIC_STORE_URL
  ) return CLOSED_RELEASE;

  try {
    const landing = new URL(candidate.firstPartyLandingUrl, 'https://challansakshi.sh1rs.com');
    const store = new URL(candidate.storeUrl);
    if (
      landing.origin !== 'https://challansakshi.sh1rs.com'
      || landing.pathname !== FIRST_PARTY_LANDING_URL
      || landing.search !== ''
      || landing.hash !== ''
      || store.protocol !== 'https:'
      || store.hostname !== 'chromewebstore.google.com'
      || store.port !== ''
      || store.username !== ''
      || store.password !== ''
      || store.pathname !== `/detail/challansakshi-assisted-handoff/${candidate.extensionId}`
      || store.search !== ''
      || store.hash !== ''
    ) return CLOSED_RELEASE;
  } catch {
    return CLOSED_RELEASE;
  }

  return Object.freeze({
    status: 'public-enabled',
    publicHelperAvailable: true,
    acquisition: Object.freeze({
      firstPartyLandingUrl: FIRST_PARTY_LANDING_URL,
      extensionId: APPROVED_PUBLIC_EXTENSION_ID,
      storeUrl: APPROVED_PUBLIC_STORE_URL,
    }),
  });
}
