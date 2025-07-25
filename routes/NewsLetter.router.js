const express = require('express');
const router = express.Router();
const Subscriber = require('../models/NewsLetter.model');

// Subscribe to newsletter
router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ message: 'Email is required' });

  try {
    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already subscribed' });
    }

    const subscriber = new Subscriber({ email });
    await subscriber.save();

    res.status(201).json({ message: 'Successfully subscribed' });
  } catch (error) {
    res.status(500).json({ message: 'Subscription failed', error: error.message });
  }
});


router.get('/', async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch subscribers', error: err.message });
  }
});

module.exports = router;
