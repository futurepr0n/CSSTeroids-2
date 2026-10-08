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

        // Ship physics: must face a direction to thrust or fire
        this.vx = 0;
        this.vy = 0;
        this.thrust = 120; // px/s^2 along heading
        this.drag = 0.6; // fraction of velocity kept per second
        this.fireCone = 0.15; // rad; must face target within this to fire
        this.fireRange = 450;
        this.engageRange = 500;
        this.wanderAngle = this.angle;

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

        // Target switching system
        this.designatedTargetId = null; // 'main' for local ship, or playerId for other players
        this.aggroDistance = 150; // Distance at which a bullet draws aggro

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
        
        const target = this.getSinglePlayerTarget();
        let facingError = Infinity;
        let distance = Infinity;

        if (target && target.distance < this.engageRange) {
            distance = target.distance;
            facingError = this.steerToward(target.x, target.y, dt, this.speed, 150);
        } else {
            // Wander: drift a heading and fly toward a point along it
            this.wanderAngle += (Math.random() - 0.5) * 2 * dt;
            this.steerToward(
                this.x + Math.cos(this.wanderAngle) * 100,
                this.y + Math.sin(this.wanderAngle) * 100,
                dt, this.speed * 0.6
            );
        }

        this.applyPhysics(dt, this.speed);
        this.handleMovementBounds();
        this.tryFire(dt, facingError, distance);
    }

    getSinglePlayerTarget() {
        if (this.game.isMultiplayer && this.game.isMultiplayer()) {
            const nearest = this.findNearestPlayer(false);
            if (!nearest) return null;
            const pos = nearest.isMainShip ? this.game.ship : this.game.otherPlayers[nearest.playerId];
            return pos ? { x: pos.x, y: pos.y, distance: nearest.distance } : null;
        }
        const ship = this.game.ship;
        if (!ship || ship.exploding) return null;
        return { x: ship.x, y: ship.y, distance: Math.hypot(ship.x - this.x, ship.y - this.y) };
    }

    // Rotate toward a point at a limited rate; thrust only along current heading
    // when roughly facing it and farther than standoff. Returns remaining facing error.
    steerToward(tx, ty, dt, maxSpeed, standoff = 0) {
        let angleDiff = Math.atan2(ty - this.y, tx - this.x) - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.rotationSpeed * dt);

        const error = Math.abs(angleDiff);
        const distance = Math.hypot(tx - this.x, ty - this.y);
        if (error < Math.PI / 2 && distance > standoff) {
            this.vx += Math.cos(this.angle) * this.thrust * dt;
            this.vy += Math.sin(this.angle) * this.thrust * dt;
        }
        this.currentMaxSpeed = maxSpeed;
        return error;
    }

    applyPhysics(dt, maxSpeed = this.currentMaxSpeed || this.speed) {
        const keep = Math.pow(this.drag, dt);
        this.vx *= keep;
        this.vy *= keep;
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > maxSpeed) {
            this.vx *= maxSpeed / speed;
            this.vy *= maxSpeed / speed;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    // Fire only from the nose when aimed within the cone and in range
    tryFire(dt, facingError, distance) {
        this.shootCooldown -= dt;
        if (this.shootCooldown > 0 || facingError > this.fireCone || distance > this.fireRange) return null;
        this.shootCooldown = this.shootInterval;
        return this.shoot();
    }

    aimError(targetPos) {
        let angleDiff = Math.atan2(targetPos.y - this.y, targetPos.x - this.x) - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        return Math.abs(angleDiff);
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
        // Bounce velocity off world boundaries; heading must still turn normally
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx) * 0.5;
        } else if (this.x + this.radius >= bounds.width) {
            this.x = bounds.width - this.radius;
            this.vx = -Math.abs(this.vx) * 0.5;
        }
        
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.vy = Math.abs(this.vy) * 0.5;
        } else if (this.y + this.radius >= bounds.height) {
            this.y = bounds.height - this.radius;
            this.vy = -Math.abs(this.vy) * 0.5;
        }
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
            // Bullet class uses sin/cos convention where angle=0 points UP
            // Enemy visual has nose pointing RIGHT at angle=0
            // So we need to offset by +PI/2 to align bullet direction with visual
            const bulletAngle = this.angle + Math.PI / 2;

            // Create a new bullet with proper parameters
            const bullet = new Bullet(
                this.x + Math.cos(this.angle) * 15, // Start at the nose of the ship
                this.y + Math.sin(this.angle) * 15,
                bulletAngle, // Offset angle for bullet travel direction
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

        // Check if current target is still valid
        this.updateTargetValidity();

        if (this.mode === 'patrol') {
            this.moveToWaypoint(dt);
            this.checkForNearbyPlayers();
        } else {
            this.pursuePlayer(dt);
            this.checkIfLostTarget();
        }

        this.applyPhysics(dt);
        this.handleBoundaryBounce();

        // Fire only when the nose is on the pursued target
        const targetPos = this.mode === 'pursuit' && this.pursuitTarget ? this.getTargetPosition(this.pursuitTarget) : null;
        if (targetPos) {
            const distance = Math.hypot(targetPos.x - this.x, targetPos.y - this.y);
            const bullet = this.tryFire(dt, this.aimError(targetPos), distance);
            if (bullet && this.game.isHost) {
                this.game.broadcastEnemyShoot(this);
            }
        } else {
            this.shootCooldown = Math.max(0, this.shootCooldown - dt);
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

        this.steerToward(this.currentWaypoint.x, this.currentWaypoint.y, dt, this.patrolSpeed);
    }

    checkForNearbyPlayers() {
        const nearest = this.findNearestPlayer(true); // Exclude invulnerable
        if (nearest && nearest.distance < this.proximityThreshold) {
            this.mode = 'pursuit';
            this.pursuitTarget = nearest;
            // Set designated target
            if (nearest.isMainShip) {
                this.designatedTargetId = 'main';
            } else if (nearest.playerId) {
                this.designatedTargetId = nearest.playerId;
            }
        }
    }

    pursuePlayer(dt) {
        if (!this.pursuitTarget) {
            this.mode = 'patrol';
            this.generateNextWaypoint(); // Get a new waypoint to move to
            return;
        }

        const target = this.getTargetPosition(this.pursuitTarget);
        if (!target) {
            // Target is no longer valid (dead/invulnerable), go back to patrol
            this.mode = 'patrol';
            this.pursuitTarget = null;
            this.generateNextWaypoint(); // Get a new waypoint away from current position
            return;
        }

        this.steerToward(target.x, target.y, dt, this.pursuitSpeed, 150);
    }

    getTargetPosition(target) {
        if (target.isMainShip && this.game.ship && !this.game.ship.exploding && !this.game.ship.invulnerable) {
            return { x: this.game.ship.x, y: this.game.ship.y };
        } else if (target.playerId && this.game.otherPlayers) {
            const player = this.game.otherPlayers[target.playerId];
            if (player && !player.exploding && !player.invulnerable) {
                return { x: player.x, y: player.y };
            }
        }
        return null;
    }

    checkIfLostTarget() {
        if (!this.pursuitTarget) {
            this.mode = 'patrol';
            this.generateNextWaypoint();
            return;
        }

        const target = this.getTargetPosition(this.pursuitTarget);
        if (!target) {
            // Target is invalid (dead, invulnerable, or disconnected)
            this.mode = 'patrol';
            this.pursuitTarget = null;
            this.generateNextWaypoint();
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.disengageThreshold) {
            this.mode = 'patrol';
            this.pursuitTarget = null;
            this.generateNextWaypoint();
        }
    }

    findNearestPlayer(excludeInvulnerable = true) {
        let nearest = null;
        let nearestDistance = Infinity;

        if (this.game.ship && !this.game.ship.exploding) {
            // Skip invulnerable players when excludeInvulnerable is true
            if (!excludeInvulnerable || !this.game.ship.invulnerable) {
                const dx = this.game.ship.x - this.x;
                const dy = this.game.ship.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = { isMainShip: true, distance: distance };
                }
            }
        }

        if (this.game.otherPlayers) {
            for (const playerId in this.game.otherPlayers) {
                const player = this.game.otherPlayers[playerId];
                // Skip exploding or invulnerable players
                if (player.exploding) continue;
                if (excludeInvulnerable && player.invulnerable) continue;
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

    // Target switching system methods

    // Check if the designated target is still valid (alive and not invulnerable)
    isDesignatedTargetValid() {
        if (!this.designatedTargetId) return false;

        if (this.designatedTargetId === 'main') {
            return this.game.ship && !this.game.ship.exploding && !this.game.ship.invulnerable;
        } else {
            const player = this.game.otherPlayers?.[this.designatedTargetId];
            return player && !player.exploding && !player.invulnerable;
        }
    }

    // Get the position of the designated target
    getDesignatedTargetPosition() {
        if (!this.designatedTargetId) return null;

        if (this.designatedTargetId === 'main') {
            if (this.game.ship && !this.game.ship.exploding && !this.game.ship.invulnerable) {
                return { x: this.game.ship.x, y: this.game.ship.y };
            }
        } else {
            const player = this.game.otherPlayers?.[this.designatedTargetId];
            if (player && !player.exploding && !player.invulnerable) {
                return { x: player.x, y: player.y };
            }
        }
        return null;
    }

    // Switch to the next available target, or clear target if none available
    switchToNextTarget() {
        // Find a valid target that is NOT the current one
        const nearest = this.findNearestPlayer(true); // true = exclude invulnerable

        if (nearest) {
            if (nearest.isMainShip) {
                this.designatedTargetId = 'main';
            } else if (nearest.playerId) {
                this.designatedTargetId = nearest.playerId;
            }
            this.mode = 'pursuit';
            this.pursuitTarget = nearest;
        } else {
            // No valid targets, go to patrol
            this.designatedTargetId = null;
            this.mode = 'patrol';
            this.pursuitTarget = null;
            this.generateNextWaypoint();
        }
    }

    // Check if a bullet fired from a position should steal aggro
    // Called by game when a player shoots
    checkBulletAggro(bulletX, bulletY, shooterId) {
        // Calculate distance from bullet to enemy
        const dx = bulletX - this.x;
        const dy = bulletY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If bullet is within aggro range and from a different player than current target
        if (distance < this.aggroDistance) {
            // Only steal aggro if the shooter is not the current target
            const currentTargetIsShooter =
                (this.designatedTargetId === 'main' && shooterId === 'main') ||
                (this.designatedTargetId === shooterId);

            if (!currentTargetIsShooter) {
                // Steal aggro!
                this.designatedTargetId = shooterId;
                this.mode = 'pursuit';

                // Update pursuit target
                if (shooterId === 'main') {
                    this.pursuitTarget = { isMainShip: true, distance: distance };
                } else {
                    this.pursuitTarget = { playerId: shooterId, distance: distance };
                }
                return true;
            }
        }
        return false;
    }

    // Update target validity and switch if needed (call this in multiplayerUpdate)
    updateTargetValidity() {
        if (!this.isDesignatedTargetValid()) {
            this.switchToNextTarget();
        }
    }
}