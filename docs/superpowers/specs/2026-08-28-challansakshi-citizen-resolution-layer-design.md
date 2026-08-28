# ChallanSakshi Citizen Evidence and Resolution Layer — Design Specification

**Status:** Approved for implementation on 28 August 2026  
**Product:** ChallanSakshi at `challansakshi.sh1rs.com`  
**Primary surface:** real citizen e-Challan assistance  
**Secondary surface:** FASTag assistance  
**Synthetic showcase:** isolated at `/demo`

## 1. Outcome

ChallanSakshi becomes a citizen-side evidence and resolution layer rather than a photo-mismatch demo. A citizen can:

1. independently open the relevant official service;
2. deliberately bring a downloaded challan print, receipt, screenshot, or supplied photograph into the browser;
3. inspect that record beside structured questions without the source file leaving the device;
4. record and confirm facts, observations, sources, confidence, and limitations;
5. receive a conservative deterministic situation assessment;
6. create a local citizen evidence summary; and
7. continue to the appropriate official service for payment, clarification, contest, grievance, or Virtual Court action.

The release does not claim to retrieve government records automatically. The code establishes an explicit connector boundary for a future authorised MoRTH/NIC or participating-authority integration, but no citizen-facing control may imply that such a connector is active.

## 2. Binding product promise

> ChallanSakshi helps you understand and organise the challan records and evidence you choose to provide. It does not log in to government portals, solve CAPTCHAs, receive OTPs, process payments, or automatically retrieve enforcement records or photographs.

The product must never say that:

- a challan is illegal;
- a citizen is innocent or legally not liable;
- a user-provided copy has been authenticated by ChallanSakshi;
- ChallanSakshi is connected to Parivahan, a state traffic authority, or Virtual Courts;
- a grievance, contest, payment, or court response was submitted or accepted when no authorised integration returned an acknowledgement; or
- confidence in an observation proves the authenticity of the source document.

## 3. Current and future access boundary

### 3.1 Available now: official handoff plus deliberate local import

The citizen:

- selects the service or jurisdiction they recognise;
- opens an exact official destination in a new browser tab;
- completes lookup, CAPTCHA, OTP, identity verification, or payment only on that official service;
- returns to ChallanSakshi;
- deliberately selects a PDF or supported image, adds a supplied photograph, or enters facts manually; and
- confirms all facts before the result engine uses them.

The selected source file:

- is held only in React/browser memory;
- is previewed with a temporary object URL;
- is never passed to `fetch`, XHR, `sendBeacon`, a server action, `/api/analyze`, localStorage, sessionStorage, IndexedDB, cookies, URL state, analytics, or logging;
- is released with `URL.revokeObjectURL` when replaced, removed, the flow is reset, Quick Exit is used, or the component unmounts; and
- is not embedded automatically in the downloaded case summary.

### 3.2 Future only: authorised government connector

The production domain model may define an `authorised-government-api` acquisition mode. It remains unavailable unless all of the following are true:

- a qualifying authority sponsors the integration;
- MoRTH/NIC or the relevant state authority approves the exact purpose and fields;
- connector credentials and infrastructure are configured outside the browser;
- evidence-media access is approved separately when photographs or video are required;
- consent, access control, audit, retention, deletion, incident response, and processor agreements are implemented; and
- a returned official acknowledgement can be distinguished from citizen-entered state.

No inactive or “coming soon” connector control appears in the normal citizen journey. The boundary is documented only in product transparency and engineering documentation.

### 3.3 Prohibited approaches

The product must not:

- scrape authenticated or CAPTCHA-gated government pages;
- call undocumented portal endpoints as if they were public APIs;
- solve, proxy, replay, crowdsource, or request a CAPTCHA;
- request, store, relay, or auto-fill OTPs, Aadhaar or VID details, government passwords, departmental credentials, card data, UPI PINs, CVVs, or banking/FASTag passwords;
- read another authenticated browser tab;
- silently inspect the Downloads folder;
- enumerate vehicle, challan, court, or identity records; or
- automate payment, filing, grievance, or court action.

## 4. Information architecture

```text
/                         clean citizen homepage
├── /review               real e-Challan guided self-review
├── /fastag               real FASTag reconciliation
├── /demo                 existing synthetic hackathon walkthrough
├── /privacy              exact data-handling explanation
├── /safety               official-source and anti-scam guidance
├── /manual/challan       compatibility alias for /review
└── /toll                 compatibility alias for /fastag
```

