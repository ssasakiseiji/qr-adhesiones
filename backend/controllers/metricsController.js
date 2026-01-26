const { Voucher, Activity } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const getActivityMetrics = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const metrics = await Voucher.findAll({
      where: { activityId: id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalVouchers'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "isRedeemed" = true THEN 1 END')), 'redeemedCount'],
      ],
      raw: true
    });

    const result = metrics[0];
    const totalVouchers = parseInt(result.totalVouchers) || 0;
    const totalRevenue = parseFloat(result.totalRevenue) || 0;
    const redeemedCount = parseInt(result.redeemedCount) || 0;
    const redemptionRate = totalVouchers > 0 ? (redeemedCount / totalVouchers * 100).toFixed(2) : 0;

    res.json({
      activity: {
        id: activity.id,
        name: activity.name
      },
      metrics: {
        totalVouchers,
        totalRevenue,
        redeemedCount,
        pendingCount: totalVouchers - redeemedCount,
        redemptionRate: parseFloat(redemptionRate)
      }
    });
  } catch (error) {
    console.error('Get activity metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

const getSummaryMetrics = async (req, res) => {
  try {
    const activities = await Activity.findAll({
      include: [{
        model: Voucher,
        as: 'vouchers',
        attributes: []
      }],
      attributes: [
        'id',
        'name',
        [sequelize.fn('COUNT', sequelize.col('vouchers.id')), 'totalVouchers'],
        [sequelize.fn('SUM', sequelize.col('vouchers.amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN vouchers."isRedeemed" = true THEN 1 END')), 'redeemedCount'],
      ],
      group: ['Activity.id'],
      raw: true
    });

    const summary = activities.map(activity => ({
      activityId: activity.id,
      activityName: activity.name,
      totalVouchers: parseInt(activity.totalVouchers) || 0,
      totalRevenue: parseFloat(activity.totalRevenue) || 0,
      redeemedCount: parseInt(activity.redeemedCount) || 0,
      redemptionRate: activity.totalVouchers > 0 
        ? parseFloat((activity.redeemedCount / activity.totalVouchers * 100).toFixed(2))
        : 0
    }));

    // Calculate overall totals
    const overallMetrics = await Voucher.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalVouchers'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "isRedeemed" = true THEN 1 END')), 'redeemedCount'],
      ],
      raw: true
    });

    const overall = overallMetrics[0];
    const totalVouchers = parseInt(overall.totalVouchers) || 0;
    const totalRevenue = parseFloat(overall.totalRevenue) || 0;
    const redeemedCount = parseInt(overall.redeemedCount) || 0;

    res.json({
      overall: {
        totalVouchers,
        totalRevenue,
        redeemedCount,
        pendingCount: totalVouchers - redeemedCount,
        redemptionRate: totalVouchers > 0 
          ? parseFloat((redeemedCount / totalVouchers * 100).toFixed(2))
          : 0
      },
      byActivity: summary
    });
  } catch (error) {
    console.error('Get summary metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch summary metrics' });
  }
};

module.exports = {
  getActivityMetrics,
  getSummaryMetrics
};
