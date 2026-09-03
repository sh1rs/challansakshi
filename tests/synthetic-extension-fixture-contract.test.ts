import { readFileSync } from 'node:fs';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

type FixtureContractModule = {
  SYNTHETIC_EXTENSION_FIXTURE: {
    source: {
      url: string;
      path: string;
      rootAttribute: string;
      envelopeAttribute: string;
      markerValue: string;
    };
    destination: {
      url: string;
      path: string;
      form: Record<string, string>;
      category: {
        containerAttribute: string;
        containerValue: string;
        id: string;
        name: string;
        label: string;
        options: readonly { value: string; label: string }[];
      };
      description: Record<string, string | number | boolean>;
      protectedControls: readonly Record<string, unknown>[];
      untouchedSentence: string;
      counterTokens: readonly string[];
      counters: readonly { token: string; id: string }[];
      reset: Record<string, string>;
      ready: Record<string, string>;
      customEvents: readonly string[];
      baselineDispatchedEventSequence: readonly string[];
    };
  };
  createSyntheticExtensionFixtureCapsule: () => {
    envelope: {
      schema: string;
      mode: string;
      packId: string;
      resultRevisionId: string;
      packRevisionId: string;
      issuedAt: string;
      expiresAt: string;
      routeKey: string;
      issueCode: string | null;
      description: string;
      language: string;
      simpleMode: boolean;
    };
    canonicalJson: string;
  };
  createSyntheticFixtureInstrumentationState: () => {
    counters: Record<string, number>;
    dispatchedEventSequence: readonly string[];
    ready: boolean;
    inert: boolean;
  };
  resetSyntheticFixtureInstrumentationState: () => {
    counters: Record<string, number>;
    dispatchedEventSequence: readonly string[];
    ready: boolean;
    inert: boolean;
  };
};

type SourcePageModule = {
  SyntheticExtensionSourceCapsule: ComponentType<{ canonicalJson: string }>;
};

type DestinationPageModule = {
  default: ComponentType;
};

const destinationSource = readFileSync(
  new URL('../app/demo/extension-fixture/destination/page.tsx', import.meta.url),
  'utf8',
);

async function loadFixtureContract(): Promise<FixtureContractModule | null> {
  const modulePath = '../lib/' + 'synthetic-extension-fixture-contract.ts';
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<FixtureContractModule | null>;
}

async function loadSourcePage(): Promise<SourcePageModule | null> {
  const modulePath = '../app/demo/extension-fixture/source/' + 'page.tsx';
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<SourcePageModule | null>;
}

