# ChallanSakshi public-launch + optional extension handoff for Claude Code

**Handoff date:** 2026-09-03 (Asia/Kolkata)  
**Repository:** `/Users/shars/Desktop/challansakshi`  
**Branch:** `codex/challansakshi-resolution-layer`  
**Committed HEAD:** `5febb0671c09f4e58ce96d354e7713d6ad048537` (`test: enforce prepared role immutability`)  
**Tracked worktree state:** one intentional modified file, `extension/tests/lifecycle.test.ts`  
**Public/Store status:** not deployed, not published, not submitted, and not eligible to be described as public-ready yet

This document is the complete takeover brief. Read it before changing the repository. The current uncommitted test work is valuable and must be preserved.

## 1. Executive status

The product direction is approved:

- A public web product that remains fully useful without an extension.
- An optional desktop Google Chrome extension that accelerates the handoff only after explicit user clicks.
- A narrow, polished e-Challan reconciliation journey first; horizontal expansion comes only after this vertical path is safe and complete.
- A hackathon-quality presentation that can compete for Top 10 / Top 1 without pretending that internal-review work is already a public release.

The web product and most of the extension foundation are built. Extension Tasks 1–4 are complete and independently reviewed. Task 5's runtime/message/lifecycle implementation is committed and its runtime fixes were reviewed positively. The remaining Task 5 work is a test-only static security proof for the payload-lifetime boundary. That proof has a large, intentional uncommitted patch which is currently targeted-test GREEN but has one lint warning and has not had the complete post-change gate/review cycle.

Tasks 6 and 7 have not been implemented:

- Task 6: consent-first bilingual popup.
- Task 7: deterministic scan/package pipeline and loaded-extension browser evidence.

The current popup is still a scaffold. The package script and browser spec do not exist. Do not claim the extension is finished.

## 2. Non-negotiable product and safety boundary

The approved extension may:

- Operate only after an explicit user action in the popup.
- Inspect only an exact allowlisted source/destination page.
- Fill only the two reviewed, non-secret, currently empty fields: `category` and `description`.
- Use a fictional synthetic adapter for automated proof.
- Prepare a user-controlled assisted handoff to an official site.

It must never:

- Read or fill CAPTCHA, OTP, Aadhaar/VID, credentials, challan identifiers, payment fields, attachments, declarations, hidden fields, or submit controls.
- Click or call Submit.
- Navigate, reload, retry, open a website, or submit on the user's behalf from the extension.
- Read or infer values from title, favicon, pending URL, window metadata, clipboard, logs, analytics, or network calls.
- Turn into a generic arbitrary-site form filler.
- Treat a same-origin lookalike, changed path/query/hash/port/userinfo, stale document, reused tab ID, or accessor/proxy object as authority.
- Enable either real government adapter before current selector verification, authorization/risk review, and a fresh release decision.

The current real adapters are intentionally selector-free and frozen as:

- `releaseState: 'internal-disabled'`
- `enabled: false`
- `supportedFields: []`
- `reason: 'verification-evidence-missing'`

The production-facing build profile is intentionally named `production-disabled`, displays `Production disabled · internal review only`, and must remain ineligible for Store/public claims.

The web experience must remain the primary installation-free path, especially because ordinary mobile Chrome does not support this desktop extension model.

## 3. Repository safety rules

### Protected path — never touch

`qa/public-launch-audit-2026-09-02/` is pre-existing, untracked user material.

Do not inspect, list, search, edit, stage, delete, clean, move, or otherwise target it. In particular:

- Do not run `git clean`.
- Do not run broad `git add .` or `git add -A`.
- Do not run repository-wide commands that enumerate untracked files.
- Use `git status --short --untracked-files=no` for ordinary status checks.
- Stage only explicitly named files.

### Preserve the current dirty file

Do not reset, restore, checkout, overwrite, or discard `extension/tests/lifecycle.test.ts`. It contains the in-progress outbound-flow closure described in section 7.

