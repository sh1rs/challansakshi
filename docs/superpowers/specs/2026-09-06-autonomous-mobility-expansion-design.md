# Autonomous mobility expansion

The user explicitly asked to keep building for two hours, implement the remaining ideas, develop differentiated features and a multi-agent architecture, and save questions for their return. This is authorization for reversible implementation and local verification without repeated design approvals. Work window: 6 September 2026, 10:30–12:30 UTC (16:00–18:00 Asia/Kolkata). A thread heartbeat resumes progress if the active turn yields.

## Product outcome

Build working preparation, collaboration and recovery capabilities around one citizen-owned case. Preserve the existing guest OCR and voice journeys. Optional providers must report their actual availability. No government credentials, money movement or official submission are implied by a local prototype.

## Architecture

1. A coordinated case team runs evidence, service and consistency checks in parallel, then synthesizes at most one useful next question. Runs are tied to exact case input, cancellable and invalidated by edits. Rule-based local checks are labelled as such. A separately consented optional model adviser can explain minimal reviewed facts but cannot change case state or call official actions.
2. A profile correction preview compares saved profile-derived facts with the current profile, excludes completed/submitted records and citizen edits, and applies selected changes atomically after all revisions are checked. Request wording is preserved and marked for review.
3. Trusted helper invitations expose one reviewed account-case snapshot to one signed-in email for at most 24 hours. The share secret is in a URL fragment and stored only hashed. Helpers propose wording; owners review before changing their case. Every access checks revocation, expiry and ownership. No invitation messages are sent automatically.
4. A resumable assistance state machine and an explicitly synthetic test portal prove private user-control gating, reviewed-payload approvals, interruption/recovery and receipt validation. Real remote browser availability remains configuration-dependent and must be tested before any production claim.
5. Source-backed observations and follow-up scheduling preserve a prior observation through failures, distinguish citizen evidence from verified connector results and deduplicate notifications. No fabricated government connector or background status is enabled.
6. Useful differentiators include a concise case brief, explanation of missing evidence, reviewed correction propagation, privacy-limited helper snapshots and an opt-in local effort log. New features must reduce retyping or uncertainty and produce a visible usable result.

## Invariants

- No paid provider or cloud model enabled by default. User has no Google OAuth/D1 provider configuration yet.
- Never request passwords, OTPs, full Aadhaar/card details in application text forms or model prompts.
- Citizen retains consequential approval; a changed recipient, content or amount invalidates earlier approval.
- Original documents remain local except a future explicit, supported upload.
- Case/profile stored values preserve their source and confirmation state. Model output is untrusted advice.
- Do not disturb the existing dirty feature work from the previous turn or deploy it without verification.
- Scope ownership is explicit; root integrates shared files. Browser runs use separate artifact directories.
- Test meaningful state, isolation, cancellation, conflict and recovery paths; inspect mobile UI.

## Additional free continuity option

A manually carried, password-protected single-case file lets someone move between private devices without opening a cloud account. The app shows the exact complete plaintext case before encryption; originals, separate profile and follow-up storage are excluded. Use native Web Crypto AES-GCM-256 authenticated encryption, fresh random salt/nonce, PBKDF2-SHA256 with a fixed 600,000 iterations, bounded input and strict version checks. Opening decrypts locally into a complete review; only explicit user choice opens a new unsaved copy with a fresh identifier and original timestamps. No overwrite or automatic save. Clear secrets and previews on exit and invalidate pending work on input/context changes. Lost passphrases cannot be recovered, and file encryption cannot authenticate its original author or verify an official outcome.
