# ChallanSakshi Public Launch and Top-10 Vertical — Design Specification

**Status:** Web direction approved on 2 September 2026; optional desktop-extension amendment selected on 2 September 2026 and awaiting final written-specification review

**Product:** ChallanSakshi

**Primary outcome:** a real, installation-free, guest-first citizen journey for preparing a wrong-photo or wrong-vehicle e-Challan grievance

**Competition outcome:** a sub-two-minute synthetic proof of the same architecture, suitable for the Build What Moves India next round

**Optional desktop outcome:** a user-triggered supported-desktop Google Chrome helper that can eventually fill only a verified legacy category and/or reviewed description while leaving every protected field and submission untouched

**Release posture:** web public-beta candidate plus synthetic/internal extension candidate; not general availability, not a government integration, and no live official-form extension adapter currently enabled

## 1. Product decision

ChallanSakshi will be built vertically before it expands horizontally.

The first complete real-user wedge is:

> independently find an official e-Challan → review a locally supplied record and photograph → confirm every material fact → receive a conservative evidence finding → prepare a reviewed factual handoff pack → open the exact official service → complete CAPTCHA, OTP, and submission there → optionally record locally that an acknowledgement was seen

The public product and hackathon proof remain separate but demonstrate the same system:

- `/` and `/review` are the real citizen product.
- `/demo` remains the visibly synthetic product narrative and deep-dive.
- `/demo/test-lab` is the primary 90-second judge proof of this vertical and demonstrates that the comparison is dynamic rather than scripted.
- `/fastag` remains available but does not receive new product breadth until the e-Challan vertical meets the acceptance criteria in this specification.

This design selects **web product plus optional desktop extension**. The installation-free in-tab field pack and official-link handoff remains the complete, universal mobile and desktop path: private devices offer explicit clipboard controls, while shared devices keep reviewed values visibly selectable for manual transcription without invoking the Clipboard API. The extension is a private-desktop accelerator after that complete web path, never an installation wall or dependency. An authorised government API remains a separate future track.

The extension subsystem is specified independently in [`2026-09-02-challansakshi-assisted-handoff-extension-design.md`](./2026-09-02-challansakshi-assisted-handoff-extension-design.md). Its source-pull architecture adds two explicit extension approval stages, each initiated from the browser's extension-action UI: preview-and-load on ChallanSakshi, then preview-and-fill on the official page. The web preparation and official-link actions remain separate and visible. The design exposes no website-to-extension background channel.

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
- A neutral, editable description under ChallanSakshi's limit of 500 NFC-normalized Unicode code points, with field-by-field clipboard controls only on private devices and visible manual-transcription values on shared devices.
- A top-level official-service handoff with the destination domain shown before departure.
- A return step where the citizen can record `acknowledgement seen`, `portal unavailable`, `not submitted`, or `needs correction`.
- An optional browser-local last-four reference recorded only after the citizen reports seeing an official acknowledgement.
- A local, redacted continuation receipt for private devices.
- An optional supported-desktop Google Chrome Manifest V3 helper for private devices, with only `activeTab`, `scripting`, `storage`, and `alarms` permissions and no persistent host permission; other Chromium-family browsers and mobile Chrome remain unsupported until separately tested and distributed.
- A one-use extension envelope containing only a confirmed internal issue code, reviewed description, presentation preferences, and non-citizen revision metadata; it becomes unusable no later than the earlier of its source expiry or ten minutes after import.
- A synthetic extension fixture and disabled-by-default real-adapter registry so the architecture can be proved without pretending current government selectors are verified.
- A synthetic judge walkthrough with the same stages and a permanent synthetic boundary.
- Automated privacy, domain, accessibility-contract, and handoff tests.
- Desktop, mobile, small-width, Hindi, Simple Mode, keyboard, and live-browser verification.

### 3.2 Explicitly excluded from this vertical

- Server-side scraping, persistent/background browser automation, or general-purpose automation of a government, court, bank, issuer, or FASTag portal. The separately specified one-shot extension may modify only verified blank category/description controls after web preparation and two extension-action-initiated preview/approval stages.
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
- New FASTag breadth or state-by-state legal advice.
- Public extension distribution, public enablement of an official-site adapter, or a claim of live official autofill before the separate adapter, legal/authorisation, privacy/security, and Chrome Web Store gates pass.

## 4. Product architecture

The web implementation is divided into six isolated units. The optional extension is a seventh, separately built subsystem with its own manifest, storage, adapter, testing, and release boundaries.

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

A real form-compatible handoff pack exists only when all of these are true:

- the source is an official service or a record downloaded from an official service, not message-only;
- the citizen confirmed the issuing jurisdiction and it resolves to `legacy` or `nextgen`;
- in `My case`, the affected person inspected the supplied evidence image and a readable record for a vehicle/matter they confirm they are entitled to raise;
- in `Helping someone present`, the affected person is present, inspects and confirms the same evidence/record, confirms they are entitled to raise the matter, and explicitly asks the helper to prepare the information; the helper does not make those attestations for them;
- every material fact belongs to the same currently confirmed review revision;
- the deterministic assessment is `Possible discrepancy`; and
- the material signal is a supported plate, vehicle-class, or wrong-evidence conflict.

`delhi-manual`, `unresolved`, message-only, unconfirmed, stale, consistent, and inconclusive paths may still show safety guidance or a redacted evidence summary, but they do not claim official-form compatibility. Shared-device mode may show the in-tab pack but disables copy, download, lookup bridge, and acknowledgement-reference retention.

This official-source gate applies only to `mode: 'real'`. A bundled synthetic record can never satisfy it or be retyped as an official source.

### 4.3 Handoff-pack builder

The builder accepts a closed input union:

- `RealHandoffBuildInput` has `mode: 'real'`, `sourceKind: 'official-service' | 'official-download'`, a verified real route, and every eligibility proof above; it alone can produce `OfficialHandoffPack`.
- `SyntheticHandoffBuildInput` has `mode: 'synthetic'`, `sourceKind: 'bundled-synthetic-record'`, `routeKey: 'synthetic-fixture'`, and no official URL, current-government verification, or form-compatibility assertion; it produces only `SyntheticHandoffSimulation` with permanent synthetic labelling.

