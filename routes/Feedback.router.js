const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Submit feedback (User or directBuilder)
router.post('/', authenticate, authorizeRoles('user', 'directBuilder'), async (req, res) => {
  try {
    const { builder, project, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const feedback = new Feedback({
      user: req.user._id,
      builder,
      project,
      rating,
      comment,
      status: 'pending'
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit feedback', error });
  }
});

// Get all feedback (Admin only, can filter by status)
router.get('/admin', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const feedbacks = await Feedback.find(filter)
      .populate('user', 'username email')
      .populate('builder', 'companyName')
      .populate('project', 'projectName');
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get feedback', error });
  }
});

// Approve or reject feedback (Admin)
router.put('/:id/status', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    res.json({ message: 'Feedback status updated', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update feedback status', error });
  }
});

// Get feedback for builder (directBuilder and admin)
router.get('/builder', authenticate, authorizeRoles('directBuilder', 'admin'), async (req, res) => {
  try {
    const builderId = req.user.role === 'directBuilder' ? req.user._id : req.query.builder;
    const filter = {};
    if (builderId) filter.builder = builderId;

    const feedbacks = await Feedback.find(filter)
      .populate('user', 'username email')
      .populate('project', 'projectName');

    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get feedback', error });
  }
});

// Get feedback submitted by logged-in user
router.get('/my', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ user: req.user._id })
      .populate('builder', 'companyName')
      .populate('project', 'projectName');
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get your feedback', error });
  }
});

module.exports = router;
