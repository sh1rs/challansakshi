# ChallanSakshi adaptive two-stage citizen resolution design

**Status:** Approved by the owner and implemented on 2026-09-05; locally verified with 807 unit/regression tests, 29 browser acceptance tests, exact route-expiry runs, typecheck, lint, and production build. Not deployed. Evidence and implementation-layout adjustments: `docs/superpowers/verification/2026-09-05-adaptive-citizen-resolution.md`.
**Repository:** `/Users/shars/Desktop/challansakshi`
**Branch:** `codex/challansakshi-resolution-layer`
**Starting tree:** `0603833`
**Primary surface:** `/` and `/review` at 320–390 px; shared-chrome regression coverage on `/fastag`
**Implementation boundary:** Web product only. The browser extension remains frozen and production-disabled.

## 1. Decision

Replace the current page-like three-stage e-Challan journey with one compact, adaptive workspace containing two conceptual phases:

1. **Check** — establish source provenance and ask only the evidence questions needed for the current branch.
2. **Resolve** — show the finding, its meaning, and the official next action before any advanced preparation controls.

The common path stays on one stable page surface. Selecting a source progressively reveals the minimum comparison questions. Confirming the current answers replaces that content with the resolution view without an unconditional page scroll. The first result viewport must contain the finding and the relevant official-route affordance. A safe official lookup can be active immediately; a grievance destination remains gated until the existing current-pack policy permits it.

This specification deliberately fixes the interaction model before extracting a generic guided-service engine. Generalising the current experience first would standardise its remaining friction across every future service.

## 2. Relationship to earlier specifications

This document supersedes the conflicting **presentation and sequencing** decisions in:

- `2026-08-28-challansakshi-citizen-resolution-layer-design.md`;
- `2026-09-02-challansakshi-progressive-disclosure-design.md`; and
- the usability portions of `docs/hackathon/2026-09-04-number-one-plan.md`.

It also makes one explicit conservative domain-rule exception: a citizen-declared readable independent vehicle record becomes a prerequisite for every plate/category comparison result, superseding the earlier classifier behavior that could return aligned or image-unclear without that record. It does not supersede the earlier privacy, evidence-provenance, official-route, shared-device, signature-binding, bilingual, or release-truth contracts. Those remain harder constraints than visual simplicity.

The service-catalogue engine and new verticals remain separate follow-on designs. This first subproject makes the current e-Challan vertical simple enough to become the pattern later.

## 3. Evidence for the change

The current tree was rendered in the in-app browser at 375 × 812 on 2026-09-04. The observed default surfaces measured:

| Surface | Document height | Approximate phone viewports | Critical element |
|---|---:|---:|---|
| Home | 1,705 px | 2.1 | Ten overlapping main-content journey links |
| Source stage | 2,186 px | 2.7 | Continue begins around document Y=1,595 |
| Evidence stage | 1,779 px | 2.2 | Primary action begins around document Y=1,188 |
| Representative mismatch result | 2,776 px | 3.4 | Official action begins around document Y=1,076 |
| Mobile review header | 175 px | — | Utility controls wrap before the task starts |

The stage-change effect in `CitizenReviewApp.tsx` focuses the next heading and then explicitly calls `scrollIntoView({ block: 'start' })`. Removing animation changed the speed of the jump, not the jump itself.

The home currently exposes four goal links, five situation links, and one FASTag link. Nine links enter substantially the same `/review` flow; the `goal` parameter mainly changes introductory copy. The interface therefore suggests breadth that the current real workflows do not yet provide.

## 4. Goals

### 4.1 Citizen goals

- Reach the correct current service from the home page in one deliberate action.
- Understand what is required without reading product-policy prose.
- Complete a common e-Challan mismatch review with no more than four actions after entering `/review`.
- Reach a message/link safe stop with no more than two actions after entering `/review`.
- See the finding and official next action in the first result viewport.
- Never be moved to the top of a replacement screen after pressing the primary action.
- Retain access to complete evidence, worksheet, export, return, and official-handoff capabilities when requested.

### 4.2 Product goals

- Make plain language the standard experience rather than an optional mode.
- Keep one concise product-wide boundary in the footer.
- Preserve conservative deterministic outcomes and explicit abstention, with one deliberate tightening: no plate/category comparison result without a citizen-declared readable independent vehicle record.
- Ask for source, evidence, role, device, jurisdiction, and preparation information only at the point where each answer changes an available result or action.
- Establish a measured, tested interaction pattern that can later become the shared service shell.

### 4.3 Judging goals

- Make the working decision engine visible in the cold path.
- Make the real-versus-simulated and rules-versus-model boundaries easy to explain without filling the citizen journey with disclaimers.
- Ensure every visible primary control works and leads to a truthful state.
- Do not treat the earlier 29–30 score projection as guaranteed evidence.

## 5. Non-goals

This subproject does not:

- add a government integration, account, backend, database, analytics, or cross-session case storage;
- automate login, CAPTCHA, OTP, Aadhaar/VID, payment, filing, submission, or an authority decision;
- enable the production analysis route or send real files to a model;
- enable or modify the frozen browser extension;
- add seven shallow service cards or claim that unreleased verticals exist;
- create a free-text AI-style router on the home page;
- redesign the FASTag service's internal stages or transition behavior; its known step-scroll behavior is a named follow-on and no site-wide no-jump claim is allowed until that vertical is redesigned;
- loosen a deterministic finding or action-ready definition merely to reduce questions; this design does deliberately make readable-record availability a stricter prerequisite for any plate/category comparison result;
- remove finding-specific uncertainty, missing-evidence, or stale-route information;
- deploy, record the submission video, or claim public-launch readiness.

## 6. Experience architecture

```text
HOME
  Review a challan or photo ───────────────┐
  Only have an SMS or forwarded link ──┐  │
  Check a FASTag transaction            │  │
                                        │  │
REVIEW / CHECK                          │  │
  Source provenance ── message-only ────┘  │
       │ safe stop + official lookup       │
       └ official source/download ◄────────┘
              │
              ├ readable independent vehicle record
              ├ plate comparison
              └ only the branch-specific follow-ups still needed
                     │
              Confirm and see my next step
                     │
REVIEW / RESOLVE
  What we found
  What it means
  What to do now + official action
  └ Prepare my checklist (advanced, on request)
```

The two phases are conceptual states, not separate routes. `/review` remains the canonical URL and must not put case data in its query, fragment, or history.

## 7. Mobile product chrome

### 7.1 Header

At viewport widths below the existing desktop-navigation breakpoint:

- The header is one row and no more than 72 px tall at 320, 375, and 390 px.
- Brand remains visible.
- `Quick exit & clear` remains visible on stateful review routes.
- One labelled `Menu` button opens a non-modal navigation panel controlled by `aria-expanded` and `aria-controls`.
- Route links, language, theme, and any accessibility preferences live in that menu.
- The menu supports Escape to close, returns focus to its trigger, has an accessible name, and does not trap or reorder keyboard focus.
- The route links do not disappear without a replacement.

On the home page, where no case state exists, Quick Exit is absent; the mobile row contains only the brand and Menu. On stateful routes the visible compact control label is `Exit`, with accessible name `Quick exit and clear this review`. Language, theme, and route links remain inside Menu on every mobile route so the 72 px budget does not depend on translated utility labels.

The current `English-only safety beta` header badge is removed from `/fastag`. Until that vertical is translated, its Menu language row states once that the FASTag check is currently available in English; this contextual availability message is not repeated in the page body or footer.

### 7.2 Plain language replaces Simple mode

Plain citizen language becomes the default and only critical-path register. The visible `Simple mode` toggle is removed from the header.

