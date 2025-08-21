/**
 * /public/js/ship-customizer/main.js
 * Main entry point for the Ship Customizer application
 */

import { initializeApp } from './core/init.js';

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('Ship Customizer: Initializing application...');
  initializeApp();
});