class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentSessionId = null;
        this.connectionCallbacks = [];
        this.eventListeners = {};
    }

    // Initialize Socket.io connection
    initialize() {
        try {
            debugLog('🔌 SOCKET: Starting initialization...');
            debugLog('🔌 SOCKET: Environment check:', {
                ioAvailable: typeof io !== 'undefined',
                location: window.location.href,
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                port: window.location.port,
                isSecureContext: window.isSecureContext,
                userAgent: navigator.userAgent
            });
            
            // Check for HTTPS/WSS requirements
            if (window.location.protocol === 'https:') {
                console.warn('🔐 SOCKET: Page loaded over HTTPS - WebSocket connection might require WSS');
                console.warn('🔐 SOCKET: Consider using HTTPS server with valid certificates');
            }
            
            // Load Socket.io client library dynamically if not already loaded
            if (typeof io === 'undefined') {
                console.error('🔌 SOCKET ERROR: Socket.io client library not loaded - check that /socket.io/socket.io.js is accessible');
                return false;
            }

            debugLog('🔌 SOCKET: Initializing Socket.io connection...');
            
            // Configure Socket.io with explicit server URL and options
            // Local dev: connect directly to port 6161
            // Production: connect to origin (nginx proxies 443 → internal 6161)
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const serverUrl = isLocalDev
                ? `${window.location.protocol}//${window.location.hostname}:6161`
                : window.location.origin;
            debugLog('🔌 SOCKET: Connecting to server at:', serverUrl, '(localDev:', isLocalDev, ')');
            
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
                upgrade: true,
                forceNew: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 5000
            });
            
            debugLog('🔌 SOCKET: Socket.io instance created:', {
                connected: this.socket.connected,
                id: this.socket.id,
                transport: this.socket.io?.engine?.transport?.name || 'unknown'
            });
            
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error('🔌 SOCKET ERROR: Failed to initialize socket connection:', error);
            return false;
        }
    }

    // Setup basic Socket.io event listeners
    setupEventListeners() {
        debugLog('🔌 SOCKET: Setting up event listeners...');
        
        this.socket.on('connect', () => {
            debugLog('🔌 SOCKET: ✅ Connected to server successfully!', {
                socketId: this.socket.id,
                transport: this.socket.io.engine.transport.name,
                connected: this.socket.connected
            });
            this.isConnected = true;
            this.triggerConnectionCallbacks(true);
            
            // Test ping to verify connection
            setTimeout(() => {
                debugLog('🔌 SOCKET: Sending test ping...');
                this.socket.emit('ping');
            }, 1000);
        });

        this.socket.on('disconnect', (reason) => {
            debugLog('🔌 SOCKET: ❌ Disconnected from server:', reason);
            this.isConnected = false;
            this.triggerConnectionCallbacks(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 SOCKET: ❌ Connection error:', {
                error: error.message,
                type: error.type,
                description: error.description,
                context: error.context,
                transport: this.socket.io.engine?.transport?.name || 'unknown',
                protocol: window.location.protocol,
                isHTTPS: window.location.protocol === 'https:'
            });
            
            if (window.location.protocol === 'https:') {
                console.error('🔐 SECURITY: HTTPS page trying to connect to HTTP WebSocket - this may be blocked by browser security policy');
                console.error('🔐 SOLUTION: Either serve the page over HTTP or set up HTTPS server with SSL certificates');
            }
            
            this.isConnected = false;
            this.triggerConnectionCallbacks(false);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            debugLog('🔌 SOCKET: 🔄 Reconnected to server after', attemptNumber, 'attempts');
            this.isConnected = true;
            this.triggerConnectionCallbacks(true);
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            debugLog('🔌 SOCKET: 🔄 Reconnect attempt #', attemptNumber);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('🔌 SOCKET: ❌ Reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('🔌 SOCKET: ❌ Failed to reconnect to server');
        });

        // Multiplayer session events
        this.socket.on('player-joined', (data) => {
            debugLog('Player joined session:', data);
            this.triggerEvent('player-joined', data);
        });

        this.socket.on('player-left', (data) => {
            debugLog('Player left session:', data);
            this.triggerEvent('player-left', data);
        });

        this.socket.on('player-disconnected', (data) => {
            debugLog('Player disconnected:', data);
            this.triggerEvent('player-disconnected', data);
        });

        // Test ping/pong
        this.socket.on('pong', () => {
            debugLog('🔌 SOCKET: ✅ Pong received - connection is working!');
        });

        // Game start event
        this.socket.on('game-started', (data) => {
            debugLog('Game started event received:', data);
            this.triggerEvent('game-started', data);
        });

        // Session joined confirmation
        this.socket.on('session-joined', (data) => {
            debugLog('🎯 SOCKET: ✅ SESSION JOINED SUCCESSFULLY!', data);
            this.currentSessionId = data.sessionId;
            debugLog('🎯 SOCKET: Set currentSessionId to:', this.currentSessionId);
            this.triggerEvent('session-joined', data);
        });

        // Session error handling
        this.socket.on('session-error', (data) => {
            console.error('Session error:', data);
            this.triggerEvent('session-error', data);
        });
    }

    // Add connection status callback
    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
    }

    // Trigger connection callbacks
    triggerConnectionCallbacks(connected) {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                console.error('Connection callback error:', error);
            }
        });
    }

    // Add event listener
    on(event, callback) {
        debugLog(`🔧 REGISTER: Registering listener for event '${event}'. Current listeners:`, this.eventListeners[event]?.length || 0);
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
        debugLog(`🔧 REGISTER: Event '${event}' now has ${this.eventListeners[event].length} listeners`);
    }

    // Remove event listener
    off(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }

    // Trigger custom event
    triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach((callback, index) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event callback error for ${event}:`, error);
                }
            });
        } else {
            debugLog(`🔧 TRIGGER: No listeners found for event '${event}'`);
        }
    }

    // Join a multiplayer session
    joinSession(sessionId) {
        if (!this.isConnected) {
            console.error('🚨 Cannot join session: not connected to server');
            return false;
        }

        // Prevent joining the same session multiple times
        if (this.currentSessionId === sessionId) {
            debugLog('🎯 Already in session:', sessionId);
            return true;
        }

        debugLog('🎯 JOINING SESSION:', sessionId, 'with socket ID:', this.socket.id);
        debugLog('🎯 Emitting join-simple-session event to server (USING SIMPLE APPROACH)...');
        this.socket.emit('join-simple-session', sessionId);
        this.currentSessionId = sessionId;
        
        // CRITICAL FIX: Set session ID directly on socket object for server validation
        this.socket.currentSession = sessionId;
        debugLog('🎯 Set currentSessionId to:', this.currentSessionId);
        debugLog('🎯 Set socket.currentSession to:', this.socket.currentSession);
        return true;
    }

    // Leave current session
    leaveSession() {
        if (!this.isConnected || !this.currentSessionId) {
            return false;
        }

        debugLog('Leaving session:', this.currentSessionId);
        this.socket.emit('leave-session');
        this.currentSessionId = null;
        return true;
    }

    // Send test ping
    ping() {
        if (this.isConnected) {
            this.socket.emit('ping');
        }
    }

    // Start multiplayer game
    startMultiplayerGame(data = {}) {
        debugLog('🚨 SOCKET MANAGER: ⭐ START MULTIPLAYER GAME CALLED! ⭐', {
            isConnected: this.isConnected,
            currentSessionId: this.currentSessionId,
            data: data
        });
        if (this.isConnected && this.currentSessionId) {
            debugLog('🚨 SOCKET MANAGER: ⭐ EMITTING START-MULTIPLAYER-GAME EVENT TO SERVER! ⭐');
            this.socket.emit('start-multiplayer-game', data);
        } else {
            console.error('🚨 SOCKET MANAGER: ❌ CANNOT START GAME - NOT CONNECTED OR NO SESSION!', {
                isConnected: this.isConnected,
                currentSessionId: this.currentSessionId
            });
        }
    }

    // Get connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            socketId: this.socket ? this.socket.id : null,
            sessionId: this.currentSessionId
        };
    }

    // Disconnect socket
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.currentSessionId = null;
        }
    }
}

// Create global instance
window.socketManager = new SocketManager();