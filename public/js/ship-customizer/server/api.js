/**
 * /public/js/ship-customizer/server/api.js
 * Handles server communication for saving and loading ships
 */

import { shipSettings, saveShipToLocalStorage, updateUIFromSettings } from '../core/settings.js';
import { safeParseJSON, normalizeColor } from '../core/utils.js';
import { redrawCanvas } from '../drawing/canvas.js';
import { updateShipPreview } from '../drawing/preview.js';

/**
 * Initialize save buttons
 */
export function initSaveButtons() {
  const saveButton = document.getElementById('save-button');
  const saveNewButton = document.getElementById('save-new-button');
  const returnButton = document.getElementById('return-button');
  
  if (saveButton) {
    saveButton.addEventListener('click', () => saveShip(false));
  }
  
  if (saveNewButton) {
    saveNewButton.addEventListener('click', () => saveShip(true));
  }
  
  if (returnButton) {
    returnButton.addEventListener('click', handleReturnToGame);
  }
}

/**
 * Initialize load button
 */
export function initLoadButton() {
  const loadButton = document.getElementById('load-button');
  const loadPassphraseInput = document.getElementById('load-passphrase');
  
  if (loadButton && loadPassphraseInput) {
    loadButton.addEventListener('click', () => {
      const passphrase = loadPassphraseInput.value.trim();
      if (!passphrase) {
        alert('Please enter a passphrase to load a ship');
        loadPassphraseInput.focus();
        return;
      }
      
      loadShipByPassphrase(passphrase);
    });
  }
}

/**
 * Save ship to server
 * @param {boolean} createNew - Whether to create a new ship
 * @returns {Promise<boolean>} Success status
 */
async function saveShip(createNew = false) {
  try {
    // Validate ship has a name
    const shipNameInput = document.getElementById('ship-name');
    if (!shipNameInput) {
      throw new Error('Ship name input not found');
    }
    
    const shipName = shipNameInput.value.trim();
    if (!shipName) {
      alert('Please enter a name for your ship');
      shipNameInput.focus();
      return false;
    }
    
    // Validate ship has at least one line if custom
    if (shipSettings.type === 'custom' && shipSettings.customLines.length === 0) {
      alert('Please add at least one line to your custom ship or select a different ship type.');
      return false;
    }
    
    // Update ship settings with current name
    shipSettings.name = shipName;
    
    // Ensure customLines is an array with properly structured line data
    if (!Array.isArray(shipSettings.customLines)) {
      shipSettings.customLines = [];
    }
    
    // If creating new, clear passphrase to generate a new one
    if (createNew) {
      shipSettings.passphrase = null;
    }
    
    // Debugging: Log what we're about to send
    console.log("Sending ship data to server:", {
      name: shipSettings.name,
      type: shipSettings.type, 
      color: shipSettings.color,
      customLinesCount: shipSettings.customLines.length,
      thrusterPointsCount: shipSettings.thrusterPoints ? shipSettings.thrusterPoints.length : 0,
      weaponPointsCount: shipSettings.weaponPoints ? shipSettings.weaponPoints.length : 0,
      passphrase: shipSettings.passphrase
    });
    
    // Prepare data for saving - make sure arrays are properly defined
    const shipData = {
      name: shipSettings.name,
      type: shipSettings.type,
      color: shipSettings.color,
      customLines: Array.isArray(shipSettings.customLines) ? shipSettings.customLines : [],
      thrusterPoints: Array.isArray(shipSettings.thrusterPoints) ? shipSettings.thrusterPoints : [],
      weaponPoints: Array.isArray(shipSettings.weaponPoints) ? shipSettings.weaponPoints : [],
      passphrase: shipSettings.passphrase,
      isPublic: shipSettings.isPublic !== undefined ? shipSettings.isPublic : true
    };
    
    // Normalize color values in customLines
    shipData.customLines = shipData.customLines.map(line => ({
      ...line,
      color: normalizeColor(line.color)
    }));
    
    // Update status
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Saving ship to server...';
    }
    
    // Send data to server
    const response = await fetch('/api/ships', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shipData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("Server response:", result);
    
    // Update the passphrase from server
    shipSettings.passphrase = result.passphrase;
    
    // Update the UI to show the passphrase
    const shipPassphraseDisplay = document.getElementById('ship-passphrase');
    const savedShipContainer = document.getElementById('saved-ship-container');
    
    if (shipPassphraseDisplay) {
      shipPassphraseDisplay.textContent = result.passphrase;
    }
    if (savedShipContainer) {
      savedShipContainer.style.display = 'block';
    }
    
    // Also save to localStorage for immediate use in game
    saveShipToLocalStorage();
    
    // Update status
    if (statusMessage) {
      statusMessage.textContent = createNew ? 
        'New ship created successfully!' : 
        'Ship updated successfully!';
    }
    
    return true;
  } catch (error) {
    console.error("Error saving ship to server:", error);
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Error saving ship: ' + error.message;
    }
    return false;
  }
}

