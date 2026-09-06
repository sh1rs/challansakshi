# Integrated mobility workspace audit — 6 September 2026

Read-only product audit against the current local workspace on `http://127.0.0.1:4177`. Reproductions used isolated Chromium contexts and synthetic case/profile data. No external requests, deployment, or shared application edits were performed by the reviewer. Findings below were observed before fixes.

Browser evidence: `/tmp/challansakshi-integrated-workspace-audit/findings.json`. Reproduction script: `/tmp/challansakshi-integrated-audit.mjs`. These temporary artifacts are local and are not repository fixtures.

## P2 — An uncommitted progress update can attach to a different case

1. Open an existing saved case.
2. Expand the workspace's inline “Follow-up and what happened” section, type an update, and choose “completed” progress without clicking “Add my update”.
3. Choose “New case”, then “Create my plan”. No unsaved-change confirmation appears.
4. Expand the same section in the new case. The previous case's update and selected progress remain.
5. Add the update and save the new case. Its saved timeline contains the old case's text and its status is completed.

Observed output: `dialogs: 0`, `persistedStatus: "completed"`, and the first case's exact synthetic report persisted under the newly generated case ID.

Source: `components/mobility/MobilityWorkspace.tsx:65-66` keeps these inputs in workspace state; `:120` checks only the case patch dirty flag; `:141-160` does not clear the report/progress when starting a new case. `openCase` clears the report but not its selected progress at `:124`. Review all case identity transitions together, and include uncommitted report inputs in the discard decision. This concerns the inline workspace report, not `FollowUpPanel`.

## P2 — Cross-tab profile changes preserve stale consent and can be overwritten

1. In tab A, open a saved profile and select its name in “Review reusable details”.
2. In tab B, change that name and explicitly save the profile.
3. Tab A's selected checkbox now displays the new name while remaining checked. Applying it records the new value as confirmed without a renewed review.
4. Tab A's sidebar profile editor still contains the old name. Saving it overwrites the newer name without warning.

Observed output: `checkedAfterChange: true`; copied fact has the new value and `confirmed: true`; a later save from the stale editor restores the original profile name.

Source: `components/mobility/MobilityWorkspace.tsx:76-83` updates the profile object but clears the review and editor only when the profile disappears. `:193-205` saves the editor without checking its source snapshot and applies selected keys against the refreshed profile. `lib/mobility/store.ts:367` saves profiles without a revision comparison. Invalidate selected reusable details when their source changes and require a fresh source review before applying them. Guard saving a stale profile editor against the current stored profile without automatically losing newly typed edits.

## P2 — A save across retention expiry discards unsaved work while claiming recovery is available

1. Open a saved case whose last saved timestamp will reach the 90-day retention boundary shortly.
2. Type a new unsaved draft and select the private-device save consent.
3. Advance the browser clock beyond the original saved case's expiry and choose “Save case”.
4. Expiry pruning removes the saved record and emits a store event. The workspace removes its editor and draft before the stale-save error is displayed.

Observed output: no editor remains, the newly typed text is absent, and the expired storage entry is removed. The error nevertheless says “Your working edits are still here. Download a note before reloading if needed.”

Source: `lib/mobility/store.ts:198-208` emits an expiry event during pruning; `:240-248` prunes before checking the expected saved revision. `components/mobility/MobilityWorkspace.tsx:84-87` unconditionally discards the current working patch when the saved record disappears. Its generic error at `:219` claims recovery even after that discard. Preserve the user's new unsaved work in a recoverable in-memory draft when expiry occurs, while keeping the expired stored record deleted and avoiding silent restoration under the expired ID. The reproduction concerns automatic expiry; explicit deletion in another tab needs a deliberate privacy-aware policy.

## Resolution verified locally — 6 September 2026

All three findings above are fixed in the current [MobilityWorkspace implementation](../components/mobility/MobilityWorkspace.tsx). The original reproductions and line references are retained as the record of the pre-fix state. Two related regressions were also fixed during integration: clearing private profile data across tabs, and carrying an earlier task's manually entered authority into a later task.

