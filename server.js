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

// MMO persistent world - single world that always exists
const MMO_WORLD_ID = 'mmo_world'; // Single persistent world ID
let mmoWorld = null; // The single persistent MMO world
const MMO_CONFIG = {
  maxPlayers: 5,
  maxAsteroids: 5,
  maxEnemies: 5,
  worldWidth: 2000,
  worldHeight: 1500,
  tickRate: 50, // ms between server ticks (20 ticks/sec)
  asteroidSpeed: { min: 0.3, max: 1.2 },
  enemySpeed: 1.5,
  waveDelay: 2000 // ms delay before spawning new wave
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


// Database connection
const db = require('./models');

// Import routes
const shipRoutes = require('./routes/ships');
const multiplayerRoutes = require('./routes/multiplayer');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/ships', shipRoutes);
app.use('/api/high-scores', highScoreRoutes);
app.use('/api/multiplayer', multiplayerRoutes);
app.use('/api/admin', adminRoutes);

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

// ============================================
// MMO PERSISTENT WORLD API ENDPOINTS
// ============================================

// Get MMO world status (single persistent world)
app.get('/api/mmo-world', (req, res) => {
  try {
    if (!mmoWorld) {
      return res.status(503).json({ success: false, error: 'MMO world not initialized' });
    }

    res.json({
      success: true,
      world: {
        id: MMO_WORLD_ID,
        playerCount: mmoWorld.players.size,
        maxPlayers: MMO_CONFIG.maxPlayers,
        asteroidCount: mmoWorld.asteroids.size,
        enemyCount: mmoWorld.enemies.size,
        worldBounds: { width: mmoWorld.worldWidth, height: mmoWorld.worldHeight },
        highestScore: getMMOHighestScore(mmoWorld),
        players: Array.from(mmoWorld.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          score: p.score
        }))
      }
    });
  } catch (error) {
    console.error('Error getting MMO world status:', error);
    res.status(500).json({ success: false, error: 'Failed to get MMO world status' });
  }
});

// ============================================
// MMO HELPER FUNCTIONS
// ============================================

function getMMOHighestScore(session) {
  let highest = { score: 0, playerId: null, playerName: '' };
  for (const [playerId, player] of session.players) {
    if (player.score > highest.score) {
      highest = { score: player.score, playerId, playerName: player.name };
    }
  }
  return highest;
}