The current synthetic `ChallanSakshiApp` moves intact behind `/demo`. Its fixture state, simulated authority actions, synthetic evidence passport, case ledger, order map, localStorage, and optional synthetic analysis endpoint must not become dependencies of `/`, `/review`, or `/fastag`.

## 5. Citizen homepage

### 5.1 Above-the-fold visible-copy lock

Header:

- `ChallanSakshi`
- `English`
- `Simple mode`
- `Privacy`
- `Hackathon demo`

Hero:

- Heading: `What happened with your challan?`
- Supporting sentence: `Verify the record, understand the notice, check the evidence, and continue through the correct official service.`

Primary task choices:

1. `Verify`
   - `Is this challan actually connected to you or your vehicle?`
   - `Find the official record`
2. `Understand`
   - `What does this notice, status, or Virtual Court update mean?`
   - `Explain my situation`
3. `Check evidence`
   - `Does the supplied evidence agree with the record and your vehicle?`
   - `Compare the evidence`
4. `Resolve`
   - `What is the safest official next step?`
   - `Show my next step`

Each task choice enters `/review` with a non-sensitive goal value: `verify`, `understand`, `evidence`, or `resolve`. The goal may affect introductory copy but may not skip safety, source verification, or citizen-confirmation gates.

No eyebrow, pretitle, badge, metric, login control, file input, government affiliation claim, or demo fixture appears above the fold.

### 5.2 Downstream homepage sections

The section order is:

1. situation rail;
2. three-step service journey;
3. privacy band;
4. FASTag doorway; and
5. compact footer.

Situation links:

- `I do not recognise this challan`
- `The photograph may show another vehicle`
- `I already paid`
- `My grievance was rejected`
- `My case moved to Virtual Court`

Service journey:

1. `Open the official service`
2. `Bring back your record`
3. `Review before acting`

Privacy band communicates:

- no government password;
- no CAPTCHA or OTP;
- no Aadhaar details;
- no payment credentials;
- documents stay on the device by default;
- nothing is uploaded without a separate future product decision; and
- payments and submissions happen only on official services.

FASTag doorway:

- Heading: `Have a FASTag transaction problem instead?`
- Body: `Compare the plaza record, issuer transaction, debit status, and the appropriate official escalation route.`
- Action: `Go to FASTag help`

## 6. Guided real e-Challan journey

The four top-level stages are:

1. `Start safely`
2. `Get official record`
3. `Check the evidence`
4. `Decide and resolve`

The guided instruction block remains at the top of every stage and contains:

- step number and stage name;
- `Do this now`;
- `Why this matters`;
- `STATUS`; and
- `NEXT`.

Moving between stages focuses the guided heading. Back and next actions are explicit. Quick Exit performs a same-origin full navigation to `/`, clearing memory-only state.

### 6.1 Stage 1: Start safely

Required questions:

- Who is reviewing the case: the citizen, or a helper while the citizen is present?
- Is the device private, or shared/public?
- Does the citizen understand that the tool is a manual self-review and not government verification?
- Will only the minimum necessary information be entered?

A helper cannot finalise a result until the citizen confirms the current review state. On a shared/public device, download, copy, print, and persistent convenience features remain disabled.

### 6.2 Stage 2: Get official record

Dominant instruction copy:

- `STEP 2 OF 4 · GET THE OFFICIAL RECORD`
- `Open the official record yourself. Then bring back the challan print, receipt, screenshot, or supplied photograph.`
- `A message or forwarded link alone does not verify the record. ChallanSakshi never needs your government password, CAPTCHA, OTP, Aadhaar details, or payment credentials.`
- Status before completion: `Official source and record still needed`
- Next: `Confirm every extracted fact before comparing evidence.`

Part A — `Open the official service`:

- `National e-Challan`
- `State or UT traffic service`
- `Virtual Court`
- `I am not sure`

Only exact, independently maintained official URLs may be opened. The app does not construct a URL using full identifiers and does not copy a message URL.

Part B — `Bring the record back`:

- `Share or choose the downloaded record`
- `Take or add the supplied photograph`
- `Enter the essential facts yourself`

