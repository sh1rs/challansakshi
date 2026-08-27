# ChallanSakshi · चालान साक्षी

**Evidence before action.**

ChallanSakshi is an independent, evidence-first prototype for citizens who receive an e-Challan whose supplied photograph may show a different vehicle or may not clearly support the allegation. It helps a citizen review the supplied evidence, verify each extracted fact, see a deterministic deadline estimate, prepare an indexed contest pack, and follow a fully simulated case to a reasoned outcome.

> Independent Build What Moves India hackathon prototype. Not affiliated with MoRTH, Parivahan, traffic police, or any court. Synthetic demo data only. Not legal advice.

## The exact citizen problem

A camera-generated challan can contain a blurry plate, an image of a different category or colour of vehicle, or a photograph that does not visibly establish the alleged offence. The citizen then has to decide which details matter, gather supporting material, draft a factual grievance, and act before a procedural deadline.

The official e-Challan portal already supports checking a challan, raising a grievance, and checking grievance status. ChallanSakshi does not replace or imitate those functions. It adds the missing evidence-understanding layer before a citizen acts:

1. Read the challan and supplied records.
2. Compare image observations with a citizen-verified vehicle record.
3. Show each inconsistency or limitation with its source.
4. Require the citizen to confirm or correct every extracted fact.
5. Calculate indicative clocks with deterministic TypeScript.
6. Build an indexed, factual pack from confirmed information only.
7. Refuse to manufacture a dispute when the records appear consistent.

## What is working

- A complete mobile-first seven-step journey with sensible browser back/forward behaviour.
- Refresh persistence for current demo step, selected fixture, verified facts, and tracking state.
- Three typed synthetic fixtures:
  - **Case A:** blue scooter record versus white motorcycle image → possible vehicle mismatch.
  - **Case B:** unreadable image and unassessable allegation → inconclusive evidence.
  - **Case C:** registration, category, colour, and visible allegation align → no material mismatch; no accusatory pack.
- Source-linked editable facts and an explicit human-confirmation gate.
- Pure, tested rules for contest windows, authority-response windows, evidence classification, readiness, actions, and state transitions.
- Evidence readiness separated into citizen-supplied, authority-held, and optional items.
- English and plain-human Hindi across the core flow.
- An indexed, print-friendly contest or clarification pack generated from confirmed facts only.
- A clearly fictional grievance reference, full tracking timeline, and three switchable reasoned outcomes.
- Optional Responses API vision extraction with strict Structured Outputs and a reliable precomputed fallback.
- Accessible labels, visible focus states, reduced-motion support, 360 px layout support, and large touch targets.

## Architecture

```text
app/page.tsx
  └─ components/ChallanSakshiApp.tsx     UI, localization, persistence, demo flow
       ├─ lib/fixtures.ts                 typed synthetic records and precomputed analysis
       └─ lib/domain.ts                   pure date, evidence, readiness, and state rules

app/api/analyze/route.ts                  optional Responses API image extraction
tests/domain.test.ts                      deterministic rule coverage
public/evidence-contact-sheet.png         synthetic evidence photography
public/og.png                             social preview
```

The application uses the Sites Next-compatible scaffold (React 19, TypeScript, Vinext/Vite, Tailwind CSS runtime, Cloudflare Worker-compatible ESM output). There is no account system, database, payment, real filing, or live government integration.

### AI versus deterministic rules

> **AI reads and explains evidence. Deterministic rules control dates, completeness, and case states.**

AI is limited to source-linked observations such as visible plate characters, category, colour, image clarity, and whether a visual fact is assessable. It is explicitly instructed not to decide guilt, innocence, legality, deadlines, strategy, or outcome.

Normal TypeScript code handles:

- the indicative 45-day contest clock;
- the 30-day authority-response clock;
- evidence completeness;
- mismatch/inconclusive/consistent classification after confirmation;
- allowed case transitions and available actions;
- outcome display.

The product treats the issue date as Day 0 and displays D+45 as an **indicative, provisionally included deadline day**. The acknowledgement date is Day 0 for the D+30 authority boundary. The source does not settle cutoff time, holiday rollover, or every state implementation, so the interface labels these dates as estimates and always directs the citizen to verify the official portal.

## Optional live OpenAI analysis

The complete journey works without an API key. To enable the optional “Re-run AI analysis” control:

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` locally.
3. Set `OPENAI_MODEL` to a vision-capable Responses API model available to your OpenAI project. The app deliberately does not hard-code an unverified model.
4. Restart the development server.

The route uses the OpenAI Responses API with image input, `store: false`, and a strict JSON Schema. It validates the request and the returned object before any observation reaches the UI. It does not log image data or raw document contents. If configuration, network, model access, or validation fails, the UI keeps the typed fixture and shows **Precomputed fallback active**.

## Synthetic-data and privacy policy

- Every name, registration, challan, authority, grievance, date context, image, and outcome is fictional.
- Evidence previews are visibly watermarked **SYNTHETIC DEMO DATA**.
- The generic vehicle data card is intentionally not a replica of an official RC.
- The prototype warns against uploading real identity or vehicle records.
- Replacement inputs accept PNG, JPG, WebP, or PDF up to 5 MB and are kept only as the current in-memory file selection; raw file contents are not placed in local storage.
- No demo submission reaches a government system.
- Reset clears local demo state and restores the fictional fixtures.
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
- The government route, designated authority, required declaration, and implementation can vary by state.
- The date boundary convention is an explicit product estimate, not a legal opinion.
- Live analysis covers the synthetic demonstration image; real personal documents are intentionally outside this prototype’s scope.
- Hindi is provided for the complete core flow, while a few synthetic identifiers and source codes remain in English for recognisability.
- Simulated authority outcomes do not represent a prediction or guarantee.

## Official sources

- [Build What Moves India](https://buildwhatmovesindia.com/)
- [Rajya Sabha Unstarred Question No. 3764, answered 25 March 2026](https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars)
- [Official NextGen e-Challan portal](https://echallan.parivahan.nic.in/)
- [OpenAI Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create)

The parliamentary answer describes the 45-day action window, supporting-document requirement, 30-day resolution period for a properly contested challan, reasoned rejection, and state-specific submission mechanism. The portal confirms that grievance and status functions already exist and that configuration can vary across states and departments.

## How Codex was used meaningfully

Codex helped turn a tightly scoped civic problem into a working product: it separated AI observations from deterministic legal clocks, drafted and tested the domain state machine, built the bilingual evidence-review journey, generated wholly synthetic visual assets, verified official-source wording, and exercised the end-to-end flow through browser-based responsive QA. Human verification remains an intentional part of the product itself: no model observation silently becomes a conclusion.

