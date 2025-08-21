/**
 * /public/js/ship-customizer/drawing/grid.js
 * Handles grid rendering for the drawing canvas
 */

import { currentDrawMode } from '../core/settings.js';
import { getDrawingCanvas, getDrawingContext } from './canvas.js';

// Grid sizes
const DEFAULT_GRID_SIZE = 40;
const FINE_GRID_SIZE = 10;

/**
 * Draw the grid on the drawing canvas
 */
export function drawGrid() {
  const drawingCanvas = getDrawingCanvas();
  const drawingCtx = getDrawingContext();
  
  if (!drawingCanvas || !drawingCtx) {
    console.error("Cannot draw grid - missing canvas or context");
    return;
  }
  
  const w = drawingCanvas.width;
  const h = drawingCanvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  
  // Determine grid size based on current draw mode
  const gridSize = currentDrawMode === 'snap' ? FINE_GRID_SIZE : DEFAULT_GRID_SIZE;
  
  // Draw main axes
  drawingCtx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
  drawingCtx.lineWidth = 1;
  
  // Vertical line
  drawingCtx.beginPath();
  drawingCtx.moveTo(centerX, 0);
  drawingCtx.lineTo(centerX, h);
  drawingCtx.stroke();
  
  // Horizontal line
  drawingCtx.beginPath();
  drawingCtx.moveTo(0, centerY);
  drawingCtx.lineTo(w, centerY);
  drawingCtx.stroke();
  
  // Draw grid
  drawingCtx.strokeStyle = 'rgba(50, 50, 50, 0.2)';
  
  // Vertical grid lines
  for (let x = centerX % gridSize; x < w; x += gridSize) {
    if (Math.abs(x - centerX) < 2) continue;
    
    drawingCtx.beginPath();
    drawingCtx.moveTo(x, 0);
    drawingCtx.lineTo(x, h);
    drawingCtx.stroke();
  }
  
  // Horizontal grid lines
  for (let y = centerY % gridSize; y < h; y += gridSize) {
    if (Math.abs(y - centerY) < 2) continue;
    
    drawingCtx.beginPath();
    drawingCtx.moveTo(0, y);
    drawingCtx.lineTo(w, y);
    drawingCtx.stroke();
  }
  
  // Draw center point
  drawingCtx.fillStyle = 'rgba(100, 100, 100, 0.5)';
  drawingCtx.beginPath();
  drawingCtx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  drawingCtx.fill();
}

/**
 * Get the current grid size based on draw mode
 * @returns {number} Current grid size
 */
export function getCurrentGridSize() {
  return currentDrawMode === 'snap' ? FINE_GRID_SIZE : DEFAULT_GRID_SIZE;
}