Accepted local file types in this release:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`

Limits:

- maximum 12 MiB per selected file;
- at most one official-record file and one supplied-evidence image at a time;
- reject empty, unsupported, or oversized files before creating a preview URL;
- do not infer MIME type solely from the filename extension; and
- make remove/replace controls obvious.

The release previews the selected record locally; it does not promise OCR. Facts are entered or confirmed by the citizen beside the preview. The interface must never describe a manual fact as model-extracted.

Local-processing receipt before a file is chosen:

- `Nothing has left this device`
- `Government login information · never collected`
- `Selected record · not yet chosen`
- `Server upload · off`
- `Saved case · off`

After selection, only the selected file name, category, human-readable size, preview readiness, and memory-only status may be displayed.

### 6.3 Stage 3: Check the evidence

The selected record/evidence preview appears beside structured fields on desktop and above the fields on mobile. The citizen records:

- source status;
- jurisdiction type and label;
- masked vehicle suffix only;
- alleged offence category;
- displayed event date;
- displayed official deadline, when present;
- whether an evidence image was supplied;
- plate observation;
- vehicle-category observation;
- colour observation;
- offence visibility;
- timestamp visibility;
- location visibility;
- own comparison-record availability;
- notice-copy availability; and
- custody-record availability.

Every displayed fact or observation includes:

- value or status;
- source label;
- acquisition method;
- confidence;
- citizen-confirmation status; and
- limitation when applicable.

Confidence values are `high`, `medium`, `low`, or `inconclusive`. In the initial manual release, citizen-entered facts use `citizen-recorded` as acquisition method, and confidence reflects visibility selected by the citizen. The UI explicitly says that confidence does not authenticate a document.

### 6.4 Stage 4: Decide and resolve

The deterministic engine produces one of these situation families:

- `source-not-verified`
- `insufficient-review`
- `records-appear-consistent`
- `evidence-unclear`
- `material-inconsistency-recorded`
- `payment-reconciliation-needed`
- `virtual-court-handoff`

Rules inherited from the current real-mode engine remain binding:

- message-only or unselected source blocks comparison readiness;
- an evidence image must be inspected before a vehicle-mismatch worksheet is prepared;
- a readable own-vehicle record is required before a plate or category conflict becomes action-ready;
- colour alone cannot create an action-ready vehicle mismatch;
- a still image may be unable to establish an alleged offence;
- a consistent plate and category cannot produce a fabricated mismatch request; and
- unclear evidence supports only clarification-oriented language.

The result surface shows:

- situation heading and plain-language explanation;
- `What we can establish`;
- `What remains unclear`;
- source/confidence rows;
- evidence still needed;
- citizen-recorded timeline;
- currently permitted next action;
- local case-summary controls; and
- exact official handoff.

## 7. Evidence Intelligence architecture

The system uses source-specific adapters and a shared result contract. It does not build a separate AI product per service, and it does not force e-Challan and FASTag into the same input schema.

```ts
export type EvidenceAcquisition =
  | 'citizen-recorded'
  | 'local-file-preview'
  | 'local-parser'
  | 'authorised-government-api';

export type EvidenceConfidence = 'high' | 'medium' | 'low' | 'inconclusive';
export type ConfirmationStatus = 'unconfirmed' | 'confirmed' | 'corrected';

export interface EvidenceSourceRef {
  id: string;
  label: string;
  kind: 'official-record-copy' | 'enforcement-image' | 'vehicle-record' | 'payment-record' | 'citizen-statement';
  acquisition: EvidenceAcquisition;
  authenticity: 'authorised-connector' | 'citizen-declared-origin' | 'unknown';
}

export interface EvidenceObservation {
  id: string;
  field: string;
  value: string;
  sourceId: string;
  confidence: EvidenceConfidence;
  confirmation: ConfirmationStatus;
  limitation?: string;
}

