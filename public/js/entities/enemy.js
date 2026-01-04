// public/js/entities/enemy.js
class Enemy {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;

        // Movement properties
        this.angle = Math.random() * Math.PI * 2; // Random initial angle
        this.speed = 60 + Math.random() * 30; // Speed in pixels per second
        this.rotationSpeed = 1.5; // Radians per second
        this.shootCooldown = 0;
        this.shootInterval = 2 + Math.random() * 2; // Random interval between 2-4 seconds

        // Visual properties
        this.radius = 15;
        this.color = 'red';

        // State
        this.active = true;

        // Multiplayer properties
        this.id = null;
        this.isMultiplayerEnemy = false;
        this.health = 3;
        this.mode = 'patrol'; // 'patrol' or 'pursuit'
        this.currentWaypoint = { x: 0, y: 0 };
        this.waypointSeed = Date.now();
        this.waypointIndex = 0;
        this.pursuitTarget = null;
        this.proximityThreshold = 200;
        this.disengageThreshold = 300;
        this.patrolSpeed = 80;
        this.pursuitSpeed = 120;

        // Interpolation for smooth client movement
        this.targetX = this.x;
        this.targetY = this.y;
        this.targetAngle = this.angle;
        this.lerpSpeed = 10; // Interpolation speed multiplier
    }
    
    update(dt) {
        if (!this.active) return;
        
        // Use mathematical movement for synchronized enemies
        if (this.isMathematical && this.mathData) {
            this.updateMathematicalMovement();
            return;
        }
        
        // If this is a client-controlled copy, don't run AI - just move based on interpolated position
        if (this.isClientControlled) {
            return; // Position is updated via interpolation from server updates
        }
        
        // Move the enemy
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        
        // Handle movement boundaries (wrapping or bouncing)
        this.handleMovementBounds();
        
        // Check if we should change direction
        if (Math.random() < 0.01) {
            // 1% chance per frame to change angle
            this.angle += (Math.random() - 0.5) * Math.PI / 2;
        }
        
        // Update shooting cooldown
        this.shootCooldown -= dt;
        if (this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = this.shootInterval;
        }
        
        // If player's ship exists, occasionally aim at it
        if (this.game.ship && !this.game.ship.exploding && Math.random() < 0.03) {
            this.aimAtPlayer();
        }
    }
    
    draw(ctx) {
        if (!this.active) return;

        // Prevent canvas crash from NaN values
        if (!isFinite(this.x) || !isFinite(this.y) || !isFinite(this.angle)) {
            return;
        }

        // Draw enemy ship
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw the ship body
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        
        // Draw enemy ship shape (triangle with extra details)
        ctx.moveTo(15, 0); // Nose
        ctx.lineTo(-10, -10); // Left rear
        ctx.lineTo(-5, 0); // Middle rear
        ctx.lineTo(-10, 10); // Right rear
        ctx.closePath();
        
        // Add some details
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        
        ctx.moveTo(-5, -5);
        ctx.lineTo(0, -3);
        
        ctx.moveTo(-5, 5);
        ctx.lineTo(0, 3);
        
        ctx.stroke();
        
        // Draw a small red dot at the center
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    handleMovementBounds() {
        // Check game mode and apply appropriate boundary behavior
        if (this.game.isMultiplayer()) {
            this.handleBoundaryBounce();
        } else {
            this.wrapPosition();
        }
    }
    
    wrapPosition() {
        // Wrap horizontal position
        if (this.x < 0) {
            this.x = this.game.canvas.width;
        } else if (this.x > this.game.canvas.width) {
            this.x = 0;
        }
        
        // Wrap vertical position
        if (this.y < 0) {
            this.y = this.game.canvas.height;
        } else if (this.y > this.game.canvas.height) {
            this.y = 0;
        }
    }
    
    handleBoundaryBounce() {
        const bounds = this.game.getWorldBounds();
        if (!bounds.enabled) {
            this.wrapPosition();
            return;
        }
        
        // Bounce off world boundaries and change direction
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.angle = Math.PI - this.angle; // Reflect angle horizontally
        } else if (this.x + this.radius >= bounds.width) {
            this.x = bounds.width - this.radius;
            this.angle = Math.PI - this.angle; // Reflect angle horizontally
        }
        
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.angle = -this.angle; // Reflect angle vertically
        } else if (this.y + this.radius >= bounds.height) {
            this.y = bounds.height - this.radius;
            this.angle = -this.angle; // Reflect angle vertically
        }
    }
    
    aimAtPlayer() {
        // In multiplayer, find the nearest player to target
        let targetX, targetY;
        
        if (this.game.isMultiplayer && this.game.isMultiplayer()) {
            // Find nearest player (including other players)
            let nearestDistance = Infinity;
            targetX = this.x;
            targetY = this.y;
            
            // Check main player ship
            if (this.game.ship && !this.game.ship.exploding) {
                const dx = this.game.ship.x - this.x;
                const dy = this.game.ship.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    targetX = this.game.ship.x;
                    targetY = this.game.ship.y;
                }
            }
            
            // Check other players
            if (this.game.otherPlayers) {
                for (const playerId in this.game.otherPlayers) {
                    const player = this.game.otherPlayers[playerId];
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        targetX = player.x;
                        targetY = player.y;
                    }
                }
            }
            
            // No valid target found
            if (nearestDistance === Infinity) return;
        } else {
            // Single player mode - target the player ship
            if (!this.game.ship || this.game.ship.exploding) return;
            targetX = this.game.ship.x;
            targetY = this.game.ship.y;
        }
        
        // Calculate angle to target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // Gradually turn toward the target
        let angleDiff = targetAngle - this.angle;
        
        // Normalize angle difference to between -PI and PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply a small turn toward the target
        this.angle += Math.sign(angleDiff) * 0.1;
    }
    
    updateMathematicalMovement() {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.mathData.spawnTime) / 1000; // Convert to seconds
        
        // Circular movement pattern (orbiting around center point)
        const angle = this.mathData.baseSpeed * elapsedTime;
        this.x = this.mathData.centerX + Math.cos(angle) * this.mathData.radius;
        this.y = this.mathData.centerY + Math.sin(angle) * this.mathData.radius;
        
        // Face the direction of movement
        this.angle = angle + Math.PI / 2; // Add 90 degrees to face forward
    }
    
    // Helper method to draw hexagons
    drawHexagon(ctx, x, y, radius, angle) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = angle + i * Math.PI / 3;
            const hx = x + radius * Math.cos(a);
            const hy = y + radius * Math.sin(a);
            
            if (i === 0) {
                ctx.moveTo(hx, hy);
            } else {
                ctx.lineTo(hx, hy);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    shoot() {
        // Don't shoot if ship is exploding or in demo mode
        if (!this.game.ship || this.game.ship.exploding || this.game.demoMode) {
            return null;
        }
        
        try {
            // Create a new bullet with proper parameters
            const bullet = new Bullet(
                this.x + Math.cos(this.angle) * 15, // Start at the nose of the ship
                this.y + Math.sin(this.angle) * 15,
                this.angle,
                0, // No ship velocity x component
                0, // No ship velocity y component
                this.game,
                'enemy' // Indicate this is an enemy bullet
            );
            
            // Add bullet to game
            this.game.bullets.push(bullet);
            
            // Return the created bullet
            return bullet;
        } catch (e) {
            console.error("Error creating enemy bullet:", e);
            return null;
        }
    }

    hit() {
        this.active = false;
        // Notify game to create explosion effect
        if (typeof this.game.createDebrisFromEnemy === 'function') {
            this.game.createDebrisFromEnemy(this);
        }
    }

    // Multiplayer-specific methods

    multiplayerUpdate(dt) {
        if (!this.active || !this.isMultiplayerEnemy) return;

        if (this.mode === 'patrol') {
            this.moveToWaypoint(dt);
            this.checkForNearbyPlayers();
        } else {
            this.pursuePlayer(dt);
            this.checkIfLostTarget();
        }

        this.aimAtNearestPlayer();

        this.shootCooldown -= dt;
        if (this.shootCooldown <= 0) {
            const bullet = this.shoot();
            if (bullet && this.game.isHost) {
                this.game.broadcastEnemyShoot(this);
            }
            this.shootCooldown = this.shootInterval;
        }
    }

    seededRandom() {
        this.waypointSeed = (this.waypointSeed * 9301 + 49297) % 233280;
        return this.waypointSeed / 233280;
    }

    generateNextWaypoint() {
        const bounds = this.game.getWorldBounds();
        const margin = 100;
        const width = bounds.enabled ? bounds.width : this.game.canvas.width;
        const height = bounds.enabled ? bounds.height : this.game.canvas.height;

        this.currentWaypoint = {
            x: margin + this.seededRandom() * (width - margin * 2),
            y: margin + this.seededRandom() * (height - margin * 2)
        };
        this.waypointIndex++;
    }

    moveToWaypoint(dt) {
        if (!this.currentWaypoint.x && !this.currentWaypoint.y) {
            this.generateNextWaypoint();
        }

        const dx = this.currentWaypoint.x - this.x;
        const dy = this.currentWaypoint.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 30) {
            this.generateNextWaypoint();
            return;
        }

        const targetAngle = Math.atan2(dy, dx);
        this.x += Math.cos(targetAngle) * this.patrolSpeed * dt;
        this.y += Math.sin(targetAngle) * this.patrolSpeed * dt;

        this.handleBoundaryBounce();
    }

    checkForNearbyPlayers() {
        const nearest = this.findNearestPlayer();
        if (nearest && nearest.distance < this.proximityThreshold) {
            this.mode = 'pursuit';
            this.pursuitTarget = nearest;
        }
    }

    pursuePlayer(dt) {
        if (!this.pursuitTarget) {
            this.mode = 'patrol';
            return;
        }

        const target = this.getTargetPosition(this.pursuitTarget);
        if (!target) {
            this.mode = 'patrol';
            this.pursuitTarget = null;
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const targetAngle = Math.atan2(dy, dx);

        this.x += Math.cos(targetAngle) * this.pursuitSpeed * dt;
        this.y += Math.sin(targetAngle) * this.pursuitSpeed * dt;

        this.handleBoundaryBounce();
    }

    getTargetPosition(target) {
        if (target.isMainShip && this.game.ship && !this.game.ship.exploding) {
            return { x: this.game.ship.x, y: this.game.ship.y };
        } else if (target.playerId && this.game.otherPlayers) {
            const player = this.game.otherPlayers[target.playerId];
            if (player) {
                return { x: player.x, y: player.y };
            }
        }
        return null;
    }

    checkIfLostTarget() {
        if (!this.pursuitTarget) {
            this.mode = 'patrol';
            return;
        }

        const target = this.getTargetPosition(this.pursuitTarget);
        if (!target) {
            this.mode = 'patrol';
            this.pursuitTarget = null;
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.disengageThreshold) {
            this.mode = 'patrol';
            this.pursuitTarget = null;
        }
    }

    findNearestPlayer() {
        let nearest = null;
        let nearestDistance = Infinity;

        if (this.game.ship && !this.game.ship.exploding) {
            const dx = this.game.ship.x - this.x;
            const dy = this.game.ship.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = { isMainShip: true, distance: distance };
            }
        }

        if (this.game.otherPlayers) {
            for (const playerId in this.game.otherPlayers) {
                const player = this.game.otherPlayers[playerId];
                if (player.exploding) continue;
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = { playerId: playerId, distance: distance };
                }
            }
        }

        return nearest;
    }

    aimAtNearestPlayer() {
        const nearest = this.findNearestPlayer();
        if (!nearest) return;

        let targetX, targetY;
        if (nearest.isMainShip) {
            targetX = this.game.ship.x;
            targetY = this.game.ship.y;
        } else if (nearest.playerId && this.game.otherPlayers[nearest.playerId]) {
            targetX = this.game.otherPlayers[nearest.playerId].x;
            targetY = this.game.otherPlayers[nearest.playerId].y;
        } else {
            return;
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const targetAngle = Math.atan2(dy, dx);

        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.rotationSpeed * 0.016);
    }

    getStateForBroadcast() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            angle: this.angle,
            health: this.health,
            mode: this.mode,
            waypointIndex: this.waypointIndex
        };
    }

    setStateFromNetwork(data) {
        // Set target values for interpolation (smooth movement)
        if (isFinite(data.x)) this.targetX = data.x;
        if (isFinite(data.y)) this.targetY = data.y;
        if (isFinite(data.angle)) this.targetAngle = data.angle;
        if (typeof data.health === 'number') this.health = data.health;
        if (data.mode) this.mode = data.mode;
    }

    // Interpolate towards target position (called for client-controlled enemies)
    interpolatePosition(dt) {
        if (!this.isClientControlled) return;

        const lerpFactor = Math.min(1, this.lerpSpeed * dt);

        // Lerp position
        this.x += (this.targetX - this.x) * lerpFactor;
        this.y += (this.targetY - this.y) * lerpFactor;

        // Lerp angle (handle wraparound)
        let angleDiff = this.targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += angleDiff * lerpFactor;
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.hit();
            return true;
        }
        return false;
    }
}