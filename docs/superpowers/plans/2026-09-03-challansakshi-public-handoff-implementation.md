# ChallanSakshi Public Handoff Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one complete, installation-free real e-Challan review-to-official-handoff journey plus a truthful 90-second synthetic proof, while preserving local-only evidence handling and making the optional desktop helper an explicitly gated accelerator rather than a dependency.

**Architecture:** Add pure route, pack, receipt, and reduced-envelope modules below the React layer. Compose a focused `OfficialHandoffPanel` after the result hero and let `CitizenReviewApp` own only orchestration/invalidation. Keep the real and synthetic wrappers as incompatible closed unions. Expose a state-free `/extension` information page and synthetic fixture pages, but keep every public acquisition control and real extension adapter closed until its external release gates pass.

**Tech Stack:** React 19, Next.js 16, Vinext/Vite 8, TypeScript 5.9, CSS Modules, Vitest 4, browser-local Web APIs only.

**Spec:** `docs/superpowers/specs/2026-09-02-challansakshi-public-launch-top-10-vertical-design.md`

## Explicit execution gate

- The user explicitly approved this product direction, the parent specification, the optional-extension specification, and implementation on 3 September 2026. Record that approval and its source in the SDD ledger and implementation handoff/PR description before Task 1. This approval authorizes local implementation and verification only; it does not authorize publishing, deployment, real-adapter enablement, Store submission, or a public acquisition control.
- If the approved specification, retained official-route evidence, release state, or requested scope changes, stop before the affected task. Update this plan and its tests first, then obtain renewed explicit approval for the changed execution contract.

## Global Constraints

- The universal web path is complete without the extension. Private devices may expose explicit clipboard controls; shared devices expose visibly selectable manual-transcription text and never invoke the Clipboard API.
- Preserve the real-route local-only boundary: one citizen-selected notice/record copy and one supplied photograph, their object-URL previews, structured confirmed facts, a reviewed pack, and the exact permitted local return receipt may exist only in current-tab React memory. None enters `fetch`, XHR, beacon, WebSocket, EventSource, cookies, Web Storage, IndexedDB, Cache Storage, a website service worker, URL state, browser-history writes, server actions, analytics, or `/api/analyze`.
- Never collect, fill, solve, infer, or submit CAPTCHA, OTP, Aadhaar/VID, credentials, payment, declaration, official-portal attachment selection/upload, or official outcome data. The only permitted official-outcome record is the exact citizen-reported return state and, only after `acknowledgement-seen` on a private device, an optional four-character reference fragment; it is unverified and cannot contain a screenshot or full reference. A private-device challan-number copy aid is optional, React-memory-only, separate from the pack, and cleared at every specified lifecycle boundary.
- Every outbound destination comes from the compile-time official registry. Citizen input never contributes to a destination URL, query, fragment, selector, or redirect.
- Route selection uses the issuing jurisdiction printed on the challan or explicitly confirmed by the citizen, never only the vehicle-registration prefix. Stale, unsupported, or unconfirmed routing fails to `unresolved`.
- Only confirmed, same-revision, action-ready `Possible discrepancy` cases using an official source may create an `OfficialHandoffPack`; consistent, inconclusive, message-only, stale, `delhi-manual`, and `unresolved` cases cannot claim form compatibility.
- Real and synthetic builders share only pure projection/mapping/normalization logic and emit incompatible `OfficialHandoffPack` and `SyntheticHandoffSimulation` types. Runtime validation rejects cross-mode, cross-source, and cross-route inputs.
- The reviewed description is well-formed Unicode, NFC-normalized with LF line endings, non-empty, and at most 500 Unicode code points. It is never silently truncated.
- `Official service opened from this review` is the furthest directly observed state. Every later state is explicitly citizen- or affected-person-reported and unverified by ChallanSakshi.
- Helper mode requires the affected person to remain present, inspect and confirm the pack, confirm entitlement, and request preparation help. The helper never authenticates, declares, submits, or independently records an acknowledgement.
- Never display or export a raw selected filename. Preserve object-URL revocation on replacement, removal, reset, Quick Exit, inactivity expiry, and unmount.
- The optional-helper card appears only after the official anchor and only when private-device, supported-desktop, eligible-pack, Store, public-adapter, and environment gates are all open. The current real public release state remains closed.
- The website never detects, pings, messages, or deep-links into the extension. `/extension` and the eventual Store listing URL are fixed, state-free, parameter-free new-tab anchors with `rel="noreferrer"`; no sideload action is shown.
- Keep the existing white, navy, teal, and restrained amber design system. This is sequencing and component polish, not a visual redesign. Preserve at least 48px controls, visible focus, 16px essential mobile controls, 200% zoom, reduced motion, and no horizontal overflow at 320px.
- English, Hindi, and Simple Mode must retain every consent, result, handoff, return-state, limitation, and helper boundary.
- Use TDD. For every behavior, write a focused test, run it and observe the expected missing-behavior failure, implement the minimum production change, rerun to green, then refactor.
- Use the bundled Node runtime when bare `node` is unavailable: `env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin`.
- **Mandatory pre-commit suite:** immediately before every Task Step 5 commit, run the complete suite below against the final working tree for that task; a green run from an earlier task is not sufficient.

  ```bash
  env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run
  env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/tsc --noEmit
  env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next
  env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vinext build
  git diff --check
  ```

  If the separately scoped extension framework is present in the working tree, also run its documented typecheck/test/package scan. This web plan neither enables nor releases a real adapter.
