// public/js/entities/bullet.js
class Bullet {
    constructor(x, y, angle, shipXv, shipYv, game, source = 'player', weaponCount = 1, ownerId = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 400; // pixels per second
        this.radius = 2;
        this.game = game; // Reference to game instance
        this.source = source; // 'player' or 'enemy'
        this.ownerId = ownerId; // ID of the player who fired this bullet (for multiplayer)
        
        // Base bullet speed
        const baseSpeed = 6;
        
        // If firing from multiple weapon points, reduce range
        this.initialSpeed = weaponCount > 1 ? baseSpeed * 0.67 : baseSpeed;
        this.currentSpeed = this.initialSpeed;
        
        // Calculate velocity components
        this.xv = Math.sin(angle) * this.currentSpeed + (shipXv || 0) * 0.5;
        this.yv = -Math.cos(angle) * this.currentSpeed + (shipYv || 0) * 0.5;
        
        // Lifetime tracking (in seconds)
        this.lifeTime = 0;
        this.maxLifeTime = weaponCount > 1 ? 1.0 : 1.5; // Shorter lifetime for multiple bullets
    }
    
        update(dt) {
            // Move the bullet
            this.x += this.xv;
            this.y += this.yv;
            
            // Apply gradual slowdown
            this.currentSpeed *= 0.99;
            
            // Maintain original direction while reducing speed
            const originalAngle = this.angle;
            this.xv = this.currentSpeed * Math.sin(originalAngle);
            this.yv = -this.currentSpeed * Math.cos(originalAngle);
            
            // Increase lifetime - this is critical!
            this.lifeTime += dt;
    }

    // Check if this bullet can damage a specific ship (prevents friendly fire)
    canDamageShip(ship) {
        // Enemy bullets can always damage player ships
        if (this.source === 'enemy') {
            return true;
        }
        
        // In single-player mode, player bullets don't affect the player ship
        if (this.game.isSinglePlayer()) {
            return false;
        }
        
        // In multiplayer mode, prevent friendly fire
        if (this.game.isMultiplayer()) {
            // Player bullets can't damage ships owned by the same player
            if (this.source === 'player' && ship.playerId === this.ownerId) {
                return false;
            }
            
            // Player bullets can't damage other player ships (friendly fire protection)
            if (this.source === 'player' && ship.isPlayerShip) {
                return false;
            }
        }
        
        return true;
    }
    
    isOffScreen() {
        // In multiplayer mode, check against world bounds
        if (this.game.isMultiplayer() && this.game.worldBounds.enabled) {
            const bounds = this.game.worldBounds;
            return (
                this.x < -this.radius ||
                this.x > bounds.width + this.radius ||
                this.y < -this.radius ||
                this.y > bounds.height + this.radius
            );
        }
        
        // In single player mode, check against canvas
        return (
            this.x < 0 ||
            this.x > this.game.canvas.width ||
            this.y < 0 ||
            this.y > this.game.canvas.height
        );
    }

    isExpired() {
        return (
            this.lifeTime >= this.maxLifeTime ||
            this.currentSpeed <= 0.5 || // Adjust this threshold as needed
            this.isOffScreen()
        );
    }

    draw(ctx) {
        // Calculate bullet color based on speed
        const speedRatio = this.currentSpeed / this.initialSpeed;
        let bulletColor;
        
        // Set different colors based on the bullet source
        if (this.source === 'enemy') {
            bulletColor = 'red';
        } else {
            if (speedRatio > 0.8) {
                bulletColor = '#FF4500'; // OrangeRed - fresh bullet
            } else if (speedRatio > 0.6) {
                bulletColor = '#FFA500'; // Orange - slowing
            } else if (speedRatio > 0.4) {
                bulletColor = '#FFD700'; // Gold - slower
            } else {
                bulletColor = '#FFFFFF'; // White - slowest
            }
        }
        
        // Draw the main bullet
        ctx.fillStyle = bulletColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * (0.8 + speedRatio * 0.4), 0, Math.PI * 2);
        ctx.fill();
        
        // Draw bullet trail for faster bullets
        if (speedRatio > 0.3) {
            // Calculate tail length based on speed
            const tailLength = this.radius * 4 * speedRatio;
            
            // Draw a gradient trail
            const gradient = ctx.createLinearGradient(
                this.x, this.y,
                this.x - tailLength * Math.sin(this.angle),
                this.y + tailLength * Math.cos(this.angle)
            );
            
            // Set gradient colors based on speed and source
            if (this.source === 'enemy') {
                gradient.addColorStop(0, 'rgba(255, 0, 0, 0.9)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            } else {
                if (speedRatio > 0.8) {
                    gradient.addColorStop(0, 'rgba(255, 69, 0, 0.9)');
                    gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
                } else if (speedRatio > 0.5) {
                    gradient.addColorStop(0, 'rgba(255, 165, 0, 0.7)');
                    gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
                } else {
                    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
                    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                }
            }
            
            ctx.fillStyle = gradient;
            
            // Draw the tail
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            
            // Tail width adjusts with bullet size
            const tailWidth = this.radius * 0.8;
            
            // Calculate the perpendicular direction for tail width
            const perpX = Math.cos(this.angle);
            const perpY = Math.sin(this.angle);
            
            // Draw the tail as a triangle
            ctx.lineTo(
                this.x - tailLength * Math.sin(this.angle) + tailWidth * perpX,
                this.y + tailLength * Math.cos(this.angle) + tailWidth * perpY
            );
            ctx.lineTo(
                this.x - tailLength * Math.sin(this.angle) - tailWidth * perpX,
                this.y + tailLength * Math.cos(this.angle) - tailWidth * perpY
            );
            ctx.closePath();
            ctx.fill();
        }
    }
}