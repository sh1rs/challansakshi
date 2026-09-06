# Autonomous Mobility Expansion Implementation Plan

> For agentic workers: use subagent-driven implementation with independent ownership, review and final verification. The user authorized autonomous execution; keep questions for their return.

**Goal:** Build connected citizen assistance, scoped collaboration and a practical multi-agent foundation during the two-hour work window.

**Architecture:** Extend validated mobility cases with isolated case checks, reviewed bulk corrections, account-scoped helper APIs, resumable assisted-workflow states and evidence-backed follow-up. Keep optional external providers behind truthful readiness states.

**Tech Stack:** Existing React/Vinext/TypeScript, browser storage, optional Cloudflare D1/Workers; no default paid model calls.

**Spec:** `docs/superpowers/specs/2026-09-06-autonomous-mobility-expansion-design.md`

## Global constraints

- Work from current dirty `codex/screen-aware-voice-coach` checkout and preserve prior implementation.
- No paid provider or cloud model enabled by default; no real government credentials or actions.
- Source, uncertainty, consent, revision and current capability must remain explicit.
- No automatic external messages. Invites are generated only for the citizen to share.
- Stop starting new batches at 12:30 UTC / 18:00 Asia/Kolkata, 6 September 2026. Finish a safe check and prepare handoff.

## Work batches and ownership

- [x] A. Coordinated case review: `lib/mobility/case-team.ts`, `components/mobility/CaseTeamPanel.tsx`, own CSS/tests — case_team agent. Evidence/service/consistency checks feed one next-step synthesis; cancellation, fingerprints, useful errors and local-only labelling.
- [x] B. Corrections across drafts: `lib/mobility/profile-corrections.ts`, `components/mobility/ProfileCorrectionsPanel.tsx`, own CSS/tests and coordinated atomic store operation — profile_corrections agent. Preview/select/atomic commit, stale source protection, completed/submitted exclusions.
- [x] C. Trusted helper access: new server/helper contract, D1 migration, owner UI, helper page and real-SQL isolation tests — root initially (third worker dispatch reached thread limit). Bind email+capability+case revision, maximum 24h, revoke, proposal review.
- [x] D. Integrate A/B/C into actual workspace/account; review each module and exercise browser flows — root plus available agents.
- [x] E. Assisted-workflow state machine and synthetic private-takeover/receipt/recovery lab — assign after A/B handoff.
- [x] F. Evidence-backed observations and follow-up inbox/calendar, including failure/stale/deduplication behavior — assign after A/B handoff.
- [x] G. Optional model adviser using current provider docs, strict data minimization and bounded free usage; clearly unavailable until configured — root.
- [x] H. Local effort log/case brief and additional differentiated feature chosen from findings — root/available agent.
- [x] J. Password-protected portable case: free manual continuity, exact preview, native authenticated encryption, local review and fresh-copy import, original retention preserved — root domain / profile_corrections UI.
- [x] K. Original-file continuity: explicitly saved document facts retain SHA-256; optional local file checker groups matching sources, handles unavailable fingerprints and prevents stale results — root integration / intake_audit domain and UI.
- [x] L. Actual local Cloudflare runtime verification: real D1 migrations, identity isolation, helper lifecycle, rollback, expiry and cascading deletion — profile_corrections.
- [x] M. Reply-review bridge into a separate preparation case with optional parent details, exact review, private-device consent and unchanged original history — profile_corrections / root integration.
- [x] N. Correct the independent audit's working-case transitions, profile source conflicts, retention recovery and backend request races; add bounded inactive helper-history controls — profile_corrections / case_team.
- [x] O. Review explicitly recognized details from task text before creating a plan, avoiding repeated entry and unsupported location inference — intake_audit / root integration.
- [x] I. Full unit/type/lint/build, focused browser verification, mobile screenshots, integrated review and handoff.

## Progress ledger

- 10:30 UTC: Started. Baseline previous turn: 1,227 tests, 89 browser scenarios across full run/reruns, production build/type/lint pass. Existing changes are uncommitted.
- 10:32 UTC: Created heartbeat `build-challansakshi-while-away` every ten minutes until 12:30 UTC, attached to this task. It resumes from this plan and preserves the return deadline.
- Ruling: Continue implementation without further approval gates — user explicitly requested independent work while away — assumptions are reversible and recorded for return.
- Ruling: Build local checks and provider-ready model tools before enabling any cloud inference — preserves the user's free-start requirement — live AI quality still needs configured provider evaluation.
- Ruling: Third worker dispatch is unavailable due to a tool thread limit — root owns helper work while two independent workers implement A/B — lower parallelism only.

