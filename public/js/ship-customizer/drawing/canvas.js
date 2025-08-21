/**
 * /public/js/ship-customizer/drawing/canvas.js
 * Handles drawing canvas setup and rendering
 */

import { shipSettings, currentMode, currentDrawMode, isDrawingLine, currentLineStart, lastMousePosition } from '../core/settings.js';
import { normalizeColor } from '../core/utils.js';
import { drawGrid } from './grid.js';

// Canvas references
let drawingCanvas;
let drawingCtx;

/**
 * Set up the drawing canvas
 * @returns {Object} Object containing canvas and context
 */
export function setupCanvas() {
  drawingCanvas = document.getElementById('drawing-canvas');
  
  if (!drawingCanvas) {
    console.error('Drawing canvas element not found');
    return { drawingCanvas: null, drawingCtx: null };
  }
  
  drawingCtx = drawingCanvas.getContext('2d');
  
  // Set fixed dimensions
  const fixedWidth = 400;
  const fixedHeight = 400;
  
  drawingCanvas.width = fixedWidth;
  drawingCanvas.height = fixedHeight;
  
  // Ensure canvas is visible
  drawingCanvas.style.display = 'block';
  
  // Add event listener for canvas redraw
  document.addEventListener('redrawCanvas', redrawCanvas);
  
  // Initial drawing
  redrawCanvas();
  
  return { drawingCanvas, drawingCtx };
}

/**
 * Clear the canvas
 */
export function clearCanvas() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    drawingCanvas = window.shipcustomizer.drawingCanvas;
    drawingCtx = drawingCanvas.getContext('2d');
  }
  
  if (!drawingCtx) return;
  
  drawingCtx.fillStyle = '#000';
  drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}

/**
 * Redraw the entire canvas
 */
export function redrawCanvas() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    drawingCanvas = window.shipcustomizer.drawingCanvas;
    drawingCtx = drawingCanvas.getContext('2d');
  }
  
  if (!drawingCtx || !drawingCanvas) {
    console.error("Cannot redraw - missing canvas or context references");
    return;
  }
  
  clearCanvas();
  drawGrid();
  drawOrientationGuides();
  drawAllLines();
  
  // Draw in-progress line if any
  drawInProgressLine();
  
  drawThrusterPoints();
  drawWeaponPoints();
  
  // Update line count
  const lineCount = document.getElementById('line-count');
  if (lineCount) {
    lineCount.textContent = shipSettings.customLines ? shipSettings.customLines.length : "0";
  }
}

/**
 * Draw the in-progress line preview
 */
function drawInProgressLine() {
  // Check if we're in design mode and drawing a line
  const isDrawingNow = window.shipcustomizer?.isDrawingLine || isDrawingLine;
  const mode = window.shipcustomizer?.settings?.currentMode || currentMode;
  const drawMode = window.shipcustomizer?.settings?.currentDrawMode || currentDrawMode;
  
  if (mode !== 'design' || !isDrawingNow) {
    return;
  }
  
  // Get the starting point, checking both global and local references
  let lineStart = window.shipcustomizer?.currentLineStart || currentLineStart;
  if (!lineStart) {
    console.log("No line start point found for preview");
    return;
  }
  
  // Get the current mouse position
  let currentMouse = window.shipcustomizer?.lastMousePosition || lastMousePosition;
  if (!currentMouse) {
    currentMouse = { x: lineStart.x, y: lineStart.y };
  }
  
  console.log("Drawing preview line from", lineStart.x, lineStart.y, "to", currentMouse.x, currentMouse.y);
  
  // Draw the main preview line
  drawPreviewLine(lineStart.x, lineStart.y, currentMouse.x, currentMouse.y);
  
  // Check if we're in mirror mode
  if (drawMode === 'mirror') {
    // Calculate center of the canvas for mirroring
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    
    // Calculate mirrored coordinates
    const mirroredStartX = 2 * centerX - lineStart.x;
    const mirroredStartY = lineStart.y; // Only mirror horizontally
    const mirroredMouseX = 2 * centerX - currentMouse.x;
    const mirroredMouseY = currentMouse.y; // Only mirror horizontally
    
    // Draw the mirrored preview line
    drawPreviewLine(mirroredStartX, mirroredStartY, mirroredMouseX, mirroredMouseY);
  }
}

/**
 * Helper function to draw a preview line with all effects
 * @param {number} startX - X coordinate of the start point
 * @param {number} startY - Y coordinate of the start point
 * @param {number} endX - X coordinate of the end point
 * @param {number} endY - Y coordinate of the end point
 */
