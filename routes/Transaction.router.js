const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Transaction = require('../models/Transaction.model');
const Booking = require('../models/Booking.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');
require('dotenv').config();

// Razorpay 
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order 
// router.post('/', authenticate, async (req, res) => {
//   try {
//     const { amount, builderId, propertyId } = req.body;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ message: 'Valid amount is required' });
//     }

//     const amountInPaise = amount * 100;
//     const userId = req.user._id.toString();

//     const order = await razorpay.orders.create({
//       amount: amountInPaise,
//       currency: 'INR',
//       receipt: `receipt_${Date.now()}`,
//       payment_capture: 1,
//       notes: {
//         userId,
//         builderId: builderId || '',
//         propertyId: propertyId || '',
//       },
//     });

//     // Save transaction
//     await Transaction.create({
//       user: userId,
//       builder: builderId || null,
//       property: propertyId || null,
//       amount,
//       status: 'created',
//       razorpayOrderId: order.id,
//     });

//     res.status(201).json({ message: 'Order created', order });
//   } catch (err) {
//     console.error('Create order error:', err);
//     res.status(500).json({ message: 'Could not create order', error: err.message });
//   }
// });

// -------------------------------------------
// router.post('/', authenticate, async (req, res) => {
//   try {
//     const { amount, propertyId } = req.body;

//     if (!amount || amount <= 0 || !propertyId) {
//       return res.status(400).json({ message: 'Valid amount and propertyId are required' });
//     }

//     const amountInPaise = amount * 100;
//     const userId = req.user._id.toString();
//     const Unit = mongoose.model('Unit');
//     const Floor = mongoose.model('Floor');
//     const Building = mongoose.model('Building');
//     const Project = mongoose.model('Project');

//     const unit = await Unit.findById(propertyId).lean();
//     if (!unit) return res.status(404).json({ message: 'Unit not found' });

//     const floor = await Floor.findById(unit.floor).lean();
//     if (!floor) return res.status(404).json({ message: 'Floor not found' });

//     const building = await Building.findById(floor.building).lean();
//     if (!building) return res.status(404).json({ message: 'Building not found' });

//     const project = await Project.findById(building.project).lean();
//     if (!project) return res.status(404).json({ message: 'Project not found' });

//     const builderId = project.builder?.toString();
//     if (!builderId) return res.status(404).json({ message: 'Builder not found from project' });

//     const order = await razorpay.orders.create({
//       amount: amountInPaise,
//       currency: 'INR',
//       receipt: `receipt_${Date.now()}`,
//       payment_capture: 1,
//       notes: {
//         userId,
//         builderId,
//         propertyId,
//       },
//     });

//     await Transaction.create({
//       user: userId,
//       builder: builderId,
//       property: propertyId,
//       amount,
//       status: 'created',
//       razorpayOrderId: order.id,
//     });

//     res.status(201).json({ message: 'Order created', order });
//   } catch (err) {
//     console.error('Create order error:', err);
//     res.status(500).json({ message: 'Could not create order', error: err.message });
//   }
// });

router.post('/', authenticate, async (req, res) => {
  try {
    const { amount, propertyId } = req.body;

    if (!amount || amount <= 0 || !propertyId) {
      return res.status(400).json({ message: 'Valid amount and propertyId are required' });
    }

    const amountInPaise = amount * 100;
    const userId = req.user._id.toString();

    const Unit = mongoose.model('Unit');
    const Floor = mongoose.model('Floor');
    const Building = mongoose.model('Building');
    const Project = mongoose.model('Project');
    const Transaction = mongoose.model('Transaction');

    const existingTransaction = await Transaction.findOne({
      property: propertyId,
      status:'completed',
    });

    if (existingTransaction) {
      return res.status(409).json({
        message: 'This property already has a transaction and cannot be booked again.',
        transaction: existingTransaction,
      });
    }

    const unit = await Unit.findById(propertyId).lean();
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const floor = await Floor.findById(unit.floor).lean();
    if (!floor) return res.status(404).json({ message: 'Floor not found' });

    const building = await Building.findById(floor.building).lean();
    if (!building) return res.status(404).json({ message: 'Building not found' });

    const project = await Project.findById(building.project).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const builderId = project.builder?.toString();
    if (!builderId) return res.status(404).json({ message: 'Builder not found from project' });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        userId,
        builderId,
        propertyId,
      },
    });

    await Transaction.create({
      user: userId,
      builder: builderId,
      property: propertyId,
      amount,
      status: 'created',
      razorpayOrderId: order.id,
    });

    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Could not create order', error: err.message });
  }
});


