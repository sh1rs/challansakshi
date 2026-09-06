# Mobility continuity — continued build

The user renewed local implementation after the earlier two-hour work window. This document covers the new continuity features; the [earlier build report](./2026-09-06-autonomous-build-status.md) remains a separate verified baseline. The temporary heartbeat remains paused.

**Later continuation:** the user requested another intensive build. The [next-actions report](./2026-09-06-mobility-next-actions-status.md) covers the returning agenda, acknowledgement review, appointment preparation and session clear. Counts here remain the completed continuity checkpoint.

## New working features

| Feature | Citizen flow | Scope |
| --- | --- | --- |
| Document expiry organiser | Enter a date from a licence, insurance, PUC or another record, its source and the day it was checked. Save privately, edit or delete, and optionally review/download a personal calendar reminder. A licence record can start a separate renewal preparation. | Citizen-entered dates; no record retrieval, statutory deadline calculation, background alerts or appointment booking. |
| Connected life-event plans | Choose a life event and explicitly link existing saved cases. See current progress and an actionable next case. | Stores case IDs only; source cases retain their separate facts, history and official steps. Suggested organisation never makes a government step mandatory. |
| Copy details for an official form | Choose confirmed details, review exact values, approve once, and copy each field or download the reviewed text. Optional wording edits affect only that copy. | No clipboard reading, portal field inference, automatic filling or submission. Unconfirmed facts cannot enter this panel. |
| Compare and recover edits | When another tab saves the same case, compare working and saved details, choose specific edits and carry them into an unsaved draft based on the latest saved revision. | A fresh read checks the reviewed revision/content. Latest saved history remains intact, carried facts need confirmation, and saving needs new consent. Reported activity is protected from this recovery operation. |

All four features support English/Hindi and keep their secondary controls collapsed. The organiser and linked-plan stores have capacity limits, schema checks and expiry 90 days after their last changed save. Expired records are removed during a subsequent read or action; there is no background deletion service for dormant browser storage. Mounted panels hide expired working details before waiting for a cleanup lock. Calendar files, downloaded notes and existing operating-system clipboard contents are managed separately from in-app deletion.

## Architecture and integration

The new stores use separate Web Locks to serialize their own writes across tabs. Every write re-reads its stored source within the lock and rejects a stale revision. Linked plans also re-check the reviewed saved cases. Removing a linked case removes its reference from the plan without copying or retaining its personal details. Reading a record does not extend retention. Browsers without Web Locks cannot save these organisers or linked plans; explicit clear-all remains available. The mobility workspace does not provide the review tools' shared-device mode or inactivity exit, so its clipboard/download copies and any deliberately saved data require explicit cleanup.

Case recovery is a local preparation operation, not a merge of reported outcomes. It carries only selected editable fields. The latest saved timeline/checklist remain, unsaved timeline entries are available in the existing recovery download, and an unadded progress note stays in its editor. Completed, awaiting-response and citizen-reported records cannot receive recovered edits through this tool.

The main clear-all action includes cases, reusable details, follow-ups, linked plans and document reminders. Each new store also has its own explicit clear action for malformed data or private-device cleanup.

## Verification

| Gate | Result |
| --- | --- |
| Complete unit/integration suite | **1,540 passed across 99 files** |
| Complete development browser suite | **257 passed in one 5.6-minute run** |
| Built Cloudflare Worker mobility/correction suite | **187 passed in one 2.4-minute run** |
| Whole-workspace TypeScript and ESLint | **Passed**; the last browser-test assertion also passed focused lint. |
| Production build and whitespace validation | **Passed** |
| Combined citizen journey | **Passed**: UI-created cases → linked plan → entered licence date → separate unconfirmed renewal preparation → reviewed-copy exclusion → clear-all across tabs. |
| Built English/Hindi mobile visual checks | **Passed** at 320px in dark mode, including the four expanded panels and recovery in page context. |
| Built mobile performance smoke | **Recorded** on fresh 390px Chromium contexts at 4× CPU slowdown; details below. |
| Live Google, SMS, model or official portal | **Not configured or exercised** |

The current suite adds 67 unit/integration and 44 browser checks to the earlier baseline. The 187 built-Worker scenarios overlap the complete browser suite; they are not additional unique tests. Browser acceptance uses Chromium, including real browser storage events, Web Locks, clipboard failure, keyboard controls, local PDF/OCR, and the actual frontend-to-native-D1 helper journey with fabricated accounts. Account/provider fixtures do not establish live OAuth or model quality.

