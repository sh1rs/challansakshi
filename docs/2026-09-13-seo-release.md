# Search discovery and civic guides release

Published to https://challansakshi.sh1rs.com on 13 September 2026. This extends the [Road & Record identity release](./2026-09-13-identity-release.md) and preserves the free guest-only operating boundary.

## Published changes

- A guides hub and three practical English/Hindi articles: `/guides/wrong-e-challan`, `/guides/fastag-wrong-deduction` and `/guides/fake-challan-message`.
- Each guide includes a direct answer, evidence checklist, steps, official references, source-review date, Shourya Banda / sh1rs authorship, related guides and a working preparation-tool link. English content is readable before JavaScript; Hindi remains a saved interface preference on the same canonical URL.
- Individual metadata, Article/Breadcrumb data and stable publication dates. Four new URLs join the maintained sitemap and all LLM-summary variants, bringing the public sitemap to 15 pages.
- The homepage provides direct guide links and an explicit project definition. About uses the name in its main heading and links to the public source repository; Organization data identifies that same repository.
- `/mobility` now serves a useful public introduction and four native tool/directory links while its editor initializes. No personal case data is server-rendered. Existing save/clear/session semantics remain intact.

## Artifact and checks

- Feature commit: `7c1c8ba9113081e441e28540a8ebe894102903d1`. Final application commit, including contrast and corrected homepage test expectations: `856654f801754df2b075485f6c1f2185cadab69c`, verified on public `origin/main`.
- Initial SEO deployment: `8655d7bc-7b6a-4683-9869-c92c000777a2`, at 16:33 UTC. Final active version after the one-line guide-button contrast polish: `a781cca9-2e19-4378-8923-ff555e8fc25b`, deployed at 16:45 UTC and verified at 100% traffic.
- Build/deployment: `sh scripts/codex-deploy.sh` completed with `CODEX-DEPLOY OK`; local compatibility configuration was restored. `ANALYSIS_ENABLED`, `SYNTHETIC_UPLOADS_ENABLED` and `MOBILITY_AI_ENABLED` remain false. Previous verified rollback version with the ownership tag: `e73f0d1c-4e65-4e05-b0a3-615a7706625d`.
- Full TypeScript and ESLint checks passed. Unit suite: 105 files / 1,626 tests passed, including two new mobility first-render checks. The final homepage navigation component change also passed its six focused unit checks.
- Local browser checks passed for the three guide flows, seven discovery/identity flows and twelve mobility session/workspace flows. Visual review covered desktop and 320/390px layouts, English/Hindi and settled dark mode, with no horizontal overflow in the inspected views.
- Live verification passed all ten guide/discovery checks and the no-JavaScript mobility-directory flow. The multi-page phone test first exceeded its 30-second total budget during a public-network navigation; an isolated 90-second-budget run passed in 5.6 seconds. A separate fresh guides-hub load reached its usable language control in 1.19 seconds; this is one observation, not a field-performance guarantee.
- Two local environment failures were diagnosed rather than hidden: sandboxed Miniflare tests could not open localhost ports, and a last guide rerun overlapped the deploy script's temporary production compatibility date, restarting the preview into an unsupported workerd date. The full suite passed with test-port access; guide phone behavior was independently verified on production. Stop previews before future deploys.
- Final visual polish changes only the guide action-button background to the existing darker teal token. Production checks measured white-text contrast of 6.91:1 in light mode and 6.02:1 in dark mode across all three guides, with no phone overflow and a working tool action. The final production build/deployment passed; the successful full hosted rerun also covers this final style value and the corrected homepage test expectations.
- Initial hosted CI: [run 34769198101](https://github.com/sh1rs/challansakshi/actions/runs/34769198101) passed all 1,626 unit tests and 323 browser tests; two existing EN/HI homepage tests still expected the old eight-link contract. Those expectations now include the five new guide/About links, preserving all prior layout and privacy checks. Both corrected tests passed against the final live site in 4.4 seconds. Final hosted CI [run 34769854416](https://github.com/sh1rs/challansakshi/actions/runs/34769854416), attempt 1, completed **successfully** for exact application commit `856654f801754df2b075485f6c1f2185cadab69c`: **105 unit files / 1,626 unit and integration tests**, plus **325 browser tests**, all passed. The browser suite finished in 7.5 minutes with no retry or failed-case lines. Typecheck, lint, production dependency audit and production build also passed. Final CI completed at 17:01 UTC. Only this release record and public-discovery documentation changed afterward; the evidence-only commit uses `[skip ci]`.

## Google status

The URL-prefix property remains verified through the existing public HTML tag. Google already reported the homepage indexed during this launch session. Both Manual actions and Security issues now report **No issues detected**; performance and aggregate indexing reports are still processing.

After this deployment, `/sitemap.xml` was submitted again because its URL set changed. Google confirmed **Sitemap submitted successfully**, **Success**, and **15 discovered pages**, up from 11. A discovered page is not necessarily indexed.

Google’s live test of `/guides` reported **URL is available to Google**, **Page can be indexed**, and **1 valid breadcrumb item**. Its first individual indexing request returned a temporary Google submission error; after the successful live test, one retry was accepted into the priority crawl queue. Individual indexing requests for all three articles (`/guides/wrong-e-challan`, `/guides/fastag-wrong-deduction`, and `/guides/fake-challan-message`) were also accepted into the priority crawl queue. All four new URLs therefore have accepted requests, in addition to the successfully processed sitemap. The earlier homepage and About indexing requests were not repeated. This request acceptance does not mean the guides are already indexed.

## Evidence and maintenance

Local evidence: `/tmp/challansakshi-seo-deploy.log`, `/tmp/challansakshi-seo-contrast-deploy.log`, `/tmp/challansakshi-seo-active-deployment-final.log`, `/tmp/challansakshi-seo-unit-final.log`, `/tmp/challansakshi-seo-live.log`, `/tmp/challansakshi-seo-live-phone.log`, `/tmp/challansakshi-seo-mobility-live.log`, and `/tmp/challansakshi-seo-visual/`. Full final CI evidence is in `/tmp/challansakshi-final-ci-856654f-summary.json`, `-run.json`, `-jobs.json` and `-job.log`. These are session-local paths, not repository assets.

Keep the original `publishedAt` when revising articles. Update `updatedAt` only after substantive content/source review. Official references are explanatory sources, not promises of eligibility, available filing routes or legal outcomes. The existing October 2 route-evidence expiry remains unchanged.

Google controls recrawl timing, rankings, snippets, sitelinks, favicon appearance and AI inclusion. Its [recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) describes days-to-weeks timing and discourages repeating identical requests. Its [AI-feature guidance](https://developers.google.com/search/docs/appearance/ai-features) uses normal search eligibility; no special LLM file guarantees inclusion. The project's text summaries supplement the visible public content.
