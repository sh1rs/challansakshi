# ChallanSakshi — the number-one plan (4–7 September)

**Written:** 2026-09-04 (Asia/Kolkata), ~22:15
**Branch:** `codex/challansakshi-resolution-layer`
**Tree at time of writing:** `96c3fbd`; 41 test files / 749 tests green; only `wrangler.jsonc` dirty (deliberate).
**Goal:** move a cold-judge **22/30** to **29–30** and finish top ten of 250 at Build What Moves India.

Read with:
- `2026-09-04-competitive-position-and-judging-plan.md` — why these items and not others (the field, the rivals, the scoring).
- `2026-09-04-judged-artifacts.md` — the paste-ready summary, video script and Codex section referenced by D1-2, D1-3 and D1-4 below.

> **Staleness warning.** The recon behind this plan read the tree between 21:20 and 21:41 on 4 September. Commit `bc1612c` ("simplify citizen journey to three steps and one footer boundary") landed at 21:44 from a parallel Claude Code session and rewrote `CitizenReviewApp.tsx` (−543 lines), `CitizenHome.tsx`, `lib/guided-journey.ts`, `lib/citizen-review-presentation.ts` and eight test files. **Line numbers for those files are stale and part of Day 2 may already be done.** Re-read and re-measure before acting. Days 1, 3 and 4 are essentially unaffected.

---

## 0. Standing rules that override every instruction below

1. **Never** inspect, list, search, stage, modify, delete or clean `qa/public-launch-audit-2026-09-02/`. Use `git status --short --untracked-files=no`.
2. **Never** run `git clean`, `git reset --hard`, `git add .` or `git add -A`. Stage only explicitly named files. One commit per task.
3. `wrangler.jsonc` stays **deliberately modified** at `compatibility_date 2026-05-22` for local dev. Do not commit that value; the deploy script flips it to the committed `2026-08-28` and restores it through a trap. Do not stash or checkout to "tidy up".
4. **Do not touch `extension/`** before 8 September. It is blocked, not public, and invisible to judges.
5. Never claim deployment, Store eligibility, public release or government authorization. Real government adapters stay internal-disabled and selector-free.
6. Every safety contract enforced by a test stays enforced. Weakening a test to make a feature pass is worse than shipping nothing.

## 0.1 Runtime and gate

Node is not on `PATH` and there is no `pnpm`.

```bash
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
./node_modules/.bin/eslint .          # zero warnings — an unused import fails it
./node_modules/.bin/tsc --noEmit      # clean
./node_modules/.bin/vitest run        # currently 41 files / 749 tests
node node_modules/vinext/dist/cli.js build
```

**Run all four before your first edit and write the numbers down.** Several items change test counts on purpose; without the baseline you cannot tell a real break from an expected delta.

---

## 1. Where the score stands

| Criterion | Today | Judge's objection |
|---|---|---|
| Problem | 5 | none |
| Working build | 3 | "what did the software actually do?" |
| Usability | **2** | lowest in the sample bar three |
| Product thinking | 4 | — |
| End-to-end | 3 | no backend by design, no next-action owner |
| Honesty | 5 | none — the anchor, must not slip |
| **Total** | **22** | rivals at 26, 26, 26, 25; ceiling 29; top-10 bar 27 |

**Honest expectation:** the MUST set below reaches **29**, which clears every direct rival and matches the ceiling. **30 requires D3-6 alone**, which touches thirteen assertion sites in one contract test and is the likeliest item to overrun. Plan for 29.

## 2. How six parallel specs were merged

Six designers worked in parallel and collided in five places. These resolutions are already applied below — follow the items, not the specs.

| Collision | Resolution |
|---|---|
| Three specs rewrote the `SUBMISSION.md` summary | One item, **D1-2**. The 231-word version wins; it is the only one separating Real from Mocked in the body. |
| Four specs rewrote or appended to `DEMO_SCRIPT.md` | One item, **D1-3**. |
| Two specs deleted the disabled "Re-run AI analysis" button | One item, **D3-3**, which also sweeps the false "AI extracts" strings. |
| Two specs created a trust page (`/how-it-connects`, `/how-it-works`) | One route, **D3-5**, at `/how-it-works`, opening with the route-expiry probe. Two new routes for one judge visit is waste. |
| Three specs all used the `W2-` id prefix | Renumbered `D1-1`…`D4-2` by day. |

