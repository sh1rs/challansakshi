# ChallanSakshi — Evidence before action

> **ChallanSakshi helps a citizen determine whether an e-Challan’s supplied evidence matches their vehicle, prepare an indexed evidence-backed contest or clarification pack, and navigate the next authority, court, payment, or recovery step.**

## Polished summary (under 250 words)

Asha owns a blue scooter ending in `3317`. Her fictional ₹1,000 helmet e-Challan records that scooter—but the supplied enforcement image appears to show a white motorcycle ending in `3817`.

Today, a citizen in that situation must inspect a blurry image, decide which differences matter, gather documents, draft a factual grievance, watch the contest deadline, and then track the result across separate official states. The official portal provides grievance and status workflows; ChallanSakshi adds a guided, side-by-side evidence review before the citizen uses those workflows.

ChallanSakshi fills that evidence gap. It reads synthetic records, shows every extracted fact with its source, requires citizen confirmation, and uses deterministic code to classify comparisons and calculate indicative clocks. If records conflict, it creates an indexed contest pack. If an image is unclear, it describes the limitation without inventing a plate. If records align, it refuses to manufacture a dispute.

The Resolution Desk carries that evidence discipline through seven fictional failure points: wrong or unclear evidence, grievance rejection, no recorded decision, Virtual Court transfer, payment/status conflict, and phone or receipt recovery. A three-state payment reconciler checks identifiers and amounts; each route ends at an official service without collecting an OTP, payment credential, or real document.

The prototype works without an API key through three typed fixtures; optional OpenAI Responses API extraction uses strict validation and fallback. All filing and outcomes are simulated. ChallanSakshi never declares innocence, invalidates a challan, or promises cancellation.

## Problem

A citizen disputing an e-Challan lacks one evidence-backed way to understand the supplied record, preserve what matters, and navigate fragmented authority, court, payment, and recovery states. Camera-generated notices can include the wrong vehicle, a misread plate, or an image that does not visibly establish the allegation; later, the citizen may face a reasoned rejection, no recorded decision, a Virtual Court transfer, a payment-status conflict, or an access problem without losing the original evidence trail.

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
8. Simulate submission and switch among three reasoned outcomes.
9. Open a post-decision, court, payment, or access route in the Resolution Desk.
10. Download a source-linked case manifest or route note.

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
- Seven bilingual resolution routes with confirmable plain-language triage.
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
