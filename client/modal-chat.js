/**
 * Chat Modal - WhatsApp-like Interface
 */

class ModalChat {
  constructor(config) {
    this.config = config;
    this.modal = null;
    this.isOpen = false;
    this.eventListeners = {};
    this.currentState = 'idle';
    this.isListening = false;
    this.messages = [];
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
    this.modal.id = 'byd-chat-modal';
    this.modal.className = 'byd-chat-modal';

    this.modal.innerHTML = `
      <div class="byd-chat-overlay"></div>
      <div class="byd-chat-container">
        <!-- Header -->
        <div class="byd-chat-header">
          <div class="byd-chat-title">
            <span class="byd-chat-icon">🚗</span>
            <div class="byd-chat-info">
              <h3>BYD Shark 6</h3>
              <span class="byd-chat-status" id="chat-status">Online</span>
            </div>
          </div>
          <button class="byd-chat-close" aria-label="Close">×</button>
        </div>

        <!-- Messages Area -->
        <div class="byd-chat-messages" id="chat-messages">
          <div class="byd-chat-welcome">
            <div class="byd-chat-avatar">🎤</div>
            <p>Hi! Ask me anything about the BYD Shark 6</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="byd-chat-input">
          <div class="byd-chat-wave" id="wave-indicator">
            <span></span><span></span><span></span>
          </div>
          <button class="byd-chat-mic" id="mic-btn" aria-label="Microphone">
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
    const closeBtn = this.modal.querySelector('.byd-chat-close');
    closeBtn.onclick = () => this.close();

    const micBtn = document.getElementById('mic-btn');
    micBtn.onclick = () => this.toggleMicrophone();

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
    document.getElementById('mic-btn').classList.add('active');
    document.getElementById('wave-indicator').classList.add('active');
    this.updateStatus('🎤 Listening...');
    this.emit('activate');
  }

  stopListening() {
    this.isListening = false;
    document.getElementById('mic-btn').classList.remove('active');
    document.getElementById('wave-indicator').classList.remove('active');
    this.updateStatus('Online');
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

    switch (state) {
      case 'listening':
        this.updateStatus('🎤 Listening...');
        break;
      case 'processing':
        this.updateStatus('💭 Thinking...');
        break;
      case 'speaking':
        this.updateStatus('🔊 Speaking...');
        break;
      default:
        this.updateStatus('Online');
    }
  }

  updateStatus(text) {
    const statusEl = document.getElementById('chat-status');
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  addMessage(text, role) {
    // Remove welcome if first message
    const welcome = this.modal.querySelector('.byd-chat-welcome');
    if (welcome) {
      welcome.remove();
    }

    const messagesContainer = document.getElementById('chat-messages');

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `byd-chat-message byd-chat-message-${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'byd-chat-bubble';
    bubble.textContent = text;

    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);

    // Smooth scroll to bottom
    setTimeout(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 50);

    this.messages.push({ role, text, timestamp: Date.now() });
  }

  showError(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'byd-chat-error';
    errorDiv.innerHTML = `<span>⚠️ ${message}</span>`;
    messagesContainer.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  injectStyles() {
    const styleId = 'byd-chat-modal-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .byd-chat-modal {
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

      .byd-chat-modal.active {
        opacity: 1;
      }

      .byd-chat-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
      }

      .byd-chat-container {
        position: relative;
        width: 100%;
        max-width: 500px;
        height: 100vh;
        margin: 0 auto;
        background: #e5ddd5;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.3);
      }

      /* Header */
      .byd-chat-header {
        background: #075e54;
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .byd-chat-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .byd-chat-icon {
        font-size: 28px;
      }

      .byd-chat-info h3 {
        margin: 0;
        font-size: 17px;
        font-weight: 500;
      }

      .byd-chat-status {
        font-size: 13px;
        opacity: 0.8;
        display: block;
        margin-top: 2px;
      }

      .byd-chat-close {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .byd-chat-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Messages Area */
      .byd-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px 16px;
        background: #e5ddd5;
        background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      }

      .byd-chat-messages::-webkit-scrollbar {
        width: 6px;
      }

      .byd-chat-messages::-webkit-scrollbar-thumb {
        background: #aaa;
        border-radius: 3px;
      }

      .byd-chat-welcome {
        text-align: center;
        padding: 40px 20px;
        color: #666;
      }

      .byd-chat-avatar {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .byd-chat-welcome p {
        margin: 0;
        font-size: 15px;
        line-height: 1.5;
      }

      /* Message Bubbles */
      .byd-chat-message {
        display: flex;
        margin-bottom: 8px;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .byd-chat-message-user {
        justify-content: flex-end;
      }

      .byd-chat-message-assistant {
        justify-content: flex-start;
      }

      .byd-chat-bubble {
        max-width: 75%;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        position: relative;
      }

      .byd-chat-message-user .byd-chat-bubble {
        background: #dcf8c6;
        color: #000;
        border-radius: 8px 8px 0 8px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .byd-chat-message-assistant .byd-chat-bubble {
        background: white;
        color: #000;
        border-radius: 8px 8px 8px 0;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .byd-chat-error {
        text-align: center;
        padding: 12px;
        margin: 8px 0;
        background: rgba(244, 67, 54, 0.1);
        border-radius: 8px;
        color: #f44336;
        font-size: 13px;
      }

      /* Input Area */
      .byd-chat-input {
        flex-shrink: 0;
        background: #f0f0f0;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .byd-chat-wave {
        display: none;
        gap: 3px;
        align-items: center;
      }

      .byd-chat-wave.active {
        display: flex;
      }

      .byd-chat-wave span {
        width: 3px;
        height: 10px;
        background: #075e54;
        border-radius: 2px;
        animation: wave 1s ease-in-out infinite;
      }

      .byd-chat-wave span:nth-child(1) { animation-delay: 0s; }
      .byd-chat-wave span:nth-child(2) { animation-delay: 0.15s; }
      .byd-chat-wave span:nth-child(3) { animation-delay: 0.3s; }

      @keyframes wave {
        0%, 100% { height: 10px; }
        50% { height: 20px; }
      }

      .byd-chat-mic {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #075e54;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(7, 94, 84, 0.3);
      }

      .byd-chat-mic:hover {
        background: #064a42;
        transform: scale(1.05);
      }

      .byd-chat-mic:active {
        transform: scale(0.95);
      }

      .byd-chat-mic.active {
        animation: micPulse 1.5s infinite;
      }

      @keyframes micPulse {
        0%, 100% {
          box-shadow: 0 2px 8px rgba(7, 94, 84, 0.3);
        }
        50% {
          box-shadow: 0 2px 16px rgba(7, 94, 84, 0.6), 0 0 0 8px rgba(7, 94, 84, 0.2);
        }
      }

      .byd-chat-mic svg {
        width: 24px;
        height: 24px;
      }

      /* Mobile */
      @media (max-width: 768px) {
        .byd-chat-container {
          max-width: 100%;
        }

        .byd-chat-messages {
          padding: 16px 12px;
        }

        .byd-chat-bubble {
          font-size: 13px;
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
  window.ModalChat = ModalChat;
}
