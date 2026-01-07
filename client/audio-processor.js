/**
 * Audio Processor
 * Handles audio capture from microphone and playback of received audio
 */

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.captureCallback = null;
    this.isCapturing = false;

    // Playback
    this.playbackQueue = [];
    this.isPlaying = false;
    this.currentSource = null;

    // Audio settings
    this.sampleRate = 16000;
    this.chunkSize = 2048;
  }

  async requestMicrophonePermission() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true, // Use system defaults to avoid constraint errors
      });

      console.log("🎤 Microphone permission granted");
      return true;
    } catch (error) {
      console.error("Microphone permission error details:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);

      // Pass the specific error name/message to help debugging
      throw error;
    }
  }

  async startCapture(callback) {
    console.log('🎤 AudioProcessor.startCapture called, isCapturing:', this.isCapturing);
    if (this.isCapturing) {
      console.warn("Already capturing audio");
      return;
    }

    this.captureCallback = callback;
    console.log('✅ Callback registered');

    // Create audio context
    // Allow browser to pick native sample rate to avoid hardware mismatch
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    console.log('🔊 AudioContext created, state:', this.audioContext.state);

    // Create source from media stream
    this.sourceNode = this.audioContext.createMediaStreamSource(
      this.mediaStream
    );
    console.log('📡 MediaStreamSource created');

    try {
      // Try to use AudioWorklet (modern API)
      try {
        // Load AudioWorklet module (replaces deprecated ScriptProcessorNode)
        await this.audioContext.audioWorklet.addModule(
          "/client/audio-capture-worklet.js"
        );

        // Create AudioWorkletNode
        this.processorNode = new AudioWorkletNode(
          this.audioContext,
          "audio-capture-processor"
        );

        // Listen for audio data from worklet
        this.processorNode.port.onmessage = (event) => {
          if (!this.isCapturing) return;

          // event.data is ArrayBuffer containing PCM16 data
          const pcm16 = new Int16Array(event.data);

          // Send to callback
          if (this.captureCallback) {
            this.captureCallback(pcm16);
          }
        };

        console.log("✅ AudioWorklet loaded successfully");
      } catch (workletError) {
        console.warn(
          "⚠️ AudioWorklet failed, falling back to ScriptProcessorNode:",
          workletError
        );

        // Fallback to ScriptProcessorNode (deprecated but works)
        this.processorNode = this.audioContext.createScriptProcessor(
          this.chunkSize,
          1,
          1
        );

        this.processorNode.onaudioprocess = (event) => {
          if (!this.isCapturing) return;

          const inputData = event.inputBuffer.getChannelData(0);
          const pcm16 = this.floatTo16BitPCM(inputData);

          if (this.captureCallback) {
            this.captureCallback(pcm16);
          }
        };
        console.log("✅ ScriptProcessorNode fallback initialized");
      }

      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isCapturing = true;
      console.log("🎤 Audio capture started");
    } catch (error) {
      console.error("Failed to initialize audio capture:", error);
      throw error;
    }
  }

  stopCapture() {
    if (!this.isCapturing) return;

    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    console.log("🎤 Audio capture stopped");
  }

  playAudio(audioChunk) {
    // Add to playback queue
    this.playbackQueue.push(audioChunk);

    // Start playback if not already playing
    if (!this.isPlaying) {
      this.processPlaybackQueue();
    }
  }

  async processPlaybackQueue() {
    if (this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    // Get next chunk
    const chunk = this.playbackQueue.shift();

    try {
      // Ensure audio context exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)({
          sampleRate: this.sampleRate,
        });
      }

      // Convert chunk to audio buffer
      const audioBuffer = await this.createAudioBuffer(chunk);

      // Create source and play
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);

      this.currentSource.onended = () => {
        this.currentSource = null;
        this.processPlaybackQueue();
      };

      this.currentSource.start(0);
    } catch (error) {
      console.error("Error playing audio:", error);
      this.processPlaybackQueue();
    }
  }

  stopPlayback() {
    // Clear queue
    this.playbackQueue = [];

    // Stop current playback
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    console.log("🔇 Playback stopped");
  }

  async createAudioBuffer(chunk) {
    // We are now receiving raw PCM16 (16000Hz) from the server
    // No need for decodeAudioData which fails on partial chunks

    // Create view of the data as 16-bit integers
    const int16Data = new Int16Array(chunk.buffer || chunk);

    // Convert to Float32 for Web Audio API
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      // Normalize 16-bit signed integer to [-1.0, 1.0]
      float32Data[i] = int16Data[i] / 32768.0;
    }

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // channels
      float32Data.length,
      this.sampleRate // 16000
    );

    // Copy data to channel 0
    audioBuffer.getChannelData(0).set(float32Data);

    return audioBuffer;
  }

  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  getAudioStream() {
    return this.mediaStream;
  }

  cleanup() {
    this.stopCapture();
    this.stopPlayback();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Make available globally
if (typeof window !== "undefined") {
  window.AudioProcessor = AudioProcessor;
}
