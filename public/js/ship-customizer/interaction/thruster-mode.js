/**
 * /public/js/ship-customizer/interaction/thruster-mode.js
 * Handles thruster placement mode interactions
 */

import { 
  shipSettings, 
  setMode, 
  updateStatusForMode, 
  updatePointCounts 
} from '../core/settings.js';
import { createPulseEffect, getMousePosition } from '../core/utils.js';
import { getDrawingCanvas, redrawCanvas } from '../drawing/canvas.js';
import { updateShipPreview } from '../drawing/preview.js';

/**
 * Initialize thruster mode
 * @param {HTMLCanvasElement} drawingCanvas - The drawing canvas element
 */
export function initThrusterMode(drawingCanvas) {
  if (!drawingCanvas) return;
  
  // Add event listener for mode button
  const thrusterModeBtn = document.getElementById('thruster-mode-btn');
  
  if (thrusterModeBtn) {
    thrusterModeBtn.addEventListener('click', () => setMode('thruster'));
  }
  
  // Register the handler with the global namespace so unified click handler can find it
  if (window.shipcustomizer) {
    window.shipcustomizer.handleThrusterModeClick = handleThrusterModeClick;
  }
}

/**
 * Handle click in thruster mode
 * @param {number} clickX - X coordinate of click
 * @param {number} clickY - Y coordinate of click
 * @param {number} shipX - Ship X coordinate
 * @param {number} shipY - Ship Y coordinate
 */
export function handleThrusterModeClick(clickX, clickY, shipX, shipY) {
  const drawingCanvas = getDrawingCanvas();
  
  if (!drawingCanvas) return;
  
  if (!shipSettings.thrusterPoints) {
    shipSettings.thrusterPoints = [];
  }
  
  // Check if we're clicking on an existing thruster point (to remove it)
  const clickRadius = 10; // Pixels
  let pointRemoved = false;
  
  for (let i = 0; i < shipSettings.thrusterPoints.length; i++) {
    const point = shipSettings.thrusterPoints[i];
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    const pointX = centerX + point.x;
    const pointY = centerY + point.y;
    
    const distance = Math.sqrt(Math.pow(clickX - pointX, 2) + Math.pow(clickY - pointY, 2));
    
    if (distance < clickRadius) {
      // Remove this point
      shipSettings.thrusterPoints.splice(i, 1);
      pointRemoved = true;
      createPulseEffect(clickX, clickY, 'red', drawingCanvas);
      console.log("Removed thruster point, now have", shipSettings.thrusterPoints.length);
      break;
    }
  }
  
  // If we didn't remove a point and we're under the limit, add a new one
  if (!pointRemoved && shipSettings.thrusterPoints.length < 3) {
    shipSettings.thrusterPoints.push({
      x: shipX,
      y: shipY
    });
    
    createPulseEffect(clickX, clickY, 'orange', drawingCanvas);
    console.log("Added thruster point at", shipX, shipY, "now have", shipSettings.thrusterPoints.length);
  } else if (!pointRemoved && shipSettings.thrusterPoints.length >= 3) {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Maximum 3 thruster points allowed';
      setTimeout(() => {
        updateStatusForMode('thruster');
      }, 2000);
    }
  }
  
  // Update UI
  updatePointCounts();
  updateStatusForMode('thruster');
  redrawCanvas();
  updateShipPreview();
}

/**
 * Clear all thruster points
 */
export function clearThrusterPoints() {
  shipSettings.thrusterPoints = [];
  updatePointCounts();
  updateStatusForMode('thruster');
  redrawCanvas();
  updateShipPreview();
  console.log("Cleared all thruster points");
}

/**
 * Get the current thruster points
 * @returns {Array} Array of thruster points
 */
export function getThrusterPoints() {
  return shipSettings.thrusterPoints || [];
}