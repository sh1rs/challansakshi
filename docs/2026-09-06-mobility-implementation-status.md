# Mobility implementation status — 6 September 2026

This is the earlier increment's snapshot, before the autonomous expansion began at 16:00 IST. See [the continuing build report](./2026-09-06-autonomous-build-status.md) for the newer case team, helper access, corrections, assistance lab and optional AI work. The earlier test counts below are retained as historical evidence.

This increment connects the existing guest document review to persistent mobility cases and an optional account backend. The implementation is local source work; no deployment or live Google/D1 configuration was performed in this increment.

## Implemented

| Capability | Working behavior |
| --- | --- |
| Document review → saved case | Retains source-linked readings, clearly marked uncertainties and citizen corrections. Builds an editable request from confirmed values. Preserves edits when display language or device choice changes. |
| Jurisdiction assistance | Suggests a state only from an unambiguous explicit issuer/state label in the notice. Neither registration prefixes nor current GPS establish the issuing authority. |
| Guest mobility workspace | `/mobility` accepts the person's description, suggests supported services, offers ambiguity choices and creates an editable preparation plan. No account required. |
| Service preparation | Nine service types: challan review/payment/payment status, FASTag, licence application/renewal, ownership transfer, lost documents and moving state. Links to official information; it does not execute these official services. |
| Life-event starters | Learning to drive, buying/selling a vehicle, moving home and lost documents. Opens relevant preparation cases; multi-service situations remain separate cases. |
| Case continuity | Explicit private-device save; up to 50 cases; 90-day expiry on next access; edit, reopen, export, per-case deletion and clear-all. Opaque resume IDs stay in URL fragments. |
| Timeline and next action | Local preparation events, citizen-reported progress/reference, personal follow-up dates and attention ordering. A report is never promoted to independently verified official status. |
| Reusable profile | Chosen name, address, language and vehicle details. Selected details are reviewed before reuse in a working case. Existing cases and official records do not silently change. |
| Appointment pack | Records the user's actual booking date/time, venue and copied instructions; downloads a private visit note with case details. Does not book or verify a slot. |
| Optional account implementation | Google OAuth with browser-bound state and PKCE, secure hashed sessions, D1 schema and owner-scoped case/profile CRUD. Account remains unavailable until configured. |
| Explicit account transfer | Review a complete case or profile before uploading; check server revisions; download/import a reviewed device copy; separately delete account copies or the account. Import refreshes local retention. |
| Recovery and consistency | Reject stale saves after another tab changes/deletes a case; remove deleted cases from active views; preserve typed updates after validation errors; reset ready preparation after fact/jurisdiction changes. |
| Display language | English/Hindi preference survives navigation and reload; existing multilingual voice functionality is preserved. |

Setup instructions: [mobility-account-setup.md](./mobility-account-setup.md).

## Original-concept work that remains

| Capability | Current boundary / next dependency |
| --- | --- |
| Real account sign-in and cross-device pilot | Code is implemented. Create Google OAuth credentials and a D1 database, apply the migration, set private Worker secrets, then verify two real accounts. |
| Phone OTP and passkeys | Not implemented in this increment. Google sign-in is the initial alternative that avoids SMS delivery costs. |
| DigiLocker / API Setu | No approved integration or document access. Provider onboarding, permitted retention and actual credentials remain prerequisites. |
| Private cloud browser | No cloud session service, protected user takeover or remote official workflow has been implemented here. Existing local/synthetic helper capabilities do not prove this. |
| Official execution and receipts | No automated government application, payment, grievance submission or verified receipt capture. Current service cards are preparation plans with official handoff. |
| Background official updates | No authorized polling/webhook adapters, automatic challan discovery or independently checked official statuses. Follow-up dates are personal reminders shown when the user returns. |
| Notification delivery | No SMS, email or push sender activated. |
| Trusted helper access | No remote task-scoped invitation, permission expiry or revocation system. Existing co-present assistance remains separate. |
| Corrections across multiple drafts | Users can review and reuse corrected profile values in a selected unfinished case. There is no batch propagation preview across all affected drafts. |
| Jurisdiction-specific workflows | No universal requirements, eligibility, deadlines or fees inferred from a generic service plan. Each live adapter needs current official sources and real testing. |
| Outcome and effort evidence | No claim of a live official-service pilot or demonstrated reduction in citizen time. User studies, privacy-conscious effort measurements and verified completion outcomes remain to be collected. |

## Verification record

The backend tests exercise the migration and real SQL conditions using an in-memory SQLite adapter; Google responses are controlled fixtures. Browser account transfer tests use fabricated profiles/cases and intercepted account endpoints. Neither proves a live provider connection. The document-to-case browser test uses an actual fabricated PDF and the application's local PDF reader.

- Full automated suite: 1,227/1,227 tests passed across 78 files.
- Full TypeScript check and full ESLint: passed.
- Production Vinext build including `/mobility`, `/account` and the Worker: passed. The build reports its existing static-route classification limitation and plugin timing notices.
- Browser coverage: all 89 scenarios have passing results across the full run and focused reruns. Initial failures were obsolete navigation/language-storage expectations, two new profile locator assertions, and a Playwright artifact-directory collision between concurrent runs. These were corrected and rerun; there are no unresolved scenario failures.
- Final affected browser rerun: 32/32 passed. Workspace regression suite: 4/4 passed. Profile-account transfer suite: 3/3 passed. The remaining 50 scenarios passed in the full run.
- Mobile screenshots inspected for the workspace, Hindi entry and profile review. No horizontal overflow observed at 390 × 844. Existing 320/375 px geometry and voice tests passed in the full run.
- `git diff --check`: passed. Changes remain uncommitted on `codex/screen-aware-voice-coach`; no deployment was performed.
