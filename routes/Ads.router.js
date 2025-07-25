const express = require('express');
const router = express.Router();
const Advertisement = require('../models/Ads.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');


router.post('/', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const ad = new Advertisement({ ...req.body, createdBy: req.user._id });
    await ad.save();
    res.status(201).json({ message: 'Advertisement created', ad });
  } catch (err) {
    res.status(500).json({ message: 'Creation failed', error: err.message });
  }
});

// Get all active ad(public)
router.get('/', async (req, res) => {
  try {
    const ads = await Advertisement.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch advertisements', error: err.message });
  }
});

// Admin: Get all ad
router.get('/all', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const ads = await Advertisement.find().populate('createdBy', 'name email');
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all ads', error: err.message });
  }
});


router.put('/:id', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ad) return res.status(404).json({ message: 'Advertisement not found' });
    res.json({ message: 'Advertisement updated', ad });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});


router.delete('/:id', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Advertisement not found' });
    res.json({ message: 'Advertisement deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed', error: err.message });
  }
});

module.exports = router;
