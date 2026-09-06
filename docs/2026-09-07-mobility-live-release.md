# Mobility workspace release — 7 September 2026

The user explicitly requested committing, shipping and deploying the complete current workspace to the existing website. This release includes the accumulated mobility implementation, the prior voice companion commits and the public-copy corrections found during release review. Existing product and synthetic-demo boundaries remain.

## Release status

Release preparation is in progress. Commit, remote revision, deployed version and public verification will be recorded here only after each is confirmed.

- Target: `https://challansakshi.sh1rs.com`, existing Cloudflare Worker `challansakshi`.
- Remote: `https://github.com/sh1rs/challansakshi.git`, default branch `main`.
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

The last privacy-link class was added near the end of the complete browser run; its final rendered state was verified separately as described above. The production dry run passed with `CODEX-DEPLOY OK (mode: --dry-run)` and restored the local configuration. Its Worker upload was 2,507.74 KiB / 663.48 KiB gzip, with only the documented environment bindings. Live deployment checks are still pending. Previous local implementation results are retained separately in the [next-actions checkpoint](./2026-09-06-mobility-next-actions-status.md).

## Evidence and rollback

Operational logs and fictional-browser artifacts for this release are under `/tmp/challansakshi-2026-09-07-*`; no private operational log is added to the public repository. The public smoke test uses isolated contexts and fictional data entered through the UI, with no account/provider/official mutation.

If the new guest release requires rollback, the verified previous Worker version is `d6006d5f-97ad-4c3c-824c-82119c6866ac`. This release does not migrate a remote database. Confirm the latest deployment before executing a rollback; use the installed Wrangler CLI and the [Cloudflare rollback documentation](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
