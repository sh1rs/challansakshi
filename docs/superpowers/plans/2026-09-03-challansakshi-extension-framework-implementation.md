# ChallanSakshi Assisted Handoff Extension Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a least-authority Manifest V3 desktop Chrome extension framework that performs a two-consent, preview/load then preview/fill transfer of at most a reviewed description and verified category on synthetic fixtures, while emitting a **production-disabled internal-review candidate** with all real official adapters demonstrably disabled. This plan cannot make a public release or a live-official-autofill claim.

**Architecture:** Keep extension code in a separately built vanilla-TypeScript `extension/` subtree. Compile mutually exclusive synthetic-development and production-disabled profiles. Self-contained injected functions accept only closed JSON plans. A serialized service worker binds source and destination to exact current top-frame `documentId` values, erases payload before dispatch, and uses a single payload-free persistent safety ledger for replay/warning/unresolved recovery. The popup starts from static disclosure and cannot query tabs, storage, worker, or pages before the user presses Continue.

**Tech Stack:** Manifest V3, vanilla TypeScript 5.9, Vite 8/Rollup, Vitest 4, JSDOM, Chrome typings, Playwright persistent Chromium context, deterministic ZIP creation with Yazl, SHA-256.

**Spec:** `docs/superpowers/specs/2026-09-02-challansakshi-assisted-handoff-extension-design.md`

## User-approved Spec and Committed Companion Prerequisite

The user explicitly approved `docs/superpowers/specs/2026-09-02-challansakshi-assisted-handoff-extension-design.md` and local implementation on 3 September 2026 without an unresolved authority/privacy objection. Record that approval and its source in the SDD ledger. It authorizes this production-disabled candidate work only, not publication, Store submission, or real-adapter enablement.

All Tasks 1–6 of `docs/superpowers/plans/2026-09-03-challansakshi-public-handoff-implementation.md` must then be committed green: their required focused tests, full web test suite, typecheck, lint, and production build must pass from one recorded companion commit. That companion plan owns `lib/extension-handoff-contract.ts`, `lib/extension-release.ts`, `app/extension/page.tsx`, `tests/extension-landing-contract.test.ts`, `app/demo/extension-fixture/source/page.tsx`, `app/demo/extension-fixture/destination/page.tsx`, and the controlled `/review` capsule/projection surface. Record the exact prerequisite commit and commands in the SDD ledger. Block every Extension Task if the approval is absent, the companion commit is not green, or any owned contract/fixture is absent; this plan consumes those surfaces and never duplicates their ownership.

## Global Constraints

