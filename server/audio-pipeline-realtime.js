const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const ClaudeHandler = require("./claude-handler");
const ElevenLabsStreaming = require("./elevenlabs-streaming");
const KnowledgeBaseLoader = require("./knowledge-base-loader");

/**
 * Ultra-Fast Real-Time Audio Pipeline
 * Target: <100ms latency from speech end to response start
 */
class AudioPipelineRealtime {
  constructor(clientId, ws) {
    this.clientId = clientId;
    this.ws = ws;
    this.transportSend = null; // Will be set to WebRTC data channel send function
    this.isProcessing = false;
    this.shouldInterrupt = false;
    this.conversationHistory = [];
    this.isReady = false;

    // Turn-taking control
    this.lastTranscriptTime = 0;
    this.transcriptDebounceTimer = null;
    this.pendingTranscript = "";
    this.DEBOUNCE_DELAY = 1200; // Wait 1.2 seconds after last speech before responding

    this.deepgramClient = null;
    this.deepgramConnection = null;
    this.claudeHandler = new ClaudeHandler();
    this.elevenLabsStreaming = new ElevenLabsStreaming();
    this.knowledgeBase = KnowledgeBaseLoader.getInstance();

    console.log(`🔧 Real-time pipeline created: ${clientId}`);

    // Initialize Deepgram connection
    this.initializeDeepgram();
  }

  /**
   * Update transport to use WebRTC data channel instead of WebSocket
   */
  updateTransport(sendFunction) {
    this.customAudioSender = sendFunction;
    console.log(
      `🔄 [${this.clientId}] Transport updated to WebRTC data channel`
    );
  }