- Do not stage, modify, or delete `qa/public-launch-audit-2026-09-02/`.

---

### Task 1: Build the fail-closed official destination registry and action-ready fact contract

**Files:**
- Create: `lib/official-destinations.ts`
- Modify: `lib/public-challan.ts`
- Create: `tests/official-destinations.test.ts`
- Modify: `tests/public-challan.test.ts`

**Interfaces:**
- Produces `OFFICIAL_ROUTE_REGISTRY_VERSION`, a closed `IssuingJurisdictionCode`, an explicit jurisdiction-confirmation union (`confirmed` with a code or `unconfirmed`), a closed registry for `legacy | nextgen | delhi-manual | unresolved`, separately typed lookup/services/court auxiliary routes, and `resolveOfficialDestination(input, now)`.
- Introduces a shared verified-route metadata base for handoff, auxiliary, and fallback records. Every record carries its service/domain/purpose, retained verifier/evidence/date/expiry, `releaseState`, and fallback relationship where applicable. An auxiliary or fallback route is structurally and runtime-ineligible as a grievance destination, action-ready route, or pack route.
- Extends `CitizenChallanAnswers` with explicit citizen/evidence vehicle classes, independent readable-record proof, provenance-bearing `wrongEvidenceBasis`, `vehicleNumberEntryMismatchBasis`, duplicate-plate basis, source/confidence/limitation/confirmation, and review revision data without adding browser or government access.
- Preserves existing assessment outputs while adding an explicit action-ready projection consumed by Task 2.

- [ ] **Step 1: Write failing route and evidence-gate tests**

