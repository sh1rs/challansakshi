// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EvidencePhotoWorkspace from '../components/public-beta/EvidencePhotoWorkspace';
const roots: ReturnType<typeof createRoot>[] = [];
const close = vi.fn();
beforeEach(() => {
  close.mockReset(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('crypto', { randomUUID: () => 'local-photo-id', subtle: { digest: async () => new ArrayBuffer(32) } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:photo') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 50, close })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ drawImage: vi.fn(), getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) }) }) as unknown as CanvasRenderingContext2D);
});
afterEach(() => { roots.splice(0).forEach(root => act(() => root.unmount())); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount() {
  const host = document.createElement('div'); document.body.appendChild(host);
  const onChange = vi.fn(); const root = createRoot(host as Parameters<typeof createRoot>[0]); roots.push(root);
  act(() => root.render(createElement(EvidencePhotoWorkspace, { language: 'en', reference: null, onChange })));
  return { host, onChange, root };
}
async function select(host: HTMLElement) {
  const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
  const bytes = new Uint8Array(24); bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); const view = new DataView(bytes.buffer);
  view.setUint32(12, 0x49484452); view.setUint32(16, 100); view.setUint32(20, 50);
  const file = new File([bytes], 'private-name.png', { type: 'image/png' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
}
function click(host: HTMLElement, text: string) { const button = [...host.querySelectorAll('button')].find(node => node.textContent === text)!; expect(button).toBeTruthy(); act(() => button.click()); }
function dragSurface(host: HTMLElement) {
  const surface = host.querySelector<HTMLDivElement>('[data-photo-selecting]')!;
  let captured = -1;
  surface.setPointerCapture = id => { captured = id; };
  surface.hasPointerCapture = id => captured === id;
  surface.releasePointerCapture = () => { captured = -1; };
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 200, width: 200, height: 100, right: 300, bottom: 300, x: 100, y: 200, toJSON: () => ({}) });
  const pointer = (type: string, id: number, clientX: number, clientY: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: id, button: 0, isPrimary: id === 1, clientX, clientY });
    act(() => surface.dispatchEvent(event));
  };
  return { surface, pointer };
}
it('starts optional and preserves the source until explicit removal', async () => {
  const { host, onChange } = mount(); expect(host.querySelector('details')?.open).toBe(false);
  expect(host.querySelectorAll('input[type=checkbox],input[type=radio]')).toHaveLength(0);
  await select(host); expect(host.textContent).toContain('100 × 50'); expect(host.textContent).not.toContain('private-name');
  click(host, 'I cannot read this area'); expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ assessment: 'unreadable', originalWidth: 100 });
  click(host, 'Remove photo'); expect(onChange.mock.calls.at(-1)?.[0]).toBeNull(); expect(close).toHaveBeenCalledTimes(1); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});
