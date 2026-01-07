// public/js/core/menu.js
class GameMenu {
    constructor(game) {
        this.game = game;

        // Menu screens
        this.mainMenuScreen = document.getElementById('mainMenuScreen');
        this.shipCustomizationScreen = document.getElementById('shipCustomizationScreen');
        //this.gameOverScreen = document.getElementById('gameOverScreen');
        this.highScoresScreen = document.getElementById('highScoresScreen');
        this.gameOverHighScoreScreen = document.getElementById('gameOverHighScoreScreen');
        this.shipGalleryScreen = document.getElementById('shipGalleryScreen');

        // Buttons
        this.startGameButton = document.getElementById('startGameButton');
        this.multiplayerButton = document.getElementById('multiplayerButton');
        this.shipOptionsButton = document.getElementById('shipOptionsButton');
        this.browseShipsButton = document.getElementById('browseShipsButton');
        this.highScoresButton = document.getElementById('highScoresButton');
        this.backFromHighScoresButton = document.getElementById('backFromHighScoresButton');
        this.restartButton = document.getElementById('restartButton');
        this.returnToMenuButton = document.getElementById('returnToMenuButton');
        this.submitScoreButton = document.getElementById('submitScoreButton');
        this.playAgainButton = document.getElementById('playAgainButton');

        // Gallery elements
        this.galleryPrevButton = document.getElementById('galleryPrevButton');
        this.galleryNextButton = document.getElementById('galleryNextButton');
        this.galleryUseShipButton = document.getElementById('galleryUseShipButton');
        this.galleryCustomizeButton = document.getElementById('galleryCustomizeButton');
        this.backFromGalleryButton = document.getElementById('backFromGalleryButton');
        this.galleryShipCanvas = document.getElementById('galleryShipCanvas');

        // Gallery state
        this.galleryShips = [];
        this.galleryCurrentIndex = 0;

        // Elements
        this.highScoresList = document.getElementById('highScoresList');
        this.highScoreNameInput = document.getElementById('highScoreNameInput');
        this.finalGameScore = document.getElementById('finalGameScore');

        this.initEventListeners();
        this.showMainMenu();
    }
    
