// public/js/core/utils.js
// This file contains utility functions for the Asteroids game

/**
 * Calculate the distance between two points
 * @param {number} x1 - The x coordinate of the first point
 * @param {number} y1 - The y coordinate of the first point
 * @param {number} x2 - The x coordinate of the second point
 * @param {number} y2 - The y coordinate of the second point
 * @returns {number} The distance between the two points
 */
function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Generate a random number between min and max (inclusive)
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} A random number between min and max
 */
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Check if two circles are colliding
 * @param {Object} circle1 - The first circle with x, y, and radius properties
 * @param {Object} circle2 - The second circle with x, y, and radius properties
 * @returns {boolean} True if the circles are colliding, false otherwise
 */
function circleCollision(circle1, circle2) {
    const distance = distanceBetween(circle1.x, circle1.y, circle2.x, circle2.y);
    return distance < circle1.radius + circle2.radius;
}

/**
 * Wrap a position around the screen edges
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} width - The screen width
 * @param {number} height - The screen height
 * @param {number} padding - Optional padding (default: 0)
 * @returns {Object} The wrapped x and y coordinates
 */
function wrapPosition(x, y, width, height, padding = 0) {
    let newX = x;
    let newY = y;
    
    if (x < -padding) {
        newX = width + padding;
    } else if (x > width + padding) {
        newX = -padding;
    }
    
    if (y < -padding) {
        newY = height + padding;
    } else if (y > height + padding) {
        newY = -padding;
    }
    
    return { x: newX, y: newY };
}

/**
 * Convert degrees to radians
 * @param {number} degrees - The angle in degrees
 * @returns {number} The angle in radians
 */
function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 * @param {number} radians - The angle in radians
 * @returns {number} The angle in degrees
 */
function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Normalize an angle to be between 0 and 2π
 * @param {number} angle - The angle in radians
 * @returns {number} The normalized angle
 */
function normalizeAngle(angle) {
    while (angle < 0) {
        angle += Math.PI * 2;
    }
    while (angle > Math.PI * 2) {
        angle -= Math.PI * 2;
    }
    return angle;
}

/**
 * Calculate the angle between two points
 * @param {number} x1 - The x coordinate of the first point
 * @param {number} y1 - The y coordinate of the first point
 * @param {number} x2 - The x coordinate of the second point
 * @param {number} y2 - The y coordinate of the second point
 * @returns {number} The angle in radians
 */
function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Create a polygon with a specified number of sides
 * @param {number} sides - The number of sides
 * @param {number} radius - The radius of the polygon
 * @returns {Array} An array of points representing the polygon
 */
function createPolygon(sides, radius) {
    const points = [];
    const angleStep = (Math.PI * 2) / sides;
    
    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep;
        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }
    
    return points;
}

/**
 * Generate a random color
 * @param {number} alpha - The alpha value (default: 1)
 * @returns {string} A random RGBA color
 */
function randomColor(alpha = 1) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Linear interpolation between two values
 * @param {number} a - The first value
 * @param {number} b - The second value
 * @param {number} t - The interpolation factor (0-1)
 * @returns {number} The interpolated value
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp a value between a minimum and maximum
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {*} defaultValue - The default value to return on error
 * @returns {*} The parsed object or the default value
 */
function safeParseJSON(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return defaultValue;
    }
}

/**
 * Check if a point is inside a circle
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean} True if the point is inside the circle
 */
function pointInCircle(px, py, cx, cy, radius) {
    const distanceSquared = Math.pow(px - cx, 2) + Math.pow(py - cy, 2);
    return distanceSquared <= radius * radius;
}

/**
 * Calculate the distance between a point and a line segment
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X 
 * @param {number} y2 - Line end Y
 * @returns {number} The minimum distance from the point to the line segment
 */
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
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

/**
 * Check if a line segment intersects with a circle
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean} True if the line segment intersects with the circle
 */
function lineCircleIntersection(x1, y1, x2, y2, cx, cy, radius) {
    // Check if either endpoint is inside the circle
    if (pointInCircle(x1, y1, cx, cy, radius) || pointInCircle(x2, y2, cx, cy, radius)) {
        return true;
    }
    
    // Calculate the distance between the circle center and the line segment
    const distance = distanceToLineSegment(cx, cy, x1, y1, x2, y2);
    
    // Check if the distance is less than or equal to the radius
    return distance <= radius;
}

/**
 * Check for collision between a custom ship and a circular object (asteroid, enemy, or bullet)
 * @param {Object} ship - The ship object with customLines array
 * @param {Object} circleObj - Circle object with x, y, and radius properties
 * @param {number} shipAngle - Current angle of the ship in radians
 * @returns {boolean} True if a collision is detected
 */
function checkCustomShipCollision(ship, circleObj, shipAngle) {
    // If ship doesn't have custom lines, use regular circle collision
    if (!ship.customLines || ship.customLines.length === 0) {
        const distance = Math.sqrt(
            Math.pow(ship.x - circleObj.x, 2) + 
            Math.pow(ship.y - circleObj.y, 2)
        );
        return distance < ship.radius + circleObj.radius;
    }
    
    // Use the ship's position and angle to transform the line segments
    const cosAngle = Math.cos(shipAngle);
    const sinAngle = Math.sin(shipAngle);
    const scale = 0.25; // Same scale used in drawing functions
    
    // Check each line segment in the custom ship
    for (const line of ship.customLines) {
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
        const worldStartX = ship.x + rotatedStartX;
        const worldStartY = ship.y + rotatedStartY;
        const worldEndX = ship.x + rotatedEndX;
        const worldEndY = ship.y + rotatedEndY;
        
        // Check if this line intersects with the circle
        if (lineCircleIntersection(
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
        Math.pow(ship.x - circleObj.x, 2) + 
        Math.pow(ship.y - circleObj.y, 2)
    );
    
    return distance < ship.radius; // Not adding circleObj.radius here because we're checking if the center is inside
}

/**
 * Debug renderer for collision detection visualization
 * Only enabled when window.DEBUG_COLLISIONS is true
 * @param {Object} ctx - Canvas rendering context
 * @param {Object} ship - The ship object
 * @param {Array} circleObjects - Array of circular objects (asteroids, enemies, bullets)
 */
function debugDrawCollisions(ctx, ship, circleObjects) {
    if (!window.DEBUG_COLLISIONS || !ship || !circleObjects) return;
    
    // Draw ship collision lines
    if (ship.customLines && ship.customLines.length > 0) {
        const cosAngle = Math.cos(ship.angle);
        const sinAngle = Math.sin(ship.angle);
        const scale = 0.25;
        
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 1;
        
        for (const line of ship.customLines) {
            const startX = line.startX * scale;
            const startY = line.startY * scale;
            const endX = line.endX * scale;
            const endY = line.endY * scale;
            
            const rotatedStartX = startX * cosAngle - startY * sinAngle;
            const rotatedStartY = startX * sinAngle + startY * cosAngle;
            const rotatedEndX = endX * cosAngle - endY * sinAngle;
            const rotatedEndY = endX * sinAngle + endY * cosAngle;
            
            const worldStartX = ship.x + rotatedStartX;
            const worldStartY = ship.y + rotatedStartY;
            const worldEndX = ship.x + rotatedEndX;
            const worldEndY = ship.y + rotatedEndY;
            
            ctx.beginPath();
            ctx.moveTo(worldStartX, worldStartY);
            ctx.lineTo(worldEndX, worldEndY);
            ctx.stroke();
        }
    }
    
    // Draw circle objects
    for (const obj of circleObjects) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw ship bounding circle
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius, 0, Math.PI * 2);
    ctx.stroke();
}