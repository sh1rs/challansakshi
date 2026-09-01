# ChallanSakshi Progressive Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ChallanSakshi’s repeated, word-dense framing with one compact action hierarchy and progressive disclosure across the citizen, e-Challan, FASTag, demo, and Test Lab journeys.

**Architecture:** Keep the existing deterministic engines, route boundaries, and white/navy/teal design system. First make `GuidedStepHeader` and `SafetyBoundary` compact shared primitives, then simplify each route around those primitives. Native `<details>` elements reveal rationale and audit detail without hiding decision-critical safety or result limitations.

**Tech Stack:** React 19, Next.js 16, Vinext, CSS Modules, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-02-challansakshi-progressive-disclosure-design.md`

## Global Constraints

- Keep `/`, `/review`, `/fastag`, `/demo`, and `/demo/test-lab` truthful and visually coherent; real and synthetic behavior must remain separate.
- Do not add network requests, persistence, accounts, uploads, AI calls, government access, filing, payment, or automatic submission.
- Preserve deterministic comparison, deadline, route, safe-stop, confirmation-invalidation, shared-device, export-redaction, and official-link logic.
- Keep a visible live status, critical credential warnings, synthetic boundary, deadline caveat, and result limitation.
- Keep essential mobile copy at least 16px, controls at least 48px, whole-card activation, keyboard access, focus handling, and reduced-motion behavior.
- At 390 × 844, the first actionable control must appear in the first viewport on `/review` and `/fastag` starts; no horizontal overflow at 320px.
- Detailed downloaded evidence and issuer-preparation artifacts remain complete even when their on-screen preview is collapsed.
- Use TDD: each behavior test must be written and observed failing for the expected reason before production code changes.

---

### Task 1: Compact shared guidance and privacy primitives

**Files:**
- Modify: `components/guided/GuidedStepHeader.tsx`
- Modify: `components/guided/GuidedStepHeader.module.css`
- Modify: `components/public-beta/PublicBetaShell.tsx`
- Modify: `components/public-beta/PublicBeta.module.css`
- Modify: `lib/guided-journey.ts`
- Modify: `tests/guided-step-header.test.ts`
- Modify: `tests/guided-journey.test.ts`
- Modify: `tests/citizen-review-contracts.test.ts`

**Interfaces:**
- Consumes: existing `GuidedStepHeader` props and `GuidedProgressStep[]` without changing caller signatures.
- Produces: compact visible instruction/status, named native details containing why/next/all steps, and a short `SafetyBoundary` with full `Privacy details`.

- [ ] **Step 1: Write failing shared-structure tests**

Update the guide contract so it expects a native disclosure and no always-visible three-card grid. Add assertions equivalent to:

```ts
expect(source).toContain('<details');
expect(source).toContain('<summary>{copy.why}</summary>');
expect(source).toContain('role="status"');
expect(source).toContain('aria-live="polite"');
expect(source).not.toContain('className={styles.guideDetails}');
```

Add a privacy contract that requires the short visible boundary and a `Privacy details` disclosure while retaining the hosting-metadata and PDF-tab qualifications in the source.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/guided-step-header.test.ts tests/guided-journey.test.ts tests/citizen-review-contracts.test.ts
```

Expected: failure because the current header exposes three permanent detail cards and the current privacy paragraph has no disclosure.

- [ ] **Step 3: Implement the compact shared primitives**

Keep instruction and status visible. Render why, next, and the complete `<ol>` inside one `<details>` whose summary is the localized `Why this matters`. Keep `aria-current`, state labels, progress math, live status, and focus target unchanged. Remove the `guideDetails` grid and use a compact status chip/row.

Render the visible boundary as `Your files and answers stay in this browser. They are not uploaded.` and place the remaining existing English/Hindi explanation under `Privacy details`. Keep `children` visible so route-specific critical warnings are not hidden.

Shorten the real and FASTag guided strings in `lib/guided-journey.ts` without changing readiness predicates, tones, or step states.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused command from Step 2. Expected: all focused tests pass with pristine output.

- [ ] **Step 5: Run the full suite and commit**

Run `./node_modules/.bin/vitest run` with the runtime Node directory on `PATH`, then commit with message `feat: compact guided citizen steps`.

---

### Task 2: Simplify the real e-Challan journey

