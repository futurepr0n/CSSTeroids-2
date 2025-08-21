/**
 * /public/js/ship-customizer/drawing/preview.js
 * Handles ship preview canvas and rendering
 */

import { shipSettings } from '../core/settings.js';
import { normalizeColor } from '../core/utils.js';

// Canvas references
let previewCanvas;
let previewCtx;
let animationId;

/**
 * Set up the preview canvas
 * @returns {Object} Object containing canvas and context
 */
export function setupPreviewCanvas() {
  previewCanvas = document.getElementById('preview-canvas');
  
  if (!previewCanvas) {
    console.error('Preview canvas element not found');
    return { previewCanvas: null, previewCtx: null };
  }
  
  previewCtx = previewCanvas.getContext('2d');
  
  // Set initial dimensions
  previewCanvas.width = 250;
  previewCanvas.height = 250;
  
  // Function to update preview size
  const updatePreviewSize = (width, height) => {
    if (!previewCanvas) return;
    
    previewCanvas.width = width || 250;
    previewCanvas.height = height || 250;
    updateShipPreview();
  };
  
  return { previewCanvas, previewCtx, updatePreviewSize };
}

/**
 * Start the animation loop for the preview
 */
export function startPreviewAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  const animate = () => {
    updateShipPreview();
    // Update every half second for efficiency
    setTimeout(() => {
      animationId = requestAnimationFrame(animate);
    }, 500);
  };
  
  animate();
}

/**
 * Update the ship preview
 */
export function updateShipPreview() {
  if (!previewCanvas || !previewCtx) return;
  
  // Clear the canvas
  previewCtx.fillStyle = "#000";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  
  // Draw background elements
  drawStars();
  drawDirectionalGuide();
  
  // Draw ship based on type
  if (shipSettings.type === 'triangle') {
    drawTriangleShipPreview();
  } else if (shipSettings.type === 'diamond') {
    drawDiamondShipPreview();
  } else if (shipSettings.type === 'default') {
    drawDefaultShipPreview();
  }
  
  // Always draw custom lines if they exist
  if (shipSettings.customLines && shipSettings.customLines.length > 0) {
    drawCustomShipPreview();
  }
  
  // Draw thruster and weapon points
  drawThrusterPointsPreview();
  drawWeaponPointsPreview();
  
  // Randomly draw thrust for visual effect
  if (Math.random() > 0.5) {
    drawThrustEffect();
  }
}

/**
 * Draw background stars
 */
function drawStars() {
  if (!previewCtx) return;
  
  previewCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * previewCanvas.width;
    const y = Math.random() * previewCanvas.height;
    const size = Math.random() * 1.5 + 0.5;
    
    previewCtx.beginPath();
    previewCtx.arc(x, y, size, 0, Math.PI * 2);
    previewCtx.fill();
  }
}

/**
 * Draw directional guide
 */
function drawDirectionalGuide() {
  if (!previewCtx || !previewCanvas) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  const radius = 70;
  
  // Draw forward indicator
  previewCtx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
  previewCtx.beginPath();
  previewCtx.moveTo(centerX, centerY - radius - 10);
  previewCtx.lineTo(centerX - 5, centerY - radius);
  previewCtx.lineTo(centerX + 5, centerY - radius);
  previewCtx.closePath();
  previewCtx.stroke();
  previewCtx.fillStyle = 'rgba(0, 255, 255, 0.3)';
  previewCtx.fillText('FRONT', centerX, centerY - radius - 15);
  
  // Draw backward indicator
  previewCtx.strokeStyle = 'rgba(255, 165, 0, 0.4)';
  previewCtx.beginPath();
  previewCtx.moveTo(centerX, centerY + radius + 10);
  previewCtx.lineTo(centerX - 5, centerY + radius);
  previewCtx.lineTo(centerX + 5, centerY + radius);
  previewCtx.closePath();
  previewCtx.stroke();
  previewCtx.fillStyle = 'rgba(255, 165, 0, 0.3)';
  previewCtx.fillText('BACK', centerX, centerY + radius + 15);
}

