// public/js/entities/ship.js
class Ship {
    constructor(x, y, game) {
        // Position & physics
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.angle = 0; // Facing up (0 radians)
        this.rotation = 0;
        this.thrusting = false;
        this.thrust = {
            x: 0,
            y: 0
        };
        
        // Movement settings
        this.rotationSpeed = 0.08;
        this.thrustPower = 0.1;
        this.friction = 0.01;
        this.maxSpeed = 5;
        
        // Ship state
        this.visible = true;
        this.blinkTime = 0;
        this.blinkNum = 0;
        this.blinkOn = true;
        this.blinkDuration = 0.1; // seconds
        this.exploding = false;
        this.explodeTime = 0;
        this.invulnerable = false;
        
        // Multiplayer properties
        this.isPlayerShip = true; // Mark this as a player-controlled ship
        this.playerId = null; // Will be set in multiplayer mode
        this.invulnerableTime = 0;
        
        // Shooting properties
        this.canShoot = true;
        this.shootingCooldown = 0.25; // seconds
        this.shootTimer = 0;
        
        // Game reference
        this.game = game;
        
        // Load ship settings from localStorage
        this.loadShipSettings();
    }
    
    // Check if this ship collides with a circular object using enhanced collision detection
    checkCollision(circleObj) {
      // Skip collision if ship is exploding or invulnerable
      if (this.exploding || this.invulnerable) {
        return false;
      }
      
      // Use enhanced collision detection for custom ships
      if (this.shipType === 'custom' && this.customLines && this.customLines.length > 0) {
        return this.checkCustomShipCollision(circleObj);
      }
      
      // Fall back to simple circle collision for built-in ships
      const distance = Math.sqrt(
        Math.pow(this.x - circleObj.x, 2) + 
        Math.pow(this.y - circleObj.y, 2)
      );
      
      return distance < (this.radius + circleObj.radius);
    }
  
    // Check collision between a custom ship and a circular object
    checkCustomShipCollision(circleObj) {
      // Scale factor used for drawing the ship (same as in rendering)
      const scale = 0.25;
      
      // Use the ship's position and angle to transform the line segments
      const cosAngle = Math.cos(this.angle);
      const sinAngle = Math.sin(this.angle);
      
      // Check each line segment in the custom ship
      for (const line of this.customLines) {
        // Scale the coordinates (same as in rendering)
        const startX = line.startX * scale;
        const startY = line.startY * scale;
        const endX = line.endX * scale;
        const endY = line.endY * scale;
        
        // Rotate the line based on ship angle
        const rotatedStartX = startX * cosAngle - startY * sinAngle;
        const rotatedStartY = startX * sinAngle + startY * cosAngle;
        const rotatedEndX = endX * cosAngle - endY * sinAngle;
        const rotatedEndY = endX * sinAngle + endY * cosAngle;
        
        // Translate to ship position
        const worldStartX = this.x + rotatedStartX;
        const worldStartY = this.y + rotatedStartY;
        const worldEndX = this.x + rotatedEndX;
        const worldEndY = this.y + rotatedEndY;
        
        // Check if this line intersects with the circle
        if (this.lineCircleIntersection(
            worldStartX, worldStartY, 
            worldEndX, worldEndY, 
            circleObj.x, circleObj.y, 
            circleObj.radius
        )) {
          return true;
        }
      }
      
      // Also check if the circle center is inside the ship's radius
      // as a fallback for very small ships or edge cases
      const distance = Math.sqrt(
        Math.pow(this.x - circleObj.x, 2) + 
        Math.pow(this.y - circleObj.y, 2)
      );
      
      return distance < this.radius; // Not adding circleObj.radius here because we're checking if the center is inside
    }
  
    // Helper method: Check if a point is inside a circle
    pointInCircle(px, py, cx, cy, radius) {
      const distanceSquared = Math.pow(px - cx, 2) + Math.pow(py - cy, 2);
      return distanceSquared <= radius * radius;
    }
  
    // Helper method: Calculate the distance between a point and a line segment
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
      // Calculate the square of the length of the line segment
      const lengthSquared = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
      
      // If the line segment is actually a point, return distance to that point
      if (lengthSquared === 0) {
        return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
      }
      
      // Calculate projection of point onto line segment
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lengthSquared;
      
