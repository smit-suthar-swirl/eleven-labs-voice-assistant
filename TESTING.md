# Testing Guide

## Quick Start

1. **Verify setup**:
```bash
npm run check
```

2. **Start server**:
```bash
npm start
```

3. **Open demo**:
Navigate to `http://localhost:3000`

## Testing Checklist

### 1. Basic Setup ✅
- [x] Dependencies installed
- [x] API keys configured
- [x] Knowledge base loaded
- [x] Server starts without errors

### 2. UI Tests
- [ ] Widget button appears in bottom-right corner
- [ ] Button has correct color (#d32f2f)
- [ ] Hover effect works
- [ ] Click triggers microphone permission request

### 3. Audio Capture Tests
- [ ] Microphone permission granted
- [ ] Audio capture starts (check console logs)
- [ ] Audio chunks being sent (network tab shows WebSocket messages)
- [ ] Button shows "listening" state (pulsing animation)

### 4. WebSocket Tests
- [ ] WebSocket connection established
- [ ] Client receives welcome message with ID
- [ ] Binary audio data transmitted
- [ ] Connection stable (no disconnects)

### 5. Voice Pipeline Tests
- [ ] Say: "Hello" → Should get greeting response
- [ ] Say: "What is the BYD Shark 6?" → Should describe vehicle
- [ ] Say: "How much does it cost?" → Should say "$49,990 AUD"
- [ ] Say: "Compare it to Toyota Hilux" → Should provide comparison
- [ ] Say: "What is the towing capacity?" → Should say "2,500 kg"
- [ ] Say: "Tell me about the battery" → Should provide battery specs

### 6. Interruption Tests
- [ ] Start question, interrupt mid-response
- [ ] Assistant stops speaking immediately
- [ ] New question processed correctly

### 7. Error Handling Tests
- [ ] Deny microphone permission → Shows error message
- [ ] Disconnect internet → Shows reconnection attempt
- [ ] Speak unintelligibly → Handles gracefully
- [ ] Close widget → Everything stops cleanly

### 8. Mobile Tests
- [ ] Open on mobile browser
- [ ] Widget responsive and clickable
- [ ] Microphone works on mobile
- [ ] Audio playback works on mobile

### 9. Browser Compatibility
- [ ] Chrome (90+)
- [ ] Firefox (88+)
- [ ] Safari (14+)
- [ ] Edge (90+)

## Console Logs to Watch

**Good signs**:
```
🚀 BYD Voice Assistant Server running on port 3000
✅ WebSocket server initialized
📱 Client connected: [uuid]
🔧 Pipeline created: [uuid]
🎤 Audio capture started (client console)
📝 "user question here"
🤖 "assistant response here"
```

**Error signs**:
```
❌ Whisper error: ...
❌ Pipeline error: ...
❌ WebSocket error: ...
```

## Manual Testing Steps

### Test 1: Basic Conversation
1. Click widget button
2. Grant microphone permission
3. Say: "Hello, can you hear me?"
4. Wait for audio response
5. Verify response is relevant

### Test 2: Knowledge Base Query
1. Click widget
2. Ask: "What are the key features of BYD Shark 6?"
3. Verify response includes: PHEV, 430 HP, 800+ km range, etc.
4. Ask follow-up: "How does it compare to Ford Ranger?"
5. Verify mentions price difference and hybrid advantage

### Test 3: Interruption
1. Click widget
2. Ask long question: "Tell me everything about the BYD Shark 6"
3. While assistant is speaking, say: "Stop, what's the price?"
4. Verify assistant stops and answers new question

### Test 4: Conversation History
1. Ask: "What is the price?"
2. Then ask: "What about the warranty?"
3. Then ask: "And what's the towing capacity?"
4. Verify assistant maintains context

### Test 5: Out of Knowledge Base
1. Ask: "What's the weather today?"
2. Verify response: "I don't have that information"
3. Confirm stays on topic

## Performance Benchmarks

Target metrics:
- **Connection time**: < 2 seconds
- **First response**: < 3 seconds from speaking
- **Audio latency**: < 500ms
- **Interruption detection**: < 100ms

## Troubleshooting

### No audio capture
- Check browser permissions
- Check HTTPS (required for getUserMedia)
- Try different browser

### No audio playback
- Check speaker volume
- Check browser audio settings
- Open console for errors

### High latency
- Check network speed
- Reduce audio chunk size
- Use faster ElevenLabs voice

### WebSocket disconnects
- Check firewall
- Check server logs
- Verify stable internet

## API Usage Monitoring

Track API costs per session:
- Whisper: ~$0.006 per minute
- Claude: ~$0.015 per response
- ElevenLabs: ~$0.05 per response

Average cost per 5-minute conversation: ~$0.50

## Production Testing

Before deployment:
- [ ] Test with HTTPS
- [ ] Test on production domain
- [ ] Load test with 10+ concurrent users
- [ ] Monitor API rate limits
- [ ] Set up error logging
- [ ] Configure CDN for client files
- [ ] Test on real mobile devices
- [ ] Test in different geographic regions

## Success Criteria

All phases complete when:
1. ✅ Widget loads on any page
2. ✅ Voice conversation works end-to-end
3. ✅ Responses are accurate to knowledge base
4. ✅ Interruption works smoothly
5. ✅ No crashes or memory leaks
6. ✅ Works on desktop and mobile
7. ✅ Latency under 500ms
8. ✅ Error handling graceful