/**
 * Load ship by passphrase
 * @param {string} passphrase - The passphrase to load
 * @returns {Promise<boolean>} Success status
 */
export async function loadShipByPassphrase(passphrase) {
  try {
    if (!passphrase) {
      alert('Please enter a passphrase to load a ship');
      return false;
    }
    
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Loading ship...';
    }
    
    // Request the ship data from server
    const response = await fetch(`/api/ships/passphrase/${encodeURIComponent(passphrase)}`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Ship not found with that passphrase');
      }
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const shipData = await response.json();
    console.log("Loaded ship data:", shipData);
    
    // Process the loaded data
    processLoadedShipData(shipData);
    
    // Clear the passphrase input
    const loadPassphraseInput = document.getElementById('load-passphrase');
    if (loadPassphraseInput) {
      loadPassphraseInput.value = '';
    }
    
    if (statusMessage) {
      statusMessage.textContent = 'Ship loaded successfully!';
    }
    
    return true;
  } catch (error) {
    console.error("Error loading ship:", error);
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Error loading ship: ' + error.message;
    }
    return false;
  }
}

/**
 * Process loaded ship data and update application state
 * @param {Object} shipData - The loaded ship data
 */
function processLoadedShipData(shipData) {
  // Check if customLines is valid
  if (!shipData.customLines) {
    console.warn("Missing customLines in loaded data");
    shipData.customLines = [];
  }
  
  // Check if arrays are actually arrays
  if (!Array.isArray(shipData.customLines)) {
    console.warn("customLines is not an array:", shipData.customLines);
    try {
      // Try to parse it if it's a string
      if (typeof shipData.customLines === 'string') {
        shipData.customLines = safeParseJSON(shipData.customLines);
      } else {
        shipData.customLines = [];
      }
    } catch (e) {
      console.error("Failed to parse customLines:", e);
      shipData.customLines = [];
    }
  }
  
  // Same for other arrays
  if (!Array.isArray(shipData.thrusterPoints)) {
    console.warn("thrusterPoints is not an array:", shipData.thrusterPoints);
    try {
      if (typeof shipData.thrusterPoints === 'string') {
        shipData.thrusterPoints = safeParseJSON(shipData.thrusterPoints);
      } else {
        shipData.thrusterPoints = [];
      }
    } catch (e) {
      console.error("Failed to parse thrusterPoints:", e);
      shipData.thrusterPoints = [];
    }
  }
  
  if (!Array.isArray(shipData.weaponPoints)) {
    console.warn("weaponPoints is not an array:", shipData.weaponPoints);
    try {
      if (typeof shipData.weaponPoints === 'string') {
        shipData.weaponPoints = safeParseJSON(shipData.weaponPoints);
      } else {
        shipData.weaponPoints = [];
      }
    } catch (e) {
      console.error("Failed to parse weaponPoints:", e);
      shipData.weaponPoints = [];
    }
  }
  
  // Update ship settings with loaded data
  shipSettings.name = shipData.name;
  shipSettings.type = shipData.type;
  shipSettings.color = shipData.color;
  shipSettings.customLines = shipData.customLines;
  shipSettings.thrusterPoints = shipData.thrusterPoints;
  shipSettings.weaponPoints = shipData.weaponPoints;
  shipSettings.passphrase = shipData.passphrase;
  shipSettings.isPublic = shipData.isPublic !== undefined ? shipData.isPublic : true;
  
  // Update UI
  const shipNameInput = document.getElementById('ship-name');
  const shipPassphraseDisplay = document.getElementById('ship-passphrase');
  const savedShipContainer = document.getElementById('saved-ship-container');
  
  if (shipNameInput) {
    shipNameInput.value = shipData.name;
  }
  if (shipPassphraseDisplay) {
    shipPassphraseDisplay.textContent = shipData.passphrase;
  }
  if (savedShipContainer) {
    savedShipContainer.style.display = 'block';
  }
  
  // Update other UI elements
  updateUIFromSettings();
  
  // Redraw canvas
  redrawCanvas();
  updateShipPreview();
  
  console.log("Successfully loaded ship with:", {
    name: shipSettings.name,
    customLinesCount: shipSettings.customLines.length,
    thrusterPointsCount: shipSettings.thrusterPoints.length,
    weaponPointsCount: shipSettings.weaponPoints.length
  });
}

/**
 * Handler for the return to game button
 */
function handleReturnToGame() {
  // Save current design to localStorage for the game to use
  saveShipToLocalStorage();
  console.log("Ship saved to local storage, returning to game...");
  
  // Return to the main game
  window.location.href = 'index.html';
}