import { afterEach, describe, expect, it, vi } from 'vitest';
import { StreamingVoiceResampler, VoiceActivityDetector, VoiceDecodeQueue } from '../lib/voice-audio';
import { createLocalVoiceInput, type VoiceInputStatus } from '../lib/local-voice-input';

const frame = (amplitude: number, ms = 20) => new Float32Array(ms * 16).fill(amplitude);

describe('local voice audio processing', () => {
  it('downsamples microphone frames continuously without dropping boundary samples', () => {
    const resampler = new StreamingVoiceResampler(48000);
    expect(Array.from(resampler.process(new Float32Array([0, 0.3])))).toEqual([]);
    const first = resampler.process(new Float32Array([0.6, 0.9, 0.6, 0.3]));
    expect(Array.from(first)).toEqual([expect.closeTo(0.3), expect.closeTo(0.6)]);
  });

  it('preserves duration and constant amplitude across non-integer sample-rate chunks', () => {
    const resampler = new StreamingVoiceResampler(44100);
    const output: number[] = [];
    const input = new Float32Array(44100).fill(0.25);
    for (let offset = 0; offset < input.length; offset += 512) {
      output.push(...resampler.process(input.slice(offset, offset + 512)));
    }
    expect(output).toHaveLength(16000);
    expect(output.every(value => Math.abs(value - 0.25) < 0.00001)).toBe(true);
  });

  it('does not interpret silence, steady quiet background noise, or a click as an utterance', () => {
    const vad = new VoiceActivityDetector();
    for (let i = 0; i < 100; i++) expect(vad.process(frame(0.005), false).started).toBe(false);
    expect(vad.process(frame(0.2), false).started).toBe(false);
    for (let i = 0; i < 60; i++) {
      const result = vad.process(frame(0), false);
      expect(result.started).toBe(false);
      expect(result.utterance).toBeUndefined();
    }
  });

  it('keeps brief pauses inside a turn and emits one final audio buffer after sustained silence', () => {
    const vad = new VoiceActivityDetector();
    let starts = 0;
    for (let i = 0; i < 30; i++) starts += Number(vad.process(frame(0.08), false).started);
    for (let i = 0; i < 15; i++) expect(vad.process(frame(0), false).utterance).toBeUndefined();
    for (let i = 0; i < 20; i++) starts += Number(vad.process(frame(0.08), false).started);
    const endings: Float32Array[] = [];
    for (let i = 0; i < 60; i++) {
      const result = vad.process(frame(0), false);
      if (result.utterance) endings.push(result.utterance);
    }
    expect(starts).toBe(1);
    expect(endings).toHaveLength(1);
    expect(endings[0].length).toBeGreaterThan(16000);
    expect(vad.snapshot()).toHaveLength(0);
  });

  it('requires stronger sustained input to interrupt assistant playback', () => {
    const vad = new VoiceActivityDetector();
    for (let i = 0; i < 30; i++) expect(vad.process(frame(0.025), true).started).toBe(false);
    let started = false;
    for (let i = 0; i < 20; i++) started ||= vad.process(frame(0.2), true).started;
    expect(started).toBe(true);
  });

  it('bounds a continuous utterance and clears captured audio on reset', () => {
    const vad = new VoiceActivityDetector();
    let ending: Float32Array | undefined;
    for (let i = 0; i < 800 && !ending; i++) ending = vad.process(frame(0.08), false).utterance;
    expect(ending).toBeDefined();
    expect(ending!.length).toBeLessThanOrEqual(15 * 16000);
    vad.process(frame(0.08), false);
    vad.reset();
    expect(vad.snapshot()).toHaveLength(0);
  });
});