Independent review found and fixed expiry while a storage lock is held, cancellation of queued writes, exact-case expiry recovery, and a missed explicit deletion coinciding with an unrelated expiry. Expired organiser/plan details disappear from the open UI before cleanup waits for a lock. An expired unsaved case can still provide its recovery download; an explicitly deleted case cannot be retained by the recovery feature. A browser test initially read storage immediately after clear-all; it now waits for the operation to finish before checking all relevant keys and preservation of unrelated browser settings.

The built visual pass found no page/console errors, external requests, non-GET requests, horizontal overflow, enabled buttons under 43px, or sampled visible text below 4.49:1 contrast. Screenshots were also visually inspected. These bounded checks do not replace real-phone, screen-reader, Safari/Firefox or independent Hindi-language review. The new stores require Web Locks as described above.

The final performance smoke used one fresh Chromium context per route at 390×844 with 4× CPU slowdown and an unthrottled localhost network. `/mobility` measured LCP 348 ms, two long tasks (largest 105 ms), and 37.9 ms from one filled task input to two animation frames. `/review` measured LCP 216 ms and one 88 ms long task; it had no measured input interaction. JavaScript resources, including module preloads, totalled 215,076 encoded bytes for mobility and 181,346 for review, 19 resources each. Neither route loaded optional OCR/voice model assets on entry or produced external requests, page/console errors or horizontal overflow. These are local smoke measurements, not field Core Web Vitals, real-phone responsiveness or Cloudflare CPU/billing evidence.

Evidence directories:

- `/tmp/challansakshi-continuity-final-257-browser` — final complete development run.
- `/tmp/challansakshi-continuity-final-worker-browser` — 187 built-Worker checks.
- `/tmp/challansakshi-continuity-built-visual` — English/Hindi screenshots and `findings.json`.
- `/tmp/challansakshi-continuity-performance` — final performance `result.json` and 390px screenshots.
- `/tmp/challansakshi-recovery-expiry-audit` — independently reproduced expiry recovery with storage removed and unsaved wording still available for download.

The earlier report's 1,473 unit/integration, 213 development-browser and 143 built-Worker checks remain a separate historical checkpoint.

## Re-run and inspect

The latest production build is available locally at `http://127.0.0.1:4180/mobility`. Its Worker returned HTTP 200 for the page and `/api/account/status`, with the latter returning `{"configured":false,"authenticated":false}` and `Cache-Control: no-store`. This confirms the custom route and truthful unconfigured state. It is not a public deployment or real account validation.

From the repository root, use the bundled Node runtime. Stop development/preview servers before replacing the build; do not rebuild while browser checks are running.

```sh
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
node node_modules/vinext/dist/cli.js build
git diff --check
```

The [account guide](./mobility-account-setup.md#preview-the-built-cloudflare-worker-locally) contains the exact local Worker preview command. With that preview running:

```sh
CHALLANSAKSHI_BASE_URL=http://127.0.0.1:4180 node node_modules/@playwright/test/cli.js test --config playwright.config.ts tests/browser/mobility-*.spec.ts tests/browser/profile-corrections.spec.ts --output=/tmp/challansakshi-continuity-repeat-worker
```

For the complete development suite, start a separate server with `CHALLANSAKSHI_BROWSER_ACCEPTANCE=1` and `CHALLANSAKSHI_ACCEPTANCE_NOW_ISO=2026-09-05T10:00:00.000Z`, then run all tests in `playwright.config.ts` against its origin. The final development verification uses `http://127.0.0.1:4177`. The built Worker uses its real clock.

All additions remain local and uncommitted on `codex/screen-aware-voice-coach`, alongside the pre-existing workspace changes. No deployment, paid service, cloud resource creation or outbound message is part of this pass. The [practice walkthrough](./2026-09-06-return-questions.md#suggested-first-walkthrough) covers the new panels without account setup.

## Provider-dependent work

No account, SMS, model, cloud browser, official submission or automatic status monitoring has been activated. The [free account setup guide](./mobility-account-setup.md), [multi-agent architecture](./mobility-ai-and-assistance.md), [official-pilot readiness](./mobility-official-pilot-readiness.md) and [reserved user decisions](./2026-09-06-return-questions.md) still describe those dependencies.