it('clears a confirmed observation when the region changes', async () => {
  const { host, onChange } = mount(); await select(host); click(host, 'I cannot read this area');
  const width = host.querySelector<HTMLInputElement>('input[data-photo-region="width"]')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(width, '25'); width.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(onChange.mock.calls.at(-1)?.[0]).toBeNull();
});
it('dragging is opt-in, ignores additional pointers and exits selection mode after a bounded crop', async () => {
  const { host, onChange } = mount(); await select(host); click(host, 'I cannot read this area');
  const { surface, pointer } = dragSurface(host);
  pointer('pointerdown', 1, 120, 220); pointer('pointerup', 1, 220, 260);
  expect(host.querySelector('[data-photo-confirmed]')).not.toBeNull();
  click(host, 'Select an area'); pointer('pointerdown', 1, 120, 220);
  pointer('pointerdown', 2, 110, 210); pointer('pointerup', 2, 280, 290);
  expect(surface.getAttribute('data-photo-selecting')).toBe('true');
  pointer('pointermove', 1, 220, 260); pointer('pointerup', 1, 220, 260);
  expect(host.querySelector<HTMLInputElement>('[data-photo-region="x"]')!.value).toBe('10');
  expect(host.querySelector<HTMLInputElement>('[data-photo-region="width"]')!.value).toBe('50');
  expect(host.querySelector<HTMLInputElement>('[data-photo-region="height"]')!.value).toBe('20');
  expect(surface.getAttribute('data-photo-selecting')).toBe('false');
  expect(onChange.mock.calls.at(-1)?.[0]).toBeNull();
});
it('cancelled and zero-size pointer gestures preserve the prior region', async () => {
  const { host } = mount(); await select(host); const { surface, pointer } = dragSurface(host);
  click(host, 'Select an area'); pointer('pointerdown', 1, 120, 220); pointer('pointermove', 1, 220, 260); pointer('pointercancel', 1, 220, 260);
  expect(host.querySelector<HTMLInputElement>('[data-photo-region="width"]')!.value).toBe('100');
  expect(surface.getAttribute('data-photo-selecting')).toBe('false');
  click(host, 'Select an area'); pointer('pointerdown', 1, 120, 220); pointer('pointerup', 1, 120, 220);
  expect(host.querySelector<HTMLInputElement>('[data-photo-region="width"]')!.value).toBe('100');
  expect(surface.hasPointerCapture(1)).toBe(false);
  click(host, 'Select an area'); pointer('pointerdown', 1, 120, 220); pointer('pointermove', 1, 220, 260);
  act(() => surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(host.querySelector<HTMLInputElement>('[data-photo-region="width"]')!.value).toBe('100');
  expect(surface.getAttribute('data-photo-selecting')).toBe('false');
});
it('removing the source releases a captured pointer and discards its pending crop', async () => {
  const { host, onChange } = mount(); await select(host); const { surface, pointer } = dragSurface(host);
  click(host, 'Select an area'); pointer('pointerdown', 1, 120, 220); pointer('pointermove', 1, 220, 260);
  expect(surface.hasPointerCapture(1)).toBe(true);
  click(host, 'Remove photo');
  expect(surface.hasPointerCapture(1)).toBe(false);
  expect(host.querySelector('img')).toBeNull();
  expect(onChange.mock.calls.at(-1)?.[0]).toBeNull();
});
it('invalidates the prior observation even when a replacement file is rejected', async () => {
  const { host, onChange } = mount(); await select(host); click(host, 'I cannot read this area');
  const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input, 'files', { configurable: true, value: [new File(['wrong'], 'wrong.txt', { type: 'text/plain' })] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  expect(onChange.mock.calls.at(-1)?.[0]).toBeNull();
  expect(host.querySelector('[data-photo-confirmed]')).toBeNull();
  expect(host.querySelector('img')).not.toBeNull();
  expect(host.textContent).toContain('Any previous image is still shown');
});
it('invalidates a photo observation when the independent vehicle reading changes', async () => {
  const { host, onChange, root } = mount(); await select(host); click(host, 'I cannot read this area');
  act(() => root.render(createElement(EvidencePhotoWorkspace, { language: 'en', reference: { sourceId: 'rc-2', page: 1, value: 'KA01AB3317' }, onChange })));
  expect(onChange.mock.calls.at(-1)?.[0]).toBeNull();
  expect(host.querySelector('[data-photo-confirmed]')).toBeNull();
  expect(host.querySelector('img')).not.toBeNull();
});
it('excludes a same-file vehicle record from photo text comparison', async () => {
  const { host, onChange, root } = mount(); await select(host);
  act(() => root.render(createElement(EvidencePhotoWorkspace, { language: 'en', reference: { sourceId: 'rc-same', page: 1, value: 'KA01AB3317', fingerprint: '0'.repeat(64) }, onChange })));
  const origin = host.querySelector('#photo-origin') as unknown as HTMLSelectElement;
  act(() => { origin.value = 'official-attachment'; origin.dispatchEvent(new Event('change', { bubbles: true })); });
  const reading = host.querySelector<HTMLInputElement>('#photo-reading')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(reading, 'KA01AB3317'); reading.dispatchEvent(new Event('input', { bubbles: true })); });
  click(host, 'I checked the sources — use my reading');
  expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ assessment: 'readable', reference: null });
  expect(host.textContent).toContain('same file as the vehicle record');
  expect(host.textContent).not.toContain('The compared text matches');
});
it('closes a late bitmap after the selection is cleared', async () => {
  let resolve!: (value: ImageBitmap) => void;
  vi.mocked(createImageBitmap).mockImplementationOnce(() => new Promise(done => { resolve = done; }) as Promise<ImageBitmap>);
  const { host } = mount(); await select(host); click(host, 'Cancel photo');
  await act(async () => resolve({ width: 100, height: 50, close } as ImageBitmap));
  expect(host.querySelector('img')).toBeNull(); expect(close).toHaveBeenCalledTimes(1);
});
it('closes a late bitmap after unmount', async () => {
  let resolve!: (value: ImageBitmap) => void;
  vi.mocked(createImageBitmap).mockImplementationOnce(() => new Promise(done => { resolve = done; }) as Promise<ImageBitmap>);
  const { host, root } = mount(); await select(host); act(() => root.unmount()); roots.splice(roots.indexOf(root), 1);
  await act(async () => resolve({ width: 100, height: 50, close } as ImageBitmap)); expect(close).toHaveBeenCalledTimes(1);
});
