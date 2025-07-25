const express = require('express');
const router = express.Router();

const Inquiry = require('../models/Inquiry.model');
const BuilderProfile = require('../models/Property/BuilderProfile.model');
const Project = require('../models/Property/Project.model'); 
const { authenticate, authorizeRoles } = require('../middleware/auth');

// ------------------------
// USER SIDE ROUTES
// ------------------------

// Create an inquiry (user)
router.post('/', authenticate, authorizeRoles('user', 'directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const { builder, project, message, contactEmail, contactPhone } = req.body;

    if (!builder || !message) {
      return res.status(400).json({ message: 'Builder and message are required' });
    }
    const builderExists = await BuilderProfile.findById(builder);
    if (!builderExists) {
      return res.status(404).json({ message: 'Builder not found' });
    }

    if (project) {
      const projectExists = await Project.findById(project);
      if (!projectExists) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }
    const newInquiry = new Inquiry({
      user: req.user._id,
      builder,
      project,
      message,
      contactEmail,
      contactPhone,
      status: 'new'
    });

    await newInquiry.save();
    res.status(201).json(newInquiry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all inquiries by logged-in user
router.get('/my', authenticate,authorizeRoles('user'),
  async (req, res) => {
    try {
      const inquiries = await Inquiry.find({ user: req.user._id })
        .populate('builder', 'companyName')
        .populate('project', 'projectName')
        .sort({ createdAt: -1 });
      res.json(inquiries);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ------------------------
// DIRECT BUILDER SIDE ROUTES
// ------------------------

// Get all inquiries for the builder profile linked to logged-in directBuilder
router.get('/builder',authenticate,authorizeRoles('directBuilder'), async (req, res) => {
    try {
      const builderProfile = await require('../models/Property/BuilderProfile.model').findOne({ user: req.user._id });
      if (!builderProfile) {
        return res.status(404).json({ message: 'Builder profile not found' });
      }

      const inquiries = await Inquiry.find({ builder: builderProfile._id })
        .populate('user', 'name email phone')
        .populate('project', 'projectName')
        .sort({ createdAt: -1 });
      res.json(inquiries);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Update inquiry status (directBuilder can update status for their builder's inquiries)
router.put( '/:id/status',authenticate,authorizeRoles('directBuilder'),async (req, res) => {
    try {
      const inquiryId = req.params.id;
      const { status } = req.body;

      if (!['new', 'in-progress', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      const builderProfile = await require('../models/Property/BuilderProfile.model').findOne({ user: req.user._id });
      if (!builderProfile) return res.status(404).json({ message: 'Builder profile not found' });

      const inquiry = await Inquiry.findOne({ _id: inquiryId, builder: builderProfile._id });
      if (!inquiry) return res.status(404).json({ message: 'Inquiry not found or unauthorized' });

      inquiry.status = status;
      if (status === 'closed') inquiry.respondedAt = new Date();
      await inquiry.save();

      res.json(inquiry);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ------------------------
// ADMIN SIDE ROUTES
// ------------------------

// Get all inquiries (admin + superAdmin)
router.get( '/', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
    try {
      const inquiries = await Inquiry.find()
        .populate('user', 'name email')
        .populate('builder', 'companyName')
        .populate('project', 'projectName')
        .sort({ createdAt: -1 });
      res.json(inquiries);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Update inquiry status (admin)
router.put( '/:id/status/admin',authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
    try {
      const inquiryId = req.params.id;
      const { status } = req.body;

      if (!['new', 'in-progress', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      const inquiry = await Inquiry.findById(inquiryId);
      if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });

      inquiry.status = status;
      if (status === 'closed') inquiry.respondedAt = new Date();
      await inquiry.save();

      res.json(inquiry);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Delete inquiry (admin)
router.delete('/:id',authenticate,authorizeRoles('admin', 'superAdmin'),async (req, res) => {
    try {
      const inquiryId = req.params.id;
      const deleted = await Inquiry.findByIdAndDelete(inquiryId);
      if (!deleted) return res.status(404).json({ message: 'Inquiry not found' });
      res.json({ message: 'Inquiry deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
