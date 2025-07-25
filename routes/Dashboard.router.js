const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
const Project = require('../models/Property/Project.model');
const Building = require('../models/Property/Building.model');
const Floor = require('../models/Property/Floor.model');
const Unit = require('../models/Property/Unit.model');
const Transaction = require('../models/Transaction.model');
const Lead = require('../models/Lead.model');
const User = require('../models/User.model');

// Admin Dashboard
router.get('/admin', async (req, res) => {
  try {
    const totalProperties = await Project.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const totalAmount = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalLeads = await Lead.countDocuments();

    res.json({
      totalProperties,
      totalTransactions,
      totalAmount: totalAmount[0]?.total || 0,
      totalLeads
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Builder Dashboard
router.get('/:builderId', async (req, res) => {
  try {
    const builderId = req.params.builderId;

    const builderProperties = await Project.countDocuments({ builder: builderId });

    const builderTransactions = await Transaction.countDocuments({ builder: builderId });

    const builderAmount = await Transaction.aggregate([
      { $match: { builder: builderId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      builderProperties,
      builderTransactions,
      builderAmount: builderAmount[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/get/:builderId', async (req, res) => {
  try {
    const builderId = req.params.builderId;
    const builderProperties = await Project.countDocuments({ builder: builderId });
    const builderTransactions = await Transaction.countDocuments({ builder: builderId });

    const builderAmount = await Transaction.aggregate([
      { $match: { builder: new mongoose.Types.ObjectId(builderId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const buildings = await Building.find({ builder: builderId }).select('_id');
    const buildingIds = buildings.map(b => b._id);
    const floors = await Floor.find({ building: { $in: buildingIds } }).select('_id');
    const floorIds = floors.map(f => f._id);

    const totalUnits = await Unit.countDocuments({ floor: { $in: floorIds } });

    res.json({
      builderProperties,
      builderTransactions,
      builderAmount: builderAmount[0]?.total || 0,
      totalUnits
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