Technical terms required for evidence, audit, or export remain available inside named details such as `Why this result?` or `Technical evidence details`. During this slice, `/` and `/review` always request the existing plain-language presentation (`simpleMode: true`) and expose no user-facing mode switch. The compatibility parameter remains in shared presentation functions for this slice while callers and tests migrate, but no real-route user action can set it to the more technical register. A later cleanup may rename or remove the parameter without changing this product rule.

### 7.3 Typography and density

- Body text and form controls remain at least 16 px on mobile.
- Supporting metadata may be 13–14 px when it is not an instruction, status, error, or control label.
- Primary page headings compute to 26 px on mobile.
- Section headings compute to 20 px on mobile.
- Touch targets remain at least 48 × 48 px.
- Use no more than two nested bordered surfaces in the default viewport.
- Reduce perceived size by removing repeated headings, borders, paragraphs, and utility rows rather than shrinking required reading text.

## 8. Home design

### 8.1 Visible choices

The home page presents three truthful routes:

1. **Review a challan or its photo** — primary action to `/review`.
2. **I only have an SMS or forwarded link** — action to `/review?goal=message`, where `message` is a non-sensitive navigation hint. It initializes the existing message-only safe-stop branch; it never parses, stores, or asks for message text. A citizen opening `/review` directly still explicitly chooses the message-only radio before reaching the same branch.
3. **Check a FASTag transaction** — action to `/fastag`.

The first viewport contains the heading, a one-sentence value statement, and all three choices. The product-wide footer is expected below the fold and is not part of the first-viewport budget.

### 8.2 Removed promises

Remove the present duplicates for `Understand the notice`, `Compare the photo`, `Find the next step`, `I already paid`, `My grievance was rejected`, and `My case moved to Virtual Court` until they lead to materially distinct end-to-end services.

Those situations can remain explained on the Safety page, but the home must not frame one generic review as multiple completed verticals.

### 8.3 No free-text router

This slice uses explicit intent choices, not a field asking citizens to describe their case. Free text invites sensitive identifiers and forwarded-message content, needs ambiguity and retention policies, and can be mistaken for AI or an official lookup. It requires a separate design before release.

## 9. Check phase

### 9.1 Stable layout

`Check` uses one stable panel. Source selection progressively reveals questions in the same surface. There is no source-to-evidence screen replacement and no unconditional `scrollIntoView`.

Only the currently unanswered branch question is expanded. Earlier answers compress into short, editable summary rows above it; activating a row reopens that question and clears any downstream answers that its change makes inactive. This keeps the user oriented without accumulating a multi-viewport form or pretending that each question is a new service step.

Compression never unmounts the active control. The chosen native input remains mounted with the same React key inside its compact summary row, alongside a 48 px `Change` action; unselected choices become hidden only after the selected input is stable in that row. Focus remains on the chosen control, the next question is inserted immediately after it, and a polite live-region message announces that question. The interface does not auto-focus or auto-scroll on each answer. At the supported mobile viewports, the next question's rectangle must intersect the visible viewport so keyboard and screen-reader users can reach it with the next normal navigation command.

The compact order is:

1. `Check this challan` heading and `1 of 2` progress label.
2. One registry-resolved official-record affordance: an anchor only while its route or independently current fallback passes the clocked registry check, otherwise the non-link recheck state.
3. Source-provenance fieldset.
4. The currently required evidence questions.
5. `Add a copy, state, or more details` disclosure.
6. One primary action.

The `Why this matters` disclosure is removed from the default critical path. A short source-specific hint may appear only when it changes what the citizen must do.

### 9.2 Source semantics

The three source choices are one `<fieldset>` with a visible `<legend>` and native radio inputs:

- `I opened the official service`;
- `I downloaded this from an official service`; and
- `I only have an SMS or forwarded link`.

No option is preselected when a citizen enters `/review` directly. The sole exception is `/review?goal=message`, reached by deliberately choosing the identically labelled message-only action on Home; that query-seeded choice initializes the message-only source directly in the Resolve safe stop. Selecting the same radio from an ordinary direct entry instead reveals the explicit safe-next-step action in Check. File selection never upgrades source provenance.

Both message/link-only origins end at the same conservative safe stop. Neither exposes the evidence comparison, produces a discrepancy finding, or treats a pasted/forwarded message as an official record.

### 9.3 Adaptive question plan

A new pure question planner derives which citizen-visible questions remain necessary from the current answers and the explicit set of questions the citizen has answered. It controls presentation only; `lib/public-challan.ts` remains the source of truth for findings.

The branch order mirrors the classifier's target precedence after the readable-record tightening in Section 13.7:

| Condition | Ask or resolve now | Questions that must remain unasked |
|---|---|---|
| No source | Ask source provenance | Every evidence and preparation question |
| Message/link only | Resolve as source not verified, with a safe official lookup | Every comparison question |
| Official source/download | Ask whether an independent vehicle record is present and readable | Every comparison and preparation question |
| Independent record missing, unclear, or not applicable | Resolve as insufficient review and name the comparison record that is missing | Every image comparison question |
| Readable independent record present, but plate question unanswered | Ask what the plate in the photo shown by the service or record looks like; choosing `I could not open or find the photo in that service or record` completes the insufficient-review branch | Jurisdiction, dates, role, device |
| Plate different | Resolve as a bounded inconsistency | Category, offence, timestamp, location, colour |
| Image inspected and plate unclear/not visible | Ask category because a material category difference can still outrank uncertainty | Offence, timestamp, location, colour |
| Plate match | Ask category | Offence, timestamp, location, colour |
| Category different | Resolve as a bounded inconsistency | Offence, timestamp, location, colour |
| Category unclear/not visible and no earlier difference | Resolve as image unclear | Offence, timestamp, location, colour |
| Plate and category match | Ask offence visibility | Timestamp, location, colour |
| Offence unclear/not visible/not assessable | Resolve as image unclear | Timestamp, location, colour |
| Offence appears visible | Ask timestamp | Location, colour |
| Timestamp unclear/not found | Resolve as image unclear | Location, colour |
| Timestamp displayed | Ask location | Colour |
| Location unclear/not found | Resolve as image unclear | Colour |
| Plate/category match, offence visible, timestamp/location displayed | Resolve as entries not supporting a mismatch | Colour and all preparation metadata |

Colour never appears in the decision path because it does not change the current top-level finding or official-handoff eligibility. It can be added later as optional context in Resolve, with copy that does not portray it as proof.

The readable-record fieldset uses exact comparison-oriented copy:

- Legend: `Can you read your vehicle's RC or another independent vehicle record now?`
- `Yes, it is open and readable` → `ownRecordAvailable: 'present'`
- `I have it, but cannot read it clearly` → `ownRecordAvailable: 'unclear'`
- `I do not have it` → `ownRecordAvailable: 'missing'`

`not-applicable` is not a visible option on this path. The subsequent plate legend is `Compared with that record, what does the plate in the photo shown by the service or record you opened look like?`; the category legend is `Compared with that record, what vehicle type does that photo show?` Every `match` or `different` label therefore names its comparison referent without implying that ChallanSakshi authenticated the photo.

The first evidence fieldset combines access and plate observation in one logical action:

- `The plate looks different` maps to `plateObservation: 'different'`;
- `The plate appears to match` maps to `plateObservation: 'match'`;
- `The plate is hidden or too unclear to compare` maps to `plateObservation: 'not-visible'`; and
- `I could not open or find the photo in that service or record` clears any photograph selection, leaves the conservative image defaults, and completes the branch with `imageInspected: false`.

These are one labelled native-radio group. The unavailable-photo choice prevents an extra “did you inspect it?” screen while remaining distinguishable from a skipped question through `answeredQuestionIds`.

