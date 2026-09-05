# Official route maintenance

The public `/sources` page and read-only `/api/official-routes` endpoint project the maintained registry in `lib/official-destinations.ts`. They expose only public service metadata. Neither accepts citizen information or performs a record lookup.

“Available” means the retained route review is current under the existing registry's expiry policy. It does not mean an uptime check just passed, that a particular case is supported, or that a government connection exists. A stale review displays “Needs recheck” and its outgoing link is disabled. The legacy grievance route remains reference-only because no issuing jurisdiction is approved for it. Expiry dates are maintenance dates, not filing deadlines.

## Run a read-only reachability check

Run `npm run check:official-routes` (or `node scripts/check-official-routes.mjs`). It uses only exact HTTPS URLs loaded from the maintained registry. It accepts no URL input and follows no changed redirect. Each route has an eight-second request budget, with a hard maximum of fifteen seconds and bounded identical-URL redirect handling. Queries, page content and response cookie headers are not stored.

A dated JSON observation report is written under `qa/official-route-checks/`. Exit code 1 means at least one URL did not return a successful response or requires manual redirect review. A blocked or failed request describes what this environment observed; it does not prove citizen-facing downtime. The checker never changes the registry, verifies service purpose, creates an issue, sends a message or installs a schedule.

## Review purpose before changing dates

A maintainer must inspect the official page and retain evidence for its exact URL, purpose, issuing-jurisdiction coverage and any claimed form capabilities. Compare redirected host and path against the expected service. Confirm the fallback independently. Only then update a registry record through a reviewed code change. A successful HTTP response cannot extend the review dates.

## Observation on 5 September 2026

The network-enabled check at 11:29 UTC received HTTP 200 from the national record lookup, national services directory, Virtual Courts and legacy grievance URLs. The two NextGen URLs failed from this environment and the Delhi landing page timed out. The report is `qa/official-route-checks/2026-09-05T11-29-45-182Z.json`. An earlier sandbox-only run recorded seven network failures and is retained separately as environment evidence.

No purpose review or routing-scope update was performed. All retained registry review dates remain 2 September 2026, with review expiry on 2 October 2026. The reachable legacy URL remains ineligible for automatic jurisdiction routing.

The browser test covers the mobile Hindi page, public endpoint, expandable provenance, and removal of outgoing links after review expiry. Unit tests cover fixed metadata projection, fail-closed clocks, redirects, timeout handling and the distinction between reachability and purpose verification. Synthetic document property tests exercise source ordering, formatting, missing/uncertain evidence, duplicate-document correction and photograph-role isolation across 48 reproducible inputs each.
