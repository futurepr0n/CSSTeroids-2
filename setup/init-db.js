const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create connection to MySQL server (without database)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    
    const dbName = process.env.DB_NAME || 'asteroids_game';
    
    // Create database if it doesn't exist
    console.log(`Creating database ${dbName} if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName};`);
    console.log(`Database ${dbName} created or already exists.`);
    
    // Use the database
    await connection.query(`USE ${dbName};`);
    
    // Create multiplayer tables
    console.log('Creating multiplayer tables...');
    
    // GameSessions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(50) UNIQUE NOT NULL,
        host_player_id VARCHAR(100),
        max_players INT DEFAULT 3,
        current_players INT DEFAULT 0,
        game_state ENUM('waiting', 'playing', 'paused', 'completed') DEFAULT 'waiting',
        world_width INT DEFAULT 2000,
        world_height INT DEFAULT 1500,
        level INT DEFAULT 1,
        score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log('GameSessions table created or already exists.');
    
    // SessionPlayers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS session_players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(50) NOT NULL,
        player_id VARCHAR(100) NOT NULL,
        player_name VARCHAR(100),
        ship_passphrase VARCHAR(100),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_id (session_id),
        INDEX idx_ship_passphrase (ship_passphrase)
      );
    `);
    console.log('SessionPlayers table created or already exists.');
    
    // Close the connection
    await connection.end();
    
    console.log('Database initialization completed successfully.');
    console.log('Now you can run "npm start" to start the server.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization function
initializeDatabase();