Selecting or replacing a photograph never adds `plate` to `answeredQuestionIds`, never answers any visible-image question, and can never make the planner `result-ready` by itself. `hasSelectedPhotograph` may set the existing derived `imageInspected` value immediately, but the unanswered plate gate still blocks confirmation, result readiness, and every citizen-confirmed evidence claim.

Choosing `I could not open or find the photo in that service or record` is one atomic transition: revoke and clear any selected photograph, increment the photograph-selection version, reset plate/category/colour/offence/timestamp/location to conservative defaults, remove all corresponding downstream IDs including `vehicle-colour`, set the default plate value with `answeredQuestionIds.plate: true`, invalidate confirmations and dependent state, and produce the insufficient-review terminal plan. It cannot reveal the plate question again in a loop until the citizen explicitly reopens that answer to change it.

The planner returns data, not JSX, and must be deterministic for a given answer snapshot. It must expose why each question is required so the UI and tests cannot silently hide an outcome dependency again.

### 9.4 Skipped, cleared, and unclear are different states

A default value such as `unclear` does not, by itself, prove the citizen saw or answered a question. The orchestrator therefore keeps an explicit `answeredQuestionIds` set alongside `CitizenChallanAnswers` and includes that set in the current-answer freshness signature. An `unclear` value is described as citizen-confirmed uncertainty only when the corresponding ID is in that set; otherwise it is omitted presentation state.

When an upstream answer makes a downstream question inactive, the same state transition must:

1. remove the downstream question ID from `answeredQuestionIds`;
2. reset its backing answer to the conservative domain default;
3. rotate the result revision and invalidate current-answer confirmation;
4. invalidate any confirmed pack, export, receipt, return, or extension-preparation state; and
5. prevent the skipped field from appearing in the evidence view or generated summary.

The finding classifier still receives a complete `CitizenChallanAnswers` value. The adaptive answeredness metadata controls only what the citizen is said to have reviewed and confirmed.

### 9.5 Optional details

One disclosure, `Add a copy, state, or more details`, contains:

- issuing state or union territory;
- local-only challan copy/photo controls;
- last-four registration;
- alleged offence text;
- event date and displayed deadline; and
- notice-copy status.

Opening the disclosure must not change the assessment. Optional values may improve route specificity, missing-record guidance, or the later worksheet, but cannot be prerequisites that the interface labels optional while the headline result silently requires them.

The UI owns `type CitizenDeviceStatus = 'unknown' | 'private' | 'shared'` and defaults it to `unknown`. If the citizen requests a local file picker while it is unknown, the disclosure first asks `Is this your own/private device or a shared device?` with two native-radio choices. Private continues to local-only intake. Shared starts the existing inactivity guard, keeps Quick Exit visible, applies the existing export restrictions before any file is selected, and shows one contextual consequence beside intake: `Exit clears this review but cannot close a PDF or image preview opened in another tab; close that tab yourself.` An answer-only review does not ask this question during Check. In Resolve, it appears only at the first device-dependent action: before constructing or confirming an exact pack, activating a grievance destination, or requesting copy, print, or download. Merely reading the finding, using the current safe lookup, or opening a non-actionable missing-items checklist does not trigger it.

The lower-level handoff controller continues to accept only `private | shared`; it is created with conservative internal `shared` mode while the UI status is `unknown`. The UI must not construct an actionable pack view, request a copy/download effect, or map `unknown` to `private`. An explicit choice invalidates the controller, sets its actual mode, and rotates pack/effect revisions. A safe official lookup link can remain available because it neither receives local data nor requires a pack.

### 9.6 Current-answer confirmation

The primary-action slot has three mutually exclusive states:

1. While `plan.missing.length > 0`, render a validation-only `Continue` action. It shows no attestation or role choice. A failed activation leaves role `unselected`, both confirmation signatures empty, phase `check`, and every result, pack, and handoff state unactionable.
2. When a citizen selects message-only from a direct `/review` Check entry, render `Show me the safe next step`. It enters only the conservative Resolve safe stop, creates no evidence confirmation, selects no role, and cannot construct an actionable handoff. The query-seeded Home path already arrives in Resolve and does not render this extra action.
3. Only for a completed comparison or explicit missing-record/photo terminal state, show the branch attestation, role choice, and freshness-bound confirmation controls below.

Immediately above a state-3 confirmation action, one required branch-specific sentence carries the operative fact attestation rather than a generic disclaimer:

- comparison branch: `I checked every answer above against the readable vehicle record and the photo shown in the service or record I opened. Anything I could not see is marked unclear.`
- unavailable-record/photo branch: `I confirm which record or service/record photo I could not inspect; ChallanSakshi will not compare what is missing.`
- message-only safe stop: no evidence attestation is shown because no comparison is produced; it uses state 2 above.

The UI role status is `unselected | self | helper` and starts `unselected`; no action-ready view or confirmation is constructed from an unselected role. The common self-review primary button reads `I checked these answers — see my next step`. Its self-role meaning is explicit in the adjacent label `For my own challan`; a secondary text action, `I am helping someone who is here`, switches to the helper branch before any confirmation is recorded. Activating the self button:

1. validates the currently required visible questions;
2. derives one `nextState` containing role `self`, the `reviewFactsSignature` for that target role, the matching confirmed-facts signature, and phase `resolve`, then commits that transition atomically through one reducer or functional state update;
3. invalidates any prior pack, artifact, return state, or extension preparation;
4. records no external or persistent side effect; and
5. enters the Resolve phase.

The button activation is the explicit current-answer confirmation. It must never sign the memoized `unselected`-role signature and then change role in a second update. After one activation, `role === 'self'`, `confirmedFactsSignature === reviewFactsSignature`, and phase is `resolve`, without an intermediate actionable view for an unselected role. The user-facing copy must not call the JSON freshness binding a legal, electronic, or cryptographic signature. A separate self-review checkbox is removed without removing its fact-attestation meaning.

Any answer edit after confirmation must change the signature and invalidate every result-dependent artifact exactly as it does today. The button must never confirm and navigate to an external service in the same activation.

The helper branch remains in Check. First the helper activates `I checked these entries as the helper`, recording the current answer confirmation but not entering Resolve. Then the affected person must activate `I am here and confirm these final answers`, recording the separate helper confirmation bound to the same current signature; only then does Resolve appear. Changing any answer clears both confirmations.

Current-answer confirmation and official field-pack confirmation are separate gates. In advanced preparation, a present helper retains two further ordered pack confirmations: the affected person first confirms presence/review/entitlement, then separately requests and confirms the exact pack. Those actions are never collapsed into one helper button.

### 9.7 Validation and errors

- The validation-only `Continue` action remains operable while required information is missing; it does not hide all error explanation behind a disabled state or masquerade as confirmation.
- Missing required information is reported in a concise `role="alert"` summary and beside the first missing question.
- Failed validation cannot select a role, write either confirmation signature, change phase, or enable any handoff state.
- Focus moves to the first missing control. The app may use `scrollIntoView({ block: 'nearest' })` only when an off-screen validation error must be revealed, never on every phase change.
- Invalid optional dates or last-four values are validated only after they are supplied.
- An inconclusive answer is a valid completion state, not an error.

## 10. Resolve phase

### 10.1 First-viewport hierarchy

The first 812 px result viewport contains, in this order:

1. `Your next step` and `2 of 2`;
2. **What we found** — the bounded finding title;
3. **What it means** — one sentence naming the decisive confirmed fact or the missing evidence;
4. **What to do now** — one sentence;
5. the official-route affordance appropriate to the current safety state; and
6. the route's last-checked date or expired/fallback state.

The official affordance's lower edge must be at or above 780 px at a 375 × 812 viewport in both the English and Hindi mismatch paths. Copy and spacing compact to meet that budget; the affordance must not be buried behind generic policy copy.

Two official-route concepts remain distinct:

- A registry-validated, currently released official lookup or national-directory action is safe to expose before a pack exists. It helps the citizen independently find or re-open the record and is available on source-not-verified, insufficient, unclear, aligned, and mismatch results while a current route exists.
- A grievance or action-ready destination remains subject to the existing route, current-fact, role, and exact-pack confirmation policy. Before those gates pass, its visible affordance is disabled or replaced by a short `Prepare my checklist` next action that states what remains. It must not silently disappear when jurisdiction or projection state changes.

The first result viewport therefore never promises that a grievance is ready merely to satisfy a layout target. Confirming answers and opening any external destination are separate user actions.

### 10.2 Result language

Default mismatch example:

- **What we found:** `Possible vehicle mismatch`
- **What it means:** `You marked the readable plate in the photo as different from your RC.`
- **What to do now:** `Continue on the official e-Challan service with the record you checked.`
- Evidence basis: `Based on the answers you confirmed; the authority makes the decision.`

The evidence-basis line is finding provenance, not a second product-wide disclaimer. It appears once. Repeated phrases about authentication, legal advice, filing, and guarantees do not appear around the same result.

### 10.3 Advanced preparation

After the safe official lookup affordance, one clear action or disclosure, `Prepare my checklist`, reveals the deep vertical capabilities:

- exact evidence still missing;
- citizen-reviewed description;
- current pack confirmation;
- copy, print, and download;
- receipt and return-state recording;
- evidence history and technical details; and
- extension material only when its separate release state permits it.

Role is already explicit and confirmed before Resolve. Device status remains just-in-time:

- if a local file was selected, private/shared status was already collected before the picker;
- if no file was selected and device status is still `unknown`, ask once before the first exact-pack construction or confirmation, grievance activation, copy, print, or download action;
- `unknown` and `shared` keep export controls unavailable;
- choosing shared starts or retains the existing inactivity guard and keeps Quick Exit visible; and
- changing role or device invalidates any current pack and pending effect before another handoff/export action, but does not change the already computed evidence finding.

The current lookup/directory link may be used without generating or exporting a local pack. The action-ready grievance destination may not. No additional consent wall appears before a current registry-resolved lookup link.

### 10.4 Editing

`Edit my answers` returns to Check with values retained and reopens the decisive or last-confirmed question for the current branch. If the citizen then changes it, that control is visibly identified and every newly inactive downstream answer is cleared. Entering edit mode invalidates current-fact confirmation, pack, export, and return-derived state before the user can produce another artifact.

The viewport must preserve local context on an ordinary edit transition. Focus moves with `preventScroll: true`; there is no unconditional jump to the page or guide top. The only permitted viewport movement is the named nearest-scroll validation path when the first missing control is outside the viewport.

## 11. One product-wide boundary

### 11.1 Footer

Every real citizen route contains one product-wide boundary statement, inside `<footer>`, and no duplicate generic banner or card:

> Independent—not a government, bank, court or toll service. Files and answers stay on this device; nothing is uploaded, filed, paid, authenticated or submitted. No legal advice or guaranteed outcome. Never enter passwords, OTPs, Aadhaar, CAPTCHA or payment details.

That English sentence is normative for this slice and is 38 whitespace-separated words. It does not use the stale `non-public prototype` label. The Hindi version must be a faithful, native-language rendering reviewed against the same meanings before completion:

- independent/non-government;
- browser/device-local handling for answers and selected files;
- no filing, payment, authentication, or submission;
- no legal advice or outcome guarantee; and
- never enter credentials, challenges, identity numbers, or payment secrets.

The footer contains no repeated brand block or route directory. One `Safety & privacy` link to `/safety` follows the boundary in the same compact text flow and retains a 48 px hit area; `/safety` contains a visible link to `/privacy` for the complete data explanation. The boundary stays at or below 40 whitespace-separated English words, the Hindi version is reviewed for equivalent meaning rather than word count, and the complete footer height is no more than 256 px at both 320 and 375 px. Safety text remains at least 16 px; the height budget must not be met by shrinking it.

### 11.2 What is not a disclaimer

The following remain visible when they are operationally relevant:

- `This message does not verify a challan` on the message-only safe stop;
- `The photo is not clear enough` on an inconclusive result;
- `Choose a state for a more specific route` when the registry needs it;
- route freshness or fallback state;
- `Based on the answers you confirmed` beside the finding;
- shared-device export consequences at the export action; and
- a copied-date caveat beside a date the citizen supplies.

These messages explain state, evidence, or consequence. They must not expand into repeated generic legal or product-status prose.

Dedicated Privacy and Safety pages contain the complete explanation. Their purpose is reference, not repetition in the critical task.

The one-footer rule governs in-app generic boundary copy. A copied, printed, or downloaded evidence summary is a portable standalone artifact and retains one concise provenance/boundary sentence inside the artifact itself. That sentence is not rendered as another page disclaimer and must remain attached when the artifact leaves the page context.

## 12. Automation and truth boundary

### 12.1 Safe automation in this slice

- Default to manual entry when no file is selected.
- Reveal only questions that can still change or explain the safe result.
- Preserve the existing image-inspection derivation: a selected local photograph or an explicit non-default visible-image observation marks the supplied image as inspected. Current-answer confirmation binds only the questions actually answered; it does not authenticate the file or its origin.
- Recompute assessment, missing evidence, route, and question plan immediately after every answer.
- Preserve the last safe result while details are incomplete; never manufacture certainty.
- Resolve destinations only through `lib/official-destinations.ts`.
- For every auxiliary lookup request, use the requested route only when it is current at the supplied clock; otherwise use the national services directory only when that fallback is independently current at the same clock.
- When both requested route and fallback are stale, disabled, or expired, render a non-link `Official route needs rechecking` state with no stale `href`. Never expose an expired fallback URL merely because it is the fallback.
- While a current route anchor is mounted, compute its first invalid instant as `00:00:00.000Z` on the UTC calendar day after the inclusive `expiresAt` date. Use a bounded scheduler: wake after `min(millisecondsUntilFirstInvalidInstant, 24 hours)`, re-resolve, and reschedule until that boundary is reached. This avoids JavaScript's roughly 24.8-day maximum reliable timer delay and also catches registry-state changes before expiry. Re-resolve as well on `visibilitychange` when the document becomes visible and on window focus, replacing the anchor immediately with the current fallback or non-link recheck state when validity changed.
- Activation performs one final clocked re-resolution. The click guard supplements mounted-state removal of stale `href`; it is not the only freshness control, because context-menu, copy-link, drag, and native open behavior must never see an expired anchor.
- Resolve the auxiliary official lookup independently from action-ready grievance eligibility so a safe route never vanishes merely because a pack is not ready.

### 12.2 Facts that remain explicit

The app must not infer:

- source authenticity from file selection;
- RC readability or independence;
- a plate, vehicle class, offence, timestamp, or location without a citizen observation;
- private/shared device status at an export boundary;
- affected-person presence, entitlement, or pack approval;
- official submission, acknowledgement, payment, or decision state; or
- any password, OTP, CAPTCHA, Aadhaar/VID, payment credential, or government-session information.

### 12.3 Future extraction

OCR or vision-assisted prefill is a separate future design. If added, it must produce source-linked observations and confidence, ask the citizen to confirm uncertain fields, and remain unable to decide legal validity or the consequential case state.

## 13. Component and domain boundaries

### 13.1 New pure question planner

Create `lib/citizen-review-question-plan.ts` with this public interface:

```ts
export type CitizenReviewDecisionQuestionId =
  | 'source'
  | 'own-record'
  | 'plate'
  | 'vehicle-category'
  | 'offence-visibility'
  | 'timestamp'
  | 'location';

export type CitizenReviewInputId =
  | CitizenReviewDecisionQuestionId
  | 'vehicle-colour'
  | 'notice-copy'
  | 'custody-record';

export type CitizenReviewAnsweredQuestionIds = Readonly<
  Partial<Record<CitizenReviewInputId, true>>
>;

export type CitizenReviewQuestionReason =
  | 'establish-source'
  | 'establish-readable-comparison-record'
  | 'establish-first-image-signal'
  | 'category-can-override-plate-uncertainty'
  | 'aligned-image-requires-offence-check'
  | 'aligned-image-requires-timestamp-check'
  | 'aligned-image-requires-location-check';

export type CitizenReviewQuestionPlanInput = Readonly<{
  answers: CitizenChallanAnswers;
  answeredQuestionIds: CitizenReviewAnsweredQuestionIds;
  hasSelectedPhotograph: boolean;
}>;

export type CitizenReviewQuestionPlan = Readonly<{
  visible: readonly CitizenReviewDecisionQuestionId[];
  required: readonly CitizenReviewDecisionQuestionId[];
  missing: readonly CitizenReviewDecisionQuestionId[];
  completion: 'needs-answer' | 'result-ready';
  reasonByQuestion: Readonly<Partial<Record<CitizenReviewDecisionQuestionId, CitizenReviewQuestionReason>>>;
}>;

export type ReconciledCitizenReviewAdaptiveState = Readonly<{
  answers: CitizenChallanAnswers;
  answeredQuestionIds: CitizenReviewAnsweredQuestionIds;
  clearedInputIds: readonly CitizenReviewInputId[];
}>;

export function deriveCitizenReviewQuestionPlan(
  input: CitizenReviewQuestionPlanInput,
): CitizenReviewQuestionPlan;

export function reconcileCitizenReviewAdaptiveState(
  input: CitizenReviewQuestionPlanInput,
): ReconciledCitizenReviewAdaptiveState;
```

The implementation plan may split internal helpers, but this boundary and these constraints are fixed:

- pure and deterministic;
- no React, DOM, browser, route, or storage imports;
- wraps the existing answer shape and explicit answeredness rather than creating a second evidence model;
- never returns a finding; and
- table-tested independently from `assessCitizenChallanReview`.

`reconcileCitizenReviewAdaptiveState` resets newly inactive answers and reports what it cleared in one pure transition. It must converge after one call and return the input values unchanged when nothing is inactive.

`hasSelectedPhotograph` cannot satisfy `missing`, change `completion` to `result-ready`, or add an answered ID. Only an explicit question action can do those things.

### 13.2 Review orchestration

`CitizenReviewApp.tsx` remains the owner of answer state, signatures, assessment, route view, browser-local file URLs, and controller integration. It changes from a three-step renderer to a two-phase orchestrator.

`components/public-beta/TollSakshiApp.tsx` keeps its existing service stages, transition behavior, and domain behavior. This slice changes only its shared compact chrome/footer. Its internal no-jump redesign is not silently bundled into the e-Challan state-model change.

Extract focused presentational units when doing so shrinks and clarifies the 1,838-line component without duplicating state:

- `CitizenReviewCheck.tsx` — source, adaptive questions, optional-details disclosure, validation, primary confirmation action;
- `CitizenReviewResolution.tsx` — first-viewport finding and official action, edit action, advanced-preparation entry; and
- existing `OfficialHandoffPanel.tsx` — pure advanced pack/receipt/return presentation, reordered behind the preparation entry while the controller retains all lifecycle authority.

Presentational children receive values and callbacks. They do not own signatures, assessment, route selection, browser effects, or a second copy of any domain rule.

### 13.3 Product chrome

`CitizenChrome.tsx` owns the responsive menu and one footer boundary. It does not learn case state beyond the existing optional Quick Exit utility.

### 13.4 Home

`lib/citizen-home.ts` contains only truthful current intents and non-sensitive route hints. Its `CitizenGoal` union narrows to the sole route hint `message`; ordinary review uses `/review` without a goal and FASTag uses `/fastag`. Replace the current query-string parser with `parseCitizenGoalValue(value: unknown): 'message' | null`. It accepts only the exact scalar string `message`; arrays, repeated values, missing values, free text, and the former `verify`, `understand`, `evidence`, and `resolve` values return `null`, producing the ordinary review introduction for old bookmarks. The rendered home emits none of those former values. `CitizenHome.tsx` renders the three approved choices. Neither imports demo classifiers, raw official URL literals, or unreleased service metadata.

`app/review/page.tsx` is async and awaits the Next.js 16 `searchParams` promise. It passes the resulting `goal` value to `parseCitizenGoalValue` on the server, then passes `initialGoal: 'message' | null` into `CitizenReviewApp`. When that prop is `message`, the client's initial-state function atomically sets `sourceStatus: 'message-only'`, `answeredQuestionIds.source: true`, and phase `resolve`. The server output and first hydrated frame therefore show the conservative safe stop immediately; the generic source form and `Show me the safe next step` action must not flash first. Missing, repeated, array-valued, unknown, and former goal values initialize the ordinary unselected Check state. Selecting message-only from that direct-entry Check state does not mutate the URL; it stays in Check until the citizen activates `Show me the safe next step`.

### 13.5 Existing sources of truth

- `lib/public-challan.ts` — finding classification and evidence readiness;
- `lib/official-destinations.ts` — official route registry and freshness, including the new fail-closed auxiliary lookup resolution;
- `lib/guided-journey.ts` — two-phase progress and safe-stop announcements;
- `lib/evidence-intelligence.ts` — confirmed evidence view and local summary;
- `lib/citizen-review-handoff-controller.ts` — confirmed pack, copy, receipt, return, and extension-envelope state;
- `lib/official-handoff.ts` and `lib/export-safety.ts` — role completeness, pack validation, digest, and export prohibitions;
- `lib/citizen-review-presentation.ts` — bilingual finding and action copy; and
- `tests/public-mode-privacy.test.ts` — complete real-route import-graph boundary.

The existing three-stage `Step`, `ChallanGuidedStep`, and bilingual `Step 1/2/3` copy are replaced together. A visually two-phase interface must never retain three-stage screen-reader announcements or progress labels.

`lib/official-destinations.ts` exports one clocked auxiliary resolver used by the handoff controller and result surface:

```ts
export type CurrentOfficialAuxiliaryResolution =
  | Readonly<{ status: 'current'; route: OfficialAuxiliaryRoute; usedFallback: boolean }>
  | Readonly<{ status: 'unavailable'; reason: 'requested-and-fallback-not-current' }>;

export function resolveCurrentOfficialAuxiliaryRoute(
  key: OfficialAuxiliaryRoute['key'],
  nowIso: string,
): CurrentOfficialAuxiliaryResolution;

export function resolveCurrentOfficialAuxiliaryCandidate(
  input: Readonly<{
    requested: OfficialAuxiliaryRoute;
    fallback: OfficialAuxiliaryRoute;
    nowIso: string;
  }>,
): CurrentOfficialAuxiliaryResolution;
```

The public registry resolver selects the requested and national-directory records from committed registry data, then delegates to the pure candidate-level resolver. The candidate resolver validates release state and expiry of the requested route, then independently validates the supplied fallback. Literal tests use fabricated route records to cover requested-current, requested-stale/fallback-current, and both-stale states without mutating production constants or mocking away the logic being tested. The result UI and `buildCitizenReviewHandoffView` consume the public registry resolution; neither selects `OFFICIAL_AUXILIARY_ROUTES[...]` directly. `unavailable` contains no route object or URL.

The unused `OfficialHandoffPanel.reviewContext.safetyConsent` prop is deleted. `CitizenReviewApp` must not replace removed consent UI with hard-coded `true` acknowledgements. Actual source, answer, role, device, current-pack, and route gates remain explicit and authoritative.

