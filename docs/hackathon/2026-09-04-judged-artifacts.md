# ChallanSakshi — paste-ready judged artifacts

**Written:** 2026-09-04 (Asia/Kolkata)
**Companion to:** `2026-09-04-competitive-position-and-judging-plan.md`

Three artifacts are judged: a ≤250-word summary, a ≤2-minute video, and the live site. This file contains the finished text for the first two, plus the Codex section. It is **paste-ready** — not instructions to write text.

Every factual claim below was verified against the repository on 2026-09-04. Re-verify test counts from a live run before pasting; the current gate is **41 files / 749 tests**.

---

## 1. The summary — 231 words

Replace everything between the `## Polished summary (under 250 words)` heading and the `## Beyond the hero demo` heading in `SUBMISSION.md` with exactly this:

> India issued about 3.74 crore camera-generated e-challans in 2025, and complaints about them nearly tripled to 3,07,150 (MoRTH, Rajya Sabha, March 2026). A citizen gets 45 days to pay or contest, 30 days for a decision, and no way to check whether the notice is even about their vehicle.
>
> ChallanSakshi is that missing step. On /review you say where the record came from, then record only what you can see: plate, vehicle type, colour, whether the alleged offence is visible at all. Deterministic TypeScript, not a model, turns those answers into one of five bounded findings and names the one official service to use next, with the date that route was last checked. Colour alone never becomes a dispute. A forwarded message never becomes a source. Anything you could not see stays unclear. /fastag does the same for FASTag debits.
>
> Real: all of that, in the browser. No account, no upload, nothing stored, nothing sent — enforced by a test that scans every module those routes import. Mocked: nothing is filed, paid or authenticated, and no model runs in production. Server-side verification and a state submission API are absent, not stubbed, because faking a government integration is the one thing this refuses to do.
>
> Codex is the environment it ships in: the pinned Node toolchain every test, type check and build runs on, and the one command that deploys to Cloudflare.

**Traceability.** "five bounded findings" = `CitizenReviewFinding` in `lib/public-challan.ts`. "the date that route was last checked" = `VERIFIED_AT` in `lib/official-destinations.ts`, surfaced as "Route last verified". "a test that scans every module those routes import" = `tests/public-mode-privacy.test.ts`. The two figures are already cited in `SUBMISSION.md` against `sansad.in/getFile/annex/270/AU3764_TntZ75.pdf`.

### Short variant — 153 words, if the form imposes a character cap

> India issued about 3.74 crore camera-generated e-challans in 2025; complaints nearly tripled to 3,07,150 (MoRTH, Rajya Sabha, March 2026). A citizen gets 45 days to contest and no way to check whether the notice is even about their vehicle.
>
> ChallanSakshi is that step. On /review you say where the record came from, then record only what you can see. Deterministic TypeScript, not a model, returns one of five bounded findings and names the one official service to use next. Colour alone never becomes a dispute. A forwarded message never becomes a source.
>
> Real: all of that, in the browser, with nothing stored or sent — enforced by a test. Mocked: nothing is filed, paid or authenticated, and no model runs in production. Server-side verification is absent, not stubbed.
>
> Codex is the environment it ships in: the pinned Node toolchain every test and build runs on, and the one command that deploys to Cloudflare.

---

## 2. The video — two minutes, shot by shot

Record against the **deployed** site after the final deploy, in a **375px phone frame** (judges scored at 375px).

### Minute one — the citizen route

| Time | Screen / action | Narration |
|---|---|---|
| 0:00 | `/` at 375px, top of page | "Three point seven four crore camera challans in India last year. Complaints nearly tripled. Forty-five days to contest — and no way to check if it is even your vehicle." |
| 0:10 | Tap through to `/review`. Turn on Simple mode. Choose "I opened the official service myself" | "ChallanSakshi is that missing step. First: where did this record come from? You tell it. It never verifies that — and it says so." |
| 0:20 | Step 2. Set the RC field to "Available and readable", set plate to "Appears materially different" | "Then you record only what you can actually see. Not what you think. The plate, the vehicle type, the colour, whether the alleged offence is visible at all." |
| 0:34 | Tick the confirmation, press Continue | "One confirmation — you checked these against the record, and anything you could not see stays unclear." |
| 0:42 | Hold on the result, then the handoff panel and "Route last verified" | "Deterministic TypeScript, not a model, returns one bounded finding — and one official service, with the date that route was last checked. Record a colour difference on its own and it refuses. Colour alone is never a dispute." |

### Minute two — how it was built

| Time | Screen / action | Narration |
|---|---|---|
| 1:00 | `/demo/test-lab`. Press "Run all 10 cases" **on camera** | "It is not ten canned answers. One engine recomputes ten fictional cases live: four discrepancies, three consistent, three honest abstentions." |
| 1:12 | Terminal running the test suite, hold on the pass line | "Forty-one test files and the full suite, on the Node toolchain Codex supplies. The same command gates every deploy." |
| 1:22 | Editor on `tests/public-mode-privacy.test.ts` | "The privacy claim is not a promise. This test walks every module the citizen routes import and fails the build on fetch, on storage, on a form." |
| 1:32 | `scripts/codex-deploy.sh` **lines 1–8 and 32–34 only**, then the deploy OK line | "Codex is the environment this ships in. One command builds it and puts it on Cloudflare. It does not write the code — this repo does not record that, so we do not claim it." |
| 1:44 | A two-column Real / Mocked card | "Real: what you just saw, in your browser. Mocked: nothing is filed, paid or authenticated, and no model runs in production." |
| 1:54 | The AI-boundary box on the live homepage, held to the end | "Server-side record verification and a state submission API are absent — not stubbed. Deliberately." |

