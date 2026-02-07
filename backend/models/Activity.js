const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  templateTitle: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  templateProductName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  templateBgColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#1e293b',
    validate: {
      is: /^#[0-9A-Fa-f]{6}$/
    }
  },
  templateBgColor2: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: null,
    validate: {
      is: /^#[0-9A-Fa-f]{6}$/
    }
  },
  templateTextColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#ffffff',
    validate: {
      isIn: [['#ffffff', '#000000']]
    }
  },
  templateLogoSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 180,
    validate: {
      isIn: [[100, 140, 180, 220, 260]]
    }
  },
  templateLogoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'logos',
      key: 'id'
    }
  },
  pickupDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  pickupStartTime: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      is: /^([01]\d|2[0-3]):[0-5]\d$/
    }
  },
  pickupEndTime: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      is: /^([01]\d|2[0-3]):[0-5]\d$/
    }
  },
  finishedAt: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'activities',
  timestamps: true
});

module.exports = Activity;