- **Unadded report and progress:** both values belong to the current case ID and participate in the unsaved-change guard. Declining a case switch preserves them; accepting it clears them and the new case's save consent. Changing only the selected progress also triggers the guard. Saving a new plan cannot attach the previous case's report or mark the new plan completed from that old selection.
- **Changed reusable profile:** a newly saved profile clears checked reuse selections. Working profile edits remain visible with an explicit conflict and reload action; saving the stale editor is blocked. Immediately before saving a profile or applying reviewed fields, the workspace compares the original source with current storage. A missed storage event therefore cannot bypass fresh review or overwrite the newer profile.
- **Automatic case expiry:** a trusted same-tab `cases` / `expire` event preserves the unsaved editor and unadded report in memory, clears consent and blocks normal saving under the expired ID. **Download recovery note** includes the edited request and clearly labeled unadded update. The expired storage record stays removed. Explicit case deletion in another tab instead clears the dirty editor/report, without offering a recovery copy or falsely claiming that edits remain.
- **Clear-all profile privacy:** when the saved profile disappears, the other open tab clears both saved values and unsaved profile edits, reuse selections and consent. It also clears the deleted case editor. A citizen can deliberately create a fresh profile afterward without bringing back the removed address or vehicles. This deletion behavior is separate from preserving working edits when a profile is updated.
- **Prior intake jurisdiction:** creating a plan consumes and clears its intake state; starting another case resets the previous task's manual authority and reviewed intake. The regression starts with Delhi, then reviews Karnataka for a new reference and confirms that Karnataka is the new case's authority and confirmed jurisdiction fact. The prior Delhi input cannot silently override it.

The focused [workspace-conflicts browser suite](../tests/browser/mobility-workspace-conflicts.spec.ts) contains **nine executable checks**:

| Check | Browser and storage evidence |
| --- | --- |
| Unadded report/progress across New case | Decline and accept the discard prompt; new plan starts with empty report/default progress and fresh consent, and saves as preparing without the old report. |
| Progress-only saved-case switch | Changing just the progress selection triggers the guard and resets the next case's report/progress inputs. |
| Real cross-tab profile update | Checked reuse clears, working profile text remains, stale profile saving is disabled, and deliberate review/reload uses the latest saved values. |
| Missed profile event before use | Applying previously reviewed fields is rejected when storage changed without an event; case facts remain untouched. |
| Missed profile event before save | A stale working profile cannot replace the newer saved profile; working text remains available. |
| Save across automatic expiry | Expired ID is removed; new draft and unadded report survive, normal save is disabled, the downloaded recovery note contains both, and a new case requires fresh consent. |
| Explicit case deletion in another tab | Dirty case details and unadded report disappear; no recovery download or inaccurate preservation claim remains. |
| Clear-all in another tab | Saved and unsaved profile fields and consent clear; storage is empty for the profile, and an explicit fresh save does not restore deleted values. |
| New-task authority carryover | A previous Delhi task cannot override the next task's reviewed Karnataka authority; the saved new reference and jurisdiction fact agree. |

The two missed-event variants are separate checks generated by one parameterized test. Verification uses isolated Chromium contexts, fabricated cases/profiles and the existing local preview at `http://127.0.0.1:4177`. Re-run with:

```sh
CHALLANSAKSHI_BASE_URL=http://127.0.0.1:4177 node node_modules/@playwright/test/cli.js test tests/browser/mobility-workspace-conflicts.spec.ts --config=playwright.config.ts --output=/tmp/challansakshi-workspace-audit-resolution-results
```

The focused resolution run passed **9/9 checks**. Its local artifact directory is `/tmp/challansakshi-workspace-audit-resolution-results`, including the recovered note and expiry screenshot. This establishes local regression coverage, not production availability or deployment. It does not constitute a full mobile, accessibility, live-provider or official-service evaluation.

## Coverage and limits

These three cases were reproduced with browser assertions and persisted synthetic data inspection, not inferred only from source. The review did not repeat the separate portable-case or source-fingerprint suites, and it excluded the other agents' in-progress follow-up and reply-case bridge work. Prior focused source-check verification covered Hindi at 320 px; this bounded audit does not claim complete mobile or accessibility coverage.

An independent module and small review panel can reduce repeated typing by extracting only explicitly labeled references, standard vehicle registrations, and explicitly named states from the user's task text. Such values should remain citizen-entered text and require visible review; they must not imply document verification or jurisdiction inferred from a plate prefix. Workspace mounting and case creation should remain owned by the coordinating agent.
