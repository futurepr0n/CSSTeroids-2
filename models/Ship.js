// models/Ship.js
module.exports = (sequelize, DataTypes) => {
  const Ship = sequelize.define('Ship', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('custom', 'default', 'triangle', 'diamond'),
      defaultValue: 'custom'
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: 'white'
    },
    customLines: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('customLines');
        if (!rawValue) return [];
        
        try {
          // If it's already a string, parse it
          if (typeof rawValue === 'string') {
            return JSON.parse(rawValue);
          }
          // If it's already an object, return it
          if (typeof rawValue === 'object') {
            return rawValue;
          }
          return [];
        } catch (error) {
          console.error('Error parsing customLines JSON:', error);
          return [];
        }
      },
      set(value) {
        try {
          if (value === null || value === undefined) {
            this.setDataValue('customLines', '[]');
            return;
          }
          
          // If it's already a string, make sure it's valid JSON
          if (typeof value === 'string') {
            try {
              // Validate it's parsable
              JSON.parse(value);
              this.setDataValue('customLines', value);
            } catch (e) {
              console.error('Invalid JSON string for customLines:', e);
              this.setDataValue('customLines', '[]');
            }
            return;
          }
          
          // If it's an object, stringify it
          if (typeof value === 'object') {
            this.setDataValue('customLines', JSON.stringify(value));
            return;
          }
          
          // Default to empty array
          this.setDataValue('customLines', '[]');
        } catch (error) {
          console.error('Error setting customLines JSON:', error);
          this.setDataValue('customLines', '[]');
        }
      }
    },
    thrusterPoints: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('thrusterPoints');
        if (!rawValue) return [];
        
        try {
          // If it's already a string, parse it
          if (typeof rawValue === 'string') {
            return JSON.parse(rawValue);
          }
          // If it's already an object, return it
          if (typeof rawValue === 'object') {
            return rawValue;
          }
          return [];
        } catch (error) {
          console.error('Error parsing thrusterPoints JSON:', error);
          return [];
        }
      },
      set(value) {
        try {
          if (value === null || value === undefined) {
            this.setDataValue('thrusterPoints', '[]');
            return;
          }
          
          // If it's already a string, make sure it's valid JSON
          if (typeof value === 'string') {
            try {
              // Validate it's parsable
              JSON.parse(value);
              this.setDataValue('thrusterPoints', value);
            } catch (e) {
              console.error('Invalid JSON string for thrusterPoints:', e);
              this.setDataValue('thrusterPoints', '[]');
            }
            return;
          }
          
          // If it's an object, stringify it
          if (typeof value === 'object') {
            this.setDataValue('thrusterPoints', JSON.stringify(value));
            return;
          }
          
          // Default to empty array
          this.setDataValue('thrusterPoints', '[]');
        } catch (error) {
          console.error('Error setting thrusterPoints JSON:', error);
          this.setDataValue('thrusterPoints', '[]');
        }
      }
    },
    weaponPoints: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('weaponPoints');
        if (!rawValue) return [];
        
        try {
          // If it's already a string, parse it
          if (typeof rawValue === 'string') {
            return JSON.parse(rawValue);
          }
          // If it's already an object, return it
          if (typeof rawValue === 'object') {
            return rawValue;
          }
          return [];
        } catch (error) {
          console.error('Error parsing weaponPoints JSON:', error);
          return [];
        }
      },
      set(value) {
        try {
          if (value === null || value === undefined) {
            this.setDataValue('weaponPoints', '[]');
            return;
          }
          
          // If it's already a string, make sure it's valid JSON
          if (typeof value === 'string') {
            try {
              // Validate it's parsable
              JSON.parse(value);
              this.setDataValue('weaponPoints', value);
            } catch (e) {
              console.error('Invalid JSON string for weaponPoints:', e);
              this.setDataValue('weaponPoints', '[]');
            }
            return;
          }
          
          // If it's an object, stringify it
          if (typeof value === 'object') {
            this.setDataValue('weaponPoints', JSON.stringify(value));
            return;
          }
          
          // Default to empty array
          this.setDataValue('weaponPoints', '[]');
        } catch (error) {
          console.error('Error setting weaponPoints JSON:', error);
          this.setDataValue('weaponPoints', '[]');
        }
      }
    },
    passphrase: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true
  });

  // Custom toJSON method to ensure JSON fields are properly serialized
  Ship.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    
    // Ensure JSON fields are properly handled
    try {
      values.customLines = this.customLines || [];
      values.thrusterPoints = this.thrusterPoints || [];
      values.weaponPoints = this.weaponPoints || [];
    } catch (error) {
      console.error('Error in toJSON method:', error);
    }
    
    return values;
  };

  return Ship;
};