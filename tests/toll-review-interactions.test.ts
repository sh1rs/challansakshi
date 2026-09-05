// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TollSakshiApp from '../components/public-beta/TollSakshiApp';

const roots: ReturnType<typeof createRoot>[] = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(synthetic = false): HTMLElement {
  const host: HTMLElement = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(createElement<NonNullable<Parameters<typeof TollSakshiApp>[0]>>(TollSakshiApp, { synthetic })));
  return host;
}

function start(host: HTMLElement) {
  const control = [...host.querySelectorAll<HTMLButtonElement>('button')]
    .find(button => button.textContent?.includes('Start transaction check'));
  expect(control).toBeDefined();
  act(() => control!.click());
}

function recordSource(host: HTMLElement): HTMLSelectElement {
  const control = host.querySelector('#issuer');
  if (!(control instanceof HTMLSelectElement)) throw new Error('Expected an official record source selector');
  return control;
}

describe('FASTag real and demo entry boundaries', () => {
  it('does not accept start or fixture clicks until client event handlers are ready', () => {
    const host = document.createElement('div');
    host.innerHTML = renderToString(createElement<NonNullable<Parameters<typeof TollSakshiApp>[0]>>(TollSakshiApp, { synthetic: true }));
    expect(host.querySelector('main')?.hasAttribute('inert')).toBe(true);
    const startButton = [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Start transaction check'));
    expect(startButton?.disabled).toBe(true);
    const mounted = mount(true);
    expect(mounted.querySelector('main')?.hasAttribute('inert')).toBe(false);
    start(mounted);
    expect(recordSource(mounted).value).toBe('Demo Bank');
  });

  it('offers only the citizen workflow and starts with unconfirmed, empty official records', () => {
    const host = mount();
    const startPanel = host.querySelector('[aria-labelledby="toll-start-title"]')!;
    expect([...startPanel.querySelectorAll('button')].filter(button => /fictional|synthetic|demo/i.test(button.textContent ?? ''))).toEqual([]);
    start(host);
    expect(host.querySelector<HTMLInputElement>('#tagSuffix')?.value).toBe('');
    expect(recordSource(host).value).toBe('');
    expect([...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].every(input => !input.checked)).toBe(true);
  });

  it('opens explicit demo mode with a labelled fixture and preserves its fictional transaction on start', () => {
    const host = mount(true);
    expect([...host.querySelectorAll('[role="status"]')].some(status => status.textContent?.includes('SYNTHETIC FIXTURE — NOT A REAL TRANSACTION.'))).toBe(true);
    const fixture = [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('SYNTHETIC'));
    expect(fixture).toBeDefined();
    start(host);
    expect(recordSource(host).value).toBe('Demo Bank');
    expect(host.querySelector<HTMLInputElement>('#tagSuffix')?.value).toHaveLength(4);
    expect(host.textContent).toContain('SYNTHETIC FIXTURE — NOT A REAL TRANSACTION.');
  });

  it('offers the next step before the detailed comparison and opens the official-route packet', () => {
    const host = mount(true);
    start(host);
    const compare = [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Check what agrees and conflicts'));
    expect(compare).toBeDefined();
    act(() => compare!.click());
    const next = [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Check evidence and official route'));
    const map = host.querySelector('[role="table"][aria-label="Relevant transaction checks"]');
    expect(next).toBeDefined();
    expect(map).not.toBeNull();
    expect(next!.compareDocumentPosition(map!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => next!.click());
    expect(host.querySelector('#official-route-title')).not.toBeNull();
    expect(host.querySelector('#preparation-note-title')).not.toBeNull();
  });
});

it('runs the real FASTag journey in Hindi with translated results and evidence explanations', () => {
  const host = mount();
  const select = (selector: string, value: string) => {
    const node = host.querySelector(selector) as unknown as HTMLSelectElement;
    expect(node).not.toBeNull();
    act(() => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(node, value); node.dispatchEvent(new Event('change', { bubbles: true })); });
  };
  const press = (text: string) => {
    const node = [...host.querySelectorAll('button')].find(button => button.textContent?.includes(text));
    expect(node, text).toBeDefined(); act(() => node!.click());
  };
  select('select[aria-label="Display language"]', 'hi');
  expect(host.querySelector('h1')?.textContent).toBe('FASTag की कटौती समझें');
  press('लेन-देन जाँच शुरू करें');
  select('#concern', 'unrecognised'); select('#issuer', 'Bank / issuer app');
  const check = (text: string) => {
    const label = [...host.querySelectorAll('label')].find(node => node.textContent?.includes(text));
    expect(label, text).toBeDefined(); act(() => label!.querySelector('input')!.click());
  };
  check('मैंने यह डेबिट ऊपर चुनी'); check('मैंने इन अंतिम प्रविष्टियों');
  press('देखें क्या मेल खाता');
  expect(host.textContent).toContain('आप क्रॉसिंग नहीं पहचानते — जारीकर्ता से सबूत जाँचें');
  expect(host.textContent).not.toContain('Unrecognised by citizen');
  expect(host.querySelector('[role="table"]')?.textContent).not.toMatch(/not-supplied|unknown|verify official/);
  press('सबूत और आधिकारिक रास्ता देखें');
  expect(host.textContent).toContain('आधिकारिक खाते का लेन-देन रिकॉर्ड');
  expect(host.textContent).toContain('स्वतंत्र रूप से खोली आधिकारिक खाता सेवा');
  expect(host.textContent).not.toContain('Official account transaction record');
  expect(mount(true).querySelector('select[aria-label="Display language"]')).toBeNull();
});
