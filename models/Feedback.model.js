const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {                            
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  builder: {                         
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuilderProfile',
  },
  project: {                         
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  rating: {                         // Rating 1-5 stars
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {                       
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {                        // For admin to moderate feedback
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