// Verify from Frontend (after success)
router.post('/verify', authenticate, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'completed', razorpayPaymentId: razorpay_payment_id },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found for order ID' });
    }

    res.json({ success: true, message: 'Payment verified', transaction });
  } catch (err) {
    res.status(500).json({ message: 'Verification error', error: err.message });
  }
});

//Razorpay Webhook
router.post('/webhook', express.json({ type: '*/*' }), async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  const payload = req.body;

  if (payload.event === 'payment.captured') {
    try {
      const payment = payload.payload.payment.entity;

      // Avoid duplicate
      const existing = await Transaction.findOne({ razorpayOrderId: payment.order_id });
      if (!existing) {
        await Transaction.create({
          user: payment.notes.userId,
          builder: payment.notes.builderId || null,
          property: payment.notes.propertyId || null,
          amount: payment.amount / 100,
          status: 'completed',
          paymentMethod: payment.method,
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          remarks: 'Recorded from Razorpay webhook',
        });
      } else {
        if (existing.status !== 'completed') {
          existing.status = 'completed';
          existing.razorpayPaymentId = payment.id;
          existing.paymentMethod = payment.method;
          await existing.save();
        }
      }

      return res.status(200).json({ message: 'Transaction recorded via webhook' });
    } catch (err) {
      return res.status(500).json({ message: 'Webhook DB error', error: err.message });
    }
  }

  res.status(200).json({ message: 'Webhook received' });
});


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

