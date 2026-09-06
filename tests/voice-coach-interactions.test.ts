// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import VoiceCoach from '../components/public-beta/VoiceCoach';
import type { CoachContext } from '../lib/voice-coach';

const input = vi.hoisted(() => ({ start: vi.fn(async () => undefined), stop: vi.fn(), dispose: vi.fn(), setPlaybackActive: vi.fn() }));
const output = vi.hoisted(() => ({ unlock: vi.fn(async () => undefined), speak: vi.fn(async () => undefined), stop: vi.fn(), dispose: vi.fn(), getCapability: vi.fn(() => ({ available: true, voiceName: 'Local test voice', local: true, quality: 'device' })) }));
const factories = vi.hoisted(() => ({ input: vi.fn(), output: vi.fn() }));
vi.mock('../lib/local-voice-input', () => ({ createLocalVoiceInput: factories.input }));
vi.mock('../lib/local-voice-output', () => ({ createLocalVoiceOutput: factories.output }));
const base: CoachContext = { stage: 'read', busy: false, hasNotice: false, hasVehicleRecord: false, hasPhoto: false, comparison: 'inconclusive', fields: [], activeFieldId: null, hasError: false };
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
const onAction = vi.fn();
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
  vi.clearAllMocks(); factories.input.mockReturnValue(input); factories.output.mockReturnValue(output);
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
function render(context = base, revision = '1') { act(() => root.render(createElement(VoiceCoach, { context, revision, pageLanguage: 'en', onAction }))); }
function button(id: string) { return host.querySelector<HTMLButtonElement>(`[data-voice-${id}]`)!; }
async function click(id: string) { await act(async () => button(id).click()); }
async function type(value: string) {
  await act(async () => {
    const field = host.querySelector<HTMLTextAreaElement>('[data-voice-message]')!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
it('offers typed screen guidance without constructing speech engines or starting downloads', async () => {
  render(); await click('open'); await type('What should I do here?');
  expect(host.querySelector('[data-voice-answer]')?.textContent).toMatch(/challan|copy|record/i);
  expect(factories.input).not.toHaveBeenCalled(); expect(factories.output).not.toHaveBeenCalled();
  expect(onAction).not.toHaveBeenCalled();
});
it('requires a separate explicit voice-start action after the download disclosure', async () => {
  render(); await click('open'); await click('start');
  expect(factories.input).not.toHaveBeenCalled();
  expect(host.querySelector('[data-voice-download]')?.textContent).toMatch(/download|model/i);
  await click('confirm-start');
  expect(input.start).toHaveBeenCalledOnce();
  await click('stop'); expect(input.dispose).toHaveBeenCalled(); expect(output.stop).toHaveBeenCalled();
});
it('drops a completed utterance from a screen that has since changed', async () => {
  render(); await click('open'); await click('start'); await click('confirm-start');
  const options = factories.input.mock.calls[0][0];
  act(() => options.onSpeechStart());
  render({ ...base, stage: 'check', hasNotice: true }, '2');
  await act(async () => options.onTranscript('show the photo'));
  expect(onAction).not.toHaveBeenCalled();
});
it('immediately cancels spoken output when the user interrupts', async () => {
  render(); await click('open'); await click('start'); await click('confirm-start');
  const before = output.stop.mock.calls.length;
  act(() => factories.input.mock.calls[0][0].onSpeechStart());
  expect(output.stop.mock.calls.length).toBeGreaterThan(before);
});
it('cleans up the mic and transcript on page hide, ignoring late recognizer callbacks', async () => {
  render(); await click('open'); await click('start'); await click('confirm-start');
  const options = factories.input.mock.calls[0][0];
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(input.dispose).toHaveBeenCalled(); expect(output.dispose).toHaveBeenCalled();
  await act(async () => options.onTranscript('show the photo'));
  expect(onAction).not.toHaveBeenCalled();
  expect(host.querySelector('[data-voice-transcript]')?.textContent ?? '').toBe('');
});
it('keeps the acknowledgement across its own action and cancels it on later external changes', async () => {
  render(); await click('open'); await click('start'); await click('confirm-start');
  onAction.mockReturnValueOnce('2');
  await type('show the photo');
  expect(onAction).toHaveBeenCalled();
  const cancellations = output.stop.mock.calls.length;
  const acknowledgement = host.querySelector('[data-voice-answer]')?.textContent;
  render({ ...base, stage: 'check', hasNotice: true }, '2');
  expect(output.stop.mock.calls.length).toBe(cancellations);
  expect(host.querySelector('[data-voice-answer]')?.textContent).toBe(acknowledgement);
  render(base, '3');
  expect(output.stop.mock.calls.length).toBeGreaterThan(cancellations);
});
it('rejects an older spoken intent after a newer typed submission', async () => {
  render(); await click('open'); await click('start'); await click('confirm-start');
  const options = factories.input.mock.calls[0][0];
  act(() => options.onSpeechStart());
  await type('What should I do here?');
  await act(async () => options.onTranscript('show the photo'));
  expect(onAction).not.toHaveBeenCalled();
  expect(host.querySelector('[data-voice-transcript]')?.textContent).toBe('What should I do here?');
});
it('minimizes without ending voice and keeps an accessible microphone stop', async () => {
  render(); await click('open'); await click('start'); await click('confirm-start');
  const disposals = input.dispose.mock.calls.length;
  const outputDisposals = output.dispose.mock.calls.length;
  await click('minimize');
  expect(host.querySelector('[data-voice-panel]')?.getAttribute('data-minimized')).toBe('true');
  expect(input.dispose.mock.calls.length).toBe(disposals);
  expect(output.dispose.mock.calls.length).toBe(outputDisposals);
  expect(button('stop').closest('[hidden]')).toBeNull();
  await click('restore');
  expect(host.querySelector('[data-voice-panel]')?.getAttribute('data-minimized')).toBe('false');
  expect(input.start).toHaveBeenCalledOnce();
  await click('minimize'); await click('stop');
  expect(input.dispose.mock.calls.length).toBeGreaterThan(disposals);
});
