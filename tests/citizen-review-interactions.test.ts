// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CitizenReviewApp from '../components/public-beta/CitizenReviewApp';

const NOW = '2026-09-05T10:00:00.000Z';
const roots: ReturnType<typeof createRoot>[] = [];
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(NOW));
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:local-review-test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(window, 'print').mockImplementation(() => undefined);
});
afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function mount(initialNowIso = NOW) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host); roots.push(root);
  act(() => root.render(createElement<NonNullable<Parameters<typeof CitizenReviewApp>[0]>>(CitizenReviewApp, { initialNowIso })));
  return { host, root };
}
function click(host: HTMLElement, selector: string) {
  const control = host.querySelector<HTMLElement>(selector);
  expect(control, `Missing ${selector}`).not.toBeNull();
  act(() => control!.click());
}
function button(host: HTMLElement, text: string) {
  const control = [...host.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text);
  expect(control, `Missing button: ${text}`).toBeDefined();
  return control!;
}
function press(host: HTMLElement, text: string) { act(() => button(host, text).click()); }
function select(host: HTMLElement, selector: string, value: string) {
  const control = host.querySelector(selector);
  if (!(control instanceof HTMLSelectElement)) throw new Error(`Expected select: ${selector}`);
  act(() => { control.value = value; control.dispatchEvent(new Event('change', { bubbles: true })); });
}
function input(host: HTMLElement, selector: string, value: string) {
  const control = host.querySelector<HTMLInputElement>(selector);
  expect(control, `Missing ${selector}`).not.toBeNull();
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(control, value);
    control!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function mismatch(host: HTMLElement) {
  click(host, '#review-source-official-service');
  click(host, '#review-own-record-present');
  click(host, '#review-plate-different');
}
function selfResult(host: HTMLElement) {
  mismatch(host); press(host, 'I checked these answers — see my next step');
  expect(host.querySelector('main')?.getAttribute('data-review-phase')).toBe('resolve');
}
function privatePreparation(host: HTMLElement) {
  press(host, 'Prepare my checklist'); click(host, 'input[name="review-device"][value="private"]');
}

describe('rendered adaptive citizen review', () => {
  it('keeps direct source unselected and unknown-device exports unavailable until chosen', () => {
    const { host } = mount();
    expect(host.querySelector('#review-source-official-service:checked')).toBeNull();
    expect(host.querySelector('main')?.getAttribute('data-device-context')).toBe('unknown');
    expect(host.querySelector('a[data-official-lookup]')).not.toBeNull();
    selfResult(host); press(host, 'Prepare my checklist');
    expect([...host.querySelectorAll<HTMLButtonElement>('button')].filter(item => /^(Copy|Print|Download|Save a text)/.test(item.textContent?.trim() ?? '') && !item.disabled)).toEqual([]);
    expect(host.querySelector('#handoff-description')).toBeNull();
  });
  it('completes the whole aligned path with no photo upload', () => {
    const { host } = mount();
    for (const selector of ['#review-source-official-service', '#review-own-record-present', '#review-plate-match', '#review-vehicle-category-match', '#review-offence-visibility-appears-visible', '#review-timestamp-displayed', '#review-location-displayed']) click(host, selector);
    press(host, 'I checked these answers — see my next step');
    expect(host.querySelector('main')?.getAttribute('data-review-phase')).toBe('resolve');
    expect(host.textContent).toContain('The photo and vehicle record look alike');
  });
  it('retains confirmed facts when device and preparation metadata change in Resolve', () => {
    const { host } = mount(); selfResult(host); privatePreparation(host);
    select(host, '#review-jurisdiction', 'TN'); input(host, '#review-suffix', '1234');
    expect(host.querySelector('main')?.getAttribute('data-review-phase')).toBe('resolve');
    expect(host.textContent).toContain('Possible vehicle mismatch');
    expect(host.querySelector('#handoff-description')).not.toBeNull();
    click(host, 'input[name="review-device"][value="shared"]');
    expect(host.querySelector('main')?.getAttribute('data-review-phase')).toBe('resolve');
    expect([...host.querySelectorAll<HTMLButtonElement>('button')].filter(item => /^(Copy|Print|Download|Save a text)/.test(item.textContent?.trim() ?? '') && !item.disabled)).toEqual([]);
  });
  it('requires both helper confirmations and can then confirm the affected person field pack', () => {
    const { host } = mount(); mismatch(host);
    select(host, '#review-jurisdiction', 'TN');
    press(host, 'I am helping someone who is here'); press(host, 'I checked these entries as the helper');
    expect(host.querySelector('main')?.getAttribute('data-review-phase')).toBe('check');
    press(host, 'I am here and confirm these final answers'); privatePreparation(host);
    const group = host.querySelector('#handoff-role-heading')?.closest('section');
    expect(group).not.toBeNull();
    const checks = [...group!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(checks).toHaveLength(2);
    act(() => checks[0].click()); act(() => checks[1].click());
    expect(checks[1].checked).toBe(true);
    expect([...host.querySelectorAll<HTMLAnchorElement>('a')].some(link => link.href === 'https://echallan.parivahan.nic.in/grievance')).toBe(true);
  });
  it('does not record deferred clipboard success after an evidence edit', async () => {
    let resolveCopy!: () => void;
    vi.mocked(navigator.clipboard.writeText).mockImplementation(() => new Promise<void>(resolve => { resolveCopy = resolve; }));
    const { host } = mount(); selfResult(host); privatePreparation(host);
    press(host, 'Copy this summary');
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    press(host, 'Edit my answers');
    await act(async () => { resolveCopy(); await Promise.resolve(); });
    expect(host.querySelector('main')?.getAttribute('data-review-phase')).toBe('check');
    expect(host.textContent).not.toContain('Summary copied locally.');
  });
  it('invalidates a confirmed field pack after preparation metadata changes without losing the finding', () => {
    const { host } = mount(); selfResult(host); privatePreparation(host);
    select(host, '#review-jurisdiction', 'TN');
    const group = host.querySelector('#handoff-role-heading')?.closest('section');
    const confirmation = group?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(confirmation).toBeTruthy(); act(() => confirmation!.click());
    const packLink = () => [...host.querySelectorAll<HTMLAnchorElement>('a')].find(link => link.href === 'https://echallan.parivahan.nic.in/grievance');
    expect(packLink()).toBeDefined();
    input(host, '#review-offence', 'Helmet');
    expect(packLink()).toBeUndefined();
    expect(host.querySelector('main')?.getAttribute('data-review-phase')).toBe('resolve');
    expect(host.textContent).toContain('Possible vehicle mismatch');
    expect(host.querySelector('#handoff-role-heading')?.closest('section')?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false);
  });
  it.each(['Copy this summary', 'Save a text file', 'Print this summary'])('blocks %s at action-time expiry before the rendered timer refreshes', (action) => {
    vi.setSystemTime(new Date('2026-10-02T23:59:59.000Z'));
    const { host } = mount('2026-10-02T23:59:59.000Z'); selfResult(host); privatePreparation(host);
    vi.setSystemTime(new Date('2026-10-03T00:00:00.000Z'));
    press(host, action);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
  });
  it.each(['Copy this summary', 'Save a text file', 'Print this summary'])('keeps %s blocked on repeated clicks after expiry has rendered', (action) => {
    vi.setSystemTime(new Date('2026-10-02T23:59:59.000Z'));
    const { host } = mount('2026-10-02T23:59:59.000Z'); selfResult(host); privatePreparation(host);
    vi.setSystemTime(new Date('2026-10-03T00:00:00.000Z'));
    press(host, action);
    expect(host.querySelector('[data-official-lookup]')).toBeNull();
    press(host, action);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
  });
  it('renders no expired official href anywhere in deep preparation, including unresolved fallback', () => {
    vi.setSystemTime(new Date('2026-10-03T00:00:00.000Z'));
    const { host } = mount('2026-10-03T00:00:00.000Z'); selfResult(host); privatePreparation(host);
    const externalLinks = [...host.querySelectorAll<HTMLAnchorElement>('main a[href]')].filter(link => /^https?:/.test(link.getAttribute('href') ?? ''));
    expect(externalLinks.map(link => link.href)).toEqual([]);
  });
  it('clears the mounted review while a clipboard promise is pending without later DOM output', async () => {
    let resolveCopy!: () => void;
    vi.mocked(navigator.clipboard.writeText).mockImplementation(() => new Promise<void>(resolve => { resolveCopy = resolve; }));
    const { host, root } = mount(); selfResult(host); privatePreparation(host); press(host, 'Copy this summary');
    act(() => root.unmount()); roots.splice(roots.indexOf(root), 1);
    await act(async () => { resolveCopy(); await Promise.resolve(); });
    expect(host.childNodes).toHaveLength(0);
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
  });
});
