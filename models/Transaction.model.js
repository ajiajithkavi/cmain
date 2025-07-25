const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  builder: { type: mongoose.Schema.Types.ObjectId, ref: 'BuilderProfile' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['credit_card', 'debit_card', 'net_banking', 'upi', 'cash', 'other'], default: 'other' },
  status: { type: String, enum: ['created','pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  remarks: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', transactionSchema);
