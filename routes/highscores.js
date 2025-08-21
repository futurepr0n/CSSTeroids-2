// routes/highscores.js
const express = require('express');
const router = express.Router();
const { HighScore } = require('../models');

// GET all high scores, sorted by score
router.get('/', async (req, res) => {
  try {
    const highScores = await HighScore.findAll({
      order: [['score', 'DESC']],
      limit: 10
    });
    
    res.json(highScores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new high score
router.post('/', async (req, res) => {
  try {
    const scoreData = req.body;
    
    if (!scoreData || !scoreData.score) {
      return res.status(400).json({ message: 'Score data is required' });
    }
    
    // Create new high score entry
    const newScore = await HighScore.create({
      name: scoreData.name || 'Anonymous',
      score: scoreData.score,
      shipType: scoreData.shipType,
      shipColor: scoreData.shipColor,
      shipPassphrase: scoreData.shipPassphrase,
      date: new Date()
    });
    
    // Get all high scores sorted by score
    const allScores = await HighScore.findAll({
      order: [['score', 'DESC']]
    });
    
    // Keep only top 10
    if (allScores.length > 10) {
      // Find scores to delete (scores after the 10th position)
      const scoresToDelete = allScores.slice(10);
      for (const score of scoresToDelete) {
        await score.destroy();
      }
    }
    
    res.status(201).json(newScore);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;