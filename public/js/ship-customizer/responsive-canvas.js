/**
 * /public/js/ship-customizer/responsive-canvas.js
 * Handles responsive canvas sizing and scaling for different devices
 */

import { redrawCanvas } from './drawing/canvas.js';
import { updateShipPreview } from './drawing/preview.js';

// Constants for minimum sizes and breakpoints
const MIN_CANVAS_SIZE = 250;
const MOBILE_BREAKPOINT = 768;

/**
 * Initialize responsive canvas behavior
 */
export function initResponsiveCanvas() {
  const drawingCanvas = document.getElementById('drawing-canvas');
  const previewCanvas = document.getElementById('preview-canvas');
  
  if (!drawingCanvas || !previewCanvas) {
    console.error('Canvas elements not found');
    return;
  }
  
  // Initial sizing
  resizeCanvases();
  
  // Add window resize listener
  window.addEventListener('resize', debounce(resizeCanvases, 250));
  
  // Add orientation change listener for mobile
  window.addEventListener('orientationchange', () => {
    // Wait for orientation change to complete
    setTimeout(resizeCanvases, 300);
  });
}

/**
 * Resize both drawing and preview canvases based on screen size
 */
function resizeCanvases() {
  const drawingCanvas = document.getElementById('drawing-canvas');
  const previewCanvas = document.getElementById('preview-canvas');
  const drawingContainer = drawingCanvas?.parentElement;
  const previewContainer = previewCanvas?.parentElement;
  
  if (!drawingCanvas || !previewCanvas || !drawingContainer || !previewContainer) {
    return;
  }
  
  // Get container dimensions
  const drawingContainerWidth = drawingContainer.clientWidth;
  const previewContainerWidth = previewContainer.clientWidth;
  
  // Determine if we're on mobile
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  
  // Set canvas sizes based on container
  if (isMobile) {
    // On mobile, make sure we have appropriate sizes
    const drawingSize = Math.max(MIN_CANVAS_SIZE, drawingContainerWidth);
    const previewSize = Math.max(MIN_CANVAS_SIZE, previewContainerWidth);
    
    // Set canvas dimensions
    resizeCanvas(drawingCanvas, drawingSize, drawingSize);
    resizeCanvas(previewCanvas, previewSize, previewSize);
    
    // Make container match canvas size to maintain aspect ratio
    drawingContainer.style.height = drawingSize + 'px';
    previewContainer.style.height = previewSize + 'px';
  } else {
    // On desktop, use fixed sizes
    resizeCanvas(drawingCanvas, 400, 400);
    resizeCanvas(previewCanvas, 250, 250);
    
    // Reset container heights
    drawingContainer.style.height = '400px';
    previewContainer.style.height = '250px';
  }
  
  // Redraw both canvases
  if (typeof redrawCanvas === 'function') {
    redrawCanvas();
  } else {
    // Fallback to event dispatch
    document.dispatchEvent(new CustomEvent('redrawCanvas'));
  }
  
  if (typeof updateShipPreview === 'function') {
    updateShipPreview();
  }
}

/**
 * Resize a canvas to specific dimensions
 * @param {HTMLCanvasElement} canvas - The canvas to resize
 * @param {number} width - The target width
 * @param {number} height - The target height
 */
function resizeCanvas(canvas, width, height) {
  // Store current drawing
  const ctx = canvas.getContext('2d');
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  
  // Resize canvas
  canvas.width = width;
  canvas.height = height;
  
  // Restore drawing (scaled if needed)
  if (tempCanvas.width > 0 && tempCanvas.height > 0) {
    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 
                  0, 0, canvas.width, canvas.height);
  }
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Auto-initialize on import
initResponsiveCanvas();