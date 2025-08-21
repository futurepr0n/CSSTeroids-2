const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SessionPlayer = sequelize.define('SessionPlayer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        sessionId: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'session_id'
        },
        playerId: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'player_id'
        },
        playerName: {
            type: DataTypes.STRING(100),
            field: 'player_name'
        },
        shipPassphrase: {
            type: DataTypes.STRING(100),
            field: 'ship_passphrase'
        },
        joinedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'joined_at'
        }
    }, {
        tableName: 'session_players',
        timestamps: false,
        underscored: true
    });

    SessionPlayer.associate = function(models) {
        SessionPlayer.belongsTo(models.GameSession, {
            foreignKey: 'sessionId',
            targetKey: 'sessionId',
            as: 'session'
        });
        
        SessionPlayer.belongsTo(models.Ship, {
            foreignKey: 'shipPassphrase',
            targetKey: 'passphrase',
            as: 'ship'
        });
    };

    return SessionPlayer;
};