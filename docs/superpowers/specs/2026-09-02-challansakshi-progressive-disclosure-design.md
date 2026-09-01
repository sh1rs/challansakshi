# ChallanSakshi Progressive-Disclosure Design

## Intent

Make every citizen journey feel calm and action-first without weakening the evidence, privacy, deadline, accessibility, or non-legal boundaries that make ChallanSakshi trustworthy.

## Canonical hierarchy

Every citizen step uses the same visible order:

1. Compact step label and progress.
2. One short current action.
3. One live status line.
4. The controls needed now.
5. One primary action.
6. Supporting rationale and technical detail only through specifically named native disclosures.

The real white/navy/teal citizen interface remains the canonical design for `/`, `/review`, `/fastag`, and `/demo`.

## Shared guided header

The guided header must keep the focusable instruction heading, progress calculation, visible `role="status"` live region, safe-stop state, and accessible current/completed/upcoming semantics.

The default view shows only:

- `Step N of M · <short label>`
- progress bar and percentage on desktop
- one short instruction
- one visible status

`Why this matters`, the next-step explanation, and the complete step list move into one keyboard-accessible native `<details>` disclosure. The primary button carries the next action, so the old visible `Next` card is removed.

On mobile, the detailed step list stays inside the disclosure and essential text remains at least 16px. The compact guide should occupy less than 200px in the normal ready state at a 390px viewport.

## Privacy and safety hierarchy

One short boundary stays visible:

> Your files and answers stay in this browser. They are not uploaded.

The fuller browser-local, AI/authority/bank/toll-operator, hosting-metadata, and separate-PDF-tab explanation moves under `Privacy details`.

Decision-critical warnings remain visible in context:

- Never enter passwords, CAPTCHA, OTPs, Aadhaar, PINs, CVV, full financial identifiers, or payment details.
- A message or forwarded link does not verify an official record.
- Shared-device clearing and export restrictions appear after shared mode is selected.
- Deadline caveats appear beside deadlines.
- Synthetic status remains persistent in demo fixtures.
- Result limitations remain visible beside the result.

## Real e-Challan journey

- Show the full route hero only on Step 1. Later steps use the guided action as the page heading.
- Source step visible sequence: `Choose where to check` → `How did you get this record?` → `Add a record or enter facts`.
- Local intake visible receipt: `Local only · Not uploaded · Not saved`; full mechanics move under `How local review works`.
- Observation step keeps the core vehicle comparison visible and groups secondary photo/date/context fields under named disclosures.
- Result order: result → official next step → what looks clear → what to check. Evidence table, history, and raw summary preview become disclosures.
- The detailed downloadable evidence summary remains complete.

## FASTag journey

- Show the full hero only on Step 1.
- Use the compact manual-entry privacy variant because FASTag has no upload input.
- Step 2 becomes five named disclosure groups: `Issue and source`, `Transaction details`, `Passing image`, branch-specific `Extra check`, and `Confirm one transaction`.
- Step 3 shows only relevant comparison rows by default; the full map is available through `Show all checks`.
- Step 4 order: primary official route → preparation-note actions → unresolved evidence → optional full TP1–TP14 checklist, note preview, ledger, and secondary sources.
- Deterministic FASTag route logic and canonical official URLs do not change.

## Citizen home, demo, and Test Lab

- Home uses four two-line choices: `Check if it’s yours`, `Understand the notice`, `Compare the photo`, and `Find the next step`.
- Five situation shortcuts move under `Not sure? Choose your situation`.
- Keep three privacy statements visible; link to the full privacy page.
- Demo landing focuses on one flagship fictional case. Real-tool links remain in a slim band; scam preflight and seven issue routes live in the Demo Desk instead of being duplicated on the landing page.
- Test Lab case cards show ID, title, and expected result; only the selected case reveals the long description and workbench detail.
- The Test Lab remains explicitly fictional, does not call AI for public custom-image analysis, and keeps the evidence-assistant-not-judge boundary.

## Accessibility and interaction constraints

- Essential mobile copy is at least 16px.
- Interactive controls keep at least 48px touch targets.
- Whole visible choice cards remain clickable and keyboard accessible.
- Native disclosure summaries are descriptive, not `Learn more`.
- Status updates remain in a polite live region.
- Current/completed/upcoming/safe-stop semantics remain available to assistive technology.
- At 390 × 844, the first actionable control must be visible in the first viewport for the start of `/review` and `/fastag`.
- No horizontal overflow at 320px.

## Non-negotiable product truth

- `/` is the clean citizen home.
- `/review` is local e-Challan self-review.
- `/fastag` is local FASTag reconciliation.
- `/demo` and `/demo/test-lab` are fictional/synthetic.
- No fake government, bank, issuer, authority, filing, payment, authentication, or submission integration.
- AI may extract or explain observations; deterministic rules compare confirmed facts.
- Results remain `Match`, `Potential discrepancy`, or `Inconclusive` and never declare legal validity, guilt, innocence, fraud, cloning, cancellation, or refund entitlement.

## Acceptance targets

- Shared guided header: at most 45 always-visible words and less than 200px tall at 390px in the ready state.
- Citizen home: approximately 170 main-content words or fewer.
- Demo landing: approximately 250 main-content words or fewer.
- No safety statement repeats in one viewport unless the repeated warning is decision-critical beside the relevant control.
- All existing deterministic, privacy, safe-stop, Hindi, Simple Mode, shared-device, export-redaction, and official-link tests remain green.
- Desktop and mobile browser QA covers page identity, no blank/error overlay, console health, screenshots, and at least one state-changing interaction per journey.
