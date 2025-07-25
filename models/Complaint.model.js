const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  user: {  
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  relatedProperty: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',   // or Building / Floor / Unit depending on your structure
  },
  relatedBuilder: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuilderProfile',
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
  },
  response: {  
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  }
});

complaintSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
