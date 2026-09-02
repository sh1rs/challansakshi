# ChallanSakshi Public Launch and Top-10 Vertical — Design Specification

**Status:** Product direction approved on 2 September 2026; written specification awaiting final user review

**Product:** ChallanSakshi

**Primary outcome:** a real, installation-free, guest-first citizen journey for preparing a wrong-photo or wrong-vehicle e-Challan grievance

**Competition outcome:** a sub-two-minute synthetic proof of the same architecture, suitable for the Build What Moves India next round

**Release posture:** public-beta candidate, not general availability and not a government integration

## 1. Product decision

ChallanSakshi will be built vertically before it expands horizontally.

The first complete real-user wedge is:

> independently find an official e-Challan → review a locally supplied record and photograph → confirm every material fact → receive a conservative evidence finding → prepare a reviewed factual handoff pack → open the exact official service → complete CAPTCHA, OTP, and submission there → optionally record locally that an acknowledgement was seen

The public product and hackathon proof remain separate but demonstrate the same system:

- `/` and `/review` are the real citizen product.
- `/demo` remains the visibly synthetic product narrative and deep-dive.
- `/demo/test-lab` is the primary 90-second judge proof of this vertical and demonstrates that the comparison is dynamic rather than scripted.
- `/fastag` remains available but does not receive new product breadth until the e-Challan vertical meets the acceptance criteria in this specification.

This design selects the installation-free web approach. A browser extension and an authorised government API remain separate future tracks; neither is a dependency for this vertical.

## 2. Dual mission

### 2.1 Public mission

A citizen should be able to understand whether the evidence supplied with an e-Challan appears consistent with the vehicle facts they confirm, prepare a factual request for official review when the evidence supports one, and reach the correct official destination without surrendering credentials or personal documents to ChallanSakshi.

### 2.2 Competition mission

A judge should understand the differentiator within the first 15 seconds and see the complete value loop within two minutes:

> In an explicitly controlled synthetic evaluation, OpenAI can extract and explain bounded observations. Deterministic rules compare only citizen-confirmed facts. The citizen controls the factual pack. ChallanSakshi never decides legal validity or impersonates an official service.

Every judge-visible analysis states its provenance: `live synthetic analysis`, `bundled synthetic observations`, or `manual observation`. The interface may say `live` only when an approved synthetic-only model call actually completed in that session. A bundled or precomputed result must never be presented as a live AI call.

The judge path must show three honest branches:

- a supported possible discrepancy;
- an inconclusive case that refuses to manufacture a dispute; and
- a consistent case that does not recommend a grievance.

The strongest dynamic proof remains an editable observation whose change invalidates confirmation and recomputes the result.

## 3. Scope

### 3.1 Included in the vertical release

- Guest-first use without an account.
- A private-device and shared-device choice.
- Exact route selection within the supported national e-Challan grievance wedge, from an allowlisted registry.
- Browser-local intake for one challan/notice copy and one supplied photograph.
- Structured facts manually reviewed and confirmed by the citizen; the real route performs no remote extraction from citizen evidence.
- Source, confidence, limitation, and citizen-confirmation metadata for every material observation.
- Deterministic `Possible discrepancy`, `Appears consistent`, and `Inconclusive` outcomes.
- A field pack for the supported wrong-photo or wrong-vehicle issue family.
- Field-by-field copy controls and a neutral, editable description under ChallanSakshi's 500-character safety limit.
- A top-level official-service handoff with the destination domain shown before departure.
- A return step where the citizen can record `acknowledgement seen`, `portal unavailable`, `not submitted`, or `needs correction`.
- An optional browser-local last-four reference recorded only after the citizen reports seeing an official acknowledgement.
- A local, redacted continuation receipt for private devices.
- A synthetic judge walkthrough with the same stages and a permanent synthetic boundary.
- Automated privacy, domain, accessibility-contract, and handoff tests.
- Desktop, mobile, small-width, Hindi, Simple Mode, keyboard, and live-browser verification.

### 3.2 Explicitly excluded from this vertical

- Server-side scraping or browser automation of a government, court, bank, issuer, or FASTag portal.
- An iframe or copied government form.
- Undocumented API calls or replay of private portal endpoints.
- URL-query prefilling with vehicle, challan, licence, phone, email, or grievance data.
- CAPTCHA solving, OTP receipt, Aadhaar/VID handling, credentials, payment data, or payment initiation.
- Automatic official submission or automatic detection of submission success.
- Local image conversion, re-encoding, metadata-stripping claims, automatic file selection, or attachment upload.
- Collection or retention of a full official acknowledgement or grievance reference.
- A claim that ChallanSakshi verified identity, ownership, source authenticity, legal validity, liability, cancellation, refund eligibility, or likely case outcome.
- Cloud case storage, required accounts, email/SMS notifications, behavioural analytics, session replay, advertising, or marketing profiles.
- Public processing of real evidence through OpenAI or another remote OCR/AI provider.
- A general-purpose grievance generator for every e-Challan issue.
- New FASTag breadth, state-by-state legal advice, or browser-extension distribution.

## 4. Product architecture

The implementation is divided into six isolated units.

### 4.1 Official destination registry