export interface EvidenceConflict {
  id: string;
  leftObservationId: string;
  rightObservationId: string;
  reason: 'registration' | 'vehicle-category' | 'colour' | 'offence-visibility' | 'timestamp' | 'location' | 'payment-status' | 'custody';
  materiality: 'context-only' | 'needs-clarification' | 'material';
}
```

The shared layer is responsible only for source registration, observation presentation, confirmation state, limitations, conflict representation, and permitted action output. Domain-specific deterministic functions remain responsible for e-Challan and FASTag classification.

## 8. Citizen-recorded timeline

Timeline entries use actor-specific language:

- `You started a private review`
- `You opened the official service`
- `You selected a downloaded record`
- `You confirmed the record source`
- `You recorded an evidence observation`
- `You generated a local case summary`
- `You recorded an official acknowledgement`

Without an authorised connector, no entry may say that an authority updated, received, accepted, rejected, or quashed a case. The citizen can record an official outcome manually, and the timeline must label it as citizen-recorded.

The timeline is memory-only in the real flow. It is included in the local summary only when the citizen deliberately downloads or prints that summary on a private device.

## 9. Citizen evidence summary

The summary contains:

1. masked/minimised case details;
2. source register;
3. selected file metadata, never the file bytes;
4. citizen-confirmed facts and observations;
5. confidence and limitations;
6. material conflicts and unresolved questions;
7. missing-evidence checklist;
8. citizen-recorded timeline;
9. neutral factual statement;
10. safe next action;
11. exact official destination; and
12. the disclaimer below.

Required disclaimer:

> Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.

Private-device actions:

- download the text summary;
- copy the summary;
- print or use the browser’s Save as PDF function; and
- return to the exact official service.

Shared/public-device behavior:

- no download;
- no copy button;
- no print action;
- persistent warning that screenshots, browser downloads, clipboard history, and device backups are outside ChallanSakshi’s control; and
- Quick Exit remains visible.

## 10. Language and Simple Mode

English and Hindi remain the only languages displayed as available until the complete safety, privacy, limitation, result, and action copy is translated and reviewed. The architecture must use a language dictionary rather than branching rule logic.

Simple Mode changes only presentation copy, density, and sentence complexity. It must not change:

- source requirements;
- evidence thresholds;
- confidence;
- deadlines;
- classification;
- available actions; or
- privacy behavior.

Examples:

- Standard: `Registration observation is inconclusive.`
- Simple: `The number plate is not clear enough to read.`
- Standard: `A material inconsistency was recorded.`
- Simple: `The photo and your vehicle record do not appear to match.`

## 11. Visual design system

Visual references:

- `docs/superpowers/specs/assets/challansakshi-citizen-home-desktop.png`
- `docs/superpowers/specs/assets/challansakshi-official-record-intake-desktop.png`
- `docs/superpowers/specs/assets/challansakshi-mobile-home-and-intake.png`

The written copy and behavior in this specification override accidental text, dates, or unsupported details in generated concepts. The concepts govern composition, hierarchy, rhythm, palette, typography character, border treatment, icon weight, and responsive behavior.

### 11.1 Tokens

- main background: true white `#FFFFFF`;
- ink: deep navy around `#081A3A`;
- muted text: cool slate around `#526075`;
- primary civic teal: around `#067B76`;
- dark teal: around `#075650`;
- action marigold: around `#E59A00`;
- pale teal surface: around `#EFF8F6`;
- pale amber surface: around `#FFF8E8`;
- rules/borders: cool gray around `#D6DCE5`;
- error/stop: restrained brick around `#9A403A`;
- radii: 10–14px for controls and purposeful frames;
- shadows: minimal and never the primary separator;
- focus ring: clearly visible teal or navy with at least 3px apparent thickness.

### 11.2 Typography

- headings: editorial serif or the existing high-quality serif stack;
- navigation, body, labels, and controls: clean sans-serif;
- large desktop heading: approximately 58–70px where space permits;
- mobile heading: approximately 38–44px;
- body: 16–18px desktop and no less than 16px for essential mobile copy;
- control text: deliberately set, at least 14px desktop and 16px for primary mobile actions;
- compact metadata may be smaller only when non-essential and still legible.

### 11.3 Composition

- open rows, rails, and bands are preferred over nested cards;
- the four homepage tasks form a connected evidence trail;
- only one task may be visually selected at a time;
- borders and whitespace carry hierarchy;
- icons use consistent 1.75–2px outline weight and communicate real meaning;
- no stock photos, government seals, tricolour cliché, glassmorphism, decorative blobs, neon glow, generic bento dashboard, fake metrics, or filler illustration;
- all interactive text remains code-native; and
- motion is restrained, clarifies state, and respects `prefers-reduced-motion`.

### 11.4 Responsive behavior

Desktop:

- maximum content width approximately 1240–1320px;
- the four tasks remain open horizontal rows;
- official-service and local-import sections may sit side by side;
- evidence preview and structured fields may use a two-column comparison.

Mobile:

- task choices become full-width stacked rows;
- no horizontal page scroll;
- progress becomes `Step N of 4` plus a compact visual rule;
- guided instruction content stacks in reading order;
- preview appears above structured fields;
- primary actions are full width and at least 48px high;
- Quick Exit remains reachable; and
- the privacy receipt remains visible without clipping the final action.

## 12. Security and privacy invariants

The real citizen surfaces must have automated source-level guards that reject:

- `fetch`, XMLHttpRequest, and `sendBeacon` in local intake and real-case modules;
- `/api/analyze` imports or calls;
- localStorage, sessionStorage, IndexedDB, cookies, or Cache API case persistence;
- file or case data in URLs;
- HTML forms that can submit to a server;
- raw government credentials or sensitive-financial input names;
- third-party analytics or session replay on case screens; and
- rendering user-controlled HTML.

Permitted browser APIs are limited to deliberate local behavior such as `URL.createObjectURL`, `URL.revokeObjectURL`, Blob-based local summary download, clipboard after an explicit private-device action, and `window.print` after an explicit private-device action.

Provider infrastructure may receive ordinary technical request metadata for page requests. Product copy must not claim that the hostname removes provider logs or network metadata.

## 13. Testing and release gates

### 13.1 Domain tests

Test:

- supported and unsupported local files;
- empty and oversized files;
- deterministic source readiness;
- confidence and confirmation mappings;
- vehicle-conflict readiness with and without a readable own record;
- colour-only conflict refusal;
- unclear-evidence clarification route;
- consistent-evidence refusal to manufacture a dispute;
- timeline actor language;
- summary disclaimer and minimised details; and
- shared-device export refusal.

### 13.2 Privacy tests

Every real-mode file must be included in the privacy isolation scan. Tests must confirm that local file selection is permitted only in the dedicated local intake component while network send, persistence, server submission, raw-paste, unsafe HTML, and prohibited credentials remain absent.

### 13.3 Project verification

Required fresh commands before completion:

- complete Vitest suite;
- TypeScript typecheck;
- ESLint;
- production build;
- whitespace/diff check; and
- Cloudflare deployment-configuration test.

### 13.4 Browser QA

Browser/IAB is the primary verification path. Verify:

- `/` at desktop and mobile widths;
- `/review` from each goal entry;
- private-device file selection, preview, replace, and remove;
- unsupported and oversized local-file errors;
- no relevant console warnings or errors;
- Quick Exit clears the real flow;
- source, evidence, and result gating;
- summary download/copy/print on a private device;
- shared-device export refusal;
- `/demo` remains explicitly synthetic;
- `/fastag` remains functional; and
- `/privacy` and `/safety` match implemented behavior.

Final visual verification compares the generated concepts and current browser screenshots with a fidelity ledger covering at least copy, hierarchy, typography, palette, container model, icons, responsive behavior, and interaction state.

## 14. Deployment boundary

Local implementation, tests, and browser QA precede any publish action. Deployment is a separate external side effect and uses the existing Cloudflare Workers configuration only after:

- the working tree’s relevant changes are understood;
- the build output is current;
- Wrangler authentication and custom-domain ownership are verified;
- no storage, analytics, observability, AI, or upload binding was added unintentionally; and
- the user has authorised the actual publish action if the current session requires a fresh external-side-effect confirmation.

## 15. Acceptance criteria

The release is acceptable when:

1. `/` asks `What happened with your challan?` and contains the four approved task choices.
2. The existing synthetic experience is available at `/demo`, not on the normal homepage.
3. `/review` includes the official-service handoff and deliberate local PDF/image intake.
4. A selected real file is previewed locally and never transmitted or persisted by the app.
5. The citizen confirms facts before any comparison or result.
6. Every finding displays source, confidence, confirmation, and limitation where applicable.
7. Deterministic rules prevent unsupported mismatch claims.
8. A citizen-recorded timeline uses honest actor language.
9. A private-device citizen can create a local evidence summary with the required disclaimer.
10. A shared/public-device citizen cannot use in-app export, copy, or print controls.
11. No control requests government credentials, CAPTCHA, OTP, Aadhaar, or payment credentials.
12. No normal-product control claims live government API access, filing, payment, or authority acceptance.
13. English/Hindi and Simple Mode do not alter rule outcomes.
14. Automated tests, typecheck, lint, production build, and browser QA pass with fresh evidence.
15. The desktop and mobile implementation is visually faithful to the approved concept system, with any intentional deviations documented.
