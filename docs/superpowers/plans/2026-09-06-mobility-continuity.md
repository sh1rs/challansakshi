# Mobility continuity build

The user renewed autonomous implementation after the earlier two-hour window. This is a new local build pass; the earlier heartbeat remains paused.

## Design and scope

Make returning to road-mobility tasks easier without a provider account. Four bounded modules extend the existing workspace. Keep them collapsed by default and preserve guest use, English/Hindi, source review, private-device consent and deletion. No cloud services or official actions are enabled by this plan.

1. A document-expiry organiser stores citizen-entered dates and their source/check date, with personal calendar export. It never calculates a statutory deadline or claims to send background notifications.
2. Connected life-event plans explicitly link saved cases. A plan stores references rather than copying case facts, derives progress from current cases, and gives optional preparation guidance rather than inferred legal dependencies.
3. An official-form copy panel exposes selected, reviewed values and per-field clipboard actions. It never invents official field mappings or claims to fill or submit a portal.
4. Conflict recovery compares current working details with the latest saved case. The citizen can carry selected editable details into a new working draft based on that exact latest version; saved history and reported outcomes remain authoritative within the local record. No silent overwrite or auto-merge.

Separate local stores for organiser and linked plans use strict schemas, bounded capacity, 90-day inactivity retention, optimistic revision checks and explicit clear-all integration. Per-case copy and conflict review remain in memory and reset on source changes.

## Ownership and acceptance

- [x] Document organiser domain/store/UI/tests — profile_corrections.
- [x] Linked plan domain/store/UI/tests — case_team.
- [x] Form copy domain/UI/tests — intake_audit.
- [x] Conflict comparison/recovery domain/UI/tests — root.
- [x] Workspace integration, clear-all behavior and cross-feature review — root.
- [x] Focused tests, full type/lint/unit checks, build and relevant browser regressions.
- [x] Actual mobile visual checks and factual updated handoff.

Validation must cover stale versions, explicit deletion, retention, change of active case/language, storage failure, clipboard failure, narrow screens, and honest separation between citizen-entered dates/progress and official proof. Existing tests are regression evidence and must not be described as live provider or government verification.

## Completion evidence

All four modules are integrated and independently reviewed. Final gates passed: 1,540 unit/integration tests in 99 files; 257 complete development-browser scenarios; 187 mobility/correction scenarios on the built local Worker; whole-workspace TypeScript and ESLint; production build; and whitespace validation. English/Hindi visual checks at 320px covered the expanded panels, dark-mode contrast, button size, network silence and recovery in page context. The combined browser journey creates and links cases, starts renewal preparation from a citizen-entered date, withholds unconfirmed copied facts, and clears all local organisers across tabs.

Review corrections included immediate UI expiry while cleanup waits for a lock, cancelled queued saves, exact-case expiry recovery, and exclusion of explicitly deleted cases even when an unrelated record expires. The final clear-all regression waits for asynchronous storage deletion rather than asserting immediately after the click. Documentation now distinguishes expiry from dormant-storage deletion and accurately scopes shared-device protections and Web Locks compatibility.

The [current status report](../../2026-09-06-mobility-continuity-status.md) records evidence paths, rerun commands, provider dependencies and the uncommitted/local-only release boundary. The prior heartbeat stays paused; no provider or public deployment was enabled.
