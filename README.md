# ChallanSakshi · चालान साक्षी

**Evidence before action.**

ChallanSakshi is an independent, evidence-first e-Challan resolver for one continuous citizen problem: **does the challan’s own evidence, timestamp, vehicle-relationship record, and case state agree with the citizen it is accusing—and, if contested, does the supplied order address the evidence actually submitted?** It carries one frozen Local Evidence Passport from source review to contest pack, fictional response, Order-to-Evidence Review, and neutral clarification note. A compact notice-safety preflight and a secondary Resolution Desk broaden prevention and routing without pretending to authenticate a notice or complete an official action.

> Independent Build What Moves India hackathon prototype. Not affiliated with MoRTH, Parivahan, traffic police, or any court. Synthetic demo data only. Not legal advice.

## The exact citizen problem

A citizen disputing an e-Challan lacks one evidence-backed way to understand the supplied record, preserve what was submitted, and determine whether the supplied response addresses those same evidence points. The flagship case begins with a blurry plate, a visibly different vehicle, or a photograph that does not support reliable assessment of the allegation; the same evidence trail remains useful after submission and a reasoned response.

The official e-Challan and Virtual Courts services already support status, payment, grievance, verification, and court workflows. ChallanSakshi does not replace or imitate those functions. It adds the missing evidence-understanding and next-route layer before a citizen acts:

1. Read the challan and supplied records.
2. Compare image observations with a citizen-verified vehicle record.
3. Show each inconsistency or limitation with its source.
4. Require the citizen to confirm or correct every extracted fact.
5. Calculate indicative clocks with deterministic TypeScript.
6. Record which evidence elements were supplied, unclear, not found in this packet, not applicable, or still require official verification.
7. Compare an optional citizen-reviewed vehicle relationship/custody interval with the alleged event time without inferring the driver, legal owner, or responsibility.
8. Build an indexed, factual pack only when the combined visual and timeline assessment supports a bounded review request.
9. Refuse to manufacture a dispute when both the visual records and selected time record align.
10. Freeze the reviewed facts, completeness inventory, and timeline under stable deterministic local revision IDs and preserve a traceable demo ledger.
11. Compare a supplied fictional order with the submitted evidence, with mandatory citizen review of every mapping.
12. Generate a versioned Order Review Note and neutral reason-clarification request when supported.
13. Offer adjacent official-service routing as a clearly secondary scale path.

## What is working

- A complete mobile-first six-stage evidence journey, plus landing and Resolution Desk routes, with sensible browser back/forward behaviour.
- A full-screen bilingual **Local Evidence Passport** that joins three questions—vehicle identity, event-time relationship, and supplied-packet completeness—without adding noise to the six-stage progress rail.
- Four typed vehicle relationship/custody scenarios: owner-aligned, sold before the event, unclear rental handoff, and aligned fleet assignment. Exact timestamps use deterministic interval rules; unclear or unverified records remain abstentions.
- A combined case-assessment gate: Case C still refuses an unsupported visual dispute, but can prepare a narrowly scoped relationship-timeline review when a separately confirmed sold-before-event record supports it.
- A supplied-evidence completeness inventory with eight stable elements and five non-interchangeable states. “Not found” is always scoped to the fictional packet and never treated as legal insufficiency.
- A deterministic scam-notice preflight over three wholly synthetic messages. It recognises exact-host, hidden-link, APK, OTP/credential, remote-access, personal-payment, urgency, lookalike, punycode, HTTP, port, and embedded-credential warning signals without fetching suspicious destinations.
- Independent **Simpler view** and **Text first · fewer visuals** preferences. Simpler view adds a persistent plain-language summary and roomier single-column layouts; text-first mode does not mount the 1.6 MB evidence sheet until the citizen explicitly reveals it and blocks live image analysis while enabled.
- A secondary bilingual **Resolution Desk** showing how the same evidence-first pattern could later route seven adjacent lifecycle moments; it is not the flagship submission journey.
- Plain-language English and Hindi routing that only suggests a help path, exposes ambiguity, and requires citizen confirmation.
- A working three-state payment reconciler: supplied-record conflict, identifier mismatch, and aligned-record refusal.
- A deterministic post-rejection D+30 clock with state-specific implementation cautions.
- A deeply integrated **Order-to-Evidence Review** for the rejected hero case: seven extracted order facts, a document-completeness gate, six source-linked mapping rows, three neutral statuses, editable paragraph references, and mandatory per-row confirmation.
- A versioned **Order Review Note**, neutral reason-clarification wording, downloadable JSON artifact, indicative `.ics` reminder, and full case manifest.
- A derived local case ledger that distinguishes supplied records, analysis, citizen confirmation, deterministic rules, the Passport revision, and the simulated authority. It is explicitly not an official record or legal chain of custody.
- A frozen local demo snapshot with a stable deterministic revision ID tying the pack, grievance, fictional order, evidence map, ledger, and downloads to the same core citizen-confirmed facts. It is not a cryptographic integrity proof. Editing evidence clears every downstream simulated event.
- An official Virtual Courts handoff checklist that never handles OTPs, filing, or payment.
- Downloadable JSON route notes and a versioned, source-linked case manifest.
- V5 refresh persistence for current demo step, selected fixture, verified facts, Passport/custody confirmations, frozen submitted Passport, tracking state, and selected resolution route. V4 states migrate conservatively; accessibility/data preferences live in a separate V1 store and survive “Start over.”
- Three typed synthetic fixtures:
  - **Case A:** blue scooter record versus white motorcycle image → possible vehicle mismatch.
  - **Case B:** unreadable image and unassessable allegation → inconclusive evidence.
  - **Case C:** registration, category, colour, and visible allegation align → no material mismatch; no accusatory pack.
