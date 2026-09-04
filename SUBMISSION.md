# ChallanSakshi — Evidence before action

> **ChallanSakshi helps a citizen determine whether an e-Challan’s supplied evidence matches their vehicle, preserve an indexed contest, and check whether a supplied rejection order addresses the evidence they actually submitted.**

## Polished summary (under 250 words)

ChallanSakshi adds an evidence-understanding layer around official e-Challan services; it does not replace them.

The real `/review` journey is a short, answer-only flow. In **Check your challan**, a citizen records where the notice came from, whether a readable independent vehicle record is available, and what the official photograph visibly shows. A common three-answer path—official source, readable record, different plate—reaches **Your next step** with a carefully worded possible-mismatch finding. Message-only sources stop safely. Unclear evidence remains inconclusive, and matching evidence never manufactures a dispute. The citizen chooses whether to prepare a deeper checklist or open a currently verified official destination. Nothing is uploaded, fetched from government, filed, paid, or decided on the citizen’s behalf.

The separate synthetic demo proves the larger evidence engine with fictional records. Source-linked observations require human confirmation before deterministic TypeScript compares them. The demo covers mismatch, consistent, and abstention cases; preserves a Local Evidence Passport; checks event-time custody and packet completeness; and can compare a fictional rejection order with the evidence supplied. AI may structure visual observations in configured development, but it never decides legality, guilt, deadlines, or the route.

Real answers remain in page memory. Official-route freshness fails closed, and an unavailable destination never exposes a URL. No result declares innocence, fraud, legal ownership, or invalidity.

## Beyond the hero demo: public-beta release candidate

The same evidence discipline now powers two isolated, end-to-end manual tools in the release-candidate build. They work without a government connection; public deployment remains gated by the operating, privacy, security, accessibility, and external-review checks documented in the repository:

- **Real e-Challan self-review (`/review`)** — a two-phase **Check → Resolve** journey asks only the questions needed for the current path. The shortest supported mismatch takes three answers: official source, readable independent vehicle record, and a different plate in the official photograph. Message-only sources safe-stop; unavailable or unclear evidence cannot be promoted into a mismatch.
- **TollSakshi (`/fastag`)** — citizens reconcile a recorded FASTag debit against the official tag mapping, event time, plaza, two-debit pattern, alternate payment, tariff/pass, and credit observations. Its Transaction-to-Journey Map, TP1–TP14 Passport, bank-versus-NHAI-FASTag routing, current-rule issuer review, and aligned-record refusal turn the architecture into a second deep mobility vertical.

Real-mode answers stay only in page memory. There is no document-upload or raw document-paste surface, AI, storage, form submission, URL data, analytics, case database, or automatic filing. The synthetic V5 demo, local persistence, API fixture allowlist, grievance simulator, and outcome simulator remain technically sealed from real mode.

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

The real journey first asks a minimal, adaptive set of citizen-observed questions, then presents a bounded next step. The separate synthetic proof journey is:

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

- Isolated end-to-end manual e-Challan review and TollSakshi routes with Privacy/Data Controls and Safety/Official Routes pages.
- Memory-only real-mode state, masked identifiers, explicit device choice, shared-device in-app copy/download lock plus an approximately 10-minute inactivity exit attempt, Quick exit, and a test-enforced no-storage/no-network/no-upload/no-form boundary.
- Domain- and UI-level artifact gates: aligned, already-credited, incomplete, Virtual Court, unknown-jurisdiction, or stale-attestation outcomes cannot expose a dispute request.
- English and Hindi presentation across the adaptive real review, with safety-critical source and observation meanings kept aligned; the synthetic journey remains bilingual.
- A FASTag Transaction-to-Journey Map, 14-element Toll Evidence Passport, three synthetic Toll fixtures, and conservative actual-record workflow.
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
No real document upload, OTP, payment, bank verification, or live status lookup is offered.

## Why AI is appropriate

The hard input is visual and unstructured: plates, colour, vehicle category, image clarity, and whether an alleged fact is visibly assessable. AI can turn that evidence into structured observations and plain-language uncertainty. It is not allowed to decide validity, innocence, strategy, deadlines, or case state.

> **AI reads and explains evidence. Deterministic rules control dates, completeness, and case states.**

## Safety and honesty

- Uses “possible vehicle mismatch,” never “illegal challan” or “you are innocent.”
- Uses “Stop and verify independently,” never “safe link,” “genuine notice,” or “definitely a scam.”
- Treats relationship timing as citizen-reviewed context, never proof of the driver, legal owner, official transfer, or responsibility.
- Treats “not found” as a statement about the supplied packet only, never proof that another record does not exist.
- Requires citizen verification before any finding.
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
- Fail-closed official-destination and handoff-controller modules that independently validate requested and fallback routes and never attach a URL to an unavailable result.
- Dedicated accessible order-review component with bilingual source, field, mapping, and note states.
- Vitest rule coverage.
- Optional server-side Responses API endpoint with image input, strict JSON Schema, response validation, `store: false`, and no raw-payload logging.
- Local storage only for demo step and verified synthetic state; no database.
- Cloudflare Worker-compatible production output.

## How Codex was used

Codex was used as an implementation and review collaborator for this repository, not as an authority over a citizen’s case. It helped translate the approved adaptive-flow specification into small pure modules, write regression tests before fixes, migrate the real journey from three stages to **Check → Resolve**, and review privacy, safety, accessibility, and stale-contract boundaries.

Concrete artifacts include `lib/citizen-review-question-plan.ts`, `lib/citizen-review-state.ts`, `lib/evidence-intelligence.ts`, `lib/official-destinations.ts`, `lib/citizen-review-handoff-controller.ts`, `lib/guided-journey.ts`, and `lib/citizen-review-presentation.ts`, with focused Vitest coverage and rendered/contract tests. Independent review also caught a real invalidation bug: after a manually recorded matched-photo path, changing the photo to unavailable could leave the derived `imageInspected` state inconsistent. A regression now requires the photo and image-dependent answers to be cleared and the result to return to an insufficient-review state.

Codex did not supply legal conclusions, fetch live government records, submit a grievance, or validate production deployment. Final test and build evidence should cite the [adaptive-flow verification log](docs/superpowers/verification/2026-09-05-adaptive-citizen-resolution.md) for this local checkpoint, and be refreshed if the submitted build changes.

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

**Intended impact:** Help citizens spot evidence conflicts, avoid unsupported grievances or accidental duplicate payments, and prepare clearer masked checklists for safer official handoffs.

**Most important design decision:** Human-confirmed AI observations feed deterministic rules; the model never controls legal clocks or conclusions.
