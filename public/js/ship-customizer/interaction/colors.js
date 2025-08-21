/**
 * /public/js/ship-customizer/interaction/colors.js
 * Handles color selection and management
 */

import { shipSettings } from '../core/settings.js';
import { updateShipPreview } from '../drawing/preview.js';

let customColorPicker;
let colorOptions;
let colorPreview;

/**
 * Initialize color picker and selection
 */
export function initColorPicker() {
  customColorPicker = document.getElementById('custom-color-picker');
  colorOptions = document.querySelectorAll('.color-option');
  
  if (!customColorPicker || !colorOptions) {
    console.error('Color picker elements not found');
    return;
  }
  
  // Initialize color preview element
  createColorPreview();
  
  // Update preview when color changes
  customColorPicker.addEventListener('input', handleCustomColorChange);
  
  // Setup color option selection
  colorOptions.forEach(option => {
    // Skip custom color option click handling as it has its own handler
    if (option.getAttribute('data-color') === 'custom') {
      option.addEventListener('click', () => customColorPicker.click());
    } else {
      option.addEventListener('click', handleColorOptionClick);
    }
  });
}

/**
 * Create the color preview element
 */
function createColorPreview() {
  // If preview already exists, don't create it again
  if (document.querySelector('.color-preview')) return;
  
  colorPreview = document.createElement('div');
  colorPreview.className = 'color-preview';
  colorPreview.style.backgroundColor = customColorPicker.value;
  
  // Append to custom color option container
  const customColorContainer = customColorPicker.parentElement;
  if (customColorContainer) {
    customColorContainer.appendChild(colorPreview);
  }
}

/**
 * Handle custom color picker change
 * @param {Event} event - The input event
 */
function handleCustomColorChange(event) {
  const newColor = event.target.value;
  
  // Update preview element
  updateColorPreview(newColor);
  
  // Remove selection from other colors
  colorOptions.forEach(option => option.classList.remove('selected'));
  
  // Select the custom option
  event.target.parentElement.classList.add('selected');
  
  // Update ship color with the hex value
  shipSettings.color = newColor;
  
  console.log("Selected custom color:", newColor);
  
  // Update ship preview
  updateShipPreview();
}

/**
 * Handle color option click
 * @param {Event} event - The click event
 */
function handleColorOptionClick(event) {
  // Remove selected class from all options
  colorOptions.forEach(opt => opt.classList.remove('selected'));
  
  // Add selected class to clicked option
  event.currentTarget.classList.add('selected');
  
  // Update current color
  const newColor = event.currentTarget.getAttribute('data-color');
  shipSettings.color = newColor;
  
  console.log("Selected color:", newColor);
  
  // Update preview
  updateShipPreview();
}

/**
 * Update the color preview element
 * @param {string} color - The color to display
 */
export function updateColorPreview(color) {
  if (colorPreview) {
    colorPreview.style.backgroundColor = color;
  }
}

/**
 * Get the current selected color
 * @returns {string} The currently selected color
 */
export function getCurrentColor() {
  return shipSettings.color;
}