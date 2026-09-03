import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { ExtensionHandoffEnvelope } from '../../lib/extension-handoff-contract';
import {
  SOURCE_CONTRACT_VERSION,
  SOURCE_PREVIEW_BINDING_SCHEMA,
  SOURCE_PROBE_PLAN_SCHEMA,
  isSourcePreviewBindingV1,
  probeChallanSakshiSource,
  validateSourcePreviewInjectionResult,
  validateSourceReprobeInjectionResult,
  type SourceProbePlanV1,
} from '../src/source-probe';

const issuedAtMs = Date.UTC(2026, 8, 3, 8, 0, 0);
const nowMs = issuedAtMs + 60_000;
const expiresAtMs = issuedAtMs + 600_000;

const commonEnvelope = {
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
} as const;

const syntheticEnvelope = Object.freeze({
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'synthetic',
  ...commonEnvelope,
  routeKey: 'synthetic-fixture',
  issueCode: 'four-wheeler-on-two-wheeler',
}) as ExtensionHandoffEnvelope;

const realEnvelope = Object.freeze({
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'real',
  ...commonEnvelope,
  routeKey: 'nextgen',
  issueCode: null,
}) as ExtensionHandoffEnvelope;

const syntheticPlan = Object.freeze({
  schema: 'challansakshi.source-probe-plan/v1',
  sourceContractVersion: 'challansakshi.source-contract/v1',
  expectedEnvelopeSchema: 'challansakshi.extension-handoff/v1',
  expectedEnvelopeMode: 'synthetic',
  rootAttribute: 'data-challansakshi-extension-handoff',
  rootValue: 'v1',
  envelopeAttribute: 'data-challansakshi-extension-envelope',
  envelopeValue: 'v1',
  expectedLocation: Object.freeze({
    protocol: 'http:',
    hostname: '127.0.0.1',
    port: '3000',
    pathname: '/demo/extension-fixture/source',
    allowedSearches: Object.freeze([''] as const),
  }),
  operationNotAfterMs: Date.now() + 60_000,
}) satisfies SourceProbePlanV1;

