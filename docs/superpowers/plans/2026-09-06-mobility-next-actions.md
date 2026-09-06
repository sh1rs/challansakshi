# Mobility next actions and return journeys

The user requested a further intensive local build. Continue the approved guest-first scope without enabling providers or deployment. Extend existing journeys with three independent modules and a session-clear boundary.

## Implementation

1. `AgendaPanel` and `agenda.ts` combine saved-case attention, personal follow-up dates, entered appointments and document reminders into one compact returning-user view. Source freshness stays distinct from an official status. Read current stores; do not create another store. Re-read the exact target immediately before opening it. Refresh on storage, visibility, focus, expiry and midnight.
2. `AcknowledgementPanel` and `acknowledgement.ts` review manually pasted text for explicitly labelled reference/date/amount candidates. Conflicts require a choice; progress is always selected by the citizen. Review an exact bounded timeline note before applying it to the unsaved working case. The workspace validates current working content and saved-source revision before accepting the callback. Raw text stays in memory and is cleared on close, source/case/language changes and session end.
3. `VisitPreparationPanel` and `visit-preparation.ts` replace the existing inline appointment editor. Preserve date/venue/instructions controls. Add selected source-line packing items, optional selected case details, exact text-pack review and a minimal personal calendar preview. No inferred document requirements, booking, slot verification or new persistence.
4. The workspace session boundary exposes a clear action that unmounts all working forms/reviews and removes the active case fragment. A per-tab marker contains only the fact that the session ended, keeps the neutral screen after reload, and is removed by an explicit new session. Saved records, account sessions, other tabs, clipboard and files are separate. If session storage is unavailable the current screen still clears, with an honest reload limitation.

## Ownership

- Agenda domain/UI/tests: case_team.
- Acknowledgement domain/UI/tests: intake_audit.
- Visit preparation domain/UI/tests: profile_corrections.
- Session boundary, workspace integration, combined acceptance and final verification: root.

Agents edit only their independent modules/tests. The root owns `MobilityWorkspace.tsx`, its CSS and existing browser-regression adaptations. Existing uncommitted work is preserved. No git mutation or deployment is part of this pass.

## Acceptance

- [x] Agenda ranking is stable and truthful; completed, deleted and expired records cannot reopen through stale cards.
- [x] Acknowledgement parsing never infers payment/submission success; exact citizen-selected updates remain unsaved until case save.
- [x] Visit pack and calendar require exact review; changed source data revokes approvals; invalid local dates are rejected.
- [x] Session clear removes working values, pending approvals and queued child writes without silently deleting saved records.
- [x] Independent review, focused browser checks, full unit/type/lint/build gates, full browser regression and built-Worker journeys pass.
- [x] English/Hindi mobile and desktop screens are inspected, and a factual local-build handoff records remaining provider limits.

Browser-plugin skill is not installed; use the existing Playwright runner with isolated contexts. Keep the previous built preview on 4180 until the new production build passes. Development runs on 4177. Artifacts belong under `/tmp`; do not access the earlier public-launch audit directory.

## Completion evidence

The [final status report](../../2026-09-06-mobility-next-actions-status.md) records 1,607 unit/integration tests, 313 complete development browser scenarios, 243 final built-Worker scenarios, whole-workspace types/lint, production build, inspected EN/Hindi visuals and the local mobile performance smoke. Independent review added cancellation of queued destructive actions and bounded acknowledgement-context rendering. Built visual QA added a reproduced-and-fixed home-navigation regression. The report distinguishes the earlier full development run from the final rebuilt Worker rerun after that one link change. Port 4180 now serves the final build; development 4177 is stopped. All work remains local and uncommitted.