- 10:52 UTC: A/B integrated and verified: case team 24 unit tests and 4 browser scenarios; profile corrections 6 browser scenarios, including cross-tab invalidation and dirty-editor preservation. Fixed shared header wrapping at 320px.
- 10:53 UTC: Helper SQL isolation, lifecycle and rollback tests pass. Optional two-pass adviser backend built with minimised previews, no case writes, disabled-by-default binding and a D1 reservation ceiling (3/account/day; 20/site/day). Combined account/helper/adviser backend checks: 41 passing. Browser adviser verification in progress.

- 11:12 UTC: Helper UI/API, optional adviser and synthetic assistance lab integrated and verified in focused tests. Case brief and formatted saved-case search added; 15 combined browser regressions passed. Follow-up core/store/UI integrated, browser QA in progress; effort notebook assigned. Independent adviser review closed Unicode-number and multiple-question gaps. Helper copy shortened with an access/privacy disclosure. New continuing status report records current boundaries and prior snapshot links forward.

- 11:15 UTC: F passed 19 unit and 8 browser scenarios; H effort passed 17 unit and 5 browser scenarios, with actual reviewed export and Hindi mobile checks. Portable encrypted case domain added (7 unit scenarios pass) to support manual continuity without any backend; UI underway. Independent account review is investigating cross-tab identity changes before reviewed uploads. Helper concurrent equal-proposal regression now passes; helper suite 18 tests.

- 11:32 UTC: Second integrated unit checkpoint: 1,403 tests across 90 files passed, including six actual local Cloudflare Worker/D1 scenarios. Cross-tab account identity is pinned and checked for all private routes. Portable transfer and original-file fingerprint checks are complete. Real-PDF browser flow confirms saved source fingerprints. Follow-up closed-panel deletion/expiry defect fixed with two new browser regressions. Reply-to-case bridge mounted and in browser verification; root is simplifying portable previews without dropping reviewable content.

- 11:56 UTC: Final implementation checkpoint: all 1,455 tests in 93 files passed, with TypeScript, ESLint and production build passing. The native Worker/D1 suite now has seven scenarios, plus an actual frontend-to-native-handler account/helper browser journey with three fabricated sessions and no OAuth exchange or external provider calls. Task intake passed 30 unit and ten browser scenarios. Nine workspace-conflict browser checks cover the audit fixes, explicit deletion of saved/unsaved profile content and isolation between successive tasks. English/Hindi dark-mode inspection at 320px passed the bounded geometry and contrast review. Full 207-scenario development and 137-scenario production mobility browser runs are underway.

- 12:12 UTC: All final code gates pass: 1,473 tests in 94 files, TypeScript, ESLint, production build and whitespace. Final browser runs are clean in one run each: 213 development scenarios and 143 against the actual built Cloudflare Worker. The extra six intake browser regressions exclude trailing residence qualifiers and private issuer narrative. Node preview missing bindings now return an unconfigured response; Wrangler preview runs on 4180 with explicit loopback upstream. Fresh EN/HI dark mobile inspection and a one-context intake/correction/follow-up/encrypted-transfer/deletion walkthrough passed. No external services activated. Final official onboarding research and user handoff documentation remain.

- 12:17 UTC: Local implementation and handoff checks are complete. The original-idea map covers 22 themes; free-account setup, optional AI, portable files, official-source readiness, pilot gates and return questions are documented. Built-Worker preview remains on 4180; the completed development/Node test servers are stopped. A fresh mobile entry observation with 4× CPU slowdown found no eager OCR/voice assets, external requests, overflow or page/console errors; measurements are explicitly local smoke evidence. Source remains uncommitted and undeployed. All remaining original-concept gates require a selected official pilot, provider configuration/approval or real citizen outcome evidence. During any remaining heartbeat window, preserve this verified build, do not repeat completed suites without a new reason, and surface only a new actionable issue or user input.

- 12:30 UTC / 18:00 IST: Requested work window ended. All implementation agents are complete and no new actionable issue was found in the closing check. The verified built-Worker preview still returns HTTP 200 on port 4180. No new implementation batch was started, no completed test suite was repeated, and the temporary build heartbeat was paused. Continue from the return questions when the user chooses the first real pilot and optional account/provider setup.
