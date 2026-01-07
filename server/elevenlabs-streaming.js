const WebSocket = require("ws");

class ElevenLabsStreaming {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam voice
    this.ws = null;
    this.onAudioChunk = null;
    this.textBuffer = "";
    this.isStreaming = false;
  }

  /**
   * Start WebSocket streaming session
   */
  async startStream(onAudioChunk) {
    this.onAudioChunk = onAudioChunk;

    return new Promise((resolve, reject) => {
      const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=eleven_turbo_v2&optimize_streaming_latency=4&output_format=pcm_16000`;

      this.ws = new WebSocket(url, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      this.ws.on("open", () => {
        console.log("🎵 ElevenLabs streaming connected");
        this.isStreaming = true;

        // Send initial config
        this.ws.send(
          JSON.stringify({
            text: " ",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
            xi_api_key: this.apiKey,
          })
        );

        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const response = JSON.parse(data.toString());

          if (response.audio) {
            // Received audio chunk - send to client immediately
            const audioBuffer = Buffer.from(response.audio, "base64");
            if (this.onAudioChunk) {
              this.onAudioChunk(audioBuffer);
            }
          }

          if (response.isFinal) {
            console.log("🎵 ElevenLabs stream completed");
          }

          if (response.error) {
            console.error("❌ ElevenLabs error:", response.error);
          }
        } catch (error) {
          console.error("❌ Error parsing ElevenLabs message:", error);
        }
      });

      this.ws.on("error", (error) => {
        console.error("❌ ElevenLabs WebSocket error:", error);
        reject(error);
      });

      this.ws.on("close", () => {
        console.log("🔴 ElevenLabs stream closed");
        this.isStreaming = false;
      });
    });
  }

  /**
   * Send text chunk to be synthesized (streaming)
   */
  sendText(text) {
    if (!this.ws || !this.isStreaming) {
      console.warn("⚠️ ElevenLabs not streaming, buffering text");
      this.textBuffer += text;
      return;
    }

    try {
      this.ws.send(
        JSON.stringify({
          text: text,
          try_trigger_generation: true,
        })
      );
    } catch (error) {
      console.error("❌ Error sending text to ElevenLabs:", error);
    }
  }

  /**
   * Signal end of text input
   */
  finishStream() {
    if (!this.ws || !this.isStreaming) return;

    try {
      // Send empty string to flush
      this.ws.send(
        JSON.stringify({
          text: "",
        })
      );

      // Wait a bit then close
      setTimeout(() => {
        if (this.ws) {
          this.ws.close();
        }
      }, 1000);
    } catch (error) {
      console.error("❌ Error finishing stream:", error);
    }
  }

  /**
   * Cancel current stream
   */
  cancel() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error("❌ Error canceling stream:", error);
      }
    }
    this.ws = null;
    this.isStreaming = false;
    this.textBuffer = "";
  }
}

module.exports = ElevenLabsStreaming;
