const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

class DeepgramHandler {
  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    this.client = null;
    this.connection = null;
    this.isListening = false;
    this.currentTranscript = "";
    this.onTranscriptCallback = null;
    this.onFinalTranscriptCallback = null;

    console.log("🎤 Deepgram initialized");
    console.log(
      `🔑 API Key loaded: ${
        this.apiKey
          ? "Yes (" + this.apiKey.substring(0, 8) + "...)"
          : "NO - MISSING!"
      }`
    );
  }

  /**
   * Start streaming transcription session
   */
  async startStreaming(onTranscript, onFinalTranscript) {
    if (this.isListening) {
      console.warn("⚠️ Already listening");
      return;
    }

    try {
      this.client = createClient(this.apiKey);
      this.onTranscriptCallback = onTranscript;
      this.onFinalTranscriptCallback = onFinalTranscript;

      // Create live transcription connection
      this.connection = this.client.listen.live({
        model: "nova-2",
        language: "en",
        smart_format: true,
        punctuate: true,
        interim_results: false, // Only get final results to avoid multiple bubbles
        vad_events: true, // Enable VAD events
        encoding: "linear16",
        sample_rate: 16000,
        channels: 1,
      });

      console.log("📡 Waiting for Deepgram connection to open...");

      // Wait for connection to open FIRST
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Deepgram connection timeout"));
        }, 10000);

        this.connection.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(timeout);
          console.log("🟢 Deepgram connection opened and ready");
          this.isListening = true;
          resolve();
        });

        this.connection.on(LiveTranscriptionEvents.Error, (error) => {
          clearTimeout(timeout);
          console.error("❌ Deepgram connection error:", error);
          reject(error);
        });
      });

      // NOW setup other event listeners (after connection is open)
      this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;

        if (transcript && transcript.trim().length > 0) {
          const isFinal = data.is_final;

          if (isFinal) {
            // Only process final transcripts to avoid multiple bubbles
            console.log(`📝 Final: "${transcript}"`);

            // Filter out very short utterances (single words like "hello", "you")
            const wordCount = transcript.trim().split(/\s+/).length;

            if (wordCount >= 3) {
              // Only accept 3+ word sentences
              if (this.onFinalTranscriptCallback) {
                this.onFinalTranscriptCallback(transcript);
              }
            } else {
              console.log(
                `⏭️ Skipped short utterance (${wordCount} words): "${transcript}"`
              );
            }
          }
        }
      });

      this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        console.log("🔚 Utterance ended");
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("🔴 Deepgram connection closed");
        this.isListening = false;
      });
    } catch (error) {
      console.error("❌ Failed to start Deepgram:", error);
      throw error;
    }
  }

  /**
   * Send audio chunk to Deepgram
   */
  sendAudio(audioChunk) {
    if (!this.isListening || !this.connection) {
      console.warn("⚠️ Not listening, cannot send audio");
      return;
    }

    try {
      // Send raw PCM16 audio data
      this.connection.send(audioChunk);
    } catch (error) {
      console.error("❌ Failed to send audio:", error);
    }
  }

  /**
   * Stop streaming session
   */
  stopStreaming() {
    if (this.connection) {
      try {
        this.connection.finish();
        this.connection = null;
      } catch (error) {
        console.error("❌ Failed to stop Deepgram:", error);
      }
    }
    this.isListening = false;
    this.currentTranscript = "";
  }

  /**
   * Check if currently listening
   */
  isActive() {
    return this.isListening;
  }
}

module.exports = DeepgramHandler;
