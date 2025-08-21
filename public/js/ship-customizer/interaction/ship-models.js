/**
 * /public/js/ship-customizer/interaction/ship-models.js
 * Handles ship model selection and management
 */

import { 
    shipSettings, 
    updateStatusForMode, 
    isDrawingLine,
    setIsDrawingLine,
    setCurrentLineStart 
  } from '../core/settings.js';
  import { redrawCanvas } from '../drawing/canvas.js';
  import { updateShipPreview } from '../drawing/preview.js';
  
  /**
   * Initialize ship model selection functionality
   */
  export function initShipModels() {
    const shipModels = document.querySelectorAll('.ship-model');
    
    if (!shipModels || shipModels.length === 0) {
      console.error('Ship model elements not found');
      return;
    }
    
    // Remove any existing click handlers to prevent duplicates
    shipModels.forEach(model => {
      // Clone and replace to remove existing event listeners
      const newModel = model.cloneNode(true);
      model.parentNode.replaceChild(newModel, model);
      
      // Add new event listener
      newModel.addEventListener('click', handleShipModelClick);
    });
    
    // Set initial selection based on current settings
    updateShipModelSelection();
  }
  
  /**
   * Handle ship model selection click
   * @param {Event} event - The click event
   */
  function handleShipModelClick(event) {
    const shipModels = document.querySelectorAll('.ship-model');
    
    // First remove selected class from all models
    shipModels.forEach(m => m.classList.remove('selected'));
    
    // Add selected class to clicked model
    event.currentTarget.classList.add('selected');
    
    // Get the ship type from data attribute
    const selectedType = event.currentTarget.getAttribute('data-type');
    console.log("Selected ship type:", selectedType);
    
    // Update ship settings
    shipSettings.type = selectedType;
    
    // If selecting a built-in model, clear any in-progress line
    if (selectedType !== 'custom' && isDrawingLine) {
      // Use the setter functions from settings.js
      setIsDrawingLine(false);
      setCurrentLineStart(null);
      
      // Update status message
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = `Selected ${selectedType.toUpperCase()} ship - continue adding custom details`;
        
        // Reset after a few seconds
        setTimeout(() => {
          updateStatusForMode('design');
        }, 2000);
      }
    }
    
    // Immediately update the preview
    updateShipPreview();
    redrawCanvas();
  }
  
  /**
   * Update ship model selection UI based on current settings
   */
  export function updateShipModelSelection() {
    const shipModels = document.querySelectorAll('.ship-model');
    
    shipModels.forEach(model => {
      model.classList.remove('selected');
      
      const modelType = model.getAttribute('data-type');
      if (modelType === shipSettings.type) {
        model.classList.add('selected');
      }
    });
  }
  
  /**
   * Get the current ship model type
   * @returns {string} The current ship model type
   */
  export function getCurrentShipModel() {
    return shipSettings.type;
  }