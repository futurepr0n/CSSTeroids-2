// Helper functions for ship-related operations
// utils/helpers.js
// Dictionary of words for generating passphrases
const ADJECTIVES = [
  'red', 'blue', 'green', 'brave', 'swift', 'mighty', 'cosmic', 'distant', 'fierce',
  'ancient', 'digital', 'stellar', 'solar', 'lunar', 'orbital', 'quantum', 'blazing',
  'radiant', 'shining', 'daring', 'silent', 'hidden', 'secret', 'phantom', 'shadow',
  'glowing', 'mystic', 'noble', 'royal', 'elite', 'frozen', 'burning', 'primal'
];

const NOUNS = [
  'star', 'moon', 'sun', 'comet', 'planet', 'galaxy', 'nebula', 'voyager', 'explorer',
  'hawk', 'eagle', 'phoenix', 'dragon', 'titan', 'hunter', 'arrow', 'sword', 'shield',
  'ranger', 'sentinel', 'viper', 'falcon', 'storm', 'thunder', 'lightning', 'whisper',
  'shadow', 'blade', 'fang', 'talon', 'wing', 'orbit', 'pulse', 'nova', 'horizon'
];

const VERBS = [
  'flying', 'racing', 'exploring', 'jumping', 'soaring', 'diving', 'orbiting', 'gliding',
  'hunting', 'seeking', 'chasing', 'wandering', 'traveling', 'roaming', 'cruising',
  'drifting', 'sailing', 'blasting', 'rushing', 'warping', 'speeding', 'hovering',
  'launching', 'protecting', 'defending', 'attacking', 'evading', 'escaping', 'landing'
];

/**
 * Generate a random 3-word passphrase
 * @returns {string} A three-word passphrase in the format "adjective-noun-verb"
 */
function generatePassphrase() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
  
  return `${adjective}-${noun}-${verb}`;
}

/**
 * Validate ship data for required fields and formats
 * @param {Object} shipData - The ship data to validate
 * @returns {Object} Object with valid flag and error message if invalid
 */
function validateShipData(shipData) {
  // Check if ship name is provided
  if (!shipData.name || shipData.name.trim() === '') {
    return { valid: false, message: 'Ship name is required' };
  }
  
  // Check if ship type is valid
  const validTypes = ['custom', 'default', 'triangle', 'diamond'];
  if (!validTypes.includes(shipData.type)) {
    return { valid: false, message: 'Invalid ship type' };
  }
  
  // If type is custom, ensure there are customLines
  if (shipData.type === 'custom' && (!shipData.customLines || shipData.customLines.length === 0)) {
    return { valid: false, message: 'Custom ship must have at least one line' };
  }
  
  // Check thruster points limit
  if (shipData.thrusterPoints && shipData.thrusterPoints.length > 3) {
    return { valid: false, message: 'Maximum 3 thruster points allowed' };
  }
  
  // Check weapon points limit
  if (shipData.weaponPoints && shipData.weaponPoints.length > 2) {
    return { valid: false, message: 'Maximum 2 weapon points allowed' };
  }
  
  return { valid: true };
}

module.exports = {
  generatePassphrase,
  validateShipData
};