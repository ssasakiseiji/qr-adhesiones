const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Voucher = sequelize.define('Voucher', {
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
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  isRedeemed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  redeemedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'vouchers',
  timestamps: true,
  indexes: [
    {
      fields: ['activityId']
    },
    {
      fields: ['qrCode']
    },
    {
      fields: ['isRedeemed']
    }
  ]
});

module.exports = Voucher;
