import type { DocumentPage, DocumentReading, DocumentRole } from './document-evidence';

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_INPUT_PIXELS = 12_000_000;
const MAX_RENDER_PIXELS = 3_000_000;
const MAX_PAGES = 3;
const MAX_PAGE_TEXT = 25_000;
const MAX_READING_MS = 90_000;
const OCR_ASSETS = '/document-assets/tesseract-7.0.0';
const PDF_ASSETS = '/document-assets/pdfjs-6.3.289';
const SAFE_FAILURE = 'This document could not be read locally. Try a clearer PDF or image.';

type ReadOptions = {
  sourceId: string;
  role: DocumentRole;
  language: 'en' | 'hi';
  signal: AbortSignal;
  onProgress: (message: string) => void;
};
type OcrWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;
type PdfLoadingTask = ReturnType<typeof import('pdfjs-dist')['getDocument']>;
type PdfRenderTask = import('pdfjs-dist').RenderTask;
class ReadingError extends Error {}

function aborted() { return new DOMException('Document reading cancelled.', 'AbortError'); }
function asset(path: string) { return new URL(path, window.location.origin).href; }
function dimensions(width: number, height: number): [number, number] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new ReadingError(SAFE_FAILURE);
  if (width * height > MAX_INPUT_PIXELS) throw new ReadingError('Choose an image or page with no more than 12 million pixels.');
  return [width, height];
}

