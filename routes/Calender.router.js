// const express = require('express');
// const Event = require('../models/Calender.model');
// const { authenticate } = require('../middleware/auth');

// const router = express.Router();

// // Create new event
// router.post('/', authenticate, async (req, res) => {
//   try {
//     const { title, startDate, endDate, isPublic, link } = req.body;
    
//     if (!title || !startDate || !endDate) {
//       return res.status(400).json({ message: 'Title, startDate and endDate are required' });
//     }
    
//     const event = new Event({
//       userId: req.user._id,
//       title,
//       startDate,
//       endDate,
//       isPublic: isPublic || false,
//       link,
//     });

//     await event.save();
//     res.status(201).json({ message: 'Event created', event });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to create event', error: err.message });
//   }
// });

// // Get all events for the logged-in user
// router.get('/', authenticate, async (req, res) => {
//   try {
//     const events = await Event.find({ userId: req.user._id });
//     res.json(events);
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to fetch events', error: err.message });
//   }
// });

// // Get event by id (only if owned by user)
// router.get('/:id', authenticate, async (req, res) => {
//   try {
//     const event = await Event.findOne({ _id: req.params.id, userId: req.user._id });
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     res.json(event);
//   } catch (err) {
//     res.status(500).json({ message: 'Error fetching event', error: err.message });
//   }
// });

// // Update event by id (only if owned by user)
// router.put('/:id', authenticate, async (req, res) => {
//   try {
//     const updates = req.body;
//     const event = await Event.findOneAndUpdate(
//       { _id: req.params.id, userId: req.user._id },
//       updates,
//       { new: true }
//     );
//     if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });
//     res.json({ message: 'Event updated', event });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to update event', error: err.message });
//   }
// });

// // Delete event by id (only if owned by user)
// router.delete('/:id', authenticate, async (req, res) => {
//   try {
//     const event = await Event.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
//     if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });
//     res.json({ message: 'Event deleted' });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to delete event', error: err.message });
//   }
// });

// module.exports = router;


const express = require('express');
const Event = require('../models/Calender.model');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Create event for self or other user (admin/builder use-case)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, startDate, endDate, isPublic, link, targetUserId } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: 'Title, startDate and endDate are required' });
    }

    const userId = targetUserId || req.user._id;

    const event = new Event({
      userId,
      createdBy: req.user._id,
      title,
      startDate,
      endDate,
      isPublic: isPublic || false,
      link,
    });

    await event.save();
    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create event', error: err.message });
  }
});

// Get events assigned to the user (their calendar)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const events = await Event.find({
      $or: [
        { userId: userId },
        { createdBy: userId }
      ]
    }).sort({ startDate: 1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
});


// Get event by ID if user is assigned
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, userId: req.user._id });

    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching event', error: err.message });
  }
});

// Update only if createdBy is the same user
router.put('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update events you created' });
    }

    Object.assign(event, req.body);
    await event.save();

    res.json({ message: 'Event updated', event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update event', error: err.message });
  }
});

// Delete only if createdBy is the same user
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete events you created' });
    }

    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete event', error: err.message });
  }
});

module.exports = router;
