const sequelize = require('../config/database');
const User = require('./User');
const Activity = require('./Activity');
const Voucher = require('./Voucher');
const Logo = require('./Logo');
const Product = require('./Product');
const Cost = require('./Cost');

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

Activity.hasMany(Product, {
  foreignKey: 'activityId',
  as: 'products',
  onDelete: 'CASCADE'
});

Product.belongsTo(Activity, {
  foreignKey: 'activityId',
  as: 'activity'
});

Activity.hasMany(Cost, {
  foreignKey: 'activityId',
  as: 'costs',
  onDelete: 'CASCADE'
});

Cost.belongsTo(Activity, {
  foreignKey: 'activityId',
  as: 'activity'
});

const runMigrations = async () => {
  try {
    // Migrate DECIMAL columns to INTEGER (Guaranies have no cents)
    const [voucherCols] = await sequelize.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'amount'`
    );
    if (voucherCols.length > 0 && voucherCols[0].data_type === 'numeric') {
      await sequelize.query(`ALTER TABLE vouchers ALTER COLUMN amount TYPE INTEGER USING CAST(amount AS INTEGER)`);
      console.log('✓ Migrated vouchers.amount to INTEGER');
    }

    const [productCols] = await sequelize.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price'`
    );
    if (productCols.length > 0 && productCols[0].data_type === 'numeric') {
      await sequelize.query(`ALTER TABLE products ALTER COLUMN price TYPE INTEGER USING CAST(price AS INTEGER)`);
      console.log('✓ Migrated products.price to INTEGER');
    }
  } catch (error) {
    console.error('Migration warning:', error.message);
  }
};

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    await runMigrations();
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
  Product,
  Cost,
  syncDatabase
};
