/**
 * WebRTC Client - Simplified WebSocket implementation
 */

class WebRTCClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.clientId = null;
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
    return new Promise((resolve, reject) => {
      const wsUrl = this.serverUrl.replace('http', 'ws') + '/signaling';
      this.ws = new WebSocket(wsUrl);

      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('🔌 Connected');
        this.ws.send(JSON.stringify({ type: 'ready' }));
      };

      this.ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);
          if (message.type === 'welcome') {
            this.clientId = message.clientId;
            resolve();
          } else if (message.type === 'error') {
            console.error('Server error:', message.message);
            this.emit('error', message.message);
          } else if (message.type === 'transcript') {
            // Transcript message for display
            this.emit('transcript', { role: message.role, text: message.text });
          }
        } else {
          // Binary audio data from server
          const audioChunk = new Uint8Array(event.data);
          this.emit('audioChunk', audioChunk);
          this.emit('stateChange', 'speaking');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected');
      };

      setTimeout(() => {
        if (!this.clientId) reject(new Error('Connection timeout'));
      }, 10000);
    });
  }

  sendAudioChunk(audioChunk) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioChunk);
      this.emit('stateChange', 'processing');
    }
  }

  sendInterruption() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.clientId = null;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.WebRTCClient = WebRTCClient;
}
