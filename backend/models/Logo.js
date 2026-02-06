const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Logo = sequelize.define('Logo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  svgContent: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'logos',
  timestamps: true
});

module.exports = Logo;