Add literal expectations for the four exact destination URLs and all required auxiliary URLs: national record lookup, NextGen service landing, national services directory, and Virtual Courts. Exercise every literal NextGen code (`AN`, `AR`, `AS`, `BR`, `CH`, `CG`, `DD`, `GA`, `GJ`, `HP`, `HR`, `JH`, `JK`, `KA`, `LA`, `MH`, `ML`, `MN`, `MZ`, `NL`, `PB`, `PY`, `RJ`, `SK`, `TN`, `UK`, and `WB`) resolving only to `nextgen`; `DL` resolving only to `delhi-manual`; and unconfirmed, unsupported, stale, disabled, or malformed codes resolving only to `unresolved`. Define `CURRENT_LEGACY_JURISDICTION_CODES` as the literal empty tuple for this approved release because no exact legacy jurisdiction currently has retained code-specific route evidence; never infer legacy by taking the complement of the NextGen/Delhi sets. Test the pure legacy pack/mapping contract only with an explicit test-only verified destination fixture, while production routing remains unresolved until a separately reviewed evidence/spec update enumerates a code with verifier, evidence reference, timestamp, and expiry. No route test may use a free-form jurisdiction string. Assert each auxiliary purpose is structurally and runtime unable to satisfy the grievance-destination type. Cover jurisdiction scope/rationale, retained verifier/evidence, explicit fallback records, and stale/missing-evidence/disabled cases independently for handoff, auxiliary, and fallback records. Assert route URLs are unchanged when hostile citizen input contains a hostname, query, fragment, or path. Add assessment cases proving generic `categoryObservation: 'different'` is not enough for a class-specific mapping, both explicit classes are required, colour alone cannot qualify, and duplicate-plate eligibility requires a separate `citizen-confirmed` basis. Require same-revision, citizen-confirmed provenance-bearing `wrongEvidenceBasis` for `Wrong Evidence Captured` and equivalent `vehicleNumberEntryMismatchBasis` for `Wrong Vehicle Number Entered By Officer`; a generic vehicle difference, unconfirmed basis, or a basis derived only from the mismatch image must abstain.

The public registry should expose a closed result equivalent to:

```ts
export type OfficialDestinationKind = 'legacy' | 'nextgen' | 'delhi-manual' | 'unresolved';

export type VerifiedOfficialRoute = Readonly<{
  serviceName: string;
  domain: string;
  purpose: string;
  verifier: string;
  evidenceRef: string;
  lastVerifiedAt: string;
  expiresAt: string;
  releaseState: 'current' | 'stale' | 'disabled';
}>;

export type OfficialFallbackRoute = VerifiedOfficialRoute & Readonly<{
  routeType: 'fallback';
  key: 'national-services-directory';
  canonicalUrl: 'https://echallan.parivahan.gov.in/index/challan-services';
  purpose: 'official-services-directory';
}>;

export type OfficialAuxiliaryRoute = VerifiedOfficialRoute & Readonly<{
  routeType: 'auxiliary';
  key: 'national-record-lookup' | 'nextgen-service-landing' | 'national-services-directory' | 'virtual-courts';
  canonicalUrl: string;
  purpose: 'official-record-lookup' | 'official-service-landing' | 'official-services-directory' | 'official-court-service';
}>;

export type OfficialDestination = VerifiedOfficialRoute & Readonly<{
  routeType: 'handoff';
  key: OfficialDestinationKind;
  canonicalUrl: string;
  purpose: 'official-grievance-service' | 'official-service';
  jurisdictionScope: readonly IssuingJurisdictionCode[];
  routingRationale: string;
  fallback: OfficialFallbackRoute;
  capabilities: Readonly<{ category: boolean; description: boolean; attachmentGuidance: boolean }>;
}>;
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/official-destinations.test.ts tests/public-challan.test.ts
```

Expected: failures because the registry, explicit vehicle-class facts, and strict action-ready gate do not exist.

- [ ] **Step 3: Implement the pure registry and explicit facts**

Use only compile-time constants. Validate ISO dates, the exact `IssuingJurisdictionCode` confirmation union, 30-day route freshness, release state, and fallback deterministically from the injected `now`. Keep auxiliary lookup/status/court records structurally unable to satisfy the grievance-destination type. Preserve the current conservative result engine, but expose a separate same-revision `ActionReadyReviewFacts` result so a generic worksheet-eligible finding cannot accidentally become a form-compatible pack. Carry the exact confirmed `wrongEvidenceBasis` or `vehicleNumberEntryMismatchBasis` provenance into that projection; no generic observation may be promoted to either legacy mapping.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused tests pass with no warnings.

- [ ] **Step 5: Run the mandatory pre-commit suite and commit**

Run the Global Constraints mandatory pre-commit suite, then commit as `feat: add verified official handoff routing`.

---

### Task 2: Build reviewed real/synthetic handoff packs and local return receipts

**Files:**
- Create: `lib/official-handoff.ts`
- Create: `lib/official-handoff-receipt.ts`
- Create: `tests/official-handoff.test.ts`
- Create: `tests/official-handoff-receipt.test.ts`