- Source-linked, editable comparison facts; locked synthetic notice metadata; and an explicit human-confirmation gate.
- Pure, tested rules for contest windows, authority-response windows, evidence classification, readiness, actions, and state transitions.
- Evidence readiness separated into citizen-supplied, authority-held, and optional items.
- Bilingual interface and guidance across the core journey; synthetic identifiers and a few source values remain in English for recognisability.
- An indexed, print-friendly contest or clarification pack generated from confirmed facts only.
- A clearly fictional grievance reference, full tracking timeline, and three switchable reasoned outcomes.
- Optional Responses API vision extraction with strict Structured Outputs and a reliable precomputed fallback.
- No real-document upload surface: every route and record remains visibly synthetic.
- Accessible labels, visible focus states, reduced-motion support, 360 px layout support, and large touch targets.

## Architecture

```text
app/page.tsx
  └─ components/ChallanSakshiApp.tsx       UI, localization, V5 persistence, demo flow
       ├─ components/EvidencePassport.tsx  notice preflight, preferences, Passport UI
       ├─ components/ResolutionDesk.tsx     triage, routes, payment demo, official handoffs
       ├─ components/OrderEvidenceReview.tsx locked order, mapping, note, and ledger UI
       ├─ lib/fixtures.ts                   typed synthetic records and precomputed analysis
       ├─ lib/domain.ts                     pure date, evidence, readiness, and state rules
       ├─ lib/evidence-passport.ts          custody intervals, completeness, combined gate, revisions
       ├─ lib/notice-safety.ts              deterministic synthetic-message warning signals
       ├─ lib/resolution.ts                 triage, post-order, route, and payment rules
       ├─ lib/case-ledger.ts                evidence registry, revisions, provenance, ledger
       └─ lib/order-evidence.ts             order fixture, mapping, validation, artifacts

app/api/analyze/route.ts                    optional Responses API image extraction
tests/domain.test.ts                        core deterministic rule coverage
tests/resolution.test.ts                    resolution and reconciliation rule coverage
tests/case-ledger.test.ts                   provenance, ledger, order map, artifact invariants
tests/evidence-passport.test.ts             timeline, Passport, combined-gate, preflight rules
public/evidence-contact-sheet.png           synthetic evidence photography
public/og.png                               social preview
```

The application uses the Sites Next-compatible scaffold (React 19, TypeScript, Vinext/Vite, Tailwind CSS runtime, Cloudflare Worker-compatible ESM output). There is no account system, database, payment, real filing, or live government integration.

### AI versus deterministic rules

> **AI reads and explains evidence. Deterministic rules control dates, completeness, and case states.**

AI is limited to source-linked observations such as visible plate characters, category, colour, image clarity, and whether a visual fact is assessable. It is explicitly instructed not to decide guilt, innocence, legality, deadlines, strategy, or outcome.

Normal TypeScript code handles:

- the indicative 45-day contest clock;
- the 30-day authority-response clock;
- evidence completeness;
- supplied-packet status and Local Evidence Passport revision identity;
- vehicle relationship/custody interval validation and event-time comparison;
- combined visual/timeline review grounds and permitted artifact type;
- scam-notice warning-signal precedence and exact-host checks;
- mismatch/inconclusive/consistent classification after confirmation;
- allowed case transitions and available actions;
- outcome display;
- submitted-revision identity and downstream invalidation;
- order-fact and document-completeness gates;
- valid evidence and paragraph references;
- per-row Order-to-Evidence confirmation;
- case-ledger chronology and active scenario branching;
- eligibility for a neutral clarification artifact;
- post-order reminder generation;
- plain-language route matching;
- post-rejection indicative clock calculation;
- payment-record reconciliation and refusal states;
- permitted official handoff content.

The product treats the issue date as Day 0 and displays D+45 as an **indicative, provisionally included deadline day**. The acknowledgement date is Day 0 for the D+30 authority boundary. The source does not settle cutoff time, holiday rollover, or every state implementation, so the interface labels these dates as estimates and always directs the citizen to verify the official portal.

## Optional live OpenAI analysis

