# ChallanSakshi — competitive position and judging plan (Build What Moves India)

**Written:** 2026-09-04 (Asia/Kolkata), ~22:00
**Branch:** `codex/challansakshi-resolution-layer`
**Tree at time of writing:** `4dbcf11`; 41 test files / 749 tests green; only `wrangler.jsonc` dirty (deliberate).
**Produced by:** an external research pass — 250 entries categorised, 36 rival sites visited first-hand, and a cold judge agent scoring our own live site blind at 375px. 43 agents, ~1,600 tool calls.

## Why this document exists

`docs/superpowers/plans/2026-09-04-challansakshi-number-one-implementation-plan.md` is the **product** roadmap: extract a guided-service engine, build a nine-service catalogue, improve reach. It is a good plan and nothing here replaces it.

This document is the **judging** plan. It covers what that plan does not touch at all: how we score against the other 249 entries, and the four things that will decide the 7 September resubmission. If you only have three days, this document outranks the product roadmap — the roadmap's payoff is measured in months, this one's on 7 September.

> **Staleness warning.** The recon behind this document read the tree between 21:20 and 21:41 on 4 September. `bc1612c` ("simplify citizen journey to three steps and one footer boundary") landed at 21:44 and rewrote `CitizenReviewApp.tsx` (−543 lines), `CitizenHome.tsx`, `lib/guided-journey.ts`, `lib/citizen-review-presentation.ts` and eight test files. **Every line number below for those files is stale, and some usability items may already be done.** Re-read before acting. The competitive findings, the scoring, and the artifact copy are unaffected — they concern rivals and judged text, not our source.

---

## 1. Where we actually stand

A cold judge agent, given no access to our materials, walked the live site at 375px and scored the brief's six criteria:

| Criterion | Score | The judge's objection |
|---|---|---|
| Problem | 5 | none — best-sourced statement in the arena |
| Working build | 3 | "what did the software actually do?" |
| Usability | **2** | lowest in the sample bar three |
| Product thinking | 4 | — |
| End-to-end | 3 | no backend by design, no next-action owner |
| Honesty | 5 | none — our anchor |
| **Total** | **22/30** | |

