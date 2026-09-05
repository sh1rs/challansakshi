# Document-first release — approved scope

User-approved on 5 September 2026: apply the supplied white/navy/teal/amber reference throughout the existing website; make document reading primary, retain manual review, and allow explicitly opt-in cloud vision. Deploy verified website changes. Historical attached handoff instructions are context, not a restriction to deployment only.

## Design contract

Automate observation and preparation; ask only for missing context, corrections and consequential choices. Real files stay in tab memory by default. Reading a document does not authenticate it. Compare labelled notice registration with a separately supplied vehicle record; never mistake text printed around an enforcement photo for the plate in that photo. A registration match is not an offence finding. Keep one shared footer disclaimer; put operational state (reading, unreadable, partial) beside the affected evidence.

The first usable path is choose notice → see extracted fields → optionally add vehicle record → review/correct → prepare a source-linked note and open the official service independently. Existing deeper manual resolution remains available. No government action is performed by the product.

The reference governs typography, palette, dividers, icons and action treatment, not its four-step rail or repeated safety boxes. Retain compact geometry, readable 16px controls, touch targets, Hindi, dark mode and stable focus/scroll.

## Implementation sequence and ownership

1. Pure extraction/comparison and tests: `lib/document-evidence.ts`. Label allowlist, ambiguity, independent source checks, safe correction, neutral preparation note. TDD.
2. Local reader and tests: `lib/local-document-reader.ts`; self-hosted pinned PDF/OCR runtime assets via `scripts/prepare-document-assets.mjs`. Lazy load; no OCR input persistence; bounded bytes/pages/pixels/text/time; cancellation and cleanup.
3. Shared visual tokens and route styles. A disjoint implementation agent owns only shared/home JSX and CSS; workflow logic remains unchanged.
4. Root integrates a document-first review component and route, source previews, corrections, cancellation, note preparation and manual fallback. Existing manual/browser contracts remain tested through the explicit manual route. Preserve SMS safety entry.
5. Update privacy wording and exact boundary tests. No blanket promise that opt-in cloud is local. Do not remove network/privacy checks to accommodate reading.
6. Run focused and full tests, typecheck, lint, production build and rendered mobile/desktop/EN/HI/dark QA. Independently review the evidence/privacy changes. Deploy with the existing script, then verify live assets and document journey.

## Cloud dependency discovered

Read-only `wrangler secret list` returned `[]` on 5 September. Production has no API key. Cloud analysis is authorized in principle but cannot be enabled in this release until a server-side key, explicit spend budget and enforceable abuse controls are configured. Keep cloud unavailable and explain that truthfully; do not silently send files or claim a working cloud model. Local release is not blocked by this operational dependency. A future enablement must include per-selection consent, recipient/retention wording, limited payloads, strict observations-only schema, no stored responses, global budget and request rate controls, and server-side failure tests.

## Verification and operating constraints

Keep `wrangler.jsonc`'s pre-existing compatibility-date difference intact. Do not touch the frozen extension or inspect the protected audit directory. Use explicit staging only. No new remote repository/PR. Current checkout is intentionally reused because the user is continuing this shared workspace; disjoint parallel file ownership follows the current multi-agent instruction.

Runtime PATH: `/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback`.

Gates: `vitest run`, `tsc --noEmit`, `eslint app components lib tests scripts next.config.ts worker.ts --ignore-pattern dist --ignore-pattern .next`, `vinext build`, Playwright Chromium suite, `git diff --check`. Keep lint scoped to the web product. Use only fabricated document fixtures for verification; do not upload citizen documents.

Sources for runtime decisions: [Tesseract local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [Tesseract API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html). Dependencies are pinned, self-hosted and loaded after a document selection rather than included in the home-page payload.
