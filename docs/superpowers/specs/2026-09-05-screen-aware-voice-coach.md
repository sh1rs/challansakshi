# Screen-aware multilingual voice coach

Approved in conversation on 2026-09-05: English, Hindi and Telugu voice guidance within the document review, automatic turn-taking, interruption, visible transcripts, confirmed corrections, and no paid AI services. This records the approved scope; implementation proceeds without another approval gate.

## Experience

A compact companion sits beside the Read / Check / Prepare workspace on desktop, with an early entry control and a responsive panel on mobile. It understands the current review step, available records, comparison outcome and active correction field. Typed questions and suggested prompts always work. The person explicitly starts the microphone session and can stop or interrupt at any time. Guide language is independent of the existing English/Hindi page language; Telugu guidance does not imply the entire website is translated.

## Data and actions

Only structured review state reaches the deterministic coach. Raw documents and source excerpts never become conversation context. Voice can explain a step, reveal a source/photo, navigate back to review, open a correction and suggest a value. It cannot select files, save a correction, prepare/confirm a note, submit, pay, or decide liability. Corrections require the existing visible Save correction control. Results captured against a previous screen revision are discarded.

Audio and transcripts stay in memory on the device. Speech recognition uses a lazily loaded local Whisper worker, and only model/runtime assets may be fetched after the person starts voice. No browser vendor recognition service, API credentials, hosted inference, analytics, transcript storage or new backend. Model cache can contain public model assets only. Stop, close, language changes, tab hiding, quick exit, and unmount release microphone tracks and cancel output/in-flight responses.

## Conversation

Automatic speech detection, bounded audio buffers, incremental transcription with backpressure, and short responses reduce delay. Interruption cancels queued playback and pending responses. The system must not apply unstable partial transcripts. Common responses can use existing local device voices; a compact offline synthesis fallback may be used with honest voice-quality labels and its distribution licence/source requirements. A lack of hardware capability is surfaced with recovery, never disguised as a successful voice turn.

Target, not guarantee: a useful spoken response around one second after a common utterance, and interruption around 250 ms. Instrument actual turn timing without storing speech, and distinguish synthetic controller tests from real audio/model measurements. Do not claim these targets without measurements on named hardware.

## Acceptance

- English/Hindi/Telugu coach answers and commands, state-aware guidance, conservative ambiguity and negation handling.
- No voice-triggered confirmation/submission or stale field correction; typed suggestions use the same rules.
- Model and microphone require explicit start; no external requests on ordinary review load.
- Stop and hide clean up, including delayed permissions/model work and audio output.
- Keyboard-accessible controls, clear statuses, reduced motion, mobile no-overflow, and existing review/demo coverage preserved.
- Typecheck, lint, focused and full unit tests, production build, browser interaction checks and screenshot inspection.
- Real speech smoke test where environment permits; failures and unmeasured language/latency limits stated explicitly.

## Movable companion update — 6 September 2026

The approved window controls support pointer/touch dragging, corner resizing, keyboard adjustment and resetting the default geometry. Minimize keeps the active conversation running in a compact bar with a visible microphone Stop control; restore returns to the previous size. Close still clears the conversation and releases audio resources. Window geometry stays in memory and is clamped to the visual viewport.
