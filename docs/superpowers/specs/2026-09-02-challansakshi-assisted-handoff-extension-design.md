# ChallanSakshi Assisted Handoff Extension — Design Specification

**Status:** Architectural direction selected by the user on 2 September 2026; written extension specification awaiting final user review

**Parent specification:** [`2026-09-02-challansakshi-public-launch-top-10-vertical-design.md`](./2026-09-02-challansakshi-public-launch-top-10-vertical-design.md)

**Product name:** ChallanSakshi Assisted Handoff

**Primary outcome:** an optional supported-desktop Google Chrome helper that transfers at most two reviewed fields which passed bounded safety checks from an eligible ChallanSakshi handoff pack into verified blank controls through two explicit extension approval stages, each initiated from the browser's extension-action UI, in addition to the web preparation and official-link actions

**Initial implementation outcome:** one tested Manifest V3 codebase that emits two mutually exclusive packages: a synthetic-development package with one enabled local fixture adapter, and a production-shaped package whose real legacy and NextGen records remain disabled until their exact DOM/native-setter/no-event and legal/authorisation gates pass

**Universal fallback:** the installation-free in-tab field pack and official-link handoff remains complete on every supported phone and computer; private devices receive explicit clipboard controls, while shared devices keep the values visibly selectable for manual transcription without invoking the Clipboard API

## 1. Decision

The extension is an optional accelerator layered after the web product's complete assisted handoff. It is not required to understand the finding, prepare or inspect the pack, copy on a private device or manually transcribe on a shared device, open the official destination, complete the official process, or record a citizen-reported acknowledgement.

The extension has one narrow purpose:

> After the citizen confirms a supported handoff pack, transfer only the reviewed request description and, on a separately verified legacy form, the internal issue code mapped by the extension to the exact category. Never query or fill protected portal controls and never click, call, or dispatch submission.

The first implementation builds the shared framework and emits a synthetic-development package with one enabled local fixture adapter plus a production-shaped package in which the official legacy and NextGen adapters start `internal-disabled`. No single bundle accepts both synthetic and real envelopes. The real records stay disabled because the current retained evidence does not contain trustworthy final-form selectors, allowlisted structural fingerprints, or verified native-setter/no-event behavior. The legacy page could not be inspected reliably, and the observed NextGen surface stopped at the pre-verification/CAPTCHA stage. Selectors and setter behavior will not be guessed from screenshots, labels, or historical assumptions.

## 2. Approaches considered

### 2.1 Selected: user-triggered `activeTab` source pull

The citizen invokes the extension on the confirmed ChallanSakshi `/review` page, previews the eligible fields, and explicitly loads them. After opening the official service through the normal web anchor and independently reaching a supported form, the citizen invokes the extension again, previews the destination and values, and explicitly fills blank reviewed fields.

Benefits:

- no webpage can wake or command the extension;
- no extension ID is used as a runtime messaging address, source of trust, detection signal, or handoff identifier; the only permitted website occurrence after Store approval is the exact reviewed static Chrome Web Store acquisition URL on the first-party extension landing page, with no user/case data or query/fragment;
- no `externally_connectable` API exists;
- no persistent source or destination host access exists;
- every tab access follows a current user gesture;
- the user sees the exact fields before both loading and filling; and
- absence or failure of the extension leaves the universal installation-free web handoff unchanged.

Cost: two deliberate extension interactions rather than one website button. This is accepted because it materially reduces the authority and compromise surface.

### 2.2 Rejected: website push through `externally_connectable`

This could save one toolbar interaction, but it would expose a persistent background receiver, couple the web build to a production extension ID, and let a compromised allowed origin repeatedly stage data without invoking the extension. Origin checks and schema validation would reduce but not eliminate that unnecessary channel.

### 2.3 Rejected: clipboard or import token

A copied token would avoid external messaging but would add manual paste steps, create clipboard-history exposure, and encourage opaque payload handling. The extension needs only the visible reviewed fields already present on `/review`, so the extra transport is unnecessary.

### 2.4 Rejected: persistent host permissions or content scripts

Persistent government-origin access, `<all_urls>`, broad optional hosts, or always-on content scripts create unnecessary installation warnings, compromise impact, Store-review risk, and background observation capability. The extension performs one current-tab operation after a direct gesture, so `activeTab` is sufficient.

## 3. User journey

### 3.1 Universal assisted handoff

The web product always presents this path first:

1. Review the bounded finding.
2. Review the field pack's exact official service and domain.
3. Optionally use the separate private-device challan-number copy aid.
4. Review the legacy issue category when applicable; copy it only on a private device or manually transcribe it on a shared device.
5. Review and edit the request description; copy it only on a private device or manually transcribe it on a shared device.
6. Review the destination-specific readiness checklist.
7. Complete the role-accurate factual confirmation.
8. Open the official service through a normal top-level anchor.
9. Enter identifiers and complete CAPTCHA, OTP, Aadhaar/VID, declarations, attachments, payment, and submission only there.
10. Return and optionally record a citizen-reported local acknowledgement.

No extension detection, installation, or successful message is required.

### 3.2 Optional source load

The web product exposes `Optional desktop helper` only when all of these are true:

- an operator-controlled release flag is enabled for the current environment;
- the device mode is `private`;
- the citizen explicitly confirms they are using desktop Google Chrome at or above the manifest's declared release-time Stable floor (initially Chrome 152) and understands that ordinary mobile Chrome and other Chromium-family browsers are not yet supported;
- the current result is a supported, confirmed `Possible discrepancy`;
- the source, evidence facts, issuing jurisdiction, route, issue mapping, and field pack are current and confirmed;
- the route is `legacy` or `nextgen`;
- the description is already reviewed, normalized, and within the 500-code-point product limit;
- any required legacy category is confirmed;
- the route registry and extension protocol versions are current; and
- the user explicitly confirms: `I reviewed these fields and removed names, contact details, full vehicle/challan/reference or government-ID numbers, credentials, authentication codes, and payment information.`

For `Helping someone present`, every condition applies to the affected person as well as the helper: the affected person remains physically present, separately reviews and confirms the exact category/description, and explicitly asks the helper to prepare, load, and place those fields. The helper cannot substitute their own confirmation or permission. A role change, the affected person leaving, or either confirmation/permission being withdrawn immediately invalidates preparation.

This confirmation and the description filters are bounded safeguards, not proof that editable prose contains no sensitive fact. The UI therefore says `reviewed fields that passed bounded safety checks`, never `non-secret` or `safe`. Desktop Google Chrome support is also a product-support statement, not a security attestation: user-agent, viewport, pointer, or extension detection is never treated as proof of device class. Edge, Brave, other Chromium browsers, mobile Chrome, and other unsupported browsers keep the full installation-free handoff until their distribution and lifecycle behavior receive separate evidence.

The complete in-tab pack and official-link controls appear before this disclosure; clipboard controls appear only in private-device mode, while shared-device mode shows values for manual transcription and never exposes extension preparation. When every public Store/adapter/release gate is open, the helper card exposes two distinct controls in this order: a normal first-party `Review desktop helper and installation` anchor to `/extension` with `target="_blank"`, `rel="noreferrer"`, and no query, fragment, or user/case state, then an `Already installed? Prepare reviewed fields` button. Opening the information route in a separate tab preserves the tab-memory-only review. The website never detects, infers, pings, deep-links into, or wakes an installation. `/extension` presents the pre-install data-use/independence disclosure and only then an `Install from Chrome Web Store` anchor to the exact reviewed listing, also with `target="_blank"` and `rel="noreferrer"` and no appended parameter. Before Store approval or without a current public-enabled real adapter, the public real route omits both acquisition and preparation controls and `/extension` exposes no install/sideload action. Internal builds may expose a clearly labelled tester preparation card without public sideload instructions. The synthetic judge flow may always expose a clearly fictional simulation.

When the citizen chooses `Already installed? Prepare reviewed fields`, the web page creates a cryptographically random, one-use envelope and mounts an inert DOM capsule carrying a ten-minute expiry. The probe rejects it at or after that instant even if background-tab timer throttling delays physical DOM removal; the page also removes it on the expiry timer or next render. The page says:

> Prepared on this page only. Open the ChallanSakshi extension on this tab to preview and load the reviewed fields. Nothing has opened or been filled.

Preparing the capsule does not contact, detect, wake, or send a message to an extension.

### 3.3 Extension source preview

On every action-icon invocation, before `tabs.query`, `tabs.get`, `runtime.sendMessage`, any storage read, or any page injection, the popup first renders a packaged static disclosure without waking the worker. It explains that Chrome will supply the current tab URL; the extension checks scheme/host/port/path plus query/fragment only against the closed allowlist or required absence, never parses them for field values, and never returns, logs, or stores them. It says that Continue on ChallanSakshi permits one marked-capsule inspection; if fields were already loaded, Continue on an official page permits both inspection of its allowlisted blank destination controls and a recheck of the previously approved ChallanSakshi source tab, exact page document, and marked capsule before preview/fill. Previewed values exist ephemerally in the popup, staged values can remain in session storage for at most ten minutes, and payload-free safety metadata can persist for the Section 8 lifetimes. It also says no data is sent to the developer; a later Fill makes only the approved field values available to the official portal; and identifier, OTP, CAPTCHA, Aadhaar, credential, payment, file, declaration, and submission controls remain untouched. The separate buttons are `Continue to preview this page` and `Not now`. Only the affirmative Continue action allows the popup to query the current tab, message the worker, inject a current-page probe, or re-probe the previously approved source. Consent exists only in that popup instance, is not stored, and disappears when it closes; each later action-icon invocation requires it again. Background alarm/startup reconciliation may process only previously consented lifecycle metadata to preserve an existing safety lock, never inspect a page or start a new handoff.

On the canonical `/review` tab, the citizen invokes the extension, reads that disclosure, and selects Continue. Every source preview/load command then includes the popup's current action-tab ID; the worker independently requires it to equal the fresh active/last-focused tab ID before probing or storing. The popup then:

1. validates the active tab URL as an approved source;
2. runs one self-contained top-frame source probe;
3. validates the exact capsule and reduced envelope;
4. shows the destination name, route/adapter version, expiry, exact description, exact internal-category presentation when applicable, and untouched-field list;
5. says `Only these reviewed fields that passed bounded safety checks will be stored temporarily`;
6. says `Keep this ChallanSakshi tab open and unchanged until filling is complete`; and
7. requires `Load reviewed fields` before storing anything.

Closing the popup before loading leaves no extension storage state. While a source preview is visible, the description/category exists only in ephemeral popup JavaScript state and ordinary text nodes—never an attribute, URL, title, accessible-label payload, log, error, or hidden duplicate. The worker returns a separate ephemeral `SourcePreviewBindingV1` over the internal response; it commits to the complete canonical envelope without containing its values. Selecting `Load reviewed fields` synchronously replaces every value-bearing node with fixed non-value copy and nulls the value state before the popup sends only that binding plus its current action-tab ID. The worker freshly probes the current active document, recomputes the canonical-envelope digest, and stages only if the complete binding matches. Clear, reject, expiry, source change, and every transition away from that preview perform the same scrub. A failed load shows only a fixed code/instruction; it never restores the old value from popup memory.

On load, the service worker records the source tab ID and exact Chrome `documentId` as ephemeral extension-session metadata. It never exports those IDs, treats them as citizen or case identifiers, or uses them for any purpose except revalidating the exact source document and capsule before destination preview and fill. A successful destination preview additionally records its tab ID and exact Chrome `documentId` in session state so the fill click cannot silently target a replacement document. No tab or document ID is written to persistent storage. Before dispatch, local `unresolved-live` retains only a fresh opaque arm nonce plus opaque pack/replay metadata; the matching same-browser-session record holds the attempt/deadline/destination tuple. Missing session correlation converts the local record to `unresolved-orphaned` and strips the nonce so a recycled numeric tab ID can never clear it. Orphaned state then remains until disclosed device-owner recovery after every relevant official tab and browser process is closed. The privacy disclosure classifies the session-only tab/document data as browser-activity metadata and states every lifetime exactly.

### 3.4 Official-site handoff

The citizen returns to the web panel and uses the same transparent `Open [official service name]` anchor as an extension-free user. The extension never opens, closes, navigates, refreshes, redirects, or follows a link in an official tab.

The citizen independently reaches the relevant grievance form and completes every protected lookup or identity step. If the enabled adapter does not cover the current origin, path, form, or expiry, the extension offers only the assisted-copy fallback.

### 3.5 Destination preview and fill

On a supported blank form, the citizen invokes the extension again and must select `Continue to preview this page` on the fresh static disclosure, which explicitly says that this action may inspect both the current allowlisted blank destination controls and the previously approved ChallanSakshi source tab/document/capsule. Before Continue, no tab query, storage read, worker message, current-page injection, or source re-probe occurs. The popup then binds every destination preview/fill command to the tab that is active in its current browser window, and the worker independently requires that numeric ID to equal the stored destination tab before any document-targeted preflight or fill. Before showing a fill-ready preview, the extension re-probes the original source tab and exact source `documentId` and requires the same still-mounted capsule, IDs, revisions, digest, versions, confirmation, and expiry. The popup then shows:

- exact current domain and purpose;
- bundled adapter ID, last-verified date, and expiry;
- the exact category and/or description eligible for filling;
- `The extension will not click or call Submit`;
- `Existing values will not be overwritten`;
- `Review every field after filling`; and
- `After you click Fill, changing or closing the ChallanSakshi page cannot reliably cancel the in-flight attempt`; and
- the complete untouched-field list.

The citizen explicitly selects `Fill empty reviewed fields`. Before sending that value-free command, the popup synchronously replaces every description/category text node with fixed `Fill requested · inspect the official form` copy, nulls all value-bearing JavaScript state, and proves the scrub in a DOM assertion. Clear, reject, expiry, navigation, popup state replacement, and every other transition away from destination preview use the same scrub. The extension then revalidates the source and destination once more at that action boundary. Opening the popup alone never mutates the page, and no failure path reconstructs a scrubbed value in the popup.

After the popup scrub and at the start of any fill attempt, the description and all other envelope payload are erased from extension storage before injection. An opaque metadata-only replay tombstone remains active only until the extension's effective expiry so the same capsule cannot be imported and used again, including across an extension reload or update. Before dispatch, the worker persists a fresh opaque arm nonce plus pack/replay metadata in the payload-free local safety ledger as an unresolved lock; the exact destination tab/document binding remains only in the matching same-browser-session correlation record.

On complete success, the popup says:

> Placed the reviewed empty fields into this official page in your browser. Review every field. The extension did not click or call Submit.

On any partial or indeterminate attempt, it instead says:

> Some reviewed fields may have changed. Inspect the official form and complete it manually. The extension did not click or call Submit, and it will not retry.

Before injection, the worker persists and reads back an unresolved local record without any description, field value, route, tab/document ID, or citizen identifier, then erases the session payload and stored source binding. A timely exact complete result replaces it with minimal replay metadata through the crash-safe settlement sequence. A well-formed explicit `partial` or `indeterminate` result—or a complete result delivered after the mutation deadline—proves the injected function has ended and converts it to a settled payload-free local warning; that warning remains until the affected person selects `The affected person inspected the form · clear warning` or 24 hours after settlement.