**Interfaces:**
- Consumes the registry and action-ready facts from Task 1.
- Produces incompatible `OfficialHandoffPack` and `SyntheticHandoffSimulation` values through closed wrappers around shared neutral projection/mapping/normalization helpers.
- Produces pack-revision-bound local `OfficialHandoffReceipt` state with an explicit link-activated observation, citizen-reported return states, and a redacted private-device continuation-receipt serializer.

- [ ] **Step 1: Write failing pack, normalization, mapping, and receipt tests**

Cover all exact legacy mappings, NextGen description-only behavior, Delhi/manual and unresolved abstention, source/mode/route cross-rejection, same-revision confirmation, self/present-helper contracts, redaction, Devanagari/combining/emoji code-point boundaries, CRLF-to-LF and NFC normalization, and the no-silent-truncation error. Literal category expectations include:

```ts
expect(mapLegacyIssue(facts)).toEqual({
  issueCode: 'two-wheeler-on-four-wheeler',
  label: '2 Wheeler Challan On 4 Wheeler',
  value: '2 Wheeler Challan On 4 Wheeler',
});
```

Receipt tests must prove `link-activated` is not submission, require an explicit citizen return state, allow only a four-character reference fragment after `acknowledgement-seen` on private devices, require affected-person presence/confirmation for helper entry, and invalidate on any pack revision change. Test the continuation serializer literally: it contains only schema, pack revision/digest, local timestamp, result class, selected return state, and the permitted last-four fragment; it rejects shared mode and contains no lookup value, raw filename, full identifier/reference, evidence text, or official-status claim.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/official-handoff.test.ts tests/official-handoff-receipt.test.ts
```

Expected: failures because pack and receipt modules are absent.

- [ ] **Step 3: Implement the pure builders and state transitions**

Use a closed input union whose real branch is structurally incapable of accepting `bundled-synthetic-record`, and whose synthetic branch has no official URL or compatibility assertion. The real output includes route version/evidence, confirmed facts with provenance, neutral description, checklist, intentionally blank official fields, confirmation state, local timestamp, and no direct identifier. Implement receipt transitions as pure functions; never infer portal state.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: every mapping, boundary, redaction, and receipt test passes.

- [ ] **Step 5: Run the mandatory pre-commit suite and commit**

Run the Global Constraints mandatory pre-commit suite, then commit as `feat: build reviewed official handoff packs`.

---

### Task 3: Build the reduced extension envelope and closed public release gate

**Files:**
- Create: `lib/extension-handoff-contract.ts`
- Create: `lib/extension-release.ts`
- Create: `tests/extension-handoff-contract.test.ts`
- Create: `tests/extension-release.test.ts`

**Interfaces:**
- Consumes only a confirmed pack projection, never a complete pack, evidence, file, or optional lookup value.
- Produces the exact `challansakshi.extension-handoff/v1` closed union, canonical JSON/digest helpers, bounded matcher results, and fixed public acquisition state.
- Exposes the current release as closed: no Store URL or public helper controls while no public-enabled real adapter exists.

- [ ] **Step 1: Write failing envelope and release-gate tests**

Assert the exact own-property order:

```ts
const EXTENSION_ENVELOPE_KEYS = [
  'schema', 'mode', 'packId', 'resultRevisionId', 'packRevisionId',
  'routeRegistryVersion', 'adapterContractVersion', 'description',
  'descriptionDigest', 'language', 'simpleMode', 'confirmed', 'deviceMode',
  'issuedAt', 'expiresAt', 'routeKey', 'issueCode',
] as const;
```

Cover plain-record round trips, 32-hex IDs, canonical UTC timestamps, 60-second future tolerance, ten-minute age/lifetime, well-formed scalar Unicode, LF/NFC, 500 code points, 8,192 UTF-8 bytes, C0/C1 and bidi characters, digest mismatch, every exact bounded URL/email/UPI/digit/PAN/registration/mixed-ID predicate, valid Hindi and emoji negatives, and cross-profile rejection. In the separate release test, assert that the gate returns no Store/acquisition action for the checked-in `production-disabled` state and exposes only fixed parameter-free first-party/Store URLs when a complete test-only public state is supplied.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/extension-handoff-contract.test.ts tests/extension-release.test.ts
```

