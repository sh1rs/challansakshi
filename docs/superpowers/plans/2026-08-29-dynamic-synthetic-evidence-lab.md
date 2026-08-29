# Dynamic Synthetic Evidence Lab — Implementation Plan

1. Add pure typed extraction, validation, deterministic comparison, safe-action, and action-pack functions.
2. Add ten independent synthetic evaluation vectors and a runtime suite runner.
3. Replace the fixture-only route contract with a versioned, strict extraction transport while retaining backward-compatible bundled-fixture analysis.
4. Keep all model calls fail-closed behind explicit runtime flags and preserve the bundled offline fallback only for bundled fixtures.
5. Build `/demo/test-lab` with suite execution, filtering, case mutation, confirmation invalidation, rule trace, and action-pack export.
6. Add a browser-local custom synthetic vector editor and local image preview; do not send its bytes in the public release.
7. Link the Test Lab quietly from the synthetic walkthrough, and update privacy, README, and demo script truthfully.
8. Verify focused tests, full tests, typecheck, lint, production build, generated route behavior, desktop/mobile browser rendering, keyboard flow, and production deployment.

