// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CitizenDocumentReview from '../components/public-beta/CitizenDocumentReview';
import type { LocalVoiceInputOptions } from '../lib/local-voice-input';

// The slow I/O boundaries are controlled; the document view, coach engine and
// correction controls are real. Delivering audio late must not overwrite typing.
const speech = vi.hoisted(() => ({ callbacks: null as LocalVoiceInputOptions | null }));
vi.mock('../lib/local-voice-input', () => ({
  createLocalVoiceInput: (options: LocalVoiceInputOptions) => {
    speech.callbacks = options;
    return { start: async () => undefined, stop: () => undefined, dispose: () => undefined, setPlaybackActive: () => undefined };
  },
}));
vi.mock('../lib/local-voice-output', () => ({
  createLocalVoiceOutput: () => ({
    unlock: async () => undefined, speak: async () => undefined, stop: () => undefined, dispose: () => undefined,
    getCapability: () => ({ available: true, voiceName: 'Synthetic test voice', local: true, quality: 'device' }),
  }),
}));
vi.mock('../lib/local-document-reader', () => ({
  readLocalDocument: async (_file: File, options: { sourceId: string; role: string }) => ({
    sourceId: options.sourceId, role: options.role, limited: false,
    pages: [{ page: 1, text: 'SYNTHETIC DRAFT QA NOTICE\nAmount: 500', method: 'pdf-text' }],
  }),
}));

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  speech.callbacks = null;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => undefined } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:synthetic-draft-test' });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function click(selector: string) {
  const element = host.querySelector<HTMLButtonElement>(selector);
  expect(element, selector).not.toBeNull();
  await act(async () => element!.click());
}

it('a later manual correction draft invalidates an older utterance for the same open field', async () => {
  await act(async () => root.render(createElement(CitizenDocumentReview, { initialNowIso: '2026-09-05T10:00:00Z' })));
  const documentInput = host.querySelector<HTMLInputElement>('input[data-document-role="notice"]')!;
  Object.defineProperty(documentInput, 'files', { configurable: true, value: [new File(['synthetic'], 'synthetic-draft.pdf', { type: 'application/pdf' })] });
  await act(async () => documentInput.dispatchEvent(new Event('change', { bubbles: true })));
  await click('button[aria-label="Correct: Amount notice"]');
  const field = host.querySelector<HTMLInputElement>('#document-correction')!;
  expect(field.value).toBe('500');
  await click('[data-voice-open]');
  await click('[data-voice-start]');
  await click('[data-voice-confirm-start]');
  expect(speech.callbacks).not.toBeNull();
  act(() => speech.callbacks!.onSpeechStart());

  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, '700');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(field.value).toBe('700');
  await act(async () => speech.callbacks!.onTranscript('five hundred'));

  expect(host.querySelector<HTMLInputElement>('#document-correction')!.value).toBe('700');
  expect(host.querySelector('[data-voice-transcript]')).toBeNull();
  expect(host.querySelector('[data-document-note]')).toBeNull();
});
