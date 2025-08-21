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
            console.log('🔌 SOCKET: Starting initialization...');
            console.log('🔌 SOCKET: Environment check:', {
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

            console.log('🔌 SOCKET: Initializing Socket.io connection...');
            
            // Configure Socket.io with explicit server URL and options
            const serverUrl = `${window.location.protocol}//${window.location.hostname}:6161`;
            console.log('🔌 SOCKET: Connecting to server at:', serverUrl);
            
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
                upgrade: true,
                forceNew: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 5000
            });
            
            console.log('🔌 SOCKET: Socket.io instance created:', {
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
        console.log('🔌 SOCKET: Setting up event listeners...');
        
        this.socket.on('connect', () => {
            console.log('🔌 SOCKET: ✅ Connected to server successfully!', {
                socketId: this.socket.id,
                transport: this.socket.io.engine.transport.name,
                connected: this.socket.connected
            });
            this.isConnected = true;
            this.triggerConnectionCallbacks(true);
            
            // Test ping to verify connection
            setTimeout(() => {
                console.log('🔌 SOCKET: Sending test ping...');
                this.socket.emit('ping');
            }, 1000);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 SOCKET: ❌ Disconnected from server:', reason);
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
            console.log('🔌 SOCKET: 🔄 Reconnected to server after', attemptNumber, 'attempts');
            this.isConnected = true;
            this.triggerConnectionCallbacks(true);
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔌 SOCKET: 🔄 Reconnect attempt #', attemptNumber);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('🔌 SOCKET: ❌ Reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('🔌 SOCKET: ❌ Failed to reconnect to server');
        });

        // Multiplayer session events
        this.socket.on('player-joined', (data) => {
            console.log('Player joined session:', data);
            this.triggerEvent('player-joined', data);
        });

        this.socket.on('player-left', (data) => {
            console.log('Player left session:', data);
            this.triggerEvent('player-left', data);
        });

        this.socket.on('player-disconnected', (data) => {
            console.log('Player disconnected:', data);
            this.triggerEvent('player-disconnected', data);
        });

        // Test ping/pong
        this.socket.on('pong', () => {
            console.log('🔌 SOCKET: ✅ Pong received - connection is working!');
        });

        // Game start event
        this.socket.on('game-started', (data) => {
            console.log('Game started event received:', data);
            this.triggerEvent('game-started', data);
        });

        // Session joined confirmation
        this.socket.on('session-joined', (data) => {
            console.log('🎯 SOCKET: ✅ SESSION JOINED SUCCESSFULLY!', data);
            this.currentSessionId = data.sessionId;
            console.log('🎯 SOCKET: Set currentSessionId to:', this.currentSessionId);
            this.triggerEvent('session-joined', data);
        });

        // Session error handling
        this.socket.on('session-error', (data) => {
            console.error('Session error:', data);
            this.triggerEvent('session-error', data);
        });

        // Game synchronization events (using simple session approach)
        this.socket.on('player-update', (data) => {
            console.log('🎮 SOCKET: ⭐ RECEIVED PLAYER-UPDATE! ⭐', {
                playerId: data.playerId,
                playerName: data.ship?.playerName,
                position: { x: data.ship?.x, y: data.ship?.y },
                angle: data.ship?.angle,
                currentSession: this.currentSessionId,
                timestamp: new Date().toISOString()
            });
            // Forward to game using the same event name (no translation)
            this.triggerEvent('player-update', data);
        });

        this.socket.on('game-objects-update', (data) => {
            console.log('🌍 SOCKET: ⭐ RECEIVED GAME-OBJECTS-UPDATE FROM SERVER! ⭐', {
                asteroids: data.asteroids?.length || 0,
                enemies: data.enemies?.length || 0,
                bullets: data.bullets?.length || 0,
                level: data.level,
                score: data.score,
                lives: data.lives,
                currentSessionId: this.currentSessionId,
                timestamp: new Date().toISOString()
            });
            console.log('🌍 SOCKET: Raw asteroid data sample:', data.asteroids?.slice(0, 2));
            console.log('🌍 SOCKET: Now triggering game-objects-update event to game...');
            // Forward to game using the same event name (no translation)
            this.triggerEvent('game-objects-update', data);
        });

        this.socket.on('lives-update', (data) => {
            console.log('❤️ SOCKET: Received lives-update from server:', {
                lives: data.lives,
                sessionId: data.sessionId,
                playerId: data.playerId,
                timestamp: new Date().toISOString()
            });
            this.triggerEvent('lives-update', data);
        });

        this.socket.on('game-over', (data) => {
            console.log('💀 SOCKET: Received game-over from server:', {
                reason: data.reason,
                sessionId: data.sessionId,
                timestamp: new Date().toISOString()
            });
            this.triggerEvent('game-over', data);
        });

        this.socket.on('level-complete', (data) => {
            console.log('🏆 SOCKET: Received level-complete from server:', {
                newLevel: data.newLevel,
                score: data.score,
                sessionId: data.sessionId,
                timestamp: new Date().toISOString()
            });
            this.triggerEvent('level-complete', data);
        });

        // Custom ship data sharing (like custom-ships-minimal.html)
        this.socket.on('player-ship-data', (data) => {
            console.log('🚢 SOCKET: ⭐ RECEIVED PLAYER-SHIP-DATA! ⭐', {
                playerId: data.playerId,
                shipName: data.shipData?.name,
                customLinesCount: data.shipData?.customLines?.length || 0,
                color: data.shipData?.color,
                timestamp: new Date().toISOString()
            });
            this.triggerEvent('player-ship-data', data);
        });

        this.socket.on('request-ship-data', (data) => {
            console.log('🔄 SOCKET: Received request-ship-data from server:', data);
            this.triggerEvent('request-ship-data', data);
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
        console.log(`🔧 REGISTER: Registering listener for event '${event}'. Current listeners:`, this.eventListeners[event]?.length || 0);
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
        console.log(`🔧 REGISTER: Event '${event}' now has ${this.eventListeners[event].length} listeners`);
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
        console.log(`🔧 TRIGGER: Attempting to trigger event '${event}' with ${this.eventListeners[event]?.length || 0} listeners`);
        console.log(`🔧 TRIGGER: Available event types:`, Object.keys(this.eventListeners));
        
        if (this.eventListeners[event]) {
            console.log(`🔧 TRIGGER: Triggering ${this.eventListeners[event].length} callbacks for event '${event}'`);
            this.eventListeners[event].forEach((callback, index) => {
                try {
                    console.log(`🔧 TRIGGER: Calling callback ${index + 1} for event '${event}'`);
                    callback(data);
                } catch (error) {
                    console.error(`Event callback error for ${event}:`, error);
                }
            });
        } else {
            console.log(`🔧 TRIGGER: No listeners found for event '${event}'`);
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
            console.log('🎯 Already in session:', sessionId);
            return true;
        }

        console.log('🎯 JOINING SESSION:', sessionId, 'with socket ID:', this.socket.id);
        console.log('🎯 Emitting join-simple-session event to server (USING SIMPLE APPROACH)...');
        this.socket.emit('join-simple-session', sessionId);
        this.currentSessionId = sessionId;
        
        // CRITICAL FIX: Set session ID directly on socket object for server validation
        this.socket.currentSession = sessionId;
        console.log('🎯 Set currentSessionId to:', this.currentSessionId);
        console.log('🎯 Set socket.currentSession to:', this.socket.currentSession);
        return true;
    }

    // Leave current session
    leaveSession() {
        if (!this.isConnected || !this.currentSessionId) {
            return false;
        }

        console.log('Leaving session:', this.currentSessionId);
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
        console.log('🚨 SOCKET MANAGER: ⭐ START MULTIPLAYER GAME CALLED! ⭐', {
            isConnected: this.isConnected,
            currentSessionId: this.currentSessionId,
            data: data
        });
        if (this.isConnected && this.currentSessionId) {
            console.log('🚨 SOCKET MANAGER: ⭐ EMITTING START-MULTIPLAYER-GAME EVENT TO SERVER! ⭐');
            this.socket.emit('start-multiplayer-game', data);
        } else {
            console.error('🚨 SOCKET MANAGER: ❌ CANNOT START GAME - NOT CONNECTED OR NO SESSION!', {
                isConnected: this.isConnected,
                currentSessionId: this.currentSessionId
            });
        }
    }

    // Broadcast ship data to other players (like custom-ships-minimal.html)
    broadcastShipData(shipData) {
        if (!this.isConnected || !this.currentSessionId) {
            console.log('🚢 SOCKET: Cannot broadcast ship data - not connected or no session');
            return;
        }
        
        console.log('🚢 SOCKET: Broadcasting ship data to session:', this.currentSessionId, shipData);
        this.socket.emit('player-ship-data', {
            shipData: shipData
        });
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