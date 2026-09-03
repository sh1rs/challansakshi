import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { WORKER_RESPONSE_SCHEMA } from '../src/message-contract';

const popupHtml = readFileSync(new URL('../popup.html', import.meta.url), 'utf8');
const popupCss = readFileSync(new URL('../src/popup.css', import.meta.url), 'utf8');
const popupSource = readFileSync(new URL('../src/popup.ts', import.meta.url), 'utf8');

const EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';
const GENERATION = '1'.repeat(32);
const PACK_ID = '2'.repeat(32);
const EFFECTIVE_EXPIRES_AT_MS = Date.UTC(2026, 8, 4, 9, 30);
const REPLAY_UNTIL = Date.UTC(2026, 8, 4, 10, 0);
const WARNING_EXPIRES_AT = Date.UTC(2026, 8, 5, 10, 0);
const PREVIEW_NOT_AFTER_MS = Date.UTC(2026, 8, 4, 8, 45);
const NOW_MS = Date.UTC(2026, 8, 4, 8, 1);

const SOURCE_DESCRIPTION = 'Reviewed fictional description for the fixture case.';
const CATEGORY_PRESENTATION = '4 Wheeler Challan On 2 Wheeler';

const sourceBinding = Object.freeze({
  schema: 'challansakshi.source-preview-binding/v1',
  sourceTabId: 17,
  sourceDocumentId: 'source-document-A',
  canonicalEnvelopeDigest: 'a'.repeat(64),
  previewNotAfterMs: PREVIEW_NOT_AFTER_MS,
});

function sourcePreviewResponse(overrides: Partial<{
  language: 'en' | 'hi';
  simpleMode: boolean;
  expiresAt: string;
  description: string;
  categoryPresentation: string | null;
  previewNotAfterMs: number;
}> = {}) {
  return {
    schema: WORKER_RESPONSE_SCHEMA,
    command: 'preview-current-page',
    state: 'source-preview',
    preview: {
      language: overrides.language ?? 'en',
      simpleMode: overrides.simpleMode ?? false,
      destinationName: 'Fictional destination fixture',
      routeKey: 'synthetic-fixture',
      routeRegistryVersion: 'challansakshi.official-routes/v1',
      adapterContractVersion: 'challansakshi.adapter-contract/v1',
      expiresAt: overrides.expiresAt ?? '2026-09-04T09:30:00.000Z',
      description: overrides.description ?? SOURCE_DESCRIPTION,
      categoryPresentation: 'categoryPresentation' in overrides
        ? overrides.categoryPresentation ?? null
        : CATEGORY_PRESENTATION,
    },
    sourcePreviewBinding: {
      ...sourceBinding,
      previewNotAfterMs: overrides.previewNotAfterMs ?? PREVIEW_NOT_AFTER_MS,
    },
  };
}

function destinationPreviewResponse(overrides: Partial<{
  language: 'en' | 'hi';
  simpleMode: boolean;
  adapterExpiresAt: string;
  description: string;
  effectiveExpiresAtMs: number;
}> = {}) {
  return {
    schema: WORKER_RESPONSE_SCHEMA,
    command: 'preview-current-page',
    state: 'destination-preview',
    generation: GENERATION,
    packId: PACK_ID,
    effectiveExpiresAtMs: overrides.effectiveExpiresAtMs ?? EFFECTIVE_EXPIRES_AT_MS,
    preview: {
      language: overrides.language ?? 'en',
      simpleMode: overrides.simpleMode ?? false,
      domain: '127.0.0.1:3000',
      purpose: 'Place the reviewed fictional category and description into the two blank synthetic fields.',
      adapterId: 'synthetic-fixture',
      adapterRevision: 'challansakshi.synthetic-destination/v1',
      lastVerifiedAt: '2026-09-03T00:00:00.000Z',
      adapterExpiresAt: overrides.adapterExpiresAt ?? '2026-10-03T00:00:00.000Z',
      description: overrides.description ?? SOURCE_DESCRIPTION,
      categoryPresentation: CATEGORY_PRESENTATION,
    },
  };
}

function stagedResponse(command: 'preview-current-page' | 'load-reviewed-fields' = 'load-reviewed-fields') {
  return {
    schema: WORKER_RESPONSE_SCHEMA,
    command,
    state: 'staged',
    generation: GENERATION,
    packId: PACK_ID,
    effectiveExpiresAtMs: EFFECTIVE_EXPIRES_AT_MS,
  };
}

function fixedResponse(command: string, state: string) {
  return { schema: WORKER_RESPONSE_SCHEMA, command, state };
}

function rejectedResponse(command: string, code: string) {
  return { schema: WORKER_RESPONSE_SCHEMA, command, state: 'rejected', code };
}

function warningWire() {
  return {
    state: 'needs-review',
    packId: PACK_ID,
    replayUntil: REPLAY_UNTIL,
    warningExpiresAt: WARNING_EXPIRES_AT,
  };
}

type HarnessOptions = {
  tabs?: unknown[][] | (() => unknown[]);
  reply?: unknown | ((request: unknown) => unknown);
  queryFailure?: string;
  sendFailure?: string;
  lastErrorAfterSend?: string;
};

function makePopupHarness(options: HarnessOptions = {}) {
  const calls: Array<{ name: string; value?: unknown }> = [];
  const forbidden: string[] = [];
  let lastError: { message: string } | undefined;
  const pendingReplies: Array<(reply: unknown) => void> = [];

  const respond = (request: unknown) => (
    typeof options.reply === 'function' ? (options.reply as (request: unknown) => unknown)(request) : options.reply
  );

  const tabsResult = () => {
    if (typeof options.tabs === 'function') return options.tabs();
    if (Array.isArray(options.tabs)) return options.tabs.length ? options.tabs.shift() : [];
    return [{ id: 41 }];
  };

  const forbiddenZone = (zone: string) => new Proxy({}, {
    get(_, property) {
      forbidden.push(`${zone}.${String(property)}`);
      return () => {
        throw new Error(`forbidden chrome zone: ${zone}`);
      };
    },
  });

  const chromeMock = {
    tabs: {
      query(query: unknown, callback: (tabs: unknown[]) => void) {
        calls.push({ name: 'tabs.query', value: query });
        if (options.queryFailure) {
          lastError = { message: options.queryFailure };
          callback([]);
          lastError = undefined;
          return;
        }
        callback(tabsResult() as unknown[]);
      },
      get(...args: unknown[]) {
        calls.push({ name: 'tabs.get', value: args });
        forbidden.push('tabs.get');
        throw new Error('tabs.get is forbidden in the popup');
      },
    },
    runtime: {
      get lastError() {
        return lastError;
      },
      sendMessage(request: unknown, callback: (reply: unknown) => void) {
        calls.push({ name: 'runtime.sendMessage', value: request });
        if (options.sendFailure) {
          lastError = { message: options.sendFailure };
          callback(undefined);
          lastError = undefined;
          return;
        }
        if (options.lastErrorAfterSend) {
          lastError = { message: options.lastErrorAfterSend };
          callback(undefined);
          lastError = undefined;
          return;
        }
        if (options.reply === undefined) {
          pendingReplies.push(callback);
          return;
        }
        callback(respond(request));
      },
      get id() {
        forbidden.push('runtime.id');
        return 'forbidden-runtime-id';
      },
      getURL(...args: unknown[]) {
        forbidden.push('runtime.getURL');
        void args;
        return 'forbidden-url';
      },
    },
    storage: forbiddenZone('storage'),
    scripting: forbiddenZone('scripting'),
    alarms: forbiddenZone('alarms'),
  };

  return { chromeMock, calls, forbidden, pendingReplies };
}