**Files:**
- Modify: `components/public-beta/CitizenReviewApp.tsx`
- Modify: `components/public-beta/LocalRecordIntake.tsx`
- Modify: `components/public-beta/LocalRecordIntake.module.css`
- Modify: `components/public-beta/PublicBeta.module.css`
- Modify: `lib/citizen-review-presentation.ts`
- Modify: `tests/citizen-review-contracts.test.ts`
- Modify: `tests/local-record-intake.test.ts`
- Modify: `tests/evidence-intelligence.test.ts`

**Interfaces:**
- Consumes: compact `GuidedStepHeader` and `SafetyBoundary` from Task 1.
- Produces: action-first safety/source/observation/result screens; evidence, history, and summary remain available through native details; exported evidence stays unchanged.

- [ ] **Step 1: Write failing e-Challan disclosure tests**

Add contracts that require:

```ts
expect(source).toContain('Privacy details');
expect(source).toContain('Evidence details');
expect(source).toContain('Review history');
expect(source).toContain('Preview local summary');
expect(source.match(/Based only on answers you confirmed/g)?.length).toBe(1);
```

Update local-intake expectations to require `Local only · Not uploaded · Not saved`, `Challan copy`, `Photo from the challan`, and `How local review works`.

- [ ] **Step 2: Run focused tests and verify RED**

Run `vitest` for `citizen-review-contracts`, `local-record-intake`, and `evidence-intelligence`. Expected: failure because detail tables, timeline, raw summary, and diagnostic receipt are currently always visible.

- [ ] **Step 3: Implement the simplified route**

Show the full route hero only on the first step. Remove stage headings/help that restate the guided instruction. Linearize the source screen into three visible decisions. Keep credential and message-only warnings visible.

Keep number plate, vehicle type, supplied-photo check, and citizen vehicle record in the primary observation flow. Put secondary colour/offence/time/place/date/context inputs under descriptive details without changing their conservative defaults or comparison logic.

Order results as result → official next step → what looks clear → what to check. Put the evidence table under `Evidence details`, timeline under `Review history`, and raw `<pre>` under `Preview local summary`. Remove the duplicated visible disclaimer while retaining one result limitation and the full exported disclaimer.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused tests from Step 2. Expected: all pass.

- [ ] **Step 5: Run full tests and commit**

Run the full suite, then commit with message `feat: simplify e-challan review journey`.

---

### Task 3: Simplify the FASTag journey

**Files:**
- Modify: `components/public-beta/TollSakshiApp.tsx`
- Modify: `components/public-beta/PublicBeta.module.css`
- Modify: `lib/toll-domain.ts`
- Modify: `lib/toll-fixtures.ts`
- Modify: `lib/guided-journey.ts`
- Modify: `tests/guided-journey.test.ts`
- Modify: `tests/toll-domain.test.ts`
- Modify: `tests/public-mode-privacy.test.ts`
- Modify: `tests/toll-route-links.test.ts`

**Interfaces:**
- Consumes: compact shared guidance from Task 1.
- Produces: progressive FASTag record groups, concise comparison, route-first packet, collapsed audit detail, unchanged deterministic assessment and official URLs.

- [ ] **Step 1: Write failing FASTag hierarchy tests**

Add source/render contracts requiring named groups `Issue and source`, `Transaction details`, `Passing image`, `Confirm one transaction`, plus `Show all checks`, `View all 14 evidence checks`, `View preparation note`, and `Other official sources`. Require route output to appear before passport and preparation-note preview in the component source.

- [ ] **Step 2: Run focused tests and verify RED**

Run `vitest` for `guided-journey`, `toll-domain`, `public-mode-privacy`, and `toll-route-links`. Expected: failure because all groups/checks/note/source links are currently displayed at once.

- [ ] **Step 3: Implement the simplified FASTag route**

Show the full hero only on the choice step. Use the no-upload visible boundary and keep credential/refund-scam warnings visible. Group transaction inputs into native disclosures; hide the branch-specific extra group when irrelevant and reopen the group containing any validation error.

Show only core and branch-relevant comparison rows by default; expose the full map in `Show all checks`. On the packet step, show the primary official route first, then note status/actions, unresolved evidence, and named disclosures for TP1–TP14, tracking detail, plaintext note, and secondary official sources. Keep the synthetic watermark persistent.

