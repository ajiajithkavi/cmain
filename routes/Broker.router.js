
const express = require('express');
const router = express.Router();
const Broker = require('../models/Broker.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Create broker profile
router.post( '/',authenticate,authorizeRoles('broker', 'admin', 'superAdmin'),
  async (req, res) => {
    try {
      let userId;
      if (['admin', 'superAdmin'].includes(req.user.role)) {
        if (!req.body.user) {
          return res.status(400).json({ message: 'User ID is required for admin to create a broker profile.' });
        }
        userId = req.body.user;
      } else {
       
        userId = req.user._id;
      }
      const exists = await Broker.findOne({ user: userId });
      if (exists) {
        return res.status(400).json({ message: 'Broker profile already exists for this user.' });
      }

      const broker = new Broker({
        ...req.body,
        user: userId,
      });

      await broker.save();
      res.status(201).json({ message: 'Broker profile created.', broker });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Get all brokers with property count
router.get('/all', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const brokers = await Broker.find()
      .populate('user', 'username email')
      .populate('properties', 'unitNumber floorNumber status');

    res.json(brokers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch brokers', error: err.message });
  }
});

// Get own broker profile
router.get('/me', authenticate, authorizeRoles('broker', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const broker = await Broker.findOne({ user: req.user._id })
      .populate('user', 'username email')
      .populate('properties', 'unitNumber floorNumber status');

    if (!broker) return res.status(404).json({ message: 'Broker profile not found' });
    res.json(broker);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch broker profile', error: err.message });
  }
});

// Assign properties to a broker
router.put('/:id/assign-properties', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const { properties } = req.body;

    const broker = await Broker.findById(req.params.id);
    if (!broker) return res.status(404).json({ message: 'Broker not found' });

    broker.properties = properties; // overwrite or push as needed
    broker.activeListings = properties.length;
    await broker.save();

    res.json(broker);
  } catch (err) {
    res.status(400).json({ message: 'Assignment failed', error: err.message });
  }
});

router.put('/:id', authenticate, authorizeRoles('broker', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const broker = await Broker.findById(req.params.id);
    if (!broker) return res.status(404).json({ message: 'Broker not found' });

    if (
      broker.user.toString() !== req.user._id.toString() &&
      !['admin', 'superAdmin'].includes(req.user.role)
    ) {
      return res.status(403).json({ message: 'Not allowed to edit this profile' });
    }
    Object.assign(broker, req.body);
    if (req.body.properties) {
      broker.activeListings = req.body.properties.length;
    }
    await broker.save();
    res.json({ message: 'Broker profile updated', broker });
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
});


router.get('/by-property/:unitId', authenticate, async (req, res) => {
  try {
    const { unitId } = req.params;

    const brokers = await Broker.find({ properties: unitId })
      .populate('user', 'username email')
      .populate('properties', 'unitNumber floorNumber status');

    if (!brokers || brokers.length === 0) {
      return res.status(404).json({ message: 'No brokers assigned to this property' });
    }

    res.json(brokers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching brokers by property', error: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const broker = await Broker.findById(req.params.id);
    if (!broker) {
      return res.status(404).json({ message: 'Broker not found' });
    }
    await broker.deleteOne();
    res.json({ message: 'Broker profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete broker', error: err.message });
  }
});

module.exports = router;