async function settle() {
  for (let index = 0; index < 32; index += 1) await Promise.resolve();
}

async function loadPopup(harness: ReturnType<typeof makePopupHarness>) {
  vi.resetModules();
  const dom = new JSDOM(popupHtml, {
    url: `${EXTENSION_ORIGIN}/popup.html`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('chrome', harness.chromeMock);
  await import('../src/popup');
  await settle();
  return dom;
}

function heading(dom: JSDOM) {
  const node = dom.window.document.querySelector('h2');
  expect(node, 'exactly one state heading must exist').not.toBeNull();
  return node as HTMLHeadingElement;
}

function bodyText(dom: JSDOM) {
  return dom.window.document.querySelector('main')?.textContent ?? '';
}

function buttons(dom: JSDOM) {
  return [...dom.window.document.querySelectorAll('button')] as HTMLButtonElement[];
}

function buttonByText(dom: JSDOM, text: string) {
  const match = buttons(dom).find((candidate) => (candidate.textContent ?? '').includes(text));
  expect(match, `button containing ${JSON.stringify(text)} must exist`).toBeDefined();
  return match as HTMLButtonElement;
}

async function consent(dom: JSDOM, harness: ReturnType<typeof makePopupHarness>) {
  buttonByText(dom, 'Continue to preview this page').click();
  await settle();
  void harness;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('static consent-first popup document', () => {
  it('ships the complete bilingual disclosure, landmarks, and only Continue and Not now before JavaScript runs', () => {
    const dom = new JSDOM(popupHtml, { url: `${EXTENSION_ORIGIN}/popup.html` });
    const documentNode = dom.window.document;
    expect(documentNode.querySelectorAll('main')).toHaveLength(1);
    expect(documentNode.querySelectorAll('h1')).toHaveLength(1);
    expect(documentNode.querySelector('h1')?.textContent).toContain('ChallanSakshi Assisted Handoff');
    const html = popupHtml;
    expect(html).toContain('ChallanSakshi सहायक हस्तांतरण');
    expect(html).toContain('Independent helper · Not a government service');
    expect(html).toContain('स्वतंत्र सहायक · सरकारी सेवा नहीं');
    expect(html).toContain('The affected person must inspect these fields and independently authenticate, declare, and submit');
    expect(html).toContain('प्रभावित व्यक्ति को इन फ़ील्डों की जाँच करनी होगी और स्वयं प्रमाणीकरण, घोषणा और सबमिट करना होगा');
    expect(html).toContain('The extension will not click or call Submit');
    expect(html).toContain('एक्सटेंशन Submit पर क्लिक नहीं करेगा और न ही Submit को कॉल करेगा');
    expect(html).toContain('Untouched: challan number, CAPTCHA, OTP, Aadhaar, payment, attachment, declaration, Submit');
    expect(html).toContain('इनको नहीं छुआ जाएगा: चालान नंबर, CAPTCHA, OTP, Aadhaar, भुगतान, अटैचमेंट, घोषणा, Submit');
    expect(html).toContain('Continue to preview this page');
    expect(html).toContain('इस पेज का पूर्वावलोकन देखने के लिए आगे बढ़ें');
    expect(html).toContain('Not now');
    expect(html).toContain('अभी नहीं');

    const stateHeadings = documentNode.querySelectorAll('h2');
    expect(stateHeadings).toHaveLength(1);
    expect(stateHeadings[0]?.getAttribute('tabindex')).toBe('-1');
    const allButtons = documentNode.querySelectorAll('button');
    expect(allButtons).toHaveLength(2);
    for (const control of allButtons) expect(control.getAttribute('type')).toBe('button');
    const live = documentNode.querySelectorAll('[aria-live]');
    expect(live).toHaveLength(1);
    expect(live[0]?.getAttribute('aria-live')).toBe('polite');
    expect(live[0]?.getAttribute('aria-atomic')).toBe('true');
    expect(live[0]?.textContent?.trim()).toBe('');
  });

  it('carries no navigation, form, inline-script, inline-style, hidden-value, or external surface', () => {
    const dom = new JSDOM(popupHtml, { url: `${EXTENSION_ORIGIN}/popup.html` });
    const documentNode = dom.window.document;
    for (const selector of ['a', 'form', 'base', 'iframe', 'object', 'embed', 'input', 'textarea', 'select']) {
      expect(documentNode.querySelectorAll(selector), selector).toHaveLength(0);
    }
    expect(documentNode.querySelectorAll('meta[http-equiv]')).toHaveLength(0);
    expect(documentNode.querySelectorAll('style')).toHaveLength(0);
    expect(documentNode.querySelectorAll('[style]')).toHaveLength(0);
    expect(documentNode.querySelectorAll('[target]')).toHaveLength(0);
    expect(documentNode.querySelectorAll('[hidden]')).toHaveLength(0);
    const scripts = [...documentNode.querySelectorAll('script')];
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.getAttribute('src')).toBe('virtual:challansakshi-popup.ts');
    expect(scripts[0]?.textContent).toBe('');
    expect(popupHtml).not.toMatch(/\son[a-z]+=/iu);
    expect(popupHtml).not.toMatch(/https?:\/\//u);
    expect(popupHtml).not.toMatch(/src="\/\//u);
    expect(popupHtml).not.toContain('127.0.0.1');
    expect(popupHtml).not.toContain('synthetic-fixture');
    expect(popupHtml).not.toContain('challansakshi.sh1rs.com');
    expect(popupHtml).not.toContain('echallan.parivahan.gov.in');
  });

  it('performs zero Chrome work at bootstrap and only fills the environment label from the compile-time define', async () => {
    const harness = makePopupHarness();
    const dom = await loadPopup(harness);
    expect(harness.calls).toEqual([]);
    expect(harness.forbidden).toEqual([]);
    expect(dom.window.document.querySelector('#extension-environment')?.textContent)
      .toBe('Synthetic development · fictional fixtures only');
    expect(dom.window.document.activeElement).toBe(heading(dom));
  });

  it('keeps popup source free of forbidden authority and schema recreation', () => {
    expect(popupSource).not.toMatch(/tabs\.get|storage\.|scripting\.|alarms\.|navigator\.|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/u);
    expect(popupSource).not.toMatch(/runtime\.id|runtime\.getURL|new URL\(|location\.(?:href|assign|replace)/u);
    expect(popupSource).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/u);
    expect(popupSource).not.toMatch(/console\./u);
    expect(popupSource).not.toContain("'challansakshi.worker-response/v1'");
    expect(popupSource).toContain("from './message-contract'");
    expect(popupSource).toContain('validateWorkerResponseForCommand');
    expect(popupSource).toContain('__CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__');
    expect(popupSource).not.toMatch(/from '\.\/manifest'/u);
  });
});

describe('local refusal', () => {
  it('renders the exact Not now state with zero Chrome calls and focuses its heading', async () => {
    const harness = makePopupHarness();
    const dom = await loadPopup(harness);
    buttonByText(dom, 'Not now').click();
    await settle();
    expect(harness.calls).toEqual([]);
    expect(harness.forbidden).toEqual([]);
    const stateHeading = heading(dom);
    expect(stateHeading.textContent).toContain('No page was inspected');
    expect(stateHeading.textContent).toContain('किसी पेज की जाँच नहीं हुई');
    expect(bodyText(dom)).toContain('Nothing was read, stored, or changed.');
    expect(bodyText(dom)).toContain('कुछ भी पढ़ा, संग्रहित या बदला नहीं गया।');
    expect(dom.window.document.activeElement).toBe(stateHeading);
    expect(buttons(dom)).toHaveLength(0);
  });
});

describe('consented preview activation', () => {
  it('debounces repeated click, Enter, and Space activation into exactly one query and one closed preview request', async () => {
    const harness = makePopupHarness({ reply: fixedResponse('preview-current-page', 'empty') });
    const dom = await loadPopup(harness);
    const continueButton = buttonByText(dom, 'Continue to preview this page');
    continueButton.click();
    continueButton.click();
    continueButton.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    continueButton.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    continueButton.click();
    await settle();
    const queryCalls = harness.calls.filter((call) => call.name === 'tabs.query');
    expect(queryCalls).toHaveLength(1);
    expect(queryCalls[0]?.value).toEqual({ active: true, lastFocusedWindow: true });
    const sends = harness.calls.filter((call) => call.name === 'runtime.sendMessage');
    expect(sends).toHaveLength(1);
    expect(sends[0]?.value).toEqual({
      schema: 'challansakshi.worker-request/v1',
      command: 'preview-current-page',
      actionTabId: 41,
    });
    expect(harness.forbidden).toEqual([]);
  });

  it('reads only an own numeric safe-integer tab id and treats hostile or accessor tab objects as local transport errors', async () => {
    const hostileTabs: Array<[string, unknown[]]> = [
      ['missing id', [{}]],
      ['negative id', [{ id: -1 }]],
      ['unsafe id', [{ id: Number.MAX_SAFE_INTEGER + 2 }]],
      ['string id', [{ id: '41' }]],
      ['accessor id', [Object.defineProperty({}, 'id', { enumerable: true, get: () => 41 })]],
      ['inherited id', [Object.create({ id: 41 })]],
      ['empty result', []],
    ];
    for (const [label, tabs] of hostileTabs) {
      const harness = makePopupHarness({ tabs: () => tabs, reply: fixedResponse('preview-current-page', 'empty') });
      const dom = await loadPopup(harness);
      await consent(dom, harness);
      expect(harness.calls.filter((call) => call.name === 'runtime.sendMessage'), label).toHaveLength(0);
      expect(heading(dom).textContent, label).toContain('The extension could not finish this check');
    }
  });

  it('never proxies hostile tab objects into the request and accepts a plain zero id', async () => {
    const harness = makePopupHarness({ tabs: () => [{ id: 0 }], reply: fixedResponse('preview-current-page', 'empty') });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    const sends = harness.calls.filter((call) => call.name === 'runtime.sendMessage');
    expect(sends).toHaveLength(1);
    expect((sends[0]?.value as { actionTabId: number }).actionTabId).toBe(0);
  });
});

describe('transport failure mapping', () => {
  const transportCases: Array<[string, HarnessOptions]> = [
    ['query failure', { queryFailure: 'query blew up' }],
    ['send failure with lastError', { sendFailure: 'no receiver' }],
    ['missing response', { lastErrorAfterSend: 'The message port closed before a response was received.' }],
    ['undefined reply', { reply: undefined, tabs: () => [{ id: 41 }] }],
    ['malformed reply', { reply: { nonsense: true } }],
    ['wrong-command reply', { reply: fixedResponse('load-reviewed-fields', 'expired') }],
    ['wrong-state reply', { reply: fixedResponse('preview-current-page', 'success') }],
    ['wrong-code reply', { reply: rejectedResponse('preview-current-page', 'secure-random-unavailable') }],
  ];

  for (const [label, options] of transportCases) {
    it(`renders the fixed bilingual transport error for ${label} without raw output`, async () => {
      const harness = makePopupHarness(options);
      const dom = await loadPopup(harness);
      await consent(dom, harness);
      if (options.reply === undefined && !options.queryFailure && !options.sendFailure && !options.lastErrorAfterSend) {
        harness.pendingReplies.shift()?.(undefined);
        await settle();
      }
      const stateHeading = heading(dom);
      expect(stateHeading.textContent, label).toContain('The extension could not finish this check');
      expect(stateHeading.textContent, label).toContain('एक्सटेंशन यह जाँच पूरी नहीं कर सका');
      expect(bodyText(dom), label).toContain('Close and reopen the popup, or use the assisted-copy steps on ChallanSakshi. Nothing else will be attempted.');
      expect(bodyText(dom), label).toContain('पॉपअप बंद करके फिर खोलें, या ChallanSakshi पर सहायक-कॉपी चरणों का उपयोग करें। कोई और प्रयास नहीं किया जाएगा।');
      expect(bodyText(dom), label).not.toContain('query blew up');
      expect(bodyText(dom), label).not.toContain('no receiver');
      expect(bodyText(dom), label).not.toContain('message port closed');
      expect(dom.window.document.activeElement, label).toBe(stateHeading);
    });
  }

  it('accepts only the command-null invalid family after exact-command validation fails', async () => {
    const harness = makePopupHarness({
      reply: { schema: WORKER_RESPONSE_SCHEMA, command: null, state: 'rejected', code: 'invalid-sender' },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(heading(dom).textContent).toContain('This action was not performed');
    expect(bodyText(dom)).not.toContain('invalid-sender');

    const hostileNull = makePopupHarness({
      reply: { schema: WORKER_RESPONSE_SCHEMA, command: null, state: 'rejected', code: 'operation-failed' },
    });
    const hostileDom = await loadPopup(hostileNull);
    await consent(hostileDom, hostileNull);
    expect(heading(hostileDom).textContent).toContain('The extension could not finish this check');
  });

  it('rejects reordered, extra, prototype, accessor, and proxy replies locally', async () => {
    const reordered = { command: 'preview-current-page', schema: WORKER_RESPONSE_SCHEMA, state: 'empty' };
    const extra = { ...fixedResponse('preview-current-page', 'empty'), extra: true };
    const inherited = Object.assign(Object.create({ injected: true }), fixedResponse('preview-current-page', 'empty'));
    const accessor = Object.defineProperty(
      { schema: WORKER_RESPONSE_SCHEMA, command: 'preview-current-page' },
      'state',
      { enumerable: true, get: () => 'empty' },
    );
    const proxy = new Proxy(fixedResponse('preview-current-page', 'empty'), {
      ownKeys() {
        throw new Error('must fail closed');
      },
    });
    for (const [label, reply] of [
      ['reordered', reordered],
      ['extra', extra],
      ['inherited', inherited],
      ['accessor', accessor],
      ['proxy', proxy],
    ] as const) {
      const harness = makePopupHarness({ reply });
      const dom = await loadPopup(harness);
      await consent(dom, harness);
      expect(heading(dom).textContent, label).toContain('The extension could not finish this check');
    }
  });
});

describe('source preview view', () => {
  it('renders the validated DTO in its own language with values only in text nodes and one primary Load action', async () => {
    const harness = makePopupHarness({ reply: sourcePreviewResponse() });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    const stateHeading = heading(dom);
    expect(stateHeading.textContent).toBe('Reviewed fields on this page');
    expect(bodyText(dom)).toContain('Fictional destination fixture');
    expect(bodyText(dom)).toContain('2026-09-04T09:30:00.000Z');
    expect(bodyText(dom)).toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).toContain(CATEGORY_PRESENTATION);
    expect(bodyText(dom)).toContain('The extension will not click or call Submit');
    expect(bodyText(dom)).not.toContain('The extension did not click or call Submit');
    const primaries = dom.window.document.querySelectorAll('.action-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.textContent).toBe('Load reviewed fields');
    const markup = dom.window.document.querySelector('main')?.outerHTML ?? '';
    const attributeText = markup.replace(/>[^<]*/gu, '>');
    expect(attributeText).not.toContain(SOURCE_DESCRIPTION);
    expect(attributeText).not.toContain(CATEGORY_PRESENTATION);
    expect(markup).not.toMatch(/https?:\/\//u);
  });

  it('renders Hindi and Simple Mode variants from the DTO without translating reviewed values', async () => {
    const harness = makePopupHarness({ reply: sourcePreviewResponse({ language: 'hi', simpleMode: true }) });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(heading(dom).textContent).toBe('इस पेज पर जाँचे गए फ़ील्ड');
    expect(bodyText(dom)).toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).not.toContain('Review the two prepared fields below.');
    expect(bodyText(dom)).not.toContain('नीचे तैयार दो फ़ील्ड देखें।');
    expect(dom.window.document.querySelector('.action-primary')?.textContent).toBe('जाँचे गए फ़ील्ड लोड करें');
  });

  it('renders a null category presentation without a category block', async () => {
    const harness = makePopupHarness({ reply: sourcePreviewResponse({ categoryPresentation: null }) });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(bodyText(dom)).toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).not.toContain('Category');
  });
});

describe('load scrub discipline', () => {
  it('synchronously replaces every reviewed value node and nulls the slot before load is observable', async () => {
    let domAtSendTime = 'unsent';
    const domHolder: { current: Awaited<ReturnType<typeof loadPopup>> | null } = { current: null };
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return sourcePreviewResponse();
        }
        domAtSendTime = domHolder.current ? bodyText(domHolder.current) : 'dom-missing';
        return stagedResponse('load-reviewed-fields');
      },
    });
    const dom = await loadPopup(harness);
    domHolder.current = dom;
    await consent(dom, harness);
    buttonByText(dom, 'Load reviewed fields').click();
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).not.toContain(CATEGORY_PRESENTATION);
    expect(bodyText(dom)).toContain('Load requested · reviewed values cleared from this popup');
    await settle();
    expect(domAtSendTime, 'the DOM observed by the send itself is already scrubbed').not.toContain(SOURCE_DESCRIPTION);
    expect(domAtSendTime).toContain('Load requested · reviewed values cleared from this popup');
  });

  it('sends the load request bound to the fresh action tab and the exact source binding, then renders staged', async () => {
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return sourcePreviewResponse();
        }
        return stagedResponse('load-reviewed-fields');
      },
      tabs: [[{ id: 41 }], [{ id: 63 }]],
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    buttonByText(dom, 'Load reviewed fields').click();
    await settle();
    const sends = harness.calls.filter((call) => call.name === 'runtime.sendMessage');
    expect(sends).toHaveLength(2);
    expect(sends[1]?.value).toEqual({
      schema: 'challansakshi.worker-request/v1',
      command: 'load-reviewed-fields',
      actionTabId: 63,
      sourcePreviewBinding: sourceBinding,
    });
    expect(heading(dom).textContent).toContain('Fields prepared');
    expect(heading(dom).textContent).toContain('फ़ील्ड तैयार हैं');
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
  });

  it('never reconstructs scrubbed values when the load fails', async () => {
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return sourcePreviewResponse();
        }
        return { nonsense: true };
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    buttonByText(dom, 'Load reviewed fields').click();
    await settle();
    expect(heading(dom).textContent).toContain('The extension could not finish this check');
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).not.toContain(CATEGORY_PRESENTATION);
  });
});

