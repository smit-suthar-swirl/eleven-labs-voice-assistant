/**
 * BYD Voice Assistant Widget
 * Embeddable voice assistant for BYD Shark 6 sales
 */

(function () {
  "use strict";

  class BYDVoiceAssistant {
    constructor() {
      this.config = {
        serverUrl: window.location.origin,
        primaryColor: "#d32f2f",
        position: "bottom-right",
        buttonSize: 60,
        autoOpen: false,
        mode: "button",
      };

      this.isInitialized = false;
      this.isActive = false;
      this.state = "idle";

      this.uiController = null;
      this.modalController = null;
      this.webrtcClient = null;
      this.audioProcessor = null;
      this.vadHandler = null;
    }

    init(options = {}) {
      // Merge user config
      this.config = { ...this.config, ...options };

      if (this.isInitialized) {
        console.warn("BYD Voice Assistant already initialized");
        return;
      }

      // Load dependencies dynamically
      this.loadDependencies()
        .then(() => {
          this.initializeComponents();
          this.isInitialized = true;
          console.log("✅ BYD Voice Assistant initialized");
        })
        .catch((error) => {
          console.error("Failed to initialize BYD Voice Assistant:", error);
        });
    }

    async loadDependencies() {
      // Load required scripts
      const scripts = [
        "/client/ui-controller.js",
        "/client/modal-controller.js",
        "/client/webrtc-client.js",
        "/client/audio-processor.js",
        "/client/vad-handler.js",
      ];

      for (const script of scripts) {
        await this.loadScript(script);
      }

      // Load VAD library from CDN
      await this.loadScript(
        "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.7/dist/bundle.min.js"
      );
    }

    loadScript(src) {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    initializeComponents() {
      // Initialize UI Controller (button mode)
      if (this.config.mode === "button") {
        this.uiController = new UIController(this.config);
        this.uiController.on("activate", () => this.activate());
        this.uiController.on("deactivate", () => this.deactivate());
      } else {
        // Initialize Modal Controller
        this.modalController = new ModalController(this.config);
        this.modalController.createModal();
        this.modalController.on("activate", () => this.activate());
        this.modalController.on("deactivate", () => this.deactivate());
        this.modalController.on("suggestion", (question) =>
          this.processSuggestion(question)
        );
      }

      // Initialize Audio Processor
      this.audioProcessor = new AudioProcessor();

      // Initialize WebRTC Client
      this.webrtcClient = new WebRTCClient(this.config.serverUrl);
      this.webrtcClient.on("audioChunk", (chunk) =>
        this.handleIncomingAudio(chunk)
      );
      this.webrtcClient.on("stateChange", (state) => this.setState(state));
      this.webrtcClient.on("transcript", (data) => this.handleTranscript(data));
      this.webrtcClient.on("error", (message) => this.handleError(message));

      // Initialize VAD Handler
      this.vadHandler = new VADHandler();
      this.vadHandler.on("speechStart", () => this.handleSpeechStart());
      this.vadHandler.on("speechEnd", () => this.handleSpeechEnd());

      // Auto-open if configured
      if (this.config.autoOpen) {
        setTimeout(() => this.activate(), 500);
      }
    }

    async activate() {
      console.log('🚀 activate() called, isActive:', this.isActive);
      if (this.isActive) {
        console.warn('⚠️ Already active, returning early');
        return;
      }

      try {
        console.log('🎤 Requesting microphone permission...');
        // Request microphone permission
        await this.audioProcessor.requestMicrophonePermission();
        console.log('✅ Microphone permission granted');

        console.log('🔌 Connecting to server...');
        // Connect to server
        await this.webrtcClient.connect();
        console.log('✅ Connected to server');

        // Start audio capture (now async with AudioWorklet)
        console.log('🎤 Starting audio capture...');
        await this.audioProcessor.startCapture((audioChunk) => {
          console.log('🎤 Audio chunk callback fired, sending to WebRTC');
          this.webrtcClient.sendAudioChunk(audioChunk);
        });
        console.log('✅ Audio capture started successfully');

        // Start VAD
        this.vadHandler.start(this.audioProcessor.getAudioStream());

        this.isActive = true;
        this.setState("listening");

        console.log("🎤 Voice assistant activated");
      } catch (error) {
        console.error("Failed to activate voice assistant:", error);
        console.error("Error details:", error.message, error.stack);

        // Show more specific error message
        let errorMessage = "Failed to activate microphone. ";
        if (error.message && error.message.includes("AudioWorklet")) {
          errorMessage = "AudioProcessor Error: " + error.message;
        } else if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "Microphone access denied. Please allow blocking in address bar.";
        } else if (
          error.name === "NotFoundError" ||
          error.name === "DevicesNotFoundError"
        ) {
          errorMessage = "No microphone found.";
        } else if (
          error.name === "NotReadableError" ||
          error.name === "TrackStartError"
        ) {
          errorMessage = "Microphone is busy or not readable.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage = "Microphone does not satisfy requirements.";
        } else if (error.message && error.message.includes("timeout")) {
          errorMessage = "Connection timeout. Check server.";
        } else {
          errorMessage = `Error: ${error.name}: ${error.message}`;
        }

        this.uiController.showError(errorMessage);
        this.deactivate();
      }
    }

    async deactivate() {
      if (!this.isActive) return;

      // Stop everything
      this.vadHandler.stop();
      this.audioProcessor.stopCapture();
      this.audioProcessor.stopPlayback();
      this.webrtcClient.disconnect();

      this.isActive = false;
      this.setState("idle");

      console.log("🛑 Voice assistant deactivated");
    }

    handleIncomingAudio(audioChunk) {
      this.audioProcessor.playAudio(audioChunk);
    }

    handleTranscript(data) {
      // Update transcript in modal
      if (this.modalController) {
        this.modalController.addToTranscript(data.role, data.text);
      }
    }

    handleError(message) {
      if (this.modalController) {
        this.modalController.showError(message);
      }
      if (this.uiController) {
        this.uiController.showError(message);
      }
    }

    handleSpeechStart() {
      if (this.state === "speaking") {
        console.log("⚠️ User interruption detected");
        this.audioProcessor.stopPlayback();
        this.webrtcClient.sendInterruption();
        this.setState("listening");
      }
    }

    handleSpeechEnd() {
      // Speech ended
    }

    async processSuggestion(question) {
      // Simulate speaking the question (for modal mode)
      if (!this.isActive) {
        await this.activate();
      }

      // Show user message in transcript
      if (this.modalController) {
        this.modalController.addToTranscript("user", question);
      }

      // You would send this to the server for processing
      console.log("Processing suggestion:", question);
    }

    setState(newState) {
      this.state = newState;
      if (this.uiController) {
        this.uiController.setState(newState);
      }
      if (this.modalController) {
        this.modalController.setState(newState);
      }
      console.log(`📊 State: ${newState}`);
    }

    // Public API
    open() {
      console.log('📂 open() called');
      if (this.modalController) {
        this.modalController.open();
      }
      console.log('🚀 Calling activate() from open()');
      this.activate();
    }

    close() {
      if (this.modalController) {
        this.modalController.close();
      }
      this.deactivate();
    }

    isOpen() {
      return this.isActive;
    }

    openModal() {
      if (this.modalController) {
        this.modalController.open();
      }
    }

    destroy() {
      this.deactivate();
      if (this.uiController) {
        this.uiController.destroy();
      }
      if (this.modalController) {
        this.modalController.destroy();
      }
      this.isInitialized = false;
    }
  }

  // Create global instance
  window.BYDVoiceAssistant = new BYDVoiceAssistant();
})();
