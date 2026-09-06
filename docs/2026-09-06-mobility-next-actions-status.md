# Mobility next actions — intensive continuation

This local pass follows the user's request to keep building more intensely. It extends the [verified continuity build](./2026-09-06-mobility-continuity-status.md). It does not activate accounts, a cloud model, messaging or official-service execution.

## Connected features

| Feature | Working flow | Boundary |
| --- | --- | --- |
| Returning-user agenda | One highlighted next action combines due personal checks, entered appointments, cases marked for attention and document dates. Each card explains its source and priority; other actions are collapsed. | Reads existing local stores only. Dates and observations are citizen-entered; no official polling, legal-deadline calculation or new storage. |
| Acknowledgement text review | Paste text, name its source, select/correct labelled reference/date/INR amount readings, choose reported progress, review the exact timeline note, then apply it to the working case. | Status words never decide progress. No receipt authentication, payment confirmation, page fetching or automatic save. Unselected raw text is excluded from the case. |
| Appointment preparation | Enter the actual booking time, venue and received instructions; optionally review instruction lines as a packing checklist. Preview an exact personal text pack or a minimal calendar event before download. | No booking, slot verification or inferred required documents. Extra case facts/reference are optional; checklist selections stay in memory. |
| Clear this session | Remove the active case fragment and unmount working forms, drafts and reviews. A per-tab boolean marker keeps a neutral screen after reload until a deliberate new session. | It is separate from deleting saved records, signing out, clearing other tabs, or removing clipboard/download copies. Unsupported session storage produces a truthful reload limitation. |

All four use English/Hindi. Optional controls stay collapsed. The agenda re-reads a target immediately before navigation; changed or expired entries require a refreshed choice. Freshness of a saved source remains separate from a current official status. Reading the agenda does not extend retention, although normal store cleanup can remove expired entries.

Acknowledgement references that differ from the current case require an explicit replacement check. Numeric ambiguous dates and unsupported/uncertain readings must be corrected or omitted. Input is limited to 8,000 characters and 24 candidate readings; the saved timeline note is limited to 1,000 characters without silent truncation. The workspace compares both its current working fingerprint and the latest saved source revision/content before accepting a report, including cases with legitimate unsaved edits. Applying a report resets private-device save consent.

Independent review also caught repeated source excerpts amplifying a supported 7,992-character paste into almost eight million rendered context characters. Source previews now group identical lines across candidates, show at most three distinct lines with explicit displayed/total and occurrence counts, and preserve accurate highlights in a keyboard-scrollable region. All candidate choices and conflicts remain available; the complete original text stays in the textarea.

The appointment editor validates local dates by round-trip and rejects missing or ambiguous clock-change times. Calendar timestamps are canonical UTC. The personal calendar excludes venue, instructions, reference and case facts, and does not invent an end time or alarm. Repeated downloads use a stable event ID; import merging belongs to the calendar application.

## Session lifetime and review

The initial session-checking screen keeps the working workspace unmounted until the per-tab marker has been read, avoiding a flash of saved details after a cleared-session reload. The marker stores only `1`, never a case ID or personal text. Starting a new session reopens the ordinary workspace without automatically reopening the previous case.

Independent review reproduced a cross-session deletion race: a global clear waiting for a browser lock could outlive its old workspace and delete data saved after restarting. The fix binds global and panel deletion waits to cancellation signals and checks the workspace lifetime between each asynchronous step. Actions already completed before cancellation are not rolled back. New records created in a later session must survive a cancelled earlier clear.

While a global clear is pending, working controls are paused with `inert`; the separate **Clear this session** control remains available to cancel the remaining steps. Plan/reminder single-delete and clear-all actions also cancel when their panel closes, the page leaves or the workspace unmounts. Browsers without Web Locks retain the existing explicit malformed-data deletion path, with cancellation checked before removal.

## Verification

Verification is complete for this local pass. The acceptance ledger is in [mobility-next-actions.md](./superpowers/plans/2026-09-06-mobility-next-actions.md).

| Gate | Result |
| --- | --- |
| Complete unit/integration suite | **1,607 passed across 102 files**, repeated after the final navigation fix |
| Complete development browser suite | **313 passed in one 6.2-minute run** |
| Final built Cloudflare Worker mobility/correction suite | **243 passed in one 2.6-minute run**, including the strengthened navigation regression |
| Whole-workspace TypeScript and ESLint | **Passed**, repeated after the navigation fix |
| Production build and whitespace validation | **Passed** |
| Built English desktop / Hindi 320px dark visual pass | **Passed**, with 12 captured screens and the sampling limits below |
| Mobile performance smoke | **Recorded** on fresh 390px Chromium contexts at 4× CPU slowdown |
| Live Google, SMS, cloud AI or official portal | **Not configured or exercised** |

This pass adds 67 unit/integration checks and 56 browser scenarios to the preceding continuity checkpoint. The 243 Worker checks overlap the 313 development scenarios; they are not additional unique tests. After the full development run, the home-navigation assertion was strengthened in an existing session scenario and the single home link changed as described below. The full Worker mobility/correction suite then passed again on the rebuilt final source. The original development suite was not repeated for that one link change. Fixture-backed account/model behavior remains distinct from live provider validation.

The browser workflow uses the repository's Playwright runner because a Browser-plugin skill is not installed. The complete development check used isolated Chromium contexts on port 4177. That server is now stopped; the production build passed and replaced the earlier preview on 4180. Test data is fictional, and no user browser storage is cleared by the test contexts.

Independent source/test review of the final integration found no further blocker. The focused connected journey exercises UI-created booking details, an exact downloaded visit pack, explicit saving, reopening through the agenda, selected acknowledgement readings, an unsaved citizen report, renewed save consent and a clear/restart session. It asserts that unselected source text stays out of the saved case and makes no network write or external request. Additional real Web Lock regressions cover queued single/all deletions cancelled by panel close, pagehide or session unmount, and a new case surviving a previous session's cancelled global clear.

