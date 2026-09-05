// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MessageSafetyCheck from '../components/public-beta/MessageSafetyCheck';
import ReplyReview from '../components/public-beta/ReplyReview';
const roots: ReturnType<typeof createRoot>[] = [];
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { roots.splice(0).forEach(root => act(() => root.unmount())); document.body.replaceChildren(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function mount(component: typeof MessageSafetyCheck) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host); roots.push(root); act(() => root.render(createElement(component))); return host;
}
function enter(host: HTMLElement, selector: string, value: string) {
  const node = host.querySelector(selector)! as unknown as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
function press(host: HTMLElement, label: string) {
  const button = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === label)!;
  expect(button, label).toBeDefined(); act(() => button.click());
}
it('checks pasted text without turning detected domains into navigable links and invalidates on edits', () => {
  const host = mount(MessageSafetyCheck);
  enter(host, '#message-body', 'Install https://evil.example/RTO.apk and enter OTP immediately.');
  press(host, 'Check message');
  expect(host.querySelector('[data-message-result]')?.textContent).toContain('Pause and verify');
  expect(host.querySelector('a[href*="evil.example"]')).toBeNull();
  enter(host, '#message-body', 'A different message');
  expect(host.querySelector('[data-message-result]')).toBeNull();
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(host.querySelector<HTMLTextAreaElement>('#message-body')!.value).toBe('');
});
it('clears message input and result after inactivity', () => {
  vi.useFakeTimers(); const host = mount(MessageSafetyCheck);
  enter(host, '#message-body', 'Your secret message'); press(host, 'Check message');
  act(() => vi.advanceTimersByTime(10 * 60 * 1000));
  expect(host.querySelector<HTMLTextAreaElement>('#message-body')!.value).toBe('');
  expect(host.querySelector('[data-message-result]')).toBeNull();
});
it('requires a reviewed source link, gates download behind private-device selection and invalidates changed evidence', () => {
  const host = mount(ReplyReview);
  enter(host, '#reply-point-1', 'Was my photo checked?');
  enter(host, '#reply-body', 'The photo was checked.');
  const reply = host.querySelector<HTMLTextAreaElement>('#reply-body')!;
  act(() => { reply.focus(); reply.setSelectionRange(0, 22); reply.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', shiftKey: true, bubbles: true })); });
  press(host, 'Link selected passage to point 1');
  enter(host, '#reply-status-1', 'addressed');
  press(host, 'Prepare my follow-up note');
  expect(host.querySelector('[data-reply-note]')?.textContent).toContain('The photo was checked.');
  expect(host.querySelector('[data-reply-download]')).toBeNull();
  press(host, 'My private device');
  expect(host.querySelector('[data-reply-download]')).not.toBeNull();
  press(host, 'Shared device');
  expect(host.querySelector('[data-reply-download]')).toBeNull();
  enter(host, '#reply-body', 'The reply has changed.');
  expect(host.querySelector('[data-reply-note]')).toBeNull();
  expect((host.querySelector('#reply-status-1') as unknown as HTMLSelectElement).value).toBe('unreviewed');
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(host.querySelector<HTMLTextAreaElement>('#reply-body')!.value).toBe('');
  expect(host.querySelector<HTMLTextAreaElement>('#reply-point-1')!.value).toBe('');
});

it('uses the source directory instead of bypassing official route expiry', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-03T00:00:00Z'));
  const host = mount(MessageSafetyCheck);
  expect(host.querySelector('a[href="/sources"]')).not.toBeNull();
  expect(host.querySelector('a[href^="https://echallan.parivahan.gov.in"]')).toBeNull();
});

it('keeps both input workspaces disabled until hydration accepts edits', () => {
  for (const component of [MessageSafetyCheck, ReplyReview]) {
    const ssr = document.createElement('div'); ssr.innerHTML = renderToString(createElement(component));
    expect(ssr.querySelector('main > fieldset')?.hasAttribute('disabled')).toBe(true);
    const hydrated = mount(component);
    expect(hydrated.querySelector('main > fieldset')?.hasAttribute('disabled')).toBe(false);
  }
});
