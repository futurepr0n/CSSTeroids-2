const express = require('express');
const router = express.Router();
const { Ship } = require('../models');
const path = require('path');

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'anthony2021';

const adminSessions = new Map();

function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isAuthenticated(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;

  if (token && adminSessions.has(token)) {
    const session = adminSessions.get(token);
    if (Date.now() - session.createdAt < 24 * 60 * 60 * 1000) {
      return next();
    }
    adminSessions.delete(token);
  }

  res.status(401).json({ message: 'Unauthorized' });
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateSessionToken();
    adminSessions.set(token, {
      username,
      createdAt: Date.now()
    });

    console.log('Admin login successful');
    res.json({ success: true, token });
  } else {
    console.log('Admin login failed');
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

router.post('/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) {
    adminSessions.delete(token);
  }
  res.json({ success: true });
});

router.get('/verify', isAuthenticated, (req, res) => {
  res.json({ authenticated: true });
});

router.get('/ships', isAuthenticated, async (req, res) => {
  try {
    const ships = await Ship.findAll({
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const processedShips = ships.map(ship => ({
      ...ship,
      customLines: safeParseJSON(ship.customLines),
      thrusterPoints: safeParseJSON(ship.thrusterPoints),
      weaponPoints: safeParseJSON(ship.weaponPoints)
    }));

    res.json(processedShips);
  } catch (err) {
    console.error('Error fetching ships for admin:', err);
    res.status(500).json({ message: err.message });
  }
});

router.patch('/ships/:id/visibility', isAuthenticated, async (req, res) => {
  try {
    const ship = await Ship.findByPk(req.params.id);

    if (!ship) {
      return res.status(404).json({ message: 'Ship not found' });
    }

    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: 'isPublic must be a boolean' });
    }

    await ship.update({ isPublic });
    res.json({ message: 'Ship visibility updated', isPublic });
  } catch (err) {
    console.error('Error updating ship visibility:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/ships/:id', isAuthenticated, async (req, res) => {
  try {
    const ship = await Ship.findByPk(req.params.id);

    if (!ship) {
      return res.status(404).json({ message: 'Ship not found' });
    }

    const shipName = ship.name;
    await ship.destroy();
    console.log(`Admin deleted ship: ${shipName} (ID: ${req.params.id})`);
    res.json({ message: 'Ship deleted successfully' });
  } catch (err) {
    console.error('Error deleting ship:', err);
    res.status(500).json({ message: err.message });
  }
});

function safeParseJSON(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

module.exports = router;
