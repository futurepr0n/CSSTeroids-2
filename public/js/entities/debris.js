// public/js/entities/debris.js
class Debris {
    constructor(x, y, angle, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        
        // Random velocity based on the given angle
        const speed = 0.5 + Math.random() * 1.5;
        this.xv = Math.cos(angle) * speed;
        this.yv = Math.sin(angle) * speed;
        
        // Rotation
        this.rotation = angle;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        
        // Size and color
        this.length = 5 + Math.random() * 10;
        this.color = Math.random() > 0.5 ? "white" : "#FF4400";
        
        // Lifetime tracking
        this.lifeTime = 1.0; // Seconds remaining
    }
    
    update(dt) {
        // Move the debris
        this.x += this.xv;
        this.y += this.yv;
        
        // Apply rotation
        this.rotation += this.rotationSpeed;
        
        // Decrease lifetime
        this.lifeTime -= dt;
    }
    
    draw(ctx) {
        // Calculate opacity based on remaining lifetime
        const opacity = this.lifeTime > 0.5 ? 1 : this.lifeTime * 2;
        
        // Set line style
        if (this.color === "white") {
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        } else {
            ctx.strokeStyle = `rgba(255, 68, 0, ${opacity})`;
        }
        
        ctx.lineWidth = 2;
        
        // Draw the debris as a line segment
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.rotation) * this.length,
            this.y + Math.sin(this.rotation) * this.length
        );
        ctx.stroke();
    }
}