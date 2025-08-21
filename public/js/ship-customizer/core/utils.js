/**
 * /public/js/ship-customizer/core/utils.js
 * Utility functions used throughout the application
 */

/**
 * Normalize color representation
 * @param {string} color - The color to normalize
 * @returns {string} Normalized color value
 */
export function normalizeColor(color) {
    // Standard named colors mapped to exact hex values
    const colorMap = {
      'white': '#ffffff',
      'cyan': '#00ffff',
      'lime': '#00ff00',
      'yellow': '#ffff00',
      'orange': '#ff9900',
      'magenta': '#ff00ff',
      'red': '#ff0000',
      'blue': '#0066ff',
      'purple': '#9900ff',
      'mint': '#00ff99'
    };
    
    // If it's a named color, convert to hex
    if (colorMap[color]) {
      return colorMap[color];
    }
    
    // If it's already a hex value, return as is
    if (color.startsWith('#')) {
      return color;
    }
    
    // Default to white if unknown
    return '#ffffff';
  }
  
  /**
   * Create a pulse effect at a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} color - Color of the pulse
   * @param {HTMLCanvasElement} canvas - The canvas element
   */
  export function createPulseEffect(x, y, color, canvas) {
    try {
      // First, try drawing directly on the canvas as an immediate visual feedback
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Then create the animated pulse effect
      const pulse = document.createElement('div');
      pulse.className = 'point-pulse';
      pulse.style.position = 'absolute';
      
      // Get the canvas position so the pulse appears correctly
      const canvasRect = canvas.getBoundingClientRect();
      const canvasOffsetLeft = canvasRect.left + window.scrollX;
      const canvasOffsetTop = canvasRect.top + window.scrollY;
      
      // Position the pulse relative to the canvas position in the viewport
      pulse.style.left = (canvasOffsetLeft + x - 10) + 'px';
      pulse.style.top = (canvasOffsetTop + y - 10) + 'px';
      
      pulse.style.width = '20px';
      pulse.style.height = '20px';
      pulse.style.borderRadius = '50%';
      pulse.style.backgroundColor = color;
      pulse.style.pointerEvents = 'none';
      pulse.style.animation = 'pulse 0.5s forwards';
      pulse.style.zIndex = '1000'; // Ensure it's above other elements
      
      // Append to document body instead of canvas parent
      document.body.appendChild(pulse);
      
      // Remove after animation
      setTimeout(() => {
        if (pulse && pulse.parentNode) {
          pulse.parentNode.removeChild(pulse);
        }
      }, 500);
      
      console.log("Pulse effect created at", x, y);
    } catch (error) {
      console.error("Error in pulse effect:", error);
      // Basic fallback
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  /**
   * Safely parse JSON data with error handling
   * @param {string|object} data - The data to parse
   * @param {*} defaultValue - Default value to return on error
   * @returns {object} The parsed object or default value
   */
  export function safeParseJSON(data, defaultValue = []) {
    // Handle empty data
    if (!data) return defaultValue;
    
    // If already an object, return it
    if (typeof data === 'object' && data !== null) {
      return data;
    }
    
    // Try to parse string data
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return defaultValue;
    }
  }
  
  /**
   * Get mouse position relative to a canvas
   * @param {Event} event - Mouse event
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @returns {Object} Object with x and y coordinates
   */
  export function getMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  /**
   * Snap a point to the nearest grid intersection
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} gridSize - Size of the grid
   * @param {number} centerX - X center of the canvas
   * @param {number} centerY - Y center of the canvas
   * @returns {Object} Snapped coordinates
   */
  export function snapToGrid(x, y, gridSize, centerX, centerY) {
    // Calculate offset from center
    const offsetX = x - centerX;
    const offsetY = y - centerY;
    
    // Snap to nearest grid point
    const snappedOffsetX = Math.round(offsetX / gridSize) * gridSize;
    const snappedOffsetY = Math.round(offsetY / gridSize) * gridSize;
    
    // Return snapped coordinates
    return {
      x: centerX + snappedOffsetX,
      y: centerY + snappedOffsetY
    };
  }
  
  /**
   * Get the mirrored point across the center
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} centerX - X center of the canvas
   * @param {number} centerY - Y center of the canvas
   * @returns {Object} Mirrored coordinates
   */
  export function getMirroredPoint(x, y, centerX, centerY) {
    // Calculate offset from center
    const offsetX = x - centerX;
    const offsetY = y - centerY;
    
    // Mirror horizontally - same y, opposite x offset
    return {
      x: centerX - offsetX,
      y: centerY + offsetY
    };
  }
  
  /**
   * Convert canvas coordinates to ship coordinates
   * @param {number} x - Canvas X coordinate
   * @param {number} y - Canvas Y coordinate
   * @param {number} centerX - X center of the canvas
   * @param {number} centerY - Y center of the canvas
   * @returns {Object} Ship coordinates
   */
  export function canvasToShipCoords(x, y, centerX, centerY) {
    return {
      x: x - centerX,
      y: y - centerY
    };
  }
  
  /**
   * Convert ship coordinates to canvas coordinates
   * @param {number} shipX - Ship X coordinate
   * @param {number} shipY - Ship Y coordinate
   * @param {number} centerX - X center of the canvas
   * @param {number} centerY - Y center of the canvas
   * @returns {Object} Canvas coordinates
   */
  export function shipToCanvasCoords(shipX, shipY, centerX, centerY) {
    return {
      x: centerX + shipX,
      y: centerY + shipY
    };
  }

  /**
 * Mirror a point horizontally across the canvas center
 * @param {number} x - The X coordinate to mirror
 * @param {number} y - The Y coordinate (unchanged in horizontal mirroring)
 * @param {number} centerX - The X coordinate of the mirror axis
 * @returns {object} The mirrored coordinates {x, y}
 */
export function mirrorPointHorizontally(x, y, centerX) {
  return {
    x: 2 * centerX - x,
    y: y
  };
}

/**
 * Mirror a line horizontally across the canvas center
 * @param {object} line - The line to mirror with startX, startY, endX, endY properties
 * @param {number} centerX - The X coordinate of the mirror axis
 * @returns {object} The mirrored line
 */
export function mirrorLineHorizontally(line, centerX) {
  return {
    startX: 2 * centerX - line.startX,
    startY: line.startY,
    endX: 2 * centerX - line.endX,
    endY: line.endY,
    color: line.color // Keep the same color
  };
}