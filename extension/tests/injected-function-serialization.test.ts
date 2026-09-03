import vm from 'node:vm';
import { resolve } from 'node:path';
import { TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { build } from 'vite';
import { createExtensionViteConfig } from '../vite.config';
import { getExtensionBuildProfile, type ExtensionBuildProfileId } from '../src/manifest';
import { probeChallanSakshiSource } from '../src/source-probe';
import { probeProductionChallanSakshiSource } from '../src/source-probe-production';
import { probeSyntheticChallanSakshiSource } from '../src/source-probe-synthetic';
import {
  buildDestinationFillPlan,
  buildDestinationPreviewPlan,
  selectedDestinationAdapterRegistry,
} from '../src/destination-adapters';
import { preflightOrFillDestination } from '../src/fill-page';

const envelope = {
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'synthetic',
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
  routeKey: 'synthetic-fixture',
  issueCode: 'four-wheeler-on-two-wheeler',
} as const;

const plan = {
  schema: 'challansakshi.source-probe-plan/v1',
  sourceContractVersion: 'challansakshi.source-contract/v1',
  expectedEnvelopeSchema: 'challansakshi.extension-handoff/v1',
  expectedEnvelopeMode: 'synthetic',
  rootAttribute: 'data-challansakshi-extension-handoff',
  rootValue: 'v1',
  envelopeAttribute: 'data-challansakshi-extension-envelope',
  envelopeValue: 'v1',
  expectedLocation: {
    protocol: 'http:',
    hostname: '127.0.0.1',
    port: '3000',
    pathname: '/demo/extension-fixture/source',
    allowedSearches: [''],
  },
  operationNotAfterMs: Date.now() + 60_000,
} as const;

const productionEnvelope = {
  ...envelope,
  mode: 'real',
  routeKey: 'nextgen',
  issueCode: null,
} as const;

const productionPlan = {
  ...plan,
  expectedEnvelopeMode: 'real',
  expectedLocation: {
    protocol: 'https:',
    hostname: 'challansakshi.sh1rs.com',
    port: '',
    pathname: '/review',
    allowedSearches: ['', '?goal=verify', '?goal=understand', '?goal=evidence', '?goal=resolve'],
  },
} as const;

type NoWriteBuildOutput = Readonly<{
  output: readonly Readonly<{ type: string; code?: string }>[];
}>;

function executeSerialized(
  implementation: (value: unknown) => unknown,
  url: string,
  capsule: object,
  sourcePlan: object,
): unknown {
  const dom = new JSDOM(
    '<!doctype html><body><div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1"></span></div></body>',
    { url, runScripts: 'outside-only' },
  );
  dom.window.document.querySelector('span')?.append(
    dom.window.document.createTextNode(JSON.stringify(capsule)),
  );
  const context = vm.createContext({ window: dom.window, document: dom.window.document });
  const serializedCall = `(${Function.prototype.toString.call(implementation)})(${JSON.stringify(sourcePlan)})`;
  return JSON.parse(JSON.stringify(vm.runInContext(serializedCall, context))) as unknown;
}

async function buildSelectedProbeFixture(profileId: ExtensionBuildProfileId) {
  const virtualEntry = '\0challansakshi:source-probe-isolation-test';
  const sourceProbePath = resolve(import.meta.dirname, '../src/source-probe.ts');
  const baseConfig = createExtensionViteConfig(profileId, 'worker');
  const result = await build({
    ...baseConfig,
    logLevel: 'silent',
    plugins: [
      {
        name: 'challansakshi-source-probe-isolation-test',
        resolveId(id) {
          return id === 'virtual:source-probe-isolation-test' ? virtualEntry : null;
        },
        load(id) {
          if (id !== virtualEntry) return null;
          return `import {
  createSourceProbePlan,
  probeChallanSakshiSource,
  validateSourcePreviewInjectionResult,
  validateSourceReprobeInjectionResult,
} from ${JSON.stringify(sourceProbePath)};
globalThis.__challanSakshiProbeFixture = {
  body: Function.prototype.toString.call(probeChallanSakshiSource),
  plan: createSourceProbePlan(4102444800000),
  validatePreview(envelope, context) {
    return validateSourcePreviewInjectionResult(
      [{ frameId: 0, documentId: 'document-A', result: {
        status: 'accepted', envelope: JSON.parse(JSON.stringify(envelope)),
      } }],
      JSON.parse(JSON.stringify(context)),
    );
  },
  validateSourceReprobeInjectionResult,
};`;
        },
      },
      ...(baseConfig.plugins ?? []),
    ],
    build: {
      ...baseConfig.build,
      write: false,
      rollupOptions: {
        input: 'virtual:source-probe-isolation-test',
        output: { format: 'iife' },
      },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result) as NoWriteBuildOutput;
  const chunks = output.output.filter((item) => item.type === 'chunk');
  expect(chunks).toHaveLength(1);
  const realm: Record<string, unknown> = { TextEncoder };
  vm.runInNewContext(chunks[0]?.code ?? '', realm);
  return {
    ...(realm.__challanSakshiProbeFixture as {
      body: string;
      plan: typeof plan;
      validatePreview: (envelope: unknown, context: unknown) => unknown;
    }),
    bundle: chunks[0]?.code ?? '',
  };
}

async function buildSelectedDestinationFixture(profileId: ExtensionBuildProfileId) {
  const virtualEntry = '\0challansakshi:destination-isolation-test';
  const destinationPath = resolve(import.meta.dirname, '../src/destination-adapters.ts');
  const baseConfig = createExtensionViteConfig(profileId, 'worker');
  const result = await build({
    ...baseConfig,
    logLevel: 'silent',
    plugins: [
      {
        name: 'challansakshi-destination-isolation-test',
        resolveId(id) {
          return id === 'virtual:destination-isolation-test' ? virtualEntry : null;
        },
        load(id) {
          if (id !== virtualEntry) return null;
          return `import {
  buildDestinationPreviewPlan,
  selectedDestinationAdapterRegistry,
  selectedDestinationInjectedFunction,
} from ${JSON.stringify(destinationPath)};
globalThis.__challanSakshiDestinationFixture = {
  registry: selectedDestinationAdapterRegistry,
  hasInjectedFunction: typeof selectedDestinationInjectedFunction === 'function',
  buildPreview: buildDestinationPreviewPlan,
};`;
        },
      },
      ...(baseConfig.plugins ?? []),
    ],
    build: {
      ...baseConfig.build,
      write: false,
      rollupOptions: {
        input: 'virtual:destination-isolation-test',
        output: { format: 'iife' },
      },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result) as NoWriteBuildOutput;
  const chunks = output.output.filter((item) => item.type === 'chunk');
  expect(chunks).toHaveLength(1);
  const realm: Record<string, unknown> = { URL };
  vm.runInNewContext(chunks[0]?.code ?? '', realm);
  return {
    ...(realm.__challanSakshiDestinationFixture as {
      registry: readonly Record<string, unknown>[];
      hasInjectedFunction: boolean;
      buildPreview: (value: unknown) => unknown;
    }),
    bundle: chunks[0]?.code ?? '',
  };
}

describe('serialized injected source probe', () => {
  it('contains only the compile-time-selected synthetic source family', () => {
    const source = Function.prototype.toString.call(probeChallanSakshiSource);
    expect(source).toContain('127.0.0.1');
    expect(source).toContain('/demo/extension-fixture/source');
    expect(source).not.toContain('challansakshi.sh1rs.com');
    expect(source).not.toContain('?goal=verify');
    expect(source).not.toMatch(/['"]real['"]/);
    expect(probeChallanSakshiSource).toBe(probeSyntheticChallanSakshiSource);
  });

  it('keeps both direct serializable implementations mutually isolated', () => {
    const syntheticSource = Function.prototype.toString.call(probeSyntheticChallanSakshiSource);
    const productionSource = Function.prototype.toString.call(probeProductionChallanSakshiSource);

    expect(syntheticSource).toContain('127.0.0.1');
    expect(syntheticSource).toContain('/demo/extension-fixture/source');
    expect(syntheticSource).toContain('"synthetic"');
    expect(syntheticSource).not.toContain('challansakshi.sh1rs.com');
    expect(syntheticSource).not.toContain('?goal=verify');
    expect(syntheticSource).not.toMatch(/["']real["']/);
    expect(syntheticSource).not.toContain('nextgen');
    expect(syntheticSource).not.toContain('legacy');

    expect(productionSource).toContain('challansakshi.sh1rs.com');
    expect(productionSource).toContain('?goal=verify');
    expect(productionSource).toContain('"real"');
    expect(productionSource).not.toContain('127.0.0.1');
    expect(productionSource).not.toContain('3000');
    expect(productionSource).not.toContain('/demo/extension-fixture/source');
    expect(productionSource).not.toMatch(/["']synthetic["']/);
    expect(productionSource).not.toContain('synthetic-fixture');
  });

  it('executes each direct body in a fresh realm and rejects the opposite plan family', () => {
    expect(executeSerialized(
      probeSyntheticChallanSakshiSource,
      'http://127.0.0.1:3000/demo/extension-fixture/source',
      envelope,
      plan,
    )).toEqual({ status: 'accepted', envelope });
    expect(executeSerialized(
      probeProductionChallanSakshiSource,
      'https://challansakshi.sh1rs.com/review?goal=verify',
      productionEnvelope,
      productionPlan,
    )).toEqual({ status: 'accepted', envelope: productionEnvelope });
    expect(executeSerialized(
      probeSyntheticChallanSakshiSource,
      'https://challansakshi.sh1rs.com/review',
      productionEnvelope,
      productionPlan,
    )).toEqual({ status: 'rejected', code: 'invalid-plan' });
    expect(executeSerialized(
      probeProductionChallanSakshiSource,
      'http://127.0.0.1:3000/demo/extension-fixture/source',
      envelope,
      plan,
    )).toEqual({ status: 'rejected', code: 'invalid-plan' });
  });

  it('tree-shakes the opposite implementation and injects only the canonical selected registry', async () => {
    const syntheticFixture = await buildSelectedProbeFixture('synthetic-development');
    const productionFixture = await buildSelectedProbeFixture('production-disabled');
    const syntheticProfile = getExtensionBuildProfile('synthetic-development');
    const productionProfile = getExtensionBuildProfile('production-disabled');
    expect(syntheticProfile).not.toBeNull();
    expect(productionProfile).not.toBeNull();

    expect(syntheticFixture.body).toContain('127.0.0.1');
    expect(syntheticFixture.body).not.toContain('challansakshi.sh1rs.com');
    expect(productionFixture.body).toContain('challansakshi.sh1rs.com');
    expect(productionFixture.body).not.toContain('127.0.0.1');
    for (const forbidden of [
      'challansakshi.sh1rs.com',
      '?goal=verify',
      'echallan.parivahan.gov.in',
      'echallan.parivahan.nic.in',
      'traffic.delhipolice.gov.in',
      'vcourts.gov.in',
      '/gsticket',
      '/grievance',
      '/index/challan-services',
      '/index/accused-challan',
      '/challan/challan-services',
      '/virtualcourt/index.php',
      'legacy-national-grievance',
      'nextgen-national-grievance',
      'national-record-lookup',
      'nextgen-service-landing',
      'national-services-directory',
      'virtual-courts',
      'delhi-manual',
      'production-disabled',
      'production-candidate',
    ]) {
      expect(syntheticFixture.bundle, `synthetic bundle leaked ${forbidden}`).not.toContain(forbidden);
    }
    expect(syntheticFixture.bundle).not.toMatch(/["'`]real["'`]/);
    expect(syntheticFixture.bundle).not.toMatch(/["'`]legacy["'`]/);
    expect(syntheticFixture.bundle).not.toMatch(/["'`]nextgen["'`]/);
    for (const forbidden of [
      '127.0.0.1',
      ':3000',
      '/demo/extension-fixture/source',
      '/demo/extension-fixture/destination',
      'synthetic-development',
    ]) {
      expect(productionFixture.bundle, `production bundle leaked ${forbidden}`).not.toContain(forbidden);
    }
    expect(productionFixture.bundle).not.toMatch(/["'`]synthetic["'`]/);
    expect(productionFixture.bundle).not.toMatch(/["'`]synthetic-fixture["'`]/);
    expect(syntheticFixture.plan.expectedLocation).toEqual(syntheticProfile?.sourceRegistry);
    expect(syntheticFixture.plan.expectedEnvelopeMode).toBe(syntheticProfile?.envelopeMode);
    expect(productionFixture.plan.expectedLocation).toEqual(productionProfile?.sourceRegistry);
    expect(productionFixture.plan.expectedEnvelopeMode).toBe(productionProfile?.envelopeMode);
    expect(syntheticFixture.validatePreview(envelope, {
      profile: 'synthetic-development', sourceTabId: 17,
      nowMs: 1788422460000, importedAtMs: 1788422460000,
    })).toMatchObject({ status: 'accepted' });
    expect(syntheticFixture.validatePreview(productionEnvelope, {
      profile: 'synthetic-development', sourceTabId: 17,
      nowMs: 1788422460000, importedAtMs: 1788422460000,
    })).toEqual({ status: 'rejected', reason: 'invalid-envelope' });
    expect(productionFixture.validatePreview(productionEnvelope, {
      profile: 'production-disabled', sourceTabId: 17,
      nowMs: 1788422460000, importedAtMs: 1788422460000,
    })).toMatchObject({ status: 'accepted' });
    expect(productionFixture.validatePreview(envelope, {
      profile: 'production-disabled', sourceTabId: 17,
      nowMs: 1788422460000, importedAtMs: 1788422460000,
    })).toEqual({ status: 'rejected', reason: 'invalid-envelope' });
  });

  it('reconstructs from Function.prototype.toString in a fresh realm with only DOM platform globals and JSON data', () => {
    const dom = new JSDOM(
      '<!doctype html><body><div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1"></span></div></body>',
      {
        url: 'http://127.0.0.1:3000/demo/extension-fixture/source',
        runScripts: 'outside-only',
      },
    );
    dom.window.document.querySelector('span')?.append(
      dom.window.document.createTextNode(JSON.stringify(envelope)),
    );
    const context = vm.createContext({
      window: dom.window,
      document: dom.window.document,
    });
    const serializedCall = `(${Function.prototype.toString.call(probeChallanSakshiSource)})(${JSON.stringify(plan)})`;
    const result = vm.runInContext(serializedCall, context) as unknown;
    expect(JSON.parse(JSON.stringify(result))).toEqual({ status: 'accepted', envelope });
  });

  it('contains no imported helper closure Chrome authority or whole-page read', () => {
    for (const implementation of [
      probeSyntheticChallanSakshiSource,
      probeProductionChallanSakshiSource,
    ]) {
      const source = Function.prototype.toString.call(implementation);
      expect(source).not.toMatch(/validateExtensionHandoffEnvelope|parseCanonicalExtensionHandoffEnvelopeJson|digestCanonicalExtensionHandoffEnvelope/);
      expect(source).not.toMatch(/\bchrome\b|\bbrowser\b|executeScript|sendMessage|storage\./);
      expect(source).not.toMatch(/innerHTML|outerHTML|documentElement|body\.textContent|document\.textContent/);
      expect(source).not.toMatch(/getElementById|getElementsBy|querySelector\(/);
      expect(source.match(/document\.querySelectorAll/g)).toHaveLength(2);
    }
  });
});

describe('serialized destination preflight and fill', () => {
  it('tree-shakes the opposite destination family and preserves selected plan authority', async () => {
    const syntheticFixture = await buildSelectedDestinationFixture('synthetic-development');
    const productionFixture = await buildSelectedDestinationFixture('production-disabled');

    expect(syntheticFixture.registry).toHaveLength(1);
    expect(syntheticFixture.registry[0]?.adapterRevision).toBe('challansakshi.synthetic-destination/v1');
    expect(syntheticFixture.hasInjectedFunction).toBe(true);
    for (const forbidden of [
      'echallan.parivahan.gov.in', 'echallan.parivahan.nic.in', '/gsticket', '/grievance',
      'legacy-national-grievance', 'nextgen-national-grievance',
    ]) expect(syntheticFixture.bundle, `synthetic destination bundle leaked ${forbidden}`).not.toContain(forbidden);

    expect(productionFixture.registry).toHaveLength(2);
    expect(productionFixture.registry.map((adapter) => adapter.id)).toEqual([
      'legacy-national-grievance', 'nextgen-national-grievance',
    ]);
    expect(productionFixture.hasInjectedFunction).toBe(false);
    for (const forbidden of [
      '127.0.0.1', ':3000', '/demo/extension-fixture/source',
      '/demo/extension-fixture/destination', 'synthetic-fixture',
      'challansakshi-synthetic-destination-form', 'challansakshi-synthetic-category',
      'challansakshi-synthetic-description', '4 Wheeler Challan On 2 Wheeler',
      'challansakshi.destination-injection-plan/v1',
    ]) expect(productionFixture.bundle, `production destination bundle leaked ${forbidden}`).not.toContain(forbidden);
    expect(productionFixture.buildPreview({
      envelope: { routeKey: 'legacy' },
      effectiveExpiresAtMs: 1,
      operationNotAfterMs: 1,
    })).toMatchObject({ status: 'adapter-disabled' });
  });

  it('is self-contained, generic, and free of registry and Chrome authority', () => {
    const source = Function.prototype.toString.call(preflightOrFillDestination);
    expect(source).toContain('challansakshi.destination-injection-plan/v1');
    expect(source).not.toMatch(/SYNTHETIC_EXTENSION_FIXTURE|selectedDestinationAdapterRegistry|getExtensionBuildProfile/);
    expect(source).not.toMatch(/\bchrome\b|\bbrowser\b|executeScript|sendMessage|storage\./);
    expect(source).not.toMatch(/fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|cookie/);
    expect(source).not.toMatch(/dispatchEvent|\.click\(|\.submit\(|requestSubmit|innerHTML|outerHTML|MutationObserver/);
  });

  it('reconstructs preview and fill from Function.prototype.toString with only DOM globals and JSON data', async () => {
    const preview = buildDestinationPreviewPlan({
      envelope,
      effectiveExpiresAtMs: Date.now() + 60_000,
      operationNotAfterMs: Date.now() + 30_000,
    });
    const fill = buildDestinationFillPlan({
      envelope,
      effectiveExpiresAtMs: Date.now() + 60_000,
      operationNotAfterMs: Date.now() + 30_000,
      attemptId: '00112233445566778899aabbccddeeff',
    });
    expect(preview.status).toBe('built');
    expect(fill.status).toBe('built');
    if (preview.status !== 'built' || fill.status !== 'built') return;

    const fixture = selectedDestinationAdapterRegistry[0];
    expect(fixture?.enabled).toBe(true);
    const markup = '<!doctype html><body><form id="challansakshi-synthetic-destination-form" name="challansakshiSyntheticDestination" method="post" action="/demo/extension-fixture/destination" data-challansakshi-fixture-form="v1"><section data-challansakshi-fixture-container="category"><label for="challansakshi-synthetic-category">Fictional review category</label><select id="challansakshi-synthetic-category" name="syntheticCategory"><option value="">Choose a fictional category</option><option value="4 Wheeler Challan On 2 Wheeler">4 Wheeler Challan On 2 Wheeler</option></select></section><section data-challansakshi-fixture-container="description"><label for="challansakshi-synthetic-description">Fictional reviewed description</label><textarea id="challansakshi-synthetic-description" name="syntheticDescription" minlength="1" maxlength="500" required></textarea></section></form></body>';
    const dom = new JSDOM(markup, {
      url: 'http://127.0.0.1:3000/demo/extension-fixture/destination',
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    });
    Object.defineProperty(dom.window.Element.prototype, 'getClientRects', {
      configurable: true,
      value: () => [{ width: 100, height: 20 }],
    });
    const implementation = dom.window.eval(`(${Function.prototype.toString.call(preflightOrFillDestination)})`) as (value: unknown) => Promise<unknown>;
    await expect(implementation(dom.window.JSON.parse(JSON.stringify(preview.plan)) as unknown)).resolves.toMatchObject({
      operation: 'preview', status: 'ready',
    });
    await expect(implementation(dom.window.JSON.parse(JSON.stringify(fill.plan)) as unknown)).resolves.toMatchObject({
      operation: 'fill', status: 'complete',
    });
  });
});
