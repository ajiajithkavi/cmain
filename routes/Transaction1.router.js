const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

const Transaction = require('../models/Transaction.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

require('dotenv').config();

// Razorpay 
// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// POST /api/transactions
router.post('/', authenticate, async (req, res) => {
  try {
    const { builder, property, amount, paymentMethod, remarks } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const maxAmountInRupees = 5000000; // Razorpay max limit
    if (amount > maxAmountInRupees) {
      return res.status(400).json({
        message: `Amount exceeds Razorpay limit. Max allowed: ₹${maxAmountInRupees}`
      });
    }

    // Convert to paise (Razorpay accepts smallest currency unit)
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // convert ₹ to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    });

    const transaction = new Transaction({
      user: req.user._id,
      builder,
      property,
      amount,
      paymentMethod,
      remarks,
      status: 'pending',
      razorpayOrderId: razorpayOrder.id
    });

    await transaction.save();

    res.status(201).json({
      message: 'Transaction initiated',
      order: razorpayOrder,
      transaction
    });

  } catch (err) {
    console.error('Transaction creation error:', err);
    res.status(500).json({ message: 'Transaction failed', error: err });
  }
});

router.post('/webhook', express.json({ type: '*/*' }), async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);

  const expectedSignature = crypto.createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  const payload = req.body;

  if (payload.event === 'payment.captured') {
    try {
      const payment = payload.payload.payment.entity;

      // You can get user ID via metadata in notes or implement matching logic
      const newTransaction = new Transaction({
        user: payment.notes.userId, // from Razorpay notes
        builder: payment.notes.builderId,
        property: payment.notes.propertyId,
        amount: payment.amount / 100, // convert paise to INR
        paymentMethod: payment.method,
        status: 'completed',
        remarks: 'Auto created from Razorpay webhook',
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
      });

      await newTransaction.save();

      res.status(200).json({ message: 'Transaction created' });
    } catch (err) {
      console.error('Transaction creation failed:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    res.status(200).json({ message: 'Event ignored' });
  }
});


// Verify Razorpay payment 
router.post('/verify', authenticate, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Update transaction status to completed
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { status: 'completed' },
      { new: true }
    );

    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    res.json({ success: true, message: 'Payment verified', transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all transactions
router.get( '/',authenticate,authorizeRoles('admin', 'superAdmin', 'directBuilder'),
  async (req, res) => {
    try {
      const transactions = await Transaction.find()
        .populate('user', 'name email')
        .populate('builder', 'companyName')
        .populate('property', 'unitNumber');
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// User: Get own transactions
router.get('/my', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .populate('builder', 'companyName')
      .populate('property', 'unitNumber');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Update transaction status manually
router.put(
  '/:id/status',
  authenticate,
  authorizeRoles('admin', 'superAdmin', 'directBuilder'),
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      const transaction = await Transaction.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
      res.json(transaction);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
