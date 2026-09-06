import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalVoiceOutput, selectLocalVoice, splitSpeechText, type LocalVoiceOutput } from '../lib/local-voice-output';
import { getVoiceUiCopy } from '../lib/voice-guide-ui-copy';

function voice(name: string, lang: string, localService = true, isDefault = false): SpeechSynthesisVoice {
  return { name, lang, localService, default: isDefault, voiceURI: name };
}

class FakeUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(text: string) { this.text = text; }
}

class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor(public path: string) { FakeWorker.all.push(this); }
  message(data: unknown) { this.onmessage?.({ data }); }
}

class FakeSource {
  static all: FakeSource[] = [];
  onended: (() => void) | null = null;
  buffer: unknown = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  constructor() { FakeSource.all.push(this); }
}

class FakeAudioContext {
  static all: FakeAudioContext[] = [];
  state = 'suspended';
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => ({ duration: length / sampleRate, getChannelData: () => new Float32Array(length) }));
  createBufferSource = vi.fn(() => new FakeSource());
  constructor() { FakeAudioContext.all.push(this); }
}

let voices: SpeechSynthesisVoice[];
let synthesis: { getVoices: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
let speaking: ReturnType<typeof vi.fn<(speaking: boolean) => void>>;
let error: ReturnType<typeof vi.fn<(code: string) => void>>;
let instances: LocalVoiceOutput[];

function create(language: 'en' | 'hi' | 'te' = 'en') {
  const output = createLocalVoiceOutput({ language, onSpeaking: speaking, onError: error });
  instances.push(output);
  return output;
}

function enableCompact() {
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('window', { speechSynthesis: synthesis, AudioContext: FakeAudioContext });
}

async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }

beforeEach(() => {
  vi.useFakeTimers();
  voices = [];
  speaking = vi.fn();
  error = vi.fn();
  instances = [];
  FakeWorker.all = [];
  FakeSource.all = [];
  FakeAudioContext.all = [];
  synthesis = { getVoices: vi.fn(() => voices), speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('window', { speechSynthesis: synthesis });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('Worker', undefined);
});

afterEach(() => {
  for (const instance of instances) instance.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('local speech voice selection', () => {
  it('requires a local voice in the selected language and prefers its Indian locale', () => {
    const selected = voice('India', 'en-IN');
    expect(selectLocalVoice([voice('Cloud', 'en-IN', false), voice('US', 'en-US', true, true), selected], 'en')).toBe(selected);
    expect(selectLocalVoice([voice('Cloud Hindi', 'hi-IN', false), voice('English', 'en-IN')], 'hi')).toBeNull();
    expect(selectLocalVoice([voice('Telugu', 'te_IN')], 'te')?.name).toBe('Telugu');
  });

  it('does not fall back to remote voices when private speech is unavailable', async () => {
    voices = [voice('Cloud Telugu', 'te-IN', false)];
    const output = create('te');
    expect(output.getCapability()).toEqual({ available: false, voiceName: null, local: false, quality: 'unavailable' });
    await output.speak('ఈ దశను తనిఖీ చేయండి.');
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('speech-unavailable');
  });

  it('picks up device voices that arrive after the browser voiceschanged event', async () => {
    const onCapability = vi.fn();
    const output = createLocalVoiceOutput({ language: 'hi', onSpeaking: speaking, onError: error, onCapability });
    instances.push(output);
    expect(output.getCapability().available).toBe(false);
    voices = [voice('Hindi local', 'hi-IN')];
    const handler = synthesis.addEventListener.mock.calls[0][1] as () => void;
    handler();
    expect(onCapability).toHaveBeenCalledWith({ available: true, voiceName: 'Hindi local', local: true, quality: 'device' });
    output.dispose();
    expect(synthesis.removeEventListener).toHaveBeenCalledWith('voiceschanged', handler);
  });
});

describe('native speech lifecycle', () => {
  beforeEach(() => { voices = [voice('English local', 'en-IN')]; });

  it('resolves an interrupted request immediately and ignores late browser callbacks', async () => {
    const output = create();
    const first = output.speak('Check the number.');
    const firstUtterance = synthesis.speak.mock.calls[0][0] as FakeUtterance;
    firstUtterance.onstart?.();
    const lateEnd = firstUtterance.onend;
    output.stop();
    await first;
    expect(synthesis.cancel).toHaveBeenCalledOnce();
    expect(speaking).toHaveBeenLastCalledWith(false);
    const second = output.speak('Show the photo.');
    const secondUtterance = synthesis.speak.mock.calls[1][0] as FakeUtterance;
    secondUtterance.onstart?.();
    lateEnd?.();
    await flush();
    expect(speaking).toHaveBeenLastCalledWith(true);
    secondUtterance.onend?.();
    await second;
    expect(speaking).toHaveBeenLastCalledWith(false);
    expect(error).not.toHaveBeenCalled();
  });

  it('cancels stalled speech and returns a recoverable error', async () => {
    const output = create();
    const task = output.speak('Check this field.');
    await vi.advanceTimersByTimeAsync(4_000);
    await task;
    expect(error).toHaveBeenCalledWith('speech-timeout');
    expect(synthesis.cancel).toHaveBeenCalledOnce();
  });

  it('reports blocked audio without leaving the request pending', async () => {
    const output = create();
    const task = output.speak('Check this field.');
    const utterance = synthesis.speak.mock.calls[0][0] as FakeUtterance;
    utterance.onerror?.({ error: 'not-allowed' });
    await task;
    expect(error).toHaveBeenCalledWith('speech-blocked');
    expect(synthesis.cancel).toHaveBeenCalledOnce();
  });

  it('speaks short sentences sequentially and stops queued sentences on cancellation', async () => {
    const output = create();
    const task = output.speak('Check the number. Then compare the date.');
    expect(synthesis.speak).toHaveBeenCalledOnce();
    const first = synthesis.speak.mock.calls[0][0] as FakeUtterance;
    first.onstart?.();
    first.onend?.();
    await flush();
    expect(synthesis.speak).toHaveBeenCalledTimes(2);
    output.stop();
    await task;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not cancel speech owned elsewhere when this instance is idle', () => {
    const output = create();
    output.stop();
    output.dispose();
    expect(synthesis.cancel).not.toHaveBeenCalled();
  });
});

describe('compact speech worker', () => {
  beforeEach(enableCompact);

  it.each(['en', 'hi', 'te'] as const)('plays local PCM for %s when no native voice is installed', async (language) => {
    const output = create(language);
    expect(output.getCapability()).toEqual({ available: true, voiceName: 'eSpeak NG', local: true, quality: 'compact' });
    expect(FakeWorker.all).toHaveLength(0);
    const unlock = output.unlock();
    await flush();
    const worker = FakeWorker.all[0];
    expect(worker.path).toBe('/voice-assets/espeak-ng-1.49.1/espeakng.worker.js');
    worker.message('ready');
    await unlock;
    const task = output.speak('A short sentence');
    await flush();
    expect(worker.postMessage.mock.calls[0][0]).toEqual({ method: 'set_voice', args: [language] });
    const { callback } = worker.postMessage.mock.calls[2][0] as { callback: string };
    worker.message({ callback, result: [new Float32Array([0, 0.1, -0.1, 0]).buffer, []] });
    worker.message({ callback, done: true, result: [null] });
    expect(speaking).toHaveBeenLastCalledWith(true);
    expect(FakeSource.all[0].start).toHaveBeenCalledOnce();
    FakeSource.all[0].onended?.();
    await task;
    expect(speaking).toHaveBeenLastCalledWith(false);
    expect(error).not.toHaveBeenCalled();
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('stops all audio immediately and drops late worker samples from the previous turn', async () => {
    const output = create('te');
    const unlock = output.unlock();
    await flush();
    const worker = FakeWorker.all[0];
    worker.message('ready');
    await unlock;
    const task = output.speak('ఈ దశను తనిఖీ చేయండి');
    await flush();
    const { callback } = worker.postMessage.mock.calls[2][0] as { callback: string };
    worker.message({ callback, result: [new Float32Array([0.1, -0.1]).buffer] });
    output.stop();
    await task;
    expect(FakeSource.all[0].stop).toHaveBeenCalledOnce();
    worker.message({ callback, result: [new Float32Array([0.1, -0.1]).buffer] });
    expect(FakeSource.all).toHaveLength(1);
    expect(speaking).toHaveBeenLastCalledWith(false);
  });

  it('surfaces a failed worker download and permits a later retry', async () => {
    const output = create('te');
    const unlock = output.unlock();
    const rejected = expect(unlock).rejects.toThrow('speech-load-failed');
    await flush();
    FakeWorker.all[0].onerror?.();
    await rejected;
    expect(output.getCapability().available).toBe(false);
    const retry = output.unlock();
    await flush();
    FakeWorker.all[1].message('ready');
    await retry;
    expect(output.getCapability().quality).toBe('compact');
  });

  it('reports a blocked Web Audio context without fetching a voice', async () => {
    class BlockedAudioContext extends FakeAudioContext {
      resume = vi.fn(async () => { throw new Error('NotAllowedError'); });
    }
    vi.stubGlobal('window', { speechSynthesis: synthesis, AudioContext: BlockedAudioContext });
    const output = create('te');
    await expect(output.unlock()).rejects.toThrow('speech-blocked');
    expect(FakeWorker.all).toHaveLength(0);
  });

  it('disposes a pending worker download without late audio or unresolved speech', async () => {
    const output = create('hi');
    const unlock = output.unlock();
    await flush();
    const task = output.speak('जाँच करें');
    output.dispose();
    await Promise.all([unlock, task]);
    expect(FakeWorker.all[0].terminate).toHaveBeenCalledOnce();
    expect(FakeAudioContext.all[0].close).toHaveBeenCalledOnce();
    expect(output.getCapability().available).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('speech text and multilingual UI', () => {
  it('keeps Telugu and Hindi sentence content intact while making bounded chunks', () => {
    expect(splitSpeechText('  यह नंबर जाँचें।  फिर फोटो देखें। ')).toEqual(['यह नंबर जाँचें।', 'फिर फोटो देखें।']);
    expect(splitSpeechText('ఈ నంబర్‌ను చూడండి. ఫోటోను చూడండి.')).toEqual(['ఈ నంబర్‌ను చూడండి.', 'ఫోటోను చూడండి.']);
    expect(splitSpeechText('word '.repeat(100)).every((chunk) => chunk.length <= 200)).toBe(true);
    expect(splitSpeechText('   ')).toEqual([]);
  });

  it('provides complete guidance and errors in all three languages', () => {
    const en = getVoiceUiCopy('en');
    for (const language of ['hi', 'te'] as const) {
      const copy = getVoiceUiCopy(language);
      expect(Object.keys(copy).sort()).toEqual(Object.keys(en).sort());
      expect(Object.keys(copy.errors).sort()).toEqual(Object.keys(en.errors).sort());
      expect(Object.keys(copy.state).sort()).toEqual(Object.keys(en.state).sort());
      expect(copy.start).not.toBe(en.start);
      expect(copy.privacy).not.toBe(en.privacy);
    }
  });
});
