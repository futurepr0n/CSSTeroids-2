const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const highScoreRoutes = require('./routes/highscores');


// Initialize express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;

// In-memory storage for simple sessions
const simpleSessions = new Map(); // sessionId -> { id, hostPlayerId, maxPlayers, currentPlayers, gameState, worldWidth, worldHeight, createdAt }

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


// Database connection
const db = require('./models');

// Import routes
const shipRoutes = require('./routes/ships');
const multiplayerRoutes = require('./routes/multiplayer');

// Use routes
app.use('/api/ships', shipRoutes);
app.use('/api/high-scores', highScoreRoutes);
app.use('/api/multiplayer', multiplayerRoutes);

// Test endpoint for connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is accessible',
    socketio: 'available'
  });
});

// Simple session management endpoints
app.post('/api/simple-sessions/create', (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'session_' + Math.random().toString(36).substring(2, 10);
    const hostPlayerId = req.body.hostPlayerId || 'anonymous_' + Math.random().toString(36).substring(2, 8);
    
    const session = {
      id: sessionId,
      hostPlayerId: hostPlayerId,
      maxPlayers: req.body.maxPlayers || 3,
      currentPlayers: 0, // Will be updated when players actually join
      gameState: 'waiting',
      worldWidth: req.body.worldWidth || 2000,
      worldHeight: req.body.worldHeight || 1500,
      createdAt: new Date().toISOString()
    };
    
    simpleSessions.set(sessionId, session);
    console.log(`Created simple session: ${sessionId}`);
    
    res.json({
      success: true,
      session: session
    });
  } catch (error) {
    console.error('Error creating simple session:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

app.get('/api/simple-sessions', (req, res) => {
  try {
    const sessions = Array.from(simpleSessions.values()).filter(session => {
      // Only show sessions that are waiting and have available slots
      return session.gameState === 'waiting' && session.currentPlayers < session.maxPlayers;
    });
    
    res.json({
      success: true,
      sessions: sessions
    });
  } catch (error) {
    console.error('Error listing simple sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to list sessions' });
  }
});

app.get('/api/simple-sessions/:sessionId', (req, res) => {
  try {
    const session = simpleSessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    res.json({
      success: true,
      session: session
    });
  } catch (error) {
    console.error('Error getting simple session:', error);
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

app.post('/api/simple-sessions/cleanup', (req, res) => {
  try {
    const sessionCount = simpleSessions.size;
    simpleSessions.clear();
    console.log(`Cleared ${sessionCount} simple sessions`);
    
    res.json({
      success: true,
      message: `Cleared ${sessionCount} simple sessions`
    });
  } catch (error) {
    console.error('Error cleaning up simple sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup sessions' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Join a multiplayer session
  socket.on('join-session', async (sessionId) => {
    try {
      const { GameSession, SessionPlayer } = require('./models');
      
      // If already in a session, leave it first
      if (socket.sessionId && socket.sessionId !== sessionId) {
        socket.leave(socket.sessionId);
        socket.to(socket.sessionId).emit('player-left', {
          playerId: socket.id,
          timestamp: Date.now()
        });
        console.log(`Socket ${socket.id} left previous session ${socket.sessionId}`);
      }
      
      // Check if session exists
      const session = await GameSession.findOne({ where: { sessionId } });
      if (!session) {
        socket.emit('session-error', { error: 'Session not found' });
        return;
      }
      
      // Check if this socket is already a player in this session
      let existingPlayer = await SessionPlayer.findOne({
        where: { sessionId, playerId: socket.id }
      });
      
      // If not, create a player entry for this socket
      if (!existingPlayer) {
        await SessionPlayer.create({
          sessionId,
          playerId: socket.id,
          playerName: 'Anonymous',
          shipPassphrase: null
        });
        console.log(`Created player entry for socket ${socket.id} in session ${sessionId}`);
      }
      
      // Get updated player count
      const currentPlayerCount = await SessionPlayer.count({ where: { sessionId } });
      if (currentPlayerCount > session.maxPlayers) {
        // Remove the player we just added if it exceeds max
        await SessionPlayer.destroy({ where: { sessionId, playerId: socket.id } });
        socket.emit('session-error', { error: 'Session is full' });
        return;
      }
      
      // Join the socket room
      socket.join(sessionId);
      socket.sessionId = sessionId;
      console.log(`Socket ${socket.id} joined session ${sessionId} (${currentPlayerCount}/${session.maxPlayers} players)`);
      
      // Update session player count to ensure accuracy
      await session.update({ currentPlayers: currentPlayerCount });
      
      // Notify other players in the session
      socket.to(sessionId).emit('player-joined', {
        playerId: socket.id,
        timestamp: Date.now()
      });
      
      // Send confirmation to the joining player
      socket.emit('session-joined', {
        sessionId: sessionId,
        playerCount: currentPlayerCount,
        maxPlayers: session.maxPlayers,
        gameState: session.gameState
      });
      
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('session-error', { error: 'Failed to join session' });
    }
  });

  // Leave a multiplayer session
  socket.on('leave-session', () => {
    if (socket.sessionId) {
      socket.to(socket.sessionId).emit('player-left', {
        playerId: socket.id,
        timestamp: Date.now()
      });
      socket.leave(socket.sessionId);
      console.log(`Player ${socket.id} left session ${socket.sessionId}`);
      socket.sessionId = null;
    }
  });

  // Handle player disconnection
  socket.on('disconnect', async () => {
    console.log('Player disconnected:', socket.id);
    if (socket.sessionId) {
      socket.to(socket.sessionId).emit('player-disconnected', {
        playerId: socket.id,
        timestamp: Date.now()
      });
      
      // Clean up database: remove player from session
      try {
        const { GameSession, SessionPlayer } = require('./models');
        
        // Remove the player from the session
        const deletedCount = await SessionPlayer.destroy({
          where: { 
            sessionId: socket.sessionId,
            playerId: socket.id
          }
        });
        
        if (deletedCount > 0) {
          console.log(`Removed disconnected player ${socket.id} from session ${socket.sessionId}`);
          
          // Update session player count
          const session = await GameSession.findOne({ where: { sessionId: socket.sessionId } });
          if (session) {
            const remainingPlayers = await SessionPlayer.count({ 
              where: { sessionId: socket.sessionId } 
            });
            
            await session.update({ currentPlayers: remainingPlayers });
            
            // If no players left, delete the session
            if (remainingPlayers === 0) {
              await GameSession.destroy({ where: { sessionId: socket.sessionId } });
              console.log(`Deleted empty session ${socket.sessionId}`);
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning up disconnected player:', error);
      }
    }
    
    // Handle simple sessions
    if (socket.currentSession) {
      socket.to(socket.currentSession).emit('player-disconnected', {
        playerId: socket.id,
        timestamp: Date.now()
      });
      
      // Update simple session player count
      const session = simpleSessions.get(socket.currentSession);
      if (session) {
        const roomSize = io.sockets.adapter.rooms.get(socket.currentSession)?.size || 0;
        session.currentPlayers = Math.max(0, roomSize - 1); // -1 because this socket is about to disconnect
        console.log(`Updated simple session ${socket.currentSession} player count to ${session.currentPlayers} after disconnect`);
        
        // Remove session if empty
        if (session.currentPlayers === 0) {
          simpleSessions.delete(socket.currentSession);
          console.log(`Removed empty simple session: ${socket.currentSession}`);
        }
      }
    }
  });

  // Handle game start event
  socket.on('start-multiplayer-game', async (data) => {
    // Check both sessionId (database sessions) and currentSession (simple sessions)
    const sessionId = socket.sessionId || socket.currentSession;
    if (!sessionId) {
      console.log('No session found for start-multiplayer-game request');
      return;
    }
    
    try {
      console.log(`Starting multiplayer game in session ${sessionId} by player ${socket.id}`);
      
      // For simple sessions (currentSession), update session state and emit game-started event
      if (socket.currentSession) {
        console.log('Using simple session approach for game start');
        
        // Update session state in memory
        const session = simpleSessions.get(sessionId);
        if (session) {
          session.gameState = 'playing';
          console.log(`Updated simple session ${sessionId} state to 'playing'`);
        }
        
        io.to(sessionId).emit('game-started', {
          sessionId: sessionId,
          worldWidth: 2000,
          worldHeight: 1500,
          startedBy: socket.id,
          timestamp: Date.now()
        });
        console.log(`Simple game started in session ${sessionId} by player ${socket.id}`);
        return;
      }
      
      // For database sessions (sessionId), update the database
      const { GameSession } = require('./models');
      const session = await GameSession.findOne({ where: { sessionId: socket.sessionId } });
      if (session) {
        await session.update({ gameState: 'playing' });
        
        // Notify all players in the session to start the game
        io.to(socket.sessionId).emit('game-started', {
          sessionId: socket.sessionId,
          worldWidth: session.worldWidth,
          worldHeight: session.worldHeight,
          startedBy: socket.id,
          timestamp: Date.now()
        });
        
        console.log(`Database game started in session ${socket.sessionId} by player ${socket.id}`);
      }
    } catch (error) {
      console.error('Error starting multiplayer game:', error);
    }
  });

  // Game state synchronization events
  socket.on('player-state-update', (data) => {
    // Broadcast player state to other players in the same session
    if (socket.sessionId && data.sessionId === socket.sessionId) {
      const roomSize = io.sockets.adapter.rooms.get(socket.sessionId)?.size || 0;
      console.log(`🎮 SERVER: Broadcasting player-state-update from ${data.playerId} to session ${socket.sessionId} (${roomSize} clients in room)`);
      socket.to(socket.sessionId).emit('player-state-update', data);
    } else {
      console.log(`🎮 SERVER: Rejecting player-state-update - socket session: ${socket.sessionId}, data session: ${data.sessionId}`);
    }
  });

  socket.on('game-state-update', (data) => {
    // Broadcast game state from host to other players in the session
    if (socket.sessionId && data.sessionId === socket.sessionId) {
      const roomSize = io.sockets.adapter.rooms.get(socket.sessionId)?.size || 0;
      console.log(`🌍 SERVER: Broadcasting game-state-update to session ${socket.sessionId} (${roomSize} clients in room):`, {
        asteroids: data.asteroids?.length || 0,
        enemies: data.enemies?.length || 0,
        bullets: data.bullets?.length || 0,
        level: data.level,
        score: data.score
      });
      io.to(socket.sessionId).emit('game-state-update', data);
    } else {
      console.log(`🌍 SERVER: Rejecting game-state-update - socket session: ${socket.sessionId}, data session: ${data.sessionId}`);
    }
  });

  socket.on('lives-update', (data) => {
    // Broadcast shared lives update to other players in the session
    if (socket.sessionId && data.sessionId === socket.sessionId) {
      socket.to(socket.sessionId).emit('lives-update', data);
    }
  });

  socket.on('game-over', (data) => {
    // Broadcast game over to all players in the session
    if (socket.sessionId && data.sessionId === socket.sessionId) {
      io.to(socket.sessionId).emit('game-over', data);
    }
  });

  socket.on('level-complete', (data) => {
    // Broadcast level completion to all players in the session
    if (socket.sessionId && data.sessionId === socket.sessionId) {
      socket.to(socket.sessionId).emit('level-complete', data);
    }
  });

  // Basic connection test
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Simple session join for minimal test (no database)
  socket.on('join-simple-session', (sessionId) => {
    console.log(`Socket ${socket.id} joining simple session: ${sessionId}`);
    
    // Leave any previous session and update player count
    if (socket.currentSession) {
      socket.leave(socket.currentSession);
      // Update previous session player count
      const prevSession = simpleSessions.get(socket.currentSession);
      if (prevSession) {
        const prevRoomSize = io.sockets.adapter.rooms.get(socket.currentSession)?.size || 0;
        prevSession.currentPlayers = prevRoomSize;
        console.log(`Updated previous session ${socket.currentSession} player count to ${prevRoomSize}`);
      }
    }
    
    // Join new session
    socket.join(sessionId);
    socket.currentSession = sessionId;
    
    const roomSize = io.sockets.adapter.rooms.get(sessionId)?.size || 0;
    console.log(`Socket ${socket.id} joined simple session ${sessionId} (${roomSize} players)`);
    
    // Update session player count
    const session = simpleSessions.get(sessionId);
    if (session) {
      session.currentPlayers = roomSize;
      console.log(`Updated session ${sessionId} player count to ${roomSize}`);
    }
    
    // Notify other players
    socket.to(sessionId).emit('player-joined', {
      playerId: socket.id,
      timestamp: Date.now()
    });
    
    // Confirm join to player
    socket.emit('session-joined', {
      sessionId: sessionId,
      playerId: socket.id,
      playerCount: roomSize
    });
  });

  // Simple player position sync for minimal test
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

  // Game objects sync (asteroids, enemies, bullets)
  socket.on('game-objects-update', (data) => {
    if (!socket.currentSession) return;
    
    // Add sender ID and broadcast to other players
    const updateData = {
      ...data,
      senderId: socket.id,
      timestamp: Date.now()
    };
    
    socket.to(socket.currentSession).emit('game-objects-update', updateData);
  });
});

// Session cleanup function
async function cleanupStaleSessions() {
  try {
    const { GameSession, SessionPlayer } = require('./models');
    
    // Remove sessions older than 30 minutes with no activity
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const staleSessions = await GameSession.findAll({
      where: {
        updatedAt: { [require('sequelize').Op.lt]: thirtyMinutesAgo }
      }
    });
    
    for (const session of staleSessions) {
      // Remove players first
      await SessionPlayer.destroy({ where: { sessionId: session.sessionId } });
      // Remove session
      await session.destroy();
      console.log(`Cleaned up stale session: ${session.sessionId}`);
    }
    
    // Reconcile all session player counts and check for active connections
    const allSessions = await GameSession.findAll();
    let reconciledCount = 0;
    
    for (const session of allSessions) {
      const actualPlayerCount = await SessionPlayer.count({ 
        where: { sessionId: session.sessionId } 
      });
      
      // Check if there are any connected sockets for this session
      const connectedSocketsInSession = io.sockets.adapter.rooms.get(session.sessionId)?.size || 0;
      
      if (actualPlayerCount !== session.currentPlayers) {
        await session.update({ currentPlayers: actualPlayerCount });
        console.log(`Reconciled session ${session.sessionId}: ${session.currentPlayers} -> ${actualPlayerCount} players`);
        reconciledCount++;
      }
      
      // Clean up sessions with no actual connected sockets
      if (connectedSocketsInSession === 0) {
        await SessionPlayer.destroy({ where: { sessionId: session.sessionId } });
        await session.destroy();
        console.log(`Cleaned up session with no connected sockets: ${session.sessionId}`);
      }
      // Also clean up if database shows 0 players
      else if (actualPlayerCount === 0) {
        await session.destroy();
        console.log(`Cleaned up empty session: ${session.sessionId}`);
      }
    }
    
    if (reconciledCount > 0) {
      console.log(`Reconciled ${reconciledCount} session player counts`);
    }
    
  } catch (error) {
    console.error('Error during session cleanup:', error);
  }
}

async function clearAllSessions() {
  try {
    const { GameSession, SessionPlayer } = require('./models');
    
    // Delete all existing sessions and players on server startup
    await SessionPlayer.destroy({ where: {} });
    await GameSession.destroy({ where: {} });
    
    console.log('Cleared all existing sessions and players');
  } catch (error) {
    console.error('Error clearing sessions on startup:', error);
  }
}

function startSessionCleanup() {
  // Clean up all sessions immediately on startup
  clearAllSessions();
  
  // Then clean up stale sessions
  setTimeout(() => {
    cleanupStaleSessions();
  }, 1000); // Wait 1 second after clearing all
  
  // Then clean up every 5 minutes
  setInterval(cleanupStaleSessions, 5 * 60 * 1000);
  console.log('Session cleanup started - runs every 5 minutes');
}

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Minimal test mode
app.get('/minimal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'minimal-ships.html'));
});

// Sync database and start server
db.sequelize.sync()
  .then(() => {
    console.log('Database connected successfully');
    startServer();
  })
  .catch(err => {
    console.warn('Database connection failed, starting server without database:', err.message);
    startServer();
  });

function startServer() {
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.io enabled for multiplayer functionality`);
      
      // Start periodic session cleanup
      startSessionCleanup();
    });
}
