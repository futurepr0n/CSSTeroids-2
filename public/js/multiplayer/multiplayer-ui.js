class MultiplayerUI {
    constructor() {
        this.currentScreen = null;
        this.updateInterval = null;
        this.isInitialized = false;
        this.loadedShipData = null; // Store loaded ship data like custom-ships-minimal.html
    }

    // Initialize multiplayer UI
    initialize() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.initializeManagers();
        this.isInitialized = true;
        
        console.log('Multiplayer UI initialized');
    }

    // Initialize socket and session managers
    initializeManagers() {
        console.log('🎮 UI: Initializing managers...');
        console.log('🎮 UI: Socket manager available:', !!window.socketManager);
        
        // Initialize socket connection
        if (window.socketManager) {
            console.log('🎮 UI: Initializing socket manager...');
            const initResult = window.socketManager.initialize();
            console.log('🎮 UI: Socket manager initialization result:', initResult);
            
            // Setup connection status callback
            window.socketManager.onConnectionChange((connected) => {
                console.log('🎮 UI: Connection status changed:', connected);
                this.updateConnectionStatus(connected);
            });

            // Setup multiplayer event listeners
            window.socketManager.on('player-joined', (data) => {
                this.handlePlayerJoined(data);
            });

            window.socketManager.on('player-left', (data) => {
                this.handlePlayerLeft(data);
            });

            window.socketManager.on('player-disconnected', (data) => {
                this.handlePlayerDisconnected(data);
            });

            // Listen for game start events
            window.socketManager.on('game-started', (data) => {
                this.handleGameStarted(data);
            });

            // Listen for session join confirmations
            window.socketManager.on('session-joined', (data) => {
                this.handleSessionJoined(data);
            });

            // Listen for session errors
            window.socketManager.on('session-error', (data) => {
                this.handleSessionError(data);
            });
        }
    }

    // Setup UI event listeners
    setupEventListeners() {
        // Multiplayer button from main menu
        const multiplayerButton = document.getElementById('multiplayerButton');
        if (multiplayerButton) {
            multiplayerButton.addEventListener('click', () => {
                this.showMultiplayerScreen();
            });
        }

        // Back button
        const backButton = document.getElementById('backFromMultiplayerButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.leaveMultiplayer();
            });
        }

        // Create session button
        const createButton = document.getElementById('createSessionButton');
        if (createButton) {
            createButton.addEventListener('click', () => {
                this.createSession();
            });
        }

        // Refresh sessions button
        const refreshButton = document.getElementById('refreshSessionsButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshAvailableSessions();
            });
        }

        // Join session by ID button
        const joinButton = document.getElementById('joinSessionButton');
        if (joinButton) {
            joinButton.addEventListener('click', () => {
                this.joinSessionById();
            });
        }

        // Leave session button
        const leaveButton = document.getElementById('leaveSessionButton');
        if (leaveButton) {
            leaveButton.addEventListener('click', () => {
                this.leaveCurrentSession();
            });
        }

        // Start multiplayer game button
        const startButton = document.getElementById('startMultiplayerGameButton');
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startMultiplayerGame();
            });
        }

        // Load ship button (like custom-ships-minimal.html)
        const loadShipButton = document.getElementById('loadShipButton');
        if (loadShipButton) {
            loadShipButton.addEventListener('click', () => {
                this.loadCustomShip();
            });
        }
    }

    // Show multiplayer screen
    showMultiplayerScreen() {
        // Hide other screens
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.style.display = 'none';
        });

        // Hide game canvas
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) gameCanvas.style.display = 'none';

        // Show multiplayer screen
        const multiplayerScreen = document.getElementById('multiplayerScreen');
        if (multiplayerScreen) {
            multiplayerScreen.style.display = 'flex';
            this.currentScreen = 'multiplayer';
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            // Initial load of sessions
            this.refreshAvailableSessions();
        }
    }

    // Leave multiplayer and return to main menu
    async leaveMultiplayer() {
        // Stop updates
        this.stopPeriodicUpdates();
        
        // Leave any current session
        if (window.sessionManager && window.sessionManager.isMultiplayerActive()) {
            await window.sessionManager.leaveSession();
        }

        // Hide multiplayer screen and show main menu
        const multiplayerScreen = document.getElementById('multiplayerScreen');
        const mainMenu = document.getElementById('mainMenuScreen');
        const gameCanvas = document.getElementById('gameCanvas');
        
        if (multiplayerScreen) multiplayerScreen.style.display = 'none';
        if (gameCanvas) gameCanvas.style.display = 'none';
        if (mainMenu) mainMenu.style.display = 'flex';
        
        this.currentScreen = 'main';
        this.updateSessionDisplay();
    }

    // Update connection status indicator
    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (statusIndicator && statusText) {
            if (connected) {
                statusIndicator.className = 'status-indicator connected';
                statusText.textContent = 'Connected to server';
            } else {
                statusIndicator.className = 'status-indicator disconnected';
                statusText.textContent = 'Connection lost - Reconnecting...';
            }
        }
    }

    // Create a new multiplayer session
    async createSession() {
        if (!window.sessionManager) return;

        const button = document.getElementById('createSessionButton');
        if (button) {
            button.disabled = true;
            button.textContent = 'Creating...';
        }

        try {
            const result = await window.sessionManager.createSession({
                maxPlayers: 2,
                worldWidth: 2000,
                worldHeight: 1500
            });

            if (result.success) {
                console.log('Session created successfully');
                this.updateSessionDisplay();
            } else {
                console.error('Failed to create session:', result.error);
                alert('Failed to create session: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Error creating session');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'CREATE GAME';
            }
        }
    }

    // Join session by ID
    async joinSessionById() {
        const sessionIdInput = document.getElementById('sessionIdInput');
        const sessionId = sessionIdInput ? sessionIdInput.value.trim() : '';
        
        if (!sessionId) {
            alert('Please enter a session ID');
            return;
        }

        console.log('Joining session by ID:', sessionId);
        
        const button = document.getElementById('joinSessionButton');
        if (button) {
            button.disabled = true;
            button.textContent = 'Joining...';
        }

        try {
            const result = await window.sessionManager.joinSession(sessionId, {
                playerName: 'Player' // Could be customized later
            });

            if (result.success) {
                console.log('Successfully joined session');
                this.updateSessionDisplay();
                // Clear the input
                if (sessionIdInput) sessionIdInput.value = '';
            } else {
                console.error('Failed to join session:', result.error);
                alert('Failed to join session: ' + result.error);
            }
        } catch (error) {
            console.error('Error joining session:', error);
            alert('Error joining session: ' + error.message);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'JOIN';
            }
        }
    }

    // Join an existing session
    async joinSession(sessionId) {
        if (!window.socketManager || !window.sessionManager) return;

        try {
            console.log(`🎯 CLIENT: Attempting to join session: ${sessionId}`);
            console.log('🎯 CLIENT: Socket manager state:', {
                hasSocketManager: !!window.socketManager,
                isConnected: window.socketManager?.isConnected,
                socketId: window.socketManager?.socket?.id
            });
            
            // Use WebSocket to join session directly
            if (window.socketManager.isConnected) {
                console.log('🎯 CLIENT: Socket connected, joining session...');
                window.socketManager.joinSession(sessionId);
                
                // Update session manager state
                window.sessionManager.currentSession = { id: sessionId };
                window.sessionManager.isHost = false;
                
                console.log('🎯 CLIENT: Join request sent via WebSocket, updated session manager');
            } else {
                console.error('🚨 CLIENT: Socket not connected!');
                alert('Not connected to server!');
            }
        } catch (error) {
            console.error('Error joining session:', error);
            alert('Error joining session');
        }
    }

    // Leave current session
    async leaveCurrentSession() {
        if (!window.sessionManager) return;

        const button = document.getElementById('leaveSessionButton');
        if (button) {
            button.disabled = true;
            button.textContent = 'Leaving...';
        }

        try {
            await window.sessionManager.leaveSession();
            this.updateSessionDisplay();
            this.refreshAvailableSessions();
        } catch (error) {
            console.error('Error leaving session:', error);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'LEAVE SESSION';
            }
        }
    }

    // Refresh available sessions list
    async refreshAvailableSessions() {
        if (!window.sessionManager) return;

        const sessionsList = document.getElementById('sessionsList');
        if (!sessionsList) return;

        sessionsList.innerHTML = '<div class="session-item loading">Loading...</div>';

        try {
            const result = await window.sessionManager.getAvailableSessions();
            
            if (result.success) {
                this.displayAvailableSessions(result.sessions);
            } else {
                sessionsList.innerHTML = '<div class="session-item error">Failed to load sessions</div>';
            }
        } catch (error) {
            console.error('Error refreshing sessions:', error);
            sessionsList.innerHTML = '<div class="session-item error">Error loading sessions</div>';
        }
    }

    // Display available sessions
    displayAvailableSessions(sessions) {
        const sessionsList = document.getElementById('sessionsList');
        if (!sessionsList) return;

        if (sessions.length === 0) {
            sessionsList.innerHTML = '<div class="session-item empty">No available games</div>';
            return;
        }

        sessionsList.innerHTML = '';
        
        sessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'session-item';
            sessionElement.innerHTML = `
                <div class="session-info-item">
                    <div>Host: ${session.hostPlayerId}</div>
                    <div>Players: ${session.currentPlayers}/${session.maxPlayers}</div>
                    <div>World: ${session.worldWidth}x${session.worldHeight}</div>
                    <div>Status: ${session.gameState === 'playing' ? 'In Game' : 'Waiting'}</div>
                </div>
                <button class="join-button" onclick="multiplayerUI.joinSession('${session.id}')">${session.gameState === 'playing' ? 'JOIN GAME' : 'JOIN'}</button>
            `;
            sessionsList.appendChild(sessionElement);
        });
    }

    // Update current session display
    updateSessionDisplay() {
        const currentSessionDiv = document.getElementById('currentSession');
        if (!currentSessionDiv) return;

        // Check if we're in a session (either via session manager or socket manager)
        const isInSession = (window.sessionManager && window.sessionManager.isMultiplayerActive()) || 
                           (window.socketManager && window.socketManager.currentSessionId);
        
        if (!isInSession) {
            currentSessionDiv.style.display = 'none';
            return;
        }

        // Get session status or create default status for simple sessions
        let status;
        if (window.sessionManager && window.sessionManager.isMultiplayerActive()) {
            status = window.sessionManager.getSessionStatus();
        } else if (window.socketManager && window.socketManager.currentSessionId) {
            // Create status object for simple sessions
            status = {
                session: {
                    id: window.socketManager.currentSessionId,
                    currentPlayers: 2, // Default for simple sessions
                    maxPlayers: 4,
                    gameState: 'waiting'
                },
                gameState: 'waiting',
                players: [
                    { playerName: 'Player 1' },
                    { playerName: 'Player 2' }
                ]
            };
        } else {
            currentSessionDiv.style.display = 'none';
            return;
        }

        currentSessionDiv.style.display = 'block';

        // Update session info
        const sessionId = document.getElementById('currentSessionId');
        const playerCount = document.getElementById('currentPlayerCount');
        const maxPlayers = document.getElementById('maxPlayerCount');
        const sessionStatus = document.getElementById('sessionStatus');

        if (sessionId) sessionId.textContent = status.session.id;
        if (playerCount) playerCount.textContent = status.session.currentPlayers;
        if (maxPlayers) maxPlayers.textContent = status.session.maxPlayers;
        if (sessionStatus) sessionStatus.textContent = status.gameState;

        // Update players list
        this.updatePlayersList(status.players);

        // Show start button for all players (not just host)
        const startButton = document.getElementById('startMultiplayerGameButton');
        if (startButton) {
            // Show button if there are players in the session and game hasn't started
            const canStart = status.session.currentPlayers > 0 && (status.gameState === 'waiting' || !status.gameState);
            
            console.log('🎮 START BUTTON: Checking if can start game:', {
                currentPlayers: status.session.currentPlayers,
                gameState: status.gameState,
                canStart: canStart,
                sessionStatus: status,
                isInSession: isInSession,
                hasSessionManager: !!window.sessionManager,
                hasSocketManager: !!window.socketManager,
                socketSessionId: window.socketManager?.currentSessionId
            });
            
            startButton.style.display = canStart ? 'inline-block' : 'none';
        }
    }

    // Update players list display
    updatePlayersList(players) {
        const playersContent = document.getElementById('playersListContent');
        if (!playersContent) return;

        if (!players || players.length === 0) {
            playersContent.innerHTML = 'No players yet';
            return;
        }

        playersContent.innerHTML = '';
        players.forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            playerElement.textContent = `${index + 1}. ${player.playerName || 'Anonymous'}`;
            playersContent.appendChild(playerElement);
        });
    }

    // Start periodic updates while on multiplayer screen
    startPeriodicUpdates() {
        this.stopPeriodicUpdates();
        this.updateInterval = setInterval(() => {
            if (this.currentScreen === 'multiplayer') {
                this.updateSessionDisplay();
                if (window.sessionManager && window.sessionManager.isMultiplayerActive()) {
                    window.sessionManager.refreshSessionInfo();
                }
            }
        }, 2000); // Update every 2 seconds
    }

    // Stop periodic updates
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Handle multiplayer events
    handlePlayerJoined(data) {
        console.log('Player joined:', data);
        if (window.sessionManager && window.sessionManager.isMultiplayerActive()) {
            window.sessionManager.refreshSessionInfo();
        }
    }

    handlePlayerLeft(data) {
        console.log('Player left:', data);
        if (window.sessionManager && window.sessionManager.isMultiplayerActive()) {
            window.sessionManager.refreshSessionInfo();
        }
    }

    handlePlayerDisconnected(data) {
        console.log('Player disconnected:', data);
        if (window.sessionManager && window.sessionManager.isMultiplayerActive()) {
            window.sessionManager.refreshSessionInfo();
        }
    }

    handleSessionJoined(data) {
        console.log('Session joined successfully:', data);
        
        // Update session manager state with server response
        if (window.sessionManager) {
            window.sessionManager.currentSession = {
                id: data.sessionId,
                currentPlayers: data.playerCount || 2, // Default to 2 for simple sessions
                maxPlayers: data.maxPlayers || 4,
                gameState: data.gameState || 'waiting'
            };
            window.sessionManager.gameState = data.gameState || 'waiting';
            
            // Mark session manager as active for simple sessions
            window.sessionManager.isActive = true;
        }
        
        // Force refresh of session display to show correct state
        this.updateSessionDisplay();
        this.refreshAvailableSessions();
    }

    handleSessionError(data) {
        console.error('Session error:', data);
        alert('Session error: ' + data.error);
        // Refresh the session display
        this.updateSessionDisplay();
        this.refreshAvailableSessions();
    }

    // Start multiplayer game (any player can trigger)
    startMultiplayerGame() {
        console.log('🚨 MULTIPLAYER UI: ⭐ START MULTIPLAYER GAME BUTTON CLICKED! ⭐');
        
        if (!window.sessionManager || !window.sessionManager.isMultiplayerActive()) {
            alert('No active multiplayer session!');
            return;
        }

        // Use Socket.io to coordinate game start across all players
        if (window.socketManager && window.socketManager.isConnected) {
            window.socketManager.startMultiplayerGame();
        } else {
            alert('Not connected to server!');
        }
    }

    // Handle game started event from server
    handleGameStarted(data) {
        console.log('🚨 MULTIPLAYER UI: ⭐ GAME STARTED EVENT RECEIVED! ⭐', data);
        
        const worldDimensions = {
            width: data.worldWidth,
            height: data.worldHeight
        };
        
        // Configure game for multiplayer mode
        console.log("Checking game instance:", {
            gameExists: !!window.game,
            gameType: typeof window.game
        });
        
        if (window.game) {
            this.initializeMultiplayerGame(worldDimensions);
        } else {
            console.log('Game instance not found, creating it now...');
            
            // Create game instance if it doesn't exist
            try {
                window.game = new Game();
                const menu = new GameMenu(window.game);
                console.log('Game instance created successfully');
                
                this.initializeMultiplayerGame(worldDimensions);
            } catch (error) {
                console.error('Failed to create game instance:', error);
                alert('Failed to initialize game! Error: ' + error.message);
            }
        }
    }

    // Initialize the actual multiplayer game
    initializeMultiplayerGame(worldDimensions) {
        console.log(`🎮 INIT: ⭐ STARTING GAME INITIALIZATION ⭐`);
        console.log(`🎮 INIT: Configuring game for multiplayer: ${worldDimensions.width}x${worldDimensions.height} world`);
        console.log(`🎮 INIT: Pre-initialization socket state:`, {
            hasSocketManager: !!window.socketManager,
            isConnected: window.socketManager?.isConnected,
            socketId: window.socketManager?.socket?.id,
            currentSessionId: window.socketManager?.currentSessionId
        });
        
        // Set up session info BEFORE game initialization
        if (window.sessionManager) {
            const sessionStatus = window.sessionManager.getSessionStatus();
            const playerId = window.socketManager ? window.socketManager.socket.id : 'player_' + Math.random().toString(36).substr(2, 9);
            
            // More robust host detection - compare with session's hostPlayerId
            let isHost = window.sessionManager.isHost;
            if (sessionStatus.session && sessionStatus.session.hostPlayerId) {
                const serverDeterminedHost = (playerId === sessionStatus.session.hostPlayerId);
                console.log('🎮 INIT: 🚨 HOST STATUS VERIFICATION 🚨', {
                    sessionManagerSaysHost: window.sessionManager.isHost,
                    myPlayerId: playerId,
                    sessionHostPlayerId: sessionStatus.session.hostPlayerId,
                    serverDeterminedHost: serverDeterminedHost,
                    finalHostStatus: serverDeterminedHost
                });
                isHost = serverDeterminedHost; // Use server's authoritative determination
            }
            
            console.log('🎮 INIT: Setting up multiplayer session info...');
            console.log('🎮 INIT: 🚨 HOST STATUS DEBUG 🚨', {
                sessionManagerIsHost: window.sessionManager.isHost,
                calculatedIsHost: isHost,
                sessionManagerExists: !!window.sessionManager,
                currentSession: sessionStatus.session?.id,
                playerId: playerId,
                socketId: window.socketManager?.socket?.id
            });
            console.log('🎮 INIT: SessionManager state:', {
                hasSessionManager: !!window.sessionManager,
                sessionStatus: sessionStatus,
                hasSocketManager: !!window.socketManager,
                socketConnected: window.socketManager?.isConnected,
                socketId: window.socketManager?.socket?.id,
                isHost: isHost,
                playerId: playerId
            });
            
            // Check if we have a valid session
            if (sessionStatus.session && sessionStatus.session.id) {
                // Set multiplayer session info in the game FIRST
                console.log(`🎮 INIT: Setting multiplayer session: ${sessionStatus.session.id}, Player: ${playerId}, Host: ${isHost}`);
                window.game.setMultiplayerSession(sessionStatus.session.id, playerId, isHost);
                console.log(`🎮 INIT: Session setup complete: ${sessionStatus.session.id}, Player: ${playerId}, Host: ${isHost}`);
            } else {
                console.error('🎮 INIT ERROR: No valid session available for multiplayer setup!', sessionStatus);
                // Try to get session from current session ID
                if (window.socketManager && window.socketManager.currentSessionId) {
                    console.log('🎮 INIT: Using socket manager session ID:', window.socketManager.currentSessionId);
                    window.game.setMultiplayerSession(window.socketManager.currentSessionId, playerId, isHost);
                } else {
                    console.error('🎮 INIT ERROR: Cannot set up multiplayer session - no session ID available');
                    return;
                }
            }
        } else {
            console.error('🎮 INIT ERROR: No session manager available for multiplayer setup!');
        }
        
        // Set game mode BEFORE initializing
        window.game.setGameMode('multiplayer', {
            width: worldDimensions.width,
            height: worldDimensions.height
        });
        
        // Hide all menu screens (like the regular game start does)
        this.hideAllMenuScreens();
        
        // Initialize the game (this creates the ship and starts the game loop)
        console.log('🎮 INIT: About to call window.game.init()...');
        window.game.init();
        console.log('🎮 INIT: window.game.init() completed');
        
        // Apply loaded custom ship data to the player's ship (like custom-ships-minimal.html)
        if (this.loadedShipData && window.game.ship) {
            console.log('🚢 INIT: Applying loaded ship data to player ship:', this.loadedShipData);
            this.applyShipDataToGame(window.game.ship, this.loadedShipData);
            
            // Broadcast ship data to other players (like custom-ships-minimal.html)
            if (window.socketManager && window.socketManager.isConnected) {
                console.log('🚢 INIT: Broadcasting ship data to other players');
                window.socketManager.emit('player-ship-data', {
                    shipData: this.loadedShipData
                });
            }
        } else {
            console.log('🚢 INIT: No custom ship data loaded or no ship available');
        }
        
        // Check post-initialization state
        console.log('🎮 INIT: Post-initialization socket state:', {
            hasSocketManager: !!window.socketManager,
            isConnected: window.socketManager?.isConnected,
            socketId: window.socketManager?.socket?.id,
            currentSessionId: window.socketManager?.currentSessionId,
            gameMode: window.game?.gameMode,
            isMultiplayer: window.game?.isMultiplayer()
        });
        
        // If host, immediately broadcast initial game state to sync all players
        if (window.sessionManager && window.sessionManager.isHost) {
            console.log('🎮 INIT: Host will broadcast initial game state in 100ms...');
            setTimeout(() => {
                if (window.game && window.game.broadcastGameState) {
                    console.log('🎮 INIT: Host broadcasting initial game state now');
                    window.game.broadcastGameState();
                    console.log('🎮 INIT: Host sent initial game state to clients');
                } else {
                    console.error('🎮 INIT: Cannot broadcast - game or broadcastGameState method missing');
                }
            }, 100);
        } else {
            console.log('🎮 INIT: Non-host client - waiting for game state from host');
        }
        
        console.log('🎮 INIT: ✅ Multiplayer game initialization completed successfully!');
        console.log(`Ship bounded to ${worldDimensions.width}x${worldDimensions.height} world`);
        console.log('Real-time synchronization active!');
    }
    
    // Helper method to hide all menu screens (similar to GameMenu.hideAllScreens)
    hideAllMenuScreens() {
        const screens = [
            'mainMenuScreen',
            'multiplayerScreen', 
            'shipCustomizationScreen',
            'highScoresScreen',
            'gameOverHighScoreScreen'
        ];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.style.display = 'none';
            }
        });
        
        // Show the game canvas
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) {
            gameCanvas.style.display = 'block';
        }
    }

    // Load custom ship by passphrase (copied from custom-ships-minimal.html)
    async loadCustomShip() {
        const passphraseInput = document.getElementById('shipPassphraseInput');
        const loadButton = document.getElementById('loadShipButton');
        const shipInfo = document.getElementById('loadedShipInfo');
        const shipName = document.getElementById('loadedShipName');
        const shipLines = document.getElementById('loadedShipLines');
        const shipColor = document.getElementById('loadedShipColor');

        const passphrase = passphraseInput.value.trim();
        if (!passphrase) {
            alert('Please enter a ship passphrase');
            return;
        }

        loadButton.disabled = true;
        loadButton.textContent = 'Loading...';

        try {
            console.log('🚢 Loading ship with passphrase:', passphrase);
            const response = await fetch(`/api/ships/passphrase/${passphrase}`);

            if (!response.ok) {
                throw new Error('Ship not found');
            }

            this.loadedShipData = await response.json();
            console.log('🚢 Loaded ship data:', this.loadedShipData);

            // Update UI
            shipName.textContent = this.loadedShipData.name;
            shipLines.textContent = this.loadedShipData.customLines?.length || 0;
            shipColor.textContent = this.loadedShipData.color || 'white';
            shipInfo.style.display = 'block';

            console.log('🚢 Ship loaded successfully for multiplayer');

        } catch (error) {
            console.error('🚢 Error loading ship:', error);
            alert('Ship not found with that passphrase');
            this.loadedShipData = null;
            shipInfo.style.display = 'none';
        } finally {
            loadButton.disabled = false;
            loadButton.textContent = 'LOAD SHIP';
        }
    }

    // Apply ship data to the game ship (like custom-ships-minimal.html)
    applyShipDataToGame(ship, shipData) {
        if (!shipData || !ship) {
            console.log('🚢 Cannot apply ship data - missing data or ship');
            return;
        }

        console.log('🚢 Applying ship data to game ship:', {
            customLines: shipData.customLines?.length || 0,
            color: shipData.color,
            thrusterColor: shipData.thrusterColor,
            hasThrusters: !!shipData.thrusterPoints?.length,
            hasWeapons: !!shipData.weaponPoints?.length
        });

        // Apply custom ship properties directly to ship object (like Ship class expects)
        ship.shipType = 'custom';
        ship.customLines = shipData.customLines || [];
        ship.shipColor = shipData.color || 'white';
        ship.thrusterColor = shipData.thrusterColor || 'blue';
        ship.thrusterPoints = shipData.thrusterPoints || [];
        ship.weaponPoints = shipData.weaponPoints || [];
        ship.playerName = shipData.name || 'Player';
        
        console.log('🚢 Game ship properties after applying data:', {
            shipType: ship.shipType,
            customLinesCount: ship.customLines.length,
            shipColor: ship.shipColor,
            thrusterColor: ship.thrusterColor,
            playerName: ship.playerName
        });
    }
}

// Create global instance and initialize when DOM is ready
window.multiplayerUI = new MultiplayerUI();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 UI: DOM loaded, checking multiplayer dependencies...', {
        multiplayerUI: !!window.multiplayerUI,
        socketManager: !!window.socketManager,
        sessionManager: !!window.sessionManager,
        io: typeof io !== 'undefined',
        socketIoScript: !!document.querySelector('script[src*="socket.io.js"]')
    });
    
    if (window.multiplayerUI) {
        console.log('🎮 UI: Initializing multiplayer UI...');
        window.multiplayerUI.initialize();
    } else {
        console.error('🎮 UI ERROR: multiplayerUI not available!');
    }
});