async function loadDestinationPage(): Promise<DestinationPageModule | null> {
  const modulePath = '../app/demo/extension-fixture/destination/' + 'page.tsx';
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<DestinationPageModule | null>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('synthetic extension fixture contract', () => {
  it('freezes the exact source, destination, field, protection, and instrumentation literals', async () => {
    const fixtureModule = await loadFixtureContract();
    expect(fixtureModule).not.toBeNull();
    if (!fixtureModule) return;

    expect(fixtureModule.SYNTHETIC_EXTENSION_FIXTURE).toEqual({
      source: {
        url: 'http://127.0.0.1:3000/demo/extension-fixture/source',
        path: '/demo/extension-fixture/source',
        rootAttribute: 'data-challansakshi-extension-handoff',
        envelopeAttribute: 'data-challansakshi-extension-envelope',
        markerValue: 'v1',
      },
      destination: {
        url: 'http://127.0.0.1:3000/demo/extension-fixture/destination',
        path: '/demo/extension-fixture/destination',
        form: {
          id: 'challansakshi-synthetic-destination-form',
          selector: 'challansakshi-synthetic-destination-form',
          name: 'challansakshiSyntheticDestination',
          method: 'post',
          action: '/demo/extension-fixture/destination',
          markerAttribute: 'data-challansakshi-fixture-form',
          markerValue: 'v1',
        },
        category: {
          containerAttribute: 'data-challansakshi-fixture-container',
          containerValue: 'category',
          id: 'challansakshi-synthetic-category',
          name: 'syntheticCategory',
          label: 'Fictional review category',
          options: [
            { value: '', label: 'Choose a fictional category' },
            { value: '4 Wheeler Challan On 2 Wheeler', label: '4 Wheeler Challan On 2 Wheeler' },
          ],
        },
        description: {
          containerAttribute: 'data-challansakshi-fixture-container',
          containerValue: 'description',
          id: 'challansakshi-synthetic-description',
          name: 'syntheticDescription',
          label: 'Fictional reviewed description',
          minLength: 1,
          maxLength: 500,
          required: true,
          initialValue: '',
        },
        protectedControls: [
          { id: 'challansakshi-protected-challan-number', element: 'input', type: 'text', name: 'protectedChallanNumber', label: 'Protected fictional challan number', initialValue: 'FICTIONAL-CHALLAN-0001', autoComplete: 'off' },
          { id: 'challansakshi-protected-captcha', element: 'input', type: 'text', name: 'protectedCaptcha', label: 'Protected fictional CAPTCHA', initialValue: 'FICTIONAL-CAPTCHA', autoComplete: 'off' },
          { id: 'challansakshi-protected-otp', element: 'input', type: 'text', name: 'protectedOtp', label: 'Protected fictional OTP', initialValue: 'FICTIONAL-OTP', autoComplete: 'one-time-code' },
          { id: 'challansakshi-protected-aadhaar', element: 'input', type: 'text', name: 'protectedAadhaar', label: 'Protected fictional Aadhaar', initialValue: 'FICTIONAL-AADHAAR', autoComplete: 'off' },
          { id: 'challansakshi-protected-payment', element: 'input', type: 'text', name: 'protectedPayment', label: 'Protected fictional payment', initialValue: 'FICTIONAL-PAYMENT', autoComplete: 'off' },
          { id: 'challansakshi-protected-attachment', element: 'input', type: 'file', name: 'protectedAttachment', label: 'Protected fictional attachment', initialValue: '' },
          { id: 'challansakshi-protected-declaration', element: 'input', type: 'checkbox', name: 'protectedDeclaration', label: 'Protected fictional declaration', initialChecked: false },
          { id: 'challansakshi-protected-submit', element: 'button', type: 'submit', name: '', label: 'Protected fictional Submit' },
        ],
        untouchedSentence: 'Untouched: challan number, CAPTCHA, OTP, Aadhaar, payment, attachment, declaration, Submit',
        counterTokens: ['input', 'change', 'blur', 'keyboard', 'custom', 'link-click', 'button-click', 'submit', 'form-effect', 'autosave', 'fetch', 'xhr', 'beacon', 'history', 'navigation', 'upload', 'download'],
        counters: [
          { token: 'input', id: 'challansakshi-fixture-counter-input' },
          { token: 'change', id: 'challansakshi-fixture-counter-change' },
          { token: 'blur', id: 'challansakshi-fixture-counter-blur' },
          { token: 'keyboard', id: 'challansakshi-fixture-counter-keyboard' },
          { token: 'custom', id: 'challansakshi-fixture-counter-custom' },
          { token: 'link-click', id: 'challansakshi-fixture-counter-link-click' },
          { token: 'button-click', id: 'challansakshi-fixture-counter-button-click' },
          { token: 'submit', id: 'challansakshi-fixture-counter-submit' },
          { token: 'form-effect', id: 'challansakshi-fixture-counter-form-effect' },
          { token: 'autosave', id: 'challansakshi-fixture-counter-autosave' },
          { token: 'fetch', id: 'challansakshi-fixture-counter-fetch' },
          { token: 'xhr', id: 'challansakshi-fixture-counter-xhr' },
          { token: 'beacon', id: 'challansakshi-fixture-counter-beacon' },
          { token: 'history', id: 'challansakshi-fixture-counter-history' },
          { token: 'navigation', id: 'challansakshi-fixture-counter-navigation' },
          { token: 'upload', id: 'challansakshi-fixture-counter-upload' },
          { token: 'download', id: 'challansakshi-fixture-counter-download' },
        ],
        reset: { id: 'challansakshi-fixture-reset', label: 'Reset fictional fixture baseline' },
        ready: { attribute: 'data-challansakshi-fixture-ready', value: 'true' },
        customEvents: ['challansakshi-fixture-custom', 'challansakshi-fixture-autosave'],
        baselineDispatchedEventSequence: [],
      },
    });
    expect(Object.isFrozen(fixtureModule.SYNTHETIC_EXTENSION_FIXTURE)).toBe(true);
  });

  it('constructs a request-time canonical capsule with three fresh distinct IDs and one captured clock', async () => {
    const fixtureModule = await loadFixtureContract();
    expect(fixtureModule).not.toBeNull();
    if (!fixtureModule) return;
    const now = Date.parse('2026-09-03T10:30:00.000Z');
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

    const first = fixtureModule.createSyntheticExtensionFixtureCapsule();
    const second = fixtureModule.createSyntheticExtensionFixtureCapsule();

    expect(nowSpy).toHaveBeenCalledTimes(2);
    for (const capsule of [first, second]) {
      expect(capsule.envelope).toMatchObject({
        schema: 'challansakshi.extension-handoff/v1',
        mode: 'synthetic',
        issuedAt: '2026-09-03T10:30:00.000Z',
        expiresAt: '2026-09-03T10:40:00.000Z',
        routeKey: 'synthetic-fixture',
        issueCode: 'four-wheeler-on-two-wheeler',
        description: 'The fictional enforcement image shows a four-wheeler while the fictional vehicle record shows a two-wheeler. Please review this vehicle-class mismatch.',
        language: 'en',
        simpleMode: false,
      });
      const ids = [capsule.envelope.resultRevisionId, capsule.envelope.packRevisionId, capsule.envelope.packId];
      expect(ids.every((id) => /^[0-9a-f]{32}$/.test(id))).toBe(true);
      expect(new Set(ids)).toHaveLength(3);
      expect(JSON.parse(capsule.canonicalJson)).toEqual(capsule.envelope);
      expect(Date.parse(capsule.envelope.expiresAt) - Date.parse(capsule.envelope.issuedAt)).toBe(600_000);
    }
    expect(first.envelope.packId).not.toBe(second.envelope.packId);
  });

  it('fails closed when secure random IDs keep colliding', async () => {
    const fixtureModule = await loadFixtureContract();
    expect(fixtureModule).not.toBeNull();
    if (!fixtureModule) return;
    let call = 0;
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array) {
        bytes.fill(call === 1 ? 1 : 0);
        call += 1;
        return bytes;
      },
    });

    expect(() => fixtureModule.createSyntheticExtensionFixtureCapsule()).toThrow(/distinct secure synthetic fixture IDs/i);
    expect(call).toBeGreaterThan(2);
  });

  it('starts unready and reaches an all-zero ready baseline only through reset', async () => {
    const fixtureModule = await loadFixtureContract();
    expect(fixtureModule).not.toBeNull();
    if (!fixtureModule) return;

    const initial = fixtureModule.createSyntheticFixtureInstrumentationState();
    const reset = fixtureModule.resetSyntheticFixtureInstrumentationState();
    expect(initial.ready).toBe(false);
    expect(initial.inert).toBe(true);
    expect(reset.ready).toBe(true);
    expect(reset.inert).toBe(false);
    expect(reset.dispatchedEventSequence).toEqual([]);
    expect(Object.values(reset.counters)).toEqual(Array(17).fill(0));
  });

  it('renders one inert source marker child with one canonical JSON text node', async () => {
    const page = await loadSourcePage();
    expect(page).not.toBeNull();
    if (!page) return;
    const canonicalJson = '{"schema":"challansakshi.extension-handoff/v1","mode":"synthetic"}';
    const html = renderToStaticMarkup(createElement(page.SyntheticExtensionSourceCapsule, { canonicalJson }));

    expect(html).toMatch(/^<div\b[^>]*data-challansakshi-extension-handoff="v1"[^>]*><span\b[^>]*data-challansakshi-extension-envelope="v1"[^>]*>\{&quot;schema&quot;:&quot;challansakshi\.extension-handoff\/v1&quot;,&quot;mode&quot;:&quot;synthetic&quot;\}<\/span><\/div>$/);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(html.match(/translate="no"/g)).toHaveLength(2);
    expect(html.match(/\binert=""/g)).toHaveLength(2);
  });

  it('renders only blank allowed targets plus visible enabled protected controls and zero counters', async () => {
    const page = await loadDestinationPage();
    expect(page).not.toBeNull();
    if (!page) return;
    const html = renderToStaticMarkup(createElement(page.default));

    expect(html).toContain('data-product-mode="demo"');
    expect(html).toMatch(/^<div\b[^>]*\binert=""/);
    expect(html).toContain('id="challansakshi-synthetic-destination-form"');
    expect(html).toContain('name="challansakshiSyntheticDestination"');
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/demo/extension-fixture/destination"');
    expect(html).toContain('data-challansakshi-fixture-form="v1"');
    expect(html).toContain('id="challansakshi-synthetic-category"');
    expect(html).toContain('<option value="" selected="">Choose a fictional category</option>');
    expect(html).toContain('<option value="4 Wheeler Challan On 2 Wheeler">4 Wheeler Challan On 2 Wheeler</option>');
    expect(html).toContain('id="challansakshi-synthetic-description"');
    expect(html).toContain('minLength="1"');
    expect(html).toContain('maxLength="500"');
    expect(html).toContain('required=""');
    expect(html).toContain('Untouched: challan number, CAPTCHA, OTP, Aadhaar, payment, attachment, declaration, Submit');
    for (const id of [
      'challansakshi-protected-challan-number',
      'challansakshi-protected-captcha',
      'challansakshi-protected-otp',
      'challansakshi-protected-aadhaar',
      'challansakshi-protected-payment',
      'challansakshi-protected-attachment',
      'challansakshi-protected-declaration',
      'challansakshi-protected-submit',
    ]) expect(html).toContain(`id="${id}"`);
    expect(html).not.toMatch(/\bdisabled=/);
    expect(html).not.toContain('data-challansakshi-fixture-ready="true"');
    expect(html.match(/data-challansakshi-fixture-counter=/g)).toHaveLength(17);
    expect(html.match(/<output\b[^>]*>0<\/output>/g)).toHaveLength(17);
    expect(html).toContain('data-challansakshi-fixture-event-sequence="true">[]</output>');
  });

  it('installs the pre-hydration POST interlock before activating the ready fixture', () => {
    const submitCapture = destinationSource.indexOf("form.addEventListener('submit', onSubmit, true)");
    const instrumentationInstalled = destinationSource.indexOf('history.replaceState =');
    const reset = destinationSource.indexOf('resetBaseline();', instrumentationInstalled);
    const unlock = destinationSource.indexOf('root.inert = false', reset);
    const ready = destinationSource.indexOf('root.setAttribute(fixture.ready.attribute, fixture.ready.value)', reset);

    expect(submitCapture).toBeGreaterThan(-1);
    expect(instrumentationInstalled).toBeGreaterThan(submitCapture);
    expect(reset).toBeGreaterThan(instrumentationInstalled);
    expect(unlock).toBeGreaterThan(reset);
    expect(ready).toBeGreaterThan(unlock);
    expect(destinationSource).toContain('root.inert = true');
    expect(destinationSource.indexOf('root.removeAttribute(fixture.ready.attribute)'))
      .toBeGreaterThan(destinationSource.indexOf('root.inert = true'));
  });

  it('emits every adapter-facing form literal through the shared fixture authority', () => {
    expect(destinationSource).toContain('for (const { token, id } of fixture.counters)');
    expect(destinationSource).toContain('method={fixture.form.method}');
    expect(destinationSource).toContain('defaultValue={fixture.category.options[0].value}');
    expect(destinationSource.match(/type=\{control\.type\}/g)?.length).toBeGreaterThanOrEqual(4);
    expect(destinationSource).not.toContain('`challansakshi-fixture-counter-${token}`');
    expect(destinationSource).not.toContain('method="post"');
    expect(destinationSource).not.toContain('defaultValue=""');
  });
});
