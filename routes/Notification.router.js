const express = require('express');
const router = express.Router();

const Notification = require('../models/Notification.model');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Get all notifications for logged-in user
router.get('/',authenticate,async (req, res) => {
    try {
      const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 });
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Mark notification as read
router.put( '/:id/read',authenticate,async (req, res) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { isRead: true },
        { new: true }
      );
      if (!notification) return res.status(404).json({ message: 'Notification not found' });
      res.json(notification);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Admin: Create notification for any user
router.post('/',authenticate,authorizeRoles('admin', 'superAdmin'),async (req, res) => {
    try {
      const { user, title, message, link } = req.body;
      if (!user || !title || !message) {
        return res.status(400).json({ message: 'User, title, and message are required' });
      }
      const newNotification = new Notification({ user, title, message, link });
      await newNotification.save();
      res.status(201).json(newNotification);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Admin: Delete notification
router.delete( '/:id', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
    try {
      const deleted = await Notification.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Notification not found' });
      res.json({ message: 'Notification deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
