const express = require('express');
const router = express.Router();
const SavedProperty = require('../models/SavedProperties.model');
const Unit = require('../models/Property/Unit.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);

router.post('/', async (req, res) => {
  try {
    const { unitId } = req.body;
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const exists = await SavedProperty.findOne({
      user: req.user._id,
      unit: unitId,
    });
    if (exists) return res.status(400).json({ message: 'Already saved' });

    const saved = new SavedProperty({
      user: req.user._id,
      unit: unitId,
    });

    await saved.save();
    res.status(201).json({ message: 'Property saved successfully', saved });
  } catch (error) {
    console.error('Error saving property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/', async (req, res) => {
  try {
    const saved = await SavedProperty.find({ user: req.user._id }).populate({
      path: 'unit',
      populate: {
        path: 'floor',
        populate: {
          path: 'building',
          populate: {
            path: 'project',
            populate: {
              path: 'builder',
              model: 'BuilderProfile',
            },
          },
        },
      },
    });

    res.json(saved);
  } catch (error) {
    console.error('Error fetching saved properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const saved = await SavedProperty.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!saved) return res.status(404).json({ message: 'Saved property not found' });

    res.json({ message: 'Property removed from saved list' });
  } catch (error) {
    console.error('Error removing saved property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
