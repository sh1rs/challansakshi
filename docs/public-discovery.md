# Public search and machine discovery

The public origin is `https://challansakshi.sh1rs.com`. Canonicals intentionally use that origin even when the app runs in a local or preview build. `lib/site-seo.ts` is the source for public titles, descriptions, canonical URLs, Open Graph/Twitter metadata, the sitemap and project structured data.

## Implemented surfaces

- Public tools and information pages have individual titles, descriptions and absolute canonicals. `/toll` identifies `/fastag` as its canonical version.
- `/about` is a rendered English/Hindi project overview with common questions, creator credit and the explicitly approved product feedback contact.
- `/guides` introduces three English/Hindi guides for a wrong e-Challan, a questioned FASTag deduction and a suspicious challan message. Each has a direct answer, checklist, practical steps, reviewed official references, a preparation-tool link and Article/Breadcrumb structured data. The English articles are readable in initial HTML without JavaScript. Hindi is an interface preference on the same canonical URL, not a separate indexed language route.
- The homepage links directly to every guide and gives an explicit "What is ChallanSakshi?" definition. `/about` uses the same brand question and links to the public GitHub source; the Organization graph identifies that repository as another project presence.
- `/mobility` renders a useful public introduction before the private case editor initializes. This is the normal first-load view for all visitors, and it includes no saved cases or private IDs. Four native tool/directory links remain usable without JavaScript.
- The homepage supplies `WebSite`, independent project `Organization`, creator `Person` and free `WebApplication` JSON-LD. The preferred spelling is `ChallanSakshi`; `ChallanSakshi by sh1rs` and the lowercase hostname are consistent alternate names. The homepage introduction also names the project and explains its public use. There are no invented awards, reviews, case-success claims, government affiliations or search actions.
- `/robots.txt` allows public crawling and excludes `/api/`. Account, trusted-helper, saved-checklist, unpublished-extension and synthetic-demo pages use `noindex`. They are not blocked in robots.txt, because crawlers must be able to read the noindex directive.
- `/sitemap.xml` lists the maintained public canonical pages. It does not manufacture modification dates on each request.
- `/llms.txt`, `/llm.txt` and `/llms-full.txt` provide a text overview with source links and operating boundaries. The two short spellings share one generator; the longer document includes the same FAQ content as `/about`.
- Explicit SVG/ICO/96px favicon, Apple touch icon, 192px/512px app icons, maskable icon and `/manifest.webmanifest` support browser identity and home-screen shortcuts. A manifest is not an offline service-worker implementation.
- The Road & Record identity appears in the stable `/favicon.svg` and raster icon URLs. The project logo is a named 512×512 `ImageObject` at `/brand/logo-square.png`; the application refers to the same image identity. Both `url` and `contentUrl` are provided for consumers.
- `/social-preview.jpg` is the 1200×675 sharing artwork. `scripts/generate-site-icons.mjs` regenerates the production image variants. Keep the PNG/ICO favicon links: Google's current documented favicon formats include these raster formats, while browsers can use the SVG.

## Verification after a deployment

Run `tests/browser/public-discovery.spec.ts` against the live origin using `CHALLANSAKSHI_BASE_URL`. The test checks initial HTML metadata, noindex boundaries, actual text/XML/manifest endpoints, brand asset types/size and a 320px English/Hindi overview interaction. Inspect the rendered page and the share image as well.

Also run `tests/browser/civic-guides.spec.ts` for no-JavaScript article reading, structured data, unknown-guide 404s, persisted language preference and phone navigation. The mobility session tests cover the public no-JavaScript view and the unchanged private-session boundary. When updating a guide, preserve `publishedAt`, change `updatedAt` only after a substantive review, check the linked official references and keep the visible advice aligned with them. Do not mechanically refresh dates or copy historical fees, deadlines or bank-phone lists.

## Owner steps for Google discovery

1. Sign into [Google Search Console](https://search.google.com/search-console/) with the account that manages the site. Select a verified `sh1rs.com` domain property that covers the subdomain, or add the URL-prefix property `https://challansakshi.sh1rs.com/` and complete the verification method Google provides.
2. In **Sitemaps**, submit `https://challansakshi.sh1rs.com/sitemap.xml` and check that Google accepts it. A submitted sitemap helps discovery; it does not establish that its URLs are indexed.
3. In **URL inspection**, inspect `https://challansakshi.sh1rs.com/` and `https://challansakshi.sh1rs.com/about`. Use **Test live URL** to verify that Google can fetch them, then request indexing when available.
4. After Google recrawls, inspect the indexed canonical and rendered page, and review the Page indexing report for exclusions. Search the exact brand and inspect Search Console impressions; a search result alone is not a complete indexing diagnostic.

Search Console verification needs the owner's Google property access or verification token; it cannot be claimed from a website deployment. These steps also request another look at the homepage's updated site name and favicon. Other search engines may offer equivalent webmaster tools. No external indexing request is made by these routes. Do not repeatedly request the same URL to try to force faster indexing.

Search engines decide the displayed title, snippet, favicon, sitelinks and indexing schedule. Text descriptions, structured data and sitemap submission improve discoverability but cannot guarantee indexing, ranking, a knowledge panel, rich results or an AI overview. The machine-readable summary is supplementary and does not grant a crawler access to private data.

On 13 September 2026, an initial web search for the exact brand and site returned the homepage, safety/privacy pages, FASTag and older demo/query URLs with cached content from an earlier release. Later that day, after the owner signed into Google, Search Console verified the URL-prefix property `https://challansakshi.sh1rs.com/` using the public HTML verification tag in `app/layout.tsx`. Keep that tag in place to retain ownership verification.

Google accepted `/sitemap.xml` and reported **Success**, with **11 discovered pages** and a 13 September last-read date. URL Inspection confirmed the homepage was already indexed. Fresh indexing requests for both the homepage and `/about` passed Google's live indexability check and were accepted into the priority crawl queue. The newly published `/about` page was not yet indexed at inspection time; request acceptance is not completed indexing. See [the identity release record](./2026-09-13-identity-release.md) for the final evidence. Crawl requests and discovered-page counts do not guarantee refreshed snippets, rankings or AI overviews.

## Official guidance checked 13 September 2026

- [Google developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers): descriptive page metadata, crawlable links, sitemap discovery and explicit noindex controls.
- [Site names](https://developers.google.com/search/docs/appearance/site-names): `WebSite` name/URL data on the crawlable homepage helps identify the preferred site name.
- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization): accurate name, URL and a crawlable logo help identify the project. Logo images must be at least 112×112px and should remain legible on white; an `ImageObject` needs a valid `url` or `contentUrl`.
- [Favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search): stable, crawlable square brand image; a larger-than-48px raster is recommended. Eligibility is not a display guarantee.
- [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): normal indexing and snippet eligibility apply; no special AI text file or schema is required. The visible content must support structured data.
- [llms.txt community proposal](https://llmstxt.org/): concise Markdown with project facts and described source links is a useful optional discovery format, separate from a search-engine indexing standard.
