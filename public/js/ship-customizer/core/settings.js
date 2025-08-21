/**
 * /public/js/ship-customizer/core/settings.js
 * Manages ship settings and global application state
 */

import { normalizeColor } from './utils.js';

// Global state
export let currentMode = 'design'; // 'design', 'thruster', or 'weapon'
export let currentDrawMode = 'freehand'; // 'freehand', 'mirror', or 'snap'

// Ship settings
export const shipSettings = {
  name: '',
  type: 'custom',
  color: 'white',
  customLines: [],
  thrusterPoints: [],
  weaponPoints: [],
  passphrase: null
};

// Drawing state - initialize with objects to avoid null references
export let isDrawingLine = false;
export let currentLineStart = null;
export let lastMousePosition = { x: 0, y: 0 }; // Initialize with default values

// Setter functions for variables that need to be modified from other modules
export function setIsDrawingLine(value) {
  isDrawingLine = value;
}

export function setCurrentLineStart(value) {
  currentLineStart = value;
}

export function setLastMousePosition(x, y) {
  if (lastMousePosition) {
    lastMousePosition.x = x;
    lastMousePosition.y = y;
  } else {
    lastMousePosition = { x, y };
  }
}

/**
 * Load saved settings from localStorage
 */
export function loadSavedSettings() {
  console.log("Loading saved ship settings...");
  const savedSettings = localStorage.getItem('asteroids_playerSettings');
  
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      console.log("Found saved settings:", parsed);
      
      // Update our shipSettings with saved values
      if (parsed.shipName) {
        shipSettings.name = parsed.shipName;
        const shipNameInput = document.getElementById('ship-name');
        if (shipNameInput) shipNameInput.value = parsed.shipName;
      }
      
      if (parsed.shipType) {
        shipSettings.type = parsed.shipType;
      }
      
      if (parsed.shipColor) {
        shipSettings.color = parsed.shipColor;
      }
      
      if (parsed.passphrase) {
        shipSettings.passphrase = parsed.passphrase;
        const shipPassphraseDisplay = document.getElementById('ship-passphrase');
        const savedShipContainer = document.getElementById('saved-ship-container');
        
        if (shipPassphraseDisplay) shipPassphraseDisplay.textContent = parsed.passphrase;
        if (savedShipContainer) savedShipContainer.style.display = 'block';
      }
      
      // IMPORTANT: Create new arrays to avoid reference issues
      if (parsed.customLines && parsed.customLines.length > 0) {
        shipSettings.customLines = [...parsed.customLines];
      } else {
        shipSettings.customLines = [];
      }
      
      if (parsed.thrusterPoints && parsed.thrusterPoints.length > 0) {
        shipSettings.thrusterPoints = [...parsed.thrusterPoints];
      } else {
        shipSettings.thrusterPoints = [];
      }
      
      if (parsed.weaponPoints && parsed.weaponPoints.length > 0) {
        shipSettings.weaponPoints = [...parsed.weaponPoints];
      } else {
        shipSettings.weaponPoints = [];
      }
      
      // Update UI to reflect loaded settings
      updateUIFromSettings();
      
    } catch (e) {
      console.error("Error loading player settings:", e);
    }
  } else {
    console.log("No saved settings found");
  }
}

/**
 * Update UI elements to match current settings
 */