describe('staged view and payload-free clear', () => {
  it('renders staged with its ISO expiry, a secondary-only Clear, and the exact payload-free clear request', async () => {
    let cleared = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        const command = (request as { command: string }).command;
        if (command === 'preview-current-page') return stagedResponse('preview-current-page');
        cleared = true;
        return fixedResponse('clear-staged-fields', 'empty');
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(heading(dom).textContent).toContain('Fields prepared');
    expect(bodyText(dom)).toContain(new Date(EFFECTIVE_EXPIRES_AT_MS).toISOString());
    expect(dom.window.document.querySelectorAll('.action-primary')).toHaveLength(0);
    const clearButton = buttonByText(dom, 'Clear prepared fields');
    expect(clearButton.className).toContain('action-secondary');
    clearButton.click();
    await settle();
    expect(cleared).toBe(true);
    const sends = harness.calls.filter((call) => call.name === 'runtime.sendMessage');
    expect(sends[1]?.value).toEqual({
      schema: 'challansakshi.worker-request/v1',
      command: 'clear-staged-fields',
      generation: GENERATION,
      packId: PACK_ID,
      effectiveExpiresAtMs: EFFECTIVE_EXPIRES_AT_MS,
    });
    expect(harness.calls.filter((call) => call.name === 'tabs.query')).toHaveLength(1);
    expect(heading(dom).textContent).toContain('Nothing is prepared');
  });
});