One pure, versioned registry owns every outbound e-Challan route used by this vertical. Existing unrelated FASTag, cybercrime, and information-page links remain outside this change. The first handoff adapter has exactly four destination states:

| State | Current official destination | First-release behavior |
| --- | --- | --- |
| `legacy` | `https://echallan.parivahan.gov.in/gsticket` | Prepare the supported legacy category, a reviewed description, a challan-number copy aid, and an attachment checklist; the citizen chooses any original file and uploads and submits it directly. |
| `nextgen` | `https://echallan.parivahan.nic.in/grievance` | Prepare a reviewed description and challan-number copy aid; do not invent a legacy category, preselect an offence, or promise attachment support. |
| `delhi-manual` | `https://traffic.delhipolice.gov.in/` | Open the official Delhi landing page with a manual-handoff explanation; no field-compatibility or category claim is made until that flow is separately verified. |
| `unresolved` | `https://echallan.parivahan.gov.in/index/challan-services` | Open only the national official-services directory and ask the citizen to confirm the issuing jurisdiction. |

The same registry also owns separately typed auxiliary navigation records. The initial required auxiliary records are the national record lookup at `https://echallan.parivahan.gov.in/index/accused-challan`, the NextGen service landing at `https://echallan.parivahan.nic.in/challan/challan-services`, the national services directory, and Virtual Courts at `https://vcourts.gov.in/virtualcourt/index.php`. A lookup, status, payment, court, or help route can never be consumed as a grievance destination. A direct status or payment route is exposed only after that exact URL and purpose have current retained verification evidence; otherwise the registry exposes the relevant official landing page.

The route is selected from the issuing jurisdiction printed on the challan or explicitly confirmed by the citizen. It must never be guessed solely from a vehicle-registration prefix because issuing authority and registration state can differ.

The 2 September 2026 verification captured the legacy national page directing these codes to NextGen: `AN`, `AR`, `AS`, `BR`, `CH`, `CG`, `DD`, `GA`, `GJ`, `HP`, `HR`, `JH`, `JK`, `KA`, `LA`, `MH`, `ML`, `MN`, `MZ`, `NL`, `PB`, `PY`, `RJ`, `SK`, `TN`, `UK`, and `WB`. `Delhi` was separately linked. This prose is design evidence, not runtime truth: every jurisdiction rule requires retained official-source or real-browser evidence, verifier identity, verification timestamp, and expiry in the release record. A rule without current retained evidence resolves to `unresolved`. Other confirmed non-Delhi jurisdictions may use the legacy destination only while their published routing remains current. An unexpected redirect or failed lookup does not justify switching portals automatically.

Each registry entry contains:

- stable internal key and destination kind;
- official service name and canonical HTTPS URL;
- exact supported purpose;
- applicable jurisdiction scope and routing rationale;
- visible destination domain;
- real-browser `lastVerifiedAt` date;
- verifier, retained evidence reference, and explicit expiry;
- fallback official route or contact guidance;
- verified field capabilities, including whether a legacy image attachment is currently offered; and
- a release-state flag that fails closed when verification is stale or incomplete.

Route records are re-verified within 24 hours before a production deployment and at least every 30 calendar days while the public beta is active. A route older than 30 days, a route with an unconfirmed issuing jurisdiction, or a changed form contract resolves to `unresolved`; it may not silently reuse an older category or attachment promise.

Only compile-time registry URLs may be opened by this vertical. User input must never become a destination, hostname, path, query, fragment, or redirect target. The UI says `Official portal link`, never `Official integration`. Existing lookup, status, Safety, and Virtual Court links may continue as adjacent navigation, but they are not grievance adapters and are outside this first field-pack promise.

The registry is reusable by the real review, synthetic demo, Safety page, tests, and future issue adapters.

### 4.2 Evidence finding engine

The existing deterministic citizen-review engine remains the authority for readiness and outcome classification.

It accepts only structured, citizen-confirmed observations. Every material field carries:

- source;
- confidence;
- limitation;
- confirmation state; and
- revision identity.

Changing any input used by a result invalidates the result, field pack, acknowledgement, and local continuation receipt until the citizen confirms the new revision.

Only defined evidence conflicts may create `Possible discrepancy`. The first vertical supports:

- a readable plate observation that conflicts with a readable, citizen-confirmed vehicle record;
- a clear two-wheeler versus four-wheeler category conflict, with both vehicle classes confirmed;
- a supplied image that appears to depict a materially different vehicle or unrelated scene after the citizen confirms the structured observation; and
- a specifically citizen-reported possible duplicate plate only when the citizen has an independent basis beyond the image mismatch itself.

Colour alone never creates an action-ready discrepancy. Unreadable, partial, missing, absent, or low-confidence evidence stays `Inconclusive`. An image mismatch alone never becomes a duplicate-plate allegation. A consistent result never produces grievance-accusing copy.

The action-ready input contract adds explicit fields rather than overloading the current generic `different` observation:

- `citizenVehicleClass` and `observedEvidenceVehicleClass`, each limited to `two-wheeler`, `four-wheeler`, `other`, or `unclear`;
- an independently sourced readable-vehicle-record flag;
- `duplicatePlateIndependentBasis`, limited to `citizen-confirmed` or `none`; and
- source, confidence, limitation, confirmation, and review-revision metadata for every new fact.

