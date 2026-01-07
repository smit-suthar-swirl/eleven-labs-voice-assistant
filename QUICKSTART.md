# Quick Start Guide

## 1. Setup (2 minutes)

```bash
# Install dependencies
npm install

# Configure API keys (edit .env file)
nano .env
# Add your keys:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# ELEVENLABS_API_KEY=...

# Verify setup
npm run check
```

## 2. Start Server

```bash
npm start
```

You should see:
```
🚀 BYD Voice Assistant Server running on port 3000
📝 Demo page: http://localhost:3000
🔌 WebSocket signaling ready
```

## 3. Test the Widget

Open browser: `http://localhost:3000`

1. Click the red microphone button (bottom-right)
2. Allow microphone access
3. Say: **"What is the BYD Shark 6?"**
4. Wait for voice response

## 4. Try These Questions

- "How much does it cost?"
- "What is the towing capacity?"
- "Compare it to Toyota Hilux"
- "Tell me about the battery"
- "What's the warranty?"

## 5. Embed on Your Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Page</title>
</head>
<body>
  <h1>Your Content</h1>

  <!-- Add this at the bottom -->
  <script src="http://localhost:3000/client/byd-voice-assistant.js"></script>
  <script>
    BYDVoiceAssistant.init({
      primaryColor: '#d32f2f',
      position: 'bottom-right',
      buttonSize: 60
    });
  </script>
</body>
</html>
```

## Troubleshooting

**Widget doesn't appear?**
- Check browser console for errors
- Verify server is running on port 3000

**No microphone?**
- Grant permission when prompted
- Use Chrome/Firefox for best support
- Check System Preferences > Security > Microphone

**No audio response?**
- Check speaker volume
- Verify API keys in .env
- Check server console for errors

**High latency?**
- Ensure good internet connection
- APIs may take 2-3 seconds first time

## Development

```bash
# Auto-reload on changes
npm run dev

# Check setup
npm run check
```

## Production Deployment

1. Set environment to production in .env
2. Deploy to hosting service (Heroku, AWS, etc.)
3. Configure HTTPS (required for microphone)
4. Update client script URL in your pages
5. Set up CDN for client files

## Support

- Check TESTING.md for detailed test cases
- Check README.md for full documentation
- Check server logs for errors
- Monitor API usage in respective dashboards

## Architecture

```
User speaks → Microphone → WebSocket → Server
                                          ↓
                                      Whisper STT
                                          ↓
                                      Claude LLM
                                          ↓
                                    ElevenLabs TTS
                                          ↓
Server → WebSocket → Speaker → User hears
```

## Cost Estimate

Per 5-minute conversation:
- Whisper: $0.03
- Claude: $0.10
- ElevenLabs: $0.25
**Total: ~$0.38 per conversation**

## Next Steps

1. Customize widget colors
2. Add more competitors to knowledge base
3. Adjust response length (currently 40 words max)
4. Add conversation transcript display
5. Implement analytics
6. Add authentication if needed

Enjoy your voice assistant! 🎤
