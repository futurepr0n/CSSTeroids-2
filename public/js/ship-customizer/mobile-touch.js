/**
 * /public/js/ship-customizer/mobile-touch.js
 * Handles touch interactions for the ship customizer on mobile devices
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', initMobileTouch);

function initMobileTouch() {
  // Check if we're on a touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (!isTouchDevice) {
    console.log('Not a touch device, skipping mobile touch initialization');
    return;
  }
  
  console.log('Initializing mobile touch controls');
  
  // Get canvas and context
  const drawingCanvas = document.getElementById('drawing-canvas');
  const touchIndicator = document.querySelector('.touch-indicator');
  
  if (!drawingCanvas || !touchIndicator) {
    console.error('Required elements not found for mobile touch');
    return;
  }
  
  // Make sure canvas is properly sized for the container
  resizeCanvasToContainer(drawingCanvas);
  
  // Variables to track touch state
  let isDrawingLine = false;
  let startPoint = null;
  let lastTouchPosition = { x: 0, y: 0 };
  
  // Add event listeners for touch events
  drawingCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  drawingCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  drawingCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    resizeCanvasToContainer(drawingCanvas);
  });
  
  /**
   * Handle touch start events
   * @param {TouchEvent} e - The touch event
   */
  function handleTouchStart(e) {
    e.preventDefault(); // Prevent scrolling when touching the canvas
    
    // Get the current mode
    const currentMode = window.shipcustomizer?.settings?.currentMode || 'design';
    
    // Get touch position relative to canvas
    const touch = e.touches[0];
    const rect = drawingCanvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Update the touch indicator position
    showTouchIndicator(touchX, touchY);
    
    // Store touch position
    lastTouchPosition = { x: touchX, y: touchY };
    
    // Dispatch to the appropriate handler
    if (currentMode === 'design') {
      handleDesignModeTouchStart(touchX, touchY);
    } else if (currentMode === 'thruster') {
      // Dispatch through global namespace
      if (window.shipcustomizer && typeof window.shipcustomizer.handleThrusterModeClick === 'function') {
        const centerX = drawingCanvas.width / 2;
        const centerY = drawingCanvas.height / 2;
        const shipX = touchX - centerX;
        const shipY = touchY - centerY;
        window.shipcustomizer.handleThrusterModeClick(touchX, touchY, shipX, shipY);
      }
    } else if (currentMode === 'weapon') {
      // Dispatch through global namespace
      if (window.shipcustomizer && typeof window.shipcustomizer.handleWeaponModeClick === 'function') {
        const centerX = drawingCanvas.width / 2;
        const centerY = drawingCanvas.height / 2;
        const shipX = touchX - centerX;
        const shipY = touchY - centerY;
        window.shipcustomizer.handleWeaponModeClick(touchX, touchY, shipX, shipY);
      }
    }
  }
  
  /**
   * Handle touch move events
   * @param {TouchEvent} e - The touch event
   */
  function handleTouchMove(e) {
    e.preventDefault(); // Prevent scrolling when touching the canvas
    
    // Get the current mode
    const currentMode = window.shipcustomizer?.settings?.currentMode || 'design';
    
    // Only process if we're in design mode and currently drawing a line
    if (currentMode !== 'design' || !isDrawingLine || !startPoint) return;
    
    // Get touch position relative to canvas
    const touch = e.touches[0];
    const rect = drawingCanvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Update the touch indicator position
    showTouchIndicator(touchX, touchY);
    
    // Store touch position
    lastTouchPosition = { x: touchX, y: touchY };
    
    // Store in global namespace for rendering
    if (window.shipcustomizer) {
      window.shipcustomizer.lastMousePosition = { x: touchX, y: touchY };
    }
    
    // Force redraw to update the preview line
    if (typeof redrawCanvas === 'function') {
      redrawCanvas();
    } else if (document.dispatchEvent) {
      document.dispatchEvent(new CustomEvent('redrawCanvas'));
    }
  }
  
  /**
   * Handle touch end events
   * @param {TouchEvent} e - The touch event
   */
  function handleTouchEnd(e) {
    e.preventDefault(); // Prevent default touch actions
    
    // Hide the touch indicator
    hideTouchIndicator();
    
    // Get the current mode
    const currentMode = window.shipcustomizer?.settings?.currentMode || 'design';
    
    // Only process if we're in design mode and currently drawing a line
    if (currentMode !== 'design' || !isDrawingLine || !startPoint) return;
    
    // Complete the line
    const rect = drawingCanvas.getBoundingClientRect();
    const endTouchX = lastTouchPosition.x;
    const endTouchY = lastTouchPosition.y;
    
    // Calculate ship coordinates
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    const shipX = endTouchX - centerX;
    const shipY = endTouchY - centerY;
    
    // Dispatch to design mode handler to complete the line
    if (window.shipcustomizer && typeof window.shipcustomizer.handleDesignModeClick === 'function') {
      window.shipcustomizer.handleDesignModeClick(endTouchX, endTouchY, shipX, shipY);
    }
    
    // Reset drawing state
    isDrawingLine = false;
    startPoint = null;
    
    // Show visual feedback
    showToast('Line added');
  }
  
  /**
   * Handle the start of a touch in design mode
   * @param {number} touchX - X coordinate of touch
   * @param {number} touchY - Y coordinate of touch
   */
  function handleDesignModeTouchStart(touchX, touchY) {
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    const shipX = touchX - centerX;
    const shipY = touchY - centerY;
    
    // If we're not already drawing a line, start one
    if (!isDrawingLine) {
      // Start a new line
      startPoint = {
        x: touchX,
        y: touchY,
        shipX: shipX,
        shipY: shipY
      };
      
      isDrawingLine = true;
      
      // Also set in global namespace
      if (window.shipcustomizer) {
        window.shipcustomizer.isDrawingLine = true;
        window.shipcustomizer.currentLineStart = startPoint;
      }
      
      // Show visual feedback
      showToast('Now place the end point');
      
      // Dispatch to handle the first point
      if (window.shipcustomizer && typeof window.shipcustomizer.handleDesignModeClick === 'function') {
        window.shipcustomizer.handleDesignModeClick(touchX, touchY, shipX, shipY);
      }
    } else {
      // We're completing a line
      // Handled by touch end event
    }
  }
  
  /**
   * Resize the canvas to fit its container while maintaining proper dimensions
   * @param {HTMLCanvasElement} canvas - The canvas element
   */
  function resizeCanvasToContainer(canvas) {
    const container = canvas.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // Force redraw
    if (document.dispatchEvent) {
      document.dispatchEvent(new CustomEvent('redrawCanvas'));
    }
  }
  
  /**
   * Show the touch indicator at the specified position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  function showTouchIndicator(x, y) {
    if (!touchIndicator) return;
    
    touchIndicator.style.left = x + 'px';
    touchIndicator.style.top = y + 'px';
    touchIndicator.style.opacity = '1';
    
    // Auto-hide after a short delay
    setTimeout(() => {
      touchIndicator.style.opacity = '0';
    }, 1000);
  }
  
  /**
   * Hide the touch indicator
   */
  function hideTouchIndicator() {
    if (!touchIndicator) return;
    
    touchIndicator.style.opacity = '0';
  }
  
  /**
   * Show a toast notification
   * @param {string} message - The message to show
   */
  function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
}