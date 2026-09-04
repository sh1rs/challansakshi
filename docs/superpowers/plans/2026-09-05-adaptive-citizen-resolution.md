# Adaptive Citizen Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the approved compact Check → Resolve journey with adaptive questions, one footer boundary, reliable official handoff, and measured mobile behavior.

**Architecture:** Keep the deterministic classifier and existing handoff controller authoritative. A pure adaptive planner tracks answeredness; the review orchestrator owns current facts, file versions and artifact freshness. A presentational Check component consumes this state; the result stays in the existing orchestrator to keep handoff authority in one place. Home and shared chrome have independent file ownership.

**Tech Stack:** React 19, TypeScript 5.9, Vinext, Vitest 4, existing Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-04-adaptive-two-stage-citizen-resolution-design.md`, approved by owner on 2026-09-05.

## Global Constraints

- Web product only. The browser extension remains frozen and production-disabled.
- No new runtime dependency, network path, citizen storage, credential input or case-data URL.
- Header ≤72 px; body/control text ≥16 px; mobile h1 26 px and h2 20 px; required targets ≥48 × 48 px.
- Three honest home choices. Plain language by default. English/Hindi parity on home/review.
- One normative 38-word English footer boundary, equivalent Hindi, one Safety & privacy link; complete mobile footer ≤256 px.
- Deterministic classifier owns findings; readable independent record is required before all comparisons.
- Preserve self/helper confirmation, current-pack authority, shared-device restrictions, receipt/return lifecycle and stale-effect guards.
- No normal phase-transition scroll. First Check/result actions fit the viewport; named validation recovery may reveal the nearest missing control.
- Work on the existing approved `codex/challansakshi-resolution-layer` checkout. Do not stage or change `wrangler.jsonc`.
- Never inspect, enumerate, search, change, stage, move or delete `qa/public-launch-audit-2026-09-02/`. Use `git status --short --untracked-files=no`; stage explicit owned files only.
- No deploy, push or release claim is part of this implementation.

## Runtime and verification

All shell commands run in `/Users/shars/Desktop/challansakshi` with:

```sh
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```

Focused: `./node_modules/.bin/vitest run tests/<file>.test.ts`.
Final gates: `./node_modules/.bin/vitest run`, `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next`, `node node_modules/vinext/dist/cli.js build`, `git diff --check`.
Browser: `./node_modules/.bin/playwright test --config playwright.config.ts`.

## Task 1: Conservative adaptive decisions and evidence provenance

**Files:** `lib/public-challan.ts`, new `lib/citizen-review-question-plan.ts`, `lib/evidence-intelligence.ts`; tests `public-challan`, new `citizen-review-question-plan`, `evidence-intelligence`.

**Interfaces:** Implement exact planner types and signatures from spec §13.1. Export `CITIZEN_REVIEW_DECISION_QUESTION_ORDER`, `CITIZEN_REVIEW_INPUT_ORDER`, `CITIZEN_REVIEW_DEFAULT_ANSWERS`, and `CITIZEN_REVIEW_ANSWER_KEY_BY_ID` for shared orchestration. Builders accept `answeredQuestionIds`; optional compatibility for pre-adaptive callers may be preserved only with explicit tests, while the new UI always supplies IDs.

- [x] Add failing cases for missing/unreadable RC, table-driven question branches, photo selection without an answer, unclear versus unanswered, and reconciliation clearing.

```ts
expect(assessCitizenChallanReview({ ...alignedAnswers, ownRecordAvailable: 'missing' }))
  .toMatchObject({ finding: 'insufficient-review', canPrepareWorksheet: false });
expect(deriveCitizenReviewQuestionPlan({ answers: officialAnswers,
  answeredQuestionIds: { source: true }, hasSelectedPhotograph: true }))
  .toMatchObject({ missing: ['own-record'], completion: 'needs-answer' });