A worker/popup loss, watchdog, rejected or malformed injection result, or tuple/document-mismatched result cannot prove that the accepted function has stopped. That path retains a local unresolved-live safety record containing only its opaque arm nonce and pack/replay metadata; the browser-activity tuple remains session-only. Time checks reduce delayed execution but are not treated as cancellation and never enable acknowledgement by themselves. The popup requires the original destination tab to be closed; the worker may begin close settlement on the exact matching `tabs.onRemoved` event only while the session record from that same browser session matches the local nonce/pack/replay marker and carries the exact attempt/deadline/destination tuple. Tab IDs are session-scoped, so a successfully read absent session correlation converts the local record to unresolved-orphaned and every later numeric tab event is ignored; a present malformed or mismatched correlation is quarantined without erasing either side. Tab-ID absence from a snapshot or API error is not accepted as close proof because Chrome can replace a tab without a close event; a matching `tabs.onReplaced` remains unresolved-live while correlation exists. Chrome's public `runtime.onStartup` contract is not treated as cancellation proof, so startup recovery is disabled in every current public profile and a session-clearing startup/update/reload/disable produces orphaned unresolved state on the next successful missing-correlation reconciliation. While disabled the extension cannot show or enforce its warning; recovery copy says to re-enable it before closing the official tab, and if the exact close event or session correlation was lost, explains the device-owner reset limit after every relevant official tab and browser process is closed.

The popup deliberately stores no review role after payload erasure and cannot machine-detect who clicks a settled-warning acknowledgement: the universal statement is an explicit human attestation. A present helper may activate it only after the affected person confirms they personally inspected the form.

After its bounded post-frame exact readback of the one or two planned allowed targets, the extension does not inspect the page again or report a status to the website.

## 4. Manifest and permission contract

The initial production candidate uses Manifest V3 and the current desktop Stable major, Chrome 152, as its public floor. Its complete generated manifest is:

```json
{
  "manifest_version": 3,
  "name": "ChallanSakshi Assisted Handoff",
  "version": "0.1.0",
  "description": "Places reviewed ChallanSakshi description text and, when supported, category into blank fields after explicit approval.",
  "minimum_chrome_version": "152",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "ChallanSakshi Assisted Handoff",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png"
    }
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "alarms"
  ],
  "incognito": "not_allowed",
  "content_security_policy": {
    "extension_pages": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"
  }
}
```

The numeric dotted `version` may advance at release time. The supported floor must be at least the then-current desktop Stable major and must itself pass retained loaded-package and headed action-icon lanes for that release. Chrome's official release channel reported Stable 152 on 2026-09-01; the local executable observed on 2026-09-03 is still 151, so this machine does not yet satisfy the initial public-package evidence gate. The implementation can proceed with unit/synthetic work, but no public package may be claimed until branded Chrome 152-or-later evidence exists. The version, supported-floor value, visible package/profile label, and every referenced icon/file are deterministic profile inputs. The permission array and every other security-relevant key above are exact. A manifest test rejects missing required metadata, a non-Chrome-valid version, a floor below the release-time Stable major or without matching retained evidence, an unreferenced or missing local icon, an unknown key, or any CSP drift.

Permission purposes:

- `activeTab` grants temporary current-tab access only after the user invokes the extension.
- `scripting` runs the packaged source probe or packaged preflight/fill function in the current top frame.
- `storage` is used for the single staged/session lifecycle record and one exact bounded payload-free safety ledger in `chrome.storage.local`; no other local or synchronized record is permitted.
- `alarms` schedules payload/replay cleanup, warning cleanup, and the attempt watchdog and wakes the Manifest V3 worker when Chrome can deliver them; every startup, preview, and action also performs the applicable lazy deadline checks because browser sleep can delay alarm delivery.

Alarm authority is closed. The only names are the literal, identifier-free, one-shot names `session-expiry`, `ledger-cleanup`, and `attempt-watchdog`. A name contains no `packId`, `attemptId`, generation, route, origin, URL, field, value, timestamp, separator suffix, or encoded payload. `chrome.alarms.create` receives exactly one of those names and a finite safe-integer `{ when }` deadline; periodic alarms and `delayInMinutes`/`periodInMinutes` are prohibited. Each handler validates the exact name and only enqueues ordinary serialized reconciliation against canonical session/local state. The alarm object is never treated as state or authority.

The manifest must not declare:

- `host_permissions` or `optional_host_permissions`;
- `<all_urls>`;
- `tabs`;
- `cookies`;
- `clipboardRead` or `clipboardWrite`;
- `webRequest` or `declarativeNetRequest`;
- `downloads`;
- `identity`;
- `nativeMessaging`;
- `debugger`;
- `history`;
- `management`;
- `notifications`;
- `unlimitedStorage`;
- `content_scripts`;
- `externally_connectable`;
- `web_accessible_resources`;
- file-URL access;
- a custom external `update_url`; or
- sandbox pages.

The extension uses only base Tabs API operations available without declaring the `tabs` permission: active/last-focused numeric-ID queries, exact-tab lookup, and `onRemoved`/`onReplaced` lifecycle events. For a tab with the current or retained `activeTab` grant, it reads `tab.url` transiently only to apply the exact source/destination allowlist and cross-check injected `location`; a missing URL fails closed. It never reads `pendingUrl`, title, favicon, or another tab property, and never persists or returns a URL. A manifest/source test rejects the `tabs` permission and any use beyond this closed set.

The extension has no runtime network use. Its CSP permits only packaged scripts, styles, and images and denies object, connection, frame, base, and form-action destinations. It uses no inline JavaScript, inline event handler, `eval`, `new Function`, WebAssembly, remote import, remote font, CDN asset, remotely hosted code, analytics, telemetry, crash upload, or remote adapter configuration.

Build profiles are compile-time isolated:

- `synthetic-development` accepts only `mode: 'synthetic'`, contains only the two exact loopback fixture routes, and contains no production source or government origin;
- `production-disabled` accepts only `mode: 'real'`, contains the exact production ChallanSakshi source plus disabled official route identities, and contains no synthetic mode, fixture route, or loopback origin; and
- a later `production-candidate` also accepts only `mode: 'real'` and differs from `production-disabled` only through separately reviewed, current, bundled official adapter contracts.

The package name, visible environment label, manifest version metadata, validator, source registry, and adapter registry are generated from one of those closed profiles. Runtime flags cannot switch a bundle from synthetic to real or enable a disabled adapter.

The worker build emits one stable `service-worker.js` ES-module entry with `inlineDynamicImports: true`; extension source contains no dynamic `import()`. The popup build sets Vite `build.modulePreload.polyfill: false`, uses stable relative entry/chunk names, and emits no injected module-preload polyfill or runtime `fetch`. Both builds target the profile's exact tested Chrome floor, package every referenced chunk locally, and fail if the manifest names a missing file.

Every `chrome.runtime.onMessage` listener uses the callback-compatible pattern: it returns literal `true` synchronously, resolves work through the serialized worker queue, calls `sendResponse` exactly once, and never declares the listener `async` or returns a Promise. Message schemas are closed and internal; unexpected sender, command, key, state, generation, or response shape fails closed.

Chrome documents `activeTab` as temporary access triggered by a user gesture and as a narrower alternative to persistent host permissions. Chrome also documents that `storage.session` is held in memory and cleared when the extension is disabled, reloaded, updated, or the browser restarts, while `storage.local` persists until the extension is removed. The latter is used only for the bounded payload-free safety ledger because an accepted `executeScript` call has no documented cancellation primitive, update/reload is not proof that its page-side function stopped, and replay/review state must not vanish on an ordinary update. Both stores are restricted to trusted extension contexts. These are platform properties and bounded design choices, not claims that remove the need for extension privacy disclosure.

## 5. Reduced extension envelope

The complete `OfficialHandoffPack`, current citizen-review signature, structured observations/source records, full evidence summary, raw evidence files/images/attachments, and optional challan-number bridge never enter the extension. The exact user-reviewed description can restate factual prose derived from confirmed observations; it is therefore not described as evidence-free or proven non-sensitive.

The shared contract is a closed discriminated union:

```ts
export const EXTENSION_HANDOFF_SCHEMA = 'challansakshi.extension-handoff/v1' as const;

export type SupportedExtensionIssueCode =
  | 'wrong-evidence'
  | 'wrong-vehicle-number'
  | 'two-wheeler-on-four-wheeler'
  | 'four-wheeler-on-two-wheeler'
  | 'possible-duplicate-number-plate';

type ExtensionEnvelopeBase = Readonly<{
  schema: typeof EXTENSION_HANDOFF_SCHEMA;
  mode: 'real' | 'synthetic';
  packId: string;
  resultRevisionId: string;
  packRevisionId: string;
  routeRegistryVersion: string;
  adapterContractVersion: string;
  description: string;
  descriptionDigest: string;
  language: 'en' | 'hi';
  simpleMode: boolean;
  confirmed: true;
  deviceMode: 'private';
  issuedAt: string;
  expiresAt: string;
}>;

export type ExtensionHandoffEnvelope =
  | (ExtensionEnvelopeBase & Readonly<{
      mode: 'real';
      routeKey: 'legacy';
      issueCode: SupportedExtensionIssueCode;
    }>)
  | (ExtensionEnvelopeBase & Readonly<{
      mode: 'real';
      routeKey: 'nextgen';
      issueCode: null;
    }>)
  | (ExtensionEnvelopeBase & Readonly<{
      mode: 'synthetic';
      routeKey: 'synthetic-fixture';
      issueCode: SupportedExtensionIssueCode | null;
    }>);
```

Every ID is an opaque 32-character lowercase hexadecimal value generated from 16 random bytes using `crypto.getRandomValues`. It is not a citizen identifier, serialized state, filename, registration suffix, challan number, timestamp encoding, or hash of the evidence. Revision IDs are regenerated whenever their bound result or pack changes.

Besides the exact reviewed `description`, fixed internal `issueCode`, and protocol metadata in the closed union, the envelope has no other property. In particular, it has no dedicated or structured property for:

- a URL, origin, hostname, port, pathname, query, or fragment;
- a selector, form action, official field name, option label, or option value;
- a challan, vehicle, driving-licence, acknowledgement, or grievance number;
- a name, phone, email, address, date of birth, registration date, location, or event date;
- Aadhaar, VID, PAN, credential, OTP, CAPTCHA, payment, bank, card, or UPI data;
- a raw attachment/image, filename, MIME type, structured observation/source record, source document, or full exported evidence summary; the exact reviewed description may contain factual prose derived from confirmed observations;
- a citizen-return state or authority outcome;
- arbitrary nested metadata;
- an open-ended `fields` object; or
- executable instructions.

Those are schema and projection guarantees, not a claim that free text is proven clean. The exact reviewed description can restate factual observations, may intentionally include a citizen-approved masked final-four vehicle fragment allowed by the parent pack contract, and may still contain a name, full identifier, or other sensitive fact that the explicit confirmation and bounded matcher fail to catch. Import/fill and Store data-use copy disclose that residual risk and offer the installation-free manual-copy path after any rejection.

The installed extension derives every destination, path, selector, control contract, and legacy option mapping exclusively from its bundled adapter.

## 6. Envelope construction and validation

The web projection and extension validator independently require:

- exact schema and exact own-property set; unknown and missing keys both fail;
- a plain own-property data record that round-trips through Chrome's JSON message serialization without coercion, with no accessor or prototype-controlled lookup;
- canonical reconstruction in this exact property order: `schema`, `mode`, `packId`, `resultRevisionId`, `packRevisionId`, `routeRegistryVersion`, `adapterContractVersion`, `description`, `descriptionDigest`, `language`, `simpleMode`, `confirmed`, `deviceMode`, `issuedAt`, `expiresAt`, `routeKey`, `issueCode`;
- valid 32-character lowercase hexadecimal IDs created by the web projection from 16 cryptographically random bytes;
- a currently confirmed result and field-pack revision;
- `confirmed === true` and `deviceMode === 'private'`;
- a supported mode, route, and issue-code combination;
- exact route-registry and adapter-contract version agreement;
- `issuedAt` and `expiresAt` as canonical UTC ISO-8601 strings in exact `YYYY-MM-DDTHH:mm:ss.sssZ` form that round-trip without normalization;
- `issuedAt` no more than 60 seconds in the future and no more than ten minutes in the past at extension import;
- `expiresAt` strictly after `issuedAt`, no more than ten minutes after `issuedAt`, and still in the future at every preview and action boundary;
- an extension-recorded finite safe-integer `importedAtMs` and `effectiveExpiresAtMs = min(parsed envelope expiresAt, importedAtMs + 600_000)`; all reads, previews, and actions reject when `Date.now() >= effectiveExpiresAtMs`;
- one-time use, enforced by rejecting any `packId` found in session state `staged`, `arming`, `consuming`, or `settling`, or in an unresolved, warning-active, or unexpired replay record in the local safety ledger;
- a well-formed Unicode scalar description with no unpaired UTF-16 high or low surrogate, checked before normalization, code-point counting, digesting, or UTF-8 sizing;
- a description already normalized to Unicode NFC with LF line endings, non-empty, and no longer than 500 Unicode code points;
- `descriptionDigest` as exactly 64 lowercase hexadecimal characters encoding SHA-256 over `new TextEncoder().encode(normalizedDescription)`, matching the exact text shown in both previews;
- a total size no greater than 8 KiB, defined as `new TextEncoder().encode(JSON.stringify(canonicalRecord)).byteLength <= 8192` with no whitespace or optional-property omission;
- no C0/C1 control characters other than the permitted line feed;
- none of the bidi-format characters U+061C, U+200E–U+200F, U+202A–U+202E, or U+2066–U+2069; and
- no value rejected by the exact bounded matcher table below.

Validation order is fixed: post-serialization plain-record/schema/key checks; scalar-string well-formedness; LF/NFC/control/bidi/code-point and bounded-matcher checks; digest verification; canonical reconstruction and UTF-8 byte sizing; then IDs, versions, route/issue, confirmation/device, and time/lifecycle checks. No `TextEncoder`, normalization, digest, or size operation runs on a string containing an unpaired surrogate. Normalization happens in the web editor before the citizen confirms the pack. The extension rejects a value that would change under normalization; it does not silently rewrite reviewed text. Defense-in-depth pattern rejection may produce false positives, including in legitimate Hindi text. A rejection always returns the citizen to the visible installation-free handoff and never deletes or shortens their web pack.

The matcher runs on the NFC/LF-normalized description and rejects the whole envelope when any predicate matches:

