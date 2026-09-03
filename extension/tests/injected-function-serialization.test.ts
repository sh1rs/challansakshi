import vm from 'node:vm';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { build } from 'vite';
import { createExtensionViteConfig } from '../vite.config';
import { getExtensionBuildProfile, type ExtensionBuildProfileId } from '../src/manifest';
import { probeChallanSakshiSource } from '../src/source-probe';
import { probeProductionChallanSakshiSource } from '../src/source-probe-production';
import { probeSyntheticChallanSakshiSource } from '../src/source-probe-synthetic';

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
          return `import { createSourceProbePlan, probeChallanSakshiSource } from ${JSON.stringify(sourceProbePath)};
globalThis.__challanSakshiProbeFixture = {
  body: Function.prototype.toString.call(probeChallanSakshiSource),
  plan: createSourceProbePlan(4102444800000),
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
  const realm: Record<string, unknown> = {};
  vm.runInNewContext(chunks[0]?.code ?? '', realm);
  return {
    ...(realm.__challanSakshiProbeFixture as { body: string; plan: typeof plan }),
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
    expect(syntheticFixture.bundle).not.toContain('challansakshi.sh1rs.com');
    expect(syntheticFixture.bundle).not.toContain('?goal=verify');
    expect(productionFixture.bundle).not.toContain('127.0.0.1');
    expect(productionFixture.bundle).not.toContain('/demo/extension-fixture/source');
    expect(syntheticFixture.plan.expectedLocation).toEqual(syntheticProfile?.sourceRegistry);
    expect(syntheticFixture.plan.expectedEnvelopeMode).toBe(syntheticProfile?.envelopeMode);
    expect(productionFixture.plan.expectedLocation).toEqual(productionProfile?.sourceRegistry);
    expect(productionFixture.plan.expectedEnvelopeMode).toBe(productionProfile?.envelopeMode);
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