- The manifest permission array is exactly `activeTab`, `scripting`, `storage`, and `alarms`; `incognito` is `not_allowed`. No host/optional-host permission, tabs permission, content script, external messaging, web-accessible resource, clipboard permission, network interception, remote code/configuration, telemetry, or custom update URL is allowed.
- Every popup invocation begins with packaged static disclosure. Before that popup instance's `Continue to preview this page`, code makes zero tab queries/gets, storage reads, worker messages, page injections, or source re-probes. Consent is never stored.
- Source preview and `Load reviewed fields` are separate. Destination preview and `Fill empty reviewed fields` are separate. Popup value-bearing nodes and JavaScript state are synchronously scrubbed before Load/Fill commands.
- No website can message, detect, ping, wake, or configure the extension. Internal runtime messages use closed schemas and no external extension ID.
- The extension may handle only the exact reduced envelope from `lib/extension-handoff-contract.ts`. It never receives a full pack, evidence files/images, structured observations, filenames, URLs, selectors, arbitrary field maps, challan-number bridge, acknowledgement, or protected-field data.
- Source and destination preview probe the current top frame using `frameIds: [0]` and capture non-empty Chrome `documentId`. Every later current-frame probe must return the same ID. Only the final fill targets the stored destination via `documentIds: [id]`; same-URL replacement documents are rejected.
- The synthetic-development artifact contains only `127.0.0.1:3000` exact fixture routes and rejects real mode. The production-disabled artifact contains only the production source plus disabled real route identities, rejects synthetic mode, and contains no loopback/fixture literal. No artifact contains both families.
- Real Legacy and NextGen adapter records remain `internal-disabled`, `enabled: false`, with empty supported fields and no guessed selector, form, option, fingerprint, or setter contract.
- The only enabled adapter is the conspicuously fictional synthetic fixture. It may fill only one category select and one description textarea after exact blank/DOM/fingerprint checks.
- Never read or fill identifier, CAPTCHA, OTP, Aadhaar/VID, credential, contact, payment, offence, attachment, declaration, hidden, submit, or unrelated controls. Never navigate, click, focus protected controls, dispatch events, submit, retry, watch mutations, inspect cookies/storage/network, take screenshots, or send telemetry.
- `Blank` means the native value is exactly `''`; whitespace, newline, NBSP, and zero-width characters are non-empty. Use the allowlisted native prototype setter and dispatch zero events.
- The self-contained source and fill functions have no imported or closed-over runtime helper. They validate the entire closed plan and live document contract inside the isolated realm.
- Except for the popup's post-consent `chrome.tabs.query({ active: true, lastFocusedWindow: true })`, only `extension/src/service-worker.ts` issues `chrome.scripting`, session storage, alarms, tab reads/listeners, and worker-side runtime-message operations. The popup may additionally issue only its closed `chrome.runtime.sendMessage` request; `extension/src/safety-ledger.ts` alone implements `chrome.storage.local` access. Pure result/message validators issue no Chrome API call.
- One staged envelope and source binding may live only under `challansakshi.session-state.v1` in trusted-context `chrome.storage.session`, with effective expiry `min(source expiry, importedAt + 600000)`.
- Only `extension/src/safety-ledger.ts` may access `chrome.storage.local`, and only under `challansakshi.safety-ledger.v1`. The ledger is payload-free, lexicographically ordered, unique by pack ID, capped at 32, and contains at most one globally blocking unresolved or needs-review record.
- Persist local unresolved-live before erasing the session payload and before injection. Every terminal transition uses `session settling → local terminal → session clear`; storage ambiguity stays unresolved or quarantined.
- Neither elapsed time, alarms, startup, update, reload, disable, tab lookup failure, navigation, `tabs.onReplaced`, nor a missing snapshot proves cancellation. Missing session correlation converts recognized unresolved-live to unresolved-orphaned and removes its nonce; later numeric tab events cannot settle it.
- Use only literal identifier-free one-shot alarms `session-expiry`, `ledger-cleanup`, and `attempt-watchdog`, with finite safe-integer `{ when }` deadlines.
- Every fill uses a worker-owned mutation deadline no more than 30 seconds after dispatch and no later than envelope/adapter expiry. It is fail-fast, not a cancellation claim.
- Production artifacts have no source maps, dynamic imports, module-preload network polyfill, inline code, remote asset/config/import/request endpoint, executable network primitive, or source/profile leak. Exact profile-generated source/destination location constants used only for equality validation are the sole permitted URL identities.
- Automated Chromium may prove loaded-package behavior but not a physical action-icon gesture or temporary `activeTab` grant. The current local Chrome 151 cannot satisfy the specified Chrome 152 manual release gate; record that gate as blocked, not passed.
- Use TDD for every production behavior. Preserve explicit RED and GREEN command evidence in each task report.
- Root web TypeScript excludes `extension/`, while root `eslint .` continues to inspect authored extension source/tests and ignores only generated output.
- Use the bundled Node runtime path when bare `node` is unavailable, and never modify or stage `qa/public-launch-audit-2026-09-02/`.

---

### Task 1: Scaffold compile-time profiles, exact manifest generation, and isolated toolchain