const productionPlan = Object.freeze({
  ...syntheticPlan,
  expectedEnvelopeMode: 'real',
  expectedLocation: Object.freeze({
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
}) satisfies SourceProbePlanV1;

type ProbePageResult = ReturnType<typeof probeChallanSakshiSource>;

function createDom(url: string, capsuleText: string, bodyPrefix = ''): JSDOM {
  return new JSDOM(`<!doctype html><body>${bodyPrefix}<div data-challansakshi-extension-handoff="v1" aria-hidden="true"><span data-challansakshi-extension-envelope="v1">${capsuleText.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</span></div></body>`, {
    url,
    runScripts: 'outside-only',
  });
}

function runInDom(dom: JSDOM, plan: unknown): ProbePageResult {
  const executable = dom.window.eval(`(${probeChallanSakshiSource.toString()})`) as (value: unknown) => ProbePageResult;
  const serializedPlan = dom.window.JSON.parse(JSON.stringify(plan)) as unknown;
  return executable(serializedPlan);
}

function canonical(envelope: ExtensionHandoffEnvelope): string {
  return JSON.stringify(envelope);
}

function acceptedPageResult(envelope: ExtensionHandoffEnvelope): ProbePageResult {
  const dom = createDom(
    envelope.mode === 'synthetic'
      ? 'http://127.0.0.1:3000/demo/extension-fixture/source'
      : 'https://challansakshi.sh1rs.com/review?goal=verify',
    canonical(envelope),
  );
  return runInDom(dom, envelope.mode === 'synthetic' ? syntheticPlan : productionPlan);
}

function injectionResult(envelope: ExtensionHandoffEnvelope, documentId = 'document-A') {
  return [{
    frameId: 0,
    documentId,
    result: JSON.parse(JSON.stringify(acceptedPageResult(envelope))) as ProbePageResult,
  }];
}

describe('self-contained source capsule probe', () => {
  it('accepts the exact synthetic source and every exact production search', () => {
    const synthetic = createDom(
      'http://127.0.0.1:3000/demo/extension-fixture/source',
      canonical(syntheticEnvelope),
    );
    expect(runInDom(synthetic, syntheticPlan)).toEqual({
      status: 'accepted',
      envelope: syntheticEnvelope,
    });

    for (const search of productionPlan.expectedLocation.allowedSearches) {
      const production = createDom(
        `https://challansakshi.sh1rs.com/review${search}`,
        canonical(realEnvelope),
      );
      expect(runInDom(production, productionPlan)).toEqual({
        status: 'accepted',
        envelope: realEnvelope,
      });
    }
  });

  it('rejects every synthetic and production location deviation', () => {
    const syntheticUrls = [
      'http://127.0.0.1/demo/extension-fixture/source',
      'http://127.0.0.1:3001/demo/extension-fixture/source',
      'http://localhost:3000/demo/extension-fixture/source',
      'http://[::1]:3000/demo/extension-fixture/source',
      'http://127.0.0.1:3000/demo/extension-fixture/destination',
      'http://127.0.0.1:3000/demo/extension-fixture/source?goal=verify',
      'http://127.0.0.1:3000/demo/extension-fixture/source#fragment',
    ];
    for (const url of syntheticUrls) {
      expect(runInDom(createDom(url, canonical(syntheticEnvelope)), syntheticPlan)).toEqual({
        status: 'rejected', code: 'location-mismatch',
      });
    }

    const productionUrls = [
      'http://challansakshi.sh1rs.com/review',
      'https://user@challansakshi.sh1rs.com/review',
      'https://challansakshi.sh1rs.com:444/review',
      'https://other.challansakshi.sh1rs.com/review',
      'https://challansakshi.sh1rs.com.evil.example/review',
      'https://xn--challansakshi-9za.sh1rs.com/review',
      'https://challansakshi.sh1rs.com/Review',
      'https://challansakshi.sh1rs.com/review/',
      'https://challansakshi.sh1rs.com/review?goal=verify&extra=1',
      'https://challansakshi.sh1rs.com/review?goal=VERIFY',
      'https://challansakshi.sh1rs.com/review#fragment',
    ];
    for (const url of productionUrls) {
      expect(runInDom(createDom(url, canonical(realEnvelope)), productionPlan)).toEqual({
        status: 'rejected', code: 'location-mismatch',
      });
    }
  });

  it('rejects plans that replace either compile-time source registry literal', () => {
    const alternativePlans = [
      {
        plan: {
          ...syntheticPlan,
          expectedLocation: { ...syntheticPlan.expectedLocation, hostname: 'localhost' },
        },
        url: 'http://localhost:3000/demo/extension-fixture/source',
        envelope: syntheticEnvelope,
      },
      {
        plan: {
          ...syntheticPlan,
          expectedLocation: { ...syntheticPlan.expectedLocation, port: '3001' },
        },
        url: 'http://127.0.0.1:3001/demo/extension-fixture/source',
        envelope: syntheticEnvelope,
      },
      {
        plan: {
          ...syntheticPlan,
          expectedLocation: { ...syntheticPlan.expectedLocation, pathname: '/demo/extension-fixture/source-copy' },
        },
        url: 'http://127.0.0.1:3000/demo/extension-fixture/source-copy',
        envelope: syntheticEnvelope,
      },
      {
        plan: {
          ...productionPlan,
          expectedLocation: { ...productionPlan.expectedLocation, hostname: 'preview.challansakshi.sh1rs.com' },
        },
        url: 'https://preview.challansakshi.sh1rs.com/review',
        envelope: realEnvelope,
      },
      {
        plan: {
          ...productionPlan,
          expectedLocation: { ...productionPlan.expectedLocation, pathname: '/review-copy' },
        },
        url: 'https://challansakshi.sh1rs.com/review-copy',
        envelope: realEnvelope,
      },
    ];
    for (const candidate of alternativePlans) {
      expect(runInDom(
        createDom(candidate.url, canonical(candidate.envelope)),
        candidate.plan,
      )).toEqual({ status: 'rejected', code: 'invalid-plan' });
    }
  });

  it('rejects an iframe even when its live location and capsule otherwise match', () => {
    const outer = new JSDOM('<!doctype html><iframe></iframe>', {
      url: 'http://127.0.0.1:3000/demo/extension-fixture/source',
      runScripts: 'outside-only',
    });
    const frame = outer.window.document.querySelector('iframe');
    expect(frame?.contentWindow).not.toBeNull();
    const frameWindow = frame?.contentWindow;
    if (!frameWindow) return;
    const frameRealm = frameWindow as unknown as typeof outer.window;
    frameWindow.document.body.innerHTML = '<div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1"></span></div>';
    frameWindow.document.querySelector('span')?.append(frameWindow.document.createTextNode(canonical(syntheticEnvelope)));
    const executable = frameRealm.eval(`(${probeChallanSakshiSource.toString()})`) as (value: unknown) => ProbePageResult;
    const realmPlan = frameRealm.JSON.parse(JSON.stringify(syntheticPlan));
    expect(executable(realmPlan)).toEqual({ status: 'rejected', code: 'not-top-frame' });
  });

  it('rejects stale operations and malformed, accessor-backed, or profile-incoherent plans', () => {
    const dom = createDom(
      'http://127.0.0.1:3000/demo/extension-fixture/source',
      canonical(syntheticEnvelope),
    );
    const executable = dom.window.eval(`(${probeChallanSakshiSource.toString()})`) as (value: unknown) => ProbePageResult;
    const valid = () => dom.window.JSON.parse(JSON.stringify(syntheticPlan)) as Record<string, unknown>;
    const stale = valid();
    stale.operationNotAfterMs = 0;
    expect(executable(stale)).toEqual({ status: 'rejected', code: 'deadline-reached' });

    let getterCalls = 0;
    const accessor = valid();
    dom.window.Object.defineProperty(accessor, 'expectedLocation', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error('must not execute');
      },
    });
    const invalidPlans: unknown[] = [
      null,
      [],
      { ...valid(), extra: true },
      { ...valid(), schema: 'challansakshi.destination-plan/v1' },
      { ...valid(), sourceContractVersion: 'challansakshi.source-contract/v2' },
      { ...valid(), rootAttribute: 'data-other-root' },
      { ...valid(), operationNotAfterMs: Number.NaN },
      { ...valid(), expectedEnvelopeMode: 'real' },
      {
        ...valid(),
        expectedLocation: { ...syntheticPlan.expectedLocation, allowedSearches: ['', '?goal=verify'] },
      },
      accessor,
      new Proxy(valid(), {
        ownKeys: () => {
          throw new Error('must fail closed');
        },
      }),
    ];
    for (const candidate of invalidPlans) {
      expect(() => executable(candidate)).not.toThrow();
      expect(executable(candidate)).toEqual({ status: 'rejected', code: 'invalid-plan' });
    }
    expect(getterCalls).toBe(0);
  });

  it('requires exactly one marked root one direct marked child and one ordinary text node', () => {
    const exactUrl = 'http://127.0.0.1:3000/demo/extension-fixture/source';
    const validText = canonical(syntheticEnvelope);
    const bodies = [
      '',
      '<div data-challansakshi-extension-handoff="v1"></div>',
      `<div data-challansakshi-extension-handoff="v1"><section><span data-challansakshi-extension-envelope="v1">${validText}</span></section></div>`,
      `<div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1">${validText}</span><b></b></div>`,
      `<div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1">${validText}<!--extra--></span></div>`,
      `<div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1">${validText}</span></div><div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1">${validText}</span></div>`,
      `<div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v2">${validText}</span></div>`,
    ];
    for (const body of bodies) {
      const dom = new JSDOM(`<!doctype html><body>${body}</body>`, { url: exactUrl, runScripts: 'outside-only' });
      expect(runInDom(dom, syntheticPlan)).toEqual({ status: 'rejected', code: 'capsule-topology-mismatch' });
    }
  });

  it('rejects unknown duplicate reordered whitespace escaped and oversized capsule bytes', () => {
    const url = 'http://127.0.0.1:3000/demo/extension-fixture/source';
    const exact = canonical(syntheticEnvelope);
    const reordered = JSON.stringify(Object.fromEntries([
      ...Object.entries(syntheticEnvelope).slice(1),
      Object.entries(syntheticEnvelope)[0],
    ]));
    const duplicate = exact.replace(
      '"schema":"challansakshi.extension-handoff/v1"',
      '"schema":"challansakshi.extension-handoff/v1","schema":"challansakshi.extension-handoff/v1"',
    );
    const escaped = exact.replace('Please', '\\u0050lease');
    const extra = JSON.stringify({ ...syntheticEnvelope, fabricated: true });
    for (const text of [` ${exact}`, `${exact}\n`, reordered, duplicate, escaped, extra, '{bad json}']) {
      expect(runInDom(createDom(url, text), syntheticPlan).status).toBe('rejected');
    }
    expect(runInDom(createDom(url, 'x'.repeat(8_193)), syntheticPlan)).toEqual({
      status: 'rejected', code: 'capsule-too-large',
    });
    expect(runInDom(createDom(url, '😀'.repeat(2_049)), syntheticPlan)).toEqual({
      status: 'rejected', code: 'capsule-too-large',
    });
  });

  it('uses only marker queries and does not read whole-page text or HTML', () => {
    const dom = createDom(
      'http://127.0.0.1:3000/demo/extension-fixture/source',
      canonical(syntheticEnvelope),
      '<form name="location"><input name="document"><input name="rootAttribute"></form>',
    );
    const document = dom.window.document;
    let forbiddenReads = 0;
    for (const property of ['innerHTML', 'outerHTML', 'textContent'] as const) {
      dom.window.Object.defineProperty(document.documentElement, property, {
        configurable: true,
        get: () => {
          forbiddenReads += 1;
          throw new Error('whole-page reads are forbidden');
        },
      });
    }
    expect(runInDom(dom, syntheticPlan).status).toBe('accepted');
    expect(forbiddenReads).toBe(0);
  });
});

