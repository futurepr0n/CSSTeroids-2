/**
 *  publc/js/main.js
 * Asteroids Game - Main JavaScript File
 * Handles initialization and utility functions for the game
 */

// ============= UTILITY FUNCTIONS =============

/**
 * Safely parse JSON data, handling various input formats
 * @param {string|object} jsonData - The data to parse
 * @returns {Array|Object} - The parsed data or empty array on error
 */
function safeParseJSON(jsonData) {
    // Handle empty data
    if (!jsonData) return [];
    
    // If already an object, return it
    if (typeof jsonData === 'object' && jsonData !== null) {
      return jsonData;
    }
    
    // Try to parse string data
    try {
      return JSON.parse(jsonData);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return [];
    }
  }
  
  /**
   * Debug function to examine ship settings in localStorage
   */
  function debugSavedShipSettings() {
    try {
      const savedSettings = localStorage.getItem('asteroids_playerSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        console.log("DEBUG - Saved ship settings:", {
          name: parsed.shipName,
          type: parsed.shipType,
          color: parsed.shipColor,
          customLines: Array.isArray(parsed.customLines) ? parsed.customLines.length : 'Invalid customLines',
          thrusterPoints: Array.isArray(parsed.thrusterPoints) ? parsed.thrusterPoints.length : 'Invalid thrusterPoints',
          weaponPoints: Array.isArray(parsed.weaponPoints) ? parsed.weaponPoints.length : 'Invalid weaponPoints',
          passphrase: parsed.passphrase ? 'Set' : 'Not set'
        });
        
        // Also check the format of customLines
        if (parsed.customLines && parsed.customLines.length > 0) {
          console.log("First customLine example:", parsed.customLines[0]);
        }
      } else {
        console.log("No saved ship settings found");
      }
    } catch (e) {
      console.error("Error debugging ship settings:", e);
    }
  }
  
  /**
   * Save ship design to localStorage with proper formatting
   * @param {Object} shipSettings - The ship settings to save
   * @returns {boolean} - Success status
   */
  function saveShipToLocalStorage(shipSettings) {
    try {
      console.log("Saving ship to localStorage:", shipSettings);
      
      // Make sure customLines is an array
      if (!Array.isArray(shipSettings.customLines)) {
        console.warn("customLines is not an array, creating empty array");
        shipSettings.customLines = [];
      }
      
      // Make sure thrusterPoints is an array
      if (!Array.isArray(shipSettings.thrusterPoints)) {
        console.warn("thrusterPoints is not an array, creating empty array");
        shipSettings.thrusterPoints = [];
      }
      
      // Make sure weaponPoints is an array
      if (!Array.isArray(shipSettings.weaponPoints)) {
        console.warn("weaponPoints is not an array, creating empty array");
        shipSettings.weaponPoints = [];
      }
      
      // Prepare data for localStorage
      const playerSettings = {
        shipName: shipSettings.name || "Unknown Ship",
        shipType: shipSettings.type || "default",
        shipColor: shipSettings.color || "white",
        customLines: [...shipSettings.customLines],
        thrusterPoints: [...shipSettings.thrusterPoints],
        weaponPoints: [...shipSettings.weaponPoints],
        passphrase: shipSettings.passphrase || null
      };
      
      console.log("Saving ship with:", {
        name: playerSettings.shipName,
        type: playerSettings.shipType,
        customLinesCount: playerSettings.customLines.length,
        thrusterPointsCount: playerSettings.thrusterPoints.length,
        weaponPointsCount: playerSettings.weaponPoints.length
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
  
  // ============= API FUNCTIONS =============
  
  /**
   * Load a ship from the server by passphrase
   * @param {string} passphrase - The passphrase of the ship to load
   * @returns {Object|null} - The loaded ship data or null on error
   */
  async function loadShipFromServer(passphrase) {
    try {
      if (!passphrase) {
        console.error('No passphrase provided');
        return null;
      }
      
      console.log(`Loading ship with passphrase: ${passphrase}`);
      const response = await fetch(`/api/ships/passphrase/${encodeURIComponent(passphrase)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error('Ship not found with that passphrase');
        } else {
          console.error(`Server error: ${response.status}`);
        }
        return null;
      }
      
      const shipData = await response.json();
      console.log("Received ship data from server:", shipData);
      
      // Ensure arrays are properly parsed
      const processedShipData = {
        ...shipData,
        customLines: Array.isArray(shipData.customLines) 
          ? shipData.customLines 
          : safeParseJSON(shipData.customLines),
        thrusterPoints: Array.isArray(shipData.thrusterPoints) 
          ? shipData.thrusterPoints 
          : safeParseJSON(shipData.thrusterPoints),
        weaponPoints: Array.isArray(shipData.weaponPoints) 
          ? shipData.weaponPoints 
          : safeParseJSON(shipData.weaponPoints)
      };
      
      console.log("Processed ship data:", {
        name: processedShipData.name,
        type: processedShipData.type,
        color: processedShipData.color,
        customLinesCount: processedShipData.customLines.length,
        thrusterPointsCount: processedShipData.thrusterPoints.length,
        weaponPointsCount: processedShipData.weaponPoints.length
      });
      
      return processedShipData;
    } catch (error) {
      console.error('Error loading ship from server:', error);
      return null;
    }
  }
  
  /**
   * Save a ship to the server
   * @param {Object} shipData - The ship data to save
   * @returns {Object|null} - The server response or null on error
   */
  async function saveShipToServer(shipData) {
    try {
      if (!shipData || !shipData.name) {
        console.error('Invalid ship data');
        return null;
      }
      
      console.log("Sending ship data to server:", {
        name: shipData.name,
        type: shipData.type,
        color: shipData.color,
        customLinesCount: shipData.customLines ? shipData.customLines.length : 0,
        thrusterPointsCount: shipData.thrusterPoints ? shipData.thrusterPoints.length : 0,
        weaponPointsCount: shipData.weaponPoints ? shipData.weaponPoints.length : 0
      });
      
      // Ensure arrays are properly structured
      const processedShipData = {
        ...shipData,
        customLines: Array.isArray(shipData.customLines) ? shipData.customLines : [],
        thrusterPoints: Array.isArray(shipData.thrusterPoints) ? shipData.thrusterPoints : [],
        weaponPoints: Array.isArray(shipData.weaponPoints) ? shipData.weaponPoints : []
      };
      
      const response = await fetch('/api/ships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(processedShipData)
      });
      
      if (!response.ok) {
        console.error(`Server error: ${response.status}`);
        return null;
      }
      
      const result = await response.json();
      console.log("Server response:", result);
      return result;
    } catch (error) {
      console.error('Error saving ship to server:', error);
      return null;
    }
  }
  
  /**
   * Get high scores from the server
   * @returns {Array|null} - The high scores or null on error
   */
  async function getHighScoresFromServer() {
    try {
      const response = await fetch('/api/high-scores');
      
      if (!response.ok) {
        console.error(`Server error: ${response.status}`);
        return null;
      }
      
      const scores = await response.json();
      return scores;
    } catch (error) {
      console.error('Error getting high scores:', error);
      return null;
    }
  }
  
  /**
   * Save a high score to the server
   * @param {Object} scoreData - The score data to save
   * @returns {Object|null} - The server response or null on error
   */
  async function saveHighScoreToServer(scoreData) {
    try {
      if (!scoreData) {
        console.error('Invalid score data');
        return null;
      }
      
      const response = await fetch('/api/high-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scoreData)
      });
      
      if (!response.ok) {
        console.error(`Server error: ${response.status}`);
        return null;
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving high score:', error);
      return null;
    }
  }
  
  /**
   * Load a ship by passphrase (for ship customizer UI)
   * @param {string} passphrase - The passphrase to load
   * @returns {boolean} - Success status
   */
  async function loadShipByPassphrase(passphrase) {
    try {
      if (!passphrase) {
        alert('Please enter a passphrase to load a ship');
        return false;
      }
      
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = 'Loading ship...';
      }
      
      // Load the ship data from server
      const shipData = await loadShipFromServer(passphrase);
      
      if (!shipData) {
        throw new Error('Failed to load ship data');
      }
      
      // Get UI elements
      const shipNameInput = document.getElementById('ship-name');
      const shipPassphraseDisplay = document.getElementById('ship-passphrase');
      const savedShipContainer = document.getElementById('saved-ship-container');
      
      // Make sure shipSettings is defined (could be window.shipSettings or a global var)
      const shipSettings = window.shipSettings || (typeof shipSettings !== 'undefined' ? shipSettings : {});
      
      // Update ship settings with loaded data
      shipSettings.name = shipData.name;
      shipSettings.type = shipData.type;
      shipSettings.color = shipData.color;
      shipSettings.customLines = shipData.customLines || [];
      shipSettings.thrusterPoints = shipData.thrusterPoints || [];
      shipSettings.weaponPoints = shipData.weaponPoints || [];
      shipSettings.passphrase = shipData.passphrase;
      
      console.log("Updated ship settings:", {
        name: shipSettings.name,
        type: shipSettings.type, 
        customLinesCount: shipSettings.customLines.length
      });
      
      // Update UI
      if (shipNameInput) {
        shipNameInput.value = shipData.name;
      }
      if (shipPassphraseDisplay) {
        shipPassphraseDisplay.textContent = shipData.passphrase;
      }
      if (savedShipContainer) {
        savedShipContainer.style.display = 'block';
      }
      
      // Update other UI elements if the function exists
      if (typeof updateUIFromSettings === 'function') {
        updateUIFromSettings();
      }
      
      // Redraw canvas if the functions exist
      if (typeof redrawCanvas === 'function') {
        redrawCanvas();
      }
      if (typeof updateShipPreview === 'function') {
        updateShipPreview();
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
  
  // ============= INITIALIZATION =============
  
  /**
   * Initialize the ship customizer
   */
  function initShipCustomizer() {
    const loadButton = document.getElementById('load-button');
    const loadPassphraseInput = document.getElementById('load-passphrase');
    
    if (loadButton) {
      // Remove existing event listeners
      const newLoadButton = loadButton.cloneNode(true);
      loadButton.parentNode.replaceChild(newLoadButton, loadButton);
      
      // Add our enhanced event listener
      newLoadButton.addEventListener('click', async function() {
        const passphrase = loadPassphraseInput.value.trim();
        if (passphrase) {
          const result = await loadShipByPassphrase(passphrase);
          if (result) {
            loadPassphraseInput.value = '';
          }
        } else {
          alert('Please enter a passphrase to load a ship');
          loadPassphraseInput.focus();
        }
      });
    }
    
    // Handle URL parameter for passphrase
    const urlParams = new URLSearchParams(window.location.search);
    const passphraseParam = urlParams.get('passphrase');
    
    if (passphraseParam && loadPassphraseInput) {
      loadPassphraseInput.value = passphraseParam;
      setTimeout(() => {
        if (newLoadButton) {
          newLoadButton.click();
        } else if (loadButton) {
          loadButton.click();
        }
      }, 500);
    }
  }
  
  /**
   * Initialize the game
   */
  function initGame() {
    debugSavedShipSettings();
    
    console.log("Initializing game...");
    
    // Create game instance and make it globally accessible
    window.game = new Game();
    
    // Add debug method to game
    window.game.debugShip = function() {
      if (this.ship) {
        console.log("Ship debug:", {
          shipType: this.ship.shipType,
          color: this.ship.color,
          customLines: this.ship.customLines ? this.ship.customLines.length : 'None',
          isVisible: this.ship.visible,
          position: `x:${this.ship.x.toFixed(2)}, y:${this.ship.y.toFixed(2)}`
        });
        
        if (this.ship.customLines && this.ship.customLines.length > 0) {
          console.log("First line:", this.ship.customLines[0]);
        }
      } else {
        console.log("No ship created yet");
      }
    };
    
    // Create menu controller
    const menu = new GameMenu(window.game);
    
    // Check URL parameters for demo mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    // Auto-start game in demo mode if requested
    if (mode === 'demo') {
      menu.hideAllScreens();
      window.game.init(true); // true = demo mode
      
      // Debug ship after a delay
      setTimeout(() => {
        window.game.debugShip();
      }, 1000);
    } else {
      // Add debug for regular game start
      const startGameButton = document.getElementById('startGameButton');
      if (startGameButton) {
        const originalClick = startGameButton.onclick;
        startGameButton.onclick = function(e) {
          if (originalClick) originalClick.call(this, e);
          
          // Debug ship after game starts
          setTimeout(() => {
            window.game.debugShip();
          }, 1000);
        };
      }
    }
    
    // Check URL for passphrase parameter
    const passphrase = urlParams.get('passphrase');
    if (passphrase && typeof loadShipByPassphrase === 'function') {
      // Wait a bit for initialization
      setTimeout(() => {
        const loadPassphraseInput = document.getElementById('load-passphrase');
        const loadButton = document.getElementById('load-button');
        
        if (loadPassphraseInput && loadButton) {
          loadPassphraseInput.value = passphrase;
          loadButton.click();
        } else {
          // Try direct function call
          loadShipByPassphrase(passphrase);
        }
      }, 500);
    }
    
    // Return game instance for potential further use
    return window.game;
  }
  
  /**
   * Main initialization function - will detect what page we're on and init accordingly
   */
  function initialize() {
    console.log("DOM loaded - initializing application");
    
    // Check what page we're on based on elements present
    const isShipCustomizer = document.getElementById('ship-customization-screen') 
      || document.getElementById('drawing-canvas')
      || document.getElementById('load-button');
    
    const gameCanvas = document.getElementById('gameCanvas');
    const startGameButton = document.getElementById('startGameButton');
    const isGamePage = gameCanvas && startGameButton;
    
    console.log("Page detection:", {
      isShipCustomizer,
      isGamePage,
      gameCanvas: !!gameCanvas,
      startGameButton: !!startGameButton
    });
    
    if (isShipCustomizer) {
      console.log("Initializing ship customizer");
      initShipCustomizer();
    } else if (isGamePage) {
      console.log("Initializing game page");
      initGame();
    } else {
      console.log("Unknown page - basic initialization, but creating game instance anyway");
      debugSavedShipSettings();
      
      // Create game instance as fallback to ensure it's always available
      if (!window.game) {
        console.log("Creating fallback game instance");
        window.game = new Game();
        const menu = new GameMenu(window.game);
      }
    }
  }
  
  // Start the application when DOM is ready
  document.addEventListener('DOMContentLoaded', initialize);
  
  // Make functions available globally
  window.loadShipByPassphrase = loadShipByPassphrase;
  window.loadShipFromServer = loadShipFromServer;
  window.saveShipToServer = saveShipToServer;
  window.getHighScoresFromServer = getHighScoresFromServer;
  window.saveHighScoreToServer = saveHighScoreToServer;
  window.saveShipToLocalStorage = saveShipToLocalStorage;
  window.debugSavedShipSettings = debugSavedShipSettings;