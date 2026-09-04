# ChallanSakshi — knowledge transfer for the Codex/GPT agent taking over development

**Written:** 2026-09-04 (Asia/Kolkata)
**Repository:** `/Users/shars/Desktop/challansakshi`
**Branch:** `codex/challansakshi-resolution-layer`
**Handover commit:** `bc1612c` — `feat: simplify citizen journey to three steps and one footer boundary`
**State at handover:** 41 test files, 749 tests, typecheck, lint, and production build all green. Working tree clean except `wrangler.jsonc`, which is deliberately dirty. See section 8.

Read this document first, then `docs/superpowers/plans/2026-09-04-challansakshi-number-one-implementation-plan.md`, which is the ordered build plan. This document tells you how the repository works and what will get you in trouble. The plan tells you what to build.

---

## 1. Working model change

Until today the division of labour was: Claude did all development locally, and Codex only ran `scripts/codex-deploy.sh` because the Cloudflare account is connected in the Codex environment and Codex credits were scarce. **The owner has now restored Codex limits and handed development to Codex.** So you are no longer a deploy-only agent. You own feature work, tests, and commits on this branch.

What did not change: there is **no GitHub remote and no upstream**. Nothing here has ever been pushed, merged, deployed publicly, or submitted to the Chrome Web Store. Do not invent a PR, a remote, or a release status.

---

## 2. What the product is, in one paragraph

An Indian citizen receives an e-Challan or a FASTag debit they doubt. ChallanSakshi does not connect to any government system. Instead the citizen opens the official service themselves, brings back a record or a photograph, and confirms structured observations. Deterministic TypeScript, never AI, turns those confirmed facts into a conservative finding, a local worksheet the citizen can copy or download, and a link to the correct official service from a compile-time verified registry. Everything lives in page memory. Nothing is uploaded, stored, filed, paid, or submitted. The product's entire value is that it is honest about what it does not know.

Live target: `challansakshi.sh1rs.com` on Cloudflare Workers.

---

## 3. Non-negotiable safety contracts

Every one of these is enforced by a test right now. If you break one, tests fail; if you weaken the test to make it pass, you have broken the product. Treat these as harder than any feature request.

**Privacy.** Inside the real-mode import graph walked by `tests/public-mode-privacy.test.ts`, there is no `fetch`, XHR, `sendBeacon`, or WebSocket; no `localStorage`, `sessionStorage`, cookies, or IndexedDB; no `<form>`; no `dangerouslySetInnerHTML`; no raw filenames; and no case data written to the URL or history. The only query key allowed anywhere is `goal`. The theme preference is the single disclosed storage exception and it lives in the layout boot script, never in a component.

**Credentials.** No input may be named or labelled with `otp`, `password`, `cvv`, `upi`, `aadhaar`, or `account`. Identifiers are last-four only. The product never asks for a CAPTCHA, an OTP, an Aadhaar or VID, a government password, or payment details, and says so in the footer.

**Official links.** Destinations come only from the compile-time registry in `lib/official-destinations.ts`. Always a plain `<a target="_blank" rel="noreferrer">`, never `window.open`, never a URL literal in a component. Routes carry `verifier`, `evidenceRef`, `lastVerifiedAt`, and `expiresAt`, and expire 30 days after verification. **The current records expire 2026-10-02.** After that the app fails closed to the national services directory, which is correct behaviour, not a bug.

**Conservatism.** A message-only source safe-stops before any evidence comparison. A colour difference alone is never action-ready. An uninspected image is never action-ready. The app must always be able to say "your entries do not support this" and must never manufacture a dispute.

**Signature binding.** Fact confirmation is a snapshot of the answers, not a boolean. Any edit after confirmation invalidates the confirmation, the handoff pack, and the generated artifact. Never replace it with a plain boolean.

**Shared device.** Choosing shared disables copy, download, and formatted print, and clears the review after about ten minutes of inactivity through exactly one `window.location.replace('/')`. There must remain exactly one such call in each app component.

**Language of release.** `Independent non-public prototype`. Never `public beta`, never `early access`, never a claim of verification, authentication, filing, payment, submission, legal advice, or a guaranteed outcome. Never claim Chrome Web Store eligibility or public release.

