# BYD Shark 6 Voice Assistant Widget

A real-time voice assistant widget for BYD Shark 6 vehicle sales that can be embedded on any HTML page. Uses WebRTC for low-latency audio streaming, OpenAI Whisper for speech-to-text, Claude Sonnet 4.5 for intelligent responses, and ElevenLabs for text-to-speech.

## Features

- **Real-Time Voice Conversation**: Low-latency bidirectional audio streaming using WebRTC
- **Intelligent Responses**: Powered by Claude Sonnet 4.5 with knowledge base about BYD Shark 6
- **Voice Activity Detection**: Automatic interruption handling when user speaks
- **Embeddable Widget**: Single script tag integration on any HTML page
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Visual Feedback**: Clear states for listening, processing, and speaking

## Architecture

```
Microphone → WebRTC DataChannel → Server → Whisper STT → Claude → ElevenLabs TTS → WebRTC → Speaker
```

## Project Structure

```
webrtc-voice-assistant/
├── client/                         # Client-side JavaScript files
│   ├── byd-voice-assistant.js      # Main embeddable widget
│   ├── webrtc-client.js            # WebRTC connection handling
│   ├── audio-processor.js          # Audio capture/playback
│   ├── vad-handler.js              # Voice Activity Detection
│   └── ui-controller.js            # Widget UI logic
├── server/                         # Server-side Node.js application
│   ├── index.js                    # Express server
│   ├── webrtc-signaling.js         # WebRTC signaling (WebSocket)
│   ├── audio-pipeline.js           # STT → LLM → TTS pipeline
│   ├── whisper-handler.js          # OpenAI Whisper integration
│   ├── claude-handler.js           # Anthropic Claude integration
│   ├── elevenlabs-handler.js       # ElevenLabs TTS integration
│   └── knowledge-base-loader.js    # Knowledge base management
├── knowledge-base/                 # Product knowledge files
│   ├── byd-shark-6.txt             # BYD Shark 6 specifications
│   └── competitors/                # Competitor vehicle data
│       ├── toyota-hilux.json
│       ├── ford-ranger.json
│       ├── isuzu-dmax.json
│       └── mitsubishi-triton.json
├── public/                         # Static files
│   └── demo.html                   # Demo page
├── package.json                    # Dependencies
├── .env.example                    # Environment variables template
└── README.md                       # This file
```

## Prerequisites

- Node.js 18+ and npm
- API Keys:
  - OpenAI API key (for Whisper)
  - Anthropic API key (for Claude)
  - ElevenLabs API key (for TTS)

## Installation

1. **Clone or navigate to the project directory**

```bash
cd webrtc-voice-assistant
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
ELEVENLABS_API_KEY=your-elevenlabs-key
PORT=3000
```

4. **Start the server**

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

5. **Open the demo page**

Navigate to `http://localhost:3000` in your browser.

## Usage

### Embedding the Widget

To embed the voice assistant widget on any HTML page, add the following code:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Page</title>
</head>
<body>
  <h1>Your Content Here</h1>

  <!-- Embed BYD Voice Assistant Widget -->
  <script src="http://localhost:3000/client/byd-voice-assistant.js"></script>
  <script>
    BYDVoiceAssistant.init({
      primaryColor: '#d32f2f',     // Widget color
      position: 'bottom-right',     // Widget position
      buttonSize: 60,               // Button size in pixels
      autoOpen: false               // Auto-open on page load
    });
  </script>
</body>
</html>
```

### Widget API

```javascript
// Initialize widget
BYDVoiceAssistant.init(options);

// Open widget (start voice assistant)
BYDVoiceAssistant.open();

// Close widget (stop voice assistant)
BYDVoiceAssistant.close();

// Check if widget is open
const isOpen = BYDVoiceAssistant.isOpen();

// Destroy widget
BYDVoiceAssistant.destroy();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `primaryColor` | string | `'#d32f2f'` | Widget primary color |
| `position` | string | `'bottom-right'` | Widget position: `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'` |
| `buttonSize` | number | `60` | Button size in pixels |
| `autoOpen` | boolean | `false` | Auto-open widget on page load |

## How It Works

### 1. Audio Capture

- Captures microphone audio in 20-50ms chunks
- PCM16 format at 16kHz sample rate
- Mono channel for efficiency

### 2. WebRTC Streaming

- Establishes WebRTC PeerConnection with DataChannel
- Sends audio chunks to server in real-time
- Receives audio chunks from server for playback

### 3. Speech-to-Text (Whisper)

