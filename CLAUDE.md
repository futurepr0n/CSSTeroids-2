# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- `npm start` - Start the server on port 6161 (or PORT env var)
- `npm run dev` - Start with nodemon for auto-restart during development
- `npm run setup` - Initialize the MySQL database (required before first run)

### Database Setup
Before running the application for the first time:
1. Configure database connection in `.env` file with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
2. Run `npm run setup` to create the database
3. Then use `npm start` or `npm run dev`

## Architecture

### Technology Stack
- **Backend**: Node.js/Express server with MySQL database using Sequelize ORM
- **Frontend**: Vanilla JavaScript HTML5 Canvas game with ship customization
- **Database**: MySQL with two main tables (Ships and HighScores)

### Core Application Structure

**Server-side (Node.js/Express)**:
- `server.js` - Main Express server setup with CORS, static file serving
- `models/` - Sequelize models with automatic loading via `models/index.js`
  - `Ship.js` - Ship model with JSON fields for customLines, thrusterPoints, weaponPoints
  - `HighScore.js` - High score tracking
- `routes/` - API endpoints for ships and high scores
- `utils/helpers.js` - Server-side utility functions

**Client-side Architecture**:
- `public/js/main.js` - Main initialization, API functions, localStorage management
- `public/js/core/` - Core game engine files (game.js, menu.js, utils.js, mobile-controls.js)
- `public/js/entities/` - Game entities (ship.js, asteroid.js, bullet.js, enemy.js, debris.js)
- `public/js/ship-customizer/` - Complete ship customization system
  - `core/` - Initialization and settings management
  - `drawing/` - Canvas drawing, grid, preview modes
  - `interaction/` - User interaction handlers for colors, design, thrusters, weapons

### Key Features
- **Asteroids Game**: Classic arcade game with customizable ships
- **Ship Customizer**: Visual ship designer with drawing canvas, color picker, thruster/weapon placement
- **Database Persistence**: Ships saved with unique passphrases, high scores tracked
- **Mobile Support**: Touch controls and responsive design

### Data Flow
1. Ship designs created in customizer are stored as JSON arrays (customLines, thrusterPoints, weaponPoints)
2. Ships saved to MySQL via API with unique passphrase for retrieval
3. Game loads ship data from localStorage or server API
4. High scores submitted to server after game completion

### Important Implementation Details
- JSON fields in Ship model use custom getters/setters for proper serialization
- Ship data synchronized between localStorage and server
- Canvas-based drawing system for both game and ship customizer
- URL parameters supported for loading ships by passphrase
- Mobile-first responsive design with touch controls