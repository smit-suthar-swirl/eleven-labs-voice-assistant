const WhisperHandler = require("./whisper-handler");
const ClaudeHandler = require("./claude-handler");
const ElevenLabsStreaming = require("./elevenlabs-streaming");
const KnowledgeBaseLoader = require("./knowledge-base-loader");

class AudioPipeline {
  constructor(clientId, ws) {
    this.clientId = clientId;
    this.ws = ws;
    this.isProcessing = false;
    this.shouldInterrupt = false;
    this.conversationHistory = [];
    this.audioBuffer = [];

    this.whisperHandler = new WhisperHandler();
    this.claudeHandler = new ClaudeHandler();
    this.elevenLabsStreaming = new ElevenLabsStreaming();
    this.knowledgeBase = KnowledgeBaseLoader.getInstance();

    console.log(`🔧 Pipeline created (Streaming): ${clientId}`);
  }

  /**
   * Collect audio chunks for Whisper
   */
  processAudioChunk(audioChunk) {
    if (this.shouldInterrupt) return;

    // Buffer audio chunks
    this.audioBuffer.push(audioChunk);

    // Process after collecting ~0.5 seconds of audio (8 chunks at 60fps) - SUPER FAST!
    if (this.audioBuffer.length >= 8 && !this.isProcessing) {
      this.processBufferedAudio();
    }
  }

  /**
   * Process buffered audio with Whisper
   */
  async processBufferedAudio() {
    if (this.isProcessing || this.audioBuffer.length === 0) return;

    this.isProcessing = true;
    const audioToProcess = Buffer.concat(this.audioBuffer);
    this.audioBuffer = [];

    try {
      // Step 1: STT with Whisper
      const transcript = await this.whisperHandler.transcribe(audioToProcess);

      if (!transcript || transcript.trim().length === 0 || this.shouldInterrupt) {
        this.isProcessing = false;
        return;
      }

      // NO WORD COUNT FILTER - Accept all utterances including "Hello", "Hi", etc!
      console.log(`🎤 Transcribed: "${transcript}"`);

      this.handleTranscript(transcript);

    } catch (error) {
      console.error(`Whisper error: ${error.message}`);
      this.isProcessing = false;
    }
  }

  /**
   * Handle transcript from Whisper - STREAMING VERSION
   */
  async handleTranscript(transcript) {
    try {
      console.log(`📝 Processing: "${transcript}"`);

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
        this.ws.send(JSON.stringify({ type: 'stateChange', state: 'speaking' }));
      }

      // Start ElevenLabs streaming session
      await this.elevenLabsStreaming.startStream((audioChunk) => {
        // Stream audio chunks to client IMMEDIATELY as they arrive
        if (this.ws && this.ws.readyState === 1 && !this.shouldInterrupt) {
          this.ws.send(audioChunk);
        }
      });

      // Stream Claude response
      const systemPrompt = this.buildSystemPrompt();
      let fullResponse = '';
      let textBuffer = '';

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

        fullResponse += textChunk;
        textBuffer += textChunk;

        // Send text chunks when we have enough words (for better TTS)
        const words = textBuffer.split(/\s+/);
        if (words.length >= 3) {
          // Send to ElevenLabs streaming
          this.elevenLabsStreaming.sendText(textBuffer);
          textBuffer = '';
        }
      }

      // Send any remaining text
      if (textBuffer.length > 0 && !this.shouldInterrupt) {
        this.elevenLabsStreaming.sendText(textBuffer);
      }

      // Finish the stream
      this.elevenLabsStreaming.finishStream();

      if (!this.shouldInterrupt && fullResponse) {
        console.log(`🤖 "${fullResponse}"`);

        // Send complete transcript to client for display
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

    return `You are a BYD Shark 6 sales assistant. Be conversational, natural, and brief.

KNOWLEDGE BASE:
${kb}

COMPETITORS:
${JSON.stringify(competitors)}

RULES:
- Respond naturally to greetings ("Hi", "Hello", "Hey" etc.) with friendly greetings back
- For questions, answer ONLY from knowledge base
- Keep responses under 30 words - BE BRIEF AND NATURAL!
- Be friendly and professional
- If info not available, say "I don't have that information"
- Sound like a real person, not a robot`;
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
    this.elevenLabsStreaming.cancel();
    this.audioBuffer = [];
    this.conversationHistory = [];
  }
}

module.exports = AudioPipeline;