**Files:**
- Create: `extension/README.md`
- Create: `extension/popup.html`
- Create: `extension/tsconfig.json`
- Create: `extension/vite.config.ts`
- Create: `extension/vitest.config.ts`
- Create: `extension/playwright.config.ts`
- Create: `extension/public/favicon.svg`
- Create: `extension/scripts/generate-icons.mjs`
- Create: `extension/src/manifest.ts`
- Create: `extension/public/icons/icon-16.png`
- Create: `extension/public/icons/icon-32.png`
- Create: `extension/public/icons/icon-48.png`
- Create: `extension/public/icons/icon-128.png`
- Create: `extension/tests/manifest.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.json`
- Modify: `eslint.config.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces exact `synthetic-development` and `production-disabled` build profiles and `buildManifest(profile)`.
- Adds exact root commands without changing web build outputs. The commands and their fixed artifact paths are:
  - `extension:typecheck`: `tsc -p extension/tsconfig.json --noEmit`.
  - `extension:test`: `vitest run --config extension/vitest.config.ts`.
  - `extension:build:synthetic`: `vite build --config extension/vite.config.ts --mode synthetic-development` → `extension/dist/synthetic-development/`.
  - `extension:build:production-disabled`: `vite build --config extension/vite.config.ts --mode production-disabled` → `extension/dist/production-disabled/`.
  - `extension:browser`: `playwright test --config extension/playwright.config.ts`.
  - `extension:scan`: validates `extension/dist/production-disabled/` and writes `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.scan-report.json`.
  - `extension:package`: validates the same directory and current scan report, then writes `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.zip` and `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.sha256`.
  - `extension:verify`: composes typecheck, unit tests, both profile builds, and the package scan; it does not treat an unavailable loaded-browser lane as success.
  - `build:all`: composes the existing web build and both extension profile builds.

- [ ] **Step 1: Resolve and add direct exact development dependencies**

Use `sharp@0.34.5`, already resolved in the current lockfile, as the deterministic local SVG-to-PNG renderer. Resolve compatible current versions for the remaining tools and install every dependency as a direct exact dev dependency with this host-valid command (the `-E` flag forbids range prefixes):

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm add -D -E @types/chrome @playwright/test jsdom @types/jsdom yazl @types/yazl sharp@0.34.5
```

Record the resolver-selected exact versions in `package.json` and commit the matching resolved `pnpm-lock.yaml`; do not hand-edit an unresolved lockfile.

- [ ] **Step 2: Write the failing manifest/profile test**

Require the complete exact manifest from Spec Section 4, including version `0.1.0`, minimum Chrome `152`, four local icons, action popup/title/icons, ES-module service worker, exact permissions/order, `incognito: 'not_allowed'`, and exact CSP. Assert that package name/visible environment label, manifest metadata, validator, source registry, and adapter registry are produced from one closed profile input and cannot be runtime-switched. Reject unknown keys and every forbidden capability. Assert profile literals are mutually exclusive.

