# ChallanSakshi Assisted Handoff extension framework

This subtree is an isolated Manifest V3 tooling scaffold for two mutually exclusive internal builds:

- `synthetic-development` contains only the fictional loopback source and destination profile.
- `production-disabled` contains the production source identity and disabled Legacy/NextGen route identities. It has no enabled real adapter.

Neither artifact is a public release, a Chrome Web Store candidate, government-authorised software, or evidence that a real official form can be filled. The installation-free web handoff remains the complete supported path.

The root scripts build one profile at a time into `extension/dist/<profile>/`. `build:all` includes only the web build and `production-disabled`; it never emits the synthetic profile. Generated package, browser, and release outputs are ignored. Authored extension source and tests remain in root lint scope.

Loaded-package automation and the separate physical action-icon evidence gate are intentionally distinct. The strict loaded-package lane requires Chromium 152 or later. The required headed branded Google Chrome 152-or-later action-icon walkthrough is still blocked on the currently recorded Chrome 151 host and cannot be replaced by direct popup navigation or synthetic unit tests.

## Candidate and release states

- **Implemented and unit/JSDOM proven:** manifest/profile tooling, source authority, destination adapters and fill plans, crash-safe session and safety ledger, closed messaging lifecycle with the payload-lifetime static proof, and the consent-first bilingual popup (Tasks 1–6, each independently reviewed).
- **Synthetic proof surface:** the fictional loopback adapter remains the only enabled destination; JSDOM isolated-realm tests prove the synthetic fill mutates only category/description with zero protected reads, clicks, submits, navigation, or network.
- **Real adapters:** Legacy and NextGen identities remain `internal-disabled`, selector-free, with `verification-evidence-missing`; nothing here authorizes enabling them.
- **Production-disabled candidate:** `extension/scripts/package.mjs` validates `extension/dist/production-disabled/` through seventeen ordered closed checks and emits exactly three deterministic outputs under `extension/release/` (scan report, ZIP, SHA-256 sidecar). Two serial build→scan→package cycles produce byte-identical artifacts; tests parse local and central ZIP records independently and inflate-compare every byte.
- **Automated loaded-package evidence:** the strict `extension:browser:strict` lane ran under the pinned verification-only prerelease `@playwright/test@1.63.0-alpha-2026-09-02` (Playwright Chromium revision 1243, browser 153.0.8010.12) and proved package load, one service worker, the packaged bilingual disclosure, same-origin local assets, closed internal messaging, and context close/relaunch registration with no external network. The diagnostic `extension:browser` lane emits only its structured skip on below-floor hosts and never counts as verification.
- **What automation cannot prove:** physical toolbar action-icon invocation, temporary `activeTab` grant semantics, and real fixture mutation through an actual user gesture remain exclusively for the manual headed branded Google Chrome 152-or-later walkthrough, which is still blocked on the recorded Chrome 151 host.
- **External release:** nothing in this subtree is deployed, submitted, or eligible for Store or public claims.
- **Note:** running the extension test suite exercises the pipeline and removes the ignored candidate outputs under `extension/release/` for isolation; regenerate them afterwards with `extension:build:production-disabled`, `extension:scan`, then `extension:package`.

BLOCKED — manual branded Chrome 152 action-icon source/load/destination/fill gate pending; real adapters remain disabled; not Store/public eligible
