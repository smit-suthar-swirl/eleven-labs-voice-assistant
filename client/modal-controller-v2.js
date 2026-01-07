/**
 * Modal Controller V2 - Clean, Smooth Conversation Interface
 */

class ModalControllerV2 {
  constructor(config) {
    this.config = config;
    this.modal = null;
    this.isOpen = false;
    this.eventListeners = {};
    this.transcript = [];
    this.currentState = 'idle';
    this.isListening = false;
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

  createModal() {
    this.modal = document.createElement('div');
    this.modal.id = 'byd-modal-v2';
    this.modal.className = 'byd-modal-v2';

    this.modal.innerHTML = `
      <div class="byd-modal-overlay"></div>
      <div class="byd-modal-container">
        <!-- Header -->
        <div class="byd-modal-header">
          <div class="byd-header-content">
            <div class="byd-avatar-small">🚗</div>
            <div class="byd-header-text">
              <h3>BYD Shark 6 Assistant</h3>
              <p class="byd-status-indicator">Ready to help</p>
            </div>
          </div>
          <button class="byd-close-btn" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Conversation Area -->
        <div class="byd-conversation-area" id="conversation-area">
          <div class="byd-welcome-message">
            <div class="byd-avatar-large">🎤</div>
            <h2>Hi! I'm your BYD Shark 6 assistant</h2>
            <p>Click the microphone below and start asking me anything about the BYD Shark 6</p>
          </div>
        </div>

        <!-- Bottom Controls -->
        <div class="byd-bottom-controls">
          <!-- VAD Indicator -->
          <div class="byd-vad-indicator" id="vad-indicator">
            <div class="byd-vad-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <p class="byd-vad-text">Listening...</p>
          </div>

          <!-- Mic Button -->
          <button class="byd-mic-button" id="mic-button" aria-label="Microphone">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.injectStyles();
    this.attachEvents();
  }

  attachEvents() {
    // Close button
    const closeBtn = this.modal.querySelector('.byd-close-btn');
    closeBtn.onclick = () => this.close();

    // Mic button
    const micBtn = document.getElementById('mic-button');
    micBtn.onclick = () => this.toggleMicrophone();

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggleMicrophone() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    this.isListening = true;
    const micBtn = document.getElementById('mic-button');
    const vadIndicator = document.getElementById('vad-indicator');

    micBtn.classList.add('active');
    vadIndicator.classList.add('active');

    // Remove welcome message if present
    const welcome = this.modal.querySelector('.byd-welcome-message');
    if (welcome) {
      welcome.style.display = 'none';
    }

    this.emit('activate');
  }

  stopListening() {
    this.isListening = false;
    const micBtn = document.getElementById('mic-button');
    const vadIndicator = document.getElementById('vad-indicator');

    micBtn.classList.remove('active');
    vadIndicator.classList.remove('active');

    this.emit('deactivate');
  }

  open() {
    this.modal.style.display = 'flex';
    this.isOpen = true;
    setTimeout(() => {
      this.modal.classList.add('active');
    }, 10);
  }

  close() {
    this.modal.classList.remove('active');
    setTimeout(() => {
      this.modal.style.display = 'none';
      this.isOpen = false;
      this.stopListening();
    }, 300);
  }

  setState(state) {
    this.currentState = state;
    const statusText = this.modal.querySelector('.byd-status-indicator');
    const vadText = this.modal.querySelector('.byd-vad-text');

    switch (state) {
      case 'listening':
        statusText.textContent = '🎤 Listening';
        if (vadText) vadText.textContent = 'Listening...';
        break;
      case 'processing':
        statusText.textContent = '💭 Thinking';
        if (vadText) vadText.textContent = 'Processing...';
        break;
      case 'speaking':
        statusText.textContent = '🔊 Speaking';
        if (vadText) vadText.textContent = 'Speaking...';
        break;
      default:
        statusText.textContent = 'Ready to help';
        if (vadText) vadText.textContent = 'Click mic to speak';
    }
  }

  addToTranscript(role, text) {
    const conversationArea = document.getElementById('conversation-area');

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `byd-message byd-message-${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'byd-bubble';
    bubble.textContent = text;

    messageDiv.appendChild(bubble);
    conversationArea.appendChild(messageDiv);

    // Smooth scroll to bottom
    setTimeout(() => {
      conversationArea.scrollTo({
        top: conversationArea.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);

    this.transcript.push({ role, text, timestamp: Date.now() });
  }

  showError(message) {
    const statusText = this.modal.querySelector('.byd-status-indicator');
    statusText.textContent = '⚠️ ' + message;
    statusText.style.color = '#f44336';
    setTimeout(() => {
      statusText.style.color = '';
      this.setState(this.currentState);
    }, 3000);
  }

  injectStyles() {
    const styleId = 'byd-modal-v2-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      * {
        box-sizing: border-box;
      }

      .byd-modal-v2 {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .byd-modal-v2.active {
        opacity: 1;
      }

      .byd-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
      }

      .byd-modal-container {
        position: relative;
        width: 100%;
        max-width: 600px;
        height: 100vh;
        margin: 0 auto;
        background: #fff;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 60px rgba(0, 0, 0, 0.3);
      }

      /* Header */
      .byd-modal-header {
        flex-shrink: 0;
        background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .byd-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .byd-avatar-small {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .byd-header-text h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .byd-status-indicator {
        margin: 4px 0 0 0;
        font-size: 13px;
        opacity: 0.9;
      }

      .byd-close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .byd-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .byd-close-btn svg {
        width: 20px;
        height: 20px;
      }

      /* Conversation Area */
      .byd-conversation-area {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f5f5f5;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .byd-conversation-area::-webkit-scrollbar {
        width: 6px;
      }

      .byd-conversation-area::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;
      }

      /* Welcome Message */
      .byd-welcome-message {
        text-align: center;
        padding: 60px 20px;
        color: #666;
      }

      .byd-avatar-large {
        font-size: 64px;
        margin-bottom: 20px;
      }

      .byd-welcome-message h2 {
        margin: 0 0 12px 0;
        font-size: 24px;
        color: #333;
      }

      .byd-welcome-message p {
        margin: 0;
        font-size: 16px;
        line-height: 1.5;
      }

      /* Messages */
      .byd-message {
        display: flex;
        margin-bottom: 12px;
      }

      .byd-message-user {
        justify-content: flex-end;
      }

      .byd-message-assistant {
        justify-content: flex-start;
      }

      .byd-bubble {
        max-width: 75%;
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 15px;
        line-height: 1.4;
        word-wrap: break-word;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .byd-message-user .byd-bubble {
        background: #d32f2f;
        color: white;
        border-bottom-right-radius: 4px;
      }

      .byd-message-assistant .byd-bubble {
        background: white;
        color: #333;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      /* Bottom Controls */
      .byd-bottom-controls {
        flex-shrink: 0;
        background: white;
        padding: 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      /* VAD Indicator */
      .byd-vad-indicator {
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .byd-vad-indicator.active {
        display: flex;
      }

      .byd-vad-wave {
        display: flex;
        gap: 4px;
        height: 30px;
        align-items: center;
      }

      .byd-vad-wave span {
        width: 3px;
        height: 12px;
        background: #d32f2f;
        border-radius: 2px;
        animation: wave 1.2s ease-in-out infinite;
      }

      .byd-vad-wave span:nth-child(1) { animation-delay: 0s; }
      .byd-vad-wave span:nth-child(2) { animation-delay: 0.1s; }
      .byd-vad-wave span:nth-child(3) { animation-delay: 0.2s; }
      .byd-vad-wave span:nth-child(4) { animation-delay: 0.3s; }
      .byd-vad-wave span:nth-child(5) { animation-delay: 0.4s; }

      @keyframes wave {
        0%, 100% { height: 12px; }
        50% { height: 30px; }
      }

      .byd-vad-text {
        margin: 0;
        font-size: 14px;
        color: #666;
      }

      /* Mic Button */
      .byd-mic-button {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #d32f2f;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
      }

      .byd-mic-button:hover {
        background: #c62828;
        transform: scale(1.05);
      }

      .byd-mic-button:active {
        transform: scale(0.95);
      }

      .byd-mic-button.active {
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
        }
        50% {
          box-shadow: 0 4px 24px rgba(211, 47, 47, 0.6), 0 0 0 8px rgba(211, 47, 47, 0.2);
        }
      }

      .byd-mic-button svg {
        width: 28px;
        height: 28px;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .byd-modal-container {
          max-width: 100%;
        }

        .byd-conversation-area {
          padding: 16px;
        }

        .byd-bubble {
          max-width: 85%;
          font-size: 14px;
        }

        .byd-welcome-message {
          padding: 40px 20px;
        }

        .byd-avatar-large {
          font-size: 48px;
        }

        .byd-welcome-message h2 {
          font-size: 20px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  destroy() {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
  }
}

if (typeof window !== 'undefined') {
  window.ModalControllerV2 = ModalControllerV2;
}
