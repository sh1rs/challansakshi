# ChallanSakshi — implementation plan to be the default citizen resolution layer

**Written:** 2026-09-04 (Asia/Kolkata)
**Repository:** `/Users/shars/Desktop/challansakshi`
**Branch:** `codex/challansakshi-resolution-layer`
**Baseline at time of writing:** 41 test files / 736 tests green, typecheck green, lint green, production build green, UX refinement **uncommitted** in the working tree.
**Review status:** 26 unique findings from a five-lens adversarial review were each verified by three independent skeptics. Nine confirmed, seventeen refuted. Phase 1 below carries only the survivors.

This is a build specification for a fresh session. It assumes no memory of the session that produced it.

---

## 0. Standing rules that override convenience

These come from the repository takeover brief and the owner's working model. Breaking one of them is worse than shipping nothing.

1. **Never** inspect, list, search, stage, move, or delete `qa/public-launch-audit-2026-09-02/`. Use `git status --short --untracked-files=no`. Never `git add .`, `git add -A`, `git clean`, or any repository-wide command that enumerates untracked files.
2. **Stage only explicitly named files.** One commit per task, imperative lowercase subject (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), and the `Co-Authored-By` trailer your session specifies.
3. `wrangler.jsonc` stays deliberately modified at `compatibility_date 2026-05-22` for local dev. `scripts/codex-deploy.sh` flips it to the committed `2026-08-28` during deploy and restores it. Do not commit the local value.
4. **Node is not on `PATH`.** Every command in this plan assumes:
   ```bash
   export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
   ```
   There is no `pnpm`. Use `./node_modules/.bin/vitest`, `./node_modules/.bin/tsc`, `./node_modules/.bin/eslint`, and `node node_modules/vinext/dist/cli.js build`.
5. **Safety contracts that no task may weaken.** Every one of these is enforced by a test today; keep it that way.
   - No `fetch`/XHR/`sendBeacon`/WebSocket, no `localStorage`/`sessionStorage`/cookies/IndexedDB, no `<form>`, no `dangerouslySetInnerHTML`, no raw filenames, no case data in URL/history, inside the real-mode import graph walked by `tests/public-mode-privacy.test.ts`. The theme preference is the single disclosed storage exception and lives in the layout boot script, not in components.
   - No input may be named or labelled with `otp|password|cvv|upi|aadhaar|account`. Identifiers are last-four only.
   - Official destinations come only from the compile-time registry in `lib/official-destinations.ts`, always `<a target="_blank" rel="noreferrer">`, never `window.open`, and expire 30 days after `lastVerifiedAt`.
   - A message-only source safe-stops before any evidence comparison.
   - Fact confirmation stays signature-bound: any edit after confirmation invalidates the confirmation, the pack, and the artifact.
   - Shared-device mode disables copy/download/formatted print and clears after ~10 minutes of inactivity through the single `window.location.replace('/')` path.
   - Release language stays `Independent non-public prototype`. Never `public beta`, never `early access`, never a claim of verification, authentication, filing, payment, submission, legal advice, or a guaranteed outcome.
   - Hindi has no Latin fallback in citizen-facing copy. `/fastag` is deliberately English-only until its Hindi safety review passes.

---

## 1. What already exists (do not rebuild)

**Two end-to-end services.** `/review` (e-Challan wrong-photo / wrong-vehicle) and `/fastag` (FASTag transaction reconciliation). Both are browser-local, deterministic, bilingual (FASTag English-only), and end in a registry-verified official handoff.

