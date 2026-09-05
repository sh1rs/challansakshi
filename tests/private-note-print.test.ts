// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ReplyReview from '../components/public-beta/ReplyReview';

let root: ReturnType<typeof createRoot>;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.spyOn(window, 'print').mockImplementation(() => undefined); });
afterEach(() => { if (root) act(() => root.unmount()); document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount() { const host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(createElement(ReplyReview))); return host; }
function enter(host: HTMLElement, selector: string, value: string) {
  const field = host.querySelector(selector)! as HTMLTextAreaElement | HTMLSelectElement;
  const proto = field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(field, value); field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
function press(host: HTMLElement, label: string) { const button = [...host.querySelectorAll('button')].find(node => node.textContent?.trim() === label); expect(button, label).toBeDefined(); act(() => button!.click()); }
function prepared() { const host = mount(); enter(host, '#reply-body', 'PRIVATE_SOURCE untouched full reply'); enter(host, '#reply-point-1', 'PRIVATE_POINT <img src="https://bad.example/leak">'); enter(host, '#reply-status-1', 'not-found'); press(host, 'Prepare my follow-up note'); return host; }
it('prints exactly the reviewed note as inert text only after private-device choice, then clears the temporary content', () => {
  const host = prepared();
  expect(host.querySelector('[data-private-note-print-button]')).toBeNull();
  press(host, 'My private device'); press(host, 'Print or save as PDF');
  expect(window.print).toHaveBeenCalledTimes(1);
  const printRoot = document.querySelector('[data-private-note-print-root]')!;
  expect(printRoot.querySelector('pre')?.textContent).toBe(host.querySelector('[data-reply-note]')!.textContent);
  expect(printRoot.querySelector('img')).toBeNull();
  expect(printRoot.textContent).toContain('Prepared note — not submitted');
  expect(printRoot.textContent).not.toContain('PRIVATE_SOURCE');
  act(() => window.dispatchEvent(new Event('afterprint')));
  expect(document.querySelector('[data-private-note-print-root]')).toBeNull();
  expect(document.querySelector('[data-private-note-print-style]')).toBeNull();
});
it.each(['source', 'shared', 'clear', 'pagehide'])('discards a pending print copy when %s changes', change => {
  const host = prepared(); press(host, 'My private device'); press(host, 'Print or save as PDF');
  if (change === 'source') enter(host, '#reply-body', 'Changed reply');
  if (change === 'shared') press(host, 'Shared device');
  if (change === 'clear') press(host, 'Clear all text');
  if (change === 'pagehide') act(() => window.dispatchEvent(new Event('pagehide')));
  expect(document.querySelector('[data-private-note-print-root]')).toBeNull();
  expect(document.querySelector('[data-private-note-print-style]')).toBeNull();
});
it('cleans a failed print call and offers an accessible retry message', () => {
  vi.mocked(window.print).mockImplementation(() => { throw new Error('printing unavailable'); });
  const host = prepared(); press(host, 'My private device'); press(host, 'Print or save as PDF');
  expect(document.querySelector('[data-private-note-print-root]')).toBeNull();
  expect(host.querySelector('[role="status"]')?.textContent).toContain('Could not open printing');
});
it('rejects an accessibility click after wall-clock expiry even when inactivity timers were throttled', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-05T10:00:00Z'));
  const host = prepared(); press(host, 'My private device');
  vi.setSystemTime(new Date('2026-09-05T10:11:00Z'));
  press(host, 'Print or save as PDF');
  expect(document.querySelector('[data-private-note-print-root]')).toBeNull();
  expect(host.querySelector<HTMLTextAreaElement>('#reply-body')!.value).toBe('');
});
it('keeps only one temporary copy across retries and removes it when the review unmounts', () => {
  const host = prepared(); press(host, 'My private device');
  press(host, 'Print or save as PDF'); press(host, 'Print or save as PDF');
  expect(document.querySelectorAll('[data-private-note-print-root]')).toHaveLength(1);
  expect(document.querySelectorAll('[data-private-note-print-style]')).toHaveLength(1);
  act(() => root.render(createElement('div')));
  expect(document.querySelector('[data-private-note-print-root]')).toBeNull();
  expect(document.querySelector('[data-private-note-print-style]')).toBeNull();
});
