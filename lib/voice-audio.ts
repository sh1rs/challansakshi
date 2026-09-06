/** Only transient PCM and scheduling state live here. Nothing is persisted. */
export const VOICE_SAMPLE_RATE = 16000;

/** Weighted averaging retains fractional frame boundaries when downsampling. */
export class StreamingVoiceResampler {
  private readonly ratio: number;
  private weight = 0;
  private sum = 0;

  constructor(inputRate: number, outputRate = VOICE_SAMPLE_RATE) {
    if (!Number.isFinite(inputRate) || inputRate <= 0 || !Number.isFinite(outputRate) || outputRate <= 0) {
      throw new Error('audio-unavailable');
    }
    this.ratio = inputRate / outputRate;
  }

  process(input: Float32Array): Float32Array {
    const output: number[] = [];
    for (const raw of input) {
      const sample = Number.isFinite(raw) ? Math.max(-1, Math.min(1, raw)) : 0;
      let remaining = 1;
      while (remaining > 1e-9) {
        const take = Math.min(remaining, this.ratio - this.weight);
        this.sum += sample * take;
        this.weight += take;
        remaining -= take;
        if (this.weight >= this.ratio - 1e-9) {
          output.push(this.sum / this.ratio);
          this.sum = 0;
          this.weight = 0;
        }
      }
    }
    return Float32Array.from(output);
  }
}

function joinAudio(chunks: Float32Array[], limit = Infinity): Float32Array {
  const count = Math.min(limit, chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  const audio = new Float32Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    const length = Math.min(chunk.length, count - offset);
    if (length <= 0) break;
    audio.set(chunk.subarray(0, length), offset);
    offset += length;
  }
  return audio;
}

export interface VoiceActivityResult {
  started: boolean;
  active: boolean;
  level: number;
  utterance?: Float32Array;
}

/** Energy-based endpointing, not a language or speaker identity classifier. */
export class VoiceActivityDetector {
  private noise = 0.003;
  private onsetMs = 0;
  private silenceMs = 0;
  private voicedMs = 0;
  private samples = 0;
  private active = false;
  private preRoll: Float32Array[] = [];
  private chunks: Float32Array[] = [];

  reset(): void {
    this.noise = 0.003;
    this.clearUtterance();
  }

  private clearUtterance(): void {
    this.onsetMs = 0;
    this.silenceMs = 0;
    this.voicedMs = 0;
    this.samples = 0;
    this.active = false;
    this.preRoll = [];
    this.chunks = [];
  }

  snapshot(): Float32Array {
    return joinAudio(this.chunks, 15 * VOICE_SAMPLE_RATE);
  }

  process(audio: Float32Array, playbackActive: boolean): VoiceActivityResult {
    if (!audio.length) return { started: false, active: this.active, level: 0 };
    let squared = 0;
    for (const value of audio) squared += value * value;
    const level = Math.sqrt(squared / audio.length);
    const durationMs = audio.length / VOICE_SAMPLE_RATE * 1000;
    const threshold = this.active
      ? Math.max(0.009, this.noise * 2.2)
      : Math.max(playbackActive ? 0.065 : 0.014, this.noise * (playbackActive ? 5 : 3.2));
    const voiced = level > threshold;
    let started = false;

    if (!this.active) {
      this.preRoll.push(audio);
      let preRollSamples = this.preRoll.reduce((sum, chunk) => sum + chunk.length, 0);
      while (this.preRoll.length > 1 && preRollSamples > VOICE_SAMPLE_RATE * 0.3) {
        preRollSamples -= this.preRoll.shift()!.length;
      }
      if (voiced) this.onsetMs += durationMs;
      else {
        this.onsetMs = 0;
        // Do not teach the noise floor from the assistant's own loudspeaker.
        if (!playbackActive) this.noise = this.noise * 0.96 + Math.min(level, 0.035) * 0.04;
      }
      if (this.onsetMs >= (playbackActive ? 240 : 140)) {
        this.active = true;
        started = true;
        this.chunks = this.preRoll;
        this.preRoll = [];
        this.samples = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        this.voicedMs = this.onsetMs;
      }
    } else {
      this.chunks.push(audio);
      this.samples += audio.length;
      if (voiced) {
        this.voicedMs += durationMs;
        this.silenceMs = 0;
      } else this.silenceMs += durationMs;
    }

    if (this.active && (this.silenceMs >= 780 || this.samples >= VOICE_SAMPLE_RATE * 15)) {
      const utterance = this.voicedMs >= 260 ? this.snapshot() : undefined;
      this.clearUtterance();
      return { started, active: false, level, utterance };
    }
    return { started, active: this.active, level };
  }
}

export interface VoiceDecodeRequest {
  id: number;
  generation: number;
  audio: Float32Array;
  final: boolean;
}

/** A single active decode plus one replaceable pending buffer bounds work. */
export class VoiceDecodeQueue {
  private generation = 0;
  private serial = 0;
  private active: VoiceDecodeRequest | null = null;
  private pending: VoiceDecodeRequest | null = null;
  private finalOffered = false;

  beginGeneration(): void {
    this.generation += 1;
    this.pending = null;
    this.finalOffered = false;
  }

  clear(): void {
    this.beginGeneration();
    this.active = null;
  }

  offer(audio: Float32Array, final: boolean): VoiceDecodeRequest | null {
    if (this.finalOffered) return null;
    const request = { id: ++this.serial, generation: this.generation, audio, final };
    if (final) this.finalOffered = true;
    if (this.active) {
      this.pending = request;
      return null;
    }
    this.active = request;
    return request;
  }

  complete(id: number): { accepted: boolean; request?: VoiceDecodeRequest; next: VoiceDecodeRequest | null } {
    if (this.active?.id !== id) return { accepted: false, next: null };
    const request = this.active;
    const accepted = request.generation === this.generation && (request.final || !this.finalOffered);
    this.active = this.pending;
    this.pending = null;
    return { accepted, request, next: this.active };
  }
}
