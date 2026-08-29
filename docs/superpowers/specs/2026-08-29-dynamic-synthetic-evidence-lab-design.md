# ChallanSakshi Dynamic Synthetic Evidence Lab — Design

## Outcome

Replace the impression of a one-case scripted result with two independently verifiable layers:

1. a public, deterministic Test Lab that runs ten fictional evidence vectors through the same comparison rules at interaction time; and
2. a controlled, feature-flagged OpenAI extraction route for a separate synthetic challan, synthetic vehicle record, and one synthetic enforcement image.

The citizen `/review` and `/fastag` routes remain browser-local and do not import, call, or persist the lab pipeline.

## Evidence boundary

```text
synthetic challan + synthetic vehicle record + synthetic enforcement image
  -> OpenAI structured observations only
  -> strict runtime validator
  -> citizen review/correction
  -> deterministic field comparison
  -> deterministic safe next path
  -> local, filename-free action pack
```

The model schema contains no finding, validity, guilt, payment, contest, deadline, cancellation, outcome, or recommended-action field. The model only returns bounded source observations, visibility, confidence, source references, and limitations. The product derives comparison and action only after the human review gate.

## Comparison rules

- States are `match`, `potential-mismatch`, and `inconclusive` per field.
- Low-confidence, partial, unclear, unavailable, or not-visible observations are inconclusive even when a guessed value exists.
- Registration formatting, case, and punctuation normalize deterministically.
- Recognized category and colour aliases normalize deterministically.
- Registration and vehicle category are primary comparison signals.
- Colour, make/model, timestamp, and location are supporting signals.
- One supporting-only conflict is contextual and yields an overall inconclusive result; it cannot open a dispute path by itself.
- A primary conflict, or two independent supporting conflicts, yields `potential-evidence-discrepancy`.
- Offence assessment means only whether the relevant visual area is present. It never determines whether an offence occurred.
- Any result language must say “potential evidence discrepancy,” “inconclusive,” or “appears consistent,” never “invalid,” “illegal,” “guilty,” or “innocent.”

## Ten-case public corpus

The public Test Lab uses ten explicit inputs with a hand-labelled expected outcome distribution of:

- 3 appears consistent;
- 4 potential evidence discrepancy;
- 3 inconclusive.

The lab calculates actual outcomes at runtime and displays expected versus actual. It never stores an `actualOutcome` in a fixture. Editing a selected fact clears confirmation and downstream action, then recomputation can change the result independently of the case ID.

## Dynamic extraction privacy boundary

The dynamic route is a future-ready, fail-closed capability, not a public real-case upload service.

- `ANALYSIS_ENABLED=true` is required.
- `SYNTHETIC_UPLOADS_ENABLED=true` is independently required for caller-supplied material.
- The current deployed configuration keeps both false.
- The request requires explicit `syntheticOnly: true` attestation.
- The route accepts separate bounded challan and vehicle-record text plus one bounded PNG/JPEG image; no PDF, SVG, GIF, URL, filename, free-form model instruction, or caller-selected model.
- It validates same origin, exact request keys, bounded streams, base64, magic bytes, dimensions, model allowlist, upstream content type/size/status, exact structured output, source-line references, and forbidden legal/directive/URL language.
- It uses `store: false`, a 25-second timeout, no tools, no retries, no logs, and `Cache-Control: no-store` on every response.
- It never returns the source text, image, filename, API response ID, API key, or configured model.
- A custom-upload failure never substitutes one of the bundled Case A/B/C results.

Feature flags are kill switches, not operator authentication. Public arbitrary uploads remain disabled until server-verified access, rate limiting, spend ceilings, metadata-stripping/canonical image processing, and external privacy/security review exist. The public lab may offer a browser-local manual custom vector without a network send.

## Product surface

Add `/demo/test-lab` using the existing CitizenChrome demo boundary and visual language.

The route contains:

- a first-viewport “Run all 10 cases” proof;
- outcome totals and pass/fail text, not colour alone;
- a compact case matrix;
- a selected-case Evidence → Explain → Verify → Act workbench;
- editable source values whose edits invalidate confirmation;
- source, confidence, visibility, limitation, and deterministic rule trace;
- a local action-pack download/copy after confirmation;
- a browser-local custom synthetic vector path;
- an accurate disclosure that production live uploads are disabled, feature flags are not authentication, custom-input provenance cannot be verified, and the public custom path does not upload files.

The route must be usable at 320 CSS px with 16 px essential copy, 48 px controls, visible focus, no horizontal overflow, semantic headings/fieldsets, live status announcements, and reduced-motion support.

## Non-goals

- No government API, portal scraping, automatic filing, payment, legal advice, or outcome prediction.
- No real RC, challan, identity, face, plate, or location upload.
- No account, database, localStorage, sessionStorage, cookies, KV, R2, D1, analytics, or raw filenames in exports.
- No attempt to generalize the fixture-keyed Passport, ledger, tracking, and order-review demo in this slice.
