# Voice validation and production release — 2026-09-06

The English/Hindi/Telugu review companion and movable window are live at
https://challansakshi.sh1rs.com/review. The production release record follows
the original local measurements below.

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

## Earlier local integration checks — 2026-09-05

- 1,167 unit tests passed across 73 files.
- All 74 browser scenarios passed across the full run and the focused voice rerun (68 existing scenarios and six voice scenarios).
- Typecheck, repository ESLint, production build and authored-source whitespace checks passed.
- Desktop and 375px Telugu companion screenshots were inspected.
- Voice tests use full Chromium headless mode; its synthetic microphone works, while the separate headless-shell build returns NotSupportedError.
- Independent review found and fixed own-action speech cancellation and stale voice overwriting newer typed drafts; both have regression coverage.
- At this checkpoint, no deployment had been performed and changes were uncommitted on codex/screen-aware-voice-coach. This historical status is superseded by the production record below.

## Release candidate — 6 September 2026

The approved release includes English/Hindi/Telugu local voice guidance plus pointer/touch dragging, corner resizing, keyboard adjustment, minimize/restore and reset. All 1,168 unit tests and all 78 browser scenarios passed in complete runs. Whole-project TypeScript, ESLint, production build and authored-source whitespace checks passed. Independent review verified current worker paths, public asset hashes and source/license distribution. Two whitespace quirks in upstream vendored runtime JavaScript were retained to preserve its original bytes and provenance hashes.

## Verified production release — 6 September 2026

- Public review: https://challansakshi.sh1rs.com/review.
- Deployed source: `3d90739` on `codex/screen-aware-voice-coach`.
- Cloudflare version: `d6006d5f-97ad-4c3c-824c-82119c6866ac`, tag `ask-sakshi-3d90739`.
- Deployment created at `2026-09-06T08:08:43.561Z` (13:38:43 IST); a separate deployment-list check confirmed 100% production traffic on this version.
- Previous version available for rollback: `4787455a-a026-44ee-bf52-c4908474af91`.
- Production build, Wrangler dry run and deployment succeeded using compatibility date `2026-08-28`; the local source configuration was left unchanged.
- All 10 focused production browser scenarios passed in one run (36.3 seconds): pointer and keyboard movement/resizing, reset, minimize with draft retention, viewport bounds, 375px Telugu touch controls, multilingual page guidance, real PDF review, focus recovery, download cancellation, model failure and microphone denial.
- Production desktop and 375px Telugu screenshots were visually inspected. Resizing keeps the composer and start/stop controls reachable while the conversation body scrolls.
- Live review/home routes, voice workers, runtime and WASM returned HTTP 200. Shipped worker/runtime bytes matched the tested local files. Microphone permission remains limited to the review route; the page CSP and isolated worker policies were verified on the public origin.
- No paid inference, additional backend, audio upload or transcript persistence was enabled. This was a website deployment; the source branch was not pushed or merged as part of it.

### Actual recognition through the live worker

`scripts/voice-smoke.mjs` ran with `CHALLANSAKSHI_BASE_URL=https://challansakshi.sh1rs.com` and `VOICE_SMOKE_REPEATS=1`. A fresh Chromium context loaded the deployed worker and public model assets. The generated English fixture was passed to the worker as PCM; this does not measure microphone capture or spoken-reply latency.

| Measurement | Observed result |
| --- | --- |
| Synthetic input and recognized text | “What evidence is missing?” |
| Audio duration / sample rate | 1.40525 seconds / 16 kHz |
| Fresh runtime/model setup | 87.254 seconds |
| Decode round trip | 1.533 seconds |
| Failed network requests | 0 |

All observed requests were GETs to the production origin, `huggingface.co` or its `us.aws.cdn.hf.co` redirect host. No audio or transcript was uploaded. First use still requires approximately 70 MB of voice assets, depending on compression and caching. These results establish one successful synthetic English decode through the deployed worker. Natural Hindi/Telugu accuracy, phone performance, warm-cache setup, acoustic interruption and complete conversational latency remain unmeasured. The requested minimal-pause experience remains a performance goal, rather than a verified release claim.