**A refinement pass, uncommitted.** Delivered on 2026-09-04 against the owner's direction to *refine, not redesign*:
- One product-wide disclaimer, in the footer, on every real page. The navy top bar is gone from real surfaces and kept for `/demo`.
- `/review` is three steps instead of four. Reviewer and device default to "my own case, private device" with two opt-in checkboxes. Both acknowledgement checkboxes, the manual-entry toggle, the photo-inspected question, and the custody select are gone. Issuing state is optional. Photo inspection is derived from the citizen's own entries.
- The official-handoff panel takes one confirmation checkbox (self) or two (present helper), fanning out to the same unchanged controller keys. The challan-number copy aid is gone.
- Step changes land instantly on the compact guide header. `html { scroll-behavior: smooth }` is removed.
- Type and spacing reduced roughly 20–30% on desktop.
- FASTag lost its hero, its boundary aside, and its two consent checkboxes; device is now one opt-in checkbox.

**A demo layer with real logic that is not yet a real service.** `/demo` holds working, tested deterministic modules that the catalogue below promotes: the scam-notice preflight (`lib/notice-safety.ts`), payment reconciliation and the post-rejection clock (`lib/resolution.ts`), the order-versus-evidence mapping (`components/OrderEvidenceReview.tsx`), the vehicle-relationship/custody scenarios, and the case ledger.

**An official route registry** with 9 records over 7 unique URLs, each carrying `verifier`, `evidenceRef`, `lastVerifiedAt: 2026-09-02`, and `expiresAt: 2026-10-02`.

---

## 2. The strategy in one paragraph

The product wins on **breadth × depth × trust**, and today it has depth and trust but almost no breadth. Breadth cannot come from adding pages, because each service in this product must carry its own deterministic rules, its own verified official route, its own bilingual copy, and its own tests. So the plan is: repair the regressions the refinement introduced (Phase 1), **extract the guided-service engine** so a new service costs ~300 lines instead of ~1800 (Phase 2), then ship seven more end-to-end services on that engine (Phase 3), then make the whole thing fast, installable, findable, and provably accessible (Phase 4), and finally prove it (Phase 5). Phase 2 is the unlock; skipping it makes Phase 3 unaffordable.

---

## Phase 1 — DONE, committed as `bc1612c`

The refinement is committed, and all nine findings that survived adversarial verification are fixed in the same commit. Touch targets are back at 48px everywhere with base-rule test guards, the guide disclosure has a border and a +/− affordance, the official-service link leads the step as a real 48px target, the Hindi footer boundary is tested, the FASTag shared-device checkbox states its consequence, the UPI-PIN refund warning sits beside the toll route links, photo inspection moved to a pure `deriveImageInspected` helper with a table-driven test, the FASTag step lands on the guide section like /review, and the README bullet is repaired.

Gate at that commit: 41 test files, 749 tests, typecheck, lint, and production build all green.

The seventeen refuted findings are tabled below. Do not re-litigate them without reading the reason.

### Refuted — do not re-litigate

All seventeen were checked and the code descriptions were largely accurate; the verifiers rejected them because nothing is actually lost, a contract is intact, or the behaviour is the refinement's deliberate and test-locked structure.

| ID | Claim | Why it was rejected |
|---|---|---|
| F1 | FASTag lost the UPI-PIN warning | Still on `/safety`, linked from the flow. See above. |
| F3 | Copy still cites the deleted copy aid | "Copy aid" reasonably names the surviving `Copy reviewed description` control. |
| F7 | Footer credential warning too small | 11px applies on desktop only; the `≤700px` block sets 15px where reading matters. |
| F9 | FASTag shared-device effect untested | The behaviour is covered elsewhere; the change was opt-in, not a loosening. |
| F10 | Fabricated `safetyConsent: true` | Dead prop, never read, never exported. Tidiness, not a defect. |
| F11 | Helper return untick leaves presence | Recording stays blocked by the other flags; no unsafe state reachable. |
| F12 | Unresolved route lacks the leaving notice | Deliberate, test-locked structure; the closed reason already explains. |
| F13 | Return boundary appears only after recording | The recorded announcement carries it; no claim is made before. |
| F14 | Deadline prompt inside a disclosure | Deadline is optional and drives only a display; no gate is missed. |
| F15 | Dead `summaryHelp` key | Unused copy, zero user impact. |
| F17 | Pack checkbox refuses silently | The description error already renders as `role="alert"` under the textarea. |
| F18 | Lookup wiring survives | Dead but harmless; the controller function is separately tested. |
| F20 | Handoff meta text below the floor | Reading copy, not a control; 13px is within the refinement's 15px intent. |
| F21 | Second helper checkbox disabled with no cue | Standard progressive disclosure; the first statement is adjacent. |
| F23 | Derived-inspection test too thin | T1.7 replaces it with a real unit test anyway. |
| F25 | Return helper test cements a mismatch | Follows from F11 being refuted. |
| F26 | FASTag credential assertions deleted | T1.5 adds the footer coverage that replaces them. |

