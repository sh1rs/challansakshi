# ChallanSakshi Assisted Handoff extension framework

This subtree is an isolated Manifest V3 tooling scaffold for two mutually exclusive internal builds:

- `synthetic-development` contains only the fictional loopback source and destination profile.
- `production-disabled` contains the production source identity and disabled Legacy/NextGen route identities. It has no enabled real adapter.

Neither artifact is a public release, a Chrome Web Store candidate, government-authorised software, or evidence that a real official form can be filled. The installation-free web handoff remains the complete supported path.

The root scripts build one profile at a time into `extension/dist/<profile>/`. `build:all` includes only the web build and `production-disabled`; it never emits the synthetic profile. Generated package, browser, and release outputs are ignored. Authored extension source and tests remain in root lint scope.

Loaded-package automation and the separate physical action-icon evidence gate are intentionally distinct. The strict loaded-package lane requires Chromium 152 or later. The required headed branded Google Chrome 152-or-later action-icon walkthrough is still blocked on the currently recorded Chrome 151 host and cannot be replaced by direct popup navigation or synthetic unit tests.