Expected: failures because the envelope and release modules are absent.

- [ ] **Step 3: Implement canonical validation and closed release state**

Validate strings for unpaired surrogates before normalization, encoding, hashing, or sizing. Reconstruct canonical records rather than trusting caller key order. Generate opaque IDs only from 16 bytes supplied by `crypto.getRandomValues`. Keep Store identity/config compile-time-only and make an invalid or incomplete gate fail closed.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all envelope adversaries and acquisition gates pass.

- [ ] **Step 5: Run the mandatory pre-commit suite and commit**

Run the Global Constraints mandatory pre-commit suite, then commit as `feat: add reduced extension handoff contract`.

---

### Task 4: Build the seamless handoff, copy/transcription, return, and optional-helper presentation

**Files:**
- Create: `components/public-beta/OfficialHandoffPanel.tsx`
- Create: `components/public-beta/OfficialHandoffPanel.module.css`
- Create: `components/public-beta/ExtensionAssistCard.tsx`
- Create: `components/public-beta/ExtensionAssistCard.module.css`
- Modify: `lib/citizen-review-presentation.ts`
- Modify: `lib/local-record-intake.ts`
- Modify: `lib/evidence-intelligence.ts`
- Modify: `components/public-beta/LocalRecordIntake.tsx`
- Modify: `components/public-beta/CitizenReviewApp.tsx`
- Modify: `tests/local-record-intake.test.ts`
- Modify: `tests/evidence-intelligence.test.ts`
- Modify: `tests/citizen-review-contracts.test.ts`
- Create: `tests/official-handoff-contracts.test.ts`

**Interfaces:**
- Receives already-built route/pack/receipt state and callbacks. It does not decide evidence truth, resolve URLs, touch extension APIs, or persist data.
- Emits explicit description edits, category/pack confirmations, official-link activation, return-state choices, private copy and continuation-receipt download actions, optional reference edits, and helper preparation actions.

- [ ] **Step 1: Write failing rendered-contract and filename-privacy tests**

Render private/shared, self/helper, English/Hindi, Simple/standard, eligible/ineligible, and release-closed states. Assert the visible order: result/limitation → Prepared for/domain/date → optional lookup aid → category → description/counter → checklist → role confirmation → leaving notice → official anchor → optional helper. Require field-specific copy names and a polite live region on private devices; on Clipboard API rejection, retain the exact selectable value, announce failure, keep the official anchor dormant, and retain the lookup value until a later successful copy or explicit lifecycle clear. Require selectable text plus manual-transcription guidance and zero copy buttons on shared devices. Require a private-only `Download redacted continuation receipt` action only after a valid citizen-reported return state; shared mode exposes no receipt download, copy, lookup bridge, or retained reference. Require a normal official anchor with `_blank`/`noreferrer`, and no state/query/fragment.

