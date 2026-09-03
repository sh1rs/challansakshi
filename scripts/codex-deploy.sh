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
if [ "${1:-}" = "--dry-run" ]; then DRY="--dry-run"; fi

# Production deploys always use the committed compatibility date 2026-08-28.
# Local dev sometimes lowers it (the pinned local workerd only supports up to
# 2026-05-22); this guard makes the deploy correct either way and restores the
# working tree afterwards.
cp wrangler.jsonc wrangler.jsonc.predeploy-backup
node -e '
const fs = require("fs");
let s = fs.readFileSync("wrangler.jsonc", "utf8");
const pattern = /"compatibility_date":\s*"[0-9-]+"/;
if (!pattern.test(s)) { console.error("compatibility_date not found in wrangler.jsonc"); process.exit(1); }
s = s.replace(pattern, "\"compatibility_date\": \"2026-08-28\"");
fs.writeFileSync("wrangler.jsonc", s);
'
restore() { mv wrangler.jsonc.predeploy-backup wrangler.jsonc; }
trap restore EXIT

node node_modules/vinext/dist/cli.js build
./node_modules/.bin/wrangler deploy $DRY --config dist/server/wrangler.json
echo "CODEX-DEPLOY OK (mode: ${DRY:-real})"