Both branches call the same pure `buildReviewedFactProjection`, description normalization, supported-issue mapping, source/limitation projection, and revision invalidation core. Separate wrappers add their incompatible routing and provenance semantics. Runtime validation rejects unknown modes, real input in the synthetic wrapper, synthetic input in the real wrapper, a synthetic source kind paired with an official route, and a real source paired with the fixture route. The `OfficialHandoffPack` is a local preparation aid, not a filing; the synthetic output is a proof artifact, not an official pack.

The real pack contract contains:

- schema version;
- review role `self` or `present-helper`, used only for role-accurate confirmation copy;
- result revision ID;
- supported issue family;
- destination kind, official route key, routing rationale, and route verification date;
- evidence assessment, source limitations, confidence, and citizen-confirmation state;
- a legacy category only when a currently verified legacy field mapping applies;
- a neutral description capped by the product at 500 NFC-normalized Unicode code points;
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

The final copy is editable before confirmation. Editing it creates a new pack revision. The interface normalizes to Unicode NFC with LF line endings, counts Unicode code points rather than UTF-16 code units or grapheme clusters, and blocks handoff above 500 code points; it never silently truncates citizen-reviewed text. This product limit is not a claim about every official destination. An official field limit may be displayed only when the registry holds current, dated verification for that exact destination and form version. The interface never describes the copy as legal advice or an official communication.

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
- has no automatic paste, extension transfer, or submission behavior;
- is cleared after a successful copy, on official-link activation, on Quick Exit, on reset, on inactivity expiry, and on unmount; and
- carries a visible warning that clipboard history and device tools are outside ChallanSakshi's control.

This bridge is absent on shared devices. The default path tells the citizen to enter the identifier directly on the official portal.

### 4.5 Official handoff component

The handoff component has one job: help the citizen transfer reviewed facts while clearly returning control to them.

It displays, in this order:

1. the current result and limitation;
2. `Prepared for`, the official destination purpose, exact domain, and last-verified date;
3. the optional private-device challan-number copy aid;
4. the confirmed issue category on legacy only, with a copy control only on private devices and selectable manual-transcription text on shared devices;
5. the editable description, citizen-facing live `n of 500` counter, help text explaining the Unicode-safe count, and the same device-appropriate copy/manual-transcription treatment;
6. the destination-specific evidence/readiness checklist, including legacy-only guidance that any attachment must be chosen directly on the official service;
7. role-accurate confirmation: `My case` requires the affected person to confirm they reviewed the pack and will submit only truthful information for a matter they are entitled to raise; `Helping someone present` requires the affected person to confirm they reviewed the pack and asked for preparation help, while copy states that the affected person—not the helper—must independently authenticate, declare, and submit;
8. an explicit leaving-ChallanSakshi notice;
9. a registry-driven `Open [official service name]` anchor whose label never promises a grievance form for `delhi-manual` or `unresolved`; and
10. only after that complete installation-free handoff, an `Optional desktop helper` disclosure gated by private-device mode, the public Store/adapter release state, and the citizen's explicit supported-desktop confirmation. When enabled, it contains a separate `Review desktop helper and installation` anchor that preserves the review by opening `/extension` in a new tab with `rel="noreferrer"` and no state/query/fragment, plus an `Already installed? Prepare reviewed fields` button, and it never detects an installation.

The component does not use an asynchronous `window.open` call. The external route is a normal user-activated anchor with `target="_blank"` and `rel="noreferrer"`, preventing popup timing failures and keeping the destination transparent.

On private devices, clipboard actions are separate, explicit user gestures. The panel may offer `Copy reviewed category and description`, but must keep the challan number and any local reference separate. If the Clipboard API is unavailable, each field remains selectable and the interface explains how to copy it manually. A copy success state must be announced in a polite live region. Shared-device mode never invokes or exposes a clipboard action; it keeps the reviewed values visible and selectable with manual-transcription guidance.

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

A helper may not independently record `I saw an acknowledgement` on another person's behalf. If that person personally saw it, remains present, and explicitly confirms the exact return state and optional last-four fragment, the helper may type the entry; it is labelled `Affected-person-reported; entered with a present helper` and remains unverified by ChallanSakshi. The helper never consents, authenticates, declares, or submits for the citizen.

### 4.7 Optional desktop extension

The extension is an independent Manifest V3 package named `ChallanSakshi Assisted Handoff`. It has one narrow purpose: after a citizen confirms a supported handoff pack, transfer only the reviewed description and, on a verified legacy form, the internal issue code that the bundled adapter maps to an exact category.

The chosen source-pull sequence is:

1. On an eligible private-device `/review` result, the citizen may first use the separate normal `Review desktop helper and installation` anchor; if already installed, they explicitly choose `Already installed? Prepare reviewed fields` to create the capsule. The website never detects or messages the extension.
2. The citizen invokes the extension on `/review`, affirmatively continues past a static pre-handling disclosure before any tab/storage/page access, previews the exact eligible description and, when applicable, category, and explicitly loads them.
3. The extension validates and keeps one one-use envelope plus the exact source tab/document binding in trusted-context `chrome.storage.session`, with an effective expiry equal to the earlier of the source expiry or ten minutes after import; every later source probe targets the current top frame and rejects unless its returned `documentId` still equals that binding.
4. The citizen opens the official service through the normal transparent web anchor and independently reaches the relevant form.
5. The citizen invokes the extension again, gives fresh per-invocation consent before page access, previews the exact fields on one exact top-level Chrome document, and explicitly chooses `Fill empty reviewed fields`.
6. One bundled, fail-closed adapter preflights the current active top frame, requires its document ID to match the preview, arms a minimized payload-free persistent nonce marker, erases the session payload, and only then targets that document to fill blank allowed controls. The attempt is one-use and the extension never watches the page afterward.

The extension does not receive the optional challan-number bridge, complete `OfficialHandoffPack`, citizen-review signature, raw evidence files/images/attachments, structured observation/source records, full evidence summary, filenames, URLs, selectors, acknowledgements, or open-ended field instructions. It receives no dedicated structured citizen/vehicle/challan/government/official-reference identifier property, although its exact user-reviewed description may inadvertently contain sensitive factual prose because the bounded checks are not a guarantee. On the official page it never reads or fills identifier, CAPTCHA, OTP, Aadhaar/VID, credential, contact, payment, offence, attachment, declaration, hidden, or submit controls. It never navigates, clicks a portal control, calls or dispatches submission, retries silently, or reports an official outcome.