The built visual pass caught a framework-only navigation problem after the initial Worker suite passed: the new `next/link` home control tried to call a missing prefetch helper from the generated runtime, emitted console errors and failed to navigate home. The control now uses the same ordinary same-origin document navigation as `CitizenChrome`, deliberately leaving the cleared workspace's state boundary. The strengthened session test first reproduced the failure on the built Worker, then passed after rebuilding; it covers home navigation, return to the still-cleared workspace and absence of console errors. The full unit/type/lint gates were repeated after that change. No framework dependency was changed.

The final built visual run passed at 1365×1000 in English and 320×740 in Hindi dark mode. Twelve screenshots cover appointment preparation, source context, the exact acknowledgement preview, agenda and neutral session screen. Both scenarios recorded zero page/console errors, failed HTTP responses, external requests, network writes or horizontal overflow. Sampled text contrast had no flags. One English acknowledgement checkbox label measured 35.1px high; its Hindi mobile counterpart wraps larger. The measurements are limited computed-style samples, not a complete accessibility assessment. Physical phones, Safari/Firefox, screen readers and independent Hindi review remain untested in this pass.

The final performance smoke ran after all other browser checks stopped, using one fresh Chromium context per route at 390×844, 4× CPU slowdown and an unthrottled localhost network. `/mobility` measured LCP 292ms, three long tasks (largest 97ms), and 46.3ms from one task-input event to two animation frames. Its 19 JavaScript resources, including module preloads, totalled 233,315 encoded bytes. `/review` measured LCP 256ms, one 51ms long task and 181,340 encoded JavaScript bytes across 19 resources; no input interaction was measured there. Both had zero overflow, page/console errors, external requests or optional OCR/voice model assets loaded on entry. These measurements are local smoke evidence, not field Core Web Vitals, real-phone latency or Cloudflare CPU/billing evidence.

Evidence:

- `/tmp/challansakshi-next-actions-final-unit.log` — final 1,607-test run.
- `/tmp/challansakshi-next-actions-final-browser.log` and `/tmp/challansakshi-next-actions-final-browser/` — complete development regression.
- `/tmp/challansakshi-next-actions-final-worker.log` and `/tmp/challansakshi-next-actions-final-worker/` — final 243 built-Worker checks.
- `/tmp/challansakshi-session-navigation-red/` and `/tmp/challansakshi-session-navigation-green/` — reproduced and fixed home navigation.
- `/tmp/challansakshi-next-actions-built-visual/` — final screenshots and `findings.json`; the original console failure is retained as `findings-before-navigation-fix.json`.
- `/tmp/challansakshi-next-actions-performance/` — final `result.json` and 390px screenshots.
- `/tmp/challansakshi-next-actions-final-build.log` — final production build.

## Try the connected journey

1. Start a fictional licence-renewal preparation at `/mobility` and enter a booking from your practice data under **Appointment and visit pack**.
2. Put one instruction on each line. Expand the optional packing list, choose the lines you reviewed, and preview the complete visit pack before downloading. Select any extra case reference/facts deliberately.
3. Save the case on a private device. An appointment within the next 30 local calendar days appears in **Your next steps**. Use that card to reopen it later.
4. Expand **Review text from an acknowledgement**, paste fictional labelled text such as `Reference: PRACTICE-ACK-2026`, name its source and choose your reported progress. Review the note and add it; save the case separately to keep it.
5. Choose **Clear this session**. Its neutral screen stays after reload. Start a new session to see your retained cases/agenda again; use the separate clear-all control if you want to delete the saved practice records too.

## Release boundary

The rebuilt local preview is `http://127.0.0.1:4180/mobility`. Both the page and `/api/account/status` return HTTP 200; the account route returns `{"configured":false,"authenticated":false}` with `Cache-Control: no-store`. It executes the custom Worker route without claiming configured sign-in. The three feature flags `ANALYSIS_ENABLED`, `SYNTHETIC_UPLOADS_ENABLED` and `MOBILITY_AI_ENABLED` remain false.

All work remains uncommitted on `codex/screen-aware-voice-coach` with the pre-existing workspace changes preserved. There is no new deployment or scheduled automation. The [free account setup guide](./mobility-account-setup.md), [multi-agent guide](./mobility-ai-and-assistance.md), [idea coverage map](./2026-09-06-idea-coverage.md) and [pilot decisions](./2026-09-06-return-questions.md) retain the account, model and authorized official-access dependencies. Real-phone performance, independent translation review and verified citizen outcomes remain separate evidence.

## Re-run the gates

Use the bundled Node runtime from the repository root. Stop development/preview servers before replacing the build, and do not rebuild while browser checks are running.

```sh
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
node node_modules/vinext/dist/cli.js build
git diff --check
```

For all browser journeys, start the development server with `CHALLANSAKSHI_BROWSER_ACCEPTANCE=1` and `CHALLANSAKSHI_ACCEPTANCE_NOW_ISO=2026-09-05T10:00:00.000Z`, then run `playwright.config.ts` against that origin. The complete verified run used port 4177. The [account setup guide](./mobility-account-setup.md#preview-the-built-cloudflare-worker-locally) contains the exact local Worker command, including the required `--local-upstream 127.0.0.1`. With the built Worker running:

```sh
CHALLANSAKSHI_BASE_URL=http://127.0.0.1:4180 node node_modules/@playwright/test/cli.js test --config playwright.config.ts tests/browser/mobility-*.spec.ts tests/browser/profile-corrections.spec.ts --output=/tmp/challansakshi-next-actions-repeat-worker
```
