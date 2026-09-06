# Local voice runtime provenance

Downloaded 2026-09-05 from the official npm package archive:
https://registry.npmjs.org/@huggingface/transformers/-/transformers-3.8.1.tgz

Archive SHA-256: `207714c36765b87accfd9b7b0672c3505805af97140990e0d9f8ac6e3cd5471e`.

The three executable assets below are copied without modification from that
archive's `package/dist/`. Source maps, Node bundles and npm dependencies are not
needed by this standalone browser distribution and are not included.

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| transformers.min.js | 888173 | aa5002b70e789798da263f5f99c62bd3e8fcd0c119258a493c40c180648365fa |
| ort-wasm-simd-threaded.jsep.mjs | 44484 | 08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9 |
| ort-wasm-simd-threaded.jsep.wasm | 21596019 | c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39 |

Executable runtime download size: **22,528,676 bytes**, before HTTP compression.
The worker sets ONNX `wasmPaths` to this same-origin directory, disables proxy
workers and uses one WASM thread. It overrides the package's upstream CDN
default; runtime executables are served by ChallanSakshi.

Transformers.js is Apache-2.0: `LICENSE-transformers.txt` is the unmodified license
from its npm archive. Upstream source: https://github.com/huggingface/transformers.js/tree/3.8.1

The bundled ONNX Runtime version, as recorded by the upstream package, is
`1.22.0-dev.20250409-89f8206ba4`. Its MIT license and third-party notices are copied
from https://github.com/microsoft/onnxruntime/tree/89f8206ba4 as
`LICENSE-onnxruntime.txt` and `ThirdPartyNotices-onnxruntime.txt`.

## Model fetched after explicit voice start

Model: https://huggingface.co/onnx-community/whisper-tiny

Pinned revision: `ff4177021cc41f7db950912b73ea4fdf7d01d8e7`.
The repository identifies these as ONNX conversions of `openai/whisper-tiny`.
Whisper's original code and weights are MIT licensed:
https://github.com/openai/whisper/blob/main/LICENSE

The application fetches public model/tokenizer files from Hugging Face after the
person starts voice input and grants microphone access. No microphone audio or
transcript is uploaded. The browser may cache only the public model files.
Hugging Face may redirect model downloads to its CDN/storage hosts.

Sizes verified from the Hugging Face model API with `blobs=true`:

| Model file | Bytes | SHA-256 from LFS metadata |
| --- | ---: | --- |
| onnx/encoder_model_quantized.onnx | 10124990 | 2af4a414ca47aa30f61246017e5fe82b0a8d229281d1255ba666a2a7f6b84d19 |
| onnx/decoder_model_merged_quantized.onnx | 30719241 | 25e807a962b6349356d0ea5d0dfe530b7e5bf0e2a484aeca0359d03143faddd3 |
| tokenizer.json | 2480466 | — |
| tokenizer_config.json | 282683 | — |
| config.json | 2243 | — |
| generation_config.json | 3772 | — |
| preprocessor_config.json | 339 | — |

The two q8 weight files total **40,844,231 bytes**. Listed model/tokenizer/config
assets plus runtime total approximately **66.1 MB** before transport compression.
This is a manifest-based estimate, not a completed first-run network benchmark.
It excludes optional metadata files, retries and browser cache differences.
