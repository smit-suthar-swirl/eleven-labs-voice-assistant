/**
 * Simple Modal - Single Bubble Conversation
 */

class ModalSimple {
  constructor(config) {
    this.config = config;
    this.modal = null;
    this.isOpen = false;
    this.eventListeners = {};
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
    this.modal.id = 'byd-modal-simple';
    this.modal.className = 'byd-modal-simple';

    this.modal.innerHTML = `
      <div class="byd-modal-overlay"></div>
      <div class="byd-modal-container">
        <!-- Header -->
        <div class="byd-modal-header">
          <div class="byd-title">
            <span class="byd-icon">🚗</span>
            <span>BYD Shark 6 Assistant</span>
          </div>
          <button class="byd-close" aria-label="Close">×</button>
        </div>

        <!-- Single Conversation Bubble -->
        <div class="byd-conversation">
          <div class="byd-bubble">
            <div class="byd-bubble-content" id="bubble-content">
              <p class="byd-welcome">Click the microphone and ask me anything about the BYD Shark 6</p>
            </div>
          </div>
        </div>

        <!-- Status Bar -->
        <div class="byd-status" id="status-bar">
          <div class="byd-status-indicator">
            <div class="byd-wave" id="wave-indicator">
              <span></span><span></span><span></span>
            </div>
            <span id="status-text">Ready</span>
          </div>
        </div>

        <!-- Mic Button -->
        <div class="byd-controls">
          <button class="byd-mic" id="mic-btn" aria-label="Microphone">
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
    const closeBtn = this.modal.querySelector('.byd-close');
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
    this.updateStatus('listening', '🎤 Listening...');
    this.emit('activate');
  }

  stopListening() {
    this.isListening = false;
    document.getElementById('mic-btn').classList.remove('active');
    document.getElementById('wave-indicator').classList.remove('active');
    this.updateStatus('idle', 'Ready');
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
        this.updateStatus('listening', '🎤 Listening...');
        break;
      case 'processing':
        this.updateStatus('processing', '💭 Thinking...');
        break;
      case 'speaking':
        this.updateStatus('speaking', '🔊 Speaking...');
        break;
      default:
        this.updateStatus('idle', 'Ready');
    }
  }

  updateStatus(state, text) {
    const statusText = document.getElementById('status-text');
    const statusBar = document.getElementById('status-bar');
    const waveIndicator = document.getElementById('wave-indicator');

    statusText.textContent = text;
    statusBar.className = 'byd-status ' + state;

    if (state === 'listening') {
      waveIndicator.classList.add('active');
    } else {
      waveIndicator.classList.remove('active');
    }
  }

  updateBubble(text, type = 'assistant') {
    const bubbleContent = document.getElementById('bubble-content');

    // Clear welcome message on first use
    const welcome = bubbleContent.querySelector('.byd-welcome');
    if (welcome) {
      welcome.remove();
    }

    // Create or update text element
    let textEl = bubbleContent.querySelector('.byd-text');
    if (!textEl) {
      textEl = document.createElement('p');
      textEl.className = 'byd-text';
      bubbleContent.appendChild(textEl);
    }

    // Update with typing effect for long text
    if (text.length > 50) {
      this.typeText(textEl, text);
    } else {
      textEl.textContent = text;
    }

    // Add subtle highlight when updating
    bubbleContent.style.animation = 'none';
    setTimeout(() => {
      bubbleContent.style.animation = 'highlight 0.5s ease';
    }, 10);
  }

  typeText(element, text, speed = 20) {
    let index = 0;
    element.textContent = '';

    const type = () => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    };

    type();
  }

  showError(message) {
    const bubbleContent = document.getElementById('bubble-content');
    bubbleContent.innerHTML = `<p class="byd-error">⚠️ ${message}</p>`;

    setTimeout(() => {
      bubbleContent.innerHTML = '<p class="byd-welcome">Click the microphone and ask me anything about the BYD Shark 6</p>';
    }, 3000);
  }

  injectStyles() {
    const styleId = 'byd-modal-simple-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .byd-modal-simple {
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

      .byd-modal-simple.active {
        opacity: 1;
      }

      .byd-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
      }

      .byd-modal-container {
        position: relative;
        width: 100%;
        max-width: 500px;
        height: 100vh;
        margin: 0 auto;
        background: #fff;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.3);
      }

      /* Header */
      .byd-modal-header {
        background: linear-gradient(135deg, #d32f2f, #c62828);
        color: white;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .byd-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 600;
      }

      .byd-icon {
        font-size: 24px;
      }

      .byd-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .byd-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Conversation - Single Bubble */
      .byd-conversation {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 24px;
        background: linear-gradient(135deg, #f5f5f5, #e8e8e8);
      }

      .byd-bubble {
        width: 100%;
        max-width: 400px;
        background: white;
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .byd-bubble-content {
        width: 100%;
        text-align: center;
      }

      .byd-welcome {
        font-size: 18px;
        color: #666;
        line-height: 1.6;
        margin: 0;
      }

      .byd-text {
        font-size: 17px;
        color: #333;
        line-height: 1.6;
        margin: 0;
        white-space: pre-wrap;
      }

      .byd-error {
        font-size: 16px;
        color: #f44336;
        margin: 0;
      }

      @keyframes highlight {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }

      /* Status Bar */
      .byd-status {
        flex-shrink: 0;
        background: white;
        padding: 16px 24px;
        border-top: 1px solid #e0e0e0;
      }

      .byd-status-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }

      .byd-wave {
        display: none;
        gap: 3px;
        height: 20px;
        align-items: center;
      }

      .byd-wave.active {
        display: flex;
      }

      .byd-wave span {
        width: 3px;
        height: 10px;
        background: #d32f2f;
        border-radius: 2px;
        animation: wave 1s ease-in-out infinite;
      }

      .byd-wave span:nth-child(1) { animation-delay: 0s; }
      .byd-wave span:nth-child(2) { animation-delay: 0.15s; }
      .byd-wave span:nth-child(3) { animation-delay: 0.3s; }

      @keyframes wave {
        0%, 100% { height: 10px; }
        50% { height: 20px; }
      }

      #status-text {
        font-size: 15px;
        color: #666;
        font-weight: 500;
      }

      .byd-status.listening #status-text {
        color: #d32f2f;
      }

      /* Controls */
      .byd-controls {
        flex-shrink: 0;
        padding: 24px;
        background: white;
        display: flex;
        justify-content: center;
      }

      .byd-mic {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: #d32f2f;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(211, 47, 47, 0.3);
      }

      .byd-mic:hover {
        background: #c62828;
        transform: scale(1.05);
      }

      .byd-mic:active {
        transform: scale(0.95);
      }

      .byd-mic.active {
        animation: micPulse 1.5s infinite;
      }

      @keyframes micPulse {
        0%, 100% {
          box-shadow: 0 4px 16px rgba(211, 47, 47, 0.3);
        }
        50% {
          box-shadow: 0 4px 24px rgba(211, 47, 47, 0.6), 0 0 0 10px rgba(211, 47, 47, 0.2);
        }
      }

      .byd-mic svg {
        width: 32px;
        height: 32px;
      }

      /* Mobile */
      @media (max-width: 768px) {
        .byd-modal-container {
          max-width: 100%;
        }

        .byd-conversation {
          padding: 24px 16px;
        }

        .byd-bubble {
          padding: 24px;
          min-height: 160px;
        }

        .byd-welcome, .byd-text {
          font-size: 16px;
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
  window.ModalSimple = ModalSimple;
}