/** Header-only bounds are checked before a browser decoder allocates the raster. */
function imageDimensions(bytes: Uint8Array, type: string): [number, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === 'image/png' && bytes.length >= 24
    && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
    && view.getUint32(12) === 0x49484452) return dimensions(view.getUint32(16), view.getUint32(20));
  if (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
  }
  if (type === 'image/webp' && bytes.length >= 30 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
    const chunk = view.getUint32(12);
    if (chunk === 0x56503858) return dimensions(1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16));
    if (chunk === 0x5650384c && bytes[20] === 0x2f) return dimensions(1 + bytes[21] + ((bytes[22] & 0x3f) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0xf) << 10));
    if (chunk === 0x56503820 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return dimensions(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  throw new ReadingError(SAFE_FAILURE);
}

/** Local bytes only. Vendor code is loaded on invocation, never during SSR or initial import. */
export async function readLocalDocument(file: File, options: ReadOptions): Promise<DocumentReading> {
  if (options.signal.aborted) throw aborted();
  if (!file.size) throw new ReadingError('This file is empty. Choose a readable PDF or image.');
  if (file.size > MAX_BYTES) throw new ReadingError('Choose a file no larger than 12 MiB.');
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new ReadingError('Choose a PDF, JPEG, PNG or WebP document.');
  if (typeof window === 'undefined') throw new ReadingError('Local document reading requires a browser.');

  let stopped: Error | null = null;
  let worker: OcrWorker | null = null;
  let loading: PdfLoadingTask | null = null;
  let rendering: PdfRenderTask | null = null;
  let bitmap: ImageBitmap | null = null;
  const canvases = new Set<HTMLCanvasElement>();
  let rejectStop!: (reason: Error) => void;
  const stopPromise = new Promise<never>((_resolve, reject) => { rejectStop = reject; });
  // A cancellation can arrive between stages, before the next race is installed.
  void stopPromise.catch(() => undefined);
  const stopWorker = () => {
    if (!worker) return;
    const current = worker; worker = null;
    void current.terminate().catch(() => undefined);
  };
  const destroyPdf = () => {
    if (!loading) return;
    const current = loading; loading = null;
    void current.destroy().catch(() => undefined);
  };
  const stop = (error: Error) => {
    if (stopped) return;
    stopped = error;
    rendering?.cancel(); rendering = null;
    stopWorker(); destroyPdf();
    rejectStop(error);
  };
  const onAbort = () => stop(aborted());
  options.signal.addEventListener('abort', onAbort, { once: true });
  const timeout = setTimeout(() => stop(new ReadingError('Local reading reached its 90-second time limit. Try a smaller or clearer document.')), MAX_READING_MS);
  const check = () => { if (stopped) throw stopped; if (options.signal.aborted) throw aborted(); };
  const wait = async <T>(task: Promise<T>): Promise<T> => { check(); const result = await Promise.race([task, stopPromise]); check(); return result; };
  const progress = (message: string) => { check(); options.onProgress(message); };
  const pages: DocumentPage[] = [];
  let limited = false;
  const boundedText = (text: string) => {
    if (text.length > MAX_PAGE_TEXT) limited = true;
    return text.slice(0, MAX_PAGE_TEXT).replace(/\u0000/g, '').trim();
  };
  const canvasFor = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width)); canvas.height = Math.max(1, Math.floor(height));
    if (canvas.width * canvas.height > MAX_RENDER_PIXELS) throw new ReadingError(SAFE_FAILURE);
    canvases.add(canvas);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new ReadingError('This browser cannot render the document locally.');
    return { canvas, context };
  };
  const releaseCanvas = (canvas: HTMLCanvasElement) => { canvas.width = 0; canvas.height = 0; canvases.delete(canvas); };
  let currentOcrPage = 1;
  const ocr = async (canvas: HTMLCanvasElement, page: number) => {
    currentOcrPage = page;
    if (!worker) {
      progress('Loading local text reader');
      const sdk = await wait(import('tesseract.js'));
      const initialization = sdk.createWorker(options.language === 'hi' ? 'eng+hin' : 'eng', 1, {
        workerPath: asset(`${OCR_ASSETS}/reader-worker.js`), corePath: asset(`${OCR_ASSETS}/core`), langPath: asset(`${OCR_ASSETS}/lang`),
        cacheMethod: 'none', workerBlobURL: false, gzip: true,
        logger: message => {
          if (!stopped && !options.signal.aborted && message.status === 'recognizing text') options.onProgress(`Reading page ${currentOcrPage} locally`);
        },
        // The SDK can report language/bootstrap failures without settling createWorker.
        // End our wait immediately, using fixed copy rather than vendor-provided details.
        errorHandler: () => stop(new ReadingError(SAFE_FAILURE)),
      }).then(async initialized => {
        // createWorker returns its handle only after bootstrap. No document is sent until this check.
        if (stopped || options.signal.aborted) { await initialized.terminate(); throw stopped ?? aborted(); }
        worker = initialized;
        return initialized;
      });
      await wait(initialization);
    }
    check();
    progress(`Reading page ${page} locally`);
    const result = await wait(worker!.recognize(canvas, {}, { text: true }));
    const confidence = Number.isFinite(result.data.confidence) ? Math.max(0, Math.min(100, result.data.confidence)) : undefined;
    const text = boundedText(result.data.text ?? '');
    if (!text || confidence === undefined || confidence < 60) limited = true;
    pages.push({ page, text, method: 'local-ocr', ...(confidence === undefined ? {} : { confidence }) });
  };

  try {
    progress('Opening document on this device');
    const bytes = new Uint8Array(await wait(file.arrayBuffer()));
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new ReadingError('Choose a non-empty file no larger than 12 MiB.');
    if (!globalThis.crypto?.subtle) throw new ReadingError('Local reading requires a secure browser connection.');
    const digest = await wait(globalThis.crypto.subtle.digest('SHA-256', bytes));
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (file.type === 'application/pdf') {
      if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') throw new ReadingError(SAFE_FAILURE);
      const pdfjs = await wait(import('pdfjs-dist'));
      pdfjs.GlobalWorkerOptions.workerSrc = asset(`${PDF_ASSETS}/pdf.worker.min.mjs`);
      loading = pdfjs.getDocument({
        // PDF.js 6 removed runtime eval (and its old isEvalSupported option).
        data: bytes, enableXfa: false, disableFontFace: true, useSystemFonts: false, stopAtErrors: true,
        useWorkerFetch: false, disableAutoFetch: true, disableStream: true, disableRange: true,
        isOffscreenCanvasSupported: false, isImageDecoderSupported: false, maxImageSize: MAX_INPUT_PIXELS,
        cMapUrl: asset(`${PDF_ASSETS}/cmaps/`), cMapPacked: true, useWasm: false, verbosity: -1,
      });
      const document = await wait(loading.promise);
      if (!Number.isSafeInteger(document.numPages) || document.numPages < 1) throw new ReadingError(SAFE_FAILURE);
      if (document.numPages > MAX_PAGES) limited = true;
      for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, MAX_PAGES); pageNumber++) {
        progress(`Reading PDF page ${pageNumber}`);
        const page = await wait(document.getPage(pageNumber));
        try {
          const content = await wait(page.getTextContent());
          const text = boundedText(content.items.map(item => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join(''));
          if (text) pages.push({ page: pageNumber, text, method: 'pdf-text' });
          else {
            // Rendering deliberately disables annotations/external fonts and may omit unsupported images.
            limited = true;
            const base = page.getViewport({ scale: 1 });
            dimensions(base.width, base.height);
            const scale = Math.min(2, Math.sqrt(MAX_RENDER_PIXELS / (base.width * base.height)));
            const viewport = page.getViewport({ scale });
            const { canvas, context } = canvasFor(viewport.width, viewport.height);
            try {
              rendering = page.render({ canvas, canvasContext: context, viewport, annotationMode: pdfjs.AnnotationMode.DISABLE });
              await wait(rendering.promise); rendering = null;
              await ocr(canvas, pageNumber);
            } finally { releaseCanvas(canvas); }
          }
        } finally { page.cleanup(); }
      }
    } else {
      imageDimensions(bytes, file.type);
      if (typeof createImageBitmap !== 'function') throw new ReadingError('This browser cannot decode images locally. Try a current browser.');
      const decoding = createImageBitmap(file).then(decoded => {
        if (stopped || options.signal.aborted) { decoded.close(); throw stopped ?? aborted(); }
        bitmap = decoded; return decoded;
      });
      const decoded = await wait(decoding);
      const [width, height] = dimensions(decoded.width, decoded.height);
      const scale = Math.min(1, Math.sqrt(MAX_RENDER_PIXELS / (width * height)));
      if (scale < 1) limited = true;
      const { canvas, context } = canvasFor(width * scale, height * scale);
      try {
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
        decoded.close(); bitmap = null;
        await ocr(canvas, 1);
      } finally { releaseCanvas(canvas); }
    }
    check();
    return { sourceId: options.sourceId, role: options.role, pages, limited, fingerprint };
  } catch (error) {
    if (stopped) throw stopped;
    if (options.signal.aborted) throw aborted();
    if (error instanceof ReadingError) throw error;
    throw new ReadingError(SAFE_FAILURE);
  } finally {
    clearTimeout(timeout); options.signal.removeEventListener('abort', onAbort);
    rendering?.cancel(); stopWorker(); destroyPdf();
    if (bitmap) (bitmap as ImageBitmap).close();
    for (const canvas of canvases) releaseCanvas(canvas);
  }
}
