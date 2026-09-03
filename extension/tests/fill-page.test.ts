import { JSDOM, type DOMWindow } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { ExtensionHandoffEnvelope } from '../../lib/extension-handoff-contract';
import { SYNTHETIC_EXTENSION_FIXTURE } from '../../lib/synthetic-extension-fixture-contract';
import {
  buildDestinationFillPlan,
  buildDestinationPreviewPlan,
  selectedDestinationAdapterRegistry,
} from '../src/destination-adapters';
import { getProductionDisabledDestinationAdapters } from '../src/destination-adapters-production';
import {
  preflightOrFillDestination,
  validateDestinationFillInjectionResult,
  validateDestinationPreviewInjectionResult,
  validateDestinationRepreflightInjectionResult,
  type DestinationInjectionPlanV1,
} from '../src/fill-page';

const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
const effectiveExpiresAtMs = nowMs + 300_000;
const operationNotAfterMs = nowMs + 30_000;
const attemptId = '00112233445566778899aabbccddeeff';

const envelope = Object.freeze({
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'synthetic',
  packId: 'ffeeddccbbaa99887766554433221100',
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
  issuedAt: '2026-09-03T12:00:00.000Z',
  expiresAt: '2026-09-03T12:05:00.000Z',
  routeKey: 'synthetic-fixture',
  issueCode: 'four-wheeler-on-two-wheeler',
}) satisfies ExtensionHandoffEnvelope;

function buildPreviewPlan(): DestinationInjectionPlanV1 {
  const result = buildDestinationPreviewPlan({
    envelope,
    effectiveExpiresAtMs,
    operationNotAfterMs,
  });
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error('Synthetic preview plan was not built.');
  return result.plan;
}

function buildFillPlan(): DestinationInjectionPlanV1 {
  const result = buildDestinationFillPlan({
    envelope,
    effectiveExpiresAtMs,
    operationNotAfterMs,
    attemptId,
  });
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error('Synthetic fill plan was not built.');
  return result.plan;
}

function fixtureMarkup(): string {
  const fixture = SYNTHETIC_EXTENSION_FIXTURE.destination;
  return `<!doctype html><body>
    <form id="${fixture.form.id}" name="${fixture.form.name}" method="${fixture.form.method}" action="${fixture.form.action}" ${fixture.form.markerAttribute}="${fixture.form.markerValue}">
      <section ${fixture.category.containerAttribute}="${fixture.category.containerValue}">
        <label for="${fixture.category.id}">${fixture.category.label}</label>
        <select id="${fixture.category.id}" name="${fixture.category.name}">
          <option value="${fixture.category.options[0].value}">${fixture.category.options[0].label}</option>
          <option value="${fixture.category.options[1].value}">${fixture.category.options[1].label}</option>
        </select>
      </section>
      <section ${fixture.description.containerAttribute}="${fixture.description.containerValue}">
        <label for="${fixture.description.id}">${fixture.description.label}</label>
        <textarea id="${fixture.description.id}" name="${fixture.description.name}" minlength="${fixture.description.minLength}" maxlength="${fixture.description.maxLength}" required></textarea>
      </section>
      <section>
        ${fixture.protectedControls.map((control) => control.element === 'button'
          ? `<button id="${control.id}" name="${control.name}" type="${control.type}">${control.label}</button>`
          : control.type === 'checkbox'
            ? `<input id="${control.id}" name="${control.name}" type="checkbox">`
            : `<input id="${control.id}" name="${control.name}" type="${control.type}" value="${'initialValue' in control ? control.initialValue : ''}">`).join('')}
      </section>
    </form>
  </body>`;
}

