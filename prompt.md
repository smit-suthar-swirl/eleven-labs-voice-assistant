# Project Prompt for Claude Code

Build a real-time voice assistant widget for BYD Shark 6 vehicle sales that can be embedded on any HTML page.

## Core Requirements

### 1. Embeddable Widget

- Create a single JavaScript file that can be embedded via `<script>` tag on any HTML page
- Widget shows a floating button (bottom-right corner)
- One click starts voice assistant, continuous conversation until user closes
- Fully responsive (desktop, tablet, mobile)
- Visual states: Listening, Processing, Speaking, Idle

### 2. Real-Time Voice Pipeline Using WebRTC

**Flow**: Microphone → WebRTC DataChannel → Server → Whisper STT → Claude Sonnet 4.5 → ElevenLabs TTS → WebRTC DataChannel → Speaker

**Client-Side**:

- Capture audio using `getUserMedia()` in 20-50ms chunks (PCM16, 16kHz mono)
- Establish WebRTC PeerConnection with DataChannel for bidirectional streaming
- Send audio chunks to server via DataChannel
- Receive audio chunks from server via DataChannel
- Play audio continuously using Web Audio API
- Use WebSocket ONLY for initial WebRTC signaling handshake

**Server-Side** (Node.js):

- Accept WebRTC connections with DataChannel
- Process incoming audio chunks with OpenAI Whisper API (incremental/streaming if possible)
- Send partial transcripts to Anthropic Claude Sonnet 4.5 (`claude-sonnet-4-20250514`)
- Enable streaming responses from Claude (max 150-200 tokens per response)
- Stream Claude's text to ElevenLabs API for TTS (streaming audio generation)
- Send audio chunks back to client via DataChannel immediately as they're generated

**Latency Target**: < 500ms end-to-end (first audio response)

### 3. Interruption Handling (CRITICAL)

**Implement Voice Activity Detection (VAD)**:

- Use `@ricky0123/vad-web` or similar library on client-side
- Continuously monitor microphone input even while assistant is speaking
- When user speaks during assistant playback:
  - Immediately stop audio playback and clear queue
  - Send interruption signal to server via DataChannel
  - Server cancels ongoing LLM generation and TTS requests
  - Start capturing user's new input

### 4. Knowledge Base System

**Structure**:

```
/knowledge-base/
  ├── byd-shark-6.txt           # Primary knowledge source
  └── competitors/              # Competitor vehicle data
      ├── toyota-hilux.json
      ├── ford-ranger.json
      ├── isuzu-dmax.json
      └── ... (more competitor JSONs)
```

**JSON Schema for Competitors**:

```json
{
  "vehicle": "Toyota Hilux",
  "specs": {
    "engine": "2.8L Turbo Diesel",
    "power": "204 HP",
    "torque": "500 Nm",
    "price": "$45,000"
  },
  "features": ["4WD", "Automatic", "Apple CarPlay"],
  "pros": ["Reliability", "Resale value"],
  "cons": ["Higher price", "Firm ride"]
}
```

**Agent Behavior**:

- Load `byd-shark-6.txt` content into Claude's system prompt
- Parse all competitor JSON files for comparison queries
- Agent MUST ONLY answer from knowledge base - never make up information
- If information not in knowledge base, politely say "I don't have that information"

### 5. Claude System Prompt

```
You are a sales assistant for BYD Shark 6 pickup truck. Be conversational, enthusiastic, and concise.

KNOWLEDGE BASE:
{content from byd-shark-6.txt}

COMPETITOR DATA:
{parsed competitor JSONs}

RULES:
- Answer ONLY from provided knowledge base
- Compare BYD Shark 6 with competitors when asked
- Keep responses under 50 words when possible (reduce latency)
- Be friendly and professional
- Never invent specifications or features

RESPONSE FORMAT:
- Conversational and natural
- Direct and concise
- Focus on user's specific question
```

**Context Management**:

- Maintain last 5-8 conversation turns
- Prune old context to minimize tokens (keep under 4000 tokens total)