### 13.6 Confirmed evidence view

`lib/evidence-intelligence.ts` currently serializes three sources, every image/record observation, conflicts, and fixed prose naming every field on every confirmed review. The adaptive design changes that contract: `CitizenEvidenceViewInput` and `CitizenEvidenceSummaryInput` receive `answeredQuestionIds` from the current confirmed fact state. There is no second name or separate `reviewedQuestionIds` collection.

Builders apply one fixed field-to-source/observation map:

- official-copy source only when the answered source is `official-service` or `downloaded-official-record`, or when a local official-record copy is selected; message-only provenance never creates an official-copy source;
- enforcement-image source only when a photograph is selected, or when `imageInspected === true` and at least one active image fact was answered; the unavailable-photo answer creates no enforcement-image source, observation, or conflict;
- citizen vehicle-record source only when `own-record` was answered;
- one observation only for each corresponding answered question;
- image observations additionally require `imageInspected === true`; and
- one conflict only when both referenced observations exist in the same view.

Choosing `I could not open or find the photo in that service or record` therefore yields missing-evidence guidance, not a fabricated plate observation. `vehicle-colour`, `notice-copy`, and `custody-record` exist in the ID union so optional values are never mistaken for confirmed defaults; they are never required by the adaptive decision planner in this slice.

Generated material-signal and missing-evidence prose includes only the active terminal branch and explicitly declared missing prerequisites. The fixed neutral request is replaced by prose derived from the included observations and missing items; it must not ask an authority to verify fields the citizen never reviewed. The portable summary retains its one provenance/boundary sentence.

This omission metadata is presentation and provenance state; it does not alter the complete answer object passed to `assessCitizenChallanReview`. The canonical confirmed fact state is the current `answers` plus fixed-order `answeredQuestionIds` while `confirmedFactsSignature === reviewFactsSignature`; builders receive those current values only under that equality and store no duplicate mutable snapshot.

### 13.7 Deliberate readable-record precondition

`assessCitizenChallanReview` keeps its existing finding union and action-ready definitions but tightens precedence for citizen-declared official-source reviews. Immediately after the source gate, `ownRecordAvailable !== 'present'` returns `insufficient-review`, `canPrepareWorksheet: false`, and names the readable independent vehicle record as missing. When the photo shown in that service or record is also uninspected, the same result lists both missing prerequisites.

Only after the record is present does the classifier evaluate image inspection, plate/category difference, uncertainty, or full alignment. This prevents the product from saying a plate or category “matches the RC” when no readable comparison record was available. The change is conservative: it can turn a formerly aligned or unclear result into insufficient review, but can never create a discrepancy, worksheet, pack, or grievance eligibility.

`deriveImageInspected` otherwise retains its current contract. The classifier remains the only owner of the finding; the planner mirrors this new precedence and is cross-tested against it.

### 13.8 Supported handoff depth

The lower-level domain can represent several action-ready signals, but the current controller/UI exposes an eligible official field pack only for a readable plate conflict bound to an independent readable record and the current revision. This slice does not promise category-only, wrong-evidence, vehicle-number-entry, or duplicate-plate field packs.

A category-only discrepancy can produce the existing bounded inconsistency finding and local worksheet when its current minimum facts are present. Its grievance affordance remains visibly gated with a concise reason until a separate design adds provenance-bearing class capture and aligns projection with pack-builder source constraints.

## 14. State and invalidation

The review phase is `check | resolve`. Phase alone never authorises an artifact.

The refactor names three different freshness domains instead of using one oversized signature:

1. `reviewFactsSignature` is a canonical serialization of review role; intake mode; derived `imageInspected`; only the answer fields whose IDs are present; any non-undefined provenance-bearing action fact; and `{ present, version }` pairs for local record and photo selection. It contains no filenames, bytes, object URLs, full identifiers, or message text.
2. `artifactInputSignature` contains `reviewFactsSignature`, language, jurisdiction, registration last-four, alleged-offence free text, displayed event date, displayed official deadline, device status, and a canonical route-resolution token. That token contains the committed registry version, requested key, resolution status, resolved key when current, expiry when current, and `usedFallback`; it never contains the continuously changing wall-clock value. The token is recomputed from a clocked resolver immediately before pack construction or confirmation and before every artifact-producing effect: copy, print, download, receipt download, or any other exported representation. It is also recomputed before route and return effects. It invalidates copied, printed, downloaded, or otherwise exported output when presentation, preparation, or route validity changes.
3. The handoff controller's existing guard signature remains authoritative for route, role, device, permissions, revisions, pack digest, pending effects, receipt, and return state.

`CITIZEN_REVIEW_DECISION_QUESTION_ORDER` and the superset `CITIZEN_REVIEW_INPUT_ORDER` are exported as fixed readonly tuples. The first drives planner rendering/validation; the second serializes `answeredQuestionIds`, including optional evidence-availability inputs. Object insertion order is never treated as authority. Each local selection owns an in-memory integer version starting at zero. Every select, replace, and remove event increments that version and synchronously clears confirmation/rotates result and pack revisions, even when file presence remains `true`. The version is never displayed or exported.

The authoritative current-fact confirmation condition is:

```text
confirmedFactsSignature is non-empty
AND confirmedFactsSignature equals reviewFactsSignature
AND, for a helper, helperConfirmedSignature equals reviewFactsSignature
```

The UI describes this only as freshness-bound confirmation, never as a legal or cryptographic signature. Evidence builders receive the current answers and `answeredQuestionIds` only while this equality holds; no second mutable copy of the confirmed facts is stored.

The following changes invalidate current-fact confirmation and every dependent state before another action can complete:

- any evidence answer;
- source status;
- intake mode;
- every record/photo select, replace, or remove event;
- review role; and
- returning from Resolve to edit.

`vehicle-colour`, `notice-copy`, and `custody-record` are optional evidence facts: when answered, they are included in `reviewFactsSignature`, described as citizen-confirmed, and any edit invalidates current-fact confirmation. Jurisdiction, registration last-four, alleged-offence free text, displayed event date, displayed official deadline, language, device status, and official-route freshness are artifact/preparation context; they do not change the confirmed finding. They invalidate `artifactInputSignature`, the current pack, and every pending copy, print, download, receipt-download, exported-representation, route, or return effect before another such action can complete. This separation prevents a just-in-time device question or route choice from forcing the citizen to re-confirm unrelated evidence while preserving exact-pack safety.

Every artifact-producing path, including synchronous print and asynchronous copy, download, and receipt download, retains an operation token plus the current `artifactInputSignature` and controller guard as applicable. Every already-rendered or pending external action re-resolves its route against the current clock immediately before activation; a now-stale route cancels the effect, rotates dependent state, and renders the non-link recheck or gated state. No presentation refactor may relax these guards.

## 15. Accessibility and focus

- Source choices use native radio semantics and a visible legend.
- Conditional questions are inserted after the controlling answer in DOM order.
- A polite live region announces the newly available question group or result without reading the whole page.
- Compacting an answered fieldset preserves the selected native input and its focus; it never removes `document.activeElement` from the DOM.
- The result heading receives programmatic focus with `preventScroll: true`.
- On the common zero-scroll confirmation path, the focused result heading must also intersect the visible viewport; invisible programmatic focus does not satisfy this contract.
- Phase changes do not call `scrollIntoView`.
- Validation may reveal only the nearest missing control.
- The menu supports keyboard open/close, Escape, focus return, and visible focus indicators.
- Disclosure summaries are descriptive and at least 48 px tall.
- No positive `tabIndex` is introduced.
- English and Hindi retain logical reading order at 320, 375, and 390 px and at 200% zoom.
- Reduced motion removes nonessential transitions; correctness never depends on animation.

