# Mobility workspace release — 7 September 2026

The user explicitly requested committing, shipping and deploying the complete current workspace to the existing website. This release includes the accumulated mobility implementation, the prior voice companion commits and the public-copy corrections found during release review. Existing product and synthetic-demo boundaries remain.

## Release status

The complete guest implementation and the acknowledgement layout correction are deployed to the public website. Final English/Hindi mobility and PDF checks passed. Image OCR has an unresolved intermittent reading failure described below. This record accompanies the final source and documentation push to GitHub main.

- Target: `https://challansakshi.sh1rs.com`, existing Cloudflare Worker `challansakshi`.
- Remote: `https://github.com/sh1rs/challansakshi.git`, default branch `main`.
- Initial release commit: `b983cc68f1c4ce0e402c5d8103927cd2f32007d4` (`feat: ship guest mobility cases and continuity toolkit`), independently confirmed on remote `main`.
- Initial deployed version: `41413fcd-023d-4ace-b0ed-fcf40a6a596c`, independently confirmed at 100% traffic. Deployment created `2026-09-06T21:03:31.209Z` (7 September, 02:33 IST).
- Corrected source commit: `f723ff2bfcbd308e7879d4a32c8b66a2f29d3510` (`fix: keep acknowledgement radio labels readable`).
- Current deployed version: `2200a974-7447-4573-874d-968980c068ec`, independently confirmed at 100% traffic. Deployment created `2026-09-06T21:32:23.051Z` (7 September, 03:02 IST).
- Starting implementation branch: `codex/screen-aware-voice-coach`, HEAD `6bdeb88`.
- Remote `main` was an ancestor of the current branch after fetching; no remote work needs overwriting.
- Verified preceding production version: `d6006d5f-97ad-4c3c-824c-82119c6866ac`, serving 100% traffic. Retain this as the rollback target.
- Deployment uses `sh scripts/codex-deploy.sh`, which temporarily builds with compatibility date `2026-08-28` and restores the local `2026-05-22` configuration.

## Included citizen flows

The public homepage and navigation lead to guest mobility preparation for nine service types. The workspace connects reviewed task/document/reply intake, explicitly saved cases and reusable profile details, multiple vehicles, deterministic case-team guidance, selected profile corrections, source observations, personal follow-ups, short case briefs, encrypted manual case transfer, original-file checks, document-date organisers, linked life-event plans, exact form-copy review and conflict recovery.

The latest connected journey adds a returning-user agenda, reviewed acknowledgement text, appointment/packing preparation, exact visit-pack and minimal calendar downloads, and manual session clearing. Case reports remain citizen-entered; appointment details do not book a slot or establish an official outcome. Local saves are explicit, unencrypted and expire 90 days after their relevant last save, with cleanup on a subsequent read/action. Separate exported files and clipboard contents remain outside in-app deletion.

The existing document reader, FASTag tools, message checker, reply review, simple checklist, multilingual review companion and fictional demonstrations remain available. The assistance lab is a fictional exercise and does not connect to a government portal.

## Provider availability

The full implementation is published with truthful runtime availability. There are no configured Google OAuth/D1 account prerequisites, SMS provider or Workers AI binding in this release. Account/helper pages report their unavailable state; optional account copies, remote helper access and model inference cannot run. `ANALYSIS_ENABLED`, `SYNTHETIC_UPLOADS_ENABLED` and `MOBILITY_AI_ENABLED` remain false. Original documents are not uploaded by the reader.

Deployment does not create a real official portal adapter, DigiLocker connection, background status polling, payment, filing or licence service. See [account setup](./mobility-account-setup.md), [multi-agent architecture](./mobility-ai-and-assistance.md) and [idea coverage](./2026-09-06-idea-coverage.md) for the implemented boundaries and remaining setup.

## Release review and verification

Independent server review found no blocker to the guest-capable release with unavailable provider paths. The publication candidate scan covered 176 files (about 2 MB) before this release note was added and found no private-key, GitHub-token, common provider-key or AWS-access-key pattern. This is a bounded pattern check, not a certification that arbitrary secrets cannot exist.

