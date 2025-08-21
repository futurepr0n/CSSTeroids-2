// routes/ships.js
const express = require('express');
const router = express.Router();
const { Ship } = require('../models');
const { generatePassphrase, validateShipData } = require('../utils/helpers');

// Helper function to safely stringify JSON
function safeStringify(obj) {
  try {
    // If it's null or undefined, return empty array string
    if (obj === null || obj === undefined) {
      return '[]';
    }
    
    // If it's already a string, check if it's valid JSON
    if (typeof obj === 'string') {
      try {
        // Try to parse it to verify it's valid JSON
        JSON.parse(obj);
        // If no error, it's valid JSON, so return the string as-is
        return obj;
      } catch (e) {
        // Not valid JSON, return empty array
        console.error('Input string is not valid JSON:', e);
        return '[]';
      }
    }
    
    // For arrays and objects, stringify them
    return JSON.stringify(obj);
  } catch (error) {
    console.error('Error stringifying object:', error);
    return '[]';
  }
}

// Helper function to safely parse JSON
function safeParse(data) {
  // Handle empty or null data
  if (!data) return [];
  
  try {
    // If it's already an array, return it directly
    if (Array.isArray(data)) {
      return data;
    }
    
    // If it's an object but not an array, and not a string,
    // return an empty array (since we expect arrays for our JSON fields)
    if (typeof data === 'object' && data !== null && typeof data !== 'string') {
      console.log('Data is already an object, but not an array. Converting to array failed.');
      return [];
    }
    
    // If it's a string, parse it
    if (typeof data === 'string') {
      // Try to parse the string as JSON
      return JSON.parse(data);
    }
    
    // Default fallback
    return [];
  } catch (error) {
    console.error('Error parsing JSON string:', error);
    return [];
  }
}
// GET all ships
router.get('/', async (req, res) => {
  try {
    const ships = await Ship.findAll();
    res.json(ships);
  } catch (err) {
    console.error('Error fetching all ships:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET ship by passphrase
router.get('/passphrase/:passphrase', async (req, res) => {
  try {
    const ship = await Ship.findOne({ 
      where: { passphrase: req.params.passphrase },
      raw: true
    });
    
    if (!ship) {
      return res.status(404).json({ message: 'Ship not found with that passphrase' });
    }
    
    // Manually parse the JSON fields using safeParse
    if (ship.customLines) {
      ship.customLines = safeParse(ship.customLines);
    } else {
      ship.customLines = [];
    }
    
    if (ship.thrusterPoints) {
      ship.thrusterPoints = safeParse(ship.thrusterPoints);
    } else {
      ship.thrusterPoints = [];
    }
    
    if (ship.weaponPoints) {
      ship.weaponPoints = safeParse(ship.weaponPoints);
    } else {
      ship.weaponPoints = [];
    }
    
    // Log the retrieved data for debugging
    console.log('Retrieved ship data:', {
      id: ship.id,
      name: ship.name,
      type: ship.type,
      color: ship.color,
      customLinesCount: Array.isArray(ship.customLines) ? ship.customLines.length : 'Not an array',
      thrusterPointsCount: Array.isArray(ship.thrusterPoints) ? ship.thrusterPoints.length : 'Not an array',
      weaponPointsCount: Array.isArray(ship.weaponPoints) ? ship.weaponPoints.length : 'Not an array'
    });
    
    res.json(ship);
  } catch (err) {
    console.error('Error fetching ship by passphrase:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET ship by ID
router.get('/:id', async (req, res) => {
  try {
    const ship = await Ship.findByPk(req.params.id, { raw: true });
    
    if (!ship) {
      return res.status(404).json({ message: 'Ship not found' });
    }
    
    // Manually parse the JSON fields
    if (ship.customLines && typeof ship.customLines === 'string') {
      ship.customLines = safeParse(ship.customLines);
    }
    
    if (ship.thrusterPoints && typeof ship.thrusterPoints === 'string') {
      ship.thrusterPoints = safeParse(ship.thrusterPoints);
    }
    
    if (ship.weaponPoints && typeof ship.weaponPoints === 'string') {
      ship.weaponPoints = safeParse(ship.weaponPoints);
    }
    
    res.json(ship);
  } catch (err) {
    console.error('Error fetching ship by ID:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST create new ship or update existing
// POST create new ship or update existing
router.post('/', async (req, res) => {
  try {
    // Validate the incoming data
    const validationResult = validateShipData(req.body);
    if (!validationResult.valid) {
      return res.status(400).json({ message: validationResult.message });
    }
    
    const shipData = req.body;
    
    console.log('Received ship data:', {
      name: shipData.name,
      type: shipData.type,
      color: shipData.color,
      customLinesCount: shipData.customLines ? 
        (Array.isArray(shipData.customLines) ? shipData.customLines.length : 'Not an array') : 0,
      thrusterPointsCount: shipData.thrusterPoints ? 
        (Array.isArray(shipData.thrusterPoints) ? shipData.thrusterPoints.length : 'Not an array') : 0,
      weaponPointsCount: shipData.weaponPoints ? 
        (Array.isArray(shipData.weaponPoints) ? shipData.weaponPoints.length : 'Not an array') : 0,
      passphrase: shipData.passphrase || 'New ship - will generate passphrase'
    });
    
    // Ensure all array data is properly formatted before proceeding
    const processedShipData = {
      ...shipData,
      customLines: Array.isArray(shipData.customLines) ? shipData.customLines : [],
      thrusterPoints: Array.isArray(shipData.thrusterPoints) ? shipData.thrusterPoints : [],
      weaponPoints: Array.isArray(shipData.weaponPoints) ? shipData.weaponPoints : []
    };
    
    // If passphrase is provided, try to update existing ship
    if (processedShipData.passphrase) {
      const existingShip = await Ship.findOne({ where: { passphrase: processedShipData.passphrase } });
      
      if (existingShip) {
        // Manually stringify JSON data - use safeStringify to handle all cases
        const customLinesJson = safeStringify(processedShipData.customLines);
        const thrusterPointsJson = safeStringify(processedShipData.thrusterPoints);
        const weaponPointsJson = safeStringify(processedShipData.weaponPoints);
        
        console.log('Updating existing ship with custom lines:', 
          processedShipData.customLines.length, 'lines');
        
        // Update existing ship
        await Ship.update({
          name: processedShipData.name,
          type: processedShipData.type,
          color: processedShipData.color,
          customLines: customLinesJson,
          thrusterPoints: thrusterPointsJson,
          weaponPoints: weaponPointsJson
        }, {
          where: { id: existingShip.id }
        });
        
        // Fetch the updated ship
        const updated = await Ship.findByPk(existingShip.id, { raw: true });
        
        // Process for response - convert JSON strings to objects
        const responseShip = {
          ...updated,
          customLines: safeParse(updated.customLines),
          thrusterPoints: safeParse(updated.thrusterPoints),
          weaponPoints: safeParse(updated.weaponPoints)
        };
        
        return res.status(200).json(responseShip);
      }
    }
    
    // If no passphrase or ship not found, create new ship with new passphrase
    // Generate a unique passphrase
    let passphrase = await generatePassphrase();
    let isUnique = false;
    
    // Keep generating passphrases until we find a unique one
    while (!isUnique) {
      const existingShip = await Ship.findOne({ where: { passphrase } });
      if (!existingShip) {
        isUnique = true;
      } else {
        passphrase = await generatePassphrase();
      }
    }
    
    // Manually stringify JSON data
    const customLinesJson = safeStringify(processedShipData.customLines);
    const thrusterPointsJson = safeStringify(processedShipData.thrusterPoints);
    const weaponPointsJson = safeStringify(processedShipData.weaponPoints);
    
    console.log('Creating new ship with passphrase:', passphrase);
    
    // Create new ship
    const newShip = await Ship.create({
      name: processedShipData.name,
      type: processedShipData.type,
      color: processedShipData.color,
      customLines: customLinesJson,
      thrusterPoints: thrusterPointsJson,
      weaponPoints: weaponPointsJson,
      passphrase: passphrase
    });
    
    // Get the raw data for the new ship
    const createdShip = await Ship.findByPk(newShip.id, { raw: true });
    
    // Process for response - convert JSON strings to objects
    const responseShip = {
      ...createdShip,
      customLines: safeParse(createdShip.customLines),
      thrusterPoints: safeParse(createdShip.thrusterPoints),
      weaponPoints: safeParse(createdShip.weaponPoints)
    };
    
    res.status(201).json(responseShip);
    
  } catch (err) {
    console.error('Error creating/updating ship:', err);
    res.status(500).json({ message: err.message });
  }
});


// DELETE ship by ID
router.delete('/:id', async (req, res) => {
  try {
    const ship = await Ship.findByPk(req.params.id);
    
    if (!ship) {
      return res.status(404).json({ message: 'Ship not found' });
    }
    
    await ship.destroy();
    res.json({ message: 'Ship deleted' });
  } catch (err) {
    console.error('Error deleting ship:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;