# ChallanSakshi — Evidence before action

> **ChallanSakshi helps a citizen determine whether an e-Challan’s supplied evidence matches their vehicle, preserve an indexed contest, and check whether a supplied rejection order addresses the evidence they actually submitted.**

## Polished summary (under 250 words)

Asha owns a blue scooter ending in `3317`. Her fictional ₹1,000 helmet e-Challan records that scooter—but the supplied enforcement image appears to show a white motorcycle ending in `3817`.

Today, a citizen in that situation must inspect an image, decide which differences matter, gather documents, draft a factual grievance, watch the deadline, and preserve the trail after a decision. The official portal provides grievance and status workflows; ChallanSakshi adds the missing evidence-understanding layer around them.

It reads synthetic records, shows every extracted fact with its source, requires citizen confirmation, and uses deterministic code to classify comparisons and calculate indicative clocks. Conflicting records create an indexed pack; unclear evidence stays inconclusive; matching evidence triggers a refusal to manufacture a dispute.

After a fictional rejection, ChallanSakshi freezes the core submitted facts under a stable local revision ID, verifies seven extracted order facts, and compares six submitted points against the supplied six-paragraph order. Every row must be citizen-confirmed as **explicitly mentioned**, **reference unclear**, or **not found in the supplied text**. It then creates a neutral Order Review Note, reason-clarification wording, case ledger, JSON record, and indicative calendar reminder. “Not found” never means ignored or invalid.

The prototype works without an API key through typed fixtures; optional OpenAI vision uses strict validation and fallback. A secondary Resolution Desk shows adjacent scale potential, but the submitted journey remains the single evidence-to-response problem. No real upload, filing, payment, or government connection exists. ChallanSakshi never declares innocence, invalidates an order, or predicts an outcome.

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

The journey is:

1. Select one of three synthetic cases.
2. Review the fictional challan, vehicle record, and photographs.
3. Inspect and correct source-linked extracted facts.
4. Explicitly confirm those facts.
5. See a mismatch, inconclusive, or consistent finding.
6. Review the deterministic deadline and evidence readiness.
7. Generate and print an indexed factual pack.
8. Simulate submission and switch among three mutually exclusive outcome scenarios.
9. For a rejection, verify the fictional order and review every evidence-to-paragraph mapping.
10. Generate an Order Review Note, neutral clarification wording, calendar reminder, and versioned case manifest.
11. Continue to a neutral official-service handoff; adjacent court, payment, and access routes remain secondary scale demonstrations.

## What actually works

- Three materially different typed demo fixtures.
- Editable comparison facts with source and visibility status; synthetic notice identifiers remain visibly read-only.
- Mandatory human confirmation before classification.
- Deterministic contest and response clocks.
- Deterministic evidence readiness and case state transitions.
- Bilingual interface and guidance across the core journey, with synthetic identifiers and a few source values retained in English.
- Print/save-as-PDF contest pack.
- Refresh persistence and browser back/forward behaviour.
- Three complete tracking outcomes.
- A source/actor-separated local case ledger tied to one frozen local demo snapshot and stable deterministic revision ID, explicitly not a cryptographic integrity proof.
- A complete rejected-order workflow with locked source text, seven extracted facts, order-completeness scope, six mappings, three neutral statuses, editable paragraph citations, and mandatory confirmation.
- A versioned Order Review Note, neutral clarification request, JSON download, full case manifest, print view, and `.ics` reminder.
- Seven bilingual adjacent resolution routes with confirmable plain-language triage, clearly secondary to the flagship evidence journey.
- A deterministic post-rejection D+30 clock and neutral official handoff.
- Three payment examples: record conflict, identifier mismatch, and aligned-record refusal.
- A Virtual Courts search/verification/contest checklist and access/receipt recovery guidance.
- JSON case-manifest and route-note downloads.
- Optional structured OpenAI analysis plus precomputed fallback.
- Mobile, tablet, desktop, keyboard, and reduced-motion support.

## What is simulated

- Every document, person, registration, image, authority, grievance number, and outcome.
- Government submission and status updates.
- Authority reasoning shown in the tracker.

No data is sent to Parivahan, a police department, an authority, or a court.
No real document upload, OTP, payment, bank verification, or live status lookup is offered.

## Why AI is appropriate

The hard input is visual and unstructured: plates, colour, vehicle category, image clarity, and whether an alleged fact is visibly assessable. AI can turn that evidence into structured observations and plain-language uncertainty. It is not allowed to decide validity, innocence, strategy, deadlines, or case state.

> **AI reads and explains evidence. Deterministic rules control dates, completeness, and case states.**

## Safety and honesty

- Uses “possible vehicle mismatch,” never “illegal challan” or “you are innocent.”
- Requires citizen verification before any finding.
- Never fabricates unreadable characters or missing evidence.
- Refuses to create an accusatory contest for the consistent fixture.
- Keeps state-specific process variation visible.
- Warns against paying on both e-Challan and Virtual Courts when a case appears in both places.
- Never requests a real OTP, Aadhaar, payment credential, engine number, or chassis number.
- Labels every action and outcome as fictional or simulated.
- Leaves the final decision to the designated authority.

## Technical architecture

- React 19 + TypeScript on the OpenAI Sites/Vinext scaffold.
- Typed local fixtures and maintainable English/Hindi copy.
- Pure domain module for dates, classification, readiness, actions, and transitions.
- Separate resolution module for triage, payment reconciliation, and post-order clocks.
- Pure case-ledger and order-evidence modules for revisions, provenance, citations, validation, artifacts, and timeline events.
- Dedicated accessible order-review component with bilingual source, field, mapping, and note states.
- Vitest rule coverage.
- Optional server-side Responses API endpoint with image input, strict JSON Schema, response validation, `store: false`, and no raw-payload logging.
- Local storage only for demo step and verified synthetic state; no database.
- Cloudflare Worker-compatible production output.

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

**One-line innovation:** An evidence verification and resolution layer around existing official services that refuses unsupported claims and keeps every next step tied to confirmed records.

**Intended impact:** Help citizens avoid unsupported grievances and accidental duplicate payments, while producing clearer evidence packets, visible clocks, and safer official handoffs.

**Most important design decision:** Human-confirmed AI observations feed deterministic rules; the model never controls legal clocks or conclusions.
