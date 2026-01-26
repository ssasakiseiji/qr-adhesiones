const { Activity, Voucher } = require('../models');
const { Op } = require('sequelize');

const getAllActivities = async (req, res) => {
  try {
    const activities = await Activity.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

const createActivity = async (req, res) => {
  try {
    const { name, description } = req.body;

    const activity = await Activity.create({
      name,
      description
    });

    res.status(201).json({
      message: 'Activity created successfully',
      activity
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    await activity.update({
      name: name !== undefined ? name : activity.name,
      description: description !== undefined ? description : activity.description,
      isActive: isActive !== undefined ? isActive : activity.isActive
    });

    res.json({
      message: 'Activity updated successfully',
      activity
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
};

const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Check if activity has vouchers
    const voucherCount = await Voucher.count({ where: { activityId: id } });

    if (voucherCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete activity with existing vouchers'
      });
    }

    await activity.destroy();

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};

module.exports = {
  getAllActivities,
  createActivity,
  updateActivity,
  deleteActivity
};