## 16. Performance and rendering

- No new runtime dependency is required for this slice.
- No animation library, client-side router, form package, or state-management package is added.
- Conditional content uses existing React state and CSS.
- Demo modules remain outside the real-route import graph.
- The initial home and review routes remain server-rendered with meaningful text before hydration.
- No citizen data is cached, persisted, or added to a URL.

## 17. Testing strategy

Implementation follows test-driven development. Each behavior begins with a focused failing test that fails for the intended missing behavior.

### 17.1 Pure-domain tests

Add `tests/citizen-review-question-plan.test.ts` with literal table expectations for:

- no source;
- message-only safe stop;
- official source requiring readable-record status before any comparison;
- unreadable/missing RC ending in insufficient review without asking image questions;
- readable RC then no answered image question;
- readable RC plus plate difference completing a bounded inconsistency;
- plate match requiring category;
- plate/category match requiring remaining alignment evidence;
- inconclusive plate/category branch;
- category mismatch after a readable record producing a bounded finding but a non-action-ready grievance explanation;
- answered `unclear` remaining distinct from skipped/default `unclear`; and
- optional metadata never appearing as a hidden headline-result prerequisite.

Add reconciliation cases proving that an upstream edit clears every newly inactive answer and answered-question ID, that one call converges, and that unchanged active state retains referentially safe values. Cross-check the planner's terminal branches against `assessCitizenChallanReview` table fixtures so presentation precedence cannot drift from the domain.

Mutating any branch predicate must fail at least one case.

### 17.2 Component contracts

Update or replace brittle source-text assertions with rendered behavior where practical. Cover:

- one labelled source fieldset and three radios;
- no default source choice;
- conditional question order;
- one self-review confirmation action rather than checkbox plus button;
- message-only never mounting evidence comparison;
- optional details remaining available and non-blocking;
- one product-wide footer boundary;
- concise result hierarchy before advanced controls;
- edit invalidation; and
- English/Hindi parity for every new string.

Update the architecture-defining suites together rather than weakening them one by one:

- `tests/public-challan.test.ts`;
- `tests/citizen-review-contracts.test.ts`;
- `tests/guided-journey.test.ts`;
- `tests/evidence-intelligence.test.ts`;
- `tests/official-destinations.test.ts`;
- `tests/citizen-review-handoff-controller.test.ts`;
- `tests/official-handoff-contracts.test.ts`;
- `tests/official-handoff.test.ts`;
- `tests/official-handoff-receipt.test.ts`;
- `tests/citizen-chrome-contracts.test.ts`;
- `tests/citizen-home.test.ts`;
- `tests/toll-route-links.test.ts`; and
- `tests/public-mode-privacy.test.ts`.

Existing source assertions that require unconditional `scrollIntoView` on `/review` are intentionally superseded. Replace them with a ban on normal-transition calls plus rendered behavior coverage; retain a targeted nearest-scroll allowance for explicit validation errors. FASTag transition assertions remain unchanged in this slice.

The focused suites include explicit regressions for every safety-sensitive transition:

- selecting or replacing a photograph without answering the plate field leaves the plan `needs-answer` and prevents confirmation/result entry;
- choosing the unavailable-photo option clears the selected file, every image answer, and every corresponding answered ID including `vehicle-colour`, and creates no enforcement-image source, observation, or conflict;
- replacing file A with file B increments the local selection version and invalidates current facts, artifacts, pack, receipt, return, pending copy/download/receipt effects, and any pending print even though selection presence stays true;
- an unselected review role cannot create an actionable handoff view or current-fact confirmation;
- one self-button activation atomically yields role `self`, equal confirmed/current fact signatures, and Resolve, without signing the pre-transition `unselected` state;
- direct-entry validation without a source produces the concise alert while leaving role `unselected`, confirmation signatures empty, phase `check`, and every handoff state unactionable;
- helper mode requires its two ordered pre-result confirmations and clears both after any evidence edit;
- `deviceStatus: 'unknown'` blocks file-picker continuation, exact-pack construction/confirmation, grievance activation, and every export effect until explicit choice; a no-file answer-only path receives this question at its first pack-dependent action, while `shared` permits guarded local preview but blocks copy, print, and download;
- `/review?goal=message` server output and first hydrated frame both contain the message safe stop, phase `resolve`, `sourceStatus: 'message-only'`, and source answeredness, with no generic-source-form or extra safe-next-step-action flash;
- selecting the message-only radio from direct `/review` leaves phase `check` and shows `Show me the safe next step`; only that second action enters the conservative Resolve state, without selecting a role or creating a confirmation signature;
- missing, repeated, array-valued, free-text, unknown, and former goal values remain the unselected ordinary review state;
- evidence-view tests filter sources, observations, conflicts, material/missing prose, and the derived neutral request to exactly the answered active fields; message-only creates neither an official-copy source nor an evidence view; and
- `safetyConsent` is absent from `OfficialHandoffPanel` props and no removed acknowledgement is replaced with hard-coded truth.

### 17.3 Privacy and route contracts

- Add `app/page.tsx` to the real-mode import-graph audit and fail the test if the home imports demo, model, network, storage, or raw-official-URL authority.
- Keep `/review` and compatibility aliases free of network, persistent storage, forms, raw filenames, case-data URLs, and prohibited credential inputs.
- Assert that home intents contain only internal routes and the allowed non-sensitive goal keys, including exactly one `message` hint that cannot carry free text.
- Preserve target/rel requirements and registry-only official destinations.
- With fixed clocks inside the registry window and at `2026-10-03T00:00:00.000Z` (the first UTC calendar day after the inclusive `2026-10-02` expiry), prove that a current auxiliary route renders an external anchor and an expired requested route plus expired fallback produces no `href`. Candidate-level tests use fabricated requested/fallback records to prove that a stale requested route can use only an independently current fallback; the current committed registry intentionally cannot create that mixed-freshness state because its records share verification metadata.

### 17.4 Rendered browser lane

Create a root application browser lane; do not reuse the frozen extension harness. Add `playwright.config.ts`, `tests/browser/mobile-acceptance.spec.ts`, and package script `test:browser:web`. The root config owns a web server at `http://127.0.0.1:4177` and never imports extension configuration. Use stable product hooks only where geometry is contractual:

- `data-mobile-header`;
- `data-required-action`;
- `data-result-finding`;
- `data-official-lookup`;
- `data-grievance-affordance`; and
- `data-product-boundary`.

`data-required-action` is not an opt-in escape hatch. It is required on the hit-area element for Menu; Exit when present; every visible source, readable-record, plate, category, offence, timestamp, and location option label; every compact-row `Change` action; the current confirmation action; helper confirmations; `Edit my answers`; `Prepare my checklist`; every visible safe-lookup and grievance/preparation affordance; every menu action; and the footer safety link. Each browser fixture asserts the expected accessible-name set and count before measuring every tagged element, so deleting a hook or leaving a required control untagged fails the test.

Across explicit 320 × 844, 375 × 812, and 390 × 844 viewport projects or parameterized states, assert:

