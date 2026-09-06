# Autonomous mobility build — 6 September 2026

Requested work window: 16:00–18:00 IST. This verified checkpoint records the completed local build and the remaining integration gates. Source changes are local and uncommitted on `codex/screen-aware-voice-coach`. No deployment, cloud resource creation, paid service activation or external messages have occurred.

**Later continuation:** the user subsequently renewed implementation. The new [mobility continuity report](./2026-09-06-mobility-continuity-status.md) covers document dates, connected plans, form copying and conflict recovery. Counts below remain the earlier two-hour checkpoint.

## Current verified result

| Gate | Result |
| --- | --- |
| Unit/integration tests | **1,473 passed across 94 files** |
| Complete development browser suite | **213 passed in one run** |
| Built Cloudflare Worker mobility/correction suite | **143 passed in one run** |
| TypeScript, ESLint, production build, whitespace | **Passed** |
| Combined citizen journey | **Passed** in one fresh browser, from typed intake through correction, follow-up, encrypted transfer and deletion |
| Live Google sign-in, cloud inference, official execution | **Not configured or exercised** |

Local built-Worker preview: `http://127.0.0.1:4180/mobility`. Account status is accurately unconfigured. Setup commands and restart instructions are in the [free starting guide](./mobility-account-setup.md).

## Working additions

| Capability | Implemented behavior | Practical boundary |
| --- | --- | --- |
| Review details already typed | Recognizes conventional registrations, explicitly labelled references and stated authorities in English/Hindi task text; groups duplicates and asks for one review before reusing corrected or selected values. | No home-location or registration-prefix jurisdiction inference. Conflicting candidates remain unselected; raw source snippets are not saved as facts. |
| Coordinated case team | Three independent checks run concurrently, followed by one next-step coach. Current-input fingerprints, source references, partial failure and cancellation. One next-step control focuses the relevant field; uncertainty can remain unresolved and detailed checks are collapsed. | Deterministic on-device rules; no model or official verification implied. |
| Correct several drafts together | Preview profile changes, select affected unfinished cases and apply one reviewed batch. Detect changed profile/case revisions and preserve unsaved editor text. | Completed, awaiting-response and citizen-reported histories excluded. Existing request wording remains for review. |
| Trusted helper | One email, one selected account-case snapshot, one to twenty-four hours. Explicit acceptance, suggestion, owner preview/application, revocation and expiry. | Requires configured account backend. No other-case, payment, official-service or account-settings access. Invitations are shared manually. |
| AI second opinion | A preparation writer followed by a critic. Minimal-data preview, individual request consent, strict output/source validation, case-revision invalidation and atomic request reservations. | Off by default; needs Cloudflare AI binding plus enable switch. Provider responses are fixtures in current tests; model usefulness is not yet evaluated live. |
| Assisted-task lab | Isolated private practice input, exact reviewed-action approval, changed-payload invalidation, synthetic receipt checks, timeout/mismatch recovery, refresh and duplicate-execution handling. | Fictional local portal at `/demo/assistance-lab`. A real cloud browser and official adapter are separate work. |
| Short case brief | Starts without personal data; selected facts, optional draft/reference/reported history, uncertainty and next step form an exact downloadable preview. | Local preparation note, not a receipt or verified official status. |
| Saved-case search | Finds cases by title, jurisdiction, reference or selected saved facts, including formatted vehicle numbers. | Searches only cases already loaded from this private browser. |
| Source observations and follow-up | Source/time/reference, last observation preserved across failed checks, unseen attention items and personal calendar export. | Citizen-entered records; no automatic official monitoring. |
| Local effort notebook | Opt-in active-time estimate, reported repeated entries/help needs and exact six-field reviewed export; memory-only and cleared on leaving. | No analytics upload or demonstrated time-saving claim. |
| Portable encrypted case | Exact preview → passphrase-protected file → local decryption and reviewed fresh copy. Preserves original timestamps and existing cases. | Manual transfer, no backend or automatic sync. Original documents and separate profile/follow-up storage excluded; no lost-passphrase recovery. |
| Original-file fingerprint check | Document review carries SHA-256 into explicitly saved case facts; a later selected file is checked locally against grouped retained fingerprints. | Same bytes can be recognized under a new filename. This does not establish authenticity, truth or independent evidence. Older cases may lack a fingerprint. |
| Reply into a new preparation | A reviewed reply note can become a separate saved preparation, optionally reusing reviewed details from an existing case. Readable full review, renewed source checks and private-device consent. | No inference of an official outcome and no change to the original case history. Oversized notes remain available for download without truncation. |

## Verification ledger

