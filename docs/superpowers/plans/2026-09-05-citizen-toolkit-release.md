# Citizen toolkit release implementation plan

**Goal:** Ship the credible local-first ideas in the supplied conversation with verified public deployment and preserve approximately 10% account usage.

**Architecture:** Extend the existing document-first review and deterministic rules. Add independently usable local tools for photographs, suspicious messages, authority replies and an explicitly enabled private-device task checklist. Publish the existing official route evidence through a read-only registry and maintainer probe. No citizen-data API is required for this scope.

**Authorization:** The user supplied the preceding design conversation and explicitly requested implementation, verification and live deployment. Existing uncommitted homepage/demo refinements are preserved and included in release validation. Work stays on the current feature branch; no destructive reset or unrelated cleanup.

**Constraints:** Guest access; no government access claims; no automatic submission; no new provider spend; English/Hindi; responsive keyboard-accessible UI. Model readings remain suggestions. File/crop/reading changes invalidate confirmations. No extension or protected audit changes. Accounts depend on a supplied connection and a separate authenticated data design.

## Work packages

- [x] Photo workspace: `EvidencePhotoWorkspace.tsx`, `evidence-photo-tools.ts`, integration in `CitizenDocumentReview.tsx`; original/crop/zoom, actual pixel measurements, citizen-confirmed readings, inconclusive recovery and indexed note.
- [x] Follow-up tools: `/message-check`, `/reply-review`; exact host warnings without opening pasted URLs; citizen-linked reply excerpts, invalidation, local-only state and deliberate private export.
- [x] Public sources: `/sources`, `/api/official-routes`, bounded `check-official-routes.mjs`; preserve review dates, distinguish reachability from purpose evidence, synthetic adversarial tests.
- [x] Private checklist: `/dashboard`, `mobility-tasks.ts`; allowlisted task types/status/date, explicit device opt-in, bounded schema and expiry, blocked storage recovery, delete, cross-tab clear handling. Store no records, filenames, plates, reply text or credentials.
- [x] Integration: home/nav links, private storage disclosure, useful continuation links, retain full Demo/Test Lab and FASTag.
- [x] Real FASTag Hindi: guide, outcome, source passport, official-route wording and private text download; preserve deterministic findings and the English synthetic demo. Independent Hindi review remains a follow-on quality gate.
- [x] Verification: focused domain and lifecycle tests, full Vitest, TypeScript, ESLint, browser journeys including mobile/no data egress, production build, deploy and public-domain smoke.

**Release completed September 5, 2026:** Cloudflare version `9b548b97-34a2-42de-a510-eb35f875cfa4`, confirmed at 100% traffic on `challansakshi.sh1rs.com`. Verification: 1,003 unit tests; 59 local browser scenarios across the full run and corrected expectation rerun; 21 production browser tests; live image OCR and independent PDF comparison. See `../handoffs/2026-09-05-citizen-toolkit-live-release.md` for exact evidence, known limits and the uncommitted working-tree boundary.

## Acceptance examples

1. Changing a photo crop clears its confirmed observation; a source failure cannot repopulate a cleared review.
2. `https://echallan.parivahan.gov.in.attacker.example` is never accepted as an official destination. No pasted link is fetched.
3. A reply excerpt must exist in the supplied reply; editing the reply invalidates its old assessment.
4. Opening the dashboard creates no storage. Explicit private-device enablement permits only the checklist schema; malformed/expired data is rejected, and delete persists across tabs.
5. A route that returns HTTP 200 still does not receive a new reviewed date automatically.

## External follow-on requirements

Supabase/cloud accounts require project selection, authorized credentials configured outside chat, ownership/RLS/deletion validation and accurate retention disclosure. DigiLocker and live form adapters require approved access and verified portal compatibility. Real OCR accuracy claims require an authorized held-out corpus; synthetic QA cannot supply them. Camera-quality aggregation requires explicit study design and consent. These are not represented as enabled features.