**Phase 1 gate:** `vitest` green, `tsc` clean, `eslint` clean, production build green, and a manual pass at 360px on `/`, `/review` for all three steps, `/fastag`, and `/privacy` in both languages.
**Commit:** `fix: restore touch targets and guide affordance`

---

## Phase 2 — extract the guided-service engine

This is the unlock. `CitizenReviewApp.tsx` is ~1840 lines that mix a generic guided flow with e-Challan specifics. Every new service copied from it would inherit that weight and its own copy of the safety plumbing. Extract once, then services become cheap and uniformly safe.

### T2.1 Define the service module contract

Create `lib/services/contract.ts`:

```ts
export type ServiceId = 'challan-evidence' | 'fastag-transaction' | 'message-check' | ...;

export type ServiceDefinition<Answers, Assessment> = Readonly<{
  id: ServiceId;
  route: `/${string}`;                       // one route per service
  catalogue: { group: ServiceGroup; order: number; goals: readonly CitizenGoal[] };
  steps: readonly ServiceStepId[];           // 2 or 3, never more
  defaults: Answers;
  assess: (answers: Answers) => Assessment;  // pure, deterministic, no browser APIs
  destination: (answers: Answers, now: string) => OfficialRouteBinding; // registry only
  worksheet: (input: WorksheetInput<Answers, Assessment>) => string;    // local text artifact
  copy: Record<Language, ServiceCopy>;       // every visible string, EN + HI
}>;
```

Rules the contract enforces by construction:
- `assess` imports nothing from `components/` and touches no browser global.
- `destination` returns a registry record, never a URL literal.
- `copy` is a total record: TypeScript fails the build if a Hindi key is missing.

### T2.2 Extract the reusable flow shell

New `components/services/GuidedServiceFlow.tsx`, lifted from `CitizenReviewApp.tsx` without behaviour change:
- step state, instant step-change focus and scroll,
- the signature-bound confirmation (`confirmedSignature === signature`) and `invalidate()` fan-out,
- role and device opt-in switches plus the shared-device inactivity guard and single `clearAndExit`,
- the local worksheet section (preview, copy, print, download) with shared-device gating,
- `OfficialHandoffPanel` mounting.

`CitizenReviewApp` becomes a thin binding of `challanEvidenceService` to this shell. **Zero test changes expected** — if `tests/citizen-review-contracts.test.ts` and `tests/official-handoff-contracts.test.ts` need edits beyond import paths, the extraction changed behaviour and is wrong.

Note the source-regex tests (`citizen-review-contracts`, `toll-route-links`) read component source text, so they will need their regexes repointed at the new file. Prefer converting those assertions to render-based `indexOf` on `renderToStaticMarkup` output while you are in there; it makes future refactors cheap and tests less brittle.

### T2.3 Generalise the handoff panel

`OfficialHandoffPanel` currently assumes the challan pack shape. Parameterise it over `OfficialRouteBinding` and a service-supplied description default, keeping the controller, pack builder, receipt, and extension envelope byte-identical. The single/dual confirmation model from the refinement stays.

**Phase 2 gate:** full suite green with no assertion weakened; the diff shows `CitizenReviewApp.tsx` shrinking by >1000 lines with no copy change.
**Commits:** `refactor: extract guided service flow shell`, `refactor: parameterise official handoff over the route registry`

---

## Phase 3 — the catalogue: broad across situations, deep in each

