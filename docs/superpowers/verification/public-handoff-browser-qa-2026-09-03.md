# Public handoff browser and visual QA — 2026-09-03

Status: partial browser evidence; release gate blocked. This report records a manually exercised core lane, judge proof, visual-fidelity comparison, automated contract evidence, and a stable post-Task1 production re-smoke. It does not claim completion of the full Task 7 browser matrix, deployment, public-launch readiness, public operational approval, government integration, legal approval, native 200% zoom coverage, or loaded-extension fixture execution.

## Evidence boundary

- Production Vinext origin: `http://127.0.0.1:4177`.
- `/review` hydrated in both the in-app browser and connected Chrome before the retained interactions below.
- The exercised product data was local test input. No real citizen data, identifier, CAPTCHA, OTP, payment value, credential, portal input, attachment, declaration, or submission was used.
- No HAR, request log, cookie, browser-history export, tokenized URL, portal value, or external-route form state was retained.
- Local product screenshots were visually inspected during the browser and reference-comparison work. No screenshot was retained from that local-product lane; the route report separately retains seven sanitized external landing-state screenshots.
- No console warning or error was observed on the exercised in-app-browser pages.
- External-route observations remain separately bounded by the [non-submitting official-route reverification report](official-route-reverification-2026-09-03.md).

## Evidence classification

- Manually exercised core lane, judge proof, and visual fidelity: **PASS for the recorded local runs only.** This covers only the interactions and viewports named below.
- Automated contract evidence: **PASS for the recorded test run only.** Static, server-rendered, reducer, controller, and source-contract tests cover additional states, but they are not hydrated-browser observations.
- Unperformed manual and separate-harness release gates: **BLOCKED.** The complete required browser matrix was not run, so this report is not an overall browser-QA pass or a public-launch readiness decision.

## Stable post-Task1 production re-smoke

After Extension Task 1 completed at `d521ed8`, a fresh production build was served at `http://127.0.0.1:4177` and re-smoked in a fresh connected-Chrome tab at 1440×900:

- On `/review`, self/private plus both acknowledgements transitioned to Step 2. Focus moved to the exact heading `Open the official record, then add its facts or a supplied record.` The page reported `clientWidth=1425` and `scrollWidth=1425`; the console warning/error log was empty.
- On a fresh 390×844 `/demo/test-lab`, Start reported `top=740.84375`, `bottom=788.84375`, `height=48`, and `fullyVisible=true`. The suite began at `top=977.859375` and remained below the judge entry. The page reported `clientWidth=375` and `scrollWidth=375`; logs were empty.
- On `/extension`, the exact production-disabled status remained visible. Only the EN/HI buttons were available; no installation or preparation action appeared, and logs were empty.
- The production server was stopped cleanly. The Chrome viewport was reset and the temporary tab was closed.

## Manually exercised self/private installation-free core path

The in-app browser exercised this sequence end to end:

1. Selected `This is my case` and `Private device`.
2. Confirmed Karnataka (`KA`), which resolved through the checked-in registry to the NextGen destination.
3. Selected an official-service source and manually recorded the structured facts.
4. Confirmed a readable official record, readable supplied image, and a readable-plate conflict. The deterministic result became an eligible possible discrepancy with the reviewed description and destination-specific checklist.
5. Completed all four separate confirmation controls. The native official-service anchor appeared only after those confirmations; it was absent beforehand.
6. Used the description copy action. The live result was `Reviewed description copied. Nothing opened or was submitted.` No official tab was opened by the copy action.
7. Explicitly activated the native official anchor. Only then did the local app reveal the citizen-return panel; activation recorded only that the link was used, not that the destination loaded or received a submission.
8. Chose `I did not submit`. The app created a citizen-reported, unverified local continuation receipt and exposed the redacted-receipt action.
9. Edited the reviewed description. Invalidation was synchronous: `officialLink:0, receipt:0, checkedConfirm:false`. The official link and receipt disappeared and the pack confirmation cleared.
10. Used Quick Exit. The app returned to the blank goal chooser.

This lane verified the named self/private web path without an extension. It did not enter, fill, or submit anything on an external official service and does not stand in for the unperformed scenario matrix listed below.

## Partial Hindi, Simple Mode, shared-device, and present-helper smoke

The combined Hindi, Simple Mode, shared-device, and `I am helping someone present` first step rendered decision-critical copy in Hindi. It showed the required present-person confirmation and the 10-minute inactivity warning. Continuing moved focus to the Step 2 heading. This was a first-step smoke only, not the complete shared-device, private-device, and present-helper browser matrix and not an observed 10-minute inactivity transition.

Shared-device suppression of app copy and download controls remains backed by the automated privacy, presentation, and controller tests. This browser lane does not upgrade that automated evidence into a claim about browser-native screenshots, selection, clipboard history, downloads, or backups, which remain outside the app's control. A helper may record a return only as `Affected-person-reported; entered with a present helper` while the affected person is present and personally confirms it.

## Responsive geometry and keyboard focus

The in-app browser reported:

- 390×844: `clientWidth=375`, `scrollWidth=375`, `bodyScrollWidth=375`; no horizontal page overflow.
- 320×844: `clientWidth=305`, `scrollWidth=305`, `bodyScrollWidth=305`; no horizontal page overflow.