### 6. Optimization Requirements

**Token Optimization**:

- Limit Claude responses to 150-200 tokens maximum
- Use efficient prompts
- Cache knowledge base server-side
- Prune conversation history aggressively

**Audio Optimization**:

- Use Opus codec for audio compression if possible
- Buffer audio intelligently to prevent gaps
- Handle audio chunk concatenation smoothly

**Connection Management**:

- Implement STUN/TURN servers for WebRTC (use Google's public STUN: `stun:stun.l.google.com:19302`)
- Auto-reconnect on connection failures
- Graceful error handling

### 7. UI/UX Specifications

**Widget Interface**:

- Floating circular button with microphone icon
- Click to activate (request microphone permission)
- Visual feedback:
  - 🎤 Listening: Pulsing animation
  - 💬 Processing: Loading spinner
  - 🔊 Speaking: Waveform animation
  - ⏸️ Idle: Static icon
- Minimize/maximize button
- Close button
- Optional: Show conversation transcript

**Widget Customization**:

```javascript
BYDVoiceAssistant.init({
  primaryColor: "#0066cc",
  position: "bottom-right", // or 'bottom-left', 'top-right', 'top-left'
  buttonSize: 60, // pixels
  autoOpen: false,
});
```

### 8. Error Handling

- Microphone permission denied → Show clear instructions
- WebRTC connection fails → Retry with exponential backoff
- STT fails → "I didn't catch that, please repeat"
- LLM fails → "Sorry, I'm having trouble processing. Try again?"
- TTS fails → Show text response as fallback
- Network issues → Graceful degradation, show error message

### 9. File Structure

```
project-root/
├── client/
│   ├── byd-voice-assistant.js      # Main embeddable widget
│   ├── vad-handler.js              # Voice Activity Detection
│   ├── audio-processor.js          # Audio capture/playback
│   ├── webrtc-client.js            # WebRTC connection handling
│   └── ui-controller.js            # Widget UI logic
├── server/
│   ├── index.js                    # Express server
│   ├── webrtc-signaling.js         # WebRTC signaling (WebSocket)
│   ├── audio-pipeline.js           # STT → LLM → TTS pipeline
│   ├── whisper-handler.js          # Whisper API integration
│   ├── claude-handler.js           # Claude API integration
│   ├── elevenlabs-handler.js       # ElevenLabs API integration
│   └── knowledge-base-loader.js    # Load and parse knowledge base
├── knowledge-base/
│   ├── byd-shark-6.txt
│   └── competitors/
│       ├── toyota-hilux.json
│       ├── ford-ranger.json
│       └── ... (other JSONs)
├── public/
│   └── demo.html                   # Demo page showing widget usage
├── package.json
├── .env.example                    # API keys template
└── README.md
```

### 10. API Keys Required

Create `.env` file with:

```
OPENAI_API_KEY=your_openai_key          # For Whisper
ANTHROPIC_API_KEY=your_anthropic_key    # For Claude
ELEVENLABS_API_KEY=your_elevenlabs_key  # For TTS
PORT=3000
```

### 11. Implementation Steps

**Phase 1**: Set up basic project structure

- Initialize Node.js project
- Create client and server folders
- Set up Express server
- Create demo HTML page

**Phase 2**: WebRTC Infrastructure

- Implement WebSocket signaling server
- Create WebRTC peer connection on client
- Establish DataChannel for bidirectional streaming
- Test basic audio chunk transmission

**Phase 3**: Audio Pipeline

- Client: Capture microphone audio in chunks
- Server: Integrate Whisper for STT
- Server: Integrate Claude with streaming
- Server: Integrate ElevenLabs for TTS
- Client: Play received audio chunks continuously

**Phase 4**: Knowledge Base

- Load `byd-shark-6.txt` content
- Parse competitor JSON files
- Integrate into Claude system prompt
- Test knowledge-based responses

**Phase 5**: Interruption Logic

- Integrate VAD on client
- Detect user speech during playback
- Implement cancellation signals
- Stop playback and processing immediately
- Test interruption scenarios thoroughly

**Phase 6**: Widget UI

- Build floating button component
- Add state indicators (listening, processing, speaking)
- Implement minimize/maximize
- Make fully responsive
- Add styling and animations

**Phase 7**: Optimization & Testing

- Reduce latency across all steps
- Optimize token usage
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices
- Load testing with concurrent users

### 12. Usage Example

**In any HTML page**:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>BYD Shark 6</title>
  </head>
  <body>
    <h1>BYD Shark 6 - The Future of Pickups</h1>

    <!-- Embed widget -->
    <script src="https://yourcdn.com/byd-voice-assistant.js"></script>
    <script>
      BYDVoiceAssistant.init({
        primaryColor: "#d32f2f",
        position: "bottom-right",
      });
    </script>
  </body>
</html>
```

### 13. Success Criteria

- ✅ One-click to start voice conversation
- ✅ Continuous conversation flow (no repeated button clicks)
- ✅ End-to-end latency < 500ms
- ✅ User can interrupt assistant by speaking
- ✅ Interruption detected within 100ms
- ✅ Agent answers ONLY from knowledge base
- ✅ Works on any HTML page with single script tag
- ✅ Responsive on desktop and mobile
- ✅ No audio dropouts or glitches
- ✅ Graceful error handling

### 14. Technical Notes

**WebRTC vs WebSocket Decision**:

- Use WebRTC DataChannel for all audio streaming (lower latency, UDP-based)
- Use WebSocket ONLY for initial signaling (SDP/ICE exchange)
- After WebRTC connection established, optionally close WebSocket

**Audio Format**:

- Capture: PCM16, 16kHz, mono
- Transmission: Compress with Opus if possible
- Playback: Convert to format Web Audio API accepts

**Streaming Strategy**:

- Whisper: Send chunks as received, get partial transcripts
- Claude: Enable streaming API, process tokens as they arrive
- ElevenLabs: Use streaming endpoint, send audio as generated
- Never wait for complete responses before starting next step

**Memory Management**:

- Clear audio buffers after playback
- Prune conversation history
- Clean up WebRTC resources on widget close
- Use Web Workers to prevent UI blocking

### 15. Testing Checklist

- [ ] Microphone permission flow
- [ ] Audio capture quality
- [ ] WebRTC connection establishment
- [ ] Audio transmission to server
- [ ] Whisper transcription accuracy
- [ ] Claude responses from knowledge base only
- [ ] ElevenLabs audio quality
- [ ] Audio playback smoothness
- [ ] Interruption detection speed
- [ ] Interruption cancellation effectiveness
- [ ] Widget UI on desktop
- [ ] Widget UI on mobile
- [ ] Multiple browser compatibility
- [ ] Connection recovery
- [ ] Error scenarios (no mic, no internet, API failures)
- [ ] Concurrent user handling
- [ ] Latency measurements

---

## Deliverables

1. **byd-voice-assistant.js** - Production-ready embeddable widget
2. **Server application** - Node.js backend with all integrations
3. **Knowledge base files** - Structured data for BYD Shark 6 and competitors
4. **demo.html** - Working demo page
5. **README.md** - Setup and deployment instructions
6. **API documentation** - For customization and integration

---

## Priority: Speed & Latency

Every optimization should prioritize reducing latency:

- Use smallest audio chunks practical
- Stream at every step (don't wait for complete responses)
- Limit Claude token generation (150-200 max)
- Optimize knowledge base loading (cache in memory)
- Use Web Workers for heavy processing
- Implement audio pre-buffering strategically

---

## Start Building

Begin with Phase 1 and work sequentially. Test each phase thoroughly before moving to the next. Focus on getting the WebRTC audio pipeline working first, then add AI integrations, then polish the UI and add interruption handling.

The end goal: A user clicks one button, speaks naturally, gets instant voice responses about BYD Shark 6, can interrupt anytime, and has a seamless conversational experience.
