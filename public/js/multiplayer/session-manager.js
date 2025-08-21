class SessionManager {
    constructor() {
        this.currentSession = null;
        this.isHost = false;
        this.players = [];
        this.gameState = 'waiting';
    }

    // Create a new multiplayer session (using simple approach)
    async createSession(playerData = {}) {
        try {
            console.log('🎯 SESSION MANAGER: Creating simple session...');
            
            if (!window.socketManager || !window.socketManager.isConnected) {
                console.error('🚨 Socket manager not connected!');
                return { success: false, error: 'Not connected to server' };
            }
            
            // Create session via API first
            const response = await fetch('/api/simple-sessions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hostPlayerId: window.socketManager.socket.id,
                    maxPlayers: playerData.maxPlayers || 2,
                    worldWidth: playerData.worldWidth || 2000,
                    worldHeight: playerData.worldHeight || 1500
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                console.error('Failed to create session on server:', data.error);
                return { success: false, error: data.error };
            }
            
            // Set up local session data
            this.currentSession = data.session;
            this.isHost = true;
            this.gameState = 'waiting';
            
            console.log('🚨 SESSION MANAGER: HOST STATUS SET TO TRUE (SESSION CREATOR)');
            console.log('Session created on server:', this.currentSession);
            
            // Join the socket room immediately
            console.log('🎯 HOST: Joining own session via Socket.io:', this.currentSession.id);
            const joinResult = window.socketManager.joinSession(this.currentSession.id);
            
            if (joinResult) {
                console.log('✅ Successfully joined own session');
                return { success: true, session: this.currentSession };
            } else {
                console.error('❌ Failed to join own session');
                return { success: false, error: 'Failed to join session' };
            }
            
        } catch (error) {
            console.error('Error creating session:', error);
            return { success: false, error: error.message };
        }
    }

    // Join an existing session (using simple approach)
    async joinSession(sessionId, playerData = {}) {
        try {
            console.log('🎯 SESSION MANAGER: Joining simple session:', sessionId);
            
            if (!window.socketManager || !window.socketManager.isConnected) {
                console.error('🚨 Socket manager not connected!');
                return { success: false, error: 'Not connected to server' };
            }
            
            // Set up session data (we don't have full info, but that's ok for simple mode)
            this.currentSession = {
                id: sessionId,
                hostPlayerId: null, // Unknown in simple mode
                maxPlayers: 2, // Default
                currentPlayers: 0, // Will be updated by socket events
                gameState: 'waiting',
                worldWidth: 2000,
                worldHeight: 1500
            };
            
            this.isHost = false; // Assume we're not host when joining
            this.gameState = 'waiting';
            
            console.log('🚨 SESSION MANAGER: HOST STATUS SET TO FALSE (SESSION JOINER)');
            console.log('Joining session:', sessionId);
            
            // Join the socket room
            const joinResult = window.socketManager.joinSession(sessionId);
            
            if (joinResult) {
                console.log('✅ Successfully joined session');
                return { success: true, session: this.currentSession };
            } else {
                console.error('❌ Failed to join session');
                return { success: false, error: 'Failed to join session' };
            }
            
        } catch (error) {
            console.error('Error joining session:', error);
            return { success: false, error: error.message };
        }
    }

    // Leave current session
    async leaveSession() {
        if (!this.currentSession) {
            return { success: true };
        }

        try {
            console.log('🎯 SESSION MANAGER: Leaving session:', this.currentSession.id);
            
            // Leave socket room - the server will handle session cleanup automatically
            if (window.socketManager) {
                window.socketManager.leaveSession();
            }

            // For simple sessions, no API call needed - server handles cleanup via socket disconnect
            // Clear local session data
            this.currentSession = null;
            this.isHost = false;
            this.players = [];
            this.gameState = 'waiting';
            
            console.log('✅ Left session successfully');
            return { success: true };
        } catch (error) {
            console.error('Error leaving session:', error);
            
            // Clear local data even if there's an error
            this.currentSession = null;
            this.isHost = false;
            this.players = [];
            this.gameState = 'waiting';
            
            return { success: false, error: error.message };
        }
    }

    // Get list of available sessions
    async getAvailableSessions() {
        try {
            console.log('🎯 SESSION MANAGER: Getting available sessions from server...');
            
            const response = await fetch('/api/simple-sessions');
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Fetched available sessions:', data.sessions);
                return { success: true, sessions: data.sessions };
            } else {
                console.error('Failed to get sessions:', data.error);
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Refresh current session information
    async refreshSessionInfo() {
        if (!this.currentSession) {
            return { success: false, error: 'No active session' };
        }

        try {
            console.log('🎯 SESSION MANAGER: Refreshing session info for:', this.currentSession.id);
            const response = await fetch(`/api/simple-sessions/${this.currentSession.id}`);
            
            // If we get a 404, the server may have restarted - just keep local session
            if (response.status === 404) {
                console.log('Session not found on server (server may have restarted) - keeping local session');
                // Re-join the session via socket to recreate it on server
                if (window.socketManager && window.socketManager.isConnected) {
                    window.socketManager.socket.emit('join-simple-session', this.currentSession.id);
                }
                return { success: true, session: this.currentSession };
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Update session data from server
                this.currentSession = data.session;
                this.gameState = data.session.gameState;
                
                console.log('✅ Session info refreshed:', this.currentSession);
                return { success: true, session: data.session };
            } else {
                console.log('Failed to refresh, keeping local session:', data.error);
                return { success: true, session: this.currentSession };
            }
        } catch (error) {
            console.log('Error refreshing session, keeping local:', error.message);
            return { success: true, session: this.currentSession };
        }
    }

    // Generate a unique player ID (should be improved with proper authentication)
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substring(2, 15);
    }

    // Get current session status
    getSessionStatus() {
        return {
            hasSession: !!this.currentSession,
            session: this.currentSession,
            isHost: this.isHost,
            players: this.players,
            gameState: this.gameState,
            playerCount: this.players.length
        };
    }

    // Check if in multiplayer mode
    isMultiplayerActive() {
        return !!this.currentSession;
    }

    // Get world dimensions for current session
    getWorldDimensions() {
        if (this.currentSession) {
            return {
                width: this.currentSession.worldWidth,
                height: this.currentSession.worldHeight
            };
        }
        return null;
    }
}

// Create global instance
window.sessionManager = new SessionManager();