The production manifest requests exactly `activeTab`, `scripting`, `storage`, and `alarms`; sets incognito to not allowed; and declares no host permissions, optional hosts, persistent content scripts, external-connectivity channel, web-accessible resources, clipboard permission, tabs permission, network interception, remote code, remote configuration, or telemetry. The extension code handles only the consented current origin/path, ephemeral source and destination tab/document IDs, the reduced pack metadata and values, the one or two allowed controls' structure/blankness/bounded readback, and its bounded lifecycle state. Values and browser identities remain session-only: the payload and source binding leave storage before injection, while the destination correlation remains only through settlement; one exact `chrome.storage.local` safety ledger retains only minimized opaque nonce/pack/replay/warning metadata. The extension makes no developer-directed or extension-originated network request and ChallanSakshi's operator receives none of the extension data. After the explicit Fill click, the user-selected official portal is the sole intended external recipient of inserted description/category values, and its own code may process or transmit them under that service's terms. The detailed consent, envelope, adapter, storage, privacy, CSP, packaging, test, and release contracts live in the separate extension specification.

Because no current retained audit exposes a trustworthy final-form selector and browser-native-setter/no-event contract, the real legacy and NextGen adapters begin `internal-disabled`. The first build enables only a clearly synthetic form adapter. A real adapter may be enabled only after current lawful, non-submitting DOM verification and the extension-specific legal/authorisation and release gates pass. An adapter stays disabled if its portal requires the extension to dispatch input, change, click, custom, or submission events. An unavailable or disabled extension always falls back to the already visible in-tab field pack and official anchor, using private-device copy or shared-device manual transcription.

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
- Offer field-by-field copy controls on private devices and visible selectable manual-transcription values without clipboard actions on shared devices.
- Keep private-device lookup-value copying separate and optional.
- After the complete web-handoff controls and visible official anchor, offer the optional helper only when the public Store/adapter release flag permits it, private-device mode is active, and the citizen explicitly confirms desktop Google Chrome at or above the manifest's declared release-time Stable floor. The card first offers a normal first-party `Review desktop helper and installation` anchor to `/extension` in a new `noreferrer` tab with no state/query/fragment, and separately offers `Already installed? Prepare reviewed fields`; it never detects or infers installation. Preparation creates a one-use capsule carrying a ten-minute source expiry and containing no raw evidence file/image/attachment, structured observation/source record, full evidence summary, or dedicated structured full/direct citizen/vehicle/challan/government/official-reference identifier property; its IDs are opaque random protocol values only. The exact reviewed description may contain factual prose derived from citizen-confirmed observations, including a citizen-approved masked final-four vehicle fragment, and may still contain a sensitive fact the bounded checks miss. The UI therefore never claims the prose is evidence-free or proven non-sensitive. Browser/extension detection, viewport, pointer, and user-agent hints are never treated as a security boundary; ordinary mobile Chrome, Edge, Brave, other Chromium-family browsers, and unsupported browsers keep the full web handoff.
- In `Helping someone present`, helper preparation is allowed only while the affected person remains present and separately confirms the exact category/description plus permission for the helper to load and place those fields. The extension copy says the affected person must inspect the result and independently authenticate, declare, and submit. The helper cannot independently assert an acknowledgement; they may enter the affected-person-reported state/reference fragment only while that person is present and explicitly confirms the exact entry.
- Shared-device mode, `delhi-manual`, `unresolved`, stale, consistent, and inconclusive states never expose extension preparation.

### Stage 6 — Open the official service

The leaving notice says:

> You are leaving the ChallanSakshi website for [official service name] at [domain]. The website cannot access or edit that tab, submit anything, track the portal, or receive its result. If you later invoke the optional desktop helper, it can place only the reviewed category and/or description after another preview and approval. Neither the website nor the helper clicks or calls Submit. That service's privacy and security terms apply after you leave.

The citizen handles every identifier, CAPTCHA, OTP, Aadhaar/VID if the official portal independently offers it, identity check, offence selection, attachment, declaration, submission, and payment only there. If a verified extension adapter is enabled, it may fill only the already reviewed category and/or description; the citizen reviews those values before proceeding.

After link activation, ChallanSakshi says:

> [Official service name] opened from this review. The ChallanSakshi website has not submitted anything. Continue only after confirming the official domain.

For `legacy` and `nextgen`, the purpose may say `official grievance service`. For `delhi-manual` and `unresolved`, it must say only `official service` or `official site`; it must not imply that a grievance form or field-compatible submission route was verified.

Extension users independently invoke the browser's extension-action UI only after they have reached a supported blank form. The website never commands the extension, passes selectors, navigates the official tab, or treats a fill response as submission.

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
- Evidence files, previews, structured answers, complete field packs, optional lookup values, and acknowledgements stay in current-tab memory. Only the reduced extension envelope—with opaque random protocol IDs and no dedicated structured full/direct citizen/vehicle/challan/government/official-reference identifier property—may cross into the optional extension after the citizen's explicit supported-desktop preparation and extension-load actions. Its reviewed free text remains subject to the explicitly incomplete safeguards above and may contain the allowed masked final-four vehicle fragment.
- No real evidence or case payload enters the website's `fetch`, XHR, beacon, WebSocket, EventSource, server action, `/api/analyze`, analytics, session replay, error payloads, cookies, Web Storage (`localStorage` or `sessionStorage`), IndexedDB, Cache Storage, website service worker, URL state, or browser-history writes. The sole explicit browser-extension exception is the reduced envelope that the separately packaged Manifest V3 extension processes after web preparation plus consented extension preview/load and keeps only in memory-backed `chrome.storage.session` until pre-dispatch erasure. One exact `chrome.storage.local` safety ledger may keep only payload-free opaque arm-nonce/pack/replay/warning metadata; browser tab/document IDs, attempt ID/deadline, and field values never enter it.
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

### 7.3 Optional extension context