Assert that raw adversarial filenames have no metadata field, view-model field, rendered path, summary/export path, or fixture path across `lib/local-record-intake.ts`, `lib/evidence-intelligence.ts`, `LocalRecordIntake.tsx`, `CitizenReviewApp.tsx`, and their focused tests. Selection metadata must be limited to role, safe MIME type, size, and preview kind; the opaque local `File` is used only to create/revoke the local preview URL.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/official-handoff-contracts.test.ts tests/local-record-intake.test.ts tests/evidence-intelligence.test.ts tests/citizen-review-contracts.test.ts
```

Expected: failures because the components/copy do not exist and raw names are currently displayed.

- [ ] **Step 3: Implement components in the existing design system**

Use the established CSS variables and open-panel/list rhythm from `PublicBeta.module.css`; do not introduce a new card grid or decorative claims. Keep one primary action per state, 48px controls, visible focus, 16px narrow-screen form text, `user-select: text` for transcription values, and descriptive native disclosures for supporting detail. Render the inert capsule only after explicit preparation as one React-escaped text node under the two exact data attributes. Replace filenames with `Selected notice` / `Selected photograph` plus safe type/size feedback. Remove `name` from `LocalRecordFileMeta`, evidence-intelligence inputs/views, `CitizenReviewApp` selection state, and all focused fixtures; validate only MIME type and size, and derive summaries/receipts from generic role labels rather than a file property. Implement private clipboard failure as a non-destructive state transition: keep the field visible/selectable, announce the failure, do not activate a destination, and clear the lookup bridge only after successful copy.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all role/device/language/order/privacy contracts pass.

- [ ] **Step 5: Run the mandatory pre-commit suite and commit**

Run the Global Constraints mandatory pre-commit suite, then commit as `feat: add citizen controlled official handoff`.

---

### Task 5: Integrate the handoff into the real `/review` journey and add the state-free extension page

**Files:**
- Modify: `components/public-beta/CitizenReviewApp.tsx`
- Modify: `components/public-beta/PublicBeta.module.css`
- Modify: `tests/citizen-review-contracts.test.ts`
- Modify: `tests/public-mode-privacy.test.ts`
- Create: `app/extension/page.tsx`
- Create: `tests/extension-landing-contract.test.ts`
- Modify: `app/review/page.tsx`
- Modify: `components/public-beta/PublicInfoPage.tsx`

**Interfaces:**
- `CitizenReviewApp` adapts confirmed UI state into Task 1/2 pure inputs, composes `OfficialHandoffPanel` immediately after the result hero, and centralizes invalidation/reset/expiry cleanup.
- `/extension` consumes only `lib/extension-release.ts`; it receives no search params, case state, envelope, capsule, or extension ID as a runtime messaging address.

- [ ] **Step 1: Write failing integration/privacy tests**

Add contracts for exact route-registry use, action-ready gating, distinct pack confirmation, helper affected-person confirmation/permission, description revision invalidation, official-link activation boundary, all return states, private continuation-receipt download, shared-device exclusion, lookup bridge clearing, source-capsule unmounting, and helper-card ordering/gating. Add a dedicated registry-integration contract that replaces the old translated-label/local-URL conditional with the exact `IssuingJurisdictionCode` confirmed/unconfirmed union and an `I am not sure` control; exercises every literal NextGen outcome, Delhi, and unresolved while asserting that the approved production legacy-code tuple is empty; derives both lookup and handoff only from typed registry records; and makes `portal-unavailable` offer only the registry fallback without auto-rerouting or claiming a government outage. Test legacy mapping separately against the explicit test-only verified destination fixture, never through a fabricated production jurisdiction. Change the transitive privacy test from a blanket `<textarea` rejection to an exact allowlist for `OfficialHandoffPanel.tsx`, explicitly ban `contenteditable`/`contentEditable` throughout the real import graph, preserve every network/storage/form/unsafe-HTML ban, and reject textarea everywhere else. Also reject raw selected-filename metadata/property access and a raw filename in every real-mode evidence view, summary, pack, receipt, generated artifact, or focused fixture.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/citizen-review-contracts.test.ts tests/public-mode-privacy.test.ts tests/extension-landing-contract.test.ts
```

Expected: failures because `/review` still uses translated display labels and local URL constants, has no issuing-jurisdiction registry integration, pack/receipt/download lifecycle, or extension landing.

- [ ] **Step 3: Implement orchestration and exact invalidation**

Replace the source chooser's translated-label routing with the exact `IssuingJurisdictionCode` confirmed/unconfirmed union plus `I am not sure`. Resolve the official lookup, grievance destination, domain, capabilities, date, release state, and portal-unavailable fallback only through the typed registry; never switch destinations because the portal failed. Fold every material fact, role, permission, language-generated copy, Simple Mode, route/version, and description revision into the pack signature. On any edit, reset, Quick Exit, inactivity expiry, device change, role change, affected-person departure/withdrawal, language/Simple change, or unmount, synchronously clear copy state, lookup value, pack confirmation, receipt, optional last-four fragment, extension preparation, and source capsule. A successful private lookup copy and official-anchor activation also clear the full lookup value; a failed copy never clears it or opens a destination. Wire private continuation receipt serialization/download through the same signature/token guard used for current artifacts, exclude it entirely on shared devices, and never call `window.open`; record only the anchor activation callback.