function drawPreviewLine(startX, startY, endX, endY) {
  // Draw the dashed preview line with enhanced visibility
  drawingCtx.strokeStyle = normalizeColor(shipSettings.color);
  drawingCtx.lineWidth = 2;
  drawingCtx.setLineDash([5, 5]); // Dashed line for preview
  
  drawingCtx.beginPath();
  drawingCtx.moveTo(startX, startY);
  drawingCtx.lineTo(endX, endY);
  drawingCtx.stroke();
  
  // Make the preview line more visible with a glow effect
  drawingCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  drawingCtx.lineWidth = 4; 
  drawingCtx.beginPath();
  drawingCtx.moveTo(startX, startY);
  drawingCtx.lineTo(endX, endY);
  drawingCtx.stroke();
  
  // Reset dash pattern
  drawingCtx.setLineDash([]);
  
  // Draw the starting point with a larger and more visible marker
  drawingCtx.fillStyle = normalizeColor(shipSettings.color);
  drawingCtx.beginPath();
  drawingCtx.arc(startX, startY, 5, 0, Math.PI * 2);
  drawingCtx.fill();
  
  // Add a glow effect to the starting point
  drawingCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  drawingCtx.lineWidth = 2;
  drawingCtx.beginPath();
  drawingCtx.arc(startX, startY, 7, 0, Math.PI * 2);
  drawingCtx.stroke();
  
  // Also draw a pulsing indicator at the end position
  drawingCtx.fillStyle = normalizeColor(shipSettings.color);
  drawingCtx.beginPath();
  drawingCtx.arc(endX, endY, 3, 0, Math.PI * 2);
  drawingCtx.fill();
}

/**
 * Draw orientation guides on the canvas
 */
export function drawOrientationGuides() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    drawingCanvas = window.shipcustomizer.drawingCanvas;
    drawingCtx = drawingCanvas.getContext('2d');
  }
  
  if (!drawingCtx || !drawingCanvas) return;
  
  const w = drawingCanvas.width;
  const h = drawingCanvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  
  // Draw "FRONT" indicator at the top
  drawingCtx.fillStyle = 'rgba(0, 255, 255, 0.4)';
  drawingCtx.font = '14px Arial';
  drawingCtx.textAlign = 'center';
  drawingCtx.fillText('FRONT / BULLETS', centerX, 30);
  
  // Draw arrow pointing up
  drawingCtx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
  drawingCtx.lineWidth = 2;
  drawingCtx.beginPath();
  drawingCtx.moveTo(centerX, 40);
  drawingCtx.lineTo(centerX, 60);
  drawingCtx.stroke();
  
  // Arrow head
  drawingCtx.beginPath();
  drawingCtx.moveTo(centerX, 40);
  drawingCtx.lineTo(centerX - 5, 50);
  drawingCtx.lineTo(centerX + 5, 50);
  drawingCtx.closePath();
  drawingCtx.fill();
  
  // Draw "BACK" indicator at the bottom
  drawingCtx.fillStyle = 'rgba(255, 165, 0, 0.4)';
  drawingCtx.fillText('BACK / THRUSTERS', centerX, h - 30);
  
  // Draw arrow pointing down
  drawingCtx.strokeStyle = 'rgba(255, 165, 0, 0.4)';
  drawingCtx.beginPath();
  drawingCtx.moveTo(centerX, h - 40);
  drawingCtx.lineTo(centerX, h - 60);
  drawingCtx.stroke();
  
  // Arrow head
  drawingCtx.beginPath();
  drawingCtx.moveTo(centerX, h - 40);
  drawingCtx.lineTo(centerX - 5, h - 50);
  drawingCtx.lineTo(centerX + 5, h - 50);
  drawingCtx.closePath();
  drawingCtx.fill();
  
  // If in mirror mode, draw a faint dotted vertical line at the center
  const drawMode = window.shipcustomizer?.settings?.currentDrawMode || currentDrawMode;
  if (drawMode === 'mirror') {
    drawingCtx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    drawingCtx.setLineDash([5, 5]);
    drawingCtx.lineWidth = 1;
    drawingCtx.beginPath();
    drawingCtx.moveTo(centerX, 0);
    drawingCtx.lineTo(centerX, h);
    drawingCtx.stroke();
    drawingCtx.setLineDash([]);
    
    // Add a small "MIRROR" label
    drawingCtx.fillStyle = 'rgba(0, 255, 255, 0.4)';
    drawingCtx.font = '10px Arial';
    drawingCtx.fillText('MIRROR', centerX, h/2 - 5);
  }
}

/**
 * Draw all ship lines
 */
