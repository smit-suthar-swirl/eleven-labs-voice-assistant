const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const AudioPipelineRealtime = require('./audio-pipeline-realtime');

class WebSocketSignaling {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/signaling' });
    this.clients = new Map();
    this.audioPipelines = new Map();

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('✅ WebSocket server initialized');
  }

  handleConnection(ws, req) {
    const clientId = uuidv4();
    console.log(`📱 Client connected: ${clientId}`);

    this.clients.set(clientId, { ws, id: clientId });

    // Create real-time audio pipeline
    const pipeline = new AudioPipelineRealtime(clientId, ws);
    this.audioPipelines.set(clientId, pipeline);

    ws.on('message', async (message) => {
      try {
        if (message instanceof Buffer) {
          // Binary audio data
          await pipeline.processAudioChunk(message);
        } else {
          // Text message (JSON)
          const data = JSON.parse(message);
          await this.handleMessage(clientId, data, ws);
        }
      } catch (error) {
        console.error('Error:', error.message);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });

    ws.on('close', () => {
      console.log(`👋 Client disconnected: ${clientId}`);
      this.cleanup(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error: ${error.message}`);
      this.cleanup(clientId);
    });

    ws.send(JSON.stringify({ type: 'welcome', clientId }));
  }

  async handleMessage(clientId, data, ws) {
    const { type } = data;

    switch (type) {
      case 'ready':
        ws.send(JSON.stringify({ type: 'ready', status: 'ok' }));
        break;

      case 'interrupt':
        const pipeline = this.audioPipelines.get(clientId);
        if (pipeline) pipeline.interrupt();
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }

  cleanup(clientId) {
    const pipeline = this.audioPipelines.get(clientId);
    if (pipeline) {
      pipeline.cleanup();
      this.audioPipelines.delete(clientId);
    }
    this.clients.delete(clientId);
  }
}

module.exports = WebSocketSignaling;
