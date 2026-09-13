# ChallanSakshi free public release

Released 13 September 2026 at https://challansakshi.sh1rs.com.

This record identifies the public artifact and the evidence checked around it. It does not turn an independent civic project into a government service, legal adviser, bank or official filing channel.

## Deployed artifact

- Application commit: `080b44d` (`fix: enforce private referrer policy`), following the main release commit `120be67`.
- Cloudflare Worker version: `966ce5de-acf5-4782-86f6-6f616d9728a7`.
- Cloudflare deployment state: 100% of traffic on that version, independently read back after deployment.
- Previous verified rollback target: `2200a974-7447-4573-874d-968980c068ec`.
- Custom domain: `challansakshi.sh1rs.com`.
- Optional public provider flags: `ANALYSIS_ENABLED=false`, `SYNTHETIC_UPLOADS_ENABLED=false`, `MOBILITY_AI_ENABLED=false`.
- Google OAuth secrets and a D1 account database were not configured. Guest use is the intended release path.

The release script built the application from source, used production compatibility date `2026-08-28` for upload, restored the local `2026-05-22` date afterward, released its deployment lock and reported `CODEX-DEPLOY OK`.

## What changed for the public

- A responsive, bilingual home experience now leads with the real citizen question and keeps document review, manual review and mobility cases easy to reach.
- Message checking, exact-passage reply review, case preparation, focus handling, result editing and phone layouts received usability and accessibility fixes.
- `/about` now explains the project, its limits, common questions, creator **Shourya Banda**, the **sh1rs** identity and the approved product-feedback contact.
- Every maintained public route has a distinct title, description, canonical URL and share metadata. `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/llms.txt`, `/llm.txt`, `/llms-full.txt`, favicon/touch icons and a compact social image are public. Personal, account, helper, extension and synthetic-demo pages use `noindex`.
- Unknown routes and rendering failures have clear English/Hindi recovery paths.
- Response protection now covers Worker and direct account routes. Production pages return a restrictive content security policy, HSTS, clickjacking and MIME protections, bounded permissions and `Referrer-Policy: no-referrer`. The document-review route alone permits its same-origin local microphone flow.
- Runtime and transitive packages were updated and pinned. The production dependency audit reports zero known advisories.
- A read-only GitHub Actions workflow checks type safety, lint, tests, the production dependency audit, build and Chromium browser journeys. It has no deployment credentials and cannot publish the site.

## Verification evidence

Local checks against the release tree:

- TypeScript: passed.
- ESLint: the full repository passed; files changed after that run were checked again.
- Unit and integration tests: **104 files, 1,624 tests passed**. The final scroll implementation also removed the incomplete-DOM test warning it initially exposed.
- Security, HTML and voice response tests after the final header change: **25 passed**.
- Browser suite: all **320** journeys were exercised. The first long run passed 308; its 12 failures included a corrected 16px mobile footer, a stale metadata expectation, one scroll-preservation defect, one artifact collision and test-server starvation while another build/lint process was competing. All 42 affected and neighbouring journeys passed in the clean sequential reruns after the fixes, including the final focused scroll test.
- Production dependency audit: zero info, low, moderate, high or critical advisories.
- Hardened Cloudflare dry run: passed; 143 Worker modules and 329 client files were read, with an approximately 685 KB gzip Worker upload.
- `git diff --check`: passed.

Checks against final Worker version `966ce5de-acf5-4782-86f6-6f616d9728a7`:

- Isolated public walkthrough: **6/6 scenarios passed**, producing 11 screenshots and checking 15 public/API assets. It recorded zero page, console or failed-resource errors; zero warnings; zero external requests; zero write requests; zero horizontal overflow; and zero leaked fictional markers.
- Covered journeys: desktop and phone home; keyboard skip link and menu Escape; document/manual mismatch; message result focus and clear; duplicate exact-passage reply review and prepared note; guest case save and session clear; Hindi dark mode; creator contact; real 404 recovery; guest-only account state; and public discovery files.
- Live search/discovery suite: **6/6 tests passed** across distinct pre-JavaScript metadata, canonicals, crawler exclusions, sitemap, machine-readable summaries, media assets and the 320px bilingual About page.
- Final cold document check: passed local image OCR in 3.824 seconds and text-PDF extraction/review in 1.077 seconds, retained an independent registration mismatch, checked eight routes, issued no document or fixture-identifier requests and left IndexedDB, local storage and session storage empty. Two earlier fresh production sessions also passed, so three post-release document runs succeeded in total.
- Live response checks: homepage, review and guest account status returned HTTP 200. Homepage and review returned `Referrer-Policy: no-referrer`; review retained `microphone=(self)`; the account response returned `configured:false`, `authenticated:false`, `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
- Desktop, 390px phone and 320px Hindi dark screenshots were visually inspected after deployment.

The specialized Chrome performance-trace server required by the available audit workflow was not configured in this environment. No Core Web Vitals number or performance score is claimed. The production walkthrough still verifies functional rendering, viewport fit and absence of visible/runtime errors on its tested browser and connection.

## Public operating boundaries

- Documents selected in the review flow are processed on the device by default. OCR can misread a blurry or unsupported record, so the citizen must review the reading and can use manual entry.
- Device cases are optional and browser-local. Exported files and clipboard copies remain under the citizen's control. Dormant-device expiry is enforced on a later read/action, not by a background deletion service.
- ChallanSakshi does not authenticate a document, identify a driver, prove fraud, decide liability, file or pay a challan, submit a grievance, raise a FASTag chargeback, handle an OTP/CAPTCHA, access an official account or guarantee an outcome.
- Search engines already returned the ChallanSakshi brand in a release-day web check, but showed some older cached content. The new metadata and crawler files are live; recrawl timing, snippets, rankings, rich results and AI overviews remain search-engine decisions. Search Console was available only signed out, so no sitemap submission or indexing request was claimed.
- National official-route evidence retains its **2 October 2026** expiry. The application withholds reviewed routing links after expiry while keeping local preparation tools available. The 13 September reachability check did not justify extending that evidence date.
- The production dependency graph has no known audited advisory. The full development graph retains two high-severity `image-size@2.0.2` parser advisories under Vinext because the advisory's fixed `2.0.3` was not published in the registry checked for this release. The package is reached during repository-owned static metadata generation, not public document reading. Do not add untrusted ICNS, JXL or HEIF build metadata; upgrade when a patched package exists.
- Independent privacy/legal review, a full accessibility audit, real-phone multilingual voice benchmarks and a consented citizen usability pilot have not been completed. Product feedback is best effort and has no guaranteed response time.

## Maintenance and rollback

Follow [PUBLIC-MAINTENANCE.md](./PUBLIC-MAINTENANCE.md) for the exact repeatable checks, optional Google/D1 setup, official-link review and incident-safe debugging. The security and dependency evidence is in [the September security record](../qa/security-release-2026-09-13/README.md).

If this release develops a material fault, inspect current deployments, then roll back to the previously verified version:

```sh
node node_modules/wrangler/bin/wrangler.js rollback 2200a974-7447-4573-874d-968980c068ec --config wrangler.jsonc
```

After a rollback, verify the active version and repeat the public walkthrough and document check. There is no guest-release database migration to reverse.