- The website does not call, detect, ping, or send a message to the extension. On every action invocation the popup first shows packaged disclosure; only `Continue to preview this page` authorises access for that popup instance. On ChallanSakshi this means the one current source probe; when fields are already loaded, the static official-page disclosure explicitly says Continue may inspect both the current allowlisted blank controls and the previously approved source tab/document/capsule before preview/fill. Closing or `Not now` performs no tab query, storage read, worker message, current-page injection, or source re-probe. Background reconciliation can process only already-consented lifecycle metadata and never inspect a page.
- The first consented extension-action invocation authorises one exact source-capsule probe solely to construct the preview. `Load reviewed fields` scrubs popup values, sends only an ephemeral full-envelope digest plus source-tab/source-document binding, and triggers a second complete current-top-frame probe immediately before storage. Destination preview/fill each require a new per-invocation consent and re-probe `{ tabId: sourceTabId, frameIds: [0] }`, rejecting unless the one returned `documentId` equals the stored original source binding. A same-path replacement source document is rejected even with byte-identical capsule text; the exact same BFCache-restored source document may continue only when current and fully revalidated. No probe runs from the website or from an unconsented popup.
- Outside its exact reviewed description, fixed issue code, and opaque protocol metadata, the envelope contains no raw evidence file/image/attachment, filename, structured observation/source record, full evidence summary, dedicated full/direct real-world citizen/vehicle/challan/government/official-reference identifier property, source document, full field pack, citizen-return state, URL, selector, or executable instruction. Its description can restate factual prose derived from confirmed observations, can include a citizen-approved masked final-four vehicle fragment, and may still include a sensitive fact missed by bounded checks; it is never represented as evidence-free or proven non-sensitive.
- The extension keeps one envelope plus its exact source tab/document binding only in trusted-context `chrome.storage.session`, for one attempt. Every preview/action rejects at the effective expiry `min(source expiry, import + 10 minutes)`; if the browser/device sleeps, physical deletion occurs when Chrome next delivers the alarm or starts the worker. The payload and source binding are also cleared on replacement, explicit discard, validation failure, and always before fill injection; only the already-running fill command may retain that binding in memory through the final current-frame source probe/dispatch boundary.
- Before dispatch, the worker writes and exactly reads back one closed, payload-free, trusted-context `chrome.storage.local` safety-ledger record, capped with the whole ledger at 32 records. The unresolved-live form contains only opaque `armNonce`, `packId`, and `replayUntil`; orphan conversion removes the nonce, while terminal warning/replay forms retain only pack/replay and an applicable warning deadline/outcome. It contains no description, field value, route, issue, tab/document ID, attempt ID/deadline, URL, domain, or citizen/case identifier. The matching generation/nonce/pack/replay/attempt/deadline/destination tuple remains session-only. No other persistent or synchronized store is used.
- Exact valid complete, partial, or indeterminate results replace unresolved state through a crash-safe session-settling → local-terminal → session-clear sequence. Known partial/indeterminate/late results become a persistent `needs-review` warning until affected-person acknowledgement or `settledAt + 24 hours`; complete, inspected, and closed-unresolved replay records remain only through `replayUntil`.
- A transport/worker/watchdog/malformed/stale-result path stays unacknowledgeably unresolved with no time-based clear. The exact delivered destination `tabs.onRemoved` event may begin three-phase closed-unresolved settlement only when its tab ID equals the destination in a valid same-browser-session consuming tuple and local `armNonce + packId + replayUntil` matches. A successfully read missing correlation converts local unresolved-live to unresolved-orphaned, removes `armNonce`, reconstructs no browser identity, and ignores every later numeric tab event; a present mismatch is quarantined. Tab-ID absence, navigation, replacement, elapsed deadline, and extension startup/update/reload/disable do not prove cancellation or clear it; Chrome's public `runtime.onStartup` contract is not represented as such proof. If close intent was durably recorded, restart reconciliation can finish it; if the event/correlation was missed, uninstall/manual storage clearing remains a disclosed device-owner recovery limit only after every relevant official tab and browser process is closed.
- Web reset, evidence/pack edits, inactivity clear, role/permission withdrawal, and Quick Exit synchronously unmount the source capsule. A merely staged envelope becomes unusable on the next probe or effective expiry; if the final fill-action source authorization probe observes the change, the command cancels before injection. Because the website has no extension command channel, there is no cross-tab atomic revocation after that final probe returns: accepted in-flight work may still dispatch even if a later web action occurs, and the persistent safety-ledger rules govern it. The web and popup disclose this boundary accurately; `Clear prepared fields` clears only staged state and never bypasses a consuming or unresolved record.
- The extension makes no developer-directed or extension-originated network request, writes no telemetry, and uses no persistent store except the exact bounded payload-free safety ledger; it never uses synchronized storage. After explicit Fill, the official page is the sole intended external recipient of inserted values and its own code may process or transmit them under its terms.

### 7.4 AI and deterministic control

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

As part of this vertical, `case-04-category-conflict` is corrected from the current generic `Scooter versus motorcycle` inconsistency to an explicit `Two-wheeler versus four-wheeler` fixture. The vehicle record remains a blue Honda Activa 6G/two-wheeler, while the enforcement-image observations consistently describe a white Maruti Swift/four-wheeler. Both explicit classes, colours, makes/models, sources, confidence, limitations, and citizen confirmation are present. This reuses and repairs case 04 rather than adding a showcase-only fixture, and it satisfies the field-pack eligibility gate instead of turning a generic category difference into a class-specific grievance.

### 8.2 Proof sequence

The timed flagship core is deliberately limited to six beats:

1. Load the repaired bundled `case-04-category-conflict` (`Two-wheeler versus four-wheeler`) in `/demo/test-lab`.
2. Show source-linked observations, confidence, limitations, truthful analysis provenance, and citizen confirmation.
3. Compute the bounded finding and generate a permanently labelled `SyntheticHandoffSimulation` through the same neutral fact/mapping/revision core used by the real pack, without asserting an official source or compatible government form.
4. Show `Web handoff · works everywhere`, activate `Simulate opening the official review route`, and show the clearly simulated citizen-recorded return state without contacting a government service.
5. Use one explicit `Correct the image observations` action to atomically restore the enforcement-image class/category, colour, and make/model to the confirmed blue Honda Activa 6G/two-wheeler; visibly invalidate confirmation, pack, and return state, then reconfirm and recompute to `Appears consistent`.
6. End on the AI-extracts/rules-compare/citizen-controls boundary and the exact public-product call to action.

That core completes within 90 seconds. A separate `Show guardrails` continuation completes the under-two-minute proof by switching through one inconclusive and one consistent case without pretending either should produce a grievance. The skippable synthetic extension simulation comes after the timed proof; it previews and fills only the fictional category and description, lists every untouched protected field, and never becomes a dependency for the judge narrative.

### 8.3 Demo truthfulness

