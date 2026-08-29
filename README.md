# ChallanSakshi · चालान साक्षी

**Evidence before action.**

ChallanSakshi is an independent, evidence-first citizen project built around one discipline: **inspect the official record, separate observation from conclusion, refuse unsupported claims, and hand the citizen a conservative next-step checklist.** The flagship synthetic journey asks whether a challan’s own evidence, timestamp, vehicle-relationship record, and case state agree. The public routes keep the real citizen tools separate from that synthetic walkthrough:

- `/` — the clean citizen homepage and bounded goal chooser;
- `/review` — a tab-memory-only e-Challan review with deliberate local record preview, citizen-confirmed structured facts, conservative findings, and exact official handoff;
- `/fastag` — TollSakshi, a structured FASTag transaction reconciler with a Transaction-to-Journey Map and TP1–TP14 Toll Evidence Passport; and
- `/demo` — the isolated, fully synthetic hackathon walkthrough and its fictional fixtures; and
- `/demo/test-lab` — a ten-case synthetic evidence laboratory that recomputes every result from editable record and observation fields.

Synthetic state remains sealed inside the demo routes. The flagship walkthrough carries one frozen Local Evidence Passport from source review to contest pack, fictional response, Order-to-Evidence Review, and neutral clarification note. The Test Lab proves that the comparison engine is not a blue-scooter/white-motorcycle script: ten different vectors and citizen edits pass through the same normalization, comparison, confirmation, and routing functions.

> Independent public-interest early access. Not affiliated with MoRTH, Parivahan, traffic police, courts, NPCI, banks, or toll operators. It does not file, pay, authenticate, give legal advice, or guarantee an outcome. `/review` can preview citizen-selected files browser-locally, but it does not upload them to a ChallanSakshi server or AI model. Opening a selected PDF creates a separate browser-local tab that the citizen must close.

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

- A hard-separated **real e-Challan manual review** that starts with an exact official-service handoff, accepts deliberate local selection of one official record and one supplied image, requires citizen-confirmed structured observations, refuses a message-only comparison, treats colour alone as non-action-ready, uses only a deadline copied from an official service, and generates a local citizen evidence summary.
- **TollSakshi**, a recorded-FASTag-transaction self-review for unrecognised crossings, citizen-reported two-debit patterns, alternate payment, fare/class, pass/discount, and aligned-record checks. It distinguishes reader-read, debit-post, and SMS times; separates bank-issued from bank-neutral NHAI FASTag routes; applies no definitive duplicate-time threshold; and withholds an action note unless the final same-transaction attestation still matches every compared field. Tag-not-working and plaza/road incidents without a recorded debit are deliberately routed to the separate Safety page rather than forced through this transaction workflow.
- A 14-element **Toll Evidence Passport** and **Transaction-to-Journey Map** covering vehicle identity, event time, plaza/direction, crossings, amount/class, alternate payment/pass, and credit adjustment.
- Real-mode state is held only in React memory. It never enters localStorage, sessionStorage, cookies, URLs, forms, `/api/analyze`, analytics, or a case database. Shared-device mode disables the app’s copy/download controls, provides Quick exit & clear, and attempts to leave after about 10 minutes without pointer, keyboard, input, or touch activity; the UI does not claim a background browser timer is infallible.
- Every action-bearing real-mode artifact has two gates: a pure domain rule and a UI gate. Aligned, already-credited, unverified, incomplete, court, and unknown-jurisdiction outcomes cannot render or download a dispute request.
- The real e-Challan journey and the Privacy/Safety reading pages offer English and Hindi. FASTag remains English-only until its complete decision and artifact language finishes Hindi safety review. The synthetic core remains bilingual.
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
- No real-document server-upload or raw-paste surface. `/review` permits only deliberate local preview and says “your observation”; it performs no OCR and never masquerades as model extraction. The flagship demo remains visibly synthetic.
- Accessible labels, visible focus states, reduced-motion support, 360 px layout support, and large touch targets.

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