describe('destination preview and fill', () => {
  it('renders the frozen domain, purpose, and adapter dates byte-for-byte with Fill primary and Clear secondary', async () => {
    const harness = makePopupHarness({ reply: destinationPreviewResponse() });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(bodyText(dom)).toContain('127.0.0.1:3000');
    expect(bodyText(dom)).toContain('Place the reviewed fictional category and description into the two blank synthetic fields.');
    expect(bodyText(dom)).toContain('2026-09-03T00:00:00.000Z');
    expect(bodyText(dom)).toContain('2026-10-03T00:00:00.000Z');
    expect(bodyText(dom)).toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).toContain('The extension will not click or call Submit');
    const primaries = dom.window.document.querySelectorAll('.action-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.textContent).toBe('Fill empty reviewed fields');
    expect(buttonByText(dom, 'Clear prepared fields').className).toContain('action-secondary');
  });

  it('scrubs before fill is observable, sends the closed fill request, and renders post-attempt success', async () => {
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return destinationPreviewResponse();
        }
        return fixedResponse('fill-empty-reviewed-fields', 'success');
      },
      tabs: [[{ id: 41 }], [{ id: 88 }]],
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    buttonByText(dom, 'Fill empty reviewed fields').click();
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).toContain('Fill requested · inspect the official form');
    await settle();
    const sends = harness.calls.filter((call) => call.name === 'runtime.sendMessage');
    expect(sends[1]?.value).toEqual({
      schema: 'challansakshi.worker-request/v1',
      command: 'fill-empty-reviewed-fields',
      actionTabId: 88,
      generation: GENERATION,
      packId: PACK_ID,
      effectiveExpiresAtMs: EFFECTIVE_EXPIRES_AT_MS,
    });
    expect(heading(dom).textContent).toContain('Both empty reviewed fields were filled');
    expect(bodyText(dom)).toContain('The extension did not click or call Submit');
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
  });

  it('never reconstructs scrubbed values when fill is rejected', async () => {
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return destinationPreviewResponse();
        }
        return rejectedResponse('fill-empty-reviewed-fields', 'destination-not-ready');
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    buttonByText(dom, 'Fill empty reviewed fields').click();
    await settle();
    expect(heading(dom).textContent).toContain('This action was not performed');
    expect(bodyText(dom)).toContain('The extension did not click or call Submit');
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
  });
});

