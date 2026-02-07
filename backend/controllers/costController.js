const { Cost, Activity } = require('../models');

const getCostsByActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const costs = await Cost.findAll({
      where: { activityId },
      order: [['createdAt', 'ASC']]
    });

    res.json(costs);
  } catch (error) {
    console.error('Get costs error:', error);
    res.status(500).json({ error: 'Failed to fetch costs' });
  }
};

const createCost = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { description, amount } = req.body;

    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const cost = await Cost.create({
      activityId,
      description,
      amount
    });

    res.status(201).json({
      message: 'Cost created successfully',
      cost
    });
  } catch (error) {
    console.error('Create cost error:', error);
    res.status(500).json({ error: 'Failed to create cost' });
  }
};

const updateCost = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount } = req.body;

    const cost = await Cost.findByPk(id);
    if (!cost) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    await cost.update({
      description: description !== undefined ? description : cost.description,
      amount: amount !== undefined ? amount : cost.amount
    });

    res.json({
      message: 'Cost updated successfully',
      cost
    });
  } catch (error) {
    console.error('Update cost error:', error);
    res.status(500).json({ error: 'Failed to update cost' });
  }
};

const deleteCost = async (req, res) => {
  try {
    const { id } = req.params;

    const cost = await Cost.findByPk(id);
    if (!cost) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    await cost.destroy();
    res.json({ message: 'Cost deleted successfully' });
  } catch (error) {
    console.error('Delete cost error:', error);
    res.status(500).json({ error: 'Failed to delete cost' });
  }
};

module.exports = {
  getCostsByActivity,
  createCost,
  updateCost,
  deleteCost
};
