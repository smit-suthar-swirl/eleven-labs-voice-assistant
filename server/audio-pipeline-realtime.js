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
    this.isProcessing = false;
    this.shouldInterrupt = false;
    this.conversationHistory = [];
    this.isReady = false;

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
   * Initialize Deepgram real-time connection using SDK v3+ format
   */
  async initializeDeepgram() {
    try {
      const apiKey = process.env.DEEPGRAM_API_KEY;
      console.log(`🎤 Initializing Deepgram SDK v3+...`);

      // Create Deepgram client (v3+ format)
      const deepgram = createClient(apiKey);

      // Create live transcription connection
      this.deepgramConnection = deepgram.listen.live({
        model: "nova-2",
        language: "en",
        smart_format: true,
        punctuate: true,
        interim_results: false,
        vad_events: true,
        encoding: "linear16",
        sample_rate: 16000,
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
        if (transcript && transcript.trim().length > 0 && data.is_final) {
          console.log(`📝 Deepgram: "${transcript}"`);
          this.handleTranscript(transcript);
        }
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error("❌ Deepgram error:", error);
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
        console.log("🔴 Deepgram closed");
        this.isReady = false;
      });
    } catch (error) {
      console.error(`❌ Failed to initialize Deepgram: ${error.message}`);
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(
          JSON.stringify({
            type: "error",
            message: "Failed to initialize voice recognition",
          })
        );
      }
    }
  }

  /**
   * Process audio chunk - NO BUFFERING, direct streaming
   */
  processAudioChunk(audioChunk) {
    if (this.shouldInterrupt || !this.isReady || !this.deepgramConnection)
      return;

    // Send directly to Deepgram - ZERO latency added
    try {
      this.deepgramConnection.send(audioChunk);
    } catch (error) {
      console.error("❌ Error sending to Deepgram:", error.message);
    }
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
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(
          JSON.stringify({
            type: "transcript",
            role: "user",
            text: transcript,
          })
        );
      }

      // Notify client that assistant is speaking
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(
          JSON.stringify({ type: "stateChange", state: "speaking" })
        );
      }

      const startTime = Date.now();

      // Start ElevenLabs streaming session
      await this.elevenLabsStreaming.startStream((audioChunk) => {
        // Stream audio chunks to client IMMEDIATELY
        if (this.ws && this.ws.readyState === 1 && !this.shouldInterrupt) {
          this.ws.send(audioChunk);
        }
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
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(
            JSON.stringify({
              type: "transcript",
              role: "assistant",
              text: fullResponse,
            })
          );
        }

        this.addToHistory(transcript, fullResponse);
      }
    } catch (error) {
      console.error(`Pipeline error: ${error.message}`);
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(JSON.stringify({ type: "error", message: error.message }));
      }
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
    this.shouldInterrupt = true;
    this.claudeHandler.cancelCurrent();
    this.elevenLabsStreaming.cancel();
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
  }
}

module.exports = AudioPipelineRealtime;
