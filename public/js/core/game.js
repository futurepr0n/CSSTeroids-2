//public/js/core/game.js

// Debug logging system - set to false to disable verbose console output
// Toggle with: window.DEBUG_LOG = true in browser console
window.DEBUG_LOG = false;
window.debugLog = function(...args) {
    if (window.DEBUG_LOG) console.log(...args);
};

class Game {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.lives = 3;
        this.score = 0;
        this.level = 1;
        this.asteroids = [];
        this.bullets = [];
        this.debris = [];
        this.enemies = [];
        this.gameOver = false;
        this.paused = false;
        this.demoMode = false; // New flag for demo mode
        
        // Game mode and world settings
        this.mode = 'singleplayer'; // 'singleplayer' or 'multiplayer'
        this.worldBounds = {
            width: 2000,
            height: 1500,
            enabled: false
        };
        
        // Camera/viewport system for multiplayer
        this.camera = {
            x: 0,
            y: 0,
            followTarget: null, // Ship to follow
            smoothing: 0.1, // Camera smoothing factor
            enabled: false
        };
        
        // Game objects
        this.ship = null;
        
        // Multiplayer game state
        this.isHost = false; // Whether this player is the host (authoritative)
        this.players = new Map(); // Other players' ships
        this.sessionId = null;
        this.playerId = null;
        this.lastSyncTime = 0;
        this.syncInterval = 1000 / 20; // 20 FPS sync rate
        this.handlersRegistered = false; // Track if socket event handlers are registered
        this.multiplayerRound = 1; // Current round in multiplayer mode
        this.roundTransitioning = false; // Prevent multiple round transitions
        this.multiplayerRoundStarted = false; // Track if current round has started spawning asteroids
        

        // Add these properties to the Game constructor
        this.touchControls = null;
        this.thrustPower = 1; // Default full thrust power
        this.isMobileDevice = this.detectMobileDevice();

        // UI elements
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.levelMessage = document.getElementById('levelMessage');
        this.levelNumber = document.getElementById('levelNumber');
        //this.gameOverScreen = document.getElementById('gameOverScreen');
        this.finalScore = document.getElementById('finalScore');
        
        // Game loop timing
        this.lastTime = 0;
        this.accumulator = 0;
        this.timeStep = 1/60; // 60 FPS
        
        // Input handling
        this.keys = {};
        
        // Bind event handlers
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Initialize controls
        this.initControls();
        
