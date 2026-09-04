# Adaptive citizen resolution — local verification

Date: 2026-09-05. Branch: `codex/challansakshi-resolution-layer`. Starting design checkpoint: `2be6617`. This record belongs to the implementation commit that contains it.

**Status: implemented and locally verified; not pushed, merged, or deployed.** The preview is `http://localhost:3000/review`. No current-production claim is made. The existing deliberate `wrangler.jsonc` working-tree change is excluded from this implementation checkpoint.

## What changed

- The real e-Challan flow is now **Check → Resolve**, with adaptive native-radio questions on one stable surface. The common plate mismatch requires three answers and one explicit confirmation, not a mandatory upload or a long questionnaire.
- Source and readable independent record come first. Missing records, unavailable photographs, unclear observations, matching observations, and category-only differences follow conservative separate paths. An unanswered field is not treated as an explicit unclear answer.
- Optional files, metadata, device context, and the deeper preparation workflow are requested only when relevant. Self/helper confirmation and current-pack authority remain enforced; no official filing or payment is performed.
- The homepage presents exactly three routes: challan/photo review, message-only safe stop, and FASTag review. Shared navigation is compact and keyboard accessible. The real-product disclaimer is one footer paragraph plus one Safety & privacy link; consequential actions retain their necessary confirmation and status text.
- English and Hindi share the same adaptive behavior. Ordinary text and mandatory controls remain at least 16 px; compactness comes from fewer questions, shorter copy, and reduced spacing, not tiny text.
- Confirming or editing transfers focus to the persistent heading before the old focused controls disappear. There is no unconditional transition scroll. Only named offscreen validation recovery may use nearest scrolling.
- Evidence changes invalidate confirmations and pending artifacts. Same-file replacement increments selection version. Optional metadata changes retain the confirmed finding but invalidate the prepared pack. Quick Exit clears the review and revokes selected local preview URLs.
- Requested official routes and fallback routes are checked independently. Stale routes expose no URL; mounted expiry, focus refresh, and pre-effect checks protect against stale links and exports.
- `SUBMISSION.md` and `DEMO_SCRIPT.md` now explain the real versus synthetic boundary and the concrete Codex contribution. No video-upload or deployment success is claimed.

## Final gates

All commands use the bundled Node runtime on PATH and run from this repository. These are observed results, not inherited handoff counts.

| Gate | Result |
| --- | --- |
| `vitest run --reporter=json --outputFile=/tmp/challan-final-unit.json` | **807 passed, 0 failed; 46 test files** |
| `tsc --noEmit` | Passed |
| `eslint . --ignore-pattern dist --ignore-pattern .next` | Passed, no warnings |
| `node node_modules/vinext/dist/cli.js build` | Passed, all five build phases |
| `playwright test --config playwright.config.ts --output=/tmp/challan-release-browser` | **29 passed, 0 failed** |
| Exact pre-expiry acceptance clock | **1 passed** at `2026-10-02T23:59:59.000Z`; mounted advance removes the route |
| Exact expired acceptance clock | **1 passed** at `2026-10-03T00:00:00.000Z`; server HTML and hydration contain no official lookup URL |
| `git diff --check` | Passed |

Vinext prints its existing route-classification limitation (`? Unknown`); the build exits successfully. Browser output includes non-blocking Node color-environment warnings. Neither is reported as a failed gate.

Browser coverage includes 320×844, 375×812, and 390×844; English/Hindi; dark contrast; native keyboard radios; Menu Escape/focus return; query-seeded server rendering; plate/category mismatch; missing records and photographs; unclear and aligned paths; helper confirmation; shared-device export restrictions; private summary print rendering; edit invalidation; local-file replacement; Quick Exit; route expiry; and case-action network/storage checks.

The local-file test uses an in-memory fabricated one-pixel PNG. It verifies no raw filename rendering, no inferred plate answer, invalidation on replacement, clearing on unavailable-photo selection, and no retained review after Exit/revisit. No citizen documents were used.

## Fresh visual measurements

`node scripts/capture-adaptive-ux.mjs` captured the normal real-clock preview. Metrics are in `/tmp/challansakshi-adaptive-proof/metrics.json`; nine screenshots and additional 320/390-width measurements are in the same temporary directory. The committed capture script reproduces them. Temporary screenshots are not a permanent release artifact.