describe('deferred races', () => {
  it('ignores clear during an in-flight fill so exactly one command is sent', async () => {
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return destinationPreviewResponse();
        }
        return undefined as unknown;
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    harness.calls.length = 0;
    const fillButton = buttonByText(dom, 'Fill empty reviewed fields');
    const clearButton = buttonByText(dom, 'Clear prepared fields');
    fillButton.click();
    clearButton.click();
    fillButton.click();
    await settle();
    const sends = harness.calls.filter((call) => call.name === 'runtime.sendMessage');
    expect(sends).toHaveLength(1);
    expect((sends[0]?.value as { command: string }).command).toBe('fill-empty-reviewed-fields');
  });

  it('drops a stale completion that arrives after local expiry replaced the state', async () => {
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return destinationPreviewResponse();
        }
        return undefined as unknown;
      },
    });
    const pending: Array<(value: unknown) => void> = [];
    const dom = await loadPopup(harness);
    const originalSend = harness.chromeMock.runtime.sendMessage.bind(harness.chromeMock.runtime);
    let interceptNext = false;
    (harness.chromeMock.runtime as { sendMessage: unknown }).sendMessage = (
      request: unknown,
      callback: (reply: unknown) => void,
    ) => {
      if (interceptNext) {
        harness.calls.push({ name: 'runtime.sendMessage', value: request });
        pending.push(callback);
        return;
      }
      originalSend(request, callback);
    };
    await consent(dom, harness);
    interceptNext = true;
    buttonByText(dom, 'Fill empty reviewed fields').click();
    await settle();
    expect(pending).toHaveLength(1);
    vi.advanceTimersByTime(EFFECTIVE_EXPIRES_AT_MS - NOW_MS + 1000);
    await settle();
    expect(heading(dom).textContent).toContain('Prepared fields expired');
    pending[0]?.(fixedResponse('fill-empty-reviewed-fields', 'success'));
    await settle();
    expect(heading(dom).textContent).toContain('Prepared fields expired');
    expect(bodyText(dom)).not.toContain('Both empty reviewed fields were filled');
  });
});