- The synthetic banner remains visible on every viewport and every step.
- No government seal, police badge, copied official form, or official-looking receipt is used.
- The final handoff is labelled `Official handoff simulation`.
- The simulated acknowledgement is labelled `Synthetic citizen-recorded example`.
- The demo never says it fetched, filed, paid, authenticated, tracked, cancelled, or won a real case.
- Real citizen tools remain one deliberate exit away and never inherit fixture state.
- The demo does not reproduce an official government form, CAPTCHA, OTP, emblem, success message, e-ticket, or official-looking receipt.
- The primary judge proof does not reuse the deeper fictional submission and outcome tracker in `ChallanSakshiApp.tsx`; that narrative may remain available as a clearly synthetic exploration but is not evidence of real-mode capability.
- The judge path never requires an installed extension. Any extension demonstration uses a conspicuously synthetic form fixture and says that real official adapters remain disabled until verified and approved.

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
- `lib/official-handoff.ts` — shared neutral fact/mapping/normalization/revision core plus closed real and synthetic wrappers that emit incompatible `OfficialHandoffPack` and `SyntheticHandoffSimulation` types.
- `lib/official-handoff-receipt.ts` — pure local-link and citizen-reported acknowledgement state, signature binding, redaction, and invalidation.
- `lib/extension-handoff-contract.ts` — reduced exact-schema envelope construction, normalization, digest, expiry, sensitive-pattern rejection, and real/synthetic separation.
- `lib/extension-release.ts` — closed deploy-time public-release state and exact first-party/Chrome Web Store acquisition URLs; no user/case input, query, or fragment may enter either URL.
- `components/public-beta/OfficialHandoffPanel.tsx` — real handoff, copy, leaving notice, return states.
- `components/public-beta/OfficialHandoffPanel.module.css` — responsive presentation using existing tokens.
- `components/public-beta/ExtensionAssistCard.tsx` and `.module.css` — private-desktop preparation, accurate extension-storage disclosure, invalidation, separate `Review desktop helper and installation` new-tab anchor versus `Already installed? Prepare reviewed fields` action, no install detection/deep-linking, public-release gating, and fallback to the universal in-tab pack/official-link handoff with device-appropriate copy or transcription.
- `app/extension/page.tsx` — first-party pre-install disclosure and independence/data-use explanation with no user/case state; exposes the exact verified Store anchor only when every public extension release gate is open and never offers a sideload.
- `tests/official-destinations.test.ts` — URL, scope, freshness, and no-user-input invariants.
- `tests/official-handoff.test.ts` — readiness, mapping, wording, Unicode-code-point length, destination differences, self/helper roles, pack invalidation, and bidirectional real/synthetic mode-source-route rejection.
- `tests/official-handoff-receipt.test.ts` — direct observation boundary, citizen-reported state, redaction, signature binding, rejection of unconfirmed helper claims, acceptance/labeling only for the affected-person-present confirmed branch, last-four limits, and invalidation.
- `tests/official-handoff-contracts.test.ts` — rendered privacy, accessibility, no-automation, and distinct English/Hindi/Simple Mode self-versus-present-helper boundaries.
- `tests/extension-handoff-contract.test.ts` — exact keys, permitted fields, normalization, length, expiry, digest, and sensitive-data rejection.
- `tests/extension-landing-contract.test.ts` — release gating, fixed state-free `/extension` new-tab anchor, pre-install disclosure, exact parameter-free Store listing URL/ID, no install detection or extension deep-link, and no install/sideload action before approval.

The separately built `extension/` subsystem contains compile-time-isolated synthetic-development and production-shaped packages, generated manifests, a vanilla TypeScript popup, Manifest V3 service worker, source probe, destination adapter registry, single-attempt fill function, and local icons. Only the synthetic package contains the fixture adapter; no production artifact contains synthetic or loopback capability. The web Vinext/Cloudflare build does not bundle or serve extension code.