function spawnMMOAsteroid(session) {
  const id = `ast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const bounds = { width: session.worldWidth, height: session.worldHeight };
  const margin = 200; // Spawn within this margin from edges

  // Spawn inside the world, avoiding center (where player likely is)
  let x, y;
  const spawnZone = Math.floor(Math.random() * 4);

  switch (spawnZone) {
    case 0: // Top area
      x = margin + Math.random() * (bounds.width - 2 * margin);
      y = margin + Math.random() * 200;
      break;
    case 1: // Right area
      x = bounds.width - margin - Math.random() * 200;
      y = margin + Math.random() * (bounds.height - 2 * margin);
      break;
    case 2: // Bottom area
      x = margin + Math.random() * (bounds.width - 2 * margin);
      y = bounds.height - margin - Math.random() * 200;
      break;
    case 3: // Left area
      x = margin + Math.random() * 200;
      y = margin + Math.random() * (bounds.height - 2 * margin);
      break;
  }

  // Random velocity - asteroids drift around slowly
  const speed = MMO_CONFIG.asteroidSpeed.min + Math.random() * (MMO_CONFIG.asteroidSpeed.max - MMO_CONFIG.asteroidSpeed.min);
  const angle = Math.random() * Math.PI * 2;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  return {
    id,
    x, y, vx, vy,
    size: 2 + Math.floor(Math.random() * 2), // Size 2 or 3
    radius: 30 + Math.random() * 20,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    seed: Math.random() * 10000
  };
}

function spawnMMOEnemy(session) {
  const id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const bounds = { width: session.worldWidth, height: session.worldHeight };
  const minDistance = 300;

  // Find position away from all players
  let x, y, attempts = 0;
  do {
    x = 100 + Math.random() * (bounds.width - 200);
    y = 100 + Math.random() * (bounds.height - 200);
    attempts++;

    let tooClose = false;
    for (const [, player] of session.players) {
      const dx = player.x - x;
      const dy = player.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) break;
  } while (attempts < 20);

  return {
    id,
    x, y,
    vx: 0,
    vy: 0,
    angle: Math.random() * Math.PI * 2,
    health: 1, // 1-hit kill
    targetPlayerId: null,
    lastShot: 0,
    shootCooldown: 2000 + Math.random() * 1000
  };
}

function maintainMMOObjectCounts(session) {
  const now = Date.now();

  // Wave-based asteroid spawning
  if (session.asteroids.size === 0) {
    // All asteroids destroyed - check if we should spawn new wave
    if (!session.asteroidWaveTime) {
      // Start wave timer
      session.asteroidWaveTime = now + MMO_CONFIG.waveDelay;
      console.log('🌊 MMO: Asteroid wave cleared! New wave in 2 seconds...');
      io.to('mmo-world').emit('mmo-wave-cleared', { type: 'asteroids' });
    } else if (now >= session.asteroidWaveTime) {
      // Spawn new wave
      console.log('🌊 MMO: Spawning new asteroid wave!');
      for (let i = 0; i < MMO_CONFIG.maxAsteroids; i++) {
        const asteroid = spawnMMOAsteroid(session);
        session.asteroids.set(asteroid.id, asteroid);
        io.to('mmo-world').emit('mmo-asteroid-spawn', asteroid);
      }
      session.asteroidWaveTime = null;
      io.to('mmo-world').emit('mmo-wave-spawned', { type: 'asteroids', count: MMO_CONFIG.maxAsteroids });
    }
  } else {
    // Reset timer if asteroids exist
    session.asteroidWaveTime = null;
  }

  // Wave-based enemy spawning
  if (session.enemies.size === 0) {
    if (!session.enemyWaveTime) {
      session.enemyWaveTime = now + MMO_CONFIG.waveDelay;
      console.log('🌊 MMO: Enemy wave cleared! New wave in 2 seconds...');
      io.to('mmo-world').emit('mmo-wave-cleared', { type: 'enemies' });
    } else if (now >= session.enemyWaveTime) {
      console.log('🌊 MMO: Spawning new enemy wave!');
      for (let i = 0; i < MMO_CONFIG.maxEnemies; i++) {
        const enemy = spawnMMOEnemy(session);
        session.enemies.set(enemy.id, enemy);
        io.to('mmo-world').emit('mmo-enemy-spawn', enemy);
      }
      session.enemyWaveTime = null;
      io.to('mmo-world').emit('mmo-wave-spawned', { type: 'enemies', count: MMO_CONFIG.maxEnemies });
    }
  } else {
    session.enemyWaveTime = null;
  }
}

function updateMMOAsteroids(session, deltaTime) {
  const bounds = { width: session.worldWidth, height: session.worldHeight };

  for (const [id, asteroid] of session.asteroids) {
    // Update position
    asteroid.x += asteroid.vx * deltaTime;
    asteroid.y += asteroid.vy * deltaTime;
    asteroid.rotation += asteroid.rotationSpeed * deltaTime;

    // Bounce off walls instead of going out of bounds
    if (asteroid.x < asteroid.radius) {
      asteroid.x = asteroid.radius;
      asteroid.vx = Math.abs(asteroid.vx);
    } else if (asteroid.x > bounds.width - asteroid.radius) {
      asteroid.x = bounds.width - asteroid.radius;
      asteroid.vx = -Math.abs(asteroid.vx);
    }

    if (asteroid.y < asteroid.radius) {
      asteroid.y = asteroid.radius;
      asteroid.vy = Math.abs(asteroid.vy);
    } else if (asteroid.y > bounds.height - asteroid.radius) {
      asteroid.y = bounds.height - asteroid.radius;
      asteroid.vy = -Math.abs(asteroid.vy);
    }
  }
}

function updateMMOEnemies(session, deltaTime) {
  const now = Date.now();

  for (const [id, enemy] of session.enemies) {
    // Find nearest player to target
    let nearestPlayer = null;
    let nearestDist = Infinity;

    for (const [, player] of session.players) {
      if (player.dead) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    if (nearestPlayer) {
      // Turn towards player
      const targetAngle = Math.atan2(nearestPlayer.y - enemy.y, nearestPlayer.x - enemy.x);
      let angleDiff = targetAngle - enemy.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      enemy.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.03 * deltaTime);

      // Move towards player
      enemy.vx = Math.cos(enemy.angle) * MMO_CONFIG.enemySpeed;
      enemy.vy = Math.sin(enemy.angle) * MMO_CONFIG.enemySpeed;
      enemy.x += enemy.vx * deltaTime * 0.5;
      enemy.y += enemy.vy * deltaTime * 0.5;

      // Shoot at player occasionally
      if (now - enemy.lastShot > enemy.shootCooldown && nearestDist < 400) {
        enemy.lastShot = now;

        // Broadcast enemy shoot
        io.to(`mmo-world`).emit('mmo-enemy-shoot', {
          enemyId: id,
          x: enemy.x,
          y: enemy.y,
          angle: enemy.angle
        });
      }
    }
  }
}

// Helper: Check if line segment intersects circle (swept collision detection)
// Returns true if line from (x1,y1) to (x2,y2) intersects circle at (cx,cy) with radius r
function lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  // Check if start point is inside circle
  if (c <= 0) return true;

  // Check discriminant for intersection
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  // Check if intersection is within line segment [0, 1]
  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function processMMOCollisions(session) {
  // Client-side collision detection handles bullet-object collisions
  // Server just updates bullet positions and removes expired bullets
  const now = Date.now();
  for (let i = session.bullets.length - 1; i >= 0; i--) {
    const bullet = session.bullets[i];
    if (!bullet) continue;

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    // Remove if out of bounds or expired (3.5 second lifespan)
    if (bullet.x < 0 || bullet.x > session.worldWidth ||
        bullet.y < 0 || bullet.y > session.worldHeight ||
        now - bullet.createdAt > 3500) {
      session.bullets.splice(i, 1);
    }
  }
}

function broadcastMMOHighestScore(session) {
  const highest = getMMOHighestScore(session);
  io.to(`mmo-world`).emit('mmo-highest-score', highest);
}

function mmoGameTick(session) {
  const now = Date.now();
  const deltaTime = (now - session.lastTick) / 16.67; // Normalize to 60fps
  session.lastTick = now;

  // Update asteroids
  updateMMOAsteroids(session, deltaTime);

  // Update enemies
  updateMMOEnemies(session, deltaTime);

  // Process collisions
  processMMOCollisions(session);

  // Maintain object counts (respawn)
  maintainMMOObjectCounts(session);

  // Broadcast state to all clients
  io.to(`mmo-world`).emit('mmo-state', {
    asteroids: Array.from(session.asteroids.values()),
    enemies: Array.from(session.enemies.values()),
    players: Array.from(session.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      angle: p.angle,
      score: p.score,
      dead: p.dead,
      shipData: p.shipData
    })),
    timestamp: now
  });
}

// Initialize the single persistent MMO world
function initializePersistentMMOWorld() {
  console.log('🌍 MMO: Initializing persistent world...');

  mmoWorld = {
    id: MMO_WORLD_ID,
    players: new Map(),
    asteroids: new Map(),
    enemies: new Map(),
    bullets: [],
    worldWidth: MMO_CONFIG.worldWidth,
    worldHeight: MMO_CONFIG.worldHeight,
    createdAt: new Date().toISOString(),
    tickInterval: null,
    lastTick: Date.now(),
    asteroidWaveTime: null,
    enemyWaveTime: null
  };

  // Initial spawn of asteroids and enemies (immediate, no wave delay)
  for (let i = 0; i < MMO_CONFIG.maxAsteroids; i++) {
    const asteroid = spawnMMOAsteroid(mmoWorld);
    mmoWorld.asteroids.set(asteroid.id, asteroid);
  }
  for (let i = 0; i < MMO_CONFIG.maxEnemies; i++) {
    const enemy = spawnMMOEnemy(mmoWorld);
    mmoWorld.enemies.set(enemy.id, enemy);
  }

  // Start the game tick loop (runs forever)
  mmoWorld.tickInterval = setInterval(() => {
    mmoGameTick(mmoWorld);
  }, MMO_CONFIG.tickRate);

  console.log(`🌍 MMO: Persistent world initialized with ${mmoWorld.asteroids.size} asteroids and ${mmoWorld.enemies.size} enemies`);
  console.log(`🌍 MMO: World is always active - players can join anytime (max ${MMO_CONFIG.maxPlayers})`);
}

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

    // Clean up MMO world if player was in it
    if (socket.inMMOWorld && mmoWorld) {
      const player = mmoWorld.players.get(socket.id);
      mmoWorld.players.delete(socket.id);

      io.to('mmo-world').emit('mmo-player-left', {
        playerId: socket.id,
        playerName: player?.name
      });

      console.log(`🌍 MMO: Player ${player?.name || socket.id} disconnected (${mmoWorld.players.size}/${MMO_CONFIG.maxPlayers})`);
    }

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
    // Handle both database sessions (sessionId) and simple sessions (currentSession)
    const activeSession = socket.sessionId || socket.currentSession;
    
    if (!activeSession) {
      console.log(`🎮 SERVER: Rejecting player-state-update - no active session for socket ${socket.id}`);
      return;
    }
    
    // For database sessions, validate data.sessionId matches
    // For simple sessions, just use the active session
    const isValidSession = socket.sessionId ? (data.sessionId === socket.sessionId) : !!socket.currentSession;
    
    if (isValidSession) {
      const roomSize = io.sockets.adapter.rooms.get(activeSession)?.size || 0;
      console.log(`🎮 SERVER: Broadcasting player-state-update from ${data.playerId} to session ${activeSession} (${roomSize} clients in room)`);
      socket.to(activeSession).emit('player-state-update', data);
    } else {
      console.log(`🎮 SERVER: Rejecting player-state-update - session validation failed. Socket session: ${activeSession}, data session: ${data.sessionId}`);
    }
  });

  socket.on('game-state-update', (data) => {
    // Broadcast game state from host to other players in the session
    // Handle both database sessions (sessionId) and simple sessions (currentSession)
    const activeSession = socket.sessionId || socket.currentSession;
    
    if (!activeSession) {
      console.log(`🌍 SERVER: Rejecting game-state-update - no active session for socket ${socket.id}`);
      return;
    }
    
    // For database sessions, validate data.sessionId matches
    // For simple sessions, just use the active session
    const isValidSession = socket.sessionId ? (data.sessionId === socket.sessionId) : !!socket.currentSession;
    
    if (isValidSession) {
      const roomSize = io.sockets.adapter.rooms.get(activeSession)?.size || 0;
      console.log(`🌍 SERVER: Broadcasting game-state-update to session ${activeSession} (${roomSize} clients in room):`, {
        asteroids: data.asteroids?.length || 0,
        enemies: data.enemies?.length || 0,
        bullets: data.bullets?.length || 0,
        level: data.level,
        score: data.score
      });
      io.to(activeSession).emit('game-state-update', data);
    } else {
      console.log(`🌍 SERVER: Rejecting game-state-update - session validation failed. Socket session: ${activeSession}, data session: ${data.sessionId}`);
    }
  });

  socket.on('lives-update', (data) => {
    // Broadcast shared lives update to other players in the session
    const activeSession = socket.sessionId || socket.currentSession;
    const isValidSession = socket.sessionId ? (data.sessionId === socket.sessionId) : !!socket.currentSession;
    
    if (activeSession && isValidSession) {
      socket.to(activeSession).emit('lives-update', data);
    }
  });

  socket.on('game-over', (data) => {
    // Broadcast game over to all players in the session
    const activeSession = socket.sessionId || socket.currentSession;
    const isValidSession = socket.sessionId ? (data.sessionId === socket.sessionId) : !!socket.currentSession;
    
    if (activeSession && isValidSession) {
      io.to(activeSession).emit('game-over', data);
    }
  });

  socket.on('level-complete', (data) => {
    // Broadcast level completion to all players in the session
    const activeSession = socket.sessionId || socket.currentSession;
    const isValidSession = socket.sessionId ? (data.sessionId === socket.sessionId) : !!socket.currentSession;
    
    if (activeSession && isValidSession) {
      socket.to(activeSession).emit('level-complete', data);
    }
  });

  // Basic connection test
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Simple session join for minimal test (no database)
  socket.on('join-simple-session', (sessionId) => {
    // CRITICAL FIX: Prevent unnecessary re-joining of the same session
    if (socket.currentSession === sessionId) {
      console.log(`🎮 Socket ${socket.id} already in session ${sessionId}, skipping re-join`);
      // Just send confirmation without leaving/rejoining
      socket.emit('session-joined', {
        sessionId: sessionId,
        playerId: socket.id,
        playerCount: io.sockets.adapter.rooms.get(sessionId)?.size || 0
      });
      return;
    }

    console.log(`🎮 Socket ${socket.id} joining simple session: ${sessionId}`);

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
    console.log(`🎮 Socket ${socket.id} joined simple session ${sessionId} (${roomSize} players in room)`);
    
    // Create session if it doesn't exist (for when server restarts)
    if (!simpleSessions.has(sessionId)) {
      console.log(`🎮 Creating session ${sessionId} on-the-fly (server may have restarted)`);
      simpleSessions.set(sessionId, {
        id: sessionId,
        hostPlayerId: socket.id, // First joiner becomes host
        maxPlayers: 2,
        currentPlayers: roomSize,
        gameState: 'waiting',
        worldWidth: 2000,
        worldHeight: 1500,
        createdAt: new Date().toISOString()
      });
    } else {
      // Update session player count
      const session = simpleSessions.get(sessionId);
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
  
  // Handle ship design data sharing (from working demo)
  socket.on('player-ship-data', (data) => {
    if (!socket.currentSession) return;
    
    console.log(`🚢 SERVER: Broadcasting ship data from ${socket.id}`);
    
    // Add player ID and broadcast to other players in session
    const shipData = {
      ...data,
      playerId: socket.id,
      timestamp: Date.now()
    };
    
    socket.to(socket.currentSession).emit('player-ship-data', shipData);
  });
  
  // Handle request for ship data (for new players joining)
  socket.on('request-ship-data', (data) => {
    if (!socket.currentSession) return;
    
    console.log(`🔄 SERVER: Requesting ship data for new player ${data.newPlayerId}`);
    
    // Ask all players in session to send their ship data
    socket.to(socket.currentSession).emit('request-ship-data', {
      newPlayerId: data.newPlayerId
    });
  });
  
  // Handle player shooting (deterministic approach - just relay the action)
  socket.on('player-shoot', (data) => {
    if (!socket.currentSession) {
      console.log(`🔫 WARNING: Player ${socket.id} tried to shoot but has no session`);
      return;
    }
    
    console.log(`🔫 SERVER: Player ${socket.id} shooting in session ${socket.currentSession}`);
    
    // Add player ID and relay the shooting action to other players
    const shootData = {
      ...data,
      playerId: socket.id
    };
    
    // Get room info for debugging
    const room = io.sockets.adapter.rooms.get(socket.currentSession);
    const roomSize = room ? room.size : 0;
    console.log(`🔫 SERVER: Broadcasting shoot to ${roomSize - 1} other players in session ${socket.currentSession}`);
    
    socket.to(socket.currentSession).emit('player-shoot', shootData);
  });
  
  // Handle collision events (host-authoritative)
  socket.on('bullet-hit', (data) => {
    if (!socket.currentSession) return;
    
    // Relay collision event to all players in session
    io.to(socket.currentSession).emit('bullet-hit', {
      ...data,
      fromPlayer: socket.id
    });
  });
  
  // Handle asteroid spawning (host broadcasts to clients)
  socket.on('asteroid-spawn', (data) => {
    if (!socket.currentSession) return;
    
    console.log(`🌑 SERVER: Broadcasting asteroid spawn to session ${socket.currentSession}`);
    socket.to(socket.currentSession).emit('asteroid-spawn', data);
  });
  
  // Handle enemy updates (host broadcasts to clients)
  socket.on('enemies-update', (data) => {
    if (!socket.currentSession) return;
    
    // Broadcast enemy states to other players
    socket.to(socket.currentSession).emit('enemies-update', data);
  });
  
  // Handle enemy shooting (host broadcasts to clients)
  socket.on('enemy-shoot', (data) => {
    if (!socket.currentSession) return;
    
    console.log(`💥 SERVER: Enemy ${data.enemyId} shooting`);
    socket.to(socket.currentSession).emit('enemy-shoot', data);
  });
  
  // Handle mathematical objects spawn (formula-based synchronization)
  socket.on('math-objects-spawn', (data, callback) => {
    if (!socket.currentSession) {
      if (callback) callback(false);
      return;
    }
    
    console.log(`🧮 SERVER: Broadcasting mathematical objects to session ${socket.currentSession}`);
    console.log(`🧮 SERVER: Asteroid data:`, data.asteroid ? `ID: ${data.asteroid.id}` : 'No asteroid');
    
    // Broadcast to all other clients in the session
    socket.to(socket.currentSession).emit('math-objects-spawn', data);
    
    // Send acknowledgment back to sender
    if (callback) {
      callback(true);
      console.log(`🧮 SERVER: Sent acknowledgment for mathematical objects spawn`);
    }
  });
  
  // Handle mathematical objects destruction (synchronization)
  socket.on('math-objects-destroyed', (data) => {
    if (!socket.currentSession) return;
    
    console.log(`💥 SERVER: Broadcasting ${data.type} ${data.id} destruction to session ${socket.currentSession}`);
    socket.to(socket.currentSession).emit('math-objects-destroyed', data);
  });
  
  // Handle ship collision events (synchronization)
  socket.on('ship-collision', (data) => {
    if (!socket.currentSession) return;

    console.log(`🚢 SERVER: Broadcasting ship collision to session ${socket.currentSession}`);
    // Broadcast to ALL clients in the session, including the sender
    io.to(socket.currentSession).emit('ship-collision', data);
  });

  // Handle round transitions (multiplayer round progression)
  socket.on('round-transition', (data) => {
    const activeSession = socket.sessionId || socket.currentSession;
    if (!activeSession) {
      console.log('🏆 SERVER: Rejecting round-transition - no active session');
      return;
    }

    console.log(`🏆 SERVER: Broadcasting round transition to Round ${data.round} in session ${activeSession}`);
    // Broadcast to all other clients in the session
    socket.to(activeSession).emit('round-transition', data);
  });

  // Handle multiplayer game completion (all 10 rounds finished)
  socket.on('multiplayer-game-complete', (data) => {
    const activeSession = socket.sessionId || socket.currentSession;
    if (!activeSession) {
      console.log('🎉 SERVER: Rejecting game-complete - no active session');
      return;
    }

    console.log(`🎉 SERVER: Broadcasting game completion (Round ${data.finalRound}) to session ${activeSession}`);
    // Broadcast to all other clients in the session
    socket.to(activeSession).emit('multiplayer-game-complete', data);
  });

  // Handle CPU enemy spawn (multiplayer)
  socket.on('enemy-spawn', (data) => {
    const activeSession = socket.sessionId || socket.currentSession;
    if (!activeSession) return;

    console.log(`👾 SERVER: Broadcasting enemy spawn ${data.id} in session ${activeSession}`);
    socket.to(activeSession).emit('enemy-spawn', data);
  });

  // Handle CPU enemy state updates (multiplayer)
  socket.on('enemy-state-update', (data) => {
    const activeSession = socket.sessionId || socket.currentSession;
    if (!activeSession) return;

    socket.to(activeSession).emit('enemy-state-update', data);
  });

  // Handle CPU enemy shooting (multiplayer)
  socket.on('enemy-shoot', (data) => {
    const activeSession = socket.sessionId || socket.currentSession;
    if (!activeSession) return;

    socket.to(activeSession).emit('enemy-shoot', data);
  });

  // Handle CPU enemy destroyed (multiplayer)
  socket.on('enemy-destroyed', (data) => {
    const activeSession = socket.sessionId || socket.currentSession;
    if (!activeSession) return;

    console.log(`👾 SERVER: Broadcasting enemy destroyed ${data.id} in session ${activeSession}`);
    socket.to(activeSession).emit('enemy-destroyed', data);
  });

  // Handle ship explosion (for syncing explosion effects)
  socket.on('ship-explosion', (data) => {
    const activeSession = socket.sessionId || socket.currentSession;
    if (!activeSession) return;

    console.log(`💥 SERVER: Broadcasting ship explosion for player ${data.playerId} in session ${activeSession}`);
    socket.to(activeSession).emit('ship-explosion', data);
  });

  // ============================================
  // MMO PERSISTENT WORLD SOCKET EVENTS
  // ============================================

  // Join MMO world (single persistent world)
  socket.on('mmo-join', (data) => {
    const { playerData } = data;

    if (!mmoWorld) {
      socket.emit('mmo-join-error', { error: 'MMO world not initialized' });
      return;
    }

    if (mmoWorld.players.size >= MMO_CONFIG.maxPlayers) {
      socket.emit('mmo-join-error', { error: 'World full (max 5 players)' });
      return;
    }

    // Leave if already in MMO world (reconnecting)
    if (socket.inMMOWorld) {
      mmoWorld.players.delete(socket.id);
    }

    // Create player object
    const player = {
      id: socket.id,
      name: playerData?.name || `Pilot_${socket.id.slice(-4)}`,
      score: 0,
      x: mmoWorld.worldWidth / 2 + (Math.random() - 0.5) * 300,
      y: mmoWorld.worldHeight / 2 + (Math.random() - 0.5) * 300,
      angle: Math.random() * Math.PI * 2,
      vx: 0,
      vy: 0,
      dead: false,
      respawnTime: 0,
      shipData: playerData?.shipData || null,
      lastUpdate: Date.now()
    };

    // Add player to world
    mmoWorld.players.set(socket.id, player);
    socket.join('mmo-world');
    socket.inMMOWorld = true;

    console.log(`🌍 MMO: Player ${player.name} joined world (${mmoWorld.players.size}/${MMO_CONFIG.maxPlayers})`);

    // Send current state to new player
    socket.emit('mmo-join-success', {
      player,
      sessionId: MMO_WORLD_ID,
      worldBounds: { width: mmoWorld.worldWidth, height: mmoWorld.worldHeight },
      asteroids: Array.from(mmoWorld.asteroids.values()),
      enemies: Array.from(mmoWorld.enemies.values()),
      players: Array.from(mmoWorld.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        angle: p.angle,
        score: p.score,
        dead: p.dead,
        shipData: p.shipData
      })),
      highestScore: getMMOHighestScore(mmoWorld)
    });

    // Notify other players
    socket.to('mmo-world').emit('mmo-player-joined', {
      playerId: socket.id,
      playerName: player.name,
      x: player.x,
      y: player.y,
      angle: player.angle,
      shipData: player.shipData
    });
  });

  // Leave MMO world
  socket.on('mmo-leave', () => {
    if (socket.inMMOWorld && mmoWorld) {
      const player = mmoWorld.players.get(socket.id);
      mmoWorld.players.delete(socket.id);

      socket.to('mmo-world').emit('mmo-player-left', {
        playerId: socket.id,
        playerName: player?.name
      });

      console.log(`🌍 MMO: Player ${player?.name || socket.id} left world (${mmoWorld.players.size}/${MMO_CONFIG.maxPlayers})`);

      socket.leave('mmo-world');
      socket.inMMOWorld = false;
    }
  });

  // MMO player position/state update
  socket.on('mmo-player-update', (data) => {
    if (!socket.inMMOWorld || !mmoWorld) return;

    const player = mmoWorld.players.get(socket.id);
    if (!player) return;

    // Update player state
    player.x = data.x;
    player.y = data.y;
    player.angle = data.angle;
    player.vx = data.vx || 0;
    player.vy = data.vy || 0;
    player.lastUpdate = Date.now();
  });

  // MMO player shoot
  socket.on('mmo-shoot', (data) => {
    if (!socket.inMMOWorld || !mmoWorld) return;

    const player = mmoWorld.players.get(socket.id);
    if (!player || player.dead) return;

    // Create bullet on server
    const bulletSpeed = 15; // Increased from 8 for longer range
    const bullet = {
      id: `bullet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      playerId: socket.id,
      x: data.x,
      y: data.y,
      vx: Math.cos(data.angle) * bulletSpeed,
      vy: Math.sin(data.angle) * bulletSpeed,
      createdAt: Date.now()
    };

    mmoWorld.bullets.push(bullet);
    console.log(`🔫 MMO: Bullet created at (${bullet.x.toFixed(0)}, ${bullet.y.toFixed(0)}), total bullets: ${mmoWorld.bullets.length}`);

    // Broadcast bullet to all players (including shooter for visual)
    io.to('mmo-world').emit('mmo-bullet-fired', {
      bullet,
      playerId: socket.id
    });
  });

  // MMO player death (hit by enemy/asteroid)
  socket.on('mmo-player-died', () => {
    if (!socket.inMMOWorld || !mmoWorld) return;

    const player = mmoWorld.players.get(socket.id);
    if (!player) return;

    player.dead = true;
    player.respawnTime = Date.now() + 3000; // 3 second respawn

    // Broadcast death
    io.to('mmo-world').emit('mmo-player-died', {
      playerId: socket.id,
      x: player.x,
      y: player.y
    });

    // Schedule respawn
    setTimeout(() => {
      if (mmoWorld && mmoWorld.players.has(socket.id)) {
        const p = mmoWorld.players.get(socket.id);
        p.dead = false;
        p.x = mmoWorld.worldWidth / 2 + (Math.random() - 0.5) * 300;
        p.y = mmoWorld.worldHeight / 2 + (Math.random() - 0.5) * 300;

        socket.emit('mmo-respawn', {
          x: p.x,
          y: p.y,
          angle: Math.random() * Math.PI * 2
        });

        socket.to('mmo-world').emit('mmo-player-respawned', {
          playerId: socket.id,
          x: p.x,
          y: p.y
        });
      }
    }, 3000);
  });

  // MMO ship collision (player hit asteroid or enemy)
  socket.on('mmo-ship-collision', (data) => {
    if (!socket.inMMOWorld || !mmoWorld) return;

    console.log('💥 MMO: Ship collision event received:', data);

    if (data.type === 'asteroid') {
      const asteroid = mmoWorld.asteroids.get(data.objectId);
      if (asteroid) {
        console.log('💥 MMO: Destroying asteroid from ship collision:', data.objectId);
        mmoWorld.asteroids.delete(data.objectId);

        // Broadcast destruction
        io.to('mmo-world').emit('mmo-asteroid-destroyed', {
          asteroidId: data.objectId,
          destroyedBy: socket.id,
          x: data.x,
          y: data.y
        });
      }
    } else if (data.type === 'enemy') {
      const enemy = mmoWorld.enemies.get(data.objectId);
      if (enemy) {
        console.log('💥 MMO: Destroying enemy from ship collision:', data.objectId);
        mmoWorld.enemies.delete(data.objectId);

        // Broadcast destruction
        io.to('mmo-world').emit('mmo-enemy-destroyed', {
          enemyId: data.objectId,
          destroyedBy: socket.id,
          x: data.x,
          y: data.y
        });
      }
    }
  });

  // MMO bullet hit (client-side collision detection reports hit)
  socket.on('mmo-bullet-hit', (data) => {
    if (!socket.inMMOWorld || !mmoWorld) return;

    console.log('💥 MMO: Bullet hit event received:', data);

    const player = mmoWorld.players.get(socket.id);

    if (data.type === 'asteroid') {
      const asteroid = mmoWorld.asteroids.get(data.objectId);
      if (asteroid) {
        console.log('💥 MMO: Destroying asteroid from bullet hit:', data.objectId);

        // Award points
        if (player) {
          const points = (4 - (asteroid.size || 2)) * 100;
          player.score += points;
          console.log(`💥 MMO: Awarding ${points} points to ${player.name}, score=${player.score}`);

          io.to('mmo-world').emit('mmo-score-update', {
            playerId: socket.id,
            score: player.score,
            delta: points
          });

          broadcastMMOHighestScore(mmoWorld);
        }

        mmoWorld.asteroids.delete(data.objectId);

        // Broadcast destruction to ALL clients (including shooter for debris animation)
        io.to('mmo-world').emit('mmo-asteroid-destroyed', {
          asteroidId: data.objectId,
          destroyedBy: socket.id,
          x: data.x,
          y: data.y
        });
      }
    } else if (data.type === 'enemy') {
      const enemy = mmoWorld.enemies.get(data.objectId);
      if (enemy) {
        console.log('💥 MMO: Enemy hit by bullet:', data.objectId);
        enemy.health = (enemy.health || 3) - 1;

        // Broadcast hit feedback to shooter for visual effect
        socket.emit('mmo-enemy-hit', {
          enemyId: data.objectId,
          health: enemy.health,
          x: data.x,
          y: data.y
        });

        if (enemy.health <= 0) {
          console.log('💥 MMO: Enemy destroyed by bullet hit:', data.objectId);

          // Award points
          if (player) {
            player.score += 500;
            console.log(`💥 MMO: Awarding 500 points to ${player.name}, score=${player.score}`);

            io.to('mmo-world').emit('mmo-score-update', {
              playerId: socket.id,
              score: player.score,
              delta: 500
            });

            broadcastMMOHighestScore(mmoWorld);
          }

          mmoWorld.enemies.delete(data.objectId);

          // Broadcast destruction to ALL clients (including shooter for debris animation)
          io.to('mmo-world').emit('mmo-enemy-destroyed', {
            enemyId: data.objectId,
            destroyedBy: socket.id,
            x: data.x,
            y: data.y
          });
        }
      }
    }
  });

  // MMO ship data sharing
  socket.on('mmo-ship-data', (data) => {
    if (!socket.inMMOWorld || !mmoWorld) return;

    const player = mmoWorld.players.get(socket.id);
    if (player) {
      player.shipData = data.shipData;
    }

    // Broadcast to other players
    socket.to('mmo-world').emit('mmo-ship-data', {
      playerId: socket.id,
      shipData: data.shipData
    });
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

// Admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Sync database and start server
db.sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database connected and synced successfully');
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

      // Initialize the persistent MMO world
      initializePersistentMMOWorld();

      // Start periodic session cleanup
      startSessionCleanup();
    });
}