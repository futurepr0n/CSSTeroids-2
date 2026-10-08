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

        // Server-assigned identity/health for MMO and co-op worlds
        this.id = null;
        this.health = 3;
    }
    
    update(dt) {
        if (!this.active) return;

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
        this.wrapPosition();
        this.tryFire(dt, facingError, distance);
    }

    getSinglePlayerTarget() {
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
}
