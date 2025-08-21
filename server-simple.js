const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Simple in-memory session storage
const sessions = new Map();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Enable JSON parsing for ship loading
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Simple multiplayer server is running'
  });
});

// Initialize database connection
const { Ship } = require('./models');
const { generatePassphrase, validateShipData } = require('./utils/helpers');

// Ship loading endpoint for multiplayer - connects to real database
app.get('/api/ships/passphrase/:passphrase', async (req, res) => {
  try {
    console.log(`🚢 Loading ship with passphrase: ${req.params.passphrase}`);
    
    // Load ship from real database
    const ship = await Ship.findOne({ 
      where: { passphrase: req.params.passphrase },
      raw: true
    });
    
    if (!ship) {
      console.log(`🚢 Ship not found with passphrase: ${req.params.passphrase}`);
      return res.status(404).json({ message: 'Ship not found with that passphrase' });
    }
    
    // Parse JSON fields (they're stored as strings in DB)
    const shipData = {
      id: ship.id,
      name: ship.name,
      passphrase: ship.passphrase,
      color: ship.color,
      type: ship.type,
      customLines: ship.customLines ? (typeof ship.customLines === 'string' ? JSON.parse(ship.customLines) : ship.customLines) : [],
      thrusterPoints: ship.thrusterPoints ? (typeof ship.thrusterPoints === 'string' ? JSON.parse(ship.thrusterPoints) : ship.thrusterPoints) : [],
      weaponPoints: ship.weaponPoints ? (typeof ship.weaponPoints === 'string' ? JSON.parse(ship.weaponPoints) : ship.weaponPoints) : []
    };
    
    console.log(`🚢 Successfully loaded ship:`, {
      name: shipData.name,
      color: shipData.color,
      customLinesCount: shipData.customLines.length,
      thrusterPointsCount: shipData.thrusterPoints.length,
      weaponPointsCount: shipData.weaponPoints.length
    });
    
    res.json(shipData);
  } catch (error) {
    console.error('🚢 Error loading ship:', error);
    res.status(500).json({ message: 'Database error loading ship' });
  }
});

