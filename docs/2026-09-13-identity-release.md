# Road & Record public identity release

This update follows the [free public launch](./2026-09-13-public-release.md) and implements Shourya's selected concept I: a road integrated with a mobility-service ticket. It is live at https://challansakshi.sh1rs.com/.

## Published artifact

- Identity/application commit: `8cc8e8344ae0bab86f83bd01bc42e735017e62ef`, followed by the public Google ownership meta tag in `efe7ddc25a58a2898c96d76be2e764023abed336`.
- Final Cloudflare Worker version: `e73f0d1c-4e65-4e05-b0a3-615a7706625d`, deployed 13 September 2026 at 16:11 UTC. A subsequent deployments read confirmed 100% traffic on this version.
- The earlier identity deployment `030dc2a9-18c6-4b1b-97b8-0aa8a0cbc270` received the complete live walkthrough and document checks; the final deployment adds only the Google ownership tag and passed focused live discovery verification.
- Previous verified public launch rollback version: `966ce5de-acf5-4782-86f6-6f616d9728a7`. Rolling back before the verification-tag commit removes Search Console's ownership proof; reapply that tag promptly if rolling back.
- GitHub remote main was independently verified at both the identity/application commit and the later verification-tag commit after authenticated pushes.
- Production compatibility date `2026-08-28` was applied by the release script; the local `2026-05-22` date and deployment lock were restored afterward.

## Public changes

- A compact editable vector supplies the header symbol, SVG/ICO/PNG favicons, touch/app icons, maskable icon, square search logo and full wordmark. The Road & Record identity is described in [brand-identity.md](./brand-identity.md).
- Manrope brand lettering is hosted on the same origin. The production header uses a 24 KB Latin WOFF2; reproducible artwork uses the bundled licensed TTF.
- The sharing image now uses the selected symbol, a clear explanation of the free tools and creator credit. Its JPEG is 51,795 bytes; the PNG is 57,105 bytes, compared with the previous 1.17 MB PNG.
- Homepage text and structured data consistently identify **ChallanSakshi**, its independent civic purpose, its creator and its logo. Machine-readable overviews use the same preferred spelling and by-sh1rs signature.
- Small-screen footer and confirmation layouts now accommodate wider system fonts. The result-edit scroll test measures the application transition after bringing the control into view.
- Failed hosted browser checks now retain screenshots and traces for 14 days.

## Verification

Local verification on the application tree:

- TypeScript and full-repository ESLint passed.
- 104 unit/integration test files and **1,624 tests passed**. Runtime tests require local worker ports; sandbox-only attempts were invalidated by EPERM and were rerun successfully with the required access.
- Production dependency audit: **no known vulnerabilities found**.
- **27/27** focused review/mobile checks and **7/7** discovery checks passed, including English/Hindi at 320/375/390px, wider font metrics, keyboard and focus behaviour, privacy boundaries, metadata and actual logo dimensions.
- The About browser test waits for the existing hydration-ready language control before interacting with a native disclosure. A fast pre-hydration native toggle can produce a React development attribute warning while retaining the user's open state; no product warning suppression was introduced. The final test asserts no console warnings/errors or page errors.
- Independent review found no release blocker in the assets, header accessibility, manifest, structured logo data or maskable safe area.
- Production build and deploy passed. `git diff --check` passed.