describe('local transcription backpressure', () => {
  it('runs one inference and replaces queued partial audio with the complete utterance', () => {
    const queue = new VoiceDecodeQueue();
    queue.beginGeneration();
    const active = queue.offer(frame(0.1), false)!;
    expect(queue.offer(frame(0.2), false)).toBeNull();
    expect(queue.offer(frame(0.3), true)).toBeNull();
    const completed = queue.complete(active.id);
    expect(completed.accepted).toBe(false);
    expect(completed.next?.final).toBe(true);
    expect(completed.next?.audio[0]).toBeCloseTo(0.3);
    expect(queue.complete(completed.next!.id).accepted).toBe(true);
  });

  it('drops stale results and queued audio after stop or a new spoken turn', () => {
    const queue = new VoiceDecodeQueue();
    queue.beginGeneration();
    const old = queue.offer(frame(0.1), true)!;
    queue.offer(frame(0.2), false);
    queue.beginGeneration();
    expect(queue.offer(frame(0.4), true)).toBeNull();
    const result = queue.complete(old.id);
    expect(result.accepted).toBe(false);
    expect(result.next?.audio[0]).toBeCloseTo(0.4);
    queue.clear();
    expect(queue.complete(result.next!.id).accepted).toBe(false);
  });
});

describe('microphone and model lifecycle cancellation', () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup(getUserMedia: () => Promise<MediaStream>) {
    const statuses: VoiceInputStatus[] = [];
    const errors: string[] = [];
    const workers: FakeWorker[] = [];
    let contextClosed = false;
    class FakeWorker {
      onmessage: ((event: { data: { type: string } }) => void) | null = null;
      onerror: (() => void) | null = null;
      terminated = false;
      messages: unknown[] = [];
      constructor() { workers.push(this); }
      postMessage(value: unknown) { this.messages.push(value); }
      terminate() { this.terminated = true; }
    }
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('AudioContext', class {
      resume() { return Promise.resolve(); }
      close() { contextClosed = true; return Promise.resolve(); }
    });
    vi.stubGlobal('AudioWorkletNode', class {});
    vi.stubGlobal('Worker', FakeWorker);
    const input = createLocalVoiceInput({
      language: 'te', onStatus: value => statuses.push(value), onError: value => errors.push(value),
      onProgress: () => undefined, onPartial: () => undefined, onTranscript: () => undefined,
      onSpeechStart: () => undefined, onLevel: () => undefined,
    });
    return { input, statuses, errors, workers, closed: () => contextClosed };
  }

  it('stops the eventual microphone stream if permission resolves after Stop', async () => {
    let grant!: (stream: MediaStream) => void;
    let stopped = false;
    const track = { stop: () => { stopped = true; } };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const pending = new Promise<MediaStream>(resolve => { grant = resolve; });
    const harness = setup(() => pending);
    expect(harness.workers).toHaveLength(0);
    const starting = harness.input.start();
    harness.input.stop();
    grant(stream);
    await starting;
    expect(stopped).toBe(true);
    expect(harness.closed()).toBe(true);
    expect(harness.workers).toHaveLength(0);
    expect(harness.statuses).toEqual(['loading', 'stopped']);
    expect(harness.errors).toEqual([]);
  });

  it('does not download the model when microphone permission is refused', async () => {
    const harness = setup(async () => { throw new DOMException('Denied', 'NotAllowedError'); });
    await harness.input.start();
    expect(harness.errors).toEqual(['microphone-denied']);
    expect(harness.workers).toHaveLength(0);
    expect(harness.closed()).toBe(true);
  });

  it('recognizes a microphone denial from another browser realm', async () => {
    const harness = setup(async () => { throw { name: 'NotAllowedError', message: 'Permission denied' }; });
    await harness.input.start();
    expect(harness.errors).toEqual(['microphone-denied']);
    expect(harness.workers).toHaveLength(0);
  });

  it('terminates model loading, settles start, and ignores late model readiness after Stop', async () => {
    let stopped = false;
    const track = { onended: null, stop: () => { stopped = true; } };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
    const harness = setup(async () => stream);
    const starting = harness.input.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(harness.workers).toHaveLength(1);
    const worker = harness.workers[0];
    harness.input.stop();
    await starting;
    worker.onmessage?.({ data: { type: 'ready' } });
    expect(stopped).toBe(true);
    expect(worker.terminated).toBe(true);
    expect(harness.statuses).toEqual(['loading', 'stopped']);
    expect(harness.errors).toEqual([]);
  });
});