A generic `different category` value may explain what to inspect, but cannot by itself create a field pack or legacy class category. A class mapping requires both explicit classes. A duplicate-plate mapping is impossible unless `duplicatePlateIndependentBasis` is separately `citizen-confirmed`; the mismatch image cannot set that field.

#### 4.2.1 Field-pack eligibility gate

A form-compatible handoff pack exists only when all of these are true:

- the source is an official service or a record downloaded from an official service, not message-only;
- the citizen confirmed the issuing jurisdiction and it resolves to `legacy` or `nextgen`;
- the citizen inspected the supplied evidence image and a readable record of their own vehicle;
- every material fact belongs to the same currently confirmed review revision;
- the deterministic assessment is `Possible discrepancy`; and
- the material signal is a supported plate, vehicle-class, or wrong-evidence conflict.

`delhi-manual`, `unresolved`, message-only, unconfirmed, stale, consistent, and inconclusive paths may still show safety guidance or a redacted evidence summary, but they do not claim official-form compatibility. Shared-device mode may show the in-tab pack but disables copy, download, lookup bridge, and acknowledgement-reference retention.

### 4.3 Handoff-pack builder

A pure builder converts one confirmed result revision into an `OfficialHandoffPack`. The pack is a local preparation aid, not a filing.

The contract contains:

- schema version;
- result revision ID;
- supported issue family;
- destination kind, official route key, routing rationale, and route verification date;
- evidence assessment, source limitations, confidence, and citizen-confirmation state;
- a legacy category only when a currently verified legacy field mapping applies;
- a neutral description capped by the product at 500 characters;
- user-confirmed factual bullets;
- evidence source and limitation summary;
- a destination-specific attachment/readiness checklist;
- fields that remain intentionally blank for completion on the official portal;
- a non-legal limitation;
- field-pack confirmation state; and
- local generated timestamp.

The export-safe pack must not contain a full challan, vehicle, driving-licence, or official-reference number; full name; phone; email; Aadhaar/VID; date of birth; government password; bank or payment information; raw filename; image metadata; full device data; or fabricated official response.

The default neutral description is structurally equivalent to:

> I request a review of this record. Based on the documents and images I reviewed, the vehicle or evidence details may not appear consistent. Please verify the original evidence and vehicle mapping. I understand the authority will make its own determination.

Generated descriptions prefer confirmed vehicle class, colour, and body style; use `appears` or `could not be confirmed` for uncertainty; omit phone, Aadhaar/VID, address, deadline, payment advice, and predicted outcome; and always mask another visible plate to its final four characters. ChallanSakshi provides no field for overriding that full-plate restriction. The official record already identifies the challenged challan, so the export-safe description does not repeat the full challan number.

The final copy is editable before confirmation. Editing it creates a new pack revision. The interface blocks handoff while the normalized description exceeds ChallanSakshi's 500-character safety limit; it never silently truncates citizen-reviewed text. This product limit is not a claim about every official destination. An official field limit may be displayed only when the registry holds current, dated verification for that exact destination and form version. The interface never describes the copy as legal advice or an official communication.

#### 4.3.1 Exact legacy category mapping

Only labels and values observed on the current legacy national grievance form may be suggested. Every suggestion displays its rationale and requires citizen confirmation.

| Confirmed ChallanSakshi finding | Displayed legacy label | Submitted legacy value | Guardrail |
| --- | --- | --- | --- |
| The evidence depicts a different vehicle or unrelated scene, but the cause is unknown | `Wrong Evidence Captured` | `Wrong Image` | Default general mapping for a supported evidence mismatch. |
| The number appears to have been entered incorrectly | `Wrong Vehicle Number Entered By Officer` | Same as label | Use only when the visible facts support an entry mismatch; vehicle difference alone is insufficient. |
| Evidence clearly shows a two-wheeler but the citizen's confirmed vehicle is a four-wheeler | `2 Wheeler Challan On 4 Wheeler` | Same as label | Both vehicle classes must be clear and citizen-confirmed. |
| Evidence clearly shows a four-wheeler but the citizen's confirmed vehicle is a two-wheeler | `4 Wheeler Challan On 2 Wheeler` | Same as label | Both vehicle classes must be clear and citizen-confirmed. |
| The citizen specifically reports a possible cloned or duplicate plate and has an independent basis | `Duplicate Number Plate` | Same as label | Never infer this allegation from an image mismatch alone. |
| Evidence is unclear, missing, cropped, blurred, or low-confidence | No suggestion | `null` | Abstain and require manual official review. |

`Wrong photo` therefore maps to the broad `Wrong Evidence Captured` category, not automatically to `Duplicate Number Plate` or officer error.

#### 4.3.2 Destination-specific form contract