[Hosted GitHub Actions run 34766402528](https://github.com/sh1rs/challansakshi/actions/runs/34766402528) passed for the exact `8cc8e8344ae0bab86f83bd01bc42e735017e62ef` application commit: typecheck, lint, production audit/build, **1,624 tests across 104 files**, and **all 321 browser tests**, with no failed or flaky cases. Browser checks completed at 15:55:03 UTC in 10.0 minutes. The later three-line ownership-metadata addition was checked with TypeScript, scoped ESLint, a fresh production build, exact initial-HTML verification and the seven live discovery checks; the full application suite was not repeated for that static metadata addition.

Checks against the deployed Worker:

- **6/6 public walkthrough scenarios passed** with 11 screenshots and 15 HTTP asset/API checks. The report recorded no page/console/resource errors, warnings, external requests, write requests, fictional-marker leaks or viewport overflow.
- **7/7 live discovery checks passed**, including initial HTML metadata, crawler boundaries, text summaries, SVG/PNG/ICO files, the actual 512×512 logo and bilingual About interactions.
- All **13 checked live brand files matched the local committed files byte-for-byte** by SHA-256, including the SVG, font, favicons, app icons, wordmark and sharing images.
- Live image OCR and text-PDF extraction/review passed twice. The first cold run during concurrent release checks took 30.960 seconds for image reading and 13.622 seconds for PDF reading/review; a separate fresh session without concurrent release browsers took 5.321 seconds and 7.610 seconds respectively. These are observations, not a device-performance guarantee or proof of the cause of timing variation. Both retained the independent registration difference, checked eight routes, made zero document/fixture-identifier requests and left local storage, session storage and IndexedDB empty.
- Desktop, phone, small-phone/Hindi dark layouts and native-size icon/mask previews were visually inspected.

Evidence locations on the release machine: `/tmp/challansakshi-public-live-qa-2026-09-13T15-43-35-636Z/report.json`, `/tmp/challansakshi-brand-live-discovery`, `/tmp/challansakshi-final-brand/geometry.json` and `/tmp/challansakshi-final-brand/live-assets.json`. Temporary evidence can be removed by the operating system; the conclusions and reproducible commands are recorded here.

The final deployment's Google verification value appears exactly once in initial homepage HTML inside `<head>` before `<body>`. All seven live discovery checks passed again on that deployment in 26.4 seconds. Evidence: `/tmp/challansakshi-google-verification-live.html` and `/tmp/challansakshi-google-verification-discovery`.

## Owner access and maintenance

After the owner signed in, Google Search Console confirmed **Ownership verified** using the HTML tag for `https://challansakshi.sh1rs.com/`. The sitemap was submitted, and Google's submitted-sitemaps table reported **Success**, last read 13 September 2026, with **11 discovered pages**. Keep the public verification value in `app/layout.tsx`; it is not a visitor sign-in credential. The existing Cloudflare OAuth session lacks DNS-write permission, so the verification used the public website tag and did not grant Google Cloudflare-account access.

URL Inspection confirmed the homepage was already indexed (**URL is on Google; Page is indexed**). A fresh homepage indexing request completed successfully and Google confirmed that it entered the priority crawl queue. The new `/about` URL was unknown to Google at inspection time; its subsequent indexing request also completed with **Indexing requested**, added to the priority crawl queue. Both requests ran Google's live indexability check before acceptance. This establishes the homepage's existing indexing and two accepted requests, not a particular position for the brand query or completed indexing of About. No repeated submission or CAPTCHA-solving action was performed.

The site's crawlable metadata, preferred brand name, logo, sitemap and machine summaries are deployed; they do not guarantee Google indexing, rankings, a knowledge panel or an AI overview. See the [Search Console guide](./public-discovery.md#owner-steps-for-google-discovery) for future checks.

The guest boundary remains unchanged. Google OAuth and the account database are unconfigured; the [maintenance guide](./PUBLIC-MAINTENANCE.md) links the optional secure setup instructions. No paid provider was enabled. Documents remain on-device by default, saved cases remain browser-local and official actions remain with the citizen.

Official-route evidence still expires on **2 October 2026**. Reviewed routing links are withheld after expiry while local preparation remains available. The wider independent accessibility/privacy reviews, real-device voice benchmark and development-only dependency advisory described in the original release record remain maintenance items.

If rollback is needed, inspect current deployments, then use the known previous release:

```sh
node node_modules/wrangler/bin/wrangler.js rollback 966ce5de-acf5-4782-86f6-6f616d9728a7 --config wrangler.jsonc
```

Verify the active version and rerun the public/document checks after a rollback. No guest database migration is involved.
