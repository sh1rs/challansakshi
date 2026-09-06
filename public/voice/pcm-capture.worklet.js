/* Captures only microphone PCM. The graph's output is intentionally silent. */
class VoicePcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(512);
    this.offset = 0;
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || !channels.length) return true;
    const length = channels[0].length;
    for (let index = 0; index < length; index++) {
      let sample = 0;
      for (const channel of channels) sample += channel[index] || 0;
      this.buffer[this.offset++] = sample / channels.length;
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(512);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('voice-pcm-capture', VoicePcmCapture);