---

## Day 1 — Friday 4 September (evening) · ~5 h · text only, zero build risk

Start here: it closes the one **mandatory** criterion that is currently unmet, needs no build, and cannot break a test. `grep -c -i codex SUBMISSION.md DEMO_SCRIPT.md` returns **0 and 0** today.

### D1-1 — Correct the Codex evidence before citing it · MUST · 0.5 h
**Files:** `README.md:328-330`, `.superpowers/.gitignore`
**Why:** the specs wanted to cite `.superpowers/sdd/` as committed evidence. It is **not tracked** — the `.gitignore` there is a single `*`, and `git ls-files .superpowers` returns nothing. "36 committed review diffs" would be a false claim in the one section whose job is honesty.
**Do:** decide once — either `git add -f` the specific ledgers you intend to cite, or cite only `docs/superpowers/`, which *is* tracked (24 files: 5 design specs, 5 plans, the deploy handoff, dated official-route verification records with screenshots). Recommended: the latter, and describe `.superpowers/sdd/` as local working records without claiming they are committed.
**Also fix, verified 2026-09-04:** **97 commits** (not 94); **19** `Co-Authored-By` trailers (not 16), naming **Claude, not Codex**; re-derive the test total from a live run (**749**, not 736).
**Accept:** every path named in the Codex section returns a result from `git ls-files`, and every number matches a command you just ran.

### D1-2 — Replace the judged summary · MUST · 1 h
**Files:** `SUBMISSION.md:5-15`
**Do:** paste the 231-word summary from `2026-09-04-judged-artifacts.md` §1, replacing everything between `## Polished summary` and `## Beyond the hero demo`. Add the 153-word short variant below it under `### Short variant (if the form imposes a character cap)` so nobody improvises at the form at midnight.
**Accept:** word count ≤250; every figure traceable to a cited source.

