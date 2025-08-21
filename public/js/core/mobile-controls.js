/**
 * mobile-controls.js
 * Touch controls for Asteroids game, modeled after controls.js
 */

window.MobileControls = (function() {
    // Private variables
    let touchActive = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTapTime = 0;
    let rotationDirection = 0;
    let game = null;
    
    // Control buttons
    let leftButton, rightButton;
    
    // Button dimensions
    let buttonSize = 80; // Default size, will be adjusted for screen size
    
    // Handle touch start on canvas
    function handleCanvasTouchStart(e) {
        // Only handle if the game is active and not over
        if (!game || game.gameOver) return;
        
        // Skip if the touch is on rotation buttons
        const touch = e.touches[0];
        if (isPointInElement(touch.clientX, touch.clientY, leftButton) ||
            isPointInElement(touch.clientX, touch.clientY, rightButton)) {
            return;
        }
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        
        // Double tap detection for shooting
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected - simulate space key for shooting
            game.keys[' '] = true;
            setTimeout(() => {
                game.keys[' '] = false;
            }, 100);
        }
        lastTapTime = currentTime;
        
        // Single tap - activate thrust
        game.keys['ArrowUp'] = true;
        
        touchActive = true;
        window.touchActive = true;
    }
    
    // Handle touch end on canvas
    function handleCanvasTouchEnd(e) {
        // Only handle if no other touches remain on the canvas
        if (e.touches.length === 0) {
            // Deactivate thrust
            if (game) game.keys['ArrowUp'] = false;
            
            // Update touch state if rotations aren't active
            if (rotationDirection === 0) {
                touchActive = false;
                window.touchActive = false;
            }
        }
    }
    
    // Calculate appropriate button size based on screen dimensions
    function calculateButtonSize(screenWidth, screenHeight) {
        // Base button size on the smaller dimension
        const smallerDimension = Math.min(screenWidth, screenHeight);
        // Make buttons 12% of screen width, with min/max limits
        return Math.max(60, Math.min(100, smallerDimension * 0.12));
    }
    
    // Update button positions based on screen size
    function updateButtonPositions(screenWidth, screenHeight) {
        if (!leftButton || !rightButton) return; // Skip if buttons aren't created yet
        
        // Calculate new button size
        buttonSize = calculateButtonSize(screenWidth, screenHeight);
        
        // Get safe areas for positioning
        const bottomSafeArea = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '0', 10);
        const leftSafeArea = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-left') || '0', 10);
        const rightSafeArea = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-right') || '0', 10);
        
        // Apply size to all buttons
        [leftButton, rightButton].forEach(button => {
            button.style.width = buttonSize + 'px';
            button.style.height = buttonSize + 'px';
            button.style.borderRadius = (buttonSize / 2) + 'px';
        });
        
        // Position left button
        leftButton.style.left = (20 + leftSafeArea) + 'px';
        leftButton.style.bottom = (20 + bottomSafeArea) + 'px';
        
        // Position right button
        rightButton.style.right = (20 + rightSafeArea) + 'px';
        rightButton.style.bottom = (20 + bottomSafeArea) + 'px';
        
        // Scale SVG icons inside buttons
        const svgSize = Math.max(24, buttonSize * 0.5);
        document.querySelectorAll('.control-button svg').forEach(svg => {
            svg.setAttribute('width', svgSize);
            svg.setAttribute('height', svgSize);
        });
    }
    
    // Create a control button
    function createButton(id, svgContent) {
        // Remove any existing button with the same ID
        const existingButton = document.getElementById(id);
        if (existingButton) existingButton.remove();
        
        const button = document.createElement('div');
        button.id = id;
        button.className = 'control-button';
        button.innerHTML = svgContent;
        document.body.appendChild(button);
        
        // Apply basic styles
        button.style.position = 'absolute';
        button.style.width = buttonSize + 'px';
        button.style.height = buttonSize + 'px';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        button.style.borderRadius = (buttonSize / 2) + 'px';
        button.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.zIndex = '100';
        button.style.pointerEvents = 'auto';
        
        return button;
    }
    
    // Set up touch controls
    function setupTouchControls() {
        if (!game || !game.canvas) return;
        
        // Canvas touch events for thrust and shooting
        game.canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
        game.canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });
        
        // Create left rotation button with arrow SVG
        leftButton = createButton('leftRotationButton', 
            '<svg width="36" height="36" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="white" stroke-width="2" fill="none" /></svg>');
        
        // Create right rotation button with arrow SVG
        rightButton = createButton('rightRotationButton',
            '<svg width="36" height="36" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="white" stroke-width="2" fill="none" /></svg>');
        
        // Initial positioning
        updateButtonPositions(window.innerWidth, window.innerHeight);
        
        // Add touch events for counter-clockwise rotation (left button)
        leftButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            leftButton.style.backgroundColor = 'rgba(0, 255, 255, 0.4)';
            
            // Simulate left arrow key press
            if (game) game.keys['ArrowLeft'] = true;
            rotationDirection = -1;
            
            touchActive = true;
            window.touchActive = true;
        }, { passive: false });
        
        leftButton.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            leftButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            
            // Release left arrow key
            if (game) game.keys['ArrowLeft'] = false;
            rotationDirection = 0;
            
            // Update touch state if thrust isn't active
            if (!game || !game.keys['ArrowUp']) {
                touchActive = false;
                window.touchActive = false;
            }
        }, { passive: false });
        
        // Add touch events for clockwise rotation (right button)
        rightButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            rightButton.style.backgroundColor = 'rgba(0, 255, 255, 0.4)';
            
            // Simulate right arrow key press
            if (game) game.keys['ArrowRight'] = true;
            rotationDirection = 1;
            
            touchActive = true;
            window.touchActive = true;
        }, { passive: false });
        
        rightButton.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            rightButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            
            // Release right arrow key
            if (game) game.keys['ArrowRight'] = false;
            rotationDirection = 0;
            
            // Update touch state if thrust isn't active
            if (!game || !game.keys['ArrowUp']) {
                touchActive = false;
                window.touchActive = false;
            }
        }, { passive: false });
        
        // Prevent default behavior on button touchmove
        [leftButton, rightButton].forEach(button => {
            button.addEventListener('touchmove', function(e) {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
        });
    }
    
    // Setup CSS variables for safe areas on iOS
    function setupSafeAreas() {
        // Set CSS variables for safe areas
        if (window.CSS && CSS.supports('padding: env(safe-area-inset-bottom)')) {
            document.documentElement.style.setProperty(
                '--safe-area-top', 'env(safe-area-inset-top)');
            document.documentElement.style.setProperty(
                '--safe-area-bottom', 'env(safe-area-inset-bottom)');
            document.documentElement.style.setProperty(
                '--safe-area-left', 'env(safe-area-inset-left)');
            document.documentElement.style.setProperty(
                '--safe-area-right', 'env(safe-area-inset-right)');
        } else {
            document.documentElement.style.setProperty('--safe-area-top', '0px');
            document.documentElement.style.setProperty('--safe-area-bottom', '0px');
            document.documentElement.style.setProperty('--safe-area-left', '0px');
            document.documentElement.style.setProperty('--safe-area-right', '0px');
        }
    }
    
    // Helper function to check if a point is inside an element
    function isPointInElement(x, y, element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            x >= rect.left && 
            x <= rect.right && 
            y >= rect.top && 
            y <= rect.bottom
        );
    }
    
    // Clean up function to remove event listeners and elements
    function cleanup() {
        if (game && game.canvas) {
            game.canvas.removeEventListener('touchstart', handleCanvasTouchStart);
            game.canvas.removeEventListener('touchend', handleCanvasTouchEnd);
        }
        
        // Remove buttons if they exist
        if (leftButton && leftButton.parentNode) {
            leftButton.parentNode.removeChild(leftButton);
        }
        if (rightButton && rightButton.parentNode) {
            rightButton.parentNode.removeChild(rightButton);
        }
        
        // Remove window resize listener
        window.removeEventListener('resize', handleResize);
        
        // Reset key states in game if it exists
        if (game && game.keys) {
            game.keys['ArrowLeft'] = false;
            game.keys['ArrowRight'] = false;
            game.keys['ArrowUp'] = false;
            game.keys[' '] = false;
        }
        
        // Reset state variables
        touchActive = false;
        window.touchActive = false;
        rotationDirection = 0;
    }
    
    // Handle window resize
    function handleResize() {
        updateButtonPositions(window.innerWidth, window.innerHeight);
    }
    
    // Public methods
    return {
        // Initialize mobile controls
        init: function(gameInstance) {
            // Store game instance
            game = gameInstance;
            
            // Safety check - don't initialize if not a touch device
            if (!('ontouchstart' in window) && 
                !navigator.maxTouchPoints &&
                !navigator.msMaxTouchPoints) {
                console.log('Mobile controls not initialized - not a touch device');
                return false;
            }
            
            console.log('Initializing mobile controls');
            
            // Setup safe areas first
            setupSafeAreas();
            
            // Setup touch controls
            setupTouchControls();
            
            // Add window resize listener
            window.addEventListener('resize', handleResize);
            
            return true;
        },
        
        // Check if touch controls are active
        isActive: function() {
            return touchActive;
        },
        
        // Clean up controls when no longer needed
        cleanup: cleanup,
        
        // Get rotation direction (-1 for left, 0 for none, 1 for right)
        getRotationDirection: function() {
            return rotationDirection;
        },
        
        // Update button positions manually
        updateButtonPositions: updateButtonPositions
    };
})();

// For backward compatibility with previous implementation
window.initTouchControls = function(game) {
    if (!MobileControls.init(game)) {
        return null;
    }
    
    return {
        isActive: MobileControls.isActive,
        cleanup: MobileControls.cleanup
    };
};

// This function is no longer needed with the new implementation
window.updateTouchControls = function() {};