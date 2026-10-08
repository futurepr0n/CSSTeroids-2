// public/js/entities/asteroid.js
class Asteroid {
    // mulberry32: same seed -> same sequence on every client
    static seededRandom(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    constructor(x, y, size, game, seed) {
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
        
        this.rotation = 0;
        this.buildShape(seed === undefined ? Math.random : Asteroid.seededRandom(seed));
        if (seed !== undefined) this.seed = seed;
    }

    // Shape comes from rand so seeded asteroids look identical on every client
    buildShape(rand) {
        this.vertices = Math.floor(rand() * 3) + 6; // 6-8 vertices
        this.jaggedness = rand() * 0.2 + 0.1;
        this.offsets = [];
        for (let i = 0; i < this.vertices; i++) {
            this.offsets.push(this.radius * (1 - this.jaggedness + rand() * this.jaggedness));
        }
    }
    
    update(dt) {
        this.x += this.xv;
        this.y += this.yv;
        this.handleScreenWrap();
    }

    handleScreenWrap() {
        // Original screen wrapping behavior
        if (this.x < 0 - this.radius) this.x = this.game.canvas.width + this.radius;
        if (this.x > this.game.canvas.width + this.radius) this.x = 0 - this.radius;
        if (this.y < 0 - this.radius) this.y = this.game.canvas.height + this.radius;
        if (this.y > this.game.canvas.height + this.radius) this.y = 0 - this.radius;
    }

    draw(ctx) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        
        // Draw asteroid shape
        ctx.beginPath();
        
        for (let i = 0; i < this.vertices; i++) {
            // Calculate position around the circumference
            const angle = i * Math.PI * 2 / this.vertices + (this.rotation || 0);
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