export function updateUIFromSettings() {
  // Update ship name input
  const shipNameInput = document.getElementById('ship-name');
  if (shipNameInput && shipSettings.name) {
    shipNameInput.value = shipSettings.name;
  }
  
  // Update ship model selection
  const shipModels = document.querySelectorAll('.ship-model');
  shipModels.forEach(model => {
    model.classList.remove('selected');
    
    const modelType = model.getAttribute('data-type');
    if (modelType === shipSettings.type) {
      model.classList.add('selected');
    }
  });
  
  // Update color selection
  const colorOptions = document.querySelectorAll('.color-option');
  const customColorPicker = document.getElementById('custom-color-picker');
  
  colorOptions.forEach(option => {
    option.classList.remove('selected');
    const optionColor = option.getAttribute('data-color');
    
    if (shipSettings.color.startsWith('#') && optionColor === 'custom') {
      // For hex colors, select the custom option
      option.classList.add('selected');
      if (customColorPicker) {
        customColorPicker.value = shipSettings.color;
        updateColorPreview(shipSettings.color);
      }
    } else if (optionColor === shipSettings.color) {
      // For named colors
      option.classList.add('selected');
    }
  });
  
  // Update line count
  const lineCount = document.getElementById('line-count');
  if (lineCount) {
    lineCount.textContent = shipSettings.customLines ? shipSettings.customLines.length : "0";
  }
  
  // Update passphrase display if available
  const shipPassphraseDisplay = document.getElementById('ship-passphrase');
  const savedShipContainer = document.getElementById('saved-ship-container');
  
  if (shipSettings.passphrase) {
    if (shipPassphraseDisplay) shipPassphraseDisplay.textContent = shipSettings.passphrase;
    if (savedShipContainer) savedShipContainer.style.display = 'block';
  } else {
    if (savedShipContainer) savedShipContainer.style.display = 'none';
  }
  
  // Update point counts
  updatePointCounts();
}

/**
 * Update the color preview element
 * @param {string} color - The color to display
 */
function updateColorPreview(color) {
  const colorPreview = document.querySelector('.color-preview');
  if (colorPreview) {
    colorPreview.style.backgroundColor = color;
  }
}

/**
 * Update thruster and weapon point counts in buttons
 */
export function updatePointCounts() {
  const thrusterModeBtn = document.getElementById('thruster-mode-btn');
  const weaponModeBtn = document.getElementById('weapon-mode-btn');
  
  if (thrusterModeBtn) {
    const count = shipSettings.thrusterPoints ? shipSettings.thrusterPoints.length : 0;
    thrusterModeBtn.textContent = `THRUSTER MODE (${count}/3)`;
  }
  
  if (weaponModeBtn) {
    const count = shipSettings.weaponPoints ? shipSettings.weaponPoints.length : 0;
    weaponModeBtn.textContent = `WEAPON MODE (${count}/2)`;
  }
}

/**
 * Save settings to localStorage
 * @returns {boolean} Success status
 */
export function saveShipToLocalStorage() {
  try {
    console.log("Saving ship to localStorage:", shipSettings);
    
    // Make sure arrays are properly initialized
    if (!Array.isArray(shipSettings.customLines)) {
      console.warn("customLines is not an array, creating empty array");
      shipSettings.customLines = [];
    }
    
    if (!Array.isArray(shipSettings.thrusterPoints)) {
      console.warn("thrusterPoints is not an array, creating empty array");
      shipSettings.thrusterPoints = [];
    }
    
    if (!Array.isArray(shipSettings.weaponPoints)) {
      console.warn("weaponPoints is not an array, creating empty array");
      shipSettings.weaponPoints = [];
    }
    
    // Prepare data for localStorage
    const playerSettings = {
      shipName: shipSettings.name,
      shipType: shipSettings.type,
      shipColor: shipSettings.color,
      customLines: [...shipSettings.customLines],
      thrusterPoints: [...shipSettings.thrusterPoints],
      weaponPoints: [...shipSettings.weaponPoints],
      passphrase: shipSettings.passphrase
    };
    
    console.log("Saving ship with:", {
      name: playerSettings.shipName,
      type: playerSettings.shipType,
      customLinesCount: playerSettings.customLines.length
    });
    
    // Save to localStorage
    localStorage.setItem('asteroids_playerSettings', JSON.stringify(playerSettings));
    console.log("Ship saved to localStorage successfully");
    
    return true;
  } catch (err) {
    console.error("Error saving ship to localStorage:", err);
    return false;
  }
}

/**
 * Set active mode (design, thruster, weapon)
 * @param {string} mode - The mode to set
 */
