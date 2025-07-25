const express = require('express');
const User = require('../models/User.model');
const Unit = require('../models/Property/Unit.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('admin', 'superAdmin','directBuilder'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});


router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});


router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && !['admin', 'superAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Not allowed to update this user' });
    }
    const updates = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
});


router.delete('/:id', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
});


router.put('/admin/:id', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const updates = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated by admin', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Admin update failed', error: err.message });
  }
});


router.patch('/:id/role', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required' });

    const validRoles = ['user', 'directBuilder', 'admin', 'superAdmin'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const updatedUser = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Role updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Role change failed', error: err.message });
  }
});


// GET liked units of a user
router.get('/:id/liked-units', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('likedUnits');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ likedUnits: user.likedUnits });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch liked units', error: err.message });
  }
});

// POST to like a unit
router.post('/:id/like-unit/:unitId', authenticate, async (req, res) => {
  try {
    const { id, unitId } = req.params;
    if (req.user._id.toString() !== id && !['admin', 'superAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Not allowed to like for this user' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.likedUnits.includes(unitId)) {
      user.likedUnits.push(unitId);
      await user.save();
    }

    res.json({ message: 'Unit liked', likedUnits: user.likedUnits });
  } catch (err) {
    res.status(500).json({ message: 'Failed to like unit', error: err.message });
  }
});

// DELETE to unlike a unit
router.delete('/:id/unlike-unit/:unitId', authenticate, async (req, res) => {
  try {
    const { id, unitId } = req.params;
    if (req.user._id.toString() !== id && !['admin', 'superAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Not allowed to unlike for this user' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.likedUnits = user.likedUnits.filter(u => u.toString() !== unitId);
    await user.save();

    res.json({ message: 'Unit unliked', likedUnits: user.likedUnits });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unlike unit', error: err.message });
  }
});

module.exports = router;
