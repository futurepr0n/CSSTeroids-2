/**
 * /public/js/ship-customizer/drawing/modes.js
 * Handles different drawing modes (freehand, mirror, snap to grid)
 */

import { 
    setDrawMode, 
    currentDrawMode, 
    currentMode, 
    isDrawingLine, 
    currentLineStart, 
    lastMousePosition,
    setLastMousePosition,
    shipSettings
  } from '../core/settings.js';
  import { 
    snapToGrid, 
    getMirroredPoint, 
    getMousePosition, 
    normalizeColor,
    createPulseEffect
  } from '../core/utils.js';
  import { getDrawingCanvas, getDrawingContext, redrawCanvas } from './canvas.js';
  import { getCurrentGridSize } from './grid.js';
  
  /**
   * Initialize drawing mode handlers
   * @param {HTMLCanvasElement} drawingCanvas - The drawing canvas element
   * @param {CanvasRenderingContext2D} drawingCtx - The drawing context
   */
  export function initDrawingModes(drawingCanvas, drawingCtx) {
    if (!drawingCanvas || !drawingCtx) return;
    
    // Connect to the existing draw mode buttons
    const freehandModeBtn = document.getElementById('freehand-mode-btn');
    const mirrorModeBtn = document.getElementById('mirror-mode-btn');
    const snapModeBtn = document.getElementById('snap-mode-btn');
    
    if (freehandModeBtn) {
      freehandModeBtn.addEventListener('click', () => setDrawMode('freehand'));
    }
    
    if (mirrorModeBtn) {
      mirrorModeBtn.addEventListener('click', () => setDrawMode('mirror'));
    }
    
    if (snapModeBtn) {
      snapModeBtn.addEventListener('click', () => setDrawMode('snap'));
    }
    
    // Set up the enhanced mousemove handler
    drawingCanvas.addEventListener('mousemove', handleEnhancedMouseMove);
  }
  
  /**
   * Enhanced mousemove handler with support for mirror and snap modes
   * @param {Event} e - The mouse event
   */
  export function handleEnhancedMouseMove(e) {
    // Get drawing canvas and context
    const drawingCanvas = getDrawingCanvas();
    const drawingCtx = getDrawingContext();
    
    if (!drawingCanvas || !drawingCtx) return;
    
    // Get mouse position
    let mousePos = getMousePosition(e, drawingCanvas);
    
    // Apply snap to grid if enabled
    if (currentDrawMode === 'snap') {
      const centerX = drawingCanvas.width / 2;
      const centerY = drawingCanvas.height / 2;
      const gridSize = getCurrentGridSize();
      
      const snapped = snapToGrid(
        mousePos.x, 
        mousePos.y, 
        gridSize, 
        centerX, 
        centerY
      );
      
      mousePos.x = snapped.x;
      mousePos.y = snapped.y;
    }
    
    // Update the last mouse position using the setter function
    setLastMousePosition(mousePos.x, mousePos.y);
    
    // Only continue if in design mode and drawing a line
    if (currentMode !== 'design' || !isDrawingLine || !currentLineStart) {
      return;
    }
    
    // Redraw canvas to clear previous preview
    redrawCanvas();
    
    // Draw preview line
    drawingCtx.strokeStyle = normalizeColor(shipSettings.color);
    drawingCtx.lineWidth = 2;
    drawingCtx.setLineDash([5, 5]); // Dashed line for preview
    
    // Draw line from start point to current mouse position
    drawingCtx.beginPath();
    drawingCtx.moveTo(currentLineStart.x, currentLineStart.y);
    drawingCtx.lineTo(mousePos.x, mousePos.y);
    drawingCtx.stroke();
    
    // If mirror mode is active, also draw mirrored preview line
    if (currentDrawMode === 'mirror' && currentLineStart) {
      const centerX = drawingCanvas.width / 2;
      const centerY = drawingCanvas.height / 2;
      
      const mirroredStart = getMirroredPoint(
        currentLineStart.x, 
        currentLineStart.y, 
        centerX, 
        centerY
      );
      
      const mirroredEnd = getMirroredPoint(
        mousePos.x, 
        mousePos.y, 
        centerX, 
        centerY
      );
      
      drawingCtx.beginPath();
      drawingCtx.moveTo(mirroredStart.x, mirroredStart.y);
      drawingCtx.lineTo(mirroredEnd.x, mirroredEnd.y);
      drawingCtx.stroke();
    }
    
    // Reset dash pattern
    drawingCtx.setLineDash([]);
  }
  
  /**
   * Process click coordinates based on current draw mode
   * @param {Object} clickCoords - The clicked coordinates {x, y}
   * @param {Object} shipCoords - The ship coordinates {x, y}
   * @returns {Object} Processed coordinates {x, y, shipX, shipY}
   */
  export function processCoordinatesForDrawMode(clickCoords, shipCoords) {
    const drawingCanvas = getDrawingCanvas();
    
    if (!drawingCanvas) {
      return { 
        x: clickCoords.x, 
        y: clickCoords.y, 
        shipX: shipCoords.x, 
        shipY: shipCoords.y 
      };
    }
    
    let adjustedX = clickCoords.x;
    let adjustedY = clickCoords.y;
    let adjustedShipX = shipCoords.x;
    let adjustedShipY = shipCoords.y;
    
    // Apply snap-to-grid if enabled
    if (currentDrawMode === 'snap') {
      const centerX = drawingCanvas.width / 2;
      const centerY = drawingCanvas.height / 2;
      const gridSize = getCurrentGridSize();
      
      const snapped = snapToGrid(
        clickCoords.x, 
        clickCoords.y, 
        gridSize, 
        centerX, 
        centerY
      );
      
      adjustedX = snapped.x;
      adjustedY = snapped.y;
      
      // Recalculate ship coordinates from snapped canvas coordinates
      adjustedShipX = adjustedX - centerX;
      adjustedShipY = adjustedY - centerY;
    }
    
    return {
      x: adjustedX,
      y: adjustedY,
      shipX: adjustedShipX,
      shipY: adjustedShipY
    };
  }
  
  /**
   * Add a mirrored line if in mirror mode
   * @param {Object} line - The original line to mirror
   * @returns {Object|null} - The mirrored line or null if not in mirror mode
   */
  export function createMirroredLine(line) {
    if (currentDrawMode !== 'mirror') return null;
    
    const drawingCanvas = getDrawingCanvas();
    if (!drawingCanvas) return null;
    
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    
    // Create the mirrored line
    return {
      startX: -line.startX, // Mirror across the vertical axis
      startY: line.startY,
      endX: -line.endX,
      endY: line.endY,
      color: line.color
    };
  }