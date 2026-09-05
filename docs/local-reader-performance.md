# Local reader performance and maintenance

The reader keeps document bytes on the device. Its public OCR/PDF software is
downloaded separately from the same origin; those downloads contain no citizen
document content. `public/_headers` allows the browser to reuse only the pinned
reader software directories for seven days. The application's document, reply,
and checklist storage rules are unchanged by these HTTP asset headers.

Change the public asset URL whenever the SDK, WebAssembly core, language data, or
worker code changes. Keep SDK paths in `lib/local-document-reader.ts` and the
copying rules in `scripts/prepare-document-assets.mjs` synchronized. Do not apply
these cache rules to HTML, API responses, document inputs, or prepared notes.

The reader uses the existing compact English/Hindi language data and lets
Tesseract select the supported LSTM/SIMD core. No recognition model or language
coverage was changed for this optimization. There is no persistent Tesseract
database, service worker, or document cache.

A small `reader-worker.js` wrapper forwards Tesseract messages unchanged and
closes the worker after a bootstrap rejection. The SDK does not expose its worker
handle until initialization succeeds, and some language-initialization failures
do not settle that promise. The reader converts its error callback to fixed
recovery copy immediately; the wrapper releases the otherwise unreachable worker.
Normal document cancellation still uses the existing abort/termination checks.

## Measure the relevant phases

`scripts/verify-document-release.mjs` now reports `imageReadingMs`, measured from
file selection until a local reading is visible. Its older
`imageReadingAndReviewMs` also includes correction interactions and screenshot
capture; do not describe that number as recognition time alone. The verifier
generates synthetic documents and checks that their contents/identifiers are not
sent in requests. Never replace its generated fixtures with citizen documents.

A live browser diagnostic on 2026-09-05 observed a failed OCR core asset request
(`net::ERR_QUIC_PROTOCOL_ERROR`) and a worker asset taking about 4.9 seconds.
These are evidence of transport trouble in that run, not an OCR accuracy or
CPU-performance result. The previous headers required revalidation for each
reader asset, including repeat reads. Browser caching reduces that repeat-read
network dependency; it cannot remove the first download or guarantee an offline
read. Measure a new browser context and then a repeat read in the same context
when comparing cold and warm runs.

Reference guidance: [Tesseract performance documentation](https://github.com/naptha/tesseract.js/blob/master/docs/performance.md)
and [Cloudflare static-asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).