**Bilingual parity.** Every citizen-facing string on `/` and `/review` has a Hindi twin with no Latin fallback of four or more letters, except product names and acronyms. `/fastag` is deliberately English-only until its Hindi safety review passes; that is a contract, not an oversight.

---

## 4. Repository rules that will bite you

1. **`qa/public-launch-audit-2026-09-02/` is untracked owner material. Never inspect, list, search, stage, move, or delete it.** Use `git status --short --untracked-files=no`. Never run `git add .`, `git add -A`, `git clean`, or anything that enumerates untracked files.
2. **Stage only explicitly named paths.** One commit per logical change. Subjects are lowercase and imperative: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
3. **`wrangler.jsonc` stays modified and uncommitted.** It sits at `compatibility_date 2026-05-22` because the pinned local workerd tops out there. `scripts/codex-deploy.sh` rewrites it to the committed `2026-08-28` for the deploy and restores it afterwards. Never commit the local value.
4. **The extension under `extension/` is frozen.** Both real adapters are `releaseState: 'internal-disabled'`, `enabled: false`, `supportedFields: []`. The build profile is deliberately named `production-disabled`. Do not enable an adapter, do not claim Store readiness, and do not run `pnpm run extension:verify`-style gates without reading `docs/superpowers/handoffs/2026-09-03-claude-code-public-launch-extension-handoff.md` first. The web product must never depend on the extension.

---

## 5. Environment quirks

**Node is not on `PATH`.** Every command needs this first:

```bash
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```

**There is no `pnpm`.** The `package.json` scripts assume it, so run binaries directly:

| Task | Command |
|---|---|
| Tests | `./node_modules/.bin/vitest run` |
| Types | `./node_modules/.bin/tsc --noEmit` |
| Lint | `./node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next` |
| Build | `node node_modules/vinext/dist/cli.js build` |
| Dev server | `node node_modules/vinext/dist/cli.js dev` on port 3000 |

The framework is `vinext`, a Vite-based Next-compatible runtime, not stock Next.js. React 19, TypeScript 5.9, Vitest 4, Cloudflare Workers via Wrangler.

---

## 6. Layout, and where the truth lives

```
app/                      routes: / /review /fastag /privacy /safety /extension /demo /demo/test-lab
components/public-beta/   the real citizen product
components/shared/        CitizenChrome: header and the single footer boundary
components/guided/        GuidedStepHeader: the compact step header used by /review, /fastag and /demo
components/               the synthetic /demo surfaces
lib/                      all deterministic rules and copy, no browser APIs
tests/                    41 vitest files; the contract tests are the specification
extension/                frozen, production-disabled Chrome MV3 helper
docs/superpowers/         specs, plans, verification evidence, handoffs
scripts/codex-deploy.sh   the one-command deploy
```

The modules that decide things:

- `lib/public-challan.ts` — the e-Challan assessment rules, and `deriveImageInspected`.
- `lib/toll-domain.ts` — the FASTag rules, the 14-point passport, and the worksheet.
- `lib/official-destinations.ts` — the verified route registry and jurisdiction routing.
- `lib/citizen-review-handoff-controller.ts` — a pure state machine for the handoff pack, link activation, return note, receipt, and extension envelope. It touches no browser API and must stay that way.
- `lib/citizen-review-presentation.ts` and `lib/guided-journey.ts` — all step and result copy, English and Hindi, standard and simple mode.

**The contract tests are the real specification.** `tests/public-mode-privacy.test.ts` walks every transitive import from the real routes and enforces the privacy boundary. `tests/official-handoff-contracts.test.ts` pins the handoff structure, order, and copy. `tests/citizen-review-contracts.test.ts` pins the review flow and the CSS accessibility floors. Read these before changing behaviour; they will tell you what is deliberate.

Note that several tests assert against **component source text** rather than rendered output. That makes them brittle to refactoring. Converting them to render-based assertions is an explicit task in the plan and is worth doing early.

---

## 7. What just changed, and why

The owner asked for the product to be far simpler: one disclaimer at the bottom rather than many, minimal steps, defaults instead of questions, no scroll jump between steps, and slightly smaller type. Commit `bc1612c` delivers that.