| Class | Exact predicate |
| --- | --- |
| Markup/script sentinel | Contains `<` or `>`, or an ASCII-case-insensitive `javascript:`, `vbscript:`, or `data:text/html`. |
| URL | Contains ASCII-case-insensitive `http://`, `https://`, or `www.`, or an ASCII domain with at least one dot where each 1–63-character label starts and ends in a letter/digit, contains only letters/digits/hyphens internally, and the final label is 2–24 letters. |
| Email/UPI-like handle | Contains a token matching `[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}` under ASCII case-insensitive matching, or a handle of 2–64 ASCII letters/digits/`._-` on each side of `@`. |
| Digit-like identifier | A maximal run made only of ASCII digits, spaces, `+`, `-`, `.`, or parentheses contains 9–19 digits after separators are removed. This deliberately catches phone, Aadhaar, bank-account, and payment-card-shaped values without claiming semantic classification. |
| PAN-shaped value | Contains an ASCII token of exactly five letters, four digits, and one letter. |
| Indian registration | Contains either two letters + 1–2 digits + 1–3 letters + 4 digits, or 2 digits + `BH` + 4 digits + 1–2 letters, permitting only spaces/hyphens between groups. |
| Long mixed identifier | A maximal ASCII alphanumeric/underscore/hyphen token becomes at least 12 characters after `_`/`-` removal and contains at least two letters and four digits. |

ASCII word boundaries are implemented explicitly by inspecting adjacent characters rather than relying on locale-dependent `\b`. Each predicate is a named pure function with positive and negative fixtures in English and Hindi. This bounded matcher is intentionally incomplete—especially for names and uncommon identifiers—so the user's explicit removal confirmation remains mandatory and the UI never claims the text is proven non-sensitive.

`descriptionDigest` is an integrity binding between previews and stored text. It is not authentication, a digital signature, proof of authorship, or proof that the product origin is uncompromised.

Immediately before `Load reviewed fields` stores anything, the popup runs the source probe again and requires the returned top-frame `documentId` and complete envelope to match the previewed binding, schema, IDs, digest, revisions, versions, and expiry. A changed or removed capsule, or a replacement source document even with byte-identical canonical capsule text, cancels the load and stores nothing. A byte-identical DOM-node remount inside the same source document is intentionally equivalent and is not represented as detectable.

## 7. Source-page capsule

The web component mounts the capsule only after `Already installed? Prepare reviewed fields` and only while the same eligible pack revision remains confirmed.

The capsule:

- uses one root with `data-challansakshi-extension-handoff="v1"` and one direct child with `data-challansakshi-extension-envelope="v1"`; that child has exactly one ordinary DOM text-node child containing the Section 6 canonical JSON record and no sibling node;
- contains only the reduced envelope;
- renders the canonical JSON string through an ordinary React-escaped text node, never executable script or markup;
- uses no `dangerouslySetInnerHTML`, inline script, JSON script execution, URL state, browser storage, or network request;
- is inert, hidden from normal reading order, `aria-hidden="true"`, and `translate="no"`;
- is absent before explicit preparation;
- is replaced only through another explicit preparation action; and
- is unmounted immediately after any evidence, source, route, issue mapping, description, review role, affected-person-presence/permission/confirmation, general confirmation, device-mode, language, Simple Mode, language-generated-copy, reset, Quick Exit, inactivity-clear, or component-unmount change.

The worker constructs a separate closed JSON-only source authority object; a destination `InjectionPlan` is never reused for this purpose:

```ts
type SourceProbePlanV1 = Readonly<{
  schema: 'challansakshi.source-probe-plan/v1';
  sourceContractVersion: string;
  expectedEnvelopeSchema: typeof EXTENSION_HANDOFF_SCHEMA;
  expectedEnvelopeMode: 'real' | 'synthetic';
  rootAttribute: 'data-challansakshi-extension-handoff';
  rootValue: 'v1';
  envelopeAttribute: 'data-challansakshi-extension-envelope';
  envelopeValue: 'v1';
  expectedLocation: Readonly<{
    protocol: 'https:' | 'http:';
    hostname: string;
    port: string;
    pathname: string;
    allowedSearches: readonly string[];
  }>;
  operationNotAfterMs: number;
}>;

type SourcePreviewBindingV1 = Readonly<{
  schema: 'challansakshi.source-preview-binding/v1';
  sourceTabId: number;
  sourceDocumentId: string;
  canonicalEnvelopeDigest: string;
  previewNotAfterMs: number;
}>;
```

`SourceProbePlanV1` contains no envelope value, citizen data, selector, code, callback, or mutable runtime configuration. Its strings and ordered `allowedSearches` are generated only from the selected compile-time source profile; package scans require the exact profile-specific literals below and reject opposite-profile origins/modes. No website or popup message can supply or alter it. The self-contained probe first validates the exact own-property shape, literal marker names/values, safe finite deadline, ASCII location components, and closed search list; then it requires `Date.now() < operationNotAfterMs`, exact live top-frame location, exactly one marked root/child, and exactly one text node with no sibling. It reads that node's bounded `.data`, parses it strictly as JSON data, and passes the parsed value through the same post-serialization closed-record/type/canonical-order validation. It then reconstructs the canonical record and requires raw `.data === JSON.stringify(canonicalRecord)` byte-for-byte before accepting the expected envelope schema/mode; this rejects duplicate keys collapsed by `JSON.parse`, whitespace, alternate escapes/number spellings, and every other noncanonical encoding without a custom parser. It never reads `innerHTML`, `outerHTML`, or whole-page text. The source callsite passes only this plan as `args: [sourceProbePlan]`. Fresh-realm and built-callsite scans reject imported/outer registry references and any destination `InjectionPlan` passed to the source probe.

Every source probe targets the source tab's current top frame with `{ tabId: sourceTabId, frameIds: [0] }`, never a stored `documentIds` target, and requires exactly one result with `frameId === 0` and a valid non-empty returned `documentId`. This ensures that an old cached document cannot be selected merely because its ID is known. After a valid first preview, the worker returns the display fields plus a closed `SourcePreviewBindingV1` to the popup and stores neither. `canonicalEnvelopeDigest` is exactly 64 lowercase hexadecimal characters for SHA-256 over `new TextEncoder().encode(JSON.stringify(canonicalRecord))`; `previewNotAfterMs` is the parsed envelope expiry and must still be a future safe integer. The binding's tab/document IDs equal the action tab and the source probe's one returned current-top-frame document ID. On Load, after value-state scrubbing, the popup sends only the binding and its current action-tab ID. The worker validates the binding, re-runs the current-top-frame source probe, requires the same tab/document IDs and `Date.now() < previewNotAfterMs`, reconstructs canonical JSON, and compares the recomputed full-envelope digest in constant-shape logic before staging the freshly probed envelope. Every later source re-probe repeats this current-frame targeting and requires the one returned `documentId` to equal the staged or in-memory call-frame source binding. A same-origin/same-path replacement document is rejected even when it recreates byte-identical canonical capsule text; the exact same BFCache-restored source document may proceed only when it is again the current top frame and passes full live revalidation. The digest is an ephemeral integrity binding, not authentication or proof of source trust; it is cleared from popup/worker memory after the command and never enters either Chrome storage area, logs, errors, or UI.

The source probe accepts only a top-level tab whose URL has:

- scheme `https:`;
- hostname exactly `challansakshi.sh1rs.com`;
- default port;
- no username or password;
- pathname exactly `/review`;
- no fragment; and
- either no query or exactly one `goal` value equal to `verify`, `understand`, `evidence`, or `resolve`.

No substring, hostname suffix, wildcard, loose regular expression, sibling subdomain, Unicode lookalike, punycode lookalike, unexpected parameter, or iframe qualifies.

The `synthetic-development` profile uses a separate compile-time registry with exactly:

- source: `http://127.0.0.1:3000/demo/extension-fixture/source`; and
- destination: `http://127.0.0.1:3000/demo/extension-fixture/destination`.

It requires the explicit port `3000` and accepts no omitted or alternative port, query, fragment, alternative host spelling, `localhost`, IPv6 loopback, or path other than those two exact role-specific routes. The production bundles contain no localhost, loopback, staging, preview, synthetic route, or user-configurable source origin. The synthetic bundle contains no production source or government origin.

## 8. Session lifecycle

The Manifest V3 service worker owns this state machine:

```text
empty → staged(session payload)
staged → arming(session payload + opaque arm nonce/attempt tuple)
arming → armed(local unresolved nonce/pack/replay marker)
armed → consuming(payload-free session correlation record)
staged → rejected / expired / cleared → empty
arming / armed / consuming-before-dispatch → settling(cancel intent) → cancelled-before-dispatch(local replay record)
consuming → settling(payload-free session correlation record) → complete(local replay record)
consuming → settling(payload-free session correlation record) → settled-needs-review(local warning)
armed / consuming / worker loss / transport ambiguity → unresolved-live(local nonce marker + matching session correlation)
settled-needs-review → inspected(local replay record if still active, otherwise empty) / automatic warning expiry → empty
unresolved-live + exact same-session consuming tuple + destination `tabs.onRemoved` → settling(close intent) → closed-unresolved(local replay record)
unresolved-live + successfully read absent session correlation → unresolved-orphaned(local only)
unresolved-live + present malformed/mismatched correlation → quarantined
unresolved-orphaned → disclosed device-owner recovery only
```

Source preview is ephemeral popup state and is never stored. Only one staged or arming envelope payload exists. When no arming/consuming attempt, settling transition, settled warning, or unresolved lock blocks import, a new explicit import replaces and clears the earlier staged payload. The staged `chrome.storage.session` state keeps the exact envelope plus a fresh opaque 32-character random hexadecimal `generation`, numeric `sourceTabId`, exact non-empty source `documentId`, lifecycle state, finite safe-integer `importedAtMs`, and finite safe-integer `effectiveExpiresAtMs`. After a successful destination preview it also keeps the current destination tab ID and exact non-empty destination `documentId`; later source and destination actions must remain bound to those exact previewed top-level documents. None enters the web envelope, local storage, network, logs, errors, exports, or fixed popup copy. Every fill creates separate random 32-character lowercase hexadecimal `armNonce` and `attemptId` values.

After dispatch, payload-free terminal state is canonical in the local safety ledger rather than volatile session storage. Every handler and command performs raw reserved-key reads and closed-shape validation first, completes any exact session-`settling` reconciliation second, and only then applies logical warning/replay pruning and alarm scheduling. This order preserves an already-written terminal record whose replay deadline passed during a crash window. An import then rejects a `packId` present in session state `staged`, `arming`, `consuming`, or `settling`, or in any unresolved, warning-active, or unexpired local replay record. Live or orphaned unresolved state is never time-pruned, and a settled warning remains through its warning deadline even if replay has already expired. An active record is never evicted to make space, and a full 32-record ledger refuses another load. A complete, inspected, closed-unresolved, or cancelled-before-dispatch replay record remains through `replayUntil = effectiveExpiresAtMs`; expired replay-only records are pruned only after settlement reconciliation. A settled `needs-review` record blocks every new load until acknowledgement or its separate 24-hour warning expiry, while its pack remains replay-blocked at least through `replayUntil`. Logical expiry is enforced on every read even if an alarm was delayed by browser sleep. These controls provide best-effort one-use and review-warning continuity across ordinary extension reload/update events, not tamper resistance against uninstalling or manually clearing extension storage.

### 8.1 Exact pre-dispatch order

The fill action runs these steps once, in this order, inside the serialized worker queue:

1. match the popup-supplied action tab ID to exactly one numeric ID returned by `chrome.tabs.query({ active: true, lastFocusedWindow: true })`, require it equals the stored destination tab ID, then match the current staged generation/pack/expiry and re-probe `{ tabId: sourceTabId, frameIds: [0] }`; require exactly one top-frame result whose returned `documentId` equals the stored source `documentId`, rather than targeting a possibly cached document by ID;
2. run a value-free destination preflight against the current active top frame with `{ tabId: destinationTabId, frameIds: [0] }`, require exactly one `InjectionResult` with `frameId === 0`, `documentId === storedPreviewDocumentId`, and a live `document.visibilityState === 'visible'`, then revalidate the location/DOM/adapter contract; if the current active document no longer has that identity or contract, cancel and require a fresh destination preview rather than adopting a new same-URL document;
3. create fresh `armNonce` and `attemptId` values, capture `attemptedAtMs = Date.now()`, compute finite safe-integer `attemptNotAfterMs = min(effectiveExpiresAtMs, adapterExpiresAtMs, attemptedAtMs + 30_000)`, require `attemptedAtMs < attemptNotAfterMs`, replace staged with the exact `arming` session record that still contains the envelope plus the generation/nonce/attempt/deadline/source-document/destination tuple, then read it back exactly;
4. in one `chrome.storage.local` write, add only `{ state: 'unresolved-live', armNonce, packId, replayUntil }`—which itself replay-blocks the pack—to the closed safety ledger, then read back and require an exact match;
5. copy the validated source tab/document binding into only this worker command's in-memory call frame, then replace the arming session item with a payload-free consuming record containing the matching generation, arm nonce, pack ID, attempt ID, destination binding, replay deadline, and mutation deadline, thereby erasing the description, source binding, and all other envelope values from extension storage;
6. only after both stores are confirmed, use that private call-frame binding for one final exact source-capsule re-probe against `{ tabId: sourceTabId, frameIds: [0] }`, and require exactly one top-frame result whose returned `documentId` equals the call-frame source `documentId` plus the unchanged source authorization snapshot; never target the stored source document directly, and clear the call-frame source binding immediately after the probe or on every earlier return path;
7. after the source probe returns, repeat the active/last-focused action-tab query, require its one numeric ID to equal `destinationTabId`, and require `Date.now() < attemptNotAfterMs`; perform no further await or asynchronous operation before dispatch, while making no atomic focus/lifecycle-lock claim; and
8. in the next synchronous statement, dispatch one fill injection to `{ tabId: destinationTabId, documentIds: [storedPreviewDocumentId] }`.

If the worker stops with an exact arming record before the local marker is confirmed, protocol order proves dispatch was not reached; reconciliation writes/reads session `settling` with the closed cancellation intent, writes/reads the replay terminal even when `replayUntil` has already passed, clears session, and only then lazily prunes an expired replay. If it stops after the local write but before session replacement, the same cancellation is permitted only when arming and local records exactly match `armNonce + packId + replayUntil`; no browser-activity tuple is reconstructed from local state. A mismatch is quarantined; an absent session state converts a recognized local marker to `unresolved-orphaned`. If the final source check in step 6 or action-tab/deadline check in step 7 fails, no injection occurs and the worker uses the same crash-safe three-phase cancellation settlement. A failure during cleanup conservatively leaves unresolved-live while correlation remains, or becomes orphaned if correlation is lost, even though dispatch was withheld. The final successful source re-probe is the authorization snapshot: a source edit, reset, Quick Exit, inactivity clear, role/permission withdrawal, navigation, or close completed before it returns cancels, but no cross-tab atomic revocation exists after it returns. The already accepted in-flight command may still dispatch after the immediately following destination check, and the safety ledger governs it. After the popup has synchronously scrubbed its value-bearing state and step 5 has erased session payload, the validated description and applicable derived category exist only in the worker's in-memory call frame and JSON argument for that single injection. No retry is permitted, including when dispatch itself rejects.

The two reserved storage keys and all post-serialization shapes are exact:

