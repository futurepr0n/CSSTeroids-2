// models/HighScore.js

module.exports = (sequelize, DataTypes) => {
    const HighScore = sequelize.define('HighScore', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Anonymous'
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      shipType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shipColor: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shipPassphrase: {
        type: DataTypes.STRING,
        allowNull: true
      },
      date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      timestamps: true
    });
  
    return HighScore;
  };