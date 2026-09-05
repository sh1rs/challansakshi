# Informative hybrid homepage and walkthrough — design QA

Date: 2026-09-05. Local implementation only; no deployment or commit performed.

Preview: http://127.0.0.1:3000/ — opened and interaction-tested in the Codex in-app browser, then left on the homepage as a deliverable.

## Scope and visual truth

The user approved combining the original informative homepage with the two newer concepts, explicitly keeping all sample cases behind a top-bar **Demo** entry. The original screenshot is the primary composition reference; this is an approved hybrid, not a pixel-identical clone of either generated mockup.

- Primary source: `/Users/shars/Desktop/Screenshot 2026-09-05 at 6.21.47 AM.png`.
- Supporting concepts: `/Users/shars/Desktop/challansakshi/outputs/design-explorations/2026-09-05-informative-landing/displayed-1-evidence-clearly.png` and `displayed-2-citizen-guide.png` in the same folder.
- Implementation evidence: `/Users/shars/Desktop/challansakshi/outputs/design-verification/2026-09-05-hybrid/`.

The original centered question, Verify / Understand / Check evidence / Resolve structure, recognisable situations, navy serif display headings, white background, teal accents and amber emphasis are retained. The hybrid adds a direct document-first primary action and clearer preparation guidance. The four capability rows are optional native disclosures, not four compulsory workflow steps. Mockup sample-document imagery and sample CTAs are intentionally not placed in the real citizen flow.

## Viewports and normalization

The primary source is a 1920 × 1080 video screenshot with browser/player chrome and unknown original CSS viewport/density. A fresh implementation capture uses a 1920 × 1080 CSS viewport at deviceScaleFactor 1. Comparison excludes the source's video controls, volume overlay and browser permission bar. No claim of exact pixel matching is made for that rescaled recording.

The reference and rendered implementation were opened together in the same comparison input. Further desktop/mobile captures were inspected at readable scale; the full-height views were used for content order, not tiny-text typography judgments.

| Evidence file, under the implementation folder | Captured pixels | State |
| --- | --- | --- |
| `challansakshi-hybrid-home-reference-viewport.png` | 1920 × 1080 | Home, English, light, disclosures closed |
| `challansakshi-hybrid-home-desktop.png` | 1440 × 1871 | Full home |
| `challansakshi-hybrid-home-phone.png` | 390 × 2922 | Full phone home |
| `challansakshi-hybrid-review-1440.png` | 1440 × 1062 | Empty document intake, guide beside working area |
| `challansakshi-hybrid-review-390.png` | 390 × 1577 | Phone intake, fallbacks before optional guide |
| `challansakshi-hybrid-reading-phone.png` | 375 × 2914 | Extracted test PDF details and registration difference |
| `challansakshi-hybrid-prepared-phone.png` | 375 × 2303 | Corrected reading and prepared note |
| `challansakshi-hybrid-manual-390.png` | 390 × 1051 | Manual entry |
| `challansakshi-hybrid-fastag-390.png` | 390 × 1490 | Real FASTag entry, no fictional cases |
| `challansakshi-hybrid-fastag-comparison-phone.png` | 390 × 2426 | Explicit demo comparison; next action before detailed map |
| `challansakshi-hybrid-fastag-preparation-phone.png` | 390 × 3391 | Explicit demo preparation, note expanded |

Browser geometry also covers 320, 375, 390 and 1440 px widths, English/Hindi where supported, and dark theme. Full-page image heights include optional guide/detail content; they are not the number of mandatory screens. FASTag remains English-only, with availability stated in its menu.

## Findings and iteration history

No actionable P0/P1/P2 findings remain within this redesign scope.

