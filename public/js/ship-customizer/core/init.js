/**
 * /public/js/ship-customizer/core/init.js
 * Core initialization functions for the Ship Customizer
 */

import { shipSettings, loadSavedSettings, currentMode } from './settings.js';
import { setupCanvas, redrawCanvas } from '../drawing/canvas.js';
import { initColorPicker } from '../interaction/colors.js';
import { initShipModels } from '../interaction/ship-models.js';
import { initDesignMode, handleDesignModeClick } from '../interaction/design-mode.js';
import { initThrusterMode, clearThrusterPoints, handleThrusterModeClick } from '../interaction/thruster-mode.js';
import { initWeaponMode, clearWeaponPoints, handleWeaponModeClick } from '../interaction/weapon-mode.js';
import { initDrawingModes } from '../drawing/modes.js';
import { setupPreviewCanvas, startPreviewAnimation } from '../drawing/preview.js';
import { initSaveButtons, initLoadButton } from '../server/api.js';
import { createUnifiedClickHandler } from './unified-click-handler.js';
import '../responsive-canvas.js'; // Import responsive canvas handler

// Create a global namespace to expose settings and handlers
window.shipcustomizer = {
  settings: { currentMode },
  // Explicitly register the handlers in the global namespace
  handleDesignModeClick: handleDesignModeClick,
  handleThrusterModeClick: handleThrusterModeClick,
  handleWeaponModeClick: handleWeaponModeClick,
  // Add flag for mobile detection
  isMobile: false
};

/**
 * Main initialization function for the Ship Customizer
 */
export function initializeApp() {
  console.log('Ship Customizer: Initializing application...');
  
  // Detect if we're on a mobile device
  detectMobileDevice();
  
  // 1. Load saved settings from localStorage
  loadSavedSettings();
  
  // 2. Set up canvases
  const { drawingCanvas, drawingCtx } = setupCanvas();
  const { previewCanvas, previewCtx } = setupPreviewCanvas();
  
  // 3. Initialize interaction modules
  initColorPicker();
  initShipModels();
  
  // 4. Initialize mode handlers
  initDesignMode(drawingCanvas, drawingCtx);
  initThrusterMode(drawingCanvas, drawingCtx);
  initWeaponMode(drawingCanvas, drawingCtx);
  
  // 5. Initialize drawing modes (freehand, mirror, snap)
  initDrawingModes(drawingCanvas, drawingCtx);
  
  // 6. Set up the unified click handler
  const updatedCanvas = createUnifiedClickHandler(drawingCanvas);
  
  // 7. Initialize server communication
  initSaveButtons();
  initLoadButton();
  
  // 8. Start animation loop for preview
  startPreviewAnimation(previewCanvas, previewCtx);
  
  // 9. Initialize the global clear button
  initGlobalClearButton();
  
  // 10. Mobile-specific initializations
  if (window.shipcustomizer.isMobile) {
    initMobileSpecificFeatures();
  }
  
  // 11. Force canvas refresh to ensure everything is properly rendered
  redrawCanvas();
  
  // 12. Log successful initialization
  console.log('Ship Customizer initialized with settings:', {
    name: shipSettings.name,
    type: shipSettings.type,
    color: shipSettings.color,
    customLinesCount: shipSettings.customLines.length,
    isMobile: window.shipcustomizer.isMobile,
    handlersRegistered: Boolean(window.shipcustomizer.handleDesignModeClick && 
                              window.shipcustomizer.handleThrusterModeClick && 
                              window.shipcustomizer.handleWeaponModeClick)
  });
  
  // Add window resize handler
  window.addEventListener('resize', handleWindowResize);
}

/**
 * Detect if the current device is mobile
 */
function detectMobileDevice() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileViewport = window.innerWidth < 768;
  
  window.shipcustomizer.isMobile = isTouchDevice || isMobileViewport;
  
  // Add mobile class to body if needed
  if (window.shipcustomizer.isMobile) {
    document.body.classList.add('mobile-device');
  } else {
    document.body.classList.remove('mobile-device');
  }
  
  console.log('Device detection:', window.shipcustomizer.isMobile ? 'Mobile' : 'Desktop');
}

/**
 * Initialize mobile-specific features
 */
function initMobileSpecificFeatures() {
  // Scale UI elements for better touch targets
  const buttons = document.querySelectorAll('.button');
  buttons.forEach(button => {
    button.style.minHeight = '44px';
  });
  
  // Simplify instructions for mobile
  const instructionPanel = document.querySelector('.instruction-panel');
  if (instructionPanel) {
    const instructionList = instructionPanel.querySelector('ul');
    if (instructionList && instructionList.children.length > 3) {
      // Keep only the first 3 instructions for simplicity on mobile
      while (instructionList.children.length > 3) {
        instructionList.removeChild(instructionList.lastChild);
      }
    }
  }
  
  // Add pinch zoom prevention
  document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault(); // Prevent pinch zoom
    }
  }, { passive: false });
  
  console.log('Mobile-specific features initialized');
}

/**
 * Initialize the global clear button
 * This function adds a click handler to the clear button that calls
 * the appropriate clear function based on the current mode
 */
function initGlobalClearButton() {
  const clearButton = document.getElementById('clear-button');
  
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      console.log(`Clear button clicked. Current mode: ${currentMode}`);
      
      // Call the appropriate clear function based on the current mode
      if (currentMode === 'design') {
        console.log('Clearing design elements');
        // This function is defined in design-mode.js
        // We're just dispatching the event here
        document.dispatchEvent(new CustomEvent('clearDesign'));
      } else if (currentMode === 'thruster') {
        console.log('Clearing thruster points');
        clearThrusterPoints();
      } else if (currentMode === 'weapon') {
        console.log('Clearing weapon points');
        clearWeaponPoints();
      }
      
      // Add haptic feedback on compatible devices
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50); // Short vibration for tactile feedback
      }
    });
  }
}

/**
 * Handle window resize events
 */
function handleWindowResize() {
  // Update mobile detection on resize
  detectMobileDevice();
  
  // The responsive-canvas module will handle the canvas resizing
}

// Create helpful toast notification function
window.showToast = function(message, duration = 2000) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
};