describe('trusted Chrome InjectionResult validation', () => {
  const context = Object.freeze({
    profile: 'synthetic-development' as const,
    sourceTabId: 17,
    nowMs,
    importedAtMs: nowMs,
  });

  it('separates Chrome metadata from the page result and creates a closed digest binding', () => {
    const validated = validateSourcePreviewInjectionResult(injectionResult(syntheticEnvelope), context);
    expect(validated.status).toBe('accepted');
    if (validated.status !== 'accepted') return;
    expect(validated.envelope).toEqual(syntheticEnvelope);
    expect(validated.canonicalJson).toBe(canonical(syntheticEnvelope));
    expect(validated.binding).toEqual({
      schema: SOURCE_PREVIEW_BINDING_SCHEMA,
      sourceTabId: 17,
      sourceDocumentId: 'document-A',
      canonicalEnvelopeDigest: '2f73b9c5dcd75361c043ad8288f0e8ab4d2e49513d3d77bb5aff229fb8db96ba',
      previewNotAfterMs: expiresAtMs,
    });
    expect(Object.isFrozen(validated.binding)).toBe(true);
    expect(isSourcePreviewBindingV1(validated.binding, nowMs)).toBe(true);
  });

  it('rejects missing extra wrong-frame malformed and accessor-backed result metadata', () => {
    const accepted = injectionResult(syntheticEnvelope)[0];
    let getterCalls = 0;
    const accessor = Object.defineProperty({
      frameId: 0,
      documentId: 'document-A',
      result: accepted.result,
    }, 'documentId', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error('must not execute');
      },
    });
    const sparse = new Array(1);
    const invalid: unknown[] = [
      null,
      [],
      sparse,
      [accepted, accepted],
      [{ ...accepted, frameId: 1 }],
      [{ ...accepted, frameId: '0' }],
      [{ ...accepted, documentId: '' }],
      [{ ...accepted, documentId: 'contains space' }],
      [{ ...accepted, documentId: 'x'.repeat(257) }],
      [{ ...accepted, documentId: 'document-A', extra: true }],
      [{ frameId: 0, documentId: 'document-A' }],
      [accessor],
      [{ ...accepted, result: { status: 'accepted', envelope: syntheticEnvelope, extra: true } }],
      [{ ...accepted, result: { status: 'rejected', code: 'invented-code' } }],
      new Proxy(injectionResult(syntheticEnvelope), {
        getPrototypeOf: () => {
          throw new Error('must fail closed');
        },
      }),
    ];
    for (const candidate of invalid) {
      expect(() => validateSourcePreviewInjectionResult(candidate, context)).not.toThrow();
      expect(validateSourcePreviewInjectionResult(candidate, context).status).toBe('rejected');
    }
    expect(getterCalls).toBe(0);
  });

  it('revalidates the returned envelope under the trusted profile and fixed time context', () => {
    expect(validateSourcePreviewInjectionResult(injectionResult(realEnvelope), context)).toEqual({
      status: 'rejected', reason: 'invalid-envelope',
    });
    expect(validateSourcePreviewInjectionResult(injectionResult(syntheticEnvelope), {
      ...context,
      nowMs: expiresAtMs,
    })).toEqual({ status: 'rejected', reason: 'invalid-envelope' });
  });

  it('rejects a replacement document or changed capsule and accepts only the unchanged binding', () => {
    const preview = validateSourcePreviewInjectionResult(injectionResult(syntheticEnvelope), context);
    expect(preview.status).toBe('accepted');
    if (preview.status !== 'accepted') return;

    expect(validateSourceReprobeInjectionResult(
      injectionResult(syntheticEnvelope, 'document-B'), context, preview.binding,
    )).toEqual({ status: 'rejected', reason: 'source-document-mismatch' });

    const changed = {
      ...syntheticEnvelope,
      packRevisionId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    } as ExtensionHandoffEnvelope;
    expect(validateSourceReprobeInjectionResult(
      injectionResult(changed), context, preview.binding,
    )).toEqual({ status: 'rejected', reason: 'source-binding-mismatch' });

    const unchanged = validateSourceReprobeInjectionResult(
      injectionResult(syntheticEnvelope), context, preview.binding,
    );
    expect(unchanged.status).toBe('accepted');
  });

  it('validates binding descriptors and expiry without invoking coercion or accessors', () => {
    const preview = validateSourcePreviewInjectionResult(injectionResult(syntheticEnvelope), context);
    expect(preview.status).toBe('accepted');
    if (preview.status !== 'accepted') return;
    let getterCalls = 0;
    const accessor = { ...preview.binding } as Record<string, unknown>;
    Object.defineProperty(accessor, 'sourceDocumentId', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return 'document-A';
      },
    });
    expect(isSourcePreviewBindingV1(accessor, nowMs)).toBe(false);
    expect(isSourcePreviewBindingV1(new Proxy(preview.binding, {
      ownKeys: () => {
        throw new Error('must fail closed');
      },
    }), nowMs)).toBe(false);
    let directReads = 0;
    const descriptorOnlyBinding = new Proxy(preview.binding, {
      get: () => {
        directReads += 1;
        throw new Error('validated values must be reconstructed');
      },
    });
    expect(() => validateSourceReprobeInjectionResult(
      injectionResult(syntheticEnvelope), context, descriptorOnlyBinding,
    )).not.toThrow();
    expect(validateSourceReprobeInjectionResult(
      injectionResult(syntheticEnvelope), context, descriptorOnlyBinding,
    ).status).toBe('accepted');
    expect(directReads).toBe(0);
    expect(isSourcePreviewBindingV1({ ...preview.binding, extra: true }, nowMs)).toBe(false);
    expect(isSourcePreviewBindingV1({ ...preview.binding, previewNotAfterMs: nowMs }, nowMs)).toBe(false);
    expect(getterCalls).toBe(0);
  });
});

describe('source probe public constants', () => {
  it('uses the frozen source schemas expected by the worker contract', () => {
    expect(SOURCE_PROBE_PLAN_SCHEMA).toBe('challansakshi.source-probe-plan/v1');
    expect(SOURCE_CONTRACT_VERSION).toBe('challansakshi.source-contract/v1');
    expect(SOURCE_PREVIEW_BINDING_SCHEMA).toBe('challansakshi.source-preview-binding/v1');
  });
});