- Earlier increment baseline: 1,227 tests across 78 files; TypeScript, ESLint and production build passed; 89 browser scenarios had passing results across the full run and focused reruns.
- Case team: 24 new unit tests and five browser scenarios passed, including keyboard navigation to the needed field. The shared header now wraps at 320px.
- Profile correction browser suite: six scenarios passed, including cross-tab conflict, all-or-none selection checks and dirty-editor preservation.
- Helper API: eighteen real-SQL scenarios passed, including email binding, scope, expiry, revocation, capacity, deletion, transaction rollback and concurrent equal proposals.
- Helper UI: nine browser scenarios passed. Longer scope and retention copy is behind a disclosure; the full consent preview remains visible.
- Adviser: fifteen unit scenarios and four browser scenarios passed after independent review strengthened Unicode identifier detection and the one-question output contract.
- Assistance lab: twenty-five unit scenarios and eight browser scenarios passed. Private practice input was absent from parent DOM, stored checkpoint and network requests.
- Case brief: six unit scenarios and three browser scenarios passed. Shared-navigation rerun: fifteen combined assistance, brief and case-team scenarios passed.
- Follow-up: 19 unit and eight browser checks passed, including calendar download, cross-tab protection, malformed-data recovery and deletion.
- Effort: 17 unit and five browser checks passed; actual download contains no case content or case ID.
- Portable case: nine unit and nine browser checks passed. Independent review found no blocking defect.
- First integrated checkpoint: all 1,377 unit tests in 88 files, full TypeScript/ESLint and production build passed. Later identity/portable edge-case additions are being revalidated.
- Built-page check: all 21 selected scenarios have passing results across the initial run and focused rerun. One assertion now checks the demo route while allowing its normal landing fragment.
- Account review closed cross-tab identity changes and deleted-source upload previews. Every private account route now binds the request to the account shown in the reviewed UI, and upload sources are checked again immediately before saving.
- Second integrated checkpoint at 11:32 UTC: all 1,403 tests in 90 files passed. This includes six tests through an actual local Cloudflare Worker and D1 runtime, with real transaction rollback, foreign-key deletion and isolation checks. No external provider calls were made.
- Source fingerprint check: 14 unit and eight browser scenarios passed. A real-PDF browser journey also verified the saved SHA-256 against the original PDF bytes.
- Follow-up retention review closed a stale-data bug after a closed panel's notes were deleted or expired. All 10 follow-up browser checks and 19 unit checks passed after the fix.
- Readable encrypted-case previews passed all nine portable browser checks. Reply-to-case passed nine unit and nine browser checks, including completed-parent preservation, stale sources, privacy expiry and oversized notes.
- Full browser checkpoint: 183 of 184 scenarios passed in the combined run. A duplicate automatic validation alert was removed; the remaining scenario passed its focused rerun. A final combined run will follow the current fixes.
- Backend race fixes passed: pending OAuth state reserves its last capacity slot atomically; helper acceptance rechecks revocation/case changes before returning a snapshot. Retained helper history is capped at 100/account, with explicit owner deletion of ended history. Focused backend tests: 68 passed, including seven actual local Worker/D1 checks. Helper browser scenarios: 15 passed.
- Independent integrated review's three working-draft/profile transition findings are fixed. Nine browser checks now cover unadded report/progress isolation, explicit profile reload and stale-source protection, retention recovery, cross-tab deletion, clearing both saved and unsaved profile information, and preventing a previous task's state from overriding the next task.
- English/Hindi dark-mode review at 320px found a low-contrast deletion color. It now uses the shared theme token; repeat inspection reported no visible text under 4.5:1, no buttons under 44px, no horizontal overflow and no page errors in the exercised open panels. This is bounded rendered QA, not a complete accessibility certification.
- Task intake passed 30 unit scenarios and ten browser scenarios. Combined final intake and workspace-conflict run: all 19 passed. Editing the original task, changing language, changing a reviewed choice or leaving the page invalidates the previous review. A separately entered state takes priority without retaining a contradictory confirmed fact.
- Native frontend integration passed through the actual bundled account/helper handler and local D1. It covered reviewed upload, selected snapshot sharing, wrong-email rejection, helper proposal, owner application, revocation, ended-history deletion and another owner's unchanged case. Authentication used three pre-established fabricated sessions; no OAuth exchange, model or external provider was exercised.
- Final implementation checkpoint, 11:56 UTC: all 1,455 tests in 93 files, TypeScript, ESLint, whitespace validation and production build passed. The full 207-scenario development browser run and all 137 mobility/correction browser scenarios against the fresh production bundle are in progress.
- Final intake review found two additional boundary defects: a residence qualifier after a state and narrative/uncertainty copied as an issuer. Both are fixed. The domain now has 45 passing checks; all 16 intake browser scenarios passed, including six persisted-case English/Hindi regressions. Unfamiliar authority forms stay in the original note for manual entry.
- The 207-scenario development checkpoint passed 206 tests; its remaining assertion still expected the previous case-team validation wording. The assertion now verifies the current explanatory hint and disabled control. All 20 case-team/helper scenarios passed afterward. Two helper fixtures also now use the selected test-server origin so production preview does not incorrectly supply a link from another origin.
- Built-runtime review found that the installed Vinext Node preview runs the custom Worker wrapper without platform bindings. Account dispatch now treats missing bindings as an unconfigured service instead of throwing. Three new real-handler wrapper checks passed, covering status, private headers, unavailable actions and rejected cross-origin mutation. Both Node and Wrangler previews returned HTTP 200 `configured:false` after the fix.
- Final code gate, 12:05 UTC: **1,473 tests in 94 files passed**, with whole-workspace TypeScript, ESLint, whitespace validation and production build passing. The final 213-scenario development run and 143-scenario mobility/correction run against the built Cloudflare Worker on port 4180 are underway. This Worker preview uses the real clock and does not deploy anything.
- Fresh built-Worker visual review: English and Hindi at 320px in dark mode, with brief/transfer/source-check/effort/follow-up/appointment panels exercised. No horizontal overflow, computed visible-text contrast failures, undersized buttons, page errors or console errors were observed in that bounded inspection. Screenshots and results are in `/tmp/challansakshi-final-worker-visual-audit`.
- Built Cloudflare Worker gate completed: **143/143 mobility and correction browser scenarios passed in 1.9 minutes** on `http://127.0.0.1:4180`. The run includes the actual frontend-to-native-D1 helper journey, unconfigured account response, real PDF case bridge, encryption round trip, all six final intake boundaries and the nine workspace-conflict regressions. Artifacts: `/tmp/challansakshi-final-worker-143-browser-results`.
- Full development gate completed: **213/213 browser scenarios passed in one 4.9-minute run**, including existing review, real local OCR/PDF, route-expiry, demo, geometry and voice-recovery coverage. Artifacts: `/tmp/challansakshi-final-213-browser-results`.
- A separate combined built-Worker walkthrough used one fresh browser and UI-entered synthetic data: task review → case save → profile reuse/correction → citizen report → source observation → encrypted export/decrypt → unsaved fresh copy → guarded switch → original deletion/reload. It preserved each event once, kept observations separate, left the imported copy unsaved, discarded only its unadded report, and ended with zero cases/follow-up records. Its 52 requests were local reads; no page errors, external requests or network writes occurred. Evidence: `/tmp/challansakshi-combined-journey/result.json`.
- Bounded mobile performance observation on the built Worker used two fresh Chromium contexts at 390×844 with 4× CPU slowdown and an unthrottled local network. Neither `/mobility` nor `/review` fetched optional OCR language/worker or voice-model assets on entry; both had zero external requests, console/page errors and overflow. Observed LCP was 188 ms / 272 ms; the intake input-to-two-animation-frames observation was 37.4 ms. These are single local smoke observations, not real-phone field measurements, INP benchmarks, edge CPU/billing evidence or public performance claims. Evidence and conditions: `/tmp/challansakshi-built-mobile-performance/result.json`.