Nine services, each end-to-end. Seven are new; five of those promote logic that already exists and is already tested in the demo layer, which is why this is affordable.

### The router that makes breadth feel simple

Before adding services, add the front door, or breadth becomes a menu problem.

**T3.0 — one input, right service.** `lib/resolution.ts` already contains `classifyResolutionIssue`, a tested regex classifier over seven situations, used only by the demo desk. Promote it:
- Home gets one field: *"What happened? Describe it in a few words."* plus the situation chips already there.
- Classification runs on input, shows the single best match as a card, and — per the existing safety rule — **suggests**, never concludes. Ties and no-match say so plainly and fall back to the service list.
- No case data in the URL: route with `/review?goal=…`-style non-sensitive keys only. `tests/public-mode-privacy.test.ts` asserts the query-key allowlist; extend it deliberately, do not bypass it.
- Add a `/services` index page listing all nine with one line each, for people who prefer browsing.

**Accept:** from landing, a citizen reaches the right service in one action.

### The nine services

| # | Service | Route | Status | Existing logic to promote |
|---|---|---|---|---|
| S1 | e-Challan evidence review | `/review` | **Done** | — |
| S2 | FASTag transaction check | `/fastag` | **Done** | — |
| S3 | Is this challan message real? | `/check-message` | New | `lib/notice-safety.ts`, `EvidencePassport` preflight |
| S4 | I paid but it still shows pending | `/paid` | New | `lib/resolution.ts` payment reconciler (3 states) |
| S5 | My grievance was rejected | `/rejected` | New | `OrderEvidenceReview`, post-rejection D+30 clock |
| S6 | No decision has been recorded | `/no-decision` | New | authority-response clock in `lib/resolution.ts` |
| S7 | My case moved to Virtual Court | `/court` | New | `virtual-courts` registry record + checklist |
| S8 | The vehicle was sold before this date | `/sold` | New | custody/relationship-timeline scenarios |
| S9 | I cannot find the challan or receipt | `/receipt` | New | access/receipt route in `lib/resolution.ts` |

**Build S3 first.** Fake-challan SMS is one of the highest-volume citizen harms in India, the logic is local-only and already tested, it contacts nothing, and its answer — *do not tap that link* — is the single most protective thing this product can say. It is also the best possible advertisement for the trust story.

### The definition of "end to end and deeply vertical"

A service is not done until all nine hold:

1. **Deterministic rules** in `lib/services/<id>/domain.ts`, pure, with a table-driven test covering every finding and every refusal.
2. **A conservative refusal path** — every service must be able to say "your entries do not support this" and must never manufacture a dispute.
3. **A verified official destination** in the registry, with `verifier`, `evidenceRef`, `lastVerifiedAt`, and a 30-day expiry, failing closed to the national services directory.
4. **Two or three steps, never more**, on the shared engine.
5. **Citizen-confirmed facts**, signature-bound.
6. **A local worksheet** the citizen can copy, print, or download, carrying `CITIZEN_DISCLAIMER_EN/HI`.
7. **A result that states its own limits** beside the result.
8. **Full Hindi parity** with no Latin fallback.
9. **Tests**: rules table, privacy graph, Hindi parity, 48px/15px floors, route links.

### Registry expansion is gated on human verification

Every new destination URL needs its own record with real evidence. `docs/superpowers/verification/official-route-reverification-2026-09-03/` shows the format: dated screenshots plus a table row. **An agent cannot verify a government URL.** Ship each service with the national directory fallback if its specific route is not yet verified, and mark the record `releaseState: 'stale'` rather than inventing evidence. Routes expire on **2026-10-02** — re-verification is due before any public deploy.

**Commits:** one per service, `feat: add <service> resolution service`

---

## Phase 4 — reach: fast, installable, findable, readable

These are the numbers that decide whether a citizen on a 4G phone in a queue actually uses this.

### T4.1 Images — the single biggest performance win

