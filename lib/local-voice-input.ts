import { StreamingVoiceResampler, VoiceActivityDetector, VoiceDecodeQueue, type VoiceDecodeRequest } from './voice-audio';

export type VoiceInputStatus = 'loading' | 'listening' | 'hearing' | 'transcribing' | 'stopped';
export interface LocalVoiceInputOptions {
  language: 'en' | 'hi' | 'te';
  onStatus: (status: VoiceInputStatus) => void;
  onProgress: (progress: { loaded: number; total: number }) => void;
  onPartial: (text: string) => void;
  onTranscript: (text: string) => void;
  onSpeechStart: () => void;
  onLevel: (level: number) => void;
  onError: (code: string) => void;
}

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id?: number; code: string };

/** Optional, local-only recognition. Construction does not load models or request a mic. */
export function createLocalVoiceInput(options: LocalVoiceInputOptions): {
  start: () => Promise<void>;
  stop: () => void;
  dispose: () => void;
  setPlaybackActive: (active: boolean) => void;
} {
  let generation = 0;
  let disposed = false;
  let running = false;
  let playbackActive = false;
  let worker: Worker | null = null;
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let capture: AudioWorkletNode | null = null;
  let silent: GainNode | null = null;
  let finishLoading: ((ready: boolean) => void) | null = null;
  let lastPartialAt = 0;
  let lastLevelAt = 0;
  let hearing = false;
  let status: VoiceInputStatus = 'stopped';
  const vad = new VoiceActivityDetector();
  const queue = new VoiceDecodeQueue();

  const setStatus = (next: VoiceInputStatus) => {
    if (status === next) return;
    status = next;
    options.onStatus(next);
  };

  function stop(): void {
    generation += 1;
    running = false;
    hearing = false;
    finishLoading?.(false);
    finishLoading = null;
    if (capture) {
      capture.port.onmessage = null;
      capture.port.close();
      capture.disconnect();
    }
    source?.disconnect();
    silent?.disconnect();
    capture = null;
    source = null;
    silent = null;
    stream?.getTracks().forEach(track => {
      track.onended = null;
      track.stop();
    });
    stream = null;
    if (context) void context.close().catch(() => undefined);
    context = null;
    worker?.terminate();
    worker = null;
    queue.clear();
    vad.reset();
    options.onLevel(0);
    options.onPartial('');
    setStatus('stopped');
  }

  function fail(code: string): void {
    stop();
    options.onError(code);
  }

  function dispatch(request: VoiceDecodeRequest | null): void {
    if (!request || !worker || !running) return;
    worker.postMessage({
      type: 'decode', id: request.id, audio: request.audio, language: options.language,
    }, [request.audio.buffer]);
  }

  async function start(): Promise<void> {
    if (disposed || running) return;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      options.onError('microphone-unavailable');
      return;
    }
    if (typeof AudioContext === 'undefined' || typeof AudioWorkletNode === 'undefined' || typeof Worker === 'undefined') {
      options.onError('audio-unavailable');
      return;
    }
    running = true;
    const session = ++generation;
    const current = () => running && !disposed && generation === session;
    setStatus('loading');
    options.onProgress({ loaded: 0, total: 0 });
    let errorCode = 'audio-unavailable';

    try {
      // Resume inside the explicit button gesture, before permission/network awaits.
      const audioContext = new AudioContext({ sampleRate: 16000 });
      context = audioContext;
      // Attach rejection handling immediately: the permission prompt can remain
      // open after Stop has closed this context.
      const resumed = audioContext.resume().then(() => true, () => false);
      errorCode = 'microphone-unavailable';
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      if (!current()) {
        microphone.getTracks().forEach(track => track.stop());
        return;
      }
      stream = microphone;
      microphone.getAudioTracks().forEach(track => {
        track.onended = () => { if (current()) fail('microphone-unavailable'); };
      });
      errorCode = 'audio-unavailable';
      if (!await resumed) throw new Error('audio-unavailable');
      if (!current()) return;

      errorCode = 'model-unavailable';
      const recognizer = new Worker('/voice/voice-recognition.worker.js', { type: 'module', name: 'voice-recognition' });
      worker = recognizer;
      const ready = new Promise<boolean>(resolve => { finishLoading = resolve; });
      recognizer.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (!current()) return;
        const message = event.data;
        if (message.type === 'ready') {
          finishLoading?.(true);
          finishLoading = null;
        } else if (message.type === 'progress') {
          options.onProgress({ loaded: message.loaded, total: message.total });
        } else if (message.type === 'error') {
          if (message.id !== undefined) {
            const completion = queue.complete(message.id);
            if (!completion.accepted) {
              dispatch(completion.next);
              return;
            }
          }
          fail('model-unavailable');
        } else if (message.type === 'result') {
          const completion = queue.complete(message.id);
          if (completion.accepted && completion.request) {
            const text = message.text.trim();
            if (completion.request.final) {
              options.onPartial('');
              if (text) options.onTranscript(text);
              if (!current()) return;
              if (!hearing) setStatus('listening');
            } else options.onPartial(text);
          }
          dispatch(completion.next);
        }
      };
      recognizer.onerror = event => {
        event.preventDefault();
        if (current()) fail('model-unavailable');
      };
      recognizer.postMessage({ type: 'load' });
      if (!await ready || !current()) return;

      errorCode = 'audio-unavailable';
      await audioContext.audioWorklet.addModule('/voice/pcm-capture.worklet.js');
      if (!current()) return;
      const resampler = new StreamingVoiceResampler(audioContext.sampleRate);
      source = audioContext.createMediaStreamSource(microphone);
      capture = new AudioWorkletNode(audioContext, 'voice-pcm-capture', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
      });
      silent = audioContext.createGain();
      silent.gain.value = 0;
      source.connect(capture);
      capture.connect(silent);
      silent.connect(audioContext.destination);
      lastPartialAt = 0;
      lastLevelAt = 0;
      capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (!current()) return;
        const pcm = resampler.process(event.data);
        const result = vad.process(pcm, playbackActive);
        const now = performance.now();
        if (now - lastLevelAt >= 80) {
          options.onLevel(Math.min(1, result.level * 8));
          lastLevelAt = now;
        }
        hearing = result.active;
        if (result.started) {
          queue.beginGeneration();
          lastPartialAt = now;
          options.onPartial('');
          setStatus('hearing');
          options.onSpeechStart();
          if (!current()) return;
        }
        if (result.utterance) {
          setStatus('transcribing');
          dispatch(queue.offer(result.utterance, true));
        } else if (result.active && now - lastPartialAt >= 1500) {
          lastPartialAt = now;
          dispatch(queue.offer(vad.snapshot(), false));
        } else if (!result.active && status === 'hearing') {
          setStatus('listening');
        }
      };
      setStatus('listening');
    } catch (error) {
      if (!current()) return;
      const name = typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string'
        ? error.name : '';
      fail(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'microphone-denied' : errorCode);
    }
  }

  return {
    start,
    stop,
    dispose: () => { disposed = true; stop(); },
    setPlaybackActive: active => { playbackActive = active; },
  };
}
