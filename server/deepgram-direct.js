const WebSocket = require("ws");

class DeepgramDirect {
  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    this.ws = null;
    this.isConnected = false;
    this.onTranscript = null;
    this.onReady = null;
  }

  /**
   * Connect to Deepgram WebSocket directly (bypass SDK)
   */
  async connect(onTranscript, onReady) {
    this.onTranscript = onTranscript;
    this.onReady = onReady;

    return new Promise((resolve, reject) => {
      // Build WebSocket URL with API key in header
      const url = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true&interim_results=false&vad_events=true&encoding=linear16&sample_rate=16000&channels=1`;

      console.log("🎤 Connecting to Deepgram directly...");
      console.log(
        `🔑 Using API key: ${
          this.apiKey ? this.apiKey.substring(0, 10) + "..." : "MISSING"
        }`
      );

      // Node.js WebSocket supports headers
      const headers = {
        Authorization: `Token ${this.apiKey}`,
      };

      this.ws = new WebSocket(url, { headers });

      const timeout = setTimeout(() => {
        reject(new Error("Deepgram connection timeout"));
      }, 10000);

      this.ws.on("open", () => {
        clearTimeout(timeout);
        console.log("🟢 Deepgram connected (direct WebSocket)");
        this.isConnected = true;
        if (this.onReady) this.onReady();
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const response = JSON.parse(data.toString());

          // Check for transcript
          if (response.channel?.alternatives?.[0]?.transcript) {
            const transcript = response.channel.alternatives[0].transcript;
            const isFinal = response.is_final;

            if (isFinal && transcript.trim().length > 0) {
              console.log(`📝 Deepgram: "${transcript}"`);
              if (this.onTranscript) {
                this.onTranscript(transcript);
              }
            }
          }

          // Check for errors
          if (response.error) {
            console.error("❌ Deepgram error:", response.error);
          }
        } catch (error) {
          console.error("❌ Error parsing Deepgram message:", error);
        }
      });

      this.ws.on("error", (error) => {
        clearTimeout(timeout);
        console.error("❌ Deepgram WebSocket error:", error.message);
        reject(error);
      });

      this.ws.on("close", (code, reason) => {
        console.log(`🔴 Deepgram closed: ${code} ${reason}`);
        this.isConnected = false;
      });
    });
  }

  /**
   * Send audio chunk to Deepgram (real-time streaming)
   */
  send(audioChunk) {
    if (!this.ws || !this.isConnected) {
      return false;
    }

    try {
      this.ws.send(audioChunk);
      return true;
    } catch (error) {
      console.error("❌ Error sending audio to Deepgram:", error);
      return false;
    }
  }

  /**
   * Close connection
   */
  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error("❌ Error closing Deepgram:", error);
      }
    }
    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  isReady() {
    return this.isConnected;
  }
}

module.exports = DeepgramDirect;
