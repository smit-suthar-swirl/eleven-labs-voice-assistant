/**
 * UI Controller
 * Manages the widget UI and visual states
 */

class UIController {
  constructor(config) {
    this.config = config;
    this.container = null;
    this.button = null;
    this.eventListeners = {};
    this.isOpen = false;
    this.currentState = 'idle';

    this.createWidget();
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

  createWidget() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'byd-voice-assistant';
    this.container.className = 'byd-va-container';
    this.setPosition();

    // Create button
    this.button = document.createElement('button');
    this.button.className = 'byd-va-button';
    this.button.innerHTML = this.getIconForState('idle');
    this.button.onclick = () => this.toggleWidget();

    // Create styles
    this.injectStyles();

    // Add to DOM
    this.container.appendChild(this.button);
    document.body.appendChild(this.container);
  }

  setPosition() {
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };

    const pos = positions[this.config.position] || positions['bottom-right'];
    Object.assign(this.container.style, pos);
  }

  toggleWidget() {
    if (this.isOpen) {
      this.emit('deactivate');
      this.isOpen = false;
    } else {
      this.emit('activate');
      this.isOpen = true;
    }
  }

  setState(state) {
    this.currentState = state;
    this.button.innerHTML = this.getIconForState(state);
    this.button.className = `byd-va-button byd-va-${state}`;
  }

  getIconForState(state) {
    const icons = {
      idle: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      `,
      listening: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" opacity="0.3"/>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
          <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"/>
        </svg>
      `,
      processing: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      `,
      speaking: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      `
    };

    return icons[state] || icons.idle;
  }

  showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'byd-va-error';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  injectStyles() {
    const styleId = 'byd-va-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .byd-va-container {
        position: fixed;
        z-index: 999999;
      }

      .byd-va-button {
        width: ${this.config.buttonSize}px;
        height: ${this.config.buttonSize}px;
        border-radius: 50%;
        background: ${this.config.primaryColor};
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
      }

      .byd-va-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }

      .byd-va-button:active {
        transform: scale(0.95);
      }

      .byd-va-button.byd-va-listening {
        animation: pulse 1.5s infinite;
      }

      .byd-va-button.byd-va-processing {
        animation: spin 1s linear infinite;
      }

      .byd-va-button.byd-va-speaking {
        animation: pulse 1s infinite;
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .byd-va-error {
        position: absolute;
        bottom: ${this.config.buttonSize + 10}px;
        right: 0;
        background: #f44336;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 250px;
        font-size: 14px;
        line-height: 1.4;
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

      @media (max-width: 768px) {
        .byd-va-button {
          width: 50px;
          height: 50px;
        }

        .byd-va-error {
          max-width: 200px;
          font-size: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.UIController = UIController;
}