        // Initialize debug flags
        window.DEBUG_COLLISIONS = false;
    }
    
    init(demoMode = false) {
        debugLog('🎮 GAME: ⭐ GAME.INIT() CALLED ⭐');
        debugLog('🎮 GAME: Init called with params:', {
            demoMode,
            isMultiplayer: this.isMultiplayer(),
            sessionId: this.sessionId,
            playerId: this.playerId,
            isHost: this.isHost,
            hasSocketManager: !!window.socketManager,
            socketConnected: window.socketManager?.isConnected,
            socketId: window.socketManager?.socket?.id
        });
        
        // Reset game state
        // In multiplayer, only host initializes lives - clients will receive from host
        if (!this.isMultiplayer() || this.isHost) {
            this.lives = 3;
        }
        this.score = 0;
        this.level = 1;
        this.multiplayerRound = 1; // Always start at Round 1
        this.roundTransitioning = false; // Reset round transition flag
        this.multiplayerRoundStarted = false; // Reset round started flag
        this._gameStartedHandled = false; // Reset game started handler flag
        this.asteroids = [];
        this.bullets = [];
        this.debris = [];
        this.enemies = [];
        this.gameOver = false;
        this.paused = false;
        this.demoMode = demoMode;
        
        // Create ship at appropriate position
        let shipX, shipY;
        if (this.isMultiplayer() && this.worldBounds.enabled) {
            // In multiplayer, spawn at world center
            shipX = this.worldBounds.width / 2;
            shipY = this.worldBounds.height / 2;
        } else {
            // In singleplayer, spawn at screen center
            shipX = this.canvas.width / 2;
            shipY = this.canvas.height / 2;
        }
        debugLog('🚀 INIT: Creating player ship at:', shipX, shipY, 'mode:', this.mode, 'sessionId:', this.sessionId, 'playerId:', this.playerId);
        this.ship = new Ship(shipX, shipY, this);
        
        // In multiplayer mode, ensure unique player names
        if (this.isMultiplayer() && this.playerId) {
            if (!this.ship.playerName || this.ship.playerName === 'Unknown Pilot') {
                this.ship.playerName = `Player ${this.playerId.substr(-4)}`;
            }
            this.ship.playerId = this.playerId; // Ensure ship has the player ID
            debugLog('🚀 INIT: Ship created for multiplayer player:', {
                playerId: this.ship.playerId,
                playerName: this.ship.playerName,
                position: { x: this.ship.x, y: this.ship.y },
                sessionId: this.sessionId,
                isHost: this.isHost
            });
        } else {
            debugLog('🚀 INIT: Ship created for singleplayer');
        }
        
        // Set camera to follow ship in multiplayer mode
        if (this.camera.enabled) {
            this.camera.followTarget = this.ship;
        }
        
        // Update UI
        this.updateUI();
        
        // Hide any existing game over screens
        //const gameOverScreen = document.getElementById('gameOverScreen');
        //if (gameOverScreen) gameOverScreen.style.display = 'none';
        
        const gameOverHighScoreScreen = document.getElementById('gameOverHighScoreScreen');
        if (gameOverHighScoreScreen) gameOverHighScoreScreen.style.display = 'none';
        
        // Show level message
        if (!demoMode) {
          this.showLevelMessage();
          
          // SIMPLIFIED MVP: No asteroids or enemies in multiplayer mode
          debugLog('🌍 INIT: Checking if should create game objects:', {
            isMultiplayer: this.isMultiplayer(),
            isHost: this.isHost,
            sessionId: this.sessionId,
            playerId: this.playerId,
            shouldCreate: !this.isMultiplayer()
          });
          
          if (!this.isMultiplayer()) {
            debugLog('🌍 INIT: Creating asteroids and enemies (Single Player only)');
            this.createAsteroidsForLevel();
            this.createEnemiesForLevel();
            
            debugLog('🌍 INIT: Game objects created:', {
              asteroidCount: this.asteroids.length,
              enemyCount: this.enemies.length
            });
          } else {
            debugLog('🌍 INIT: 🚀 MULTIPLAYER MVP MODE - No asteroids/enemies, just ships! 🚀');
            debugLog('🌍 INIT: Focus on ship-to-ship synchronization only');
            // Clear any existing asteroids/enemies to ensure clean multiplayer
            this.asteroids = [];
            this.enemies = [];
            this.bullets = [];
          }
          
          this.initTouchControls();
        }
        
        // Initialize multiplayer synchronization if in multiplayer mode
        if (this.isMultiplayer()) {
            debugLog('Game is in multiplayer mode - initializing sync system...');
            debugLog('Player ship details:', {
                playerName: this.ship.playerName,
                playerId: this.playerId,
                position: { x: this.ship.x, y: this.ship.y },
                isHost: this.isHost,
                sessionId: this.sessionId
            });
            this.initializeMultiplayerSync();
        }
        
        // Start game loop
        this.lastTime = performance.now() / 1000;
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    // Add these methods to the Game class
/**
 * Detect if the game is running on a mobile device
 * @returns {boolean} True if on mobile device
 */
detectMobileDevice() {
    return (
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0 ||
      window.innerWidth < 800
    );
  }
  initTouchControls() {
    // Check if touch controls script is loaded
    if (window.initTouchControls) {
      this.touchControls = window.initTouchControls(this);
      debugLog('Touch controls initialized');
    } else {
      debugLog('Touch controls not available');
      
      // If on mobile but touch controls not loaded, try to load them
      if (this.isMobileDevice) {
        this.loadTouchControlsScript();
      }
    }
  }
  
  loadTouchControlsScript() {
    const script = document.createElement('script');
    script.src = 'js/core/mobile-controls.js';
    script.onload = () => {
      debugLog('Touch controls script loaded');
      this.initTouchControls();
    };
    script.onerror = (err) => {
      console.error('Error loading touch controls script:', err);
    };
    document.head.appendChild(script);
  }
  
  cleanupTouchControls() {
    if (this.touchControls && typeof this.touchControls.cleanup === 'function') {
      this.touchControls.cleanup();
      this.touchControls = null;
    }
  }
  

    
    createEnemiesForLevel() {
        // Clear existing enemies
        this.enemies = [];
        
        // Number of enemies based on level (at least 1, and increase with level)
        const numEnemies = Math.min(1 + Math.floor(this.level / 2), 5); // Max 5 enemies
        
        for (let i = 0; i < numEnemies; i++) {
          // Ensure enemies don't spawn too close to the ship
          let x, y;
          let tooClose = true;
          
          while (tooClose) {
            x = Math.random() * this.canvas.width;
            y = Math.random() * this.canvas.height;
            
            const distance = Math.sqrt(
              Math.pow(x - this.ship.x, 2) + 
              Math.pow(y - this.ship.y, 2)
            );
            
            // Minimum distance is 25% of the screen height
            tooClose = distance < this.canvas.height * 0.25;
          }
          
          // Create a new enemy
          this.enemies.push(new Enemy(x, y, this));
        }
    }
    
    resizeCanvas() {
        // Make canvas fill the window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    initControls() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Toggle pause with P or Escape (disabled in multiplayer)
            if ((e.key === 'p' || e.key === 'Escape') && !this.isMultiplayer()) {
                this.togglePause();
            }
            
            // Toggle collision debug mode with D key
            if (e.key === 'd') {
                this.toggleCollisionDebug();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Restart button
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.init();
            });
        }
    }
    
    toggleCollisionDebug() {
        window.DEBUG_COLLISIONS = !window.DEBUG_COLLISIONS;
        debugLog("Collision debugging:", window.DEBUG_COLLISIONS ? "enabled" : "disabled");
    }
    
    gameLoop(timestamp) {
        if (this.gameOver) return;
        
        // Convert to seconds
        const currentTime = timestamp / 1000;
        let deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Cap deltaTime to prevent large jumps
        if (deltaTime > 0.1) deltaTime = 0.1;
        
        // Don't update if paused
        if (!this.paused) {
            this.accumulator += deltaTime;
            
            // Update with fixed time step
            while (this.accumulator >= this.timeStep) {
                this.update(this.timeStep);
                this.accumulator -= this.timeStep;
            }
        }
        
        // Update camera position
        this.updateCamera();
        
        // Always render
        this.render();
        
        // Continue loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    isOffScreen(obj) {
        const padding = 50; // Allow slightly off-screen before removing
        
        return (
            obj.x < -padding ||
            obj.x > this.canvas.width + padding ||
            obj.y < -padding ||
            obj.y > this.canvas.height + padding
        );
    }
    
    update(dt) {
        // Handle ship controls
        this.handleInput();

        if (this.ship && this.touchControls && this.touchControls.isActive()) {
            // Set flag to indicate touch controls are being used
            this.ship.touchControlsActive = true;
          } else if (this.ship) {
            this.ship.touchControlsActive = false;
          }
        
        // Update ship
        if (this.ship && !this.ship.exploding) {
            this.ship.update(dt);
        }
        if (window.updateTouchControls && this.ship && this.touchControls && this.touchControls.isActive()) {
            window.updateTouchControls.call(this);
          }
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(dt);
            
            // Remove bullets that have expired or gone off-screen
            if (this.bullets[i].isExpired()) {
                this.bullets.splice(i, 1);
            }
        }
        
        // Update asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            this.asteroids[i].update(dt);
        }
        
        // Update debris
        for (let i = this.debris.length - 1; i >= 0; i--) {
            this.debris[i].update(dt);
            
            // Remove debris that has expired
            if (this.debris[i].lifeTime <= 0) {
                this.debris.splice(i, 1);
            }
        }
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update(dt);
        }
        
        // Handle collisions
        this.checkCollisions();

        // Check if level/round is complete
        if (!this.demoMode && !this.ship.exploding) {
            if (this.isMultiplayer()) {
                // Multiplayer: Check round completion (host only)
                // One-time log when asteroids reach 0
                if (this.asteroids.length === 0 && !this._asteroidsZeroLogged) {
                    debugLog('⚠️ ASTEROIDS AT ZERO - Checking conditions:', {
                        isHost: this.isHost,
                        roundStarted: this.multiplayerRoundStarted,
                        asteroidsLength: this.asteroids.length,
                        transitioning: this.roundTransitioning,
                        willComplete: this.isHost && this.multiplayerRoundStarted && !this.roundTransitioning
                    });
                    this._asteroidsZeroLogged = true;
                }

                if (this.isHost &&
                    this.multiplayerRoundStarted &&
                    this.asteroids.length === 0 &&
                    !this.roundTransitioning) {
                    debugLog('🏆 HOST: Calling completeMultiplayerRound()');
                    this._asteroidsZeroLogged = false; // Reset for next round
                    this.completeMultiplayerRound();
                }
            } else {
                // Singleplayer: Check level completion
                if (this.asteroids.length === 0 && this.enemies.length === 0) {
                    this.nextLevel();
                }
            }
        }
    }
    
    handleInput() {
        if (!this.ship || this.ship.exploding) return;
        
        // Handle keyboard rotation - check key directly instead of using the window.touchActive flag
        // This ensures keyboard controls always work regardless of touch state
        if (this.keys['ArrowLeft'] || this.keys['a']) {
          this.ship.rotation = -this.ship.rotationSpeed;
          // Flag that keyboard is being used to temporarily disable touch rotation
          window.keyboardActive = true;
        } else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['f']) { // Added 'f' key support
          this.ship.rotation = this.ship.rotationSpeed;
          // Flag that keyboard is being used to temporarily disable touch rotation
          window.keyboardActive = true;
        } else {
          this.ship.rotation = 0;
          window.keyboardActive = false;
        }
        
        // Handle keyboard thrust
        if (this.keys['ArrowUp'] || this.keys['w']) {
          this.ship.thrusting = true;
        } else if (!window.touchActive) {
          // Only disable thrust if touch controls aren't active
          this.ship.thrusting = false;
        }
        
        // Shooting
        if ((this.keys['ArrowDown'] || this.keys['s'] || this.keys[' ']) && this.ship.canShoot) {
          const bullets = this.ship.shoot();
          if (bullets) {
            this.bullets = this.bullets.concat(bullets);
            
            // Broadcast shooting action in multiplayer (deterministic approach)
            if (this.isMultiplayer() && window.socketManager?.socket?.connected) {
              // Send the shoot action with ship state at time of firing
              const shootData = {
                shipX: this.ship.x,
                shipY: this.ship.y,
                shipAngle: this.ship.angle,
                shipVelocity: { x: this.ship.thrust.x, y: this.ship.thrust.y },
                weaponPoints: this.ship.weaponPoints || [],
                timestamp: Date.now()
              };
              debugLog('🔫 SENDING player-shoot:', shootData);
              window.socketManager.socket.emit('player-shoot', shootData);
            }
          }
        }
      }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw starfield background BEFORE camera transform
        if (!this.isMultiplayer()) {
            // Only draw starfield in single player mode
            this.drawStarfield();
        } else {
            // Simple starfield for multiplayer (doesn't scroll with camera)
            this.drawSimpleStarfield();
        }
        
        // Apply camera transform for multiplayer
        this.applyCameraTransform();
        
        // Draw world boundary in multiplayer mode
        if (this.worldBounds.enabled) {
            this.drawWorldBoundary();
        }
        
        // Draw ship
        if (this.ship) {
            // Add occasional debug logging for own ship
            if (!this.ownShipLogCount) this.ownShipLogCount = 0;
            this.ownShipLogCount++;
            if (this.ownShipLogCount <= 5 || this.ownShipLogCount % 300 === 0) {
                debugLog('🎨 RENDER: Drawing own ship:', {
                    x: this.ship.x,
                    y: this.ship.y,
                    rotation: this.ship.rotation,
                    playerId: this.ship.playerId,
                    playerName: this.ship.playerName,
                    alive: this.ship.alive,
                    sessionId: this.sessionId,
                    isMultiplayer: this.isMultiplayer()
                });
            }
            
            this.ship.draw(this.ctx);
            if (window.DEBUG_COLLISIONS) {
                this.ship.drawCollisionBoundaries(this.ctx);
            }
            
            // Debug: Show ship position in multiplayer mode
            if (this.isMultiplayer() && window.DEBUG_BOUNDARIES) {
                this.ctx.save();
                this.ctx.fillStyle = 'yellow';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`(${Math.round(this.ship.x)}, ${Math.round(this.ship.y)})`, this.ship.x, this.ship.y - 30);
                this.ctx.restore();
            }
        } else if (this.isMultiplayer()) {
            // Log if we're in multiplayer but don't have a ship
            if (!this.noShipLogCount) this.noShipLogCount = 0;
            this.noShipLogCount++;
            if (this.noShipLogCount <= 5 || this.noShipLogCount % 300 === 0) {
                console.error('🎨 RENDER ERROR: No ship to draw in multiplayer mode!', {
                    sessionId: this.sessionId,
                    playerId: this.playerId,
                    isHost: this.isHost,
                    isMultiplayer: this.isMultiplayer()
                });
            }
        }
        
        // Draw other players' ships (multiplayer) - simplified like test-two-ships
        if (this.isMultiplayer() && this.otherPlayers) {
            for (const playerId in this.otherPlayers) {
                const player = this.otherPlayers[playerId];
                if (player && player.visible) {  // Only draw if visible
                    this.ctx.save();
                    this.ctx.translate(player.x, player.y);
                    this.ctx.rotate(player.angle);
                    
                    // Draw custom ship if ship data is available
                    if (player.shipData && player.shipData.customLines && player.shipData.customLines.length > 0) {
                        // Draw custom ship design
                        const customLines = player.shipData.customLines;
                        const shipColor = player.shipData.color || 'white';
                        
                        this.ctx.strokeStyle = shipColor;
                        this.ctx.lineWidth = 2;
                        
                        // Draw each line of the custom ship
                        customLines.forEach(line => {
                            if (line && typeof line.startX === 'number' && typeof line.startY === 'number' && 
                                typeof line.endX === 'number' && typeof line.endY === 'number') {
                                const lineColor = line.color || shipColor;
                                this.ctx.strokeStyle = lineColor;
                                this.ctx.beginPath();
                                this.ctx.moveTo(line.startX * 0.25, line.startY * 0.25);
                                this.ctx.lineTo(line.endX * 0.25, line.endY * 0.25);
                                this.ctx.stroke();
                            }
                        });
                        
                        // Draw custom thruster points if thrusting
                        if (player.thrusting && player.shipData.thrusterPoints) {
                            player.shipData.thrusterPoints.forEach(point => {
                                // Draw thruster flame
                                const flicker = Math.random() * 0.3 + 0.7;
                                const length = 15 * 0.6 * flicker;
                                const width = 15 * 0.3 * flicker;
                                
                                this.ctx.fillStyle = 'orange';
                                this.ctx.beginPath();
                                this.ctx.moveTo(point.x * 0.25, point.y * 0.25);
                                this.ctx.lineTo(point.x * 0.25 - width / 2, point.y * 0.25 + length);
                                this.ctx.lineTo(point.x * 0.25 + width / 2, point.y * 0.25 + length);
                                this.ctx.closePath();
                                this.ctx.fill();
                            });
                        }
                    } else {
                        // Draw default ship shape (corrected orientation to match Ship class)
                        // Use the player's ship color if available, otherwise default to cyan
                        this.ctx.strokeStyle = player.shipData?.color || 'cyan';
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, -15); // Nose pointing up
                        this.ctx.lineTo(-10.5, 10.5); // Bottom left
                        this.ctx.lineTo(10.5, 10.5); // Bottom right
                        this.ctx.closePath();
                        this.ctx.stroke();
                        
                        // Draw thruster if active
                        if (player.thrusting) {
                            this.ctx.strokeStyle = '#ffaa00';
                            this.ctx.beginPath();
                            this.ctx.moveTo(-5, -4);
                            this.ctx.lineTo(-15, 0);
                            this.ctx.lineTo(-5, 4);
                            this.ctx.stroke();
                        }
                    }
                    
                    this.ctx.restore();
                    
                    // Draw player name above ship
                    this.ctx.save();
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '14px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(player.playerName || 'Player', player.x, player.y - 20);
                    this.ctx.restore();
                }
            }
        }
        
        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
        
        // Draw asteroids
        if (this.asteroids.length > 0) {
            debugLog('🎨 RENDER: Drawing', this.asteroids.length, 'asteroids', {
                isHost: this.isHost,
                isMultiplayer: this.isMultiplayer(),
                firstAsteroidPos: this.asteroids[0] ? { x: this.asteroids[0].x, y: this.asteroids[0].y } : 'none'
            });
        }
        
        for (const asteroid of this.asteroids) {
            try {
                asteroid.draw(this.ctx);
                
                // Draw asteroid collision boundaries if debug mode is on
                if (window.DEBUG_COLLISIONS) {
                    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                    this.ctx.beginPath();
                    this.ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            } catch (error) {
                console.error('🎨 RENDER ERROR: Failed to draw asteroid:', error, asteroid);
            }
        }
        
        // Draw debris
        for (const particle of this.debris) {
            particle.draw(this.ctx);
        }
        
        // Draw enemies
        for (const enemy of this.enemies) {
            enemy.draw(this.ctx);
            
            // Draw enemy collision boundaries if debug mode is on
            if (window.DEBUG_COLLISIONS) {
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Draw collision boundaries for bullets if debug mode is on
        if (window.DEBUG_COLLISIONS) {
            for (const bullet of this.bullets) {
                this.ctx.strokeStyle = bullet.source === 'enemy' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Remove camera transform before drawing HUD
        this.removeCameraTransform();
        
        // Draw HUD (not affected by camera)
        this.drawHUD();
        
        // Draw debug info if enabled
        if (window.DEBUG_COLLISIONS) {
            this.drawDebugInfo();
        }
        
        // Draw pause overlay if paused
        if (this.paused) {
            this.drawPauseOverlay();
        }
        
        // Draw demo mode overlay
        if (this.demoMode) {
            this.drawDemoOverlay();
        }
    }
    
    drawDebugInfo() {
        // Draw debug mode indicator
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('DEBUG MODE: Press D to toggle', 20, this.canvas.height - 20);
        
        // Draw ship info if available
        if (this.ship) {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            this.ctx.fillText(`Ship type: ${this.ship.shipType}, Custom lines: ${this.ship.customLines ? this.ship.customLines.length : 0}`, 20, this.canvas.height - 40);
        }
    }
    
    drawStarfield() {
        // Draw simple starfield
        this.ctx.fillStyle = 'white';
        
        // Time-based star positions for twinkling effect
        const time = performance.now() / 1000;
        const stars = 200;
        
        // Determine visible area and star distribution
        let viewWidth, viewHeight, offsetX, offsetY;
        
        if (this.camera.enabled && this.worldBounds.enabled) {
            // In multiplayer mode with camera - use world bounds for star distribution
            viewWidth = this.worldBounds.width;
            viewHeight = this.worldBounds.height;
            offsetX = 0;
            offsetY = 0;
        } else {
            // In singleplayer mode - use canvas dimensions
            viewWidth = this.canvas.width;
            viewHeight = this.canvas.height;
            offsetX = 0;
            offsetY = 0;
        }
        
        for (let i = 0; i < stars; i++) {
            // Use a seeded random based on star index for consistent positions
            const x = offsetX + (Math.sin(i * 123.45) * 0.5 + 0.5) * viewWidth;
            const y = offsetY + (Math.cos(i * 678.91) * 0.5 + 0.5) * viewHeight;
            
            // Only draw stars that are visible in the current view
            if (this.camera.enabled) {
                // Check if star is within the camera's view
                const screenX = x - this.camera.x;
                const screenY = y - this.camera.y;
                
                if (screenX < -10 || screenX > this.canvas.width + 10 || 
                    screenY < -10 || screenY > this.canvas.height + 10) {
                    continue; // Skip stars outside visible area
                }
            }
            
            // Twinkle effect - vary star size based on time
            const twinkle = 0.5 + 0.5 * Math.sin(time + i * 0.1);
            const size = 0.5 + twinkle * 1.5;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawSimpleStarfield() {
        // Simple starfield for multiplayer that doesn't move with camera
        // Each player gets their own random starfield
        if (!this.starPositions) {
            this.starPositions = [];
            const numStars = 100;
            for (let i = 0; i < numStars; i++) {
                this.starPositions.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * 2 + 0.5,
                    twinkleOffset: Math.random() * Math.PI * 2
                });
            }
        }
        
        const time = performance.now() / 1000;
        this.ctx.fillStyle = 'white';
        
        this.starPositions.forEach(star => {
            const twinkle = 0.7 + 0.3 * Math.sin(time * 2 + star.twinkleOffset);
            const size = star.size * twinkle;
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawHUD() {
        if (this.isMultiplayer()) {
            this.drawMultiplayerHUD();
        } else {
            this.drawSinglePlayerHUD();
        }
    }

    drawSinglePlayerHUD() {
        // Draw player name if available
        if (this.ship && this.ship.playerName) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Pilot: ${this.ship.playerName}`, 20, 30);
        }
        
        // Only draw game stats if not in demo mode
        if (!this.demoMode) {
            // Score
            this.ctx.fillStyle = 'white';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Score: ${this.score}`, this.canvas.width - 20, 30);
            
            // Lives
            this.ctx.fillText(`Lives: ${this.lives}`, this.canvas.width - 20, 60);
            
            // Level
            this.ctx.fillText(`Level: ${this.level}`, this.canvas.width - 20, 90);
        }
    }

    drawMultiplayerHUD() {
        if (this.demoMode) return;

        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        
        // Top-left: Player list with individual info
        this.ctx.textAlign = 'left';
        let yPos = 25;
        
        // Current player info
        if (this.ship) {
            const playerName = this.ship.playerName || `Player ${this.playerId?.substr(-4) || ''}`;
            const shipStatus = this.ship.alive ? '✓' : '✗';
            this.ctx.fillStyle = this.ship.alive ? '#00ff00' : '#ff4444';
            this.ctx.fillText(`${playerName} ${shipStatus}`, 20, yPos);
            yPos += 25;
        }
        
        // Other players info
        for (const [playerId, otherPlayer] of this.players) {
            const playerName = otherPlayer.playerName || `Player ${playerId.substr(-4)}`;
            const shipStatus = otherPlayer.alive ? '✓' : '✗';
            this.ctx.fillStyle = otherPlayer.alive ? '#00ff00' : '#ff4444';
            this.ctx.fillText(`${playerName} ${shipStatus}`, 20, yPos);
            yPos += 25;
        }
        
        // Top-center: Level info (prominent)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LEVEL ${this.level}`, this.canvas.width / 2, 35);
        
        // Top-right: Game stats
        this.ctx.fillStyle = 'white';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'right';
        
        // Team score
        this.ctx.fillText(`Team Score: ${this.score}`, this.canvas.width - 20, 30);
        
        // Shared lives
        this.ctx.fillStyle = this.lives <= 1 ? '#ff4444' : 'white';
        this.ctx.fillText(`Shared Lives: ${this.lives}`, this.canvas.width - 20, 60);
        
        // Session info
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '14px Arial';
        if (this.sessionId) {
            this.ctx.fillText(`Session: ${this.sessionId.substr(-6).toUpperCase()}`, this.canvas.width - 20, 85);
        }
        this.ctx.fillText(this.isHost ? '[HOST]' : '[CLIENT]', this.canvas.width - 20, 105);
    }
    
    drawPauseOverlay() {
        // Darken the screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pause message
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw resume instruction
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press P or ESC to resume', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
    
    drawDemoOverlay() {
        // Draw demo mode message
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DEMO MODE', this.canvas.width / 2, this.canvas.height - 60);
        
        // Draw controls hint
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText('Arrow keys or WASD to move, Space to shoot', this.canvas.width / 2, this.canvas.height - 30);
    }
    
    checkCollisions() {
        // Skip all collision checks if the ship is exploding or doesn't exist
        if (!this.ship || this.ship.exploding) {
            return;
        }
        
        // Skip collision checks in demo mode
        if (this.demoMode) return;
        
        // In multiplayer mode, only the host performs collision detection for shared objects
        // Each client still checks their own ship collisions
        const isMultiplayer = this.isMultiplayer();
        
        // Check ship collision with asteroids
        for (const asteroid of this.asteroids) {
            // Use the enhanced collision detection on the ship
            if (this.ship.checkCollision(asteroid)) {
                debugLog("Ship collided with asteroid");
                
                // Only process the hit if the ship is not invulnerable
                if (!this.ship.invulnerable) {
                    // In multiplayer, broadcast the collision to all clients
                    if (isMultiplayer) {
                        this.broadcastShipCollision('asteroid', asteroid.id, this.playerId);
                        // Don't process the hit locally - wait for the broadcast
                    } else {
                        // In singleplayer, process the hit immediately
                        if (this.ship.hit()) {
                            // We break after a successful hit to prevent multiple hits in one frame
                            break;
                        }
                    }
                } else {
                    debugLog("Ship is invulnerable, ignoring asteroid collision");
                }
            }
        }
        
        // Check ship collision with enemies
        for (const enemy of this.enemies) {
            // Use the enhanced collision detection on the ship
            if (this.ship.checkCollision(enemy)) {
                debugLog("Ship collided with enemy");
                
                // Only process the hit if the ship is not invulnerable
                if (!this.ship.invulnerable) {
                    if (this.ship.hit()) {
                        // We break after a successful hit to prevent multiple hits in one frame
                        break;
                    }
                } else {
                    debugLog("Ship is invulnerable, ignoring enemy collision");
                }
            }
        }
        
        // Process bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Check if bullet has expired or gone off-screen
            if (bullet.isExpired()) {
                this.bullets.splice(i, 1);
                continue; // Skip to next bullet
            }
            
            // If this is an enemy bullet, check for collision with the player
            if (bullet.source === 'enemy') {
                // Skip if player ship is invulnerable or exploding
                if (this.ship.invulnerable || this.ship.exploding) continue;
                
                // Use enhanced collision detection
                if (this.ship.checkCollision(bullet)) {
                    debugLog("Enemy bullet hit player ship");
                    
                    // Remove bullet
                    this.bullets.splice(i, 1);
                    
                    // Damage player
                    this.ship.hit();
                    continue; // Skip to next bullet
                }
            } 
            // If this is a player bullet, check for collisions with asteroids and enemies
            else {
                // Check against asteroids first
                let bulletDestroyed = false;
                
                for (let j = this.asteroids.length - 1; j >= 0; j--) {
                    const asteroid = this.asteroids[j];
                    
                    const distance = Math.sqrt(
                        Math.pow(bullet.x - asteroid.x, 2) + 
                        Math.pow(bullet.y - asteroid.y, 2)
                    );
                    
                    if (distance < bullet.radius + asteroid.radius) {
                        debugLog("Bullet hit asteroid");
                        
                        // Remove bullet
                        this.bullets.splice(i, 1);
                        bulletDestroyed = true;
                        
                        // If this is a mathematical asteroid, broadcast its destruction
                        if (asteroid.isMathematical && asteroid.id) {
                            this.broadcastObjectDestroyed('asteroid', asteroid.id);
                        }
                        
                        // Split asteroid
                        this.splitAsteroid(j);
                        
                        // Break asteroid loop since we removed one
                        break;
                    }
                }
                
                // Skip to next bullet if this one was destroyed
                if (bulletDestroyed) continue;
                
                // Now check against enemies
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    
                    const distance = Math.sqrt(
                        Math.pow(bullet.x - enemy.x, 2) + 
                        Math.pow(bullet.y - enemy.y, 2)
                    );
                    
                    if (distance < bullet.radius + enemy.radius) {
                        debugLog("Bullet hit enemy");
                        
                        // Remove bullet
                        this.bullets.splice(i, 1);
                        
                        // If this is a mathematical enemy, broadcast its destruction
                        if (enemy.isMathematical && enemy.id) {
                            this.broadcastObjectDestroyed('enemy', enemy.id);
                        }
                        
                        // Destroy enemy
                        this.destroyEnemy(j);
                        
                        // Mark bullet as destroyed to skip enemy loop
                        bulletDestroyed = true;
                        break;
                    }
                }
            }
        }
    }
    
    destroyEnemy(index) {
        const enemy = this.enemies[index];
        
        // Add score for destroying enemy
        this.score += 200;
        this.updateUI();
        
        // Create debris
        this.createDebrisFromEnemy(enemy);
        
        // Remove the enemy
        this.enemies.splice(index, 1);
    }
    
    createDebrisFromEnemy(enemy) {
        const numParticles = 15;
        
        for (let i = 0; i < numParticles; i++) {
            const debris = new Debris(
                enemy.x,
                enemy.y,
                Math.random() * Math.PI * 2,
                this
            );
            
            // Make enemy debris more colorful
            debris.color = i % 3 === 0 ? 'red' : (i % 3 === 1 ? 'orange' : 'yellow');
            
            this.debris.push(debris);
        }
    }
    
    splitAsteroid(index) {
        const asteroid = this.asteroids[index];

        // Add score based on asteroid size
        this.score += (4 - asteroid.size) * 100;
        this.updateUI();

        // Create debris
        this.createDebrisFromAsteroid(asteroid);

        // In multiplayer mode, asteroids are destroyed directly without splitting
        // In singleplayer mode, split into smaller asteroids if not smallest size
        if (!this.isMultiplayer() && asteroid.size > 1) {
            for (let i = 0; i < 2; i++) {
                this.asteroids.push(new Asteroid(
                    asteroid.x,
                    asteroid.y,
                    asteroid.size - 1,
                    this
                ));
            }
        }

        // Remove the original asteroid
        debugLog(`💥 Removing asteroid at index ${index}, ID: ${asteroid.id}, asteroids before: ${this.asteroids.length}`);
        this.asteroids.splice(index, 1);
        debugLog(`💥 Asteroids after removal: ${this.asteroids.length}`);
    }
    
    createDebrisFromAsteroid(asteroid) {
        const numParticles = asteroid.size * 5;
        
        for (let i = 0; i < numParticles; i++) {
            const debris = new Debris(
                asteroid.x,
                asteroid.y,
                Math.random() * Math.PI * 2,
                this
            );
            
            this.debris.push(debris);
        }
    }
    
    createDebrisFromShip() {
        const numParticles = 20;
        
        for (let i = 0; i < numParticles; i++) {
            const debris = new Debris(
                this.ship.x,
                this.ship.y,
                Math.random() * Math.PI * 2,
                this
            );
            
            // Make ship debris more colorful
            debris.color = i % 2 === 0 ? 'orange' : 'red';
            
            this.debris.push(debris);
        }
    }
    
    resetShip() {
        debugLog("Resetting ship position and properties");
        
        // Reset position to center of screen
        this.x = this.game.canvas.width / 2;
        this.y = this.game.canvas.height / 2;
        
        // Reset velocity and rotation
        this.thrust = { x: 0, y: 0 };
        this.angle = 0;
        this.rotation = 0;
        
        // Reset state flags
        this.thrusting = false;
        this.exploding = false;
        this.visible = true;
        
        // Reset shooting cooldown
        this.canShoot = true;
        this.shootTimer = 0;
        
        // Make ship temporarily invulnerable
        this.invulnerable = true;
        this.invulnerableTime = 3; // 3 seconds of invulnerability
        
        // Reset any other properties as needed
        this.blinkTime = 0;
        this.blinkOn = true;
        
        debugLog("Ship reset complete");
    }
    
    respawnShip() {
        debugLog("Respawning ship, current lives:", this.lives);
        
        // In multiplayer, only the host manages shared lives
        if (this.isMultiplayer()) {
            if (this.isHost) {
                // Host decreases shared lives and broadcasts the update
                this.lives--;
                debugLog("Host decreased shared lives to:", this.lives);
                
                // Broadcast life update to all players
                if (window.socketManager && this.sessionId) {
                    window.socketManager.socket.emit('lives-update', {
                        sessionId: this.sessionId,
                        lives: this.lives,
                        playerId: this.playerId
                    });
                }
            }
            // Non-host players will receive the life update via socket event
        } else {
            // Single player mode - decrease lives normally
            this.lives--;
        }
        
        // Update UI to show new lives count
        this.updateUI();
        
        debugLog("Lives remaining:", this.lives);
        
        // Check if game over (shared lives exhausted)
        if (this.lives <= 0) {
            debugLog("Game over - no lives remaining");
            
            if (this.isMultiplayer() && this.isHost) {
                // Host broadcasts game over to all players
                if (window.socketManager && this.sessionId) {
                    window.socketManager.socket.emit('game-over', {
                        sessionId: this.sessionId,
                        reason: 'no_lives'
                    });
                }
            }
            
            this.endGame();
            return;
        }
        
        // Reset ship
        if (this.ship) {
            this.ship.resetShip();
            this.ship.visible = true;
            this.ship.invulnerable = true;
            this.ship.invulnerableTime = 3; // 3 seconds of invulnerability
            debugLog("Ship reset and invulnerable");
            this.cleanupTouchControls();
            this.initTouchControls();
        } else {
            console.error("Ship object is null during respawn!");
            // Create a new ship if somehow it's null
            this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2, this);
            
            // Set camera to follow ship in multiplayer mode
            if (this.camera.enabled) {
                this.camera.followTarget = this.ship;
            }
            
            debugLog("Created new ship instance");
        }
    }
    
    createAsteroidsForLevel() {
        // Clear existing asteroids
        this.asteroids = [];
        
        // Number of asteroids based on level
        const numAsteroids = 2 + this.level;
        
        for (let i = 0; i < numAsteroids; i++) {
            // Ensure asteroids don't spawn too close to the ship
            let x, y;
            let tooClose = true;
            
            while (tooClose) {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
                
                const distance = Math.sqrt(
                    Math.pow(x - this.ship.x, 2) + 
                    Math.pow(y - this.ship.y, 2)
                );
                
                // Minimum distance is 20% of the screen height
                tooClose = distance < this.canvas.height * 0.2;
            }
            
            this.asteroids.push(new Asteroid(x, y, 3, this));
        }
    }
    
    nextLevel() {
        // In multiplayer, only host advances the level
        if (this.isMultiplayer() && !this.isHost) {
            return; // Non-host players will receive level updates via socket
        }
        
        this.level++;
        this.levelNumber.textContent = this.level;
        this.updateUI();
        
        // Show level message
        this.showLevelMessage();
        
        // Create asteroids and enemies for the new level
        this.createAsteroidsForLevel();
        this.createEnemiesForLevel();
        
        // In multiplayer, broadcast level completion to other players
        if (this.isMultiplayer() && this.isHost) {
            if (window.socketManager && this.sessionId) {
                window.socketManager.socket.emit('level-complete', {
                    sessionId: this.sessionId,
                    newLevel: this.level,
                    score: this.score
                });
            }
        }
    }
    
    showLevelMessage() {
        this.levelMessage.style.display = 'flex';
        
        // Hide after 2 seconds
        setTimeout(() => {
            this.levelMessage.style.display = 'none';
        }, 2000);
    }
    
    endGame() {
        this.gameOver = true;
        
        // Update UI
        const finalScore = document.getElementById('finalScore');
        if (finalScore) finalScore.textContent = this.score;
        
        // Show game over screen
        //const gameOverScreen = document.getElementById('gameOverScreen');
        //if (gameOverScreen) gameOverScreen.style.display = 'flex';
        
        // Also trigger high score entry if appropriate
        this.checkHighScore();
    }
    
    checkHighScore() {
        // Get existing high scores
        let highScores = localStorage.getItem('asteroids_highScores');
        
        if (highScores) {
            highScores = JSON.parse(highScores);
        } else {
            highScores = [];
        }
        
        // Check if current score qualifies as a high score
        const isHighScore = highScores.length < 10 || this.score > highScores[highScores.length - 1].score;
        
        if (isHighScore) {
            // Show high score entry screen
            const gameOverHighScoreScreen = document.getElementById('gameOverHighScoreScreen');
            const finalGameScore = document.getElementById('finalGameScore');
            const highScoreNameInput = document.getElementById('highScoreNameInput');
            
            if (gameOverHighScoreScreen && finalGameScore && highScoreNameInput) {
                gameOverHighScoreScreen.style.display = 'flex';
                finalGameScore.textContent = this.score;
                
                // Auto-fill name if ship has a name
                if (this.ship && this.ship.playerName && this.ship.playerName !== 'Unknown Pilot') {
                    highScoreNameInput.value = this.ship.playerName;
                }
            }
        }
    }
    
    saveHighScore(name) {
        // Get existing high scores
        let highScores = localStorage.getItem('asteroids_highScores');
        
        if (highScores) {
            highScores = JSON.parse(highScores);
        } else {
            highScores = [];
        }
        
        // Add current score
        highScores.push({
            name: name,
            score: this.score,
            date: new Date().toISOString(),
            ship: this.ship ? {
                type: this.ship.shipType,
                color: this.ship.color,
                customLines: this.ship.customLines.length,
                passphrase: (this.ship.passphrase || null)
            } : null
        });
        
        // Sort and keep top 10
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 10);
        
        // Save back to localStorage
        localStorage.setItem('asteroids_highScores', JSON.stringify(highScores));
    }
    
    togglePause() {
        this.paused = !this.paused;
    }
    
    updateUI() {
        const scoreElement = document.getElementById('score');
        const livesElement = document.getElementById('lives');
        const levelElement = document.getElementById('level');
        
        if (scoreElement) scoreElement.textContent = this.score;
        if (livesElement) livesElement.textContent = this.lives;
        if (levelElement) levelElement.textContent = this.level;
    }
    
    // Game mode configuration methods
    setGameMode(mode, worldConfig = null) {
        this.mode = mode;
        
        if (mode === 'multiplayer' && worldConfig) {
            this.worldBounds.enabled = true;
            this.worldBounds.width = worldConfig.width || 2000;
            this.worldBounds.height = worldConfig.height || 1500;
            
            // Enable camera system for multiplayer
            this.camera.enabled = true;
            this.camera.followTarget = null; // Will be set to ship after creation
            
            // Initialize multiplayer sync system
            this.initializeMultiplayerSync();
            
            // Schedule object spawning for multiplayer
            debugLog('🎮 MULTIPLAYER MODE: Scheduling spawn in 2 seconds...');
            setTimeout(() => {
                debugLog('🎮 MULTIPLAYER MODE: Calling forceSpawnTestObjects from setGameMode');
                this.forceSpawnTestObjects();
            }, 2000);
            
            debugLog(`Game mode set to multiplayer with world bounds: ${this.worldBounds.width}x${this.worldBounds.height}`);
        } else {
            this.worldBounds.enabled = false;
            this.camera.enabled = false;
            this.camera.x = 0;
            this.camera.y = 0;
            debugLog('Game mode set to singleplayer (screen wrapping enabled)');
        }
    }
    
    isMultiplayer() {
        return this.mode === 'multiplayer';
    }
    
    isSinglePlayer() {
        return this.mode === 'singleplayer';
    }
    
    getWorldBounds() {
        return this.worldBounds;
    }
    
    // Check if a position is within world bounds
    isWithinBounds(x, y) {
        if (!this.worldBounds.enabled) return true;
        
        return x >= 0 && x <= this.worldBounds.width && 
               y >= 0 && y <= this.worldBounds.height;
    }
    
    // Clamp position to world bounds
    clampToBounds(x, y) {
        if (!this.worldBounds.enabled) return { x, y };
        
        return {
            x: Math.max(0, Math.min(this.worldBounds.width, x)),
            y: Math.max(0, Math.min(this.worldBounds.height, y))
        };
    }

    // Update camera position
    updateCamera() {
        if (!this.camera.enabled || !this.camera.followTarget) return;

        // Determine camera behavior based on screen size vs world size
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const worldWidth = this.worldBounds.width;
        const worldHeight = this.worldBounds.height;

        // If screen is big enough to show entire world, center the world on screen
        if (canvasWidth >= worldWidth && canvasHeight >= worldHeight) {
            // Center the world on the screen
            this.camera.x = (canvasWidth - worldWidth) / 2;
            this.camera.y = (canvasHeight - worldHeight) / 2;
        } else {
            // Screen is smaller - follow the ship with camera
            const targetX = this.camera.followTarget.x;
            const targetY = this.camera.followTarget.y;
            
            // Calculate desired camera position (center ship on screen)
            const desiredCameraX = -(targetX - canvasWidth / 2);
            const desiredCameraY = -(targetY - canvasHeight / 2);
            
            // Smooth camera movement
            this.camera.x += (desiredCameraX - this.camera.x) * this.camera.smoothing;
            this.camera.y += (desiredCameraY - this.camera.y) * this.camera.smoothing;
            
            // Clamp camera to prevent showing outside world bounds
            this.camera.x = Math.max(-(worldWidth - canvasWidth), Math.min(0, this.camera.x));
            this.camera.y = Math.max(-(worldHeight - canvasHeight), Math.min(0, this.camera.y));
        }
    }

    // Apply camera transform to context
    applyCameraTransform() {
        if (this.camera.enabled) {
            this.ctx.save();
            this.ctx.translate(this.camera.x, this.camera.y);
        }
    }

    // Remove camera transform from context
    removeCameraTransform() {
        if (this.camera.enabled) {
            this.ctx.restore();
        }
    }

    // Draw world boundary
    drawWorldBoundary() {
        this.ctx.save();
        
        // Draw main boundary
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(0, 0, this.worldBounds.width, this.worldBounds.height);
        
        // Draw corner markers
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        const markerSize = 10;
        
        // Top-left corner
        this.ctx.fillRect(0, 0, markerSize, markerSize);
        
        // Top-right corner
        this.ctx.fillRect(this.worldBounds.width - markerSize, 0, markerSize, markerSize);
        
        // Bottom-left corner
        this.ctx.fillRect(0, this.worldBounds.height - markerSize, markerSize, markerSize);
        
        // Bottom-right corner
        this.ctx.fillRect(this.worldBounds.width - markerSize, this.worldBounds.height - markerSize, markerSize, markerSize);
        
        // Add coordinate labels
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        // World size label
        this.ctx.fillText(`World: ${this.worldBounds.width}x${this.worldBounds.height}`, 10, 25);
        
        // Camera position (if enabled)
        if (this.camera.enabled) {
            this.ctx.fillText(`Camera: ${Math.round(-this.camera.x)}, ${Math.round(-this.camera.y)}`, 10, 45);
        }
        
        this.ctx.restore();
    }

    // Multiplayer synchronization methods - SIMPLIFIED VERSION
    initializeMultiplayerSync() {
        debugLog('🔧 SYNC: initializeMultiplayerSync called - USING SIMPLE APPROACH');
        
        if (!this.isMultiplayer()) {
            debugLog('Skipping multiplayer sync - not in multiplayer mode');
            return;
        }
        
        // Clean up any existing sync systems first
        this.cleanupMultiplayerSync();
        
        // Set up VERY simple sync exactly like the minimal test
        this.setupVerySimpleSync();
        
        debugLog('✅ Simple multiplayer sync initialized');
    }
    
    // Simplified ship sync that works like test-two-ships.html
    setupVerySimpleSync() {
        debugLog('🔧 Setting up simplified ship sync...');
        
        if (!window.socketManager || !window.socketManager.socket) {
            console.error('No socket manager available for sync');
            return;
        }
        
        // Ensure we have a playerId (use socket ID if not set)
        if (!this.playerId && window.socketManager.socket.id) {
            this.playerId = window.socketManager.socket.id;
            debugLog('🔧 Set playerId from socket:', this.playerId);
        }
        
        // Store other players as simple objects for rendering
        this.otherPlayers = {};
        
        // Join the session using exact approach from working demo
        if (window.socketManager.currentSessionId) {
            debugLog('🎯 Joining session for sync:', window.socketManager.currentSessionId);
            window.socketManager.socket.emit('join-simple-session', window.socketManager.currentSessionId);
        }
        
        // Broadcast ship design data (from working demo)
        if (this.ship) {
            // Build ship data from the ship's properties
            const shipData = {
                name: this.ship.playerName || 'Player',
                shipType: this.ship.shipType || 'default',
                color: this.ship.color || 'white',
                customLines: this.ship.customLines || [],
                thrusterPoints: this.ship.thrusterPoints || [],
                weaponPoints: this.ship.weaponPoints || []
            };
            
            debugLog('🚢 Broadcasting ship design data...', shipData);
            window.socketManager.socket.emit('player-ship-data', {
                shipData: shipData
            });
        }
        
        // Listen for ship design data from other players
        window.socketManager.socket.on('player-ship-data', (data) => {
            debugLog('🚢 Received ship data from player:', data.playerId, data.shipData);
            this.handlePlayerShipData(data);
        });
        
        // Listen for player position updates (exactly like working demo)
        window.socketManager.socket.on('player-update', (data) => {
            // Add player ID to data if not present
            if (!data.playerId && data.senderId) {
                data.playerId = data.senderId;
            }

            if (data.playerId && data.playerId !== this.playerId) {
                this.handleVerySimplePlayerUpdate(data);
            }
        });
        
        // Handle request for ship data from new players
        window.socketManager.socket.on('request-ship-data', (data) => {
            debugLog('🔄 Server requesting ship data for new player:', data.newPlayerId);
            if (this.ship) {
                // Build ship data from the ship's properties
                const shipData = {
                    name: this.ship.playerName || 'Player',
                    shipType: this.ship.shipType || 'default',
                    color: this.ship.color || 'white',
                    customLines: this.ship.customLines || [],
                    thrusterPoints: this.ship.thrusterPoints || [],
                    weaponPoints: this.ship.weaponPoints || []
                };
                
                window.socketManager.socket.emit('player-ship-data', {
                    shipData: shipData
                });
            }
        });
        
        // Listen for shooting actions from other players (deterministic approach)
        window.socketManager.socket.on('player-shoot', (data) => {
            debugLog('💥 RECEIVED player-shoot event:', {
                fromPlayer: data.playerId,
                myPlayer: this.playerId,
                shouldProcess: data.playerId && data.playerId !== this.playerId,
                data: data
            });
            
            if (data.playerId && data.playerId !== this.playerId) {
                debugLog('💥 Processing shot from player:', data.playerId);
                
                // Recreate the exact same bullets the other player created
                const BulletClass = window.Bullet || Bullet;
                const bullets = [];
                
                if (data.weaponPoints && data.weaponPoints.length > 0) {
                    // Multiple weapon points
                    data.weaponPoints.forEach(point => {
                        const weaponX = point.x * 0.25;
                        const weaponY = point.y * 0.25;
                        
                        // Calculate absolute position based on ship's position and rotation
                        const bulletX = data.shipX + (weaponX * Math.cos(data.shipAngle) - weaponY * Math.sin(data.shipAngle));
                        const bulletY = data.shipY + (weaponX * Math.sin(data.shipAngle) + weaponY * Math.cos(data.shipAngle));
                        
                        const bullet = new BulletClass(
                            bulletX,
                            bulletY,
                            data.shipAngle,
                            data.shipVelocity.x,
                            data.shipVelocity.y,
                            this,
                            'other',
                            data.weaponPoints.length,
                            data.playerId
                        );
                        bullets.push(bullet);
                    });
                } else {
                    // Single weapon point (default)
                    const bulletX = data.shipX + Math.sin(data.shipAngle) * 15; // 15 is ship radius
                    const bulletY = data.shipY - Math.cos(data.shipAngle) * 15;
                    
                    const bullet = new BulletClass(
                        bulletX,
                        bulletY,
                        data.shipAngle,
                        data.shipVelocity.x,
                        data.shipVelocity.y,
                        this,
                        'other',
                        1,
                        data.playerId
                    );
                    bullets.push(bullet);
                }
                
                // Add all bullets to the game
                debugLog('💥 Adding', bullets.length, 'bullets to game');
                this.bullets = this.bullets.concat(bullets);
                debugLog('💥 Total bullets now:', this.bullets.length);
            }
        });
        
        // Send position updates every 50ms - single timer like test-two-ships
        if (this.simpleUpdateTimer) {
            clearInterval(this.simpleUpdateTimer);
        }
        
        this.simpleUpdateTimer = setInterval(() => {
            if (this.ship && window.socketManager?.socket?.connected) {
                const updateData = {
                    x: this.ship.x,
                    y: this.ship.y,
                    angle: this.ship.angle,
                    thrusting: this.ship.thrusting,
                    vx: this.ship.thrust.x,  // Fixed: ship uses thrust, not velocity
                    vy: this.ship.thrust.y,  // Fixed: ship uses thrust, not velocity
                    playerName: this.ship.playerName || 'Player',
                    visible: this.ship.visible  // Include visibility state
                };
                window.socketManager.socket.emit('player-update', updateData);
            }
        }, 50); // 20 FPS like test-two-ships
        
        debugLog('✅ Working ship sync setup complete');
    }
    
    handleVerySimplePlayerUpdate(data) {
        // Store other players as simple objects like test-two-ships.html
        if (!this.otherPlayers) {
            this.otherPlayers = {};
        }
        
        // Update or create player data - simple update without complex state preservation
        this.otherPlayers[data.playerId] = {
            x: data.x,
            y: data.y,
            angle: data.angle,
            thrusting: data.thrusting || false,
            vx: data.vx || 0,
            vy: data.vy || 0,
            playerName: data.playerName || data.playerId.substr(-6),
            shipData: this.otherPlayers[data.playerId]?.shipData || null,
            visible: data.visible !== undefined ? data.visible : true  // Use the visibility state from the update
        };

        // Track player without logging
        if (!this.otherPlayers[data.playerId]?.logged) {
            this.otherPlayers[data.playerId].logged = true;
        }
    }

    // Simple sync methods that work like the minimal test
    setupSimpleGameSync() {
        if (!window.socketManager || !window.socketManager.socket) {
            console.error('No socket manager available for simple sync');
            return;
        }

        debugLog('🔧 Setting up SIMPLE game sync events...');

        // Use simple session join like minimal test
        if (this.sessionId) {
            debugLog('🎯 Joining simple session:', this.sessionId);
            window.socketManager.socket.emit('join-simple-session', this.sessionId);
        }

        // Note: player-update handler already set up in setupVerySimpleMultiplayerSync
        // No need to duplicate it here

        // Handle game object updates (asteroids, enemies) - DISABLED FOR MINIMAL VERSION
        // window.socketManager.socket.on('game-objects-update', (data) => {
        //     if (data.senderId !== this.playerId) {
        //         this.handleGameObjectsUpdate(data);
        //     }
        // });

        // Handle session joined confirmation
        window.socketManager.socket.on('session-joined', (data) => {
            debugLog('✅ Simple session joined:', data);
        });

        debugLog('✅ Simple game sync events registered');
    }

    setupSimpleSyncTimers() {
        debugLog('🔧 Setting up SIMPLE sync timers...');

        // Send player (ship) updates every 50ms like minimal test
        this.playerSyncTimer = setInterval(() => {
            if (this.ship && window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
                this.broadcastSimplePlayerUpdate();
            } else {
                console.warn('⚠️ Cannot broadcast player update:', {
                    hasShip: !!this.ship,
                    hasSocketManager: !!window.socketManager,
                    hasSocket: !!(window.socketManager && window.socketManager.socket),
                    isConnected: !!(window.socketManager && window.socketManager.socket && window.socketManager.socket.connected),
                    playerId: this.playerId
                });
            }
        }, 50);

        // Send game objects (asteroids, enemies) updates every 100ms - DISABLED FOR MINIMAL VERSION
        // this.gameObjectsSyncTimer = setInterval(() => {
        //     if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        //         this.broadcastGameObjectsUpdate();
        //     }
        // }, 100);

        debugLog('✅ Simple sync timers started');
        
        // Send an immediate test message to verify connection
        setTimeout(() => {
            if (this.ship && window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
                debugLog('🧪 Sending test player update to verify connection...');
                const testData = {
                    playerId: this.playerId,
                    x: this.ship.x,
                    y: this.ship.y,
                    angle: this.ship.angle,
                    velocity: this.ship.thrust,
                    thrusting: false,
                    alive: true,
                    playerName: 'TestPlayer'
                };
                window.socketManager.socket.emit('player-update', testData);
                debugLog('🧪 Test update sent with data:', testData);
            } else {
                console.error('🧪 Cannot send test update - connection not ready');
            }
        }, 1000);
    }

    broadcastSimplePlayerUpdate() {
        if (!this.ship) return;

        const playerData = {
            playerId: this.playerId,
            x: this.ship.x,
            y: this.ship.y,
            angle: this.ship.angle,
            velocity: this.ship.thrust,
            thrusting: this.ship.thrusting,
            alive: this.ship.alive,
            playerName: this.ship.playerName || 'Player'
        };

        // Add occasional debug logging
        if (!this.broadcastCount) this.broadcastCount = 0;
        this.broadcastCount++;
        if (this.broadcastCount <= 5 || this.broadcastCount % 60 === 0) { // Log first 5 and every 3 seconds at 20fps
            debugLog('📡 Broadcasting player data:', {
                playerId: this.playerId,
                position: `(${Math.round(this.ship.x)}, ${Math.round(this.ship.y)})`,
                thrusting: this.ship.thrusting
            });
        }

        window.socketManager.socket.emit('player-update', playerData);
    }

    broadcastGameObjectsUpdate() {
        const gameData = {
            senderId: this.playerId,
            asteroids: this.asteroids.map(asteroid => ({
                x: asteroid.x,
                y: asteroid.y,
                velocity: asteroid.velocity,
                rotation: asteroid.rotation,
                size: asteroid.size
            })),
            enemies: this.enemies.map(enemy => ({
                x: enemy.x,
                y: enemy.y,
                velocity: enemy.velocity,
                rotation: enemy.rotation,
                health: enemy.health
            })),
            bullets: this.bullets.map(bullet => ({
                x: bullet.x,
                y: bullet.y,
                velocity: bullet.velocity,
                playerId: bullet.playerId
            }))
        };

        window.socketManager.socket.emit('game-objects-update', gameData);
    }

    handleSimplePlayerUpdate(data) {
        debugLog('🎮 Received simple player update:', {
            playerId: data.playerId,
            position: `(${Math.round(data.x)}, ${Math.round(data.y)})`,
            angle: Math.round(data.angle * 180 / Math.PI),
            thrusting: data.thrusting,
            myPlayerId: this.playerId
        });

        // Don't update our own ship
        if (data.playerId === this.playerId) {
            debugLog('🎮 Ignoring own player update');
            return;
        }

        // Create or update other player's ship
        if (!this.players.has(data.playerId)) {
            const otherShip = new Ship(data.x, data.y, this);
            otherShip.playerId = data.playerId;
            otherShip.playerName = data.playerName;
            otherShip.isOtherPlayer = true;
            this.players.set(data.playerId, otherShip);
            debugLog('✅ Created new player ship:', data.playerId, 'at', `(${Math.round(data.x)}, ${Math.round(data.y)})`);
        }

        const otherShip = this.players.get(data.playerId);
        if (otherShip) {
            otherShip.x = data.x;
            otherShip.y = data.y;
            otherShip.angle = data.angle;
            otherShip.thrust = data.velocity;
            otherShip.thrusting = data.thrusting;
            otherShip.alive = data.alive;
        }
    }

    handleGameObjectsUpdate(data) {
        debugLog('🌍 Received game objects update from:', data.senderId);

        // Update asteroids
        this.syncSimpleAsteroids(data.asteroids);
        
        // Update enemies  
        this.syncSimpleEnemies(data.enemies);
        
        // Update bullets
        this.syncSimpleBullets(data.bullets);
    }

    syncSimpleAsteroids(asteroidData) {
        // Simple replacement - in production could be more sophisticated
        this.asteroids = asteroidData.map(data => {
            const asteroid = new Asteroid(data.x, data.y, data.size, this);
            asteroid.velocity = data.velocity;
            asteroid.rotation = data.rotation;
            return asteroid;
        });
    }

    syncSimpleEnemies(enemyData) {
        this.enemies = enemyData.map(data => {
            const enemy = new Enemy(data.x, data.y, this);
            enemy.velocity = data.velocity;
            enemy.rotation = data.rotation;
            enemy.health = data.health;
            return enemy;
        });
    }

    syncSimpleBullets(bulletData) {
        this.bullets = bulletData.map(data => {
            const bullet = new Bullet(data.x, data.y, data.velocity.x, data.velocity.y, this, data.playerId);
            return bullet;
        });
    }

    setupSyncTimers() {
        debugLog('Setting up sync timers...');
        debugLog('Sync interval:', this.syncInterval, 'ms');
        
        // Send player state updates at 20 FPS
        this.syncTimer = setInterval(() => {
            try {
                if (this.ship && window.socketManager && window.socketManager.isConnected && window.socketManager.currentSessionId) {
                    this.broadcastPlayerState();
                } else {
                    debugLog('Skipping player broadcast:', {
                        hasShip: !!this.ship,
                        hasSocketManager: !!window.socketManager,
                        isConnected: window.socketManager?.isConnected,
                        hasSession: !!window.socketManager?.currentSessionId
                    });
                }
            } catch (error) {
                console.error('Error in player state broadcast:', error);
            }
        }, this.syncInterval);

        // Send game state updates (host only) at 10 FPS  
        this.gameStateTimer = setInterval(() => {
            try {
                debugLog('🔄 TIMER: Game state timer tick - Host check:', {
                    isHost: this.isHost,
                    hasSocketManager: !!window.socketManager,
                    isConnected: window.socketManager?.isConnected,
                    sessionId: this.sessionId,
                    asteroidCount: this.asteroids?.length || 0,
                    enemyCount: this.enemies?.length || 0
                });
                
                if (this.isHost && window.socketManager && window.socketManager.isConnected && window.socketManager.currentSessionId) {
                    if (!this.hostBroadcastCount) this.hostBroadcastCount = 0;
                    this.hostBroadcastCount++;
                    
                    if (this.hostBroadcastCount % 100 === 0) { // Every 10 seconds
                        debugLog('🌍 TIMER: HOST broadcasting game state...', {
                            broadcastCount: this.hostBroadcastCount,
                            asteroids: this.asteroids.length,
                            enemies: this.enemies.length,
                            connectedPlayers: this.players.size
                        });
                    }
                    this.broadcastGameState();
                } else if (this.isHost) {
                    debugLog('🌍 TIMER: Host skipping game state broadcast:', {
                        hasSocketManager: !!window.socketManager,
                        isConnected: window.socketManager?.isConnected,
                        hasSession: !!window.socketManager?.currentSessionId
                    });
                } else {
                    if (!this.clientReceiveCheck) this.clientReceiveCheck = 0;
                    this.clientReceiveCheck++;
                    
                    if (this.clientReceiveCheck % 100 === 0) { // Every 10 seconds
                        debugLog('🔔 TIMER: Non-host client heartbeat - waiting for host broadcasts...', {
                            checkCount: this.clientReceiveCheck,
                            lastSyncNumber: this.syncCounter || 0,
                            timeSinceLastSync: this.lastSyncTime ? (Date.now() - this.lastSyncTime) + 'ms' : 'never'
                        });
                    }
                }
            } catch (error) {
                console.error('Error in game state broadcast:', error);
            }
        }, this.syncInterval * 2);
        
        debugLog('Sync timers set up successfully');
    }

    cleanupMultiplayerSync() {
        debugLog('🧹 CLEANUP: Cleaning up multiplayer sync systems...');
        
        // Clear existing timers
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            debugLog('🧹 CLEANUP: Cleared sync timer');
        }
        
        if (this.gameStateTimer) {
            clearInterval(this.gameStateTimer);
            this.gameStateTimer = null;
            debugLog('🧹 CLEANUP: Cleared game state timer');
        }

        // Clear simple timers
        if (this.playerSyncTimer) {
            clearInterval(this.playerSyncTimer);
            this.playerSyncTimer = null;
            debugLog('🧹 CLEANUP: Cleared player sync timer');
        }
        
        if (this.simpleUpdateTimer) {
            clearInterval(this.simpleUpdateTimer);
            this.simpleUpdateTimer = null;
            debugLog('🧹 CLEANUP: Cleared simple update timer');
        }

        if (this.gameObjectsSyncTimer) {
            clearInterval(this.gameObjectsSyncTimer);
            this.gameObjectsSyncTimer = null;
            debugLog('🧹 CLEANUP: Cleared game objects sync timer');
        }
        
        // Reset counters
        this.syncCounter = 0;
        this.lastSyncTime = null;
        this.hostBroadcastCount = 0;
        this.clientReceiveCheck = 0;
        
        debugLog('🧹 CLEANUP: Multiplayer sync cleanup completed');
    }

    setupGameSyncEvents() {
        debugLog('Setting up game sync events, hasSocketManager:', !!window.socketManager);
        
        if (!window.socketManager) {
            console.error('Cannot setup game sync events - no socket manager');
            return;
        }

        // Only register handlers if they don't exist yet (prevent duplicates but don't clean up working handlers)
        debugLog('Checking existing socket event handlers...');
        if (this.handlersRegistered) {
            debugLog('Handlers already registered, skipping setup');
            return;
        }

        debugLog('Registering new socket event handlers...');

        // Store handler references for cleanup
        this.playerStateHandler = (data) => {
            this.handlePlayerStateUpdate(data);
        };
        window.socketManager.on('player-update', this.playerStateHandler);

        // Handle game state updates from host
        debugLog('🔧 EVENT: Registering game-objects-update handler');
        this.gameStateHandler = (data) => {
            debugLog('🚨 CLIENT: ⭐ RECEIVED GAME-STATE-UPDATE EVENT! ⭐', {
                hasData: !!data,
                sessionId: data?.sessionId,
                mySessionId: this.sessionId,
                sessionMatch: data?.sessionId === this.sessionId,
                asteroidCount: data?.asteroids?.length || 0,
                enemyCount: data?.enemies?.length || 0,
                bulletCount: data?.bullets?.length || 0,
                currentIsHost: this.isHost,
                timestamp: new Date().toISOString()
            });
            this.handleGameStateUpdate(data);
        };
        window.socketManager.on('game-objects-update', this.gameStateHandler);

        // Handle player disconnections
        this.playerDisconnectedHandler = (data) => {
            this.handlePlayerDisconnected(data);
        };
        window.socketManager.on('player-disconnected', this.playerDisconnectedHandler);

        // Handle new player joins
        this.playerJoinedHandler = (data) => {
            this.handlePlayerJoined(data);
        };
        window.socketManager.on('player-joined', this.playerJoinedHandler);

        // Handle shared lives updates
        this.livesUpdateHandler = (data) => {
            this.handleLivesUpdate(data);
        };
        window.socketManager.on('lives-update', this.livesUpdateHandler);

        // Handle game over events
        window.socketManager.on('game-over', (data) => {
            this.handleGameOver(data);
        });

        // Handle level completion
        window.socketManager.on('level-complete', (data) => {
            this.handleLevelComplete(data);
        });

        // Handle ship data sharing (like custom-ships-minimal.html)
        window.socketManager.on('player-ship-data', (data) => {
            this.handlePlayerShipData(data);
        });

        window.socketManager.on('request-ship-data', (data) => {
            this.handleRequestShipData(data);
        });

        // Handle multiplayer game start
        window.socketManager.on('game-started', (data) => {
            debugLog('🎮 GAME: ⭐ MULTIPLAYER GAME STARTED! ⭐', data);
            this.handleGameStarted(data);
        });
        
        // Handle asteroid spawning (deterministic)
        window.socketManager.socket.on('asteroid-spawn', (data) => {
            this.handleAsteroidSpawn(data);
        });
        
        // Handle enemy updates (host-authoritative)
        window.socketManager.socket.on('enemies-update', (data) => {
            this.handleEnemiesUpdate(data);
        });
        
        // Handle enemy shooting
        window.socketManager.socket.on('enemy-shoot', (data) => {
            this.handleEnemyShoot(data.enemyId);
        });
        
        // Handle mathematical objects spawn
        window.socketManager.socket.on('math-objects-spawn', (data) => {
            this.handleMathObjectsSpawn(data);
        });
        
        // Handle mathematical object destruction
        window.socketManager.socket.on('math-objects-destroyed', (data) => {
            this.handleMathObjectDestroyed(data);
        });

        // Handle ship collision events from other clients
        window.socketManager.socket.on('ship-collision', (data) => {
            this.handleShipCollision(data);
        });

        // Handle round transitions (multiplayer round progression)
        window.socketManager.socket.on('round-transition', (data) => {
            this.handleRoundTransition(data);
        });

        // Handle multiplayer game completion (all rounds finished)
        window.socketManager.socket.on('multiplayer-game-complete', (data) => {
            this.handleMultiplayerGameComplete(data);
        });

        // Mark handlers as registered
        this.handlersRegistered = true;
        debugLog('Game sync events registered successfully');
    }

    handleGameStarted(data) {
        debugLog('🎮 GAME: *** GAME STARTED EVENT TRIGGERED ***', data);

        // Guard against multiple calls - only process once per game session
        if (this._gameStartedHandled) {
            debugLog('🎮 GAME: handleGameStarted already processed, skipping duplicate call');
            return;
        }
        this._gameStartedHandled = true;

        // Ensure game is in multiplayer mode
        if (!this.isMultiplayer()) {
            debugLog('🎮 GAME: Setting up multiplayer mode for game start...');
            this.mode = 'multiplayer';
        }

        debugLog('🎮 GAME: Player status:', {
            isHost: this.isHost,
            playerId: this.playerId,
            sessionId: this.sessionId,
            shipPosition: { x: this.ship?.x, y: this.ship?.y }
        });

        // Clear any game objects to start fresh
        this.asteroids = [];
        this.enemies = [];
        this.otherEnemies = {}; // Store enemy states from host

        // Update UI to show Round 1
        if (this.levelNumber) {
            this.levelNumber.textContent = `Round ${this.multiplayerRound}`;
        }

        // Schedule initial spawn with delay for client sync
        setTimeout(() => {
            // Double-check we haven't already spawned (in case forceSpawnTestObjects ran)
            if (this.asteroids.length > 0 && this.asteroids.some(a => a.isMathematical)) {
                debugLog('🎮 GAME: Asteroids already exist, skipping spawn but setting multiplayerRoundStarted');
                this.multiplayerRoundStarted = true;
                return;
            }

            // Host spawns initial asteroids FIRST
            if (this.isHost) {
                this.spawnMultiplayerRoundAsteroids(this.multiplayerRound);

                // Broadcast Round 1 announcement to clients
                if (window.socketManager?.socket?.connected) {
                    window.socketManager.socket.emit('round-transition', {
                        round: this.multiplayerRound,
                        timestamp: Date.now(),
                        isInitial: true
                    });
                }
            }

            // THEN mark round as started (after asteroids are spawned)
            this.multiplayerRoundStarted = true;
            debugLog('🎮 GAME: multiplayerRoundStarted set to TRUE');

            // Show round message
            if (this.levelMessage) {
                this.levelMessage.style.display = 'flex';
                setTimeout(() => {
                    this.levelMessage.style.display = 'none';
                }, 2000);
            }
        }, 2000); // Give time for session setup to complete

        // Note: Game loop should already be running from init()
        // Do NOT call gameLoop() directly here - it causes NaN timestamp issues
    }

    broadcastPlayerState() {
        if (!this.ship || !window.socketManager || !this.sessionId || !window.socketManager.isConnected || !window.socketManager.currentSessionId) {
            // Reduced logging for player state broadcast
            return;
        }

        // Additional safety checks for ship properties
        if (typeof this.ship.x !== 'number' || typeof this.ship.y !== 'number') {
            debugLog('🎮 BROADCAST: Ship has invalid position:', {
                x: this.ship.x,
                y: this.ship.y,
                ship: this.ship
            });
            return;
        }

        const playerState = {
            playerId: this.playerId,
            ship: {
                x: this.ship.x || 0,
                y: this.ship.y || 0,
                angle: this.ship.angle || 0,  // Ship's facing direction
                rotation: this.ship.rotation || 0,  // Ship's rotation speed
                velocity: { 
                    x: this.ship.thrust?.x || 0, 
                    y: this.ship.thrust?.y || 0 
                },
                thrusting: this.ship.thrusting || false,
                alive: this.ship.alive !== false, // Default to true
                // Include ship customization
                customLines: this.ship.customLines || [],
                shipColor: this.ship.shipColor || 'white',
                thrusterColor: this.ship.thrusterColor || 'blue',
                thrusterPoints: this.ship.thrusterPoints || [],
                weaponPoints: this.ship.weaponPoints || [],
                playerName: this.ship.playerName || `Player ${this.playerId?.substr(-4) || 'Unknown'}`
            },
            timestamp: Date.now()
        };

        // Reduce log frequency - only log every 100 broadcasts
        if (!this.broadcastCount) this.broadcastCount = 0;
        this.broadcastCount++;
        
        // Log first few broadcasts to see ship design data
        if (this.broadcastCount <= 3 || this.broadcastCount % 100 === 1) {
            debugLog('🎮 BROADCAST: Broadcasting player state:', this.playerId, 'at', this.ship.x, this.ship.y, 'session:', this.sessionId, 'ship design:', {
                customLines: this.ship.customLines?.length || 0,
                shipColor: this.ship.shipColor,
                thrusterColor: this.ship.thrusterColor,
                playerName: this.ship.playerName,
                fullCustomLines: this.broadcastCount <= 3 ? this.ship.customLines : 'logged every 100 broadcasts'
            });
        }
        
        // Use simple session approach for compatibility
        window.socketManager.socket.emit('player-update', playerState);
    }

    broadcastGameState() {
        debugLog('🌍 BROADCAST: broadcastGameState() called - initial checks:', {
            isHost: this.isHost,
            hasSocketManager: !!window.socketManager,
            hasSessionId: !!this.sessionId,
            sessionId: this.sessionId,
            isConnected: window.socketManager?.isConnected,
            socketHasSession: !!window.socketManager?.currentSessionId,
            asteroidCount: this.asteroids?.length || 0,
            enemyCount: this.enemies?.length || 0,
            bulletCount: this.bullets?.length || 0
        });
        
        if (!this.isHost || !window.socketManager || !this.sessionId || !window.socketManager.isConnected || !window.socketManager.currentSessionId) {
            debugLog('🌍 BROADCAST: Skipping game state broadcast:', {
                isHost: this.isHost,
                hasSocketManager: !!window.socketManager,
                hasSessionId: !!this.sessionId,
                sessionId: this.sessionId,
                isConnected: window.socketManager?.isConnected,
                socketHasSession: !!window.socketManager?.currentSessionId
            });
            return;
        }

        // Log array integrity before filtering
        const invalidAsteroids = this.asteroids.filter(asteroid => !asteroid || typeof asteroid.x !== 'number').length;
        const invalidEnemies = this.enemies.filter(enemy => !enemy || typeof enemy.x !== 'number').length;
        const invalidBullets = this.bullets.filter(bullet => !bullet || typeof bullet.x !== 'number').length;
        
        if (invalidAsteroids > 0 || invalidEnemies > 0 || invalidBullets > 0) {
            debugLog('🌍 BROADCAST: Found invalid objects before filtering:', {
                invalidAsteroids,
                invalidEnemies,
                invalidBullets,
                totalAsteroids: this.asteroids.length,
                totalEnemies: this.enemies.length,
                totalBullets: this.bullets.length
            });
        }

        const gameState = {
            level: this.level,
            score: this.score,
            lives: this.lives,
            asteroids: this.asteroids.filter(asteroid => asteroid && typeof asteroid.x === 'number').map(asteroid => ({
                x: asteroid.x,
                y: asteroid.y,
                velocity: { x: asteroid.velocity?.x || 0, y: asteroid.velocity?.y || 0 },
                rotation: asteroid.rotation || 0,
                size: asteroid.size || 1,
                id: asteroid.id || Math.random().toString(36).substr(2, 9)
            })),
            enemies: this.enemies.filter(enemy => enemy && typeof enemy.x === 'number').map(enemy => ({
                x: enemy.x,
                y: enemy.y,
                velocity: { x: enemy.velocity?.x || 0, y: enemy.velocity?.y || 0 },
                rotation: enemy.rotation || 0,
                health: enemy.health || 1,
                type: enemy.type || 'basic',
                id: enemy.id || Math.random().toString(36).substr(2, 9)
            })),
            bullets: this.bullets.filter(bullet => bullet && typeof bullet.x === 'number').map(bullet => ({
                x: bullet.x,
                y: bullet.y,
                velocity: { x: bullet.velocity?.x || 0, y: bullet.velocity?.y || 0 },
                playerId: bullet.playerId || 'unknown',
                id: bullet.id || Math.random().toString(36).substr(2, 9)
            })),
            timestamp: Date.now()
        };

        debugLog('🌍 BROADCAST: HOST broadcasting game state to session', this.sessionId, ':', {
            asteroids: this.asteroids.length,
            enemies: this.enemies.length,
            bullets: this.bullets.length,
            level: this.level,
            score: this.score,
            lives: this.lives
        });
        // Use simple session approach for compatibility
        window.socketManager.socket.emit('game-objects-update', gameState);
    }

    handlePlayerStateUpdate(data) {
        // Silently ignore own updates
        if (data.playerId === this.playerId) {
            return;
        }

        // Update or create other player's ship
        let otherPlayer = this.players.get(data.playerId);

        if (!otherPlayer) {
            // Create new player ship
            otherPlayer = this.createOtherPlayerShip(data);
            this.players.set(data.playerId, otherPlayer);
        } else {
            // Update existing player
            this.updateOtherPlayerShip(otherPlayer, data);
        }
    }

    handleGameStateUpdate(data) {
        if (this.isHost) {
            debugLog('🌍 GAME: Host ignoring game state update (as expected)');
            return; // Host doesn't receive game state updates
        }

        // Add sync counter and freeze detection
        if (!this.syncCounter) this.syncCounter = 0;
        if (!this.lastSyncTime) this.lastSyncTime = Date.now();
        
        this.syncCounter++;
        const timeSinceLastSync = Date.now() - this.lastSyncTime;
        this.lastSyncTime = Date.now();
        
        debugLog('🌍 GAME: ⭐ NON-HOST CLIENT RECEIVED GAME STATE UPDATE! ⭐', {
            syncNumber: this.syncCounter,
            timeSinceLastSync: timeSinceLastSync + 'ms',
            asteroids: data.asteroids?.length || 0,
            enemies: data.enemies?.length || 0,
            bullets: data.bullets?.length || 0,
            level: data.level,
            score: data.score,
            lives: data.lives,
            sessionId: data.sessionId,
            currentAsteroids: this.asteroids.length,
            currentEnemies: this.enemies.length,
            currentBullets: this.bullets.length,
            isHost: this.isHost,
            isMultiplayer: this.isMultiplayer()
        });
        
        // Detect freeze - if more than 5 seconds since last sync, something is wrong
        if (timeSinceLastSync > 5000) {
            console.error('🚨 FREEZE DETECTED: More than 5 seconds since last sync!', {
                lastSyncGap: timeSinceLastSync + 'ms',
                syncNumber: this.syncCounter
            });
        }

        try {
            // Update game variables
            debugLog('🌍 GAME: Updating game state variables...');
            this.level = data.level;
            this.score = data.score;
            this.lives = data.lives;

            // Update asteroids (replace with authoritative state)
            debugLog('🌍 GAME: Syncing asteroids...');
            this.syncAsteroids(data.asteroids);
            
            // Update enemies
            debugLog('🌍 GAME: Syncing enemies...');
            this.syncEnemies(data.enemies);
            
            // Update bullets
            debugLog('🌍 GAME: Syncing bullets...');
            this.syncBullets(data.bullets);

            // Update UI
            debugLog('🌍 GAME: Updating UI...');
            this.updateUI();
            
        } catch (error) {
            console.error('🚨 SYNC ERROR: Exception during game state sync!', {
                error: error.message,
                stack: error.stack,
                syncNumber: this.syncCounter,
                data: {
                    asteroids: data.asteroids?.length || 0,
                    enemies: data.enemies?.length || 0,
                    bullets: data.bullets?.length || 0
                }
            });
            
            // Don't let sync errors break the game completely
            // Continue with partial sync if possible
        }
        
        debugLog('🌍 GAME: Game state sync complete. New counts:', {
            asteroids: this.asteroids.length,
            enemies: this.enemies.length,
            bullets: this.bullets.length
        });
    }

    createOtherPlayerShip(data) {
        debugLog('🚀 SHIP: Creating other player ship:', {
            playerId: data.playerId,
            playerName: data.playerName,
            position: data.position,
            angle: data.angle,
            rawData: data
        });
        
        // Use position if available, otherwise fallback to center
        const x = data.position?.x || data.x || this.worldBounds.width / 2;
        const y = data.position?.y || data.y || this.worldBounds.height / 2;
        
        const otherShip = new Ship(x, y, this);
        otherShip.playerId = data.playerId;
        otherShip.playerName = data.playerName || `Player ${data.playerId.substr(-4)}`;
        
        // Set ship rotation from the data
        otherShip.rotation = data.angle || 0;
        
        // Set ship customization - use provided data or fallbacks
        otherShip.customLines = data.customLines || [];
        otherShip.shipColor = data.shipColor || 'white';
        otherShip.thrusterColor = data.thrusterColor || 'blue';
        otherShip.thrusterPoints = data.thrusterPoints || [];
        otherShip.weaponPoints = data.weaponPoints || [];
        
        // Set initial velocity
        if (data.velocity) {
            if (!otherShip.velocity) otherShip.velocity = { x: 0, y: 0 };
            otherShip.velocity.x = data.velocity.x || 0;
            otherShip.velocity.y = data.velocity.y || 0;
        }
        
        otherShip.thrusting = data.thrusting || false;
        otherShip.isOtherPlayer = true; // Flag to prevent input handling
        otherShip.alive = data.alive !== false; // Default to true
        
        debugLog('🚀 SHIP: Other player ship created successfully for:', data.playerId, 'with rotation:', otherShip.rotation);
        return otherShip;
    }

    updateOtherPlayerShip(ship, data) {
        // Comprehensive validation
        if (!ship) {
            console.error('🚀 UPDATE ERROR: Ship object is null/undefined');
            return;
        }
        
        if (!data) {
            console.error('🚀 UPDATE ERROR: Data object is null/undefined');
            return;
        }
        
        if (!data.ship) {
            // Silently ignore - ship may be exploding or respawning
            // Only log occasionally to avoid console spam
            if (!this._shipNullLogCount) this._shipNullLogCount = 0;
            this._shipNullLogCount++;
            if (this._shipNullLogCount === 1 || this._shipNullLogCount % 300 === 0) {
                console.warn('🚀 UPDATE: Skipping update - data.ship is null (count:', this._shipNullLogCount, ')');
            }
            return;
        }

        try {
            // Safely update position with validation
            if (typeof data.ship.x === 'number' && !isNaN(data.ship.x)) {
                ship.x = data.ship.x;
            }
            if (typeof data.ship.y === 'number' && !isNaN(data.ship.y)) {
                ship.y = data.ship.y;
            }
            if (typeof data.ship.angle === 'number' && !isNaN(data.ship.angle)) {
                ship.angle = data.ship.angle;
            }
            if (typeof data.ship.rotation === 'number' && !isNaN(data.ship.rotation)) {
                ship.rotation = data.ship.rotation;
            }
            
            // Safely update thrust with comprehensive checks
            if (!ship.thrust || typeof ship.thrust !== 'object') {
                ship.thrust = { x: 0, y: 0 };
            }
            
            if (data.ship.velocity && typeof data.ship.velocity === 'object') {
                if (typeof data.ship.velocity.x === 'number' && !isNaN(data.ship.velocity.x)) {
                    ship.thrust.x = data.ship.velocity.x;
                }
                if (typeof data.ship.velocity.y === 'number' && !isNaN(data.ship.velocity.y)) {
                    ship.thrust.y = data.ship.velocity.y;
                }
            }
            
            // Update other properties with validation
            if (typeof data.ship.thrusting === 'boolean') {
                ship.thrusting = data.ship.thrusting;
            }
            if (typeof data.ship.alive === 'boolean') {
                ship.alive = data.ship.alive;
            }
            
            // Update ship customization if provided
            let designUpdated = false;
            if (Array.isArray(data.ship.customLines)) {
                ship.customLines = data.ship.customLines;
                designUpdated = true;
            }
            if (typeof data.ship.shipColor === 'string') {
                ship.shipColor = data.ship.shipColor;
                designUpdated = true;
            }
            if (typeof data.ship.thrusterColor === 'string') {
                ship.thrusterColor = data.ship.thrusterColor;
                designUpdated = true;
            }
            if (Array.isArray(data.ship.thrusterPoints)) {
                ship.thrusterPoints = data.ship.thrusterPoints;
                designUpdated = true;
            }
            if (Array.isArray(data.ship.weaponPoints)) {
                ship.weaponPoints = data.ship.weaponPoints;
                designUpdated = true;
            }
            if (typeof data.ship.playerName === 'string') {
                ship.playerName = data.ship.playerName;
            }
            
            debugLog('🚀 UPDATE: Updated player ship:', data.playerId, 'position:', ship.x, ship.y, 'rotation:', ship.rotation, 'design updated:', designUpdated, 'ship design:', {
                customLines: ship.customLines?.length || 0,
                shipColor: ship.shipColor,
                thrusterColor: ship.thrusterColor,
                playerName: ship.playerName
            });
            
        } catch (error) {
            console.error('🚀 UPDATE ERROR: Exception in updateOtherPlayerShip:', error);
            console.error('🚀 UPDATE ERROR: Ship object:', ship);
            console.error('🚀 UPDATE ERROR: Data object:', data);
        }
    }

    syncAsteroids(asteroidData) {
        debugLog('🪨 SYNC: ⭐ SYNC ASTEROIDS CALLED! ⭐', {
            dataType: typeof asteroidData,
            isArray: Array.isArray(asteroidData),
            dataLength: asteroidData?.length || 0,
            currentAsteroids: this.asteroids.length,
            isHost: this.isHost,
            isMultiplayer: this.isMultiplayer()
        });
        
        if (!Array.isArray(asteroidData)) {
            console.error('🪨 SYNC ERROR: asteroidData is not an array:', typeof asteroidData, asteroidData);
            return;
        }
        
        debugLog('🪨 SYNC: Raw asteroid data:', asteroidData.slice(0, 2)); // Show first 2 asteroids
        debugLog('🪨 SYNC: Current asteroids before sync:', this.asteroids.length);
        
        try {
            // Simple replacement strategy - in production, could be more sophisticated
            this.asteroids = asteroidData.map((data, index) => {
                if (!data || typeof data !== 'object') {
                    console.error(`🪨 SYNC ERROR: Invalid asteroid data at index ${index}:`, data);
                    return null;
                }
                
                debugLog(`🪨 SYNC: Creating asteroid ${index + 1}/${asteroidData.length} at (${data.x}, ${data.y}), size: ${data.size}`);
                
                // Validate required properties
                const x = typeof data.x === 'number' ? data.x : 0;
                const y = typeof data.y === 'number' ? data.y : 0;
                const size = typeof data.size === 'number' ? data.size : 1;
                
                const asteroid = new Asteroid(x, y, size, this);
                
                // Safely set velocity with comprehensive checks
                if (!asteroid.velocity || typeof asteroid.velocity !== 'object') {
                    asteroid.velocity = { x: 0, y: 0 };
                }
                
                if (data.velocity && typeof data.velocity === 'object') {
                    asteroid.velocity.x = typeof data.velocity.x === 'number' ? data.velocity.x : 0;
                    asteroid.velocity.y = typeof data.velocity.y === 'number' ? data.velocity.y : 0;
                } else {
                    asteroid.velocity.x = 0;
                    asteroid.velocity.y = 0;
                }
                
                asteroid.rotation = typeof data.rotation === 'number' ? data.rotation : 0;
                asteroid.id = data.id || `asteroid_${Date.now()}_${index}`;
                
                return asteroid;
            }).filter(asteroid => asteroid !== null); // Remove any null entries
            
            debugLog('🪨 SYNC: Asteroids sync complete. New count:', this.asteroids.length);
            
        } catch (error) {
            console.error('🪨 SYNC ERROR: Exception in syncAsteroids:', error);
            console.error('🪨 SYNC ERROR: asteroidData:', asteroidData);
            this.asteroids = []; // Fallback to empty array
        }
    }

    syncEnemies(enemyData) {
        if (!Array.isArray(enemyData)) {
            console.error('👾 SYNC ERROR: enemyData is not an array:', typeof enemyData);
            return;
        }
        
        debugLog('👾 SYNC: syncEnemies called with', enemyData.length, 'enemies');
        debugLog('👾 SYNC: Current enemies before sync:', this.enemies.length);
        
        try {
            this.enemies = enemyData.map((data, index) => {
                if (!data || typeof data !== 'object') {
                    console.error(`👾 SYNC ERROR: Invalid enemy data at index ${index}:`, data);
                    return null;
                }
                
                debugLog(`👾 SYNC: Creating enemy ${index + 1}/${enemyData.length} at (${data.x}, ${data.y}), type: ${data.type}`);
                
                // Validate required properties
                const x = typeof data.x === 'number' ? data.x : 0;
                const y = typeof data.y === 'number' ? data.y : 0;
                
                const enemy = new Enemy(x, y, this);
                
                // Safely set velocity with comprehensive checks
                if (!enemy.velocity || typeof enemy.velocity !== 'object') {
                    enemy.velocity = { x: 0, y: 0 };
                }
                
                if (data.velocity && typeof data.velocity === 'object') {
                    enemy.velocity.x = typeof data.velocity.x === 'number' ? data.velocity.x : 0;
                    enemy.velocity.y = typeof data.velocity.y === 'number' ? data.velocity.y : 0;
                } else {
                    enemy.velocity.x = 0;
                    enemy.velocity.y = 0;
                }
                
                enemy.rotation = typeof data.rotation === 'number' ? data.rotation : 0;
                enemy.health = typeof data.health === 'number' ? data.health : 1;
                enemy.type = typeof data.type === 'string' ? data.type : 'basic';
                enemy.id = data.id || `enemy_${Date.now()}_${index}`;
                
                return enemy;
            }).filter(enemy => enemy !== null); // Remove any null entries
            
            debugLog('👾 SYNC: Enemies sync complete. New count:', this.enemies.length);
            
        } catch (error) {
            console.error('👾 SYNC ERROR: Exception in syncEnemies:', error);
            console.error('👾 SYNC ERROR: enemyData:', enemyData);
            this.enemies = []; // Fallback to empty array
        }
    }

    syncBullets(bulletData) {
        debugLog('💥 SYNC: syncBullets called with', bulletData.length, 'bullets');
        debugLog('💥 SYNC: Current bullets before sync:', this.bullets.length);
        
        this.bullets = bulletData.map((data, index) => {
            debugLog(`💥 SYNC: Creating bullet ${index + 1}/${bulletData.length} at (${data.x}, ${data.y}), player: ${data.playerId}`);
            const bullet = new Bullet(data.x, data.y, data.velocity.x, data.velocity.y, this, data.playerId);
            bullet.id = data.id;
            return bullet;
        });
        
        debugLog('💥 SYNC: Bullets sync complete. New count:', this.bullets.length);
    }

    handlePlayerJoined(data) {
        debugLog(`Player ${data.playerId} joined the game`);
        // Player will be added when their first state update arrives
    }

    handlePlayerDisconnected(data) {
        debugLog(`Player ${data.playerId} disconnected`);
        this.players.delete(data.playerId);
    }

    handleLivesUpdate(data) {
        if (data.sessionId !== this.sessionId) return;
        
        debugLog(`Received lives update: ${data.lives} remaining`);
        this.lives = data.lives;
        this.updateUI();
    }

    handleGameOver(data) {
        if (data.sessionId !== this.sessionId) return;
        
        debugLog(`Game over received: ${data.reason}`);
        this.endGame();
    }

    handleLevelComplete(data) {
        if (data.sessionId !== this.sessionId) return;
        
        debugLog(`Level complete received: advancing to level ${data.newLevel}`);
        this.level = data.newLevel;
        this.score = data.score;
        
        // Show level message
        this.showLevelMessage();
        
        // Create new asteroids and enemies for the level
        this.createAsteroidsForLevel();
        this.createEnemiesForLevel();
        this.updateUI();
    }

    // Set multiplayer session info
    setMultiplayerSession(sessionId, playerId, isHost = false) {
        debugLog('🔧 DEBUG: setMultiplayerSession called with parameters:', {
            sessionId,
            playerId,
            isHost,
            calledFromStack: new Error().stack.split('\n')[2]?.trim()
        });
        
        // Spawn triggering is now handled by handleGameStarted for better timing
        debugLog('🎮 Multiplayer session configured - spawn will be triggered by game start event');
        
        // Log previous state
        debugLog('🔧 DEBUG: Previous multiplayer state:', {
            previousSessionId: this.sessionId,
            previousPlayerId: this.playerId,
            previousIsHost: this.isHost,
            gameMode: this.mode,
            hasShip: !!this.ship,
            shipPlayerId: this.ship?.playerId
        });
        
        this.sessionId = sessionId;
        this.playerId = playerId;
        this.isHost = isHost;
        
        debugLog('🚨 GAME: HOST STATUS FINAL ASSIGNMENT 🚨', {
            sessionId: sessionId,
            playerId: playerId,
            isHost: isHost,
            gameIsHost: this.isHost,
            socketId: window.socketManager?.socket?.id
        });
        
        // Extra verification - double check host status assignment worked
        if (this.isHost !== isHost) {
            console.error('🚨 CRITICAL: Host status assignment failed!', {
                expected: isHost,
                actual: this.isHost,
                sessionId: sessionId,
                playerId: playerId
            });
        }
        
        // CRITICAL: Set up event handlers immediately when session is established
        debugLog('🔧 CRITICAL: Setting up socket handlers immediately after session established');
        this.setupGameSyncEvents();
        
        if (this.ship) {
            debugLog('🔧 DEBUG: Setting ship.playerId from', this.ship.playerId, 'to', playerId);
            this.ship.playerId = playerId;
        } else {
            debugLog('🔧 DEBUG: No ship instance available to set playerId on');
        }
        
        // Log final state
        debugLog('🔧 DEBUG: Final multiplayer state after setting:', {
            sessionId: this.sessionId,
            playerId: this.playerId,
            isHost: this.isHost,
            gameMode: this.mode,
            hasShip: !!this.ship,
            shipPlayerId: this.ship?.playerId,
            worldBoundsEnabled: this.worldBounds.enabled,
            cameraEnabled: this.camera.enabled
        });
        
        debugLog(`Multiplayer session set: ${sessionId}, player: ${playerId}, host: ${isHost}`);
        
        // Broadcast ship data to other players if we have a ship
        if (this.ship && window.socketManager) {
            debugLog('🚢 GAME: Broadcasting ship data after session setup');
            // Add a small delay to ensure socket is properly joined to session
            setTimeout(() => {
                this.broadcastShipData();
            }, 500);
        }
    }

    // Cleanup multiplayer resources
    cleanupMultiplayer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
        
        if (this.gameStateTimer) {
            clearInterval(this.gameStateTimer);
            this.gameStateTimer = null;
        }
        
        this.players.clear();
        this.sessionId = null;
        this.playerId = null;
        this.isHost = false;
    }
    // Handle ship design data from other players (from working demo)
    handlePlayerShipData(data) {
        debugLog('🚢 Received ship data from player:', data.playerId, data.shipData);
        debugLog('🚢 Ship data details:', {
            name: data.shipData?.name,
            customLinesCount: data.shipData?.customLines?.length || 0,
            color: data.shipData?.color
        });
        
        // Initialize otherPlayers if needed
        if (!this.otherPlayers) {
            this.otherPlayers = {};
        }
        
        // Store or update ship data in the simplified otherPlayers object
        if (!this.otherPlayers[data.playerId]) {
            debugLog(`🚢 Creating new player entry: ${data.playerId}`);
            this.otherPlayers[data.playerId] = {
                x: 1000,  // World center
                y: 750,
                angle: 0,
                thrusting: false,
                vx: 0,
                vy: 0,
                playerName: data.shipData?.name || 'Other Player',
                shipData: data.shipData
            };
        } else {
            // Update existing player's ship data
            debugLog(`🚢 Updating ship data for existing player: ${data.playerId}`);
            this.otherPlayers[data.playerId].shipData = data.shipData;
            if (data.shipData?.name) {
                this.otherPlayers[data.playerId].playerName = data.shipData.name;
            }
        }
        
        debugLog(`🚢 Total ships tracked: ${Object.keys(this.otherPlayers).length}`);
    }

    // Apply ship data to a ship object (properly set ship properties for rendering)
    applyShipData(ship, shipData) {
        if (!shipData) {
            debugLog('🚢 No ship data to apply');
            return;
        }

        debugLog('🚢 Applying ship data to ship:', {
            customLines: shipData.customLines?.length || 0,
            color: shipData.color,
            thrusterColor: shipData.thrusterColor,
            hasThrusters: !!shipData.thrusterPoints?.length,
            hasWeapons: !!shipData.weaponPoints?.length
        });

        // Set ship type and custom design
        ship.shipType = 'custom';
        ship.customLines = shipData.customLines || [];
        ship.shipColor = shipData.color || 'white';
        ship.thrusterColor = shipData.thrusterColor || 'blue';
        ship.thrusterPoints = shipData.thrusterPoints || [];
        ship.weaponPoints = shipData.weaponPoints || [];
        
        debugLog('🚢 Ship properties after applying data:', {
            shipType: ship.shipType,
            customLinesCount: ship.customLines.length,
            shipColor: ship.shipColor,
            thrusterColor: ship.thrusterColor
        });
    }

    // Handle request for ship data from new players (like custom-ships-minimal.html)
    handleRequestShipData(data) {
        debugLog('🔄 GAME: Server requesting ship data for new player:', data.newPlayerId);
        
        // Send my ship data to help the new player
        if (this.ship && this.sessionId && window.socketManager) {
            debugLog('🚢 GAME: Broadcasting my ship data to new player');
            this.broadcastShipData();
        }
    }

    // Broadcast ship data to other players
    broadcastShipData() {
        if (!this.ship || !window.socketManager || !this.sessionId) {
            debugLog('🚢 GAME: Cannot broadcast ship data - missing requirements');
            return;
        }

        const shipData = {
            name: this.ship.playerName || 'Player',
            customLines: this.ship.customLines || [],
            thrusterPoints: this.ship.thrusterPoints || [],
            weaponPoints: this.ship.weaponPoints || [],
            color: this.ship.shipColor || 'white',
            thrusterColor: this.ship.thrusterColor || 'blue',
            type: 'custom'
        };

        debugLog('🚢 GAME: Broadcasting ship data:', shipData);
        window.socketManager.broadcastShipData(shipData);
    }
    
    // Spawn a deterministic asteroid for multiplayer
    spawnMultiplayerAsteroid() {
        debugLog('🌑 spawnMultiplayerAsteroid called, isHost =', this.isHost);
        if (!this.isHost) {
            debugLog('🌑 Not host, skipping asteroid spawn');
            return;
        }
        
        // Generate deterministic spawn parameters
        const asteroidId = 'ast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const x = Math.random() * this.worldBounds.width;
        const y = Math.random() * this.worldBounds.height;
        const size = 3; // Start with large asteroid
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 0.5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const seed = Math.floor(Math.random() * 10000);
        
        // Create asteroid locally
        const asteroid = new Asteroid(x, y, size, this);
        asteroid.id = asteroidId;
        asteroid.xv = vx;
        asteroid.yv = vy;
        asteroid.seed = seed;
        this.asteroids.push(asteroid);
        
        // Broadcast asteroid spawn to other players
        debugLog('🎮 HOST: Broadcasting asteroid spawn:', asteroidId);
        window.socketManager.socket.emit('asteroid-spawn', {
            id: asteroidId,
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            size: size,
            seed: seed
        });
    }
    
    // Handle asteroid spawn from host (for clients)
    handleAsteroidSpawn(data) {
        if (this.isHost) return; // Host already has the asteroid
        
        debugLog('🎮 CLIENT: Received synchronized asteroid spawn:', data.id);
        
        // Create deterministic asteroid with exact same parameters
        this.createDeterministicAsteroid(data);
    }
    
    // Spawn a host-controlled enemy for multiplayer
    spawnMultiplayerEnemy() {
        debugLog('👾 spawnMultiplayerEnemy called, isHost =', this.isHost);
        if (!this.isHost) {
            debugLog('👾 Not host, skipping enemy spawn');
            return;
        }
        
        // Generate enemy spawn parameters
        const enemyId = 'enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const x = Math.random() * this.worldBounds.width;
        const y = Math.random() * this.worldBounds.height;
        
        // Create enemy locally
        const enemy = new Enemy(x, y, this);
        enemy.id = enemyId;
        this.enemies.push(enemy);
        
        // Start broadcasting enemy updates if not already
        if (!this.enemyUpdateInterval) {
            this.enemyUpdateInterval = setInterval(() => {
                this.broadcastEnemyStates();
            }, 100); // Send enemy updates 10 times per second
        }
        
        debugLog('🎮 HOST: Created enemy:', enemyId);
    }
    
    // Broadcast all enemy states to other players (host only)
    broadcastEnemyStates() {
        if (!this.isHost || this.enemies.length === 0 || !window.socketManager || !window.socketManager.socket) return;
        
        const enemyStates = this.enemies.map(enemy => ({
            id: enemy.id,
            x: enemy.x,
            y: enemy.y,
            angle: enemy.angle,
            active: enemy.active,
            thrusting: enemy.thrusting || false
        }));
        
        // Only broadcast if we have enemies
        if (enemyStates.length > 0) {
            window.socketManager.socket.emit('enemies-update', {
                enemies: enemyStates
            });
        }
    }
    
    // Handle enemy updates from host (for clients)
    handleEnemiesUpdate(data) {
        if (this.isHost) return; // Host controls enemies directly
        
        // Update or create enemy positions
        data.enemies.forEach(enemyData => {
            let enemy = this.enemies.find(e => e.id === enemyData.id);
            
            if (!enemy) {
                // Create new enemy if it doesn't exist
                enemy = new Enemy(enemyData.x, enemyData.y, this);
                enemy.id = enemyData.id;
                enemy.isClientControlled = true; // Mark as client-side copy
                this.enemies.push(enemy);
                debugLog('🎮 CLIENT: Created new enemy from host:', enemyData.id);
            }
            
            // Smooth interpolation for better visual quality
            const lerpFactor = 0.2; // Smoother interpolation
            enemy.x += (enemyData.x - enemy.x) * lerpFactor;
            enemy.y += (enemyData.y - enemy.y) * lerpFactor;
            enemy.angle = enemyData.angle;
            enemy.active = enemyData.active;
            enemy.thrusting = enemyData.thrusting || false;
        });
        
        // Remove enemies that are no longer in the update
        const activeEnemyIds = data.enemies.map(e => e.id);
        this.enemies = this.enemies.filter(e => activeEnemyIds.includes(e.id));
    }
    
    // Handle enemy shooting (host broadcasts to clients)
    handleEnemyShoot(enemyId) {
        const enemy = this.enemies.find(e => e.id === enemyId);
        if (enemy) {
            enemy.shoot();
        }
    }
    
    // Force spawn objects for testing (now uses round-based system)
    forceSpawnTestObjects() {
        debugLog('🎮 *** FORCE SPAWN FUNCTION CALLED (ROUND-BASED MODE) ***');

        try {
            // Check if we already have mathematical asteroids to prevent duplicates
            const hasExistingMathAsteroid = this.asteroids.some(a => a.isMathematical);
            if (hasExistingMathAsteroid) {
                debugLog('🎮 Mathematical asteroids already exist, skipping spawn');
                return;
            }

            // Multiple ways to determine if we should spawn (fix for host detection race condition)
            const sessionManagerHost = window.sessionManager && window.sessionManager.isHost;
            const gameInstanceHost = this.isHost;
            const playerId = window.socketManager?.socket?.id;
            const sessionId = this.sessionId;

            // Enhanced host detection - use multiple criteria
            const shouldSpawnAsHost = sessionManagerHost || gameInstanceHost || !sessionId || !playerId;

            debugLog('🎮 Enhanced Spawn Check:', {
                sessionManagerHost: sessionManagerHost,
                gameInstanceHost: gameInstanceHost,
                playerId: playerId,
                sessionId: sessionId,
                shouldSpawnAsHost: shouldSpawnAsHost,
                hasExistingMathAsteroid: hasExistingMathAsteroid,
                currentRound: this.multiplayerRound
            });

            if (shouldSpawnAsHost) {
                debugLog(`🎮 ✅ SPAWNING: Creating and broadcasting ${this.multiplayerRound} asteroid(s) for Round ${this.multiplayerRound}...`);
                this.spawnMultiplayerRoundAsteroids(this.multiplayerRound);
                // CRITICAL: Mark round as started so round completion can trigger
                this.multiplayerRoundStarted = true;
                // Reset the zero-asteroids log flag so it can log again when asteroids are actually destroyed
                this._asteroidsZeroLogged = false;
                debugLog('🎮 ✅ SPAWNING: multiplayerRoundStarted set to TRUE, _asteroidsZeroLogged reset to FALSE');
            } else {
                debugLog('🎮 ❌ CLIENT: Waiting for host broadcast...');
                // Fallback spawn disabled - interferes with round progression
                // Clients should only receive asteroids from host via socket events
                // But still mark round as started for clients
                this.multiplayerRoundStarted = true;
                // Reset the zero-asteroids log flag for clients too
                this._asteroidsZeroLogged = false;
                debugLog('🎮 ❌ CLIENT: multiplayerRoundStarted set to TRUE, _asteroidsZeroLogged reset (waiting for asteroids)');
            }
            
        } catch (error) {
            console.error('🎮 *** SPAWN ERROR ***:', error);
        }
    }
    
    // Spawn a deterministic asteroid that will be synchronized
    spawnSynchronizedAsteroid() {
        // Create deterministic parameters using a seed
        const seed = Date.now(); // Use timestamp as seed for deterministic generation
        const random = this.seededRandom(seed);
        
        const asteroidData = {
            id: 'sync_asteroid_' + seed,
            x: 200 + random() * (this.worldBounds.width - 400), // Keep away from edges
            y: 200 + random() * (this.worldBounds.height - 400),
            size: 3,
            angle: random() * Math.PI * 2,
            speed: 1 + random() * 0.5,
            seed: seed
        };
        
        // Calculate velocity from angle and speed
        asteroidData.vx = Math.cos(asteroidData.angle) * asteroidData.speed;
        asteroidData.vy = Math.sin(asteroidData.angle) * asteroidData.speed;
        
        // Create asteroid locally
        this.createDeterministicAsteroid(asteroidData);
        
        // Broadcast to other players
        if (window.socketManager && window.socketManager.socket) {
            debugLog('🌑 HOST: Broadcasting synchronized asteroid:', asteroidData.id);
            window.socketManager.socket.emit('asteroid-spawn', asteroidData);
        }
    }
    
    // Spawn a host-controlled enemy
    spawnSynchronizedEnemy() {
        const enemyData = {
            id: 'sync_enemy_' + Date.now(),
            x: this.worldBounds.width / 2,
            y: this.worldBounds.height / 2,
            angle: 0,
            speed: 60
        };
        
        // Create enemy locally (host controls it)
        const enemy = new Enemy(enemyData.x, enemyData.y, this);
        enemy.id = enemyData.id;
        this.enemies.push(enemy);
        
        // Start broadcasting enemy states
        if (!this.enemyBroadcastInterval) {
            this.enemyBroadcastInterval = setInterval(() => {
                this.broadcastEnemyStates();
            }, 100); // 10 times per second
        }
        
        debugLog('👾 HOST: Created synchronized enemy:', enemyData.id);
    }
    
    // Create a deterministic asteroid from shared parameters
    createDeterministicAsteroid(data) {
        const asteroid = new Asteroid(data.x, data.y, data.size, this);
        asteroid.id = data.id;
        asteroid.xv = data.vx;
        asteroid.yv = data.vy;
        asteroid.seed = data.seed;
        
        // Use seed to generate consistent shape
        if (data.seed) {
            this.setAsteroidShape(asteroid, data.seed);
        }
        
        this.asteroids.push(asteroid);
        debugLog('🌑 Created deterministic asteroid:', data.id, 'at', data.x, data.y);
    }
    
    // Generate consistent asteroid shape from seed
    setAsteroidShape(asteroid, seed) {
        const random = this.seededRandom(seed);
        asteroid.vertices = 6 + Math.floor(random() * 3); // 6-8 vertices
        asteroid.jaggedness = random() * 0.2 + 0.1;
        asteroid.offsets = [];
        
        for (let i = 0; i < asteroid.vertices; i++) {
            asteroid.offsets.push(asteroid.radius * (1 - asteroid.jaggedness + random() * asteroid.jaggedness));
        }
    }
    
    // Simple seeded random number generator for deterministic behavior
    seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        let counter = 0;
        return function() {
            counter++;
            x = Math.sin(seed + counter) * 10000;
            return x - Math.floor(x);
        };
    }
    
    // Create mathematical formula-based objects (simplified - one asteroid only)
    createLocalTestObjects() {
        debugLog('🎮 CREATING ONE MATHEMATICAL ASTEROID ONLY');
        
        // Only create ONE mathematically synchronized asteroid
        const currentTime = Date.now();
        const asteroidData = {
            id: 'single_asteroid_' + currentTime,
            spawnTime: currentTime,
            startX: 400,
            startY: 300,
            baseSpeed: 1.5, // Slower for easier testing
            angle: Math.PI / 6, // 30 degrees - predictable direction
            bounceCount: 0,
            alive: true
        };
        
        const asteroid = new Asteroid(asteroidData.startX, asteroidData.startY, 2, this); // Size 2 (medium)
        asteroid.id = asteroidData.id;
        asteroid.mathData = asteroidData;
        asteroid.isMathematical = true;
        this.asteroids.push(asteroid);
        
        debugLog('🎮 Created ONE mathematical asteroid:', asteroidData);
        
        // Broadcast ONLY the asteroid parameters to other clients
        if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
            debugLog('🎮 ✅ Broadcasting single asteroid data to server...');
            debugLog('🎮 ✅ Socket connected:', window.socketManager.socket.connected);
            debugLog('🎮 ✅ Current session:', window.socketManager.currentSessionId);
            
            // Use acknowledgment callback to ensure broadcast is received
            window.socketManager.socket.emit('math-objects-spawn', {
                asteroid: asteroidData
            }, (ack) => {
                if (ack) {
                    debugLog('🎮 ✅ Broadcast acknowledged by server!');
                } else {
                    debugLog('🎮 ⚠️ Broadcast sent but no acknowledgment received');
                }
            });
            
            debugLog('🎮 ✅ Broadcast sent with acknowledgment callback!');
        } else {
            debugLog('🎮 ❌ ERROR: Cannot broadcast - socket not available:', {
                hasSocketManager: !!window.socketManager,
                hasSocket: !!window.socketManager?.socket,
                socketConnected: window.socketManager?.socket?.connected,
                currentSession: window.socketManager?.currentSessionId
            });
            
            // If broadcast fails, ensure other clients still get asteroids
            debugLog('🎮 ⚠️ Broadcast failed - other clients will use fallback spawn');
        }
    }
    
    // Handle mathematical object spawn from other players (simplified - asteroid only)
    handleMathObjectsSpawn(data) {
        debugLog('🎮 Received mathematical asteroid data:', data);
        
        // Create ONLY asteroid with same mathematical parameters
        if (data.asteroid && !this.asteroids.find(a => a.id === data.asteroid.id)) {
            debugLog('🎮 Creating synchronized asteroid with ID:', data.asteroid.id);
            const asteroid = new Asteroid(data.asteroid.startX, data.asteroid.startY, 2, this); // Size 2 to match
            asteroid.id = data.asteroid.id;
            asteroid.mathData = data.asteroid;
            asteroid.isMathematical = true;
            this.asteroids.push(asteroid);
            debugLog('🎮 Synchronized asteroid created successfully');
        } else if (data.asteroid) {
            debugLog('🎮 Asteroid already exists, skipping:', data.asteroid.id);
        }
        
        // NO ENEMY PROCESSING - asteroid only for now
    }
    
    // Broadcast ship collision to other clients
    broadcastShipCollision(objectType, objectId, playerId) {
        if (window.socketManager && window.socketManager.socket) {
            debugLog(`🚢 Broadcasting ship collision with ${objectType} ${objectId}`);
            window.socketManager.socket.emit('ship-collision', {
                objectType: objectType,
                objectId: objectId,
                playerId: playerId,
                timestamp: Date.now()
            });
        }
    }
    
    // Broadcast object destruction to other clients
    broadcastObjectDestroyed(objectType, objectId) {
        if (window.socketManager && window.socketManager.socket) {
            debugLog(`🎮 Broadcasting ${objectType} ${objectId} destruction`);
            window.socketManager.socket.emit('math-objects-destroyed', {
                type: objectType,
                id: objectId,
                timestamp: Date.now()
            });
        }
    }
    
    // Handle ship collision from any client
    handleShipCollision(data) {
        debugLog(`🚢 Received ship collision: player ${data.playerId} hit ${data.objectType} ${data.objectId}`);
        
        // Process collision for local ship
        if (this.playerId === data.playerId) {
            if (this.ship && !this.ship.invulnerable && !this.ship.exploding) {
                // Process the hit on the local ship
                this.ship.hit();
            }
        } 
        // Process collision for other players' ships
        else if (this.otherPlayers && this.otherPlayers[data.playerId]) {
            const otherPlayer = this.otherPlayers[data.playerId];
            debugLog(`💥 Other player ${data.playerId} ship exploding`);
            
            // Just create debris effect at other player's position
            // Don't manage visibility - let the normal position updates handle that
            if (otherPlayer.x && otherPlayer.y) {
                const numParticles = 20;
                const DebrisClass = window.Debris || Debris;
                for (let i = 0; i < numParticles; i++) {
                    const debris = new DebrisClass(
                        otherPlayer.x,
                        otherPlayer.y,
                        Math.random() * Math.PI * 2,
                        this
                    );
                    // Make ship debris more colorful
                    debris.color = i % 2 === 0 ? 'orange' : 'red';
                    this.debris.push(debris);
                }
            }
        }
        
        // Destroy the asteroid if it was an asteroid collision
        if (data.objectType === 'asteroid') {
            const asteroidIndex = this.asteroids.findIndex(a => a.id === data.objectId);
            if (asteroidIndex !== -1) {
                // Use splitAsteroid which already handles multiplayer mode
                this.splitAsteroid(asteroidIndex);
            }
        }
    }
    
    // Handle object destruction from other clients
    handleMathObjectDestroyed(data) {
        debugLog(`🎮 Received ${data.type} ${data.id} destruction`);
        
        if (data.type === 'asteroid') {
            // Find and remove the asteroid
            const asteroidIndex = this.asteroids.findIndex(a => a.id === data.id);
            if (asteroidIndex !== -1) {
                const asteroid = this.asteroids[asteroidIndex];
                
                // Create debris
                this.createDebrisFromAsteroid(asteroid);
                
                // In multiplayer mode, asteroids are destroyed directly without splitting
                // In singleplayer mode, split into smaller asteroids if not smallest size
                if (!this.isMultiplayer() && asteroid.size > 1) {
                    for (let i = 0; i < 2; i++) {
                        this.asteroids.push(new Asteroid(
                            asteroid.x,
                            asteroid.y,
                            asteroid.size - 1,
                            this
                        ));
                    }
                }
                
                // Remove the original asteroid
                debugLog(`💥 SYNC: Removing asteroid at index ${asteroidIndex}, ID: ${data.id}, asteroids before: ${this.asteroids.length}`);
                this.asteroids.splice(asteroidIndex, 1);
                debugLog(`💥 SYNC: Asteroids after removal: ${this.asteroids.length}`);
            }
        } else if (data.type === 'enemy') {
            // Find and remove the enemy
            const enemyIndex = this.enemies.findIndex(e => e.id === data.id);
            if (enemyIndex !== -1) {
                const enemy = this.enemies[enemyIndex];
                
                // Create debris (same as local destruction)
                this.createDebrisFromEnemy(enemy);
                
                // Remove the enemy
                this.enemies.splice(enemyIndex, 1);
                debugLog(`🎮 Synchronized enemy ${data.id} destruction`);
            }
        }
    }

    // ==================== MULTIPLAYER ROUND PROGRESSION ====================

    // Complete current multiplayer round and transition to next
    completeMultiplayerRound() {
        if (!this.isHost) {
            debugLog('🏆 CLIENT: Round complete, waiting for host to start next round');
            return;
        }

        this.roundTransitioning = true;
        debugLog(`🏆 HOST: Round ${this.multiplayerRound} complete!`);

        // Check if we've completed all 10 rounds
        const MAX_ROUNDS = 10;
        if (this.multiplayerRound >= MAX_ROUNDS) {
            debugLog(`🎉 HOST: All ${MAX_ROUNDS} rounds complete! Game finished!`);
            setTimeout(() => {
                this.completeMultiplayerGame();
            }, 2000);
            return;
        }

        // Brief pause before next round
        setTimeout(() => {
            this.startNextMultiplayerRound();
        }, 2000);
    }

    // Complete the entire multiplayer game (all rounds finished)
    completeMultiplayerGame() {
        if (!this.isHost) return;

        debugLog('🎉 HOST: Broadcasting game completion to all clients');

        // Broadcast game completion to all clients
        if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
            window.socketManager.socket.emit('multiplayer-game-complete', {
                finalRound: this.multiplayerRound,
                timestamp: Date.now()
            });
        }

        // Show completion message locally
        this.showMultiplayerGameComplete();
    }

    // Show game completion message (called on all clients)
    showMultiplayerGameComplete() {
        debugLog('🎉 All 10 rounds complete! Congratulations!');

        // Show level message with completion text
        if (this.levelMessage && this.levelNumber) {
            this.levelNumber.textContent = 'Complete!';
            this.levelMessage.style.display = 'flex';

            // Keep it displayed longer for completion
            setTimeout(() => {
                this.levelMessage.style.display = 'none';
                // Could show a custom completion screen here
                alert('🎉 Congratulations! You completed all 10 rounds!');
            }, 5000);
        }

        this.roundTransitioning = false;
        this.gameOver = true;
    }

    // Start the next multiplayer round (host only)
    startNextMultiplayerRound() {
        if (!this.isHost) return;

        this.multiplayerRound++;
        debugLog(`🚀 HOST: Starting Round ${this.multiplayerRound}`);

        // Mark round as started
        this.multiplayerRoundStarted = true;

        // Broadcast round transition to all clients
        if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
            window.socketManager.socket.emit('round-transition', {
                round: this.multiplayerRound,
                timestamp: Date.now()
            });
        }

        // Spawn asteroids for this round
        this.spawnMultiplayerRoundAsteroids(this.multiplayerRound);

        this.roundTransitioning = false;
    }

    // Spawn multiple mathematical asteroids for a round
    spawnMultiplayerRoundAsteroids(round) {
        if (!this.isHost) {
            debugLog('⚠️ CLIENT: Should not spawn asteroids');
            return;
        }

        const asteroidCount = round; // Round 1 = 1 asteroid, Round 2 = 2 asteroids, etc.
        debugLog(`🌑 HOST: Spawning ${asteroidCount} asteroids for Round ${round}`);

        for (let i = 0; i < asteroidCount; i++) {
            // Small delay between spawns to prevent collisions
            setTimeout(() => {
                this.spawnSingleMathematicalAsteroid(i, round);
            }, i * 200);
        }
    }

    // Spawn a single mathematical asteroid with synchronization
    spawnSingleMathematicalAsteroid(index, round) {
        const spawnTime = Date.now();
        const asteroidId = `asteroid_r${round}_${index}_${spawnTime}`;

        // Use seeded random for consistent randomization
        const seed = spawnTime + index;
        const random = this.seededRandom(seed);

        // Random spawn position in the world, away from center where ships are
        const minDistance = 400; // Min distance from center
        let x, y;
        const centerX = this.worldBounds.width / 2;
        const centerY = this.worldBounds.height / 2;

        do {
            x = random() * this.worldBounds.width;
            y = random() * this.worldBounds.height;
            const distFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            );
            if (distFromCenter > minDistance) break;
        } while (true);

        // Mathematical movement data
        const asteroidData = {
            id: asteroidId,
            startX: x,
            startY: y,
            spawnTime: spawnTime,
            baseSpeed: 1 + random() * 0.5,
            angle: random() * Math.PI * 2,
            seed: seed,
            round: round,
            index: index
        };

        // Create asteroid locally with mathematical movement
        const asteroid = new Asteroid(asteroidData.startX, asteroidData.startY, 2, this);
        asteroid.id = asteroidData.id;
        asteroid.mathData = asteroidData;
        asteroid.isMathematical = true;
        this.asteroids.push(asteroid);

        debugLog(`🌑 HOST: Created asteroid ${index + 1}/${round} for Round ${round}:`, asteroidData.id);

        // Broadcast to other clients
        if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
            window.socketManager.socket.emit('math-objects-spawn', {
                asteroid: asteroidData
            }, (ack) => {
                if (ack) {
                    debugLog(`✅ Asteroid ${index + 1} broadcast acknowledged`);
                }
            });
        }
    }

    // Handle round transition from server (for clients)
    handleRoundTransition(data) {
        debugLog(`🚀 CLIENT: Received round transition to Round ${data.round}`);
        this.multiplayerRound = data.round;
        this.roundTransitioning = false;
        this.multiplayerRoundStarted = true;

        // Update UI if needed
        if (this.levelNumber) {
            this.levelNumber.textContent = `Round ${this.multiplayerRound}`;
        }

        // Show round message
        if (this.levelMessage) {
            this.levelMessage.style.display = 'flex';
            setTimeout(() => {
                this.levelMessage.style.display = 'none';
            }, 2000);
        }
    }

    // Handle multiplayer game completion from server (for clients)
    handleMultiplayerGameComplete(data) {
        debugLog(`🎉 CLIENT: Received game completion! Final round: ${data.finalRound}`);
        this.showMultiplayerGameComplete();
    }

    // Seeded random number generator for consistent randomization
    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
}