The complete journey works without an API key. To enable the optional “Re-run AI analysis” control:

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` locally.
3. Set `OPENAI_MODEL` to a vision-capable Responses API model available to your OpenAI project. The app deliberately does not hard-code an unverified model.
4. Restart the development server.

The route uses the OpenAI Responses API with image input, `store: false`, and a strict JSON Schema. The client sends only a known fixture ID; the server loads the bundled synthetic contact sheet and never accepts caller-supplied document data. It validates both the request and returned object before any observation reaches the UI. It does not log image data or raw document contents. If configuration, network, model access, or validation fails, the UI keeps the typed fixture and shows **Precomputed fallback active**.

## Synthetic-data and privacy policy

- Every name, registration, challan, authority, grievance, date context, image, and outcome is fictional.
- Evidence previews are visibly watermarked **SYNTHETIC DEMO DATA**.
- The generic vehicle data card is intentionally not a replica of an official RC.
- The prototype warns against uploading real identity or vehicle records.
- The prototype does not accept real uploads. All source records are preloaded, typed, fictional fixtures.
- No demo submission reaches a government system.
- No real registration, OTP, Aadhaar, transaction reference, engine number, or chassis number is requested.
- Reset clears local case state and restores the fictional fixtures while keeping the citizen’s Simpler view and text-first preferences.
- Suspicious synthetic text is displayed as inert text; the prototype never fetches or makes its supplied destination clickable.
- Text-first mode prevents the evidence contact sheet from being requested until explicit reveal. Choosing “I could not inspect this image” creates an inconclusive evidence state instead of silently confirming visual facts.
- The designated authority remains the final decision-maker.

## Local setup

Requirements: Node.js 22.13+ and pnpm.

```bash
pnpm install
pnpm run dev
```

Open the local URL printed by the development server (normally `http://localhost:3000`).

## Validation commands

```bash
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

## Deployment

The repository includes `.openai/hosting.json` and is deployment-ready for OpenAI Sites. Set `NEXT_PUBLIC_SITE_URL` to the trusted production origin before the final production build so Open Graph image URLs are absolute.

For another common host, install dependencies, configure the optional environment variables, and run `pnpm run build`. No persistent service or paid infrastructure is required.

## Known limitations

- The product does not file, pay, cancel, or legally determine an e-Challan.
- The notice preflight identifies observable warning signs in supplied synthetic text; it does not certify a link as safe, authenticate a notice, detect malware, or prove fraud.
- The Local Evidence Passport is local and synthetic. It is not government-issued identity, official verification, a legal chain of custody, document forensics, or a legal-admissibility assessment.
- Vehicle relationship timing does not identify the driver, complete an official transfer, establish legal ownership, or decide responsibility.
- The resolution desk is an informational router, not a state-specific legal adviser or live status checker.
- Payment reconciliation compares supplied fictional records only; it does not verify a bank or government ledger.
- The Virtual Courts route does not retrieve, list, transfer, or file any real case.
- The government route, designated authority, required declaration, and implementation can vary by state.
- The date boundary convention is an explicit product estimate, not a legal opinion.
- Live analysis covers the synthetic demonstration image; real personal documents are intentionally outside this prototype’s scope.
- The interface and guidance are bilingual across the core journey, while synthetic identifiers and a few source values remain in English for recognisability.
- Simulated authority outcomes do not represent a prediction or guarantee.
- The Order-to-Evidence map describes textual coverage only. “Not found” never means a point was ignored, an order is invalid, or an appeal is warranted; content may exist in another page, annexure, or official record.

## Official sources

- [Build What Moves India brief](https://buildwhatmovesindia.com/brief)
- [Build What Moves India FAQ](https://buildwhatmovesindia.com/faq)
- [Rajya Sabha Unstarred Question No. 3764, answered 25 March 2026](https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars)
- [Amended Rule 167 and 167A notification](https://morth.gov.in/sites/default/files/Final%20Notification%20for%20amendement%20in%20Rule%20167%20and%20167A-1.pdf)
- [Official NextGen e-Challan portal](https://echallan.parivahan.gov.in/)
- [Official Virtual Courts service](https://vcourts.gov.in/virtualcourt/index.php)
- [Official Virtual Courts FAQ](https://vcourts.gov.in/virtualcourt/faq.php/web_info.php)
- [OpenAI Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create)

The parliamentary answer describes the 45-day action window, supporting-document requirement, 30-day resolution period for a properly contested challan, reasoned rejection, and state-specific submission mechanism. The amended rule describes the post-rejection choice and deposit condition, while leaving the manner state-specific. The official portals document pending-transaction checks, the warning against paying on both e-Challan and Virtual Courts, court-request handoff, alternative verification, and receipt reprint. Every screen keeps the official-service verification step visible.

## How Codex was used meaningfully

Codex helped turn a tightly scoped civic problem into a working product: it separated AI observations from deterministic clocks and routes; built the bilingual evidence, Passport, custody-timeline, case-ledger, and order-review journey; typed and tested correction provenance, stable submission revisions, warning-signal precedence, citation validation, and refusal states; generated wholly synthetic visual assets; verified official-source wording; and exercised the complete flow through desktop and 360 px browser QA. Human verification remains intentional: no model observation, notice keyword, custody interval, order mapping, or route match silently becomes a legal conclusion or official action.