```ts
export const EXTENSION_SESSION_STATE_KEY = 'challansakshi.session-state.v1' as const;
export const EXTENSION_SAFETY_LEDGER_KEY = 'challansakshi.safety-ledger.v1' as const;

type ReplaySafetyRecordV1 = Readonly<{
  state: 'replay';
  packId: string;
  replayUntil: number;
  outcome: 'complete' | 'inspected' | 'closed-unresolved' | 'cancelled-before-dispatch';
}>;

type NeedsReviewSafetyRecordV1 = Readonly<{
  state: 'needs-review';
  packId: string;
  replayUntil: number;
  warningExpiresAt: number;
}>;

type SettlementIntentV1 =
  | Readonly<{
    cause: 'injection-result';
    terminal:
      | NeedsReviewSafetyRecordV1
      | Readonly<{
        state: 'replay';
        packId: string;
        replayUntil: number;
        outcome: 'complete';
      }>;
  }>
  | Readonly<{
    cause: 'cancelled-before-dispatch';
    terminal: Readonly<{
      state: 'replay';
      packId: string;
      replayUntil: number;
      outcome: 'cancelled-before-dispatch';
    }>;
  }>
  | Readonly<{
    cause: 'destination-tab-removed';
    terminal: Readonly<{
      state: 'replay';
      packId: string;
      replayUntil: number;
      outcome: 'closed-unresolved';
    }>;
  }>;

type SafetyRecordV1 =
  | Readonly<{
    state: 'unresolved-live';
    armNonce: string;
    packId: string;
    replayUntil: number;
  }>
  | Readonly<{
    state: 'unresolved-orphaned';
    packId: string;
    replayUntil: number;
  }>
  | NeedsReviewSafetyRecordV1
  | ReplaySafetyRecordV1;

type SafetyLedgerV1 = Readonly<{
  schema: 'challansakshi.safety-ledger/v1';
  records: readonly SafetyRecordV1[];
}>;

type DestinationBindingV1 = Readonly<{
  destinationTabId: number;
  destinationDocumentId: string;
}>;

type SessionStateV1 =
  | Readonly<{
    schema: 'challansakshi.session-state/v1';
    state: 'staged';
    generation: string;
    envelope: ExtensionHandoffEnvelope;
    importedAtMs: number;
    effectiveExpiresAtMs: number;
    sourceTabId: number;
    sourceDocumentId: string;
    destination: null | DestinationBindingV1;
  }>
  | Readonly<{
    schema: 'challansakshi.session-state/v1';
    state: 'arming';
    generation: string;
    envelope: ExtensionHandoffEnvelope;
    importedAtMs: number;
    effectiveExpiresAtMs: number;
    sourceTabId: number;
    sourceDocumentId: string;
    destination: DestinationBindingV1;
    armNonce: string;
    attemptId: string;
    replayUntil: number;
    attemptNotAfterMs: number;
  }>
  | Readonly<{
    schema: 'challansakshi.session-state/v1';
    state: 'consuming';
    generation: string;
    armNonce: string;
    packId: string;
    attemptId: string;
    replayUntil: number;
    attemptNotAfterMs: number;
    destinationTabId: number;
    destinationDocumentId: string;
  }>
  | Readonly<{
    schema: 'challansakshi.session-state/v1';
    state: 'settling';
    generation: string;
    armNonce: string;
    packId: string;
    attemptId: string;
    replayUntil: number;
    attemptNotAfterMs: number;
    destinationTabId: number;
    destinationDocumentId: string;
    intended: SettlementIntentV1;
  }>;
```

The session area contains at most the single exact `EXTENSION_SESSION_STATE_KEY`; the local area contains at most the single exact `EXTENSION_SAFETY_LEDGER_KEY`. Missing keys mean empty state. After Chrome JSON serialization, every record must be a plain own-property data object with exactly the keys of one union member and no accessor, sparse array slot, inherited property, unknown key, or prototype-pollution key. Every `generation`, `armNonce`, `packId`, and `attemptId` is exactly 32 lowercase hexadecimal characters. Every stored time is a positive finite safe-integer epoch millisecond with union-specific ordering: staged `importedAtMs < effectiveExpiresAtMs`; arming `attemptNotAfterMs <= replayUntil === effectiveExpiresAtMs`; consuming/settling `attemptNotAfterMs <= replayUntil`; and `needs-review.warningExpiresAt > replayUntil`. Every tab ID is a nonnegative safe integer. Every stored source or destination `documentId` is 1–128 printable ASCII characters with no whitespace or control character and is compared as an opaque exact string. A local unresolved-live record correlates to arming/consuming/settling only when `armNonce + packId + replayUntil` is byte-for-byte equal; the full attempt/deadline/destination tuple remains session-only. A settling generation and full tuple are inherited exactly from their arming/consuming predecessor, so cancellation recovery never invents or recomputes a lost deadline or browser identity.

The ledger contains no result/revision ID, description, digest, value, mode, route, issue, domain, URL, source tab, destination tab/document, attempt ID, mutation deadline, or citizen/case identifier. `armNonce` and `packId` are random opaque correlation values. Records are unique by `packId`, sorted lexicographically by lowercase `packId`, and capped at 32. At most one globally blocking record may exist across the `unresolved-live`, `unresolved-orphaned`, and `needs-review` variants; any such record blocks new loads. A replay-only record is pruned at `replayUntil` only after raw validation and settling reconciliation. A `needs-review` record is removed at `warningExpiresAt`; its replay deadline is necessarily earlier under the closed ordering contract. Either unresolved variant stays physically pinned even after `replayUntil` until terminal result settlement, same-session exact delivered tab closure when eligible, or disclosed device-owner recovery after every relevant official tab and browser process is closed. Both `chrome.storage.session` and `chrome.storage.local` explicitly set access level `TRUSTED_CONTEXTS` before their first read on every worker lifetime; injected functions receive no storage access. The extension uses no `storage.sync`, IndexedDB, Cache Storage, cookies, page Web Storage, or filesystem persistence. Static tests allow `storage.local` access only through the audited safety-ledger module and exact key.

### 8.2 Settlement, warnings, and recovery

The injected function catches its own exceptions and returns a closed fixed status. A fill plan carries the opaque worker-created `attemptId`, and its terminal result must echo that exact value. Only an `executeScript` fulfillment containing exactly one result with the expected `frameId`, destination `documentId`, attempt ID, and closed result shape proves settlement when the worker call frame and same-browser-session consuming/settling record still match the complete `generation + armNonce + packId + replayUntil + attemptId + attemptNotAfterMs + destinationTabId + destinationDocumentId` tuple and local unresolved-live still matches `armNonce + packId + replayUntil`. A transport rejection, missing/extra result, malformed result, stale tuple, worker loss, watchdog, or missing correlation is unresolved even if it looks likely that no mutation occurred.

For any valid terminal result, the worker first replaces the consuming item with a payload-free session `settling` item that retains the full nonce/attempt/pack/deadline/destination tuple and embeds `intended.cause: 'injection-result'` plus the intended final local record. A timely exact `complete` result intends `{ state: 'replay', packId, replayUntil, outcome: 'complete' }`. An explicit `partial` or `indeterminate` result—or a complete-shaped result delivered after the mutation deadline—intends `{ state: 'needs-review', packId, replayUntil, warningExpiresAt }`, where `warningExpiresAt = settledAtMs + 86_400_000`. A pre-dispatch cancellation uses the same three-phase sequence with `intended.cause: 'cancelled-before-dispatch'`. Only after the settling write is read back does the worker change the local ledger and read it back: injection-result and tab-removal causes must replace the exact matching local unresolved marker; cancellation replaces that marker when present or adds its terminal only when the ledger has no record for the pack, which covers an arming crash before local write. Any other same-pack record or cause/terminal pairing quarantines. The worker removes session correlation only after exact terminal readback. The description, destination binding, attempt ID, and mutation deadline are absent from the terminal record.

If the settling write or local rewrite fails, unresolved-live remains when it was already armed and state stays conservatively blocked. Every event handler first runs normal reconciliation. Session `settling` plus local unresolved-live matching `armNonce + packId + replayUntil` applies `intended.terminal`; cancellation settling plus no local record for that pack may add its exact terminal; the exact intended terminal already local permits clearing matching settling state. Injection-result or tab-removal settling with no matching local live marker, and any different same-pack record, quarantines. This happens before tab-close handling and before any replay-deadline pruning, including when the intended terminal's deadline is already in the past. A successful session read showing no correlation rewrites recognized local unresolved-live to unresolved-orphaned, removes `armNonce`, and leaves it replay-blocking after `replayUntil`; later result and numeric tab events cannot settle it. A present malformed or mismatched session/local record is quarantined without erasing either side's evidence.

A settled warning tells the affected person to inspect the form and offers `The affected person inspected the form · clear warning`. The popup stores no role and cannot machine-detect who clicks; this is a human attestation, and a present helper may activate it only after the affected person confirms they personally inspected. Acknowledgement converts the local warning to `{ state: 'replay', packId, replayUntil, outcome: 'inspected' }` if replay remains active, otherwise deletes it. Because `warningExpiresAt = settledAtMs + 86_400_000` and every valid `needs-review` record requires `warningExpiresAt > replayUntil`, unacknowledged automatic warning expiry always deletes the record; it never creates an outcome or implies inspection. Alarm delivery may be delayed by sleep, so every read performs lazy logical expiry before use and physical cleanup follows on alarm delivery or the next worker wake.

Neither unresolved variant has a time-based clear: `attemptNotAfterMs` is a fail-fast check inside injected code, not cancellation of already-started JavaScript. Unresolved-live asks the user to close the original destination tab and blocks acknowledgement/new loads. After normal reconciliation, delivery of `chrome.tabs.onRemoved` may settle only when its removed tab ID equals the session destination ID, local unresolved-live matches session `armNonce + packId + replayUntil`, and the same-browser-session consuming record remains otherwise closed-shape valid; it establishes definitive closure and no usable original target, without claiming a cancellation acknowledgement or happens-before edge to a final setter. The handler writes and reads back session `settling` with `intended.cause: 'destination-tab-removed'` and terminal `{ state: 'replay', packId, replayUntil, outcome: 'closed-unresolved' }`, then writes and reads back that exact local terminal even when `replayUntil` has already passed, clears session correlation, and only then prunes an expired replay. A crash before the confirmed settling write conservatively stays unresolved and cannot recreate the consumed event; a crash after it is confirmed can finish from the recorded close intent without another event. A successfully read absent session correlation becomes unresolved-orphaned and removes `armNonce`; a present mismatch is quarantined. Tab/document/attempt metadata never entered local storage and is never reconstructed, and every later `onRemoved` is ignored for orphaned state to prevent a reused numeric tab ID from clearing it. Tab lookup/snapshot failure or absence, navigation, reload, timeout, elapsed deadline, and `tabs.onReplaced` never settle either variant.

Chrome documents `runtime.onStartup` as a profile-start event, not as an `executeScript` cancellation or process-boundary guarantee. Startup-to-warning recovery is therefore disabled in every current public profile. Startup/update/reload/disable does not clear the local ledger; when one of those events cleared session correlation, the next successful reconciliation converts unresolved-live to unresolved-orphaned rather than trusting its browser-session-scoped tab ID. Top-level `tabs.onRemoved`, `tabs.onReplaced`, `runtime.onStartup`, `runtime.onInstalled`, worker-startup, and popup-open reconciliation paths are always registered so state is revalidated before any event handling. If an exact close event or correlation was missed, the orphan stays locked until disclosed device-owner recovery after every relevant official tab and browser process is closed.

An extension update must preserve backward-compatible readers for every released safety-ledger schema. An unknown, older-unsupported, extra-key, malformed, duplicate, over-capacity, or mismatched value under the reserved key is quarantined and blocks filling; it is never treated as absent or deleted on update or startup. Uninstalling or manually clearing extension storage can remove the guard, so the product makes no tamper-proof claim against the device owner; recovery copy requires every relevant official tab and browser process to be closed first.

All lifecycle commands, alarms, tab/startup events, and injection completions pass through one service-worker-owned serialized queue. Source preview has no stored tuple; after popup value scrubbing, Load carries only the ephemeral `SourcePreviewBindingV1`, and the worker re-probes the current document and matches its complete canonical-envelope digest plus tab/document/deadline before staging. Staged commands match `generation + packId + state + effectiveExpiresAtMs + sourceTabId + sourceDocumentId`; arming adds the exact nonce/attempt/deadline/destination tuple while retaining that source binding. Consuming/settling inherit one exact payload-free generation/nonce/pack/replay/attempt/deadline/destination tuple only after the source binding is erased from storage; the active fill call retains it privately only through the final source probe, clears it, then repeats the destination action-tab/deadline check immediately before dispatch. Local-live correlation matches only its minimized `armNonce + packId + replayUntil`; settled warning/replay cleanup matches its exact closed shape and deadline; unresolved reconciliation matches the exact local ledger. Stale, double, or mismatched operations fail closed. The popup never calls `chrome.scripting` directly.

Because the extension exposes no external message channel, the website's Quick Exit cannot synchronously erase extension state or cancel an in-flight command. Quick Exit unmounts the source capsule immediately: it invalidates a merely staged payload on the next probe and cancels a fill command only if the final source authorization probe observes the removal. After that probe returns, a cross-tab edit, reset, Quick Exit, inactivity clear, permission withdrawal, navigation, or close is not an atomic revocation; the accepted command may still dispatch and the unresolved/settled rules above govern recovery. The web and popup disclose this limit accurately; `Clear prepared fields` clears staged state but never bypasses a consuming or unresolved record.

## 9. Adapter registry

The registry is a bundled, immutable discriminated union.

Every enabled adapter carries:

- immutable adapter ID and contract version;
- route-registry version;
- exact source/destination origin and pathname contract;
- exact form root, method, and resolved action;
- exact supported field keys;
- exact target tag (`textarea` for description and, when applicable, single `select` for category), ID, name, associated label, container, and visibility/editability contract;
- for the description textarea, exact raw `minlength`/`maxlength` attribute presence and strings plus native `minLength`, `maxLength`, and `required` values;
- exact neutral-placeholder index/value/label/disabled/hidden/parent-optgroup contract;
- exact legacy issue-code-to-option mapping when applicable: unique reviewed index, label, value, `disabled: false`, `hidden: false`, distinctness from the neutral placeholder, and no disabled/hidden parent `<optgroup>`;
- a current allowlisted structural fingerprint defined only from the static non-value-bearing structures listed below;
- a closed serializable setter key for each permitted control—only `HTMLSelectElement.value` or `HTMLTextAreaElement.value`—and a required empty dispatched-event sequence;
- retained evidence that those native setter assignments, with zero dispatched events, cause no page-initiated submission, navigation, autosave, `fetch`, XHR, beacon, form action, or equivalent transmission of the inserted values during the bounded verification window;
- retained verification-evidence reference and verifier;
- `lastVerifiedAt` and absolute `expiresAt`;
- legal/authorisation status; and
- release state `synthetic`, `internal`, or `public`.

Every disabled official adapter carries only its route identity, contract version, `releaseState: 'internal-disabled'`, `enabled: false`, empty supported-field list, and a fixed reason such as `verification-evidence-missing` or `authorisation-gate-incomplete`. It contains no guessed selector or option contract.

Initial build-specific registry state:

| Build profile | Adapter | Initial state | Behavior |
| --- | --- | --- | --- |
| `synthetic-development` | Exact loopback source and destination fixtures | `synthetic`, enabled | Accept only a synthetic envelope and fill only fictional category and description; instrument every protected field and side effect. |
| `production-disabled` | Legacy national grievance | `internal-disabled` | Accept no fill attempt; explain that current form verification is incomplete and return to the in-tab web pack/official anchor with private-device copy or shared-device transcription. |
| `production-disabled` | NextGen grievance | `internal-disabled` | Accept no fill attempt; explain that the post-verification form contract is unavailable and return to the in-tab web pack/official anchor with private-device copy or shared-device transcription. |
| Every production profile | Delhi, unresolved, lookup, payment, status, court, and help routes | unsupported | Never import or fill for these destinations. |

The production validator rejects `mode: 'synthetic'` before storage. The synthetic-development validator rejects `mode: 'real'` before storage. Build and package scans assert that no artifact contains both registry families.

An allowlisted structural fingerprint is a canonical tuple containing only the normalized expected origin and pathname; form tag, ID/name when static, method, and resolved action; the exact allowed targets' tag/ID/name; their static associated-label text and container markers; the description textarea's raw/native min/max-length and required contract; the legacy neutral-placeholder index/value/label/disabled/hidden/parent-optgroup contract and mapped-option index/label/value/enabled/visible/parent-optgroup contract when needed; and an explicit adapter revision. It never hashes or serializes the whole page/form, enumerates unrelated controls, reads `innerText`/`innerHTML`/`outerHTML` or whole-form `textContent`, includes a current field value, includes a protected control, hashes scripts/resources, or derives from citizen/session data. The injected function returns only a boolean/fixed mismatch code, never the tuple or its source material.

Adapter rules:

- verify within 24 hours before packaging an enabled official adapter;
- cap absolute adapter lifetime at 30 days;
- enforce expiry independently of the website registry;
- disable on any origin, path, form, selector, label, option, action, native-setter behavior, structural fingerprint, or legal-state change;
- keep an adapter disabled if its portal framework requires any synthetic input, change, blur, click, keyboard, custom, or submission event to register the assigned value;
- enable no native-setter contract unless retained instrumentation proves that the assignments with zero dispatched events cause zero page-initiated submit, navigation, autosave, `fetch`, XHR, beacon, form action, or equivalent transmission during the bounded verification window;
- ship updates only through a reviewed extension-package release;
- never fetch remote selector or executable configuration;
- never fall back from one government portal to another; and
- keep an expired package useful only for explaining the assisted-copy fallback.

The website can stop offering new real extension capsules as an emergency control. Existing staged envelopes become unusable no later than their effective ten-minute expiry, while an extension update or Store takedown handles the packaged adapter.

## 10. Destination validation and fill operation

Before any injection, the popup/service worker requires:

- the popup's current action tab ID and the worker's fresh active/last-focused tab ID to equal the intended current source or destination tab as applicable;
- `https:` for an official adapter;
- exact ASCII hostname;
- empty username and password;
- default port;
- exact approved pathname;
- no unexpected query or fragment;
- top-level frame;
- agreement between the tab URL and injected function's `location`;
- successful re-probe of the original `sourceTabId` and source `documentId` with the exact unchanged, unexpired capsule;
- an enabled, unexpired bundled adapter; and
- exact registry and adapter-contract version agreement.

The following always fail: HTTP, userinfo, non-default ports, suffix attacks, sibling domains, Unicode/punycode lookalikes, unexpected redirects, unapproved paths, query/fragment smuggling, iframe execution, and lookup/payment/status/court/help pages.

`Blank` is an exact native-value predicate, never `trim()`, truthiness, visual appearance, placeholder text, or framework state. The description target must be a textarea; its allowlisted native prototype getter must return exactly the empty string. An ASCII space, newline, non-breaking space, zero-width character, or any other code point is non-empty and rejects the whole attempt. Its raw `minlength`/`maxlength` attribute presence/string and native `minLength`/`maxLength`/`required` values must equal the adapter, and the planned description's JavaScript UTF-16 `.length` must satisfy the exact non-negative native bounds without calling `checkValidity`, `reportValidity`, or another validity/event API. Pattern-bearing or input-based description controls are unsupported in this vertical. For an allowed single-select category, native `value` and `selectedIndex` getters must equal the adapter's one exact neutral-placeholder value/index, exactly that one option must be selected, `multiple` must be false, and the option's label/value/disabled/hidden properties must exactly match the bundled placeholder contract. A disabled or hidden placeholder is accepted only when those exact booleans are part of the reviewed adapter; any disagreement is drift. The same predicate and constraint check are rerun on every freshly resolved target immediately before its setter, and one non-blank or invalid target prevents all remaining mutations.

The mapped destination option is independently strict: exactly one option must match the adapter's reviewed index/label/value tuple; it must be distinct from the neutral placeholder, have `disabled === false` and `hidden === false`, and have no disabled or hidden parent `<optgroup>`. Duplicate label/value matches, index drift, a programmatically selectable but disabled/hidden option, or parent-group mismatch rejects before mutation. Native setter/readback success cannot override that structural rejection.

The service worker chooses the adapter and creates a closed, JSON-serializable `InjectionPlan` discriminated by `operation: 'preview' | 'fill'` from bundled extension code. Both variants contain the fixed adapter ID and contract version, expected location and form contract, exact allowed target selectors/metadata and textarea constraints, fixed option mapping, a closed setter key (`HTMLSelectElement.value` or `HTMLTextAreaElement.value`) whose control family must match the target tag, an invariant `dispatchedEvents: []`, and three exact deadline scalars: `effectiveExpiresAtMs`, `adapterExpiresAtMs`, and `operationNotAfterMs`. Each deadline must be a finite safe integer epoch-millisecond value; the first two exactly equal the worker's current staged-state/registry values. A preview plan has `values: null`, no attempt ID, and `operationNotAfterMs = min(effectiveExpiresAtMs, adapterExpiresAtMs, previewStartedAtMs + 30_000)`. A fill plan alone carries the opaque 32-character random hexadecimal `attemptId` plus the one or two reviewed values that passed the bounded checks and requires `operationNotAfterMs === attemptNotAfterMs`, the stored minimum of those expiries and `attemptedAtMs + 30_000`.

No deadline, value, or plan metadata can be supplied or changed by the website. The plan never contains a JavaScript function, property descriptor, DOM node, accessor, URL object, or another non-serializable value. The web envelope supplies only the reviewed description and internal issue code to the worker; it can never supply or override a location, selector, option value, setter key, deadline, event, or operation. The self-contained injected function rejects unknown plan keys, an invalid operation/value combination, an unknown or tag-incompatible setter key, a non-empty event list, invalid/inconsistent deadline, or invalid contract version. Dynamic citizen text is never interpreted as control metadata.

Source probing uses the separate `SourceProbePlanV1` from Section 7. Initial value-free destination preview and fill-action value-free preflight use `chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, world: 'ISOLATED', func, args: [injectionPlan] })` and require exactly one active top-frame result. Initial destination preview captures its non-empty `documentId`; fill-action preflight must return that exact stored ID. Final fill alone uses `{ tabId, documentIds: [storedPreviewDocumentId] }`. Calls never combine `frameIds` and `documentIds`, never adopt a replacement document, and require the result's `frameId === 0`, exact `documentId`, and exact visible-document checks. Chrome keeps a document ID stable when the same document moves through active, prerendered, or back/forward-cached lifecycle states, so a restored same document is not called a replacement; it may proceed only after the current-top-frame preflight and complete live contract revalidation. A different current document has a different ID and requires a new preview. There is no atomic lifecycle lock between preflight and fill: the fill function itself rejects unless `document.visibilityState === 'visible'` at entry, immediately before every setter, and during readback. Inside that isolated injected realm, the fill function maps the closed setter key to exactly one allowlisted prototype and resolves `Object.getOwnPropertyDescriptor(prototype, 'value').set`; a missing, non-callable, shadowed, or tag-incompatible setter fails before mutation. The function never accepts a setter function from serialized arguments and never calls an element-instance override. The worker-owned immutable registry is the authority that binds adapter ID to plan; the injected function independently validates the closed plan schema and live DOM/location contract rather than making a misleading claim that it carries a second copy of the adapter registry.

One self-contained injected function performs a combined preflight and optional fill. It:

1. validates the closed preview/fill discriminant, the fill-only `attemptId`, all three finite safe-integer deadline scalars, and their ordering; rejects unless `Date.now() < operationNotAfterMs <= min(effectiveExpiresAtMs, adapterExpiresAtMs)`; then rechecks location, top-frame status, and `document.visibilityState === 'visible'`;
2. requires exactly one verified form root;
3. verifies form method and resolved action;
4. requires exactly one target for each planned field;
5. verifies tag, type, ID, name, associated label, container, visibility, enabled/editable state, and the exact native blank predicate above;
6. for a legacy select, requires the exact verified neutral-placeholder contract and exactly one distinct destination option matching the bundled index/label/value with enabled/visible option and parent-optgroup state;
7. computes only the allowlisted structural tuple defined in Section 9, without enumerating unrelated or protected controls;
8. preflights every target before the first mutation and rechecks `Date.now() < operationNotAfterMs` immediately before mutation begins;
9. in preview mode, requires `values === null`, returns only fixed allowlisted field IDs and readiness codes, and performs no mutation;
10. in fill mode, requires the exact one-or-two-value closed shape, freshly resolves and revalidates each remaining target immediately before its assignment, rechecks `document.visibilityState === 'visible'` and `Date.now() < operationNotAfterMs` immediately before that setter, resolves the allowlisted prototype setter for its serialized setter key inside the isolated realm, then sets planned values in one synchronous call stack with no intentional yield and zero dispatched events; if visibility is lost or the mutation deadline has passed after an earlier assignment, it stops before the next setter and reports `partial`;
11. after all fill assignments, yields only through one microtask and one animation frame, freshly resolves the allowed targets, and requires the same connected nodes, same form/structural contract, exact planned values, unchanged location, `document.visibilityState === 'visible'`, and `Date.now() < operationNotAfterMs`;
12. reports complete success only when both the immediate assignment and bounded post-frame readback pass before the mutation deadline; a replacement, disconnection, new non-empty remaining target, location/form change, deadline crossing, or readback mismatch is `partial` or `indeterminate`, stops further mutation, and can never downgrade the prewritten unresolved lock by itself;
13. returns only the fill plan's exact opaque `attemptId`, field IDs, and status codes, never existing values or page content; and
14. uses no `MutationObserver` or continuing watch and stops permanently after that single bounded attempt.

The service worker owns both preview and fill injections; the popup only sends internal commands. It serializes all commands, repeats source and destination validation on the fill action, creates the spent tombstone, erases the staged payload from session storage, and persists the payload-free `consuming` marker before injection. If a race, readback mismatch, worker interruption, or exception occurs after one field changed, the result is `partial` or `indeterminate`; the pack is spent; the citizen is told to inspect and complete the form manually; and the extension never retries.

The extension never overwrites a non-empty description or applicable category. It may read only the one or two planned allowed targets to establish blankness and perform the bounded post-frame exact readback. The user clears an existing value manually before preparing another one-use envelope.

Once inserted, the description and, when applicable, category exist in the official page's own form context and are subject to that service's scripts, privacy terms, and the citizen's later actions. An official adapter cannot be enabled unless retained instrumentation shows that its native setter assignments with zero dispatched events cause no page-initiated submit, navigation, autosave, `fetch`, XHR, beacon, form action, or equivalent transmission during the bounded verification window. If the portal requires an event or transmission to register a value, that adapter remains disabled. The extension performs no runtime network inspection and cannot enumerate arbitrary page event listeners or guarantee that a portal script will never react later; it therefore never claims to observe or control the official page after the bounded readback.

## 11. Protected data and forbidden actions

Outside the exact reviewed description and fixed protocol metadata already enumerated, the extension must never query, collect, or fill a dedicated or structured source/official-page field or value for:

- challan, vehicle, driving-licence, grievance, or acknowledgement numbers;
- registration date;
- name, phone, email, address, date of birth, event date, deadline, offence, or location;
- Aadhaar, VID, PAN, another government identifier, or biometric information;
- CAPTCHA, reCAPTCHA, Turnstile, image/audio challenge, or anti-bot field;
- OTP, MFA, PIN, passcode, password, passkey, token, cookie, or session state;
- bank, card, UPI, account, or payment information;
- file or attachment inputs;
- consent, declaration, attestation, or terms controls;
- hidden, disabled, or read-only fields;
- CSRF or framework state;
- unrelated existing form values; or
- anything absent from the enabled adapter's compile-time allowlist.

This is a schema and control-query boundary, not a claim that editable prose is free of those data classes. The extension necessarily reads and may place the exact reviewed description, which can include the permitted masked final-four fragment or sensitive text missed by bounded checks. It never queries a protected official-page control to obtain such data and never parses the description to populate one.

The extension must never:

- navigate, redirect, refresh, open, close, or follow a link in a government tab;
- click a button or link;
- focus or scroll to a protected control;
- call `submit()` or `requestSubmit()`;
- dispatch a submit event;
- select an offence, file, consent, or declaration;
- upload or download anything;
- solve or inspect a CAPTCHA;
- receive or inspect an OTP;
- watch page mutations after the one fill attempt;
- scan unrelated page content;
- read page/browser storage, cookies, history, or network traffic;
- infer authentication, verification, filing, payment, acknowledgement, acceptance, rejection, cancellation, or outcome;
- take a screenshot;
- send analytics, telemetry, crash payloads, adapter diagnostics, or user data over a network;
- log the envelope, description, page values, or citizen data; or
- silently retry.

Dynamic values are never interpreted as HTML, JavaScript, CSS, selectors, URLs, or option values. The popup uses text nodes or `textContent`, never `innerHTML`.

### 11.1 Local data-flow and disclosure inventory

The privacy disclosure and tests enumerate every class of data the extension processes:

| Data | Processing and lifetime |
| --- | --- |
| Active source and destination origin/path | Read transiently only after the action-icon gesture **and** that popup instance's affirmative `Continue to preview this page` consent, for exact allowlist validation; never retained after the related command. Query and fragment are rejected except the source's explicitly allowed `goal` query, which is validated and discarded. Fresh active-tab queries compare numeric IDs and read only `tab.url` under the current/retained `activeTab` grant for that exact validation; pending URL, title, favicon, and every other returned property are ignored. |
| Tab and document IDs | Before Load, source tab/document IDs exist only in ephemeral worker/popup call frames and `SourcePreviewBindingV1` until Load, reject, expiry, `Not now`, or popup close; after Load, the exact source tab/document binding is kept only in `storage.session` with staged/arming payload so later probes cannot adopt a replacement source document. Step 5 erases that source binding from storage while the current worker command retains it only in a private call frame through the final source probe, then clears it before the last destination action-tab/deadline check and dispatch. The destination tab ID and Chrome `documentId` are kept only in session state after preview and through arming/consuming/settling. They are browser-activity metadata, not citizen identifiers, and never enter `storage.local`. Terminal result/close settlement clears the destination session record. Startup/update/reload/disable can clear session correlation while the minimized local nonce marker survives; missing correlation converts that marker to orphaned without reconstructing any browser identity. |
| Pack/result/revision IDs, nonces, digests, versions, and timestamps | `SourcePreviewBindingV1.canonicalEnvelopeDigest` and `previewNotAfterMs` exist only in ephemeral worker/popup/message memory until Load, reject, expiry, `Not now`, or popup close and are never rendered, logged, or stored. Result/revision IDs, the description digest, and versions are kept only with staged/arming payload for integrity, invalidation, and mapping, then erased before injection. Opaque `packId` and `replayUntil` enter the local lifecycle record and remain only while unresolved, warning-active, or replay-active. A fresh opaque `armNonce` correlates local unresolved-live with same-session arming/consuming/settling and is removed on terminal or orphan conversion. `attemptId`, mutation deadline, and full destination tuple remain session-only and disappear with terminal/orphan reconciliation. A settled local warning additionally keeps `warningExpiresAt`; no issue or citizen timestamp persists. |
| Mode, route key, issue code, confirmation, private-device eligibility, and adapter/registry version flags | Kept only with the staged payload to enforce the closed profile, route, eligibility, and mapping contract; erased before injection. The current worker call carries only the derived closed plan needed for its one operation. |
| Language and Simple Mode | Kept only with the staged payload and used only for extension presentation. |
| Internal issue code and reviewed description | During source/destination preview, the applicable category/description also exists ephemerally in popup JavaScript state and ordinary text nodes. The popup never places values in attributes/URLs/labels/logs/errors/hidden duplicates and synchronously scrubs nodes and state before Load/Fill or any transition away from a value preview. The staged envelope then remains only in trusted-context session storage. Destination preflight sends no reviewed description; it carries only the immutable bundled category-option contract when needed to validate that select. At fill, the worker uses the issue code to select that mapping, the popup is already scrubbed, and the worker erases the complete envelope from storage before injection. Only the reviewed description and derived category label/value when applicable enter the closed fill `InjectionPlan`; the issue code itself does not. |
| Chrome-internal serialization and call frames | Source-probe `executeScript` result serialization transiently carries the reduced envelope from isolated page realm to worker; the internal preview response carries the display fields plus a value-free full-envelope digest binding to the popup; the post-scrub Load command returns only that binding and action-tab ID; and the fill `executeScript` argument transiently carries only the reviewed description and applicable derived category from worker to isolated destination realm. After pre-dispatch session erasure, the current serialized worker command retains the already validated source tab/document binding in memory only through its final source probe, clearing it before the last destination action-tab/deadline check and dispatch. These are in-process Chrome extension/message call frames, not extension-originated network requests or persistent stores. Fixed closed schemas, value scrubbing, and no external messaging apply at each hop. |
| Allowed description and applicable-category target structure, blankness, and bounded post-frame exact readback | Inspected transiently inside the injected function; only fixed readiness/result codes return to the extension. Existing values and structural source material never return. |
| Global tab lifecycle event IDs | Chrome may deliver numeric IDs for unrelated tabs to the registered `tabs.onRemoved`/`tabs.onReplaced` listeners. The handler reads only the event's numeric tab ID(s), compares them inside the serialized queue to an exact session destination ID when one exists, and immediately discards nonmatches. It never reads or stores the event's window/URL/title/other tab data and never writes an unrelated ID. |
| Per-invocation consent | The static disclosure and affirmative Continue state exist only in the current popup heap. They are not stored or sent. Before Continue, the popup performs no tab query, storage read, worker message, or page injection; closing or selecting `Not now` discards the state. |
| Session lifecycle and correlation state | Generation exists while staged/arming/consuming/settling state needs it. Staged and arming temporarily keep the exact source tab/document binding; arming also keeps the envelope plus the nonce/attempt/deadline/destination tuple so every pre-dispatch crash is decidable. Payload-free consuming or settling retains only the full nonce/attempt/deadline/destination correlation tuple. Terminal/orphan reconciliation removes that session record; no success, warning, cancellation, or replay record relies on session storage. |
| Persistent safety ledger | One exact trusted-context `storage.local` key contains at most 32 payload-free records: at most one globally blocking record—live unresolved with only `armNonce`/`packId`/`replayUntil`, orphaned unresolved with only `packId`/`replayUntil`, or settled warning with `warningExpiresAt`—plus replay-only records with fixed outcomes. It contains no description, field value, route, issue, tab/document ID, attempt ID/deadline, URL, domain, or citizen/case identifier. The ledger survives startup/update/reload/disable; only exact correlated terminal result settlement, same-session exact delivered tab closure, or disclosed device-owner recovery settles/removes unresolved state. Logical deadlines remove warnings/replay records, never unresolved variants. |
| One-shot alarms | Only the literal names `session-expiry`, `ledger-cleanup`, and `attempt-watchdog` plus Chrome-managed scheduled times exist outside canonical storage. Names carry no identifier, route, origin, URL, field, value, or encoded payload; handlers use them only to enqueue ordinary reconciliation against canonical state. |

The extension makes no developer-directed or extension-originated network request, and ChallanSakshi's operator, developers, analytics, telemetry, and support receive none of the extension data. Chrome's temporary `activeTab` grant technically permits access to the invoked current tab, while the packaged probe deliberately narrows reads to the exact items above. After the explicit Fill click, the user-selected official portal is the sole intended external recipient of the inserted description and applicable category: those values are present in its page and its own scripts may process or transmit them under that service's privacy and security terms. This transition is disclosed before consent and again before fill.

The Privacy Policy, in-product disclosure, and Chrome Web Store data-use answers classify the reviewed description conservatively as user-provided website content that may contain personal data despite the confirmation and bounded matcher. They also disclose the transient source/destination URL and tab/document activity metadata plus the mode, route, issue, eligibility, and lifecycle flags above. They distinguish ephemeral popup DOM/heap, memory-backed `chrome.storage.session`, the exact metadata-only `chrome.storage.local` safety ledger, values that exist only in a worker/injected call frame, and identifier-free one-shot alarms; state the exact logical/physical deletion and rare unresolved-recovery limits; say that none is sent to the developer; and explain that permitted field values become available to the official page after fill.

## 12. Popup, accessibility, and language

The popup is a small vanilla TypeScript interface rather than React. Its first state on every opening is the packaged static disclosure with `Continue to preview this page` and `Not now`; before Continue, no code path may query tabs, read storage, message the worker, or inject. Later states are source preview, staged summary, destination preview, success, partial, settled needs-review, unresolved-live—close this destination tab, unresolved-orphaned—device-owner recovery required, quarantined—support/reset required, rejected, expired, unsupported, adapter-disabled, and empty. Orphaned and quarantined copy never suggests that closing an arbitrary current or same-numbered tab can clear the record.

All states include the ChallanSakshi identity, independence disclosure, affected-person boundary, an assisted-copy fallback, and the applicable untouched-field summary. A state with staged data also exposes a visible clear/discard action. Source or destination domain, handled-field list, and primary action appear only when relevant. Pre-fill states use the future-tense submission boundary; post-attempt states use the past-tense boundary. Concretely:

- ChallanSakshi identity without government emblem or visual mimicry;
- `Independent helper · Not a government service`;
- exact current source or destination domain where relevant;
- exact fields the extension may handle;
- a persistent untouched-field summary;
- `The affected person must inspect these fields and independently authenticate, declare, and submit`; helpers are never told they may do those actions for someone else;
- `The extension will not click or call Submit` in every pre-fill state;
- `The extension did not click or call Submit` after any attempt;
- at most one primary action plus the applicable visible clear/discard action; and
- an assisted-copy fallback instruction.

Before fill, the popup also says that placing the description and, when applicable, category into the official page makes those values available to that site's scripts and that the official service's privacy terms apply. It never implies that the extension can observe or prevent the site's later behavior.

Required accessibility:

- semantic headings and controls;
- complete keyboard operation;
- visible focus;
- field-specific names;
- polite status/error live region;
- no colour-only state;
- correct text order at 200% zoom;
- minimum usable popup width without horizontal scrolling;
- English and Hindi copy for every action, boundary, error, expiry, and fallback; and
- Simple Mode that removes adapter jargon but preserves the domain, expiry, preview, second click, untouched list, and submission boundary.

The extension never machine-translates or rewrites the reviewed citizen description. `language` and `simpleMode` affect extension chrome only.

## 13. Synthetic proof

The 90-second flagship core and under-two-minute guardrail proof remain fully web-based and do not require installation. Only after that timed proof, the Test Lab may expose a skippable `Synthetic extension simulation` that:

1. previews the same reduced projection;
2. simulates the separate load and fill approvals;
3. changes only the fictional category and description controls;
4. permanently displays `Untouched: challan number, CAPTCHA, OTP, Aadhaar, payment, attachment, declaration, Submit`;
5. never opens a government site; and
6. clears whenever a source observation, confirmation, result, route, or pack changes.

An optional technical demonstration may load the actual unpacked development extension against a conspicuously synthetic ChallanSakshi fixture page. Because production injection runs in Chrome's isolated world, claims are divided by what each layer can actually observe. After the fixture finishes loading and its baseline is reset, the loaded page/browser harness observes the final values of only the two allowed controls, every protected control remaining unchanged, zero dispatched events/clicks/submits/navigation/downloads, and zero new browser-context-observed network requests during the bounded preview/fill window. Direct same-realm tests of the self-contained source/fill functions instrument exact DOM getters and prove that no protected control, cookie, or page-storage getter is queried. Mocked Chrome-API tests and static package scans prove that no screenshot, cookie, synchronized storage, tabs-capture, network, download, or other privileged API is requested or called, and that `storage.local` is touched only through the exact audited payload-free safety-ledger module/key. No page counter is described as independently seeing isolated-world reads.

The demonstration says that real official adapters are disabled until independently verified and approved. It never represents synthetic filling as current government compatibility.

## 14. Package and repository boundaries

The extension is built separately from Vinext/Cloudflare:

```text
extension/
├── README.md
├── popup.html
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── scripts/
│   └── package.mjs
├── public/
│   └── icons/
├── src/
│   ├── manifest.ts
│   ├── service-worker.ts
│   ├── popup.ts
│   ├── popup.css
│   ├── source-probe.ts
│   ├── destination-adapters.ts
│   ├── safety-ledger.ts
│   └── fill-page.ts
└── tests/
    ├── manifest.test.ts
    ├── envelope.test.ts
    ├── lifecycle.test.ts
    ├── safety-ledger.test.ts
    ├── source-probe.test.ts
    ├── fill-page.test.ts
    ├── injected-function-serialization.test.ts
    ├── package.test.ts
    └── browser/
        └── loaded-extension.spec.ts

lib/
├── extension-handoff-contract.ts
└── extension-release.ts

app/extension/
└── page.tsx

tests/
└── extension-landing-contract.test.ts

app/demo/extension-fixture/
├── source/page.tsx
└── destination/page.tsx

eslint.config.mjs
package.json
pnpm-lock.yaml
.gitignore
```

Responsibilities:

- `extension/src/manifest.ts` generates one exact, compile-time-isolated synthetic-development, production-disabled, or later production-candidate manifest/package profile.
- `extension/src/service-worker.ts` owns the serialized generation-aware lifecycle, `chrome.storage.session`, alarms, source re-probe, injection, tab/startup reconciliation, and internal extension messages.
- `extension/src/popup.ts` obtains the current active tab after the action gesture, renders previews/status, and requires explicit load/fill/clear actions.
- `extension/src/source-probe.ts` exports a self-contained function that reads only the exact ChallanSakshi capsule and has no imported helper, outer constant, or module binding at runtime.
- `extension/src/destination-adapters.ts` contains immutable enabled/disabled adapter records and synthetic contracts.
- `extension/src/safety-ledger.ts` is the only module allowed to access the exact `chrome.storage.local` key; it validates, prunes, arms, settles, acknowledges, and quarantines the bounded payload-free ledger without importing the envelope or adapter modules.
- `extension/src/fill-page.ts` exports one self-contained preflight/fill function with no imported helper, outer constant, or module-binding dependency because Chrome serializes runtime-injected functions; it accepts only the extension-created JSON-serializable closed `InjectionPlan`, resolves its allowlisted prototype setter key inside the isolated realm, and never accepts a web-created selector, URL, setter function, or property descriptor.
- `extension/vitest.config.ts` runs pure/envelope, mocked-Chrome lifecycle, and direct DOM-function tests in an isolated DOM environment; it does not claim to prove a loaded extension.
- `extension/tests/injected-function-serialization.test.ts` round-trips the exact built source-probe and preview/fill entrypoints through `Function.prototype.toString()` and executes each in a fresh Node `vm`/fresh DOM realm containing only its JSON arguments and explicitly enumerated platform globals. Test-only evaluation needed to emulate Chrome serialization is excluded from shipped source and artifacts. An AST/static scan rejects imported helpers, closure references, unbound module identifiers, or worker callsites that omit top-frame `world: 'ISOLATED'` and JSON-only arguments.
- `extension/playwright.config.ts` runs a separately named Chromium persistent-context harness against the built synthetic package. It verifies package loadability, popup rendering, service-worker registration/restart, closed internal messaging, and local-only assets; it does not claim to click Chrome's physical toolbar or prove an `activeTab` user-gesture grant.
- `extension/tests/browser/loaded-extension.spec.ts` is the only automated test allowed to claim loaded-package behavior; direct page-function tests are labelled unit tests. Actual source and destination action invocations are a separate headed-Google-Chrome manual QA gate because the Playwright Chromium extension harness opens the popup by its `chrome-extension://` URL and does not provide a browser-toolbar click API.
- `extension/scripts/package.mjs` is the sole release archive producer.
- `lib/extension-handoff-contract.ts` owns the shared pure type, construction, normalization, validation, digest, expiry, and sensitive-pattern rules.
- `lib/extension-release.ts` owns the closed deploy-time public-release state and exact first-party/Chrome Web Store acquisition URLs; no user/case input, query, fragment, runtime extension message, or install-detection signal enters it.
- `app/extension/page.tsx` renders the first-party pre-install data-use/independence disclosure without user/case state and exposes the exact verified Store anchor only after every public release gate; it never offers a sideload.
- `tests/extension-landing-contract.test.ts` proves release gating, the state-free `/extension` new-tab link, disclosure-before-install order, the exact parameter-free Store URL/ID, and absence of install detection, deep-linking, or preapproval/sideload acquisition.
- `app/demo/extension-fixture/source/page.tsx` emits only the fixed synthetic envelope on the exact development source route.
- `app/demo/extension-fixture/destination/page.tsx` renders the conspicuously fictional instrumented form on the exact development destination route.
- `eslint.config.mjs` applies scoped browser-extension/test globals and rules to extension source/tests while globally ignoring only generated `extension/dist/**` and release-package output; `eslint .` must still inspect authored extension code.
- Root `package.json` and `pnpm-lock.yaml` add direct, lock-pinned development dependencies for `@types/chrome`, `@playwright/test`, the DOM test environment (`jsdom` plus `@types/jsdom`), and the deterministic ZIP implementation (`yazl` plus `@types/yazl`), rather than relying on transitive packages.

