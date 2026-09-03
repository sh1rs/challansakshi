# Codex Cloudflare deploy handoff — ChallanSakshi web product

**Purpose:** Codex does exactly one thing in this repository: deploy the already-built, already-tested web product to Cloudflare. All development, testing, review, and fixes happen in the other local session. Codex credits are limited — do not spend tokens on anything beyond the steps below.

## Paste-ready prompt for Codex

```text
Deploy the ChallanSakshi web product. From /Users/shars/Desktop/challansakshi run exactly:

sh scripts/codex-deploy.sh

Then paste the last 15 lines of output and stop. Do not read any other file, do not run git commands, do not run tests or extra builds, do not edit any file, do not touch extension/ or qa/. If the command fails, paste the error verbatim and stop — do not debug.
```

## What the script does

`scripts/codex-deploy.sh` is self-contained and idempotent:

1. Temporarily ensures `wrangler.jsonc` has the production `compatibility_date` 2026-08-28 (local dev sometimes lowers it because the pinned local workerd only supports 2026-05-22; the script restores the working tree when it exits, success or failure).
2. Runs the production build with the repo's bundled Node runtime.
3. Runs `wrangler deploy --config dist/server/wrangler.json` using the Cloudflare auth already connected in the Codex environment.

Success looks like an uploaded Worker named `challansakshi` on the custom domain `challansakshi.sh1rs.com` followed by the line `CODEX-DEPLOY OK (mode: real)`.

A no-upload rehearsal exists: `sh scripts/codex-deploy.sh --dry-run` (last verified green 2026-09-03).

## State guarantees at handoff (do not re-verify from Codex)

- Root suite 41 files / 732 tests, extension suite 8 files / 213 tests, both typechecks, lint with zero warnings, production build: all green locally on branch `codex/challansakshi-resolution-layer`.
- The deploy ships the web product only, including the new opt-in dark mode. The browser extension under `extension/` is a local internal-review artifact, never part of this deploy.
- `ANALYSIS_ENABLED` and `SYNTHETIC_UPLOADS_ENABLED` remain `"false"`; no real government adapter exists in the web product.

## If something goes wrong after deploy

Roll back from the Cloudflare dashboard (Workers → challansakshi → Deployments → rollback), or tell the local session, which owns all debugging.
