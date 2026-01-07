const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

class WhisperHandler {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.audioBuffer = [];
  }

  async transcribe(audioChunk) {
    try {
      this.audioBuffer.push(audioChunk);

      // Process when we have ~2 seconds of audio (adjust as needed)
      if (this.audioBuffer.length < 5) {
        return null;
      }

      const audioData = Buffer.concat(this.audioBuffer);
      this.audioBuffer = [];

      // Create temporary WAV file
      const tempFile = path.join('/tmp', `audio-${Date.now()}.wav`);
      const wavBuffer = this.createWavBuffer(audioData);
      fs.writeFileSync(tempFile, wavBuffer);

      // Transcribe
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-1',
        language: 'en'
      });

      // Clean up
      fs.unlinkSync(tempFile);

      return transcription.text.trim();

    } catch (error) {
      console.error('Whisper error:', error.message);
      this.audioBuffer = [];
      return null;
    }
  }

  createWavBuffer(pcmData) {
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;

    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + pcmData.length, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(byteRate, 28);
    wavHeader.writeUInt16LE(blockAlign, 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(pcmData.length, 40);

    return Buffer.concat([wavHeader, pcmData]);
  }

  reset() {
    this.audioBuffer = [];
  }
}

module.exports = WhisperHandler;