Direct rivals score **26** (#223 Parivahan Reimagined, #177 Challan Nyay, #224 MoveMyVehicle) and **25** (#184 Challan Lens). Slot rivals in other domains reach **28**. The benchmark ceiling is #064 GST Notice at **29**. Ten sampled entries are already at 26+, so **the top-10 bar is 27**.

We are 19th of the 37 entries scored. Our depth is unmatched in the niche; what a judge can reach in three taps is not.

## 2. The field

- Transport is the largest concrete domain: **29 of 250**. Almost all of it is generic Parivahan redesign.
- Only **three** entries are challan-specific: us (#009), #177, #184. Functionally five answer "is this challan's evidence about my vehicle" — add #223 and #238.
- **36%** of all 250 names use an interchangeable helper metaphor (Saathi, Setu, Sahayak, Mitra, Copilot, Reimagined). A Hindi noun no longer differentiates anyone.
- **#019 Project Saakshi** is a cybercrime tool scoring 28 in the same judge list. A judge hears "Sakshi" twice. Always write **ChallanSakshi**, always paired with "e-challan".

### The five that matter

| # | Entry | Beats us on | Loses to us on |
|---|---|---|---|
| 223 | Parivahan Reimagined | States our own thesis as well as we do — deterministic rules control state, the assistant only interprets. Complete Hindi, technical trust page (91/91 scenarios), two more journeys. | "Evidence" is hand-typed and compared by string equality. No model. Hash-routed, so deep links 404. Broken video. |
| 177 | Challan Nyay | Real serverless API, receipts, "next action owner: you", review target date, per-adapter audit timeline, six guided grounds, EN/HI/TE, font-size and contrast toggles. **Working build 5.** | No AI at all. One canned case. Video behind a Google Drive sign-in. |
| 184 | Challan Lens | Our four-state vocabulary including a literal "cannot verify". Per-finding "how this check works". Nine dated sources. **Bengaluru fixtures** — the finale city. Public YouTube video. Three interactions to a finding. | Karnataka only, English only, no backend, no post-rejection review. |
| 238 | MySarathi | Our story almost verbatim, with a live OpenAI model in 6–11s and a dispute letter. | The model writes the verdict; no abstention state; fake signed-in user; invented statistics. |
| 064 | GST Notice (benchmark) | The ceiling at 29 — evidence reconciliation with a fenced LLM, shareable report, 10 KB page. | Different domain. |

**A quiet advantage:** several rivals fail the "does it open" round — Drivesaathi is a 503, MoveMyVehicle stalls on a loader, TransferShield and SevaRail render blank without JS. Our pages paint server-side with visible text before any script runs.

## 3. The four things that decide this

### 3.1 Codex is a mandatory criterion and we currently fail it

`grep -c -i codex SUBMISSION.md DEMO_SCRIPT.md` returns **0 and 0**. It appears only in `README.md`, which judges never see. This is the single item that can drop an otherwise strong build out of the ten. Paste-ready text is in `2026-09-04-judged-artifacts.md`.

**Three claims in circulation are wrong — verified 2026-09-04:**

- The repository has **97 commits**, not 94.
- There are **19** `Co-Authored-By` trailers, not 16, and they name **Claude, not Codex**.
- **`.superpowers/` is entirely untracked.** Its `.gitignore` is a single `*`; `git ls-files .superpowers` returns nothing. Any claim of "committed review diffs" there is **false**. Either `git add -f` the specific ledgers you intend to cite, or cite only `docs/superpowers/` — which *is* tracked: 24 files including 5 design specs, 5 implementation plans, the deploy handoff, and dated official-route verification records with screenshots.

The honest Codex story, which is also the strongest one, is **environment**: the pinned Node toolchain every lint, typecheck, test and build runs on (`scripts/codex-deploy.sh:10` — name the file, never paste the path, it contains a username); the single deploy command; and `vite.config.ts:6`, which detects `CODEX_SANDBOX === 'seatbelt'` and switches Vite to polling because macOS Seatbelt blocks FSEvents. Pair it with a **"what we do not claim"** paragraph: the repo does not record per-line agent authorship, so no claim is made about who wrote which line. Judges score Honesty; volunteering that outperforms a vague boast.

A real defect story is available and verified: commit `96511f4` "fix: keep hidden file controls out of tab order" — a visually hidden native file input in `LocalRecordIntake` was still keyboard-reachable, in the one component whose purpose is a controlled file surface. Failing test first, then `tabIndex={-1}` plus 11 lines of test. Second case: `22e1da2`.

### 3.2 Usability 2 is the cheapest two points on the board

No rival has left these on the table. As of the pre-`bc1612c` recon: the header links were `display:none` below the breakpoint **with no replacement**; two consent checkboxes preceded any value; the first control on `/review` step 1 sat at y≈1732px and Continue at y≈2360px; the same 60-word paragraph repeated on all four steps; option buttons carried only `aria-pressed`, so a screen reader hears "button, button, button".

**`bc1612c` addressed part of this. Re-measure before doing more.** Build a 375px measurement script first and record real y-offsets, so the movement is provable rather than asserted.

The one defect worth checking by hand regardless: `lib/public-challan.ts` only returns the strong finding when a conflict is recorded **and** `ownRecordAvailable === "present"`, which defaults to `"unclear"`. If the fast path still omits that field, a hurrying judge lands on `insufficient-review` with the handoff panel inactive and concludes the product does nothing. That single dead end is the most damaging thing on the site.

### 3.3 Working build 3 — the answer is not a live model

The live-model path was examined and **deliberately rejected**. `tests/cloudflare-deployment.test.ts` hard-asserts `ANALYSIS_ENABLED: 'false'`; the boundary validator in `app/api/analyze/route.ts` is stricter than its own JSON schema and has never met a real model; `caches.default` is a no-op locally, so containment could only be validated in production; and `requestExtraction` forwards `request.signal`, so a client giving up cancels the upstream call and the cache never warms. Spending a scarce deploy to discover that, while Usability sits at 2, is a bad trade.

**What earns the points instead:** a seeded case page — `/demo/sample` — that renders a finding **on load, zero taps**, with two native radio groups that re-drive the *existing* `classifyEvidenceComparison()` live. Mismatch flips to abstention; "consistent" refuses to stay consistent; the compared-field count drops; named limitations appear. A skeptic falsifies "is this hardcoded?" in ten seconds on a phone, with no model, no secret, and no spend. Build it as a React-free adapter that patches two `ExtractedFact` entries and re-runs the real engine — never a second copy of the decision logic, and never mutating `fixtures`, which is shared.

Also: **delete every dead control.** The brief says every demoed feature must work, and a judge will click the disabled "Re-run AI analysis" button. Sweep the "AI extracts visible facts" strings too — no model runs in production.

### 3.4 End-to-end 3 — win it with a mechanism, not a paragraph

Every 26-scoring rival answers "what would production look like" with prose, which is why they sit at 26. Make it **operable**: one trust page whose first element is a route-expiry probe. Pick a jurisdiction and a date; the registry resolves or fails closed. MH / 2026-10-02 resolves the NextGen grievance service; 2026-10-03 falls back to the national directory. Institutional design a judge can check in ten seconds.

Export `MAX_ROUTE_AGE_DAYS` so the page states the window from the source of truth, and **add the new route to `tests/public-mode-privacy.test.ts`** so the page boasting about the browser-local boundary is itself inside the audit.

Add a three-actor "who acts next" block to the result, and state plainly that no authority publishes a resolution time for this route, so none is invented. Refusing to fake an SLA reads as maturity and is the honest answer.

## 4. Ordered plan to 7 September

Do them in this order. The first group is text-only, cannot break a build, and closes the mandatory criterion.

1. **Correct the Codex evidence** (§3.1), then paste the summary, the "How Codex was used" section and the video script from `2026-09-04-judged-artifacts.md`. Fix the four false claims elsewhere in `SUBMISSION.md`, including the pull quote claiming "AI reads and explains evidence" while `ANALYSIS_ENABLED` is pinned `"false"` at `wrangler.jsonc:19`. **~5 h, zero risk.**
2. **Usability**: re-measure after `bc1612c`, then close whatever remains — mobile navigation, the fast-path dead end, a three-line result opening, 48px tap targets, plain-language pass in both languages. **~11 h. Worth 2 points.**
3. **Working build and end-to-end**: `/demo/sample`, the homepage doorway, delete dead controls, the trust page with the probe. **~12 h.**
4. **Verify and record**: full gate, then a real Android phone in both languages and both themes, then record against the **deployed** site. **~5 h.**

**Deploys: two, not three.** Deploy 1 carries the usability work; deploy 2 carries the rest. If only one happens, it must be the usability one. The build judges scored is already older than this tree.

**Cut list, in order:** handoff-panel vocabulary (costs the 30th point, keeps 29) → release-label polish (but keep the label change; the rules require "independent hackathon prototype") → jurisdiction names → the trust page's prose, keeping the probe. **Never cut:** the artifact rewrites, the usability items, `/demo/sample`, or the hand verification.

**Projection:** 29/30 on the must-set, which clears every direct rival and matches the ceiling; 30 only with the handoff-panel vocabulary work. Plan for 29.

## 5. Positioning

> ChallanSakshi is not a friendlier front door to Parivahan and not a pay-or-contest wizard. It is the evidence layer that tells a citizen exactly what the challan's own photo and record support, and refuses to say more. Thirteen "Parivahan reimagined" entries redesign forms; the other challan tools either ask the citizen to answer the evidence questions themselves, compare typed strings, or let a language model write the verdict. ChallanSakshi has a human confirm every observation and deterministic TypeScript decide between bounded, honest outcomes — then carries the same frozen evidence through the rejection order, which no other entry does.

One line for the slide: **"The witness, not the lawyer: ChallanSakshi shows what the evidence says, and stops there."**

## 6. What only a human can close

- Both Codex deploys (the implementing session must not run them).
- Recording the video and uploading it **unlisted to YouTube** — never Google Drive, where at least eight rivals hid theirs behind a sign-in wall.
- Testing on a real Android phone.
- Deciding the `.superpowers/` question in §3.1.
- Pasting the submission form and verifying the video plays signed out.
