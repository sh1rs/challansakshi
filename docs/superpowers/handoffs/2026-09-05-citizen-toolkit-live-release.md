# Citizen toolkit live release — September 5, 2026

The user authorized implementing credible ideas from the supplied product conversation and making them live while retaining about 10% account usage. This release implements the useful on-device scope without requiring new backend credentials or enabling paid inference. The final observed Codex main window had 73% used / 27% remaining; no reset was redeemed.

## Verified deployment

- Public site: https://challansakshi.sh1rs.com
- Cloudflare Worker: `challansakshi`
- Active version: `9b548b97-34a2-42de-a510-eb35f875cfa4`
- Deployment created: `2026-09-05T11:44:09.022Z` (17:14:09 IST)
- Cloudflare deployments listing confirmed 100% traffic.
- Previous version retained: `0b78ff34-9f58-4651-9563-115b9a20198f`
- Production flags: `ANALYSIS_ENABLED=false`, `SYNTHETIC_UPLOADS_ENABLED=false`.
- Deployment command: `WRANGLER_LOG_PATH=/tmp/challansakshi-release-wrangler.log sh scripts/codex-deploy.sh`.
- The script temporarily used the production compatibility date and restored `wrangler.jsonc`; its pre/post hash matched. Existing local configuration differences remain.

## Delivered behavior

| Entry | Implemented behavior |
| --- | --- |
| `/review` | Existing on-device image OCR and PDF extraction, plus optional photo inspection with zoom, pointer/keyboard crop controls, actual source/crop dimensions, descriptive sharpness measurement, user-declared evidence origin, citizen-confirmed plate readings, exact comparison against independent registration evidence, and source-linked observations in the prepared note. Changing source/crop/origin/reference/text invalidates previous confirmation. |
| `/message-check` | Local suspicious-message checks for executable/APK links, shortened/lookalike hosts, credential or remote-access requests, payment and urgency signals, including Hindi. Pasted URLs remain inert; the result never authenticates a message. |
| `/reply-review` | Citizen maps up to five points to exact excerpts in an authority reply and marks addressed/unclear/not-found. Changed source text invalidates mappings. Generates a neutral follow-up note with explicit private-device copy/download. No automated decision about whether a reply is legally sufficient. |
| `/dashboard` | Explicitly enabled private-device checklist for challan, FASTag, reply and renewal tasks. Stores only ID, task kind, citizen-reported status, optional follow-up date, and timestamps; no documents, vehicle identifiers or reply text. Schema validation, 20-task limit, 90-day expiry, delete, blocked-storage recovery, cross-tab handling and recurring inactivity lock. Dates do not trigger background notifications. |
| `/sources` and `/api/official-routes` | Seven public official-route records with scope and existing review/expiry evidence. Expired handoffs become unavailable. Read-only API exposes public metadata only. |
| `/fastag` | Real English/Hindi journey including guide, result reasoning, all 14 evidence passport entries and the private downloaded text note. Existing deterministic finding and routing rules are preserved. |
| Homepage and shared navigation | New tools are discoverable, the informative homepage remains, and the long fictional demo plus ten-case Test Lab remain accessible under Demo. |

Privacy copy and README now distinguish ephemeral review tools from the explicit local checklist exception. The checklist is neither encrypted nor protected by a login. Message/reply workspaces remain disabled until hydration is ready, preventing early typing from being lost. Reply contents are hidden from printing and cleared on privacy exit/inactivity lifecycle events.

## Verification evidence

Durable logs and representative screenshots are in `qa/citizen-toolkit-release-2026-09-05/`.