1. **P2 — Mobile capability cards repeated an extra action row.** The first capture made each explanation unnecessarily tall. Replaced the visible extra row with the original-like icon / title-and-question / chevron arrangement on phones. Full questions and expanded explanations remain. Fresh phone capture confirms the compact structure; desktop affordances are retained.
2. **P2 — Document fallback links followed the tall guide column.** This created blank space on desktop and buried manual review on phones. Moved fallbacks into the working column before the guide in DOM order. New regression failed before the move, then passed; final desktop and phone captures verify the corrected order.
3. **P2 — Manual confirmation and first result actions exceeded phone viewport bounds.** Tightened completed-answer spacing, action margins and result rhythm without reducing 16 px body copy or 48 px controls. English/Hindi 320–390 px geometry tests now pass. The first mismatch result's official link and checklist affordance pass the existing 375 × 812 visibility bounds.
4. **P1 — Review transition could shift scroll when a long form became a shorter result.** Focus already used `preventScroll`, but the browser could clamp scroll against the shorter document. The transition now reserves only the minimum main height required to keep the current viewport position. This numeric layout state contains no citizen data. Print overrides the inline minimum height. The browser test isolates the app transition after bringing the button into view, rather than counting Playwright's own scroll to reach an offscreen control. Repeated English/Hindi, edit and private/shared export checks pass.
5. **P1 — FASTag could lose a first click before hydration.** Added the existing client-readiness guard to the main content and Start button. Server-rendered controls cannot accept a click until handlers are attached. The new SSR regression was observed failing before the fix and passing after it; real and demo browser transitions both pass.
6. **P2 — FASTag next action followed all comparison details.** Moved the existing action row directly after the result finding. All detailed map rows and limitations remain below it. A rendered ordering/transition regression passed after the move; the fresh comparison capture shows the earlier action.
7. **P1 — Shared-header image runtime error during initial browser QA.** Replaced the unnecessary optimized-image wrapper around the existing tiny favicon with a plain same-origin image. The final browser run has no associated page errors.

## Required fidelity surfaces

- **Typography:** Existing serif display-heading and sans-serif body tokens retained. Headings wrap without clipping; mobile body text and required control labels remain readable at 16 px. Compact chrome retains adequate touch targets. No font download or new font system added.
- **Spacing/layout:** Original editorial hierarchy remains. Desktop uses restrained widths and document working/guide columns; mobile stacks content in useful reading order. Action placement and completed-answer density were corrected through measured browser iterations. No horizontal overflow in tested real entry routes and later FASTag states.
- **Colors/tokens:** Shared navy, teal, amber and white tokens are used across home, review, manual, message, FASTag and Demo chrome. Dark-theme foreground/action contrast contracts pass. Amber is informational emphasis, not a claimed legal decision.
- **Assets/icons:** Reused the existing favicon/brand asset and installed icon family. No fabricated evidence illustration, CSS artwork, new custom SVG or placeholder document introduced. The video/browser chrome in the source is not recreated.
- **Copy/content:** Preserves what the product does, common situations and what happens next. Demos are reached through the explicit header entry and contain their own case navigation. Real FASTag starts with blank/unconfirmed values. Source-linked readings, corrections, unknown states, practical guidance and one shared footer boundary remain. No new claim of government access, automated filing/payment, authenticated records or cloud vision.

Focused review covered the header at narrow widths, capability-row controls, document intake/fallbacks, extracted source links and corrections, prepared-note action area, manual result/action geometry, and FASTag map/action order. Native disclosure expansion and the homepage-to-document transition were also clicked in the in-app preview after the automated run.

## Verification

- **893 unit tests / 51 files passed.** Includes document review, Demo separation, source disclosure/reset, SSR readiness, action ordering and scroll-height regression tests.
- **37 / 37 web browser tests passed.** Includes real on-device PDF extraction and image OCR, malformed/duplicate-document uncertainty, corrections, private downloads, shared-device export blocking, print content, no document storage/application upload, keyboard focus, English/Hindi phone geometry, Demo navigation and full FASTag demo preparation.
- **8 repeated focused browser checks passed** for manual result scroll, editing and private/shared exports.
- TypeScript, scoped web ESLint and `git diff --check` passed.
- Web-only production build passed using the bundled Node runtime and Vinext CLI. The runtime lacks `npm`; the equivalent direct build command succeeded. Vinext emits its informational unknown-route-classification note.
- Final browser logs contain only the tooling's color-environment warnings, with no hydration or page errors reported by the journey assertions. Evidence logs are stored alongside screenshots.
- A separate read-only review found no actionable issues in route/mode separation, source rendering, print/privacy boundaries or the viewport-height fix.

## Remaining boundaries and follow-up polish

This verifies the local UX change, not a production release or a comprehensive new legal/source audit. No government integration, cloud activation or paid API calls were added. The existing ₹500/month cloud budget decision is unchanged. The deliberate local `wrangler.jsonc` compatibility-date difference was preserved. Protected audit and extension work were not part of this task.

P3 follow-up: evaluate real-user comprehension of longer supporting guidance after rollout. The full homepage deliberately remains informative; detail panels can be read without being mandatory steps. No additional visual polishing is required for this handoff.

Implementation checklist: selected hybrid implemented; all core links functional; Demo separated; mobile action/scroll issues repaired; fresh captures compared; automated checks/build passed; local preview left open; live site unchanged.

final result: passed