// Ship saving endpoint for testing
app.post('/api/ships', async (req, res) => {
  try {
    console.log('🚢 SAVE: Raw request body:', req.body);
    console.log('🚢 SAVE: Received ship save request:', {
      name: req.body.name,
      type: req.body.type,
      color: req.body.color,
      customLinesCount: req.body.customLines?.length || 0,
      thrusterPointsCount: req.body.thrusterPoints?.length || 0,
      weaponPointsCount: req.body.weaponPoints?.length || 0,
      passphrase: req.body.passphrase || 'Will generate'
    });
    
    // Validate the incoming data
    const validationResult = validateShipData(req.body);
    if (!validationResult.valid) {
      return res.status(400).json({ message: validationResult.message });
    }
    
    const shipData = req.body;
    
    // Ensure all array data is properly formatted
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
        console.log('🚢 SAVE: Updating existing ship');
        
        // Update existing ship
        await Ship.update({
          name: processedShipData.name,
          type: processedShipData.type,
          color: processedShipData.color,
          customLines: JSON.stringify(processedShipData.customLines),
          thrusterPoints: JSON.stringify(processedShipData.thrusterPoints),
          weaponPoints: JSON.stringify(processedShipData.weaponPoints)
        }, {
          where: { id: existingShip.id }
        });
        
        // Fetch the updated ship
        const updated = await Ship.findByPk(existingShip.id, { raw: true });
        
        const responseShip = {
          ...updated,
          customLines: JSON.parse(updated.customLines || '[]'),
          thrusterPoints: JSON.parse(updated.thrusterPoints || '[]'),
          weaponPoints: JSON.parse(updated.weaponPoints || '[]')
        };
        
        console.log('🚢 SAVE: Ship updated successfully');
        return res.status(200).json(responseShip);
      }
    }
    
    // Create new ship with new passphrase
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
    
    console.log('🚢 SAVE: Creating new ship with passphrase:', passphrase);
    
    // Create new ship
    const newShip = await Ship.create({
      name: processedShipData.name,
      type: processedShipData.type,
      color: processedShipData.color,
      customLines: JSON.stringify(processedShipData.customLines),
      thrusterPoints: JSON.stringify(processedShipData.thrusterPoints),
      weaponPoints: JSON.stringify(processedShipData.weaponPoints),
      passphrase: passphrase
    });
    
    const responseShip = {
      id: newShip.id,
      name: newShip.name,
      type: newShip.type,
      color: newShip.color,
      passphrase: newShip.passphrase,
      customLines: processedShipData.customLines,
      thrusterPoints: processedShipData.thrusterPoints,
      weaponPoints: processedShipData.weaponPoints,
      createdAt: newShip.createdAt,
      updatedAt: newShip.updatedAt
    };
    
    console.log('🚢 SAVE: Ship created successfully with passphrase:', passphrase);
    res.status(201).json(responseShip);
    
  } catch (err) {
    console.error('🚢 SAVE ERROR: Error creating/updating ship:', err);
    res.status(500).json({ message: err.message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Simple session join - no database, improved tracking
  socket.on('join-simple-session', (sessionId) => {
    console.log(`🎯 Socket ${socket.id} joining simple session: ${sessionId}`);
    
    // Leave any previous session and clean up
    if (socket.currentSession) {
      const oldSession = sessions.get(socket.currentSession);
      if (oldSession) {
        oldSession.players.delete(socket.id);
        console.log(`🚪 Socket ${socket.id} left previous session: ${socket.currentSession}`);
      }
      socket.leave(socket.currentSession);
    }
    
    // Join new session
    socket.join(sessionId);
    socket.currentSession = sessionId;
    
    // Track session in memory with better cleanup
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        players: new Set(),
        created: Date.now()
      });
      console.log(`📝 Created new session: ${sessionId}`);
    }
    
    const session = sessions.get(sessionId);
    session.players.add(socket.id);
    
    // Get actual room size from socket.io for verification
    const roomSize = io.sockets.adapter.rooms.get(sessionId)?.size || 0;
    const trackedSize = session.players.size;
    
    console.log(`✅ Socket ${socket.id} joined session ${sessionId}`);
    console.log(`📊 Players: Tracked=${trackedSize}, SocketIO Room=${roomSize}`);
    
    // Notify other players in the room
    socket.to(sessionId).emit('player-joined', {
      playerId: socket.id,
      timestamp: Date.now()
    });
    
    // Confirm join to player with actual room size
    socket.emit('session-joined', {
      sessionId: sessionId,
      playerId: socket.id,
      playerCount: roomSize
    });
    
    // Request ship data from all existing players in the session
    // This ensures the new player gets everyone's ship designs
    console.log(`🔄 Requesting ship data from existing players in session ${sessionId}`);
    socket.to(sessionId).emit('request-ship-data', {
      newPlayerId: socket.id
    });
  });

  // Simple player position sync
  socket.on('player-update', (data) => {
    if (!socket.currentSession) return;
    
    // Add player ID to the data
    const updateData = {
      ...data,
      playerId: socket.id,
      timestamp: Date.now()
    };
    
    // Broadcast to other players in session only
    socket.to(socket.currentSession).emit('player-update', updateData);
  });

  // Player ship data sync
  socket.on('player-ship-data', (data) => {
    if (!socket.currentSession) return;
    
    console.log(`🚢 Received ship data from ${socket.id}:`, {
      shipName: data.shipData?.name,
      passphrase: data.shipData?.passphrase,
      customLinesCount: data.shipData?.customLines?.length || 0
    });
    
    // Add player ID and broadcast to other players in session
    const shipUpdateData = {
      ...data,
      playerId: socket.id,
      timestamp: Date.now()
    };
    
    socket.to(socket.currentSession).emit('player-ship-data', shipUpdateData);
  });

  // Handle bullet synchronization
  socket.on('bullet-fired', (bulletData) => {
    if (!socket.currentSession) return;
    
    console.log(`🔫 Bullet fired by ${socket.id} in session ${socket.currentSession}`);
    
    // Broadcast bullet to other players in session only
    socket.to(socket.currentSession).emit('bullet-fired', bulletData);
  });

  // Handle disconnection with better cleanup
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);
    
    if (socket.currentSession) {
      const session = sessions.get(socket.currentSession);
      if (session) {
        // Remove from tracked players
        session.players.delete(socket.id);
        
        // Get updated room size
        const roomSize = io.sockets.adapter.rooms.get(socket.currentSession)?.size || 0;
        
        console.log(`🚪 Removed ${socket.id} from session ${socket.currentSession}`);
        console.log(`📊 Remaining: Tracked=${session.players.size}, SocketIO Room=${roomSize}`);
        
        // Notify other players
        socket.to(socket.currentSession).emit('player-left', {
          playerId: socket.id,
          timestamp: Date.now()
        });
        
        // Clean up empty sessions
        if (session.players.size === 0 || roomSize === 0) {
          sessions.delete(socket.currentSession);
          console.log(`🗑️ Cleaned up empty session: ${socket.currentSession}`);
        }
      }
    }
  });

  // Ping/pong for connection testing
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// Serve main page  
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'clean-minimal.html'));
});

// Alternative test pages
app.get('/test1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simple-multiplayer.html'));
});

app.get('/custom', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'custom-ships-minimal.html'));
});

// Note: Use existing ship customization at /ship-customization.html instead of /create

app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'debug-multiplayer.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`Simple multiplayer server running on port ${PORT}`);
  console.log(`Open two browser tabs to http://localhost:${PORT} to test`);
});