- **One boundary.** The shared footer is now the only place any real page states the product limits. The navy top bar is gone from real surfaces and kept for `/demo`.
- **Three steps.** `/review` merged its safety step into the first step. Reviewer and device default to "my own case, private device" with two opt-in checkboxes.
- **Fewer questions.** Both acknowledgement checkboxes, the manual-entry toggle, the photo-inspection question, and the custody select are gone. Issuing state is optional. Photo inspection is derived.
- **Fewer clicks at handoff.** One confirmation checkbox for self, two for a present helper, fanning out to the same controller keys. The pack, receipt, and envelope are byte-identical.
- **Instant step landing.** `focus({ preventScroll: true })` then an instant `scrollIntoView` on the guide section. `html { scroll-behavior: smooth }` is removed.

That refinement was then reviewed by five independent lenses, producing 32 findings, deduplicated to 26, each verified by three independent skeptics. Nine survived and **all nine are fixed in `bc1612c`**. The seventeen refutations are tabled in the plan so you do not re-litigate them. If you disagree with a refutation, read its row first.

---

## 8. Deploying

```bash
sh scripts/codex-deploy.sh --dry-run   # build and validate, no upload
sh scripts/codex-deploy.sh             # real deploy
```

The script handles the compatibility-date swap and restores `wrangler.jsonc` afterwards through a trap. It deploys the web Worker only; the extension never deploys through it.

**Before a deploy, check these four things.** None of them blocks a technically successful deploy, but each one ships a visible flaw.

1. `NEXT_PUBLIC_SITE_URL` defaults to `http://localhost:3000`. Until it is set to the deployed origin, every Open Graph and Twitter card link advertises localhost.
2. `public/og.png` is 1.17 MB and `public/evidence-contact-sheet.png` is 1.5 MB. That is the single largest performance problem in the product and it lands on a first visit over Indian mobile data.
3. The route registry expires **2026-10-02**. Re-verify the nine records with dated evidence in `docs/superpowers/verification/` before then, or the app correctly degrades to the directory fallback.
4. `app/layout.tsx` hard-codes `<html lang="en">` even when the citizen chooses Hindi. Content inside the shell is tagged correctly, but the document is not.

"Production ready" here means the non-public prototype is deployable and honest about itself. It does not mean public-release eligible; the README lists the operating, privacy, security, accessibility, and external-review checks that still gate that, and none of them have been closed.

---

## 9. What to do next

Follow the plan document. Its shape:

- **Phase 1** is already done and committed. Skip it.
- **Phase 2 — extract the guided-service engine.** Do this before anything else. `CitizenReviewApp.tsx` is about 1840 lines mixing a generic guided flow with e-Challan specifics. Extracting the shell makes each new service cost roughly 300 lines instead of 1800. Every service after this is cheap; without it, none of them are. Expect zero test changes beyond import paths. If a contract test needs a real edit, your extraction changed behaviour and is wrong.
- **Phase 3 — the catalogue.** Nine end-to-end services, seven of them new, five promoting logic that already exists and is already tested in the `/demo` layer. Build the fake-challan message check first: highest citizen volume, the logic already exists in `lib/notice-safety.ts`, it contacts nothing, and its answer is the most protective thing the product can say. Each service must satisfy the nine-point definition of done in the plan.
- **Phase 4 — reach.** Images, the font that is declared but never loaded, an installable offline shell, per-route metadata, robots and sitemap, and the language attribute.
- **Phase 5 — proof.** An accessibility gate, a test that enforces the one-disclaimer rule so it cannot creep back, and a registry freshness test that breaks the build when routes expire.

---

## 10. Things only a human can close

1. Re-verify all nine official routes with dated screenshots before any public claim.
2. Verify every new destination URL for the new services personally. **You cannot verify a government URL from inside this repository.** Ship a service pointing at the national directory fallback rather than inventing evidence, and mark the record `stale` rather than `current`.
3. Native-speaker safety review for each new language, and for the FASTag Hindi copy that is currently gated.
4. The branded Chrome 152 action-icon walkthrough for the extension; this host runs Chrome 151.
5. Release decisions, and the external reviews the README lists as gates.

---

## 11. If you remember nothing else

The product's competitive advantage is that it refuses to overclaim. Every instinct toward "make it feel more capable" is the wrong instinct here. When a change would make the app sound more certain, more official, more connected, or more automatic than it is, that change is wrong even when it is technically correct and even when it tests green. Make it simpler and more honest, in that order.