### Git/release truth

- There is no configured git remote and no upstream for this branch.
- Nothing in this branch has been pushed, merged, deployed, submitted to the Chrome Web Store, or publicly released by this work.
- Do not invent a PR, remote, deployment, hosted artifact, or Store status.
- Avoid destructive git commands.

## 4. Sources of truth and precedence

Read these files in this order:

1. This handoff.
2. `docs/superpowers/specs/2026-09-02-challansakshi-assisted-handoff-extension-design.md`
3. `.superpowers/sdd/2026-09-03-challansakshi-extension-framework-implementation/progress.md`
4. `docs/superpowers/plans/2026-09-03-challansakshi-extension-framework-implementation.md`
5. The task briefs and reports in `.superpowers/sdd/2026-09-03-challansakshi-extension-framework-implementation/`
6. Current code and tests.

Important controller briefs:

- Task 5 final proof: `task-5-fix-round-5-review-brief.md`
- Task 6: `task-6-controller-brief.md`
- Task 7: `task-7-brief.md` plus the Task 7 controller addendum in `progress.md`

The controller addenda in `progress.md` supersede older conflicting plan language. In particular, Task 7's exact dated Playwright prerelease exception supersedes the earlier stable-only wording.

The `.superpowers/sdd/...` ledger and reports are intentionally local/ignored coordination evidence. Do not assume they are committed just because they exist.

## 5. What is complete

### Existing web product/public-flow baseline

The companion web work already provides the guided, evidence-first ChallanSakshi journey and synthetic proof surface. The extension is additive; the web product must not depend on it.

The public-flow prerequisite recorded by the implementation ledger is:

- `441146b` — `fix: close synthetic proof boundary gaps`

At that checkpoint the web product had 39 Vitest files / 700 tests, typecheck, lint, production build, diff checks, independent review, and rendered 390×844 proof-entry evidence. Subsequent extension work preserved the web surface, and the last full root test gate before this handoff was 39 files / 713 tests.

This is local release evidence, not proof of public deployment.

### Extension Task 1 — isolated toolchain, manifest, profiles, and icons

Final reviewed head:

- `d521ed8` — `feat: scaffold isolated handoff extension candidate tooling`

Implemented:

- Manifest V3 build.
- Exact compile-time profiles: `synthetic-development` and `production-disabled`.
- `minimum_chrome_version: '152'`.
- Permissions are exactly `activeTab`, `scripting`, `storage`, and `alarms`.
- Incognito is disallowed.
- Local-only CSP/assets.
- Deterministic canonical SVG/PNG icons.
- Exact ten-file build leaf set.
- Root scripts for extension typecheck, tests, profile builds, browser lanes, scan/package, and aggregate build.

### Extension Task 2 — exact source authority and injection boundary

Final reviewed head:

- `c2f09ff` — cumulative Task 2 final head

Implemented:

- Profile-specialized source authority.
- Getter/proxy-safe own-data URL checks.
- Exact protocol/host/port/path/search identity.
- Closed source probe and validation contract.
- Document correlation and expiry.
- No opposite-profile source authority retained in a built profile.

### Extension Task 3 — destination adapter and fill-plan contract

Final reviewed head:

- `ee119d0` — cumulative Task 3 final head

Implemented:

- Exact destination adapter schema.
- Enabled fictional synthetic adapter only.
- Disabled Legacy and NextGen real adapters with no selectors.
- Exact source-to-destination preview/re-preflight/fill plan.
- Empty-only fill behavior for category/description.
- Closed injection result validators.
- No submit/navigation/network authority.

### Extension Task 4 — crash-safe session and safety ledger

Final reviewed head:

- `48a0dde` — `fix: reject nonrepresentable ledger times`

Implemented:

- One staged reduced envelope in session storage only.
- Payload-free local safety ledger only.
- Exact storage access boundaries.
- Three-phase durable settlement/readback.
- Warning/replay/orphan/quarantine recovery states.
- Alarm contracts and safe time representation.
- Device-owner exceptional reset boundary.
- Capacity and expiry pruning.

### Extension Task 5 — closed messaging and runtime lifecycle

Production/runtime commits:

- `3242bcf` — `feat: add crash safe extension candidate lifecycle`
- `c19d19b` — `fix: prune expired cancellation settlements`

Runtime functionality includes:

- Six closed commands:
  - `preview-current-page`
  - `load-reviewed-fields`
  - `fill-empty-reviewed-fields`
  - `clear-staged-fields`
  - `acknowledge-affected-person-inspection`
  - `reset-for-device-owner`
- Getter/proxy-safe, command-correlated request/response validation.
- Non-async callback listener returning literal `true` with a one-shot validated response.
- Serialized lifecycle queue.
- Fresh action-tab authority for page-bound actions.
- `tabs.query` plus own-data `tabs.get(tabId).url` rechecks.
- Load binding to the exact source preview tab.
- Final source re-probe and destination authority immediately before dispatch.
- No `await` between the final destination decision and injection dispatch.
- True payload-frame termination after confirmed consuming write/readback.
- Close-vs-fill, import-vs-fill, clear-vs-fill, duplicate fill, expiry, alarm, restart, and reused-tab-ID recovery handling.
- Exact close-won callback classification before storage/reconciliation work.
- Cancellation settlement followed by immediate fresh-time pruning before and after alarm scheduling.

The service-worker runtime has not changed since `c19d19b`. Its current SHA-256 is:

```text
256686530faefd12e00b2c50b4d20a6647e1d6783794ed5cf357d18cc2dbc357  extension/src/service-worker.ts
```

The later Task 5 commits are all test-only hardening:

| Commit | Subject |
| --- | --- |
| `6853106` | `test: enforce payload free fill preparation` |
| `7f1f736` | `test: close payload boundary analyzer sinks` |
| `cdc1bd6` | `test: bind consuming tuple origins` |
| `46467b9` | `test: close prepared provenance chain` |
| `a381899` | `test: bind fill durability suffix` |
| `5febb06` | `test: enforce prepared role immutability` |

These tests progressively made the payload-lifetime proof resistant to renamed aliases, destructuring, nonlocal writes, wrong origins, computed spreads, helper shadows, decoy durable writes, false confirmation guards, and authoritative-role reassignment.

## 6. Current exact repository state

At handoff:

```text
branch: codex/challansakshi-resolution-layer
HEAD:   5febb0671c09f4e58ce96d354e7713d6ad048537
tracked dirty file:
 M extension/tests/lifecycle.test.ts
```

The uncommitted diff is intentionally large because the single mutation test contains an in-memory static analyzer and its adversarial corpus:

```text
extension/tests/lifecycle.test.ts | 598 lines changed versus HEAD
```

Current file hashes:

```text
d6ff25c4dde12bf359947f2b919f8dc201dda9fe19548eb6b050f1c9c9353ca8  extension/tests/lifecycle.test.ts
256686530faefd12e00b2c50b4d20a6647e1d6783794ed5cf357d18cc2dbc357  extension/src/service-worker.ts
```

The current diff passes `git diff --check`.

## 7. Uncommitted Task 5 outbound-flow work

### Why it exists

The last independent review of committed HEAD `5febb06` found that the immutability analyzer correctly rejected writes *to* authoritative roles but still allowed authoritative values to escape *from* the payload frame through an unrelated sink, aggregate, iterable, or locally shadowed helper.

Concrete previously accepted attacks included:

```ts
(request as unknown as { parked: unknown }).parked = staged;
```

```ts
for (const survivor of [staged]) {
  (request as unknown as { parked: unknown }).parked = survivor;
}
```

```ts
void Object.freeze({
  parked: staged,
  resumed: await clearAlarm(SESSION_EXPIRY_ALARM),
});
```