function createFixtureDom(): JSDOM {
  const dom = new JSDOM(fixtureMarkup(), {
    url: SYNTHETIC_EXTENSION_FIXTURE.destination.url,
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  dom.window.Date.now = () => nowMs;
  Object.defineProperty(dom.window.Element.prototype, 'getClientRects', {
    configurable: true,
    value() {
      return [{ x: 0, y: 0, left: 0, top: 0, right: 120, bottom: 24, width: 120, height: 24 }];
    },
  });
  return dom;
}

async function executeInDom(
  dom: JSDOM,
  plan: unknown,
): Promise<unknown> {
  const executable = dom.window.eval(`(${Function.prototype.toString.call(preflightOrFillDestination)})`) as (
    value: unknown,
  ) => Promise<unknown>;
  const isolatedWorldPlan = dom.window.JSON.parse(JSON.stringify(plan)) as unknown;
  return JSON.parse(JSON.stringify(await executable(isolatedWorldPlan))) as unknown;
}

function category(dom: JSDOM): HTMLSelectElement {
  const value = dom.window.document.getElementById(SYNTHETIC_EXTENSION_FIXTURE.destination.category.id);
  if (!(value instanceof dom.window.HTMLSelectElement)) throw new Error('Missing category fixture.');
  return value as unknown as HTMLSelectElement;
}

function description(dom: JSDOM): HTMLTextAreaElement {
  const value = dom.window.document.getElementById(SYNTHETIC_EXTENSION_FIXTURE.destination.description.id);
  if (!(value instanceof dom.window.HTMLTextAreaElement)) throw new Error('Missing description fixture.');
  return value as unknown as HTMLTextAreaElement;
}

describe('compile-time destination adapters and plan builders', () => {
  it('builds only the frozen enabled synthetic adapter and selector-free disabled official identities', () => {
    expect(selectedDestinationAdapterRegistry).toHaveLength(1);
    expect(selectedDestinationAdapterRegistry[0]).toMatchObject({
      schema: 'challansakshi.destination-adapter/v1',
      id: 'synthetic-fixture',
      routeKey: 'synthetic-fixture',
      adapterContractVersion: 'challansakshi.adapter-contract/v1',
      routeRegistryVersion: 'challansakshi.official-routes/v1',
      adapterRevision: 'challansakshi.synthetic-destination/v1',
      releaseState: 'synthetic',
      enabled: true,
      supportedFields: ['category', 'description'],
      evidenceReference: 'tests/synthetic-extension-fixture-contract.test.ts',
      verifier: 'automated-synthetic-fixture-contract',
      legalStatus: 'synthetic-fixture-only',
      lastVerifiedAt: '2026-09-03T00:00:00.000Z',
      expiresAt: '2026-10-03T00:00:00.000Z',
    });
    expect(Object.isFrozen(selectedDestinationAdapterRegistry)).toBe(true);
    expect(Object.isFrozen(selectedDestinationAdapterRegistry[0])).toBe(true);

    const disabled = getProductionDisabledDestinationAdapters();
    expect(disabled).toEqual([
      {
        schema: 'challansakshi.destination-adapter/v1',
        id: 'legacy-national-grievance',
        routeKey: 'legacy',
        adapterContractVersion: 'challansakshi.adapter-contract/v1',
        releaseState: 'internal-disabled',
        enabled: false,
        supportedFields: [],
        reason: 'verification-evidence-missing',
        destination: {
          protocol: 'https:', hostname: 'echallan.parivahan.gov.in', port: '', pathname: '/gsticket',
        },
      },
      {
        schema: 'challansakshi.destination-adapter/v1',
        id: 'nextgen-national-grievance',
        routeKey: 'nextgen',
        adapterContractVersion: 'challansakshi.adapter-contract/v1',
        releaseState: 'internal-disabled',
        enabled: false,
        supportedFields: [],
        reason: 'verification-evidence-missing',
        destination: {
          protocol: 'https:', hostname: 'echallan.parivahan.nic.in', port: '', pathname: '/grievance',
        },
      },
    ]);
    for (const adapter of disabled) {
      expect(Object.keys(adapter)).not.toContain('expectedForm');
      expect(Object.keys(adapter)).not.toContain('structuralFingerprint');
      expect(JSON.stringify(adapter)).not.toMatch(/selector|option|setter|fieldIds|injection-plan/);
    }
  });

  it('emits exact closed preview and fill plan key order without widening reviewed fields', () => {
    const preview = buildPreviewPlan();
    const fill = buildFillPlan();

    expect(Object.keys(preview)).toEqual([
      'schema', 'operation', 'adapterId', 'adapterContractVersion', 'routeRegistryVersion',
      'adapterRevision', 'expectedLocation', 'expectedForm', 'fields', 'structuralFingerprint',
      'dispatchedEvents', 'effectiveExpiresAtMs', 'adapterExpiresAtMs', 'operationNotAfterMs',
      'values',
    ]);
    expect(preview).toMatchObject({
      schema: 'challansakshi.destination-injection-plan/v1',
      operation: 'preview',
      adapterId: 'synthetic-fixture',
      adapterRevision: 'challansakshi.synthetic-destination/v1',
      fields: ['category', 'description'],
      dispatchedEvents: [],
      effectiveExpiresAtMs,
      adapterExpiresAtMs: Date.parse('2026-10-03T00:00:00.000Z'),
      operationNotAfterMs,
      values: null,
    });
    expect(Object.hasOwn(preview, 'attemptId')).toBe(false);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(Object.isFrozen(preview.expectedLocation)).toBe(true);
    expect(Object.isFrozen(preview.expectedForm)).toBe(true);
    expect(Object.isFrozen(preview.fields)).toBe(true);
    expect(Object.isFrozen(preview.structuralFingerprint)).toBe(true);

    expect(Object.keys(fill)).toEqual([
      'schema', 'operation', 'adapterId', 'adapterContractVersion', 'routeRegistryVersion',
      'adapterRevision', 'expectedLocation', 'expectedForm', 'fields', 'structuralFingerprint',
      'dispatchedEvents', 'effectiveExpiresAtMs', 'adapterExpiresAtMs', 'operationNotAfterMs',
      'attemptId', 'values',
    ]);
    expect(fill).toMatchObject({
      operation: 'fill',
      fields: ['category', 'description'],
      attemptId,
      values: {
        category: '4 Wheeler Challan On 2 Wheeler',
        description: envelope.description,
      },
    });
    expect(Object.keys(fill.values ?? {})).toEqual(['category', 'description']);
    expect(Object.isFrozen(fill)).toBe(true);
    expect(Object.isFrozen(fill.values)).toBe(true);

    const unsupported = buildDestinationFillPlan({
      envelope: { ...envelope, issueCode: 'wrong-evidence' },
      effectiveExpiresAtMs,
      operationNotAfterMs,
      attemptId,
    });
    expect(unsupported).toEqual({ status: 'unsupported' });

    let getterCalls = 0;
    const hostileEnvelope = {};
    Object.defineProperty(hostileEnvelope, 'mode', {
      enumerable: true,
      get() { getterCalls += 1; return 'synthetic'; },
    });
    expect(buildDestinationPreviewPlan({
      envelope: hostileEnvelope,
      effectiveExpiresAtMs,
      operationNotAfterMs,
    })).toEqual({ status: 'rejected' });
    expect(getterCalls).toBe(0);
    expect(buildDestinationPreviewPlan({
      envelope,
      effectiveExpiresAtMs: Date.parse('2026-10-04T00:00:00.000Z'),
      operationNotAfterMs: Date.parse('2026-10-03T00:00:00.001Z'),
    })).toEqual({ status: 'rejected' });
  });
});

describe('self-contained destination preview and fill', () => {
  it('returns a value-free preview and performs no mutation or event dispatch', async () => {
    const dom = createFixtureDom();
    const before = fixtureMarkup();
    const events: string[] = [];
    for (const name of ['input', 'change', 'blur', 'keydown', 'submit', 'click']) {
      dom.window.document.addEventListener(name, () => events.push(name), true);
    }

    const result = await executeInDom(dom, buildPreviewPlan());
    expect(result).toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'preview',
      status: 'ready',
      fieldIds: ['category', 'description'],
    });
    expect(JSON.stringify(result)).not.toContain(envelope.description);
    expect(JSON.stringify(result)).not.toContain('4 Wheeler Challan On 2 Wheeler');
    expect(category(dom).value).toBe('');
    expect(description(dom).value).toBe('');
    expect(events).toEqual([]);
    expect(before).toContain(SYNTHETIC_EXTENSION_FIXTURE.destination.form.id);
  });

  it('preflights both fields before setting through native prototypes and dispatches no event', async () => {
    const dom = createFixtureDom();
    const events: string[] = [];
    const forbiddenCalls: string[] = [];
    for (const name of [
      'input', 'change', 'blur', 'keydown', 'keyup', 'keypress', 'submit', 'click',
      'challansakshi-fixture-custom', 'challansakshi-fixture-autosave',
    ]) dom.window.document.addEventListener(name, () => events.push(name), true);

    const dispatch = dom.window.EventTarget.prototype.dispatchEvent;
    dom.window.EventTarget.prototype.dispatchEvent = function instrumented(event: Event) {
      forbiddenCalls.push(`dispatch:${event.type}`);
      return dispatch.call(this, event);
    };
    dom.window.HTMLFormElement.prototype.submit = () => { forbiddenCalls.push('submit'); };
    dom.window.HTMLFormElement.prototype.requestSubmit = () => { forbiddenCalls.push('requestSubmit'); };
    dom.window.fetch = (() => {
      forbiddenCalls.push('fetch');
      return Promise.reject(new Error('forbidden'));
    }) as typeof dom.window.fetch;
    Object.defineProperty(dom.window.Document.prototype, 'cookie', {
      configurable: true,
      get() { forbiddenCalls.push('cookie'); return ''; },
      set() { forbiddenCalls.push('cookie'); },
    });
    for (const storageName of ['localStorage', 'sessionStorage'] as const) {
      Object.defineProperty(dom.window, storageName, {
        configurable: true,
        get() { forbiddenCalls.push(storageName); throw new Error('forbidden'); },
      });
    }
    const originalInputValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value');
    if (!originalInputValue?.get) throw new Error('Missing input getter.');
    Object.defineProperty(dom.window.HTMLInputElement.prototype, 'value', {
      configurable: true,
      get() {
        forbiddenCalls.push('protected-input-value');
        return originalInputValue.get?.call(this) as string;
      },
      set: originalInputValue.set,
    });

    const result = await executeInDom(dom, buildFillPlan());
    expect(result).toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'fill',
      attemptId,
      fieldIds: ['category', 'description'],
      status: 'complete',
    });
    expect(category(dom).value).toBe('4 Wheeler Challan On 2 Wheeler');
    expect(description(dom).value).toBe(envelope.description);
    expect(events).toEqual([]);
    expect(forbiddenCalls).toEqual([]);
  });

  it.each([
    ['https://127.0.0.1:3000/demo/extension-fixture/destination', 'location-mismatch'],
    ['http://127.0.0.1/demo/extension-fixture/destination', 'location-mismatch'],
    ['http://127.0.0.1:3001/demo/extension-fixture/destination', 'location-mismatch'],
    ['http://localhost:3000/demo/extension-fixture/destination', 'location-mismatch'],
    ['http://user:password@127.0.0.1:3000/demo/extension-fixture/destination', 'location-mismatch'],
    ['http://127.0.0.1:3000/demo/extension-fixture/source', 'location-mismatch'],
    ['http://127.0.0.1:3000/demo/extension-fixture/destination?extra=1', 'location-mismatch'],
    ['http://127.0.0.1:3000/demo/extension-fixture/destination#fragment', 'location-mismatch'],
  ])('rejects location drift at %s', async (url, code) => {
    const dom = new JSDOM(fixtureMarkup(), { url, pretendToBeVisual: true, runScripts: 'outside-only' });
    dom.window.Date.now = () => nowMs;
    Object.defineProperty(dom.window.Element.prototype, 'getClientRects', {
      configurable: true,
      value: () => [{ width: 1, height: 1 }],
    });
    await expect(executeInDom(dom, buildPreviewPlan())).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'preview',
      status: 'mismatch',
      code,
    });
  });

  it('rejects an iframe and a hidden document before inspecting form fields', async () => {
    const parent = createFixtureDom();
    const iframe = parent.window.document.createElement('iframe');
    parent.window.document.body.append(iframe);
    const frame = iframe.contentWindow as unknown as DOMWindow | null;
    if (!frame) throw new Error('Missing child frame.');
    frame.Date.now = () => nowMs;
    const frameImplementation = frame.eval(`(${Function.prototype.toString.call(preflightOrFillDestination)})`) as (
      value: unknown,
    ) => Promise<unknown>;
    await expect(frameImplementation(frame.JSON.parse(JSON.stringify(buildPreviewPlan())) as unknown)).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'preview',
      status: 'mismatch',
      code: 'not-top-frame',
    });

    const hidden = createFixtureDom();
    Object.defineProperty(hidden.window.Document.prototype, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    await expect(executeInDom(hidden, buildPreviewPlan())).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'preview',
      status: 'mismatch',
      code: 'document-not-visible',
    });
  });

  it('rejects globally duplicated target IDs and associated labels without mutating', async () => {
    const dom = createFixtureDom();
    const duplicateId = dom.window.document.createElement('input');
    duplicateId.id = SYNTHETIC_EXTENSION_FIXTURE.destination.category.id;
    duplicateId.value = 'protected duplicate';
    const duplicateLabel = dom.window.document.createElement('label');
    duplicateLabel.htmlFor = SYNTHETIC_EXTENSION_FIXTURE.destination.category.id;
    duplicateLabel.textContent = SYNTHETIC_EXTENSION_FIXTURE.destination.category.label;
    dom.window.document.body.append(duplicateId, duplicateLabel);

    await expect(executeInDom(dom, buildPreviewPlan())).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'preview',
      status: 'mismatch',
      code: 'target-mismatch',
    });
    expect(category(dom).value).toBe('');
    expect(description(dom).value).toBe('');
    expect(duplicateId.value).toBe('protected duplicate');
  });

  it('does not enumerate unrelated select or textarea controls during exact-ID resolution', async () => {
    const dom = createFixtureDom();
    const unrelatedSelect = dom.window.document.createElement('select');
    unrelatedSelect.id = 'unrelated-select';
    unrelatedSelect.append(dom.window.document.createElement('option'));
    const unrelatedTextarea = dom.window.document.createElement('textarea');
    unrelatedTextarea.id = 'unrelated-textarea';
    dom.window.document.querySelector('form')?.append(unrelatedSelect, unrelatedTextarea);
    let unrelatedIdReads = 0;
    const nativeGetAttribute = dom.window.Element.prototype.getAttribute;
    dom.window.Element.prototype.getAttribute = function instrumentedGetAttribute(name: string) {
      if ((this === unrelatedSelect || this === unrelatedTextarea) && name === 'id') unrelatedIdReads += 1;
      return nativeGetAttribute.call(this, name);
    };

    await expect(executeInDom(dom, buildPreviewPlan())).resolves.toMatchObject({
      operation: 'preview', status: 'ready',
    });
    expect(unrelatedIdReads).toBe(0);
  });

  it('rejects a plan that attempts to authorize a read-only description contract', async () => {
    const dom = createFixtureDom();
    description(dom).readOnly = true;
    const plan = JSON.parse(JSON.stringify(buildPreviewPlan())) as DestinationInjectionPlanV1;
    (plan.structuralFingerprint as unknown as unknown[])[63] = true;

    await expect(executeInDom(dom, plan)).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      status: 'rejected',
      code: 'invalid-plan',
    });
    expect(category(dom).value).toBe('');
    expect(description(dom).value).toBe('');
  });

  it('rejects form, topology, target, native-blankness, and option drift before any mutation', async () => {
    const cases: Array<readonly [string, (dom: JSDOM) => void, string]> = [
      ['form method', (dom) => dom.window.document.querySelector('form')?.setAttribute('method', 'get'), 'form-mismatch'],
      ['form action', (dom) => dom.window.document.querySelector('form')?.setAttribute('action', '/elsewhere'), 'form-mismatch'],
      ['form marker', (dom) => dom.window.document.querySelector('form')?.setAttribute(SYNTHETIC_EXTENSION_FIXTURE.destination.form.markerAttribute, 'v2'), 'form-mismatch'],
      ['duplicate form', (dom) => dom.window.document.body.append(dom.window.document.querySelector('form')!.cloneNode(true)), 'form-mismatch'],
      ['duplicate category', (dom) => category(dom).parentElement?.append(category(dom).cloneNode(true)), 'target-mismatch'],
      ['wrong category id', (dom) => { category(dom).id = 'changed-category'; }, 'target-mismatch'],
      ['wrong category name', (dom) => { category(dom).name = 'changedCategory'; }, 'target-mismatch'],
      ['wrong label', (dom) => { const label = dom.window.document.querySelector(`label[for="${SYNTHETIC_EXTENSION_FIXTURE.destination.category.id}"]`); if (label) label.textContent = 'Changed'; }, 'target-mismatch'],
      ['nested label', (dom) => { const label = dom.window.document.querySelector(`label[for="${SYNTHETIC_EXTENSION_FIXTURE.destination.description.id}"]`); if (label) { const wrapper = dom.window.document.createElement('div'); label.replaceWith(wrapper); wrapper.append(label); } }, 'target-mismatch'],
      ['outside container', (dom) => dom.window.document.querySelector('form')?.append(category(dom) as unknown as Node), 'target-mismatch'],
      ['wrong description tag', (dom) => { const input = dom.window.document.createElement('input'); input.id = SYNTHETIC_EXTENSION_FIXTURE.destination.description.id; input.name = SYNTHETIC_EXTENSION_FIXTURE.destination.description.name; description(dom).replaceWith(input); }, 'target-mismatch'],
      ['disabled category', (dom) => { category(dom).disabled = true; }, 'target-mismatch'],
      ['multiple category', (dom) => { category(dom).multiple = true; }, 'target-mismatch'],
      ['nonblank category', (dom) => { category(dom).value = '4 Wheeler Challan On 2 Wheeler'; }, 'target-not-blank'],
      ['space description', (dom) => { description(dom).value = ' '; }, 'target-not-blank'],
      ['newline description', (dom) => { description(dom).value = '\n'; }, 'target-not-blank'],
      ['nbsp description', (dom) => { description(dom).value = '\u00a0'; }, 'target-not-blank'],
      ['zero width description', (dom) => { description(dom).value = '\u200b'; }, 'target-not-blank'],
      ['readonly description', (dom) => { description(dom).readOnly = true; }, 'target-mismatch'],
      ['minlength drift', (dom) => description(dom).setAttribute('minlength', '2'), 'target-mismatch'],
      ['maxlength drift', (dom) => description(dom).setAttribute('maxlength', '499'), 'target-mismatch'],
      ['native minlength drift', (dom) => {
        const descriptor = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'minLength');
        Object.defineProperty(dom.window.HTMLTextAreaElement.prototype, 'minLength', {
          configurable: true,
          get: () => ((descriptor?.get?.call(description(dom)) as number) + 1),
          set: descriptor?.set,
        });
      }, 'target-mismatch'],
      ['required drift', (dom) => { description(dom).required = false; }, 'target-mismatch'],
      ['shadowed value', (dom) => { Object.defineProperty(description(dom), 'value', { configurable: true, value: '' }); }, 'target-mismatch'],
      ['zero selected options', (dom) => { category(dom).selectedIndex = -1; }, 'target-not-blank'],
      ['native selected index drift', (dom) => {
        const descriptor = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'selectedIndex');
        Object.defineProperty(dom.window.HTMLSelectElement.prototype, 'selectedIndex', {
          configurable: true,
          get: () => 1,
          set: descriptor?.set,
        });
      }, 'target-not-blank'],
      ['neutral value drift', (dom) => { category(dom).options[0]!.value = 'changed'; }, 'target-mismatch'],
      ['neutral label drift', (dom) => { category(dom).options[0]!.label = 'Changed'; }, 'target-mismatch'],
      ['neutral disabled', (dom) => { category(dom).options[0]!.disabled = true; }, 'target-mismatch'],
      ['neutral hidden', (dom) => { category(dom).options[0]!.hidden = true; }, 'target-mismatch'],
      ['neutral optgroup', (dom) => { const option = category(dom).options[0]!; const group = dom.window.document.createElement('optgroup'); option.parentNode?.insertBefore(group, option); group.append(option); }, 'target-mismatch'],
      ['mapped disabled', (dom) => { category(dom).options[1]!.disabled = true; }, 'target-mismatch'],
      ['mapped hidden', (dom) => { category(dom).options[1]!.hidden = true; }, 'target-mismatch'],
      ['mapped optgroup', (dom) => { const option = category(dom).options[1]!; const group = dom.window.document.createElement('optgroup'); option.parentNode?.insertBefore(group, option); group.append(option); }, 'target-mismatch'],
      ['duplicate mapped option', (dom) => category(dom).append(category(dom).options[1]!.cloneNode(true)), 'target-mismatch'],
      ['mapped index drift', (dom) => { const option = dom.window.document.createElement('option'); option.value = 'other'; option.label = 'Other'; category(dom).insertBefore(option, category(dom).options[1]!); }, 'target-mismatch'],
      ['hidden container', (dom) => { const parent = category(dom).parentElement; if (parent) parent.hidden = true; }, 'target-mismatch'],
      ['zero opacity label', (dom) => { const label = dom.window.document.querySelector(`label[for="${SYNTHETIC_EXTENSION_FIXTURE.destination.category.id}"]`) as HTMLElement | null; if (label) label.style.opacity = '0'; }, 'target-mismatch'],
      ['missing select setter', (dom) => {
        const descriptor = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value');
        Object.defineProperty(dom.window.HTMLSelectElement.prototype, 'value', {
          configurable: true,
          get: descriptor?.get,
          set: undefined,
        });
      }, 'setter-unavailable'],
      ['zero area target', (dom) => {
        Object.defineProperty(dom.window.Element.prototype, 'getClientRects', {
          configurable: true,
          value(this: Element) {
            return this === category(dom) ? [] : [{ width: 1, height: 1 }];
          },
        });
      }, 'target-mismatch'],
    ];
    for (const [name, mutate, code] of cases) {
      const dom = createFixtureDom();
      const categoryNode = category(dom);
      const descriptionNode = description(dom);
      mutate(dom);
      const beforeCategory = categoryNode.value;
      const beforeDescription = descriptionNode.value;
      const result = await executeInDom(dom, buildPreviewPlan());
      expect(result, name).toEqual({
        schema: 'challansakshi.destination-operation-result/v1',
        operation: 'preview',
        status: 'mismatch',
        code,
      });
      expect(categoryNode.value, name).toBe(beforeCategory);
      expect(descriptionNode.value, name).toBe(beforeDescription);

      const fillDom = createFixtureDom();
      const fillCategoryNode = category(fillDom);
      const fillDescriptionNode = description(fillDom);
      mutate(fillDom);
      const fillCategoryBefore = fillCategoryNode.value;
      const fillDescriptionBefore = fillDescriptionNode.value;
      await expect(executeInDom(fillDom, buildFillPlan()), name).resolves.toMatchObject({
        schema: 'challansakshi.destination-operation-result/v1',
        operation: 'fill',
        attemptId,
        fieldIds: ['category', 'description'],
        status: 'indeterminate',
      });
      expect(fillCategoryNode.value, name).toBe(fillCategoryBefore);
      expect(fillDescriptionNode.value, name).toBe(fillDescriptionBefore);
    }
  });

  it('fails malformed plans generically and makes deadline failures value-free', async () => {
    const preview = buildPreviewPlan();
    const malformed = [
      { ...preview, extra: true },
      { ...preview, operation: 'fill' },
      { ...preview, values: {} },
      { ...preview, fields: ['description', 'category'] },
      { ...preview, dispatchedEvents: ['change'] },
      { ...preview, adapterContractVersion: 'challansakshi.adapter-contract/v2' },
      { ...preview, routeRegistryVersion: 'challansakshi.official-routes/v2' },
      { ...preview, operationNotAfterMs: effectiveExpiresAtMs + 1 },
      { ...preview, structuralFingerprint: [...preview.structuralFingerprint, 'extra'] },
      Object.create({ ...preview }),
    ];
    for (const value of malformed) {
      await expect(executeInDom(createFixtureDom(), value)).resolves.toEqual({
        schema: 'challansakshi.destination-operation-result/v1',
        status: 'rejected',
        code: 'invalid-plan',
      });
    }

    const expired = { ...preview, operationNotAfterMs: 1 };
    await expect(executeInDom(createFixtureDom(), expired)).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'preview',
      status: 'mismatch',
      code: 'deadline-reached',
    });
  });

  it('reports indeterminate before any setter and partial after the first setter without retrying', async () => {
    const indeterminateDom = createFixtureDom();
    const fill = buildFillPlan();
    const invalidMapped = JSON.parse(JSON.stringify(fill)) as DestinationInjectionPlanV1;
    (invalidMapped.structuralFingerprint as unknown as unknown[])[36] = 'missing-mapped-value';
    await expect(executeInDom(indeterminateDom, invalidMapped)).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      status: 'rejected',
      code: 'invalid-plan',
    });

    const partialDom = createFixtureDom();
    const textareaDescriptor = Object.getOwnPropertyDescriptor(partialDom.window.HTMLTextAreaElement.prototype, 'value');
    if (!textareaDescriptor?.set) throw new Error('Missing textarea setter.');
    Object.defineProperty(partialDom.window.HTMLTextAreaElement.prototype, 'value', {
      configurable: true,
      get: textareaDescriptor.get,
      set() { throw new Error('synthetic setter failure'); },
    });
    await expect(executeInDom(partialDom, fill)).resolves.toEqual({
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'fill',
      attemptId,
      fieldIds: ['category', 'description'],
      status: 'partial',
    });
    expect(category(partialDom).value).toBe('4 Wheeler Challan On 2 Wheeler');
  });

  it('rejects synchronous deadline and node-replacement races without adopting replacements', async () => {
    const expiredBeforeSetter = createFixtureDom();
    let categoryReads = 0;
    const categoryDescriptor = Object.getOwnPropertyDescriptor(expiredBeforeSetter.window.HTMLSelectElement.prototype, 'value');
    if (!categoryDescriptor?.get || !categoryDescriptor.set) throw new Error('Missing select value contract.');
    Object.defineProperty(expiredBeforeSetter.window.HTMLSelectElement.prototype, 'value', {
      configurable: true,
      get() {
        categoryReads += 1;
        if (categoryReads === 2) expiredBeforeSetter.window.Date.now = () => operationNotAfterMs;
        return categoryDescriptor.get?.call(this) as string;
      },
      set: categoryDescriptor.set,
    });
    await expect(executeInDom(expiredBeforeSetter, buildFillPlan())).resolves.toMatchObject({
      operation: 'fill', attemptId, status: 'indeterminate',
    });
    expect(category(expiredBeforeSetter).value).toBe('');
    expect(description(expiredBeforeSetter).value).toBe('');

    const replacedBetweenSetters = createFixtureDom();
    const selectDescriptor = Object.getOwnPropertyDescriptor(replacedBetweenSetters.window.HTMLSelectElement.prototype, 'value');
    if (!selectDescriptor?.set) throw new Error('Missing select setter.');
    const replacements: HTMLTextAreaElement[] = [];
    Object.defineProperty(replacedBetweenSetters.window.HTMLSelectElement.prototype, 'value', {
      configurable: true,
      get: selectDescriptor.get,
      set(value: string) {
        selectDescriptor.set?.call(this, value);
        const original = description(replacedBetweenSetters);
        const replacement = original.cloneNode(true) as HTMLTextAreaElement;
        replacements.push(replacement);
        original.replaceWith(replacement as unknown as Node);
      },
    });
    await expect(executeInDom(replacedBetweenSetters, buildFillPlan())).resolves.toMatchObject({
      operation: 'fill', attemptId, status: 'partial',
    });
    expect(category(replacedBetweenSetters).value).toBe('4 Wheeler Challan On 2 Wheeler');
    expect(replacements[0]?.value).toBe('');

    const replacedAtReadback = createFixtureDom();
    replacedAtReadback.window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      const original = description(replacedAtReadback);
      const clone = original.cloneNode(true);
      original.replaceWith(clone);
      callback(nowMs);
      return 1;
    }) as typeof replacedAtReadback.window.requestAnimationFrame;
    await expect(executeInDom(replacedAtReadback, buildFillPlan())).resolves.toMatchObject({
      operation: 'fill', attemptId, status: 'partial',
    });
  });
});