### Seven pre-flight rules that will otherwise waste the take

1. **Never show `scripts/codex-deploy.sh:10`** — it contains the owner's username. Show lines 1–8 and 32–34 only.
2. **Attach no file anywhere.** `public/evidence-contact-sheet.png` is a three-panel contact sheet and reads as a collage on camera. There is no single-vehicle synthetic photo.
3. **You do not need a photo** to reach the finding; the plate answer alone satisfies `imageInspected`.
4. **The RC field is load-bearing.** `lib/public-challan.ts` returns the strong finding only when a conflict is recorded **and** `ownRecordAvailable === "present"`, which defaults to `"unclear"`. Skip it and you land on `insufficient-review` with the handoff panel inactive — take wasted.
5. **"10 / 10 expected outcomes reproduced" is composed at runtime**, so grepping the phrase finds nothing. That is expected, not a regression.
6. **Read whatever destination the panel actually shows.** Do not pre-script the service name.
7. **If you run long,** cut the 1:22 privacy beat first, then three seconds off the 0:42 hold. Never cut the Codex beat (mandatory), the Real/Mocked card, or the 1:54 line — the only line that speaks to end-to-end thinking.

### Publishing

- **Unlisted YouTube. Never Google Drive** — at least eight rivals in this judge pool put their demo behind a Drive sign-in wall, and a judge who hits a permission screen scores the working build on what they could not see.
- **Title:** `ChallanSakshi — check if the e-challan is even your vehicle (2 min demo)`. Never "Saakshi" or "Project Saakshi"; a different entry in this pool uses that name.
- **First two description lines** (the rest is collapsed on mobile): the independent-hackathon-prototype disclaimer, then the live link with `0:00 citizen demo · 1:00 how it was built with Codex`.
- **Chapters** so a judge can jump to the Codex minute. **Upload an SRT** — auto-captions mangle "e-challan", "FASTag", "Codex" and "crore".
- **Thumbnail:** the result screen at 375px with the finding and the official destination both readable. Not a logo.
- Verify it plays **signed out, on a phone, in a private window** before pasting the link. Do not tick "Made for kids"; it disables description links.

---

## 3. "How Codex was used"

Paste as a new section in `SUBMISSION.md` and replace the `README.md` version with the same text. **Read §3.1 of the companion document first** — the numbers below are verified, and `.superpowers/` is untracked, so do not cite it as committed evidence.

> ## How Codex was used
>
> Codex is the environment ChallanSakshi is developed, verified and shipped in.
>
> **Verification.** Every lint, type check, test run and build in this repository runs on the Codex-supplied Node runtime pinned in `scripts/codex-deploy.sh`. The current gate is 41 Vitest files and 749 tests, all passing.
>
> **Deploy.** `scripts/codex-deploy.sh` is the only path to production. One command normalises the Cloudflare `compatibility_date`, builds, deploys the Worker, and restores the working tree. `docs/superpowers/handoffs/2026-09-03-codex-cloudflare-deploy-handoff.md` is the paste-ready prompt Codex is given; it is the entire deploy interface.
>
> **Sandbox.** `vite.config.ts` detects `CODEX_SANDBOX === "seatbelt"` and switches Vite to polling, because macOS Seatbelt blocks FSEvents. The dev loop is configured for Codex, not adapted to it afterwards.
>
> **Written record.** Five design specs and six implementation plans under `docs/superpowers/`, dated official-route verification records with screenshots, and 97 commits.
>
> **What we do not claim.** This repository does not record per-line agent authorship. The 19 commits carrying a `Co-Authored-By` trailer name Claude, not Codex. So no claim is made about which agent wrote which line — only about the environment in which every line was tested, typed, built and shipped.
>
> **A defect a test caught.** A review found that `LocalRecordIntake`'s visually hidden native file input was still reachable by keyboard tab — a blind accessibility bug in the one component whose entire purpose is a controlled file surface. The regression test was written first and failed. The fix is commit `96511f4`, "fix: keep hidden file controls out of tab order": one attribute, `tabIndex={-1}`, plus 11 lines of test. A second case is `22e1da2`, "fix: derive evidence readiness from current answers", where stale readiness state was caught the same way. We cannot honestly attribute either mistake to Codex specifically, because the repository does not record which agent produced which change. What the record does show is the discipline, and the toolchain it ran on: write the failing test, quote its output, fix, re-run.

**Two hard constraints.** Never paste the absolute `/Users/...` runtime path into either file — it contains the owner's username; name the script and line instead. And land this section **before** rewriting the submission-form field block, or the greps collide.

---

## 4. Judge questions, with honest answers

- **"What did the software actually do?"** — It turned your declared observations into one of five bounded findings and one named official route, and refused three escalations along the way: colour alone, a message-only source, and anything you could not see.
- **"Is this hardcoded?"** — Run the ten cases; show expected against runtime actual; edit a source value; show the earlier confirmation being cleared; reconfirm the changed result.
- **"Does AI decide the challan?"** — No model runs in production at all. `wrangler.jsonc` pins `ANALYSIS_ENABLED: "false"` and the analyze route returns 503 before it parses a body.
- **"Then why is there an AI endpoint?"** — Because a vision model is the right tool for the visual part, and we would rather ship it off than ship it unverified. Public enablement needs server-verified access, abuse and cost controls, metadata stripping, and external privacy and security review.
- **"Does it submit to government?"** — No. It prepares a citizen-controlled factual pack and hands off to an official service the citizen opens themselves.
- **"What would production look like?"** — Server-side record verification, an RC lookup the citizen authorises, and a state submission API returning a real reference number. None of it is stubbed here. Faking a government integration is the one thing this refuses to do.
