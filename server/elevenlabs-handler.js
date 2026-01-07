const fetch = require('node-fetch');

class ElevenLabsHandler {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = 'pNInz6obpgDQGcFmaJgB';
    this.currentRequest = null;
  }

  async synthesize(text) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.3,
              similarity_boost: 0.3,
              style: 0,
              use_speaker_boost: false
            },
            optimize_streaming_latency: 4 // Maximum optimization (0-4)
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBuffer = await response.buffer();
      return audioBuffer;

    } catch (error) {
      console.error('ElevenLabs synthesis error:', error);
      throw error;
    }
  }

  cancelCurrent() {
    this.currentRequest = null;
  }

  setVoice(voiceId) {
    this.voiceId = voiceId;
  }
}

module.exports = ElevenLabsHandler;
