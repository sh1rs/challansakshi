// The browser distribution is vendored with source/version/license provenance.
// Importing happens only after an explicit Start; no npm server runtime is used.
export {};
const RUNTIME_PATH = '/voice-assets/transformers-3.8.1/';
const MODEL_REVISION = 'ff4177021cc41f7db950912b73ea4fdf7d01d8e7';

type SpeechOutput = { text: string } | { text: string }[];
type LocalRecognizer = (audio: Float32Array, options: Record<string, string | number | boolean>) => Promise<SpeechOutput>;
interface LocalSpeechRuntime {
  env: {
    version: string;
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
    useBrowserCache: boolean;
    useFS: boolean;
    useFSCache: boolean;
    remoteHost: string;
    backends: { onnx: { wasm: { numThreads: number; wasmPaths: string; proxy: boolean } } };
  };
  pipeline: (task: 'automatic-speech-recognition', model: string, options: {
    device: 'wasm'; dtype: 'q8'; revision: string; progress_callback: typeof reportProgress;
  }) => Promise<LocalRecognizer>;
}

type Request =
  | { type: 'load' }
  | { type: 'decode'; id: number; audio: Float32Array; language: 'en' | 'hi' | 'te' };
let transcriber: LocalRecognizer | undefined;
let busy = false;
const languages = { en: 'english', hi: 'hindi', te: 'telugu' } as const;
const files = new Map<string, { loaded: number; total: number }>();

function reportProgress(event: { status: string; file?: string; loaded?: number; total?: number }): void {
  if (event.status !== 'progress' || !event.file) return;
  files.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 });
  let loaded = 0;
  let total = 0;
  for (const file of files.values()) {
    loaded += file.loaded;
    total += file.total;
  }
  self.postMessage({ type: 'progress', loaded, total });
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  if (request.type === 'load') {
    try {
      const runtimeUrl = new URL(`${RUNTIME_PATH}transformers.min.js`, self.location.href).href;
      const { env, pipeline } = await import(/* @vite-ignore */ runtimeUrl) as LocalSpeechRuntime;
      if (env.version !== '3.8.1') throw new Error('Unexpected local runtime version');
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      env.remoteHost = 'https://huggingface.co/';
      env.useBrowserCache = true;
      env.useFS = false;
      env.useFSCache = false;
      // Override upstream CDN defaults: every runtime executable is same-origin.
      env.backends.onnx.wasm.wasmPaths = new URL(RUNTIME_PATH, self.location.href).href;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
        device: 'wasm',
        dtype: 'q8',
        revision: MODEL_REVISION,
        progress_callback: reportProgress,
      });
      self.postMessage({ type: 'ready' });
    } catch {
      self.postMessage({ type: 'error', code: 'model-unavailable' });
    }
    return;
  }
  if (!transcriber || busy) {
    self.postMessage({ type: 'error', id: request.id, code: 'model-unavailable' });
    return;
  }
  busy = true;
  try {
    const result = await transcriber(request.audio, {
      language: languages[request.language],
      task: 'transcribe',
      return_timestamps: false,
      chunk_length_s: 15,
      stride_length_s: 2,
      num_beams: 1,
      do_sample: false,
      max_new_tokens: 128,
    });
    const text = (Array.isArray(result) ? result[0]?.text : result.text) ?? '';
    self.postMessage({ type: 'result', id: request.id, text: text.trim() });
  } catch {
    self.postMessage({ type: 'error', id: request.id, code: 'model-unavailable' });
  } finally {
    busy = false;
    // The request's audio is no longer retained after this handler returns.
  }
};