```ts
class AuthoritativeCarrier {
  static retained = lifecycle;
}
```

A same-named local `fixedBlocker` could also leak the lifecycle while the old test authorized the call by spelling.

### What the current uncommitted patch does

The current patch introduces a certified-use model around the already-proven authoritative declarations. In the current file, key structures include:

- `certifiedCalls`
- `certifiedAggregates`
- `certifiedAssignments`
- canonical prefix-helper resolution
- exact occurrence/argument-role certification
- a final outbound-flow coverage walk

It treats `Object.freeze` as safe only at an exact certified DTO/aggregate site, not as a blanket exemption. It adds nineteen outbound adversaries covering:

- `request` property/element RHS sinks;
- direct, transitive, and property-projection aliases;
- for-of carriers;
- aggregate plus later `await`;
- static/private/computed class storage;
- call, constructor, tagged-template, dynamic-import, return/throw/finally, and closure carriers;
- locally shadowed prefix helpers;
- an extra real canonical helper call at an uncertified occurrence.

### Fresh evidence captured after implementation was stopped

The targeted test was run from the frozen worktree after the switch request:

```text
Test Files  1 passed (1)
Tests       1 passed | 108 skipped (109)
Duration    97.80s
```

Command:

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  ./node_modules/.bin/vitest run \
  --config extension/vitest.config.ts \
  extension/tests/lifecycle.test.ts \
  -t "ends the payload-bearing preparation scope before final authorization and dispatch"
```

Fresh extension typecheck also passes.

Fresh lint exits successfully but is **not clean**; it reports exactly one warning:

```text
extension/tests/lifecycle.test.ts
  2076:11  warning  'awaitedCallFromDeclaration' is assigned a value but never used
  @typescript-eslint/no-unused-vars