    initEventListeners() {
        // Main menu buttons
        if (this.startGameButton) {
            this.startGameButton.addEventListener('click', () => {
                this.hideAllScreens();
                this.game.init();
            });
        }
        
        if (this.multiplayerButton) {
            this.multiplayerButton.addEventListener('click', () => {
                console.log('Multiplayer button clicked - checking multiplayer UI...');
                if (window.multiplayerUI) {
                    console.log('Showing multiplayer screen...');
                    window.multiplayerUI.showMultiplayerScreen();
                } else {
                    console.error('Multiplayer UI not available!');
                    alert('Multiplayer feature is not available. Please refresh the page and try again.');
                }
            });
        }
        
        if (this.shipOptionsButton) {
            this.shipOptionsButton.addEventListener('click', () => {
                // Redirect to the ship customization page
                window.location.href = 'ship-customization.html';
            });
        }
        
        if (this.highScoresButton) {
            this.highScoresButton.addEventListener('click', () => {
                this.showHighScores();
            });
        }

        // Browse ships button
        if (this.browseShipsButton) {
            this.browseShipsButton.addEventListener('click', () => {
                this.showShipGallery();
            });
        }

        // Gallery navigation buttons
        if (this.galleryPrevButton) {
            this.galleryPrevButton.addEventListener('click', () => {
                this.navigateGallery(-1);
            });
        }

        if (this.galleryNextButton) {
            this.galleryNextButton.addEventListener('click', () => {
                this.navigateGallery(1);
            });
        }

        // Gallery action buttons
        if (this.galleryUseShipButton) {
            this.galleryUseShipButton.addEventListener('click', () => {
                this.useGalleryShip();
            });
        }

        if (this.galleryCustomizeButton) {
            this.galleryCustomizeButton.addEventListener('click', () => {
                this.customizeGalleryShip();
            });
        }

        if (this.backFromGalleryButton) {
            this.backFromGalleryButton.addEventListener('click', () => {
                this.showMainMenu();
            });
        }

        // Keyboard navigation for gallery
        document.addEventListener('keydown', (e) => {
            if (this.shipGalleryScreen && this.shipGalleryScreen.style.display === 'flex') {
                if (e.key === 'ArrowLeft') {
                    this.navigateGallery(-1);
                } else if (e.key === 'ArrowRight') {
                    this.navigateGallery(1);
                } else if (e.key === 'Escape') {
                    this.showMainMenu();
                } else if (e.key === 'Enter') {
                    this.useGalleryShip();
                }
            }
        });

        // Back button from high scores
        if (this.backFromHighScoresButton) {
            this.backFromHighScoresButton.addEventListener('click', () => {
                this.showMainMenu();
            });
        }
        
        // Game over screen
        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => {
                this.hideAllScreens();
                this.game.init();
            });
        }
        
        // High score submission screen
        if (this.submitScoreButton) {
            this.submitScoreButton.addEventListener('click', () => {
                this.submitHighScore();
            });
        }
        
        if (this.playAgainButton) {
            this.playAgainButton.addEventListener('click', () => {
                this.hideAllScreens();
                this.game.init();
            });
        }
        
        if (this.returnToMenuButton) {
            this.returnToMenuButton.addEventListener('click', () => {
                this.showMainMenu();
            });
        }
        
        // Add demo mode button to ship customization
        this.addDemoModeButton();
    }
    
    addDemoModeButton() {
        // Add a button to test the ship in demo mode
        const shipScreen = document.getElementById('shipCustomizationScreen');
        const saveButton = document.getElementById('saveShipButton');
        
        if (shipScreen && saveButton) {
            const testButton = document.createElement('button');
            testButton.id = 'testShipButton';
            testButton.className = 'menu-button';
            testButton.textContent = 'TEST FLIGHT';
            testButton.style.backgroundColor = '#5555aa';
            testButton.style.marginLeft = '10px';
            
            // Insert before save button if possible
            if (saveButton.parentNode) {
                saveButton.parentNode.insertBefore(testButton, saveButton.nextSibling);
                
                // Add event listener
                testButton.addEventListener('click', () => {
                    // Save the current ship design to localStorage first
                    const saveEvent = new Event('click');
                    saveButton.dispatchEvent(saveEvent);
                    
                    // Redirect to game in demo mode
                    window.location.href = 'index.html?mode=demo';
                });
            }
        }
    }
    
    hideAllScreens() {
        // Hide all menu screens
        if (this.mainMenuScreen) this.mainMenuScreen.style.display = 'none';
        if (this.shipCustomizationScreen) this.shipCustomizationScreen.style.display = 'none';
        //if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
        if (this.highScoresScreen) this.highScoresScreen.style.display = 'none';
        if (this.gameOverHighScoreScreen) this.gameOverHighScoreScreen.style.display = 'none';
        if (this.shipGalleryScreen) this.shipGalleryScreen.style.display = 'none';

        // Hide multiplayer screen if it exists
        const multiplayerScreen = document.getElementById('multiplayerScreen');
        if (multiplayerScreen) multiplayerScreen.style.display = 'none';

        // Show the game canvas when hiding menu screens (game is starting)
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) gameCanvas.style.display = 'block';
    }
    
    showMainMenu() {
        this.hideAllScreens();
        
        // Hide the game canvas when showing menus
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) gameCanvas.style.display = 'none';
        
        if (this.mainMenuScreen) {
            this.mainMenuScreen.style.display = 'flex';
        }
    }
    
    async showHighScores() {
        // Hide all other screens
        this.hideAllScreens();
        
        // Hide the game canvas when showing menus
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) gameCanvas.style.display = 'none';
        
        // Show the high scores screen
        if (this.highScoresScreen) {
            this.highScoresScreen.style.display = 'flex';
        }
        
        // Get the container for scores
        const highScoresList = document.getElementById('highScoresList');
        if (!highScoresList) return;
        
        // Show loading message
        highScoresList.innerHTML = '<div class="high-score-item loading">Loading scores...</div>';
        
        try {
            // Fetch high scores from server
            const response = await fetch('/api/high-scores');
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const scores = await response.json();
            
            // Clear the list
            highScoresList.innerHTML = '';
            
            // Check if we have scores
            if (!scores || scores.length === 0) {
                highScoresList.innerHTML = '<div class="empty-scores">No high scores yet. Be the first!</div>';
                return;
            }
            
            // Add header row
            const headerRow = document.createElement('div');
            headerRow.className = 'high-score-item header';
            headerRow.innerHTML = `
                <div>Rank</div>
                <div>Pilot</div>
                <div>Score</div>
                <div>Ship</div>
                <div>Date</div>
            `;
            highScoresList.appendChild(headerRow);
            
            // Add each score row
            scores.forEach((score, index) => {
                const row = document.createElement('div');
                row.className = score.shipPassphrase ? 'high-score-item has-ship' : 'high-score-item';
                
                // Format the date
                const date = new Date(score.date);
                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                
                // Create ship preview container
                const shipContainer = document.createElement('div');
                shipContainer.className = 'ship-mini-preview';
                
                // Create ship preview canvas
                const shipCanvas = document.createElement('canvas');
                shipCanvas.width = 60;
                shipCanvas.height = 60;
                shipCanvas.className = 'ship-mini-canvas';
                shipContainer.appendChild(shipCanvas);
                
                // Add row content
                row.innerHTML = `
                    <div>${index + 1}</div>
                    <div>${score.name || 'Anonymous'}</div>
                    <div>${score.score}</div>
                    <div class="ship-preview-cell"></div>
                    <div>${formattedDate}</div>
                `;
                
                // Insert ship preview
                row.querySelector('.ship-preview-cell').appendChild(shipContainer);
                
                // Add to list
                highScoresList.appendChild(row);
                
                // Render the ship preview
                this.renderShipPreview(shipCanvas, score);
                
                // Add click handler if there's a ship passphrase
                if (score.shipPassphrase) {
                    row.addEventListener('click', () => {
                        this.loadShipPassphrase(score.shipPassphrase);
                    });
                    row.title = 'Click to use this ship';
                }
            });
            
        } catch (error) {
            console.error('Failed to load high scores:', error);
            highScoresList.innerHTML = '<div class="error-message">Failed to load high scores</div>';
        }
    }
    
    displayHighScores() {
        if (!this.highScoresList) return;
        
        // Clear current list
        this.highScoresList.innerHTML = '';
        
        // Get high scores from localStorage
        let highScores = localStorage.getItem('asteroids_highScores');
        
        if (highScores) {
            highScores = JSON.parse(highScores);
            
            // Create header
            const header = document.createElement('div');
            header.className = 'high-score-item header';
            header.innerHTML = `
                <div class="rank">Rank</div>
                <div class="player">Pilot</div>
                <div class="score">Score</div>
                <div class="ship-type">Ship</div>
                <div class="date">Date</div>
            `;
            this.highScoresList.appendChild(header);
            
            // Add each high score
            highScores.forEach((score, index) => {
                const scoreElement = document.createElement('div');
                scoreElement.className = 'high-score-item';
                
                // Format date
                const date = new Date(score.date);
                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                
                // Get ship type display name
                let shipType = score.ship ? score.ship.type : 'unknown';
                if (shipType === 'default') shipType = 'Standard';
                else if (shipType) shipType = shipType.charAt(0).toUpperCase() + shipType.slice(1);
                
                scoreElement.innerHTML = `
                    <div class="rank">${index + 1}</div>
                    <div class="player">${score.name || 'Anonymous'}</div>
                    <div class="score">${score.score}</div>
                    <div class="ship-type">${shipType}</div>
                    <div class="date">${formattedDate}</div>
                `;
                
                // Add ship passphrase if available
                if (score.ship && score.ship.passphrase) {
                    scoreElement.setAttribute('data-passphrase', score.ship.passphrase);
                    scoreElement.classList.add('has-ship');
                    scoreElement.title = 'Click to load this ship design';
                    
                    // Add click event to load this ship
                    scoreElement.addEventListener('click', () => {
                        this.loadShipDesign(score.ship.passphrase);
                    });
                }
                
                this.highScoresList.appendChild(scoreElement);
            });
        } else {
            // No high scores yet
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-scores';
            emptyMessage.textContent = 'No high scores yet. Start playing to set some records!';
            this.highScoresList.appendChild(emptyMessage);
        }
    }
    
    async submitHighScore() {
        if (!this.highScoreNameInput) return;
        
        const playerName = this.highScoreNameInput.value.trim() || 'Anonymous';
        const score = parseInt(this.finalGameScore.textContent) || 0;
        
        // Get ship information from the current game
        const shipInfo = this.game.ship ? {
            shipType: this.game.ship.shipType,
            shipColor: this.game.ship.color,
            shipPassphrase: this.game.ship.passphrase || null
        } : null;
        
        try {
            // Create payload for the API
            const payload = {
                name: playerName,
                score: score,
                shipType: shipInfo ? shipInfo.shipType : 'default',
                shipColor: shipInfo ? shipInfo.shipColor : 'white',
                shipPassphrase: shipInfo ? shipInfo.shipPassphrase : null,
                date: new Date().toISOString()
            };
            
            console.log('Submitting high score:', payload);
            
            // Send score to server
            const response = await fetch('/api/high-scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            // Save player name for future use
            localStorage.setItem('playerName', playerName);
            
            // Show the high scores screen
            this.showHighScores();
            
        } catch (error) {
            console.error('Failed to submit high score:', error);
            alert('Failed to save high score. Please try again.');
        }
    }
    
    loadShipDesign(passphrase) {
        if (!passphrase) return;
        
        // Redirect to ship customizer with the passphrase
        window.location.href = `ship-customization.html?passphrase=${encodeURIComponent(passphrase)}`;
    }

    /**
 * Renders a ship preview on a canvas
 * @param {HTMLCanvasElement} canvas - The canvas to draw on
 * @param {Object} scoreData - The score data with ship information
 */
renderShipPreview(canvas, scoreData) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear canvas with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Determine ship properties
    const shipType = scoreData.shipType || 'default';
    const shipColor = scoreData.shipColor || 'white';
    
    // Set drawing style
    ctx.strokeStyle = shipColor;
    ctx.lineWidth = 2;
    
    // Size for the ship (smaller to fit in preview)
    const radius = Math.min(width, height) * 0.3;
    
    // Draw the appropriate ship type
    if (shipType === 'custom' && scoreData.shipPassphrase) {
        // If we have a passphrase, we'll try to load the custom ship
        this.loadCustomShipForPreview(canvas, scoreData.shipPassphrase);
    } else if (shipType === 'triangle') {
        // Draw triangle ship
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX - radius * 0.8, centerY + radius * 0.8);
        ctx.lineTo(centerX + radius * 0.8, centerY + radius * 0.8);
        ctx.closePath();
        ctx.stroke();
    } else if (shipType === 'diamond') {
        // Draw diamond ship
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX + radius, centerY);
        ctx.lineTo(centerX, centerY + radius);
        ctx.lineTo(centerX - radius, centerY);
        ctx.closePath();
        ctx.stroke();
    } else {
        // Draw default ship
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX - radius * 0.7, centerY + radius * 0.7);
        ctx.lineTo(centerX, centerY + radius * 0.4);
        ctx.lineTo(centerX + radius * 0.7, centerY + radius * 0.7);
        ctx.closePath();
        ctx.stroke();
    }
}