The actual unpacked-extension proof uses exact conspicuously synthetic routes at `app/demo/extension-fixture/source/page.tsx` and `app/demo/extension-fixture/destination/page.tsx`. Compile-time-isolated synthetic and production profiles never accept one another's mode, source, or adapter registry.

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
- `app/review/page.tsx` — replace absolute tab-memory-only metadata with accurate wording about the optional explicit extension transfer.
- `README.md` — document the vertical, real/demo separation, field-pack boundary, official-link governance, and release prerequisites.
- `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, and `.gitignore` — isolated extension build/typecheck/test/package commands; direct lock-pinned Chrome types, Playwright, DOM-test, and deterministic-ZIP development dependencies; and ignored generated extension/release/browser output.
- `eslint.config.mjs` — keep authored extension source/tests inside root `eslint .`, add scoped extension/test globals and rules, and globally ignore only generated `extension/dist/**` and release-package artifacts.
- `tests/public-mode-privacy.test.ts` — replace the current blanket transitive `/review` ban on every `<textarea` with one exact allowlist for the controlled handoff description editor. Preserve the bans on `<form>`, raw evidence paste, network send, persistence, unsafe HTML, user-data URL/history writes, and every textarea outside that component; do not evade the contract with `contenteditable`.
- `tests/citizen-review-contracts.test.ts` — assert that role changes, affected-person confirmation changes, return-state changes, and pack revisions invalidate the acknowledgement and role-bound extension preparation; cover separate helper-review and preparation controls, `target="_blank"`/`rel="noreferrer"`, no query/fragment/state, no install inference, public-release gating, and English/Hindi, Simple Mode, keyboard, zoom, shared-device, and narrow-mobile behavior.
- `tests/local-record-intake.test.ts` and existing privacy, citizen-review, demo, mobile, and deployment contract tests.

The official destination registry, pack builder, acknowledgement state, and reduced extension contract must have no React dependency. The real and synthetic interfaces consume them through explicit adapters so fixture state can never enter the real route. The existing ten-case synthetic corpus is reused; this vertical does not add a fixture merely to increase a demo count.

## 11. Accessibility and language

The complete real vertical and judge path must work in English and Hindi.

Required behavior:

- semantic headings preserve one clear page hierarchy;
- progress uses text as well as visuals;
- all private-device copy controls have field-specific accessible names, and shared-device manual-transcription values retain explicit labels/instructions without exposing clipboard actions;
- copy and return-state changes are announced in a polite live region;
- opening an external official site is stated in the accessible name or adjacent text;
- keyboard focus moves to the new stage heading after internal transitions;
- field errors identify the field and correction needed;
- no result relies on colour alone;
- Simple Mode keeps every safety boundary and decision state;
- 200% zoom remains usable;
- reduced motion removes non-essential transitions; and
- Hindi does not fall back to English for consent, result, handoff, return, or limitation copy.

The extension popup must also support complete keyboard operation, visible focus, status and error live regions, English/Hindi boundary copy, Simple Mode without removed safeguards, 200% zoom, and a minimum usable popup width. It never machine-translates the citizen-reviewed description.

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

Public enablement or distribution of the extension additionally requires:

- written portal-owner authorisation, or a written legal determination that separate authorisation is not required for the exact adapter behavior;
- a lawful, retained, non-submitting DOM/native-setter/no-event verification for every enabled adapter;
- a current publicly accessible extension Privacy Policy linked from the designated Chrome Web Store Developer Dashboard field and from the project homepage or a page one click away;
- complete Policy, Store, and in-product disclosure of every local data class, why/how it is handled, each recipient, retention/recovery limit, and deletion path—including that the developer receives nothing and the official portal is the sole intended external recipient of inserted values after Fill;
- prominent plain-language disclosure on the extension landing/listing page before installation, followed by the explicitly labelled standard installation action as affirmative consent, and again inside the product before new page/user-data handling, followed by separate affirmative per-invocation Continue consent;
- accurate Store privacy declarations and Limited Use certification plus a developer-written Limited Use compliance statement on the public project homepage or a page one click away;
- a prominent Store/UI explanation that transient browsing-origin/path and page-content handling serves only the single reviewed-field handoff, with no advertising, profiling, unrelated research, or developer human access;
- a narrow single-purpose Store description and an exact justification for each of `activeTab`, `scripting`, `storage`, and `alarms`, reconciled across manifest, listing, dashboard, Privacy Policy, product UI, and observed behavior;
- extension-specific Terms consistent with those disclosures;
- independent extension security and privacy review, dependency inventory, licence review, SBOM, reproducible release ZIP, and checksum;
- protected Store publisher access with hardware-backed MFA and least-privileged roles;
- at least one current, authorised, unexpired public-enabled production adapter; the zero-real-adapter `production-disabled` package is never submitted to the Store;
- Chrome Web Store approval, staged rollout, adapter emergency-disable process, rollback, and takedown ownership;
- a final adapter verification within 24 hours before packaging, with an absolute adapter lifetime no longer than 30 days; and
- update controls that revise the listing/dashboard/Policy/Terms/in-product disclosure and obtain fresh consent before changed data handling or purpose ships.

The release owner must re-read and record the current official Chrome Web Store permissions, privacy, user-data/Limited-Use, single-purpose, minimum-functionality, and metadata rules on the actual submission date. Policy drift blocks submission until this design and its reviews are updated.

The public must never be instructed to install an unpacked ZIP or bypass browser extension warnings. Chrome Web Store approval, if obtained, is not government approval.

Until the web controls are proven, the code may be described as a `Public-beta candidate`, but the product may be presented to people only as a non-public prototype or a synthetic demonstration. It may not be offered to real citizens as public early access or public beta. The extension may separately be called a `Synthetic development build` or `Internal adapter candidate`; it may not claim live official autofill while real adapters are disabled. Even after the gates pass, neither product may be called `general availability`, `secure`, `DPDP compliant`, or `government authorised` without separate evidence supporting that exact claim.

## 13. Release terminology and prohibited claims

Allowed descriptions:

- `Independent citizen evidence-preparation tool`;
- `Possible vehicle or evidence discrepancy`;
- `User-reviewed factual field pack`;
- `Open the official portal and submit it yourself`;
- `Official portal link`;
- `Last four characters of an official reference, recorded by the citizen`;
- `Citizen-reported acknowledgement; not verified by ChallanSakshi`;
- `Optional desktop helper`;
- `Placed the reviewed description into this official page in your browser. Review every field. The extension did not click or call Submit.` or, when category is also present, `Placed the reviewed description and category into this official page in your browser. Review every field. The extension did not click or call Submit.`; and
- `Synthetic demonstration data`.

Prohibited descriptions:

- `Official e-Challan partner`;
- `Government approved`;
- `Connected to Parivahan, VAHAN, police, NHAI, IHMCL, a bank, or a court`;
- `Live government data`;
- `Verified by government`;
- `Submit through ChallanSakshi`;
- `Autofilled the government portal`, `filled the form for you`, `one-click complaint`, or `auto-submitted`;
- `Official extension`, `government extension`, or any claim that Store approval is government approval;
- `We filed or tracked your grievance`, `grievance submitted successfully`, or `ticket created`;
- `Wrong or invalid challan detected`;
- `Duplicate or cloned number plate` based only on an image mismatch;
- `Guaranteed cancellation, refund, reversal, or win`;
- `Legal complaint or legal deadline confirmed`;
- `Do not pay`, `payment is paused`, or `the grievance extends your deadline`;
- `AI proves the photo is wrong`;
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
- The description is Unicode NFC with LF line endings and at most 500 Unicode code points after every generation, edit, and normalization step; web and extension tests cover emoji, Devanagari, and combining-mark boundaries without UTF-16 truncation.
- Every generated factual statement is traceable to a confirmed source and result revision.
- Editing an input invalidates the result, pack, and acknowledgement downstream.
- The external route contains no user data and resolves only from the allowlisted registry.
- CAPTCHA, OTP, Aadhaar/VID, credentials, payment, and submission never enter ChallanSakshi.
- `Official service opened from this review` is the furthest directly observed state; every later acknowledgement state is explicitly citizen-reported.
- Raw filenames and optional lookup values never enter exported artifacts.
- A full official acknowledgement, grievance reference, OTP, Aadhaar/VID, or portal screenshot cannot enter the local receipt.
- Shared-device mode exposes no sensitive copy, download, optional lookup bridge, or persisted acknowledgement.
- `My case` and `Helping someone present` render distinct confirmation contracts. Helper mode requires the affected person present and separately reviewing the pack; the helper never authenticates, declares, submits, or independently asserts an acknowledgement for them. A helper may type an affected-person-reported return state/reference fragment only while that person is present and explicitly confirms it. Optional extension preparation in helper mode requires the same affected-person review and permission.

### 14.2 Judge path

- The dual AI/deterministic boundary is visible within 15 seconds.
- The six-beat flagship core completes in 90 seconds without requiring a government request; the consistent and inconclusive guardrail continuation completes the full proof within two minutes.
- The flagship proof uses the repaired `case-04-category-conflict` Test Lab case with explicit two-wheeler/four-wheeler facts and a simulated handoff, not the fictional real-looking submission tracker.
- The visible proof-entry action selects case 04 and clears stale synthetic state deterministically; corpus/unit tests assert that its record and enforcement category, make/model, and colour observations are internally consistent on each side and satisfy the explicit-class field-pack gate; component and browser tests cover the entry contract.
- The demo shows discrepancy in the timed core, then consistent and inconclusive behavior in the labelled guardrail continuation.
- Editing a material observation invalidates confirmation and recomputes the outcome.
- The synthetic route and real route share only the pure neutral fact/mapping/normalization/revision core. Closed mode wrappers emit `SyntheticHandoffSimulation` versus `OfficialHandoffPack`; cross-mode/source/route inputs are rejected, and fixture data can never acquire official-source or form-compatibility semantics.
- Analysis provenance is visible and never claims a live OpenAI call when the observation is bundled or precomputed.
- Every demo screen remains visibly synthetic.
- The path never implies a real official fetch, filing, payment, acknowledgement, or outcome.
- The optional extension simulation appears only after the timed under-two-minute proof and is never required to understand or judge the core product.

### 14.3 Optional desktop extension

- The complete in-tab field-pack and official-anchor path works without detecting, installing, or using an extension; private devices can copy explicitly, while shared devices use visible manual transcription with no clipboard action.
- The official anchor appears before the optional-helper card. Only after Store approval and a current public-enabled real adapter may that card expose a state-free `Review desktop helper and installation` new-tab anchor plus a distinct `Already installed? Prepare reviewed fields` action; the first-party landing page shows pre-install disclosure before the exact verified parameter-free Store link, and neither route detects, messages, or deep-links into an installed extension. Before those gates, public real routes expose neither acquisition nor preparation and never offer a sideload.
- When its environment release flag and an eligible adapter state permit it, extension preparation requires private-device mode, the citizen's supported-desktop confirmation, and a current confirmed `legacy` or `nextgen` pack; every other state falls back to web handoff. The confirmation is a support disclosure, not a security attestation, and the public real route does not advertise live filling while both real adapters are disabled.
- The production Manifest V3 permission array is exactly `activeTab`, `scripting`, `storage`, and `alarms`, with incognito disabled and all host, external-connectivity, network-interception, remote-code, and unnecessary persistent capabilities excluded by contract.
- A named reviewer retains dated headed-Google-Chrome evidence on at least the manifest's declared floor—which must be no lower than the release-time desktop Stable major—for actual action-icon invocation and temporary `activeTab` behavior on both exact synthetic fixtures, including separate source/destination tabs, cross-origin-or-close revocation, and same-origin source-path/capsule invalidation through re-probe. Direct popup-URL navigation and automated popup code are not accepted as proof of a physical browser-action gesture.
- No webpage can call or push data to the extension. Every popup opening requires static pre-handling disclosure and ephemeral affirmative Continue consent before tab/storage/page access; source loading and destination filling then each require a current-tab preview and explicit action. Preview values are scrubbed from popup DOM/heap before Load or Fill.
- Outside the exact reviewed description, fixed issue code, and opaque protocol metadata, the reduced envelope contains no dedicated citizen-identifier property, raw evidence file/image/attachment, structured observation/source record, full evidence summary, filename, URL, selector, complete pack, acknowledgement, or arbitrary field map. It uses the fixed canonical JSON order, is no larger than 8,192 UTF-8 bytes, binds the NFC/LF description with a 64-hex SHA-256 digest, passes the exact bounded pattern predicates and explicit citizen review, is one-use, and becomes unusable by `min(source expiry, import + 10 minutes)`. Acceptance copy acknowledges that reviewed prose can still contain a sensitive fact missed by the bounded checks.
- The extension stores only one envelope payload plus its exact source tab/document binding in trusted-context `chrome.storage.session`; serializes every lifecycle operation; rejects it at logical effective expiry; and erases the payload and source binding on explicit clear, replacement, validation failure, or before fill injection. Every later source probe targets the source tab's current top frame and requires its returned `documentId` to equal that binding; a same-path replacement document is never adopted even with byte-identical capsule text, while the same BFCache-restored document may continue only when current and fully revalidated. Only the active pre-dispatch worker call frame may retain the source binding through the final probe; it is cleared before the last destination action-tab/deadline check and immediate dispatch. One exact trusted-context `chrome.storage.local` safety ledger contains at most 32 payload-free opaque lifecycle records and is the only persistent exception. Local unresolved-live is only `armNonce + packId + replayUntil`; all browser/attempt/deadline data remains session-only. The ledger preserves replay through `replayUntil`, a settled warning through affected-person acknowledgement or `settledAt + 24 hours`, and unresolved execution state without a time clear. Startup/update/reload/disable cannot erase the ledger but can clear session correlation; the next reconciliation converts recognized unresolved-live to unresolved-orphaned, removes `armNonce`, reconstructs no browser identity, and forbids later numeric-tab settlement. Web reset, edits, inactivity clear, permission withdrawal, and Quick Exit remove the source capsule and cancel only when observed by the final source authorization probe; after that probe returns they cannot atomically revoke accepted in-flight work or erase ledger state.
- The synthetic-development package enables only its exact loopback fixture and rejects real mode. The production-disabled package rejects synthetic mode and keeps Legacy and NextGen `internal-disabled` until their exact form/native-setter/no-event contracts and legal/authorisation gates are current and retained. No artifact contains both registry families.
- An enabled adapter requires an exact HTTPS origin and path, top-frame execution, unexpired bundled contract, unchanged original source tab/document/capsule binding, complete preflight, exactly one blank visible editable target per allowed field, and a current allowlisted structural fingerprint before any mutation.
- Destination preview captures an exact active-top-frame Chrome `documentId`; every destination action also requires the popup-supplied tab ID and worker's fresh active/last-focused tab ID to equal the stored destination. Fill-action preflight targets current `frameIds: [0]` and requires its returned ID to match; after the final asynchronous source probe, the worker repeats the destination action-tab/deadline check and performs no further await before final fill targets the stored document. The fill function checks visibility at entry, before each setter, and at readback. A different current document, background-tab command, same-URL reload to a new document, missing/extra result, hidden document, or frame/document mismatch cancels and requires a new preview. The exact same BFCache-restored document may continue only after full revalidation; no atomic lifecycle or focus lock is claimed.
- The extension fills only the reviewed description and, on verified legacy, the mapped category. On the official page it never reads or fills identifier, authentication, challenge, contact, payment, offence, attachment, declaration, hidden, or submission controls; this control-level boundary does not imply that reviewed free text is guaranteed to contain no sensitive fact.
- The extension never navigates, clicks, dispatches input/change/custom/submission events, watches mutations, retries silently, reads portal storage/cookies/network, takes screenshots, or sends telemetry. A real adapter uses only browser-native setters and stays disabled unless the audited no-event assignments cause zero page-initiated submit, navigation, autosave, or network transmission during the bounded verification window.
- Any absent extension, unsupported or changed page, expired pack/adapter, validation error, existing field value, or partial attempt fails closed to the installation-free in-tab pack/official-link handoff—private-device copy or shared-device manual transcription—without claiming success.
- Before any fill injection, an exact arming session tuple is written/read, minimized local unresolved-live nonce marker is written/read, and only then is the session payload replaced by a payload-free consuming correlation record. Valid result, pre-dispatch cancellation, and exact close settlement use session-settling → local-terminal → session-clear, with reconciliation before expiry pruning. Exact complete becomes replay-only; exact partial/indeterminate/late completion becomes persistent `needs-review`; a transport rejection, worker/watchdog loss, malformed/stale/mismatched result, or settlement-storage ambiguity remains unresolved and blocks acknowledgement/new loads.
- Unresolved-live may enter close settlement only when an exact delivered `tabs.onRemoved` ID equals the valid same-browser-session consuming destination and its local nonce/pack/replay subset matches. Missing correlation converts it to unresolved-orphaned, removes the nonce, and reconstructs no tab/document data; a present mismatch quarantines. Orphaned state settles only through disclosed device-owner recovery after every relevant official tab/browser process is closed. Tab lookup absence/error, navigation/replacement, elapsed time, and extension startup/update/reload/disable do not clear either variant. Known settled warnings can be acknowledged only after the affected person inspects the form.
- Every fill carries a worker-owned mutation deadline no later than 30 seconds after dispatch and no later than the envelope/adapter expiries. The isolated injected function checks it at entry, immediately before each setter, and before readback. This is fail-fast—not cancellation—and the product does not claim the clock cannot cross between a passing check and the synchronous setter; the prewritten unresolved/settlement protocol owns that ambiguity.
- The production package contains no localhost/staging origin, remote code, remote asset, remote configuration, source map, or disabled policy bypass.

### 14.4 Automated verification

- Unit tests cover route allowlisting, issue mapping, safe stops, description limits, source traceability, revision invalidation, role-aware self/present-helper eligibility and copy, affected-person-reported helper return entry, return states, and redaction.
- Static privacy tests cover the complete transitive real-route import graph and prohibit evidence-bearing network/storage/form paths.
- Component contracts cover English/Hindi, Simple Mode, self/present-helper confirmations, helper extension permission, live regions, external-link disclosure, whole-card activation, mobile input size, and shared-device restrictions.
- Extension tests cover manifest permissions, exact source-tab/source-document/capsule binding including same-path replacement documents with byte-identical capsule text, exact envelope validation, storage lifecycle, URL and DOM adversaries, all protected-field exclusions, no-side-effect instrumentation, bilingual popup accessibility, and deterministic synthetic filling.
- The full Vitest suite, web and extension TypeScript, ESLint, web production build, production extension build/package scan, and `git diff --check` pass.

### 14.5 Browser verification

- Real journey: desktop, 390 × 844, and 320px.
- Synthetic judge path: desktop and 390 × 844.
- Synthetic extension fixture: automated Chromium persistent-context harness plus a headed supported-desktop Google Chrome action-icon lane at the declared/current-Stable floor, keyboard-only, English/Hindi, Simple Mode, and 200% zoom.
- Keyboard-only traversal through the complete real vertical.
- Hindi and Simple Mode through consent, finding, pack, handoff, and return.
- No framework overlay, blank route, console error, horizontal overflow, inaccessible hidden input, stale confirmation, or broken official anchor.
- A current-run screenshot set covers every important state.
- Live official routes and visible government form assumptions are re-verified without submitting data.
- A real official adapter receives no browser smoke test until the legal/authorisation gate clears; that later smoke test uses only an authorised synthetic/test account and data, stops before every protected field and submission, and retains only fixed effect counters, allowlisted value-free structural excerpts, reviewer/date/browser/package/adapter hashes, and sanitized visuals under bounded access/retention—never HAR/body/header/cookie/storage dumps, full DOM, tokenized URLs, CAPTCHA/OTP, credentials, payments, protected values, or citizen material.

## 15. Success measures

Product success is measured without collecting behavioural analytics in the first release.

During moderated or synthetic testing, record only aggregate manual observations:

- citizen can identify the correct next action within 10 seconds per stage;
- supported case reaches a confirmed field pack in under three minutes after the official record is available;
- no participant believes ChallanSakshi is a government service;
- no participant expects ChallanSakshi to receive CAPTCHA, OTP, payment, or the official decision;
- no participant believes the optional extension sees protected fields, files a grievance, or replaces the extension-free route;
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
8. Additional extension adapters only after each exact official form receives its own current evidence and legal/authorisation gate.
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

The web vertical's completion does not depend on installing or publicly releasing the extension. The extension foundation is separately complete when the profile-isolated Manifest V3 packages, per-invocation pre-handling consent, source-pull protocol, ten-minute generation-aware session payload, exact current source- and destination-document/current-action-tab binding, minimized persistent payload-free unresolved/replay/warning safety ledger, crash-safe settlement, synthetic adapter, popup accessibility, adversarial tests, production package scan, and dated headed-Google-Chrome action-icon/temporary-`activeTab` evidence at the declared/current-Stable floor pass. Automated popup navigation is never claimed as proof of a physical browser-action gesture. The public acquisition card/landing/Store link, a live official adapter, and public Store extension remain incomplete until their current selector/native-setter/no-event, legal/authorisation, Store, and release gates pass.