The extension uses its own Vite configuration and emits each profile to a separate ignored directory under `extension/dist/`. Production builds emit stable popup and service-worker entries, a generated manifest, local icons, no source map, no remote dependency, no synthetic code, and no development origin. The synthetic build contains no production source or government destination. The existing web build remains unchanged except for the shared pure envelope projection, UI, and explicitly synthetic fixture routes.

The packaging script accepts exactly one validated production profile directory, follows no symlink, rejects source maps and unexpected files, verifies every manifest reference, and sorts normalized POSIX relative paths bytewise. It creates no directory entries; writes every file with mode `0644`, fixed ZIP timestamp `1980-01-01T00:00:00Z`, fixed compression settings, and no host-dependent extra field; then writes a lowercase SHA-256 checksum of the exact ZIP bytes. Two clean packages from the same locked source/toolchain must be byte-identical, and `package.test.ts` performs that double-build assertion.

The root project adds separate extension build, typecheck, unit-test, loaded-browser-test, package, and package-scan commands. The root web TypeScript project excludes `extension/`; `extension/tsconfig.json` includes the direct Chrome types and consumes only shared pure modules. The extension test config is independent because the current root Vitest config intentionally includes only `tests/**/*.test.ts` in Node. `build:all` runs the existing web build and the production extension build without merging their artifacts. `.gitignore` excludes generated profile outputs, ZIPs, checksums, Playwright state, and browser artifacts without hiding authored source or retained reviewed evidence.

## 15. Failure behavior

Every failure is safe and local:

| Failure | Required behavior |
| --- | --- |
| Extension absent | Keep the in-tab pack and official anchor fully usable; preserve private-device copy and shared-device manual transcription; show no install wall. |
| Source capsule missing/stale/changed | Store nothing; ask the citizen to reconfirm on ChallanSakshi. |
| Original source tab closed or navigated | Clear the staged payload, mutate nothing, and ask the citizen to reopen/reconfirm the web pack. |
| Shared-device or unsupported result | Reject import; keep web-only handoff. |
| Envelope invalid or sensitive-pattern match | Reject the complete envelope without rewriting it; use web copy. |
| Envelope expired | Delete it and require a new explicit preparation. |
| Adapter disabled/expired | Mutate nothing and explain that assisted filling is unavailable. |
| Origin, path, redirect, frame, form, or fingerprint mismatch | Mutate nothing and return to web copy. |
| Allowed field non-empty | Mutate nothing; never overwrite. |
| Exact valid terminal `partial`, `indeterminate`, caught exception, deadline-crossing, or late-complete result | Replace unresolved state with a persistent payload-free `needs-review` warning, require affected-person inspection, and never retry. Timely human acknowledgement preserves an `inspected` replay record only while replay remains active; otherwise it deletes. Automatic `warningExpiresAt = settledAtMs + 24 hours` expiry always deletes because replay has necessarily expired, and it never implies inspection. |
| Transport rejection, missing/extra/malformed/stale/mismatched result, popup/worker loss, or watchdog with matching same-session correlation | Keep `unresolved-live`, block acknowledgement and every new load, and ask the user to close that exact destination tab while the extension remains enabled. Only its exact delivered `tabs.onRemoved` plus the matching session destination and local nonce/pack/replay marker may begin three-phase close settlement. |
| Recognized local unresolved record with successfully read absent session correlation | Convert to `unresolved-orphaned`, remove `armNonce`, reconstruct no attempt/tab/document data, ignore every later numeric tab event, and allow only disclosed device-owner recovery after every relevant official tab and browser process is closed. Elapsed time and startup/update/reload/disable never clear it. |
| Present malformed or mismatched session/local correlation | Quarantine without erasing either side or injecting; require support or disclosed device-owner recovery after closing every relevant official tab/process. |
| Official page unavailable | Keep official routing unchanged; do not switch portals or infer record status. |
| Session/local write or readback failure before local arming | Inject nothing, expose no payload in the error, and disable filling for that envelope. Exact arming with no local record settles to cancellation by adding its terminal; exact arming with the matching nonce marker replaces it; every mismatch quarantines. |
| Failure after local arming, or local terminal-rewrite/readback failure | Inject only if the required pre-dispatch writes were confirmed; otherwise stop. Keep the unresolved record whenever terminal settlement cannot be proven. Alarm failure never changes logical expiry, which is checked lazily on every read. |

Errors contain only fixed codes and allowlisted field identifiers. They never contain the description, capsule, page content, existing form value, URL query, or user data.

## 16. Verification contract

### 16.1 Manifest and package

- Permission array exactly equals `activeTab`, `scripting`, `storage`, and `alarms`.
- Manifest action names `popup.html`; background names `service-worker.js` with `type: 'module'`; every referenced file exists in the profile output.
- Manifest contains no host/optional-host permissions, content scripts, external messaging, web-accessible resources, sandbox, external update URL, or incognito access.
- CSP denies network connections, frames, objects, forms, inline code, evaluated code, and remote assets.
- Production bundle contains no synthetic mode/adapter, localhost/staging source, remote import, `fetch`, XHR, WebSocket, EventSource, beacon, analytics, telemetry, `eval`, or `new Function`; the synthetic bundle contains no production source, real mode, or government destination.
- Worker output is one stable ES-module entry with no dynamic import; popup output has no module-preload polyfill; a callback-messaging test proves every listener uses `return true` plus exactly one callback response rather than an async/Promise listener. The generated build target and manifest floor match the release profile, and retained loaded-package plus headed action-icon evidence includes the exact declared minimum branded-Google-Chrome major.
- Release build emits no source map and the sole packaging script produces a double-build byte-identical, reviewable ZIP and checksum with the normalized archive contract in Section 14.
- An AST plus built-bundle callsite scan applies a closed browser-authority allowlist: only `runtime.sendMessage` without an external extension ID, `runtime.onMessage/onStartup/onInstalled.addListener`, read-only `runtime.lastError`, `tabs.query/get` and `tabs.onRemoved/onReplaced.addListener`, `scripting.executeScript`, the exact `storage.session/local` `get`/`set`/`remove`/`setAccessLevel` calls, and `alarms.create/clear/onAlarm.addListener` may appear. It rejects every other `chrome.*` or `browser.*` call/property, alias or computed-property bypass, every external-ID/native message overload, `tabs.create/update/remove/reload/discard/duplicate/move/group`, `runtime.setUninstallURL`, `navigator.clipboard`, `document.execCommand`, `window.open`, location/history writes, navigation helpers, and all network primitives. The only allowed `storage.local` callsites are inside `safety-ledger.ts`; the only scripting callsites are the worker's closed source-probe/destination-preview/preflight/fill dispatchers. Alarm tests accept only the three literal names, exact one-shot `{ when }` creation shape, identifier-free names, and handlers that enqueue reconciliation without treating an alarm as state. Lifecycle-listener tests prove unrelated global numeric tab IDs are compared and discarded without reading `removeInfo`, a URL, or another tab property.
- A built popup HTML/SVG/CSS asset scan permits only the exact relative packaged stylesheet, module script, and local icon/image references. It rejects `<a href>`, `<form>`, `<base>`, `<meta http-equiv="refresh">`, SVG links, `target`, `formaction`, external or protocol-relative URL-bearing attributes, CSS `url()` outside the exact packaged icon set, and any other declarative navigation/network surface. Assisted fallback in the popup is fixed instruction text, never an external anchor; the user opens official services only through the already visible website anchor.
- Web acquisition contract tests require the visible official-service anchor to precede the optional-helper card; the card's first-party `/extension` anchor uses `target="_blank"`, `rel="noreferrer"`, and no query/fragment/state; its separate button is exactly `Already installed? Prepare reviewed fields`; and no script/API attempts install detection, external extension messaging, or an extension deep-link. The landing page consumes no review state and exposes its exact parameter-free Chrome Web Store URL/ID only when Store approval plus a current public-enabled adapter/release flag are all present. Otherwise the public card controls and landing-page install/sideload action are absent. Cover English/Hindi, Simple Mode, keyboard, 200% zoom, shared-device exclusion, and narrow-mobile layout.

### 16.2 Source and envelope adversaries

- In the synthetic profile, accept only `127.0.0.1:3000` with the two role-specific exact paths; reject an omitted port, port `3001`, `localhost`, IPv6 loopback, role/path swap, alternate path, query, and fragment.
- In production profiles, reject HTTP, wildcard/sibling/lookalike/punycode hostnames, userinfo, unexpected ports, paths, queries, fragments, iframes, and tab/probe location races.
- Preview source A, then issue a stale load command after invoking the popup on source B, another tab, or another window: popup-supplied and worker-queried action tab IDs must match the previewed source tab and current allowed `tab.url`, and the probe's returned top-frame `documentId` must match the preview binding, otherwise store nothing. Reload source A to a same-origin/same-path replacement document containing byte-identical canonical capsule text and prove Load, destination preview, fill preflight, and the final source authorization probe all reject it. Restore the exact same BFCache source document and prove it may continue only when again current top frame and after full URL/capsule/envelope/expiry revalidation. A byte-identical capsule-node remount inside that same document is treated as equivalent rather than falsely claimed detectable.
- Reject missing, unknown, nested, accessor-like, prototype-pollution, malformed, duplicate, and oversized properties. Source-capsule tests prove that the one text node must exactly equal `JSON.stringify(canonicalRecord)` after parse/validation/reconstruction, so duplicate keys, whitespace, alternate escapes/number spellings, extra nodes, and noncanonical ordering fail.
- Prove source injection accepts only a worker-constructed closed `SourceProbePlanV1` with the exact profile source literals and operation deadline, while destination preview/fill accepts only `InjectionPlan`; fresh-realm and built-callsite scans reject swapped plan families, closure/import dependencies, and website/popup-supplied source authority.
- Reject unsupported modes/routes/issues, unconfirmed/shared/stale/far-future/expired/replayed/spent envelopes and digest/version mismatches.
- Reject lone high surrogates, lone low surrogates, over-500-code-point text, non-normalized text, invalid C0/C1 controls, every exact U+061C/U+200E–U+200F/U+202A–U+202E/U+2066–U+2069 bidi-format character, markup/script sentinels, URLs, email/UPI handles, 9–19-digit runs, PAN-shaped values, full registrations, and long mixed identifiers according to the exact Section 6 predicates.
- Assert exact canonical property order, lowercase 64-hex SHA-256 over the normalized UTF-8 description, and exact `TextEncoder` byte-size behavior immediately below, at, and above the 8,192-byte envelope limit.
- Preserve valid English/Hindi, combining marks, emoji, and Indic shaping without corruption; prove lone-high/lone-low rejection and valid surrogate-pair acceptance before `TextEncoder`; and prove the 500-Unicode-code-point boundary with Devanagari, combining sequences, and astral emoji.
- Prove compile-time profile isolation in both directions: the synthetic package rejects every real envelope/source/destination, the production package rejects every synthetic envelope/fixture, and package scans find no opposite-profile mode, origin, route, or adapter identity.

### 16.3 Destination and DOM adversaries

- Reject every origin/path confusion listed in Section 10.
- Reject disabled or expired adapters and web/extension registry-version mismatches.
- Reject a missing, non-integral, non-finite, unsafe-integer, worker-state-mismatching, misordered, or already-passed `effectiveExpiresAtMs`/`adapterExpiresAtMs`/`operationNotAfterMs`; a fill plan must also match its stored `attemptNotAfterMs` and exact `attemptId`. Use a delayed-injection fake clock to cross the operation deadline after the worker check but before injected entry, at each explicit pre-setter check, between two setters, and before readback. Assert that a setter never runs when its immediately preceding check observes expiry and that no expired path reports complete. Do not claim that the timestamp is cancellation or that the clock cannot cross in the synchronous gap between a passing check and its setter; the prewritten unresolved record governs that ambiguity, and any exact terminal result received late settles to `needs-review`.
- Initial destination preview captures a non-empty active-top-frame `documentId`; fill-action preflight targets current `frameIds: [0]` and requires its returned document ID to equal the stored value, while final fill alone targets that stored ID. A same-URL reload to a new document, different prerendered/current document, new document, missing result, extra result, hidden document, or mismatched `frameId`/`documentId` cancels without adopting the current document. A back/forward-cache restore of the exact same document may retain its ID and must pass the current-frame, visible-document, URL, DOM, adapter, blankness, deadline, and final in-function visibility checks; tests do not mislabel that lifecycle transition as a replacement or claim an atomic lock between calls.
- Preview destination A, then invoke or command the popup from tab B and from another window while A's earlier temporary grant may remain: the popup-supplied action tab ID and the worker's fresh active/last-focused tab query must both reject the stale command and inject nowhere. Repeat the action-tab check after local/session arming and immediately before dispatch; a mismatch or expired attempt settles as `cancelled-before-dispatch`, while settlement-write ambiguity remains unresolved.
- Reject missing, duplicate, hidden, disabled, read-only, wrong-tag, wrong-label, outside-form, non-empty, shadow-DOM, or iframe targets. For the description textarea, cover exact empty string versus ASCII whitespace, newline, NBSP, zero-width characters, and placeholder-only appearance; raw/native `minlength`/`maxlength` drift; UTF-16 boundary values including astral characters; required-state drift; an input substituted for the textarea; and any pattern-bearing/input-based contract. For selects, cover native value/selectedIndex disagreement, zero/multiple selected options, `multiple`, and every exact neutral-option label/value/disabled/hidden/parent-optgroup mismatch; a reviewed disabled/hidden neutral option passes only when its adapter booleans match exactly.
- For the mapped destination option, reject zero or duplicate label/value matches, reviewed-index drift, equality with the neutral placeholder, disabled/hidden option state, and a disabled/hidden parent `<optgroup>` even when the native setter and immediate readback would otherwise succeed.
- Reject changed form method/action, category placeholder, option label/value, and fingerprint.
- Preflight every allowed field before any mutation.
- Exercise DOM-clobbering names such as `constructor`, `prototype`, `__proto__`, `submit`, and `action`.

### 16.4 No-side-effect fixture

After fixture load and a deliberate baseline reset, the synthetic destination fixture and browser-context harness observe externally visible input/change/blur/keyboard/custom events, link/button clicks, submit events and resulting form effects, navigation/history, new browser-context network requests, uploads/downloads, the exact final values of the two allowed synthetic fields, and every protected control remaining unchanged during the bounded preview/fill window. All forbidden externally visible counters remain zero. They do not claim to observe isolated-world getter or method calls.

Direct same-realm `source-probe.test.ts` and `fill-page.test.ts` instrumentation wraps the exact DOM/control/global getters and form methods available to each self-contained function and proves the closed allowed-read/call set, including zero protected-control, cookie, page-storage, `form.submit`, or `requestSubmit` access. The serialization test then executes the exact built functions reconstructed from `func.toString()` in a fresh DOM/VM realm with only JSON arguments and enumerated browser globals, proving that the functions do not rely on module closure state that Chrome would discard. Mocked Chrome-API tests plus manifest/source/bundle/callsite scans prove that the extension never requests or invokes screenshot/tab capture, cookie, synchronized storage, download, network-interception, or other privileged APIs; that `storage.local` access is confined to the exact audited safety-ledger module/key and never carries envelope/page values; and that every injection is top-frame `ISOLATED`. Together these layers prove the boundary without weakening production execution from `ISOLATED` to `MAIN` merely for test observability.