- [ ] **Step 3: Run focused test and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run --config extension/vitest.config.ts extension/tests/manifest.test.ts
```

Expected: failure because the extension toolchain and manifest generator do not exist.

- [ ] **Step 4: Implement the isolated build foundation**

Generate profile-specific outDirs, stable `popup.html`/`service-worker.js`/asset names, `sourcemap: false`, `modulePreload.polyfill: false`, and `inlineDynamicImports: true` for the worker. Copy the canonical bytes of `public/favicon.svg` verbatim to committed `extension/public/favicon.svg`; its pre-implementation test fixture locks SHA-256 `6f4d7c5e4eb17909bc8f9fb18f73e68e3120f082b3bed46bbf77ab4bdde0e7a1` and rejects script, external reference, font, raster fetch, or user data. `extension/scripts/generate-icons.mjs` uses only `sharp@0.34.5`, density `384`, `resize(size, size, { fit: 'fill' })`, and PNG options `{ compressionLevel: 9, adaptiveFiltering: false, palette: false }` for sizes 16, 32, 48, and 128, with no system-font or network input. Before generator implementation, the failing test locks the independently generated PNG SHA-256 fixtures respectively to `fc3770facd8c17e12e77c5233a3e8bf979176258280f9947c0fc0ac524d87690`, `2217c35895f334fcf7765b7b05a0910fad1f9b114c0472f976a4c4ec3cd0287c`, `40f0214e8effdc65dc81351d4c4d8a1b8c20d2406803e86a86c8b2dec3a54cb0`, and `477490f1e21d5ad74b4af6bf3e20e49e1b6f9009db88fef409a28b683521b6ed`; it also validates dimensions, format, non-emptiness, renderer identity, and every manifest reference. Exclude `extension/` from root TS, include it in scoped ESLint, ignore only generated extension artifacts, and implement every exact root script and artifact/report path named in the interface above.

- [ ] **Step 5: Verify GREEN, web isolation, and commit**

Run the manifest test, root typecheck, root lint, and web build. Commit as `feat: scaffold isolated handoff extension candidate tooling`.

---

### Task 2: Implement the exact source registry, capsule probe, and source-document binding

**Files:**
- Create: `extension/src/source-probe.ts`
- Create: `extension/tests/envelope.test.ts`
- Create: `extension/tests/source-probe.test.ts`
- Create: `extension/tests/injected-function-serialization.test.ts`

**Interfaces:**
- Consumes `ExtensionHandoffEnvelope` and canonical validation from `lib/extension-handoff-contract.ts` only in trusted extension code.
- Exports one self-contained `probeChallanSakshiSource(plan)` injected function and closed `SourceProbePlanV1` / `SourcePreviewBindingV1` data contracts.
- Exports pure trusted-worker result validators that keep Chrome `InjectionResult` metadata separate from the injected function result. They issue no Chrome API calls, require exactly one `frameId === 0` result with a bounded non-empty `documentId`, and reject missing, extra, wrong-frame, malformed, or mismatched results without adopting a replacement document. `service-worker.ts` is the only caller of `chrome.scripting.executeScript` and must use `{ tabId, frameIds: [0] }` for these preview/re-probe calls.
- Synthetic plan accepts exactly `http://127.0.0.1:3000/demo/extension-fixture/source`; production plan accepts only the canonical HTTPS `/review` source and its exact allowed goal queries.

- [ ] **Step 1: Write failing envelope/profile/source adversary tests**

