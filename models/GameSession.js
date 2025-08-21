const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GameSession = sequelize.define('GameSession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        sessionId: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false,
            field: 'session_id'
        },
        hostPlayerId: {
            type: DataTypes.STRING(100),
            field: 'host_player_id'
        },
        maxPlayers: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
            field: 'max_players'
        },
        currentPlayers: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'current_players'
        },
        gameState: {
            type: DataTypes.ENUM('waiting', 'playing', 'paused', 'completed'),
            defaultValue: 'waiting',
            field: 'game_state'
        },
        worldWidth: {
            type: DataTypes.INTEGER,
            defaultValue: 2000,
            field: 'world_width'
        },
        worldHeight: {
            type: DataTypes.INTEGER,
            defaultValue: 1500,
            field: 'world_height'
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        score: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'updated_at'
        }
    }, {
        tableName: 'game_sessions',
        timestamps: true,
        underscored: true
    });

    GameSession.associate = function(models) {
        GameSession.hasMany(models.SessionPlayer, {
            foreignKey: 'sessionId',
            sourceKey: 'sessionId',
            as: 'players'
        });
    };

    return GameSession;
};