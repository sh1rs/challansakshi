# ChallanSakshi · चालान साक्षी

**Evidence before action.**

ChallanSakshi is an independent, evidence-first citizen project built around one discipline: **inspect the official record, separate observation from conclusion, refuse unsupported claims, and hand the citizen a conservative next-step checklist.** The flagship synthetic journey asks whether a challan’s own evidence, timestamp, vehicle-relationship record, and case state agree. The public routes keep the real citizen tools separate from that synthetic walkthrough:

- `/` — the clean citizen homepage and bounded goal chooser;
- `/review` — document-first e-Challan reading in tab memory: local PDF text/OCR, labelled fields, notice-versus-independent-vehicle-record registration comparison, corrections, and a neutral review note;
- `/manual/challan` — the two-phase adaptive **Check → Resolve** fallback, including its separately gated deeper preparation and official handoff;
- `/fastag` — TollSakshi, a structured FASTag transaction reconciler with a Transaction-to-Journey Map and TP1–TP14 Toll Evidence Passport;
- `/demo` — the isolated, fully synthetic hackathon walkthrough and its fictional fixtures;
- `/demo/test-lab` — a ten-case synthetic evidence laboratory that recomputes every result from editable record and observation fields.

Synthetic state remains sealed inside the demo routes. The flagship walkthrough carries one frozen Local Evidence Passport from source review to contest pack, fictional response, Order-to-Evidence Review, and neutral clarification note. The Test Lab proves that the comparison engine is not a blue-scooter/white-motorcycle script: ten different vectors and citizen edits pass through the same normalization, comparison, confirmation, and routing functions.

