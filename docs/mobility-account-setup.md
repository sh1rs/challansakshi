# Free starting setup for mobility accounts

The application can be used locally without an account. Optional account saving uses your existing Cloudflare Worker, a D1 database, and Google sign-in. No Supabase project, SMS provider, Firebase upgrade, or paid model is required for this configuration. Free allowances have limits: this is not a promise of free unlimited production use.

## Choose the starting option

| Option | What it gives you | Fit for this codebase |
| --- | --- | --- |
| Guest mode plus an encrypted case file | Local preparation and manually moving one reviewed case between private devices; no account setup or per-request service bill | Implemented. It does not provide automatic sync, helper accounts or cloud AI. |
| Cloudflare D1 plus Google sign-in | Optional account storage using the existing Worker | Implemented but unconfigured. Recommended first account setup because it reuses this application's infrastructure. |
| Supabase Free | Managed PostgreSQL and authentication; currently 50,000 monthly active users and 500 MB database, with free-project inactivity pausing | A valid alternative, but this implementation would need a different backend adapter. [Current plan](https://supabase.com/pricing). |
| Firebase Spark / non-phone authentication | A no-cost starting route for Google/email authentication; phone authentication is billed per SMS | A valid alternative, with a separate Firebase storage/auth integration. [Current pricing](https://firebase.google.com/pricing). |
| Appwrite Free | Authentication and database platform; currently 75,000 monthly active users, with project/resource limits and inactivity pausing | A valid alternative, with a separate adapter. [Current plan](https://appwrite.io/pricing). |

The practical choice is **guest preparation now, Google + D1 when account continuity is useful**. SMS is a separate delivery cost; changing the database provider does not make real phone OTP delivery free.

For manual device transfer, open a case in `/mobility`, expand **Move this case with an encrypted file**, review its full contents, choose and confirm a long passphrase, and download it. On the destination device, expand **Open an encrypted case file**, choose the file, decrypt locally and review it. Opening creates an unsaved copy with a new case ID. Keep the passphrase separately; there is no recovery service. See [portable-case design and checks](./mobility-portable-case.md).

Current official references checked 6 September 2026:

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): Free includes 100,000 Worker requests/day and 10 ms CPU per invocation. Verify the deployed app fits the CPU allowance; local tests do not measure edge billing.
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): Workers Free includes 5 million rows read/day, 100,000 rows written/day, 5 GB total storage. Index writes count too.
- [Google web server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).
- [Firebase pricing](https://firebase.google.com/pricing): phone authentication is billed per SMS. It is not the free sign-in alternative for this first release.
- [Browser Run FAQ](https://developers.cloudflare.com/browser-run/faq/): Free accounts have 10 browser minutes/day. Real portal automation remains a separate integration.

## Try locally before creating accounts

You can postpone every cloud setup step below. To try guest mode from this checkout, run:

```sh
cd /Users/shars/Desktop/challansakshi
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
node node_modules/vinext/dist/cli.js dev --hostname localhost --port 4177
```

Open `http://localhost:4177/mobility`. If a preview is already using that port, use its existing address instead of starting another server. With the current unconfigured bindings, `/api/account/status` returns `{"configured":false,"authenticated":false}`. The local account/helper integration tests can also run without Google credentials or a cloud database:

```sh
node node_modules/vitest/vitest.mjs run tests/mobility-worker-runtime.test.ts
```

That test creates a disposable local D1 runtime, applies all three migrations, and uses fabricated identities with provider network access blocked. It does not enable real sign-in.

### Preview the built Cloudflare Worker locally

For production-build checks, run the generated Worker through Wrangler. This executes the custom `worker.ts` entry point, including `/api/account/*`, and serves the built assets with the Worker runtime and bindings. With the installed Vinext version, `npm start` (`vinext start`) executes the wrapper through its Node preview but does not provide Worker bindings. Account status therefore reports `configured: false` there even if the generated Cloudflare configuration declares a database; use the Wrangler preview to test that configuration.

From the repository root, after setting the Node runtime path above:

```sh
node node_modules/vinext/dist/cli.js build
WRANGLER_SEND_METRICS=false node node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --ip 127.0.0.1 --local-upstream 127.0.0.1 --port 4180 --inspector-port 9240
```

Open `http://127.0.0.1:4180/mobility`. The preview command uses the existing `dist/server/wrangler.json`; it does not rebuild automatically. Build once before starting a validation run, and stop the preview before replacing its build. If that port is already in use by this preview, reuse it. The command runs locally with remote bindings disabled and does not deploy or create a cloud resource. [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/).

On a normal Node installation with npm available, the same commands are `npm run build` and `WRANGLER_SEND_METRICS=false npm run preview:cloudflare`. The bundled runtime used for this build provides Node but not npm, so the directly executable commands above work without installing another package manager.

Keep `--local-upstream 127.0.0.1`: otherwise Wrangler can inherit the production hostname from the configured route, causing the application's HTTPS redirect to redirect this local preview. The separate inspector port allows it to coexist with the development server.

Check that the built Worker and page both respond:

```sh
curl -i http://127.0.0.1:4180/api/account/status
curl -I http://127.0.0.1:4180/mobility
```

For the current unconfigured build, account status should be HTTP 200 JSON `{"configured":false,"authenticated":false}` with `Cache-Control: no-store`, and the mobility page should be HTTP 200 HTML. This proves the custom Worker route executes; it does not prove Google sign-in or a configured database works. Use the development setup below for the initial OAuth test on `localhost:4177`. Testing configured accounts on a different preview origin additionally requires matching local bindings, site origin and Google's exact registered callback. The development address using `localhost` and this preview using `127.0.0.1` have different hosts and do not share cookies.

## 1. Create a Google sign-in client

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project such as `ChallanSakshi`. Use your own Google account. Do not enable a billing upgrade for this setup.
2. Open Google Auth Platform. Complete Branding (app name, support email and contact email). Audience should be External if citizens outside your organization will sign in. During testing, add your own Google account as a test user.
3. Add only basic identity scopes: `openid`, `email`, `profile`. No Drive, Gmail or government-record permissions are requested.
4. Under Clients, create an OAuth client of type **Web application**.
5. Add the exact authorized redirect URI:
   `https://challansakshi.sh1rs.com/api/account/callback`
6. For local testing with the command above, also add `http://localhost:4177/api/account/callback`. Scheme, host, port and path must match exactly. Do not switch between `localhost` and `127.0.0.1` during sign-in: they have different origins and cookies. If you choose the numeric loopback address, register that exact callback and use it consistently in the preview address and local site-origin setting instead.
7. Keep the client ID and client secret privately. Never put the secret in a `NEXT_PUBLIC_` variable or paste it into chat. Google hosts the sign-in page; the app never asks for a Google password.

Google may require additional branding/domain verification before public rollout. Follow the actual console status rather than treating a test login as public approval.

## 2. Create a D1 database

Run the commands below from `/Users/shars/Desktop/challansakshi`. They use the repository's installed Wrangler CLI. If this Mac's terminal reports `node: command not found`, make the bundled runtime available for that terminal session:

```sh
export PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```

Use the repository's Wrangler CLI. Confirm the selected Cloudflare account and plan; keep Workers Free if a hard no-billing setup is required. If Wrangler is not authenticated yet, run its browser login and then check the account:

```sh
node node_modules/wrangler/bin/wrangler.js login
node node_modules/wrangler/bin/wrangler.js whoami
```

Skip login if this terminal is already authenticated. Create the database only in the account that owns this Worker:

```sh
node node_modules/wrangler/bin/wrangler.js d1 create challansakshi-mobility --config wrangler.jsonc
```

Copy the returned database ID into a `d1_databases` entry in `wrangler.jsonc`:

```json
"d1_databases": [{
  "binding": "MOBILITY_DB",
  "database_name": "challansakshi-mobility",
  "database_id": "THE_REAL_ID_RETURNED_BY_CLOUDFLARE",
  "migrations_dir": "migrations"
}]
```

This entry is deliberately absent until a real database exists. Do not deploy a made-up database ID.

Apply the supplied schema first locally, then to the selected remote database:

```sh
node node_modules/wrangler/bin/wrangler.js d1 migrations apply challansakshi-mobility --local --config wrangler.jsonc
node node_modules/wrangler/bin/wrangler.js d1 migrations apply challansakshi-mobility --remote --config wrangler.jsonc
```

Apply all three files in `migrations`: `0001_mobility_accounts.sql`, `0002_mobility_helpers.sql` and `0003_mobility_adviser.sql`. Keep the complete supplied schema up to date; the last migration does not enable AI. Check for unapplied migrations with:

```sh
node node_modules/wrangler/bin/wrangler.js d1 migrations list challansakshi-mobility --local --config wrangler.jsonc
node node_modules/wrangler/bin/wrangler.js d1 migrations list challansakshi-mobility --remote --config wrangler.jsonc
```

Local migrations affect the local database under `.wrangler/state`; they do not initialize the remote database. The Vite Cloudflare plugin uses the same default local persistence directory.

## 3. Configure secrets

Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` through Cloudflare Worker Settings → Variables and Secrets, or Wrangler's interactive prompts. These commands prompt privately; do not put secret values directly in shell command history.

```sh
node node_modules/wrangler/bin/wrangler.js secret put GOOGLE_CLIENT_ID --config wrangler.jsonc
node node_modules/wrangler/bin/wrangler.js secret put GOOGLE_CLIENT_SECRET --config wrangler.jsonc
```

These commands configure the deployed Worker; they do not configure local development. Keep the production `NEXT_PUBLIC_SITE_URL` in `wrangler.jsonc` at the exact trusted origin `https://challansakshi.sh1rs.com`.

For local OAuth testing, create `.dev.vars` in the repository root using a private editor, replacing the two placeholders with your actual Google client values:

```dotenv
GOOGLE_CLIENT_ID="YOUR_GOOGLE_WEB_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_WEB_CLIENT_SECRET"
NEXT_PUBLIC_SITE_URL="http://localhost:4177"
```

The installed Cloudflare Vite plugin loads these settings as local Worker bindings. The local origin overrides the production variable for that preview; it must match the URL used in the browser and Google's registered callback. Plain shell variables or a production secret do not replace this local configuration. `.dev.vars*` is git-ignored. Keep generated `dist` and `.wrangler` contents private too; local preview tooling can copy local variables into generated files. Restart your own preview after changing the binding configuration or `.dev.vars`.

## 4. Verify before opening account access

Run the local command above after configuring the D1 binding, local migrations and `.dev.vars`. This project's `vite.config.ts` uses the Cloudflare Vite plugin with `worker.ts`; `/api/account/*` is intercepted there before the application page router. Use this setup for local account testing. A plain static server or a Next.js dev server does not provide that custom Worker route and its D1 bindings.

Open `http://localhost:4177/api/account/status`. It should return `configured: true` without exposing keys. This checks that the required binding and settings exist; it does **not** prove the migrations, Google client secret or OAuth callback are working. A missing database binding or provider setting returns `configured: false`; an origin mismatch returns 403. A 404 or HTML page means the request did not reach the account Worker route. If sign-in or data access returns 503, recheck the migrations and provider configuration. Local cases remain available.

After local validation and the normal release checks, deployment must include a fresh build containing the new D1 binding. The repository's `sh scripts/codex-deploy.sh` builds and deploys `dist/server/wrangler.json`; it changes the live site. `.dev.vars` does not install remote secrets. Keep the production origin in the source configuration and do not deploy a local-origin override or stale generated build.

Complete these checks with fabricated cases and two separate Google accounts:

1. Sign in from `/account`, returning to `/mobility`; reopen `/account` for the account controls.
2. Save a local case; review and explicitly copy it to your account.
3. Open another private browser at the same site origin, sign in and use **Save a copy on my private device**. This stores a browser-local case; it does not download a file.
4. The other Google account must see none of the first account's data.
5. Editing an old account revision must return a conflict rather than overwrite a newer copy.
6. Sign out and confirm private case/profile requests reject the former session.
7. Sign in again, delete the test account and confirm its cases and sessions are removed.

Use the account UI for these actions. For manual API debugging, `/api/account/status` is the public preflight; authenticated responses contain `user.id`. Private reads and actions, including helper/adviser endpoints and sign-out, require the current session cookie **and** `X-Mobility-Account` set to that reviewed `user.id`. The header is an account ID, not an email or Google client ID. Writes also require an `Origin` matching the request/site origin, and JSON bodies require `Content-Type: application/json`. The UI supplies these automatically. Direct address-bar navigation to a private endpoint omits the account header and is expected to fail. Missing account context returns 400; a header for a different signed-in account returns 409. Refresh and review the current identity instead of retrying with stale context.

Account uploads are explicit. Data includes chosen case facts, request and local/user-reported history, or a separately reviewed reusable profile (name, address, language and selected vehicle details), not original documents. Each account can retain at most 50 cases and one reusable profile; existing revisions must match before replacement or deletion. These application limits are separate from Cloudflare's free-plan quotas. Sessions expire after one day. Case/profile account rows expire 90 days after their last account save and are removed on the next access. Google identity is retained until account deletion. Local copies are separate; deleting an account does not erase files or other devices.

## What still needs separate setup

Account cases now include optional **trusted helper** panels. Use two test Google accounts to verify an email-bound invitation, selected snapshot, helper suggestion, owner review, expiry and revocation. Apply all migrations in order, including `0002_mobility_helpers.sql` and `0003_mobility_adviser.sql`. Helper links are copied and shared manually; no messaging provider is required.

The separate **AI second opinion** panel stays unavailable by default. Account saving works without it. For its optional free-tier configuration, request caps, data preview and verification boundaries, follow [the AI and assistance guide](./mobility-ai-and-assistance.md).

Phone OTP, DigiLocker onboarding, approved official-service adapters, remote browser execution, scheduled official checks, and SMS/email/push delivery are not activated by this account configuration. Google sign-in authenticates the ChallanSakshi account only; it does not grant government access. Start by validating saved cases, then connect one official journey with actual access and evidence.
