// public/js/entities/asteroid.js
class Asteroid {
    constructor(x, y, size, game) {
        this.x = x;
        this.y = y;
        this.game = game;

        // Set properties based on size
        if (size === 3) { // Large
            this.radius = 40;
            this.speed = 1;
        } else if (size === 2) { // Medium
            this.radius = 25;
            this.speed = 1.5;
        } else { // Small
            this.radius = 15;
            this.speed = 2;
        }

        this.size = size;
        
        // Random direction
        const angle = Math.random() * Math.PI * 2;
        this.xv = Math.cos(angle) * this.speed;
        this.yv = Math.sin(angle) * this.speed;
        
        // Create a unique but consistent shape for this asteroid
        this.vertices = Math.floor(Math.random() * 3) + 6; // 6-8 vertices
        this.jaggedness = Math.random() * 0.2 + 0.1;
        
        // Pre-calculate vertex distances for consistent shape
        this.offsets = [];
        for (let i = 0; i < this.vertices; i++) {
            this.offsets.push(this.radius * (1 - this.jaggedness + Math.random() * this.jaggedness));
        }
    }
    
    update(dt) {
        // Use mathematical movement for synchronized asteroids
        if (this.isMathematical && this.mathData) {
            this.updateMathematicalMovement();
        } else {
            // Standard movement
            this.x += this.xv;
            this.y += this.yv;
            
            // Handle movement boundaries (wrapping or bouncing)
            this.handleMovementBounds();
        }
    }
    
    updateMathematicalMovement() {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.mathData.spawnTime) / 1000; // Convert to seconds

        // Calculate position using mathematical formula
        // Linear movement with bouncing
        let x = this.mathData.startX + Math.cos(this.mathData.angle) * this.mathData.baseSpeed * elapsedTime * 50;
        let y = this.mathData.startY + Math.sin(this.mathData.angle) * this.mathData.baseSpeed * elapsedTime * 50;

        // Handle bouncing off world boundaries mathematically (improved algorithm)
        const bounds = this.game.getWorldBounds();
        if (bounds.enabled) {
            const effectiveWidth = bounds.width - 2 * this.radius;
            const effectiveHeight = bounds.height - 2 * this.radius;

            // Use modulo arithmetic for perfect bouncing
            // Shift to make calculations start at 0
            let rawX = x - this.radius;
            let rawY = y - this.radius;

            // Handle negative values properly with modulo
            // JavaScript's modulo can return negative values, so we normalize
            const normalizeModulo = (value, mod) => {
                const result = value % (2 * mod);
                return result < 0 ? result + (2 * mod) : result;
            };

            const normalizedX = normalizeModulo(rawX, effectiveWidth);
            const normalizedY = normalizeModulo(rawY, effectiveHeight);

            // Mathematical reflection using modulo
            // If in first half, use value as-is; if in second half, reflect back
            x = (normalizedX <= effectiveWidth) ?
                normalizedX + this.radius :
                (2 * effectiveWidth - normalizedX) + this.radius;

            y = (normalizedY <= effectiveHeight) ?
                normalizedY + this.radius :
                (2 * effectiveHeight - normalizedY) + this.radius;

            // Ensure bounds are strictly enforced (safety check)
            x = Math.max(this.radius, Math.min(bounds.width - this.radius, x));
            y = Math.max(this.radius, Math.min(bounds.height - this.radius, y));
        }

        this.x = x;
        this.y = y;
    }
    
    handleMovementBounds() {
        // Check game mode and apply appropriate boundary behavior
        if (this.game.isMultiplayer()) {
            this.handleBoundaryBounce();
        } else {
            this.handleScreenWrap();
        }
    }
    
    handleScreenWrap() {
        // Original screen wrapping behavior
        if (this.x < 0 - this.radius) this.x = this.game.canvas.width + this.radius;
        if (this.x > this.game.canvas.width + this.radius) this.x = 0 - this.radius;
        if (this.y < 0 - this.radius) this.y = this.game.canvas.height + this.radius;
        if (this.y > this.game.canvas.height + this.radius) this.y = 0 - this.radius;
    }
    
    handleBoundaryBounce() {
        const bounds = this.game.getWorldBounds();
        if (!bounds.enabled) {
            this.handleScreenWrap();
            return;
        }
        
        // Bounce off world boundaries
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.xv = Math.abs(this.xv); // Reverse to positive direction
        } else if (this.x + this.radius >= bounds.width) {
            this.x = bounds.width - this.radius;
            this.xv = -Math.abs(this.xv); // Reverse to negative direction
        }
        
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.yv = Math.abs(this.yv); // Reverse to positive direction
        } else if (this.y + this.radius >= bounds.height) {
            this.y = bounds.height - this.radius;
            this.yv = -Math.abs(this.yv); // Reverse to negative direction
        }
    }
    
    draw(ctx) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        
        // Draw asteroid shape
        ctx.beginPath();
        
        for (let i = 0; i < this.vertices; i++) {
            // Calculate position around the circumference
            const angle = i * Math.PI * 2 / this.vertices;
            const radius = this.offsets[i];
            
            const x = this.x + radius * Math.cos(angle);
            const y = this.y + radius * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }
}