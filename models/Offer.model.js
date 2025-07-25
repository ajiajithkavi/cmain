const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    amount: {
      type: Number,
      required: [true, 'Please add an offer amount'],
      min: [0, 'Offer amount cannot be negative']
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'countered'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });
  
  module.exports = mongoose.model('Offer', OfferSchema);