- Full Vitest: **63 files / 1,003 tests passed**.
- Whole-project TypeScript and ESLint passed; final focused copy checks passed (19 tests); `git diff --check` passed.
- Local browser suite: **59 scenarios verified**. The initial full run passed 56 and failed three expectations made obsolete by the added navigation and FASTag Hindi. Those assertions were corrected, then all three passed in a separate rerun. Do not describe the initial full invocation as passing.
- Production Playwright: **21/21 passed** against the public domain, covering new utilities, photo interaction, local checklist/privacy lifecycle, official-source expiry, Hindi FASTag download, mobile geometry, full long demos and Test Lab behavior.
- Live document release probe: **PASS**, eight routes checked, actual image OCR plus PDF extraction and independent registration comparison. Observed document-body requests: **0**; fixture-identifier requests: **0**; IndexedDB/local/session storage entries: **0** in the document-review flow.
- Measured live image reading/review: **72,948 ms** cold; PDF reading/review: **3,827 ms**. These are observations from this environment, not general speed guarantees. First-use OCR speed remains an improvement target.
- Independent final source review reported no new P1/P2 findings. Synthetic property checks add 192 adversarial scenarios; they are not a measured real-world OCR accuracy benchmark.
- Visually inspected representative phone screenshots for photo review, message/reply, checklist, Hindi FASTag and live prepared document note.

Useful commands (Node may require the bundled runtime on PATH):

```sh
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
npx vitest run
npx tsc --noEmit
npx eslint .
npx playwright test --config playwright.config.ts
CHALLANSAKSHI_BASE_URL=https://challansakshi.sh1rs.com npx playwright test --config playwright.config.ts tests/browser/citizen-tools.spec.ts tests/browser/mobility-dashboard.spec.ts tests/browser/official-sources.spec.ts tests/browser/evidence-photo.spec.ts tests/browser/toll-language.spec.ts tests/browser/hybrid-journey.spec.ts tests/browser/deep-demo-preservation.spec.ts tests/browser/test-lab-discoverability.spec.ts
DOCUMENT_RELEASE_BASE=https://challansakshi.sh1rs.com node scripts/verify-document-release.mjs
npm run check:official-routes
```

Browser/server/network commands may require the host's approved execution context. `CHALLANSAKSHI_BASE_URL` skips the local Playwright server when targeting production.

## Route maintenance observation

The bounded maintainer probe recorded four HTTP 200 responses, two NextGen network failures in this environment and one Delhi timeout. Those uncertain outcomes do not establish portal downtime. HTTP reachability does not establish route purpose or eligibility. Existing September 2 review / October 2 expiry dates were retained; no schedule was installed and no review date was automatically advanced. See `docs/official-route-maintenance.md` and `qa/official-route-checks/2026-09-05T11-29-45-182Z.json`.

## Work that still needs external inputs or separate validation

- **Accounts and cross-device continuity:** select/connect a Supabase project or another approved backend, configure credentials through the provider's secret mechanism, and implement/test ownership, RLS, deletion and retention. No account backend is currently connected by this release.
- **Optional cloud vision:** provider connection and enforced cost/usage controls within the user's ₹500/month cap, consent and retention policy, and measured benefit over the local baseline. No cloud inference was enabled.
- **DigiLocker / API Setu / government fetch or portal adapters:** approved access plus verified integration requirements. No automatic official lookup, OTP/CAPTCHA handling, payment, filing or submission was added.
- **Accuracy and language claims:** authorized held-out real documents/photos and human annotation are needed for meaningful OCR evaluation; independent Hindi language review remains outstanding.
- **Notifications:** the local checklist can record dates but cannot send background reminders; delivery would need a separately configured service and explicit preferences.

## Working-tree boundary

Branch: `codex/challansakshi-resolution-layer`; base HEAD at release: `3ed97ce`. The workspace already contained substantial uncommitted homepage/demo/refinement changes when work began. They were preserved, tested alongside the toolkit, and included in deployment. This task has **not committed or pushed** the working tree, and no remote is configured. Do not equate the base commit with the deployed source. The evidence folder includes the final Git status and a SHA-256 manifest of relevant current source/assets for handoff.

No destructive reset, extension changes or changes under the protected `qa/public-launch-audit-2026-09-02/` were performed by this task. Further implementation should inspect the current dirty tree before editing. Only release documentation/evidence and a production-aware test-origin assertion changed after the deployed application build.