A synthetic change listener that tries to submit remains silent because the extension dispatches no change event. A separate adapter-audit variant proves that dispatching such an event would cause a forbidden side effect and therefore that any contract requiring the event must remain disabled. This is a build/release gate, not a claim that runtime DOM APIs can discover arbitrary listeners.

### 16.5 Lifecycle and accessibility

- Cover expiry while the popup is open, worker suspension/restart, browser restart, extension reload/update/disable, multiple source/destination tabs, two concurrent fill commands, double click, rapid retry, import-versus-fill, clear-versus-fill, alarm-versus-replacement, stale alarm, stale completion, source-preview-binding change between preview and load, source edit/reset/Quick Exit/close/navigation or same-path replacement document with a byte-identical capsule before destination preview or fill, review-role change, affected-person departure, affected-person permission/confirmation withdrawal, attempted helper-only confirmation, same-capsule replay after success/partial/failure, ledger pruning/capacity, every arming crash before and after local marker readback, crash after `consuming`, each settlement phase, delayed injection entry after worker restart, popup closure and worker/watchdog loss after the first assignment, exact terminal result after `replayUntil`, persistent needs-review display/acknowledgement/warning expiry, partial mutation, explicit staged clear, and lazy expired reads.
- Prove the popup's static disclosure explains that an official-page Continue may inspect both the current allowlisted blank controls and the previously approved source tab/document/capsule, makes zero tab/storage/runtime-message/current-page-injection/source-re-probe calls before each affirmative Continue, and stores no consent. After official-page Continue, prove both accesses are limited to their exact disclosed probes. Source preview returns a closed digest binding; Load scrubs value-bearing DOM/state before sending only that binding/action-tab ID, and the worker stages only a fresh current-document probe with the same full canonical digest. Fill similarly scrubs before its command. Every reject/clear/expiry/transition remains scrubbed, and no value enters an attribute, URL, label, log, error, or hidden duplicate.
- Prove exact staged/arming source-tab/source-document binding and re-probe equality, exact arming write/readback, then local `{ armNonce, packId, replayUntil }` write/readback, completes before session payload erasure and dispatch; any pre-confirmation failure injects nothing. Prove the source binding leaves session storage before consuming, survives only in the active in-memory worker call frame through the final exact-document source probe, and is cleared before the last destination action-tab/deadline check and dispatch. Test arming plus absent local marker and arming plus exact local marker cancellation through session-settling → local-terminal → session-clear; a different same-pack record quarantines. Test the literal session/local key strings, absence-as-empty behavior, exact closed unions, post-serialization plain-own-record checks, 32-hex IDs/nonces, finite-safe/order-constrained times/tab IDs, bounded printable opaque document IDs, exact local/session nonce-pack-replay subset, full session tuple inheritance, 32-record cap, lexicographic uniqueness, one-global-blocker invariant, and duplicate/unknown/extra/sparse/prototype/over-capacity quarantine. Keep unresolved pinned after replay expiry and prove no envelope/page/browser identity/attempt deadline enters local state, logs, or errors. Assert no other session/local key, no `storage.sync`, and no `storage.local` access outside `safety-ledger.ts`.
- Prove valid complete/partial/indeterminate settlement through session-settling → local-terminal → session-clear and every crash window. A timely human acknowledgement alone may create outcome `inspected` while replay remains active; automatic warning expiry deletes the necessarily replay-expired record and never creates an outcome or implies inspection. Every handler raw-validates and reconciles settling before pruning or handling a new close. Test complete, cancellation, and close terminals whose `replayUntil` passed in every write/clear crash window. Startup/update/reload/disable preserves local records but clears session correlation; recognized unresolved-live then becomes orphaned and removes `armNonce` without reconstructing attempt/tab/document state. Only a same-browser-session local nonce/pack/replay match plus valid consuming tuple and delivered event tab ID equal to session `destinationTabId` may enter three-phase closed-unresolved settlement. A crash before confirmed close intent remains unresolved; a crash after it finishes without another event. Test browser restart/update/reload/disable followed by reuse of the same numeric tab ID: orphaned state ignores it. Tab lookup failure/absence, navigation, `tabs.onReplaced`, elapsed time, a missed close event, and every `runtime.onStartup` path never settle unresolved state. Present mismatches and unknown schemas remain quarantined.
- Race each source edit/reset/Quick Exit/inactivity clear/role-or-permission withdrawal/navigation/close immediately before and immediately after the final source authorization probe resolves. Changes observed by the probe cancel and inject nowhere; changes after it returns do not claim atomic revocation, and the already accepted command proceeds only under the armed local-ledger/one-attempt contract.
- Test source preview, load, staged summary, destination preview, fill, clear, expiry, rejection, source-tab-closed fallback, and assisted-copy fallback with keyboard-only operation, screen-reader names, live regions, English/Hindi, Simple Mode, and 200% zoom. Every language/mode tells the citizen to keep the source tab open and unchanged.

Automated browser tests use only synthetic pages. A real official smoke test occurs only after the legal/authorisation gate, uses an authorised synthetic/test account and synthetic field values with no citizen data, performs no protected action, stops before submission, checks the exact blank controls and native-setter/no-event contract, and instruments only fixed input/change/custom/submit/click/navigation/autosave/`fetch`/XHR/beacon/form-action effect counters during the bounded verification window. Retained evidence is limited to reviewer/date, Chrome version, package and adapter hashes, allowlisted structural excerpts without values, the fixed zero-effect counts, steps, and pass/fail under a documented bounded retention and least-privilege access policy. It contains no HAR, request/response body, header, cookie, page/browser storage dump, full DOM/HTML, protected-control value, tokenized URL/query, CAPTCHA/OTP, credential, payment data, citizen screenshot, or unsanitized screenshot/video; any retained visual is manually sanitized and independently checked before storage.

Before the extension framework may be called complete, a named reviewer also performs a dated manual test in headed branded Google Chrome at the manifest's declared floor (initially 152) with the packaged synthetic profile: load it through the normal extension-development screen; verify temporary `activeTab` access is absent; invoke the actual action icon on the exact source fixture; complete the static disclosure consent, preview and load; keep that source tab open and unchanged; open the exact destination fixture in a separate tab; verify access is absent there before invocation; invoke the actual action icon again; complete fresh consent, preview and fill; then verify the grant is revoked by cross-origin navigation or tab close. A separate same-origin navigation test proves that exact source URL/capsule re-probe—not assumed permission revocation—fails and clears the staged payload when the source path or capsule changes. The retained record includes Chrome version, package checksum, fixture revision, steps, observed permissions, screenshots or screen recording, and pass/fail. Directly navigating to `popup.html`, DevTools execution, or a Playwright shortcut cannot satisfy this gate. The currently observed local Chrome 151 cannot satisfy the initial 152 floor.

## 17. Release states and gates

### 17.1 Synthetic development build

- Enabled synthetic source and destination fixtures only.
- Suitable for automated testing and an honest judge-facing technical demonstration.
- No real government form access or compatibility claim.

### 17.2 Internal adapter candidate

- Production-shaped package with real adapter identities but filling disabled.
- Named internal testers only; no public sideload instructions.
- An official adapter may be enabled internally only after written legal/security approval for the test and a current lawful non-submitting DOM/native-setter/no-event audit.

### 17.3 Chrome Web Store candidate

Requires:

- written portal-owner authorisation, or a written legal determination that separate authorisation is not required and that the exact behavior complies with applicable terms and law;
- all parent web-product public-launch gates;
- operator identity and support/security contact;
- a current, publicly accessible extension Privacy Policy linked from the designated Chrome Web Store Developer Dashboard field and from the project homepage or a page one click away;
- comprehensive Policy, Store, and in-product disclosure of every Section 11.1 data class, why/how it is handled, each recipient, retention/recovery limit, and deletion path—including that none is sent to the developer and that the official portal is the sole intended external recipient of inserted field values after the explicit Fill click;
- a prominent plain-language disclosure on the extension landing/listing page before installation, followed by the explicitly labelled standard installation action as pre-install affirmative consent, and the separate in-product disclosure plus `Continue to preview this page` consent before each new page/user-data handling operation; the Privacy Policy, Terms, or bundled acceptance cannot substitute for these disclosures and actions;
- accurate Chrome Web Store privacy declarations and Limited Use certification, plus a developer-written Limited Use compliance statement on the public project homepage or a page one click away;
- a Store listing and in-product explanation that transient origin/path and page-content handling occurs only for the single user-facing reviewed-field handoff, with no advertising, profiling, unrelated research, or developer human access;
- an exact narrow justification for each of `activeTab`, `scripting`, `storage`, and `alarms`, reconciled across manifest, listing, dashboard, Privacy Policy, product UI, and observed behavior;
- extension-specific Terms consistent with those disclosures;
- prominent independence/no-endorsement disclosure;
- no government seal, emblem, copied interface, or misleading official name;
- independent extension security/privacy review;
- dependency inventory, licence review, SBOM, build provenance, reproducible ZIP, and checksum;
- publisher account protected by hardware-backed MFA and least-privileged roles;
- current retained route/form/field/native-setter/no-event evidence;
- at least one current, authorised, unexpired, public-enabled production adapter whose complete single purpose works in the submitted package; the `production-disabled` package with zero enabled real adapters is never submitted to the Store;
- adapter verification within 24 hours of packaging and expiry no later than 30 days;
- Store approval, staged rollout, rollback, emergency disable, and takedown procedure; and
- a change-control gate that updates the listing, dashboard declarations, Policy/Terms, and in-product disclosure—and obtains fresh consent where handling or purpose changes—before any changed data practice ships.

Because Chrome Web Store policies can change, the release owner re-reads the current official permissions, privacy, user-data/Limited-Use, single-purpose, minimum-functionality, and metadata rules on the actual submission date and records the reviewed URLs/date. Any conflict keeps submission blocked and triggers a specification/review update rather than an undocumented workaround.

Chrome Web Store review is not government approval. The public is never instructed to install an unpacked ZIP or bypass a browser warning.

### 17.4 Public extension

The listing name is `ChallanSakshi Assisted Handoff`.

Its single-purpose statement is:

> After you prepare and confirm a factual e-Challan review pack on ChallanSakshi, this independent desktop extension can place its reviewed description and, when supported, category into blank fields on an allowlisted official portal. It never queries protected official-page controls or clicks or calls Submit.

The listing states that mobile Chrome is unsupported, the installation-free handoff remains available, every local page/form data use and its retention is disclosed, and no government affiliation, endorsement, or authorisation exists unless separately proven.

## 18. Acceptance criteria

The extension framework is complete when:

- the web handoff remains complete without it;
- every action invocation requires static pre-handling disclosure and ephemeral affirmative Continue consent, and the exact source-pull sequence then requires distinct preview-and-Load plus preview-and-Fill approvals;
- public acquisition, when separately released, preserves the review in its original tab, presents pre-install disclosure before a verified Store anchor, never detects/deep-links into the extension, and exposes no acquisition/preparation control before Store approval plus a current public-enabled adapter;
- the manifest and package satisfy every least-privilege and offline-code requirement;
- the reduced envelope contains only permitted properties and survives the full adversarial matrix;
- session storage is memory-backed and trusted-context; every payload becomes logically unusable by `min(envelope expiry, import + 10 minutes)`, is erased before dispatch, and is physically removed earlier on clear/rejection/replacement or later on delivered alarm/next worker wake as applicable;
- the single trusted-context local safety ledger is payload-free, closed-schema, deterministically ordered, capped at 32 records, accessed only through its audited module/key, and persists opaque correlation/replay/warning metadata only for the exact lifetimes in Section 8;
- local arming and exact readback precede session payload erasure and injection; valid terminal settlement uses the three-phase session-settling → local-terminal → session-clear order, and every crash/storage ambiguity fails closed;
- source Load stores the exact source tab/document binding in session through arming, every later source probe requires the returned top-frame `documentId` to match it, and the binding is erased from storage before consuming; a same-path replacement source document is never adopted even with a byte-identical capsule;
- fill-action preflight targets the current active top frame and requires its returned `documentId` to equal the destination-preview ID; final fill alone targets that stored ID and independently requires a visible document. A different document requires a new preview and receives no values; the exact same BFCache-restored document may continue only after full revalidation, without an atomic-lock claim;
- every fill has a worker-owned `attemptNotAfterMs` no later than 30 seconds after dispatch and no later than the envelope/adapter expiries; the injected function checks it at entry, immediately before every setter, and before readback, but the product treats it only as fail-fast—not cancellation or proof that a started function stopped;
- an exact terminal partial/indeterminate/late result becomes a persistent settled warning until affected-person acknowledgement or `settledAtMs + 24 hours`; an unresolved transport/worker/watchdog path cannot be acknowledged or time-cleared. Unresolved-live may enter crash-safe close settlement only when the exact delivered event tab ID equals the matching same-browser-session consuming destination and the local nonce/pack/replay marker matches; unresolved-orphaned ignores every later numeric tab event and clears only through disclosed device-owner recovery after every relevant official tab and browser process is closed; malformed/mismatched correlation quarantines;
- startup/update/reload/disable preserves unresolved, warning, and replay records; device-owner reset/uninstall is outside the one-use guarantee and is never presented as ordinary in-product settlement;
- the synthetic adapter fills only the fictional category/description and produces zero protected side effects;
- dated headed-Google-Chrome evidence at the declared/current-Stable floor proves both real action-icon gestures, per-invocation disclosure/consent, and temporary `activeTab` grants against the exact synthetic fixtures; no automated test is described as proving a physical toolbar invocation;
- all real official adapters are demonstrably disabled rather than populated with guessed contracts;
- every failure returns to the installation-free in-tab pack/official-link handoff—private-device copy or shared-device manual transcription—without a success or submission claim;
- English/Hindi, Simple Mode, keyboard, screen-reader, and zoom behavior passes;
- the complete web and extension automated suites, typechecks, lint, builds, package scan, and `git diff --check` pass; and
- documentation accurately separates synthetic development, internal candidate, Store candidate, and public extension states.

An official adapter is separately complete only when its legal/authorisation gate, retained DOM/form/native-setter/no-event evidence, expiry, adversarial tests, non-submitting smoke test, review, and Store release controls all pass. Until then, `live official autofill` remains unimplemented, even if the surrounding extension framework is technically complete.

## 19. Authoritative platform references

- [Chrome `activeTab` permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome extension messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Chrome storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Chrome tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome document IDs and instant-navigation lifecycle](https://developer.chrome.com/blog/extension-instantnav)
- [Chrome extension update lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle)
- [Chrome manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Manifest V3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Chrome extension security guidance](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- [Chrome extension privacy guidance](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)
- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Chrome Web Store minimum-permission policy](https://developer.chrome.com/docs/webstore/program-policies/permissions/)
- [Chrome Web Store user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Chrome 152 desktop Stable update, 1 September 2026](https://chromereleases.googleblog.com/2026/09/stable-channel-update-for-desktop.html)
- [Playwright Chrome-extension testing](https://playwright.dev/docs/chrome-extensions)
