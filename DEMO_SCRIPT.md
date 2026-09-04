# ChallanSakshi judge demo — 2 minutes

The recording shows the real citizen journey first, then uses the separate synthetic Test Lab to prove that reviewed evidence—not a case ID—controls the result.

## 0:00–0:10 · The citizen question

**Screen:** Home, then open the real e-Challan review.

> “A citizen receives a challan but cannot tell whether the supplied evidence is about their vehicle. ChallanSakshi helps them check what they can see and choose a bounded next step—never a legal verdict.”

## 0:10–0:40 · Real Check: the three-answer path

**Screen:** `/review`, **Check your challan**, **1 of 2**. Do not select or upload files.

**Action:** Answer: official service or downloaded record; readable independent vehicle record present; plate in the official photograph is different. Press **I checked these answers — see my next step**.

> “The real flow is answer-only. It asks only the next dependency: where the notice came from, whether I have a readable independent record, and what the official photograph visibly shows. These three answers are enough to identify a possible mismatch without guessing the rest.”

## 0:40–0:58 · Real Resolve: bounded action

**Screen:** **Your next step**, **2 of 2**. Hold on the possible-mismatch wording and official destination status.

> “This is a possible evidence mismatch, not a declaration that the challan is invalid. The citizen can prepare a deeper checklist or continue to a currently verified official service. If that route cannot be validated, the handoff fails closed and exposes no URL.”

Briefly point to **Prepare my checklist**, but keep the timed path short.

## 0:58–1:10 · The real boundary

> “No real document was uploaded. There is no government fetch, login, OTP, payment, filing, or automatic submission. Real answers stay in page memory.”

## 1:10–1:35 · Synthetic engine proof

**Screen:** `/demo/test-lab`. Clearly show the **fictional/synthetic** label. Press **Run all 10 cases** and hold on the reproduced outcomes.

> “The Test Lab is separate from the real answer-only journey. One deterministic TypeScript engine recomputes ten fictional relationships across discrepancy, consistent, and honest-abstention cases. Expected and runtime actual results are shown side by side.”

Open the unclear-photo case briefly.

> “When a photograph cannot support a reading, the result stays inconclusive. The engine does not invent plate characters or manufacture a dispute.”

## 1:35–1:52 · Codex and regression evidence

**Screen:** A prepared code/test proof view; keep terminal secrets and environment variables out of frame.

> “Codex helped implement and test the adaptive question plan, state transitions, evidence rules, and fail-closed official handoff. Independent regression review caught a manual matched-photo invalidation bug: making that photo unavailable now clears `imageInspected`, clears dependent evidence, and returns to insufficient review.”

If showing verification output, use the [adaptive-flow verification log](docs/superpowers/verification/2026-09-05-adaptive-citizen-resolution.md) for this checkpoint and rerun it if the final build changes. Do not narrate an older hardcoded test count.

## 1:52–2:00 · Close

**Screen:** Return to the real Resolve screen or product mark.

> “The real tool prepares a citizen for an official service. The synthetic demo proves the engine. Neither decides the case or acts for the government.”

## Recording setup

- Use English, 100% browser zoom, and an edited take with no waiting.
- Pre-stage the real three-answer path and the synthetic Test Lab; never imply that fictional demo data came from the real review.
- Press **Run all 10 cases** visibly; do not substitute a screenshot.
- Keep the console, environment variables, and API keys out of frame.
- Never upload real data. Do not claim a live AI analysis, government fetch, filing, or production deployment.
- Do not claim a new public video URL until a video has actually been uploaded and checked.
- Hold each result for at least two seconds and verify the final video is two minutes or shorter on a phone-size player.

## Judge questions

- **“Is this hardcoded?”** — Run the synthetic cases and show Expected versus runtime Actual. In Q&A, edit a source, show invalidation, and reconfirm the changed result.
- **“Does AI decide the challan?”** — No. The real flow uses citizen answers. In configured development, AI may return bounded observations for the synthetic evidence workflow; deterministic code compares human-confirmed facts and selects a safe workflow.
- **“Why is public image AI off?”** — The current flag-gated adapter is not authentication and sends original bytes. Public enablement needs server-verified access, abuse/cost controls, metadata removal, and external privacy/security review.
- **“What happens with a blurry plate?”** — The field and overall result remain inconclusive; unreadable characters are never guessed.
- **“Does it submit to government?”** — No. It prepares a citizen-controlled checklist and, only when available, offers a verified official-service handoff.
- **“How was Codex used?”** — To implement and review the adaptive domain modules, write focused regression and contract tests, and identify the `imageInspected` invalidation bug. Codex did not provide legal conclusions or verify a government record.

## Optional Q&A follow-up

Open `/demo` to show the deeper Local Evidence Passport, custody timeline, case ledger, fictional authority response, and Order-to-Evidence Map. Present these as synthetic extensions of the same evidence discipline—not as real government activity or part of the two-minute core proof.