| Measurement | English | Hindi |
| --- | ---: | ---: |
| Header height, all tested widths | 64 px | 64 px |
| Footer height, 375 px width | 226.13 px | 202.94 px |
| Footer height, 320 px width | 249.31 px | 249.31 px |
| Confirmation scroll delta, 375×812 | **0 px** | **0 px** |
| Edit scroll delta, 375×812 | **0 px** | **0 px** |
| Result official-lookup bottom, 375×812 | 556.48 px | 534.09 px |
| Result preparation-button bottom, 375×812 | 634.88 px | 612.48 px |
| Horizontal overflow | 0 px | 0 px |

Required visible action targets meet 48×48 px; minimum mandatory text is 16 px. Browser tests independently verify visible h1 at 26 px and h2 at 20 px. All three home routes fit in the 375×812 first viewport. The result finding, official lookup, and preparation action fit before the viewport bottom. This is not a claim that the footer or optional deep workflow never requires scrolling.

Visually inspected: English home, English result, Hindi result, and dark review/menu screenshots. Keyboard and pointer behavior were exercised in Chromium, not inferred from static images.

## Issues caught during verification

- Review progression could retain incompatible image state after changing a photograph answer. The fixed transition clears inactive facts, answeredness, source metadata, and image-dependent evidence together; regression tests cover it.
- Helper role/confirmation could diverge from the handoff controller. Integration coverage now exercises both ordered helper gates and the resulting controller authority.
- Async copy/export actions could become stale after edits, unmount, or route expiry. Effects now check current route authority before starting and latest signatures before recording completion; repeated expired actions remain blocked.
- Removing `scrollIntoView` alone did not prevent Chromium from scrolling when its focused input disappeared. Moving focus before the phase update preserves the captured scroll position; EN/HI tests and fresh captures confirm it.
- The local Worker did not inherit the shell's acceptance-clock variables. Test-only Vite constants now forward exactly those two non-secret values during explicit acceptance `serve` runs, with no broad environment forwarding and no production-build replacement. This uses [Vite's documented `define` mechanism](https://vite.dev/config/shared-options.html#define). Exact server-rendered boundary tests now pass.
- Browser-test selectors were corrected to target visible screen headings rather than print-only headings, named actions rather than incidental button order, and the appropriate local-preview region. Expected category text was aligned with the actual bounded `Possible vehicle mismatch` result, including its specific vehicle-category explanation.

Independent read-only reviews found no remaining actionable blockers in adaptive state, evidence provenance, confirmation/device restrictions, stale-artifact guards, or the narrow acceptance-clock configuration. Reviewers' temporary journals are not cited as committed proof; the regression tests and this record are the durable evidence.

## Implementation adjustments

Question rendering and bilingual question copy are colocated in `CitizenReviewCheck.tsx`; styling is `CitizenReviewAdaptive.module.css`. The result remains inside `CitizenReviewApp.tsx` so existing handoff state and actions retain one owner. No wrapper-only Resolution component was added. `useClientReady` prevents interaction with server-rendered review controls before handlers attach. The shared header change did not require editing the FASTag orchestrator.

## Deployment invariants and remaining work

- Keep `CHALLANSAKSHI_BROWSER_ACCEPTANCE` and `CHALLANSAKSHI_ACCEPTANCE_NOW_ISO` absent from production Worker bindings. The normal preview was restarted without them. The runtime helper deliberately honors only an explicit acceptance opt-in; it is not citizen-configurable.
- No production flags, secrets, government adapters, or public-upload boundaries were changed. No push, merge, deployment, or public video upload occurred.
- The protected owner QA directory was not inspected or changed. The extension remains untouched and outside this verification scope.
- These are desktop Chromium mobile-viewport checks, **not physical Android/iPhone or Safari certification**. Physical-device, screen-reader, and user-observation sessions remain important before a broad public-launch claim.
- FASTag received shared-chrome changes, not a redesign of its internal stages. Its separate step-scroll behavior remains a named follow-on; do not claim site-wide no-jump behavior.
- This slice improves the real citizen journey but does not make real-file OCR, live government retrieval, automatic filing, payment, or guaranteed official resolution available. The synthetic demo remains separate. No competition rank or scoring outcome is guaranteed.
- Next release work: review this checkpoint, deploy the verified web build through the established release process, verify the public URLs and actual-device journey, then record/publish the judged video against that deployed version.