Only simplify presentation strings in `toll-domain.ts`; do not change predicates, route selection, refund/legal boundaries, or source URLs.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused tests from Step 2. Expected: all pass.

- [ ] **Step 5: Run full tests and commit**

Run the full suite, then commit with message `feat: simplify fastag reconciliation`.

---

### Task 4: Simplify the home, demo landing, and Test Lab

**Files:**
- Modify: `components/public-beta/CitizenHome.tsx`
- Modify: `components/public-beta/CitizenHome.module.css`
- Modify: `lib/citizen-home.ts`
- Modify: `components/ChallanSakshiApp.tsx`
- Modify: `components/test-lab/SyntheticTestLabApp.tsx`
- Modify: `components/test-lab/SyntheticTestLabApp.module.css`
- Modify: `app/globals.css`
- Modify: `tests/citizen-home.test.ts`
- Modify: `tests/citizen-chrome-contracts.test.ts`
- Modify: `tests/demo-mobile-accessibility.test.ts`
- Modify: `tests/test-lab-contracts.test.ts`

**Interfaces:**
- Consumes: existing citizen route links, Demo Desk, resolution routes, Test Lab engine, and shared citizen chrome.
- Produces: four concise home choices, one flagship demo entry, non-duplicated route catalogue, compact Test Lab case list, unchanged route capabilities.

- [ ] **Step 1: Write failing landing-density tests**

Update the home contract to require the four concise labels and a native `Not sure? Choose your situation` disclosure. Update the demo contract to require one primary `Start fictional demo` CTA, `Review a real challan`, and `Open Test Lab`, while ensuring the seven-card route catalogue is not duplicated in `Landing`. Update the Test Lab contract so unselected cards do not include the full case description.

- [ ] **Step 2: Run focused tests and verify RED**

Run `vitest` for `citizen-home`, `citizen-chrome-contracts`, `demo-mobile-accessibility`, and `test-lab-contracts`. Expected: failure because the current pages expose all secondary choices and descriptions.

- [ ] **Step 3: Implement concise landings**

Use the approved four two-line home cards, move five situation shortcuts into a named disclosure, reduce the privacy band to three visible statements, and keep the full privacy link.

Make the demo hero read `Does the photo show your vehicle?` with the concise evidence comparison lead and three actions. Keep a short synthetic boundary and one trust line. Replace the public-service section with a slim real-help band; remove duplicated `NoticePreflight`, route-grid, and repeated process explanation from the landing while keeping those capabilities in Demo Desk/resolution views.

In Test Lab, shorten the hero and boundary, show ID/title/result only in unselected cards, and reveal the description/workbench for the selected case. Keep all ten cases, dynamic comparison, confirmation invalidation, synthetic-only custom image boundary, and visible textual result states.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused tests from Step 2. Expected: all pass.

- [ ] **Step 5: Run full tests and commit**

Run the full suite, then commit with message `feat: streamline citizen and demo entry points`.

---

### Task 5: Integration verification and final polish

**Files:**
- Modify only files required by verified integration defects.
- Test: all `tests/**/*.test.ts` and `tests/**/*.test.tsx`.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: one coherent, responsive product with verified semantics, no regressions, and no known console or framework-overlay failures.

- [ ] **Step 1: Run the complete automated gate**

Run the full Vitest suite, `typecheck`, `lint`, `build`, and `git diff --check`. Any defect must first receive a failing regression test before its production fix.

- [ ] **Step 2: Run browser QA in the in-app Browser**

Exercise `/`, `/review`, `/fastag`, `/demo`, and `/demo/test-lab` at desktop and 390 × 844; additionally check 320px for overflow. Verify identity, meaningful DOM, no error overlay, console health, screenshot evidence, and one state-changing interaction per journey.

- [ ] **Step 3: Compare before and after evidence**

Compare the existing audit captures with matched-viewport after captures. Confirm the first actionable control is visible above the fold for review/FASTag, shared header is compact, and no decision-critical safety content disappeared.

- [ ] **Step 4: Fix verified defects test-first and rerun gates**

For each discovered defect, write and observe the focused test failure, implement the smallest fix, rerun the focused test, then rerun the complete gate.

- [ ] **Step 5: Commit final polish**

If any integration fix was required, commit it as `fix: polish progressive citizen journeys`.
