/**
 * WebRTC Connection Manager
 * Manages RTCPeerConnection, data channels, and signaling for real-time audio streaming
 */

class WebRTCConnection {
  constructor(signalingUrl) {
    this.signalingUrl = signalingUrl;
    this.signalingSocket = null;
    this.peerConnection = null;
    this.audioDataChannel = null;
    this.clientId = null;
    this.eventListeners = {};

    // ICE configuration for NAT traversal
    this.iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
  }

  /**
   * Event emitter pattern for compatibility
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Connect to signaling server and establish WebRTC connection
   */
  async connect() {
    return new Promise((resolve, reject) => {
      // Store resolve/reject for later use
      this.connectResolve = resolve;
      this.connectReject = reject;

      // Connect to signaling server via WebSocket
      const wsUrl = this.signalingUrl.replace('http', 'ws') + '/signaling';
      this.signalingSocket = new WebSocket(wsUrl);

      this.signalingSocket.onopen = () => {
        console.log('🔌 Signaling connected');
        // Send ready message
        const readyMsg = JSON.stringify({ type: 'ready' });
        console.log('📤 Sending ready message:', readyMsg);
        this.signalingSocket.send(readyMsg);
      };

      this.signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          await this.handleSignalingMessage(message);
        } catch (error) {
          console.error('Error handling signaling message:', error);
          reject(error);
        }
      };

      this.signalingSocket.onerror = (error) => {
        console.error('Signaling error:', error);
        reject(error);
      };

      this.signalingSocket.onclose = () => {
        console.log('🔌 Signaling disconnected');
        this.cleanup();
      };

      // Connection timeout
      setTimeout(() => {
        if (!this.clientId || !this.audioDataChannel || this.audioDataChannel.readyState !== 'open') {
          reject(new Error('WebRTC connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle signaling messages (SDP/ICE)
   */
  async handleSignalingMessage(message) {
    const { type } = message;

    switch (type) {
      case 'welcome':
        this.clientId = message.clientId;
        console.log('📱 Client ID:', this.clientId);
        // Create peer connection and send offer
        await this.createPeerConnection();
        await this.createOffer();
        break;

      case 'answer':
        await this.handleAnswer(message.sdp);
        // Connection will be resolved when data channel opens
        break;

      case 'ice-candidate':
        await this.handleIceCandidate(message.candidate);
        break;

      case 'transcript':
        this.emit('transcript', { role: message.role, text: message.text });
        break;

      case 'error':
        console.error('Server error:', message.message);
        this.emit('error', message.message);
        if (this.connectReject) this.connectReject(new Error(message.message));
        break;

      case 'ready':
        console.log('✅ Server ready');
        break;

      default:
        console.warn('Unknown signaling message type:', type);
    }
  }

  /**
   * Create RTCPeerConnection and configure data channel
   */
  async createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceConfig);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingSocket.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    };

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('🔗 WebRTC connection state:', state);

      if (state === 'failed') {
        this.emit('error', 'WebRTC connection failed');
      } else if (state === 'disconnected') {
        this.emit('error', 'WebRTC disconnected');
      }
    };

    // Handle incoming data channels (for server-initiated channels)
    this.peerConnection.ondatachannel = (event) => {
      console.log('📡 Received data channel from server:', event.channel.label);
      this.setupDataChannel(event.channel);
    };

    // Create outgoing audio data channel (client-initiated)
    this.audioDataChannel = this.peerConnection.createDataChannel('audio', {
      ordered: false,       // Don't guarantee order (lower latency)
      maxRetransmits: 0     // Don't retransmit lost packets (prioritize speed)
    });

    this.setupDataChannel(this.audioDataChannel);

    console.log('🔧 RTCPeerConnection created');
  }

  /**
   * Configure data channel event handlers
   */
  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('📡 Data channel opened:', channel.label);
      this.emit('dataChannelOpen', channel.label);

      // Emit connected event when audio channel is ready
      if (channel.label === 'audio') {
        console.log('✅ WebRTC connection established');
        this.emit('connected');

        // Resolve the connect() promise
        if (this.connectResolve) {
          this.connectResolve();
          this.connectResolve = null;
          this.connectReject = null;
        }
      }
    };

    channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary audio data from server
        const audioChunk = new Uint8Array(event.data);
        this.emit('audioChunk', audioChunk);
        this.emit('stateChange', 'speaking');
      } else {
        // Text messages (JSON control messages)
        try {
          const message = JSON.parse(event.data);
          this.handleDataChannelMessage(message);
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      }
    };

    channel.onerror = (error) => {
      console.error('❌ Data channel error:', error);
      this.emit('error', 'Data channel error');
    };

    channel.onclose = () => {
      console.log('📡 Data channel closed:', channel.label);
    };

    // Store reference if it's the audio channel
    if (channel.label === 'audio') {
      this.audioDataChannel = channel;
    }
  }

  /**
   * Handle JSON messages received over data channel
   */
  handleDataChannelMessage(message) {
    const { type } = message;

    switch (type) {
      case 'transcript':
        this.emit('transcript', { role: message.role, text: message.text });
        break;

      case 'stateChange':
        this.emit('stateChange', message.state);
        break;

      case 'error':
        console.error('Server error via data channel:', message.message);
        this.emit('error', message.message);
        break;

      default:
        console.warn('Unknown data channel message type:', type);
    }
  }

  /**
   * Create SDP offer and send to server
   */
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to server via signaling WebSocket
      // Send as plain object, not RTCSessionDescription
      const offerMsg = JSON.stringify({
        type: 'offer',
        sdp: {
          type: offer.type,
          sdp: offer.sdp
        }
      });
      console.log('📤 Sending SDP offer, readyState:', this.signalingSocket.readyState);
      this.signalingSocket.send(offerMsg);

      console.log('📤 SDP offer sent');
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Handle SDP answer from server
   */
  async handleAnswer(sdp) {
    try {
      const answer = new RTCSessionDescription(sdp);
      await this.peerConnection.setRemoteDescription(answer);
      console.log('📥 SDP answer received');
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  /**
   * Handle ICE candidate from server
   */
  async handleIceCandidate(candidate) {
    if (candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🧊 ICE candidate added');
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    }
  }

  /**
   * Send audio chunk over data channel
   */
  sendAudioChunk(audioChunk) {
    if (this.audioDataChannel && this.audioDataChannel.readyState === 'open') {
      // Send PCM16 audio as binary over data channel
      const buffer = audioChunk.buffer || audioChunk;
      this.audioDataChannel.send(buffer);
    } else {
      console.warn(`⚠️ Data channel not ready: ${this.audioDataChannel?.readyState || 'null'}`);
    }
  }

  /**
   * Send interruption signal to server
   */
  sendInterruption() {
    if (this.audioDataChannel && this.audioDataChannel.readyState === 'open') {
      // Send interruption as JSON message
      const message = JSON.stringify({ type: 'interrupt' });
      this.audioDataChannel.send(message);
      console.log('🛑 Interruption sent');
    } else {
      console.warn('Data channel not ready, cannot send interruption');
    }
  }

  /**
   * Cleanup and close connections
   */
  cleanup() {
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

    if (this.signalingSocket) {
      try {
        this.signalingSocket.close();
      } catch (e) {
        // Already closed
      }
      this.signalingSocket = null;
    }

    this.clientId = null;
    console.log('🧹 WebRTC connection cleaned up');
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    this.cleanup();
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.WebRTCConnection = WebRTCConnection;
}