### D1-3 — Rewrite the demo script as two real minutes · MUST · 2 h
**Files:** `DEMO_SCRIPT.md` (full replace)
**Do:** paste the shot-by-shot script from `2026-09-04-judged-artifacts.md` §2 — minute one the citizen route, minute two how it was built. Record **after** the final deploy, in a **375px phone frame**.
**The seven pre-flight rules are load-bearing**, especially: never show `scripts/codex-deploy.sh:10` (it contains the owner's username); attach no file anywhere; and **set the RC field** — `lib/public-challan.ts` returns the strong finding only when a conflict is recorded *and* `ownRecordAvailable === "present"`, which defaults to `"unclear"`. Skip it and the take is wasted on `insufficient-review`.

### D1-4 — Write the honest "How Codex was used" section · MUST · 1 h
**Files:** `SUBMISSION.md` (new section), `README.md:328-330`
**Do:** paste from `2026-09-04-judged-artifacts.md` §3. Four parts — **Verification** (the pinned Node toolchain every gate runs on; name the file, never paste the path), **Deploy** (one command, one handoff prompt, the entire interface), **Sandbox** (`vite.config.ts:6` detects `CODEX_SANDBOX === 'seatbelt'` and switches Vite to polling because macOS Seatbelt blocks FSEvents — configured for Codex, not adapted to it), **Written record** (tracked `docs/superpowers/`, 97 commits).
**The part that wins it:** a **"what we do not claim"** paragraph — the repo does not record per-line agent authorship, and the 19 trailers name Claude. Judges score Honesty; volunteering this beats a vague boast.
**The defect story:** commit `96511f4`, a visually hidden file input still reachable by keyboard tab, in the one component whose purpose is a controlled file surface — failing test first, then `tabIndex={-1}` plus 11 lines of test. Second case `22e1da2`. Both verified to exist with those exact messages.
**Accept:** `grep -c -i codex SUBMISSION.md` is non-zero. No absolute home path in either file.
**Order:** land this **before** D1-5, or the greps collide.

### D1-5 — Fix the four false claims elsewhere in SUBMISSION.md · SHOULD · 0.5 h
**Files:** `SUBMISSION.md:17, :91-93, :100-104, :153`
**Do:** four statements are false or contradict another line in the same file — including the pull quote claiming "AI reads and explains evidence" while `ANALYSIS_ENABLED` is pinned `"false"` at `wrangler.jsonc:19`. Then rewrite the submission-form field block so every pasted answer matches the corrected artifacts.

---

## Day 2 — Saturday 5 September · ~11 h · the usability rescue, worth 2 points

Nothing else on this list is worth as much, and no rival has left these on the table. **Re-measure first — `bc1612c` already addressed part of this.**

### D2-1 — A 375px measurement gate · MUST · 1 h
**Files:** `scripts/measure-mobile.mjs` (new), `package.json`
**Do:** load `/` and `/review` at 375px; print the y-offset of the H1, the first interactive control, and the primary action. Record before any edit. Pre-`bc1612c` the first control on step 1 sat at **y≈1732px** and Continue at **y≈2360px**.
**Accept:** after D2-2 the first control is above 400px. This is the number you quote, not "it feels better".

### D2-2 — Step 1: one consent, real radios, action adjacent · MUST · 3 h
**Files:** `CitizenReviewApp.tsx`, `PublicBeta.module.css`, `lib/guided-journey.ts`
**Do:** collapse two consent checkboxes to one acknowledgement. Convert the option group to a native `<fieldset>` with real radio inputs — today they carry only `aria-pressed`, so a screen reader hears "button, button, button". Move the primary action adjacent to the choice; put guidance in one optional disclosure **below** it. Drop the repeated 60-word no-upload paragraph from later steps, leaving a one-line chip.
**Breaks:** `tests/citizen-review-contracts.test.ts`, `tests/guided-journey.test.ts`

### D2-3 — Step 2 shows every observation the engine uses · MUST · 2 h
**Files:** `CitizenReviewApp.tsx`, `lib/public-challan.ts` (read only)
**Why:** the fast path can omit the RC field, so a hurrying judge lands on `insufficient-review` with the handoff panel inactive and concludes the product does nothing. **This single dead end is the most damaging thing on the site.**
**Accept:** a judge answering only the visible controls in order reaches a real finding with an active handoff panel.

### D2-4 — The result opens with three plain lines · MUST · 2 h
**Files:** `CitizenReviewApp.tsx`, `PublicBeta.module.css`
**Do:** **what we found / what it means / what to do now**, each a labelled line; the six-column confidence table under a `Details` disclosure. Fold in the three-actor **"who acts next"** block — you, the official service, ChallanSakshi — branched so it is true on every finding path, and state plainly that no authority publishes a resolution time for this route, so none is invented. Refusing to fake an SLA reads as maturity and is the honest answer.

### D2-5 — Mobile navigation and accessibility floors · MUST · 2 h
**Files:** `CitizenChrome.tsx`, `CitizenChrome.module.css`, `GuidedStepHeader.module.css`, `PublicBeta.module.css`
**Do:** header links are `display:none` below the breakpoint with **no replacement**, so Privacy, Safety and the demo are reachable only from the footer after 3.6 screens. Add a labelled menu for the route links, Escape-to-close, focus return, and a skip link outside the header. Raise every 36–44px tap target to **48px**. Collapse the disclaimer strip so the H1 fits the first ~400px — header plus banner currently eat 236 of 812px.
**Note:** this also makes `SUBMISSION.md`'s existing "mobile, tablet, desktop, keyboard support" claim true. It is currently not.

### D2-6 — Plain-language pass, English and Hindi · MUST · 2 h
**Do:** every string a judge reads in the first two minutes. "privacy boundary" → "Where this stays"; "custody record (context only)" → "Who had the vehicle at the time (optional)"; "Local-processing receipt" → "Your checklist"; "Citizen-declared official-record copy" → "The copy you looked at". Hindi in the same pass.
**Rule:** change register, not meaning. The wording was safety-reviewed and Honesty is our anchor at 5.

---

## Day 3 — Sunday 6 September · ~12 h · working build and end-to-end

### D3-1 — A judge-drivable sample case at `/demo/sample` · MUST · 4 h
**Files:** `lib/sample-case-demo.ts` (new), `components/demo-sample/SampleCaseDemo.tsx` (new), `app/demo/sample/page.tsx` (new)
**The idea:** this is what replaces switching on a live model, and both reviewers independently called it the actual fifth point. The page renders a seeded case with its finding **already on screen — zero taps** — and two native radio groups re-drive the *existing* `classifyEvidenceComparison()` live. Mismatch flips to abstention; "consistent" refuses to stay consistent; the compared-field count drops; named limitations appear.
**Why not the live model:** `tests/cloudflare-deployment.test.ts` hard-asserts `ANALYSIS_ENABLED: 'false'`; the boundary validator in `app/api/analyze/route.ts` is stricter than its own JSON schema and has never met a real model; `caches.default` is a no-op locally so containment could only be validated in production; and `requestExtraction` forwards `request.signal`, so a client giving up cancels the upstream call and the cache never warms. Spending a scarce deploy to discover that, while Usability sits at 2, is a bad trade.
**Build it as:** a React-free adapter that patches two `ExtractedFact` entries and re-runs the real engine — **never a second copy of the decision logic**, and never mutating `fixtures`, which is shared with `ChallanSakshiApp.tsx`. Return new objects.
**Accept:** a skeptic falsifies "is this hardcoded?" in ten seconds on a phone, with no model, no secret and no spend.

### D3-2 — The homepage doorway and thesis · MUST · 2 h
**Files:** `CitizenHome.tsx`, `CitizenHome.module.css`, `app/layout.tsx`
**Do:** one merged edit — a "Try a sample challan" doorway to `/demo/sample` placed **above** the goal rows; the one-sentence thesis (a model observes, a human confirms, deterministic code decides, and it refuses to manufacture a dispute); the sourced scale figure below. Retitle so every page names the vertical — this also resolves the **#019 Project Saakshi** collision, since a judge sees "Sakshi" twice in the same list.
**Careful:** `tests/demo-mobile-accessibility.test.ts` pins **exactly three** anchors in `.hero-actions`. Adding a fourth breaks it — update the test deliberately, do not discover it in CI.

### D3-3 — Kill every dead control and false AI claim · MUST · 1.5 h
**Files:** `ChallanSakshiApp.tsx`, `SyntheticTestLabApp.tsx`, `app/globals.css`
**Do:** delete the disabled "Re-run AI analysis" button — the brief says every demoed feature must work, and a judge **will** click it. Sweep the three "AI extracts visible facts" strings off the test lab. Stop restoring a stale `'live'`/`'fallback'` analysis mode so the status pill can never make an untrue claim.
**Do not break:** four *live* product messages sit near the same block, plus a second render site. The naive deletion takes them out and fails typecheck. Add `tests/dead-control-audit.test.ts` so it cannot regress.

### D3-4 — Name the 37 jurisdictions instead of bare codes · MUST · 1 h
**Files:** `lib/official-destinations.ts`, `CitizenReviewApp.tsx`
**Breaks:** `tests/official-destinations.test.ts`, `tests/citizen-review-contracts.test.ts`

### D3-5 — One trust page at `/how-it-works`, opening with an operable probe · MUST · 3 h
**Files:** `app/how-it-works/page.tsx` (new), `components/public-beta/SystemMap.tsx` (new), `lib/official-destinations.ts`, `tests/public-mode-privacy.test.ts`
**The mechanism, not the prose:** every 26-scoring rival answers "what would production look like" with a paragraph — which is why they sit at 26. Make the first element **interactive**: pick a jurisdiction and a date, watch the registry resolve or fail closed. MH / 2026-10-02 resolves the NextGen grievance service; 2026-10-03 falls back to the national directory. Institutional design a judge checks in ten seconds on a phone.
**Below it:** real vs simulated; engineering checks labelled "engineering checks, not production traffic"; Built with Codex; the dated official-route drawer; the grievance-grounds mapping onto the four official categories.
**Must do:** export `MAX_ROUTE_AGE_DAYS` so the page states the window from the source of truth rather than hardcoding "30" in prose, and **add the new route to `tests/public-mode-privacy.test.ts`** so the page boasting about the browser-local boundary is itself inside the audit.
**Adds:** `tests/system-map-contracts.test.ts` (new).

### D3-6 — Handoff-panel first-screen vocabulary · SHOULD · 2.5 h · **this is the 30th point**
**Files:** `lib/citizen-review-presentation.ts`, `tests/official-handoff-contracts.test.ts` (13 assertion sites)
**Read honestly:** the usability designer named this the change that takes Usability 4→5 and marked it droppable. **It is the difference between 29 and 30 and the likeliest item to overrun.** Attempt only if Day 3 closes with everything else green. Do not start after 18:00 on the 6th.

### D3-7 — Release labels and the AI-boundary box · SHOULD · 1.5 h
**Do:** "non-public prototype" → **"independent hackathon prototype"** (the rules require this wording anyway). Header link "Hackathon demo" → "Sample cases". Keep every substantive disclosure — this is a confidence change, not a disclosure change. Mount a bilingual AI-boundary box on `/` and the `/review` result; it is the 1:54 shot in the video.
**FASTag stays in navigation.** Only the "English-only safety beta" chip becomes a plain chip with a persistent reason. Removing a working vertical to look tidier loses more than it gains.

---

## Day 4 — Monday 7 September · ~5 h · verify, record, submit

### D4-1 — The gate, then the phone · MUST · 2 h
**Machine:** lint at zero warnings · typecheck clean · full suite green with counts you can explain against the Day-1 baseline · build emitting `/how-it-works` and `/demo/sample`.
**Hand, on a real Android phone (not a resized desktop window):** home → sample case → finding in three taps; the full `/review` journey to an active handoff panel; "Run all 10 cases"; the edit-invalidation moment; the route-expiry probe flipping. **Each in English and Hindi, and in both light and dark.** Console clean. Throttle to 3G once.
**Rule:** anything not working by 14:00 gets **cut, not fixed**. "Every feature you demo must work" is a scored criterion.

### D4-2 — Record, upload, submit · MUST · 3 h
Record against the **deployed** site, not localhost. Upload **unlisted to YouTube** with chapters and an SRT. Verify signed out, on a phone, in a private window. Then paste the summary, the link and the form answers, checking each against the corrected `SUBMISSION.md`.

---

## 3. Deploy windows

Two deploys, not three. `scripts/codex-deploy.sh` is the only path; there is no GitHub remote.

| When | Carries | Verify live immediately after |
|---|---|---|
| **Deploy 1** — Sat 5 Sept evening | Day 2 in full | `/review` at 375px: menu button present, first control above the fold, three-line result, plain-language strings in both languages |
| **Deploy 2** — Sun 6 Sept evening | Day 3, plus D3-6 only if green | `/demo/sample` re-drives on the live build; `/how-it-works` probe flips on the date change; no disabled control anywhere; then **stop deploying** |

**Procedure:** the script flips `compatibility_date` to `2026-08-28`, builds, runs `wrangler deploy --config dist/server/wrangler.json`, and restores the local `2026-05-22` through a trap. **Let the trap run** — interrupting leaves your dev config flipped. The implementing session must not run the deploy; hand the paste-ready prompt in `docs/superpowers/handoffs/2026-09-03-codex-cloudflare-deploy-handoff.md` to the owner.

**Deploy 1 is the real deadline.** The build judges scored is already older than this tree. If only one deploy happens, it must be Day 2's.

## 4. Cut list, in order

1. **D3-6** handoff vocabulary — costs the 30th point, keeps 29.
2. **D3-7** release polish — but keep the label change; it is 20 minutes and the rules require it.
3. **D3-4** jurisdiction names.
4. **D1-5** the four false claims — only if you have confirmed none appears in the summary or video.
5. **D3-5**'s prose sections — keep the probe, cut the essays. The probe is the whole point.

**Never cut:** D1-2, D1-3, D1-4 (the Codex gate is mandatory and unmet today), D2-2 through D2-5 (the two usability points), D3-1 and D3-2 (the door and the proof), D4-1 (an unverified demo failing live costs more than every gain here).

## 5. Projection

| Criterion | Today | MUST set | With D3-6 |
|---|---|---|---|
| Problem | 5 | 5 | 5 |
| Working build | 3 | 5 | 5 |
| Usability | 2 | 4 | 5 |
| Product thinking | 4 | 5 | 5 |
| End-to-end | 3 | 5 | 5 |
| Honesty | 5 | 5 | 5 |
| **Total** | **22** | **29** | **30** |

The single largest risk is spending Day 2 on Day 3's work. The usability points are the cheapest two on the board and the only ones no rival has left on the table.

## 6. What only a human can close

- Both deploys (the implementing session must not run them).
- Recording the video and uploading it unlisted to YouTube — never Google Drive, where at least eight rivals hid theirs behind a sign-in wall.
- Testing on a real Android phone.
- Deciding the `.superpowers/` question in D1-1.
- Pasting the submission form and verifying the video plays signed out.
- **Not needed:** an OpenAI key or spend cap. The live-model path was deliberately cut — see D3-1.