- Legacy may receive the confirmed category and description. ChallanSakshi may state that the currently observed form offers optional JPEG/JPG/PNG selection, but it does not copy, convert, re-encode, strip metadata from, download, auto-select, or upload the file in this release. No reliable published size limit is assumed; the citizen chooses any original file directly on the official service.
- NextGen receives only the reviewed description and lookup copy aid. The citizen chooses any offence requested by the official portal. The first release does not promise image attachment support on NextGen.
- Delhi remains a manual official-site handoff without category, field, or attachment compatibility claims.
- `unresolved` never produces a form-compatible pack; it produces a redacted evidence summary and opens the official services directory.

### 4.4 Sensitive identifier bridge

The comparison engine continues to use masked identifiers and never requires a full challan, vehicle, driving-licence, or acknowledgement number.

On a private device only, the supported handoff screen may offer an optional ephemeral `Copy challan number` bridge because challan-number lookup is the narrowest supported official path. Vehicle number, driving-licence number, date of birth, registration date, phone, OTP, Aadhaar/VID, and credentials are not collected by this bridge. A challan number entered there:

- remains in React tab memory;
- is never used by the comparison engine;
- is never included in URLs, logs, analytics, exports, screenshots generated by the app, field-pack text, or acknowledgement receipts;
- is preserved exactly after trimming surrounding whitespace and is never guessed or autocorrected;
- has no automatic paste or submission behavior;
- is cleared after a successful copy, on official-link activation, on Quick Exit, on reset, on inactivity expiry, and on unmount; and
- carries a visible warning that clipboard history and device tools are outside ChallanSakshi's control.

This bridge is absent on shared devices. The default path tells the citizen to enter the identifier directly on the official portal.

### 4.5 Official handoff component

The handoff component has one job: help the citizen transfer reviewed facts while clearly returning control to them.

It displays, in this order:

1. the current result and limitation;
2. `Prepared for`, the official destination purpose, exact domain, and last-verified date;
3. the optional private-device challan-number copy aid;
4. the confirmed issue category and copy control on legacy only;
5. the editable description, live `n / 500` counter, and copy control;
6. the destination-specific evidence/readiness checklist, including legacy-only guidance that any attachment must be chosen directly on the official service;
7. a confirmation that the citizen reviewed the pack and will submit only truthful information for a matter they are entitled to raise;
8. an explicit leaving-ChallanSakshi notice; and
9. a registry-driven `Open [official service name]` anchor whose label never promises a grievance form for `delhi-manual` or `unresolved`.

The component does not use an asynchronous `window.open` call. The external route is a normal user-activated anchor with `target="_blank"` and `rel="noreferrer"`, preventing popup timing failures and keeping the destination transparent.

Clipboard actions are separate, explicit user gestures. The panel may offer `Copy all non-sensitive fields`, but must keep the challan number and any local reference separate. If the Clipboard API is unavailable, each field remains selectable and the interface explains how to copy it manually. A copy success state must be announced in a polite live region.

Activating the official anchor records only `Official service opened from this review`. It proves that the citizen activated ChallanSakshi's link; it does not prove that the new tab loaded, authentication succeeded, or any information was submitted.

### 4.6 Local return and acknowledgement state

ChallanSakshi cannot inspect the cross-origin official tab and therefore cannot infer what happened there. The citizen explicitly chooses one return state:

- `I saw an acknowledgement on the official service`;
- `The official portal was unavailable`;
- `I did not submit`;
- `I need to correct my pack`.

Only the first state reveals an optional last-four reference input. Its label is `Last 4 characters of the official reference, recorded by you`. The UI must say `Citizen-reported; not verified by ChallanSakshi.` The product never accepts an acknowledgement screenshot or full reference in this release.

The local acknowledgement records only:

- acknowledgement schema version;
- confirmed pack revision ID or digest;
- local timestamp;
- result class;
- citizen-selected return state; and
- the optional last-four official-reference fragment on a private device.

It is never called identity verification, authentication, legal authorisation, a sworn declaration, government acknowledgement, proof of ownership, proof of submission, or official tracking.

Any later evidence or pack edit invalidates the acknowledgement and requires a new confirmation.

`Official service opened from this review` is the furthest state ChallanSakshi can observe directly. There is no automatic transition to `submitted`, `acknowledged`, or `accepted`; every later state is explicitly citizen-reported.

A helper may not record `I saw an acknowledgement` on another person's behalf unless that person personally saw it and is present to confirm the entry. The helper never consents, authenticates, declares, or submits for the citizen.

## 5. Real citizen journey

### Stage 1 — Start safely

- Choose `My case` or `Helping someone present`.
- `Helping someone present` requires: `I have the person's permission to help prepare this information. They must independently review and submit any official form.`
- Choose private or shared device.
- Confirm manual self-review and minimum-data expectations.
- Keep the current short, progressive-disclosure structure.

### Stage 2 — Find the official record

- Confirm the issuing jurisdiction printed on the challan or choose `I am not sure`; do not infer it from the registration prefix.
- Resolve the supported national grievance route to `legacy`, `nextgen`, `delhi-manual`, or `unresolved`.
- Open the exact allowlisted lookup route.
- Complete the identifier, CAPTCHA, OTP, or other verification only on the official portal.
- Return with a downloaded record, screenshot, supplied photograph, or manual facts.
- A message-only source remains a safe stop.
- State/UT-specific filing outside the verified national routing contract and Virtual Court action remain safe-navigation paths, not form-compatible packs in this release.

