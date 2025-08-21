/**
 * /public/js/ship-customizer/interaction/design-mode.js
 * Handles design mode interactions for drawing ship lines
 */

import { 
  shipSettings, 
  setMode,
  currentMode,
  currentDrawMode,
  isDrawingLine, 
  currentLineStart,
  setIsDrawingLine,
  setCurrentLineStart,
  updateStatusForMode 
} from '../core/settings.js';
import { createPulseEffect, normalizeColor, getMousePosition } from '../core/utils.js';
import { getDrawingCanvas, getDrawingContext, redrawCanvas } from '../drawing/canvas.js';
import { processCoordinatesForDrawMode, createMirroredLine } from '../drawing/modes.js';
import { updateShipPreview } from '../drawing/preview.js';

/**
 * Initialize design mode
 * @param {HTMLCanvasElement} drawingCanvas - The drawing canvas element
 * @param {CanvasRenderingContext2D} drawingCtx - The drawing context
 */
export function initDesignMode(drawingCanvas, drawingCtx) {
  if (!drawingCanvas || !drawingCtx) return;
  
  // Add event listener for mode button
  const designModeBtn = document.getElementById('design-mode-btn');
  
  if (designModeBtn) {
    designModeBtn.addEventListener('click', () => setMode('design'));
  }
  
  // Add event listener for the clear design event
  document.addEventListener('clearDesign', clearDesignElements);
  
  // Initialize undo and complete buttons
  initUndoButton();
  initCompleteButton();
  
  // Register the handler with the global namespace so unified click handler can find it
  if (window.shipcustomizer) {
    window.shipcustomizer.handleDesignModeClick = handleDesignModeClick;
  }
  
  // Add mousemove handler for line preview
  drawingCanvas.addEventListener('mousemove', handleMouseMove);
}

/**
 * Handle mouse move events for line preview
 * @param {MouseEvent} e - The mouse event
 */
function handleMouseMove(e) {
  // Only process if we're in design mode and currently drawing a line
  if (currentMode !== 'design' || !isDrawingLine || !currentLineStart) return;
  
  const drawingCanvas = getDrawingCanvas();
  if (!drawingCanvas) return;
  
  // Get current mouse position
  const rect = drawingCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Store this position globally
  if (window.shipcustomizer) {
    window.shipcustomizer.lastMousePosition = { x: mouseX, y: mouseY };
  }
  
  // Force redraw to update the preview line
  redrawCanvas();
}

/**
 * Clear all design elements
 */
function clearDesignElements() {
  // Use empty array rather than direct assignment to maintain reference
  shipSettings.customLines = [];
  
  // Use the setter functions
  setIsDrawingLine(false);
  setCurrentLineStart(null);
  
  // Update UI
  redrawCanvas();
  updateShipPreview();
  updateStatusForMode('design');
  
  console.log('Cleared all design elements');
}

/**
 * Initialize the undo button for design mode
 */
function initUndoButton() {
  const undoButton = document.getElementById('undo-button');
  
  if (undoButton) {
    undoButton.addEventListener('click', () => {
      // Only process if in design mode
      if (currentMode !== 'design') return;
      
      if (isDrawingLine) {
        // Cancel in-progress line
        setIsDrawingLine(false);
        setCurrentLineStart(null);
        
        // Also clear from global namespace
        if (window.shipcustomizer) {
          window.shipcustomizer.currentLineStart = null;
          window.shipcustomizer.isDrawingLine = false;
        }
        
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
          statusMessage.textContent = 'Click anywhere to start a line';
        }
        
        console.log("Cancelled in-progress line");
      } else if (shipSettings.customLines && shipSettings.customLines.length > 0) {
        // Remove last completed line
        shipSettings.customLines.pop();
        console.log("Removed last line, remaining:", shipSettings.customLines.length);
      }
      
      // Update UI
      redrawCanvas();
      updateShipPreview();
      updateStatusForMode('design');
    });
  }
}

/**
 * Initialize the complete button for design mode
 */
function initCompleteButton() {
  const completeButton = document.getElementById('complete-button');
  
  if (completeButton) {
    completeButton.addEventListener('click', () => {
      // Only process if in design mode
      if (currentMode !== 'design') return;
      
      if (shipSettings.customLines.length === 0) {
        alert('Please add at least one line to create a ship design.');
        return;
      }
      
      // Cancel any in-progress line
      setIsDrawingLine(false);
      setCurrentLineStart(null);
      
      // Also clear from global namespace
      if (window.shipcustomizer) {
        window.shipcustomizer.currentLineStart = null;
        window.shipcustomizer.isDrawingLine = false;
      }
      
      // Ensure type is set to custom
      shipSettings.type = 'custom';
      
      // Update UI to reflect selection
      const shipModels = document.querySelectorAll('.ship-model');
      shipModels.forEach(model => {
        model.classList.remove('selected');
        if (model.getAttribute('data-type') === 'custom') {
          model.classList.add('selected');
        }
      });
      
      // Update visuals
      redrawCanvas();
      updateShipPreview();
      
      // Update status message
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = 'Design completed! Click to add more lines or save.';
      }
      
      console.log("Design completed with", shipSettings.customLines.length, "lines");
    });
  }
}

