# Document-first release verification — 5 September 2026

## What is implemented

`/review` is now the document-first entry. A chosen PDF or image is read in the browser, labelled fields are shown with source/page/method, uncertain readings can be corrected, and a neutral review note can be prepared. An independently supplied vehicle record enables a bounded registration comparison. The same file supplied twice cannot establish a match. The adaptive manual journey remains at `/manual/challan`; the message-only safety entry is preserved.

White/navy/teal/amber tokens, serif headings, sans-serif actions, visible language selection, divider-based service rows and compact shared chrome follow the supplied reference. The shared footer holds the general product disclaimer. Necessary evidence uncertainty, download privacy and synthetic-data labels remain at the relevant action or result.

## Verified gates

- Root Vitest: 49 files, 860 tests passed.
- TypeScript: `tsc --noEmit` passed.
- Scoped web lint: `eslint app components lib tests scripts next.config.ts worker.ts --ignore-pattern dist --ignore-pattern .next` passed without warnings.
- Full Chromium suite: 34 tests passed. Includes real PDF parsing and actual image OCR using fabricated documents, comparison/correction, duplicate-source abstention, malformed-file recovery, private downloads, shared-device printing, navigation cleanup, no document upload/storage, manual fallback, keyboard/scroll, mobile English/Hindi geometry, shared route styling and dark mode.
- Official-route clock: additional runs just before expiry (`2026-10-02T23:59:59Z`) and at expiry (`2026-10-03T00:00:00Z`) each passed.
- Independent bounded review: no outstanding actionable findings. The reviewer also reran 32 evidence/interaction tests and checked the release-probe script syntax.
- `git diff --check` passed before release staging.
- Staged authored-source whitespace check passed with `git diff --cached --check -- ':!public/document-assets'`. Unmodified upstream licence notices contain two trailing-space lines and one final blank line; these vendor-only warnings are retained rather than editing the original notices.
- Vinext production web build passed (all five build stages).

Live deployment results will be appended after that operation completes. Passing local tests and build is not proof of deployment.

## Privacy and capability limits

- Only fabricated documents were used in verification. Reading uses same-origin, pinned, lazy-loaded browser assets, not an AI-provider upload. Inputs remain in tab memory; no document IndexedDB, localStorage or sessionStorage was observed in browser tests.
- Limits: 12 MiB per file, three pages per document, bounded decoded pixels/text and a 90-second reading timeout. First use downloads reader/language assets. The generated vendor directory totals about 49 MiB across alternatives; that is not the initial home-page payload. No slow-phone or population-wide OCR accuracy claim is made.
- OCR reads labelled text, not the vehicle in an enforcement photograph or whether an offence occurred. It does not authenticate a record or decide legal validity. Low-confidence and invalid registration candidates stay uncertain; citizens can supply explicitly recorded corrections.
- The document note is not yet integrated into the deeper manual grievance-pack/receipt controller. Government login, OTP, CAPTCHA, payment and submission remain user-controlled on official services.
- User authorized opt-in cloud vision, but it is **not implemented/enabled for real-document use on this release**. Read-only secret inventory returned `[]`; there is no production model key or enforceable spend/abuse setup. Follow-up requires secure key configuration, an explicit spending limit, strict observations-only handling, selected-file consent, accurate recipient/retention wording and server-side failure/security tests. Do not simply flip the synthetic analysis flags.
- Shared/unknown-device downloads and printing remain off. Private-device exports contain extracted identifiers; Quick Exit cannot erase a downloaded file or a separately opened PDF tab.

## Reproducible release check

With the project's bundled Node runtime on PATH:

```sh
DOCUMENT_RELEASE_BASE=https://challansakshi.sh1rs.com node scripts/verify-document-release.mjs
```

This checks eight public routes and performs actual OCR, an explicit correction and note preparation using a fabricated image. It checks same-origin GET-only asset requests, empty document storage and page errors for that journey, without opening or acting in any government service. Screenshots go to `/tmp/challansakshi-release-{start,reading,prepared}.png`.

## Workspace boundaries

The frozen extension and protected audit directory were not part of this release. The deliberate local `wrangler.jsonc` compatibility-date difference is preserved and excluded from staging. Generated browser-reader assets under `public/document-assets/` are an intentional part of the web release and must be committed with their pinned dependencies and preparation script.