/**
 * Draw triangle ship preview
 */
function drawTriangleShipPreview() {
  if (!previewCtx || !previewCanvas) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  const radius = 40;
  
  previewCtx.strokeStyle = normalizeColor(shipSettings.color);
  previewCtx.lineWidth = 2;
  
  const topX = centerX;
  const topY = centerY - radius;
  
  const bottomLeftX = centerX - radius;
  const bottomLeftY = centerY + radius;
  
  const bottomRightX = centerX + radius;
  const bottomRightY = centerY + radius;
  
  previewCtx.beginPath();
  previewCtx.moveTo(topX, topY);
  previewCtx.lineTo(bottomLeftX, bottomLeftY);
  previewCtx.lineTo(bottomRightX, bottomRightY);
  previewCtx.closePath();
  previewCtx.stroke();
}

/**
 * Draw diamond ship preview
 */
function drawDiamondShipPreview() {
  if (!previewCtx || !previewCanvas) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  const radius = 40;
  
  previewCtx.strokeStyle = normalizeColor(shipSettings.color);
  previewCtx.lineWidth = 2;
  
  const topX = centerX;
  const topY = centerY - radius;
  
  const rightX = centerX + radius;
  const rightY = centerY;
  
  const bottomX = centerX;
  const bottomY = centerY + radius;
  
  const leftX = centerX - radius;
  const leftY = centerY;
  
  previewCtx.beginPath();
  previewCtx.moveTo(topX, topY);
  previewCtx.lineTo(rightX, rightY);
  previewCtx.lineTo(bottomX, bottomY);
  previewCtx.lineTo(leftX, leftY);
  previewCtx.closePath();
  previewCtx.stroke();
}

/**
 * Draw default ship preview
 */
function drawDefaultShipPreview() {
  if (!previewCtx || !previewCanvas) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  const radius = 40;
  
  previewCtx.strokeStyle = normalizeColor(shipSettings.color);
  previewCtx.lineWidth = 2;
  
  const noseX = centerX;
  const noseY = centerY - radius;
  
  const rearLeftX = centerX - radius * 0.7;
  const rearLeftY = centerY + radius * 0.7;
  
  const rearRightX = centerX + radius * 0.7;
  const rearRightY = centerY + radius * 0.7;
  
  previewCtx.beginPath();
  previewCtx.moveTo(noseX, noseY);
  previewCtx.lineTo(rearLeftX, rearLeftY);
  previewCtx.lineTo(rearRightX, rearRightY);
  previewCtx.closePath();
  previewCtx.stroke();
}

/**
 * Draw custom ship preview
 */
function drawCustomShipPreview() {
  if (!previewCtx || !previewCanvas || !shipSettings.customLines) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  const scale = 0.25; // Scale factor to fit in preview
  
  // Draw each line
  shipSettings.customLines.forEach(line => {
    const startX = centerX + line.startX * scale;
    const startY = centerY + line.startY * scale;
    const endX = centerX + line.endX * scale;
    const endY = centerY + line.endY * scale;
    
    previewCtx.strokeStyle = normalizeColor(line.color);
    previewCtx.lineWidth = 2;
    previewCtx.beginPath();
    previewCtx.moveTo(startX, startY);
    previewCtx.lineTo(endX, endY);
    previewCtx.stroke();
    
    // Draw small dots at endpoints
    previewCtx.fillStyle = normalizeColor(line.color);
    previewCtx.beginPath();
    previewCtx.arc(startX, startY, 1.5, 0, Math.PI * 2);
    previewCtx.arc(endX, endY, 1.5, 0, Math.PI * 2);
    previewCtx.fill();
  });
}

/**
 * Draw thruster points in preview
 */