export function drawAllLines() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    drawingCanvas = window.shipcustomizer.drawingCanvas;
    drawingCtx = drawingCanvas.getContext('2d');
  }
  
  if (!drawingCtx || !drawingCanvas || !shipSettings.customLines) {
    console.log("Cannot draw lines - missing references or no lines to draw");
    return;
  }
  
  console.log("Drawing " + shipSettings.customLines.length + " custom lines");
  
  shipSettings.customLines.forEach((line, index) => {
    // Convert ship coordinates to canvas coordinates
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    
    const startX = centerX + line.startX;
    const startY = centerY + line.startY;
    const endX = centerX + line.endX;
    const endY = centerY + line.endY;
    
    // Use normalized color
    const color = normalizeColor(line.color);
    drawingCtx.strokeStyle = color;
    drawingCtx.lineWidth = 2;
    drawingCtx.beginPath();
    drawingCtx.moveTo(startX, startY);
    drawingCtx.lineTo(endX, endY);
    drawingCtx.stroke();
    
    // Draw endpoints
    drawingCtx.fillStyle = color;
    drawingCtx.beginPath();
    drawingCtx.arc(startX, startY, 3, 0, Math.PI * 2);
    drawingCtx.fill();
    
    drawingCtx.beginPath();
    drawingCtx.arc(endX, endY, 3, 0, Math.PI * 2);
    drawingCtx.fill();
    
    // Debug
    if (index === 0) {
      console.log("Sample line drawn:", {
        startX, startY, endX, endY, color
      });
    }
  });
}

/**
 * Draw thruster points
 */
export function drawThrusterPoints() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    drawingCanvas = window.shipcustomizer.drawingCanvas;
    drawingCtx = drawingCanvas.getContext('2d');
  }
  
  if (!drawingCtx || !drawingCanvas || !shipSettings.thrusterPoints) return;
  
  shipSettings.thrusterPoints.forEach(point => {
    // Convert ship coordinates to canvas coordinates
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    
    const x = centerX + point.x;
    const y = centerY + point.y;
    
    // Draw thruster marker
    drawingCtx.fillStyle = 'rgba(255, 165, 0, 0.6)';
    drawingCtx.beginPath();
    drawingCtx.arc(x, y, 6, 0, Math.PI * 2);
    drawingCtx.fill();
    
    // Draw a flame icon
    drawingCtx.fillStyle = 'rgba(255, 165, 0, 0.8)';
    drawingCtx.beginPath();
    drawingCtx.moveTo(x, y);
    drawingCtx.lineTo(x - 4, y + 8);
    drawingCtx.lineTo(x, y + 12);
    drawingCtx.lineTo(x + 4, y + 8);
    drawingCtx.closePath();
    drawingCtx.fill();
  });
}

/**
 * Draw weapon points
 */
export function drawWeaponPoints() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    drawingCanvas = window.shipcustomizer.drawingCanvas;
    drawingCtx = drawingCanvas.getContext('2d');
  }
  
  if (!drawingCtx || !drawingCanvas || !shipSettings.weaponPoints) return;
  
  shipSettings.weaponPoints.forEach(point => {
    // Convert ship coordinates to canvas coordinates
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    
    const x = centerX + point.x;
    const y = centerY + point.y;
    
    // Draw weapon marker
    drawingCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    drawingCtx.beginPath();
    drawingCtx.arc(x, y, 6, 0, Math.PI * 2);
    drawingCtx.fill();
    
    // Draw crosshairs
    drawingCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    drawingCtx.lineWidth = 2;
    
    // Horizontal line
    drawingCtx.beginPath();
    drawingCtx.moveTo(x - 8, y);
    drawingCtx.lineTo(x + 8, y);
    drawingCtx.stroke();
    
    // Vertical line
    drawingCtx.beginPath();
    drawingCtx.moveTo(x, y - 8);
    drawingCtx.lineTo(x, y + 8);
    drawingCtx.stroke();
  });
}

/**
 * Get the drawing canvas element
 * @returns {HTMLCanvasElement} The drawing canvas
 */
export function getDrawingCanvas() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    return window.shipcustomizer.drawingCanvas;
  }
  return drawingCanvas;
}

/**
 * Get the drawing canvas context
 * @returns {CanvasRenderingContext2D} The drawing context
 */
export function getDrawingContext() {
  // First try to get canvas from the global namespace if available
  if (window.shipcustomizer && window.shipcustomizer.drawingCanvas) {
    drawingCanvas = window.shipcustomizer.drawingCanvas;
    return drawingCanvas.getContext('2d');
  }
  return drawingCtx;
}