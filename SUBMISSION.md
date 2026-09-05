# ChallanSakshi — Evidence before action

> **ChallanSakshi reads a selected challan on the citizen’s device, compares supported registration evidence and prepares a neutral next-step note. A separate synthetic journey demonstrates the deeper contest-to-response evidence lifecycle.**

## Polished summary (under 250 words)

ChallanSakshi adds an evidence-understanding layer around official e-Challan services; it does not replace them.

On `/review`, a citizen selects a challan PDF or image. On-device PDF extraction or English/Hindi OCR reads labelled registration, notice number, event date, amount, offence and location. An optional independent vehicle record enables deterministic registration comparison. Fields retain their source and page; the citizen corrects only wrong readings. Unclear or conflicting readings stay uncertain, and identical document bytes cannot masquerade as independent evidence.

After confirming the records, permission and readings, the citizen gets a neutral review note and a current official-services directory link. A matching registration does not verify a photograph, offence or legal validity. Nothing is uploaded, fetched from government, filed or paid. Real-document cloud vision is unavailable in this release.

The adaptive manual fallback remains available without documents. Its deeper grievance preparation is separately gated, not automatically filled by OCR. FASTag adds a focused transaction-review vertical. A separate synthetic Test Lab and lifecycle demonstrate broader evidence reconciliation, abstention, a Local Evidence Passport and rejection-order review without pretending these are live government services.

Codex helped implement and test the local reader, comparison rules, correction provenance, adaptive state and fail-closed handoff. Data stays in page memory; saving the identifier-bearing note requires an explicit private-device choice.

## Beyond the hero demo: public-beta release candidate

The same evidence discipline powers document reading and two manual review paths in the release-candidate build. They work without a government connection. Deploying a build does not close the operating, privacy, security, accessibility and external-review gates documented in the repository:

- **Real document-first review (`/review`)** — select a challan; optionally add an independent vehicle record; correct extracted fields if needed; confirm permission and readings; receive a neutral note and national official-services directory link. The comparison is notice-versus-vehicle-record registration, not enforcement-photo plate recognition, offence assessment or authentication. Up to three pages are read locally.
- **Manual fallback (`/manual/challan`)** — the two-phase **Check → Resolve** journey asks only the questions needed for the current path. Official-source and readable-independent-record gates remain; message-only sources safe-stop. Its compatible grievance pack and receipt/return flow remain separate from the document reader, with no automatic transfer of OCR facts.
- **TollSakshi (`/fastag`)** — citizens reconcile a recorded FASTag debit against the official tag mapping, event time, plaza, two-debit pattern, alternate payment, tariff/pass, and credit observations. Its Transaction-to-Journey Map, TP1–TP14 Passport, bank-versus-NHAI-FASTag routing, current-rule issuer review, and aligned-record refusal turn the architecture into a second deep mobility vertical.

Real documents, fields and answers stay in page memory. Reading downloads same-origin software/language assets, not document data. There is no server document-upload or raw-document-paste surface, provider analysis of real files, case storage, form submission, case data in URLs, analytics or automatic filing. Synthetic state and its disabled optional AI adapter remain sealed from real mode. Cloud vision for real files requires a separately configured provider key and production controls; it is not available on this deployment.

## Problem

A citizen disputing an e-Challan lacks one evidence-backed way to understand the supplied record, preserve exactly which core facts were submitted, and check whether the supplied response addresses those points. Camera-generated notices can include the wrong vehicle, a misread plate, or an image that does not visibly establish the allegation; after contesting, the citizen still needs the original evidence trail to understand a reasoned response.

The March 2026 Rajya Sabha answer reports:

- complaints rising from 1,12,500 in 2023 to 3,07,150 in 2025;
- about 3.74 crore camera-generated challans in 2025;
- a 45-day pay-or-contest period with supporting documentary evidence;
- a 30-day resolution period for a properly contested challan;
- reasons to be recorded for rejection;
- state variation in submission route and designated authority.

## Solution

ChallanSakshi starts with one precise question: **does the challan’s supplied evidence match the citizen’s verified vehicle record?** It then carries the same evidence discipline through the rest of the resolution lifecycle.

The primary real journey now reads available documents and asks for corrections and permission, rather than asking the citizen to perform every comparison. Its output is a neutral note, not a compatible official grievance pack. The separate synthetic proof journey is:

1. Check three synthetic notice-message patterns without opening the supplied destination.
2. Select one of three synthetic evidence cases.
3. Review the fictional challan, vehicle record, and photographs; text-first mode loads the image only on request.
4. Inspect, correct, and explicitly confirm source-linked facts.
5. See a mismatch, inconclusive, or consistent visual finding.
6. Open the Local Evidence Passport, select and review a synthetic vehicle relationship timeline, and inspect eight supplied-packet elements.
7. Let deterministic rules combine visual and custody-time grounds while preserving abstentions and refusal states.
8. Review the indicative deadline and citizen-pack readiness, then generate an indexed factual pack.
9. Simulate submission and switch among three mutually exclusive outcome scenarios.
10. For a rejection, verify the fictional order and review every evidence-to-paragraph mapping.
11. Generate an Order Review Note, neutral clarification wording, calendar reminder, and versioned V3 case manifest.
12. Continue to a neutral official-service handoff; adjacent court, payment, and access routes remain secondary scale demonstrations.