`public/og.png` is **1.17 MB** and `public/evidence-contact-sheet.png` is **1.5 MB**. `sharp` is already a dev dependency.

- Regenerate `og.png` at 1200×675 as optimised PNG or WebP, target <150 KB.
- Convert the contact sheet to WebP/AVIF with a PNG fallback, target <300 KB, and keep it behind the existing text-first reveal.
- Add `width`/`height` on every `<img>` to hold layout (CLS).

**Accept:** total image bytes on first load of `/` and `/review` under 200 KB.

### T4.2 Drop the font that never loads

`app/globals.css:94` sets `font-family: Inter` but nothing loads Inter — no `next/font`, no `@font-face`, no stylesheet link. Every citizen already sees the fallback. Either self-host it with `next/font/local` (no external request, CSP-safe) or set the `ui-sans-serif` system stack once in `body` and delete the per-module font declarations. **Prefer the system stack** — zero bytes, instant first paint, and it already matches what ships.

### T4.3 Make it installable and offline-tolerant

- Add `public/manifest.webmanifest` (name, short name, theme colour `#102c47`, background, display `standalone`, start URL `/`, maskable 192/512 icons) and link it from `app/layout.tsx`. CSP already allows `manifest-src 'self'`.
- Add maskable PNG icons and an `apple-touch-icon`.
- Add a service worker that caches **the app shell and static assets only** — never a route with citizen state, never a POST, never anything from an official domain. Register it from the layout so it stays outside the real-mode import graph that `tests/public-mode-privacy.test.ts` forbids storage in. CSP already allows `worker-src 'self' blob:`.
- **Guardrails, non-negotiable:** add a test asserting the SW's cache allowlist contains only static asset paths; document the cache on `/privacy` in both languages ("the app's own files are cached so it opens without a connection; your answers are never cached"); ensure Quick exit still clears everything it can.

**Accept:** the app opens and renders the home page and the service list with the network off; no citizen answer survives a reload.

### T4.4 Fix the language attribute and per-page metadata

- `app/layout.tsx:27` hard-codes `<html lang="en">` even when the citizen chooses Hindi. Only an inner `<div>` gets `lang="hi"`. Screen readers pick the wrong voice and search engines the wrong language. Move the language choice up, or set `lang` on the inner wrapper for *all* content including chrome (it currently is on the shell — verify the footer and header are inside it).
- Give every route its own `title`, `description`, and canonical URL. Add `alternates.languages` for `en`/`hi`. Open Graph URLs are already absolute in production: `wrangler.jsonc` binds `NEXT_PUBLIC_SITE_URL` to `https://challansakshi.sh1rs.com`. The `http://localhost:3000` default in `.env.example` applies to local dev only.
- Add `public/robots.txt` and a generated `sitemap.xml` covering `/`, `/services`, the nine service routes, `/privacy`, `/safety`, `/extension`.
- Add JSON-LD `WebApplication` + `FAQPage` on `/services` — safe, no personal data, and it is how a citizen searching "challan photo wrong vehicle" finds this.

### T4.5 Split the demo away from the citizen routes

`/demo` and `/demo/test-lab` carry the heaviest components. Verify with the build output that `/review` does not pull demo code; if it does, split it. The citizen path should never pay for the hackathon narrative.

### T4.6 Language coverage beyond Hindi — infrastructure now, languages on review

Do not machine-translate safety copy. Instead:
- Move copy tables to `lib/i18n/<locale>.ts` with a total `Record<Locale, ServiceCopy>` so a missing string is a build error.
- Add a parity test that walks every copy table and asserts each locale's value is non-empty and contains no Latin word of four or more letters except an allowlist (`ChallanSakshi`, `FASTag`, `OTP`, `CAPTCHA`, `Aadhaar`, `PDF`, `UPI`, `RC`, `NHAI`).
- Ship new languages one at a time, each gated on a native-speaker safety review, exactly as `/fastag` is gated for Hindi today. Suggested order by traffic: Marathi, Tamil, Telugu, Bengali, Kannada, Gujarati.

