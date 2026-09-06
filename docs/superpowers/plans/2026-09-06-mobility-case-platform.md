# Mobility Case Platform Implementation Plan

> **For agentic workers:** Use subagent-driven-development with independent code ownership and final review.

**Goal:** Connect guest intake, reviewed facts, reusable details, saved case plans and outcomes, with a configurable free-tier account backend.

**Architecture:** Shared validated case domain and explicit browser persistence feed a new mobility workspace and existing OCR review. A Cloudflare D1/Google OAuth server adapter provides owner-scoped sync when configured.

**Tech Stack:** Existing React/Vinext, TypeScript, Cloudflare Worker; D1 and Google OAuth optional runtime configuration.

**Spec:** `docs/superpowers/specs/2026-09-06-mobility-case-platform-design.md`

## Global constraints
- Preserve guest flow, local OCR, evidence provenance, multilingual voice and demos.
- No raw documents/credentials saved; explicit private-device save consent; clear expiry/deletion.
- No official execution/verified status claims without actual approved connector evidence.
- No paid provider enabled, no SMS, no Supabase dependency. User requested free options.
- Work in current clean feature checkout; branch creation may be pending host approval. Do not mutate other agents' files.

## Tasks
- [x] 1. Case/profile domain, validation, browser storage and focused tests (domain implementer).
- [x] 2. Service catalogue, life-event plans, connected mobility UI and UI tests (workspace implementer).
- [x] 3. D1 schema, Google OAuth/session/account API, setup guide and security tests (account implementer).
- [x] 4. OCR-to-case integration, jurisdiction hints, prepared editable request, persistent language and navigation (root).
- [x] 5. Integrate account controls with saved workspace; update privacy copy and final capability matrix (root).
- [x] 6. Review implementation, fix issues, run unit/type/lint/build/browser checks and inspect mobile screenshots (root + fresh reviewer).

## Progress / decisions
- User approved implementation after gap audit; no additional design approval required.
- User has no backend/SMS provider and requested free alternatives. Default to existing Cloudflare plus configurable Google sign-in, without provisioning billable services.
- Initial interface scan: Tasks 1/2/4 share the case/store contract in the spec; Task 2 owns the new workspace only, Task 4 owns existing pages. Task 3 owns server/account files and D1 migration; root integrates controls after contracts are returned. No shared file edits planned.

- Integrated review fixed incomplete upload previews, missing profile sync controls, stale deletion/expiry resurrection, retention on account import, draft loss on language/device changes, readiness after detail corrections, early clicks before hydration and appointment export omissions.
- Cloud account configuration remains unavailable until the user creates Google OAuth credentials and a real D1 database. No secrets, database IDs or production success have been fabricated.

- Final results and original-concept gaps are recorded in `docs/2026-09-06-mobility-implementation-status.md`; runtime/provider setup is in `docs/mobility-account-setup.md`.
