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
  },
  items: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('items');
      return raw ? JSON.parse(raw) : null;
    },
    set(value) {
      this.setDataValue('items', value ? JSON.stringify(value) : null);
    }
  },
  pickupDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  pickupTime: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      is: /^([01]\d|2[0-3]):[0-5]\d$/
    }
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