### Stage 3 — Review evidence

- Add one local challan/notice copy and one local supplied photograph, or continue manually.
- Keep a visible `Local only · Not uploaded · Not saved` receipt.
- Never display or export the raw filename. Use generic labels such as `Selected notice` and `Selected photograph`, while retaining accessible replace/remove controls and non-sensitive type/size validation feedback.
- Review the minimum material facts first; secondary facts remain progressively disclosed.
- Confirm or correct every observation before comparison.

### Stage 4 — Understand the finding

- Lead with one of the three bounded outcomes.
- Show `What looks clear`, `What to check`, and the evidence limitations.
- If `Inconclusive`, show what additional evidence would make the comparison useful.
- If `Appears consistent`, show verification or payment/status routes but do not recommend a grievance.
- If `Possible discrepancy`, offer the supported handoff pack.

### Stage 5 — Prepare the official field pack

- Display the confirmed legacy category only when applicable, neutral description, and destination-specific evidence checklist.
- Make all generated language editable and revisioned.
- Require explicit factual confirmation.
- Offer field-by-field copy controls.
- Keep private-device lookup-value copying separate and optional.

### Stage 6 — Open the official service

The leaving notice says:

> You are leaving ChallanSakshi for [official service name] at [domain]. ChallanSakshi cannot access, submit, edit, track, or receive a decision from that service. That service's privacy and security terms apply after you leave.

The citizen handles CAPTCHA, OTP, Aadhaar/VID if the official portal independently offers it, identity checks, attachments, declarations, submission, and payment only there.

After link activation, ChallanSakshi says:

> [Official service name] opened from this review. ChallanSakshi has not submitted anything. Continue only after confirming the official domain.

For `legacy` and `nextgen`, the purpose may say `official grievance service`. For `delhi-manual` and `unresolved`, it must say only `official service` or `official site`; it must not imply that a grievance form or field-compatible submission route was verified.

### Stage 7 — Record what happened

- The citizen chooses a return state.
- A portal-unavailable state preserves the redacted pack in memory and offers the verified fallback route; it never asserts a permanent government outage.
- An `acknowledgement seen` state can record only the citizen-supplied last four characters of an official reference.
- Private devices may download a redacted continuation receipt.
- Shared devices receive no copy, download, or persistent reference option and keep the existing inactivity clear behavior.

## 6. Official-site drift and failure handling

Government availability and interface stability are external dependencies. The product must fail safely.

### 6.1 Destination unavailable

- ChallanSakshi does not attempt cross-origin health detection or status scraping.
- The citizen can report that the portal was unavailable.
- Preserve the local pack in the existing tab.
- Show the verified official services landing page and current official support route from the registry.
- Use `The portal did not work for you` rather than `The government server is down` unless an official status source confirms it.
- Never redirect a NextGen jurisdiction back to legacy merely because NextGen is unavailable, and never switch to a private or unofficial challan service.
- Never interpret an outage or `not found` response as cancellation, invalidity, or absence of a challan.

### 6.2 Route or form changed

- A stale registry entry, unconfirmed issuing jurisdiction, or unexpected redirect fails to the official services landing page.
- The UI does not promise a field, category, attachment, or limit that has not been re-verified.
- Tests ensure every visible official route comes from the registry and carries a verification date.
- A release checklist requires real-browser route verification immediately before deployment.

### 6.3 Clipboard failure

- Retain selectable text.
- Announce failure without clearing the field.
- Never open the official destination automatically after a failed or unconfirmed copy action.

### 6.4 User returns without acknowledgement

- Keep the case state `Official action not recorded`.
- Do not simulate progress, reminders, or authority responses in real mode.
- Tracking remains an explicit citizen-entered local note, not a live government status.

## 7. Data and trust boundary

### 7.1 Real route

- No account is required.
- Evidence files, previews, structured answers, field packs, optional lookup values, and acknowledgements stay in current-tab memory.
- No real evidence or case payload enters `fetch`, XHR, beacon, WebSocket, EventSource, a server action, `/api/analyze`, analytics, session replay, error payloads, cookies, localStorage, sessionStorage, IndexedDB, Cache Storage, service workers, URL state, or browser history writes.
- Object URLs are revoked on replacement, removal, correction reset, Quick Exit, inactivity clear, and unmount.
- No raw filename is shown or exported.
- Hosting still processes ordinary technical request data; public copy must not claim that the site receives no data at all.

### 7.2 Synthetic routes

- Every record, person, identifier, image, authority response, and acknowledgement is visibly marked synthetic.
- The synthetic demo may persist only its versioned fictional fixture state and reading preferences.
- Public custom-image analysis remains browser-local and manual unless the selected file is guaranteed synthetic in a separately controlled environment.
- The public Worker keeps real/caller-supplied model uploads disabled.
- A controlled judge environment may enable the existing synthetic-only analysis adapter. It must reject non-bundled files, disclose the model call, expose confidence and limitations, and retain a deterministic fallback when the call is unavailable.
- Bundled or precomputed observations are labelled as such; their presence is not evidence that OpenAI ran in the current session.

### 7.3 AI and deterministic control

AI may:

- extract bounded observations from approved synthetic material;
- explain what a visible field means;
- state uncertainty and limitations; and
- propose neutral prose for citizen review.

AI may not:

- determine guilt, innocence, validity, liability, fraud, cloning, ownership, deadlines, route eligibility, or expected outcome;
- select or submit an official action without citizen review;
- silently turn an observation into a confirmed fact; or
- receive real citizen evidence in this release.

Deterministic TypeScript controls readiness, material comparison, supported issue mapping, description length, revision invalidation, safe stops, official route selection, allowed return states, and artifact generation.

## 8. Judge-ready synthetic proof lane

The judge path mirrors the real vertical, but it never contacts a government system or accepts real records.

### 8.1 First 15 seconds

Show only:

- the citizen problem;
- one synthetic challan/photo pair;
- the AI versus deterministic boundary; and
- `Start the 90-second proof`.

`/demo` links deliberately to this proof. On `/demo/test-lab`, activating `Start the 90-second proof` deterministically selects `case-04-category-conflict`, clears prior Test Lab confirmation/result/pack/handoff state, focuses the first proof heading, and starts no government request. The action is visible in the first viewport on desktop and 390 × 844; it does not rely on the Test Lab's current default case or on a judge manually finding the fixture selector.

### 8.2 Proof sequence

1. Load the existing bundled `case-04-category-conflict` (`Scooter versus motorcycle`) in `/demo/test-lab`.
2. Show source-linked observations, confidence, limitations, and truthful analysis provenance.
3. Let the citizen confirm or correct them.
4. Compute the bounded finding.
5. Generate the same factual field pack used by the real route.
6. Activate `Simulate opening the official review route`; do not open a government service from the judge proof.
7. Show a clearly simulated citizen-recorded acknowledgement stage.
8. Switch to an inconclusive or consistent case.
9. Edit one observation in Test Lab, invalidate confirmation, and recompute visibly.

### 8.3 Demo truthfulness

- The synthetic banner remains visible on every viewport and every step.
- No government seal, police badge, copied official form, or official-looking receipt is used.
- The final handoff is labelled `Official handoff simulation`.
- The simulated acknowledgement is labelled `Synthetic citizen-recorded example`.
- The demo never says it fetched, filed, paid, authenticated, tracked, cancelled, or won a real case.
- Real citizen tools remain one deliberate exit away and never inherit fixture state.
- The demo does not reproduce an official government form, CAPTCHA, OTP, emblem, success message, e-ticket, or official-looking receipt.
- The primary judge proof does not reuse the deeper fictional submission and outcome tracker in `ChallanSakshiApp.tsx`; that narrative may remain available as a clearly synthetic exploration but is not evidence of real-mode capability.

## 9. Vertical-first interface strategy

The current white, navy, teal, and restrained amber public-service visual system remains canonical. No visual redesign is included.

The experience should feel seamless through sequencing rather than by hiding important decisions:

- one primary action per state;
- the current task above rationale;
- short visible safety statements with full detail in named native disclosures;
- exact official destination shown before departure;
- result before audit detail;
- field pack before the external handoff;
- return choices immediately available when the citizen comes back;
- whole-card activation and at least 48px touch targets;
- visible focus and no pointer-only interactions;
- essential mobile input text at least 16px; and
- no horizontal overflow at 320px.

At 390 × 844, the current action and primary control must appear in the first viewport for the beginning of each stage. Long evidence tables, raw summaries, route provenance, and audit history remain available through descriptive disclosures.

## 10. Code boundaries

The implementation should extend the existing code without growing `CitizenReviewApp.tsx` into a larger monolith.

Expected new modules:

- `lib/official-destinations.ts` — pure, versioned allowlisted route registry.
- `lib/official-handoff.ts` — pack builder, exact legacy issue mapping, destination capabilities, limits, and revision rules.
- `lib/official-handoff-receipt.ts` — pure local-link and citizen-reported acknowledgement state, signature binding, redaction, and invalidation.
- `components/public-beta/OfficialHandoffPanel.tsx` — real handoff, copy, leaving notice, return states.
- `components/public-beta/OfficialHandoffPanel.module.css` — responsive presentation using existing tokens.
- `tests/official-destinations.test.ts` — URL, scope, freshness, and no-user-input invariants.
- `tests/official-handoff.test.ts` — readiness, mapping, wording, length, destination differences, and pack invalidation.
- `tests/official-handoff-receipt.test.ts` — direct observation boundary, citizen-reported state, redaction, signature binding, and invalidation.
- `tests/official-handoff-contracts.test.ts` — rendered privacy, accessibility, and no-automation boundaries.

Expected focused modifications:

- `components/public-beta/CitizenReviewApp.tsx` — compose the handoff component after the existing result.
- `components/public-beta/LocalRecordIntake.tsx` — replace raw filenames with safe selected-file labels while preserving accessible replace/remove controls.
- `lib/local-record-intake.ts` — expose only the non-sensitive validation metadata required by the UI and keep object-URL cleanup behavior explicit.
- `lib/public-challan.ts` — expose stable confirmed result inputs without adding government or network logic.
- `lib/citizen-review-presentation.ts` — concise English/Hindi handoff and return copy.
- `components/ChallanSakshiApp.tsx` — add only a prominent link into the isolated 90-second Test Lab proof; do not reuse its fictional submission/outcome state for the parity flow.
- `components/test-lab/SyntheticTestLabApp.tsx` — expose field-pack generation for the selected confirmed synthetic result.
- `lib/synthetic-lab-state.ts` — add a simulated handoff receipt that clears on every source edit or reset.
- `lib/synthetic-evidence-pipeline.ts` — add an explicitly fictional handoff section to the synthetic action pack without changing the comparison core.
- `components/public-beta/PublicInfoPage.tsx` — update privacy/safety disclosure for the local handoff pack and acknowledgement.
- `README.md` — document the vertical, real/demo separation, field-pack boundary, official-link governance, and release prerequisites.
- `tests/local-record-intake.test.ts` and existing privacy, citizen-review, demo, mobile, and deployment contract tests.

The official destination registry, pack builder, and acknowledgement state must have no React dependency. The real and synthetic interfaces consume them through explicit adapters so fixture state can never enter the real route. The existing ten-case synthetic corpus is reused; this vertical does not add a fixture merely to increase a demo count.

## 11. Accessibility and language

The complete real vertical and judge path must work in English and Hindi.

Required behavior:

- semantic headings preserve one clear page hierarchy;
- progress uses text as well as visuals;
- all copy controls have field-specific accessible names;
- copy and return-state changes are announced in a polite live region;
- opening an external official site is stated in the accessible name or adjacent text;
- keyboard focus moves to the new stage heading after internal transitions;
- field errors identify the field and correction needed;
- no result relies on colour alone;
- Simple Mode keeps every safety boundary and decision state;
- 200% zoom remains usable;
- reduced motion removes non-essential transitions; and
- Hindi does not fall back to English for consent, result, handoff, return, or limitation copy.

The official portal's own accessibility is outside ChallanSakshi's control. The exit notice makes that boundary clear without discouraging the user.

## 12. Security and public-launch prerequisites

The code can reach a product-complete public-beta candidate under this specification. A real public-beta announcement remains blocked until the operator supplies and verifies the non-code controls below:

- final operator identity and contact information;
- published Privacy Policy and Terms matching the deployed implementation;
- a named privacy/grievance contact and response process;
- a low-data security and official-link correction channel that does not invite case documents;
- a CERT-In point of contact and six-hour incident-reporting runbook;
- verified 180-day required security-log retention in India and clock synchronisation;
- hosting/CDN/deployment/logging/support vendor and data-flow inventory;
- incident escalation and tabletop evidence;
- external privacy, security, and legal review;
- dependency and supply-chain review;
- official destination ownership and re-verification cadence; and
- live deployment, monitoring, rollback, and correction ownership.

Until those controls are proven, the code may be described as a `Public-beta candidate`, but the product may be presented to people only as a non-public prototype or a synthetic demonstration. It may not be offered to real citizens as public early access or public beta. Even after the gates pass, it must not be called `general availability`, `secure`, `DPDP compliant`, or `government authorised` without separate evidence supporting that exact claim.

## 13. Release terminology and prohibited claims

Allowed descriptions:

- `Independent citizen evidence-preparation tool`;
- `Possible vehicle or evidence discrepancy`;
- `User-reviewed factual field pack`;
- `Open the official portal and submit it yourself`;
- `Official portal link`;
- `Last four characters of an official reference, recorded by the citizen`;
- `Citizen-reported acknowledgement; not verified by ChallanSakshi`; and
- `Synthetic demonstration data`.

Prohibited descriptions:

- `Official e-Challan partner`;
- `Government approved`;
- `Connected to Parivahan, VAHAN, police, NHAI, IHMCL, a bank, or a court`;
- `Live government data`;
- `Verified by government`;
- `Submit through ChallanSakshi`;
- `Autofilled the government portal`, `one-click complaint`, or `auto-submitted`;
- `We filed or tracked your grievance`, `grievance submitted successfully`, or `ticket created`;
- `Wrong or invalid challan detected`;
- `Duplicate or cloned number plate` based only on an image mismatch;
- `Guaranteed cancellation, refund, reversal, or win`;
- `Legal complaint or legal deadline confirmed`;
- `Do not pay`, `payment is paused`, or `the grievance extends your deadline`;
- `AI proves the photo is wrong`; and
- `Private`, `secure`, `anonymous`, `we store nothing`, or `no data leaves your device` unless the complete deployed boundary has been verified to support that precise claim; and
- any wording suggesting that a public link is an authorised integration.

## 14. Acceptance criteria

### 14.1 Real vertical behavior

