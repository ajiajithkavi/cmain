const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Create a complaint (user or directBuilder)
router.post('/', authenticate, authorizeRoles('user', 'directBuilder'), async (req, res) => {
  try {
    const { subject, description, relatedProperty, relatedBuilder } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const complaint = new Complaint({
      user: req.user._id,
      subject,
      description,
      relatedProperty,
      relatedBuilder,
      status: 'open', 
    });

    await complaint.save();
    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get complaints of logged-in user (user or directBuilder)
router.get('/my', authenticate, authorizeRoles('user', 'directBuilder'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .populate('relatedProperty', 'name location')
      .populate('relatedBuilder', 'companyName');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get complaints assigned to builder (directBuilder)
router.get('/builder', authenticate, authorizeRoles('directBuilder'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ relatedBuilder: req.user.builderProfileId })
      .populate('user', 'name email phone')
      .populate('relatedProperty', 'name location');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: get all complaints
router.get('/', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('user', 'name email phone')
      .populate('relatedBuilder', 'companyName')
      .populate('relatedProperty', 'name location');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update complaint status or add response (admin or directBuilder can update)
router.put('/:id', authenticate, authorizeRoles('admin', 'directBuilder'), async (req, res) => {
  try {
    const { status, response } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // If directBuilder, verify complaint is related to their builderProfile
    if (req.user.role === 'directBuilder' && complaint.relatedBuilder.toString() !== req.user.builderProfileId) {
      return res.status(403).json({ message: 'Not authorized to update this complaint' });
    }

    if (status) {
      if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      complaint.status = status;
    }

    if (response) {
      complaint.response = response; // e.g., builder/admin reply
    }

    await complaint.save();
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete complaint (admin or user who created can delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'superAdmin' &&
      complaint.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this complaint' });
    }

    await complaint.remove();
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
