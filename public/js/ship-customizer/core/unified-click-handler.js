/**
 * Create a unified click handler for the ship customizer
 * @param {HTMLCanvasElement} drawingCanvas - The drawing canvas element
 * @param {Object} handlers - Object containing mode-specific handlers
 */
function createUnifiedClickHandler(drawingCanvas) {
    if (!drawingCanvas) return;
    
    // Get the canvas context reference before changing anything
    const drawingCtx = drawingCanvas.getContext('2d');
    
    // Instead of replacing the canvas (which breaks references),
    // just add a new click handler to the existing canvas
    
    // Remove existing click listeners with the clone technique
    const canvasParent = drawingCanvas.parentNode;
    if (canvasParent) {
      const newCanvas = drawingCanvas.cloneNode(false); // false = don't clone children
      
      // Important: transfer the drawing context to the new canvas properly
      canvasParent.replaceChild(newCanvas, drawingCanvas);
      drawingCanvas = newCanvas;
      
      // Save this canvas to the global namespace to ensure we have a reference
      if (window.shipcustomizer) {
        window.shipcustomizer.drawingCanvas = drawingCanvas;
      }
      
      // Get a fresh context
      const newCtx = drawingCanvas.getContext('2d');
      
      // Make sure canvas dimensions are maintained
      drawingCanvas.width = 400;
      drawingCanvas.height = 400;
      
      // Re-draw everything immediately
      document.dispatchEvent(new CustomEvent('redrawCanvas'));
    }
    
    // Set up the new unified click handler
    drawingCanvas.addEventListener('click', (e) => {
      const rect = drawingCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Convert to ship coordinate system
      const centerX = drawingCanvas.width / 2;
      const centerY = drawingCanvas.height / 2;
      const shipX = clickX - centerX;
      const shipY = clickY - centerY;
      
      // Import these to make sure we have the latest values
      const { currentMode } = window.shipcustomizer?.settings || { currentMode: 'design' };
      
      console.log(`Processing click in ${currentMode} mode at (${clickX}, ${clickY})`);
      
      // Dispatch to the appropriate handler based on the current mode
      if (currentMode === 'design') {
        // First check the global namespace
        if (window.shipcustomizer && typeof window.shipcustomizer.handleDesignModeClick === 'function') {
          window.shipcustomizer.handleDesignModeClick(clickX, clickY, shipX, shipY);
        } 
        // Then check if the function is imported directly
        else if (typeof handleDesignModeClick === 'function') {
          handleDesignModeClick(clickX, clickY, shipX, shipY);
        } else {
          console.error('Design mode handler not found');
        }
      } else if (currentMode === 'thruster') {
        // Check the global namespace for the thruster mode handler
        if (window.shipcustomizer && typeof window.shipcustomizer.handleThrusterModeClick === 'function') {
          window.shipcustomizer.handleThrusterModeClick(clickX, clickY, shipX, shipY);
        } else {
          console.error('Thruster mode handler not found');
        }
      } else if (currentMode === 'weapon') {
        // Check the global namespace for the weapon mode handler
        if (window.shipcustomizer && typeof window.shipcustomizer.handleWeaponModeClick === 'function') {
          window.shipcustomizer.handleWeaponModeClick(clickX, clickY, shipX, shipY);
        } else {
          console.error('Weapon mode handler not found');
        }
      }
    });
    
    // Set up the mousemove handler for line preview
    drawingCanvas.addEventListener('mousemove', (e) => {
      // Check if we're in design mode and drawing a line
      const currentMode = window.shipcustomizer?.settings?.currentMode || 'design';
      const isDrawingLine = window.shipcustomizer?.isDrawingLine || false;
      const currentLineStart = window.shipcustomizer?.currentLineStart;
      
      if (currentMode !== 'design' || !isDrawingLine || !currentLineStart) {
        return; // Not currently drawing a line, nothing to do
      }
      
      // Get mouse position relative to canvas
      const rect = drawingCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Store mouse position globally
      if (window.shipcustomizer) {
        window.shipcustomizer.lastMousePosition = { x: mouseX, y: mouseY };
        console.log("Mouse move: updated position to", mouseX, mouseY);
      }
      
      // Request animation frame for smoother drawing
      requestAnimationFrame(() => {
        // Force redraw to update the preview line
        if (typeof redrawCanvas === 'function') {
          redrawCanvas();
        } else if (document.dispatchEvent) {
          document.dispatchEvent(new CustomEvent('redrawCanvas'));
        }
      });
    });
    
    return drawingCanvas;
  }
  
  // Export the function
  export { createUnifiedClickHandler };