> Independent prototype, deployed at [challansakshi.sh1rs.com](https://challansakshi.sh1rs.com). Not affiliated with MoRTH, Parivahan, traffic police, courts, NPCI, banks, or toll operators. It does not file, pay, authenticate, give legal advice, or guarantee an outcome. `/review` reads selected documents on this device and does not upload them to a server or AI provider. Opening a selected PDF creates a separate browser-local tab that the citizen must close. Real-document cloud analysis is not available in this build.

## Release posture

**Code status:** public source publication authorized; the web prototype is deployed at [challansakshi.sh1rs.com](https://challansakshi.sh1rs.com). The repository contains functioning citizen tools and synthetic demonstrations, but deployment is not evidence of government integration or completion of the operational controls below. A real public announcement remains blocked until the non-code controls below are supplied and independently verified.

At minimum, release requires a named operator, privacy/grievance owner, and low-data security and official-link correction channel; published implementation-matched Privacy Policy and Terms; a CERT-In contact and incident runbook; verified India log-retention and clock controls; a vendor and data-flow inventory; external privacy, security, legal, dependency, and supply-chain review; an official-route re-verification cadence; and live monitoring, rollback, correction, and incident ownership. Deployment also requires explicit authorization, correct Cloudflare account and domain verification, and a fresh full gate. The optional extension has additional Store, policy, lawful adapter-verification, portal-authorisation, packaging, publisher-access, staged-rollout, and takedown prerequisites.

Do not describe this repository or product as a launched beta, generally available, secure, DPDP-compliant, or government-authorised service. The retained [official route reverification report](docs/superpowers/verification/official-route-reverification-2026-09-03.md) is a dated non-submitting route-and-purpose smoke check; it does not satisfy those operational gates.

## The exact citizen problem

A citizen disputing an e-Challan lacks one evidence-backed way to understand the supplied record, preserve what was submitted, and determine whether the supplied response addresses those same evidence points. The flagship case begins with a blurry plate, a visibly different vehicle, or a photograph that does not support reliable assessment of the allegation; the same evidence trail remains useful after submission and a reasoned response.

The official e-Challan and Virtual Courts services already support status, payment, grievance, verification, and court workflows. ChallanSakshi does not replace or imitate those functions. The following full-lifecycle sequence is demonstrated with fictional material in `/demo`; the real document-first release currently covers the narrower reading-to-neutral-note workflow described below:

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

## Citizen toolkit additions · 5 September 2026

- `/review`: optional original-photo zoom and selected-region inspection, measured crop dimensions, citizen-confirmed text comparison, unclear/unrelated-image recovery, and photo provenance in the prepared note. Cropped readings are citizen-entered; the existing PDF and screenshot OCR continues locally.
- `/message-check`: bounded local message/link warning checks. Supplied URLs remain inert text; the checker cannot authenticate a sender or guarantee safety.
- `/reply-review`: up to five citizen-raised points linked to exact passages in a supplied reply, manual addressed/unclear/not-found assessments, and a private-device-only follow-up note download. Editing source text invalidates previous mappings. Prepared document and reply notes also offer a private-device-only print/save-as-PDF action with a note-only preview.
- `/dashboard`: an explicitly opened private-device task checklist. Stores only task type, user-reported status, optional follow-up date, and task IDs/timestamps. No records or review contents are saved. It expires after 90 days without edits and is removed on next open. Exit/Hide conceal it; Delete removes saved data. It is neither login-protected nor encrypted. It now supports local calendar-file downloads and unencrypted JSON backup/restore with a preview, explicit replacement, strict schema/size limits and preserved expiry. There is no automatic cross-device sync or background notification service. Calendar notifications and exported copies are managed outside the app.
- `/sources` and `/api/official-routes`: public route metadata, scope, source-review dates and expiry. `pnpm check:official-routes` creates a bounded reachability report without refreshing review dates. See [route maintenance](docs/official-route-maintenance.md).

These tools need no new citizen-data backend. Cloud accounts, DigiLocker, live official form adapters, optional cloud AI and aggregate camera-quality reporting remain unconnected, unenabled follow-on work.

## What is working

- **Document-first citizen flow (5 September 2026).** `/review` reads a selected challan PDF/image on this device, optionally compares its labelled registration with a separate vehicle record, supports targeted corrections, and prepares a neutral note after the citizen confirms the records, permission and readings. Device choice starts unknown; saving requires an explicit private-device choice. The same navy, white, teal and amber visual language is used across the citizen routes.
- A hard-separated **real e-Challan manual fallback** at `/manual/challan` uses the adaptive two-phase **Check → Resolve** flow with no inferred role, source, confirmation or private device. It accepts optional local previews, requires citizen-confirmed structured observations, refuses a message-only comparison, treats colour alone as non-action-ready, uses only a deadline copied from an official service, generates a local citizen evidence summary, and ends in a registry-resolved official-service handoff only when the current facts permit it. The `/review?goal=message` safe stop continues to use this manual engine.
- **TollSakshi**, a recorded-FASTag-transaction self-review for unrecognised crossings, citizen-reported two-debit patterns, alternate payment, fare/class, pass/discount, and aligned-record checks. It distinguishes reader-read, debit-post, and SMS times; separates bank-issued from bank-neutral NHAI FASTag routes; applies no definitive duplicate-time threshold; and withholds an action note unless the final same-transaction attestation still matches every compared field. Tag-not-working and plaza/road incidents without a recorded debit are deliberately routed to the separate Safety page rather than forced through this transaction workflow.
- A 14-element **Toll Evidence Passport** and **Transaction-to-Journey Map** covering vehicle identity, event time, plaza/direction, crossings, amount/class, alternate payment/pass, and credit adjustment.
- Real review documents, messages, replies and answers are held only in page memory. They never enter localStorage, sessionStorage, cookies, case URLs, `/api/analyze`, analytics, or a case database. The separate opt-in `/dashboard` saves only the limited checklist metadata described above. Shared-device mode disables the app’s copy/download controls, provides Quick exit & clear, and attempts to leave after about 10 minutes without pointer, keyboard, input, or touch activity; the UI does not claim a background browser timer is infallible.
- Every action-bearing real-mode artifact has two gates: a pure domain rule and a UI gate. Aligned, already-credited, unverified, incomplete, court, and unknown-jurisdiction outcomes cannot render or download a dispute request.
- The real e-Challan journey and the Privacy/Safety reading pages offer English and Hindi. The real FASTag flow now also offers Hindi guides, results, evidence descriptions and prepared notes; these translations have not received independent language review. The synthetic core remains bilingual.
- Public Privacy/Data Controls and Safety/Official Routes pages, exact-host official links, reviewed-source dates, no third-party analytics, and response security headers including CSP, frame denial, referrer policy, permissions policy, and content-type protection.
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
- A separate **ten-case Evidence Test Lab** covering consistent evidence, an explicit challan-versus-vehicle-record conflict, image registration/category/time/location conflicts, unreadable and partial plates, formatting normalization, and an allegation that cannot be assessed from the supplied photograph. Every displayed outcome is recalculated at runtime from the selected vector.
- A reusable, versioned synthetic extraction contract with field-level source, visibility, evidence reference, limitation, and confidence; deterministic comparison states; a mandatory citizen-confirmation gate; immediate result invalidation after any edit; and a filename-free Citizen Action Pack.
- A local custom-evidence workbench for synthetic testing: a citizen can preview a JPEG or PNG in the current tab and manually record what is visible, but the public app never sends those bytes to a server or model. This intentionally demonstrates the safe human-verification workflow without opening an unauthenticated vision endpoint.
- No real-document server-upload surface. The dedicated message and reply tools accept bounded local text with no transmission or persistence. `/review` runs local PDF text extraction or English/Hindi OCR and identifies the reading method; `/manual/challan` remains citizen-observed. The flagship demo remains visibly synthetic.
- Accessible labels, visible focus states, reduced-motion support, 360 px layout support, and large touch targets.

## Document-first reading workflow

1. Choose a challan PDF, PNG, JPEG or WebP. Reading starts on this device; no case details need to be retyped before extraction.
2. Optionally choose an independent vehicle record, such as an RC. The reader extracts labelled registration, challan number, event date, amount, offence and location; the vehicle record contributes only its labelled registration.
3. Review source-linked fields by document and page. Correct only a wrong reading. Unreadable, conflicting, incomplete or unsupported fields do not become a decisive comparison, and identical document bytes cannot count as two independent sources.
4. Confirm that these are the right records, that you have permission to use them and that you checked the readings. This prepares a neutral review note and a current national official-services directory link. It does not submit or populate an official form.
5. Read the note in the tab, or explicitly choose a private device to save it. The note contains the extracted registration and challan identifiers. Shared/unknown-device printing is suppressed; downloaded copies and separately opened PDF tabs remain outside Quick Exit’s control.

The comparison is **notice registration versus independent vehicle-record registration only**. Generic OCR text is not an enforcement-photo plate crop, and a registration match does not establish photograph consistency, offence visibility, authenticity or legal validity. No legal deadline is inferred. This first document-reader release does **not** feed extracted fields into the manual flow’s compatible grievance pack, receipt/return controller, or synthetic lifecycle. A citizen choosing manual review starts that separate flow without silently transferring document facts.

`lib/local-document-reader.ts` lazy-loads same-origin PDF.js/Tesseract code and English/Hindi language assets after file selection. Document bytes and extracted fields stay in memory; OCR content caching is disabled. Reading is bounded by file size, raster dimensions, page count and time, with manual review available if the device cannot complete it. Up to three pages are read; partial work stays labelled limited.

Cloud analysis may be a later, separately consented option, but it is **unavailable in this build**: no configured real-document provider key or production abuse/spend controls exist. The synthetic adapter below is not a real-document fallback, and its public flags remain false.

## Manual-flow end-to-end official handoff boundary

This section describes `/manual/challan`, not the new document reader’s neutral note.

The complete installation-free path is the in-tab field pack plus the normal official-service anchor. It works without detecting, installing, or using an extension. Private devices receive explicit copy actions; shared devices keep reviewed values visible for manual transcription and expose no app copy, download, lookup bridge, or acknowledgement-reference retention.

The field pack is a user-reviewed factual preparation aid, not an official form, filing, legal conclusion, or proof of submission. A form-compatible pack is possible only for a current, same-revision, citizen-confirmed `Possible discrepancy` based on an official service or official download, an independently readable record, a supported plate/wrong-evidence/explicit-class conflict, the required self or present-helper attestations, and a currently resolved `legacy` or `nextgen` destination. Delhi remains a manual official landing, unresolved routing remains the national directory, and message-only, stale, consistent, inconclusive, or unsupported observations never become a compatible pack. The description is the single controlled description textarea: it is normalized and limited to 500 Unicode code points, never silently truncated, and must be reviewed again after any edit.

Real and synthetic authority are incompatible by construction. Bundled synthetic facts can never satisfy the real official-source gate or become an official pack, and real review facts never enter the synthetic simulation wrapper. The synthetic judge lane may demonstrate the same source-agnostic normalization, issue mapping, limitation, and revision ideas, but its provenance, route, return state, and output types remain fictional and separate.

Activating the transparent registry-owned anchor records only `Official service opened from this review`; it cannot prove that the other tab loaded, authenticated, or received a submission. On return, the citizen explicitly chooses what happened. Any acknowledgement is labelled `Citizen-reported; not verified by ChallanSakshi.` In present-helper mode it is labelled `Affected-person-reported; entered with a present helper`, and the affected person must be present and personally confirm it. Only an optional final-four reference fragment may enter the local receipt on a private device. Editing material evidence or pack text invalidates the pack acknowledgement and receipt.

The optional desktop path receives only the reviewed description, an eligible fixed issue code when supported, and opaque protocol metadata. The reduced envelope does not contain raw evidence, files, dedicated identifier properties, the complete field pack, a receipt, a URL, or selectors. Its reviewed prose may contain an allowed masked final-four vehicle fragment or a sensitive fact missed by bounded checks; it is never described as evidence-free or proven non-sensitive. Both real extension adapters remain `internal-disabled`, and the checked-in extension release is `production-disabled`. No public installation or preparation action is exposed. `/extension` is informational while the complete web handoff remains available, and the synthetic loopback fixtures prove only their fictional contract—not real official-page filling, browser isolated-world behavior, or zero-network behavior.

## Architecture

```text
app/page.tsx
  └─ components/public-beta/CitizenHome.tsx clean citizen homepage and bounded goal chooser

app/demo/page.tsx
  └─ components/ChallanSakshiApp.tsx       UI, localization, V5 persistence, synthetic demo flow
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

app/demo/test-lab/page.tsx
  └─ components/test-lab/SyntheticTestLabApp.tsx runtime corpus, editor, confirmation, result, action pack
       ├─ lib/synthetic-evidence-pipeline.ts      extraction schema, normalization, comparison, route, pack
       ├─ lib/synthetic-evidence-corpus.ts        ten synthetic evaluation vectors
       ├─ lib/synthetic-lab-state.ts              confirmation and edit-invalidation state machine
       └─ lib/synthetic-lab-file.ts               browser-local preview validation

app/demo/test-lab/operator/page.tsx
  └─ components/test-lab/OperatorAnalysisLab.tsx  server-gated synthetic text/image extraction UI

app/api/analyze/route.ts                    feature-flagged, policy-limited Responses API extraction
worker.ts                                  production-host HTTP → HTTPS boundary, then Vinext
tests/domain.test.ts                        core deterministic rule coverage
tests/resolution.test.ts                    resolution and reconciliation rule coverage
tests/case-ledger.test.ts                   provenance, ledger, order map, artifact invariants
tests/evidence-passport.test.ts             timeline, Passport, combined-gate, preflight rules
public/evidence-contact-sheet.png           synthetic evidence photography
public/og.png                               social preview

app/review/page.tsx                        document-first review; SMS safe-stop exception
app/manual/challan/page.tsx                adaptive manual Check → Resolve fallback
app/fastag/page.tsx                        TollSakshi FASTag transaction review
app/privacy/page.tsx                       implementation-matched data controls
app/safety/page.tsx                        verified official-route registry
app/extension/page.tsx                     closed optional-desktop-helper information route
app/demo/extension-fixture/source/         fictional source capsule fixture
app/demo/extension-fixture/destination/    fictional blank-form and instrumentation fixture
components/public-beta/                    isolated real-mode shell and workflows
components/public-beta/CitizenDocumentReview.tsx local document reading, correction and neutral note
components/public-beta/LocalRecordIntake.tsx deliberate local PDF/image intake
components/public-beta/OfficialHandoffPanel.tsx field pack, official anchor, return, and closed helper UI
lib/local-record-intake.ts                 MIME and 12 MiB local-file validation
lib/local-document-reader.ts               memory-only bounded PDF text/OCR runtime
lib/document-evidence.ts                   labelled extraction, provenance, corrections and conservative comparison
lib/evidence-intelligence.ts               citizen evidence view, timeline, and summary
lib/public-challan.ts                      conservative citizen-observation rules and artifact
lib/official-destinations.ts               compile-time official route registry and resolver
lib/official-handoff.ts                    authenticated real pack and separate synthetic simulation
lib/official-handoff-receipt.ts            citizen-reported local continuation receipt
lib/citizen-review-handoff-controller.ts   pure invalidation and browser-effect intents
lib/extension-handoff-contract.ts          reduced extension envelope and capsule contract
lib/extension-release.ts                   checked-in closed public extension gate
lib/toll-domain.ts                         FASTag assessment, Passport, routes, and artifact
lib/toll-fixtures.ts                       three wholly fictional TollSakshi examples
tests/public-challan.test.ts               real-mode refusal and deadline rules
tests/official-destinations.test.ts         allowlist, route age, scope, and safe-stop rules
tests/official-handoff.test.ts              pack eligibility, source, description, and authenticity
tests/official-handoff-receipt.test.ts      citizen-return states, binding, invalidation, redaction
tests/citizen-review-handoff-controller.test.ts orchestration and effect-intent invalidation
tests/toll-domain.test.ts                  toll reconciliation and refusal rules
tests/public-mode-privacy.test.ts          case-data isolation and bounded local-reader capability gate
tests/document-evidence.test.ts            parser, independent-source, correction and note contracts
tests/synthetic-evidence-pipeline.test.ts  reusable comparator and ten-case evaluation corpus
tests/synthetic-lab-state.test.ts          confirmation, invalidation, and recomputation rules
tests/synthetic-lab-file.test.ts           local-preview file boundary
tests/test-lab-contracts.test.ts           UI, mobile, privacy, and accessibility contracts
tests/analyze-route.test.ts                route gates, media validation, schema, and safe failures
```

The application uses React 19, TypeScript, Vinext/Vite, Tailwind CSS runtime, and direct Cloudflare Worker-compatible ESM output. There is no account system, case database, payment, real filing, or live government/bank integration. Authorised government API access is a future connector boundary only and is not implemented. Synthetic demo state is separately persisted under its V5 fixture-only contract; real-mode answers and files are never passed into that contract.

### AI versus deterministic rules

> **AI reads and explains evidence. Deterministic rules control dates, completeness, and case states.**

In the separately configured synthetic vision adapter, AI is limited to source-linked observations such as visible plate characters, category, colour, image clarity, and whether a visual fact is assessable. It is explicitly instructed not to decide guilt, innocence, legality, deadlines, strategy, or outcome. The real document reader uses local OCR/PDF text, not this adapter; its deterministic comparator checks only notice-versus-vehicle-record registration.

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

## Optional controlled OpenAI analysis

The complete public experience works without an API key. The Cloudflare configuration explicitly sets `ANALYSIS_ENABLED=false` and `SYNTHETIC_UPLOADS_ENABLED=false`; the public Test Lab therefore performs no model or upload request. Its custom-image workbench creates only a temporary browser object URL and asks the human to enter the observation.

The repository also contains a narrow extraction adapter for controlled local evaluation or a separately access-protected environment. It can analyze either a bundled fixture or caller-supplied test inputs: one challan text, one vehicle-record text, and one JPEG/PNG. Caller-supplied material must be synthetic, but ChallanSakshi cannot establish its provenance from an assertion or checkbox. To exercise it locally:

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` locally and keep it server-side.
3. Set `ANALYSIS_ENABLED=true`. Set `SYNTHETIC_UPLOADS_ENABLED=true` only on localhost or in a separately authenticated, access-controlled environment with a curated synthetic corpus—not for citizen documents. `ANALYSIS_ENABLED` gates the adapter; `SYNTHETIC_UPLOADS_ENABLED` separately gates caller-supplied text and image bytes. Bundled fixture analysis does not require the upload switch.
4. Keep `OPENAI_MODEL=gpt-5.4-mini` or choose the other allow-listed model, `gpt-5-mini`, if available to the OpenAI project.
5. Restart the development server.

Then open `/demo/test-lab/operator`. The route renders controls only while both server-side switches are true; in the public deployment it shows a disabled boundary and performs no upload. The controlled UI requires both a synthetic-only attestation and explicit acknowledgement of provider transfer, hides the local filename, sends one bounded PNG/JPEG plus the two separate source texts, validates the returned contract, and opens the same human-confirmed Evidence → Explain → Verify → Act workbench. It does not persist inputs or results.

Those switches are kill switches, not authentication. The page is intentionally described as **controlled**, not private or operator-authenticated. It must not be internet-enabled on the public Worker. A remote operator environment needs server-verified identity protection for both the page and API, rate/concurrency/spend limits, and an incident path before use.

The adapter uses the OpenAI Responses API with image input, `store: false`, no tools, a strict versioned JSON Schema, bounded request and response streams, media signature and dimension checks, a timeout, same-origin checks, source-line reference validation, legal/directive/URL output rejection, and generic failure messages. It returns observations only; TypeScript performs comparison and routing after a human confirms or corrects every displayed field. User text is explicitly treated as untrusted evidence, never as model instructions. The route does not intentionally log the submitted text, image, API key, model response, or upstream error body.

The enabled adapter currently sends the original accepted image bytes to OpenAI. Header and dimension checks do not remove EXIF/XMP/IPTC/GPS metadata or fully canonicalize a decoder input. Caller-supplied model analysis therefore remains blocked in the public deployment until the project has server-side access control, canonical re-encoding/metadata removal, rate and spend controls, and external privacy/security review.

This is **not a zero-retention claim**. OpenAI states that API data is not used to train models by default, while ordinary abuse-monitoring logs may retain content for up to 30 days unless an approved data-control arrangement applies. `store: false` prevents application-state storage but does not by itself remove that abuse-monitoring boundary. See the official [data controls](https://developers.openai.com/api/docs/guides/your-data), [image input](https://developers.openai.com/api/docs/guides/images-vision), and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) documentation. Public arbitrary uploads remain blocked until the project has authentication or attestation enforcement, Turnstile, rate and spend limits, image canonicalization/metadata stripping, a secure incident path, and external privacy/legal review.

## Real-mode and synthetic-data privacy policy

- Real-mode answers, selected document bytes and extracted fields exist only in current page memory. Reload, close, or Quick exit clears the in-app copy; it cannot erase files or copies outside the tab.
- `/review` accepts PDF, JPEG, PNG, and WebP files up to 12 MiB each: one challan copy and one optional vehicle record. The reader checks supported file signatures, pixel limits, at most three pages and a 90-second reading budget. `/manual/challan` retains separate optional record/photo previews.
- A selection receives a temporary object URL for local preview. The document reader extracts PDF text or runs OCR locally; only same-origin reader code/language assets are downloaded. No selected bytes or extracted fields are sent through a server form, `/api/analyze`, or an AI provider. An image preview stays inside the review page; opening a selected PDF creates a separate browser-local tab that Quick Exit cannot close. Replacing, removing, resetting, Quick Exit and leaving the reader release its relevant object URLs and reading work.
- File selection and successful extraction do not authenticate origin. Document fields show source, page, method and reading quality, not government verification. OCR quality scores are not accuracy probabilities.
- Real review components contain no client case storage, cookies, case identifiers in URLs, analytics, or real-case `/api/analyze` path. Bounded raw text is accepted only in the ephemeral message/reply tools. The separate private-device checklist is the explicit limited-storage exception. The document reader accepts bounded field-specific corrections; the manual compatible handoff retains its single controlled description textarea, revision-bound and safety-checked. Neither is submitted by ChallanSakshi. Automated privacy tests permit bounded local reading capabilities while preventing case-data transmission or persistence.
- Real-mode inputs never request CAPTCHA, OTP, Aadhaar/VID, a government/bank/FASTag password, or card/payment credentials. Any official login, identity check, CAPTCHA, OTP, or payment belongs only on the independently opened official service.
- The app’s copy/download/formatted-print controls are disabled in shared-device mode, which attempts to leave the review after about 10 minutes of inactivity. Browser-native print is reduced to a non-sensitive warning, but screenshots, manual selection, browser history, browser extensions, and device backups remain outside the app's control. Browser timer throttling can delay the exit attempt, so Quick Exit remains the required clear action when finished. On a private device, the citizen is warned that clipboard, Downloads, screenshots, print-to-PDF files, browser history, and backups sit outside the app’s clear action.
- Hosting infrastructure necessarily handles technical request data such as IP address, path, browser/device information, timestamps, and security logs to deliver and protect the site. Exact host log retention is not controlled or promised by this project.
- In the bundled synthetic demo and ten bundled Test Lab cases, every name, registration, challan, authority, grievance, date context, image, and outcome is fictional. A custom Test Lab selection is user-supplied; the product instructs the user to choose synthetic material but cannot verify its provenance.
- Bundled demo evidence previews are visibly watermarked **SYNTHETIC DEMO DATA**; user-selected real documents are not relabelled synthetic.
- The generic vehicle data card is intentionally not a replica of an official RC.
- The synthetic prototype warns against entering real identity or vehicle records.
- No public route accepts a real server upload. Source records for `/demo` remain preloaded fictional fixtures; `/review` reads selected documents locally; and the public `/demo/test-lab` custom-image workbench is browser-local and manual. A feature-flagged, policy-limited synthetic model adapter exists in code, but both enabling flags are false in public production and it must never be used with real citizen material.
- No demo submission reaches a government system.
- Document review displays the registration and challan number needed to compare the selected records; its saved note includes these identifiers. Names, addresses, contact details, chassis/engine numbers and credentials are not extracted as fields. The manual and FASTag forms retain masked/minimum identifiers. In the manual handoff, an optional acknowledgement reference remains final-four only on a private device; it never enters comparison, URLs, exports, the field pack, the extension envelope or receipt and is cleared after its controlled action, reset, Quick Exit, inactivity or unmount. CAPTCHA, OTP, Aadhaar/VID and payment credentials are never requested by the app.
- Reset clears local case state and restores the fictional fixtures while keeping the citizen’s Simpler view and text-first preferences.
- Suspicious synthetic text is displayed as inert text; the prototype never fetches or makes its supplied destination clickable.
- Text-first mode prevents the evidence contact sheet from being requested until explicit reveal. Choosing “I could not inspect this image” creates an inconclusive evidence state instead of silently confirming visual facts.
- The designated authority remains the final decision-maker.

## Local setup

Requirements: Node.js 22.13+ and pnpm. This workspace also includes a bundled Node runtime at `/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.

```bash
pnpm install
pnpm run dev
```

Open the local URL printed by the development server (normally `http://localhost:3000`).

## Validation commands

Use the bundled Node runtime for the complete automated gate:

```bash
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vitest run
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/tsc --noEmit
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next
env PATH=/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/vinext build
git diff --check
```

## Deployment

Production is configured as a direct Cloudflare Worker at `challansakshi.sh1rs.com`. The Worker owns only that subdomain, leaves the `sh1rs.com` apex available for the portfolio, disables optional Worker observability, supplies the trusted production origin, and explicitly keeps both synthetic analysis switches off. Its versioned entrypoint returns a hostname-scoped `308` from HTTP to the same HTTPS path and query before invoking Vinext. HTTPS responses set a one-year HSTS policy for this hostname without `includeSubDomains` or preload, so the portfolio apex and future sibling subdomains are not silently enrolled. If an independently access-protected operator environment is later created, add `OPENAI_API_KEY` there only with `wrangler secret put OPENAI_API_KEY`; never place it in `wrangler.jsonc` or bind it to the public Worker.

Deployment is not part of test, typecheck, lint, or build verification. It is a separate external side effect and must be run only after the current build and configuration are verified, Wrangler is authenticated to the correct Cloudflare account, domain ownership is confirmed, and the deployment is explicitly authorised:

```bash
pnpm run deploy:cloudflare
```

For another common host, install dependencies, configure the optional environment variables, and run `pnpm run build`. No persistent service or paid infrastructure is required.

## Known limitations

- The real-mode tools remain a non-public prototype, not a government-ready production service. No secure incident/feedback inbox or external privacy/legal review has been completed; the UI says so rather than hiding the gap.
- Real mode does not authenticate, upload to a ChallanSakshi server, save as a case, or submit the record. `/review` extracts labelled text locally and may misread it; unsupported layouts, blurry text and partial documents require correction or manual fallback. Its neutral note is not the manual flow’s form-compatible grievance pack. `/manual/challan` continues to rely on citizen-confirmed structured answers.
- TollSakshi does not access a bank or NETC system, raise a chargeback, prove fraud/cloning, promise a refund, or treat a current tag status as historical event-time status.
- The October 2025 NETC evidence circular is source-labelled; a newer 2026 duplicate-validation circular appears in the current index, so the product deliberately avoids asserting a definitive duplicate time threshold.
- 1033 is shown only for NHAI FASTag support or a recorded National Highway/NHAI plaza route, never as the universal bank-issued chargeback channel.
- The product does not file, pay, cancel, or legally determine an e-Challan.
- The notice preflight identifies observable warning signs in supplied synthetic text; it does not certify a link as safe, authenticate a notice, detect malware, or prove fraud.
- The Local Evidence Passport is local and synthetic. It is not government-issued identity, official verification, a legal chain of custody, document forensics, or a legal-admissibility assessment.
- Vehicle relationship timing does not identify the driver, complete an official transfer, establish legal ownership, or decide responsibility.
- The resolution desk is an informational router, not a state-specific legal adviser or live status checker.
- Payment reconciliation compares supplied fictional records only; it does not verify a bank or government ledger.
- The Virtual Courts route does not retrieve, list, transfer, or file any real case.
- The government route, designated authority, required declaration, and implementation can vary by state.
- The date boundary convention is an explicit product estimate, not a legal opinion.
- Dynamic three-source model extraction exists in code but is disabled on the public Worker. If deliberately enabled in a controlled environment, it transmits the supplied challan text, vehicle-record text, and original image bytes to OpenAI; it must never receive real personal documents in the current architecture.
- The synthetic core, real e-Challan journey, and Privacy/Safety reading pages offer English and Hindi. The real FASTag flow includes Hindi presentation and notes; independent language review is still outstanding. The FASTag synthetic demo and Test Lab remain English.
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
- [NPCI current NETC circular index](https://www.npci.org.in/circulars/netc)
- [NPCI NETC evidence circular, 28 October 2025](https://www.npci.org.in/uploads/NETC_OC_005_FY_25_26_New_chargeback_reason_codes_in_NRCS_and_guidelines_for_handling_chargebacks_f5b100df97.pdf)
- [NPCI FASTag issuer helpline directory](https://www.npci.org.in/product/netc/netc-fastag-helpline)
- [IHMCL National Highways helpline 1033 scope](https://ihmcl.co.in/24x7-national-highways-helpline-1033-page/)
- [IHMCL FASTag FAQ and grievance guidance](https://ihmcl.co.in/faq/)
- [National Cyber Crime Reporting Portal](https://cybercrime.gov.in/)

The parliamentary answer describes the 45-day action window, supporting-document requirement, 30-day resolution period for a properly contested challan, reasoned rejection, and state-specific submission mechanism. The amended rule describes the post-rejection choice and deposit condition, while leaving the manner state-specific. The official portals document pending-transaction checks, the warning against paying on both e-Challan and Virtual Courts, court-request handoff, alternative verification, and receipt reprint. Every screen keeps the official-service verification step visible.

## How Codex was used meaningfully

Codex helped turn a tightly scoped civic problem into a working product: it separated AI observations from deterministic clocks and routes; built the bilingual evidence, Passport, custody-timeline, case-ledger, and order-review journey; typed and tested correction provenance, stable submission revisions, warning-signal precedence, citation validation, and refusal states; generated wholly synthetic visual assets; verified official-source wording; and exercised the complete flow through desktop and 360 px browser QA. Human verification remains intentional: no model observation, notice keyword, custody interval, order mapping, or route match silently becomes a legal conclusion or official action.

For the document-first update, Codex implemented the local PDF/OCR runtime, pure labelled-field parser, independent-source comparison and targeted correction flow. Test-first adversarial review caught unsafe inference from duplicate document bytes and uncertainty handling; source fingerprints now prevent a notice from serving as its own independent vehicle record, even after corrections. This implementation record is not a claim that the current tree has been deployed or that final browser acceptance has passed; release evidence must identify the exact tested and deployed revision.