## What actually works

- Local PDF text extraction and English/Hindi OCR for selected challans, labelled source/page fields, targeted corrections and notice-versus-independent-vehicle-record registration comparison.
- A citizen-confirmed neutral document-review note; identifier-bearing saving is private-device only, and unknown/shared-device print is blocked. This does not populate or replace the deeper manual grievance pack.
- Separate adaptive manual e-Challan and TollSakshi routes with Privacy/Data Controls and Safety/Official Routes pages.
- Memory-only real-mode case state, explicit device choice, shared-device output controls, inactivity exit attempt and Quick exit. Same-origin reader assets may download; document bytes and extracted fields do not leave the device. Manual forms retain masked/minimum identifiers.
- Domain- and UI-level artifact gates: aligned, already-credited, incomplete, Virtual Court, unknown-jurisdiction, or stale-attestation outcomes cannot expose a dispute request.
- English and Hindi presentation across the adaptive real review, with safety-critical source and observation meanings kept aligned; the synthetic journey remains bilingual.
- A FASTag Transaction-to-Journey Map, 14-element Toll Evidence Passport, three synthetic Toll fixtures, and conservative actual-record workflow.

The following capabilities belong to the separate synthetic demo, not to a live government-connected document lifecycle:

- Three materially different typed demo fixtures.
- Editable comparison facts with source and visibility status; synthetic notice identifiers remain visibly read-only.
- Mandatory human confirmation before classification.
- A Local Evidence Passport joining identity, vehicle relationship/custody time, packet completeness, limitations, local history, and frozen revisions.
- Four deterministic custody scenarios and a combined-artifact gate that allows a consistent-image case to proceed only on a supported independent time ground.
- Eight supplied-evidence elements across five honest states; missing-in-this-packet and unreadable are never conflated.
- A deterministic three-fixture scam preflight with exact-host and high-risk-request checks; suspicious destinations are inert text.
- Independent Simpler view and text-first preferences. The evidence contact sheet is not requested before explicit reveal, and an uninspected image produces an inconclusive state.
- Deterministic contest and response clocks.
- Deterministic evidence readiness and case state transitions.
- Bilingual interface and guidance across the core journey, with synthetic identifiers and a few source values retained in English.
- Print/save-as-PDF contest pack.
- Refresh persistence and browser back/forward behaviour.
- Conservative V4-to-V5 migration, immutable submitted Passport snapshots, and separately persisted presentation preferences.
- Three complete tracking outcomes.
- A source/actor-separated local case ledger tied to one frozen local demo snapshot and stable deterministic revision ID, explicitly not a cryptographic integrity proof.
- A complete rejected-order workflow with locked source text, seven extracted facts, order-completeness scope, six mappings, three neutral statuses, editable paragraph citations, and mandatory confirmation.
- A versioned Order Review Note, neutral clarification request, JSON download, full case manifest, print view, and `.ics` reminder.
- Seven bilingual adjacent resolution routes with confirmable plain-language triage, clearly secondary to the flagship evidence journey.
- A deterministic post-rejection D+30 clock and neutral official handoff.
- Three payment examples: record conflict, identifier mismatch, and aligned-record refusal.
- A Virtual Courts search/verification/contest checklist and access/receipt recovery guidance.
- JSON case-manifest and route-note downloads.
- Optional structured OpenAI analysis in configured local development; the public production build deliberately uses the bundled precomputed fallback.
- Mobile, tablet, desktop, keyboard, and reduced-motion support.

## What is simulated in the separate demo journey

- In the separate `/demo` journey, every document, person, registration, image, authority, grievance number, and outcome.
- Its government submission and status updates.
- Its authority reasoning shown in the tracker.

No data is sent to Parivahan, a police department, an authority, or a court.
Real files can be selected for on-device reading, but no real document is uploaded to a server or AI provider. No OTP handling, payment, bank verification or live status lookup is offered.

## Why AI is appropriate

The hard input is visual and unstructured. Local OCR now extracts supported labelled text from real selected documents; deterministic code compares registrations. It does not infer vehicle category or offence visibility from generic OCR. The separately controlled synthetic vision adapter demonstrates how richer image observations can be structured, but it is disabled publicly. Neither approach is allowed to decide validity, innocence, strategy, deadlines or official case state.

> **AI reads and explains evidence. Deterministic rules control dates, completeness, and case states.**

## Safety and honesty

