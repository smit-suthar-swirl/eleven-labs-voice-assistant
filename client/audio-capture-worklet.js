/**
 * Audio Capture Worklet Processor
 * Replaces deprecated ScriptProcessorNode with modern AudioWorklet API
 * Runs on separate audio thread for better performance
 */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Match current chunk size (2048 samples = ~128ms at 16kHz)
    this.chunkSize = 2048;
    this.buffer = new Float32Array(this.chunkSize);
    this.bufferIndex = 0;

    console.log('🎤 AudioCaptureProcessor initialized');
  }

  /**
   * Process audio samples
   * Called for each render quantum (128 samples typically)
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    // No input available
    if (!input || input.length === 0) {
      return true; // Keep processor alive
    }

    const inputChannel = input[0]; // Mono channel (channel 0)

    // Collect samples until we have a full chunk
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      // When buffer is full, convert to PCM16 and send to main thread
      if (this.bufferIndex >= this.chunkSize) {
        const pcm16 = this.floatTo16BitPCM(this.buffer);

        // Post to main thread using transferable for zero-copy performance
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);

        // Reset buffer
        this.buffer = new Float32Array(this.chunkSize);
        this.bufferIndex = 0;
      }
    }

    return true; // Keep processor alive
  }

  /**
   * Convert Float32Array to Int16Array (PCM16 format)
   * Same conversion logic as current audio-processor.js
   */
  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1.0, 1.0]
      const s = Math.max(-1, Math.min(1, float32Array[i]));

      // Convert to 16-bit signed integer
      // Negative: multiply by 0x8000 (32768)
      // Positive: multiply by 0x7FFF (32767)
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return int16Array;
  }
}

// Register the processor
registerProcessor('audio-capture-processor', AudioCaptureProcessor);
