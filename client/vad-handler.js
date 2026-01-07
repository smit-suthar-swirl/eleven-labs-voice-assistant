/**
 * Voice Activity Detection Handler
 * Detects when user starts/stops speaking for interruption handling
 */

class VADHandler {
  constructor() {
    this.vad = null;
    this.isActive = false;
    this.eventListeners = {};
    this.isSpeaking = false;
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  async start(mediaStream) {
    if (this.isActive) {
      console.warn('VAD already active');
      return;
    }

    // Use built-in VAD (Deepgram handles transcription VAD on server)
    // This is just for interruption detection
    this.useInterruptionVAD(mediaStream);
  }

  useInterruptionVAD(mediaStream) {
    // Volume-based VAD for interruption detection only
    // Deepgram handles actual speech-to-text VAD on server
    console.log('✅ Interruption VAD initialized (client-side)');

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);

    source.connect(analyser);
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const threshold = 100; // Very high - only real speech
    const minSpeechDuration = 1000; // 1 second - full sentences only
    let speechTimeout = null;
    let speechStartTime = null;
    let consecutiveFrames = 0;
    const requiredFrames = 8; // Need 8 frames above threshold for more consistency

    const checkVolume = () => {
      if (!this.isActive) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for better accuracy
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);

      if (rms > threshold) {
        consecutiveFrames++;

        if (!this.isSpeaking && consecutiveFrames >= requiredFrames) {
          if (!speechStartTime) {
            speechStartTime = Date.now();
          }

          // Only trigger after sustained speech
          if (Date.now() - speechStartTime > minSpeechDuration) {
            this.isSpeaking = true;
            this.emit('speechStart');
            console.log('🎤 User speaking (interruption detected)');
          }
        }

        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            speechStartTime = null;
            consecutiveFrames = 0;
            this.emit('speechEnd');
            console.log('🤐 User stopped speaking');
          }
        }, 1500); // 1.5 seconds silence before ending
      } else {
        // Below threshold - reset
        if (consecutiveFrames > 0) {
          consecutiveFrames = Math.max(0, consecutiveFrames - 1);
        }
        if (!this.isSpeaking) {
          speechStartTime = null;
        }
      }

      requestAnimationFrame(checkVolume);
    };

    this.isActive = true;
    checkVolume();
  }

  stop() {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.vad && this.vad.destroy) {
      this.vad.destroy();
      this.vad = null;
    }

    this.isSpeaking = false;
    console.log('🛑 VAD stopped');
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.VADHandler = VADHandler;
}