Mirror the shared envelope vectors inside the extension suite and prove both profile validators reject the opposite mode. For the source probe, cover exact URL components, top-frame requirement, deadline, one marked root/direct child/one text node, canonical JSON byte equality, duplicate/unknown keys, extra DOM nodes, whitespace/escape/key-order drift, and exact non-empty returned document binding. Adversarial pure-result tests require exactly one `frameId === 0` result, a bounded non-empty Chrome-owned `documentId`, and separate validation of result metadata versus returned function data; reject missing, extra, wrong-frame, malformed, and same-URL replacement results. Lifecycle tests later prove the only `executeScript` call site uses exact `{ tabId, frameIds: [0] }`.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run --config extension/vitest.config.ts extension/tests/envelope.test.ts extension/tests/source-probe.test.ts extension/tests/injected-function-serialization.test.ts
```

Expected: failures because the source plan and serialized probe do not exist.

- [ ] **Step 3: Implement the self-contained probe and digest binding**

The function must validate all plan literals, compare exact `location` components, use only `document.querySelectorAll` for the two marker attributes, read only the direct text node's bounded `.data`, parse/reconstruct canonical JSON, and return fixed codes plus the envelope to the trusted worker. It must not and cannot supply the authoritative document binding; the trusted wrapper takes that only from validated Chrome `InjectionResult` metadata. Do not read whole-page text/HTML. Fresh-realm tests must reconstruct `probeChallanSakshiSource.toString()` with only JSON arguments and enumerated DOM globals.

- [ ] **Step 4: Verify GREEN and commit**

Run the Step 2 command and root lint. Commit as `feat: bind extension source capsules`.

---

### Task 3: Implement immutable adapters and the zero-event destination preflight/fill function

**Files:**
- Create: `extension/src/destination-adapters.ts`
- Create: `extension/src/fill-page.ts`
- Create: `extension/tests/fill-page.test.ts`
- Modify: `extension/tests/injected-function-serialization.test.ts`

**Interfaces:**
- Produces one enabled exact synthetic adapter and two selector-free `internal-disabled` production identities.
- Exports one self-contained `preflightOrFillDestination(plan)` function accepting a closed JSON `InjectionPlan` with `operation: 'preview' | 'fill'`.
- Exports pure result validators only; they issue no Chrome API call. The service worker alone targets preview with `{ tabId, frameIds: [0] }` and final fill with `{ tabId, documentIds: [storedDestinationDocumentId] }`. Both require exactly one `frameId === 0` result with a bounded non-empty matching `documentId`; any missing, extra, wrong-frame, malformed, or replacement result fails closed.
- Keeps result channels distinct: `preview` returns only a closed value-free readiness/fixed-mismatch result, never an attempt ID, selected values, original values, or DOM/fingerprint material. `fill` returns only the worker-issued `attemptId`, allowed field IDs, and closed `complete`/`partial`/`indeterminate` status.

- [ ] **Step 1: Write failing DOM and authority-boundary tests**

Cover protocol/host/port/path/userinfo/query/fragment/frame/visibility, form method/action, exactly one target, allowed tag/id/name/label/container, textarea raw/native constraints, exact native blankness including whitespace/NBSP/zero-width negatives, strict select placeholder/mapped-option/optgroup contracts, deadlines, DOM-clobbering names, and every protected control. Prove preview result output is value-free and cannot carry a fill attempt/result; prove fill output is limited to its issued attempt ID, allowed field IDs, and fixed status. Pure-result tests require one result, frame zero, bounded non-empty Chrome-owned document ID, separate result/metadata validation, and rejection of missing/extra/wrong-frame/replacement results. Lifecycle tests later assert the only worker call sites use exact preview `frameIds: [0]` and final-fill-only `documentIds`. Instrument getters/methods and assert zero protected reads, zero clicks/submits/navigation/storage/cookie access, zero `dispatchEvent`, and zero events.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run --config extension/vitest.config.ts extension/tests/fill-page.test.ts extension/tests/injected-function-serialization.test.ts
```

Expected: failures because adapters and the injected function do not exist.

- [ ] **Step 3: Implement preview/fill with exact native setters**

Validate the complete plan in the injected realm. For `preview`, inspect only the permitted static/blankness contract and return a value-free fixed readiness/mismatch code without mutation. For `fill`, preflight every allowed field before mutation. Resolve only `Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set` or the textarea equivalent, verify no shadowed value property, re-resolve/revalidate immediately before each setter, check visibility/deadline at entry/before every setter/readback, set in one synchronous stack, dispatch nothing, then perform one microtask plus one animation-frame exact readback. Only this fill branch returns the supplied attempt ID, allowed field IDs, and fixed complete/partial/indeterminate code.

- [ ] **Step 4: Verify GREEN and commit**

Run focused tests and root lint. Commit as `feat: add zero event synthetic field fill`.

---

### Task 4: Implement the closed payload-free safety ledger

**Files:**
- Create: `extension/src/safety-ledger.ts`
- Create: `extension/tests/safety-ledger.test.ts`

**Interfaces:**
- Sole owner of `challansakshi.safety-ledger.v1` and every `chrome.storage.local` call.
- Produces validation, raw read, write/readback, prune-after-reconcile, arm, settle, acknowledge, orphan, quarantine, capacity, and reset-for-device-owner operations without importing envelope/adapters.

- [ ] **Step 1: Write failing closed-shape and transition tests**