- Server processes audio chunks with OpenAI Whisper API
- Generates text transcriptions

### 4. LLM Processing (Claude)

- Sends transcription to Claude Sonnet 4.5
- Uses knowledge base about BYD Shark 6 and competitors
- Generates conversational responses (max 200 tokens)

### 5. Text-to-Speech (ElevenLabs)

- Converts Claude's response to natural speech
- Uses ElevenLabs Turbo v2 model for speed
- Streams audio back to client

### 6. Audio Playback

- Plays received audio chunks continuously
- Uses Web Audio API for smooth playback

### 7. Interruption Handling

- Voice Activity Detection monitors user speech
- Detects when user speaks during assistant playback
- Immediately stops playback and cancels ongoing requests
- Processes user's new input

## Knowledge Base

### BYD Shark 6 Information

Located in `knowledge-base/byd-shark-6.txt`, contains:
- Complete specifications
- Features and technology
- Pricing and warranty
- Competitive advantages
- Target customers

### Competitor Data

Located in `knowledge-base/competitors/*.json`, includes:
- Toyota Hilux
- Ford Ranger
- Isuzu D-Max
- Mitsubishi Triton

Each JSON file contains:
- Specifications
- Features
- Pros and cons
- Pricing

### Adding New Information

1. **Update BYD Shark 6 data**: Edit `knowledge-base/byd-shark-6.txt`
2. **Add competitor**: Create new JSON file in `knowledge-base/competitors/`
3. **Restart server**: Changes are loaded on startup

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` to auto-reload the server on file changes.

### Testing

1. **Test microphone permission**: Click the widget button and grant permission
2. **Test voice capture**: Speak and verify audio is being captured
3. **Test responses**: Ask questions about BYD Shark 6
4. **Test interruption**: Speak while assistant is talking
5. **Test on mobile**: Open on mobile device

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebRTC and Web Audio API are required.

## Deployment

### Production Build

1. **Set environment to production**

```env
NODE_ENV=production
```

2. **Update server URL in widget**

Edit `client/byd-voice-assistant.js` to point to your production server:

```javascript
serverUrl: 'https://your-production-domain.com'
```

3. **Deploy server**

Deploy the server application to your hosting provider (Heroku, AWS, DigitalOcean, etc.).

4. **Configure HTTPS**

WebRTC requires HTTPS in production. Set up SSL certificates.

5. **Update CDN links**

Host client files on CDN for better performance.

### Environment Variables

Ensure all environment variables are set in production:

```env
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
ELEVENLABS_API_KEY=your-key
PORT=3000
NODE_ENV=production
```

## Optimization

### Latency Reduction

- Audio chunks: 20-50ms
- WebRTC for low-latency streaming
- Streaming responses from all APIs
- Token limit: 150-200 tokens max
- Efficient knowledge base caching

### Token Optimization

- Conversation history limited to last 8 messages
- System prompt cached on server
- Concise responses (under 50 words when possible)

### Network Optimization

- STUN servers for WebRTC NAT traversal
- DataChannel with `ordered: false` for lower latency
- Automatic reconnection on failures

## Troubleshooting

### Microphone Permission Denied

- Ensure HTTPS (required by browsers)
- Check browser permissions
- Try different browser

### WebRTC Connection Fails

- Check firewall settings
- Verify STUN server accessibility
- Check browser console for errors

### No Audio Playback

- Check speaker volume
- Verify Web Audio API support
- Check browser console for errors

### API Errors

- Verify API keys in `.env`
- Check API rate limits
- Review server logs

## API Costs

Approximate costs per conversation (5-10 exchanges):

- **Whisper**: ~$0.01 per conversation
- **Claude**: ~$0.02 per conversation
- **ElevenLabs**: ~$0.05 per conversation

**Total**: ~$0.08 per conversation

## Security Considerations

- Never expose API keys in client-side code
- Use HTTPS in production
- Implement rate limiting
- Add authentication if needed
- Validate all inputs on server

## License

MIT

## Support

For issues and questions:
- Check the troubleshooting section
- Review browser console logs
- Check server logs

## Roadmap

- [ ] Add conversation transcript display
- [ ] Multi-language support
- [ ] Custom voice selection
- [ ] Analytics and usage tracking
- [ ] Admin dashboard
- [ ] A/B testing capabilities

## Credits

- OpenAI Whisper for speech recognition
- Anthropic Claude for conversational AI
- ElevenLabs for text-to-speech
- @ricky0123/vad-web for voice activity detection
