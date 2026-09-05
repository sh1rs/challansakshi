# Document-first release verification — 5 September 2026

## What is implemented

`/review` is now the document-first entry. A chosen PDF or image is read in the browser, labelled fields are shown with source/page/method, uncertain readings can be corrected, and a neutral review note can be prepared. An independently supplied vehicle record enables a bounded registration comparison. The same file supplied twice cannot establish a match. The adaptive manual journey remains at `/manual/challan`; the message-only safety entry is preserved.

White/navy/teal/amber tokens, serif headings, sans-serif actions, visible language selection, divider-based service rows and compact shared chrome follow the supplied reference. The shared footer holds the general product disclaimer. Necessary evidence uncertainty, download privacy and synthetic-data labels remain at the relevant action or result.

## Verified gates

- Final root Vitest after response-policy and correction-state fixes: 50 files, 878 tests passed.
- TypeScript: `tsc --noEmit` passed.
- Scoped web lint: `eslint app components lib tests scripts next.config.ts worker.ts --ignore-pattern dist --ignore-pattern .next` passed without warnings.
- Full Chromium suite: 34 tests passed. Includes real PDF parsing and actual image OCR using fabricated documents, comparison/correction, duplicate-source abstention, malformed-file recovery, private downloads, shared-device printing, navigation cleanup, no document upload/storage, manual fallback, keyboard/scroll, mobile English/Hindi geometry, shared route styling and dark mode.
- Official-route clock: additional runs just before expiry (`2026-10-02T23:59:59Z`) and at expiry (`2026-10-03T00:00:00Z`) each passed.
- Independent bounded review: no outstanding actionable findings. The reviewer also reran 32 evidence/interaction tests and checked the release-probe script syntax.
- The final visual pass found an obsolete correction demand after a valid OCR correction. That resolved field-specific demand is now removed while partial-document, duplicate-source and other unresolved-field limitations remain; three added regressions pass.
- `git diff --check` passed before release staging.
- Staged authored-source whitespace check passed with `git diff --cached --check -- ':!public/document-assets'`. Unmodified upstream licence notices contain two trailing-space lines and one final blank line; these vendor-only warnings are retained rather than editing the original notices.
- Vinext production web build passed (all five build stages).

## Production findings and deployment

The initial product commit `8665ed7` deployed successfully as Cloudflare version `f0ca379d-ed5c-4a46-ab6a-5887019b245e` (100% traffic confirmed). Actual production OCR, PDF extraction, correction, neutral-note preparation and independent registration comparison succeeded with fabricated documents. All eight requested public routes returned 200.

The stricter network probe then rejected automatic Cloudflare analytics script injection. All nine unexpected script attempts were GETs without bodies and had Playwright failure `csp`: the existing Content Security Policy blocked them. No document data transmission was observed. The probe was not weakened to allow these requests.

A follow-up response policy appends `no-transform` to HTML cache headers without replacing existing `no-store`/security directives. Fifteen new Worker-boundary tests cover streaming, immutable headers, cache/security preservation, duplicate handling and unchanged API/non-HTML behavior. Cloudflare documents this directive as preventing automatic beacon injection: [Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).

### Final deployed state

- Deployed source commit: `6973d2c` (document-first base `8665ed7`).
- Active Cloudflare version: `93356e65-0f0d-444e-8209-be0974cfc4a5`, confirmed at 100% traffic.
- Deploy script: `CODEX-DEPLOY OK (mode: real)` after a fresh production build.
- Final full browser suite: 34/34 passed after both the response-policy and correction-state changes.
- Public release probe: **PASS**. Eight distinct public routes returned 200. Actual image OCR, correction, PDF text extraction, an independent notice-versus-RC mismatch and source-linked note preparation succeeded.
- Public probe observed 126 HTTP requests, all same-origin GETs without bodies. No hosting analytics injection remained, no fixture identifiers appeared in request URLs, and no page errors were recorded. IndexedDB databases, localStorage and sessionStorage were empty when checked after the document journeys.
- Production `/review` served `Cache-Control` containing `no-transform`; existing CSP and security headers were retained. Both `ANALYSIS_ENABLED` and `SYNTHETIC_UPLOADS_ENABLED` remained `false` in the deployment output.
- The deploy script restored the pre-existing local compatibility date. No app code remained dirty after the source commit; the later release-evidence commit changes documentation and the diagnostic verifier only.

### Performance limitation — not an instant-OCR claim

The first final-version production image attempt timed out. A repeat completed the fabricated image reading/correction/note check in **71,872 ms**, including reader startup/download and verification actions/screenshots; the separate two-PDF reading/comparison/note check took **4,207 ms**. Those are single desktop-browser release-check timings, not engine-only measurements, mobile benchmarks or accuracy estimates. The chosen OCR core and two language files require roughly 8 MiB on first use. First-use image latency remains an optimization item; the UI names the initial reader download, supports cancel/remove, enforces a 90-second reading bound and retains manual review. Do not market this build as instant, offline-ready on first use, or validated on low-end phones.

## Privacy and capability limits

- Only fabricated documents were used in verification. Reading uses same-origin, pinned, lazy-loaded browser assets, not an AI-provider upload. Inputs remain in tab memory; no document IndexedDB, localStorage or sessionStorage was observed in browser tests.
- Limits: 12 MiB per file, three pages per document, bounded decoded pixels/text and a 90-second reading timeout. First use downloads reader/language assets. The generated vendor directory totals about 49 MiB across alternatives; that is not the initial home-page payload. No slow-phone or population-wide OCR accuracy claim is made.
- OCR reads labelled text, not the vehicle in an enforcement photograph or whether an offence occurred. It does not authenticate a record or decide legal validity. Low-confidence and invalid registration candidates stay uncertain; citizens can supply explicitly recorded corrections.
- The document note is not yet integrated into the deeper manual grievance-pack/receipt controller. Government login, OTP, CAPTCHA, payment and submission remain user-controlled on official services.
- User authorized opt-in cloud vision with a **maximum INR 500 per month** budget, but it is **not implemented/enabled for real-document use on this release**. Read-only secret inventory returned `[]`; there is no production model key or enforceable spend/abuse setup. Follow-up requires secure key configuration, conservative INR-aware spending enforcement, strict observations-only handling, selected-file consent, accurate recipient/retention wording and server-side failure/security tests. Do not simply flip the synthetic analysis flags or assume a provider dashboard warning is a hard cap.
- Shared/unknown-device downloads and printing remain off. Private-device exports contain extracted identifiers; Quick Exit cannot erase a downloaded file or a separately opened PDF tab.

## Reproducible release check

With the project's bundled Node runtime on PATH:

```sh
DOCUMENT_RELEASE_BASE=https://challansakshi.sh1rs.com node scripts/verify-document-release.mjs
```

This checks eight public routes and performs actual OCR, an explicit correction and note preparation using a fabricated image, then independent notice/RC PDF extraction and mismatch comparison. It checks same-origin GET-only asset requests, absent fixture identifiers in URLs, empty document storage and page errors, without opening or acting in any government service. Screenshots go to `/tmp/challansakshi-release-{start,reading,prepared,pdf-comparison}.png`.

## Workspace boundaries

The frozen extension and protected audit directory were not part of this release. The deliberate local `wrangler.jsonc` compatibility-date difference is preserved and excluded from staging. Generated browser-reader assets under `public/document-assets/` are an intentional part of the web release and must be committed with their pinned dependencies and preparation script.