Cover every exact union member from Spec Section 8, post-serialization plain-own-record validation, 32-hex values, safe-integer time ordering, unique lexicographic pack order, max 32, one global blocker, absence-as-empty, replay/warning pruning, unresolved pinning, nonce stripping on orphan conversion, valid settlement replacements, and malformed/unknown/duplicate/over-capacity quarantine. Assert source scanning finds no description/digest/route/issue/tab/document/attempt/deadline property and no other `storage.local` callsite.

- [ ] **Step 2: Run focused test and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run --config extension/vitest.config.ts extension/tests/safety-ledger.test.ts
```

Expected: failure because the ledger module does not exist.

- [ ] **Step 3: Implement fail-closed ledger operations**

Set `TRUSTED_CONTEXTS` before the first local read each worker lifetime. Use exact reserved-key reads/writes and exact readback. Never evict active records. Reconcile a stored `settling` intent before pruning any expired replay. Keep unresolved variants timeless; a needs-review warning ends only by affected-person acknowledgement or its 24-hour deadline.

- [ ] **Step 4: Verify GREEN and commit**

Run the focused test and root lint. Commit as `feat: add extension safety ledger`.

---

### Task 5: Implement the serialized service-worker lifecycle and crash-safe settlement

**Files:**
- Create: `extension/src/service-worker.ts`
- Create: `extension/src/message-contract.ts`
- Create: `extension/tests/lifecycle.test.ts`
- Create: `extension/tests/message-contract.test.ts`

**Interfaces:**
- Owns every Chrome API call except the popup's post-consent current-tab query and closed `runtime.sendMessage` request, plus the ledger module's implementation of local-storage calls. It is the sole `scripting.executeScript` caller; source/destination result validators remain pure.
- Implements closed callback-style message handling, one serialized queue, session state, source preview/load, destination preview/fill, alarms, tab lifecycle, settlement, warning acknowledgement, and explicit staged clear. `message-contract.ts` owns every closed internal request/response discriminated union and plain-record validator.

- [ ] **Step 1: Write failing worker ordering, race, and recovery tests**

First write failing `message-contract` tests for post-serialization plain-own-record validation, exact keys/discriminants, no payload in commands that must be scrubbed, request/response direction, fixed error codes, and rejection of unknown/missing/extra/prototype-controlled values. Validate the sender without adding Chrome API authority: parse `sender.url`; require protocol `chrome-extension:`, no username/password/port/search/hash, exact pathname `/popup.html`, origin exactly equal to the service worker's `self.location.origin`, and `sender.id` exactly equal to the parsed hostname. Reject page, content-script, other extension-page, external, absent, and forged sender shapes before any state or Chrome API access. Do not call `chrome.runtime.id` or `chrome.runtime.getURL`. Then mock Chrome completely and assert the exact pre-dispatch order: action-tab match → source re-probe using `{ tabId, frameIds: [0] }` and one validated result → current-top-frame destination preflight/document match using `{ tabId, frameIds: [0] }` and one validated result → arming session write/read → local unresolved write/read → payload-free consuming write/read → final current-frame source re-probe/document match → clear call-frame binding → action-tab/deadline recheck → immediate final fill using `{ tabId, documentIds: [storedDestinationDocumentId] }` and one validated result. Cover storage failures, every arming/settling crash window, double/rapid/concurrent commands, stale generations, expiry, alarms, partial/indeterminate/late complete, transport/malformed/missing result, watchdog, same-session exact `onRemoved`, `onReplaced`, startup/update/reload missing correlation, orphaning, quarantine, replay, warning acknowledgement/expiry, and absent extension session state.

- [ ] **Step 2: Run focused test and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run --config extension/vitest.config.ts extension/tests/message-contract.test.ts extension/tests/lifecycle.test.ts
```

Expected: failure because the service worker and state machine do not exist.

- [ ] **Step 3: Implement one serialized lifecycle owner**