```

The full focused 124-test suite, all 213 extension tests, 713 root tests, both profile builds/isolation checks, and web build have **not** been rerun after the current uncommitted outbound-flow patch. The patch has not been independently reviewed and must not be called approved.

### Immediate takeover steps

1. Preserve the current diff.
2. Inspect the unused `awaitedCallFromDeclaration` helper at or near line 2076. If it is genuinely dead, remove it only; do not weaken the certified-use logic.
3. Rerun the targeted test and require 1 passed / 108 skipped.
4. Rerun extension typecheck and lint; lint must have zero warnings, not merely exit code 0.
5. Run every gate in section 11.
6. Review the diff for accidental production changes; only `extension/tests/lifecycle.test.ts` should be modified for this step.
7. Commit only that file with:

```text
test: close authoritative outbound flow
```

8. Obtain an independent spec/security review against the exact commit. The reviewer should rerun the attacks above and try at least one new same-shape/wrong-binding, class, iterable, evaluation-stack, helper-shadow, and extra-canonical-call case.
9. Do not mark Task 5 complete until that review has no Critical or Important findings and all gates are fresh.

## 8. Remaining Task 6 — consent-first bilingual popup

Task 6 starts only after Task 5 is committed and independently approved.

Authoritative brief:

```text
.superpowers/sdd/2026-09-03-challansakshi-extension-framework-implementation/task-6-controller-brief.md
```

Owned files:

- Create `extension/src/popup.ts`.
- Create `extension/src/popup.css`.
- Create `extension/tests/popup.test.ts`.
- Replace the scaffold behavior in `extension/popup.html`.
- Narrowly modify `extension/vite.config.ts` and `extension/vitest.config.ts` only to define the visible environment label.

Current absence/scaffold truth:

- `extension/src/popup.ts` does not exist.
- `extension/src/popup.css` does not exist.
- `extension/tests/popup.test.ts` does not exist.
- `extension/popup.html` still says `Internal extension scaffold`.

### First-paint consent contract

Static packaged HTML must contain the full bilingual disclosure before JavaScript runs. The only initial controls are:

- `Continue to preview this page` / `इस पेज का पूर्वावलोकन देखने के लिए आगे बढ़ें`
- `Not now` / `अभी नहीं`

Before Continue, there must be zero Chrome calls: no tab query, worker message, storage, scripting, source probe, or page access.

Not now performs zero Chrome calls and renders exactly:

- `No page was inspected` / `किसी पेज की जाँच नहीं हुई`
- `Nothing was read, stored, or changed.` / `कुछ भी पढ़ा, संग्रहित या बदला नहीं गया।`

Continue must be one-shot guarded before any await.

### Popup authority

Only these page-bound commands query the active tab:

- `preview-current-page`
- `load-reviewed-fields`
- `fill-empty-reviewed-fields`

For each explicit action, the popup may do exactly:

```ts
chrome.tabs.query({ active: true, lastFocusedWindow: true })
```

It may retain only an own numeric safe-integer tab ID, build the closed request using Task 5's request builders, and send one internal message.

These payload-free actions must not query a tab merely to discard the ID:

- Clear prepared fields.
- Acknowledge affected-person inspection.
- Device-owner reset.

The popup never uses `tabs.get`, storage, scripting, alarms, clipboard, navigation, network, URL parsing, `runtime.id`, or `runtime.getURL`.

Replies must first pass `validateWorkerResponseForCommand` for the exact sent command. Only then may the command-null invalid-sender/invalid-request family be considered. Do not cast or recreate the message schema.

All local transport/query/missing/malformed response failures render exactly:

- `The extension could not finish this check` / `एक्सटेंशन यह जाँच पूरी नहीं कर सका`
- `Close and reopen the popup, or use the assisted-copy steps on ChallanSakshi. Nothing else will be attempted.` / `पॉपअप बंद करके फिर खोलें, या ChallanSakshi पर सहायक-कॉपी चरणों का उपयोग करें। कोई और प्रयास नहीं किया जाएगा।`

Never render or log raw errors, `runtime.lastError`, URLs, fragments, or values.

### Value-scrub discipline

Reviewed values may exist only in one nullable in-memory preview slot and ordinary visible text nodes.

Before Load becomes observable:

```text
Load requested · reviewed values cleared from this popup
```

must synchronously replace every reviewed value node, and the source preview slot must be set to null before sending.

Before Fill becomes observable:

```text
Fill requested · inspect the official form
```

must synchronously replace every reviewed value node, and the destination preview slot must be set to null before sending.

No failure, stale response, double activation, timeout, state replacement, or expiry may reconstruct scrubbed values.

### DOM/accessibility/layout contract

- One `main`.
- One product `h1`.
- One state `h2[tabindex="-1"]`.
- Native `button[type="button"]` controls.
- One non-value-bearing `aria-live="polite"` and `aria-atomic="true"` status region.
- Focus the state heading on first paint and every state transition.
- Exactly one visually primary action per state; Clear is secondary.
- DOM creation, `textContent`, and `replaceChildren` only; never `innerHTML`.
- No anchor, form, base, refresh, inline script/style/handler, target, navigation surface, external/protocol-relative attribute, or value-bearing hidden surface.
- Preferred width `24rem`, constrained to `100vw`; minimum usable target `20rem`, constrained to `100vw`.
- No fixed popup height or `nowrap`.
- Buttons at least `2.75rem` high.
- `overflow-wrap: anywhere`; reviewed prose uses `white-space: pre-wrap`.
- Non-color focus outline at least 2px.
- Prove 320 CSS px and 200% reflow without horizontal overflow, clipping, or overlap.

Compile-time labels:

- Synthetic: `Synthetic development · fictional fixtures only`
- Production-disabled: `Production disabled · internal review only`

The popup must not import the complete manifest/profile registry.

Task 6's required test matrix has 17 clusters in the controller brief. Use TDD, retain RED evidence, run the full gate matrix, and commit with exactly:

```text
feat: add consent first extension popup
```

After implementation, do rendered popup QA, not JSDOM-only verification. Direct popup navigation can prove layout/content but does not prove toolbar action invocation or temporary `activeTab` behavior.

## 9. Remaining Task 7 — deterministic internal-review candidate

Task 7 starts only from the reviewed cumulative Tasks 1–6 head.

Missing files/work:

- `extension/scripts/package.mjs`
- `extension/tests/package.test.ts`
- `extension/tests/browser-harness-contract.test.ts`
- `extension/tests/browser/loaded-extension.spec.ts`
- Real implementation behind the current placeholder `extension/playwright.config.ts`

Do not run `pnpm run extension:verify` before Task 7 creates `extension/scripts/package.mjs`; the current aggregate script references work that does not yet exist.

### Exact candidate outputs

Only these three production-disabled outputs are allowed:

- `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.scan-report.json`
- `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.zip`
- `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.sha256`

The package source must be the exact real path of `extension/dist/production-disabled/`. Reject caller-selected paths, symlinked roots/ancestors/directories/leaves, synthetic/aggregate profiles, missing/extra arguments, and Store/public eligibility language.

The scan report contract and key order are frozen in the Task 7 controller addendum. Its ordered check IDs are exactly:

1. `canonical-source-directory`
2. `exact-leaf-set`
3. `regular-files-only`
4. `manifest-contract`
5. `local-asset-closure`
6. `canonical-icons`
7. `declarative-surface-closure`
8. `javascript-authority-closure`
9. `chrome-api-allowlist`
10. `local-storage-callsite-confinement`
11. `scripting-callsite-confinement`
12. `isolated-injection-targeting`
13. `alarm-contract`
14. `callback-message-contract`
15. `network-deny`
16. `bidirectional-profile-isolation`
17. `deterministic-archive-contract`

The ZIP must contain the exact ten bytewise-sorted leaves at archive root, mode 0644, fixed DOS UTC timestamp `1980-01-01T00:00:00Z`, deflate level 9, and no ZIP64, directory entry, comment, extra field, symlink, duplicate, leading slash, drive prefix, backslash, dot segment, or trailing slash. Tests must parse local and central records independently and inflate/compare every byte.

The checksum sidecar is exactly:

```text
<64 lowercase hex><two ASCII spaces>challansakshi-assisted-handoff-production-disabled-candidate.zip<LF>
```

Run two serial production-disabled build→scan→package cycles and require byte-identical ZIP/checksum/report identity.

### Browser lane

Current direct dependency:

```text
@playwright/test@1.62.1
```

That stable version resolves Playwright Chromium 151 and cannot satisfy the strict Chrome ≥152 lane. The controller addendum authorizes only this exact verification-tool prerelease if resolver metadata still matches:

```text
@playwright/test@1.63.0-alpha-2026-09-02
expected Playwright Chromium revision: 1243
expected browser: 153.0.8010.12
```

Do not use floating `next`. Reverify exact package metadata after installation, pin the version and lockfile, install only its exact Playwright-managed Chromium, run the complete existing gates, and revert/abstain if resolution differs or compatibility regresses.

The automated loaded-package harness must:

- Use a fresh ignored extension-only user-data directory.
- Load only the exact synthetic unpacked directory with matching load/disable flags.
- Verify package load, one service worker, static packaged disclosure, same-origin local assets, closed internal messaging, context close/relaunch registration, and no external network.
- Hard-fail the strict lane for absent, unparsable, or below-152 Chromium.
- Keep a separate diagnostic skip message only for characterization.

It cannot prove:

- Physical toolbar action-icon invocation.
- Temporary `activeTab` grant semantics.
- Real fixture mutation through an actual user gesture.

The final candidate README/report must end with exactly:

```text
BLOCKED — manual branded Chrome 152 action-icon source/load/destination/fill gate pending; real adapters remain disabled; not Store/public eligible
```

Task 7 commit message:

```text
feat: produce production-disabled handoff extension candidate
```

## 10. Manual and public-launch blockers

### Manual browser gate

The last verified local branded Google Chrome was major 151, while the manifest and manual gate require major 152 or later. A Playwright-managed Chromium ≥152 can satisfy the automated strict loaded-package lane, but it cannot replace the physical toolbar action-icon walkthrough in branded Chrome.

The future manual gate must cover source and destination action-icon invocation, fresh consent in each popup, Load then Fill, pre-click absence and post-navigation/close revocation of temporary access, path/capsule changes, exact fixture counters, 16 Language × Mode × Input × native-Zoom rows, and a reduced-motion smoke. Retain only independently reviewed, sanitized evidence.

### Public web/extension release gate

Before any real public launch claim:

- Establish a real git remote/release owner and reviewed merge path.
- Reverify official routes and current government/website terms.
- Decide whether any real adapter is authorized; keep it disabled if authorization/evidence is incomplete.
- Complete a current privacy/security review covering uploads, storage boundaries, retention, support contact, incident response, and shared-device behavior.
- Complete rendered accessibility checks on the real built product: mobile, Hindi, Simple Mode, keyboard, focus, 200% reflow, reduced motion, and scroll states.
- Complete Chrome Web Store permissions/privacy disclosures and review only after the production-disabled candidate is independently approved.
- Preserve the installation-free web assisted-copy/open-official-route path for mobile and users who decline the extension.

Never describe internal automated evidence as deployment, Store approval, government authorization, or physical user-gesture proof.

## 11. Verification commands

Use the repository's bundled Node runtime and exact pnpm fallback:

```text
Node bin: /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin
pnpm:    /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm
```

Targeted Task 5 proof:

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  ./node_modules/.bin/vitest run \
  --config extension/vitest.config.ts \
  extension/tests/lifecycle.test.ts \
  -t "ends the payload-bearing preparation scope before final authorization and dispatch"
```

