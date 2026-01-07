/**
 * WebRTC Client - Now using actual WebRTC with Data Channels
 * Maintains backward-compatible API while delegating to WebRTCConnection
 */

class WebRTCClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.connection = null;
    this.eventListeners = {};
  }

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

  async connect() {
    // Dynamically load WebRTCConnection if not already loaded
    if (!window.WebRTCConnection) {
      await this.loadScript('/client/webrtc-connection.js');
    }

    // Create WebRTC connection
    this.connection = new WebRTCConnection(this.serverUrl);

    // Forward all events from connection to this client
    this.connection.on('audioChunk', (chunk) => this.emit('audioChunk', chunk));
    this.connection.on('stateChange', (state) => this.emit('stateChange', state));
    this.connection.on('transcript', (data) => this.emit('transcript', data));
    this.connection.on('error', (message) => this.emit('error', message));
    this.connection.on('dataChannelOpen', (label) => {
      console.log('🟢 WebRTC data channel ready:', label);
    });
    this.connection.on('connected', () => {
      console.log('✅ WebRTC connection established');
    });

    // Connect to server and establish WebRTC connection
    await this.connection.connect();
    console.log('🔌 WebRTC Client Connected');
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  sendAudioChunk(audioChunk) {
    if (this.connection) {
      this.connection.sendAudioChunk(audioChunk);
    } else {
      console.warn('Connection not established');
    }
  }

  sendInterruption() {
    if (this.connection) {
      this.connection.sendInterruption();
    } else {
      console.warn('Connection not established');
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.WebRTCClient = WebRTCClient;
}
