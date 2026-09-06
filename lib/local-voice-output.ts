export type VoiceOutputLanguage = 'en' | 'hi' | 'te';

export interface LocalVoiceCapability {
  available: boolean;
  voiceName: string | null;
  local: boolean;
  quality: 'device' | 'compact' | 'unavailable';
}

export interface LocalVoiceOutputOptions {
  language: VoiceOutputLanguage;
  onSpeaking: (speaking: boolean) => void;
  onError: (code: string) => void;
  onCapability?: (capability: LocalVoiceCapability) => void;
}

export interface LocalVoiceOutput {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  dispose: () => void;
  /** Call from a user gesture, before awaiting microphone/model setup. */
  unlock: () => Promise<void>;
  getCapability: () => LocalVoiceCapability;
}

const LANGUAGE_TAGS: Record<VoiceOutputLanguage, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };
const COMPACT_WORKER_PATH = '/voice-assets/espeak-ng-1.49.1/espeakng.worker.js';
const COMPACT_SAMPLE_RATE = 44_100;
const VOICE_READY_TIMEOUT_MS = 15_000;
const NATIVE_START_TIMEOUT_MS = 4_000;

/** Never silently select a browser vendor's remote synthesis service. */
export function selectLocalVoice(voices: readonly SpeechSynthesisVoice[], language: VoiceOutputLanguage): SpeechSynthesisVoice | null {
  const matching = voices.filter((voice) => voice.localService === true && voice.lang.toLowerCase().replaceAll('_', '-').split('-')[0] === language);
  return matching.find((voice) => voice.lang.toLowerCase().replaceAll('_', '-') === LANGUAGE_TAGS[language].toLowerCase())
    ?? matching.find((voice) => voice.default)
    ?? matching[0]
    ?? null;
}

/** Short utterances start promptly and avoid browser speech's long-text stalls. */
export function splitSpeechText(text: string): string[] {
  const trimmed = text.replace(/\s+/gu, ' ').trim();
  if (!trimmed) return [];
  const sentences = trimmed.match(/[^.!?।]+[.!?।]*/gu) ?? [trimmed];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    let remaining = sentence.trim();
    while (remaining.length > 200) {
      const space = remaining.lastIndexOf(' ', 200);
      const end = space > 60 ? space : 200;
      chunks.push(remaining.slice(0, end).trim());
      remaining = remaining.slice(end).trim();
    }
    if (remaining) chunks.push(remaining);
  }
  return chunks;
}

type CompactMessage = 'ready' | { callback?: string; done?: boolean; result?: unknown[] };
type CompactReply = { id: string; generation: number; resolve: () => void; reject: (error: Error) => void; done: boolean; receivedAudio: boolean; timer: ReturnType<typeof setTimeout> };

function speechError(code: string): Error {
  return new Error(code);
}

/**
 * Native local voices are preferred. A separate, unmodified eSpeak NG worker
 * supplies a compact robotic voice when the selected language is absent.
 * Only same-origin static runtime/data files are requested; text stays local.
 */
