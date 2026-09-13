# Public civic release: security and dependency record

Verified locally on 13 September 2026. This record is not deployment evidence; the final release record must identify the deployed Worker version and live checks.

## Request boundary

- All responses passing through `worker.ts`, including direct account handlers, now receive baseline response protections without buffering their bodies.
- API responses enforce `Cache-Control`, `CDN-Cache-Control`, and `Cloudflare-CDN-Cache-Control: no-store`, a restrictive content security policy, `Referrer-Policy: no-referrer`, and crawler exclusion. Existing public asset cache settings and specialized speech-worker policies remain intact.
- A rejected router or account-handler promise produces a bounded 503 response with `Retry-After: 30`. API clients receive JSON; page requests receive a script-free recovery page. Request URLs, citizen content, provider errors, and exception messages are neither reflected nor logged by this handler. HEAD failures have no response body.
- The deployment script now rejects unsupported arguments, prevents simultaneous runs from overwriting recovery copies, installs cleanup before rewriting configuration, and restores the original configuration on success or failure. The production compatibility date remains `2026-08-28`; local configuration is restored afterward.

The existing controls for streaming request size limits, same-origin writes, OAuth PKCE and replay prevention, account identity pinning, optimistic revisions, and disabled provider calls were retained.

## Pinned upgrades

| Package | Previous | Release value |
| --- | --- | --- |
| next / eslint-config-next | 16.2.6 | 16.3.3 |
| react / react-dom / react-server-dom-webpack | 19.2.6 | 19.2.8 |
| sharp | 0.34.5 | 0.35.4 |
| vite | 8.0.13 | 8.0.16 |

The `pnpm-workspace.yaml` overrides pin vulnerable transitive ranges to PostCSS 8.5.23, Sharp 0.35.4, Undici 7.29.0, ws 8.21.0, js-yaml 4.3.2, and esbuild 0.28.1. Vinext and Wrangler versions were retained. Matching React and React DOM packages were installed together with the patched RSC package.

`packageManager` is pinned to `pnpm@11.19.0`. Required native install scripts are explicitly allowed. Tesseract's `opencollective-postinstall || true` donation notice is explicitly disabled; the package does not require it to build OCR assets.

## Audit result and precise remaining scope

- Before: production audit had 17 advisories; full audit had 38.
- After: `pnpm audit --prod --json` exited **0**, with zero known advisories in every severity category. See [production report](./dependency-audit-production-after.json).
- After: full `pnpm audit --json` exited **1**, with exactly two high-severity advisories, both under `. > vinext > image-size@2.0.2`. See [full report](./dependency-audit-after.json).

The remaining advisories are [ICNS parser infinite loop, GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [JXL/HEIF parser infinite loops, GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq). They identify a patched range starting at 2.0.3, but the npm registry queried during this release lists 2.0.2 as the newest published release. Installation of 2.0.3 explicitly failed with `ERR_PNPM_NO_MATCHING_VERSION`, so no nonexistent override or blanket audit suppression is retained.

Reachability was checked against the installed Vinext source: its only `image-size` import is in `node_modules/vinext/dist/server/metadata-route-build-data.js`, imported by `node_modules/vinext/dist/entries/app-rsc-manifest.js`. It reads repository-owned static metadata images while generating the application manifest. Public citizen document reading uses browser-side PDF/OCR code, not this parser. This limits the observed exposure; it is not a claim that the library vulnerability is fixed. Keep untrusted ICNS, JXL, and HEIF files out of build metadata, and upgrade when a patched package is actually available.

## Verification completed in this work

- Frozen-lockfile installation: exit 0, pnpm 11.19.0.
- Full TypeScript check: exit 0 after upgrades.
- Targeted ESLint check for the Worker, response helper, and new regression tests: exit 0 after upgrades.
- Worker/security/deployment regression checks: 34/34 passed before the dependency upgrade.
- Updated plain backend/security checks passed; the initial sandboxed runtime run encountered `listen EPERM` on its local loopback port. A permission-enabled rerun of the three affected/integration suites passed **14/14**: `voice-response-policy`, `mobility-worker-runtime`, and `cloudflare-deployment`. This includes actual local Cloudflare asset handling and D1 account/helper behavior.
- `git diff --check`: exit 0.

The parent release process runs the final complete unit suite, production build, browser QA, and deployment checks separately.

## Repeatable install and checks

Use Node on PATH (the Codex bundled runtime used Node 24.19.0) and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm audit --prod
pnpm audit
pnpm typecheck
pnpm test --maxWorkers=2
```

For this Codex host, the fallback pnpm wrapper starts Node by absolute path but does not add it to child-process PATH. Use the following when native install scripts cannot find `node`:

```sh
PATH="/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm install --frozen-lockfile --fetch-timeout=120000 --network-concurrency=4
```

Keep registry integrity and supply-chain verification enabled. The longer timeout was needed for slow registry responses during this session. A local Cloudflare runtime test needs permission to open loopback ports.

## Optional service capability check

Read-only authorized Cloudflare checks returned an empty Worker secret list and an empty D1 database list. No secret values were requested. Google sign-in is not configured, and no database was provisioned. `ANALYSIS_ENABLED`, `SYNTHETIC_UPLOADS_ENABLED`, and `MOBILITY_AI_ENABLED` remain false. Guest workflows remain the public release path; no paid provider was activated.
