require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const WebSocketSignaling = require('./webrtc-signaling');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/client', express.static('client'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize WebSocket signaling server
const wsSignaling = new WebSocketSignaling(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 BYD Voice Assistant Server running on port ${PORT}`);
  console.log(`📝 Demo page: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket signaling ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