function drawThrusterPointsPreview() {
  if (!previewCtx || !previewCanvas || !shipSettings.thrusterPoints) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  const scale = 0.25;
  
  shipSettings.thrusterPoints.forEach(point => {
    const x = centerX + point.x * scale;
    const y = centerY + point.y * scale;
    
    // Draw small orange dot
    previewCtx.fillStyle = 'rgba(255, 165, 0, 0.7)';
    previewCtx.beginPath();
    previewCtx.arc(x, y, 3, 0, Math.PI * 2);
    previewCtx.fill();
  });
}

/**
 * Draw weapon points in preview
 */
function drawWeaponPointsPreview() {
  if (!previewCtx || !previewCanvas || !shipSettings.weaponPoints) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  const scale = 0.25;
  
  shipSettings.weaponPoints.forEach(point => {
    const x = centerX + point.x * scale;
    const y = centerY + point.y * scale;
    
    // Draw small red dot
    previewCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    previewCtx.beginPath();
    previewCtx.arc(x, y, 3, 0, Math.PI * 2);
    previewCtx.fill();
  });
}

/**
 * Draw thrust effect on the ship
 */
function drawThrustEffect() {
  if (!previewCtx || !previewCanvas) return;
  
  const centerX = previewCanvas.width / 2;
  const centerY = previewCanvas.height / 2;
  
  // If there are custom thruster points, use those
  if (shipSettings.thrusterPoints && shipSettings.thrusterPoints.length > 0) {
    const scale = 0.25;
    
    shipSettings.thrusterPoints.forEach(point => {
      const x = centerX + point.x * scale;
      const y = centerY + point.y * scale;
      drawFlame(x, y);
    });
    return;
  }
  
  // Default thrust at the bottom of the ship
  if (shipSettings.type === 'custom' && shipSettings.customLines && shipSettings.customLines.length > 0) {
    // For custom ship, find the lowest point(s) to place thrusters
    const lowestPoints = findLowestPoints();
    lowestPoints.forEach(point => {
      const scale = 0.25;
      const x = centerX + point.x * scale;
      const y = centerY + point.y * scale;
      drawFlame(x, y);
    });
  } else {
    // For built-in ships, put thrust at the bottom
    drawFlame(centerX, centerY + 40);
  }
}

/**
 * Find the lowest points of a custom ship to place thrusters
 * @returns {Array} Array of points
 */
function findLowestPoints() {
  if (!shipSettings.customLines || shipSettings.customLines.length === 0) {
    return [{ x: 0, y: 40 }];
  }
  
  // Collect all unique points
  let points = [];
  shipSettings.customLines.forEach(line => {
    points.push({ x: line.startX, y: line.startY });
    points.push({ x: line.endX, y: line.endY });
  });
  
  // Find the lowest points (highest y values)
  points.sort((a, b) => b.y - a.y);
  
  // Take the 1-3 lowest points
  const threshold = points[0].y - 20; // Points within 20px of the lowest
  return points.filter(p => p.y >= threshold).slice(0, 3);
}

/**
 * Draw a flame effect at a specific point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function drawFlame(x, y) {
  if (!previewCtx) return;
  
  const flameLength = 15 + Math.random() * 8;
  
  // Create gradient
  const gradient = previewCtx.createLinearGradient(
    x, y,
    x, y + flameLength
  );
  
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.3, 'rgba(255, 165, 0, 0.7)');
  gradient.addColorStop(0.8, 'rgba(255, 0, 0, 0.5)');
  gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
  
  const width = 5 + Math.random() * 2;
  
  // Draw triangle flame
  previewCtx.beginPath();
  previewCtx.moveTo(x, y);
  previewCtx.lineTo(x - width, y + flameLength);
  previewCtx.lineTo(x + width, y + flameLength);
  previewCtx.closePath();
  previewCtx.fillStyle = gradient;
  previewCtx.fill();
}