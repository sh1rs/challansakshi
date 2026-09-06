# Screen-aware Voice Coach Implementation Plan

> **For agentic workers:** Use the approved design and independent file ownership below. Steps use checkbox syntax for tracking.

**Goal:** Build an optional, local English/Hindi/Telugu voice companion for the document review.

**Architecture:** React exposes a small typed context to a deterministic coach. An on-demand worker transcribes microphone audio locally, while cancellable local synthesis speaks short responses. The UI coordinates context revisions, visible transcripts and allowed actions.

**Tech Stack:** React/TypeScript, Vite/vinext, Transformers.js/Whisper, Web Audio, local speech synthesis, Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-05-screen-aware-voice-coach.md`

## Global Constraints

- English, Hindi and Telugu coach language; no paid service or backend.
- No document uploads, remote speech recognition/synthesis, or stored conversations.
- Explicit microphone/model start; cancel microphone, playback and stale responses on stop/hide/exit.
- Voice suggestions never save corrections or confirm/submit a case.
- Preserve the current homepage, document workflow, manual fallback and demo lab.
- Describe model/device limits and benchmark evidence accurately.

## Task 1: Screen-aware conversation rules

Owner: review_screen_context. Files: `lib/voice-coach.ts`, optional copy module, `tests/voice-coach.test.ts`.

- [x] Test stage-aware guidance, multilingual commands, ambiguous targets, negation and prohibited actions.
- [x] Implement `answerCoach`, `describeCoachStep`, `getCoachPrompts` against typed context with field metadata only.
- [x] Run focused Vitest tests and report behavior/limits.

## Task 2: Local microphone recognition

Owner: telugu_free_voice. Files: `lib/local-voice-input.ts`, `lib/voice-audio.ts`, worker and worklet, `tests/voice-audio.test.ts`.

- [x] Test resampling, bounded VAD buffers, pauses/noise and stale recognition queues.
- [x] Implement explicit-start microphone capture and lazy multilingual Whisper worker; no vendor recognition.
- [x] Implement partial/final backpressure, generation cancellation, and track cleanup after delayed permission/load.
- [x] Run focused tests and verify worker builds.

## Task 3: Local spoken replies

Owner: voice_output. Files: `lib/local-voice-output.ts`, `lib/voice-guide-ui-copy.ts`, corresponding tests/assets if required.

- [x] Test language-specific local voice selection and cancellation.
- [x] Implement native local voices plus a documented compact local fallback supporting all three languages.
- [x] Include required dependency attribution/source and communicate actual voice capability.

## Task 4: Review companion UI and action integration

Owner: root. Files: `components/public-beta/VoiceCoach.tsx`, module CSS, document-review integration, component/browser tests.

- [x] Test explicit start, typed conversation, language changes, stop/hidden cleanup and stale-screen responses.
- [x] Build accessible companion with language choice, transcript, prompts, microphone state, download disclosure and recovery.
- [x] Map typed coach actions to exact review controls without automatic save/prepare.
- [x] Run local browser flow on desktop/mobile and visually inspect captures outside the repo.

## Task 5: Integration validation and review

- [x] Vendor pinned browser runtimes with licences/source provenance and verify public assets/production build.
- [x] Run typecheck, lint, full unit suite and existing plus new browser scenarios.
- [x] Run actual local model/audio smoke if accessible; record measurements separately from simulated tests.
- [x] Independent code review; fix actionable issues; rerun affected checks.
- [x] Update this checklist and provide factual local/deployment status with remaining limits.

## Validation record — 2026-09-05

- Full unit suite: 1,167 passed across 73 files. Typecheck, repository ESLint, and production build passed.
- Independent review found and resolved acknowledgement cancellation and stale spoken-draft overwrite; both have regression tests.
- Actual Chromium local recognition correctly transcribed a synthetic English clip. Cold setup took 80.455 seconds; the first decode took 1.512 seconds. These are one desktop sample, not general latency or multilingual accuracy claims.
- Local English/Hindi/Telugu speech output produced real PCM and played through Web Audio. Native-speaker pronunciation, low-end mobile recognition and acoustic echo interruption remain unmeasured.
- All 74 browser scenarios passed: 68 existing scenarios plus six voice scenarios; voice tests use full Chromium because the separate headless shell lacks audio capture. The local preview runs on port 4177. Changes are uncommitted on codex/screen-aware-voice-coach; no deployment performed.
- Vite development static assets bypass production response headers; Cloudflare static-worker CSP is verified with actual Miniflare asset responses.