## Re-run the checks

Use Node 22.13 or newer. The [setup guide](./mobility-account-setup.md) includes the bundled runtime path on this machine. From the repository root:

```sh
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
node node_modules/vinext/dist/cli.js build
```

The complete browser configuration starts its own development server with a fixed route-acceptance clock. Stop an existing server on port 4177 before using its automatic startup:

```sh
node node_modules/@playwright/test/cli.js test --config playwright.config.ts --output=/tmp/challansakshi-web-browser-results
```

For the built Worker, start the exact local Wrangler command in the setup guide, then run the independent mobility gate against it:

```sh
CHALLANSAKSHI_BASE_URL=http://127.0.0.1:4180 node node_modules/@playwright/test/cli.js test --config playwright.config.ts tests/browser/mobility-*.spec.ts tests/browser/profile-corrections.spec.ts --output=/tmp/challansakshi-worker-browser-results
```

Use a different output directory for concurrent runs. The built Worker retains the real clock; the full suite also contains historical route-expiry tests that deliberately require the development server's acceptance clock. Neither preview creates a live account connection or establishes deployed behavior.

## Inputs reserved for your return

Use [the questions list](./2026-09-06-return-questions.md) and [original-idea coverage map](./2026-09-06-idea-coverage.md). The first implementation dependency is the optional Google/D1 account setup; [the free starting guide](./mobility-account-setup.md) gives the exact console and CLI steps. [AI and assistance notes](./mobility-ai-and-assistance.md) explain the multi-agent roles, optional model configuration and the real-browser pilot boundary.

## Still needs external access or outcome evidence

Real SMS login, approved DigiLocker/API Setu access, real official browser execution, portal-specific rules, authenticated status polling/webhooks and message delivery remain unconfigured or unimplemented. Google account access does not grant any of these permissions. No official submission, payment, licence issue, automatic challan discovery or verified status is claimed.

The next live milestone is one authorized service in one state, with a real acknowledgement and measured citizen effort. Use [the pilot acceptance record](./mobility-pilot-checklist.md) to distinguish implemented local behavior from each remaining live gate. More service cards or model roles do not establish that evidence.

The [official-source readiness review](./mobility-official-pilot-readiness.md) prepares that next milestone using dated primary sources. It records state-specific grievance routing, separate DigiLocker/API Setu onboarding and the need to establish permitted retention before connecting provider-derived content to ordinary saved cases, helper snapshots, exports or model processing.