Public-copy review found three corrections: make the privacy notice reachable from the safety page, describe organiser/linked-plan persistence and the non-personal session-clear marker, and use a neutral label for account-list details that may still need checking. The final gates below are run after those corrections.

Predeployment verification completed:

- Full unit/integration suite: **1,610 tests across 102 files passed**.
- Full development browser suite: **313 scenarios passed in one 6.1-minute run**.
- Whole-workspace TypeScript and ESLint passed; final privacy-link styling also passed the focused 18-test public-info suite, type checking and lint.
- The final privacy anchor was checked in English desktop and Hindi 320px: its target measured 48px, navigation reached `/privacy`, and neither scenario had horizontal overflow or page/console errors.
- The existing account-copy browser scenario passed with the new English/Hindi neutral label assertions for mixed confirmed/unchecked facts.
- Authored-source and staged whitespace checks passed.

The last privacy-link class was added near the end of the complete browser run; its final rendered state was verified separately as described above. The production dry run passed with `CODEX-DEPLOY OK (mode: --dry-run)` and restored the local configuration. Its Worker upload was 2,507.74 KiB / 663.48 KiB gzip, with only the documented environment bindings. The real deployment completed with `CODEX-DEPLOY OK (mode: real)`. Public account status returned HTTP 200, `configured: false`, `authenticated: false` and `Cache-Control: no-store`. Previous local implementation results are retained separately in the [next-actions checkpoint](./2026-09-06-mobility-next-actions-status.md).

The initial Hindi 320px public flow completed acknowledgement review, local case saving, agenda updates, session clearing/reload and Safety-to-Privacy navigation without JavaScript errors or network writes. Public visual inspection caught acknowledgement radios inheriting the workspace's full-width text-input rule (722px on desktop). The correction excludes radios from text-input styling and sizes them with the other selection controls. The two focused browser regressions passed, measuring desktop and English/Hindi 320px radio width, remaining label space, font size and text bounds; TypeScript and focused ESLint also passed. Live radios now measure 19px wide, with readable labels. The final public run passed in English desktop (1365×1000) and Hindi mobile (320×740, dark mode): home discovery, saved fictional case, appointment pack, acknowledgement review/apply/save, agenda, session clear/reload, return home, Safety and Privacy. Account/helper/demo availability checks passed. Twenty-five screenshots were captured, with zero page/console errors, failed requests, bad responses, external requests, network writes or horizontal overflow. There were no sampled contrast flags; this was not a complete accessibility audit.

An independent public PDF check passed: two fictional in-memory PDFs produced independently sourced registrations, a visible mismatch and a reviewed neutral note retaining each source's page and PDF-text lineage. The omitted owner field stayed omitted. All 29 requests were same-origin GETs; no documents, fixture identifiers or filenames were sent, and local/session/IndexedDB storage remained empty. There were no page/console errors or 390px overflow. Notice extraction took 1,357ms; both PDFs and review took 1,892ms.

The first complete public reader check failed to complete image reading; the interface displayed its generic fallback message. A subsequent isolated OCR diagnostic using the same fictional image passed in 18,963ms: core loading, language loading, initialization and recognition all resolved, with no worker rejection or page errors. Both language files had valid gzip bytes. Two vendor parameter warnings did not prevent recognition. This does not identify the first failure's cause; no reader code was changed based on that uncertain result. A second run of the original complete check also failed: its OCR core asset request had no completed response before the reading wait expired. The cause remains unresolved. Image OCR is available and demonstrated a successful run, but it is not verified consistently reliable in this release. The existing clearer-file/manual-review fallback remains available; PDF text extraction passed independently. No further speculative reader changes were made during deployment.

## Evidence and rollback

Operational logs and fictional-browser artifacts for this release are under `/tmp/challansakshi-2026-09-07-*`; no private operational log is added to the public repository. The public smoke test uses isolated contexts and fictional data entered through the UI, with no account/provider/official mutation.

If the new guest release requires rollback, the verified previous Worker version is `d6006d5f-97ad-4c3c-824c-82119c6866ac`. This release does not migrate a remote database. Confirm the latest deployment before executing a rollback; use the installed Wrangler CLI and the [Cloudflare rollback documentation](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
