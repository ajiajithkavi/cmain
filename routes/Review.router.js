const express = require('express');
const router = express.Router();

const Review = require('../models/Review.model');
const BuilderProfile = require('../models/Property/BuilderProfile.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// ------------------------
// USER SIDE ROUTES
// ------------------------

// Create a review (user)
router.post('/',authenticate,authorizeRoles('user'),async (req, res) => {
    try {
      const { builder, project, rating, title, comment } = req.body;

      if (!builder || !rating) {
        return res.status(400).json({ message: 'Builder and rating are required' });
      }
      const newReview = new Review({
        user: req.user._id,
        builder,
        project,
        rating,
        title,
        comment,
        status: 'pending' // Reviews must be approved by admin
      });

      await newReview.save();
      res.status(201).json(newReview);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Get all reviews by logged-in user
router.get('/my',authenticate,authorizeRoles('user'),async (req, res) => {
    try {
      const reviews = await Review.find({ user: req.user._id })
        .populate('builder', 'companyName')
        .populate('project', 'projectName')
        .sort({ createdAt: -1 });
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ------------------------
// DIRECT BUILDER SIDE ROUTES
// ------------------------

// Get all reviews for builder profile linked to logged-in directBuilder
router.get('/builder',authenticate,authorizeRoles('directBuilder'),async (req, res) => {
    try {
      const builderProfile = await BuilderProfile.findOne({ user: req.user._id });
      if (!builderProfile) {
        return res.status(404).json({ message: 'Builder profile not found' });
      }

      const reviews = await Review.find({ builder: builderProfile._id, status: 'approved' })
        .populate('user', 'name email')
        .populate('project', 'projectName')
        .sort({ createdAt: -1 });
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ------------------------
// ADMIN SIDE ROUTES
// ------------------------

// Get all reviews (admin + superAdmin)
router.get('/',authenticate,authorizeRoles('admin', 'superAdmin'),async (req, res) => {
    try {
      const reviews = await Review.find()
        .populate('user', 'name email')
        .populate('builder', 'companyName')
        .populate('project', 'projectName')
        .sort({ createdAt: -1 });
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Approve or reject review (admin)
router.put('/:id/status',authenticate,authorizeRoles('admin', 'superAdmin'),async (req, res) => {
    try {
      const reviewId = req.params.id;
      const { status } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      const review = await Review.findById(reviewId);
      if (!review) return res.status(404).json({ message: 'Review not found' });

      review.status = status;
      await review.save();

      res.json(review);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Delete review (admin)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('admin', 'superAdmin'),
  async (req, res) => {
    try {
      const reviewId = req.params.id;
      const deleted = await Review.findByIdAndDelete(reviewId);
      if (!deleted) return res.status(404).json({ message: 'Review not found' });

      res.json({ message: 'Review deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