Render `/extension` with pre-install independence/data-use/retention/fallback disclosure and no install or sideload action while the checked-in release gate is closed.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all integration and complete-import-graph privacy checks pass.

- [ ] **Step 5: Run the mandatory pre-commit suite and commit**

Run the Global Constraints mandatory pre-commit suite, then commit as `feat: complete real official handoff journey`.

---

### Task 6: Add the vertical-first synthetic judge proof and exact extension fixture pages

**Files:**
- Modify: `lib/synthetic-evidence-corpus.ts`
- Modify: `lib/synthetic-evidence-pipeline.ts`
- Modify: `lib/synthetic-lab-state.ts`
- Modify: `components/test-lab/SyntheticTestLabApp.tsx`
- Modify: `components/test-lab/SyntheticTestLabApp.module.css`
- Modify: `components/ChallanSakshiApp.tsx`
- Create: `app/demo/extension-fixture/source/page.tsx`
- Create: `app/demo/extension-fixture/destination/page.tsx`
- Modify: `tests/synthetic-evidence-pipeline.test.ts`
- Modify: `tests/synthetic-lab-state.test.ts`
- Modify: `tests/test-lab-contracts.test.ts`

**Interfaces:**
- Reuses `case-04-category-conflict`, corrected to explicit two-wheeler/four-wheeler facts, without increasing the ten-case corpus.
- Adds one deterministic proof-entry action, a `SyntheticHandoffSimulation`, simulated official-link/return state, and a single correction action that invalidates confirmation/pack/return before recomputing to consistent.
- Fixture source emits a fixed synthetic capsule; fixture destination exposes only fictional allowed targets plus visibly protected controls and effect counters.

- [ ] **Step 1: Write failing corpus, state-machine, and rendered-proof tests**

Assert case 04 record facts are a blue Honda Activa 6G/two-wheeler and enforcement facts are a white Maruti Swift/four-wheeler, with complete source/confidence/limitation metadata. Assert `START_90_SECOND_PROOF` selects case 04, clears stale state, and targets the proof heading for focus; `CORRECT_IMAGE_OBSERVATIONS` atomically restores class, colour, and make/model; any edit clears confirmation, simulation, and receipt. Require `Web handoff · works everywhere`, the six timed beats, separate `Show guardrails`, visible AI-extracts/rules-compare/citizen-controls boundary, accurate analysis provenance, permanent synthetic labels, zero government request, and the skippable extension simulation only after the timed proof.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/synthetic-evidence-pipeline.test.ts tests/synthetic-lab-state.test.ts tests/test-lab-contracts.test.ts
```

Expected: failures because case 04 is generic and the proof/handoff transitions do not exist.

- [ ] **Step 3: Implement the synthetic parity lane and fixture routes**

Keep every fixture permanently fictional and pass it only through the synthetic wrapper. The simulated open action performs no government request. The destination fixture must include allowed `select`/`textarea`, protected identifier/CAPTCHA/OTP/Aadhaar/payment/file/declaration/Submit controls, and local fixed counters that make forbidden events observable without resembling an official form.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all corpus, transition, and visible-boundary tests pass.

- [ ] **Step 5: Run the mandatory pre-commit suite and commit**

Run the Global Constraints mandatory pre-commit suite, then commit as `feat: add vertical handoff proof lane`.

---

### Task 7: Align documentation and run complete web/browser fidelity verification

**Files:**
- Modify: `README.md`
- Modify: `tests/public-info-page.test.ts`
- Modify only verified integration defects elsewhere.
- Create and retain: `docs/superpowers/verification/official-route-reverification-2026-09-03.md`
- Create and retain: `docs/superpowers/verification/official-route-reverification-2026-09-03/`
- Create during QA, then remove before handoff: other project-local temporary browser screenshots and fidelity notes.

**Interfaces:**
- Produces truthful operator/developer documentation and final evidence for the installation-free web vertical.
- Does not publish, deploy, enable a real adapter, or claim public operational approval.

- [ ] **Step 1: Write and run failing documentation/route-verification contract assertions (RED)**

Extend existing documentation/source contracts to require the real/synthetic separation, field-pack limitation, citizen-reported return state, optional reduced-envelope boundary, production-disabled adapter state, public-release prerequisites, and prohibited public-launch claims. Add contracts requiring the retained dated official-route report to state that verification was non-submitting, carried no citizen/case data, used only allowlisted URLs, and recorded each route's literal URL, observed purpose/domain, verifier, verification time, registry version/evidence reference, release state, and fallback. Run only the focused documentation/source-contract tests now and observe their expected RED failure; do not edit `README.md` or route-verification evidence before the failure is observed.

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/public-info-page.test.ts
```