export function createLocalVoiceOutput(options: LocalVoiceOutputOptions): LocalVoiceOutput {
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const AudioContextConstructor = typeof window !== 'undefined' ? window.AudioContext : undefined;
  const compactSupported = typeof Worker !== 'undefined' && !!AudioContextConstructor;
  let disposed = false;
  let generation = 0;
  let speaking = false;
  let ownsNativeSpeech = false;
  let compactFailed = false;
  let context: AudioContext | null = null;
  let worker: Worker | null = null;
  let workerReady: Promise<void> | null = null;
  let cancelWorkerReady: (() => void) | null = null;
  let compactReply: CompactReply | null = null;
  let cancelNative: (() => void) | null = null;
  let finishRequest: (() => void) | null = null;
  let scheduleAt = 0;
  const sources = new Set<AudioBufferSourceNode>();

  function setSpeaking(value: boolean) {
    if (speaking === value) return;
    speaking = value;
    options.onSpeaking(value);
  }

  function localVoice(): SpeechSynthesisVoice | null {
    try {
      return synthesis && typeof SpeechSynthesisUtterance !== 'undefined' ? selectLocalVoice(synthesis.getVoices(), options.language) : null;
    } catch {
      return null;
    }
  }

  function getCapability(): LocalVoiceCapability {
    if (disposed) return { available: false, voiceName: null, local: false, quality: 'unavailable' };
    const voice = localVoice();
    if (voice) return { available: true, voiceName: voice.name, local: true, quality: 'device' };
    if (compactSupported && !compactFailed) return { available: true, voiceName: 'eSpeak NG', local: true, quality: 'compact' };
    return { available: false, voiceName: null, local: false, quality: 'unavailable' };
  }

  function emitCapability() {
    if (!disposed) options.onCapability?.(getCapability());
  }

  function stopSources() {
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* A source may already have ended. */ }
      source.disconnect();
    }
    sources.clear();
    scheduleAt = 0;
  }

  function stop() {
    generation += 1;
    cancelNative?.();
    cancelNative = null;
    if (ownsNativeSpeech) {
      ownsNativeSpeech = false;
      try { synthesis?.cancel(); } catch { /* Still release our own state. */ }
    }
    if (compactReply) {
      clearTimeout(compactReply.timer);
      compactReply.resolve();
      compactReply = null;
    }
    stopSources();
    setSpeaking(false);
    finishRequest?.();
    finishRequest = null;
  }

  function rejectCompact(code: string) {
    if (!compactReply) return;
    const reply = compactReply;
    compactReply = null;
    clearTimeout(reply.timer);
    stopSources();
    reply.reject(speechError(code));
  }

  function finishCompactWhenPlayed() {
    if (!compactReply?.done || sources.size) return;
    const reply = compactReply;
    compactReply = null;
    clearTimeout(reply.timer);
    if (reply.receivedAudio) reply.resolve();
    else reply.reject(speechError('speech-failed'));
  }

  function playSamples(samples: Float32Array, activeGeneration: number) {
    if (!context || !compactReply || activeGeneration !== generation || !samples.length) return;
    // The unmodified 1.49.1 browser build duplicates 22.05 kHz mono samples.
    const buffer = context.createBuffer(1, samples.length, COMPACT_SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      if (activeGeneration === generation) finishCompactWhenPlayed();
    };
    const startsAt = Math.max(context.currentTime + 0.015, scheduleAt);
    scheduleAt = startsAt + buffer.duration;
    source.start(startsAt);
    setSpeaking(true);
  }

  function ensureWorker(): Promise<void> {
    if (workerReady) return workerReady;
    if (disposed || !compactSupported) return Promise.reject(speechError('speech-unavailable'));
    compactFailed = false;
    workerReady = new Promise<void>((resolve, reject) => {
      let ready = false;
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const fail = () => {
        if (timeout) clearTimeout(timeout);
        worker?.terminate();
        worker = null;
        workerReady = null;
        cancelWorkerReady = null;
        compactFailed = true;
        rejectCompact('speech-failed');
        emitCapability();
        if (!settled) { settled = true; reject(speechError('speech-load-failed')); }
      };
      cancelWorkerReady = () => {
        if (timeout) clearTimeout(timeout);
        if (!settled) { settled = true; resolve(); }
      };
      try {
        worker = new Worker(COMPACT_WORKER_PATH);
        timeout = setTimeout(fail, VOICE_READY_TIMEOUT_MS);
        worker.onerror = fail;
        worker.onmessage = ({ data }: MessageEvent<CompactMessage>) => {
          if (data === 'ready') {
            ready = true;
            settled = true;
            if (timeout) clearTimeout(timeout);
            cancelWorkerReady = null;
            emitCapability();
            resolve();
            return;
          }
          const reply = compactReply;
          if (!ready || !reply || data.callback !== reply.id || reply.generation !== generation) return;
          if (data.done) {
            reply.done = true;
            finishCompactWhenPlayed();
            return;
          }
          const pcm = data.result?.[0];
          if (!(pcm instanceof ArrayBuffer) || !pcm.byteLength) return;
          reply.receivedAudio = true;
          try { playSamples(new Float32Array(pcm), reply.generation); }
          catch { rejectCompact('speech-failed'); }
        };
      } catch { fail(); }
    });
    // Clear failed initialisation without keeping a rejected promise for retries.
    return workerReady.catch((error) => { workerReady = null; throw error; });
  }

  async function unlock() {
    if (disposed) return;
    if (AudioContextConstructor) {
      try {
        if (!context || context.state === 'closed') context = new AudioContextConstructor();
        if (context.state === 'suspended') await context.resume();
      } catch { throw speechError('speech-blocked'); }
      if (context.state !== 'running') throw speechError('speech-blocked');
    }
    if (!localVoice()) await ensureWorker();
  }

  function speakNativeChunk(text: string, voice: SpeechSynthesisVoice, activeGeneration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!synthesis || activeGeneration !== generation || disposed) { resolve(); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = LANGUAGE_TAGS[options.language];
      utterance.rate = 1;
      let completed = false;
      let timeout: ReturnType<typeof setTimeout>;
      const settle = (error?: string) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);
        utterance.onstart = null;
        utterance.onend = null;
        utterance.onerror = null;
        cancelNative = null;
        if (error) reject(speechError(error));
        else resolve();
      };
      cancelNative = () => settle();
      utterance.onstart = () => {
        if (activeGeneration !== generation) return;
        setSpeaking(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => settle('speech-timeout'), Math.max(8_000, text.length * 130));
      };
      utterance.onend = () => settle();
      utterance.onerror = (event) => settle(event.error === 'not-allowed' ? 'speech-blocked' : 'speech-failed');
      timeout = setTimeout(() => settle('speech-timeout'), NATIVE_START_TIMEOUT_MS);
      ownsNativeSpeech = true;
      try { synthesis.speak(utterance); }
      catch { settle('speech-failed'); }
    });
  }

  async function speakCompactChunk(text: string, activeGeneration: number) {
    await ensureWorker();
    if (activeGeneration !== generation || disposed) return;
    if (!context) throw speechError('speech-blocked');
    if (context.state === 'suspended') {
      try { await context.resume(); }
      catch { throw speechError('speech-blocked'); }
    }
    if (activeGeneration !== generation || disposed) return;
    if (context.state !== 'running') throw speechError('speech-blocked');
    const currentWorker = worker;
    if (!currentWorker) throw speechError('speech-load-failed');
    await new Promise<void>((resolve, reject) => {
      const id = `speech-${activeGeneration}-${performance.now()}`;
      compactReply = { id, generation: activeGeneration, resolve, reject, done: false, receivedAudio: false, timer: setTimeout(() => rejectCompact('speech-timeout'), Math.max(15_000, text.length * 160)) };
      try {
        currentWorker.postMessage({ method: 'set_voice', args: [options.language === 'en' ? 'en' : options.language] });
        currentWorker.postMessage({ method: 'set_rate', args: [options.language === 'en' ? 175 : 155] });
        currentWorker.postMessage({ method: 'synthesize', args: [text], callback: id });
      } catch { rejectCompact('speech-failed'); }
    });
  }

  function speak(text: string): Promise<void> {
    stop();
    const chunks = splitSpeechText(text);
    if (disposed || !chunks.length) return Promise.resolve();
    const activeGeneration = generation;
    const voice = localVoice();
    return new Promise<void>((resolve) => {
      finishRequest = resolve;
      void (async () => {
        try {
          if (!voice && !compactSupported) throw speechError('speech-unavailable');
          for (const chunk of chunks) {
            if (disposed || activeGeneration !== generation) return;
            if (voice) await speakNativeChunk(chunk, voice, activeGeneration);
            else await speakCompactChunk(chunk, activeGeneration);
          }
        } catch (error) {
          if (!disposed && activeGeneration === generation) {
            options.onError(error instanceof Error ? error.message : 'speech-failed');
            stop();
          }
        } finally {
          if (activeGeneration === generation) {
            ownsNativeSpeech = false;
            setSpeaking(false);
            finishRequest = null;
          }
          resolve();
        }
      })();
    });
  }

  synthesis?.addEventListener?.('voiceschanged', emitCapability);

  return {
    speak,
    stop,
    unlock,
    getCapability,
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      synthesis?.removeEventListener?.('voiceschanged', emitCapability);
      cancelWorkerReady?.();
      cancelWorkerReady = null;
      worker?.terminate();
      worker = null;
      workerReady = null;
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      context = null;
    },
  };
}