/**
 * Loads custom ship data and renders it on the preview canvas
 * @param {HTMLCanvasElement} canvas - The canvas to draw on
 * @param {string} passphrase - The ship's passphrase
 */
async loadCustomShipForPreview(canvas, passphrase) {
    try {
        // Fetch the ship data from server
        const response = await fetch(`/api/ships/passphrase/${encodeURIComponent(passphrase)}`);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const shipData = await response.json();
        
        // Draw the custom ship lines
        if (shipData.customLines && shipData.customLines.length > 0) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Scale factor for the preview (original designs are for 400x400)
            const scale = Math.min(width, height) / 400;
            
            // Draw each line
            shipData.customLines.forEach(line => {
                ctx.strokeStyle = line.color || shipData.color || 'white';
                ctx.lineWidth = 1.5;
                
                ctx.beginPath();
                ctx.moveTo(centerX + line.startX * scale, centerY + line.startY * scale);
                ctx.lineTo(centerX + line.endX * scale, centerY + line.endY * scale);
                ctx.stroke();
                
                // Draw tiny dots at endpoints
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.arc(centerX + line.startX * scale, centerY + line.startY * scale, 1, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(centerX + line.endX * scale, centerY + line.endY * scale, 1, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    } catch (error) {
        console.error('Failed to load custom ship:', error);
        // Fall back to rendering a default ship
        this.renderShipPreview(canvas, { shipType: 'default', shipColor: 'white' });
    }
}

/**
 * Handles clicking on a ship in the high scores list
 * @param {string} passphrase - The ship's passphrase
 */
loadShipPassphrase(passphrase) {
    // Store the passphrase for later
    localStorage.setItem('selected_ship_passphrase', passphrase);

    // Navigate to ship customizer
    window.location.href = 'ship-customization.html?passphrase=' + encodeURIComponent(passphrase);
}

/**
 * Shows the ship gallery screen
 */
async showShipGallery() {
    this.hideAllScreens();

    // Hide the game canvas when showing menus
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) gameCanvas.style.display = 'none';

    // Show the gallery screen
    if (this.shipGalleryScreen) {
        this.shipGalleryScreen.style.display = 'flex';
    }

    // Show loading state
    const shipName = document.getElementById('galleryShipName');
    if (shipName) shipName.textContent = 'Loading ships...';

    // Fetch public ships from the server
    try {
        const response = await fetch('/api/ships/public');
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        this.galleryShips = await response.json();
        this.galleryCurrentIndex = 0;

        // Update total count
        const totalShips = document.getElementById('galleryTotalShips');
        if (totalShips) totalShips.textContent = this.galleryShips.length;

        if (this.galleryShips.length === 0) {
            if (shipName) shipName.textContent = 'No ships found';
            this.updateGalleryButtons();
            return;
        }

        // Render the first ship
        this.renderCurrentGalleryShip();
        this.updateGalleryButtons();

    } catch (error) {
        console.error('Failed to load ships:', error);
        if (shipName) shipName.textContent = 'Failed to load ships';
    }
}

/**
 * Navigate through the gallery
 * @param {number} direction - -1 for previous, 1 for next
 */
navigateGallery(direction) {
    if (this.galleryShips.length === 0) return;

    this.galleryCurrentIndex += direction;

    // Wrap around
    if (this.galleryCurrentIndex < 0) {
        this.galleryCurrentIndex = this.galleryShips.length - 1;
    } else if (this.galleryCurrentIndex >= this.galleryShips.length) {
        this.galleryCurrentIndex = 0;
    }

    this.renderCurrentGalleryShip();
    this.updateGalleryButtons();
}

/**
 * Update gallery navigation button states
 */
updateGalleryButtons() {
    const hasShips = this.galleryShips.length > 0;

    if (this.galleryPrevButton) {
        this.galleryPrevButton.disabled = !hasShips;
        this.galleryPrevButton.style.opacity = hasShips ? '1' : '0.5';
    }

    if (this.galleryNextButton) {
        this.galleryNextButton.disabled = !hasShips;
        this.galleryNextButton.style.opacity = hasShips ? '1' : '0.5';
    }

    if (this.galleryUseShipButton) {
        this.galleryUseShipButton.disabled = !hasShips;
        this.galleryUseShipButton.style.opacity = hasShips ? '1' : '0.5';
    }

    if (this.galleryCustomizeButton) {
        this.galleryCustomizeButton.disabled = !hasShips;
        this.galleryCustomizeButton.style.opacity = hasShips ? '1' : '0.5';
    }
}

/**
 * Render the current ship in the gallery
 */
renderCurrentGalleryShip() {
    if (this.galleryShips.length === 0) return;

    const ship = this.galleryShips[this.galleryCurrentIndex];

    // Update info display
    const shipName = document.getElementById('galleryShipName');
    const shipLines = document.getElementById('galleryShipLines');
    const shipColor = document.getElementById('galleryShipColor');
    const shipThrusters = document.getElementById('galleryShipThrusters');
    const shipWeapons = document.getElementById('galleryShipWeapons');
    const shipPassphrase = document.getElementById('galleryShipPassphrase');
    const currentIndex = document.getElementById('galleryCurrentIndex');

    if (shipName) shipName.textContent = ship.name || 'Unnamed Ship';
    if (shipLines) shipLines.textContent = Array.isArray(ship.customLines) ? ship.customLines.length : 0;
    if (shipColor) shipColor.textContent = ship.color || 'white';
    if (shipThrusters) shipThrusters.textContent = Array.isArray(ship.thrusterPoints) ? ship.thrusterPoints.length : 0;
    if (shipWeapons) shipWeapons.textContent = Array.isArray(ship.weaponPoints) ? ship.weaponPoints.length : 0;
    if (shipPassphrase) shipPassphrase.textContent = ship.passphrase || '-';
    if (currentIndex) currentIndex.textContent = this.galleryCurrentIndex + 1;

    // Render the ship on canvas
    this.renderGalleryShipCanvas(ship);
}

/**
 * Render a ship on the gallery canvas
 * @param {Object} ship - The ship data to render
 */
renderGalleryShipCanvas(ship) {
    const canvas = this.galleryShipCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Draw center crosshair
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY);
    ctx.lineTo(centerX + 15, centerY);
    ctx.moveTo(centerX, centerY - 15);
    ctx.lineTo(centerX, centerY + 15);
    ctx.stroke();

    // Scale factor (original designs are for 400x400)
    const scale = Math.min(width, height) / 400 * 0.8;

    // Draw custom lines
    if (ship.customLines && Array.isArray(ship.customLines) && ship.customLines.length > 0) {
        ship.customLines.forEach(line => {
            ctx.strokeStyle = line.color || ship.color || 'white';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(centerX + line.startX * scale, centerY + line.startY * scale);
            ctx.lineTo(centerX + line.endX * scale, centerY + line.endY * scale);
            ctx.stroke();
        });
    } else {
        // Draw default ship shape if no custom lines
        const radius = 40 * scale;
        ctx.strokeStyle = ship.color || 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX - radius * 0.7, centerY + radius * 0.7);
        ctx.lineTo(centerX, centerY + radius * 0.4);
        ctx.lineTo(centerX + radius * 0.7, centerY + radius * 0.7);
        ctx.closePath();
        ctx.stroke();
    }

    // Draw thruster points
    if (ship.thrusterPoints && Array.isArray(ship.thrusterPoints)) {
        ctx.fillStyle = 'orange';
        ship.thrusterPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(centerX + point.x * scale, centerY + point.y * scale, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw weapon points
    if (ship.weaponPoints && Array.isArray(ship.weaponPoints)) {
        ctx.fillStyle = 'cyan';
        ship.weaponPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(centerX + point.x * scale, centerY + point.y * scale, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

/**
 * Use the currently selected ship - loads it and returns to main menu
 */
useGalleryShip() {
    if (this.galleryShips.length === 0) return;

    const ship = this.galleryShips[this.galleryCurrentIndex];

    // Save to asteroids_playerSettings (the format ship.js expects)
    const playerSettings = {
        shipType: 'custom',
        shipColor: ship.color || 'white',
        customLines: ship.customLines || [],
        thrusterPoints: ship.thrusterPoints || [],
        weaponPoints: ship.weaponPoints || [],
        shipName: ship.name || 'Custom Ship',
        passphrase: ship.passphrase
    };

    localStorage.setItem('asteroids_playerSettings', JSON.stringify(playerSettings));
    localStorage.setItem('selected_ship_passphrase', ship.passphrase);

    console.log('Ship loaded:', ship.name, '- returning to main menu');

    // Return to main menu so user can choose game mode
    this.showMainMenu();
}

/**
 * Open the ship customizer with the current ship
 */
customizeGalleryShip() {
    if (this.galleryShips.length === 0) return;

    const ship = this.galleryShips[this.galleryCurrentIndex];

    // Navigate to ship customizer with passphrase
    window.location.href = 'ship-customization.html?passphrase=' + encodeURIComponent(ship.passphrase);
}
}