export function setMode(mode) {
  currentMode = mode;
  setIsDrawingLine(false);
  setCurrentLineStart(null);
  
  // Update global reference if available
  if (window.shipcustomizer && window.shipcustomizer.settings) {
    window.shipcustomizer.settings.currentMode = mode;
  }
  
  // Update button styles
  const designModeBtn = document.getElementById('design-mode-btn');
  const thrusterModeBtn = document.getElementById('thruster-mode-btn');
  const weaponModeBtn = document.getElementById('weapon-mode-btn');
  
  if (designModeBtn) designModeBtn.classList.toggle('active', mode === 'design');
  if (thrusterModeBtn) thrusterModeBtn.classList.toggle('active', mode === 'thruster');
  if (weaponModeBtn) weaponModeBtn.classList.toggle('active', mode === 'weapon');
  
  // Update status message
  updateStatusForMode(mode);
  
  // Trigger a canvas redraw
  document.dispatchEvent(new CustomEvent('redrawCanvas'));
  
  console.log(`Mode switched to: ${mode}`);
}

/**
 * Set active draw mode (freehand, mirror, snap)
 * @param {string} mode - The draw mode to set
 */
export function setDrawMode(mode) {
  currentDrawMode = mode;
  
  // Update global namespace
  if (window.shipcustomizer && window.shipcustomizer.settings) {
    window.shipcustomizer.settings.currentDrawMode = mode;
  }
  
  // Update button styles
  const freehandModeBtn = document.getElementById('freehand-mode-btn');
  const mirrorModeBtn = document.getElementById('mirror-mode-btn');
  const snapModeBtn = document.getElementById('snap-mode-btn');
  
  if (freehandModeBtn) freehandModeBtn.classList.toggle('active', mode === 'freehand');
  if (mirrorModeBtn) mirrorModeBtn.classList.toggle('active', mode === 'mirror');
  if (snapModeBtn) snapModeBtn.classList.toggle('active', mode === 'snap');
  
  // Reset any in-progress line drawing if we're in design mode
  if (currentMode === 'design') {
    setIsDrawingLine(false);
    setCurrentLineStart(null);
    
    // Also update global reference
    if (window.shipcustomizer) {
      window.shipcustomizer.isDrawingLine = false;
      window.shipcustomizer.currentLineStart = null;
    }
  }
  
  // Update status message
  updateStatusForMode(currentMode);
  
  // Trigger a canvas redraw
  document.dispatchEvent(new CustomEvent('redrawCanvas'));
  
  console.log(`Draw mode switched to: ${mode}`);
}

/**
 * Update status message based on current mode
 * @param {string} mode - The current mode
 */
export function updateStatusForMode(mode) {
  const statusMessage = document.getElementById('status-message');
  const lineCount = document.getElementById('line-count');
  
  if (!statusMessage) return;
  
  if (lineCount) {
    lineCount.textContent = shipSettings.customLines ? shipSettings.customLines.length : "0";
  }
  
  if (mode === 'design') {
    statusMessage.textContent = 'DESIGN MODE: Click to start drawing lines';
    statusMessage.style.color = '#9ab';
    
    // Add additional info based on draw mode
    if (currentDrawMode === 'freehand') {
      statusMessage.textContent += ' - Freehand drawing';
    } else if (currentDrawMode === 'mirror') {
      statusMessage.textContent += ' - Mirror mode';
    } else if (currentDrawMode === 'snap') {
      statusMessage.textContent += ' - Snap to grid enabled';
    }
  } else if (mode === 'thruster') {
    const thrusterCount = shipSettings.thrusterPoints ? shipSettings.thrusterPoints.length : 0;
    statusMessage.textContent = `THRUSTER MODE: ${thrusterCount}/3 thrusters placed`;
    statusMessage.style.color = 'rgba(255, 165, 0, 0.8)';
  } else if (mode === 'weapon') {
    const weaponCount = shipSettings.weaponPoints ? shipSettings.weaponPoints.length : 0;
    statusMessage.textContent = `WEAPON MODE: ${weaponCount}/2 weapons placed`;
    statusMessage.style.color = 'rgba(255, 0, 0, 0.8)';
  }
}