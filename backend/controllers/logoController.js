const { Logo, Activity } = require('../models');

const getAllLogos = async (req, res) => {
  try {
    const logos = await Logo.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(logos);
  } catch (error) {
    console.error('Get logos error:', error);
    res.status(500).json({ error: 'Failed to fetch logos' });
  }
};

const createLogo = async (req, res) => {
  try {
    const { name, svgContent } = req.body;

    if (!svgContent || !svgContent.trim().toLowerCase().includes('<svg')) {
      return res.status(400).json({ error: 'Invalid SVG content' });
    }

    const logo = await Logo.create({ name, svgContent: svgContent.trim() });

    res.status(201).json({
      message: 'Logo created successfully',
      logo
    });
  } catch (error) {
    console.error('Create logo error:', error);
    res.status(500).json({ error: 'Failed to create logo' });
  }
};

const deleteLogo = async (req, res) => {
  try {
    const { id } = req.params;

    const logo = await Logo.findByPk(id);
    if (!logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    const refCount = await Activity.count({ where: { templateLogoId: id } });
    if (refCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete logo that is in use by activities'
      });
    }

    await logo.destroy();
    res.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
};

module.exports = {
  getAllLogos,
  createLogo,
  deleteLogo
};