- Uses “possible vehicle mismatch,” never “illegal challan” or “you are innocent.”
- Uses “Stop and verify independently,” never “safe link,” “genuine notice,” or “definitely a scam.”
- Treats relationship timing as citizen-reviewed context, never proof of the driver, legal owner, official transfer, or responsibility.
- Treats “not found” as a statement about the supplied packet only, never proof that another record does not exist.
- Shows tentative document readings first, then requires the citizen to confirm records, permission and readings before preparing a note. Manual and synthetic action gates retain their own confirmations.
- Never fabricates unreadable characters or missing evidence.
- Refuses to create an accusatory contest for the consistent fixture.
- Keeps state-specific process variation visible.
- Warns against paying on both e-Challan and Virtual Courts when a case appears in both places.
- Never requests a real OTP, Aadhaar, payment credential, engine number, or chassis number.
- Labels every synthetic-demo action and outcome as fictional or simulated; real review remains an isolated citizen-controlled workflow.
- Leaves the final decision to the designated authority.

## Technical architecture

- React 19 + TypeScript on the OpenAI Sites/Vinext scaffold.
- Typed local fixtures and maintainable English/Hindi copy.
- Pure domain module for dates, classification, readiness, actions, and transitions.
- Separate resolution module for triage, payment reconciliation, and post-order clocks.
- Pure case-ledger and order-evidence modules for revisions, provenance, citations, validation, artifacts, and timeline events.
- Pure evidence-passport and notice-safety modules for custody-time intervals, completeness states, combined review grounds, revision IDs, exact-host checks, and high-risk signal precedence.
- Pure adaptive question-plan and state modules for answeredness, dependency pruning, confirmation invalidation, and Check-to-Resolve convergence.
- Lazy local PDF/OCR runtime with file, image, page and time bounds; pure labelled-field extraction, source fingerprints, correction provenance and conservative independent-record comparison.
- Fail-closed official-destination and handoff-controller modules that independently validate requested and fallback routes and never attach a URL to an unavailable result.
- Dedicated accessible order-review component with bilingual source, field, mapping, and note states.
- Vitest rule coverage.
- Optional server-side Responses API endpoint with image input, strict JSON Schema, response validation, `store: false`, and no raw-payload logging.
- No case database or real-case persistence; synthetic demo state and an explicit display preference remain separate from real document data.
- Cloudflare Worker-compatible production output.

## How Codex was used

Codex was used as an implementation and review collaborator, not as an authority over a citizen’s case. It helped build the adaptive **Check → Resolve** fallback and then the approved document-first local reading flow, write regression tests before fixes, and review privacy, safety, accessibility and stale-contract boundaries.

Concrete artifacts include `lib/citizen-review-question-plan.ts`, `lib/citizen-review-state.ts`, `lib/evidence-intelligence.ts`, `lib/official-destinations.ts`, `lib/citizen-review-handoff-controller.ts`, `lib/guided-journey.ts`, and `lib/citizen-review-presentation.ts`, with focused Vitest coverage and rendered/contract tests. Independent review also caught a real invalidation bug: after a manually recorded matched-photo path, changing the photo to unavailable could leave the derived `imageInspected` state inconsistent. A regression now requires the photo and image-dependent answers to be cleared and the result to return to an insufficient-review state.

The document-first work adds `lib/local-document-reader.ts`, `lib/document-evidence.ts` and `components/public-beta/CitizenDocumentReview.tsx`. Adversarial tests caught an unsafe independence assumption: selecting identical bytes as both challan and vehicle record could otherwise create a false comparison. Fingerprints now preserve the same-document block even after corrections. Field corrections, partial reads and bounded source excerpts have dedicated regression coverage.

Codex did not supply legal conclusions, fetch live government records or submit a grievance. The [adaptive-flow verification log](docs/superpowers/verification/2026-09-05-adaptive-citizen-resolution.md) describes the earlier manual checkpoint, not final acceptance of this document-reader update. Final test/build/browser and deployment claims must cite fresh evidence for the exact submitted revision; this document does not establish that it has been deployed.

## Official sources

- [Build What Moves India brief](https://buildwhatmovesindia.com/brief)
- [Build What Moves India FAQ](https://buildwhatmovesindia.com/faq)
- [MoRTH Rajya Sabha answer, 25 March 2026](https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars)
- [Amended Rule 167 and 167A notification](https://morth.gov.in/sites/default/files/Final%20Notification%20for%20amendement%20in%20Rule%20167%20and%20167A-1.pdf)
- [Official e-Challan portal](https://echallan.parivahan.gov.in/)
- [Official Virtual Courts service](https://vcourts.gov.in/virtualcourt/index.php)
- [Official Virtual Courts FAQ](https://vcourts.gov.in/virtualcourt/faq.php/web_info.php)

## Suggested submission fields

**Project category:** Citizen services / road transport / responsible AI

**One-line innovation:** A reusable evidence reconciliation layer for e-Challan and FASTag records that refuses unsupported claims and keeps every next step tied to citizen-confirmed, source-aware observations.

**Intended impact:** Reduce retyping, help citizens spot supported record conflicts, avoid unsupported grievances or accidental duplicate payments, and prepare clearer notes for official services.

**Most important design decision:** Automate observation and preparation; ask for missing context, corrections and consequential choices. Traceable evidence and deterministic limits—not a model—control what can be claimed.
