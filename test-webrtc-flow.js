const WebSocket = require("ws");

// Simple script to test signaling flow
const ws = new WebSocket("ws://localhost:3000/signaling");

ws.on("open", () => {
  console.log("✅ Connected to signaling server");

  // Send ready
  ws.send(JSON.stringify({ type: "ready" }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  console.log("📩 Received:", msg.type);

  if (msg.type === "welcome") {
    console.log("Client ID:", msg.clientId);
  }

  if (msg.type === "ready") {
    // Send fake SDP offer
    console.log("📤 Sending fake offer");
    ws.send(
      JSON.stringify({
        type: "offer",
        sdp: {
          type: "offer",
          sdp: "v=0\r\no=- 4647334756535697690 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0 1\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:3j4k\r\na=ice-pwd:3j4k\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:actpass\r\na=mid:0\r\na=sendonly\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\n",
        },
      })
    );
  }

  if (msg.type === "answer") {
    console.log("✅ Received SDP answer!");
    console.log("Test PASSED");
    ws.close();
    process.exit(0);
  }

  if (msg.type === "error") {
    console.error("❌ Error:", msg.message);
    process.exit(1);
  }
});

ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err);
  process.exit(1);
});
