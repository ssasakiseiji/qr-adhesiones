const { Activity, Voucher, Logo } = require('../models');
const { Op } = require('sequelize');

const getAllActivities = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'esbirro') {
      where.isActive = true;
    }

    const activities = await Activity.findAll({
      where,
      include: [{ model: Logo, as: 'templateLogo', attributes: ['id', 'name', 'svgContent'] }],
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
    const { name, description, isActive, finishedAt } = req.body;

    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const updateData = {
      name: name !== undefined ? name : activity.name,
      description: description !== undefined ? description : activity.description,
      isActive: isActive !== undefined ? isActive : activity.isActive
    };

    // When finishing an activity, also deactivate it
    if (finishedAt !== undefined) {
      updateData.finishedAt = finishedAt;
      if (finishedAt) {
        updateData.isActive = false;
      }
    }

    await activity.update(updateData);

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

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { templateTitle, templateProductName, templateBgColor, templateBgColor2, templateTextColor, templateLogoSize, templateLogoId, pickupDate, pickupStartTime, pickupEndTime } = req.body;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (templateLogoId) {
      const logo = await Logo.findByPk(templateLogoId);
      if (!logo) {
        return res.status(404).json({ error: 'Logo not found' });
      }
    }

    await activity.update({
      templateTitle: templateTitle !== undefined ? templateTitle : activity.templateTitle,
      templateProductName: templateProductName !== undefined ? templateProductName : activity.templateProductName,
      templateBgColor: templateBgColor !== undefined ? templateBgColor : activity.templateBgColor,
      templateBgColor2: templateBgColor2 !== undefined ? templateBgColor2 : activity.templateBgColor2,
      templateTextColor: templateTextColor !== undefined ? templateTextColor : activity.templateTextColor,
      templateLogoSize: templateLogoSize !== undefined ? templateLogoSize : activity.templateLogoSize,
      templateLogoId: templateLogoId !== undefined ? templateLogoId : activity.templateLogoId,
      pickupDate: pickupDate !== undefined ? pickupDate : activity.pickupDate,
      pickupStartTime: pickupStartTime !== undefined ? pickupStartTime : activity.pickupStartTime,
      pickupEndTime: pickupEndTime !== undefined ? pickupEndTime : activity.pickupEndTime,
    });

    const updated = await Activity.findByPk(id, {
      include: [{ model: Logo, as: 'templateLogo', attributes: ['id', 'name', 'svgContent'] }]
    });

    res.json({
      message: 'Template updated successfully',
      activity: updated
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
};

module.exports = {
  getAllActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  updateTemplate
};
