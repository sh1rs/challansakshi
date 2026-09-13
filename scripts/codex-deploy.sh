#!/bin/sh
# One-command Cloudflare deploy for the Codex environment.
# Usage:  sh scripts/codex-deploy.sh            (real deploy)
#         sh scripts/codex-deploy.sh --dry-run  (build + validate, no upload)
#
# Deploys the ChallanSakshi web product (Cloudflare Worker) only. The browser
# extension under extension/ is a separate local artifact and never deploys here.
set -eu
cd "$(dirname "$0")/.."
NODE_BIN="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
PATH="$NODE_BIN:$PATH"
export PATH
DRY=""
case "$#:${1:-}" in
  0:) ;;
  1:--dry-run) DRY="--dry-run" ;;
  *) printf '%s\n' 'Usage: sh scripts/codex-deploy.sh [--dry-run]' >&2; exit 2 ;;
esac

# One release at a time: a second run must never replace the first run's backup.
mkdir -p .wrangler
DEPLOY_LOCK=".wrangler/codex-deploy.lock"
if ! mkdir "$DEPLOY_LOCK" 2>/dev/null; then
  printf '%s\n' 'A deployment is already running, or its recovery lock remains at .wrangler/codex-deploy.lock. Check that run before retrying.' >&2
  exit 1
fi
BACKUP_READY=false
restore() {
  status=$?
  trap - 0
  if [ "$BACKUP_READY" = true ]; then
    if ! mv "$DEPLOY_LOCK/wrangler.jsonc" wrangler.jsonc; then
      printf '%s\n' 'Could not restore wrangler.jsonc. The recovery copy remains in .wrangler/codex-deploy.lock/wrangler.jsonc.' >&2
      exit 1
    fi
  fi
  rmdir "$DEPLOY_LOCK"
  exit "$status"
}
# Install cleanup before any operation that could change the working config.
trap restore 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
cp -p wrangler.jsonc "$DEPLOY_LOCK/wrangler.jsonc"
BACKUP_READY=true

# Production deploys always use the committed compatibility date 2026-08-28.
# Local dev sometimes lowers it (the pinned local workerd only supports up to
# 2026-05-22); this guard makes the deploy correct either way and restores the
# working tree afterwards.
node -e '
const fs = require("fs");
let s = fs.readFileSync("wrangler.jsonc", "utf8");
const pattern = /"compatibility_date":\s*"[0-9-]+"/;
if (!pattern.test(s)) { console.error("compatibility_date not found in wrangler.jsonc"); process.exit(1); }
s = s.replace(pattern, "\"compatibility_date\": \"2026-08-28\"");
fs.writeFileSync("wrangler.jsonc", s);
'
node node_modules/vinext/dist/cli.js build
./node_modules/.bin/wrangler deploy $DRY --config dist/server/wrangler.json
echo "CODEX-DEPLOY OK (mode: ${DRY:-real})"