      // Clamp t to [0,1] to get the nearest point on the segment
      t = Math.max(0, Math.min(1, t));
      
      // Find the nearest point on the line segment
      const nearestX = x1 + t * (x2 - x1);
      const nearestY = y1 + t * (y2 - y1);
      
      // Calculate distance to the nearest point
      return Math.sqrt(Math.pow(px - nearestX, 2) + Math.pow(py - nearestY, 2));
    }
  
    // Helper method: Check if a line segment intersects with a circle
    lineCircleIntersection(x1, y1, x2, y2, cx, cy, radius) {
      // Check if either endpoint is inside the circle
      if (this.pointInCircle(x1, y1, cx, cy, radius) || this.pointInCircle(x2, y2, cx, cy, radius)) {
        return true;
      }
      
      // Calculate the distance between the circle center and the line segment
      const distance = this.distanceToLineSegment(cx, cy, x1, y1, x2, y2);
      
      // Check if the distance is less than or equal to the radius
      return distance <= radius;
    }
  
    // Debug method to draw collision boundaries
    drawCollisionBoundaries(ctx) {
      if (!window.DEBUG_COLLISIONS) return;
      
      if (this.shipType === 'custom' && this.customLines && this.customLines.length > 0) {
        // Draw each collision line
        const cosAngle = Math.cos(this.angle);
        const sinAngle = Math.sin(this.angle);
        const scale = 0.25;
        
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 1;
        
        for (const line of this.customLines) {
          const startX = line.startX * scale;
          const startY = line.startY * scale;
          const endX = line.endX * scale;
          const endY = line.endY * scale;
          
          const rotatedStartX = startX * cosAngle - startY * sinAngle;
          const rotatedStartY = startX * sinAngle + startY * cosAngle;
          const rotatedEndX = endX * cosAngle - endY * sinAngle;
          const rotatedEndY = endX * sinAngle + endY * cosAngle;
          
          const worldStartX = this.x + rotatedStartX;
          const worldStartY = this.y + rotatedStartY;
          const worldEndX = this.x + rotatedEndX;
          const worldEndY = this.y + rotatedEndY;
          
          ctx.beginPath();
          ctx.moveTo(worldStartX, worldStartY);
          ctx.lineTo(worldEndX, worldEndY);
          ctx.stroke();
        }
      }
      
      // Always draw the bounding circle for reference
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    loadShipSettings() {
        try {
            console.log("Loading ship settings from localStorage");
            const savedSettings = localStorage.getItem('asteroids_playerSettings');
            
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                console.log("Found saved settings:", settings);
                
                // Load ship type
                this.shipType = settings.shipType || 'default';
                
                // Load ship color
                this.color = settings.shipColor || 'white';
                
                // Load custom lines if any - ensure proper format
                if (settings.customLines && Array.isArray(settings.customLines)) {
                    this.customLines = settings.customLines;
                } else {
                    this.customLines = [];
                }
                
                // Load thruster points if any
                if (settings.thrusterPoints && Array.isArray(settings.thrusterPoints)) {
                    this.thrusterPoints = settings.thrusterPoints;
                } else {
                    this.thrusterPoints = [];
                }
                
                // Load weapon points if any
                if (settings.weaponPoints && Array.isArray(settings.weaponPoints)) {
                    this.weaponPoints = settings.weaponPoints;
                } else {
                    this.weaponPoints = [];
                }
                
                // Load player name if any
                this.playerName = settings.shipName || 'Unknown Pilot';
                
                // Load passphrase if any
                this.passphrase = settings.passphrase || null;
                
                console.log(`Loaded ship settings: ${this.shipType} ship with ${this.customLines.length} custom lines`);
            } else {
                // Default settings if nothing is saved
                this.shipType = 'default';
                this.color = 'white';
                this.customLines = [];
                this.thrusterPoints = [];
                this.weaponPoints = [];
                this.playerName = 'Unknown Pilot';
                console.log("No saved settings found, using defaults");
            }
        } catch (e) {
            console.error("Error loading ship settings:", e);
            // Default settings on error
            this.shipType = 'default';
            this.color = 'white';
            this.customLines = [];
            this.thrusterPoints = [];
            this.weaponPoints = [];
            this.playerName = 'Unknown Pilot';
        }
    }
    
    update(dt) {
        // Handle rotation
        this.angle += this.rotation;
        
        // Update thrust
        if (this.thrusting) {
            // Calculate thrust vector based on ship angle
            this.thrust.x += this.thrustPower * Math.sin(this.angle);
            this.thrust.y -= this.thrustPower * Math.cos(this.angle);
            
            // Cap speed
            const speed = Math.sqrt(this.thrust.x * this.thrust.x + this.thrust.y * this.thrust.y);
            if (speed > this.maxSpeed) {
                const ratio = this.maxSpeed / speed;
                this.thrust.x *= ratio;
                this.thrust.y *= ratio;
            }
        } else {
            // Apply friction when not thrusting
            this.thrust.x *= (1 - this.friction);
            this.thrust.y *= (1 - this.friction);
            
            // Round very small values to zero
            if (Math.abs(this.thrust.x) < 0.01) this.thrust.x = 0;
            if (Math.abs(this.thrust.y) < 0.01) this.thrust.y = 0;
        }
        
        // Update position
        this.x += this.thrust.x;
        this.y += this.thrust.y;
        
        // Handle movement boundaries (wrapping or boundary collision)
        this.handleMovementBounds();
        
        // Handle weapon cooldown
        if (!this.canShoot) {
            this.shootTimer += dt;
            if (this.shootTimer >= this.shootingCooldown) {
                this.canShoot = true;
                this.shootTimer = 0;
            }
        }
        
        // Handle ship blinking (invulnerability)
        if (this.blinkNum > 0) {
            this.blinkTime += dt;
            if (this.blinkTime > this.blinkDuration) {
                this.blinkTime = 0;
                this.visible = !this.visible;
                this.blinkNum--;
            }
        } else {
            this.visible = true;
        }
        
        // Handle ship explosion animation
        if (this.exploding) {
            this.explodeTime += dt;
            if (this.explodeTime > 1.0) {
                this.exploding = false;
                this.explodeTime = 0;
                this.game.respawnShip();
            }
        }
  
        // Handle invulnerability
        if (this.invulnerable) {
            this.invulnerableTime -= dt;
            
            // Make ship blink while invulnerable
            this.blinkTime -= dt;
            if (this.blinkTime <= 0) {
                this.blinkTime = 0.1; // Blink every 0.1 seconds
                this.blinkOn = !this.blinkOn;
            }
            
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
                this.blinkOn = true;
            }
        }
    }
    
    draw(ctx) {
        // Skip drawing if ship is invisible (blinking)
        if (!this.visible || (this.invulnerable && !this.blinkOn)) {
            return;
        }
        
        // Draw explosion if ship is exploding
        if (this.exploding) {
            this.drawExplosion(ctx);
            return;
        }
        
        // Save context
        ctx.save();
        
        // Translate and rotate to ship position and orientation
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw ship based on type
        if (this.shipType === 'custom' && this.customLines && this.customLines.length > 0) {
            this.drawCustomShip(ctx);
        } else if (this.shipType === 'triangle') {
            this.drawTriangleShip(ctx);
        } else if (this.shipType === 'diamond') {
            this.drawDiamondShip(ctx);
        } else {
            this.drawDefaultShip(ctx);
        }
        
        // Draw thrust if the ship is thrusting
        if (this.thrusting) {
            this.drawThrust(ctx);
        }
        
        // Restore context
        ctx.restore();
    }
    
    drawDefaultShip(ctx) {
        const radius = this.radius;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -radius); // Nose
        ctx.lineTo(-radius * 0.7, radius * 0.7); // Bottom left
        ctx.lineTo(radius * 0.7, radius * 0.7); // Bottom right
        ctx.closePath();
        ctx.stroke();
    }
    
    drawTriangleShip(ctx) {
        const radius = this.radius;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -radius); // Top
        ctx.lineTo(-radius, radius); // Bottom left
        ctx.lineTo(radius, radius); // Bottom right
        ctx.closePath();
        ctx.stroke();
    }
    
    drawDiamondShip(ctx) {
        const radius = this.radius;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -radius); // Top
        ctx.lineTo(radius, 0); // Right
        ctx.lineTo(0, radius); // Bottom
        ctx.lineTo(-radius, 0); // Left
        ctx.closePath();
        ctx.stroke();
    }
    
    drawCustomShip(ctx) {
        // Check if customLines is defined and has content
        if (!this.customLines || !Array.isArray(this.customLines) || this.customLines.length === 0) {
            console.log("No custom lines to draw, falling back to default ship");
            this.drawDefaultShip(ctx);
            return;
        }
        
        // Draw each line based on the custom design
        this.customLines.forEach((line, index) => {
            try {
                // Make sure line has correct properties
                if (line && typeof line.startX === 'number' && typeof line.startY === 'number' && 
                    typeof line.endX === 'number' && typeof line.endY === 'number') {
                    
                    ctx.strokeStyle = line.color || this.color;
                    ctx.lineWidth = 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(line.startX * 0.25, line.startY * 0.25);
                    ctx.lineTo(line.endX * 0.25, line.endY * 0.25);
                    ctx.stroke();
                    
                    // Draw small dots at endpoints for visual clarity
                    ctx.fillStyle = line.color || this.color;
                    ctx.beginPath();
                    ctx.arc(line.startX * 0.25, line.startY * 0.25, 1, 0, Math.PI * 2);
                    ctx.arc(line.endX * 0.25, line.endY * 0.25, 1, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    console.error("Invalid line format at index " + index + ":", line);
                }
            } catch (e) {
                console.error("Error drawing line:", e);
            }
        });
    }
    
    drawThrust(ctx) {
        // If we have custom thruster points, use those
        if (this.thrusterPoints && this.thrusterPoints.length > 0) {
            this.thrusterPoints.forEach(point => {
                this.drawThrustFlame(ctx, point.x * 0.25, point.y * 0.25);
            });
            return;
        }
        
        // Default thrust position based on ship type
        if (this.shipType === 'custom' && this.customLines && this.customLines.length > 0) {
            // For custom ships, try to find the lowest points
            const lowestPoints = this.findLowestPoints();
            lowestPoints.forEach(point => {
                this.drawThrustFlame(ctx, point.x * 0.25, point.y * 0.25);
            });
        } else {
            // Default position for built-in ships
            const y = this.radius * 0.7;
            this.drawThrustFlame(ctx, 0, y);
        }
    }
    
    drawThrustFlame(ctx, x, y) {
        // Random flicker effect
        const flicker = Math.random() * 0.3 + 0.7;
        const length = this.radius * 0.6 * flicker;
        
        // Create gradient for flame
        const gradient = ctx.createLinearGradient(x, y, x, y + length);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 165, 0, 0.7)');
        gradient.addColorStop(0.8, 'rgba(255, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
        
        // Draw flame
        const width = this.radius * 0.3 * flicker;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - width / 2, y + length);
        ctx.lineTo(x + width / 2, y + length);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    findLowestPoints() {
        if (!this.customLines || this.customLines.length === 0) {
            return [{ x: 0, y: this.radius }];
        }
        
        // Collect all points
        let points = [];
        this.customLines.forEach(line => {
            points.push({ x: line.startX, y: line.startY });
            points.push({ x: line.endX, y: line.endY });
        });
        
        // Find the lowest points (highest y values)
        points.sort((a, b) => b.y - a.y);
        
        // Take the 1-3 lowest points
        const threshold = points[0].y - 20;
        return points.filter(p => p.y >= threshold).slice(0, 3);
    }
    
    drawExplosion(ctx) {
        const progress = this.explodeTime / 1.0; // 0 to 1
        const numParticles = 20;
        const maxRadius = this.radius * 3 * progress;
        
        // Draw explosion particles
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const distance = maxRadius * Math.random();
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            const size = 2 + Math.random() * 3 * (1 - progress);
            
            // Fade out color
            const opacity = 1 - progress;
            const color = i % 2 === 0 ? 
                `rgba(255, 165, 0, ${opacity})` : 
                `rgba(255, 0, 0, ${opacity})`;
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    shoot() {
        if (!this.canShoot || this.exploding) return null;
        
        this.canShoot = false;
        this.shootTimer = 0;
        
        // Create bullet(s)
        let bullets = [];
        
        // If we have custom weapon points, use those
        if (this.weaponPoints && this.weaponPoints.length > 0) {
            const weaponCount = this.weaponPoints.length; // Pass this to bullet constructor
            
            this.weaponPoints.forEach(point => {
                // Convert to ship's coordinate system
                const weaponX = point.x * 0.25;
                const weaponY = point.y * 0.25;
                
                // Calculate absolute position based on ship's position and rotation
                const bulletX = this.x + (weaponX * Math.cos(this.angle) - weaponY * Math.sin(this.angle));
                const bulletY = this.y + (weaponX * Math.sin(this.angle) + weaponY * Math.cos(this.angle));
                
                // Create bullet and add to the array
                const bullet = new Bullet(
                    bulletX,
                    bulletY,
                    this.angle,
                    this.thrust.x,
                    this.thrust.y,
                    this.game,
                    'player',  // Indicate this is a player bullet
                    weaponCount,  // Pass weapon count to bullet
                    this.playerId  // Pass player ID for friendly fire protection
                );
                
                bullets.push(bullet);
            });
        } else {
            // Default firing position (from ship's nose)
            const bulletX = this.x + Math.sin(this.angle) * this.radius;
            const bulletY = this.y - Math.cos(this.angle) * this.radius;
            
            const bullet = new Bullet(
                bulletX,
                bulletY,
                this.angle,
                this.thrust.x,
                this.thrust.y,
                this.game,
                'player',  // Indicate this is a player bullet
                1,  // Single weapon point
                this.playerId  // Pass player ID for friendly fire protection
            );
            
            bullets.push(bullet);
        }
        
        return bullets;
    }
    
    handleMovementBounds() {
        // Check game mode and apply appropriate boundary behavior
        if (this.game.isMultiplayer()) {
            this.handleBoundaryCollision();
        } else {
            this.handleScreenWrap();
        }
    }
    
    handleScreenWrap() {
        const canvas = this.game.canvas;
        
        // Wrap horizontally
        if (this.x < 0 - this.radius) {
            this.x = canvas.width + this.radius;
        } else if (this.x > canvas.width + this.radius) {
            this.x = 0 - this.radius;
        }
        
        // Wrap vertically
        if (this.y < 0 - this.radius) {
            this.y = canvas.height + this.radius;
        } else if (this.y > canvas.height + this.radius) {
            this.y = 0 - this.radius;
        }
    }
    
    handleBoundaryCollision() {
        const bounds = this.game.getWorldBounds();
        if (!bounds.enabled) {
            this.handleScreenWrap();
            return;
        }
        
        // Clamp position to world boundaries
        const minX = this.radius;
        const maxX = bounds.width - this.radius;
        const minY = this.radius;
        const maxY = bounds.height - this.radius;
        
        // Stop at boundaries and reduce velocity when hitting them
        if (this.x < minX) {
            this.x = minX;
            this.velocityX = Math.max(0, this.velocityX); // Only allow rightward movement
        } else if (this.x > maxX) {
            this.x = maxX;
            this.velocityX = Math.min(0, this.velocityX); // Only allow leftward movement
        }
        
        if (this.y < minY) {
            this.y = minY;
            this.velocityY = Math.max(0, this.velocityY); // Only allow downward movement
        } else if (this.y > maxY) {
            this.y = maxY;
            this.velocityY = Math.min(0, this.velocityY); // Only allow upward movement
        }
    }
    
    hit() {
      // Don't process hit if already exploding or invulnerable
      if (this.invulnerable || this.exploding) return false;
      
      console.log("Ship hit! Starting explosion sequence");
      
      // Begin explosion
      this.exploding = true;
      this.explodeTime = 0;
      
      // Create debris effect
      this.game.createDebrisFromShip();
      
      // Hide the ship during explosion
      this.visible = false;
      
      // We need to explicitly set a timeout to call respawnShip after explosion animation
      setTimeout(() => {
          console.log("Explosion sequence complete, respawning ship");
          this.game.respawnShip();
      }, 1000); // 1 second explosion animation
      
      return true;
    }
    
    setInvulnerable(seconds) {
        this.blinkNum = Math.ceil(seconds / this.blinkDuration);
        this.blinkTime = 0;
        this.visible = false;
    }
  
    resetShip() {
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
    }
    
    resetPosition() {
        this.x = this.game.canvas.width / 2;
        this.y = this.game.canvas.height / 2;
        this.thrust = { x: 0, y: 0 };
        this.angle = 0;
    }
  }