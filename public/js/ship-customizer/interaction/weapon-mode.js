/**
 * /public/js/ship-customizer/interaction/weapon-mode.js
 * Handles weapon placement mode interactions
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
 * Initialize weapon mode
 * @param {HTMLCanvasElement} drawingCanvas - The drawing canvas element
 */
export function initWeaponMode(drawingCanvas) {
  if (!drawingCanvas) return;
  
  // Add event listener for mode button
  const weaponModeBtn = document.getElementById('weapon-mode-btn');
  
  if (weaponModeBtn) {
    weaponModeBtn.addEventListener('click', () => setMode('weapon'));
  }
  
  // Register the handler with the global namespace so unified click handler can find it
  if (window.shipcustomizer) {
    window.shipcustomizer.handleWeaponModeClick = handleWeaponModeClick;
  }
}

/**
 * Handle click in weapon mode
 * @param {number} clickX - X coordinate of click
 * @param {number} clickY - Y coordinate of click
 * @param {number} shipX - Ship X coordinate
 * @param {number} shipY - Ship Y coordinate
 */
export function handleWeaponModeClick(clickX, clickY, shipX, shipY) {
  const drawingCanvas = getDrawingCanvas();
  
  if (!drawingCanvas) return;
  
  if (!shipSettings.weaponPoints) {
    shipSettings.weaponPoints = [];
  }
  
  // Check if we're clicking on an existing weapon point (to remove it)
  const clickRadius = 10; // Pixels
  let pointRemoved = false;
  
  for (let i = 0; i < shipSettings.weaponPoints.length; i++) {
    const point = shipSettings.weaponPoints[i];
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    const pointX = centerX + point.x;
    const pointY = centerY + point.y;
    
    const distance = Math.sqrt(Math.pow(clickX - pointX, 2) + Math.pow(clickY - pointY, 2));
    
    if (distance < clickRadius) {
      // Remove this point
      shipSettings.weaponPoints.splice(i, 1);
      pointRemoved = true;
      createPulseEffect(clickX, clickY, 'red', drawingCanvas);
      console.log("Removed weapon point, now have", shipSettings.weaponPoints.length);
      break;
    }
  }
  
  // If we didn't remove a point and we're under the limit, add a new one
  if (!pointRemoved && shipSettings.weaponPoints.length < 2) {
    shipSettings.weaponPoints.push({
      x: shipX,
      y: shipY
    });
    
    createPulseEffect(clickX, clickY, 'red', drawingCanvas);
    console.log("Added weapon point at", shipX, shipY, "now have", shipSettings.weaponPoints.length);
  } else if (!pointRemoved && shipSettings.weaponPoints.length >= 2) {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Maximum 2 weapon points allowed';
      setTimeout(() => {
        updateStatusForMode('weapon');
      }, 2000);
    }
  }
  
  // Update UI
  updatePointCounts();
  updateStatusForMode('weapon');
  redrawCanvas();
  updateShipPreview();
}

/**
 * Clear all weapon points
 */
export function clearWeaponPoints() {
  shipSettings.weaponPoints = [];
  updatePointCounts();
  updateStatusForMode('weapon');
  redrawCanvas();
  updateShipPreview();
  console.log("Cleared all weapon points");
}

/**
 * Get the current weapon points
 * @returns {Array} Array of weapon points
 */
export function getWeaponPoints() {
  return shipSettings.weaponPoints || [];
}