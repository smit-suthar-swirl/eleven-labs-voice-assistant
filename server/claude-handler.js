const Anthropic = require("@anthropic-ai/sdk");

class ClaudeHandler {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.currentStream = null;
  }

  async generateResponse(userMessage, conversationHistory, systemPrompt) {
    try {
      // Build messages array
      const messages = [
        ...conversationHistory,
        {
          role: "user",
          content: userMessage,
        },
      ];

      // Create streaming request - HAIKU for ultra-fast responses
      this.currentStream = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307", // FASTEST Claude model
        max_tokens: 150, // Brief responses for speed
        temperature: 0.8,
        system: systemPrompt,
        messages: messages,
        stream: true,
      });

      // Collect streaming response
      let fullResponse = "";

      for await (const event of this.currentStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullResponse += event.delta.text;
        }
      }

      this.currentStream = null;
      return fullResponse.trim();
    } catch (error) {
      console.error("Claude generation error:", error);
      throw error;
    }
  }

  async *generateResponseStream(
    userMessage,
    conversationHistory,
    systemPrompt
  ) {
    try {
      const messages = [
        ...conversationHistory,
        {
          role: "user",
          content: userMessage,
        },
      ];

      this.currentStream = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307", // FASTEST Claude model
        max_tokens: 150,
        temperature: 0.8,
        system: systemPrompt,
        messages: messages,
        stream: true,
      });

      for await (const event of this.currentStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }

      this.currentStream = null;
    } catch (error) {
      console.error("Claude streaming error:", error);
      throw error;
    }
  }

  cancelCurrent() {
    if (this.currentStream) {
      try {
        // Attempt to cancel the stream
        this.currentStream = null;
      } catch (error) {
        console.error("Error canceling Claude stream:", error);
      }
    }
  }
}

module.exports = ClaudeHandler;
