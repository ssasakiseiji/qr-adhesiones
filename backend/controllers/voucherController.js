const { Voucher, Activity } = require('../models');
const QRCode = require('qrcode');
const crypto = require('crypto');

const generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('QR code generation failed');
  }
};

const createVoucher = async (req, res) => {
  try {
    const { activityId, customerName, amount, items } = req.body;

    // Verify activity exists
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Generate unique QR code data
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const qrData = `VOUCHER:${uniqueId}:${activityId}:${Date.now()}`;

    // Generate QR code image
    const qrCodeImage = await generateQRCode(qrData);

    // Create voucher
    const voucher = await Voucher.create({
      activityId,
      customerName,
      amount,
      items: items || null,
      qrCode: qrData
    });

    res.status(201).json({
      message: 'Voucher created successfully',
      voucher: {
        id: voucher.id,
        activityId: voucher.activityId,
        customerName: voucher.customerName,
        amount: voucher.amount,
        items: voucher.items,
        qrCode: qrData,
        qrCodeImage,
        isRedeemed: voucher.isRedeemed,
        createdAt: voucher.createdAt
      }
    });
  } catch (error) {
    console.error('Create voucher error:', error);
    res.status(500).json({ error: 'Failed to create voucher' });
  }
};

const getVouchers = async (req, res) => {
  try {
    const { activityId, isRedeemed, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

    const where = {};
    if (activityId) where.activityId = activityId;
    if (isRedeemed !== undefined) where.isRedeemed = isRedeemed === 'true';

    const allowedSortColumns = ['createdAt', 'customerName', 'amount', 'isRedeemed'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const { rows, count } = await Voucher.findAndCountAll({
      where,
      include: [{
        model: Activity,
        as: 'activity',
        attributes: ['id', 'name']
      }],
      order: [[safeSortBy, safeSortOrder]],
      limit: safeLimit,
      offset
    });

    res.json({
      vouchers: rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
        totalPages: Math.ceil(count / safeLimit)
      }
    });
  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
};

const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findByPk(id, {
      include: [{
        model: Activity,
        as: 'activity'
      }]
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Generate QR code image
    const qrCodeImage = await generateQRCode(voucher.qrCode);

    res.json({
      ...voucher.toJSON(),
      qrCodeImage
    });
  } catch (error) {
    console.error('Get voucher error:', error);
    res.status(500).json({ error: 'Failed to fetch voucher' });
  }
};

const redeemVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findByPk(id);

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    if (voucher.isRedeemed) {
      return res.status(400).json({
        error: 'Voucher already redeemed',
        redeemedAt: voucher.redeemedAt
      });
    }

    await voucher.update({
      isRedeemed: true,
      redeemedAt: new Date()
    });

    res.json({
      message: 'Voucher redeemed successfully',
      voucher
    });
  } catch (error) {
    console.error('Redeem voucher error:', error);
    res.status(500).json({ error: 'Failed to redeem voucher' });
  }
};

const scanQRCode = async (req, res) => {
  try {
    const { qrCode } = req.params;

    // Validate QR code format
    if (!qrCode.startsWith('VOUCHER:')) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const voucher = await Voucher.findOne({
      where: { qrCode },
      include: [{
        model: Activity,
        as: 'activity'
      }]
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.json({
      voucher,
      canRedeem: !voucher.isRedeemed
    });
  } catch (error) {
    console.error('Scan QR code error:', error);
    res.status(500).json({ error: 'Failed to scan QR code' });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, amount } = req.body;

    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    await voucher.update({
      customerName: customerName !== undefined ? customerName : voucher.customerName,
      amount: amount !== undefined ? amount : voucher.amount
    });

    res.json({
      message: 'Voucher updated successfully',
      voucher
    });
  } catch (error) {
    console.error('Update voucher error:', error);
    res.status(500).json({ error: 'Failed to update voucher' });
  }
};

module.exports = {
  createVoucher,
  getVouchers,
  getVoucherById,
  redeemVoucher,
  scanQRCode,
  updateVoucher
};
