# Local voice validation — 2026-09-05

The local speech input is implemented, and a real browser transcription has
succeeded. These results do **not** establish natural low-latency conversation
on phones or verified Hindi/Telugu recognition accuracy.

## Measured real-model smoke

A production-built speech worker loaded Transformers.js 3.8.1 and the pinned
multilingual Whisper tiny q8 model in headless Chromium on the development Mac.
Inference used one WASM thread. The test generated an English phrase with the
local macOS Samantha voice, converted it to 16 kHz mono PCM, and passed it directly
to the worker. No microphone recording or paid API was involved.

| Measurement | Observed result |
| --- | --- |
| Synthetic input | “What evidence is missing?” |
| Audio duration | 1.4165 seconds |
| Recognized text | “What evidence is missing?” |
| Initial model/runtime load and initialization | 80.455 seconds |
| First decode round trip | 1.512 seconds |
| Failed network requests | 0 |

This is one synthetic English sample and one timing observation. Load timing
includes the network connection and browser initialization. Repeat/warm timings,
native accents, noisy speech, registration numbers, Hindi, Telugu, and language
mixing have not been measured by this smoke. It is not a complete microphone →
coach → speech-output latency measurement.

The endpoint detector currently waits roughly 780 ms of silence. Adding that
wait to this observed decode already exceeds two seconds before speech output;
that is a budgeting calculation, not an end-to-end measurement. The requested
minimal-pause experience is therefore an outstanding performance goal.

All observed requests were GETs. Public model files came from `huggingface.co`
and its observed redirect host `us.aws.cdn.hf.co`. Runtime JavaScript and WASM
came from the local origin. No audio or transcript was uploaded. The network
progress total for model assets was 43,613,734 bytes. Runtime assets add about
22.5 MB before HTTP compression; cache/retry behavior changes actual transfers.
See the [vendored runtime provenance](../public/voice-assets/transformers-3.8.1/SOURCE.md).

## Reproduce and collect warm measurements

Build the app, start a local production preview, then run the smoke in another
terminal. The script uses macOS `say` and `afconvert` to generate its own speech
fixture and deletes the temporary audio afterward. It downloads public model
assets in a fresh browser context and keeps one worker alive across repeated
decodes. It does not alter the application's response headers.

```sh
pnpm build
pnpm exec vinext start --hostname 127.0.0.1 --port 4188
CHALLANSAKSHI_BASE_URL=http://127.0.0.1:4188 VOICE_SMOKE_REPEATS=4 node scripts/voice-smoke.mjs > /tmp/challansakshi-voice-smoke.json
```

The repeated-decode script was added after the measured one-shot run above.
Its repeated results are intentionally not claimed as already measured.

## Other completed checks

- Twelve focused audio/lifecycle tests pass: continuous resampling, quiet-noise
  and click rejection, short pauses, stronger onset during assistant playback,
  utterance bounds, bounded inference queueing, stale-result invalidation,
  microphone denial, cross-realm denial, and cancellation during permission and
  model loading.
- A real AudioWorklet produced 512 finite, nonzero samples from a synthetic
  oscillator. This verifies capture plumbing, not real microphone quality.
- The worker is compiled from TypeScript and served unchanged at
  `/voice/voice-recognition.worker.js` in both development and production.
  Run `node scripts/build-voice-worker.mjs` after changing its source; an artifact
  regression test requires the shipped JavaScript to match that compilation.
  This avoids Vite importing its page-only HMR client inside the speech worker.
- The real worker recovered with `model-unavailable` when model downloads were
  intentionally aborted, without page errors.

Lowering `max_new_tokens` is not an established speed improvement: Transformers
stops at an end-of-sequence token before the maximum anyway. A smaller maximum
can truncate longer or heavily tokenized multilingual answers. No token-limit
or WebGPU tuning has been applied on the basis of this single sample.

## Final integration checks

- 1,167 unit tests passed across 73 files.
- All 74 browser scenarios passed across the full run and the focused voice rerun (68 existing scenarios and six voice scenarios).
- Typecheck, repository ESLint, production build and whitespace checks passed.
- Desktop and 375px Telugu companion screenshots were inspected.
- Voice tests use full Chromium headless mode; its synthetic microphone works, while the separate headless-shell build returns NotSupportedError.
- Independent review found and fixed own-action speech cancellation and stale voice overwriting newer typed drafts; both have regression coverage.
- No deployment performed. Local preview: http://127.0.0.1:4177/review. Changes remain uncommitted on codex/screen-aware-voice-coach.

## Release candidate — 6 September 2026

The approved release includes English/Hindi/Telugu local voice guidance plus pointer/touch dragging, corner resizing, keyboard adjustment, minimize/restore and reset. All 1,168 unit tests and all 78 browser scenarios passed in complete runs. Whole-project TypeScript, ESLint, production build and whitespace checks passed. Independent review verified current worker paths, public asset hashes and source/license distribution. Production deployment status will be recorded after live verification.