- [ ] **Step 2: Implement truthful documentation and retained route-verification evidence, then rerun focused assertions (GREEN)**

Write the README and the sanitized dated report to match the implemented closed gates and verified behavior. Reverify each official route in a browser without entering any identifier, CAPTCHA, OTP, credential, payment, declaration, attachment, or citizen data and without submitting anything. Retain only sanitized screenshots showing route/domain/purpose and no portal form values, cookies, tokenized URLs, browser history, network data, or citizen material. Record stale/unavailable/redirect observations as a safe stop, never as permission to switch routes. Rerun the focused documentation/source-contract tests and require GREEN. Any browser-discovered defect first receives a focused regression test.

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run tests/public-info-page.test.ts
```

- [ ] **Step 3: Run the complete automated gate**

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/tsc --noEmit
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vinext build
git diff --check
```

Expected: every command exits zero with no warnings attributable to changed code.

- [ ] **Step 4: Run Browser/IAB functional and accessibility QA**

Exercise `/review` at desktop, 390×844, and 320px for private/self, private/present-helper, shared/self, Hindi, Simple Mode, keyboard-only, and 200% zoom. Cover successful eligible pack, inconclusive, consistent, message-only, unresolved, portal-unavailable fallback, lookup-copy failure, official-link activation, every return state, continuation-receipt download/redaction, acknowledgement invalidation, Quick Exit, and shared-device inactivity behavior. Exercise `/extension` and both synthetic fixture routes. Verify no overlay, console error, horizontal overflow, stale confirmation, broken anchor, missing focus, printed transient/sensitive controls, or English fallback in critical Hindi copy.

Run the `/demo/test-lab` proof as a timed judge lane at desktop and 390×844. Record that the AI/rules/citizen boundary is visible within the first 15 seconds, the six-beat core completes within 90 seconds, and the discrepancy → correction → consistent plus inconclusive guardrail continuation completes in under two minutes. Verify the proof-entry action is visible in each first viewport, focus/reset behavior is correct, provenance and the permanent synthetic boundary never disappear, no government request occurs, and capture the discrepancy, post-correction consistent, and inconclusive states.

- [ ] **Step 5: Perform the accepted-design fidelity pass**

Compare current browser screenshots against:

- `docs/superpowers/specs/assets/challansakshi-citizen-home-desktop.png`
- `docs/superpowers/specs/assets/challansakshi-mobile-home-and-intake.png`
- `docs/superpowers/specs/assets/challansakshi-official-record-intake-desktop.png`

Use `view_image` on both references and final captures. Record at least five comparisons: palette/background, typography hierarchy, open-panel/container model, primary-action prominence, spacing/touch targets, mobile wrapping, focus/contrast, and next-state visibility. Fix any material mismatch test-first and repeat the complete gate.

- [ ] **Step 6: Rerun the mandatory pre-commit suite and commit verified polish**

If QA uncovered a defect, add its focused regression test, fix it, repeat the focused and complete gates, then update the retained report/README so they describe the final tree. Remove temporary QA artifacts not explicitly retained. Run the Global Constraints mandatory pre-commit suite after those final documentation changes, then commit as `feat: finish public handoff vertical`.