describe('local expiry timers', () => {
  it('scrubs the source preview at the earlier source-binding deadline', async () => {
    const harness = makePopupHarness({ reply: sourcePreviewResponse() });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(bodyText(dom)).toContain(SOURCE_DESCRIPTION);
    vi.advanceTimersByTime(PREVIEW_NOT_AFTER_MS - NOW_MS - 1000);
    await settle();
    expect(bodyText(dom)).toContain(SOURCE_DESCRIPTION);
    vi.advanceTimersByTime(2000);
    await settle();
    expect(heading(dom).textContent).toContain('Prepared fields expired');
    expect(heading(dom).textContent).toContain('तैयार किए गए फ़ील्ड की समय-सीमा समाप्त हो गई');
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
    expect(bodyText(dom)).not.toContain(CATEGORY_PRESENTATION);
    expect(buttons(dom)).toHaveLength(0);
  });

  it('expires immediately when the deadline already passed and honors an earlier adapter expiry', async () => {
    const past = makePopupHarness({ reply: sourcePreviewResponse({ previewNotAfterMs: NOW_MS - 1000 }) });
    const pastDom = await loadPopup(past);
    await consent(pastDom, past);
    expect(heading(pastDom).textContent).toContain('Prepared fields expired');

    const adapterExpiryMs = Date.parse('2026-10-03T00:00:00.000Z');
    const adapterEarly = makePopupHarness({
      reply: destinationPreviewResponse({ effectiveExpiresAtMs: Date.UTC(2026, 10, 1) }),
    });
    const adapterDom = await loadPopup(adapterEarly);
    await consent(adapterDom, adapterEarly);
    expect(bodyText(adapterDom)).toContain(SOURCE_DESCRIPTION);
    vi.advanceTimersByTime(adapterExpiryMs - NOW_MS - 60_000);
    await settle();
    expect(bodyText(adapterDom), 'the pinned adapter expiry has not yet passed').toContain(SOURCE_DESCRIPTION);
    vi.advanceTimersByTime(120_000);
    await settle();
    expect(heading(adapterDom).textContent, 'the fixed adapter expiry precedes the later effective expiry').toContain('Prepared fields expired');
  });

  it('reaches a far deadline through chunked timers and ignores a superseded stale timer', async () => {
    const farDeadline = NOW_MS + 40 * 86_400_000;
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return sourcePreviewResponse();
        }
        return {
          schema: WORKER_RESPONSE_SCHEMA,
          command: 'load-reviewed-fields',
          state: 'staged',
          generation: GENERATION,
          packId: PACK_ID,
          effectiveExpiresAtMs: farDeadline,
        };
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    buttonByText(dom, 'Load reviewed fields').click();
    await settle();
    expect(heading(dom).textContent).toContain('Fields prepared');
    vi.advanceTimersByTime(PREVIEW_NOT_AFTER_MS - NOW_MS + 60_000);
    await settle();
    expect(heading(dom).textContent, 'stale source timer must not fire').toContain('Fields prepared');
    vi.advanceTimersByTime(farDeadline - NOW_MS);
    await settle();
    expect(heading(dom).textContent).toContain('Prepared fields expired');
  });
});

describe('warning acknowledgement and recovery', () => {
  it('offers acknowledgement on a persisted warning, renders its ISO expiry, and sends the exact request', async () => {
    let acknowledged = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        const command = (request as { command: string }).command;
        if (command === 'preview-current-page') {
          return {
            schema: WORKER_RESPONSE_SCHEMA,
            command: 'preview-current-page',
            state: 'needs-review',
            warning: warningWire(),
          };
        }
        acknowledged = true;
        return fixedResponse('acknowledge-affected-person-inspection', 'empty');
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(heading(dom).textContent).toContain('The affected person must inspect the official form');
    expect(bodyText(dom)).toContain(new Date(WARNING_EXPIRES_AT).toISOString());
    expect(bodyText(dom)).toContain('The extension did not click or call Submit');
    const ackButton = buttonByText(dom, 'The affected person inspected the form · clear warning');
    expect(ackButton.disabled).toBe(false);
    ackButton.click();
    await settle();
    expect(acknowledged).toBe(true);
    const sends = harness.calls.filter((call) => call.name === 'runtime.sendMessage');
    expect(sends[1]?.value).toEqual({
      schema: 'challansakshi.worker-request/v1',
      command: 'acknowledge-affected-person-inspection',
      packId: PACK_ID,
      replayUntil: REPLAY_UNTIL,
      warningExpiresAt: WARNING_EXPIRES_AT,
    });
    expect(harness.calls.filter((call) => call.name === 'tabs.query')).toHaveLength(1);
  });

  it('locally disables acknowledgement at warning expiry without clearing the warning', async () => {
    const harness = makePopupHarness({
      reply: {
        schema: WORKER_RESPONSE_SCHEMA,
        command: 'preview-current-page',
        state: 'needs-review',
        warning: warningWire(),
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    vi.advanceTimersByTime(WARNING_EXPIRES_AT - NOW_MS + 1000);
    await settle();
    expect(heading(dom).textContent).toContain('The affected person must inspect the official form');
    expect(buttonByText(dom, 'clear warning').disabled).toBe(true);
    expect(bodyText(dom)).toContain('Acknowledgement is no longer available here. Close and reopen the popup for a fresh check.');
    harness.calls.length = 0;
    buttonByText(dom, 'clear warning').click();
    await settle();
    expect(harness.calls).toEqual([]);
  });

  it('renders an immediate partial fill warning in post-attempt tense', async () => {
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return destinationPreviewResponse();
        }
        return {
          schema: WORKER_RESPONSE_SCHEMA,
          command: 'fill-empty-reviewed-fields',
          state: 'partial',
          code: 'partial',
          warning: warningWire(),
        };
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    buttonByText(dom, 'Fill empty reviewed fields').click();
    await settle();
    expect(heading(dom).textContent).toContain('Some fields may not be filled');
    expect(bodyText(dom)).toContain('The extension did not click or call Submit');
    expect(bodyText(dom)).not.toContain(SOURCE_DESCRIPTION);
  });

  it('keeps unresolved-live without reset, timer, or countdown', async () => {
    const harness = makePopupHarness({ reply: fixedResponse('preview-current-page', 'unresolved-live') });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    expect(heading(dom).textContent).toContain('Waiting for a result that has not arrived');
    expect(bodyText(dom)).toContain('The extension did not click or call Submit');
    expect(buttons(dom)).toHaveLength(0);
    vi.advanceTimersByTime(30 * 86_400_000);
    await settle();
    expect(heading(dom).textContent, 'no countdown or automatic clear').toContain('Waiting for a result that has not arrived');
  });

  it('offers device-owner reset only for orphaned and quarantined views with the exact attestation', async () => {
    for (const state of ['unresolved-orphaned', 'quarantined'] as const) {
      let resetSent: unknown = null;
      const harness = makePopupHarness({
        reply: (request: unknown) => {
          const command = (request as { command: string }).command;
          if (command === 'preview-current-page') return fixedResponse('preview-current-page', state);
          resetSent = request;
          return fixedResponse('reset-for-device-owner', 'empty');
        },
      });
      const dom = await loadPopup(harness);
      await consent(dom, harness);
      expect(bodyText(dom), state).toContain('Exceptional recovery: this is outside ordinary one-use settlement and may discard unresolved safety history. The extension may still refuse.');
      const resetButton = buttonByText(dom, 'reset device state');
      expect(resetButton.className, state).toContain('action-danger');
      resetButton.click();
      await settle();
      expect(resetSent, state).toEqual({
        schema: 'challansakshi.worker-request/v1',
        command: 'reset-for-device-owner',
        attestation: {
          schema: 'challansakshi.device-owner-reset-attestation/v1',
          type: 'reset-for-device-owner',
          allRelevantOfficialTabsAndBrowserProcessesClosed: true,
        },
      });
      expect(harness.calls.filter((call) => call.name === 'tabs.query'), state).toHaveLength(1);
    }
  });
});

describe('tense matrix', () => {
  it('uses post-attempt wording for every fill response and pre-attempt wording elsewhere', async () => {
    const preRejected = makePopupHarness({ reply: rejectedResponse('preview-current-page', 'source-unavailable') });
    const preDom = await loadPopup(preRejected);
    await consent(preDom, preRejected);
    expect(bodyText(preDom)).toContain('The extension will not click or call Submit');
    expect(bodyText(preDom)).not.toContain('The extension did not click or call Submit');

    let previewDelivered = false;
    const fillExpired = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return destinationPreviewResponse();
        }
        return fixedResponse('fill-empty-reviewed-fields', 'expired');
      },
    });
    const fillDom = await loadPopup(fillExpired);
    await consent(fillDom, fillExpired);
    buttonByText(fillDom, 'Fill empty reviewed fields').click();
    await settle();
    expect(bodyText(fillDom)).toContain('The extension did not click or call Submit');
    expect(bodyText(fillDom)).not.toContain('The extension will not click or call Submit');
  });
});

