# Keeping ChallanSakshi useful

ChallanSakshi is a free, independent civic project by **Shourya Banda · sh1rs**. Its public home is https://challansakshi.sh1rs.com. The September 2026 public release keeps guest use available and requires no new paid provider. Documents are processed in the browser. Saving device cases is optional; exported files and clipboard copies remain under the citizen's control.

## What needs no account setup

Document and manual challan review, FASTag preparation, message warnings, reply review, source information, the device checklist, mobility preparation, visit packs, personal calendar exports, and encrypted manual case transfer work without Google sign-in. The app never files, pays, handles an official OTP/CAPTCHA, or verifies a government outcome. Practice tools remain clearly separated under `/demo`.

Google sign-in, D1 account copies, trusted remote helpers and hosted AI are not enabled. The maintainer chose the guest release on 13 September 2026 after confirming that no Google secrets or D1 database were configured. The complete optional setup remains in [mobility-account-setup.md](./mobility-account-setup.md). Do not enable a flag to disguise missing provider configuration.

## Check and release a change

Use Node 24 and the pinned pnpm version in `package.json` (11.19.0 for this release). Keep the lockfile and workspace overrides together. On this Mac, Node is available at `/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`; add that directory to `PATH` when the normal terminal cannot find Node.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test --maxWorkers=2
pnpm audit --prod --audit-level=high
pnpm build
pnpm test:browser:web
sh scripts/codex-deploy.sh --dry-run
```

The browser suite starts its own local server on `127.0.0.1:4177`. Stop an existing server first, or set `CHALLANSAKSHI_BASE_URL` to an already running acceptance server. The suite uses fictional data. Real document reading is separately exercised by `scripts/verify-document-release.mjs`; the usual browser tests include controlled reader fixtures and are not an OCR quality benchmark.

The GitHub **Public tool checks** workflow runs type checking, lint, tests, production dependency audit, build and Chromium acceptance for pushes, pull requests and manual runs. It holds no production deployment credentials and does not deploy. A workflow file in source is not evidence that a hosted run has passed; check the current run in GitHub.

When the checks pass and the change is intended for the public website:

```sh
sh scripts/codex-deploy.sh
node node_modules/wrangler/bin/wrangler.js deployments list --config wrangler.jsonc
DOCUMENT_RELEASE_BASE=https://challansakshi.sh1rs.com node scripts/verify-document-release.mjs
PUBLIC_QA_BASE=https://challansakshi.sh1rs.com node scripts/verify-public-release.mjs
```

The public smoke check uses disposable browser contexts and fictional inputs, blocks external destinations and all non-read requests, and writes its report and screenshots into a timestamped directory under `/tmp`. It covers the main guest journeys, keyboard navigation, phone layouts, disabled accounts and discovery assets. Set `PUBLIC_QA_BASE=http://127.0.0.1:4177` to check an existing local preview instead; only the production and loopback origins are accepted.

The deploy script temporarily sets production compatibility date `2026-08-28` and restores the local date. It rejects concurrent deployment and handles interrupted/failed builds. Do not deploy an old `dist` folder or a local Google origin. Inspect the actual deployed version and public pages after uploading.

## First checks when something breaks

- Check the public home and the affected tool, then `/api/account/status`. Guest release should report `configured: false` and `authenticated: false`. Sensitive API responses must use `Cache-Control: no-store`.
- For a failed document read, try a clear, small fictional image and a text PDF. Confirm same-origin reader assets load. Keep unclear readings inconclusive and preserve manual entry. Do not upload a citizen's document into logs or an issue to debug it.
- For a stopped local preview, restart the exact server and route before diagnosing the production site.
- For a broken official destination, use the source-review procedure below. Do not replace the destination with a link received in an SMS.
- For a bad release, inspect `wrangler deployments list`, select the previously verified version from the release record, then run `wrangler rollback <version-id> --config wrangler.jsonc`. Verify the public site again. The guest release has no remote database migration to reverse.

## Official links need human review

The retained national route evidence was reviewed on **2 September 2026** and expires on **2 October 2026**. The application will mark it as needing recheck and withhold reviewed routing links after expiry; it will not keep claiming the evidence is current. The September 13 recheck could not verify all official pages, so it does not extend those dates. The local preparation tools remain available.

Run `pnpm check:official-routes` for a bounded, read-only reachability report. A successful HTTP response does not establish a page's purpose, jurisdiction or acceptance of a case. Follow [official-route-maintenance.md](./official-route-maintenance.md) before changing a review date. Neither this command nor the site installs a background schedule or guarantees government uptime.

## Search and sharing

- `/about` gives a readable public overview, creator credit, privacy boundaries, FAQs and the feedback contact.
- `/sitemap.xml`, `/robots.txt`, page canonicals, Open Graph/Twitter metadata, JSON-LD and favicon/touch icons support discovery and sharing.
- `/llms.txt` gives a concise linked overview, `/llms-full.txt` adds details, and `/llm.txt` provides the requested alternate spelling. These files supplement ordinary crawlable pages; they cannot force an AI answer or search placement.
- In a verified Google Search Console property for `https://challansakshi.sh1rs.com/`, submit `sitemap.xml`, inspect `/` and `/about`, and request indexing if the console offers it. Only the property owner can complete account/domain verification. Do the equivalent in Bing Webmaster Tools if desired.
- Search result wording, logo selection, rich results and indexing timing are controlled by the search engine. Do not claim instant indexing from metadata alone.

## Contact, privacy and unfinished external validation

Public product feedback: **Shourya Banda, +91 63056 40566**; creator site: https://sh1rs.com. This is a project contact, not an official grievance, emergency service, legal adviser or guaranteed support SLA. Ask reporters for the page and a non-personal description only. Do not request notices, plates, IDs, passwords, tokens or payment details over that channel.

Device storage is not account-protected. Data expires according to the implemented 90-day rules and is removed during a later read/action, not by a background deletion service on a dormant device. Users must remove exported files and clipboard copies separately. Preserve these facts when changing privacy copy.

Independent privacy/legal review, a full accessibility audit, real-phone multilingual voice quality and a consented citizen usability pilot have not been completed. Keep those limits separate from automated regression checks. Dependency advisories can appear after release; consult the [September security record](../qa/security-release-2026-09-13/README.md) and rerun audits before maintaining the site.