  /**
   * Send data to client via flexible transport (WebRTC or WebSocket)
   */
  sendToClient(data) {
    // Always use WebSocket for control messages/transcripts if available
    // This avoids complexity with Data Channels for JSON
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(data);
    } else {
      console.warn(
        `⚠️ [${this.clientId}] No WebSocket available to send control data`
      );
    }
  }

  /**
   * Send audio chunk via appropriate transport
   */
  sendAudio(audioChunk) {
    if (this.shouldInterrupt) return;

    if (this.customAudioSender) {
      // Use efficient WebRTC Data Channel
      this.customAudioSender(audioChunk);
    } else if (this.ws && this.ws.readyState === 1) {
      // Fallback to WebSocket
      this.ws.send(audioChunk);
    }
  }

  /**
   * Initialize Deepgram real-time connection using SDK v3+ format
   */
  async initializeDeepgram() {
    try {
      const apiKey = process.env.DEEPGRAM_API_KEY;
      console.log(`🎤 Initializing Deepgram SDK v3+...`);

      // Validate API key
      if (!apiKey || typeof apiKey !== "string") {
        throw new Error("Missing or invalid DEEPGRAM_API_KEY environment variable");
      }

      console.log(`🔑 Deepgram API Key: ${apiKey.substring(0, 8)}...`);

      // Create Deepgram client (v3+ format)
      const deepgram = createClient(apiKey);

      // Create live transcription connection
      // Use 48000Hz - browser's native sample rate
      this.deepgramConnection = deepgram.listen.live({
        model: "nova-2",
        language: "en",
        smart_format: true,
        punctuate: true,
        interim_results: false,  // Disabled to avoid duplicate messages in UI
        vad_events: true,
        encoding: "linear16",
        sample_rate: 48000,  // Changed from 16000 to match browser
        channels: 1,
      });

      // Setup event listeners using v3+ events
      this.deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
        console.log("🟢 Deepgram connected");
        this.isReady = true;
        console.log(`✅ Real-time pipeline ready: ${this.clientId}`);
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript && transcript.trim().length > 0) {
          console.log(`📝 Deepgram: "${transcript}" (is_final: ${data.is_final})`);

          if (data.is_final) {
            // If user speaks while assistant is talking, interrupt immediately
            if (this.isProcessing) {
              console.log('🛑 User interrupted - stopping assistant');
              this.interrupt();
            }

            // Accumulate transcript and debounce
            this.handleTranscriptWithDebounce(transcript);
          }
          // Note: Not sending interim results to avoid duplicate messages in UI
        }
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error("❌ Deepgram error:", JSON.stringify(error, null, 2));
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.Metadata, (data) => {
        console.log(`📊 Deepgram metadata:`, JSON.stringify(data));
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.SpeechStarted, () => {
        console.log(`🎙️ Deepgram: Speech started`);
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.Close, (e) => {
        console.log(
          "🔴 Deepgram closed",
          e ? `Reason: ${JSON.stringify(e)}` : ""
        );
        this.isReady = false;
      });
    } catch (error) {
      console.error(`❌ Failed to initialize Deepgram: ${error.message}`);
      this.sendToClient(
        JSON.stringify({
          type: "error",
          message: "Failed to initialize voice recognition",
        })
      );
    }
  }

  /**
   * Process audio chunk - NO BUFFERING, direct streaming
   */
  processAudioChunk(audioChunk) {
    if (this.shouldInterrupt || !this.isReady || !this.deepgramConnection) {
      console.log(`⏭️ [${this.clientId}] Skipping audio: interrupt=${this.shouldInterrupt}, ready=${this.isReady}, connection=${!!this.deepgramConnection}`);
      return;
    }

    // Send directly to Deepgram - ZERO latency added
    try {
      // Reduced logging to avoid spam
      this.deepgramConnection.send(audioChunk);
    } catch (error) {
      console.error("❌ Error sending to Deepgram:", error.message);
    }
  }

  /**
   * Handle transcript with debouncing - wait for user to finish speaking
   */
  handleTranscriptWithDebounce(transcript) {
    // Clear existing timer
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
    }

    // Accumulate transcript
    if (this.pendingTranscript) {
      this.pendingTranscript += " " + transcript;
    } else {
      this.pendingTranscript = transcript;
    }

    console.log(`⏳ Transcript accumulated: "${this.pendingTranscript}" (waiting ${this.DEBOUNCE_DELAY}ms...)`);

    // Set new timer - only process after user stops speaking for DEBOUNCE_DELAY
    this.transcriptDebounceTimer = setTimeout(() => {
      const finalTranscript = this.pendingTranscript;
      this.pendingTranscript = "";
      this.transcriptDebounceTimer = null;

      console.log(`✅ User finished speaking. Processing: "${finalTranscript}"`);
      this.handleTranscript(finalTranscript);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Handle transcript from Deepgram - INSTANT
   */
  async handleTranscript(transcript) {
    if (this.isProcessing || this.shouldInterrupt) {
      console.log("⏭️ Skipping, already processing");
      return;
    }

    this.isProcessing = true;

    try {
      console.log(`📝 Processing: "${transcript}" [${Date.now()}]`);

      // Send transcript to client
      this.sendToClient(
        JSON.stringify({
          type: "transcript",
          role: "user",
          text: transcript,
        })
      );

      // Notify client that assistant is speaking
      this.sendToClient(
        JSON.stringify({ type: "stateChange", state: "speaking" })
      );

      const startTime = Date.now();

      // Start ElevenLabs streaming session
      await this.elevenLabsStreaming.startStream((audioChunk) => {
        // Stream audio chunks to client IMMEDIATELY
        this.sendAudio(audioChunk);
      });

      console.log(`🎵 ElevenLabs ready: +${Date.now() - startTime}ms`);

      // Stream Claude response - Use HAIKU for speed
      const systemPrompt = this.buildSystemPrompt();
      let fullResponse = "";
      let textBuffer = "";
      let firstTokenTime = null;

      // Use streaming generator
      for await (const textChunk of this.claudeHandler.generateResponseStream(
        transcript,
        this.conversationHistory,
        systemPrompt
      )) {
        if (this.shouldInterrupt) {
          this.elevenLabsStreaming.cancel();
          break;
        }

        if (!firstTokenTime) {
          firstTokenTime = Date.now();
          console.log(`🤖 First token: +${firstTokenTime - startTime}ms`);
        }

        fullResponse += textChunk;
        textBuffer += textChunk;

        // Send text chunks more aggressively (every 2 words for speed)
        const words = textBuffer.split(/\s+/);
        if (words.length >= 2) {
          this.elevenLabsStreaming.sendText(textBuffer);
          textBuffer = "";
        }
      }

      // Send any remaining text
      if (textBuffer.length > 0 && !this.shouldInterrupt) {
        this.elevenLabsStreaming.sendText(textBuffer);
      }

      // Finish the stream
      this.elevenLabsStreaming.finishStream();

      if (!this.shouldInterrupt && fullResponse) {
        console.log(
          `🤖 Complete: "${fullResponse}" [Total: ${Date.now() - startTime}ms]`
        );

        // Send complete transcript to client
        this.sendToClient(
          JSON.stringify({
            type: "transcript",
            role: "assistant",
            text: fullResponse,
          })
        );

        this.addToHistory(transcript, fullResponse);
      }
    } catch (error) {
      console.error(`Pipeline error: ${error.message}`);
      this.sendToClient(
        JSON.stringify({ type: "error", message: error.message })
      );
    } finally {
      this.isProcessing = false;
    }
  }

  buildSystemPrompt() {
    const kb = this.knowledgeBase.getKnowledgeBase();
    const competitors = this.knowledgeBase.getCompetitors();

    return `You are a BYD Shark 6 sales assistant. Be conversational, natural, and EXTREMELY BRIEF.

KNOWLEDGE BASE:
${kb}

COMPETITORS:
${JSON.stringify(competitors)}

RULES:
- Respond naturally to greetings ("Hi", "Hello", "Hey") with brief friendly greetings
- For questions, answer ONLY from knowledge base
- Keep responses under 20 words - ULTRA BRIEF!
- Be friendly and professional
- If info not available, say "I don't have that"
- Sound natural and fast`;
  }

  addToHistory(user, assistant) {
    this.conversationHistory.push({ role: "user", content: user });
    this.conversationHistory.push({ role: "assistant", content: assistant });
    if (this.conversationHistory.length > 8) {
      this.conversationHistory = this.conversationHistory.slice(-8);
    }
  }

  interrupt() {
    console.log(`🛑 [${this.clientId}] Interrupting...`);

    // Cancel pending debounce timer
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
      this.transcriptDebounceTimer = null;
    }

    // Clear pending transcript
    this.pendingTranscript = "";

    this.shouldInterrupt = true;
    this.claudeHandler.cancelCurrent();
    this.elevenLabsStreaming.cancel();

    // Notify client that we're listening again
    this.sendToClient(
      JSON.stringify({ type: "stateChange", state: "listening" })
    );

    setTimeout(() => {
      this.shouldInterrupt = false;
    }, 100);
  }

  cleanup() {
    this.interrupt();
    if (this.deepgramConnection) {
      try {
        this.deepgramConnection.finish();
      } catch (error) {
        console.error("Error closing Deepgram:", error);
      }
    }
    this.elevenLabsStreaming.cancel();
    this.conversationHistory = [];
    this.customAudioSender = null;
  }
}

module.exports = AudioPipelineRealtime;
