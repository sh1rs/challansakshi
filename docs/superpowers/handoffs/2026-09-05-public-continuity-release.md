# Public source and citizen continuity release — 5 September 2026

The user authorized committing and pushing all project work/history to a new public `sh1rs/challansakshi` repository and confirmed that new features should work without a backend. The public repository now contains the finished product and preserved development history. Main and the historical extension branch were both pushed and their remote tips matched the local commits.

## Application release

- Live site: https://challansakshi.sh1rs.com
- Product source commit: `3fec276775e5db9beafbd3b0399fc04efdea166e`
- Active Worker version: `4787455a-a026-44ee-bf52-c4908474af91`, confirmed at 100% traffic.
- Deployment: `2026-09-05T13:17:09.453Z` (18:47:09 IST).
- Previous version: `9b548b97-34a2-42de-a510-eb35f875cfa4`.
- Both public analysis/upload feature flags remain false; no backend, cloud inference or new paid service was enabled.

## Completed additions

1. The private checklist groups open tasks by their chosen date and shows overdue/today/upcoming states. A dated task can be downloaded as an all-day `.ics` calendar file. There is no automatic notification or claimed legal deadline; users manage calendar notifications and copies themselves.
2. The checklist exports its existing minimal metadata as an unencrypted JSON backup. Restore validates the exact schema, at most 40,000 bytes and 20 tasks, previews the proposed list, then requires explicit full replacement. Export and restore preserve the original 90-day expiry. Unknown fields, malformed/expired data, duplicate identities and invalid dates are rejected. Wall-clock expiry, stale tabs and late file reads cannot bypass the private-device gate.
3. Prepared document/reply notes now offer **Print or save as PDF** after a private-device choice. Only the existing prepared note and a prepared/not-submitted label appear. A temporary inert text-only root is cleared after printing, pagehide, source/device changes, clear, error or unmount. Ordinary shared-device print protection remains. Actual browser PDF output was checked; native operating-system print dialogs were not automated.
4. Only pinned OCR/PDF software assets receive seven days of browser caching. Citizen documents and notes are outside those headers. A small same-origin wrapper closes an otherwise unreachable Tesseract bootstrap worker on failure, and the reader reports fixed recovery text promptly. Model and English/Hindi coverage are unchanged.
5. Privacy and README wording explain exported-file persistence, calendar sync under external settings, and the difference between a publicly reachable prototype and verified operational readiness.

## Verification

- **1,024 unit tests in 66 files passed**; whole-project TypeScript and ESLint passed.
- **68/68 local browser scenarios passed in one complete run**, covering existing journeys plus the additions above.
- **16 targeted production scenarios verified**: the initial run passed 14 and two OCR tests exceeded budgets while downloading public assets. Their assertions now start the recovery deadline after the deliberately injected download failure; both passed on rerun. Only the browser test changed after the product commit, so no application redeployment was needed.
- Live document probe: **PASS**, eight routes, actual image OCR and independent PDF comparison. Image reading alone took **17,424 ms**; reading plus correction/screenshots took **17,790 ms**; PDF reading/review took **2,566 ms**. This environment-specific observation is not a general speed guarantee or a controlled speedup benchmark.
- The live probe observed zero document-body requests, zero fixture-identifier requests and zero IndexedDB/local/session records in the document flow.
- The deployed reader wrapper is byte-identical to the tested local file. Reader and PDF worker responses returned HTTP 200 with `Cache-Control: public, max-age=604800`.
- Independent reviews covered strict backup schemas, action-time privacy expiry, worker lifecycle, cache scope, and private print isolation.

Evidence lives in `qa/citizen-continuity-release-2026-09-05/`. Original raw logs remain in `/tmp`; published text logs only normalize trailing whitespace. Screenshots and the print PDF use fabricated QA data.

## Git and publication

The first implementation commit captures 140 files, including the previously uncommitted toolkit and authored synthetic demo assets. A follow-up checkpoint contains this evidence and the production-aware OCR test deadline. Earlier release handoffs are historical snapshots, so their old uncommitted status does not describe the current checkpoint.

The existing history was preserved. A heuristic scan checked 855 historical text blobs across 107 existing commits for recognized private keys, common API tokens, bearer literals, JWTs and passworded database URLs; no matches were found. This is not a guarantee of secret absence. `.env.example` is the only tracked environment-file path. The local compatibility-date override and private operational logs remain outside the public commits; the protected older audit directory remains untouched and ignored. No root project licence was invented.

`origin` is `https://github.com/sh1rs/challansakshi.git`. GitHub Desktop is authenticated for `sh1rs`; its native folder chooser successfully added this checkout after direct path-entry automation failed. The public repository's visibility and user administrator/push permissions were verified through the GitHub connector. GitHub Desktop performed the authenticated pushes. The connector itself returned HTTP 403 for reference creation on this new repository, so configure its repository grant before relying on connector write operations; user permissions do not establish that integration grant. The published main tip was verified at `46efc68118f9627efdad54f2391d30bf09874f53`, and `codex/challansakshi-extension-task4` at `0c9f27c3b575f3695fe71e2d86ef4beac34b555b`, before this final documentation checkpoint. Together they contain all 109 preceding local commits, including the three historical extension commits outside main. This checkpoint adds the publication record. The local compatibility-date override is restored from its byte-identical backup after branch publication.

Accounts, automatic sync, cloud vision, official integrations, delivery services and independent Hindi review remain separate follow-on work. The user explicitly selected backend-free delivery for this round.
