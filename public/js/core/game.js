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
        this.mode = 'singleplayer'; // 'singleplayer' or 'mmo' (MMO world and co-op sessions)
        this.worldBounds = {
            width: 2000,
            height: 1500,
            enabled: false
        };
        
        // Camera/viewport system for server-ticked worlds
        this.camera = {
            x: 0,
            y: 0,
            followTarget: null, // Ship to follow
            smoothing: 0.1, // Camera smoothing factor
            enabled: false
        };
        
        // Game objects
        this.ship = null;
        
        this.playerId = null; // Assigned by the server when joining a world

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
        this._gameLoopActive = false; // Guard against multiple game loops

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
        // Reset game state
        this.lives = 3;
        this.score = 0;
        this.level = 1;
        this.asteroids = [];
        this.bullets = [];
        this.debris = [];
        this.enemies = [];
        this.gameOver = false;
        this.paused = false;
        this.demoMode = demoMode;
        
        // Spawn at screen center
        this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2, this);
        
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
          this.createAsteroidsForLevel();
          this.createEnemiesForLevel();
          this.initTouchControls();
        }
        
        // Start game loop
        this._gameLoopActive = true;
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
            
            // Toggle pause with P or Escape (disabled in server-ticked worlds)
            if ((e.key === 'p' || e.key === 'Escape') && !this.isMMO()) {
                this.togglePause();
            }
            
            // Toggle collision debug mode with backtick (D is movement)
            if (e.code === 'Backquote') {
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
        if (this.gameOver) {
            this._gameLoopActive = false;
            return;
        }

        // Convert to seconds
        const currentTime = timestamp / 1000;
        let deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Validate deltaTime to prevent issues from timing bugs
        if (isNaN(deltaTime) || deltaTime < 0 || deltaTime > 1) {
            console.warn('🎮 GAME LOOP: Invalid deltaTime, resetting:', deltaTime);
            deltaTime = this.timeStep;
        }

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
        // MMO mode has its own update logic
        if (this.isMMO()) {
            this.updateMMO(dt);
            return;
        }

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
            const enemy = this.enemies[i];
            if (!enemy.active) continue; // Skip inactive enemies
            enemy.update(dt);
        }

        // Handle collisions
        this.checkCollisions();

        // Check if level is complete
        if (!this.demoMode && !this.ship.exploding) {
            if (this.asteroids.length === 0 && this.enemies.length === 0) {
                this.nextLevel();
            }
        }
    }
    
    handleInput() {
        // Debug logging for MMO mode (first 5 calls only)
        if (this.isMMO() && (!this._mmoInputLogCount || this._mmoInputLogCount < 5)) {
            this._mmoInputLogCount = (this._mmoInputLogCount || 0) + 1;
            console.log('🎮 MMO INPUT:', {
                shipExists: !!this.ship,
                shipExploding: this.ship?.exploding,
                mmoDead: this.mmoDead,
                shootKeyPressed: this.keys['ArrowDown'] || this.keys['s'] || this.keys[' '],
                canShoot: this.ship?.canShoot,
                mode: this.mode
            });
        }

        if (!this.ship || this.ship.exploding) return;
        if (this.isMMO() && this.mmoDead) return; // Don't handle input if dead in MMO
        
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
          // MMO mode has special shooting handling
          if (this.isMMO()) {
            this.mmoShoot();
          } else {
            const bullets = this.ship.shoot();
            if (bullets) {
              this.bullets = this.bullets.concat(bullets);
            }
          }
        }
      }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw starfield background BEFORE camera transform
        if (!this.isMMO()) {
            // Only draw starfield in single player mode
            this.drawStarfield();
        } else {
            // Simple starfield for MMO/co-op (doesn't scroll with camera)
            this.drawSimpleStarfield();
        }
        
        // Apply camera transform for multiplayer
        this.applyCameraTransform();
        
        // Draw world boundary in multiplayer/MMO mode
        if (this.worldBounds.enabled) {
            this.drawWorldBoundary();
        }

        // Draw MMO entities if in MMO mode
        if (this.isMMO()) {
            this.renderMMO();
        }

        // Draw ship (skip if dead in MMO mode)
        if (this.ship && !(this.isMMO() && this.mmoDead)) {
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
                    alive: this.ship.alive
                });
            }

            this.ship.draw(this.ctx);
            if (window.DEBUG_COLLISIONS) {
                this.ship.drawCollisionBoundaries(this.ctx);
            }
        }

        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
        
        // Draw asteroids (skip in MMO mode - they're rendered via renderMMO)
        if (!this.isMMO()) {
            if (this.asteroids.length > 0) {
                debugLog('🎨 RENDER: Drawing', this.asteroids.length, 'asteroids', {
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
        }

        // Draw debris
        for (const particle of this.debris) {
            particle.draw(this.ctx);
        }

        // Draw enemies (skip in MMO mode - they're rendered via renderMMO)
        if (!this.isMMO()) {
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
        if (this.isMMO()) {
            this.drawMMOHUD();
        } else {
            this.drawHUD();
        }
        
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
        this.ctx.fillText('DEBUG MODE: Press ` to toggle', 20, this.canvas.height - 20);
        
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
        // Parallax starfield for multiplayer - creates illusion of movement
        // Stars are created in world-space and move at reduced speed relative to camera
        if (!this.parallaxStars) {
            this.parallaxStars = [];
            const layers = [
                { count: 60, parallax: 0.1, minSize: 0.3, maxSize: 0.8, alpha: 0.4 },
                { count: 40, parallax: 0.25, minSize: 0.5, maxSize: 1.2, alpha: 0.6 },
                { count: 30, parallax: 0.4, minSize: 0.8, maxSize: 1.8, alpha: 0.8 }
            ];

            const worldW = this.worldBounds?.width || 2000;
            const worldH = this.worldBounds?.height || 2000;
            const padding = 200;

            layers.forEach(layer => {
                for (let i = 0; i < layer.count; i++) {
                    this.parallaxStars.push({
                        baseX: -padding + Math.random() * (worldW + padding * 2),
                        baseY: -padding + Math.random() * (worldH + padding * 2),
                        size: layer.minSize + Math.random() * (layer.maxSize - layer.minSize),
                        parallax: layer.parallax,
                        alpha: layer.alpha,
                        twinkleOffset: Math.random() * Math.PI * 2,
                        twinkleSpeed: 1 + Math.random() * 2
                    });
                }
            });
        }

        const time = performance.now() / 1000;
        const camX = this.camera?.x || 0;
        const camY = this.camera?.y || 0;
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const worldW = this.worldBounds?.width || 2000;
        const worldH = this.worldBounds?.height || 2000;

        this.parallaxStars.forEach(star => {
            const parallaxOffsetX = camX * (1 - star.parallax);
            const parallaxOffsetY = camY * (1 - star.parallax);

            let screenX = star.baseX + camX - parallaxOffsetX;
            let screenY = star.baseY + camY - parallaxOffsetY;

            const tileW = worldW + 400;
            const tileH = worldH + 400;
            screenX = ((screenX % tileW) + tileW) % tileW - 200;
            screenY = ((screenY % tileH) + tileH) % tileH - 200;

            if (screenX < -10 || screenX > canvasW + 10 ||
                screenY < -10 || screenY > canvasH + 10) {
                return;
            }

            const twinkle = 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
            const size = star.size * twinkle;

            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawHUD() {
        this.drawSinglePlayerHUD();
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
        
        // Check ship collision with asteroids
        for (const asteroid of this.asteroids) {
            // Use the enhanced collision detection on the ship
            if (this.ship.checkCollision(asteroid)) {
                debugLog("Ship collided with asteroid");
                
                // Only process the hit if the ship is not invulnerable
                if (!this.ship.invulnerable) {
                    // We break after a successful hit to prevent multiple hits in one frame
                    if (this.ship.hit()) break;
                } else {
                    debugLog("Ship is invulnerable, ignoring asteroid collision");
                }
            }
        }
        
        // Check ship collision with enemies - mutual destruction
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            // Use the enhanced collision detection on the ship
            if (this.ship.checkCollision(enemy)) {
                debugLog("Ship collided with enemy - mutual destruction");

                // Destroy the enemy ship regardless of player invulnerability
                enemy.hit();
                this.enemies.splice(i, 1);

                // Only damage the player if not invulnerable
                if (!this.ship.invulnerable) {
                    // We break after a successful hit to prevent multiple hits in one frame
                    if (this.ship.hit()) break;
                } else {
                    debugLog("Ship is invulnerable, enemy destroyed but player survives");
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

        // Split into smaller asteroids if not smallest size
        if (asteroid.size > 1) {
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
        // Validate ship position to prevent NaN issues
        if (!this.ship || !isFinite(this.ship.x) || !isFinite(this.ship.y)) {
            debugLog('createDebrisFromShip: Invalid ship position, skipping debris');
            return;
        }

        const numParticles = 20;
        const shipX = this.ship.x;
        const shipY = this.ship.y;

        debugLog(`Creating ship debris at (${shipX.toFixed(0)}, ${shipY.toFixed(0)})`);

        for (let i = 0; i < numParticles; i++) {
            const debris = new Debris(
                shipX,
                shipY,
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
        
        this.lives--;
        
        // Update UI to show new lives count
        this.updateUI();
        
        debugLog("Lives remaining:", this.lives);
        
        // Check if game over
        if (this.lives <= 0) {
            debugLog("Game over - no lives remaining");
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
        
        this.level++;
        this.levelNumber.textContent = this.level;
        this.updateUI();
        
        // Show level message
        this.showLevelMessage();
        
        // Create asteroids and enemies for the new level
        this.createAsteroidsForLevel();
        this.createEnemiesForLevel();
        
    }
    
    showLevelMessage() {
        this.levelMessage.innerHTML = `Level&nbsp;<span id="levelNumber">${this.level}</span>`;
        // Update reference to levelNumber element
        this.levelNumber = document.getElementById('levelNumber');

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

    isSinglePlayer() {
        return this.mode === 'singleplayer';
    }

    isMMO() {
        return this.mode === 'mmo';
    }

    // ============================================
    // MMO PERSISTENT WORLD METHODS
    // ============================================

    /**
     * Start MMO game mode
     */
    startMMOGame(sessionId, playerData) {
        console.log('🌍 MMO: Starting MMO game', { sessionId, playerData });

        // Set mode
        this.mode = 'mmo';
        this.mmoSessionId = sessionId;
        this.mmoPlayerData = playerData;

        // MMO-specific state
        this.mmoPlayers = new Map(); // Other players in the world
        this.mmoAsteroids = new Map(); // Server-controlled asteroids
        this.mmoPendingDestroy = new Map(); // asteroidId -> time hit locally, awaiting server
        this.mmoEnemies = new Map(); // Server-controlled enemies
        this.mmoBullets = []; // All bullets in the world
        this.mmoScore = 0; // Individual score
        this.mmoHighestScore = { score: 0, playerName: '' };
        this.mmoLeaderboard = [];
        this.mmoDead = false;
        this.mmoRespawnTimer = 0;
        this.mmoInvulnerable = false;
        this.mmoInvulnerableTimer = 0;

        // Co-op sessions run on the same server-ticked world, with rounds and shared lives
        this.mmoCoop = sessionId !== 'mmo_world';
        this.coopRound = 0;
        this.coopMaxRounds = 10;
        this.coopLives = 3;
        this.coopResult = null; // 'over' | 'complete'

        // Configure world bounds
        this.worldBounds.enabled = true;
        this.worldBounds.width = 2000;
        this.worldBounds.height = 1500;

        // Enable camera
        this.camera.enabled = true;
        this.camera.followTarget = null;

        // Initialize socket handlers
        this.initializeMMOSync();

        // Join the MMO session via socket
        if (window.socketManager?.socket) {
            window.socketManager.socket.emit('mmo-join', {
                sessionId: sessionId,
                playerData: playerData
            });
        }
    }

    /**
     * Initialize MMO socket event handlers
     */
    initializeMMOSync() {
        if (!window.socketManager?.socket) {
            console.error('🌍 MMO: No socket available for MMO sync');
            return;
        }

        const socket = window.socketManager.socket;
        console.log('🌍 MMO: Initializing MMO sync handlers');

        // Remove any existing MMO handlers first
        socket.off('mmo-join-success');
        socket.off('mmo-join-error');
        socket.off('mmo-state');
        socket.off('mmo-player-joined');
        socket.off('mmo-player-left');
        socket.off('mmo-score-update');
        socket.off('mmo-highest-score');
        socket.off('mmo-asteroid-spawn');
        socket.off('mmo-asteroid-destroyed');
        socket.off('mmo-enemy-spawn');
        socket.off('mmo-enemy-destroyed');
        socket.off('mmo-enemy-shoot');
        socket.off('mmo-bullet-fired');
        socket.off('mmo-player-died');
        socket.off('mmo-respawn');
        socket.off('mmo-player-respawned');
        socket.off('mmo-ship-data');
        socket.off('mmo-round-start');
        socket.off('mmo-round-cleared');
        socket.off('mmo-lives');
        socket.off('mmo-game-over');
        socket.off('mmo-game-complete');

        // Handle successful join
        socket.on('mmo-join-success', (data) => {
            console.log('🌍 MMO: Join success!', data);
            this.playerId = data.player.id;
            this.mmoSessionId = data.sessionId;

            // Update world bounds
            this.worldBounds.width = data.worldBounds.width;
            this.worldBounds.height = data.worldBounds.height;

            this.mmoCoop = data.mode === 'coop';
            if (this.mmoCoop) {
                this.coopRound = data.round || 0;
                this.coopMaxRounds = data.maxRounds || 10;
                this.coopLives = data.lives;
                this.coopResult = null;
            }

            // Initialize game with MMO state
            this.initMMOGame(data);
        });

        socket.on('mmo-round-start', (data) => {
            this.coopRound = data.round;
            this.coopMaxRounds = data.maxRounds;
            this.showWorldMessage(`Round&nbsp;<span id="levelNumber">${data.round}</span>`);
        });

        socket.on('mmo-round-cleared', (data) => {
            this.showWorldMessage(`Round ${data.round} cleared!`);
        });

        socket.on('mmo-lives', (data) => {
            this.coopLives = data.lives;
        });

        socket.on('mmo-game-over', (data) => {
            this.coopResult = 'over';
            this.coopFinalScore = data.teamScore;
            this.gameOver = true;
        });

        socket.on('mmo-game-complete', (data) => {
            this.coopResult = 'complete';
            this.coopFinalScore = data.teamScore;
            this.gameOver = true;
        });

        // Handle join error
        socket.on('mmo-join-error', (data) => {
            console.error('🌍 MMO: Join error:', data.error);
            alert('Failed to join MMO world: ' + data.error);
            if (window.gameMenu) {
                window.gameMenu.showMainMenu();
            }
        });

        // Handle state updates from server
        socket.on('mmo-state', (data) => {
            this.handleMMOStateUpdate(data);
        });

        socket.on('mmo-ship-data', (data) => {
            const entry = this.mmoPlayers.get(data.playerId);
            if (entry && data.shipData) entry.ship.applyCustomization(data.shipData);
        });

        // Handle player joined
        socket.on('mmo-player-joined', (data) => {
            console.log('🌍 MMO: Player joined:', data.playerName);
            this.addMMOPlayer(data);
        });

        // Handle player left
        socket.on('mmo-player-left', (data) => {
            console.log('🌍 MMO: Player left:', data.playerId);
            this.mmoPlayers.delete(data.playerId);
        });

        // Handle score updates
        socket.on('mmo-score-update', (data) => {
            if (data.playerId === this.playerId) {
                this.mmoScore = data.score;
            }
            this.updateMMOLeaderboard();
        });

        // Handle highest score update
        socket.on('mmo-highest-score', (data) => {
            this.mmoHighestScore = data;
        });

        // Handle asteroid spawn
        socket.on('mmo-asteroid-spawn', (data) => {
            this.mmoAsteroids.set(data.id, this.createMMOAsteroid(data));
        });

        // Handle asteroid destroyed
        socket.on('mmo-asteroid-destroyed', (data) => {
            console.log('💥 MMO CLIENT: Received asteroid-destroyed event', data);
            // Shooter already removed it and drew debris locally
            if (this.mmoAsteroids.has(data.asteroidId)) {
                this.createDebrisAtPosition(data.x, data.y);
                this.mmoAsteroids.delete(data.asteroidId);
            }
            this.mmoPendingDestroy.delete(data.asteroidId);

            // Server-computed fragments: identical ids, positions, velocities and shapes everywhere
            (data.children || []).forEach(child => {
                if (!this.mmoAsteroids.has(child.id)) {
                    this.mmoAsteroids.set(child.id, this.createMMOAsteroid(child));
                }
            });
        });

        // Handle enemy spawn
        socket.on('mmo-enemy-spawn', (data) => {
            this.mmoEnemies.set(data.id, this.createMMOEnemy(data));
        });

        // Handle enemy destroyed
        socket.on('mmo-enemy-destroyed', (data) => {
            console.log('💥 MMO CLIENT: Received enemy-destroyed event', data);
            const enemy = this.mmoEnemies.get(data.enemyId);
            if (enemy) {
                console.log('💥 MMO CLIENT: Removing enemy and creating debris');
                this.createDebrisAtPosition(data.x, data.y);
                this.mmoEnemies.delete(data.enemyId);
            } else {
                console.log('💥 MMO CLIENT: Enemy not found in local map');
            }
        });

        // Handle enemy hit (not destroyed, just damaged)
        socket.on('mmo-enemy-hit', (data) => {
            console.log('💥 MMO CLIENT: Enemy hit!', data);
            const enemy = this.mmoEnemies.get(data.enemyId);
            if (enemy) {
                // Flash the enemy to show it was hit
                enemy.hitFlash = 0.3; // Flash duration in seconds
                // Create small hit sparks
                this.createHitSparks(data.x, data.y);
            }
        });

        // Handle enemy shoot
        socket.on('mmo-enemy-shoot', (data) => {
            this.createMMOEnemyBullet(data);
        });

        // Handle bullet fired by other players
        socket.on('mmo-bullet-fired', (data) => {
            // Create visual bullet
            if (data.playerId !== this.playerId) {
                this.mmoBullets.push({
                    ...data.bullet,
                    isRemote: true
                });
            }
        });

        // Handle player death
        socket.on('mmo-player-died', (data) => {
            if (data.playerId === this.playerId) {
                this.mmoDead = true;
                this.mmoRespawnTimer = 3000;
            } else {
                // Show explosion for other player
                this.createDebrisAtPosition(data.x, data.y);
            }
        });

        // Handle respawn
        socket.on('mmo-respawn', (data) => {
            console.log('🌍 MMO: Respawning at', data);
            this.mmoDead = false;
            this.mmoInvulnerable = true;
            this.mmoInvulnerableTimer = 3000;
            this.mmoRespawnTimer = 0;
            if (this.ship) {
                this.ship.x = data.x;
                this.ship.y = data.y;
                this.ship.angle = data.angle;
                this.ship.vx = 0;
                this.ship.vy = 0;
                this.ship.exploding = false;
                this.ship.canShoot = true;
                this.ship.shootTimer = 0;
                this.ship.invulnerable = true;
                this.ship.invulnerableTime = 3;
            }
        });

        // Handle other player respawn
        socket.on('mmo-player-respawned', (data) => {
            const player = this.mmoPlayers.get(data.playerId);
            if (player && player.ship) {
                player.ship.x = data.x;
                player.ship.y = data.y;
                player.dead = false;
            }
        });

        // Start sending position updates
        this.mmoUpdateInterval = setInterval(() => {
            this.sendMMOPlayerUpdate();
        }, 50); // 20 FPS update rate
    }

    /**
     * Initialize MMO game with initial state
     */
    initMMOGame(data) {
        console.log('🌍 MMO: Initializing game with state', data);

        // Reset game state
        this.gameOver = false;
        this.paused = false;
        this.demoMode = false;
        this.mmoScore = 0;
        this._mmoInputLogCount = 0; // Reset debug log counter

        // Create local ship
        const spawnX = data.player.x;
        const spawnY = data.player.y;
        this.ship = new Ship(spawnX, spawnY, this);
        this.ship.playerId = this.playerId;
        this.ship.playerName = data.player.name;

        // Ensure ship is in valid state for MMO (explicitly reset key flags)
        this.ship.exploding = false;
        this.ship.canShoot = true;
        this.ship.visible = true;
        this.ship.alive = true;

        console.log('🌍 MMO: Ship created', {
            x: this.ship.x,
            y: this.ship.y,
            canShoot: this.ship.canShoot,
            exploding: this.ship.exploding,
            playerId: this.ship.playerId
        });

        // Apply ship customization if available
        if (this.mmoPlayerData?.shipData) {
            const shipData = this.mmoPlayerData.shipData;
            this.ship.shipType = 'custom';
            this.ship.customLines = shipData.customLines || [];
            this.ship.color = shipData.color || 'white';
            this.ship.thrusterColor = shipData.thrusterColor || 'blue';
            this.ship.thrusterPoints = shipData.thrusterPoints || [];
            this.ship.weaponPoints = shipData.weaponPoints || [];
            this.ship.playerName = shipData.name || this.ship.playerName;
            console.log('🌍 MMO: Applied ship customization', {
                type: this.ship.shipType,
                customLinesCount: this.ship.customLines.length,
                color: this.ship.color
            });
        }

        // Set camera to follow ship
        this.camera.followTarget = this.ship;

        // Load initial asteroids
        this.mmoAsteroids.clear();
        this.mmoPendingDestroy.clear();
        data.asteroids.forEach(ast => {
            this.mmoAsteroids.set(ast.id, this.createMMOAsteroid(ast));
        });

        // Load initial enemies
        this.mmoEnemies.clear();
        data.enemies.forEach(enemy => {
            this.mmoEnemies.set(enemy.id, this.createMMOEnemy(enemy));
        });

        // Load other players
        this.mmoPlayers.clear();
        data.players.forEach(player => {
            if (player.id !== this.playerId) {
                this.addMMOPlayer(player);
            }
        });

        // Set highest score
        this.mmoHighestScore = data.highestScore;

        // Clear bullets and debris
        this.mmoBullets = [];
        this.bullets = [];
        this.debris = [];

        // Re-initialize touch controls for the new ship
        if (this.isMobileDevice) {
            this.initTouchControls();
        }

        // Stop any existing game loop by temporarily setting gameOver, then restart
        // This prevents multiple concurrent game loops
        if (this._gameLoopActive) {
            console.log('🌍 MMO: Stopping existing game loop before starting new one');
            this.gameOver = true; // Will cause current loop to exit on next iteration
        }

        // Reset accumulator to prevent time accumulation issues
        this.accumulator = 0;

        // Small delay to allow any existing loop to exit, then start fresh
        setTimeout(() => {
            this.gameOver = false;
            this._gameLoopActive = true;
            this.lastTime = performance.now() / 1000;
            requestAnimationFrame(this.gameLoop.bind(this));

            console.log('🌍 MMO: Game initialized and running', {
                shipExists: !!this.ship,
                shipCanShoot: this.ship?.canShoot,
                mmoDead: this.mmoDead,
                mmoInvulnerable: this.mmoInvulnerable,
                mode: this.mode
            });
        }, 50); // 50ms delay to allow existing loop to exit
    }

    /**
     * Create MMO asteroid from server data
     */
    createMMOAsteroid(data) {
        // Radius comes from size and shape from seed, so every client draws the same asteroid
        const asteroid = new Asteroid(data.x, data.y, data.size || 2, this, data.seed);
        asteroid.id = data.id;
        asteroid.vx = data.vx || 0;
        asteroid.vy = data.vy || 0;
        asteroid.rotation = data.rotation || 0;
        asteroid.rotationSpeed = data.rotationSpeed || 0;
        return asteroid;
    }

    /**
     * Create MMO enemy from server data
     */
    createMMOEnemy(data) {
        const enemy = new Enemy(data.x, data.y, this);
        enemy.id = data.id;
        // Enemy sprite and server share math angle convention (0=right)
        enemy.angle = data.angle || 0;
        enemy.health = data.health || 3;
        return enemy;
    }

    /**
     * Create bullet from MMO enemy
     */
    createMMOEnemyBullet(data) {
        // Server uses math angle convention (0=right), Bullet expects game convention (0=up)
        // Convert: gameAngle = mathAngle + π/2
        const gameAngle = data.angle + Math.PI / 2;

        // Bullet constructor: (x, y, angle, shipXv, shipYv, game, source, weaponCount, ownerId)
        const bullet = new Bullet(data.x, data.y, gameAngle, 0, 0, this, 'enemy', 1, data.enemyId);
        bullet.isEnemyBullet = true;
        bullet.color = 'red';
        this.bullets.push(bullet);
    }

    /**
     * Add MMO player to the game
     */
    addMMOPlayer(playerData) {
        const ship = new Ship(playerData.x, playerData.y, this);
        ship.playerId = playerData.playerId || playerData.id;
        ship.playerName = playerData.playerName || playerData.name || 'Unknown';
        ship.angle = playerData.angle || 0;

        // Apply ship customization if available
        if (playerData.shipData) {
            ship.applyCustomization(playerData.shipData);
        }

        this.mmoPlayers.set(ship.playerId, {
            ship: ship,
            lastUpdate: Date.now(),
            dead: playerData.dead || false
        });
    }

    /**
     * Handle MMO state update from server
     */
    handleMMOStateUpdate(data) {
        // Update asteroids
        data.asteroids.forEach(astData => {
            let asteroid = this.mmoAsteroids.get(astData.id);
            if (asteroid) {
                asteroid.x = astData.x;
                asteroid.y = astData.y;
                asteroid.vx = astData.vx;
                asteroid.vy = astData.vy;
                asteroid.rotation = astData.rotation;
            } else if (!this.mmoPendingDestroy.has(astData.id)) {
                this.mmoAsteroids.set(astData.id, this.createMMOAsteroid(astData));
            }
        });

        // Expire local hits the server never confirmed (e.g. another player got it first)
        const now = Date.now();
        for (const [id, t] of this.mmoPendingDestroy) {
            if (now - t > 1000) this.mmoPendingDestroy.delete(id);
        }

        // Remove asteroids not in update
        const serverAsteroidIds = new Set(data.asteroids.map(a => a.id));
        for (const [id] of this.mmoAsteroids) {
            if (!serverAsteroidIds.has(id)) {
                this.mmoAsteroids.delete(id);
            }
        }

        // Update enemies
        data.enemies.forEach(enemyData => {
            let enemy = this.mmoEnemies.get(enemyData.id);
            if (enemy) {
                enemy.x = enemyData.x;
                enemy.y = enemyData.y;
                // Enemy sprite and server share math angle convention (0=right)
                enemy.angle = enemyData.angle || 0;
                enemy.health = enemyData.health;
            } else {
                this.mmoEnemies.set(enemyData.id, this.createMMOEnemy(enemyData));
            }
        });

        // Remove enemies not in update
        const serverEnemyIds = new Set(data.enemies.map(e => e.id));
        for (const [id] of this.mmoEnemies) {
            if (!serverEnemyIds.has(id)) {
                this.mmoEnemies.delete(id);
            }
        }

        // Update other players
        data.players.forEach(playerData => {
            if (playerData.id === this.playerId) return;

            let playerEntry = this.mmoPlayers.get(playerData.id);
            if (playerEntry) {
                playerEntry.ship.x = playerData.x;
                playerEntry.ship.y = playerData.y;
                playerEntry.ship.angle = playerData.angle;
                playerEntry.dead = playerData.dead;
                playerEntry.lastUpdate = Date.now();
            } else {
                this.addMMOPlayer(playerData);
            }
        });

        // Remove players not in update
        const serverPlayerIds = new Set(data.players.map(p => p.id));
        for (const [id] of this.mmoPlayers) {
            if (!serverPlayerIds.has(id)) {
                this.mmoPlayers.delete(id);
            }
        }

        // Update leaderboard from player scores
        this.mmoLeaderboard = data.players
            .map(p => ({ id: p.id, name: p.name, score: p.score }))
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Send player position update to server
     */
    sendMMOPlayerUpdate() {
        if (!this.isMMO() || !this.ship || this.mmoDead) return;

        const { x, y, angle, vx, vy } = this.ship;
        const last = this.lastMMOSent;
        const now = Date.now();
        if (last && last.x === x && last.y === y && last.angle === angle && now - last.t < 1000) return;

        if (window.socketManager?.socket) {
            window.socketManager.socket.volatile.emit('mmo-player-update', { x, y, angle, vx, vy });
            this.lastMMOSent = { x, y, angle, t: now };
        }
    }

    /**
     * Update leaderboard
     */
    updateMMOLeaderboard() {
        // Leaderboard is updated via mmo-state events
    }

    /**
     * Handle shooting in MMO mode
     */
    mmoShoot() {
        // Only block shooting when dead, allow shooting while invulnerable
        if (this.mmoDead) {
            return;
        }

        if (!this.ship || this.ship.exploding) {
            return;
        }

        // Create local bullets for immediate feedback
        const bullets = this.ship.shoot();
        console.log('🔫 MMO: ship.shoot() returned', bullets?.length, 'bullets');
        if (bullets && bullets.length > 0) {
            this.bullets = this.bullets.concat(bullets);

            // Send shoot event to server (use first bullet position)
            if (window.socketManager?.socket) {
                window.socketManager.socket.emit('mmo-shoot', {
                    x: bullets[0].x,
                    y: bullets[0].y,
                    angle: this.ship.angle
                });
            }
        }
    }

    /**
     * Handle player death in MMO
     */
    mmoPlayerDied() {
        if (this.mmoDead) return;

        this.mmoDead = true;
        this.ship.exploding = true;
        this.createDebrisAtPosition(this.ship.x, this.ship.y);

        if (window.socketManager?.socket) {
            window.socketManager.socket.emit('mmo-player-died', {
                x: this.ship.x,
                y: this.ship.y
            });
        }
    }

    /**
     * Leave MMO session
     */
    leaveMMOSession() {
        if (this.mmoUpdateInterval) {
            clearInterval(this.mmoUpdateInterval);
            this.mmoUpdateInterval = null;
        }

        if (window.socketManager?.socket) {
            window.socketManager.socket.emit('mmo-leave');
        }

        this.mode = 'singleplayer';
        this.mmoSessionId = null;
        this.mmoPlayers.clear();
        this.mmoAsteroids.clear();
        this.mmoPendingDestroy.clear();
        this.mmoEnemies.clear();
    }

    showWorldMessage(html) {
        if (!this.levelMessage) return;
        this.levelMessage.innerHTML = html;
        this.levelNumber = document.getElementById('levelNumber');
        this.levelMessage.style.display = 'flex';
        clearTimeout(this._worldMessageTimer);
        this._worldMessageTimer = setTimeout(() => {
            this.levelMessage.style.display = 'none';
        }, 2000);
    }

    /**
     * Draw MMO HUD
     */
    drawMMOHUD() {
        if (this.demoMode) return;

        this.ctx.save();

        // Mode indicator
        this.ctx.fillStyle = '#0ff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        if (this.mmoCoop) {
            this.ctx.fillText(`CO-OP · ROUND ${this.coopRound}/${this.coopMaxRounds} · LIVES ${this.coopLives}`, this.canvas.width / 2, 30);
        } else {
            this.ctx.fillText('MMO WORLD', this.canvas.width / 2, 30);
        }

        if (this.coopResult) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(this.canvas.width / 2 - 180, this.canvas.height / 2 - 50, 360, 100);
            this.ctx.fillStyle = this.coopResult === 'complete' ? '#0f0' : 'red';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.fillText(this.coopResult === 'complete' ? 'ALL ROUNDS CLEARED!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`Team score: ${this.coopFinalScore || 0}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.restore();
            return;
        }

        // Your score (top right)
        this.ctx.fillStyle = 'white';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Your Score: ${this.mmoScore}`, this.canvas.width - 20, 30);

        // Highest active score (yellow)
        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText(`Highest: ${this.mmoHighestScore.score} (${this.mmoHighestScore.playerName || '-'})`, this.canvas.width - 20, 55);

        // Player count
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '14px Arial';
        const playerCount = this.mmoPlayers.size + 1;
        this.ctx.fillText(`Players: ${playerCount}/5`, this.canvas.width - 20, 75);

        // Leaderboard (top left)
        this.drawMMOLeaderboard();

        // Dead/Respawn message
        if (this.mmoDead) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(this.canvas.width / 2 - 150, this.canvas.height / 2 - 40, 300, 80);

            this.ctx.fillStyle = 'red';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('DESTROYED', this.canvas.width / 2, this.canvas.height / 2);

            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            const respawnSecs = Math.ceil(this.mmoRespawnTimer / 1000);
            this.ctx.fillText(`Respawning in ${respawnSecs}...`, this.canvas.width / 2, this.canvas.height / 2 + 25);
        }

        // Invulnerability indicator
        if (this.mmoInvulnerable) {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('INVULNERABLE', this.canvas.width / 2, this.canvas.height - 30);
        }

        this.ctx.restore();
    }

    /**
     * Draw MMO leaderboard
     */
    drawMMOLeaderboard() {
        if (!this.mmoLeaderboard || this.mmoLeaderboard.length === 0) return;

        const x = 10;
        const y = 50;
        const width = 180;
        const height = 20 + this.mmoLeaderboard.slice(0, 5).length * 20;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, width, height);

        // Title
        this.ctx.fillStyle = '#ff0';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('LEADERBOARD', x + 10, y + 18);

        // Players
        this.ctx.font = '12px Arial';
        let rowY = y + 38;

        this.mmoLeaderboard.slice(0, 5).forEach((player, index) => {
            const isMe = player.id === this.playerId;
            this.ctx.fillStyle = isMe ? '#0ff' : 'white';
            this.ctx.fillText(`${index + 1}. ${player.name}: ${player.score}`, x + 10, rowY);
            rowY += 18;
        });
    }

    /**
     * Update game state in MMO mode
     */
    updateMMO(dt) {
        // Handle input (controls)
        this.handleInput();

        // Extrapolate asteroids between 20Hz server snapshots (server units are per 60fps frame)
        const frames = dt * 60;
        for (const [, asteroid] of this.mmoAsteroids) {
            asteroid.x += asteroid.vx * frames;
            asteroid.y += asteroid.vy * frames;
            asteroid.rotation += asteroid.rotationSpeed * frames;
        }

        // Touch controls
        if (this.ship && this.touchControls && this.touchControls.isActive()) {
            this.ship.touchControlsActive = true;
        } else if (this.ship) {
            this.ship.touchControlsActive = false;
        }

        // Update respawn timer
        if (this.mmoDead && this.mmoRespawnTimer > 0) {
            this.mmoRespawnTimer -= dt * 1000;
        }

        // Update invulnerability timer
        if (this.mmoInvulnerable && this.mmoInvulnerableTimer > 0) {
            this.mmoInvulnerableTimer -= dt * 1000;
            if (this.mmoInvulnerableTimer <= 0) {
                this.mmoInvulnerable = false;
            }
        }

        // Update ship if not dead
        if (this.ship && !this.mmoDead && !this.ship.exploding) {
            this.ship.update(dt);

            // Touch controls
            if (window.updateTouchControls && this.touchControls && this.touchControls.isActive()) {
                window.updateTouchControls.call(this);
            }
        }

        // Update local bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(dt);
            if (this.bullets[i].isExpired()) {
                this.bullets.splice(i, 1);
            }
        }

        // Update debris
        for (let i = this.debris.length - 1; i >= 0; i--) {
            this.debris[i].update(dt);
            if (this.debris[i].lifeTime <= 0) {
                this.debris.splice(i, 1);
            }
        }

        // Check local collisions (client-side prediction for immediate feedback)
        // Always check collisions - bullet vs enemy/asteroid should work even when player is invulnerable
        if (!this.mmoDead && this.ship) {
            this.checkMMOCollisions();
        }
    }

    /**
     * Check collisions in MMO mode - using same logic as single player
     */
    checkMMOCollisions() {
        if (!this.ship || this.mmoDead || this.ship.exploding) return;

        // Check ship-asteroid collisions using proper ship collision detection
        if (!this.ship.invulnerable && !this.mmoInvulnerable) {
            for (const [asteroidId, asteroid] of this.mmoAsteroids) {
                // Use the ship's enhanced collision detection (checks ship lines)
                if (this.ship.checkCollision(asteroid)) {
                    console.log('💥 MMO: Ship-asteroid collision!', asteroidId);
                    if (window.socketManager?.socket) {
                        window.socketManager.socket.emit('mmo-ship-collision', {
                            type: 'asteroid',
                            objectId: asteroidId,
                            x: asteroid.x,
                            y: asteroid.y
                        });
                    }
                    this.mmoPlayerDied();
                    return;
                }
            }

            // Check ship-enemy collisions using proper ship collision detection
            for (const [enemyId, enemy] of this.mmoEnemies) {
                if (this.ship.checkCollision(enemy)) {
                    console.log('💥 MMO: Ship-enemy collision!', enemyId);
                    if (window.socketManager?.socket) {
                        window.socketManager.socket.emit('mmo-ship-collision', {
                            type: 'enemy',
                            objectId: enemyId,
                            x: enemy.x,
                            y: enemy.y
                        });
                    }
                    this.mmoPlayerDied();
                    return;
                }
            }

            // Check ship-enemy bullet collisions using proper ship collision detection
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                if (bullet.isEnemyBullet || bullet.source === 'enemy') {
                    if (this.ship.checkCollision(bullet)) {
                        console.log('💥 MMO: Enemy bullet hit player ship!');
                        this.bullets.splice(i, 1);
                        this.mmoPlayerDied();
                        return;
                    }
                }
            }
        }

        // Check PLAYER bullet collisions with asteroids and enemies (CLIENT-SIDE)
        // Debug: log bullet count periodically
        if (this.bullets.length > 0 && !this._bulletDebugThrottle) {
            this._bulletDebugThrottle = true;
            console.log('🔫 MMO Collision Check:', this.bullets.length, 'bullets,', this.mmoAsteroids.size, 'asteroids,', this.mmoEnemies.size, 'enemies');
            setTimeout(() => { this._bulletDebugThrottle = false; }, 500);
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemyBullet || bullet.source === 'enemy') continue;

            let bulletDestroyed = false;

            // Check bullet-asteroid collisions
            for (const [asteroidId, asteroid] of this.mmoAsteroids) {
                const dx = bullet.x - asteroid.x;
                const dy = bullet.y - asteroid.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const collisionDist = bullet.radius + asteroid.radius;

                if (dist < collisionDist) {
                    console.log('💥 MMO: Player bullet hit asteroid!', asteroidId, 'dist:', dist, 'needed <', collisionDist);
                    this.bullets.splice(i, 1);
                    bulletDestroyed = true;

                    // Tell server to destroy asteroid and award points
                    if (window.socketManager?.socket) {
                        window.socketManager.socket.emit('mmo-bullet-hit', {
                            type: 'asteroid',
                            objectId: asteroidId,
                            x: asteroid.x,
                            y: asteroid.y
                        });
                    }

                    // Create debris locally for immediate feedback; fragments come from the server
                    this.createDebrisAtPosition(asteroid.x, asteroid.y);
                    this.mmoAsteroids.delete(asteroidId);
                    this.mmoPendingDestroy.set(asteroidId, Date.now());
                    break;
                }
            }

            if (bulletDestroyed) continue;

            // Check bullet-enemy collisions
            for (const [enemyId, enemy] of this.mmoEnemies) {
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const collisionDist = bullet.radius + (enemy.radius || 20);

                // Debug: log near misses
                if (dist < 100 && !enemy._nearMissLogged) {
                    console.log('🎯 Near enemy:', enemyId, 'bullet at', bullet.x.toFixed(0), bullet.y.toFixed(0),
                        'enemy at', enemy.x.toFixed(0), enemy.y.toFixed(0), 'dist:', dist.toFixed(0), 'need <', collisionDist.toFixed(0));
                    enemy._nearMissLogged = true;
                    setTimeout(() => { enemy._nearMissLogged = false; }, 1000);
                }

                if (dist < collisionDist) {
                    console.log('💥 MMO: Player bullet hit enemy!', enemyId);
                    this.bullets.splice(i, 1);

                    // Tell server to damage/destroy enemy and award points
                    if (window.socketManager?.socket) {
                        window.socketManager.socket.emit('mmo-bullet-hit', {
                            type: 'enemy',
                            objectId: enemyId,
                            x: enemy.x,
                            y: enemy.y
                        });
                    }
                    break;
                }
            }
        }
    }

    /**
     * Render MMO-specific entities
     */
    renderMMO() {
        // Draw MMO asteroids
        for (const [, asteroid] of this.mmoAsteroids) {
            asteroid.draw(this.ctx);
        }

        // Draw MMO enemies
        for (const [, enemy] of this.mmoEnemies) {
            enemy.draw(this.ctx);
        }

        // Draw other MMO players
        for (const [playerId, playerData] of this.mmoPlayers) {
            if (!playerData.dead && playerData.ship) {
                playerData.ship.draw(this.ctx);

                // Draw player name above ship
                this.ctx.save();
                this.ctx.fillStyle = '#aaa';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(playerData.ship.playerName || 'Player', playerData.ship.x, playerData.ship.y - 25);
                this.ctx.restore();
            }
        }
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

    createDebrisAtPosition(x, y) {
        if (!isFinite(x) || !isFinite(y)) {
            debugLog('createDebrisAtPosition: Invalid position, skipping debris');
            return;
        }

        const numParticles = 20;
        debugLog(`Creating ship debris at (${x.toFixed(0)}, ${y.toFixed(0)})`);

        for (let i = 0; i < numParticles; i++) {
            const debris = new Debris(
                x,
                y,
                Math.random() * Math.PI * 2,
                this
            );
            debris.color = i % 2 === 0 ? 'orange' : 'red';
            this.debris.push(debris);
        }
    }

    createHitSparks(x, y) {
        if (!isFinite(x) || !isFinite(y)) return;

        // Create fewer, smaller particles for hit feedback
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const debris = new Debris(
                x,
                y,
                Math.random() * Math.PI * 2,
                this
            );
            debris.color = i % 2 === 0 ? 'yellow' : 'white';
            debris.lifeSpan = 0.3; // Shorter lifespan
            debris.speed = 2; // Faster initial speed
            this.debris.push(debris);
        }
    }
}