Use only `message-contract.ts` literal message discriminants and fixed error codes. Each `runtime.onMessage` listener first validates the exact popup sender and closed request before touching state, returns literal `true`, enqueues work, and calls `sendResponse` exactly once; it is not `async` and never returns a Promise. Validate every closed response before sending it. Set both storage access levels before reads. Register `onRemoved`, `onReplaced`, `onStartup`, `onInstalled`, and alarm handlers, but let them process only existing consented lifecycle metadata. Use only the three literal one-shot alarm names.

- [ ] **Step 4: Verify GREEN and commit**

Run message-contract, lifecycle, safety-ledger, source, and fill tests plus root lint. Commit as `feat: add crash safe extension candidate lifecycle`.

---

### Task 6: Build the consent-first bilingual popup and value-scrubbed previews

**Files:**
- Create: `extension/src/popup.ts`
- Create: `extension/src/popup.css`
- Create: `extension/tests/popup.test.ts`
- Modify: `extension/popup.html`

**Interfaces:**
- First state is static packaged disclosure with only `Continue to preview this page` and `Not now`.
- After Continue, displays source preview, staged, destination preview, success/partial, needs-review, unresolved-live, unresolved-orphaned, quarantined, rejected, expired, unsupported, adapter-disabled, or empty states using only validated closed worker responses from `message-contract.ts`.

- [ ] **Step 1: Write failing consent/access/scrub/accessibility tests**

Assert zero `tabs.query`, storage, `runtime.sendMessage`, scripting, and source re-probe calls before every Continue. Assert consent is absent after popup replacement. Assert the popup issues no Chrome API beyond its post-consent numeric active-tab query and its closed runtime message, and rejects malformed/unknown worker responses before rendering. Verify exact value text exists only in ordinary preview text nodes, never attributes/title/labels/URL/log/errors/hidden duplicates; pressing Load or Fill synchronously replaces it with fixed copy and nulls in-memory values before the mocked message is observed. Cover English/Hindi, Simple Mode, visible focus, semantic heading, live region, 200% zoom layout, minimum usable width, one primary action, clear/discard, independence, affected-person boundary, untouched list, and future/past submission wording.

- [ ] **Step 2: Run focused test and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run --config extension/vitest.config.ts extension/tests/popup.test.ts
```

Expected: failure because popup behavior and styles do not exist.

- [ ] **Step 3: Implement the popup state renderer and scrub discipline**

Use DOM APIs and `textContent` only, never `innerHTML`. Do not place anchors/forms/navigation in popup HTML. After Continue, query only `{ active: true, lastFocusedWindow: true }`, retain only the numeric action-tab ID, validate a `message-contract.ts` request, and send it through the closed internal channel. The popup never reads URL/title/favicon/pending URL or performs source/destination validation; the worker handles those transient checks. Ensure transition cleanup always scrubs preview values.

- [ ] **Step 4: Verify GREEN and commit**

Run the popup test, all extension unit tests, typecheck, and root lint. Commit as `feat: add consent first extension popup`.

---

### Task 7: Build both profile artifacts, deterministic package scan, and production-disabled candidate evidence

**Files:**
- Create: `extension/scripts/package.mjs`
- Create: `extension/tests/package.test.ts`
- Create: `extension/tests/browser-harness-contract.test.ts`
- Create: `extension/tests/browser/loaded-extension.spec.ts`
- Modify: `extension/playwright.config.ts`
- Modify: `extension/README.md`
- Modify only defects discovered by verification.

**Interfaces:**
- Produces isolated synthetic-development and production-disabled unpacked artifacts.
- Produces a deterministic internal-review ZIP plus lowercase SHA-256 only from a validated `production-disabled` profile, at the exact paths declared in Task 1.
- Produces honest automated loaded-package/popup/worker evidence, separately documented JSDOM mocked-fill evidence, and a **blocked until run** branded-Chrome 152 action-icon manual-fill gate. None is a Store/public-release result.

- [ ] **Step 1: Write failing package/source/bundle/browser tests**

Assert exact manifest references, local asset closure, stable worker/popup outputs, no source map/dynamic import/module-preload polyfill/remote asset/config/import/request endpoint/executable network primitive/eval/new Function, exact Chrome API allowlist, callback messaging, top-frame isolated injection call shapes, local-ledger callsite confinement, literal alarms, declarative popup asset restrictions, exact favicon/SVG and PNG validation, and bidirectional profile-literal isolation. The scan must allow only the profile-generated source/destination location constants used for equality validation; it must reject any other URL identity and every network-loading primitive. Package twice from clean production-disabled outputs and require identical ZIP bytes/checksums, sorted normalized paths, no symlinks/directory entries, mode 0644, fixed 1980 timestamp, no unexpected file, and a machine-readable report at `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.scan-report.json` that binds the inspected directory hashes to the archive checksum.

Keep proof lanes separate. JSDOM/direct isolated-realm tests in Tasks 2–3 prove the actual synthetic fill mutates only category/description and produces zero protected reads/events/clicks/submits/navigation/download/upload/network side effects. The Playwright persistent-context harness only proves built-package loadability, direct popup rendering, worker registration/restart, closed internal messaging, and local packaged assets; it never claims to invoke the physical action icon, obtain `activeTab`, or mutate the fixture. Before that harness loads the candidate, read its Chromium major: if it is below 152, report a structured **loaded-package lane skipped: Chromium < 152** result and skip only that browser lane; package/unit/scan gates still run. The headed branded Google Chrome 152-or-later action-icon source/load/destination/fill walkthrough is a separate manual gate and remains **BLOCKED** on this Chrome 151 host.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run --config extension/vitest.config.ts extension/tests/package.test.ts extension/tests/browser-harness-contract.test.ts
```

