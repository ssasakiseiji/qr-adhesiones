const sequelize = require('../config/database');
const User = require('./User');
const Activity = require('./Activity');
const Voucher = require('./Voucher');
const Logo = require('./Logo');

// Define associations
Activity.hasMany(Voucher, {
  foreignKey: 'activityId',
  as: 'vouchers',
  onDelete: 'CASCADE'
});

Voucher.belongsTo(Activity, {
  foreignKey: 'activityId',
  as: 'activity'
});

Activity.belongsTo(Logo, {
  foreignKey: 'templateLogoId',
  as: 'templateLogo',
  onDelete: 'SET NULL'
});

Logo.hasMany(Activity, {
  foreignKey: 'templateLogoId',
  as: 'activities'
});

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    await sequelize.sync({ alter: true });
    console.log('✓ Database models synchronized.');
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Activity,
  Voucher,
  Logo,
  syncDatabase
};
