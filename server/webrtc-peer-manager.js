/**
 * WebRTC Peer Manager (Server-side)
 * Manages server-side RTCPeerConnection using werift library
 * Handles SDP negotiation, ICE candidates, and data channels
 */

const { RTCPeerConnection } = require('werift');

class WebRTCPeerManager {
  constructor(clientId, signalingSocket, onAudioChunk, onMessage) {
    this.clientId = clientId;
    this.signalingSocket = signalingSocket;
    this.onAudioChunk = onAudioChunk;
    this.onMessage = onMessage;
    this.peerConnection = null;
    this.audioDataChannel = null;

    // ICE configuration
    this.iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
  }

  /**
   * Handle SDP offer from client and create answer
   */
  async handleOffer(offer) {
    try {
      // Create peer connection using werift
      this.peerConnection = new RTCPeerConnection(this.iceConfig);

      console.log(`🔧 [${this.clientId}] RTCPeerConnection created (werift)`);

      // Handle ICE candidates
      this.peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          this.signalingSocket.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: candidate.toJSON()
          }));
        }
      };

      // Monitor connection state
      this.peerConnection.onconnectionstatechange = () => {
        console.log(`🔗 [${this.clientId}] Connection state:`,
          this.peerConnection.connectionState);
      };

      // Handle incoming data channel from client
      this.peerConnection.ondatachannel = ({ channel }) => {
        console.log(`📡 [${this.clientId}] Data channel received:`, channel.label);
        this.audioDataChannel = channel;
        this.setupDataChannel(channel);
      };

      console.log(`📥 [${this.clientId}] Setting remote description`);
      // Set remote description (offer from client)
      await this.peerConnection.setRemoteDescription(offer);

      console.log(`📤 [${this.clientId}] Creating SDP answer`);
      // Create answer
      const answer = await this.peerConnection.createAnswer();

      console.log(`📤 [${this.clientId}] Setting local description`);
      await this.peerConnection.setLocalDescription(answer);

      // Send answer back to client via signaling
      this.signalingSocket.send(JSON.stringify({
        type: 'answer',
        sdp: answer
      }));

      console.log(`✅ [${this.clientId}] SDP answer sent`);
    } catch (error) {
      console.error(`❌ [${this.clientId}] Error handling offer:`, error);
      throw error;
    }
  }

  /**
   * Setup data channel event handlers
   */
  setupDataChannel(channel) {
    channel.onopen = () => {
      console.log(`📡 [${this.clientId}] Data channel opened:`, channel.label);
    };

    channel.onmessage = ({ data }) => {
      try {
        // Check if data is binary (audio) or text (JSON)
        if (data instanceof Buffer || data instanceof Uint8Array) {
          // Binary audio data from client
          const audioBuffer = Buffer.from(data);
          // Reduced logging to avoid spam
          if (this.onAudioChunk) {
            this.onAudioChunk(audioBuffer);
          }
        } else if (typeof data === 'string') {
          // Text messages (JSON control messages)
          try {
            const message = JSON.parse(data);
            if (this.onMessage) {
              this.onMessage(message);
            }
          } catch (error) {
            console.error('Error parsing data channel message:', error);
          }
        } else {
          console.warn('Unknown data type received:', typeof data);
        }
      } catch (error) {
        console.error(`❌ [${this.clientId}] Error handling message:`, error);
      }
    };

    channel.onerror = (error) => {
      console.error(`❌ [${this.clientId}] Data channel error:`, error);
    };

    channel.onclose = () => {
      console.log(`📡 [${this.clientId}] Data channel closed`);
    };
  }

  /**
   * Handle ICE candidate from client
   */
  async handleIceCandidate(candidate) {
    if (candidate && this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
        console.log(`🧊 [${this.clientId}] ICE candidate added`);
      } catch (error) {
        console.error(`❌ [${this.clientId}] Error adding ICE candidate:`, error);
      }
    }
  }

  /**
   * Send binary audio chunk to client
   */
  sendAudioChunk(audioChunk) {
    if (this.audioDataChannel && this.audioDataChannel.readyState === 'open') {
      try {
        // Send binary audio data to client
        const buffer = Buffer.from(audioChunk);
        this.audioDataChannel.send(buffer);
      } catch (error) {
        console.error(`❌ [${this.clientId}] Error sending audio:`, error);
      }
    } else {
      console.warn(`⚠️ [${this.clientId}] Data channel not ready`);
    }
  }

  /**
   * Send JSON message to client
   */
  sendMessage(message) {
    if (this.audioDataChannel && this.audioDataChannel.readyState === 'open') {
      try {
        this.audioDataChannel.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ [${this.clientId}] Error sending message:`, error);
      }
    }
  }

  /**
   * Cleanup connections
   */
  cleanup() {
    console.log(`🧹 [${this.clientId}] Cleaning up WebRTC peer`);

    if (this.audioDataChannel) {
      try {
        this.audioDataChannel.close();
      } catch (e) {
        // Already closed
      }
      this.audioDataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        // Already closed
      }
      this.peerConnection = null;
    }
  }
}

module.exports = WebRTCPeerManager;
