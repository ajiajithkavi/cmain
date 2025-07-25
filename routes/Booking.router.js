const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking.model');
const Unit = require('../models/Property/Unit.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Create booking (User)
router.post('/', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const { unitId, saveForLater = false } = req.body;
    const unit = await Unit.findById(unitId).populate({
      path: 'floor',
      populate: {
        path: 'building',
        populate: {
          path: 'project',
          populate: 'builder'
        }
      }
    });

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    const existingBooking = await Booking.findOne({ unit: unitId, savedForLater: false });

    if (existingBooking) {
      return res.status(409).json({
        message: 'Unit already sold',
        existing: true,
        booking: existingBooking
      });
    }
    const builderId = unit.floor.building.project.builder._id;
    
    const booking = new Booking({
      user: req.user._id,
      unit: unitId,
      builder: builderId,
      savedForLater: saveForLater,
    });

    await booking.save();

    res.status(201).json({
      message: 'Booking created',
      booking
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Booking failed', error });
  }
});

// Create booking (User)
router.post('/book', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const { unitId, saveForLater = false } = req.body;

    // Check if unit exists
    const unit = await Unit.findById(unitId).populate({
      path: 'floor',
      populate: {
        path: 'building',
        populate: {
          path: 'project',
          populate: 'builder'
        }
      }
    });

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Check if unit is already booked (by any user)
    const existingBooking = await Booking.findOne({ unit: unitId, savedForLater: false });

    if (existingBooking) {
      return res.status(400).json({ message: 'Unit already sold' });
    }
    const builderId = unit.floor.building.project.builder._id;
    const booking = new Booking({
      user: req.user._id,
      unit: unitId,
      builder: builderId,
      savedForLater: saveForLater,
    });

    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Booking failed', error });
  }
});


// Get all bookings (Admin)
router.get('/admin', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'username email')
      .populate('unit')
      .populate('builder', 'companyName');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get bookings', error });
  }
});

// Get bookings for logged-in user
router.get('/my', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('unit')
      .populate('builder', 'companyName');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user bookings', error });
  }
});

// Get bookings for logged-in builder
router.get('/builder', authenticate, authorizeRoles('builder'), async (req, res) => {
  try {
    const bookings = await Booking.find({ builder: req.user._id }) // Assuming builder user ID matches builderProfile.user
      .populate('unit')
      .populate('user', 'username email');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get builder bookings', error });
  }
});

// Update booking status (Admin or Builder)
router.put('/:id/status', authenticate, authorizeRoles('admin', 'directBuilder'), async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status', error });
  }
});

// Cancel own booking (User)
router.delete('/:id', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found or not yours' });
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel booking', error });
  }
});

module.exports = router;