Expected: failure because production build scanning, deterministic packaging, and the version-independent loaded-package harness contract do not exist. The contract test statically and with mocks verifies profile/output/reset/config/version-gate behavior regardless of installed Chromium. If the resolved Playwright Chromium is already version 152 or later, also run the exact Playwright spec now and record its pre-implementation RED; a structured `<152` skip is never counted as RED evidence.

- [ ] **Step 3: Implement packaging and loaded-package harness**

The packaging script accepts only the validated `extension/dist/production-disabled/` directory for internal review; it must refuse Store/public terminology and must never package synthetic and real families together. It writes only `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.zip`, `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.sha256`, and the corresponding `.scan-report.json` path declared in Task 1. Follow no symlinks. Emit all archive metadata deterministically. Document the unavailable Chrome-152 manual gate as a release blocker rather than weakening `minimum_chrome_version`.

- [ ] **Step 4: Run the production-disabled candidate and repository gates**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:typecheck
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:test
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:build:synthetic
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:build:production-disabled
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:scan
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:package
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run extension:browser
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run lint
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run test
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin /Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run build
git diff --check
```

Inspect these exact candidate artifacts after the commands: `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.scan-report.json`, `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.zip`, and `extension/release/challansakshi-assisted-handoff-production-disabled-candidate.sha256`. Expected: all unit/build/package/scan/repository commands pass; the loaded-package lane either passes on Chromium >=152 or is explicitly skipped for its version, and the manual headed Chrome 152 action-icon gate remains **BLOCKED** on this Chrome 151 host. If browser binaries are not installed, install the resolver-selected, lock-pinned Playwright Chromium through the approved package-manager flow; do not substitute an unversioned browser or call a skipped/manual lane passed.

- [ ] **Step 5: Inspect candidate evidence, record BLOCKED release gate, and commit**

Inspect the generated manifests, exact ZIP file list, checksum, scan report, and permitted browser evidence. Remove transient browser/test artifacts while retaining only deliberately reviewed evidence. Update `extension/README.md` with implemented, disabled, synthetic, production-disabled-candidate, manual-gate, and external-release states. Record the final release state as **BLOCKED — manual branded Chrome 152 action-icon source/load/destination/fill gate pending; real adapters remain disabled; not Store/public eligible**. Commit as `feat: produce production-disabled handoff extension candidate`.
