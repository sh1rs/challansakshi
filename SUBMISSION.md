# ChallanSakshi — Evidence before action

> **ChallanSakshi helps a citizen determine whether an e-Challan’s supplied evidence matches their vehicle, prepare a complete contest before the deadline, and track it to a reasoned outcome.**

## Polished summary (under 250 words)

Asha owns a blue scooter ending in `3317`. Her fictional ₹1,000 helmet e-Challan records that scooter—but the supplied enforcement image appears to show a white motorcycle ending in `3817`.

Today, a citizen in that situation must inspect a blurry image, decide which differences matter, gather documents, draft a factual grievance, watch the contest deadline, and then track the result. The official portal can receive and track grievances; it does not first explain whether the challan’s own evidence matches the vehicle it accuses.

ChallanSakshi fills that evidence gap. It reads a synthetic challan, vehicle record, and photographs; shows every extracted fact with its source; requires the citizen to correct and confirm those facts; and uses deterministic code to classify the comparison and calculate indicative clocks. If the records conflict, it creates a concise indexed contest pack. If the image is unclear, it describes the uncertainty without inventing a plate. If the records match, it refuses to manufacture a dispute.

The prototype is fully demonstrable without an API key through three typed fixtures. An optional OpenAI Responses API route can re-run structured image extraction, with strict validation and graceful fallback. All filing and outcomes are visibly simulated. ChallanSakshi does not declare innocence, invalidate a challan, or promise cancellation. It makes evidence understandable and gives the designated authority a better-structured record on which to decide.

## Problem

Camera-generated e-Challans can include the wrong vehicle, a misread plate, or an image that does not visibly establish the allegation. Citizens often do not know which discrepancies are material, what supporting evidence is missing, or how much time remains.

The March 2026 Rajya Sabha answer reports:

- complaints rising from 1,12,500 in 2023 to 3,07,150 in 2025;
- about 3.74 crore camera-generated challans in 2025;
- a 45-day pay-or-contest period with supporting documentary evidence;
- a 30-day resolution period for a properly contested challan;
- reasons to be recorded for rejection;
- state variation in submission route and designated authority.

## Solution

ChallanSakshi asks one precise question: **does the challan’s supplied evidence match the citizen’s verified vehicle record?**

The journey is:

1. Select one of three synthetic cases.
2. Review the fictional challan, vehicle record, and photographs.
3. Inspect and correct source-linked extracted facts.
4. Explicitly confirm those facts.
5. See a mismatch, inconclusive, or consistent finding.
6. Review the deterministic deadline and evidence readiness.
7. Generate and print an indexed factual pack.
8. Simulate submission and switch among three reasoned outcomes.

## What actually works

- Three materially different typed demo fixtures.
- Editable fact review with source and visibility status.
- Mandatory human confirmation before classification.
- Deterministic contest and response clocks.
- Deterministic evidence readiness and case state transitions.
- English/Hindi core journey.
- Print/save-as-PDF contest pack.
- Refresh persistence and browser back/forward behaviour.
- Three complete tracking outcomes.
- Optional structured OpenAI analysis plus precomputed fallback.
- Mobile, tablet, desktop, keyboard, and reduced-motion support.

## What is simulated

- Every document, person, registration, image, authority, grievance number, and outcome.
- Government submission and status updates.
- Authority reasoning shown in the tracker.

No data is sent to Parivahan, a police department, an authority, or a court.

## Why AI is appropriate

The hard input is visual and unstructured: plates, colour, vehicle category, image clarity, and whether an alleged fact is visibly assessable. AI can turn that evidence into structured observations and plain-language uncertainty. It is not allowed to decide validity, innocence, strategy, deadlines, or case state.

> **AI reads and explains evidence. Deterministic rules control dates, completeness, and case states.**

## Safety and honesty

- Uses “possible vehicle mismatch,” never “illegal challan” or “you are innocent.”
- Requires citizen verification before any finding.
- Never fabricates unreadable characters or missing evidence.
- Refuses to create an accusatory contest for the consistent fixture.
- Keeps state-specific process variation visible.
- Labels every action and outcome as fictional or simulated.
- Leaves the final decision to the designated authority.

## Technical architecture

- React 19 + TypeScript on the OpenAI Sites/Vinext scaffold.
- Typed local fixtures and maintainable English/Hindi copy.
- Pure domain module for dates, classification, readiness, actions, and transitions.
- Vitest rule coverage.
- Optional server-side Responses API endpoint with image input, strict JSON Schema, response validation, `store: false`, and no raw-payload logging.
- Local storage only for demo step and verified synthetic state; no database.
- Cloudflare Worker-compatible production output.

## Official sources

- [Build What Moves India](https://buildwhatmovesindia.com/)
- [MoRTH Rajya Sabha answer, 25 March 2026](https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars)
- [Official e-Challan portal](https://echallan.parivahan.nic.in/)

## Suggested submission fields

**Project category:** Citizen services / road transport / responsible AI

**One-line innovation:** An evidence verification layer that sits before the existing grievance form and refuses unsupported disputes.

**Primary impact:** Fewer weak grievances, clearer evidence packets, visible deadlines, and more reasoned authority decisions.

**Most important design decision:** Human-confirmed AI observations feed deterministic rules; the model never controls legal clocks or conclusions.