Connected Chrome keyboard-only traversal reached, in order, home, the primary navigation links, Simple Mode, Quick Exit, EN/HI, disclosures, reviewer and device buttons, confirmation checkboxes, the demo link, and the primary Continue action. Focus remained visible. The focused Continue control reported `3px solid rgb(7, 86, 80)`.

## Zoom limitation

The supported browser-control surface could not programmatically change native browser zoom to 200%. Actual native 200% zoom remains an honest manual release check; it was not passed by this automation lane and is not recorded as a web-code defect.

As a bounded reflow observation—not a substitute for native zoom—connected Chrome used a 600px CSS viewport, half of its 1200px desktop CSS viewport, and reported `clientWidth=585`, `scrollWidth=585`, `bodyScrollWidth=585` with no horizontal overflow. Static 200% source contracts and the complete automated suite remain green.

## Closed optional desktop helper

`/extension` rendered only the checked-in production-disabled disclosure. It exposed no installation or preparation action. This confirms the closed web presentation only; it does not approve a Chrome Web Store release or a real Legacy/NextGen adapter.

## Timed synthetic judge proof

- `/demo` exposed the exact `Start the 90-second proof` primary action.
- At 390×844 on `/demo/test-lab`, the Start control had `top=740.84375`, `bottom=788.84375`, and `height=48`; it was fully visible. The page reported `clientWidth=375` and `scrollWidth=375`.
- The six-beat core first showed the deterministic discrepancy, then separate pack confirmation, simulated route opening, simulated return, correction, reconfirmation, and post-correction `Appears consistent` in `69.633s`, including browser-control overhead.
- At `83.959s`, the guardrail continuation showed TL-05 `Inconclusive` with no pack and then TL-01 `Appears consistent` with no pack.
- Only after those guardrails did the optional extension simulation appear. Its untouched-field boundary explicitly retained CAPTCHA, OTP, Aadhaar, credentials, payment, attachment, declaration, and Submit.
- The proof retained its permanent synthetic boundary and made no government request.

The timing is evidence for this observed local run, not a universal performance guarantee.

## Synthetic fixture browser limitation

Both the in-app and connected Chrome browser-control clients returned `ERR_BLOCKED_BY_CLIENT` when directly navigating to `/demo/extension-fixture/source`, likely because of the automation extension's own URL filtering. This lane therefore does not prove fixture browser execution. The server-rendered and static fixture contracts remain green; the later separately loaded extension-package harness owns isolated-world, action-icon, source/destination, event, and zero-network browser proof.

## Accepted-design fidelity

The live desktop homepage, 390px mobile homepage, 390px Hindi shared intake, and desktop flow were visually compared with all three accepted references:

- `docs/superpowers/specs/assets/challansakshi-citizen-home-desktop.png`
- `docs/superpowers/specs/assets/challansakshi-mobile-home-and-intake.png`
- `docs/superpowers/specs/assets/challansakshi-official-record-intake-desktop.png`

The warm parchment, deep navy, teal, and amber palette remained consistent. Serif hierarchy, the open card/container model, clear primary actions, responsive touch spacing, the 48px proof action, 390/320 wrapping without page overflow, visible teal keyboard focus, and next-state heading focus were retained. The current product intentionally uses a lighter, less diagram-heavy citizen homepage and an explicit non-government banner. Those intentional changes produced no material visual mismatch requiring a code change.

## Unperformed manual and separate-harness release gates

Unperformed manual and separate-harness release gates: **BLOCKED.** The following required lanes remain unperformed in a hydrated browser or their designated loaded-extension harness:

- Native browser zoom at 200%. The 600px CSS-viewport observation is only a reflow proxy.
- Loaded-extension fixture execution, including physical action-icon, `activeTab`, isolated-world, source/destination fixture, event, storage, lifecycle, and zero-network evidence.
- Complete shared-device, private-device, and present-helper browser matrix. Only the self/private core lane and a combined Hindi/Simple/shared/present-helper first-step smoke were observed.
- Shared-device 10-minute inactivity transition. Only the warning was rendered; the timed transition was not observed.
- Message-only result.
- Unresolved-jurisdiction fallback.
- Portal-unavailable fallback.
- Clipboard-denial handling. Clipboard success was observed; rejection was not.
- Every citizen-return state. Only `I did not submit` was exercised.
- Continuation-receipt download and redaction. The redacted-receipt action appeared, but its downloaded artifact was not exercised or inspected.
- Reduced-motion behavior in a hydrated browser.
- Hydrated-browser live-region announcements. Heading focus was observed, but announcement behavior was not independently exercised with browser accessibility instrumentation.

Automated contracts cover expected behavior for several of these states, but that evidence does not convert an unperformed hydrated-browser lane into a manual pass. All external operational, privacy, security, legal, accessibility, official-route ownership, incident, monitoring, rollback, Store, portal-authorisation, adapter, and publishing gates also remain separate and blocked. See the [release-gate amendment](public-handoff-release-gate-amendment-2026-09-03.md) for the closure ruling.