describe('pure destination InjectionResult validators', () => {
  const ready = {
    schema: 'challansakshi.destination-operation-result/v1',
    operation: 'preview',
    status: 'ready',
    fieldIds: ['category', 'description'],
  } as const;
  const complete = {
    schema: 'challansakshi.destination-operation-result/v1',
    operation: 'fill',
    attemptId,
    fieldIds: ['category', 'description'],
    status: 'complete',
  } as const;

  it('accepts one top-frame ready preview and binds its 1-128 printable document ID', () => {
    expect(validateDestinationPreviewInjectionResult([
      { frameId: 0, documentId: 'document-A', result: ready },
    ])).toEqual({ status: 'accepted', documentId: 'document-A', result: ready });
    expect(validateDestinationRepreflightInjectionResult([
      { frameId: 0, documentId: 'document-A', result: ready },
    ], 'document-A')).toEqual({ status: 'accepted', documentId: 'document-A', result: ready });
  });

  it('accepts only the exact bound document and worker-issued fill attempt', () => {
    expect(validateDestinationFillInjectionResult([
      { frameId: 0, documentId: 'document-A', result: complete },
    ], 'document-A', attemptId)).toEqual({ status: 'accepted', documentId: 'document-A', result: complete });
    expect(validateDestinationFillInjectionResult([
      { frameId: 0, documentId: 'document-B', result: complete },
    ], 'document-A', attemptId)).toEqual({ status: 'rejected', reason: 'destination-document-mismatch' });
    expect(validateDestinationFillInjectionResult([
      { frameId: 0, documentId: 'document-A', result: { ...complete, attemptId: 'f'.repeat(32) } },
    ], 'document-A', attemptId)).toEqual({ status: 'rejected', reason: 'destination-fill-mismatch' });
  });

  it('rejects missing, extra, malformed, hostile, wrong-frame, and invalid document metadata', () => {
    const invalid = [
      [],
      [{ frameId: 0, documentId: 'document-A', result: ready }, { frameId: 0, documentId: 'document-A', result: ready }],
      [{ frameId: 1, documentId: 'document-A', result: ready }],
      [{ frameId: 0, documentId: '', result: ready }],
      [{ frameId: 0, documentId: 'contains whitespace', result: ready }],
      [{ frameId: 0, documentId: 'x'.repeat(129), result: ready }],
      Object.assign(Object.create(null), { 0: { frameId: 0, documentId: 'document-A', result: ready }, length: 1 }),
    ];
    for (const value of invalid) {
      expect(validateDestinationPreviewInjectionResult(value)).toEqual({
        status: 'rejected', reason: 'invalid-injection-result',
      });
    }
    expect(validateDestinationPreviewInjectionResult([
      { frameId: 0, documentId: 'document-A', result: { ...ready, extra: true } },
    ])).toEqual({ status: 'rejected', reason: 'destination-preview-mismatch' });
    const accessor = {};
    Object.defineProperty(accessor, 'frameId', { enumerable: true, get: () => 0 });
    Object.defineProperty(accessor, 'documentId', { enumerable: true, value: 'document-A' });
    Object.defineProperty(accessor, 'result', { enumerable: true, value: ready });
    expect(validateDestinationPreviewInjectionResult([accessor])).toEqual({
      status: 'rejected', reason: 'invalid-injection-result',
    });
  });

  it('rejects getter-backed field tuples without invoking their accessors', () => {
    let getterCalls = 0;
    const getterFieldIds = ['category', 'description'];
    for (const [index, value] of [['0', 'category'], ['1', 'description']] as const) {
      Object.defineProperty(getterFieldIds, index, {
        configurable: true,
        enumerable: true,
        get() { getterCalls += 1; return value; },
      });
    }
    expect(validateDestinationPreviewInjectionResult([
      { frameId: 0, documentId: 'document-A', result: { ...ready, fieldIds: getterFieldIds } },
    ])).toEqual({ status: 'rejected', reason: 'destination-preview-mismatch' });
    expect(validateDestinationFillInjectionResult([
      { frameId: 0, documentId: 'document-A', result: { ...complete, fieldIds: getterFieldIds } },
    ], 'document-A', attemptId)).toEqual({ status: 'rejected', reason: 'destination-fill-mismatch' });
    expect(getterCalls).toBe(0);

    const nonordinaryLength = ['category', 'description'];
    Object.defineProperty(nonordinaryLength, 'length', { writable: false });
    expect(validateDestinationPreviewInjectionResult([
      { frameId: 0, documentId: 'document-A', result: { ...ready, fieldIds: nonordinaryLength } },
    ])).toEqual({ status: 'rejected', reason: 'destination-preview-mismatch' });

    const hostileFields = new Proxy(['category', 'description'], {
      getPrototypeOf() { throw new Error('must fail closed'); },
    });
    expect(() => validateDestinationPreviewInjectionResult([
      { frameId: 0, documentId: 'document-A', result: { ...ready, fieldIds: hostileFields } },
    ])).not.toThrow();
    expect(validateDestinationPreviewInjectionResult([
      { frameId: 0, documentId: 'document-A', result: { ...ready, fieldIds: hostileFields } },
    ])).toEqual({ status: 'rejected', reason: 'destination-preview-mismatch' });
  });
});
