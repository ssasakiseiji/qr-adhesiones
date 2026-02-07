const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cost = sequelize.define('Cost', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  activityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activities',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 200]
    }
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'costs',
  timestamps: true
});

module.exports = Cost;
