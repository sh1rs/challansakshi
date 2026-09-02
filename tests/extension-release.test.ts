import { describe, expect, it } from 'vitest';
import {
  CURRENT_EXTENSION_RELEASE_STATE,
  evaluatePublicExtensionRelease,
  type ExtensionReleaseConfiguration,
} from '../lib/extension-release';

const TEST_EXTENSION_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TEST_STORE_URL = `https://chromewebstore.google.com/detail/challansakshi-assisted-handoff/${TEST_EXTENSION_ID}`;

const publicState = (
  overrides: Partial<ExtensionReleaseConfiguration> = {},
): ExtensionReleaseConfiguration => ({
  releaseState: 'public-enabled',
  environmentEnabled: true,
  storeApproval: 'approved',
  adapterReleaseState: 'public-enabled',
  firstPartyLandingUrl: '/extension',
  extensionId: TEST_EXTENSION_ID,
  storeUrl: TEST_STORE_URL,
  ...overrides,
});

describe('checked-in public extension release gate', () => {
  it('is production-disabled and returns no Store identity, URL, acquisition, or helper action', () => {
    expect(CURRENT_EXTENSION_RELEASE_STATE).toEqual({
      releaseState: 'production-disabled',
      environmentEnabled: false,
      storeApproval: 'not-approved',
      adapterReleaseState: 'internal-disabled',
      firstPartyLandingUrl: null,
      extensionId: null,
      storeUrl: null,
    });
    expect(Object.isFrozen(CURRENT_EXTENSION_RELEASE_STATE)).toBe(true);
    expect(evaluatePublicExtensionRelease(CURRENT_EXTENSION_RELEASE_STATE)).toEqual({
      status: 'closed',
      publicHelperAvailable: false,
      acquisition: null,
    });
    expect(JSON.stringify(evaluatePublicExtensionRelease(CURRENT_EXTENSION_RELEASE_STATE)))
      .not.toMatch(/chromewebstore|extensionId|storeUrl|install|prepare/i);
  });

  it('opens only for a complete test-only state and returns the exact fixed parameter-free acquisition URLs', () => {
    expect(evaluatePublicExtensionRelease(publicState())).toEqual({
      status: 'public-enabled',
      publicHelperAvailable: true,
      acquisition: {
        firstPartyLandingUrl: '/extension',
        extensionId: TEST_EXTENSION_ID,
        storeUrl: TEST_STORE_URL,
      },
    });
  });

  it.each([
    [{ releaseState: 'production-disabled' }],
    [{ environmentEnabled: false }],
    [{ storeApproval: 'not-approved' }],
    [{ adapterReleaseState: 'internal-disabled' }],
    [{ firstPartyLandingUrl: null }],
    [{ extensionId: null }],
    [{ storeUrl: null }],
  ] as const)('fails closed when any public gate is incomplete: %j', (change) => {
    expect(evaluatePublicExtensionRelease(publicState(change))).toEqual({
      status: 'closed', publicHelperAvailable: false, acquisition: null,
    });
  });

  it.each([
    [{ firstPartyLandingUrl: '/extension?case=secret' }],
    [{ firstPartyLandingUrl: '/extension#install' }],
    [{ firstPartyLandingUrl: 'https://example.com/extension' }],
    [{ extensionId: 'A'.repeat(32) }],
    [{ extensionId: 'a'.repeat(31) }],
    [{ extensionId: 'q'.repeat(32) }],
    [{ storeUrl: `${TEST_STORE_URL}?case=secret` }],
    [{ storeUrl: `${TEST_STORE_URL}#install` }],
    [{ storeUrl: TEST_STORE_URL.replace('https://', 'http://') }],
    [{ storeUrl: TEST_STORE_URL.replace('chromewebstore.google.com', 'evil.example') }],
    [{ storeUrl: TEST_STORE_URL.replace(TEST_EXTENSION_ID, 'b'.repeat(32)) }],
  ])('fails closed for non-exact, parameterized, or mismatched acquisition identity: %j', (change) => {
    expect(evaluatePublicExtensionRelease(publicState(change as Partial<ExtensionReleaseConfiguration>)))
      .toEqual({ status: 'closed', publicHelperAvailable: false, acquisition: null });
  });

  it('rejects a different valid self-consistent Chrome ID and Store URL', () => {
    const differentId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    expect(evaluatePublicExtensionRelease(publicState({
      extensionId: differentId,
      storeUrl: `https://chromewebstore.google.com/detail/challansakshi-assisted-handoff/${differentId}`,
    }))).toEqual({ status: 'closed', publicHelperAvailable: false, acquisition: null });
  });

  it('rejects missing, unknown, inherited, accessor, and coercible release values without calling them', () => {
    const complete = publicState();
    const missing = { ...complete } as Record<string, unknown>;
    delete missing.storeApproval;
    let hostileCalls = 0;
    const accessor = Object.defineProperty({ ...complete }, 'storeUrl', {
      enumerable: true,
      get: () => { hostileCalls += 1; return TEST_STORE_URL; },
    });
    const coercible = {
      ...complete,
      extensionId: { toString: () => { hostileCalls += 1; return TEST_EXTENSION_ID; } },
    };
    const inherited = Object.assign(Object.create({ storeUrl: TEST_STORE_URL }), complete);

    for (const candidate of [missing, { ...complete, caseId: 'secret' }, accessor, coercible, inherited]) {
      expect(evaluatePublicExtensionRelease(candidate)).toEqual({
        status: 'closed', publicHelperAvailable: false, acquisition: null,
      });
    }
    expect(hostileCalls).toBe(0);
  });
});
