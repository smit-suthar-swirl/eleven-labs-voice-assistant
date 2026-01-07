const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const AudioPipelineRealtime = require("./audio-pipeline-realtime");
const WebRTCPeerManager = require("./webrtc-peer-manager");

class WebSocketSignaling {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: "/signaling" });
    this.clients = new Map();
    this.audioPipelines = new Map();
    this.webrtcPeers = new Map();

    this.wss.on("connection", this.handleConnection.bind(this));
    console.log("✅ WebSocket signaling server initialized");
  }

  handleConnection(ws, req) {
    const clientId = uuidv4();
    console.log(`📱 Client connected: ${clientId}`);

    this.clients.set(clientId, { ws, id: clientId });

    // Create real-time audio pipeline
    const pipeline = new AudioPipelineRealtime(clientId, ws);
    this.audioPipelines.set(clientId, pipeline);

    ws.on("message", async (message, isBinary) => {
      try {
        // ws v8+ passes isBinary boolean
        // If isBinary is true, it's audio data (Buffer)
        // If isBinary is false, it's control message (Buffer needing toString)

        if (isBinary) {
          // Binary audio data
          await pipeline.processAudioChunk(message);
        } else {
          // Text message (JSON) - convert Buffer to string
          const text = message.toString();
          const data = JSON.parse(text);
          console.log(`📨 [${clientId}] Received message type:`, data.type);
          await this.handleMessage(clientId, data, ws);
        }
      } catch (error) {
        console.error(
          `❌ [${clientId}] Error processing message:`,
          error.message
        );
        console.error("Error stack:", error.stack);
        ws.send(JSON.stringify({ type: "error", message: error.message }));
      }
    });

    ws.on("close", () => {
      console.log(`👋 Client disconnected: ${clientId}`);
      this.cleanup(clientId);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error: ${error.message}`);
      this.cleanup(clientId);
    });

    ws.send(JSON.stringify({ type: "welcome", clientId }));
  }

  async handleMessage(clientId, data, ws) {
    const { type } = data;

    switch (type) {
      case "ready":
        ws.send(JSON.stringify({ type: "ready", status: "ok" }));
        break;

      case "offer":
        // Client sent SDP offer, create WebRTC peer connection
        await this.handleWebRTCOffer(clientId, data.sdp, ws);
        break;

      case "ice-candidate":
        // Client sent ICE candidate
        await this.handleIceCandidate(clientId, data.candidate);
        break;

      case "interrupt":
        const pipeline = this.audioPipelines.get(clientId);
        if (pipeline) pipeline.interrupt();
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }

  /**
   * Handle WebRTC offer from client
   */
  async handleWebRTCOffer(clientId, offer, ws) {
    console.log(`📥 [${clientId}] Received WebRTC offer`);
    try {
      const pipeline = this.audioPipelines.get(clientId);

      // Create WebRTC peer manager
      const peerManager = new WebRTCPeerManager(
        clientId,
        ws,
        // onAudioChunk callback - forward audio to pipeline
        (audioBuffer) => {
          if (pipeline) {
            pipeline.processAudioChunk(audioBuffer);
          }
        },
        // onMessage callback - handle control messages
        (message) => {
          if (message.type === "interrupt" && pipeline) {
            pipeline.interrupt();
          }
        }
      );

      this.webrtcPeers.set(clientId, peerManager);

      // Update pipeline to send audio via WebRTC data channel
      if (pipeline) {
        pipeline.updateTransport((audioChunk) => {
          peerManager.sendAudioChunk(audioChunk);
        });
      }

      // Handle the offer and create answer
      await peerManager.handleOffer(offer);

      console.log(`✅ [${clientId}] WebRTC peer connection established`);
    } catch (error) {
      console.error(`❌ [${clientId}] Error handling WebRTC offer:`, error);
      ws.send(JSON.stringify({ type: "error", message: error.message }));
    }
  }

  /**
   * Handle ICE candidate from client
   */
  async handleIceCandidate(clientId, candidate) {
    const peerManager = this.webrtcPeers.get(clientId);
    if (peerManager) {
      await peerManager.handleIceCandidate(candidate);
    }
  }

  cleanup(clientId) {
    // Cleanup WebRTC peer manager
    const peerManager = this.webrtcPeers.get(clientId);
    if (peerManager) {
      peerManager.cleanup();
      this.webrtcPeers.delete(clientId);
    }

    // Cleanup audio pipeline
    const pipeline = this.audioPipelines.get(clientId);
    if (pipeline) {
      pipeline.cleanup();
      this.audioPipelines.delete(clientId);
    }

    // Remove client
    this.clients.delete(clientId);
  }
}

module.exports = WebSocketSignaling;
