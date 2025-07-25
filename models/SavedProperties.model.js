const mongoose = require('mongoose');

const savedPropertySchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  unit:  { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  savedAt: { type: Date, default: Date.now }
});

// Prevent duplicate saves
savedPropertySchema.index({ user: 1, unit: 1 }, { unique: true });

module.exports = mongoose.model('SavedProperty', savedPropertySchema);