/**
 * Set the in-progress line state
 * @param {boolean} drawing - Whether a line is being drawn
 * @param {Object|null} startPoint - The starting point of the line
 */
export function setInProgressLine(drawing, startPoint) {
  // Use setter functions from settings.js
  setIsDrawingLine(drawing);
  setCurrentLineStart(startPoint);
  
  // Also store in global namespace
  if (window.shipcustomizer) {
    window.shipcustomizer.isDrawingLine = drawing;
    window.shipcustomizer.currentLineStart = startPoint;
  }
  
  console.log("Setting in-progress line:", drawing, startPoint);
}

/**
 * Handle click in design mode
 * @param {number} clickX - X coordinate of click
 * @param {number} clickY - Y coordinate of click
 * @param {number} shipX - Ship X coordinate
 * @param {number} shipY - Ship Y coordinate
 */
export function handleDesignModeClick(clickX, clickY, shipX, shipY) {
  const drawingCanvas = getDrawingCanvas();
  const drawingCtx = getDrawingContext();
  
  if (!drawingCanvas || !drawingCtx) return;
  
  try {
    console.log("Design mode click at:", clickX, clickY, "ship coords:", shipX, shipY);
    
    // Process coordinates based on current draw mode
    const { x: adjustedX, y: adjustedY, shipX: adjustedShipX, shipY: adjustedShipY } = 
      processCoordinatesForDrawMode({ x: clickX, y: clickY }, { x: shipX, y: shipY });
    
    // If we're starting a new line
    if (!isDrawingLine) {
      // Create the start point object with BOTH canvas and ship coordinates
      const startPoint = {
        x: adjustedX,          // Canvas X coordinate
        y: adjustedY,          // Canvas Y coordinate
        shipX: adjustedShipX,  // Ship-relative X coordinate
        shipY: adjustedShipY   // Ship-relative Y coordinate
      };
      
      setInProgressLine(true, startPoint);
      
      // Set initial mouse position to the start point to handle preview correctly
      if (window.shipcustomizer) {
        window.shipcustomizer.lastMousePosition = { x: adjustedX, y: adjustedY };
      }
      
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = 'Click to place the second point';
      }
      
      // Visual feedback
      createPulseEffect(adjustedX, adjustedY, normalizeColor(shipSettings.color), drawingCanvas);
      console.log("Starting line at", adjustedX, adjustedY, "ship coords:", adjustedShipX, adjustedShipY);
    } 
    // If we're finishing a line
    else {
      // Make sure we have a valid current line start
      if (!currentLineStart) {
        console.error("Trying to finish a line but currentLineStart is null!");
        setIsDrawingLine(false);
        return;
      }
      
      // Make sure customLines is an array
      if (!Array.isArray(shipSettings.customLines)) {
        shipSettings.customLines = [];
      }
      
      // Create the line with normalized color - using SHIP coordinates
      const newLine = {
        startX: currentLineStart.shipX,
        startY: currentLineStart.shipY,
        endX: adjustedShipX,
        endY: adjustedShipY,
        color: normalizeColor(shipSettings.color)
      };
      
      // Add the line to our array
      shipSettings.customLines.push(newLine);
      
      // Create and add mirrored line if in mirror mode
      const mirroredLine = createMirroredLine(newLine);
      if (mirroredLine) {
        shipSettings.customLines.push(mirroredLine);
      }
      
      console.log("Added new line:", newLine);
      console.log("Total lines now:", shipSettings.customLines.length);
      
      // Reset for the next line - THIS IS CRITICAL
      setInProgressLine(false, null);
      
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = 'Click anywhere to start a new line';
      }
      
      // Visual feedback
      createPulseEffect(adjustedX, adjustedY, normalizeColor(shipSettings.color), drawingCanvas);
      
      // Update line count display
      const lineCount = document.getElementById('line-count');
      if (lineCount) {
        lineCount.textContent = shipSettings.customLines.length;
      }
      
      // Update ship preview
      updateShipPreview();
    }
    
    // Force redraw to ensure everything is displayed
    redrawCanvas();
  } catch (error) {
    console.error("Error in handleDesignModeClick:", error);
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Error adding line: ' + error.message;
    }
  }
}