**Commits:** `perf: shrink shipped image and font payload`, `feat: add installable offline app shell`, `feat: add per-route metadata and service discovery`

---

## Phase 5 — prove it

Automated proof is what lets you move fast later without breaking the trust story.

### T5.1 Automated accessibility gate

Add `axe-core` as a dev dependency and a vitest suite that renders each real surface into jsdom and asserts zero violations at WCAG 2.1 AA. Start with `/`, `/services`, each service's first step, and `/privacy`. Wire it into the default `test` script so it cannot be skipped.

**Note:** `axe-core` is **not installed** — this needs one network install (`pnpm add -D axe-core`, or the equivalent through the bundled runtime). If the environment is offline, fall back to a dependency-free structural suite that asserts, over `renderToStaticMarkup` output for each surface: every `input`/`select`/`textarea` has a label or `aria-label`, every `img` has `alt`, every `button` has an accessible name, heading levels never skip, every `details` has a `summary`, and no `tabindex` above 0. That covers most of what axe would catch here and costs nothing.

### T5.2 One-disclaimer regression test

The owner's core instruction deserves an enforcement test. Render each real surface and assert that boundary sentences (`not uploaded`, `Not a government`, `legal advice`, `prototype`, the credential warning) appear **exactly once** each, and that each appears inside `<footer>`. This is what stops disclaimer creep from returning.

### T5.3 Performance budget

Add a budget check to the build: fail if any client bundle exceeds an agreed KB ceiling or if `public/` grows past a byte budget. Record Lighthouse mobile numbers (Performance, Accessibility, Best Practices, SEO) in `docs/superpowers/verification/` before and after Phase 4.

### T5.4 Route freshness gate

A test that fails when `Date.now()` is past any registry record's `expiresAt` will break the build on 2026-10-02. That is the correct behaviour: it forces re-verification. Make it a clear failure message naming the record and pointing at the verification folder.

### T5.5 Browser verification lane

Extend the Playwright config (pinned prerelease `@playwright/test@1.63.0-alpha-2026-09-02` is the only authorised version) with a citizen lane: each service's happy path plus the refusal path, at 360px and desktop, in both languages, asserting no horizontal scroll and no console error.

**Commits:** `test: add accessibility and disclaimer regression gates`, `test: add citizen browser lane`

---

## 6. Human-only items — no agent can close these

1. **Re-verify all 9 official routes** before any public claim; they expire 2026-10-02. Capture dated screenshots into `docs/superpowers/verification/`.
2. **Verify every new destination URL** for services S3–S9 personally, or ship them pointing at the national directory fallback.
3. **Native-speaker safety review** for each new language and for the FASTag Hindi copy.
4. **Branded Chrome 152 action-icon walkthrough** for the extension (this host runs Chrome 151).
5. **Release decisions**: whether the product stays an "independent non-public prototype", and the operating, privacy, security, and external-review checks the README already lists as gates.
6. **Deploy** through `sh scripts/codex-deploy.sh` in the Codex environment when satisfied — the local Cloudflare account is not connected here.

---

## 7. Definition of done

| Dimension | Today | Target |
|---|---|---|
| End-to-end services | 2 | 9 |
| Steps to a result | 3 | 2–3, every service |
| Required inputs before a result | 4 | 2 |
| Disclaimer surfaces per page | 1 | 1, test-enforced |
| Touch targets below 48px | 11 | 0 |
| Images on first load | ~2.7 MB available | <200 KB |
| Installable / offline | no | yes, shell only |
| Languages | 2 | 2, with infrastructure for more |
| Automated WCAG AA gate | none | zero violations |
| Tests | 736 | grows with every service |

**Order matters.** Phase 1 protects the trust story, Phase 2 makes breadth affordable, Phase 3 delivers the breadth the owner asked for, Phase 4 makes it usable on a real Indian phone, Phase 5 keeps it that way. Do not start Phase 3 before Phase 2, or the ninth service will cost as much as the first.
