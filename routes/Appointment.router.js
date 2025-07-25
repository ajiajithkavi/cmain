const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Create appointment - accessible to user only
router.post('/', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const { builder, property, appointmentDate, remarks } = req.body;
    if (!builder || !appointmentDate) {
      return res.status(400).json({ message: 'Builder and appointmentDate are required' });
    }

    const appointment = new Appointment({
      user: req.user._id,
      builder,
      property,
      appointmentDate,
      remarks,
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get appointments for current user (user role)
router.get('/my', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .populate('builder', 'companyName')
      .populate('property', 'unitNumber bhkType price');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get appointments for builder (directBuilder role)
router.get('/builder', authenticate, authorizeRoles('directBuilder'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ builder: req.user.builderProfileId }) // Assuming you store builderProfileId in user
      .populate('user', 'name email phone')
      .populate('property', 'unitNumber bhkType price');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all appointments (admin role)
router.get('/', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('user', 'name email phone')
      .populate('builder', 'companyName')
      .populate('property', 'unitNumber bhkType price');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status (admin and builder can update)
router.put('/:id/status', authenticate, authorizeRoles('admin', 'directBuilder'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    // If builder, verify they own the appointment
    if (req.user.role === 'directBuilder' && appointment.builder.toString() !== req.user.builderProfileId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    appointment.status = status;
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete appointment (only admin or user who created can delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'superAdmin' &&
      appointment.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this appointment' });
    }

    await appointment.remove();
    res.json({ message: 'Appointment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