```

- [x] Run focused tests and capture the intended failures.
- [x] Put the readable-record gate immediately after source. Planner accumulates required IDs in fixed order and stops at the first unanswered or terminal branch. Plate/category differences outrank uncertainty; a plate uncertainty followed by category match is terminal unclear. Reconcile inactive values and IDs in one convergent pass.
- [x] Filter sources, observations, conflicts and generated prose to active answered facts. No message-only evidence or unavailable-image source. Preserve the artifact provenance sentence and bilingual presentation.
- [x] Run the three focused suites; report behavior changes and coverage. Commit explicit files after review.

## Task 2: Compact home, navigation and footer

**Files:** `components/shared/CitizenChrome.tsx`, `.module.css`; `components/public-beta/CitizenHome.tsx`, `.module.css`; `lib/citizen-home.ts`; `tests/citizen-home.test.ts`, `tests/citizen-chrome-contracts.test.ts`. Coordinate the existing home privacy test with Task 5; do not edit CitizenReviewApp or TollSakshiApp here.

**Interfaces:** `CitizenGoal = 'message'`; `parseCitizenGoalValue(value: unknown): CitizenGoal | null`; keep old `parseCitizenGoal(search)` temporarily only to avoid breaking the pre-migration app. `CitizenHeader` accepts an optional `quickExit` ReactNode separate from `utilities`; ordinary utilities move inside Menu. Existing props remain compatible. Footer props remain compatible.

- [x] Add rendered tests for three meaningful anchors, scalar-only message parser, no selected source inference, one boundary paragraph/link, accessible Menu and language semantics.

```ts
expect(parseCitizenGoalValue('message')).toBe('message');
expect(parseCitizenGoalValue(['message', 'message'])).toBeNull();
expect(parseCitizenGoalValue('resolve')).toBeNull();
```

- [x] Run focused tests to demonstrate missing behavior.
- [x] Render one clear home heading, short value statement and three routes from spec §8. Remove duplicate situation links. Plain language is default.
- [x] Build one-row mobile brand/Exit/Menu composition. Menu uses aria-expanded/controls, Escape and focus return; include all route links, theme and language inside. FASTag has one English-only availability line in Menu.
- [x] Replace real footer copy with the exact spec paragraph and equivalent concise Hindi. Keep demo-specific boundary separate. Footer has only one Safety & privacy link, no directory or brand block.
- [x] Apply geometry hooks and CSS budgets. Preserve the existing visual identity, dark theme and reduced-motion support. Run focused tests. Commit explicit files after review.

## Task 3: Fail-closed official routes and controller integration

**Files:** `lib/official-destinations.ts`, `lib/citizen-review-handoff-controller.ts`, associated tests. No app/component edits in this task.

**Interfaces:** Exact `CurrentOfficialAuxiliaryResolution`, `resolveCurrentOfficialAuxiliaryRoute(key, nowIso)` and candidate resolver from spec §13.5. Add a deterministic `getOfficialRouteFreshnessToken` helper if needed, using registry version/resolved key/expiry/status/fallback without raw wall clock. Controller safe lookup may be absent when both routes are stale; no unavailable result contains a URL.

- [x] Add failing literal candidate tests for current requested, stale requested/current fallback, both stale, invalid time, and inclusive date boundary.
- [x] Implement independent freshness checks. The committed registry is selected only in the public resolver; candidate resolver takes fabricated records for tests.
- [x] Replace direct auxiliary lookup selection in controller with clocked resolution. Keep action-ready pack/receipt guards; propagate unavailable without URL. Confirm no stale fallback href can be generated.
- [x] Run destinations/controller focused tests. Report type/API changes for Task 4. Commit explicit files after review.

## Task 4: Integrate adaptive Check → Resolve

**Files:** `components/public-beta/CitizenReviewApp.tsx`; new `CitizenReviewCheck.tsx` (including bilingual question copy), `CitizenReviewAdaptive.module.css`; new pure `lib/citizen-review-state.ts`; `lib/guided-journey.ts`, `lib/citizen-review-presentation.ts`; `OfficialHandoffPanel.tsx`; `app/review/page.tsx`; shared header adapter (no TollSakshiApp edits). Tests: new state/interaction tests plus existing guided/review/handoff contracts.

**Consumes:** Task 1 planner/answered map; Task 2 quickExit header slot and scalar parser; Task 3 optional clocked lookup.

**Produces:** `CitizenReviewApp({ initialGoal?: 'message' | null, initialNowIso?: string, readRenderNowMs?: () => number })`. Pure state helper owns fact signature and atomic answer/role confirmation transitions; component owns selection objects and effects. Canonical UI phases `check | resolve` map to bilingual progress.

- [x] Write failing state tests: missing source validates without mutation; one self confirmation signs target role; helper requires two gates; edit clears confirmations; skipped fields cannot enter signature; file version changes invalidate; metadata invalidates artifacts only.

```ts
const result = confirmCitizenReviewState(initialState, 'self');
expect(result.state.phase).toBe('check');
expect(result.state.confirmedFactsSignature).toBe('');
expect(result.missing).toEqual(['source']);
```

- [x] Implement pure state transitions using fixed-order answered fields and `{ present, version }` file tokens. Return validation data; no browser authority.
- [x] Render native radio groups with a stable keyed selected input. Keep current expanded group and compact summaries; Change reopens without signing. Unavailable-photo atomically clears selection and every image field/ID.
- [x] Remove source/evidence screen replacement. Required input dynamically reveals in one panel. Only terminal states show attestations; initial Continue validates; direct message selection uses its safe-next-step action. Query-seeded message initializes Resolve on SSR and hydration.
- [x] Keep file/details optional. Ask device before picker or first pack/export action. Unknown maps conservatively to internal shared but cannot create action-ready views. Preserve selected PDF contextual consequence.
- [x] Integrate current fact signatures with evidence builders and existing controller. File select/replace/remove increments version; any fact edit clears pack, artifact and pending effects. Metadata/device/route changes retain facts but invalidate artifacts and pack.
- [x] Render result finding, meaning and action, current safe lookup and separate Prepare my checklist control first. Reuse existing deep pack/receipt/return controls inside disclosure. Remove unused safetyConsent prop. Keep self/helper pack ordering.
- [x] Preserve scroll on normal transitions and focus headings with preventScroll. Validation can nearest-scroll only a missing offscreen field. Add mounted bounded route-expiry scheduling and focus/visibility refresh; action-time freshness recheck covers all artifacts including print/receipt download.
- [x] Add server-only acceptance clock gated by explicit environment flag and real default. Async page awaits searchParams; scalar parser rejects repeated values. SSR and hydration share initial date.
- [x] Run focused state/review/guided/handoff/privacy tests and typecheck; repair integration failures without weakening safety behavior. Commit reviewed changes.

## Task 5: Browser acceptance and complete regression gates

**Files:** new `playwright.config.ts`, `tests/browser/{citizen-review,mobile-geometry,local-intake,route-clock}.spec.ts`; `package.json`; `tests/public-mode-privacy.test.ts`; tests for touched behavior. Screenshots/traces/logs go to a task-specific `/tmp` directory, never owner QA.

- [x] Add real home to privacy import audit; permit only necessary approved query initialization without network/storage authority.
- [x] Create root Playwright web server on `127.0.0.1:4177`, separate from extension. Existing installed browser/runtime only. Parameterize 320×844, 375×812, 390×844; include English/Hindi, dark, keyboard and menu states.

```ts
expect(await page.locator('[data-mobile-header]').evaluate(el => el.getBoundingClientRect().height)).toBeLessThanOrEqual(72);
const before = await page.evaluate(() => scrollY);
await page.getByRole('button', { name: 'I checked these answers — see my next step' }).click();
expect(Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThanOrEqual(8);
```

- [x] Verify initial source/Continue, mismatch summary/confirmation and result finding/lookup/preparation all fit. Verify required target names/counts before box checks; exact heading sizes and 16px critical text. Check footer paragraph/count/height.
- [x] Exercise direct and query-seeded message, missing RC, unavailable image, unclear, aligned, category mismatch, edit invalidation, helper/device/pack/export, Quick Exit and local-file replacement using fabricated fixtures.
- [x] Run route subset with server/browser clocks just before expiry and at expiry; advance mounted browser through boundary and prove href removal.
- [x] Run full unit, types, lint, production build and diff checks once integration settles. Fix concrete failures and repeat only affected checks before final full gate.
- [x] Inspect screenshots and actual local UI. Record numerical evidence and remaining native-phone limitation. Commit tests/verified refinements.

## Task 6: Independent review and factual handoff

**Files:** this plan progress; tracked verification note under `docs/superpowers/verification/2026-09-05-adaptive-citizen-resolution.md`; judged artifacts only after implemented behavior is verified.

- [x] Independent reviewer checks full implementation diff against spec, privacy/confirmation/route guards and visible mobile behavior. Fix material findings and recheck affected tests.
- [x] Record actual test counts, measured dimensions, browser states and commit IDs. Mark the spec implemented only after criteria pass; clearly state any justified design adjustment.
- [x] Update SUBMISSION/DEMO_SCRIPT only with observed new behavior and truthful Codex contribution; keep unverified video/live claims pending.
- [x] Leave the verified preview open and hand off implementation, evidence and deployment status. No further approval checkpoint is needed for local implementation.

## Execution ledger

- 2026-09-05: Owner approved written design; starting commit `2be6617`.
- Ruling: Continue in the named feature checkout used for the approved design and local preview. Creating another checkout would split the user's active work; the only existing tracked dirt is the deliberately excluded runtime date.
- Ruling: Independent tasks 1–3 may execute concurrently with strict file ownership. Integration waits for their interfaces; the root owns Task 4. This follows the active multi-agent instruction and avoids shared-file writes.
- Preflight: Tasks 1/4 share planner and evidence interfaces; exact names are fixed above. Tasks 2/4 share header/goal props; temporary old parser compatibility lasts only until Task 4. Tasks 3/4 share optional route shape; root integrates it. Tasks 4/5 share geometry hooks; tests enforce actual behavior. Each task's test cases exercise the behavior it implements; no production dependency is added.
- Completed: Tasks 1–6 implemented and locally verified. See `docs/superpowers/verification/2026-09-05-adaptive-citizen-resolution.md` for the final gate counts, measurements, and limitations.
- Commit sequencing adjustment: independent task changes were reviewed and integrated before one explicit-file implementation checkpoint instead of separate partial task commits. No push, merge, or deployment.
- Layout adjustment: Check rendering and bilingual question copy are colocated in `CitizenReviewCheck.tsx`; result rendering remains in the orchestrator. There is no unnecessary wrapper-only Resolution component.
- Runtime adjustment: test-only Vite `define` forwards precisely two acceptance-clock constants to the local Worker during `serve`; production builds and normal preview receive no replacements. Exact pre-expiry and at-expiry server/browser checks both passed.
- Verification: 807 unit/regression tests in 46 files; 29 Chromium acceptance tests plus two separate exact-clock runs; typecheck, ESLint, production build, and diff checks green. Fresh EN/HI confirmation and Edit captures each measured 0 px scroll delta.