router.get('/:builderId', authenticate, authorizeRoles('admin', 'superAdmin', 'directBuilder'), async (req, res) => {
  try {
    const builderId = req.params.builderId;
    const projects = await mongoose.model('Project').find({ builder: builderId }, '_id');
    const projectIds = projects.map(p => p._id);

    const buildings = await mongoose.model('Building').find({ project: { $in: projectIds } }, '_id');
    const buildingIds = buildings.map(b => b._id);

    const floors = await mongoose.model('Floor').find({ building: { $in: buildingIds } }, '_id');
    const floorIds = floors.map(f => f._id);

    const units = await mongoose.model('Unit').find({ floor: { $in: floorIds } }, '_id');
    const unitIds = units.map(u => u._id);

    const transactions = await mongoose.model('Transaction').find({ property: { $in: unitIds } })
      .populate('user', 'name email phone')
      .populate('property', 'unitNumber')
      .populate('builder', 'companyName');

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// -------------------------------------------------------------------------------------

// router.post('/verify', authenticate, async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//   try {
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest('hex');

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({ success: false, message: 'Invalid payment signature' });
//     }

//     const transaction = await Transaction.findOneAndUpdate(
//       { razorpayOrderId: razorpay_order_id },
//       { status: 'completed', razorpayPaymentId: razorpay_payment_id },
//       { new: true }
//     );

//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found for order ID' });
//     }

//     const booking = await Booking.findOneAndUpdate(
//       {
//         user: transaction.user,
//         unit: transaction.property, // Assuming 'property' is the same as 'unit'
//         builder: transaction.builder,
//       },
//       { status: 'confirmed' },
//       { new: true }
//     );

//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found to update' });
//     }

//     res.json({
//       success: true,
//       message: 'Payment verified and booking confirmed',
//       transaction,
//       booking
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'Verification error', error: err.message });
//   }
// });

// router.post('/webhook', express.json({ type: '*/*' }), async (req, res) => {
//   const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
//   const signature = req.headers['x-razorpay-signature'];
//   const body = JSON.stringify(req.body);

//   const expectedSignature = crypto
//     .createHmac('sha256', webhookSecret)
//     .update(body)
//     .digest('hex');

//   if (signature !== expectedSignature) {
//     return res.status(400).json({ message: 'Invalid webhook signature' });
//   }

//   const payload = req.body;

//   if (payload.event === 'payment.captured') {
//     try {
//       const payment = payload.payload.payment.entity;

//       let transaction = await Transaction.findOne({ razorpayOrderId: payment.order_id });

//       if (!transaction) {
//         transaction = await Transaction.create({
//           user: payment.notes.userId,
//           builder: payment.notes.builderId || null,
//           property: payment.notes.propertyId || null,
//           amount: payment.amount / 100,
//           status: 'completed',
//           paymentMethod: payment.method,
//           razorpayOrderId: payment.order_id,
//           razorpayPaymentId: payment.id,
//           remarks: 'Recorded from Razorpay webhook',
//         });
//       } else if (transaction.status !== 'completed') {
//         transaction.status = 'completed';
//         transaction.razorpayPaymentId = payment.id;
//         transaction.paymentMethod = payment.method;
//         await transaction.save();
//       }

//       // Update booking
//       const booking = await Booking.findOneAndUpdate(
//         {
//           user: transaction.user,
//           unit: transaction.property, // Again, assuming 'property' means 'unit'
//           builder: transaction.builder,
//         },
//         { status: 'confirmed' },
//         { new: true }
//       );

//       res.status(200).json({
//         message: 'Transaction recorded and booking confirmed via webhook',
//         transaction,
//         booking
//       });
//     } catch (err) {
//       return res.status(500).json({ message: 'Webhook DB error', error: err.message });
//     }
//   } else {
//     res.status(200).json({ message: 'Webhook received, event not handled' });
//   }
// });

// -------------------------------------------------------------------------------------


// router.post('/', authenticate, async (req, res) => {
//   try {
//     const { amount, builderId, propertyId } = req.body;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ message: 'Valid amount is required' });
//     }

//     const amountInPaise = amount * 100;
//     const userId = req.user._id.toString();

//     // Create Razorpay order with notes to track user, builder, property
//     const order = await razorpay.orders.create({
//       amount: amountInPaise,
//       currency: 'INR',
//       receipt: `receipt_${Date.now()}`,
//       payment_capture: 1,
//       notes: {
//         userId,
//         builderId: builderId || '',
//         propertyId: propertyId || '',
//       },
//     });

//     res.status(201).json({
//       message: 'Order created',
//       order,
//     });
//   } catch (err) {
//     console.error('Create order error:', err);
//     res.status(500).json({ message: 'Could not create order', error: err.message });
//   }
// });

// // Razorpay Webhook to record payment captured event
// router.post('/webhook', express.json({ type: '*/*' }), async (req, res) => {
//   const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
//   const signature = req.headers['x-razorpay-signature'];
//   const body = JSON.stringify(req.body);

//   // Verify webhook signature
//   const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
//   if (signature !== expectedSignature) {
//     return res.status(400).json({ message: 'Invalid webhook signature' });
//   }

//   const payload = req.body;

//   if (payload.event === 'payment.captured') {
//     try {
//       const payment = payload.payload.payment.entity;

//       const transaction = new Transaction({
//         user: payment.notes.userId,
//         builder: payment.notes.builderId,
//         property: payment.notes.propertyId,
//         amount: payment.amount / 100, // paise to INR
//         paymentMethod: payment.method,
//         status: 'completed',
//         remarks: 'Recorded from Razorpay webhook',
//         razorpayOrderId: payment.order_id,
//         razorpayPaymentId: payment.id,
//       });

//       await transaction.save();
//       return res.status(200).json({ message: 'Transaction recorded via webhook' });
//     } catch (err) {
//       return res.status(500).json({ message: 'Error recording transaction', error: err.message });
//     }
//   }

//   return res.status(200).json({ message: 'Webhook received but event not handled' });
// });

// // Verify Razorpay Payment Signature (called from frontend after payment success)
// router.post('/verify', authenticate, async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//   try {
  
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest('hex');

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({ success: false, message: 'Invalid payment signature' });
//     }

//     const transaction = await Transaction.findOneAndUpdate(
//       { razorpayOrderId: razorpay_order_id },
//       { status: 'completed', razorpayPaymentId: razorpay_payment_id },
//       { new: true }
//     );

//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found for order ID' });
//     }

//     res.json({ success: true, message: 'Payment verified', transaction });
//   } catch (err) {
//     res.status(500).json({ message: 'Verification error', error: err.message });
//   }
// });

// Admin: Get all transactions
router.get('/', authenticate, authorizeRoles('admin', 'superAdmin', 'directBuilder'), async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'name email')
      .populate('builder', 'companyName')
      .populate('property', 'unitNumber');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Get transaction by ID with access control
router.get('/:id', authenticate, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user', 'name email')
      .populate('builder', 'companyName')
      .populate('property', 'unitNumber');

    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (
      transaction.user._id.toString() !== req.user._id.toString() &&
      !['admin', 'superAdmin', 'directBuilder'].includes(req.user.role)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