describe('exhaustive value leak scan', () => {
  it('keeps reviewed values out of attributes, hidden nodes, the live region, and console before and after scrub', async () => {
    const consoleEvents: string[] = [];
    const consoleTrap = new Proxy({}, {
      get: (_, property) => (...args: unknown[]) => {
        consoleEvents.push(`${String(property)}:${args.map(String).join(' ')}`);
      },
    });
    vi.stubGlobal('console', consoleTrap);
    let previewDelivered = false;
    const harness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return sourcePreviewResponse();
        }
        return stagedResponse('load-reviewed-fields');
      },
    });
    const dom = await loadPopup(harness);
    await consent(dom, harness);
    const documentNode = dom.window.document;
    const markupWithValues = documentNode.documentElement.outerHTML;
    const attributeOnly = markupWithValues.replace(/>[^<]*/gu, '>');
    expect(attributeOnly).not.toContain(SOURCE_DESCRIPTION);
    expect(attributeOnly).not.toContain(CATEGORY_PRESENTATION);
    expect(documentNode.querySelectorAll('[hidden]')).toHaveLength(0);
    expect(documentNode.querySelector('#status-region')?.textContent).not.toContain(SOURCE_DESCRIPTION);
    expect(documentNode.querySelector('#status-region')?.textContent).not.toContain(CATEGORY_PRESENTATION);
    for (const node of documentNode.querySelectorAll('[title], [aria-label], [data-value]')) {
      expect(node.getAttribute('title') ?? '').not.toContain(SOURCE_DESCRIPTION);
      expect(node.getAttribute('aria-label') ?? '').not.toContain(SOURCE_DESCRIPTION);
    }
    buttonByText(dom, 'Load reviewed fields').click();
    await settle();
    const postScrub = documentNode.documentElement.outerHTML;
    expect(postScrub).not.toContain(SOURCE_DESCRIPTION);
    expect(postScrub).not.toContain(CATEGORY_PRESENTATION);
    expect(consoleEvents.join('\n')).not.toContain(SOURCE_DESCRIPTION);
    expect(consoleEvents.join('\n')).not.toContain(CATEGORY_PRESENTATION);
  });
});

describe('focus, primary-action, and layout contracts', () => {
  it('keeps exactly one visually primary action, native buttons, and focused headings across representative states', async () => {
    const states: Array<[string, unknown]> = [
      ['source-preview', sourcePreviewResponse()],
      ['destination-preview', destinationPreviewResponse()],
      ['staged', stagedResponse('preview-current-page')],
      ['needs-review', { schema: WORKER_RESPONSE_SCHEMA, command: 'preview-current-page', state: 'needs-review', warning: warningWire() }],
      ['quarantined', fixedResponse('preview-current-page', 'quarantined')],
      ['empty', fixedResponse('preview-current-page', 'empty')],
      ['rejected', rejectedResponse('preview-current-page', 'operation-failed')],
    ];
    for (const [label, reply] of states) {
      const harness = makePopupHarness({ reply });
      const dom = await loadPopup(harness);
      await consent(dom, harness);
      expect(dom.window.document.querySelectorAll('.action-primary').length, label).toBeLessThanOrEqual(1);
      expect(dom.window.document.querySelectorAll('h2'), label).toHaveLength(1);
      for (const control of buttons(dom)) {
        expect(control.getAttribute('type'), label).toBe('button');
        expect((control.textContent ?? '').trim().length, label).toBeGreaterThan(0);
      }
      expect(dom.window.document.activeElement, label).toBe(heading(dom));
      expect(dom.window.document.querySelectorAll('[aria-live]'), label).toHaveLength(1);
    }
  });

  it('meets the deterministic layout contract in the stylesheet', () => {
    expect(popupCss).toMatch(/body\s*\{[^}]*width:\s*24rem/u);
    expect(popupCss).toMatch(/body\s*\{[^}]*max-width:\s*100vw/u);
    expect(popupCss).toMatch(/body\s*\{[^}]*min-width:\s*min\(20rem,\s*100vw\)/u);
    expect(popupCss).toMatch(/\.action\s*\{[^}]*min-height:\s*2\.75rem/u);
    expect(popupCss).toMatch(/overflow-wrap:\s*anywhere/u);
    expect(popupCss).toMatch(/\.reviewed-prose\s*\{[^}]*white-space:\s*pre-wrap/u);
    expect(popupCss).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px\s+solid/u);
    expect(popupCss).not.toMatch(/nowrap/u);
    expect(popupCss).not.toMatch(/body\s*\{[^}]*[^-]height:/u);
    expect(popupCss).not.toMatch(/main\s*\{[^}]*[^-]height:/u);
    expect(popupCss).toMatch(/Georgia/u);
    expect(popupCss).not.toMatch(/@import|url\s*\(|https?:/u);
  });
});