Focused message/lifecycle suite:

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  ./node_modules/.bin/vitest run \
  --config extension/vitest.config.ts \
  extension/tests/message-contract.test.ts \
  extension/tests/lifecycle.test.ts
```

Full gates:

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:test

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:typecheck

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run typecheck

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run lint

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:build:synthetic

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:build:production-disabled

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run test

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run build

env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run build:all
```

Expected pre-Task-6 baseline counts are:

- Focused message/lifecycle: 2 files / 124 tests.
- Full extension: 8 files / 213 tests.
- Root web: 39 files / 713 tests.

Inspect lint output and require zero warnings.

Safe diff/status checks:

```bash
git status --short --untracked-files=no
git diff --check
git diff -- extension/tests/lifecycle.test.ts
git diff --name-only
```

Before committing the Task 5 patch:

```bash
git add extension/tests/lifecycle.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "test: close authoritative outbound flow"
```

The cached name list must contain only `extension/tests/lifecycle.test.ts`.

Known informational notices that are not current failures:

- Vite `inlineDynamicImports` deprecation during extension build.
- Vinext route-classification note during web build.
- Git may warn that committer identity was inferred automatically.

## 12. Top-10 / Top-1 product-quality direction

Finish the vertical story before adding more services:

1. A citizen understands the mismatch and evidence boundary on the web.
2. They review only the two allowed, non-secret fields.
3. The web flow opens the correct official route and offers assisted copy without requiring installation.
4. A desktop user may explicitly opt into the extension.
5. Each popup action requires fresh consent and fresh page authority.
6. The extension fills only empty reviewed fields, visibly preserves untouched sensitive fields, and never submits.
7. The person independently authenticates, inspects, declares, and submits.
8. Recovery states are honest, deterministic, and do not guess success.

