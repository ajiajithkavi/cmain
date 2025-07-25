const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  builder: { type: mongoose.Schema.Types.ObjectId, ref: 'BuilderProfile', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  message: { type: String, required: true },
  contactEmail: { type: String },
  contactPhone: { type: String },
  status: { type: String, enum: ['new', 'in-progress', 'closed'], default: 'new' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date }
});

module.exports = mongoose.model('Inquiry', inquirySchema);
