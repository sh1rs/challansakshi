# Public search and machine discovery

The public origin is `https://challansakshi.sh1rs.com`. Canonicals intentionally use that origin even when the app runs in a local or preview build. `lib/site-seo.ts` is the source for public titles, descriptions, canonical URLs, Open Graph/Twitter metadata, the sitemap and project structured data.

## Implemented surfaces

- Public tools and information pages have individual titles, descriptions and absolute canonicals. `/toll` identifies `/fastag` as its canonical version.
- `/about` is a rendered English/Hindi project overview with common questions, creator credit and the explicitly approved product feedback contact.
- The homepage supplies `WebSite`, independent project `Organization`, creator `Person` and free `WebApplication` JSON-LD. There are no invented awards, reviews, case-success claims, government affiliations or search actions.
- `/robots.txt` allows public crawling and excludes `/api/`. Account, trusted-helper, saved-checklist, unpublished-extension and synthetic-demo pages use `noindex`. They are not blocked in robots.txt, because crawlers must be able to read the noindex directive.
- `/sitemap.xml` lists the maintained public canonical pages. It does not manufacture modification dates on each request.
- `/llms.txt`, `/llm.txt` and `/llms-full.txt` provide a text overview with source links and operating boundaries. The two short spellings share one generator; the longer document includes the same FAQ content as `/about`.
- Explicit SVG/ICO/96px favicon, Apple touch icon, 192px/512px app icons, maskable icon and `/manifest.webmanifest` support browser identity and home-screen shortcuts. A manifest is not an offline service-worker implementation.
- `/social-preview.jpg` preserves the existing 1200×675 brand artwork at approximately 97 KB. `scripts/generate-site-icons.mjs` regenerates brand variants from the existing SVG and social PNG.

## Verification after a deployment

Run `tests/browser/public-discovery.spec.ts` against the live origin using `CHALLANSAKSHI_BASE_URL`. The test checks initial HTML metadata, noindex boundaries, actual text/XML/manifest endpoints, brand asset types/size and a 320px English/Hindi overview interaction. Inspect the rendered page and the share image as well.

If the owner has a verified Google Search Console property for the site, submit `https://challansakshi.sh1rs.com/sitemap.xml`, inspect the home and About URLs, and request indexing. Search Console verification needs the owner's Google property access or verification token; it cannot be claimed from a website deployment. Other search engines may offer equivalent webmaster tools. No external indexing request is made by these routes.

Search engines decide the displayed title, snippet, favicon, sitelinks and indexing schedule. Text descriptions, structured data and sitemap submission improve discoverability but cannot guarantee indexing, ranking, a knowledge panel, rich results or an AI overview. The machine-readable summary is supplementary and does not grant a crawler access to private data.

On 13 September 2026, a web search for the exact brand and site returned the homepage, safety/privacy pages, FASTag and older demo/query URLs. The cached content described an earlier release. This establishes existing web-search discovery in that check, not Google-specific ranking or a refreshed snippet. Updated descriptions, canonical URLs and demo `noindex` directives take effect in results only after the relevant engine recrawls them. Search Console opened signed out in the available browser, so no sitemap submission or indexing request was made.

## Official guidance checked 13 September 2026

- [Google developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers): descriptive page metadata, crawlable links, sitemap discovery and explicit noindex controls.
- [Site names](https://developers.google.com/search/docs/appearance/site-names): `WebSite` name/URL data on the crawlable homepage helps identify the preferred site name.
- [Favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search): stable, crawlable square brand image; a larger-than-48px raster is recommended. Eligibility is not a display guarantee.
- [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): normal indexing and snippet eligibility apply; no special AI text file or schema is required. The visible content must support structured data.
- [llms.txt community proposal](https://llmstxt.org/): concise Markdown with project facts and described source links is a useful optional discovery format, separate from a search-engine indexing standard.
