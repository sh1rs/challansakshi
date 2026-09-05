// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { readLocalDocument } from '../lib/local-document-reader';

const vendor = vi.hoisted(() => ({ createWorker: vi.fn(), getDocument: vi.fn(), workerOptions: { workerSrc: '' } }));
vi.mock('tesseract.js', () => ({ createWorker: vendor.createWorker }));
vi.mock('pdfjs-dist', () => ({ getDocument: vendor.getDocument, GlobalWorkerOptions: vendor.workerOptions, AnnotationMode: { DISABLE: 0 } }));
const pdfBytes = new TextEncoder().encode('%PDF-1.7\ncontrolled fixture');
function file(bytes = pdfBytes, type = 'application/pdf', size = bytes.byteLength): File {
  const value = new File([bytes], 'private-name-must-not-leak', { type });
  Object.defineProperty(value, 'arrayBuffer', { value: vi.fn(async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)) });
  Object.defineProperty(value, 'size', { value: size });
  return value;
}
function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer); view.setUint32(16, width); view.setUint32(20, height);
  return file(bytes, 'image/png');
}
function options(signal = new AbortController().signal) {
  return { sourceId: 'source-1', role: 'notice' as const, language: 'en' as const, signal, onProgress: vi.fn() };
}
function pdf(pages: string[]) {
  const cleanup = vi.fn(); const destroy = vi.fn().mockResolvedValue(undefined);
  const getPage = vi.fn(async (number: number) => ({
    getTextContent: vi.fn(async () => ({ items: [{ str: pages[number - 1], hasEOL: true }] })),
    getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: 1000 * scale, height: 1500 * scale })),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })), cleanup,
  }));
  vendor.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: pages.length, getPage }), destroy });
  return { getPage, cleanup, destroy };
}
let terminate: ReturnType<typeof vi.fn>;
let recognize: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('crypto', webcrypto);
  terminate = vi.fn().mockResolvedValue(undefined);
  recognize = vi.fn().mockResolvedValue({ data: { text: 'Registration No: KA01AB1234', confidence: 92 } });
  vendor.createWorker.mockResolvedValue({ terminate, recognize });
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1000, height: 1500, close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: '' } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('bounded browser-local document reading', () => {
  it.each([
    ['empty', () => file(new Uint8Array()), /empty/i],
    ['oversize', () => file(pdfBytes, 'application/pdf', 12 * 1024 * 1024 + 1), /12 MiB/],
    ['unsupported', () => file(pdfBytes, 'image/svg+xml'), /PDF|JPEG|PNG|WebP/],
    ['malformed', () => file(new TextEncoder().encode('not a PDF')), /read|format/i],
    ['oversized raster', () => png(4000, 4000), /12 million/i],
  ] as const)('rejects %s before loading a vendor or decoding an image', async (_label, makeFile, message) => {
    await expect(readLocalDocument(makeFile(), options())).rejects.toThrow(message);
    expect(vendor.createWorker).not.toHaveBeenCalled(); expect(vendor.getDocument).not.toHaveBeenCalled();
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it('extracts at most three PDF pages without invoking OCR and reports omitted pages', async () => {
    const document = pdf(['Registration No: KA01AB1234', 'Challan No: 12345', 'Amount: 500', 'private fourth page']);
    const reading = await readLocalDocument(file(), options());
    expect(reading).toMatchObject({ sourceId: 'source-1', role: 'notice', limited: true });
    expect(reading.pages.map(page => [page.page, page.method])).toEqual([[1, 'pdf-text'], [2, 'pdf-text'], [3, 'pdf-text']]);
    expect(document.getPage).toHaveBeenCalledTimes(3); expect(document.destroy).toHaveBeenCalledTimes(1);
    expect(vendor.createWorker).not.toHaveBeenCalled();
    expect(vendor.getDocument.mock.calls[0][0]).toMatchObject({ stopAtErrors: true, enableXfa: false, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false });
    expect(vendor.getDocument.mock.calls[0][0]).not.toHaveProperty('url');
    expect(vendor.workerOptions.workerSrc).toMatch(/^https?:\/\/[^/]+\/document-assets\/pdfjs-6\.3\.289\//);
  });
  it('caps page text at 25000 characters and flags truncation', async () => {
    pdf(['A'.repeat(25001)]);
    const reading = await readLocalDocument(file(), options());
    expect(reading.pages[0].text).toHaveLength(25000); expect(reading.limited).toBe(true);
  });
  it('fingerprints local bytes before PDF ownership transfer without exposing document text', async () => {
    pdf(['Registration No: KA01AB1234']);
    const digest = vi.fn().mockResolvedValue(new Uint8Array(32).fill(0xab).buffer);
    vi.stubGlobal('crypto', { subtle: { digest } });
    const reading = await readLocalDocument(file(), options());
    expect(digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    expect(reading).toHaveProperty('fingerprint', 'ab'.repeat(32));
    expect(digest.mock.invocationCallOrder[0]).toBeLessThan(vendor.getDocument.mock.invocationCallOrder[0]);
  });
  it('does not start a vendor or emit a reading when cancelled during fingerprinting', async () => {
    const digest = vi.fn(() => new Promise<ArrayBuffer>(() => undefined));
    vi.stubGlobal('crypto', { subtle: { digest } });
    const abort = new AbortController();
    const pending = readLocalDocument(file(), options(abort.signal));
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(digest).toHaveBeenCalled());
    abort.abort(); await assertion;
    expect(vendor.getDocument).not.toHaveBeenCalled();
    expect(vendor.createWorker).not.toHaveBeenCalled();
  });
  it('reports low confidence OCR as limited rather than a reliable full reading', async () => {
    recognize.mockResolvedValue({ data: { text: 'uncertain registration', confidence: 41 } });
    const reading = await readLocalDocument(png(1000, 1500), options());
    expect(reading.limited).toBe(true);
    expect(reading.pages[0]).toMatchObject({ method: 'local-ocr', confidence: 41 });
    expect(terminate).toHaveBeenCalledTimes(1);
  });
  it('reports the current page when a reused OCR worker emits progress', async () => {
    pdf(['', '']);
    const config = options();
    recognize.mockImplementation(async () => {
      vendor.createWorker.mock.calls[0][2].logger({ status: 'recognizing text' });
      return { data: { text: 'read', confidence: 90 } };
    });
    await readLocalDocument(file(), config);
    expect(config.onProgress.mock.calls.at(-1)).toEqual(['Reading page 2 locally']);
  });
  it('OCRs a scanned PDF locally with bounded rendering and no document cache', async () => {
    pdf(['']);
    const reading = await readLocalDocument(file(), { ...options(), language: 'hi' });
    expect(reading.pages[0]).toMatchObject({ page: 1, method: 'local-ocr', confidence: 92, text: 'Registration No: KA01AB1234' });
    expect(vendor.createWorker).toHaveBeenCalledWith('eng+hin', 1, expect.objectContaining({ cacheMethod: 'none', workerBlobURL: false, gzip: true }));
    const config = vendor.createWorker.mock.calls[0][2];
    for (const key of ['workerPath', 'corePath', 'langPath']) expect(new URL(config[key]).origin).toBe(window.location.origin);
    const canvas = recognize.mock.calls[0][0] as HTMLCanvasElement;
    // The reader releases canvas backing memory after recognition.
    expect(canvas.width * canvas.height).toBe(0); expect(terminate).toHaveBeenCalledTimes(1);
  });
  it('downscales an allowed image before OCR and releases the decoded pixels', async () => {
    const close = vi.fn();
    vi.mocked(createImageBitmap).mockResolvedValue({ width: 4000, height: 3000, close } as unknown as ImageBitmap);
    recognize.mockImplementation(async (canvas: HTMLCanvasElement) => {
      expect(canvas.width * canvas.height).toBeLessThanOrEqual(3_000_000);
      expect(canvas.width).toBe(2000); expect(canvas.height).toBe(1500);
      return { data: { text: 'read locally', confidence: 90 } };
    });
    const reading = await readLocalDocument(png(4000, 3000), options());
    expect(reading).toMatchObject({ limited: true, pages: [{ method: 'local-ocr', text: 'read locally' }] });
    expect(close).toHaveBeenCalledTimes(1); expect(terminate).toHaveBeenCalledTimes(1);
  });
  it('destroys an in-flight PDF loading task on cancellation', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    vendor.getDocument.mockReturnValue({ promise: new Promise(() => undefined), destroy });
    const abort = new AbortController(); const pending = readLocalDocument(file(), options(abort.signal));
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(vendor.getDocument).toHaveBeenCalled()); abort.abort();
    await assertion; expect(destroy).toHaveBeenCalledTimes(1); expect(vendor.createWorker).not.toHaveBeenCalled();
  });
  it('abstains before work if already cancelled', async () => {
    const abort = new AbortController(); abort.abort();
    await expect(readLocalDocument(file(), options(abort.signal))).rejects.toMatchObject({ name: 'AbortError' });
    expect(vendor.getDocument).not.toHaveBeenCalled();
  });
  it('cancels in-flight OCR and terminates its worker without returning text', async () => {
    pdf(['']); recognize.mockImplementation(() => new Promise(() => undefined));
    const abort = new AbortController(); const pending = readLocalDocument(file(), options(abort.signal));
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(recognize).toHaveBeenCalled()); abort.abort();
    await assertion; expect(terminate).toHaveBeenCalledTimes(1);
  });
  it('terminates a late initialized worker without ever sending the cancelled document', async () => {
    pdf(['']); let ready!: (worker: object) => void;
    vendor.createWorker.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
    const abort = new AbortController(); const pending = readLocalDocument(file(), options(abort.signal));
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(vendor.createWorker).toHaveBeenCalled()); abort.abort(); await assertion;
    ready({ terminate, recognize }); await Promise.resolve(); await Promise.resolve();
    expect(terminate).toHaveBeenCalledTimes(1); expect(recognize).not.toHaveBeenCalled();
  });
  it('uses a whole-file time budget rather than restarting the timeout per OCR page', async () => {
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer) } });
    vi.useFakeTimers(); pdf(['', '']);
    recognize.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { text: 'read', confidence: 90 } }), 60000)));
    const pending = readLocalDocument(file(), options()); const assertion = expect(pending).rejects.toThrow(/time|90/i);
    await vi.advanceTimersByTimeAsync(90001); await assertion;
    expect(terminate).toHaveBeenCalledTimes(1);
  });
  it('replaces vendor errors with safe fixed copy that never includes document content or filename', async () => {
    pdf(['']); recognize.mockRejectedValue(new Error('private-name-must-not-leak Registration KA01AB1234'));
    await expect(readLocalDocument(file(), options())).rejects.toThrow('This document could not be read locally. Try a clearer PDF or image.');
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