- A new citizen can reach the result in one uninterrupted guided path without creating an account.
- The supported wrong-photo/wrong-vehicle case resolves to one of the four exact destination states; only `legacy` and `nextgen` can reach a form-compatible confirmed field pack.
- Route choice uses the citizen-confirmed issuing jurisdiction, never only a registration prefix.
- Legacy exposes only current confirmed legacy categories and current attachment guidance without processing the file; NextGen exposes neither a legacy category nor an attachment promise; Delhi remains manual; unresolved opens only the services directory.
- Message-only, unconfirmed, low-confidence, missing-image, consistent, and inconclusive cases cannot produce accusatory grievance copy.
- A generic category difference cannot create a class-specific field pack; both explicit vehicle classes must be confirmed, and duplicate-plate wording remains impossible without a separately confirmed independent basis.
- The description is at most 500 characters after every edit and normalization step.
- Every generated factual statement is traceable to a confirmed source and result revision.
- Editing an input invalidates the result, pack, and acknowledgement downstream.
- The external route contains no user data and resolves only from the allowlisted registry.
- CAPTCHA, OTP, Aadhaar/VID, credentials, payment, and submission never enter ChallanSakshi.
- `Official service opened from this review` is the furthest directly observed state; every later acknowledgement state is explicitly citizen-reported.
- Raw filenames and optional lookup values never enter exported artifacts.
- A full official acknowledgement, grievance reference, OTP, Aadhaar/VID, or portal screenshot cannot enter the local receipt.
- Shared-device mode exposes no sensitive copy, download, optional lookup bridge, or persisted acknowledgement.

### 14.2 Judge path

- The dual AI/deterministic boundary is visible within 15 seconds.
- The flagship proof completes in 90 seconds without requiring a network call to a government service.
- The flagship proof uses the existing `case-04-category-conflict` Test Lab case and a simulated handoff, not the fictional real-looking submission tracker.
- The visible proof-entry action selects case 04 and clears stale synthetic state deterministically; component and browser tests cover that entry contract.
- The demo shows discrepancy, consistent, and inconclusive behavior.
- Editing a material observation invalidates confirmation and recomputes the outcome.
- The field pack in the synthetic route is produced by the same pure builder as the real route.
- Analysis provenance is visible and never claims a live OpenAI call when the observation is bundled or precomputed.
- Every demo screen remains visibly synthetic.
- The path never implies a real official fetch, filing, payment, acknowledgement, or outcome.

### 14.3 Automated verification

- Unit tests cover route allowlisting, issue mapping, safe stops, description limits, source traceability, revision invalidation, return states, and redaction.
- Static privacy tests cover the complete transitive real-route import graph and prohibit evidence-bearing network/storage/form paths.
- Component contracts cover English/Hindi, Simple Mode, live regions, external-link disclosure, whole-card activation, mobile input size, and shared-device restrictions.
- The full Vitest suite, TypeScript, ESLint, production build, and `git diff --check` pass.

### 14.4 Browser verification

- Real journey: desktop, 390 × 844, and 320px.
- Synthetic judge path: desktop and 390 × 844.
- Keyboard-only traversal through the complete real vertical.
- Hindi and Simple Mode through consent, finding, pack, handoff, and return.
- No framework overlay, blank route, console error, horizontal overflow, inaccessible hidden input, stale confirmation, or broken official anchor.
- A current-run screenshot set covers every important state.
- Live official routes and visible government form assumptions are re-verified without submitting data.

## 15. Success measures

Product success is measured without collecting behavioural analytics in the first release.

During moderated or synthetic testing, record only aggregate manual observations:

- citizen can identify the correct next action within 10 seconds per stage;
- supported case reaches a confirmed field pack in under three minutes after the official record is available;
- no participant believes ChallanSakshi is a government service;
- no participant expects ChallanSakshi to receive CAPTCHA, OTP, payment, or the official decision;
- participant can explain the difference between `Possible discrepancy` and `invalid challan`;
- consistent and inconclusive cases do not create pressure to file a grievance; and
- a judge can explain the AI/deterministic/user-control boundary after the 90-second proof.

No Top-10 or No.-1 placement is guaranteed. The design maximises the qualities the project can control: a specific public problem, a working end-to-end journey, meaningful and bounded AI, dynamic proof, usability, product depth, and unusually honest boundaries.

## 16. Horizontal expansion sequence

Horizontal work starts only after every vertical acceptance criterion passes.

Recommended order:

1. Other e-Challan evidence categories that reuse the same field-pack contract.
2. Payment already made, payment pending, and duplicate-payment reconciliation.
3. Grievance-status and rejected-response evidence review.
4. Virtual Court handoff and post-order clarification preparation.
5. FASTag issuer-first routing and wrong-deduction evidence preparation.
6. Additional state/jurisdiction adapters with independently verified official routes.
7. Optional private-device resume only after a separate threat model and deletion design.
8. Optional browser extension only after written operator permission and a separate security/privacy specification.
9. Authorised government or operator APIs only under written agreements, documented contracts, and a new compliance review.

Each expansion receives its own design, tests, official-source verification, and release gate. It may not weaken the guest-first local path.

## 17. Definition of done

The vertical is complete only when:

- the real citizen path works end to end through a truthful official handoff and citizen-recorded return state;
- the synthetic judge path proves the same architecture in under two minutes;
- the dynamic Test Lab demonstrates that outcomes change with evidence;
- all privacy and safe-stop invariants remain intact;
- every automated and browser gate passes on the final working tree;
- the public copy, README, privacy, and safety disclosures match the implementation; and
- no completion claim confuses a product-complete candidate with an operationally approved public launch or an authorised government integration.