describe('compile-time environment label wiring', () => {
  it('derives the label define from the selected profile in both build and test configs without importing the registry into the popup', () => {
    const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    const vitestConfig = readFileSync(new URL('../vitest.config.ts', import.meta.url), 'utf8');
    expect(viteConfig).toContain('__CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__: JSON.stringify(profile.visibleEnvironmentLabel)');
    expect(vitestConfig).toContain('__CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__: JSON.stringify(testProfile.visibleEnvironmentLabel)');
    expect(popupSource).toContain('declare const __CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__: string;');
    expect(popupSource).not.toContain("from './manifest'");
    expect(popupSource).not.toContain('getExtensionBuildProfile');
  });

  it('keeps the ten-leaf build allowlist with the popup outputs and the virtual entry wiring intact', () => {
    const buildScript = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
    for (const leaf of ['popup.css', 'popup.html', 'popup.js', 'service-worker.js', 'manifest.json', 'favicon.svg']) {
      expect(buildScript).toContain(`'${leaf}'`);
    }
    expect(popupHtml).toContain('virtual:challansakshi-popup.css');
    expect(popupHtml).toContain('virtual:challansakshi-popup.ts');
    const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    expect(viteConfig).toContain("existsSync(popupEntry) ? popupEntry : virtualPopupEntry");
  });
});

describe('hardening from independent review', () => {
  it('locks the frozen Hindi boundary, action, and fallback copy against regression', async () => {
    let previewDelivered = false;
    const fillHarness = makePopupHarness({
      reply: (request: unknown) => {
        if (!previewDelivered) {
          previewDelivered = true;
          void request;
          return destinationPreviewResponse({ language: 'hi' });
        }
        return fixedResponse('fill-empty-reviewed-fields', 'success');
      },
    });
    const dom = await loadPopup(fillHarness);
    await consent(dom, fillHarness);
    expect(dom.window.document.querySelector('.action-primary')?.textContent).toBe('जाँचे गए खाली फ़ील्ड भरें');
    expect(buttonByText(dom, 'तैयार किए गए फ़ील्ड साफ़ करें').className).toContain('action-secondary');
    buttonByText(dom, 'जाँचे गए खाली फ़ील्ड भरें').click();
    await settle();
    expect(bodyText(dom)).toContain('एक्सटेंशन ने Submit पर क्लिक नहीं किया और न ही Submit को कॉल किया');
    expect(bodyText(dom)).toContain('इनको नहीं छुआ जाएगा: चालान नंबर, CAPTCHA, OTP, Aadhaar, भुगतान, अटैचमेंट, घोषणा, Submit');

    const unsupported = makePopupHarness({ reply: fixedResponse('preview-current-page', 'unsupported') });
    const unsupportedDom = await loadPopup(unsupported);
    await consent(unsupportedDom, unsupported);
    expect(bodyText(unsupportedDom)).toContain('ChallanSakshi पर पहले से दिखाए गए सहायक-कॉपी चरणों का उपयोग करें। यह पॉपअप कोई वेबसाइट नहीं खोलता और क्लिपबोर्ड पर कॉपी नहीं करता।');

    const warningHarness = makePopupHarness({
      reply: { schema: WORKER_RESPONSE_SCHEMA, command: 'preview-current-page', state: 'needs-review', warning: warningWire() },
    });
    const warningDom = await loadPopup(warningHarness);
    await consent(warningDom, warningHarness);
    expect(bodyText(warningDom)).toContain('प्रभावित व्यक्ति ने फ़ॉर्म की जाँच कर ली · चेतावनी साफ़ करें');

    const quarantineHarness = makePopupHarness({ reply: fixedResponse('preview-current-page', 'quarantined') });
    const quarantineDom = await loadPopup(quarantineHarness);
    await consent(quarantineDom, quarantineHarness);
    expect(bodyText(quarantineDom)).toContain('मैं इस डिवाइस का स्वामी हूँ और मैंने सभी संबंधित आधिकारिक टैब और सभी ब्राउज़र प्रक्रियाएँ बंद कर दी हैं · डिवाइस स्थिति रीसेट करें');
  });

  it('gives the quarantined view its own honest body line distinct from unresolved copy', async () => {
    const quarantineHarness = makePopupHarness({ reply: fixedResponse('preview-current-page', 'quarantined') });
    const quarantineDom = await loadPopup(quarantineHarness);
    await consent(quarantineDom, quarantineHarness);
    expect(bodyText(quarantineDom)).toContain('Stored safety data could not be trusted and was set aside unchanged. Nothing was repaired or guessed.');
    expect(bodyText(quarantineDom)).toContain('संग्रहित सुरक्षा डेटा भरोसेमंद नहीं पाया गया और उसे बिना बदले अलग रख दिया गया। कुछ भी सुधारा या अनुमानित नहीं किया गया।');
    expect(bodyText(quarantineDom)).not.toContain('An attempt is still unresolved');

    const orphanHarness = makePopupHarness({ reply: fixedResponse('preview-current-page', 'unresolved-orphaned') });
    const orphanDom = await loadPopup(orphanHarness);
    await consent(orphanDom, orphanHarness);
    expect(bodyText(orphanDom)).toContain('An attempt is still unresolved');
    expect(bodyText(orphanDom)).not.toContain('Stored safety data could not be trusted');
  });

  it('disarms detached Clear and reset controls after a terminal render', async () => {
    const clearHarness = makePopupHarness({
      reply: (request: unknown) => {
        const command = (request as { command: string }).command;
        if (command === 'preview-current-page') return stagedResponse('preview-current-page');
        return fixedResponse('clear-staged-fields', 'empty');
      },
    });
    const clearDom = await loadPopup(clearHarness);
    await consent(clearDom, clearHarness);
    const clearButton = buttonByText(clearDom, 'Clear prepared fields');
    clearButton.click();
    await settle();
    expect(heading(clearDom).textContent).toContain('Nothing is prepared');
    clearHarness.calls.length = 0;
    clearButton.click();
    await settle();
    expect(clearHarness.calls, 'detached Clear must be inert').toEqual([]);

    const resetHarness = makePopupHarness({
      reply: (request: unknown) => {
        const command = (request as { command: string }).command;
        if (command === 'preview-current-page') return fixedResponse('preview-current-page', 'quarantined');
        return fixedResponse('reset-for-device-owner', 'empty');
      },
    });
    const resetDom = await loadPopup(resetHarness);
    await consent(resetDom, resetHarness);
    const resetButton = buttonByText(resetDom, 'reset device state');
    resetButton.click();
    await settle();
    expect(heading(resetDom).textContent).toContain('Nothing is prepared');
    resetHarness.calls.length = 0;
    resetButton.click();
    await settle();
    expect(resetHarness.calls, 'detached reset must be inert').toEqual([]);
  });
});
