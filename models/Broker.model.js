// models/Broker.model.js
const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String },
  phone: { type: String },
  email: { type: String },
  location: { type: String },
  selectType: {
    type: String,
    enum: ['Internal', 'Broker', 'Agent'],
    required: true,
  },
  activeListings: { type: Number, default: 0 },
  closedDeals: { type: Number, default: 0 },
  avatarUrl: { type: String },
  commissionRate: { type: Number, required: true },
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }], // Link to property units
}, { timestamps: true });

module.exports = mongoose.model('Broker', brokerSchema);