Polish priorities:

- Make the independent/non-government status obvious immediately.
- Keep synthetic demo and real flows visually and semantically distinct.
- Make Hindi and Simple Mode first-class, not cosmetic translations.
- Keep one primary action and calm, legible recovery copy.
- Demonstrate the AI/rules/human boundary early: extraction/explanation may be AI-assisted; deadlines, state transitions, completeness, and consequential outcomes are deterministic or human-reviewed.
- Show judges concrete evidence: exact allowed fields, zero submit events, disabled real adapters, reproducible builds, and adversarial test cases.
- Do not expand to another grievance/service adapter until the e-Challan path is complete, reviewable, and usable without the extension.

## 13. Paste-ready Claude Code kickoff prompt

```text
Take over the ChallanSakshi repository at /Users/shars/Desktop/challansakshi.

First read the complete handoff:
docs/superpowers/handoffs/2026-09-03-claude-code-public-launch-extension-handoff.md

Then read, in order:
1. docs/superpowers/specs/2026-09-02-challansakshi-assisted-handoff-extension-design.md
2. .superpowers/sdd/2026-09-03-challansakshi-extension-framework-implementation/progress.md
3. docs/superpowers/plans/2026-09-03-challansakshi-extension-framework-implementation.md
4. .superpowers/sdd/2026-09-03-challansakshi-extension-framework-implementation/task-5-fix-round-5-review-brief.md
5. .superpowers/sdd/2026-09-03-challansakshi-extension-framework-implementation/task-5-implementer-report.md

Hard safety rules:
- Never inspect, list, search, stage, modify, delete, or clean qa/public-launch-audit-2026-09-02/.
- Never run git clean, git reset --hard, broad git add ., or broad git add -A.
- Preserve the current uncommitted extension/tests/lifecycle.test.ts diff.
- The extension may fill only empty reviewed category/description fields after explicit clicks.
- Never read/fill CAPTCHA, OTP, Aadhaar/VID, credentials, identifiers, payment, attachment, declaration, hidden, or submit fields; never navigate or submit.
- Real adapters remain internal-disabled and selector-free.
- Do not claim deployment, Store eligibility, public release, government authorization, or physical action-icon proof.

Current state:
- Branch codex/challansakshi-resolution-layer.
- HEAD 5febb0671c09f4e58ce96d354e7713d6ad048537.
- Only tracked dirty file is extension/tests/lifecycle.test.ts.
- The targeted outbound-flow mutation test is currently GREEN: 1 passed, 108 skipped.
- Extension typecheck is GREEN.
- Lint currently has one warning: unused awaitedCallFromDeclaration near line 2076.
- Full gates and independent review have not been run for this uncommitted patch.

Immediate objective:
1. Inspect and preserve the outbound-flow analyzer/mutation patch.
2. Remove only the genuinely unused awaitedCallFromDeclaration helper without weakening the analyzer.
3. Rerun the targeted test, extension typecheck, and lint with zero warnings.
4. Run focused 124, full extension 213, root 713, both profile builds/isolation checks, both typechecks, lint, web build, build:all, and diff checks.
5. Stage only extension/tests/lifecycle.test.ts and commit as: test: close authoritative outbound flow
6. Independently re-review the exact commit against RHS sinks, iterables, aggregates across await, classes, canonical-helper shadows, and extra canonical call occurrences.
7. Only after Task 5 is approved, implement Task 6 from task-6-controller-brief.md with TDD and rendered QA.
8. Only after Task 6 is approved, implement Task 7's deterministic production-disabled scan/package and loaded-extension harness.

Report observed, implemented, tested, reviewed, deployed, and user-inspected states separately. Continue through safe verification, but stop before any external deployment, Store submission, real-adapter enablement, or destructive action unless explicitly authorized.
```

## 14. Final handoff truth

The repository contains substantial, carefully tested public-web and extension foundation work. It does **not** yet contain the consent-first popup, deterministic candidate packager, or completed browser/manual gate. The current uncommitted Task 5 test patch is the correct place to resume. Preserve it, close its one lint warning, run the complete gates, obtain independent approval, then proceed Task 6 → Task 7 in that order.
