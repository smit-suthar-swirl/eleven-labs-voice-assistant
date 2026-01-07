# 🔑 Get Your Deepgram API Key

## Current Issue
❌ **API Key Invalid**: `dacfd60f35a8034e375be7bf53b3fd9ad32d9583`

**Error**: Authentication failed (401 Unauthorized)

---

## Steps to Get a Valid Key

### 1. Go to Deepgram Console
🔗 **URL**: https://console.deepgram.com/

### 2. Sign Up / Log In
- If new: Sign up for a free account
- If existing: Log in with your credentials

### 3. Get Free Credits
Deepgram offers:
- **$200 free credits** for new users
- No credit card required
- Includes real-time streaming API

### 4. Create API Key

Once logged in:
1. Go to **"API Keys"** section in the dashboard
2. Click **"Create a New API Key"**
3. Give it a name (e.g., "BYD Voice Assistant")
4. **Copy the key** (it looks like: `abc123def456...`)

### 5. Update Your `.env` File

Replace the old key in `.env`:

```bash
DEEPGRAM_API_KEY=your_new_key_here
```

**File location**: `/Users/smitsuthar/swirl/webrtc-voice-assistant/.env`

### 6. Restart the Server

```bash
# Stop current server
lsof -ti:3000 | xargs kill -9

# Start fresh
node server/index.js > /tmp/server.log 2>&1 &
```

### 7. Test

```bash
# Watch logs
tail -f /tmp/server.log
```

Look for:
```
🟢 Deepgram connection opened and ready
✅ Pipeline ready: [client-id]
```

### 8. Test in Browser

1. Refresh: http://localhost:3000 (Cmd+Shift+R)
2. Click "Start Conversation"
3. Wait 2-3 seconds
4. Speak: "What is the BYD Shark 6?"
5. ✅ See transcription appear!

---

## Quick Validation

After updating `.env`, test the key:

```bash
curl -X GET "https://api.deepgram.com/v1/projects" \
  -H "Authorization: Token YOUR_NEW_KEY_HERE"
```

**Expected**: JSON response with your projects (not 401 error)

---

## Alternative: OpenAI Whisper (Backup)

If you prefer not to use Deepgram, I can switch to OpenAI Whisper which uses your existing `OPENAI_API_KEY`. Just let me know!

**Trade-offs**:
- ✅ Whisper: No new key needed, good accuracy
- ❌ Whisper: Batched processing (slight delay)
- ✅ Deepgram: Real-time streaming, faster
- ❌ Deepgram: Needs valid API key

---

## I'm Ready!

Once you've updated the `.env` file with your new Deepgram API key, just let me know and I'll help you test it!

**Current status**: ⏸️ Waiting for valid Deepgram API key
