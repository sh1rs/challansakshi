# Official-route reverification — 2026-09-03

Status: retained sanitized route-and-purpose evidence only. This report is not release approval, government authorisation, adapter approval, an uptime result, or an accessibility audit.

## Method and data boundary

- Verification mode: non-submitting.
- Reverified at: `2026-09-03T04:47:00+05:30`.
- Registry version: `challansakshi.official-routes/v1`.
- Registry coverage: 9 logical registry records across 7 unique allowlisted URLs.
- Data entered: none.
- Identifiers used: none.
- Submission attempts: none.
- Form interaction: none; no field was filled, changed, declared, uploaded, authenticated, or submitted.
- URLs visited: the seven compile-time allowlisted URLs only. No citizen, case, message, OCR, redirect, or query value supplied a destination.
- Retained browser artifacts: no HAR, request log, tokenized URL, cookie, portal form value, or browser-history export. No citizen or case material, test-account data, CAPTCHA, OTP, credential, payment value, attachment, or declaration was entered or retained.
- Evidence retained here: sanitized route, domain, visible purpose, registry metadata, and release-boundary observations. No screenshot was created or retained during Task 7 Steps 1–3; the [completed browser and fidelity QA report](public-handoff-browser-qa-2026-09-03.md) records the separate local web-product gate without upgrading these route observations.

Live route and purpose reverified 2026-09-03; availability and accessibility observations are smoke checks, not service guarantees or accessibility certification.

## Route-by-route registry record

The verifier string and evidence references below reproduce the checked-in registry. `current` describes the dated route record only; it does not make a destination action-ready for every jurisdiction and cannot enable a public release or adapter.

| Registry record | Type | Literal allowlisted URL | Observed domain | Observed purpose | Verifier | Reverified at | Registry version / evidence reference | Release state | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fallback:national-services-directory` | `fallback` | `https://echallan.parivahan.gov.in/index/challan-services` | `echallan.parivahan.gov.in` | `official-services-directory` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-services-directory` | `current` | This record is the retained fallback. |
| `auxiliary:national-record-lookup` | `auxiliary` | `https://echallan.parivahan.gov.in/index/accused-challan` | `echallan.parivahan.gov.in` | `official-record-lookup` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-record-lookup` | `current` | No record fallback; safe stop. |
| `auxiliary:nextgen-service-landing` | `auxiliary` | `https://echallan.parivahan.nic.in/challan/challan-services` | `echallan.parivahan.nic.in` | `official-service-landing` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#nextgen-service-landing` | `current` | No record fallback; safe stop. |
| `auxiliary:national-services-directory` | `auxiliary` | `https://echallan.parivahan.gov.in/index/challan-services` | `echallan.parivahan.gov.in` | `official-services-directory` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-services-directory` | `current` | No record fallback; safe stop. |
| `auxiliary:virtual-courts` | `auxiliary` | `https://vcourts.gov.in/virtualcourt/index.php` | `vcourts.gov.in` | `official-court-service` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#virtual-courts` | `current` | No record fallback; safe stop. |
| `handoff:legacy` | `handoff` | `https://echallan.parivahan.gov.in/gsticket` | `echallan.parivahan.gov.in` | `official-grievance-service` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#legacy-grievance` | `current` | `https://echallan.parivahan.gov.in/index/challan-services` |
| `handoff:nextgen` | `handoff` | `https://echallan.parivahan.nic.in/grievance` | `echallan.parivahan.nic.in` | `official-grievance-service` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#nextgen-grievance` | `current` | `https://echallan.parivahan.gov.in/index/challan-services` |
| `handoff:delhi-manual` | `handoff` | `https://traffic.delhipolice.gov.in/` | `traffic.delhipolice.gov.in` | `official-service` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#delhi-official-landing` | `current` | `https://echallan.parivahan.gov.in/index/challan-services` |
| `handoff:unresolved` | `handoff` | `https://echallan.parivahan.gov.in/index/challan-services` | `echallan.parivahan.gov.in` | `official-service` | ChallanSakshi release-route review | `2026-09-03T04:47:00+05:30` | `challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-services-directory` | `current` | `https://echallan.parivahan.gov.in/index/challan-services` |

## Sanitized observations

- The expected official domains and purposes held for all seven unique URLs.
- The national legacy `gsticket` route remained truthful as an official grievance destination, but the production Legacy jurisdiction tuple remains empty. No production jurisdiction can resolve to it, and this observation does not change that safe stop.
- The NextGen grievance destination remained truthful; 27 jurisdiction codes matched the NextGen registry scope.
- The Delhi landing was JavaScript-dependent and remained truthful only as a manual official landing. There is no form-adapter claim, category mapping, description-field claim, or attachment claim for Delhi.
- The unresolved handoff and the separately represented national directory records remained truthful as official-service/directory routes.
- The national record lookup remained truthful for record lookup, but its continuation led toward CAPTCHA, OTP, and payment surfaces. Nothing on those surfaces was entered or submitted, and ChallanSakshi does not handle them.
- The NextGen services landing, Virtual Courts service, and national fallback remained truthful for their recorded purposes. Auxiliary routes are not grievance adapters.
- Automated crawler attempts for NextGen and directory routes timed out or returned HTTP 502 while the interactive browser loaded them. That difference is recorded only as an availability smoke observation; a timeout, challenge, redirect, unavailable response, or purpose/domain drift is a safe stop, never authority to substitute another route.

## Release effect

This report cannot enable a public release or adapter. The web code remains a public-beta candidate presented to people only as a non-public prototype. The complete in-tab field pack and transparent official anchor remain the universal path. The real Legacy and NextGen extension adapters remain `internal-disabled`, the checked-in extension release remains `production-disabled`, and the Delhi/unresolved routes make no form-compatibility claim. Any future adapter or public release still requires every separate operational, legal, authorisation, current DOM/native-setter/no-event, Store, privacy, security, accessibility, monitoring, rollback, and ownership gate.
