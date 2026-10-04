/**
 * AudioWorklet processor: mic input (context rate, usually 48kHz) -> 16kHz mono PCM16.
 *
 * Runs on the audio rendering thread. Each finished chunk is posted to the main
 * thread as a transferable ArrayBuffer of little-endian Int16 samples — the raw
 * format ElevenLabs Conversational AI (and most STT APIs) expect.
 *
 * processorOptions:
 *   targetSampleRate  default 16000
 *   chunkSamples      default 1600 (100ms at 16kHz = 3200 bytes)
 *
 * Served from /public so it can be loaded with audioWorklet.addModule().
 */
class Pcm16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    const targetSampleRate = opts.targetSampleRate || 16000;
    this.chunkSamples = opts.chunkSamples || 1600;

    // `sampleRate` is a global in AudioWorkletGlobalScope (the context's rate).
    this.ratio = sampleRate / targetSampleRate;
    this.chunk = new Int16Array(this.chunkSamples);
    this.offset = 0;

    // Box-filter downsampling state, carried across 128-frame render quanta.
    this.acc = 0;
    this.count = 0;
    this.pos = 0;
  }

  push(sample) {
    const s = Math.max(-1, Math.min(1, sample));
    this.chunk[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    if (this.offset === this.chunkSamples) {
      const buffer = this.chunk.buffer;
      this.port.postMessage(buffer, [buffer]);
      this.chunk = new Int16Array(this.chunkSamples);
      this.offset = 0;
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channels = input.length;
    const frames = input[0].length;

    for (let i = 0; i < frames; i++) {
      // Downmix to mono.
      let s = 0;
      for (let c = 0; c < channels; c++) s += input[c][i];
      s /= channels;

      if (this.ratio <= 1) {
        this.push(s);
        continue;
      }

      // Average every `ratio` input samples into one output sample. Cheap
      // low-pass that avoids the worst aliasing from naive decimation.
      this.acc += s;
      this.count++;
      this.pos += 1;
      if (this.pos >= this.ratio) {
        this.pos -= this.ratio;
        this.push(this.acc / this.count);
        this.acc = 0;
        this.count = 0;
      }
    }

    return true;
  }
}

registerProcessor("pcm16-processor", Pcm16Processor);
