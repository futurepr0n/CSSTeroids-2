const express = require('express');
const router = express.Router();
const { GameSession, SessionPlayer } = require('../models');
const db = require('../models');

// Create a new multiplayer session
router.post('/create-session', async (req, res) => {
    try {
        const sessionId = Math.random().toString(36).substring(2, 15);
        const hostPlayerId = req.body.playerId || 'anonymous_' + Math.random().toString(36).substring(2, 8);
        
        const session = await GameSession.create({
            sessionId,
            hostPlayerId,
            maxPlayers: req.body.maxPlayers || 3,
            currentPlayers: 0, // Will be incremented when socket joins
            worldWidth: req.body.worldWidth || 2000,
            worldHeight: req.body.worldHeight || 1500
        });

        res.json({
            success: true,
            session: {
                id: session.sessionId,
                hostPlayerId: session.hostPlayerId,
                maxPlayers: session.maxPlayers,
                currentPlayers: session.currentPlayers,
                gameState: session.gameState,
                worldWidth: session.worldWidth,
                worldHeight: session.worldHeight
            }
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ success: false, error: 'Failed to create session' });
    }
});

// Join an existing session
router.post('/join-session', async (req, res) => {
    try {
        const { sessionId, playerId, playerName, shipPassphrase } = req.body;

        // Use transaction to prevent race conditions
        const result = await db.sequelize.transaction(async (t) => {
            const session = await GameSession.findOne({ 
                where: { sessionId },
                transaction: t,
                lock: true // Lock the session row
            });
            
            if (!session) {
                throw new Error('Session not found');
            }

            // Allow joining sessions that are waiting OR playing (for late joiners)
            if (session.gameState !== 'waiting' && session.gameState !== 'playing') {
                throw new Error('Cannot join this session');
            }

            // Check current player count accurately
            const currentPlayerCount = await SessionPlayer.count({ 
                where: { sessionId },
                transaction: t 
            });

            if (currentPlayerCount >= session.maxPlayers) {
                throw new Error('Session is full');
            }

            // Check if player already in session
            const existingPlayer = await SessionPlayer.findOne({
                where: { sessionId, playerId },
                transaction: t
            });

            if (existingPlayer) {
                throw new Error('Player already in session');
            }

            // Add player to session
            await SessionPlayer.create({
                sessionId,
                playerId,
                playerName: playerName || 'Anonymous',
                shipPassphrase
            }, { transaction: t });

            // Update session player count with accurate count
            const newPlayerCount = currentPlayerCount + 1;
            await session.update({
                currentPlayers: newPlayerCount
            }, { transaction: t });

            return {
                id: session.sessionId,
                currentPlayers: newPlayerCount,
                maxPlayers: session.maxPlayers,
                gameState: session.gameState
            };
        });

        res.json({
            success: true,
            session: result
        });
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to join session' });
    }
});

// Get session details
router.get('/session/:sessionId', async (req, res) => {
    try {
        const session = await GameSession.findOne({
            where: { sessionId: req.params.sessionId },
            include: [{
                model: SessionPlayer,
                as: 'players'
            }]
        });

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({
            success: true,
            session: {
                id: session.sessionId,
                hostPlayerId: session.hostPlayerId,
                maxPlayers: session.maxPlayers,
                currentPlayers: session.currentPlayers,
                gameState: session.gameState,
                worldWidth: session.worldWidth,
                worldHeight: session.worldHeight,
                level: session.level,
                score: session.score,
                players: session.players || []
            }
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ success: false, error: 'Failed to get session' });
    }
});

// Leave session
router.post('/leave-session', async (req, res) => {
    try {
        const { sessionId, playerId } = req.body;

        const session = await GameSession.findOne({ where: { sessionId } });
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Use transaction for atomic operations
        await db.sequelize.transaction(async (t) => {
            // Remove player from session
            const deleted = await SessionPlayer.destroy({
                where: { sessionId, playerId },
                transaction: t
            });

            if (deleted) {
                // Get accurate player count after deletion
                const remainingPlayers = await SessionPlayer.count({
                    where: { sessionId },
                    transaction: t
                });

                // Update session player count
                await session.update({
                    currentPlayers: remainingPlayers
                }, { transaction: t });

                // If no players left, clean up session
                if (remainingPlayers === 0) {
                    await GameSession.destroy({ 
                        where: { sessionId },
                        transaction: t 
                    });
                }
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error leaving session:', error);
        res.status(500).json({ success: false, error: 'Failed to leave session' });
    }
});

// List available sessions
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await GameSession.findAll({
            where: {
                gameState: ['waiting', 'playing'] // Allow both waiting and playing sessions
            },
            include: [{
                model: SessionPlayer,
                as: 'players'
            }]
        });

        // Reconcile session player counts with actual player records
        const availableSessions = [];
        
        for (const session of sessions) {
            const actualPlayerCount = await SessionPlayer.count({ 
                where: { sessionId: session.sessionId } 
            });
            
            // Update session if count is wrong
            if (actualPlayerCount !== session.currentPlayers) {
                await session.update({ currentPlayers: actualPlayerCount });
                console.log(`Reconciled session ${session.sessionId}: ${session.currentPlayers} -> ${actualPlayerCount} players`);
            }
            
            // Only include sessions with available slots
            if (actualPlayerCount < session.maxPlayers) {
                availableSessions.push({
                    id: session.sessionId,
                    hostPlayerId: session.hostPlayerId,
                    currentPlayers: actualPlayerCount,
                    maxPlayers: session.maxPlayers,
                    gameState: session.gameState,
                    worldWidth: session.worldWidth,
                    worldHeight: session.worldHeight,
                    createdAt: session.createdAt
                });
            }
        }

        res.json({
            success: true,
            sessions: availableSessions
        });
    } catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ success: false, error: 'Failed to list sessions' });
    }
});

// Manual cleanup endpoint for debugging
router.post('/cleanup', async (req, res) => {
    try {
        // Delete all sessions and players
        const playersDeleted = await SessionPlayer.destroy({ where: {} });
        const sessionsDeleted = await GameSession.destroy({ where: {} });
        
        console.log(`Manual cleanup: Deleted ${playersDeleted} players and ${sessionsDeleted} sessions`);
        
        res.json({
            success: true,
            message: `Cleaned up ${sessionsDeleted} sessions and ${playersDeleted} players`
        });
    } catch (error) {
        console.error('Error in manual cleanup:', error);
        res.status(500).json({ success: false, error: 'Failed to cleanup' });
    }
});

module.exports = router;