- header height ≤72 px at 320, 375, and 390 px in English/Hindi and every route utility state in scope;
- home heading and all three truthful choices appear in the first viewport;
- direct `/review` entry in English and Hindi shows the complete source fieldset and the operable validation-only `Continue` action fully inside the first viewport; activating it without a source exercises the concise validation path and leaves role, signatures, phase, and handoff authority unchanged;
- on the terminal plate-mismatch Check state, the compact source, plate, and readable-record summary rows plus the primary action all appear in the first viewport;
- a common successful transition beginning at `scrollY === 0` remains within 8 CSS px of that position after React settles;
- a scrolled normal transition does not programmatically relocate the viewport, while the named validation-error test may reveal only the nearest missing control;
- result heading is focused;
- after each keyboard radio choice, the selected input remains `document.activeElement`, stays connected to the DOM, and the next question intersects the viewport;
- after confirmation, the result heading is `document.activeElement` and its rectangle intersects the viewport;
- the result-finding rectangle, active safe lookup, and separately gated grievance/preparation affordance are all fully inside the first viewport in the mismatch-before-pack fixture;
- the current lookup is an anchor only while its clocked resolution is current; before current-fact, role, route, device, and exact-pack gates pass, the grievance affordance is visible but has no external `href`; after the independent pack gates pass, only a still-current grievance destination becomes an anchor;
- after auxiliary expiry, the lookup is a non-link recheck state with no stale `href`;
- a route mounted shortly before its first invalid instant uses the bounded scheduler; advancing the browser clock across `00:00:00.000Z` on the UTC day after its inclusive expiry date without reload replaces its anchor with the current fallback or non-link recheck state before any interaction;
- the lower edge of the last required result affordance is ≤780 px in both English and Hindi mismatch paths at 375 × 812;
- footer height ≤256 px at both 320 and 375 px, with safety copy computed at ≥16 px;
- exactly one product-boundary paragraph exists and the English boundary contains no more than 40 whitespace-separated words;
- no horizontal overflow at 320, 375, or 390 px in every supported language, with Menu both closed and open;
- every tagged required target has a computed box of at least 48 × 48 px;
- every curated decision-critical label, instruction, status, and control has computed font size ≥16 px; only explicitly tagged nonessential metadata may be 13–14 px;
- each primary page heading computes to exactly 26 px and each section heading computes to exactly 20 px at all three mobile widths;
- menu links are reachable, Escape closes, and focus returns;
- no framework overlay or application console error; and
- no intermediate blank state after confirmation.

The browser state matrix covers home in English and Hindi; direct-entry `/review` in English and Hindi; query-seeded message-only immediate safe stop; direct-entry message selection followed by its safe-next-step action; terminal Check states; ordinary mismatch with both active lookup and gated grievance; inconclusive/aligned result; and `/fastag` shared header/footer in its English-only mode. The FASTag fixture opens Menu and asserts that the one English-only availability message appears there exactly once, no EN/HI switch is present, Menu is keyboard reachable, Escape returns focus to its trigger, the collapsed header remains within 72 px, and the message is absent from the page body and footer.

For deterministic route-expiry coverage, the browser route subset runs in two explicit server-clock invocations: one beginning shortly before `2026-10-03T00:00:00.000Z`, the first invalid instant after the inclusive `2026-10-02` expiry date, and one at that invalid instant. A server-only acceptance-clock adapter reads `CHALLANSAKSHI_ACCEPTANCE_NOW_ISO` only while an explicit browser-acceptance environment flag is enabled, validates it as an ISO instant, and passes `initialNowIso` through server render for the initial route resolution. Playwright installs its browser clock at that same instant before navigation, so server output and the first hydrated frame agree; the mounted freshness controller then reads the live clock provider, runs the bounded wake/re-resolution scheduler, and revalidates on visibility/focus. The pre-expiry fixture advances that Playwright clock across the boundary and observes the anchor disappear without reload. Production builds with the acceptance flag absent always use the real server/browser clocks; no query parameter, local storage, application browser global, or citizen-controlled value can set them. Contract tests prove the acceptance override is unreachable when its flag is absent.

The lane records numeric offsets and heights. Screenshot inspection supplements those assertions but is not the only evidence. Every browser fixture, screenshot, trace, clipboard stub, and selected-file fixture uses fabricated or fully redacted data; real challans, files, identifiers, messages, and clipboard contents are prohibited.

### 17.5 Interaction budgets

Browser tests count logical citizen actions from `/review`:

| Path | Maximum logical actions before result |
|---|---:|
| Message/link safe stop | 2 |
| Readable-RC plate mismatch | 4 |
| Basic inconclusive result | 5 |
| Fully aligned evidence result | 8 |

Opening native selects may require an additional physical tap on mobile; the logical budget counts choosing a value once. Preparing/exporting an advanced pack is measured separately.

The home `I only have an SMS or forwarded link` action reaches the safe stop in that single deliberate home action because the route choice itself is the source statement. The two-action budget applies when entering `/review` directly: choose message-only, then choose the safe next-step action.

## 18. Manual verification

Before completion, manually walk the current local build in the in-app browser:

- 320 × 844, 375 × 812, desktop, and 200% zoom;
- English and Hindi;
- light and dark themes;
- keyboard-only source selection, conditional questions, menu, confirmation, edit, and disclosures;
- message-only, mismatch, inconclusive, aligned, missing-RC, category-only, and stale-route cases;
- private, shared, self, and present-helper preparation boundaries;
- confirmation invalidation after editing;
- copy/download restrictions and Quick Exit; and
- console and framework-overlay health.

A real Android-phone check remains human-only and is required before recording or public-release claims.

## 19. Implementation sequence after this design is approved

1. Write the detailed implementation plan with small TDD tasks and exact commands.
2. Tighten the readable-record classifier precedence in `lib/public-challan.ts` with regression tests proving it only removes certainty/readiness.
3. Land the pure adaptive question planner and its table tests, mirroring the tightened classifier.
4. Simplify the home truthfully and bring it into the privacy audit.
5. Compact the product chrome and implement the mobile menu.
6. Extract and render the Check phase without changing any finding rule beyond the approved readable-record tightening.
7. Replace checkbox-plus-button confirmation with the freshness-bound, attestation-preserving primary action.
8. Render the first-viewport Resolve phase and place advanced preparation behind its explicit entry.
9. Consolidate the footer boundary and contextual state copy.
10. Add the numeric mobile/browser lane.
11. Run the focused and full gates, then perform the complete browser walkthrough.
12. Only after the UX slice is green, update judged artifacts and design the reusable service engine.

Each logical task receives its own commit. `wrangler.jsonc` remains deliberately dirty and uncommitted. The protected owner QA directory is never inspected, listed, searched, staged, modified, moved, or deleted.

## 20. Cut rules

If schedule pressure requires cuts, cut in this order:

1. nonessential desktop visual polish;
2. optional animation between Check and Resolve;
3. extraction of presentational child components when the same behavior can remain readable in `CitizenReviewApp.tsx`;
4. footer navigation refinement beyond the one-boundary and height requirements.

Never cut:

- truthful home routing;
- source radio semantics;
- no-jump behavior;
- adaptive visibility of every outcome-driving question;
- signature invalidation;
- first-viewport result and official action;
- message-only safe stop;
- one product-wide footer boundary;
- privacy, official-route, shared-device, bilingual, and credential contracts; or
- fresh automated and rendered verification.

## 21. Definition of done

The subproject is complete only when:

- the home exposes only the three truthful current journeys;
- `/review` behaves as a stable two-phase Check → Resolve workspace;
- no outcome-driving field is hidden as optional;
- the common mismatch result needs no more than four logical actions from `/review`;
- the source question and primary action fit in the first Check viewport;
- the finding and official action fit in the first result viewport;
- phase changes do not force a page-top or guide-top scroll;
- the mobile header and footer meet their numeric height budgets;
- one global boundary appears in the footer and generic disclaimer repetition is absent from the critical path;
- finding-specific evidence limitations remain accurate and concise;
- every existing deterministic, privacy, route, signature, safe-stop, shared-device, export, return, Hindi, and accessibility invariant remains enforced;
- focused tests, full tests, TypeScript, lint, production build, and diff checks pass freshly;
- the current-run browser matrix passes with inspected screenshots and clean console evidence; and
- no completion statement implies deployment, government integration, public launch, or guaranteed contest success.