app/review/page.tsx                        real e-Challan manual self-review
app/fastag/page.tsx                        TollSakshi FASTag transaction review
app/privacy/page.tsx                       implementation-matched data controls
app/safety/page.tsx                        verified official-route registry
components/public-beta/                    isolated real-mode shell and workflows
components/public-beta/LocalRecordIntake.tsx deliberate local PDF/image intake
lib/local-record-intake.ts                 MIME and 12 MiB local-file validation
lib/evidence-intelligence.ts               citizen evidence view, timeline, and summary
lib/public-challan.ts                      conservative citizen-observation rules and artifact
lib/toll-domain.ts                         FASTag assessment, Passport, routes, and artifact
lib/toll-fixtures.ts                       three wholly fictional TollSakshi examples
tests/public-challan.test.ts               real-mode refusal and deadline rules
tests/toll-domain.test.ts                  toll reconciliation and refusal rules
tests/public-mode-privacy.test.ts          static network/storage/upload/form isolation gate
tests/synthetic-evidence-pipeline.test.ts  reusable comparator and ten-case evaluation corpus
tests/synthetic-lab-state.test.ts          confirmation, invalidation, and recomputation rules
tests/synthetic-lab-file.test.ts           local-preview file boundary
tests/test-lab-contracts.test.ts           UI, mobile, privacy, and accessibility contracts
tests/analyze-route.test.ts                route gates, media validation, schema, and safe failures
```

The application uses React 19, TypeScript, Vinext/Vite, Tailwind CSS runtime, and direct Cloudflare Worker-compatible ESM output. There is no account system, case database, payment, real filing, or live government/bank integration. Authorised government API access is a future connector boundary only and is not implemented. Synthetic demo state is separately persisted under its V5 fixture-only contract; real-mode answers and files are never passed into that contract.

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

- Real-mode answers exist only in the current page’s in-memory React state. Reload, close, or Quick exit clears them from the app.
- `/review` accepts PDF, JPEG, PNG, and WebP files up to 12 MiB each: at most one official record and one supplied image at a time. Validation uses the browser-provided MIME type rather than trusting the filename extension.
- A valid selection receives a temporary object URL for browser-local preview and is not sent through `fetch`, XHR, beacon, a server form, `/api/analyze`, or an AI model. This release performs no OCR. An image preview stays inside the review page; opening a selected PDF creates a separate browser-local tab that Quick Exit cannot close, so the citizen must close that PDF tab. Replacing, removing, resetting, Quick Exit, and unmounting release the app's relevant object URL.
- File selection does not authenticate origin. Source and confidence labels remain citizen-provided observations, never government verification.
- Real-mode components contain no client case storage, cookies, case identifiers in URLs, raw-textarea, analytics, or real-case `/api/analyze` path. Automated privacy tests lock this boundary while permitting the dedicated local file input.
- Real-mode inputs never request CAPTCHA, OTP, Aadhaar/VID, a government/bank/FASTag password, or card/payment credentials. Any official login, identity check, CAPTCHA, OTP, or payment belongs only on the independently opened official service.
- The app’s copy/download/formatted-print controls are disabled in shared-device mode, which attempts to leave the review after about 10 minutes of inactivity. Browser-native print is reduced to a non-sensitive warning, but screenshots, manual selection, browser history, browser extensions, and device backups remain outside the app's control. Browser timer throttling can delay the exit attempt, so Quick Exit remains the required clear action when finished. On a private device, the citizen is warned that clipboard, Downloads, screenshots, print-to-PDF files, browser history, and backups sit outside the app’s clear action.
- Hosting infrastructure necessarily handles technical request data such as IP address, path, browser/device information, timestamps, and security logs to deliver and protect the site. Exact host log retention is not controlled or promised by this project.
- In the bundled synthetic demo and ten bundled Test Lab cases, every name, registration, challan, authority, grievance, date context, image, and outcome is fictional. A custom Test Lab selection is user-supplied; the product instructs the user to choose synthetic material but cannot verify its provenance.
- Evidence previews are visibly watermarked **SYNTHETIC DEMO DATA**.
- The generic vehicle data card is intentionally not a replica of an official RC.
- The synthetic prototype warns against entering real identity or vehicle records.
- No public route accepts a real server upload. Source records for `/demo` remain preloaded fictional fixtures; `/review` previews deliberate local selections in tab memory; and the public `/demo/test-lab` custom-image workbench is browser-local and manual. A feature-flagged, policy-limited model adapter exists in code, but both enabling flags are false in public production and it must never be used with real citizen material.
- No demo submission reaches a government system.
- No full registration or transaction reference is requested; real mode accepts only last-four suffixes. OTP, Aadhaar, engine numbers, and chassis numbers are never requested.
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

Use the bundled Node runtime for reproducible repository verification:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vinext/dist/cli.js build
```

## Deployment

Production is configured as a direct Cloudflare Worker at `challansakshi.sh1rs.com`. The Worker owns only that subdomain, leaves the `sh1rs.com` apex available for the portfolio, disables optional Worker observability, supplies the trusted production origin, and explicitly keeps both synthetic analysis switches off. Its versioned entrypoint returns a hostname-scoped `308` from HTTP to the same HTTPS path and query before invoking Vinext. HTTPS responses set a one-year HSTS policy for this hostname without `includeSubDomains` or preload, so the portfolio apex and future sibling subdomains are not silently enrolled. If an independently access-protected operator environment is later created, add `OPENAI_API_KEY` there only with `wrangler secret put OPENAI_API_KEY`; never place it in `wrangler.jsonc` or bind it to the public Worker.

Deployment is not part of test, typecheck, lint, or build verification. It is a separate external side effect and must be run only after the current build and configuration are verified, Wrangler is authenticated to the correct Cloudflare account, domain ownership is confirmed, and the deployment is explicitly authorised:

```bash
pnpm run deploy:cloudflare
```

For another common host, install dependencies, configure the optional environment variables, and run `pnpm run build`. No persistent service or paid infrastructure is required.

## Known limitations

- The real-mode tools are public-interest early access, not a government-ready production service. No secure incident/feedback inbox or external privacy/legal review has been completed; the UI says so rather than hiding the gap.
- Real mode does not authenticate, upload to a ChallanSakshi server, save as a case, or submit the record. `/review` locally previews a deliberate file selection but performs no OCR; every result is based only on citizen-confirmed structured answers and may be wrong if those answers are incomplete or mistaken.
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
- The synthetic core, real e-Challan journey, and Privacy/Safety reading pages offer English and Hindi. FASTag remains English-only until its complete rule, consent, decision, and artifact language receives Hindi safety review.
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
