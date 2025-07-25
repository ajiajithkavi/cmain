const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String, 
  },
  userPhone: {
    type: String,
  },
  interestedIn: {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'BuilderProfile' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'phone', 'email', 'walk-in', 'advertisement', 'other'],
    default: 'website',
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'not interested', 'converted', 'lost'],
    default: 'new',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: [
    {
      note: String,
      date: { type: Date, default: Date.now },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }
  ],
  initialPaymentDone: {
    type: Boolean,
    default: false,
  },
  bookingPageVisited: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Lead', leadSchema);
