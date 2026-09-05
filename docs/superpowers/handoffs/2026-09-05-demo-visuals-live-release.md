# Demo visuals and informative UX — live release

Verified 5 September 2026. This is a release record, not an instruction to remove or replace existing features.

## Production state

- Site: https://challansakshi.sh1rs.com
- Worker version: `79001eff-3314-437c-aa75-37a675e9893d`, confirmed at 100% traffic.
- Deployment: `7a6141b0-73b5-4533-973c-0c5538c2fe9c`, created `2026-09-05T09:04:31.415808Z`.
- Previous version retained as rollback target: `93356e65-0f0d-444e-8209-be0974cfc4a5`.
- Deployed with `sh scripts/codex-deploy.sh`; production build and real deployment both succeeded.
- `ANALYSIS_ENABLED=false` and `SYNTHETIC_UPLOADS_ENABLED=false` remained deployed. No new cloud analysis, government integration, or real-document upload was enabled.
- The script restored the deliberately local compatibility date (`2026-05-22`). The before/after SHA-256 of `wrangler.jsonc` was identical: `43fa2158eb3964b988de9e8dac21f36a1c49f82f9022a8229c93da5dc9544527`.
- Deployed from the verified working tree on `codex/challansakshi-resolution-layer`, based on HEAD `3ed97ce`. These refinements remain uncommitted; deployment does not imply a commit or push.

## Preserved and improved

- Informative screenshot-led homepage, recognisable situations, document-first real review, consistent navy/teal/amber styling, and visible Demo navigation.
- All ten runtime Test Lab cases, filters, editable observations, source traces, confirmation and stale-result invalidation, custom local synthetic input, and the 90-second guided proof.
- All three long-demo fixtures and the complete evidence → Passport → readiness → pack → simulated tracking → rejection-order review walkthrough.
- Photos are visible by default for new visitors. Saved text-first/low-data preferences remain respected; loading a photo does not trigger live AI analysis.
- Original fictional challan/vehicle/source-observation cards remain immutable while the test observations are edited.
- Added four generated fictional vehicle scenes (blue/white scooters and white/grey hatchbacks) with blank plates, clearly labelled as illustrations. Case values are authored test inputs, not OCR readings from the generated pictures. The existing long-demo photo strip now preserves vehicle proportions.
- Missing citizen photos and reused references are described accurately instead of implying independent visual corroboration.
- FASTag demos show fictional debit/source records, with missing second-debit details left missing. Real `/fastag` does not receive these example records.

## Fresh verification

- Vitest: **53 files / 915 tests passed**.
- TypeScript: clean.
- Full scoped ESLint: zero warnings; `git diff --check`: clean.
- Local Chromium browser suite: **49 tests passed**, including English/Hindi, mobile geometry, real/demo isolation, local document reading, photo preferences, source immutability, all ten runtime cases, corrections, and complete long-demo progression.
- After deployment, Chromium against the public domain: **15 tests passed** (desktop/phone long demo, source pictures and corrections, informative real journeys, FASTag preparation, all ten lab cases and the 90-second proof).
- New scene image and public Test Lab returned HTTP 200; actual browser image decoding passed.
- Independent read-only source/asset review found no remaining critical release blockers. Visual captions and badge contrast were checked and corrected before release.

## Scope notes

- This release preserves existing demo depth; do not treat simplification as permission to remove demo cases, sources, uncertainty handling, or consequential confirmations.
- Synthetic illustrations are not authentication, OCR evidence, or a live model run. No API spend was enabled; the approved optional-cloud budget remains ₹500/month pending enforceable controls and configuration.
- The protected audit directory and frozen extension directory were not inspected or changed.
- Local browser test servers were stopped before production build. The in-app preview was switched to the live Test Lab.
