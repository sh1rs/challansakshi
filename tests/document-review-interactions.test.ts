// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import CitizenDocumentReview from '../components/public-beta/CitizenDocumentReview';
import { readLocalDocument } from '../lib/local-document-reader';
vi.mock('../lib/local-document-reader', () => ({ readLocalDocument: vi.fn() }));
const roots: ReturnType<typeof createRoot>[] = [];
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-document') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.mocked(readLocalDocument).mockImplementation(async (_file, options) => ({ sourceId: options.sourceId, role: options.role, limited: false, pages: [{ page: 1, text: `Registration Number: ${options.role === 'notice' ? 'KA01AB1234' : 'KA01AB5678'}`, method: 'pdf-text' }] }));
});
afterEach(() => { roots.splice(0).forEach(root => act(() => root.unmount())); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount() {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host as Parameters<typeof createRoot>[0]); roots.push(root);
  act(() => root.render(createElement(CitizenDocumentReview, { initialNowIso: '2026-09-05T10:00:00Z' })));
  return host;
}
async function file(host: HTMLElement, role: string) {
  const input = host.querySelector<HTMLInputElement>(`input[data-document-role="${role}"]`)!;
  const selected = new File(['fabricated'], 'not-logged.pdf', { type: 'application/pdf' });
  Object.defineProperty(input, 'files', { configurable: true, value: [selected] });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
}
function press(host: HTMLElement, label: string) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent?.trim() === label);
  expect(button, label).toBeDefined(); act(() => button!.click());
}
it('starts document-first without questions and reads automatically after choosing a file', async () => {
  const host = mount();
  expect(host.querySelector('a[href="/manual/challan"]')).not.toBeNull();
  expect(host.querySelectorAll('input[type=radio], input[type=checkbox]')).toHaveLength(0);
  await file(host, 'notice');
  expect(readLocalDocument).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain('KA01AB1234');
  expect(host.textContent).toContain('Read on this device');
  expect(host.textContent).not.toContain('not-logged.pdf');
});
it('compares two sources then prepares only after an explicit review confirmation', async () => {
  const host = mount(); await file(host, 'notice'); await file(host, 'vehicle-record');
  expect(host.textContent).toContain('The registrations differ');
  expect(host.querySelector('[data-document-note]')).toBeNull();
  press(host, 'I checked these readings — prepare my note');
  expect(host.querySelector('[data-document-note]')?.textContent).toContain('KA01AB5678');
  expect(host.querySelector('button[data-document-download]')).toBeNull();
  press(host, 'My private device');
  expect(host.querySelector('button[data-document-download]')).not.toBeNull();
  press(host, 'Shared device');
  expect(host.querySelector('button[data-document-download]')).toBeNull();
});
it('invalidates the prepared note on an evidence replacement', async () => {
  const host = mount(); await file(host, 'notice');
  press(host, 'I checked these readings — prepare my note');
  press(host, 'Review documents');
  await file(host, 'notice');
  expect(host.querySelector('[data-document-note]')).toBeNull();
});
it('aborts and ignores an old reading after the selected file is removed', async () => {
  let finish!: (value: Awaited<ReturnType<typeof readLocalDocument>>) => void;
  vi.mocked(readLocalDocument).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const host = mount(); await file(host, 'notice');
  const options = vi.mocked(readLocalDocument).mock.calls.at(-1)![1];
  press(host, 'Remove challan');
  expect(options.signal.aborted).toBe(true);
  await act(async () => { finish({ sourceId: options.sourceId, role: 'notice', limited: false, pages: [{ page: 1, text: 'Registration Number: KA01AB9999', method: 'pdf-text' }] }); });
  expect(host.textContent).not.toContain('KA01AB9999');
});
it('never previews a rejected file alongside a successfully read source', async () => {
  const host = mount(); await file(host, 'vehicle-record');
  vi.mocked(readLocalDocument).mockRejectedValueOnce(new Error('invalid image'));
  await file(host, 'notice');
  expect(host.textContent).toContain('Could not read this file');
  expect(host.querySelectorAll('a[href="blob:test-document"]')).toHaveLength(1);
});
