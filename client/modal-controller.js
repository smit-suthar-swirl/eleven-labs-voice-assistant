/**
 * Modal Controller - Full-screen voice assistant interface
 */

class ModalController {
  constructor(config) {
    this.config = config;
    this.container = null;
    this.modal = null;
    this.isOpen = false;
    this.eventListeners = {};
    this.transcript = [];
    this.currentState = 'idle';
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
    // Create modal overlay
    this.modal = document.createElement('div');
    this.modal.id = 'byd-voice-modal';
    this.modal.className = 'byd-modal hidden';

    this.modal.innerHTML = `
      <div class="byd-modal-content">
        <div class="byd-modal-header">
          <h2>BYD Shark 6 Voice Assistant</h2>
          <button class="byd-modal-close" aria-label="Close">×</button>
        </div>

        <div class="byd-modal-body">
          <div class="byd-avatar-container">
            <div class="byd-avatar">
              <svg class="byd-avatar-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="byd-waveform">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>

          <div class="byd-status-text">Click to start speaking</div>

          <div class="byd-transcript-container">
            <div class="byd-transcript" id="byd-transcript"></div>
          </div>

          <div class="byd-controls">
            <button class="byd-control-btn byd-mic-btn" aria-label="Microphone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button class="byd-control-btn byd-clear-btn" aria-label="Clear transcript">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>

          <div class="byd-suggestions">
            <div class="byd-suggestion-title">Try asking:</div>
            <div class="byd-suggestion-pills">
              <button class="byd-suggestion-pill" data-question="What is the BYD Shark 6?">What is the BYD Shark 6?</button>
              <button class="byd-suggestion-pill" data-question="How much does it cost?">How much does it cost?</button>
              <button class="byd-suggestion-pill" data-question="Compare it to Toyota Hilux">Compare to Hilux</button>
              <button class="byd-suggestion-pill" data-question="What's the towing capacity?">Towing capacity</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.injectStyles();
    this.attachEvents();
  }

  attachEvents() {
    // Close button
    const closeBtn = this.modal.querySelector('.byd-modal-close');
    closeBtn.onclick = () => this.close();

    // Mic button
    const micBtn = this.modal.querySelector('.byd-mic-btn');
    micBtn.onclick = () => this.toggleMicrophone();

    // Clear button
    const clearBtn = this.modal.querySelector('.byd-clear-btn');
    clearBtn.onclick = () => this.clearTranscript();

    // Suggestion pills
    const pills = this.modal.querySelectorAll('.byd-suggestion-pill');
    pills.forEach(pill => {
      pill.onclick = () => {
        const question = pill.dataset.question;
        this.addToTranscript('user', question);
        this.emit('suggestion', question);
      };
    });

    // Click outside to close
    this.modal.onclick = (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    };

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggleMicrophone() {
    if (this.currentState === 'idle') {
      this.emit('activate');
    } else {
      this.emit('deactivate');
    }
  }

  open() {
    this.modal.classList.remove('hidden');
    this.isOpen = true;
    setTimeout(() => this.modal.classList.add('active'), 10);
  }

  close() {
    this.modal.classList.remove('active');
    setTimeout(() => {
      this.modal.classList.add('hidden');
      this.isOpen = false;
      this.emit('deactivate');
    }, 300);
  }

  setState(state) {
    this.currentState = state;
    const avatar = this.modal.querySelector('.byd-avatar');
    const waveform = this.modal.querySelector('.byd-waveform');
    const statusText = this.modal.querySelector('.byd-status-text');
    const micBtn = this.modal.querySelector('.byd-mic-btn');

    // Remove all state classes
    avatar.className = 'byd-avatar';
    waveform.className = 'byd-waveform';
    micBtn.className = 'byd-control-btn byd-mic-btn';

    switch (state) {
      case 'listening':
        avatar.classList.add('listening');
        waveform.classList.add('active');
        statusText.textContent = 'Listening...';
        micBtn.classList.add('active');
        break;
      case 'processing':
        avatar.classList.add('processing');
        statusText.textContent = 'Processing...';
        break;
      case 'speaking':
        avatar.classList.add('speaking');
        waveform.classList.add('active', 'speaking');
        statusText.textContent = 'Speaking...';
        break;
      default:
        statusText.textContent = 'Click microphone to start';
    }
  }

  addToTranscript(role, text) {
    const transcriptEl = document.getElementById('byd-transcript');
    const messageEl = document.createElement('div');
    messageEl.className = `byd-message byd-message-${role}`;

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'byd-message-bubble';
    bubbleEl.textContent = text;

    messageEl.appendChild(bubbleEl);
    transcriptEl.appendChild(messageEl);

    // Auto scroll to bottom
    transcriptEl.scrollTop = transcriptEl.scrollHeight;

    this.transcript.push({ role, text, timestamp: Date.now() });
  }

  clearTranscript() {
    const transcriptEl = document.getElementById('byd-transcript');
    transcriptEl.innerHTML = '';
    this.transcript = [];
  }

  showError(message) {
    const statusText = this.modal.querySelector('.byd-status-text');
    statusText.textContent = message;
    statusText.style.color = '#f44336';
    setTimeout(() => {
      statusText.style.color = '';
      this.setState(this.currentState);
    }, 3000);
  }

  injectStyles() {
    const styleId = 'byd-modal-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .byd-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .byd-modal.hidden {
        display: none;
      }

      .byd-modal.active {
        opacity: 1;
      }

      .byd-modal-content {
        background: white;
        border-radius: 24px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .byd-modal.active .byd-modal-content {
        transform: scale(1);
      }

      .byd-modal-header {
        background: linear-gradient(135deg, ${this.config.primaryColor} 0%, #c62828 100%);
        color: white;
        padding: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .byd-modal-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }

      .byd-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 32px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }

      .byd-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .byd-modal-body {
        padding: 32px 24px;
        text-align: center;
      }

      .byd-avatar-container {
        position: relative;
        margin-bottom: 24px;
      }

      .byd-avatar {
        width: 120px;
        height: 120px;
        margin: 0 auto;
        border-radius: 50%;
        background: linear-gradient(135deg, ${this.config.primaryColor} 0%, #c62828 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(211, 47, 47, 0.3);
      }

      .byd-avatar.listening {
        animation: avatarPulse 1.5s infinite;
        box-shadow: 0 4px 30px rgba(211, 47, 47, 0.6);
      }

      .byd-avatar.processing {
        animation: avatarSpin 1s linear infinite;
      }

      .byd-avatar.speaking {
        animation: avatarPulse 0.8s infinite;
      }

      @keyframes avatarPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      @keyframes avatarSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .byd-avatar-icon {
        width: 60px;
        height: 60px;
        color: white;
      }

      .byd-waveform {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .byd-waveform.active {
        opacity: 1;
      }

      .byd-waveform span {
        width: 4px;
        height: 20px;
        background: ${this.config.primaryColor};
        border-radius: 2px;
        animation: waveform 1s ease-in-out infinite;
      }

      .byd-waveform span:nth-child(1) { animation-delay: 0s; }
      .byd-waveform span:nth-child(2) { animation-delay: 0.1s; }
      .byd-waveform span:nth-child(3) { animation-delay: 0.2s; }
      .byd-waveform span:nth-child(4) { animation-delay: 0.3s; }
      .byd-waveform span:nth-child(5) { animation-delay: 0.4s; }

      @keyframes waveform {
        0%, 100% { height: 20px; }
        50% { height: 40px; }
      }

      .byd-status-text {
        font-size: 18px;
        color: #666;
        margin-bottom: 24px;
        min-height: 27px;
      }

      .byd-transcript-container {
        background: #f5f5f5;
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 24px;
        max-height: 300px;
        overflow-y: auto;
      }

      .byd-transcript {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .byd-message {
        display: flex;
      }

      .byd-message-user {
        justify-content: flex-end;
      }

      .byd-message-assistant {
        justify-content: flex-start;
      }

      .byd-message-bubble {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
      }

      .byd-message-user .byd-message-bubble {
        background: ${this.config.primaryColor};
        color: white;
        border-bottom-right-radius: 4px;
      }

      .byd-message-assistant .byd-message-bubble {
        background: white;
        color: #333;
        border-bottom-left-radius: 4px;
      }

      .byd-controls {
        display: flex;
        gap: 16px;
        justify-content: center;
        margin-bottom: 24px;
      }

      .byd-control-btn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: #f5f5f5;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .byd-control-btn:hover {
        background: #e0e0e0;
        transform: scale(1.05);
      }

      .byd-control-btn svg {
        width: 24px;
        height: 24px;
        color: #666;
      }

      .byd-mic-btn {
        width: 72px;
        height: 72px;
        background: ${this.config.primaryColor};
      }

      .byd-mic-btn svg {
        width: 32px;
        height: 32px;
        color: white;
      }

      .byd-mic-btn:hover {
        background: #c62828;
      }

      .byd-mic-btn.active {
        animation: micPulse 1.5s infinite;
      }

      @keyframes micPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
        50% { box-shadow: 0 0 0 10px rgba(211, 47, 47, 0); }
      }

      .byd-suggestions {
        margin-top: 16px;
      }

      .byd-suggestion-title {
        font-size: 14px;
        color: #999;
        margin-bottom: 12px;
      }

      .byd-suggestion-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }

      .byd-suggestion-pill {
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid #e0e0e0;
        background: white;
        color: #666;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .byd-suggestion-pill:hover {
        border-color: ${this.config.primaryColor};
        color: ${this.config.primaryColor};
        background: rgba(211, 47, 47, 0.05);
      }

      @media (max-width: 768px) {
        .byd-modal-content {
          width: 95%;
          max-height: 95vh;
        }

        .byd-modal-body {
          padding: 24px 16px;
        }

        .byd-avatar {
          width: 100px;
          height: 100px;
        }

        .byd-avatar-icon {
          width: 50px;
          height: 50px;
        }

        .byd-transcript-container {
          max-height: 200px;
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
  window.ModalController = ModalController;
}
